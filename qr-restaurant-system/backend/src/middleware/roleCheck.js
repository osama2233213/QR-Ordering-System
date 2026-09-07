/**
 * Role-Based Access Control Middleware
 * @param  {...string} allowedRoles - e.g. 'restaurant_admin', 'devgate_admin', 'kitchen_staff'
 */
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' does not have permission for this resource.`
      });
    }

    next();
  };
};

module.exports = roleCheck;
