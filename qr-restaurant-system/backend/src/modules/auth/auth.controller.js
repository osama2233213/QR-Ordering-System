// backend/src/modules/auth/auth.controller.js

const authService = require("./auth.service");

/**
 * POST /api/auth/login
 *
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,

      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 *
 * Register restaurant admin
 *
 * Note:
 * This only creates a pending restaurant.
 * It does NOT login the user.
 */
exports.register = async (req, res, next) => {
  try {
    const result = await authService.registerAdmin(req.body);

    res.status(201).json({
      success: true,

      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 *
 * Protected route
 *
 * Requires:
 * JWT middleware
 *
 * req.user comes from verified JWT
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,

      data: user,
    });
  } catch (error) {
    next(error);
  }
};
