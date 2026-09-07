const restaurantService = require('./restaurant.service');

exports.getProfile = async (req, res, next) => {
  try {
    // Multi-tenant check: always use req.restaurantId from tenantContext
    const profile = await restaurantService.getRestaurantProfile(req.restaurantId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updated = await restaurantService.updateRestaurantProfile(req.restaurantId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const summary = await restaurantService.getDashboardSummary(req.restaurantId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const analytics = await restaurantService.getSalesAnalytics(req.restaurantId, req.query);
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};
