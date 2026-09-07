const { getIO } = require('../config/socket');

/**
 * Real-time socket events for menu and category updates.
 * Broadcasts to the restaurant's room so all connected staff dashboards
 * and customer QR ordering devices receive instantaneous updates.
 */
const emitMenuUpdated = (restaurantId, details = {}) => {
  try {
    const io = getIO();
    io.to(`restaurant_${restaurantId}`).emit('menu:updated', details);
  } catch (error) {
    console.error('[Socket Error] emitMenuUpdated:', error.message);
  }
};

module.exports = {
  emitMenuUpdated,
};
