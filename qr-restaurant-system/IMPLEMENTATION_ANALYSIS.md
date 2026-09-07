# Module 1: Authentication + Tenant Foundation — Implementation Analysis

**Status**: Ready for Review & Approval  
**Date**: September 1, 2026

---

## PART 1: FILES TO MODIFY (6 Files Total)

### Backend Files (3 files)

#### 1.1 `backend/src/modules/auth/auth.service.js`

**Current State**: Boilerplate with mock returns  
**Lines to Modify**: All (lines 1-11)

**Changes Required**:

- Replace entire class implementation
- Add imports: `User` model, `Restaurant` model, `jwt`, `mongoose`
- Implement `login(email, password)` method with:
  - Find user by email (select passwordHash)
  - Validate password using `user.comparePassword()`
  - Check restaurant status (if not devgate_admin)
  - Generate JWT token with userId, email, role, restaurantId
  - Return `{ token, user: { id, email, role, restaurantId } }`
  - Throw proper errors (404 for user not found, 401 for invalid password, 403 for suspended restaurant)

- Implement `registerAdmin(userData)` method with:
  - Validate input: name, email, password, restaurantName, ownerName
  - Check if email already exists
  - Create Restaurant with default status "pending"
  - Create User linked to Restaurant
  - Use Mongoose transaction for atomicity
  - Generate JWT
  - Return `{ token, user: {...}, restaurant: {...} }`
  - Throw proper errors (409 for duplicate email, 400 for validation)

**Complexity**: High  
**Security Impact**: Critical

---

#### 1.2 `backend/src/modules/auth/auth.controller.js`

**Current State**: Basic structure with generic error handling  
**Lines to Modify**: Entire file (lines 1-30)

**Changes Required**:

- No new methods needed (structure is correct)
- Enhance error handling:
  - Add proper HTTP status codes
  - Distinguish between validation errors (400), auth errors (401), conflict (409), server errors (500)
  - Never expose sensitive data in error messages
  - Use error.statusCode from service layer
  - Add specific error messages for different scenarios

- Update response format consistency:
  - Login: `{ success: true, data: { token, user } }` with status 200
  - Register: `{ success: true, data: { token, user, restaurant } }` with status 201
  - GET /me: `{ success: true, user: {...} }` with status 200
  - Errors: `{ success: false, message: '...' }` with appropriate status code

**Complexity**: Low  
**Security Impact**: Medium (error disclosure prevention)

---

#### 1.3 `backend/src/modules/auth/auth.routes.js`

**Current State**: Routes defined but no validation  
**Lines to Modify**: Routes section (lines 5-8)

**Changes Required**:

- Add input validation using `express-validator`:
  - Import `{ body }` from 'express-validator'
  - Import `{ validateResult }` from utils/validators

- **POST /login**:
  - Validate email: `body('email').isEmail().normalizeEmail().toLowerCase()`
  - Validate password: `body('password').trim().isLength({ min: 1 })`
  - Add validateResult middleware before controller

- **POST /register**:
  - Validate name: `body('name').trim().isLength({ min: 2 })`
  - Validate email: `body('email').isEmail().normalizeEmail().toLowerCase()`
  - Validate password: `body('password').isLength({ min: 6 })`
  - Validate confirmPassword: `body('confirmPassword').custom((value, { req }) => value === req.body.password)`
  - Validate restaurantName: `body('restaurantName').trim().isLength({ min: 2 })`
  - Validate ownerName: `body('ownerName').trim().isLength({ min: 2 })`
  - Add validateResult middleware before controller

- **GET /me**: Keep as-is (already protected with authenticate middleware)

**Complexity**: Medium  
**Security Impact**: High (input validation)

---

### Frontend Files (2 files)

#### 2.1 `frontend/src/context/AuthContext.jsx`

**Current State**: Synchronous login/logout with mock data support  
**Lines to Modify**: Entire file (lines 1-34)

**Changes Required**:

- Import `authApi` from '../api/authApi'
- Add state: `isLoading` (boolean)
- Add state: `error` (string or null)

- Replace `login()` method:
  - Change signature: `async login(email, password)`
  - Call `authApi.login({ email, password })`
  - On success: extract `{ token, user }` from response
  - Store token in localStorage
  - Update user state
  - Return `{ success: true, user }`
  - On error: set error state, return `{ success: false, message }`
  - Manage isLoading state during request

- Add `register()` method (similar to login):
  - Async with formData parameter
  - Call `authApi.register(formData)`
  - Same success/error handling

- Add `clearError()` method:
  - Simple: `setError(null)`

- Enhance `logout()` method:
  - Clear error state as well

- Add `useEffect` on mount:
  - Check if token exists in localStorage
  - If exists, try to validate (optional, can add later)

**Complexity**: High  
**Security Impact**: Medium (state management)

---

#### 2.2 `frontend/src/admin/pages/AdminLoginPage.jsx`

**Current State**: Hardcoded mock login  
**Lines to Modify**: handleLogin function (lines 11-15) + form JSX (add error display)

**Changes Required**:

- Replace hardcoded login call with real API integration
- Get `{ login, isLoading, error, clearError }` from `useAuth()`

- Update `handleLogin()`:
  - Change from sync to async
  - Clear error on submit: `clearError()`
  - Call `await login(email, password)`
  - Check result.success
  - If success: reset form, navigate to '/admin/dashboard'
  - If error: error state already set by AuthContext

- Add error display in JSX:
  - Conditional render error message box (red background, danger color)
  - Display error message from AuthContext
  - Show only if error exists

- Add loading state to inputs:
  - Disable email input when isLoading
  - Disable password input when isLoading
  - Disable submit button when isLoading
  - Change button text to "Signing in..." when isLoading

- Optionally add form reset:
  - Reset email and password on successful login

**Complexity**: Medium  
**Security Impact**: Low (UX improvement)

---

### Middleware Files (No Changes Required — But Review)

#### 3.1 `backend/src/middleware/auth.js` ✅

**Status**: Already correct

- JWT verification working
- Bearer token parsing correct
- Sets req.user with decoded payload
- Error handling appropriate
- **NO CHANGES NEEDED**

#### 3.2 `backend/src/middleware/tenantContext.js` ✅

**Status**: Already correct

- Gets restaurantId from req.user.restaurantId (JWT)
- Never trusts client input
- DevGate admin can override with x-tenant-override header
- Error handling correct
- **NO CHANGES NEEDED**

#### 3.3 `backend/src/middleware/errorHandler.js` ✅

**Status**: Already correct

- Checks error.statusCode
- Shows stack trace in development only
- Response format correct
- **NO CHANGES NEEDED**

---

### App Configuration (No Changes Required — But Verify)

#### 4.1 `backend/src/app.js` ✅

**Status**: Routes correctly mounted

- `app.use('/api/auth', authRoutes)` on line 31 ✅
- Error handler mounted at bottom ✅
- CORS configured correctly ✅
- **NO CHANGES NEEDED**

---

### API Wrappers (No Changes Required)

#### 5.1 `frontend/src/api/authApi.js` ✅

**Status**: Already correct

- `login(credentials)` → POST /auth/login ✅
- `register(data)` → POST /auth/register ✅
- `getMe()` → GET /auth/me ✅
- **NO CHANGES NEEDED**

#### 5.2 `frontend/src/api/axiosClient.js` ✅

**Status**: Already correct

- JWT interceptor adds Authorization header ✅
- Base URL configured ✅
- **NO CHANGES NEEDED**

---

### Models (No Changes Required — Already Correct)

#### 6.1 `backend/src/models/User.js` ✅

**Status**: Perfect for auth

- passwordHash field with `select: false` ✅
- pre-save hook hashes password with bcrypt ✅
- comparePassword() method implemented ✅
- Email unique constraint ✅
- Role enum with correct values ✅
- restaurantId reference ✅
- **NO CHANGES NEEDED**

#### 6.2 `backend/src/models/Restaurant.js` ✅

**Status**: Perfect for registration

- name, ownerName, email fields ✅
- status enum: ["pending", "active", "suspended"] ✅
- Default status: "pending" ✅
- isActive field for additional control ✅
- **NO CHANGES NEEDED**

---

## PART 2: SECURITY CONSIDERATIONS

### 🔴 Critical Security Rules (Non-Negotiable)

#### 1. **Never Trust Frontend restaurantId**

- ✅ Already enforced by `tenantContext` middleware
- Service should use `req.restaurantId` from JWT payload only
- Verify: All protected routes use `tenantContext` middleware after `authenticate`

#### 2. **Password Hashing**

- ✅ User model pre-save hook handles this
- Service must pass plain password to User model, model hashes it
- Never log or return passwordHash
- Use `.select('+passwordHash')` only when comparing

#### 3. **JWT Payload Security**

- Include ONLY: userId, email, role, restaurantId
- Never include: password, passwordHash, sensitive fields
- Token expiration: 7 days (configured in .env)

#### 4. **Email Uniqueness**

- ✅ User model has unique constraint
- Check before creating new user: `User.findOne({ email })`
- Return 409 Conflict if email exists

#### 5. **Restaurant Status Validation**

- On login:
  - If user role is `restaurant_admin`: restaurant status must be "active" or "pending"
  - If user role is `devgate_admin`: skip restaurant check
  - If restaurant is "suspended": reject login with 403

#### 6. **Error Messages**

- Never expose database details
- Generic messages to client in production
- Log full errors server-side for debugging
- Example:
  - ❌ Wrong: "User with email test@example.com not found"
  - ✅ Correct: "Invalid email or password"

#### 7. **Input Validation**

- Validate all inputs server-side (frontend validation is UX only)
- Sanitize inputs: trim, lowercase email
- Min length: 2 chars for names, 6 chars for password
- Email format validation

#### 8. **Transaction Atomicity**

- Register creates both Restaurant and User
- Must be atomic: if either fails, both fail
- Use Mongoose session with `.withTransaction()`

#### 9. **Password Comparison**

- Use `user.comparePassword()` method (bcrypt.compare)
- Never compare plain text
- Handle async operation properly with await

#### 10. **Rate Limiting** (Optional for MVP)

- Consider adding rate limiting on /login and /register endpoints
- Prevent brute force attacks
- Can use express-rate-limit middleware

---

### 🟡 Important Security Implementation Details

#### Session Timeout

- JWT expires in 7 days
- Frontend should handle 401 responses and redirect to login
- No refresh token implementation needed for MVP

#### Logging

- Log login attempts (success and failure) for audit trail
- Do NOT log passwords or tokens
- Include: email, timestamp, status, IP (optional)

#### CORS

- ✅ Already configured in app.js
- Verify CLIENT_URL in .env matches frontend URL

#### HTTPS in Production

- Ensure HTTPS is enforced
- Add HSTS headers
- Secure cookie flag (if using cookies instead of localStorage)

---

## PART 3: IMPLEMENTATION SEQUENCE

### Phase 1: Backend Service (Backend Developers)

**Duration**: ~3-4 hours

1. Implement `auth.service.js`:
   - Login logic with password comparison and JWT generation
   - Register logic with Restaurant + User creation using transaction
   - Proper error handling with statusCode

2. Add validation to `auth.routes.js`:
   - express-validator chains for login and register
   - validateResult middleware

3. Enhance error handling in `auth.controller.js`:
   - Proper status codes
   - Consistent response format

4. Test with Postman:
   - POST /api/auth/register → success with token
   - POST /api/auth/login → success with token
   - POST /api/auth/login → fail with invalid password
   - POST /api/auth/login → fail with non-existent email
   - GET /api/auth/me → success with token
   - GET /api/auth/me → fail without token

---

### Phase 2: Frontend Integration (Frontend Developers)

**Duration**: ~2-3 hours

1. Enhance `AuthContext.jsx`:
   - Implement async login() and register() methods
   - Add error and isLoading state
   - Call authApi.login() and authApi.register()

2. Update `AdminLoginPage.jsx`:
   - Replace hardcoded login with real API call
   - Add error display
   - Add loading state to button and inputs
   - Navigate to dashboard on success

3. Test in Browser:
   - Fill login form and submit
   - Verify API call is made
   - Verify token stored in localStorage
   - Verify redirect to dashboard

---

### Phase 3: End-to-End Testing

**Duration**: ~1-2 hours

- Full register → login → access dashboard flow
- Tenant isolation verification
- Error scenario testing

---

## PART 4: TESTING CHECKLIST

### Backend Testing (Postman)

#### Login Endpoint

- [ ] Valid credentials → 200 with token and user
- [ ] Invalid email → 404 "User not found"
- [ ] Invalid password → 401 "Invalid password"
- [ ] Missing email → 400 validation error
- [ ] Missing password → 400 validation error
- [ ] Restaurant status "suspended" → 403 "Restaurant is suspended"

#### Register Endpoint

- [ ] Valid data → 201 with token, user, and restaurant
- [ ] Duplicate email → 409 "Email already registered"
- [ ] Password mismatch → 400 "Passwords do not match"
- [ ] Short password (< 6 chars) → 400 "Password must be at least 6 characters"
- [ ] Missing fields → 400 with field errors
- [ ] Verify Restaurant created with status "pending" ✓
- [ ] Verify User created with role "restaurant_admin" ✓

#### Get Me Endpoint

- [ ] Valid token → 200 with user data
- [ ] Invalid token → 401 "Invalid or expired token"
- [ ] No token → 401 "Access denied. No token provided."

#### Database Verification

- [ ] User created with hashed password (not plain text) ✓
- [ ] Restaurant created with correct status ✓
- [ ] User.restaurantId linked to Restaurant.\_id ✓
- [ ] Email unique constraint enforced ✓

---

### Frontend Testing (Manual)

#### Login Page

- [ ] Form submits with email and password
- [ ] Loading state shows on button during request
- [ ] Success redirects to /admin/dashboard
- [ ] Error message displays on failed login
- [ ] Token stored in localStorage
- [ ] Inputs disabled during loading

#### AuthContext

- [ ] login() is async and calls authApi.login()
- [ ] logout() clears token and user state
- [ ] Error state displays properly
- [ ] isLoading state toggles correctly

#### Protected Route (Dashboard)

- [ ] Can access dashboard with valid token
- [ ] Redirects to login without token (implement later)
- [ ] User info available from AuthContext

---

### Tenant Isolation Verification

- [ ] Create 2 restaurants with different admin users
- [ ] Login as Admin A
- [ ] Verify JWT contains restaurantId for Restaurant A
- [ ] Verify API calls only return Restaurant A's data
- [ ] Logout, login as Admin B
- [ ] Verify JWT contains restaurantId for Restaurant B
- [ ] Verify API calls only return Restaurant B's data
- [ ] Admin A cannot access Admin B's restaurant data

---

### Security Verification

- [ ] No plain text passwords in database
- [ ] No passwordHash in API responses
- [ ] No sensitive data in error messages (production)
- [ ] JWT token contains only: userId, email, role, restaurantId
- [ ] Email is case-insensitive (normalized to lowercase)
- [ ] Password comparison uses bcrypt.compare()
- [ ] Duplicate emails rejected with 409 status
- [ ] Invalid passwords rejected with 401 status

---

## PART 5: ENVIRONMENT VARIABLES VERIFICATION

**File**: `backend/.env`

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/restaurant_pos_db
JWT_SECRET=super_secret_jwt_key_restaurant_pos_poc
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Required for Auth Module**:

- ✅ JWT_SECRET (already in .env.example)
- ✅ JWT_EXPIRES_IN (already in .env.example)
- ✅ NODE_ENV (already in .env.example)
- ✅ MONGO_URI (already in .env.example)

**No changes needed to .env configuration**

---

## PART 6: OPTIONAL ENHANCEMENTS (Not Required for MVP)

### Backend Enhancement: Seed Script

**File**: `backend/scripts/seedDevGateAdmin.js` (CREATE NEW)

**Purpose**: Create DevGate super-admin for testing cross-tenant features

**Includes**:

- Create User with role "devgate_admin"
- No restaurantId (null)
- Print created user credentials to console
- Can be run: `node backend/scripts/seedDevGateAdmin.js`

**Status**: Optional - can be implemented after core auth works

---

## PART 7: FINAL SUMMARY

### Files to Modify (6 Total)

| File                                             | Status    | Complexity | Impact   |
| ------------------------------------------------ | --------- | ---------- | -------- |
| backend/src/modules/auth/auth.service.js         | ✏️ Modify | High       | Critical |
| backend/src/modules/auth/auth.controller.js      | ✏️ Modify | Low        | Medium   |
| backend/src/modules/auth/auth.routes.js          | ✏️ Modify | Medium     | High     |
| frontend/src/context/AuthContext.jsx             | ✏️ Modify | High       | High     |
| frontend/src/admin/pages/AdminLoginPage.jsx      | ✏️ Modify | Medium     | High     |
| _(Optional)_ backend/scripts/seedDevGateAdmin.js | ➕ Create | Low        | Low      |

### Files to Review Only (No Changes)

- backend/src/middleware/auth.js ✅
- backend/src/middleware/tenantContext.js ✅
- backend/src/middleware/errorHandler.js ✅
- backend/src/app.js ✅
- frontend/src/api/authApi.js ✅
- frontend/src/api/axiosClient.js ✅
- backend/src/models/User.js ✅
- backend/src/models/Restaurant.js ✅

### Implementation Timeline

- **Phase 1** (Backend): 3-4 hours
- **Phase 2** (Frontend): 2-3 hours
- **Phase 3** (Testing): 1-2 hours
- **Total**: 6-9 hours (1-2 days focused work)

---

**Document Status**: ✅ Ready for Review & Approval  
**Next Step**: User approval before implementation begins
