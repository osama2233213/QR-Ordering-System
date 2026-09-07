const devgateService = require("./devgate.service");

exports.getRestaurants = async (req, res, next) => {
  try {
    const { search, status, page, limit } = req.query;
    const result = await devgateService.listRestaurants({
      search,
      status,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.createRestaurant = async (req, res, next) => {
  try {
    const result = await devgateService.createRestaurant(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Restaurant tenant created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRestaurantById = async (req, res, next) => {
  try {
    const result = await devgateService.getRestaurantById(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const result = await devgateService.approveRestaurant(req.params.id, req.user);
    res.json({
      success: true,
      message: "Restaurant approved and activated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.suspend = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const result = await devgateService.suspendRestaurant(
      req.params.id,
      req.user,
      reason
    );
    res.json({
      success: true,
      message: "Restaurant tenant has been suspended",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.reactivate = async (req, res, next) => {
  try {
    const result = await devgateService.reactivateRestaurant(
      req.params.id,
      req.user
    );
    res.json({
      success: true,
      message: "Restaurant tenant reactivated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetAccess = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const result = await devgateService.resetAccess(
      req.params.id,
      req.user,
      password
    );
    res.json({
      success: true,
      message: "Restaurant admin access reset successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const result = await devgateService.getPlatformAnalytics();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, restaurantId, action } = req.query;
    const result = await devgateService.getAuditLogs({
      page,
      limit,
      restaurantId,
      action,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
