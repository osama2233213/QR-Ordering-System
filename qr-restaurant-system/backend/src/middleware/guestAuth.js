const GuestSession = require('../models/GuestSession');

/**
 * Guest Session Authentication Middleware
 * 
 * Verifies guest session token from `x-session-token` header.
 * Confirms that the session exists in MongoDB, is active, and has not expired.
 * Attaches verified session details to `req.guestSession`.
 */
const guestAuth = async (req, res, next) => {
  try {
    const token = req.headers['x-session-token'];

    if (!token) {
      const error = new Error('Access denied. No session token provided.');
      error.statusCode = 401;
      return next(error);
    }

    const session = await GuestSession.findOne({
      sessionToken: token,
      active: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      const error = new Error('Invalid, inactive, or expired session.');
      error.statusCode = 401;
      return next(error);
    }

    // Attach verified guest session context to the request
    req.guestSession = {
      sessionId: session._id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      activeOrderId: session.activeOrderId,
      sessionToken: session.sessionToken,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = guestAuth;
