const mongoose = require("mongoose");
const Restaurant = require("../../models/Restaurant");
const User = require("../../models/User");
const Order = require("../../models/Order");
const Table = require("../../models/Table");
const MenuItem = require("../../models/MenuItem");
const Category = require("../../models/Category");
const PlatformAuditLog = require("../../models/PlatformAuditLog");
const { getIO } = require("../../config/socket");

class DevGateService {
  /**
   * Helper to emit tenant socket events safely
   */
  _notifyTenant(restaurantId, event, data) {
    try {
      const io = getIO();
      if (io) {
        io.to(`restaurant_${restaurantId}`).emit(event, data);
      }
    } catch {
      // Socket might not be active in tests or CLI
    }
  }

  /**
   * Helper to seed default starter categories
   */
  async _seedDefaultCategories(restaurantId) {
    const existingCount = await Category.countDocuments({ restaurantId });
    if (existingCount === 0) {
      const defaults = [
        { name: "Appetizers", description: "Starters & light bites", displayOrder: 1, restaurantId },
        { name: "Main Course", description: "Chef specials & hearty entrees", displayOrder: 2, restaurantId },
        { name: "Beverages", description: "Chilled drinks, coffees & teas", displayOrder: 3, restaurantId },
        { name: "Desserts", description: "Sweet treats & pastries", displayOrder: 4, restaurantId },
      ];
      await Category.insertMany(defaults);
    }
  }

  /**
   * List all restaurants with search, status filters, and pagination
   */
  async listRestaurants({ search = "", status = "all", page = 1, limit = 10 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Filter build
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { ownerName: regex },
        { email: regex },
        { address: regex },
      ];
    }

    // Metric counts across all tenants
    const statusCounts = await Restaurant.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const metrics = {
      total: 0,
      active: 0,
      pending: 0,
      suspended: 0,
    };

    statusCounts.forEach((item) => {
      metrics[item._id] = item.count;
      metrics.total += item.count;
    });

    // Total count for current filter
    const totalMatching = await Restaurant.countDocuments(filter);

    // Fetch restaurants sorted newest first
    const restaurants = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Attach real order count and revenue statistics per restaurant
    const restaurantIds = restaurants.map((r) => r._id);
    const stats = await Order.aggregate([
      {
        $match: {
          restaurantId: { $in: restaurantIds },
          status: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: "$restaurantId",
          ordersCount: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach((s) => {
      statsMap[s._id.toString()] = s;
    });

    const populatedRestaurants = restaurants.map((r) => {
      const rStats = statsMap[r._id.toString()] || { ordersCount: 0, totalRevenue: 0 };
      return {
        ...r,
        id: r._id.toString(),
        ordersCount: rStats.ordersCount,
        totalRevenue: rStats.totalRevenue,
      };
    });

    return {
      restaurants: populatedRestaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: totalMatching,
        totalPages: Math.ceil(totalMatching / limitNum) || 1,
      },
      metrics,
    };
  }

  /**
   * Create a new restaurant directly from DevGate (manual onboarding)
   */
  async createRestaurant(data, actor) {
    const {
      name,
      ownerName,
      email,
      password,
      phone = "",
      address = "",
      description = "",
      currency = "PKR",
      taxRate = 0,
      openingHours = "11:00 AM - 11:00 PM",
      status = "active",
    } = data;

    if (!name || !ownerName || !email || !password) {
      const error = new Error("Name, owner name, email, and password are required");
      error.statusCode = 400;
      throw error;
    }

    // Check if user email exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      const error = new Error("Email already registered with another account");
      error.statusCode = 409;
      throw error;
    }

    const restaurant = await Restaurant.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      description: description.trim(),
      status,
      isActive: status === "active",
      settings: {
        currency: currency.trim() || "PKR",
        taxRate: Number(taxRate) || 0,
        openingHours: openingHours.trim() || "11:00 AM - 11:00 PM",
      },
    });

    // Create restaurant_admin user (pre-save hook hashes passwordHash)
    const adminUser = await User.create({
      name: ownerName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: "restaurant_admin",
      restaurantId: restaurant._id,
      isActive: true,
    });

    // Auto-seed default starter categories if active
    if (status === "active") {
      await this._seedDefaultCategories(restaurant._id);
    }

    // Create audit log
    await PlatformAuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "TENANT_CREATED",
      targetRestaurantId: restaurant._id,
      targetRestaurantName: restaurant.name,
      metadata: { initialStatus: status, adminEmail: adminUser.email },
    });

    return {
      restaurant,
      adminUser: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }

  /**
   * Get complete restaurant profile, operational statistics, and team
   */
  async getRestaurantById(restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      const error = new Error("Restaurant not found");
      error.statusCode = 404;
      throw error;
    }

    const [
      tableCount,
      menuItemCount,
      categoryCount,
      orderCount,
      revenueResult,
      users,
      recentOrders,
      auditLogs,
    ] = await Promise.all([
      Table.countDocuments({ restaurantId }),
      MenuItem.countDocuments({ restaurantId }),
      Category.countDocuments({ restaurantId }),
      Order.countDocuments({ restaurantId }),
      Order.aggregate([
        {
          $match: {
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            status: { $ne: "Cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      User.find({ restaurantId }).select("-passwordHash").lean(),
      Order.find({ restaurantId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("tableId", "tableNumber")
        .lean(),
      PlatformAuditLog.find({ targetRestaurantId: restaurantId })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return {
      restaurant: {
        ...restaurant,
        id: restaurant._id.toString(),
      },
      stats: {
        tables: tableCount,
        menuItems: menuItemCount,
        categories: categoryCount,
        orders: orderCount,
        revenue: totalRevenue,
      },
      users: users.map((u) => ({
        ...u,
        id: u._id.toString(),
      })),
      recentOrders: recentOrders.map((o) => ({
        ...o,
        id: o._id.toString(),
      })),
      auditLogs: auditLogs.map((l) => ({
        ...l,
        id: l._id.toString(),
      })),
    };
  }

  /**
   * Approve a pending restaurant tenant
   */
  async approveRestaurant(restaurantId, actor) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error("Restaurant not found");
      error.statusCode = 404;
      throw error;
    }

    restaurant.status = "active";
    restaurant.isActive = true;
    await restaurant.save();

    // Auto-seed default categories if empty
    await this._seedDefaultCategories(restaurant._id);

    // Create audit log
    await PlatformAuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "TENANT_APPROVED",
      targetRestaurantId: restaurant._id,
      targetRestaurantName: restaurant.name,
      metadata: { previousStatus: "pending" },
    });

    return restaurant;
  }

  /**
   * Suspend an active restaurant tenant
   */
  async suspendRestaurant(restaurantId, actor, reason = "Suspended by Platform Administrator") {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error("Restaurant not found");
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = restaurant.status;
    restaurant.status = "suspended";
    restaurant.isActive = false;
    await restaurant.save();

    // Notify connected tenant sockets that tenant is suspended
    this._notifyTenant(restaurantId, "tenant:suspended", {
      restaurantId,
      reason,
      timestamp: new Date(),
    });

    // Create audit log
    await PlatformAuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "TENANT_SUSPENDED",
      targetRestaurantId: restaurant._id,
      targetRestaurantName: restaurant.name,
      metadata: { previousStatus, reason },
    });

    return restaurant;
  }

  /**
   * Reactivate a suspended restaurant tenant
   */
  async reactivateRestaurant(restaurantId, actor) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error("Restaurant not found");
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = restaurant.status;
    restaurant.status = "active";
    restaurant.isActive = true;
    await restaurant.save();

    // Create audit log
    await PlatformAuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "TENANT_REACTIVATED",
      targetRestaurantId: restaurant._id,
      targetRestaurantName: restaurant.name,
      metadata: { previousStatus },
    });

    return restaurant;
  }

  /**
   * Reset restaurant admin access credentials
   */
  async resetAccess(restaurantId, actor, customPassword) {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error("Restaurant not found");
      error.statusCode = 404;
      throw error;
    }

    const adminUser = await User.findOne({
      restaurantId,
      role: "restaurant_admin",
    });

    if (!adminUser) {
      const error = new Error("No restaurant_admin found for this restaurant");
      error.statusCode = 404;
      throw error;
    }

    const newPassword = customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : `DineFlow#${Math.floor(100000 + Math.random() * 900000)}`;

    adminUser.passwordHash = newPassword;
    await adminUser.save();

    await PlatformAuditLog.create({
      actorId: actor._id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: "ACCESS_RESET",
      targetRestaurantId: restaurant._id,
      targetRestaurantName: restaurant.name,
      metadata: { targetUserEmail: adminUser.email },
    });

    return {
      success: true,
      message: "Access credentials updated successfully",
      email: adminUser.email,
      temporaryPassword: newPassword,
    };
  }

  /**
   * Global platform analytics (GMV, orders, throughput, growth, leaderboards)
   */
  async getPlatformAnalytics() {
    // 1. Restaurant status counts
    const statusCounts = await Restaurant.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const tenantMetrics = {
      total: 0,
      active: 0,
      pending: 0,
      suspended: 0,
    };

    statusCounts.forEach((s) => {
      tenantMetrics[s._id] = s.count;
      tenantMetrics.total += s.count;
    });

    // 2. Global Order & Revenue stats
    const orderAgg = await Order.aggregate([
      {
        $facet: {
          totals: [
            {
              $match: { status: { $ne: "Cancelled" } },
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                avgOrderValue: { $avg: "$totalAmount" },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const totals = orderAgg[0]?.totals[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
    };

    const ordersByStatus = {};
    (orderAgg[0]?.byStatus || []).forEach((b) => {
      ordersByStatus[b._id] = b.count;
    });

    // 3. Top 5 restaurants by Revenue
    const topByRevenue = await Order.aggregate([
      {
        $match: { status: { $ne: "Cancelled" } },
      },
      {
        $group: {
          _id: "$restaurantId",
          revenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      { $unwind: "$restaurant" },
      {
        $project: {
          restaurantId: "$_id",
          name: "$restaurant.name",
          ownerName: "$restaurant.ownerName",
          status: "$restaurant.status",
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);

    // 4. Top 5 restaurants by Order Volume
    const topByOrders = await Order.aggregate([
      {
        $group: {
          _id: "$restaurantId",
          orderCount: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "_id",
          as: "restaurant",
        },
      },
      { $unwind: "$restaurant" },
      {
        $project: {
          restaurantId: "$_id",
          name: "$restaurant.name",
          ownerName: "$restaurant.ownerName",
          status: "$restaurant.status",
          orderCount: 1,
          revenue: 1,
        },
      },
    ]);

    // 5. Recent 6 months tenant growth
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyGrowth = await Restaurant.aggregate([
      {
        $match: { createdAt: { $gte: sixMonthsAgo } },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    return {
      tenants: tenantMetrics,
      orders: {
        total: totals.totalOrders,
        gmv: totals.totalRevenue,
        aov: Math.round(totals.avgOrderValue || 0),
        breakdown: ordersByStatus,
      },
      topByRevenue,
      topByOrders,
      monthlyGrowth,
    };
  }

  /**
   * Get platform audit logs
   */
  async getAuditLogs({ page = 1, limit = 20, restaurantId, action }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (restaurantId) filter.targetRestaurantId = restaurantId;
    if (action && action !== "all") filter.action = action;

    const totalCount = await PlatformAuditLog.countDocuments(filter);
    const logs = await PlatformAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return {
      logs: logs.map((l) => ({ ...l, id: l._id.toString() })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    };
  }
}

module.exports = new DevGateService();
