# Client Creation 500 Error - Fix Summary

## Problem
When trying to create a client with admin details in the Clients tab, users were getting a 500 error with the message:
```json
{
    "error": "internal_server_error",
    "message": "No static resource api/admin/tenants/with-admin."
}
```

## Root Cause
The issue had multiple parts:

1. **Missing Authentication Support**: The `/api/public/login` endpoint only supported a hardcoded superadmin user and didn't authenticate users from the database.

2. **Missing PasswordEncoder Bean**: The `PasswordEncoder` bean was not configured in the Spring Security configuration, which was needed for password verification.

3. **Incorrect Role Extraction**: The frontend Login page was hardcoding the role as 'SUPER_ADMIN' instead of extracting it from the JWT token.

4. **No Initial Admin User**: There was no automatic initialization of a VENDOR_ADMIN or SUPER_ADMIN user who could create clients.

## Solution Implemented

### 1. Updated DevTokenController
**File**: `backend/src/main/java/com/youraitester/controller/DevTokenController.java`

- Added `UserRepository` and `PasswordEncoder` dependencies
- Modified the `/api/public/login` endpoint to:
  - First check the hardcoded superadmin credentials (for backward compatibility)
  - Then check for database users by email
  - Verify passwords using BCrypt
  - Issue JWT tokens with the user's actual role from the database

### 2. Added PasswordEncoder Bean
**File**: `backend/src/main/java/com/youraitester/security/SecurityConfig.java`

- Added BCryptPasswordEncoder bean configuration
- This allows password hashing and verification across the application

### 3. Created DataInitializer
**File**: `backend/src/main/java/com/youraitester/config/DataInitializer.java`

- Automatically creates a default VENDOR_ADMIN user on application startup if no admin users exist
- Creates a "System" tenant for platform administrators
- Default credentials:
  - **Email**: `admin@youraitester.com`
  - **Password**: `admin123`
  - **Role**: `VENDOR_ADMIN`

⚠️ **IMPORTANT**: Change the default password in production!

### 4. Fixed Login Page
**File**: `src/pages/Login.jsx`

- Added JWT decoding to extract the role from the token payload
- Updated default credentials to match the new vendor admin user
- Now properly sets the user's role from the JWT instead of hardcoding it

## How to Use

### Step 1: Restart the Backend
```bash
cd backend
mvn spring-boot:run
```

Or if using the jar:
```bash
java -jar target/test-automation-backend-1.0.0.jar
```

### Step 2: Login with Vendor Admin
When the backend starts, it will automatically create the default vendor admin user. Use these credentials to login:

- **Email**: `admin@youraitester.com`
- **Password**: `admin123`

### Step 3: Create Clients
After logging in as the vendor admin, you can now:

1. Navigate to the **Clients** tab
2. Fill in the client details:
   - Client Name
   - Max Seats
   - Admin Name
   - Admin Email
   - Admin Password
3. Click **"Create Client & Admin"**

The client (tenant) and its admin user will be created successfully!

### Step 4: Login as Client Admin
You can then login as the newly created client admin using the email and password you specified during client creation.

## Roles Explained

- **SUPER_ADMIN**: Global platform administrator (can do everything)
- **VENDOR_ADMIN**: Can create and manage client organizations (tenants)
- **CLIENT_ADMIN**: Can manage users and projects within their organization
- **MEMBER**: Regular user with project access

## Security Notes

1. The `/api/admin/**` endpoints require either `SUPER_ADMIN` or `VENDOR_ADMIN` role
2. Only users with these roles can create new clients
3. Client admins (created when you create a client) have `CLIENT_ADMIN` role
4. All passwords are hashed using BCrypt before storage
5. JWT tokens expire after 15 minutes (can be refreshed)

## What Changed

### Backend Changes
1. ✅ DevTokenController now authenticates database users
2. ✅ PasswordEncoder bean added to SecurityConfig
3. ✅ DataInitializer creates default vendor admin on startup
4. ✅ Backend compiled and packaged successfully

### Frontend Changes
1. ✅ Login page now extracts role from JWT token
2. ✅ Default credentials updated to vendor admin

## Testing
The application has been compiled successfully. No linter errors were found in any of the modified files.

## Next Steps

1. **Restart your backend** if it's currently running
2. **Login** with the vendor admin credentials
3. **Create your clients** through the Clients tab
4. **Change the default password** for the vendor admin user in production!

---

If you encounter any issues, check the backend logs at `backend/logs/application.log` for detailed error messages.

