const express = require("express");
const { body, param } = require("express-validator");
const tableController = require("./table.controller");
const authenticate = require("../../middleware/auth");
const tenantContext = require("../../middleware/tenantContext");
const roleCheck = require("../../middleware/roleCheck");
const { validateResult } = require("../../utils/validators");

const router = express.Router();

/**
 * Table Management Routes (Admin CRUD)
 *
 * Middleware stack for all routes:
 * authenticate → tenantContext → roleCheck('restaurant_admin') → controller
 *
 * This ensures:
 * 1. JWT token is verified
 * 2. restaurantId is extracted from JWT
 * 3. Only restaurant admins can manage tables
 * 4. All database queries are filtered by restaurantId
 */

/**
 * POST /api/tables
 * Create a new table
 *
 * Body: { tableNumber, capacity? }
 * Returns: 201 Created
 */
router.post(
  "/",
  authenticate, // Step 1: Verify JWT token
  tenantContext, // Step 2: Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Step 3: Only admins
  body("tableNumber")
    .trim()
    .notEmpty()
    .withMessage("Table number is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Table number must be between 1 and 50 characters"),
  body("capacity")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Capacity must be a number between 1 and 100"),
  validateResult, // Check validation results, return 400 if errors
  tableController.createTable,
);

/**
 * GET /api/tables
 * Get all tables for current restaurant
 *
 * Query parameters:
 *   ?status=available - Filter by status (available, occupied, reserved)
 *
 * Returns: 200 OK with array of tables
 */
router.get(
  "/",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  tableController.getTables,
);

/**
 * GET /api/tables/:id
 * Get single table
 *
 * URL: /api/tables/{tableId}
 * Returns: 200 OK with table
 */
router.get(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid table ID"),
  validateResult,
  tableController.getTableById,
);

/**
 * PUT /api/tables/:id
 * Update a table
 *
 * URL: /api/tables/{tableId}
 * Body: { tableNumber?, capacity? }
 * Returns: 200 OK with updated table
 */
router.put(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid table ID"),
  body("tableNumber")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Table number must be between 1 and 50 characters"),
  body("capacity")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Capacity must be a number between 1 and 100"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  validateResult, // Check validation results
  tableController.updateTable,
);

/**
 * PATCH /api/tables/:id/status
 * Update table status
 *
 * URL: /api/tables/{tableId}/status
 * Body: { status: "available" | "occupied" | "reserved" }
 * Returns: 200 OK
 */
router.patch(
  "/:id/status",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid table ID"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["available", "occupied", "reserved"])
    .withMessage("Status must be one of: available, occupied, reserved"),
  validateResult,
  tableController.updateTableStatus,
);

/**
 * DELETE /api/tables/:id
 * Delete a table (soft delete - sets isActive to false)
 *
 * URL: /api/tables/{tableId}
 * Returns: 200 OK
 */
router.delete(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid table ID"),
  validateResult, // Check validation results
  tableController.deleteTable,
);

module.exports = router;
