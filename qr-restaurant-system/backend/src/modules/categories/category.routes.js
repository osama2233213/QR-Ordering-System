const express = require("express");
const { body, param } = require("express-validator");
const categoryController = require("./category.controller");
const authenticate = require("../../middleware/auth");
const tenantContext = require("../../middleware/tenantContext");
const roleCheck = require("../../middleware/roleCheck");
const { validateResult } = require("../../utils/validators");

const router = express.Router();

/**
 * Category Management Routes
 *
 * Middleware stack for all routes:
 * authenticate → tenantContext → roleCheck('restaurant_admin') → controller
 *
 * This ensures:
 * 1. JWT token is verified
 * 2. restaurantId is extracted from JWT
 * 3. Only restaurant admins can manage categories
 * 4. All database queries are filtered by restaurantId
 */

/**
 * POST /api/categories
 * Create a new category
 *
 * Body: { name, description?, displayOrder? }
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
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("displayOrder")
    .optional()
    .isInt()
    .withMessage("Display order must be a number"),
  validateResult, // Check validation results, return 400 if any errors
  categoryController.createCategory,
);

/**
 * GET /api/categories
 * Get all categories for current restaurant
 *
 * Query: ?isActive=true (optional)
 * Returns: 200 OK with array of categories
 */
router.get(
  "/",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  categoryController.getCategories,
);

/**
 * PUT /api/categories/:id
 * Update a category
 *
 * URL: /api/categories/{categoryId}
 * Body: { name?, description?, displayOrder?, isActive? }
 * Returns: 200 OK with updated category
 */
router.put(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid category ID"),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("displayOrder")
    .optional()
    .isInt()
    .withMessage("Display order must be a number"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  validateResult, // Check validation results
  categoryController.updateCategory,
);

/**
 * DELETE /api/categories/:id
 * Delete a category (soft delete - sets isActive to false)
 *
 * URL: /api/categories/{categoryId}
 * Returns: 200 OK
 */
router.delete(
  "/:id",
  authenticate, // Verify JWT token
  tenantContext, // Extract restaurantId from JWT
  roleCheck("restaurant_admin"), // Only admins
  param("id").isMongoId().withMessage("Invalid category ID"),
  validateResult, // Check validation results
  categoryController.deleteCategory,
);

module.exports = router;
