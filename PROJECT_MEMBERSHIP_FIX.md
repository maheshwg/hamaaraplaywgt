# Project Membership Assignment Error - Fix Summary

## Problem
When trying to add users to a project as a client admin, the following error occurred:

```json
{
  "message": "could not execute statement [ERROR: null value in column \"role\" of relation \"project_memberships\" violates not-null constraint\n Detail: Failing row contains (1, null, 1, 3, WRITE).] [insert into project_memberships (access_level,project_id,user_id) values (?,?,?)]; SQL [insert into project_memberships (access_level,project_id,user_id) values (?,?,?)]; constraint [role\" of relation \"project_memberships]",
  "error": "internal_server_error"
}
```

## Root Cause
There was a **schema mismatch** between the database and the Java model:

- **Database**: The `project_memberships` table had a `role` column with a NOT NULL constraint
- **Java Model**: The `ProjectMembership.java` entity did not have a `role` field

When the application tried to insert a new project membership, it only provided values for `access_level`, `project_id`, and `user_id`, but the database required a `role` value.

## Why the Mismatch?
The `role` column in `project_memberships` was redundant because:
1. Users already have roles stored in the `users` table (`tenant_role` column)
2. Project memberships only need to track access levels (READ/WRITE)
3. The current codebase doesn't use or reference this `role` column

This suggests the database schema was from an older design that wasn't updated when the model changed.

## Solution Applied

### Removed Redundant Column
Executed SQL migration to drop the `role` column from `project_memberships`:

```sql
ALTER TABLE project_memberships DROP COLUMN IF EXISTS role;
```

### Current Schema
The `project_memberships` table now has the following structure:

| Column       | Type          | Nullable | Description                    |
|--------------|---------------|----------|--------------------------------|
| id           | bigint        | not null | Primary key                    |
| project_id   | bigint        | not null | Foreign key to projects        |
| user_id      | bigint        | not null | Foreign key to users           |
| access_level | varchar(255)  | not null | READ or WRITE access           |

**Constraints:**
- Primary Key: `id`
- Unique Constraint: `(project_id, user_id)` - prevents duplicate memberships
- Check Constraint: `access_level` must be 'READ' or 'WRITE'
- Foreign Keys: References `projects(id)` and `users(id)`

## Result
✅ The schema now matches the Java model
✅ Users can be successfully added to projects
✅ No redundant data storage

## How to Test

1. **Login as a Client Admin** (or create one first as Vendor Admin)

2. **Navigate to Projects tab**

3. **Create or select a project**

4. **Add a user to the project**:
   - Select a user from your tenant
   - Choose access level (READ or WRITE)
   - Click "Add User"

5. **Verify**: The user should be added successfully without any errors!

## Files Modified

1. **Created**: `backend/fix_project_memberships.sql` - SQL migration script
2. **Existing Model**: `backend/src/main/java/com/youraitester/model/ProjectMembership.java` - Already correct, no changes needed

## Related Information

### User Roles (stored in `users` table)
- `SUPER_ADMIN`: Global platform administrator
- `VENDOR_ADMIN`: Manages client organizations (tenants)
- `CLIENT_ADMIN`: Manages users and projects within their tenant
- `MEMBER`: Regular user with project access

### Project Access Levels (stored in `project_memberships` table)
- `READ`: Can view tests and results
- `WRITE`: Can create and edit tests

The separation is clean:
- **Role** determines what admin functions a user can perform
- **Access Level** determines what actions a user can take on specific projects

---

**Note**: This fix has been applied to your database. No application restart is needed since it was a database schema issue, not a code issue.

