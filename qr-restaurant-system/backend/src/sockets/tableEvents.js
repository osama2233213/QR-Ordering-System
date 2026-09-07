const { getIO } = require('../config/socket');

/**
 * Real-time socket events for table status and configuration updates.
 * Broadcasts to the restaurant's room so active staff dashboards
 * immediately see table occupancy changes (available / occupied / reserved).
 */
const emitTableUpdated = (restaurantId, table) => {
  try {
    const io = getIO();
    io.to(`restaurant_${restaurantId}`).emit('table:updated', table);
  } catch (error) {
    console.error('[Socket Error] emitTableUpdated:', error.message);
  }
};

module.exports = {
  emitTableUpdated,
};
