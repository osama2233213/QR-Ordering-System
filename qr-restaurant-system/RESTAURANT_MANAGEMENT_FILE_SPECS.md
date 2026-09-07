# Module 2: Restaurant Management — File Structure & Specifications

**Analysis Date**: September 1, 2026  
**Module**: Category Management CRUD (Phase 1)

---

## SECTION 1: NEW FILES TO CREATE

### File 1: `backend/src/modules/categories/category.routes.js`

**Status**: CREATE (NEW FILE)  
**Location**: `backend/src/modules/categories/category.routes.js`  
**Complexity**: Medium  
**Lines of Code**: ~80-100

**Purpose**: Define REST API endpoints for category management

**Imports Required**:

- `express`
- `{ body, param }` from `express-validator`
- `category.controller`
- `authenticate` middleware
- `tenantContext` middleware
- `roleCheck` middleware
- `{ validateResult }` from utils

**Structure**:

```javascript
const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();

// Imports...

// Middleware chain for all routes
router.use(authenticate, tenantContext, roleCheck("restaurant_admin"));

// Route 1: POST /api/categories
router.post(
  "/",
  body("name").trim().isLength({ min: 2, max: 50 }),
  body("description").optional().isLength({ max: 500 }),
  body("displayOrder").optional().isInt(),
  validateResult,
  controller.createCategory,
);

// Route 2: GET /api/categories
router.get("/", controller.getCategories);

// Route 3: PUT /api/categories/:id
router.put(
  "/:id",
  param("id").isMongoId(),
  body("name").optional().trim().isLength({ min: 2, max: 50 }),
  body("description").optional().isLength({ max: 500 }),
  body("displayOrder").optional().isInt(),
  body("isActive").optional().isBoolean(),
  validateResult,
  controller.updateCategory,
);

// Route 4: DELETE /api/categories/:id
router.delete(
  "/:id",
  param("id").isMongoId(),
  validateResult,
  controller.deleteCategory,
);

module.exports = router;
```

**Key Points**:

- All 4 CRUD routes
- Middleware stack: authenticate → tenantContext → roleCheck
- Input validation using express-validator
- Parameter validation for :id
- validateResult checks all validators before controller

---

### File 2: `backend/src/modules/categories/category.controller.js`

**Status**: CREATE (NEW FILE)  
**Location**: `backend/src/modules/categories/category.controller.js`  
**Complexity**: Low  
**Lines of Code**: ~60-80

**Purpose**: Handle HTTP requests and responses for category operations

**Imports Required**:

- `category.service`

**Methods**:

#### 1. createCategory(req, res, next)

```javascript
exports.createCategory = async (req, res, next) => {
  try {
    const result = await categoryService.createCategory(
      req.restaurantId, // From tenantContext
      req.body,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error); // Pass to error handler
  }
};
```

#### 2. getCategories(req, res, next)

```javascript
exports.getCategories = async (req, res, next) => {
  try {
    const result = await categoryService.getCategoriesByRestaurant(
      req.restaurantId,
      req.query, // Optional filters
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

#### 3. updateCategory(req, res, next)

```javascript
exports.updateCategory = async (req, res, next) => {
  try {
    const result = await categoryService.updateCategory(
      req.restaurantId,
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

#### 4. deleteCategory(req, res, next)

```javascript
exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(
      req.restaurantId,
      req.params.id,
    );
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
```

**Key Points**:

- All methods are async
- All pass errors to next(error) for global error handler
- req.restaurantId comes from tenantContext middleware
- Consistent response format: `{ success: boolean, data, message? }`
- Controllers are thin (business logic in service)

---

### File 3: `backend/src/modules/categories/category.service.js`

**Status**: CREATE (NEW FILE)  
**Location**: `backend/src/modules/categories/category.service.js`  
**Complexity**: High  
**Lines of Code**: ~150-200

**Purpose**: Business logic and database operations for categories

**Imports Required**:

- `Category` model
- `mongoose` (for error handling)

**Methods**:

#### 1. createCategory(restaurantId, categoryData)

```javascript
async createCategory(restaurantId, categoryData) {
  try {
    // Validate required fields
    if (!categoryData.name || !categoryData.name.trim()) {
      const error = new Error('Category name is required');
      error.statusCode = 400;
      throw error;
    }

    // Create with restaurantId from JWT (never from body!)
    const category = await Category.create({
      restaurantId,  // From JWT parameter
      name: categoryData.name.trim(),
      description: categoryData.description || '',
      displayOrder: categoryData.displayOrder || 0,
      isActive: true
    });

    return category.toObject();  // Convert to plain object
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const err = new Error('Category name already exists for this restaurant');
      err.statusCode = 409;
      throw err;
    }

    // Re-throw with statusCode
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
}
```

#### 2. getCategoriesByRestaurant(restaurantId, query = {})

```javascript
async getCategoriesByRestaurant(restaurantId, query = {}) {
  try {
    // Build query filter
    const filter = { restaurantId };

    // Optional: filter by active status
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    // Query with restaurantId (tenant isolation)
    const categories = await Category.find(filter)
      .sort({ displayOrder: 1 })
      .lean();  // .lean() for read-only performance

    return categories;
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }
}
```

#### 3. updateCategory(restaurantId, categoryId, updateData)

```javascript
async updateCategory(restaurantId, categoryId, updateData) {
  try {
    // Find category first (for ownership check)
    const category = await Category.findById(categoryId);

    if (!category) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership (CRITICAL SECURITY CHECK)
    if (category.restaurantId.toString() !== restaurantId) {
      const error = new Error('Forbidden: Category does not belong to your restaurant');
      error.statusCode = 403;
      throw error;
    }

    // Check for duplicate name (if updating name)
    if (updateData.name && updateData.name !== category.name) {
      const existing = await Category.findOne({
        restaurantId,
        name: updateData.name.trim(),
        _id: { $ne: categoryId }  // Exclude current category
      });

      if (existing) {
        const error = new Error('Category name already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    // Update allowed fields
    const updateFields = {};
    if (updateData.name !== undefined) updateFields.name = updateData.name.trim();
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.displayOrder !== undefined) updateFields.displayOrder = updateData.displayOrder;
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;

    // Perform update
    const updated = await Category.findByIdAndUpdate(
      categoryId,
      updateFields,
      { new: true }  // Return updated document
    );

    return updated.toObject();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
}
```

#### 4. deleteCategory(restaurantId, categoryId)

```javascript
async deleteCategory(restaurantId, categoryId) {
  try {
    // Find category
    const category = await Category.findById(categoryId);

    if (!category) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify ownership (CRITICAL SECURITY CHECK)
    if (category.restaurantId.toString() !== restaurantId) {
      const error = new Error('Forbidden: Cannot delete another restaurant\'s category');
      error.statusCode = 403;
      throw error;
    }

    // Soft delete: set isActive to false
    const deleted = await Category.findByIdAndUpdate(
      categoryId,
      { isActive: false },
      { new: true }
    );

    return deleted.toObject();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
}
```

**Key Points**:

- restaurantId parameter comes from tenantContext (never from request body)
- Ownership verification on UPDATE and DELETE
- Duplicate key error (code 11000) converted to 409
- All errors have statusCode property
- .toObject() converts Mongoose docs to plain objects
- .lean() used for read-only queries (better performance)
- Soft delete pattern (isActive: false instead of hard delete)

---

## SECTION 2: FILES TO MODIFY

### File: `backend/src/app.js`

**Status**: MODIFY (ADD 2 LINES)  
**Location**: `backend/src/app.js`  
**Changes**: +2 lines (import and mounting)

**Current Code** (lines 13-14):

```javascript
// Route imports
const authRoutes = require("./modules/auth/auth.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const menuRoutes = require("./modules/menu/menu.routes");
```

**After Adding** (lines 13-16):

```javascript
// Route imports
const authRoutes = require("./modules/auth/auth.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const categoryRoutes = require("./modules/categories/category.routes"); // NEW LINE
const menuRoutes = require("./modules/menu/menu.routes");
```

**Current Code** (lines 35-36):

```javascript
// API Routes Mounting
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/menu", menuRoutes);
```

**After Adding** (lines 35-38):

```javascript
// API Routes Mounting
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/categories", categoryRoutes); // NEW LINE
app.use("/api/menu", menuRoutes);
```

**Order Matters**: Mount after auth/restaurant but doesn't matter relative to menu

---

## SECTION 3: FILES TO REVIEW (DO NOT MODIFY)

### 1. Category Model: `backend/src/models/Category.js` ✅

**Status**: FINALIZED - NO CHANGES

What makes it perfect for this module:

- restaurantId indexed (fast queries)
- Unique constraint on (restaurantId, name)
- isActive field (soft delete support)
- Timestamps auto-managed
- All fields properly typed

### 2. Authentication Middleware: `backend/src/middleware/auth.js` ✅

**Status**: FINALIZED - NO CHANGES

What it does:

- Verifies JWT token
- Decodes and attaches to req.user
- Sets req.user = { userId, role, restaurantId, email }

### 3. Tenant Context: `backend/src/middleware/tenantContext.js` ✅

**Status**: FINALIZED - NO CHANGES

What it does:

- Extracts restaurantId from req.user (JWT)
- Sets req.restaurantId for service layer
- DevGate admins can override with x-tenant-override header

### 4. Role Check: `backend/src/middleware/roleCheck.js` ✅

**Status**: FINALIZED - NO CHANGES

What it does:

- Validates req.user.role
- Enforces role-based access control

### 5. Error Handler: `backend/src/middleware/errorHandler.js` ✅

**Status**: FINALIZED - NO CHANGES

What it does:

- Catches all errors from controllers
- Respects error.statusCode
- Shows stack traces in development only

### 6. Validators Util: `backend/src/utils/validators.js` ✅

**Status**: FINALIZED - NO CHANGES

What it does:

- validateResult middleware for express-validator
- Checks for validation errors and returns 400 if any

---

## SECTION 4: DATABASE OPERATIONS MATRIX

| Operation         | Query                                        | Filter                            | Index Used                  |
| ----------------- | -------------------------------------------- | --------------------------------- | --------------------------- |
| **Create**        | Category.create()                            | restaurantId + name               | (restaurantId, name) unique |
| **Read (List)**   | Category.find()                              | restaurantId                      | (restaurantId)              |
| **Read (Single)** | Category.findById() + ownership check        | restaurantId === req.restaurantId | id primary key              |
| **Update**        | Category.findByIdAndUpdate() + ownership     | restaurantId === req.restaurantId | id primary key              |
| **Delete (Soft)** | Category.findByIdAndUpdate({isActive:false}) | restaurantId === req.restaurantId | id primary key              |

All queries include restaurantId filter = **Tenant Isolation Guaranteed** ✅

---

## SECTION 5: IMPLEMENTATION CHECKLIST

### Before Writing Code

- [ ] Understand Category model structure
- [ ] Understand middleware chain order
- [ ] Understand req.restaurantId comes from tenantContext
- [ ] Understand ownership verification requirement
- [ ] Understand soft delete pattern
- [ ] Read all 3 documents (ANALYSIS, QUICK_REFERENCE, this file)

### Service Layer Implementation

- [ ] Import Category model
- [ ] Import error handling utilities
- [ ] Implement createCategory with duplicate check
- [ ] Implement getCategoriesByRestaurant with filtering
- [ ] Implement updateCategory with ownership check
- [ ] Implement deleteCategory with ownership check
- [ ] All errors have statusCode property
- [ ] All methods throw errors properly

### Controller Layer Implementation

- [ ] Import service
- [ ] Implement all 4 controllers (create, get, update, delete)
- [ ] All pass errors to next(error)
- [ ] Consistent response format
- [ ] Proper status codes (201 for create, 200 for others)

### Routes Layer Implementation

- [ ] Import express, validators, controller
- [ ] Import all 3 middleware (authenticate, tenantContext, roleCheck)
- [ ] Create 4 routes
- [ ] Add input validation chains
- [ ] Add param validation for :id
- [ ] Add validateResult middleware
- [ ] Apply middleware stack correctly

### App Configuration

- [ ] Import categoryRoutes
- [ ] Mount with app.use('/api/categories', categoryRoutes)
- [ ] Mount in correct order
- [ ] No syntax errors

### Testing

- [ ] Test all 4 CRUD operations
- [ ] Test tenant isolation
- [ ] Test authorization (token required, role required)
- [ ] Test validation errors
- [ ] Test ownership verification
- [ ] Test duplicate name error
- [ ] Check database state matches expectations

---

## SECTION 6: ERROR SCENARIOS

### Expected Error Responses

| Scenario           | HTTP Status | Error Message                                            | statusCode |
| ------------------ | ----------- | -------------------------------------------------------- | ---------- |
| No JWT token       | 401         | Access denied. No token provided.                        | 401        |
| Invalid JWT        | 401         | Invalid or expired token.                                | 401        |
| kitchen_staff role | 403         | Forbidden: Role 'kitchen_staff' does not have permission | 403        |
| Missing name field | 400         | name: required field                                     | 400        |
| Name too short     | 400         | name: at least 2 characters                              | 400        |
| Name too long      | 400         | name: max 50 characters                                  | 400        |
| Duplicate name     | 409         | Category name already exists for this restaurant         | 409        |
| Invalid ID format  | 400         | id: Invalid MongoDB ID                                   | 400        |
| Category not found | 404         | Category not found                                       | 404        |
| Wrong restaurant   | 403         | Forbidden: Category does not belong to your restaurant   | 403        |
| Database error     | 500         | Internal Server Error                                    | 500        |

All errors handled by global error handler in errorHandler.js

---

## SECTION 7: PERFORMANCE CONSIDERATIONS

### Query Optimization

- All queries use indexed fields
- .lean() for read-only queries (5-10x faster)
- Unique index prevents duplicate writes upfront

### Response Times (Expected)

- Create: 50-100ms
- Read (List): 10-30ms
- Update: 30-80ms
- Delete: 20-50ms

All within acceptable limits for user-facing API.

---

## SECTION 8: SECURITY VERIFICATION POINTS

### Must Be Implemented

- [ ] restaurantId NEVER from req.body
- [ ] Ownership check REQUIRED on PUT/DELETE
- [ ] Error.statusCode set on ALL errors
- [ ] Middleware stack in correct order
- [ ] Duplicate key error (11000) → 409
- [ ] Generic error messages (no DB details)
- [ ] Input trimming and validation
- [ ] IsActive field used for soft delete

### Will Be Tested

- [ ] Restaurant A cannot see B's categories
- [ ] Restaurant A cannot update/delete B's category
- [ ] Invalid token rejected (401)
- [ ] kitchen_staff role rejected (403)
- [ ] Duplicate names rejected (409)
- [ ] Ownership verified on modify

---

**Document Complete**

Next steps:

1. Review this document
2. Review RESTAURANT_MANAGEMENT_ANALYSIS.md (comprehensive)
3. Review RESTAURANT_MANAGEMENT_QUICK_REFERENCE.md (quick lookup)
4. Request approval to proceed with implementation
