const sessionService = require('./session.service');

/**
 * Initialize a new guest session from scanned QR parameters.
 * Public endpoint (no prior session required).
 */
exports.initSession = async (req, res, next) => {
  try {
    const { restaurantId, tableId } = req.body;
    const session = await sessionService.initSession(restaurantId, tableId);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * Switch table for the active guest session.
 * Protected by guestAuth middleware (derives sessionToken from verified session).
 */
exports.switchTable = async (req, res, next) => {
  try {
    const { newTableId } = req.body;
    const sessionToken = req.guestSession.sessionToken;
    const result = await sessionService.switchTable(sessionToken, newTableId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current guest session status, table, and active order.
 * Protected by guestAuth middleware (derives sessionToken from verified session).
 */
exports.getSessionStatus = async (req, res, next) => {
  try {
    const sessionToken = req.guestSession.sessionToken;
    const status = await sessionService.getSessionStatus(sessionToken);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};
