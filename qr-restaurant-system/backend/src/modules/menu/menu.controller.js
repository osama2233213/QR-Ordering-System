const menuService = require('./menu.service');

exports.getCategories = async (req, res, next) => {
  try {
    // Multi-tenant: filter by req.restaurantId
    const categories = await menuService.getCategories(req.restaurantId);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.getMenuItems = async (req, res, next) => {
  try {
    const items = await menuService.getMenuItems(req.restaurantId, req.query.categoryId);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};
