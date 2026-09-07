# Module 2: Restaurant Management — Quick Reference

**Status**: Analysis Complete | Ready for Implementation  
**Phase**: 1 - Category Management CRUD  
**Estimated Duration**: 6-9 hours backend + 2-3 hours frontend

---

## Quick Summary

**Goal**: Build a complete CRUD API for restaurant category management with tenant isolation.

**Architecture**:

```
POST /api/categories ──→ Authenticate ──→ TenantContext ──→ RoleCheck ──→ Create
GET /api/categories  ──→ Authenticate ──→ TenantContext ──→ RoleCheck ──→ List
PUT /api/categories/:id  ──→ Authenticate ──→ TenantContext ──→ RoleCheck ──→ Update
DELETE /api/categories/:id ──→ Authenticate ──→ TenantContext ──→ RoleCheck ──→ Delete
```

---

## Files to Create (3 files)

| File                                                    | Purpose              | Lines |
| ------------------------------------------------------- | -------------------- | ----- |
| `backend/src/modules/categories/category.routes.js`     | 4 REST endpoints     | ~80   |
| `backend/src/modules/categories/category.controller.js` | 4 controller methods | ~60   |
| `backend/src/modules/categories/category.service.js`    | Business logic + DB  | ~150  |

---

## Files to Modify (1 file)

| File                 | Change                                                                             | Lines |
| -------------------- | ---------------------------------------------------------------------------------- | ----- |
| `backend/src/app.js` | Add: `const categoryRoutes = ...` and `app.use('/api/categories', categoryRoutes)` | ~2    |

---

## API Endpoints Summary

### Create Category

```
POST /api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Appetizers",
  "description": "Starters",
  "displayOrder": 1
}

Response: 201 Created
{ "success": true, "data": { id, name, restaurantId, ... } }
```

### List Categories

```
GET /api/categories?isActive=true&sort=displayOrder
Authorization: Bearer {token}

Response: 200 OK
{ "success": true, "data": [ { id, name, ... }, ... ] }

✓ Auto-filtered to current restaurant only
```

### Update Category

```
PUT /api/categories/{id}
Authorization: Bearer {token}

{ "name": "Appetizers & Starters", "displayOrder": 2 }

Response: 200 OK
{ "success": true, "data": { id, name, ... } }

✓ Ownership verified (403 if not your restaurant)
```

### Delete Category

```
DELETE /api/categories/{id}
Authorization: Bearer {token}

Response: 200 OK
{ "success": true, "message": "Category deleted successfully" }

✓ Soft delete (isActive: false)
✓ Ownership verified (403 if not your restaurant)
```

---

## Security Rules (Non-Negotiable)

| Rule                                   | Implementation                                                          |
| -------------------------------------- | ----------------------------------------------------------------------- |
| **Never trust restaurantId from body** | Use `req.restaurantId` from JWT (set by tenantContext)                  |
| **Verify ownership on modify**         | Check `category.restaurantId === req.restaurantId` before UPDATE/DELETE |
| **Enforce role check**                 | Only `restaurant_admin` role can manage categories                      |
| **Unique names per restaurant**        | Unique index on (restaurantId, name) prevents duplicates                |
| **Validate input server-side**         | Use express-validator before controller                                 |
| **Soft delete pattern**                | Set `isActive: false` instead of hard delete                            |
| **No data leakage in errors**          | Generic error messages in production                                    |

---

## Key Database Patterns

### Query Pattern (Always include restaurantId)

```javascript
// ✅ CORRECT
Category.find({ restaurantId: req.restaurantId });

// ❌ WRONG
Category.find({}); // Gets all categories from all restaurants!
```

### Ownership Check Pattern (Before UPDATE/DELETE)

```javascript
const category = await Category.findById(id);

if (category.restaurantId.toString() !== req.restaurantId) {
  throw Error("Forbidden: not your category"); // 403
}
```

### Error Handling Pattern

```javascript
if (error.code === 11000) {
  // MongoDB duplicate key
  const err = new Error("Category name already exists");
  err.statusCode = 409;
  throw err;
}
```

---

## Validation Rules

| Field        | Required | Min | Max | Notes                          |
| ------------ | -------- | --- | --- | ------------------------------ |
| name         | Yes      | 2   | 50  | Trimmed, unique per restaurant |
| description  | No       | -   | 500 | Optional                       |
| displayOrder | No       | -   | -   | Number for menu ordering       |
| isActive     | No       | -   | -   | Boolean, default true          |

---

## Middleware Stack

```javascript
router.post('/categories',
  authenticate,              // Line 1: Verify JWT
  tenantContext,            // Line 2: Extract restaurantId
  roleCheck('restaurant_admin'),  // Line 3: Only admins
  body(...).validate,        // Line 4: Input validation
  validateResult,            // Line 5: Check errors
  controller.createCategory  // Line 6: Handle request
);
```

**Order matters**: Authentication → TenantContext → RoleCheck → Validation

---

## Service Layer Pattern

```javascript
class CategoryService {
  async createCategory(restaurantId, categoryData) {
    // 1. Validate input
    // 2. Check for duplicates (catch code 11000)
    // 3. Create with restaurantId from parameter (not body!)
    // 4. Return new category or throw error with statusCode
  }

  async getCategoriesByRestaurant(restaurantId) {
    // 1. Query with restaurantId filter
    // 2. Sort by displayOrder
    // 3. Return array (can be empty)
  }

  async updateCategory(restaurantId, categoryId, updateData) {
    // 1. Find category
    // 2. Verify ownership (restaurantId match)
    // 3. Check for duplicate name (if updating name)
    // 4. Update and return
  }

  async deleteCategory(restaurantId, categoryId) {
    // 1. Find category
    // 2. Verify ownership
    // 3. Soft delete (isActive: false)
    // 4. Return result
  }
}
```

---

## Testing Priority (Postman)

### Must Pass (Tenant Isolation)

1. [ ] Restaurant A creates category
2. [ ] Restaurant B creates different category
3. [ ] Restaurant A sees only A's categories
4. [ ] Restaurant B sees only B's categories
5. [ ] Restaurant A cannot update B's category (403)

### Must Pass (Authorization)

6. [ ] No token → 401
7. [ ] Invalid token → 401
8. [ ] kitchen_staff token → 403
9. [ ] restaurant_admin token → Success

### Must Pass (Data Integrity)

10. [ ] Duplicate name → 409
11. [ ] Missing required field → 400
12. [ ] Invalid type (e.g., displayOrder: "text") → 400
13. [ ] Very long string → 400

---

## Common Errors & Solutions

| Error                           | Cause                         | Solution                                               |
| ------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Tenant isolation broken         | Using `req.body.restaurantId` | Use `req.restaurantId` from tenantContext              |
| 403 on valid request            | Missing roleCheck middleware  | Add `roleCheck('restaurant_admin')`                    |
| 404 on existing category        | Wrong restaurant context      | Verify owner check before delete                       |
| Duplicate key error not handled | Not catching code 11000       | Add catch for 409 response                             |
| Other restaurant's data visible | Missing restaurantId filter   | Always query with `{ restaurantId: req.restaurantId }` |

---

## Implementation Checklist

### Service Layer (category.service.js)

- [ ] Import Category model
- [ ] Import/create error handling helper
- [ ] Implement createCategory()
- [ ] Implement getCategoriesByRestaurant()
- [ ] Implement updateCategory() with ownership check
- [ ] Implement deleteCategory() with ownership check
- [ ] All methods throw Error with statusCode property
- [ ] Handle duplicate key error (code 11000) → 409

### Controller Layer (category.controller.js)

- [ ] Import service
- [ ] Implement createCategory controller
- [ ] Implement getCategories controller
- [ ] Implement updateCategory controller
- [ ] Implement deleteCategory controller
- [ ] All pass errors to next(error)
- [ ] Consistent response format

### Routes Layer (category.routes.js)

- [ ] Import express, body validators
- [ ] Import controller, middleware
- [ ] POST /categories with validation chain
- [ ] GET /categories (no additional validation)
- [ ] PUT /categories/:id with validation chain
- [ ] DELETE /categories/:id with param validation
- [ ] All routes have: authenticate → tenantContext → roleCheck

### App Config (app.js)

- [ ] Add categoryRoutes import
- [ ] Add app.use mount
- [ ] Mount before errorHandler
- [ ] Mount after auth routes

---

## Database Index Verification

The Category model already has the required index:

```javascript
// Already in Category.js
categorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });
```

This ensures:

- ✅ Fast queries filtered by restaurantId
- ✅ No duplicate category names per restaurant
- ✅ Different restaurants can have same category names

**No model changes needed!**

---

## Expected Response Times

| Operation       | Time     | Query Type        |
| --------------- | -------- | ----------------- |
| Create category | 50-100ms | Insert            |
| List categories | 10-30ms  | Find with index   |
| Update category | 30-80ms  | FindByIdAndUpdate |
| Delete category | 20-50ms  | FindByIdAndUpdate |

All queries use indexes for optimal performance.

---

## Frontend Integration (Later Phase)

Once backend is complete, frontend will need:

```javascript
// frontend/src/api/categoryApi.js
export const categoryApi = {
  create: (data) => axiosClient.post("/categories", data),
  list: () => axiosClient.get("/categories"),
  update: (id, data) => axiosClient.put(`/categories/${id}`, data),
  delete: (id) => axiosClient.delete(`/categories/${id}`),
};
```

Frontend pages:

- `frontend/src/admin/pages/CategoryManagementPage.jsx`
- Components for list, create form, edit form, delete confirmation

---

## Success Criteria

When complete, you should be able to:

✅ Create categories tied to your restaurant  
✅ List all your categories (and only your categories)  
✅ Update your categories  
✅ Delete (soft delete) your categories  
✅ Get 403 error when trying to access another restaurant's categories  
✅ Get 401 error without JWT token  
✅ Get 403 error without restaurant_admin role  
✅ Get 409 error on duplicate category name  
✅ See full audit trail (createdAt, updatedAt)

---

**Ready to implement?**

Once approved, implementation should take:

- Backend: 6-9 hours (one developer)
- Testing: 2-3 hours
- Total: 1-1.5 days
