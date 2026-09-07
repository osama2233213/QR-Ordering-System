const express = require("express");
const { body, param } = require("express-validator");
const menuItemsController = require("./menu-items.controller");
const authenticate = require("../../middleware/auth");
const tenantContext = require("../../middleware/tenantContext");
const roleCheck = require("../../middleware/roleCheck");
const { validateResult } = require("../../utils/validators");

const router = express.Router();

/**
 * Menu Items Management Routes (Admin CRUD)
 *
 * Middleware stack for all routes:
 * authenticate → tenantContext → roleCheck('restaurant_admin') → controller
 *
 * This ensures:
 * 1. JWT token is verified
 * 2. restaurantId is extracted from JWT
 * 3. Only restaurant admins can manage menu items
 * 4. All database queries are filtered by restaurantId
 */

/**
 * POST /api/menu-items
 * Create a new menu item
 *
 * Body: { name, categoryId, price, description?, imageUrl?, preparationTimeMinutes? }
 * Returns: 201 Created
 */
router.post(
  "/",
  authenticate, // Step 1: Verify JWT token
  tenantContext, // Step 2: Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Step 3: Only admins
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Menu item name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Menu item name must be between 2 and 100 characters"),
  body("categoryId")
    .trim()
    .notEmpty()
    .withMessage("Category ID is required")
    .isMongoId()
    .withMessage("Invalid category ID"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("imageUrl")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image URL must not exceed 500 characters"),
  body("preparationTimeMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Preparation time must be at least 1 minute"),
  validateResult, // Check validation results, return 400 if errors
  menuItemsController.createMenuItem,
);

/**
 * GET /api/menu-items
 * Get all menu items for current restaurant
 *
 * Query parameters:
 *   ?categoryId={id} - Filter by category
 *   ?isAvailable=true - Filter by availability
 *
 * Returns: 200 OK with array of menu items
 */
router.get(
  "/",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  menuItemsController.getMenuItems,
);

/**
 * GET /api/menu-items/:id
 * Get single menu item
 *
 * URL: /api/menu-items/{menuItemId}
 * Returns: 200 OK with menu item
 */
router.get(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid menu item ID"),
  validateResult,
  menuItemsController.getMenuItemById,
);

/**
 * PUT /api/menu-items/:id
 * Update a menu item
 *
 * URL: /api/menu-items/{menuItemId}
 * Body: { name?, categoryId?, description?, price?, imageUrl?, preparationTimeMinutes? }
 * Returns: 200 OK with updated menu item
 */
router.put(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid menu item ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Menu item name must be between 2 and 100 characters"),
  body("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("imageUrl")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Image URL must not exceed 500 characters"),
  body("preparationTimeMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Preparation time must be at least 1 minute"),
  validateResult, // Check validation results
  menuItemsController.updateMenuItem,
);

/**
 * PATCH /api/menu-items/:id/availability
 * Update menu item availability
 *
 * URL: /api/menu-items/{menuItemId}/availability
 * Body: { isAvailable: true|false }
 * Returns: 200 OK
 */
router.patch(
  "/:id/availability",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid menu item ID"),
  body("isAvailable").isBoolean().withMessage("isAvailable must be a boolean"),
  validateResult,
  menuItemsController.updateAvailability,
);

/**
 * DELETE /api/menu-items/:id
 * Delete a menu item (soft delete - sets isActive to false)
 *
 * URL: /api/menu-items/{menuItemId}
 * Returns: 200 OK
 */
router.delete(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid menu item ID"),
  validateResult, // Check validation results
  menuItemsController.deleteMenuItem,
);

module.exports = router;
