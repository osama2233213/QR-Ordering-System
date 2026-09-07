const orderService = require('./order.service');
const { emitOrderCreated, emitOrderStatusUpdated } = require('../../sockets/orderEvents');

/**
 * Place a new order for an active guest session.
 * Customer endpoint (Protected by guestAuth middleware).
 */
exports.placeOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.guestSession, req.body);

    // Real-time notification to restaurant kitchen queue
    emitOrderCreated(order.restaurantId.toString(), order);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * Track an order's status and details for the active guest session.
 * Customer endpoint (Protected by guestAuth middleware).
 */
exports.getOrderForGuest = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderForGuest(req.guestSession, orderId);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * List all orders for the current restaurant.
 * Staff endpoint (Protected by JWT authenticate + tenantContext + roleCheck).
 */
exports.getRestaurantOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersByRestaurant(req.restaurantId, req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an order's preparation/fulfillment status.
 * Staff endpoint (Protected by JWT authenticate + tenantContext + roleCheck).
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const updated = await orderService.updateOrderStatus(req.restaurantId, orderId, status);

    // Real-time update to customer tracking and kitchen staff dashboards
    emitOrderStatusUpdated(req.restaurantId.toString(), orderId, status);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
