/**
 * Multi-Tenant Context Middleware
 * 
 * SECURITY RULE:
 * Never trust restaurantId from request body, params, or query for protected routes.
 * Always derive it strictly from the verified JWT payload attached to req.user.
 */
const tenantContext = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required for tenant context.' });
  }

  // Super admins (DevGate) may operate cross-tenant when explicitly authorized
  if (req.user.role === 'devgate_admin') {
    req.restaurantId = req.headers['x-tenant-override'] || req.user.restaurantId || null;
    return next();
  }

  if (!req.user.restaurantId) {
    return res.status(403).json({ success: false, message: 'Tenant identifier missing in authentication token.' });
  }

  // Attach verified tenant context
  req.restaurantId = req.user.restaurantId;
  next();
};

module.exports = tenantContext;
