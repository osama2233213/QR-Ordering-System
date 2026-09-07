const Order = require('../../models/Order');
const MenuItem = require('../../models/MenuItem');
const GuestSession = require('../../models/GuestSession');
const Table = require('../../models/Table');
const { emitTableUpdated } = require('../../sockets/tableEvents');

/**
 * Order Service
 * Handles customer order placement, order lookup, and staff order management.
 * Enforces strict price isolation, guest session ownership, and multi-tenant security.
 */
class OrderService {
  /**
   * Create an order from an active guest session.
   * Calculates prices strictly on the server from MenuItem records.
   * 
   * @param {object} guestSession - Verified guest session { sessionId, restaurantId, tableId }
   * @param {object} orderData - Request data { items: [{ menuItemId, quantity, notes? }], notes? }
   * @returns {Promise<object>} Created order document
   */
  async createOrder(guestSession, orderData) {
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      const error = new Error('Order must contain at least one item');
      error.statusCode = 400;
      throw error;
    }

    let totalAmount = 0;
    const processedItems = [];

    // Process and verify each item against the database
    for (const item of orderData.items) {
      if (!item.menuItemId || !item.quantity || item.quantity < 1) {
        const error = new Error('Each order item must specify a valid menuItemId and quantity >= 1');
        error.statusCode = 400;
        throw error;
      }

      // Fetch menu item directly from DB to verify price, availability, and restaurant ownership
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurantId: guestSession.restaurantId,
        isActive: true,
        isAvailable: true,
      });

      if (!menuItem) {
        const error = new Error(`Menu item '${item.menuItemId}' is unavailable or invalid for this restaurant`);
        error.statusCode = 400;
        throw error;
      }

      // Build immutable snapshot using SERVER-SIDE values only
      const quantity = Math.floor(item.quantity);
      const priceSnapshot = menuItem.price;
      const itemSubtotal = priceSnapshot * quantity;

      totalAmount += itemSubtotal;

      processedItems.push({
        menuItemId: menuItem._id,
        nameSnapshot: menuItem.name,
        priceSnapshot,
        quantity,
        notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      });
    }

    // Persist Order in MongoDB
    const order = await Order.create({
      restaurantId: guestSession.restaurantId,
      tableId: guestSession.tableId,
      guestSessionId: guestSession.sessionId,
      items: processedItems,
      status: 'Placed',
      paymentStatus: 'unpaid',
      totalAmount,
      notes: typeof orderData.notes === 'string' ? orderData.notes.trim() : '',
    });

    // Link active order to guest session
    await GuestSession.findByIdAndUpdate(guestSession.sessionId, {
      activeOrderId: order._id,
    });

    // Mark table as occupied
    const updatedTable = await Table.findByIdAndUpdate(
      guestSession.tableId,
      { status: 'occupied' },
      { new: true }
    );

    if (updatedTable) {
      emitTableUpdated(guestSession.restaurantId.toString(), updatedTable);
    }

    await order.populate('tableId', 'tableNumber');

    return order;
  }

  /**
   * Retrieve order details for a guest, verifying that the order belongs to their active session.
   * 
   * @param {object} guestSession - Verified guest session { sessionId }
   * @param {string} orderId - Order ID to retrieve
   * @returns {Promise<object>} Order document
   */
  async getOrderForGuest(guestSession, orderId) {
    const order = await Order.findById(orderId)
      .populate('tableId', 'tableNumber')
      .populate('restaurantId', 'name settings');

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    // CRITICAL SECURITY: Verify order belongs to the requesting guest's session
    if (order.guestSessionId.toString() !== guestSession.sessionId.toString()) {
      const error = new Error('Forbidden: You can only view orders from your active session');
      error.statusCode = 403;
      throw error;
    }

    return order;
  }

  /**
   * Retrieve orders for a restaurant (Staff endpoint).
   * 
   * @param {string} restaurantId 
   * @param {object} query 
   * @returns {Promise<Array>} List of orders
   */
  async getOrdersByRestaurant(restaurantId, query = {}) {
    const filter = { restaurantId };
    if (query.status) {
      filter.status = query.status;
    }

    return await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('tableId', 'tableNumber')
      .populate('guestSessionId', 'active');
  }

  /**
   * Update order status (Staff endpoint).
   * 
   * @param {string} restaurantId 
   * @param {string} orderId 
   * @param {string} newStatus 
   * @returns {Promise<object>} Updated order document
   */
  async updateOrderStatus(restaurantId, orderId, newStatus) {
    const validStatuses = ['Placed', 'Received', 'Preparing', 'Ready', 'Served', 'Cancelled'];
    if (!validStatuses.includes(newStatus)) {
      const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, restaurantId },
      { status: newStatus },
      { new: true }
    ).populate('tableId', 'tableNumber');

    if (!order) {
      const error = new Error('Order not found for this restaurant');
      error.statusCode = 404;
      throw error;
    }

    return order;
  }
}

module.exports = new OrderService();
