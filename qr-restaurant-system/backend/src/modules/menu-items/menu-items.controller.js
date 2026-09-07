const menuItemsService = require("./menu-items.service");
const { emitMenuUpdated } = require("../../sockets/menuEvents");

/**
 * Menu Items Controller
 * HTTP request handlers for menu item management endpoints
 */

/**
 * Create a new menu item
 * POST /api/menu-items
 */
exports.createMenuItem = async (req, res, next) => {
  try {
    const result = await menuItemsService.createMenuItem(
      req.restaurantId,
      req.body,
    );

    emitMenuUpdated(req.restaurantId.toString(), { action: 'item_created', item: result });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Pass error to global error handler middleware
    next(error);
  }
};

/**
 * Get all menu items for current restaurant
 * GET /api/menu-items
 */
exports.getMenuItems = async (req, res, next) => {
  try {
    const result = await menuItemsService.getMenuItems(
      req.restaurantId,
      req.query, // Pass query params for optional filtering
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single menu item
 * GET /api/menu-items/:id
 */
exports.getMenuItemById = async (req, res, next) => {
  try {
    const result = await menuItemsService.getMenuItemById(
      req.restaurantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a menu item
 * PUT /api/menu-items/:id
 */
exports.updateMenuItem = async (req, res, next) => {
  try {
    const result = await menuItemsService.updateMenuItem(
      req.restaurantId,
      req.params.id,
      req.body,
    );

    emitMenuUpdated(req.restaurantId.toString(), { action: 'item_updated', item: result });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update menu item availability
 * PATCH /api/menu-items/:id/availability
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const result = await menuItemsService.updateAvailability(
      req.restaurantId,
      req.params.id,
      req.body.isAvailable,
    );

    emitMenuUpdated(req.restaurantId.toString(), {
      action: 'item_availability_updated',
      itemId: req.params.id,
      isAvailable: req.body.isAvailable,
      item: result,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a menu item (soft delete)
 * DELETE /api/menu-items/:id
 */
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const result = await menuItemsService.deleteMenuItem(
      req.restaurantId,
      req.params.id,
    );

    emitMenuUpdated(req.restaurantId.toString(), {
      action: 'item_deleted',
      itemId: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
