# Authentication Implementation — Current vs Target State

This document maps the current incomplete state to the target production-ready state.

---

## 1. AuthService.login()

### Current State ❌

```javascript
// backend/src/modules/auth/auth.service.js

class AuthService {
  async login(email, password) {
    // Implementation placeholder - to be populated in Auth module phase
    return { token: "mock_token", user: { email, role: "restaurant_admin" } };
  }
}
```

**Issues**:

- Returns hardcoded mock token
- No database query
- No password validation
- No JWT generation
- No error handling

### Target State ✅

```javascript
// backend/src/modules/auth/auth.service.js

class AuthService {
  async login(email, password) {
    // 1. Find user by email (MUST include password for comparison)
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Compare provided password with hashed password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      process.env.JWT_SECRET || "super_secret_jwt_key_restaurant_pos_poc",
      { expiresIn: "7d" },
    );

    // 4. Return token and user (NEVER include passwordHash)
    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    };
  }
}
```

**Improvements**:

- ✅ Real database query
- ✅ Secure password comparison via bcrypt
- ✅ JWT generation with expiration
- ✅ Proper error handling with status codes
- ✅ Clean response (no sensitive data)

**Database Query Details**:

```javascript
// Must include passwordHash for comparison
.select('+passwordHash')  // User model has select: false by default

// User.comparePassword() uses bcrypt.compare():
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};
```

---

## 2. AuthService.registerAdmin()

### Current State ❌

```javascript
// backend/src/modules/auth/auth.service.js

class AuthService {
  async registerAdmin(userData) {
    // Implementation placeholder - to be populated in Auth module phase
    return { success: true };
  }
}
```

**Issues**:

- Returns success without doing anything
- No Restaurant created
- No User created
- No email uniqueness check
- No data validation
- No atomicity (no transaction)

### Target State ✅

```javascript
// backend/src/modules/auth/auth.service.js

class AuthService {
  async registerAdmin(userData) {
    const { name, email, password, restaurantName, ownerName } = userData;

    // 1. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    // 2. Start transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. Create Restaurant
      const restaurant = await Restaurant.create(
        [
          {
            name: restaurantName,
            ownerName: ownerName,
            email: email,
            status: "pending",
            isActive: false,
          },
        ],
        { session },
      );

      // 4. Create User linked to Restaurant
      const user = await User.create(
        [
          {
            name: name,
            email: email,
            passwordHash: password, // Model will hash in pre-save hook
            role: "restaurant_admin",
            restaurantId: restaurant[0]._id,
            isActive: true,
          },
        ],
        { session },
      );

      // 5. Commit transaction
      await session.commitTransaction();

      // 6. Generate JWT for new user
      const token = jwt.sign(
        {
          userId: user[0]._id,
          email: user[0].email,
          role: user[0].role,
          restaurantId: user[0].restaurantId,
        },
        process.env.JWT_SECRET || "super_secret_jwt_key_restaurant_pos_poc",
        { expiresIn: "7d" },
      );

      // 7. Return created entities (NEVER include passwordHash)
      return {
        token,
        user: {
          id: user[0]._id,
          email: user[0].email,
          name: user[0].name,
          role: user[0].role,
          restaurantId: user[0].restaurantId,
        },
        restaurant: {
          id: restaurant[0]._id,
          name: restaurant[0].name,
          status: restaurant[0].status,
        },
      };
    } catch (error) {
      // Rollback on error
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

**Improvements**:

- ✅ Email uniqueness check
- ✅ Restaurant created
- ✅ User created with restaurant link
- ✅ Transaction for atomicity
- ✅ Password hashed automatically (model pre-hook)
- ✅ JWT generated
- ✅ Clean response

---

## 3. Auth Routes Validation

### Current State ❌

```javascript
// backend/src/modules/auth/auth.routes.js

const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const authenticate = require("../../middleware/auth");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
```

**Issues**:

- No input validation
- Invalid data passed to service
- No field-level errors
- No data normalization

### Target State ✅

```javascript
// backend/src/modules/auth/auth.routes.js

const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const authController = require("./auth.controller");
const authenticate = require("../../middleware/auth");
const { validateResult } = require("../../utils/validators");

// LOGIN: Validate email and password
router.post(
  "/login",
  body("email").isEmail().normalizeEmail().toLowerCase(),
  body("password")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Password is required"),
  validateResult,
  authController.login,
);

// REGISTER: Validate all registration fields
router.post(
  "/register",
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email").isEmail().normalizeEmail().toLowerCase(),
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
  validateResult,
  authController.register,
);

// GET CURRENT USER: Protected route
router.get("/me", authenticate, authController.getMe);

module.exports = router;
```

**Improvements**:

- ✅ Email validation and normalization
- ✅ Password strength checking
- ✅ Field-level error messages
- ✅ Atomic validation (all fields checked)
- ✅ Input trimming and case normalization

---

## 4. Auth Controller Error Handling

### Current State ⚠️

```javascript
// backend/src/modules/auth/auth.controller.js

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

**Issues**:

- Generic error handling
- No status code control
- All errors treated the same

### Target State ✅

```javascript
// backend/src/modules/auth/auth.controller.js

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Service throws errors with statusCode
    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

exports.register = async (req, res, next) => {
  try {
    const result = await authService.registerAdmin(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    // Don't expose internal errors in production
    const message =
      process.env.NODE_ENV === "production"
        ? "Registration failed"
        : error.message;

    res.status(statusCode).json({
      success: false,
      message: message,
    });
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // req.user set by authenticate middleware from JWT
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
```

**Improvements**:

- ✅ Proper status codes (201 for create, 200 for get, etc.)
- ✅ Production-safe error messages
- ✅ Consistent response format

---

## 5. Frontend AuthContext

### Current State ⚠️

```javascript
// frontend/src/context/AuthContext.jsx

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Issues**:

- `login()` is synchronous (requires data passed in)
- No actual API integration
- No error state
- `loading` unused
- No async operations

### Target State ✅

```javascript
// frontend/src/context/AuthContext.jsx

import { authApi } from "../api/authApi";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronous login helper (for storing token after API call)
  const setAuthData = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    setError(null);
  };

  // Async login with API call
  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login({ email, password });
      const { token, user } = response.data.data;

      setAuthData(user, token);
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  // Async register with API call
  const register = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(formData);
      const { token, user } = response.data.data;

      setAuthData(user, token);
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

**Improvements**:

- ✅ Async login that calls API
- ✅ Async register that calls API
- ✅ Error state management
- ✅ Loading state during request
- ✅ Error clearing capability
- ✅ Returns success/error info to caller

---

## 6. Frontend AdminLoginPage

### Current State ❌

```javascript
// frontend/src/admin/pages/AdminLoginPage.jsx

export const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // HARDCODED MOCK LOGIN!
    login(
      { email, role: "restaurant_admin", restaurantId: "demo_restaurant_1" },
      "demo_token",
    );
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
        {/* Form JSX */}
      </div>
    </div>
  );
};
```

**Issues**:

- Hardcoded mock login
- No API call
- No error display
- No loading state
- No field reset

### Target State ✅

```javascript
// frontend/src/admin/pages/AdminLoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../shared/components/Button";

export const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();

    // Call async login from AuthContext
    const result = await login(email, password);

    if (result.success) {
      // Clear form and redirect
      setEmail("");
      setPassword("");
      navigate("/admin/dashboard");
    }
    // Error state automatically managed by AuthContext
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
        <h2 className="text-2xl font-black text-slate-900">Restaurant Admin</h2>
        <p className="text-xs text-slate-400 mt-1">
          Sign in to manage kitchen display & live orders.
        </p>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-50"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full mt-2">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};
```

**Improvements**:

- ✅ Calls real `login()` from AuthContext
- ✅ Error message displayed
- ✅ Loading state on button + inputs
- ✅ Form reset on success
- ✅ Proper error clearing

---

## Summary Table

| Component                   | Current         | Target                       | Gap    |
| --------------------------- | --------------- | ---------------------------- | ------ |
| AuthService.login()         | Mock token      | Real JWT + DB query          | Large  |
| AuthService.registerAdmin() | Returns success | Creates Restaurant + User    | Large  |
| Auth Routes                 | No validation   | Full express-validator chain | Medium |
| Auth Controller             | Generic errors  | Proper status codes          | Small  |
| Frontend AuthContext        | Synchronous     | Async with API + error state | Large  |
| AdminLoginPage              | Hardcoded mock  | Real API integration         | Large  |
| JWT middleware              | ✅ Complete     | -                            | None   |
| Tenant middleware           | ✅ Complete     | -                            | None   |
| User model                  | ✅ Complete     | -                            | None   |
| Restaurant model            | ✅ Complete     | -                            | None   |

**Total Gap**: ~3-4 days of focused implementation

---

## Implementation Dependencies

```
AuthService.login()
  ↓ (needs working)
Frontend AuthContext.login()
  ↓ (needs working)
AdminLoginPage API wiring
  ↓ (needs working)
Protected route guards

AuthService.registerAdmin()
  ↓ (needs working)
Frontend register form (Phase 2)
  ↓ (needs working)
New restaurant onboarding flow
```

**Critical Path**: AuthService.login() → AuthContext → AdminLoginPage  
**Time to MVP**: 2 days with focused implementation

---

**Document**: Current vs Target State Analysis  
**Date**: September 1, 2026  
**Completeness**: 70% → Target 100% in 2-3 days
