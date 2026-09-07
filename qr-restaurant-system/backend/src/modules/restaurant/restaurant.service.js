const mongoose = require("mongoose");
const Restaurant = require("../../models/Restaurant");
const Order = require("../../models/Order");
const Table = require("../../models/Table");
const MenuItem = require("../../models/MenuItem");

class RestaurantService {
  async getRestaurantProfile(restaurantId) {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return restaurant;
  }

  async updateRestaurantProfile(restaurantId, updateData) {
    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return restaurant;
  }

  /**
   * Aggregate real-time KPIs and recent orders for restaurant dashboard
   */
  async getDashboardSummary(restaurantId) {
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      inKitchenCount,
      totalTablesCount,
      occupiedTablesCount,
      recentOrders,
      popularDishes,
      servedOrders,
    ] = await Promise.all([
      // 1. All orders placed today
      Order.find({
        restaurantId: restaurantObjectId,
        createdAt: { $gte: todayStart },
      }).lean(),

      // 2. Active orders in kitchen queue
      Order.countDocuments({
        restaurantId: restaurantObjectId,
        status: { $in: ["Placed", "Received", "Preparing"] },
      }),

      // 3. Total active tables
      Table.countDocuments({
        restaurantId: restaurantObjectId,
        isActive: true,
      }),

      // 4. Occupied tables
      Table.countDocuments({
        restaurantId: restaurantObjectId,
        status: "occupied",
        isActive: true,
      }),

      // 5. Recent 10 orders for live feed
      Order.find({ restaurantId: restaurantObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("tableId", "tableNumber")
        .lean(),

      // 6. Top 5 popular dishes by order frequency
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurantObjectId,
            status: { $ne: "Cancelled" },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.nameSnapshot",
            count: { $sum: "$items.quantity" },
            revenue: {
              $sum: { $multiply: ["$items.priceSnapshot", "$items.quantity"] },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // 7. Served orders to calculate real average preparation/fulfillment duration
      Order.find({
        restaurantId: restaurantObjectId,
        status: "Served",
      })
        .sort({ updatedAt: -1 })
        .limit(50)
        .select("createdAt updatedAt")
        .lean(),
    ]);

    const todayOrdersCount = ordersToday.length;
    const todayRevenue = ordersToday
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Calculate real average preparation time in minutes (Placed createdAt -> Served updatedAt)
    let avgPrepSpeedMinutes = null;
    if (servedOrders && servedOrders.length > 0) {
      const validServedOrders = servedOrders.filter(
        (o) => o.createdAt && o.updatedAt && new Date(o.updatedAt) > new Date(o.createdAt)
      );
      if (validServedOrders.length > 0) {
        const totalDurationMs = validServedOrders.reduce((sum, o) => {
          return sum + (new Date(o.updatedAt) - new Date(o.createdAt));
        }, 0);
        const avgMinutes = totalDurationMs / (validServedOrders.length * 60 * 1000);
        avgPrepSpeedMinutes = Number(avgMinutes.toFixed(1));
      }
    }

    return {
      todayOrdersCount,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      inKitchenCount,
      totalTablesCount,
      occupiedTablesCount,
      avgPrepSpeedMinutes,
      recentOrders,
      popularDishes: popularDishes.map((d) => ({
        name: d._id || "Dish",
        soldCount: d.count,
        revenue: Number(d.revenue.toFixed(2)),
      })),
    };
  }

  /**
   * Real-time Sales Analytics Aggregation
   * Calculates Daily, Weekly, and Monthly Revenue, Order Volumes, Average Order Values,
   * Top Selling Dishes, and Day-by-Day trend breakdown.
   */
  async getSalesAnalytics(restaurantId, query = {}) {
    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const period = query.period || '7d'; // 'today', '7d', '30d'

    const now = new Date();
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // default 7d
      startDate.setDate(now.getDate() - 7);
    }

    const matchFilter = {
      restaurantId: restaurantObjectId,
      createdAt: { $gte: startDate },
      status: { $ne: 'Cancelled' },
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(now.getDate() - 30);

    const [
      filteredOrders,
      dailyRevenueAgg,
      weeklyRevenueAgg,
      monthlyRevenueAgg,
      topDishesAgg,
      trendAgg,
    ] = await Promise.all([
      // 1. Orders in selected period
      Order.find(matchFilter).select('totalAmount status createdAt items').lean(),

      // 2. Today's revenue & orders
      Order.aggregate([
        { $match: { restaurantId: restaurantObjectId, createdAt: { $gte: todayStart }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // 3. Last 7 days revenue & orders
      Order.aggregate([
        { $match: { restaurantId: restaurantObjectId, createdAt: { $gte: weekStart }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // 4. Last 30 days revenue & orders
      Order.aggregate([
        { $match: { restaurantId: restaurantObjectId, createdAt: { $gte: monthStart }, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // 5. Top Selling Dishes in period
      Order.aggregate([
        { $match: matchFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.nameSnapshot',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.priceSnapshot', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),

      // 6. Day-by-Day trend in period
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const periodRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const periodOrderVolume = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'Served').length;
    const averageOrderValue = periodOrderVolume > 0 ? Number((periodRevenue / periodOrderVolume).toFixed(2)) : 0;

    return {
      period,
      periodRevenue: Number(periodRevenue.toFixed(2)),
      periodOrderVolume,
      completedOrders,
      averageOrderValue,
      dailyRevenue: Number((dailyRevenueAgg[0]?.total || 0).toFixed(2)),
      dailyOrders: dailyRevenueAgg[0]?.count || 0,
      weeklyRevenue: Number((weeklyRevenueAgg[0]?.total || 0).toFixed(2)),
      weeklyOrders: weeklyRevenueAgg[0]?.count || 0,
      monthlyRevenue: Number((monthlyRevenueAgg[0]?.total || 0).toFixed(2)),
      monthlyOrders: monthlyRevenueAgg[0]?.count || 0,
      topDishes: topDishesAgg.map((d) => ({
        name: d._id || 'Dish',
        quantity: d.quantity,
        revenue: Number(d.revenue.toFixed(2)),
      })),
      trend: trendAgg.map((t) => ({
        date: t._id,
        revenue: Number(t.revenue.toFixed(2)),
        orders: t.orders,
      })),
    };
  }
}

module.exports = new RestaurantService();
