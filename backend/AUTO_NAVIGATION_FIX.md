# Auto-Navigation Fix - Tests Starting on about:blank

## Problem

All tests are starting on `about:blank` instead of auto-navigating to the app URL. The AI agent asks:
> "I can see the page is currently blank (about:blank). Please provide the URL you'd like me to navigate to..."

## Root Cause

The `app_url` and `app_type` columns may not exist in your database `tests` table, or existing tests have `NULL` values in these columns.

## Auto-Navigation Logic

The backend has logic to automatically navigate to the app URL before executing test steps:

```java
// TestExecutionService.java
if (test.getAppUrl() != null && !test.getAppUrl().trim().isEmpty()) {
    log.info("Auto-navigating to app URL: {}", test.getAppUrl());
    aiTestExecutionService.executeStepWithAI("navigate to " + test.getAppUrl(), "", variables);
}
```

**If `appUrl` is `null` or empty, navigation is skipped!**

## Solution

### Step 1: Add Database Columns (if missing)

Run the migration script to add the columns:

```bash
cd backend
psql -U youraitester -d youraitester -f check-and-fix-appurl.sql
```

Or manually:

```sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_url VARCHAR(500);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_type VARCHAR(100) DEFAULT 'other';
```

### Step 2: Update Existing Tests

For each existing test, you need to set the `app_url` value. You can do this:

**Option A: Via SQL**
```sql
-- Update specific test
UPDATE tests 
SET app_url = 'https://www.saucedemo.com', 
    app_type = 'traditional-web'
WHERE id = 'your-test-id';

-- Or update all tests for a specific project
UPDATE tests 
SET app_url = 'https://your-app-url.com'
WHERE project_id = 'your-project-id' AND app_url IS NULL;
```

**Option B: Via UI**
1. Open the test in the UI
2. Set the "App URL" field
3. Save the test

### Step 3: Verify the Fix

After updating, run the diagnostic to verify:

```bash
# Watch the logs
tail -f backend/backend.log | grep -E "(Loaded test|auto-navigation|Auto-navigating)"
```

When you run a test, you should see:
```
Loaded test 'My Test' - appUrl: 'https://www.saucedemo.com', appType: 'traditional-web'
Checking auto-navigation: appUrl='https://www.saucedemo.com', isNull=false, isEmpty=false
Auto-navigating to app URL: https://www.saucedemo.com
```

## Diagnostic Logging Added

We've added detailed logging to help diagnose this issue:

1. **On test load:**
   ```java
   log.info("Loaded test '{}' - appUrl: '{}', appType: '{}'", 
       test.getName(), test.getAppUrl(), test.getAppType());
   ```

2. **Before auto-navigation check:**
   ```java
   log.info("Checking auto-navigation: appUrl='{}', isNull={}, isEmpty={}", 
       test.getAppUrl(), 
       test.getAppUrl() == null, 
       test.getAppUrl() != null && test.getAppUrl().trim().isEmpty());
   ```

3. **On copy:**
   ```java
   log.info("Copying test - Original appUrl: '{}', Copy appUrl: '{}'", 
       original.getAppUrl(), copy.getAppUrl());
   ```

## Why This Happened

1. The `app_url` column was added in a migration file (`migration-add-app-url-type.sql`)
2. This migration may not have been applied to your database
3. Or, existing tests were created before the column existed and have `NULL` values
4. New tests created via UI properly set `app_url`, but old tests don't have it

## Expected Behavior After Fix

### Before (Broken):
```
[Agent sees about:blank]
Agent: "Please provide the URL..."
Test fails or requires manual URL provision
```

### After (Fixed):
```
[Backend auto-navigates to app URL]
[Agent sees the actual page]
Agent: "Perfect! I can see the login page..."
Test proceeds successfully
```

## Testing Your Fix

### Test Case 1: New Test
1. Create a new test
2. Set app URL: `https://www.saucedemo.com`
3. Add step: "enter standard_user in username"
4. Run test
5. ✅ Should auto-navigate and succeed

### Test Case 2: Copied Test
1. Copy a test that has app_url set
2. Run the copied test
3. ✅ Should auto-navigate (app_url is copied)

### Test Case 3: Old Test Without app_url
1. Find a test created before migration
2. Run it
3. ❌ Will fail with "about:blank" message
4. Edit test, set app_url, save
5. Run again
6. ✅ Should now auto-navigate

## SQL Queries for Diagnosis

```sql
-- Check which tests have app_url
SELECT id, name, app_url, created_date 
FROM tests 
ORDER BY created_date DESC;

-- Count tests without app_url
SELECT 
    COUNT(CASE WHEN app_url IS NULL OR app_url = '' THEN 1 END) as without_url,
    COUNT(CASE WHEN app_url IS NOT NULL AND app_url != '' THEN 1 END) as with_url,
    COUNT(*) as total
FROM tests;

-- Update all tests in a project with default URL
UPDATE tests 
SET app_url = 'https://default-app-url.com'
WHERE project_id = 'your-project-id' 
  AND (app_url IS NULL OR app_url = '');
```

## Status

✅ **Diagnostic logging added** - Backend will now show appUrl values in logs
✅ **Migration script ready** - `check-and-fix-appurl.sql` 
⏳ **Pending** - User needs to:
   1. Apply migration (if columns missing)
   2. Update existing tests with app_url values
   3. Run test to verify fix

## Related Files

- `backend/src/main/java/com/youraitester/service/TestExecutionService.java` - Auto-navigation logic
- `backend/src/main/java/com/youraitester/model/Test.java` - Test model with appUrl field
- `backend/migration-add-app-url-type.sql` - Original migration
- `backend/check-and-fix-appurl.sql` - Diagnostic and fix script (new)


