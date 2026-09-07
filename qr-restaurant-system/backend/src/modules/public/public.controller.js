const publicService = require('./public.service');

exports.verifyTableAndGetRestaurant = async (req, res, next) => {
  try {
    const { restaurantId, tableId } = req.params;
    // Multi-tenant check: verifies table belongs to this restaurant
    const validation = await publicService.validateTable(restaurantId, tableId);
    if (!validation.isValid) {
      return res.status(404).json({ success: false, message: 'Invalid restaurant or table QR code.' });
    }
    res.json({ success: true, data: validation });
  } catch (error) {
    next(error);
  }
};

exports.getPublicMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const menu = await publicService.getPublicMenu(restaurantId);
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
};

exports.getDemoTables = async (req, res, next) => {
  try {
    const data = await publicService.getDemoTables();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
