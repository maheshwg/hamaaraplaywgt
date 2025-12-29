# 403 Forbidden Error Fix - Copy Test Endpoint

## Problem
When trying to copy a test, the frontend was getting a 403 Forbidden error:
```
POST /api/tests/{id}/copy HTTP/1.1
Status: 403 Forbidden
```

## Root Cause
The copy endpoint requires authentication (configured in `SecurityConfig.java`), but the frontend mutation was not sending the JWT token in the request.

### Security Configuration
```java
// SecurityConfig.java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/**", "/health", "/api/public/**", "/api/screenshots/**").permitAll()
    .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "VENDOR_ADMIN")
    .requestMatchers("/api/projects/**").authenticated()
    .anyRequest().authenticated()  // ← All other endpoints require auth
);
```

The `/api/tests/{id}/copy` endpoint falls under `.anyRequest().authenticated()`, so it requires a valid JWT token.

## Solution
Updated the `copyMutation` in `Tests.jsx` to include the Authorization header with the JWT token:

### Before (Missing Auth)
```javascript
const copyMutation = useMutation({
  mutationFn: async (testId) => {
    const response = await fetch(`http://localhost:8080/api/tests/${testId}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }  // ❌ No auth!
    });
    return response.json();
  }
});
```

### After (With Auth)
```javascript
const copyMutation = useMutation({
  mutationFn: async (testId) => {
    const token = Auth.getToken();
    const response = await fetch(`http://localhost:8080/api/tests/${testId}/copy`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})  // ✅ Auth included!
      }
    });
    return response.json();
  }
});
```

## Files Changed
- `src/pages/Tests.jsx`:
  - Added `import { Auth } from '@/api/auth';`
  - Updated `copyMutation` to include JWT token in Authorization header

## Testing
1. Ensure you're logged in (JWT token in localStorage)
2. Navigate to Tests page
3. Click three-dot menu on a test
4. Select "Copy Test"
5. Should now work without 403 error

## Why This Happened
The original implementation used raw `fetch()` instead of the existing `base44` client, which automatically includes auth headers via the `authHeaders()` helper function.

## Best Practice
For future API calls, use the existing `base44` client structure or ensure manual `fetch()` calls include:
```javascript
const token = Auth.getToken();
headers: {
  ...authHeaders(),
  // or manually:
  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
}
```

## Related Security Notes
- All `/api/*` endpoints (except public routes) require authentication
- Public routes: `/api/public/**`, `/api/screenshots/**`, `/actuator/**`, `/health`
- Admin routes: `/api/admin/**` requires `SUPER_ADMIN` or `VENDOR_ADMIN` role
- JWT tokens are obtained via `/api/public/dev-token` or `/api/public/login`
- Tokens are stored in localStorage and expire after 15 minutes

## Status
✅ **FIXED** - Copy test now works with proper authentication


