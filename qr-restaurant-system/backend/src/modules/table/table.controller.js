const tableService = require("./table.service");
const { emitTableUpdated } = require("../../sockets/tableEvents");

/**
 * Table Management Controller
 * HTTP request handlers for table management endpoints
 */

/**
 * Create a new table
 * POST /api/tables
 */
exports.createTable = async (req, res, next) => {
  try {
    const result = await tableService.createTable(req.restaurantId, req.body);

    emitTableUpdated(req.restaurantId.toString(), result);

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
 * Get all tables for current restaurant
 * GET /api/tables
 */
exports.getTables = async (req, res, next) => {
  try {
    const result = await tableService.getTablesByRestaurant(
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
 * Get single table
 * GET /api/tables/:id
 */
exports.getTableById = async (req, res, next) => {
  try {
    const result = await tableService.getTableById(
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
 * Update a table
 * PUT /api/tables/:id
 */
exports.updateTable = async (req, res, next) => {
  try {
    const result = await tableService.updateTable(
      req.restaurantId,
      req.params.id,
      req.body,
    );

    emitTableUpdated(req.restaurantId.toString(), result);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update table status
 * PATCH /api/tables/:id/status
 */
exports.updateTableStatus = async (req, res, next) => {
  try {
    const result = await tableService.updateTableStatus(
      req.restaurantId,
      req.params.id,
      req.body.status,
    );

    emitTableUpdated(req.restaurantId.toString(), result);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a table (soft delete)
 * DELETE /api/tables/:id
 */
exports.deleteTable = async (req, res, next) => {
  try {
    const result = await tableService.deleteTable(
      req.restaurantId,
      req.params.id,
    );

    emitTableUpdated(req.restaurantId.toString(), {
      _id: req.params.id,
      isActive: false,
    });

    res.status(200).json({
      success: true,
      message: "Table deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
