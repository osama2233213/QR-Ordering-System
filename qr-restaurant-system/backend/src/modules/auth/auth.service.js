// backend/src/modules/auth/auth.service.js

const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Restaurant = require("../../models/Restaurant");

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      restaurantId: user.restaurantId ? user.restaurantId.toString() : null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
}

class AuthService {
  /**
   * Login existing user
   */
  async login(email, password) {
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // DevGate admin is platform level
    // Restaurant status check only applies to restaurant users
    if (user.role !== "devgate_admin") {
      const restaurant = await Restaurant.findById(user.restaurantId);

      if (!restaurant) {
        const error = new Error("Restaurant not found");
        error.statusCode = 404;
        throw error;
      }

      // IMPORTANT:
      // Only approved restaurants can login.
      // pending and suspended both blocked.

      if (restaurant.status !== "active") {
        const error = new Error(
          restaurant.status === "suspended"
            ? "Restaurant is suspended. Contact support."
            : "Restaurant is waiting for approval.",
        );

        error.statusCode = 403;
        throw error;
      }
    }

    const token = generateToken(user);

    return {
      token,

      user: {
        id: user._id.toString(),

        name: user.name,

        email: user.email,

        role: user.role,

        restaurantId: user.restaurantId ? user.restaurantId.toString() : null,
      },
    };
  }

  /**
   * Register new restaurant admin
   *
   * IMPORTANT:
   * This does NOT login the user.
   * Restaurant stays pending until DevGate approval.
   */
  async registerAdmin(userData) {
    const {
      name,
      email,
      password,
      confirmPassword,
      restaurantName,
      ownerName,
    } = userData;

    if (
      !name ||
      !email ||
      !password ||
      !confirmPassword ||
      !restaurantName ||
      !ownerName
    ) {
      const error = new Error("All fields are required");

      error.statusCode = 400;
      throw error;
    }

    if (password !== confirmPassword) {
      const error = new Error("Passwords do not match");

      error.statusCode = 400;
      throw error;
    }

    if (password.length < 8) {
      const error = new Error("Password must be at least 8 characters");

      error.statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      const error = new Error("Email already registered");

      error.statusCode = 409;
      throw error;
    }

    /*
      Local MongoDB standalone does not support transactions.
      For production MongoDB Atlas replica set,
      transaction can be added here again.
    */

    const restaurant = await Restaurant.create({
      name: restaurantName.trim(),

      ownerName: ownerName.trim(),

      email: email.toLowerCase(),

      status: "pending",

      isActive: false,
    });

    await User.create({
      name: name.trim(),

      email: email.toLowerCase(),

      // User model pre-save hook will bcrypt hash this.
      passwordHash: password,

      role: "restaurant_admin",

      restaurantId: restaurant._id,

      isActive: true,
    });

    // NO TOKEN HERE
    // User must wait for DevGate approval.

    return {
      restaurant: {
        id: restaurant._id.toString(),

        name: restaurant.name,

        status: restaurant.status,
      },
    };
  }

  /**
   * Get complete logged-in user profile
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found");

      error.statusCode = 404;

      throw error;
    }

    let restaurantStatus = null;

    if (user.restaurantId) {
      const restaurant = await Restaurant.findById(user.restaurantId);

      if (restaurant) {
        restaurantStatus = restaurant.status;
      }
    }

    return {
      id: user._id.toString(),

      name: user.name,

      email: user.email,

      role: user.role,

      restaurantId: user.restaurantId ? user.restaurantId.toString() : null,

      restaurantStatus,
    };
  }
}

module.exports = new AuthService();
