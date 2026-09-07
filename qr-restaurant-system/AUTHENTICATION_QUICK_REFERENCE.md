# Authentication Implementation — Quick Reference

## Current State: 70% Complete ✅

### What's Ready

✅ User model with bcrypt password hashing  
✅ Restaurant model with owner details  
✅ JWT authentication middleware  
✅ Tenant context middleware (restaurant isolation)  
✅ RBAC middleware (role checking)  
✅ Auth routes structure  
✅ Frontend API wrapper  
✅ Frontend auth context  
✅ Login page UI

### What's Missing

⚠️ AuthService.login() — Real DB query + JWT generation  
⚠️ AuthService.registerAdmin() — Restaurant + User creation  
⚠️ Input validation on routes  
⚠️ Frontend form wiring to API  
⚠️ Error handling + display

---

## Files to Modify (6 Total)

### Backend (3 files)

| File                                          | Changes                             | Lines | Complexity |
| --------------------------------------------- | ----------------------------------- | ----- | ---------- |
| `backend/src/modules/auth/auth.service.js`    | Implement login() & registerAdmin() | ~80   | Medium     |
| `backend/src/modules/auth/auth.routes.js`     | Add validation chain                | ~40   | Low        |
| `backend/src/modules/auth/auth.controller.js` | Enhance error handling              | ~10   | Low        |

### Frontend (2 files)

| File                                          | Changes                      | Lines | Complexity |
| --------------------------------------------- | ---------------------------- | ----- | ---------- |
| `frontend/src/context/AuthContext.jsx`        | Add async, errors, isLoading | ~50   | Medium     |
| `frontend/src/admin/pages/AdminLoginPage.jsx` | Wire to real API             | ~20   | Low        |

### Optional (1 file)

| File                           | Changes              | Lines | Complexity |
| ------------------------------ | -------------------- | ----- | ---------- |
| `backend/scripts/seedAdmin.js` | Create DevGate admin | ~40   | Low        |

---

## Implementation Order

### Day 1: Backend Service (4-6 hours)

1. Implement `AuthService.login()` with User lookup + password compare + JWT
2. Implement `AuthService.registerAdmin()` with Restaurant + User creation
3. Add route validators (email, password, confirmPassword, etc.)
4. Test all endpoints with Postman

**Definition of Done**:

- POST /api/auth/login works with real credentials ✓
- POST /api/auth/register creates both Restaurant and User ✓
- Passwords hashed and never returned in responses ✓
- All validation errors return 400 with field descriptions ✓

### Day 2: Frontend Integration (3-4 hours)

1. Enhance AuthContext with async login, error state, isLoading
2. Update AdminLoginPage to call authApi.login()
3. Add error display and loading feedback
4. Test register → login → dashboard flow

**Definition of Done**:

- Login form calls backend API ✓
- Errors display in UI ✓
- Token stored in localStorage ✓
- Redirects to dashboard on success ✓

### Day 3: Testing + Polish (2-3 hours)

1. Run full test checklist (backend + frontend)
2. Test tenant isolation (2 admins, separate data)
3. Test error scenarios
4. Deploy to staging

**Definition of Done**:

- All test checklist items marked ✓
- No sensitive data in responses ✓
- Tenant isolation verified ✓

---

## Key Security Rules (Do NOT Skip)

🔴 **NEVER trust restaurantId from frontend**

- Always use `req.restaurantId` from JWT payload (set by tenantContext middleware)

🔴 **NEVER store plain text passwords**

- User model pre-hook already hashes on save ✓

🔴 **NEVER return passwordHash in responses**

- Use `.select('+passwordHash')` only for comparisons
- Never include in response data

🔴 **NEVER expose error details in production**

- Generic messages to client
- Stack traces only in dev mode (already implemented ✓)

🔴 **NEVER skip input validation**

- Email, password, names all validated before DB operations

---

## Database Queries Needed in AuthService

```javascript
// LOGIN SERVICE

// 1. Find user by email (must include password for comparison)
User.findOne({ email }).select('+passwordHash')

// 2. Compare password using model method
user.comparePassword(password)

// 3. Generate JWT with payload
jwt.sign({ userId, email, role, restaurantId }, JWT_SECRET, { expiresIn: '7d' })


// REGISTER SERVICE

// 1. Check if email already exists
User.findOne({ email })

// 2. Create Restaurant
new Restaurant({ name, ownerName, email, status: 'pending' })

// 3. Create User with restaurant link
new User({ name, email, passwordHash: password, role: 'restaurant_admin', restaurantId: restaurant._id })

// 4. Save both with transaction for atomicity
await session.withTransaction(async () => { ... })
```

---

## Testing Summary

### Backend (Postman/curl)

- [ ] Login valid → 200 with token
- [ ] Login invalid → 401 with message
- [ ] Register valid → 201 with restaurant + user + token
- [ ] Register duplicate email → 409
- [ ] Register validation errors → 400
- [ ] GET /me with token → 200 with user
- [ ] GET /me without token → 401

### Frontend (Manual)

- [ ] Login form submits to API
- [ ] Success redirects to dashboard
- [ ] Error displays in UI
- [ ] Button shows loading state
- [ ] Token persists in localStorage

### Tenant Isolation (Verify in DB)

- [ ] Admin A can only see Admin A's restaurant
- [ ] Admin B can only see Admin B's restaurant
- [ ] DevGate admin can see all (with override)

---

## Environment Variables Needed

```bash
# Backend .env

JWT_SECRET=your-secret-key-at-least-32-chars
JWT_EXPIRY=7d
BCRYPT_ROUNDS=10
MONGO_URI=mongodb://localhost:27017/restaurant_pos_db
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
```

---

## Common Gotchas

❌ **Mistake 1**: Using `req.body.restaurantId` instead of `req.restaurantId`  
✅ **Solution**: Always use `req.restaurantId` from tenantContext middleware

❌ **Mistake 2**: Forgetting to hash password in service  
✅ **Solution**: Pass plain password to User model; model hashes in pre-hook

❌ **Mistake 3**: Not validating input before service call  
✅ **Solution**: Chain validators → validateResult → controller

❌ **Mistake 4**: Returning passwordHash in response  
✅ **Solution**: Never include passwordHash; use `.select('+passwordHash')` only for DB queries

❌ **Mistake 5**: Separate register/login without transaction  
✅ **Solution**: Use Mongoose session with `.withTransaction()` for atomicity

---

## Success Criteria

When all 3 days complete:

1. ✅ Any restaurant admin can register + login
2. ✅ Any restaurant admin can access their own data only
3. ✅ No plaintext passwords in DB or responses
4. ✅ All input validated (backend authoritative)
5. ✅ JWT payload contains only: userId, email, role, restaurantId
6. ✅ Errors handled gracefully (no stack traces to client)
7. ✅ Token persists in localStorage
8. ✅ Logout clears token
9. ✅ Protected routes reject unauthenticated users
10. ✅ Tenant isolation verified (2 admins, separate data)

---

## Next Steps After Auth Complete

Once authentication working:

1. **Menu CRUD** — Admins can create/edit menu items and categories
2. **Table Management** — Admins can create tables and generate QRs
3. **Order Placement** — Customers can place orders (public endpoint)
4. **Kitchen Queue** — Admins see live order stream (Socket.IO)
5. **Order Tracking** — Customers see order status in real-time

---

**Document**: Authentication Implementation Quick Reference  
**Date**: September 1, 2026  
**Status**: Ready for Implementation
