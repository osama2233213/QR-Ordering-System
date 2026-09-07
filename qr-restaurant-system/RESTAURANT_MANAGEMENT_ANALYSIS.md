# Module 2: Restaurant Management Foundation — Implementation Analysis

**Status**: Analysis Complete | Ready for Review  
**Date**: September 1, 2026  
**Focus**: Phase 1 - Category Management CRUD

---

## PART 1: CURRENT PROJECT STATE

### Module 1 (Authentication) Status ✅

- JWT authentication fully implemented
- bcrypt password hashing working
- auth middleware enforcing token verification
- tenantContext middleware enforcing restaurant isolation
- admin login frontend integrated
- Testing: All auth endpoints verified

### Project Structure Overview

```
backend/
├── src/
│   ├── models/
│   │   ├── User.js ✅ (Finalized)
│   │   ├── Restaurant.js ✅ (Finalized)
│   │   ├── Category.js ✅ (Finalized)
│   │   ├── MenuItem.js ✅ (Finalized)
│   │   ├── Table.js ✅ (Finalized)
│   │   ├── Order.js ✅ (Finalized)
│   │   ├── GuestSession.js ✅ (Finalized)
│   │   └── TableTransferAudit.js ✅ (Finalized)
│   ├── modules/
│   │   ├── auth/ ✅ (Implemented)
│   │   ├── menu/ (Read-only)
│   │   ├── restaurant/ (Basic profile)
│   │   ├── table/
│   │   ├── order/
│   │   ├── session/
│   │   ├── public/
│   │   ├── devgate/
│   │   └── pos/
│   ├── middleware/
│   │   ├── auth.js ✅
│   │   ├── tenantContext.js ✅
│   │   ├── roleCheck.js ✅
│   │   └── errorHandler.js ✅
│   └── utils/
│       └── validators.js ✅
│
frontend/
├── src/
│   ├── context/
│   │   └── AuthContext.jsx ✅ (Implemented)
│   ├── api/
│   │   ├── authApi.js ✅
│   │   └── axiosClient.js ✅
│   └── admin/pages/
│       └── AdminLoginPage.jsx ✅ (Implemented)
```

---

## PART 2: CATEGORY MODEL ANALYSIS

### Category.js Model Structure ✅

```javascript
{
  restaurantId: ObjectId (required, indexed, enforces multi-tenancy)
  name: String (required, trimmed)
  description: String (optional)
  displayOrder: Number (for UI ordering, default: 0)
  isActive: Boolean (soft delete capability, default: true)
  timestamps: true (createdAt, updatedAt auto-managed)
}

Unique Index: { restaurantId: 1, name: 1 }
  → No two categories in same restaurant can have same name
  → Different restaurants can have same category names
```

**Model Status**: ✅ Perfect for CRUD operations, no changes needed

---

## PART 3: FILES ANALYSIS

### Existing Files Related to Categories

#### 1. Backend Model

**File**: `backend/src/models/Category.js`  
**Status**: ✅ Finalized (DO NOT MODIFY)  
**Contains**:

- restaurantId with index ✓
- Unique constraint on (restaurantId, name) ✓
- isActive for soft delete ✓
- displayOrder for menu ordering ✓

#### 2. Menu Module (Read-only)

**File**: `backend/src/modules/menu/menu.routes.js`  
**Current Endpoints**:

- `GET /api/menu/categories` — Get restaurant categories (calls menuService)
- `GET /api/menu/items` — Get menu items

**File**: `backend/src/modules/menu/menu.service.js`  
**Status**: Boilerplate, returns empty arrays

**Issue**: Menu module is for PUBLIC READ ONLY (customers viewing menu)

- Does NOT include authentication protection
- Used for customer-facing public endpoints

#### 3. App Configuration

**File**: `backend/src/app.js`  
**Current Route Mounting**:

```javascript
app.use("/api/menu", menuRoutes); // Read-only, public
app.use("/api/restaurant", restaurantRoutes); // Protected, admin-only
```

---

## PART 4: FILES TO CREATE (NEW MODULE)

### Create: `backend/src/modules/categories/` (NEW DIRECTORY)

This module handles ADMIN category management (CRUD operations).

#### 4.1 `backend/src/modules/categories/category.routes.js` (NEW)

**Purpose**: Define protected category management endpoints

**Endpoints to implement**:

```
POST /api/categories                — Create category
GET /api/categories                 — Get all categories for restaurant
PUT /api/categories/:id             — Update category
DELETE /api/categories/:id          — Delete category
```

**Middleware Stack**:

```
authenticate (JWT required)
  ↓
tenantContext (extract restaurantId from JWT)
  ↓
roleCheck('restaurant_admin') (only admins can manage)
  ↓
controller
```

#### 4.2 `backend/src/modules/categories/category.controller.js` (NEW)

**Purpose**: Handle HTTP request/response for category operations

**Controllers**:

- `createCategory(req, res, next)` — Create new category
- `getCategories(req, res, next)` — List restaurant categories
- `updateCategory(req, res, next)` — Update existing category
- `deleteCategory(req, res, next)` — Delete category

#### 4.3 `backend/src/modules/categories/category.service.js` (NEW)

**Purpose**: Business logic for category operations

**Methods**:

- `createCategory(restaurantId, categoryData)` — Create with validation
- `getCategoriesByRestaurant(restaurantId)` — List all
- `getCategoryById(restaurantId, categoryId)` — Get single with ownership verification
- `updateCategory(restaurantId, categoryId, updateData)` — Update with ownership check
- `deleteCategory(restaurantId, categoryId)` — Delete with ownership check

---

## PART 5: FILES TO MODIFY

### Modify: `backend/src/app.js`

**Change**: Add route for new categories module

**Current**:

```javascript
app.use("/api/menu", menuRoutes);
```

**After**:

```javascript
app.use("/api/menu", menuRoutes); // Read-only public
app.use("/api/categories", categoryRoutes); // Admin CRUD
```

**Location**: After line 31 (menu routes)

---

## PART 6: IMPLEMENTATION PLAN

### Architecture

#### Tenant Isolation Pattern (Must Follow)

```
POST /api/categories
{
  name: "Appetizers",
  description: "...",
  displayOrder: 1
}
  ↓
authenticate middleware: Verifies JWT → req.user
  ↓
tenantContext middleware: req.restaurantId = req.user.restaurantId
  ↓
roleCheck('restaurant_admin'): req.user.role === 'restaurant_admin'?
  ↓
category.controller.createCategory()
  ↓
category.service.createCategory(req.restaurantId, req.body)
  ↓
Category.create({
  restaurantId: req.restaurantId,  // From JWT (NEVER from body)
  name: req.body.name,
  description: req.body.description,
  displayOrder: req.body.displayOrder
})
  ↓
Response: { success: true, data: { id, name, restaurantId, ... } }
```

#### Key Security Points

1. **restaurantId extraction**: From `req.restaurantId` (set by tenantContext), never from `req.body`
2. **Ownership verification**: Before UPDATE/DELETE, verify category's restaurantId matches req.restaurantId
3. **Role enforcement**: Only restaurant_admin can manage categories
4. **Index usage**: Query uses (restaurantId, categoryId) index for performance

---

## PART 7: ENDPOINT SPECIFICATIONS

### 1. CREATE Category

**Endpoint**: `POST /api/categories`

**Authentication**: ✅ Required (JWT)  
**Authorization**: ✅ restaurant_admin role  
**Tenant Isolation**: ✅ req.restaurantId from JWT

**Request Body**:

```json
{
  "name": "Appetizers",
  "description": "Delicious starters to begin your meal",
  "displayOrder": 1
}
```

**Validation**:

- name: required, min 2 chars, max 50 chars, unique per restaurant
- description: optional, max 500 chars
- displayOrder: optional, number, default 0

**Success Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "restaurantId": "507f1f77bcf86cd799439012",
    "name": "Appetizers",
    "description": "Delicious starters to begin your meal",
    "displayOrder": 1,
    "isActive": true,
    "createdAt": "2026-09-01T10:00:00Z",
    "updatedAt": "2026-09-01T10:00:00Z"
  }
}
```

**Error Responses**:

- 400: Validation error (name required, too long, etc.)
- 401: No token provided
- 403: Not a restaurant_admin
- 409: Duplicate category name for this restaurant

---

### 2. GET Categories (List All)

**Endpoint**: `GET /api/categories`

**Authentication**: ✅ Required (JWT)  
**Authorization**: ✅ restaurant_admin role  
**Tenant Isolation**: ✅ Only categories for logged-in restaurant

**Query Parameters**:

- `isActive` (optional): true/false to filter by active status
- `sort` (optional): 'displayOrder' (default), 'name', 'createdAt'

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "restaurantId": "507f1f77bcf86cd799439012",
      "name": "Appetizers",
      "description": "...",
      "displayOrder": 1,
      "isActive": true,
      "createdAt": "2026-09-01T10:00:00Z",
      "updatedAt": "2026-09-01T10:00:00Z"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "restaurantId": "507f1f77bcf86cd799439012",
      "name": "Mains",
      "description": "...",
      "displayOrder": 2,
      "isActive": true,
      "createdAt": "2026-09-01T10:01:00Z",
      "updatedAt": "2026-09-01T10:01:00Z"
    }
  ]
}
```

**Database Query**:

```javascript
Category.find({ restaurantId: req.restaurantId })
  .sort({ displayOrder: 1 })
  .lean();
```

---

### 3. UPDATE Category

**Endpoint**: `PUT /api/categories/:id`

**Authentication**: ✅ Required (JWT)  
**Authorization**: ✅ restaurant_admin role  
**Tenant Isolation**: ✅ Verify category belongs to current restaurant

**URL Parameters**:

- `id`: Category MongoDB ObjectId

**Request Body** (any or all fields):

```json
{
  "name": "Appetizers & Starters",
  "description": "New description",
  "displayOrder": 2,
  "isActive": false
}
```

**Validation**:

- name: min 2 chars, max 50 chars, unique per restaurant (excluding current category)
- description: max 500 chars
- displayOrder: number
- isActive: boolean

**Ownership Check**:

```javascript
const category = await Category.findById(categoryId);
if (category.restaurantId.toString() !== req.restaurantId) {
  throw Error("Forbidden: Category does not belong to your restaurant");
}
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "restaurantId": "507f1f77bcf86cd799439012",
    "name": "Appetizers & Starters",
    "description": "New description",
    "displayOrder": 2,
    "isActive": false,
    "createdAt": "2026-09-01T10:00:00Z",
    "updatedAt": "2026-09-01T10:05:00Z"
  }
}
```

**Error Responses**:

- 400: Validation error
- 401: No token
- 403: Forbidden (not restaurant_admin OR category doesn't belong to restaurant)
- 404: Category not found
- 409: Duplicate name

---

### 4. DELETE Category

**Endpoint**: `DELETE /api/categories/:id`

**Authentication**: ✅ Required (JWT)  
**Authorization**: ✅ restaurant_admin role  
**Tenant Isolation**: ✅ Verify category belongs to current restaurant

**URL Parameters**:

- `id`: Category MongoDB ObjectId

**Soft Delete Strategy**:

- Option 1: Set `isActive: false` (keeps history, soft delete)
- Option 2: Hard delete (remove from database)
- **Recommended**: Soft delete using `isActive: false` (prevents orphaned MenuItems)

**Ownership Check**: Same as UPDATE

**Success Response** (200 OK - Soft Delete):

```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "restaurantId": "507f1f77bcf86cd799439012",
    "isActive": false
  }
}
```

**Soft Delete Query**:

```javascript
Category.findByIdAndUpdate(categoryId, { isActive: false }, { new: true });
```

**Error Responses**:

- 401: No token
- 403: Forbidden
- 404: Category not found

---

## PART 8: SECURITY CONSIDERATIONS

### 🔴 Critical Security Rules

#### 1. Never Accept restaurantId from Frontend

**Rule**: Always use `req.restaurantId` from JWT payload (set by tenantContext)

**✅ Correct**:

```javascript
// In service layer
async createCategory(restaurantId, categoryData) {
  return Category.create({
    restaurantId: restaurantId,  // From JWT
    name: categoryData.name
  });
}
```

**❌ Wrong**:

```javascript
// In service layer
async createCategory(categoryData) {
  return Category.create({
    restaurantId: categoryData.restaurantId,  // From frontend! INSECURE
    name: categoryData.name
  });
}
```

#### 2. Ownership Verification on Modify/Delete

**Rule**: Before UPDATE or DELETE, verify the category belongs to the current restaurant

**✅ Implementation**:

```javascript
async updateCategory(restaurantId, categoryId, updateData) {
  const category = await Category.findById(categoryId);

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify ownership
  if (category.restaurantId.toString() !== restaurantId) {
    const error = new Error('Forbidden: Category does not belong to your restaurant');
    error.statusCode = 403;
    throw error;
  }

  // Safe to update
  return Category.findByIdAndUpdate(categoryId, updateData, { new: true });
}
```

#### 3. Enforce Role-Based Access

**Rule**: Only restaurant_admin can manage categories

**Middleware Stack**:

```javascript
router.post(
  "/categories",
  authenticate, // Verify JWT
  tenantContext, // Extract restaurantId
  roleCheck("restaurant_admin"), // Only admins
  categoryController.createCategory,
);
```

#### 4. Unique Category Names Per Restaurant

**Rule**: No two categories in same restaurant can have same name

**Index**: Already in model: `{ restaurantId: 1, name: 1 }, { unique: true }`

**Error Handling** (409 Conflict):

```javascript
catch (error) {
  if (error.code === 11000) {  // MongoDB duplicate key error
    const err = new Error('Category name already exists for this restaurant');
    err.statusCode = 409;
    throw err;
  }
  throw error;
}
```

#### 5. Input Validation

**Rule**: Validate all inputs server-side before database operations

**Validations**:

- Name: required, 2-50 characters, trimmed
- Description: optional, max 500 characters
- displayOrder: optional, must be number
- isActive: optional, must be boolean

**Using express-validator**:

```javascript
router.put(
  "/categories/:id",
  authenticate,
  tenantContext,
  roleCheck("restaurant_admin"),
  param("id").isMongoId().withMessage("Invalid category ID"),
  body("name").optional().trim().isLength({ min: 2, max: 50 }),
  body("description").optional().isLength({ max: 500 }),
  body("displayOrder").optional().isInt(),
  body("isActive").optional().isBoolean(),
  validateResult,
  categoryController.updateCategory,
);
```

#### 6. No Data Leakage in Errors

**Rule**: Production errors must be generic

**✅ Correct**:

```javascript
if (category.restaurantId.toString() !== restaurantId) {
  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error; // Global error handler shows generic message in production
}
```

#### 7. Soft Delete Pattern

**Rule**: Use `isActive: false` instead of hard delete to prevent orphaned MenuItems

**Benefits**:

- Audit trail (deleted_at history)
- Prevents foreign key violations
- Can restore if needed
- Analytics on historical data

**Implementation**:

```javascript
// List categories (exclude inactive by default)
Category.find({ restaurantId, isActive: true });

// Admin can see all including deleted
Category.find({ restaurantId }); // With optional filter

// Delete is just an update
Category.findByIdAndUpdate(id, { isActive: false });
```

---

## PART 9: TESTING CHECKLIST

### Backend Testing (Postman/curl)

#### Authentication & Authorization

- [ ] **No token**: POST /api/categories → 401 "Access denied"
- [ ] **Invalid token**: POST /api/categories → 401 "Invalid or expired token"
- [ ] **kitchen_staff token**: POST /api/categories → 403 "Forbidden: Role kitchen_staff..."
- [ ] **Valid admin token**: POST /api/categories → 201 Created ✓

#### Create Category

- [ ] **Valid data**: POST /api/categories with all fields → 201 with category data
- [ ] **Minimal data**: POST /api/categories with only name → 201 (description defaults to "", etc.)
- [ ] **Missing name**: POST /api/categories without name → 400 validation error
- [ ] **Name too short**: POST /api/categories with name: "A" → 400 "min 2 characters"
- [ ] **Name too long**: POST /api/categories with 51-char name → 400 "max 50 characters"
- [ ] **Duplicate name**: Create category "Appetizers", try again → 409 "already exists"
- [ ] **Invalid displayOrder**: displayOrder: "not_a_number" → 400 validation error
- [ ] **Verify restaurantId**: Check DB, ensure category.restaurantId === JWT.restaurantId ✓

#### Get Categories (List)

- [ ] **Own restaurant**: GET /api/categories → 200 with array of own categories ✓
- [ ] **No other restaurants**: GET /api/categories → Never includes other restaurants' categories ✓
- [ ] **Sort by displayOrder**: Verify returned in correct order ✓
- [ ] **Filter by isActive**: GET /api/categories?isActive=false → Only inactive ✓
- [ ] **Empty list**: Restaurant with no categories → 200 with empty array ✓

#### Update Category

- [ ] **Valid update**: PUT /api/categories/{id} with new name → 200 with updated data
- [ ] **Partial update**: PUT with only displayOrder → 200 (name unchanged)
- [ ] **Invalid ID**: PUT /api/categories/invalid_id → 400 "Invalid category ID"
- [ ] **Non-existent ID**: PUT /api/categories/507f1f77bcf86cd799999999 → 404 "not found"
- [ ] **Ownership check**: Admin A token → Admin B's category → 403 "Forbidden"
- [ ] **Duplicate name on update**: Update to existing category name → 409
- [ ] **Soft delete flag**: Update isActive: false → 200, isActive now false in response

#### Delete Category

- [ ] **Valid delete**: DELETE /api/categories/{id} → 200 "deleted successfully"
- [ ] **Verify soft delete**: Check DB, isActive = false (not actually removed) ✓
- [ ] **Invalid ID**: DELETE /api/categories/invalid_id → 400
- [ ] **Non-existent ID**: DELETE /api/categories/507f1f77bcf86cd799999999 → 404
- [ ] **Ownership check**: Admin A token → Admin B's category → 403 "Forbidden"

#### Tenant Isolation (Critical)

- [ ] **Restaurant A admin creates category**: Category has restaurantId = RestaurantA.\_id ✓
- [ ] **Restaurant B admin creates category**: Category has restaurantId = RestaurantB.\_id ✓
- [ ] **Restaurant A list**: GET /api/categories → Only RestaurantA's categories ✓
- [ ] **Restaurant B list**: GET /api/categories → Only RestaurantB's categories ✓
- [ ] **Cross-tenant access attempt**: Restaurant A token → try to update B's category → 403 ✓
- [ ] **No data leakage**: Restaurant A cannot see that Restaurant B even has categories ✓

#### Data Integrity

- [ ] **Unique index enforced**: Two categories with same name in one restaurant fails
- [ ] **Foreign key preserved**: Category.restaurantId refs valid Restaurant
- [ ] **Timestamps auto-set**: createdAt and updatedAt populated correctly
- [ ] **Index performance**: Query with restaurantId uses (restaurantId, name) index

---

### Frontend Testing (Optional for MVP)

#### Navigation & Display

- [ ] Admin can access category management page
- [ ] Category list displays all restaurant categories
- [ ] Can create new category via form
- [ ] Can edit existing category
- [ ] Can delete (soft delete) category

#### Error Handling

- [ ] Server errors display properly
- [ ] Validation errors show field-specific messages
- [ ] Unauthorized access redirects to login

---

## PART 10: DATABASE QUERIES REFERENCE

### Create

```javascript
const category = await Category.create({
  restaurantId: req.restaurantId, // From JWT
  name: req.body.name,
  description: req.body.description,
  displayOrder: req.body.displayOrder,
});
```

### Read (List)

```javascript
const categories = await Category.find({
  restaurantId: req.restaurantId,
  isActive: true, // Optional filter
})
  .sort({ displayOrder: 1 })
  .lean();
```

### Read (Single with Ownership Verification)

```javascript
const category = await Category.findById(categoryId);

if (!category) {
  const error = new Error("Category not found");
  error.statusCode = 404;
  throw error;
}

if (category.restaurantId.toString() !== restaurantId) {
  const error = new Error("Forbidden");
  error.statusCode = 403;
  throw error;
}
```

### Update

```javascript
const category = await Category.findByIdAndUpdate(
  categoryId,
  {
    name: updateData.name,
    description: updateData.description,
    displayOrder: updateData.displayOrder,
    isActive: updateData.isActive,
  },
  { new: true }, // Return updated document
);
```

### Delete (Soft Delete)

```javascript
const category = await Category.findByIdAndUpdate(
  categoryId,
  { isActive: false },
  { new: true },
);
```

### Delete (Hard Delete - Not Recommended)

```javascript
const category = await Category.findByIdAndDelete(categoryId);
```

---

## PART 11: IMPLEMENTATION SEQUENCE

### Step 1: Create category.service.js (2-3 hours)

- Implement all 5 service methods
- Include error handling with statusCodes
- Add ownership verification for PUT/DELETE
- Handle duplicate name error (code 11000)

### Step 2: Create category.controller.js (1-2 hours)

- 4 controllers: create, get, update, delete
- Pass errors to global error handler
- Consistent response format

### Step 3: Create category.routes.js (1 hour)

- 4 routes with proper middleware stack
- Input validation with express-validator
- validateResult middleware

### Step 4: Modify app.js (5 minutes)

- Add import: `const categoryRoutes = require('./modules/categories/category.routes');`
- Add mount: `app.use('/api/categories', categoryRoutes);`

### Step 5: Backend Testing (2-3 hours)

- Run all test cases with Postman
- Verify tenant isolation
- Check database for correct data

**Total Backend**: ~6-9 hours

---

## PART 12: FILES SUMMARY

### Files to Create (3 new)

✏️ `backend/src/modules/categories/category.routes.js`  
✏️ `backend/src/modules/categories/category.controller.js`  
✏️ `backend/src/modules/categories/category.service.js`

### Files to Modify (1 file)

📝 `backend/src/app.js` — Add categoryRoutes import and mounting

### Files to Review (Do NOT modify)

✅ `backend/src/models/Category.js` — Finalized, perfect for CRUD  
✅ `backend/src/middleware/auth.js` — No changes  
✅ `backend/src/middleware/tenantContext.js` — No changes  
✅ `backend/src/middleware/roleCheck.js` — No changes  
✅ `backend/src/middleware/errorHandler.js` — No changes  
✅ `backend/src/utils/validators.js` — No changes

---

## PART 13: SECURITY VERIFICATION CHECKLIST

Before implementation:

- [ ] Understand restaurantId NEVER comes from req.body
- [ ] Understand ownership verification is REQUIRED on PUT/DELETE
- [ ] Understand middleware stack order: authenticate → tenantContext → roleCheck
- [ ] Understand soft delete vs hard delete strategy
- [ ] Understand unique index on (restaurantId, name)
- [ ] Understand error.statusCode pattern for different error types
- [ ] Understand express-validator pattern for input validation

---

## PART 14: NEXT PHASES (After Category CRUD Complete)

**Phase 2**: MenuItem Management (dependent on Category CRUD)

- Create, Read, Update, Delete menu items
- Link to categories
- Image upload integration

**Phase 3**: Table Management

- Create, Read, Update tables
- Generate QR codes per table
- Table status management

**Phase 4**: Order Management

- Place orders (customer)
- View orders (admin)
- Update order status
- Socket.IO real-time updates

**Phase 5**: Frontend Admin Dashboard

- Category management UI
- Menu management UI
- Kitchen display system
- Order queue

---

**Document Status**: ✅ Analysis Complete | Ready for Implementation  
**Next Action**: Wait for approval to proceed with code implementation
