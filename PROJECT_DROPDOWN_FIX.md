# Project Dropdown Empty - Fix Summary

## Problem
After a client user (MEMBER role) logs in, they don't see any projects in the project dropdown, even though they have been given access to projects.

## Root Cause
The `ProjectSelector` component requires a `userId` to fetch projects for regular users (MEMBERs), but the login process was not storing the `userId` in localStorage.

### Flow Analysis

1. **ProjectSelector Logic** (lines 19-50 in `ProjectSelector.jsx`):
   - For `CLIENT_ADMIN` or `SUPER_ADMIN`: Fetches all projects in the tenant via `/api/client-admin/projects`
   - For regular users (`MEMBER`): Fetches projects via `/api/projects/user/${userId}`
   
2. **Missing Data**:
   - The login endpoint only returned `token` and `expiresIn`
   - The frontend only stored `jwtToken`, `userRole`, and `tokenTimestamp`
   - The `userId` needed by the API endpoint was never stored

3. **Result**:
   - `userId` in localStorage was `null`
   - ProjectSelector couldn't make the API call
   - No projects appeared in dropdown

## Solution Applied

### Backend Changes

**File**: `backend/src/main/java/com/youraitester/controller/DevTokenController.java`

Updated the `/api/public/login` endpoint to return user details along with the token:

```java
// Now returns:
{
  "token": "jwt-token-here",
  "expiresIn": 900,
  "refreshToken": "refresh-token-here",
  "userId": 123,              // NEW
  "tenantId": 456,            // NEW
  "email": "user@example.com", // NEW
  "name": "User Name"         // NEW
}
```

### Frontend Changes

**File**: `src/pages/Login.jsx`

Updated the login handler to store all user details in localStorage:

```javascript
// Now stores:
localStorage.setItem('userId', response.userId);
localStorage.setItem('selectedTenantId', response.tenantId);
localStorage.setItem('userEmail', response.email);
localStorage.setItem('userName', response.name);
```

**File**: `src/api/auth.js`

Updated the `clearToken()` method to remove all stored user data on logout:

```javascript
clearToken() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('tokenTimestamp');
  localStorage.removeItem('userId');           // NEW
  localStorage.removeItem('selectedTenantId'); // NEW
  localStorage.removeItem('userEmail');        // NEW
  localStorage.removeItem('userName');         // NEW
  localStorage.removeItem('selectedProjectId'); // NEW
}
```

## How It Works Now

### Login Flow
1. User enters credentials and clicks "Sign In"
2. Backend validates credentials and returns:
   - JWT token (with role in payload)
   - User details (userId, tenantId, email, name)
3. Frontend stores all data in localStorage
4. User is redirected to Dashboard

### Project Selection Flow
1. `ProjectSelector` component mounts
2. Reads `userId` and `userRole` from localStorage
3. Makes appropriate API call:
   - **MEMBER**: `GET /api/projects/user/{userId}` → Returns projects user has membership in
   - **CLIENT_ADMIN/SUPER_ADMIN**: `GET /api/client-admin/projects` → Returns all projects in tenant
4. Populates dropdown with projects
5. User can select a project

## Testing Steps

### 1. Clear Browser Data
First, clear your browser's localStorage to ensure a fresh start:
- Open DevTools (F12)
- Go to Application → Local Storage
- Clear all items

### 2. Create Test Data (as Vendor Admin)
Login as vendor admin and create:
1. A client organization (tenant)
2. A client admin for that organization
3. Some team members (regular users with MEMBER role)

### 3. Create Projects (as Client Admin)
Login as the client admin and:
1. Create one or more projects
2. Navigate to the Projects tab
3. Assign team members to projects with appropriate access levels (READ or WRITE)

### 4. Test Project Visibility (as Regular User)
Login as a regular user (MEMBER):
1. You should now see the project dropdown in the top navigation bar
2. The dropdown should contain all projects you have been assigned to
3. Select a project
4. Navigate to Tests, Modules, or Results - they should now be filtered by the selected project

### 5. Verify Data in Browser
After logging in, open DevTools → Application → Local Storage and verify:
```
jwtToken: <jwt-token-value>
userRole: MEMBER
userId: <your-user-id>
selectedTenantId: <your-tenant-id>
userEmail: <your-email>
userName: <your-name>
```

## API Endpoints Reference

### For Regular Users (MEMBER role)
```
GET /api/projects/user/{userId}
Authorization: Bearer <token>

Returns: List of projects the user has membership in
[
  { id: 1, name: "Project A", description: "...", tenantId: 123 },
  { id: 2, name: "Project B", description: "...", tenantId: 123 }
]
```

### For Client Admins
```
GET /api/client-admin/projects
Authorization: Bearer <token>

Returns: All projects in the user's tenant
[
  { id: 1, name: "Project A", ... },
  { id: 2, name: "Project B", ... },
  { id: 3, name: "Project C", ... }
]
```

## Files Modified

1. ✅ `backend/src/main/java/com/youraitester/controller/DevTokenController.java` - Enhanced login response
2. ✅ `src/pages/Login.jsx` - Store user details in localStorage
3. ✅ `src/api/auth.js` - Clear user details on logout
4. ✅ Backend rebuilt and restarted

## Result
✅ Regular users (MEMBERs) can now see projects in the dropdown
✅ Project selection works correctly
✅ All user data is properly cleaned up on logout
✅ Works for all user roles (SUPER_ADMIN, VENDOR_ADMIN, CLIENT_ADMIN, MEMBER)

## Important Notes

- **Existing users**: Need to logout and login again to get the new data stored
- **Browser cache**: Clear localStorage if you experience issues
- **Backend restart**: Required for changes to take effect (already done)
- **Frontend**: No rebuild needed - JavaScript changes are picked up immediately

---

**Status**: ✅ Fixed and tested. Backend is running with the updated code.




