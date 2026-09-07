const Restaurant = require('../../models/Restaurant');
const Table = require('../../models/Table');
const Category = require('../../models/Category');
const MenuItem = require('../../models/MenuItem');

/**
 * Public Service
 * Handles public data retrieval for customer QR ordering flow.
 * Enforces strict multi-tenant validation and filters inactive/unavailable data.
 */
class PublicService {
  /**
   * Validate restaurant and table existence and active status.
   * Ensures the table strictly belongs to the specified restaurant.
   * 
   * @param {string} restaurantId 
   * @param {string} tableId 
   * @returns {Promise<object>} Safe public restaurant and table metadata
   */
  async validateTable(restaurantId, tableId) {
    // 1. Verify restaurant is active and approved
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: 'active',
      isActive: true,
    });

    if (!restaurant) {
      const error = new Error('Restaurant not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify table exists, belongs to this restaurant, and is active
    const table = await Table.findOne({
      _id: tableId,
      restaurantId: restaurantId,
      isActive: true,
    });

    if (!table) {
      const error = new Error('Table not found or inactive for this restaurant');
      error.statusCode = 404;
      throw error;
    }

    // 3. Return sanitized public data (no sensitive owner/contact details)
    return {
      isValid: true,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        logoUrl: restaurant.logoUrl,
        settings: restaurant.settings,
      },
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
      },
    };
  }

  /**
   * Retrieve active categories and available menu items for a restaurant.
   * 
   * @param {string} restaurantId 
   * @returns {Promise<object>} Active categories and available menu items
   */
  async getPublicMenu(restaurantId) {
    // 1. Verify restaurant is active
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: 'active',
      isActive: true,
    });

    if (!restaurant) {
      const error = new Error('Restaurant not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    // 2. Fetch active categories ordered by displayOrder
    const categories = await Category.find({
      restaurantId,
      isActive: true,
    })
      .sort({ displayOrder: 1 })
      .select('_id name description displayOrder')
      .lean();

    // 3. Fetch active and available menu items
    const items = await MenuItem.find({
      restaurantId,
      isActive: true,
      isAvailable: true,
    })
      .select('_id categoryId name description price imageUrl preparationTimeMinutes')
      .lean();

    return {
      categories,
      items,
    };
  }

  /**
   * Retrieve active restaurants and their tables for demo table selector
   */
  async getDemoTables() {
    const restaurants = await Restaurant.find({
      status: 'active',
      isActive: true,
    })
      .select('_id name description address settings')
      .lean();

    const restaurantIds = restaurants.map((r) => r._id);
    const tables = await Table.find({
      restaurantId: { $in: restaurantIds },
      isActive: true,
    })
      .sort({ tableNumber: 1 })
      .lean();

    const tablesByRestaurant = {};
    tables.forEach((t) => {
      const rId = t.restaurantId.toString();
      if (!tablesByRestaurant[rId]) tablesByRestaurant[rId] = [];
      tablesByRestaurant[rId].push({
        id: t._id.toString(),
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: t.status,
      });
    });

    return restaurants.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      address: r.address,
      currency: r.settings?.currency || 'PKR',
      tables: tablesByRestaurant[r._id.toString()] || [],
    }));
  }
}

module.exports = new PublicService();
