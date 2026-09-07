# Authentication + Tenant Foundation Implementation Plan

**Status**: Analysis Complete | Ready for Implementation  
**Date**: September 1, 2026  
**Scope**: Backend Authentication Service + Frontend Login Integration

---

## Executive Summary

The authentication scaffolding is **70% complete**. All structural components exist (models, middleware, routes, context). The implementation gap is **service layer logic** and **input validation**.

### What's Ready ✅

- User model with bcrypt password hashing (`passwordHash`, `comparePassword()`)
- Restaurant model with owner/contact fields
- JWT authentication middleware (token verification)
- Tenant context middleware (restaurant isolation)
- Role-based access control middleware
- Auth routes structure (`/login`, `/register`, `/me`)
- Frontend API wrapper (`authApi.js`)
- Frontend auth context (`AuthContext`)
- Form UI components (login page)

### What's Needed ⚠️

- **AuthService.login()** — Real user lookup + password comparison + JWT generation
- **AuthService.registerAdmin()** — Restaurant + user creation validation
- **Input validation** — Email format, password strength, required fields
- **Error handling** — Specific error messages (user not found, invalid password, etc.)
- **Frontend wiring** — Connect login form to real API calls
- **DevGate admin bootstrap** — Create super-admin user programmatically

---

## 1. Files That Need Modification

### Backend

#### 1.1 Service Layer

**File**: `backend/src/modules/auth/auth.service.js`

**Current State**: Boilerplate with mock returns

```javascript
async login(email, password) {
  return { token: 'mock_token', user: { email, role: 'restaurant_admin' } };
}
async registerAdmin(userData) {
  return { success: true };
}
```

**Needs**:

- Import `User` and `Restaurant` models
- Import `jwt` for token generation
- Import `mongoose` for transaction support
- `login(email, password)` implementation
  - Query User by email with password selected (`.select('+passwordHash')`)
  - Compare password using `user.comparePassword()`
  - Generate JWT with `{ userId, email, role, restaurantId }`
  - Return `{ token, user: { id, email, role, restaurantId } }`
- `registerAdmin(userData)` implementation
  - Validate input structure
  - Check if email already exists
  - Create Restaurant document
  - Create User document with `restaurant_admin` role
  - Link User to Restaurant via `restaurantId`
  - Use Mongoose transaction for atomicity
  - Return `{ token, user: {...}, restaurant: {...} }`

---

#### 1.2 Controller Layer

**File**: `backend/src/modules/auth/auth.controller.js`

**Current State**: Basic structure, no validation

**Needs**:

- Add input validation middleware to routes (before calling controller)
- `login` controller: pass validated email/password to service
- `register` controller: pass validated registration data to service
- Error handling: distinguish between validation errors and auth errors
- Response format consistency: `{ success: true, data: { token, user, restaurant? } }`

---

#### 1.3 Routes

**File**: `backend/src/modules/auth/auth.routes.js`

**Current State**:

```javascript
router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/me", authenticate, authController.getMe);
```

**Needs**:

- Add validation chain before each POST endpoint
- Login validation: email (valid format), password (required, min 6 chars)
- Register validation: name, email, password, confirmPassword, restaurant name, owner name
- Call `validateResult` middleware after body validators
- Example pattern:
  ```javascript
  router.post(
    "/login",
    body("email").isEmail().normalizeEmail(),
    body("password").trim().isLength({ min: 1 }),
    validateResult,
    authController.login,
  );
  ```

---

#### 1.4 Utils/Validators

**File**: `backend/src/utils/validators.js`

**Current State**: Only has `validateResult` helper

**Needs**:

- Password validation function: `isValidPassword(pwd)`
  - Min 6 characters
  - At least one letter and one number (recommended)
  - Return `{ valid, message }`
- Email normalization: ensure lowercase
- Error response formatter for consistent error structure

---

### Frontend

#### 2.1 Auth Context

**File**: `frontend/src/context/AuthContext.jsx`

**Current State**: Basic state management, no loading/error states

**Needs**:

- Add `error` state for login/register errors
- Add `isLoading` state for async operations
- Add `register()` method for new account creation
- Enhance `login()` to:
  - Accept `authToken` + parse user data from JWT
  - Store token in localStorage
  - Set user state with decoded JWT payload
- Add error handling that captures backend error messages
- Add `checkAuth()` method to verify stored token on app load

---

#### 2.2 Admin Login Page

**File**: `frontend/src/admin/pages/AdminLoginPage.jsx`

**Current State**: Hardcoded mock login

```javascript
const handleLogin = (e) => {
  e.preventDefault();
  login(
    { email, role: "restaurant_admin", restaurantId: "demo_restaurant_1" },
    "demo_token",
  );
  navigate("/admin/dashboard");
};
```

**Needs**:

- Replace hardcoded `login()` call with `authApi.login()`
- Call `authApi.login({ email, password })`
- Extract user data from response: `{ token, user }`
- Call `login(user, token)` from AuthContext
- Handle errors: display error message toast/alert
- Show loading state on button during request
- Implement redirect on success → `/admin/dashboard`
- Implement redirect on auth failure → stay on login

---

#### 2.3 Auth API Wrapper

**File**: `frontend/src/api/authApi.js`

**Current State**: Skeleton only

```javascript
export const authApi = {
  login: (credentials) => axiosClient.post("/auth/login", credentials),
  register: (data) => axiosClient.post("/auth/register", data),
  getMe: () => axiosClient.get("/auth/me"),
};
```

**Needs**: No changes required — structure is correct. Implementation will be called as-is.

---

#### 2.4 Axios Client

**File**: `frontend/src/api/axiosClient.js`

**Current State**: JWT interceptor present, working

**Needs**: No changes required — already adds `Authorization: Bearer token` header.

---

### Optional: Bootstrap/Seed Data

**File**: `backend/scripts/seedAdmin.js` (NEW FILE)

**Purpose**: Create initial DevGate super-admin for development

**Needs**:

- Script to connect to MongoDB
- Create DevGate admin user with:
  - `role: 'devgate_admin'`
  - `restaurantId: null`
  - Email + password from env or args
- Print created user + JWT token to console

---

## 2. Implementation Plan

### Phase 1: Backend Service Implementation (Priority 1)

#### Step 1.1: Update `auth.service.js`

**Dependencies**: User model, Restaurant model, jwt, mongoose  
**Complexity**: Medium

**Implementation sequence**:

1. Add imports: `User`, `Restaurant`, `jwt`, `mongoose.startSession()`
2. Implement `login(email, password)`:
   ```
   → Query User.findOne({ email }).select('+passwordHash')
   → If not found: throw 'User not found' error
   → Use user.comparePassword(password)
   → If mismatch: throw 'Invalid password' error
   → Generate JWT: jwt.sign({ userId: user._id, email, role, restaurantId }, JWT_SECRET, { expiresIn: '7d' })
   → Return { token, user: { id, email, role, restaurantId } }
   ```
3. Implement `registerAdmin(userData)`:
   ```
   → Validate: { name, email, password, confirmPassword, restaurantName, ownerName }
   → Check if email exists: User.findOne({ email })
   → If exists: throw 'Email already registered' error
   → Start transaction: session = await mongoose.startSession()
   → Create Restaurant: { name: restaurantName, ownerName, email, status: 'pending' }
   → Create User: { name, email, passwordHash: password, role: 'restaurant_admin', restaurantId }
   → Commit transaction
   → Generate JWT for new user
   → Return { token, user: {...}, restaurant: {...} }
   ```

**Error Handling**:

- `User not found` → 404
- `Invalid password` → 401
- `Email already exists` → 409 Conflict
- `Password mismatch` → 400 Bad Request
- DB errors → 500 Internal Server Error

---

#### Step 1.2: Add Input Validation to `auth.routes.js`

**Dependencies**: `express-validator`, `auth.controller`, validators  
**Complexity**: Low

**Implementation sequence**:

1. Import `body`, `validationResult` from `express-validator`
2. Import `validateResult` from `utils/validators`
3. Add validation to `/login`:
   - `body('email').isEmail().normalizeEmail().toLowerCase()`
   - `body('password').trim().isLength({ min: 1 })`
4. Add validation to `/register`:
   - `body('name').trim().isLength({ min: 2 })`
   - `body('email').isEmail().normalizeEmail().toLowerCase()`
   - `body('password').isLength({ min: 6 })`
   - `body('confirmPassword').custom((value, { req }) => value === req.body.password)`
   - `body('restaurantName').trim().isLength({ min: 2 })`
   - `body('ownerName').trim().isLength({ min: 2 })`
5. Place validators **before** controller in route chain
6. Call `validateResult` middleware after validators

---

#### Step 1.3: Enhanced Error Handling in `auth.controller.js`

**Dependencies**: Error handling middleware  
**Complexity**: Low

**Implementation sequence**:

1. Wrap try/catch to distinguish error types:
   - Validation errors: 400
   - Authentication errors: 401
   - Conflict errors (email exists): 409
   - Server errors: 500
2. Pass meaningful error messages to client
3. Ensure errors follow response format: `{ success: false, message, errors? }`

---

### Phase 2: Frontend Integration (Priority 2)

#### Step 2.1: Enhance `AuthContext.jsx`

**Dependencies**: authApi  
**Complexity**: Medium

**Implementation sequence**:

1. Add state: `const [isLoading, setIsLoading] = useState(false)`
2. Add state: `const [error, setError] = useState(null)`
3. Enhance `login()` method:
   ```
   → Take credentials: { email, password }
   → Call authApi.login(credentials)
   → On success: extract { token, user }, store token, set user state
   → On error: set error state with message
   → Manage loading state during request
   ```
4. Add `register()` method (same pattern as login)
5. Add `clearError()` method to reset error state
6. Add useEffect on mount to check for stored token and validate

---

#### Step 2.2: Update `AdminLoginPage.jsx`

**Dependencies**: authApi, AuthContext, useNavigate  
**Complexity**: Low

**Implementation sequence**:

1. Use `authApi.login()` instead of hardcoded login
2. Get `{ login, error, isLoading }` from AuthContext
3. Implement handleLogin:
   ```
   → Call authApi.login({ email, password })
   → If success: call login(user, token), navigate to '/admin/dashboard'
   → If error: display error message, stay on page
   ```
4. Add error display: conditional render error message box
5. Add loading state to submit button: disable + show spinner
6. Add form reset on successful submit

---

#### Step 2.3: Protect Admin Routes

**File**: `frontend/src/admin/AdminApp.jsx`  
**Complexity**: Medium

**Needs**:

- Check if user is authenticated and has `restaurant_admin` role
- Redirect to login if not authenticated
- Use AuthContext `user` state and `token` state
- Implement route protection before rendering AdminApp
- Use React Router navigation on auth check failure

---

### Phase 3: Testing & Validation (Priority 3)

#### Step 3.1: Backend Testing

- Postman/curl tests for each endpoint
- Database state verification
- Error scenario testing

#### Step 3.2: Frontend Testing

- Login form submission
- Error message display
- Token persistence (localStorage)
- Protected route access control
- Logout functionality

#### Step 3.3: Integration Testing

- Full end-to-end flow: register → login → access protected resources

---

## 3. Security Considerations

### 🔴 Critical Security Rules

#### 3.1 Never Trust Frontend restaurantId

**Rule**: restaurantId must ALWAYS come from JWT payload, never from request body/params.

**Implementation**:

```javascript
// ✅ CORRECT
router.get("/orders", authenticate, tenantContext, (req, res) => {
  Order.find({ restaurantId: req.restaurantId }); // from JWT
});

// ❌ WRONG
router.get("/orders", (req, res) => {
  Order.find({ restaurantId: req.query.restaurantId }); // from frontend
});
```

**Enforcement**:

- `tenantContext` middleware already enforces this
- Verify all protected routes use `tenantContext` middleware
- Code review checklist: Are we using `req.restaurantId` from tenantContext?

---

#### 3.2 Password Hashing

**Rule**: NEVER store plain text passwords. Use bcrypt.

**Implementation**:

- User model pre-hook already hashes on save ✅
- Service layer must pass plain password to model, model hashes it ✅
- API must never return passwordHash in responses ✅

**Verification**:

```javascript
// ✅ Correct: select() explicitly excludes passwordHash
User.findOne({ email }).select('+passwordHash')

// Response format (never include passwordHash):
{ success: true, data: { token, user: { id, email, role, restaurantId } } }
```

---

#### 3.3 JWT Security

**Rule**: JWT must contain ONLY: userId, role, restaurantId, email. No sensitive data.

**Implementation**:

```javascript
// ✅ Correct payload
const token = jwt.sign(
  { userId: user._id, email, role, restaurantId },
  process.env.JWT_SECRET,
  { expiresIn: "7d" },
);

// ❌ Wrong: includes sensitive data
const token = jwt.sign(
  { ...user.toObject() }, // exposes everything
  JWT_SECRET,
);
```

**Verification**:

- Decode JWT in jwt.io — verify no sensitive fields
- Token expiration always set to `7d` or less
- JWT_SECRET stored in `.env`, never in code

---

#### 3.4 Session Management

**Rule**: Restaurant admin can only manage their own restaurant. DevGate admins can override.

**Implementation**: `tenantContext` middleware already handles this ✅

**Verification**:

- Non-DevGate users cannot provide `x-tenant-override` header
- Requests without restaurantId in JWT are rejected

---

#### 3.5 Input Validation

**Rule**: Always validate & sanitize user input before database operations.

**Implementation**:

- Email: `isEmail().normalizeEmail()`
- Password: minimum length + complexity
- Names: trim, minimum length, no special chars
- Use `express-validator` for consistent validation

**Verification**:

- All POST/PUT/PATCH routes have validation chain
- Frontend form validation mirrors backend validation
- Backend validation is authoritative (frontend validation is UX only)

---

#### 3.6 Error Messages

**Rule**: Never expose internal error details (stack traces, DB queries) in production.

**Implementation**:

- Error handler middleware checks `NODE_ENV`
- Development: include stack traces
- Production: generic error messages only
- Already implemented in `errorHandler.js` ✅

**Verification**:

```javascript
// ✅ Correct
res.status(401).json({ success: false, message: "Invalid credentials" });

// ❌ Wrong
res
  .status(401)
  .json({ success: false, message: `User ${email} not found in DB` });
```

---

### 🟡 Important Security Considerations

#### 3.7 Email Uniqueness

**Constraint**: Email must be globally unique across all restaurants.

**Reason**: Users can only have one account; they can be assigned to multiple restaurants later.

**Implementation**:

- User model: `unique: true` on email field ✅
- Register flow: check `User.findOne({ email })` before creation
- Error message: "Email already registered"

---

#### 3.8 Password Requirements

**Recommended Policy**:

- Minimum 6 characters (strict but functional for POC)
- Preferably: 8+ chars with letter + number (production)
- No complexity rules in initial MVP (can be added later)

**Implementation**: `body('password').isLength({ min: 6 })`

---

#### 3.9 Role Initialization

**Rule**: Only DevGate admins can create other users. Restaurant admins can only login.

**For MVP**:

- Registration endpoint creates only `restaurant_admin` users
- `kitchen_staff` users created by backend admin/script
- `devgate_admin` users created by bootstrap script

**Implementation**:

- Register endpoint force-sets `role: 'restaurant_admin'`
- Kitchen staff creation separate endpoint (admin-only)

---

#### 3.10 Token Expiration

**Rule**: Tokens must expire to limit damage from theft.

**Implementation**:

- JWT expiration: `7d` (configurable via env)
- Refresh token flow: Optional for MVP (add later if needed)
- Client: Re-login when token expires (implement in frontend error handler)

---

## 4. Testing Checklist

### Backend Testing

#### Authentication Service Tests

- [ ] **Login - Valid credentials**
  - Request: `POST /api/auth/login` with valid email + password
  - Expected: `{ success: true, data: { token, user } }` 200 OK
  - Token must be valid JWT with correct payload
  - User must contain: id, email, role, restaurantId

- [ ] **Login - Invalid email**
  - Request: `POST /api/auth/login` with non-existent email
  - Expected: `{ success: false, message: 'User not found' }` 404

- [ ] **Login - Invalid password**
  - Request: `POST /api/auth/login` with correct email, wrong password
  - Expected: `{ success: false, message: 'Invalid password' }` 401

- [ ] **Login - Missing fields**
  - Request: `POST /api/auth/login` without email or password
  - Expected: Validation error 400 with field list

- [ ] **Register - Valid data**
  - Request: `POST /api/auth/register` with all required fields
  - Expected: `{ success: true, data: { token, user, restaurant } }` 201
  - Restaurant status should be `'pending'`
  - User should have `role: 'restaurant_admin'`
  - Both User and Restaurant created in DB

- [ ] **Register - Email already exists**
  - Request: `POST /api/auth/register` with existing email
  - Expected: `{ success: false, message: 'Email already registered' }` 409

- [ ] **Register - Password mismatch**
  - Request: `POST /api/auth/register` with password !== confirmPassword
  - Expected: Validation error 400

- [ ] **Register - Missing fields**
  - Request: `POST /api/auth/register` with incomplete data
  - Expected: Validation error 400 listing missing fields

- [ ] **Get Me - Valid token**
  - Request: `GET /api/auth/me` with valid Authorization header
  - Expected: `{ success: true, user: { id, email, role, restaurantId } }` 200

- [ ] **Get Me - Invalid token**
  - Request: `GET /api/auth/me` with malformed/expired token
  - Expected: `{ success: false, message: 'Invalid or expired token' }` 401

- [ ] **Get Me - No token**
  - Request: `GET /api/auth/me` without Authorization header
  - Expected: `{ success: false, message: 'Access denied. No token provided.' }` 401

#### Tenant Isolation Tests

- [ ] **Non-DevGate user cannot override tenant**
  - Request: `restaurant_admin` user with `x-tenant-override` header
  - Expected: Ignored; uses `req.user.restaurantId` instead

- [ ] **DevGate admin can override tenant**
  - Request: `devgate_admin` user with `x-tenant-override` header
  - Expected: Uses `x-tenant-override` value for `req.restaurantId`

- [ ] **User without restaurantId rejected**
  - Scenario: DevGate admin without `x-tenant-override` calling protected route
  - Expected: `{ success: false, message: 'Tenant identifier missing...' }` 403

#### Database Integrity Tests

- [ ] **Password never stored plain text**
  - Retrieve user from DB directly
  - passwordHash must be hashed (not readable as plain text)

- [ ] **Password field not selected by default**
  - Request: `GET /api/auth/me`
  - Response must NOT include passwordHash

- [ ] **Email uniqueness enforced**
  - Register two users with same email
  - Second registration fails with duplicate error

- [ ] **Restaurant and User linked correctly**
  - Register user
  - Verify User.restaurantId === Restaurant.\_id
  - Verify Restaurant exists in DB

---

### Frontend Testing

#### Login Page Tests

- [ ] **Successful login flow**
  - Fill email + password
  - Click "Sign In"
  - Wait for request to complete
  - Redirected to `/admin/dashboard`
  - Token stored in localStorage
  - User state populated in AuthContext

- [ ] **Login error display**
  - Submit invalid credentials
  - Error message displayed on page
  - User remains on login page

- [ ] **Loading state**
  - Click "Sign In"
  - Button should show loading indicator
  - Button should be disabled during request

- [ ] **Form validation**
  - Submit empty form
  - Submit with invalid email format
  - Submit with too-short password
  - Expected: Form shows validation errors

- [ ] **Token persistence**
  - Login successfully
  - Reload page
  - User should still be logged in (token retrieved from localStorage)

#### AuthContext Tests

- [ ] **Login method stores token + user**
  - Call `login(userData, token)`
  - Verify token in localStorage
  - Verify user state updated
  - Verify AuthContext.user has correct structure

- [ ] **Logout method clears state**
  - Call `logout()`
  - Verify token removed from localStorage
  - Verify user set to null

- [ ] **Error state management**
  - Set error in context
  - Verify error displayed
  - Clear error
  - Verify error cleared

#### Protected Routes Tests

- [ ] **Unauthenticated access redirects to login**
  - Visit `/admin/dashboard` without token
  - Redirected to `/admin/login`

- [ ] **Authenticated access granted**
  - Login successfully
  - Visit `/admin/dashboard`
  - Page loads and displays content

- [ ] **Token expiration handling**
  - Use expired token
  - Call protected endpoint
  - Get 401 from backend
  - Frontend redirects to login
  - Display message: "Session expired. Please login again."

---

### Integration Tests

#### End-to-End Register → Login → Access flow

- [ ] **New restaurant registration**
  - Submit registration form
  - Verify Restaurant created in DB with `status: 'pending'`
  - Verify User created in DB with `role: 'restaurant_admin'`
  - Verify token returned and valid
  - Verify user immediately logged in

- [ ] **Existing user login**
  - Register restaurant A
  - Logout
  - Login with same credentials
  - Redirected to dashboard
  - Same user + restaurant loaded

- [ ] **Cross-tenant isolation**
  - Create 2 restaurants (admin A, admin B)
  - Login as admin A
  - Call `/api/orders` (should return admin A's orders only)
  - Logout, login as admin B
  - Call `/api/orders` (should return admin B's orders only)
  - Admin A's orders never visible to admin B

- [ ] **Tenant context inheritance**
  - Login as admin A (restaurantId = "restA")
  - Call POST `/api/tables/create` (create table in restA)
  - Table created with `restaurantId: restA`
  - Verify GET `/api/tables` returns only restA tables

---

### Security Tests

#### JWT Validation

- [ ] **Invalid signature rejected**
  - Manually modify JWT token
  - Call protected endpoint
  - Expected: 401 "Invalid or expired token"

- [ ] **Expired token rejected**
  - Create token with `expiresIn: '1s'`
  - Wait > 1 second
  - Call protected endpoint
  - Expected: 401 "Invalid or expired token"

- [ ] **Missing token rejected**
  - Call protected endpoint without Authorization header
  - Expected: 401 "Access denied. No token provided."

#### Password Security

- [ ] **bcrypt hash comparison**
  - Retrieve stored user.passwordHash
  - Verify hash is not plain text
  - Verify hash changes on re-register with same password

- [ ] **Plaintext password never logged**
  - Check server logs during login
  - Verify password not printed/logged anywhere
  - Only hashes should appear in logs

#### Input Validation

- [ ] **SQL injection prevented**
  - Register with email: `test" OR "1"="1`
  - Expected: Validation error or safe handling

- [ ] **XSS prevention**
  - Register with name: `<script>alert('xss')</script>`
  - Expected: Escaped or rejected safely

- [ ] **Email normalization**
  - Register with email: `TEST@EXAMPLE.COM`
  - Login with email: `test@example.com`
  - Expected: Successful login (case-insensitive)

---

## 5. Implementation Sequence Summary

### Week 1 - Foundation (Days 1-2)

1. **Implement AuthService.login()** ✓ Create with real DB query + JWT
2. **Implement AuthService.registerAdmin()** ✓ Create Restaurant + User
3. **Add route validation** ✓ Login + register validators
4. **Test with Postman** ✓ Verify all endpoints work

### Week 1 - Frontend (Days 3-4)

5. **Enhance AuthContext** ✓ Add async login, error handling
6. **Update AdminLoginPage** ✓ Wire to real authApi calls
7. **Add error display** ✓ Show login errors
8. **Add loading states** ✓ Button feedback

### Week 1 - Integration (Day 5)

9. **Protected routes** ✓ Redirect unauthenticated users
10. **Token persistence** ✓ Verify localStorage/logout flow
11. **Full E2E testing** ✓ Register → Login → Access dashboard

---

## 6. Files Checklist

### Backend Files to Modify

- [ ] `backend/src/modules/auth/auth.service.js` — Service implementation
- [ ] `backend/src/modules/auth/auth.routes.js` — Add validation chain
- [ ] `backend/src/modules/auth/auth.controller.js` — Error handling (minor)
- [ ] `backend/src/utils/validators.js` — Add password validator (optional)
- [ ] `backend/.env.example` — Add JWT_SECRET, BCRYPT_ROUNDS examples

### Frontend Files to Modify

- [ ] `frontend/src/context/AuthContext.jsx` — Add async login, error state
- [ ] `frontend/src/admin/pages/AdminLoginPage.jsx` — Wire to real API
- [ ] `frontend/src/admin/AdminApp.jsx` — Add route protection (optional)

### Optional Files to Create

- [ ] `backend/scripts/seedAdmin.js` — DevGate admin bootstrap

### No Changes Needed

- ✅ `backend/src/models/User.js` — Already has bcrypt setup
- ✅ `backend/src/models/Restaurant.js` — Already expanded
- ✅ `backend/src/middleware/auth.js` — Already correct
- ✅ `backend/src/middleware/tenantContext.js` — Already correct
- ✅ `frontend/src/api/authApi.js` — Already correct
- ✅ `frontend/src/api/axiosClient.js` — JWT interceptor working

---

## 7. Deployment Checklist

- [ ] JWT_SECRET configured in production .env (not hardcoded)
- [ ] NODE_ENV set to 'production'
- [ ] Database backups enabled
- [ ] CORS configured for frontend domain only
- [ ] HTTPS enforced for API
- [ ] Password hashing rounds (bcrypt): 10+ in production
- [ ] Token expiration: Reviewed and appropriate
- [ ] Error logging: No sensitive data exposed
- [ ] Rate limiting: Consider adding to auth endpoints
- [ ] Audit logging: Logins/registrations logged (optional)

---

## Notes & Recommendations

### For MVP

- Register flow creates only `restaurant_admin` users
- Kitchen staff onboarding separate (admin endpoint)
- Email verification optional (can add in Phase 2)
- Refresh tokens not needed yet (single 7-day expiry)

### For Production (Phase 2)

- Add email verification workflow
- Implement refresh token flow
- Add rate limiting on auth endpoints
- Implement audit logging
- Add 2FA option for admins
- Implement password reset flow
- Add session invalidation on logout
- Implement CORS properly per environment

### Performance Considerations

- Index email field for fast lookups ✓ (already in User model)
- Use Mongoose `.lean()` for read-only queries (later)
- Cache restaurant settings in Redis (Phase 2)
- Implement JWT caching strategy (Phase 2)

---

**Document Created**: 2026-09-01  
**Review Status**: Ready for Implementation  
**Reviewer**: [Awaiting approval]
