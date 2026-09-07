const { getIO } = require('../config/socket');

const emitOrderCreated = (restaurantId, order) => {
  try {
    const io = getIO();
    io.to(`restaurant_${restaurantId}`).emit('order:created', order);
  } catch (error) {
    console.error('[Socket Error] emitOrderCreated:', error.message);
  }
};

const emitOrderStatusUpdated = (restaurantId, orderId, newStatus) => {
  try {
    const io = getIO();
    // Notify staff dashboard
    io.to(`restaurant_${restaurantId}`).emit('order:status_updated', { orderId, status: newStatus });
    // Notify customer tracking screen
    io.to(`order_${orderId}`).emit('order:status_updated', { orderId, status: newStatus });
  } catch (error) {
    console.error('[Socket Error] emitOrderStatusUpdated:', error.message);
  }
};

module.exports = {
  emitOrderCreated,
  emitOrderStatusUpdated
};
