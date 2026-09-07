const GuestSession = require('../../models/GuestSession');
const Restaurant = require('../../models/Restaurant');
const Table = require('../../models/Table');
const Order = require('../../models/Order');
const TableTransferAudit = require('../../models/TableTransferAudit');
const { generateSessionToken } = require('../../utils/sessionToken');

/**
 * Guest Session Service
 * Handles creation, validation, table-switching, and status querying for guest sessions.
 * Enforces strict multi-tenant isolation and session verification.
 */
class SessionService {
  /**
   * Initialize a new guest session after scanning a valid QR code.
   * 
   * @param {string} restaurantId 
   * @param {string} tableId 
   * @returns {Promise<object>} Created session metadata including session token and expiry
   */
  async initSession(restaurantId, tableId) {
    // 1. Verify restaurant exists, is approved and active
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

    // 3. Generate cryptographically secure random session token
    const sessionToken = generateSessionToken();

    // 4. Set session TTL (2 hours duration)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // 5. Persist GuestSession
    const session = await GuestSession.create({
      sessionToken,
      restaurantId,
      tableId,
      activeOrderId: null,
      active: true,
      expiresAt,
    });

    return {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
    };
  }

  /**
   * Switch the guest session to a different table within the same restaurant.
   * Updates any active order and logs an audit record.
   * 
   * @param {string} sessionToken 
   * @param {string} newTableId 
   * @returns {Promise<object>} Switch result with updated table details
   */
  async switchTable(sessionToken, newTableId) {
    // 1. Find active, non-expired guest session
    const session = await GuestSession.findOne({
      sessionToken,
      active: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      const error = new Error('Invalid, inactive, or expired session');
      error.statusCode = 401;
      throw error;
    }

    // 2. If newTableId is identical to current tableId, no-op
    if (session.tableId.toString() === newTableId.toString()) {
      return {
        success: true,
        message: 'Session is already assigned to this table',
        sessionId: session._id,
        tableId: session.tableId,
      };
    }

    // 3. CRITICAL SECURITY: Verify new table exists and belongs to the SAME restaurant
    const newTable = await Table.findOne({
      _id: newTableId,
      restaurantId: session.restaurantId,
      isActive: true,
    });

    if (!newTable) {
      const error = new Error('New table not found or inactive for this restaurant');
      error.statusCode = 404;
      throw error;
    }

    const fromTableId = session.tableId;

    // 4. Update session tableId
    session.tableId = newTable._id;
    await session.save();

    // 5. If there is an active order linked to this session, update its tableId
    if (session.activeOrderId) {
      await Order.findByIdAndUpdate(session.activeOrderId, {
        tableId: newTable._id,
      });
    }

    // 6. Record transfer in audit log
    await TableTransferAudit.create({
      restaurantId: session.restaurantId,
      sessionId: session._id,
      orderId: session.activeOrderId || null,
      fromTableId,
      toTableId: newTable._id,
    });

    return {
      success: true,
      sessionId: session._id,
      fromTableId,
      toTableId: newTable._id,
      activeOrderId: session.activeOrderId,
    };
  }

  /**
   * Get the current status and linked details of a guest session.
   * 
   * @param {string} sessionToken 
   * @returns {Promise<object>} Session status, active table, and active order details
   */
  async getSessionStatus(sessionToken) {
    const session = await GuestSession.findOne({
      sessionToken,
      active: true,
      expiresAt: { $gt: new Date() },
    })
      .populate('tableId', 'tableNumber status capacity')
      .populate('activeOrderId', 'status paymentStatus totalAmount items createdAt');

    if (!session) {
      const error = new Error('Invalid, inactive, or expired session');
      error.statusCode = 401;
      throw error;
    }

    return {
      sessionId: session._id,
      sessionToken: session.sessionToken,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      activeOrderId: session.activeOrderId,
      active: session.active,
      expiresAt: session.expiresAt,
    };
  }
}

module.exports = new SessionService();
