const categoryService = require("./category.service");
const { emitMenuUpdated } = require("../../sockets/menuEvents");

/**
 * Category Controller
 * HTTP request handlers for category endpoints
 */

/**
 * Create a new category
 * POST /api/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const result = await categoryService.createCategory(
      req.restaurantId,
      req.body,
    );

    emitMenuUpdated(req.restaurantId.toString(), { action: 'category_created', category: result });

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
 * Get all categories for current restaurant
 * GET /api/categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const result = await categoryService.getCategoriesByRestaurant(
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
 * Update a category
 * PUT /api/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const result = await categoryService.updateCategory(
      req.restaurantId,
      req.params.id,
      req.body,
    );

    emitMenuUpdated(req.restaurantId.toString(), { action: 'category_updated', category: result });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a category (soft delete)
 * DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(
      req.restaurantId,
      req.params.id,
    );

    emitMenuUpdated(req.restaurantId.toString(), { action: 'category_deleted', categoryId: req.params.id });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
