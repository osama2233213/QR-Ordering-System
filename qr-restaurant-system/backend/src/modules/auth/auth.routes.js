const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const authController = require("./auth.controller");
const authenticate = require("../../middleware/auth");
const { validateResult } = require("../../utils/validators");

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  "/login",
  // Validation chain
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Password is required"),
  // Check validation results
  validateResult,
  // Controller
  authController.login,
);

/**
 * POST /api/auth/register
 * Register new restaurant admin with restaurant
 */
router.post(
  "/register",
  // Validation chain
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  body("restaurantName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Restaurant name must be at least 2 characters"),
  body("ownerName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Owner name must be at least 2 characters"),
  // Check validation results
  validateResult,
  // Controller
  authController.register,
);

/**
 * GET /api/auth/me
 * Get current authenticated user information
 * Protected: requires valid JWT token
 */
router.get("/me", authenticate, authController.getMe);

module.exports = router;
