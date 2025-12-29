# Why Tests Suddenly Start on about:blank

## Timeline

**10 minutes ago**: Tests were working fine ✅  
**Now**: All tests start on `about:blank` and fail ❌

## What Changed

We removed the `--shared-browser-context` flag from the MCP server to fix session expiration issues.

### Before (With `--shared-browser-context`)
```bash
npx @playwright/mcp --shared-browser-context ...
```

**Behavior:**
- Browser context (pages, cookies, state) was shared across MCP sessions
- When we called `mcpService.resetSession()` at the start of each test
- The browser page **stayed open** from the previous test
- Even if appUrl was NULL/empty, tests worked because the page persisted

```
Test 1 (appUrl: null):
  → Session reset
  → Browser still on previous page ✓
  → Test works (by accident)

Test 2 (appUrl: "https://saucedemo.com"):
  → Navigate to saucedemo
  → Session reset
  
Test 3 (appUrl: null):  
  → Session reset
  → Browser STILL on saucedemo ✓
  → Test works (by accident)
```

### After (Without `--shared-browser-context`)
```bash
npx @playwright/mcp --user-data-dir ... (NO --shared-browser-context)
```

**Behavior:**
- Each MCP session gets its own fresh browser context
- When we call `mcpService.resetSession()` at the start of each test
- The browser **starts fresh on about:blank**
- Tests with NULL/empty appUrl now fail immediately

```
Test 1 (appUrl: null):
  → Session reset
  → Fresh browser → about:blank ❌
  → Agent: "Please provide URL"
  → TEST FAILS

Test 2 (appUrl: "https://saucedemo.com"):  
  → Session reset
  → Fresh browser → about:blank
  → Auto-navigate to saucedemo ✓
  → Test works ✓

Test 3 (appUrl: null):
  → Session reset  
  → Fresh browser → about:blank ❌
  → TEST FAILS
```

## Why We Removed `--shared-browser-context`

The shared context was causing session conflicts and aggressive session cleanup, resulting in:
- 9 session resets for a 3-step test
- Massive token usage (80K+ tokens)
- Claude API rate limits
- "Session not found" errors

See: `backend/MCP_SESSION_ARCHITECTURE_FIX.md`

## The Real Issue

**Tests without appUrl were never supposed to work!** 

The `--shared-browser-context` flag was **accidentally hiding a bug** where tests could run without specifying a URL because the browser state persisted from previous tests.

## The Fix

### Step 1: Backend Now Fails Fast

The backend now explicitly fails tests that don't have an appUrl:

```java
if (test.getAppUrl() == null || test.getAppUrl().trim().isEmpty()) {
    log.error("❌ CRITICAL: No app URL configured for test '{}'!", test.getName());
    testRun.setStatus("failed");
    testRun.setErrorMessage("No app URL configured. Browser starts on about:blank after session reset.");
    return; // Exit early
}
```

**Result**: Instead of running and confusing the agent, tests fail immediately with a clear error message.

### Step 2: Update Your Tests

**Option A - Via Frontend:**
1. Open each failing test in the UI
2. Find the "App URL" field (should be visible in the test editor)
3. Enter the application URL (e.g., `https://www.saucedemo.com`)
4. Save the test

**Option B - Via SQL:**
```sql
-- Check which tests are missing appUrl
SELECT id, name, app_url, created_date 
FROM tests 
WHERE app_url IS NULL OR app_url = ''
ORDER BY created_date DESC;

-- Update a specific test
UPDATE tests 
SET app_url = 'https://www.saucedemo.com',
    app_type = 'traditional-web'
WHERE id = 'your-test-id';

-- Or bulk update for a project
UPDATE tests 
SET app_url = 'https://your-app-url.com'
WHERE project_id = 'your-project-id' 
  AND (app_url IS NULL OR app_url = '');
```

**Option C - Script:**
```bash
cd backend
psql -U youraitester -d youraitester -f check-and-fix-appurl.sql
```

### Step 3: Verify

Run a test and check logs:

```bash
tail -f backend/backend.log | grep -E "(Loaded test|Auto-navigating)"
```

**You should see:**
```
Loaded test 'My Test' - appUrl: 'https://www.saucedemo.com', appType: 'traditional-web'
✓ Auto-navigating to app URL: https://www.saucedemo.com (required after session reset)
Successfully navigated to app URL
```

**If appUrl is missing:**
```
Loaded test 'My Test' - appUrl: 'null', appType: 'null'
❌ CRITICAL: No app URL configured for test 'My Test'!
❌ After removing --shared-browser-context, browser starts on about:blank
❌ ACTION REQUIRED: Edit this test and set the 'App URL' field
```

## Why This is Actually Better

### Before (Hidden Bug):
- Tests could "work" without appUrl by accident
- State leaked between tests
- Debugging was confusing
- Inconsistent behavior

### After (Explicit Requirements):
- Tests MUST have appUrl configured
- Each test starts cleanly
- Predictable behavior
- Clear error messages when misconfigured

## Copy Test Feature

When you copy a test, the appUrl IS copied:

```java
// TestController.java
copy.setAppUrl(original.getAppUrl());  // ✓ Copied
```

**So copied tests will work IF the original test had an appUrl set.**

If you copied a test that didn't have appUrl set (from before this fix), the copy also won't have it, and both will now fail with clear errors.

## Migration Path

If you have many old tests without appUrl:

```sql
-- Generate a report of tests needing update
SELECT 
    COUNT(*) as total_tests,
    COUNT(CASE WHEN app_url IS NULL OR app_url = '' THEN 1 END) as needs_url,
    COUNT(CASE WHEN app_url IS NOT NULL AND app_url != '' THEN 1 END) as has_url
FROM tests;

-- List tests by project that need updating
SELECT 
    p.name as project_name,
    t.name as test_name,
    t.id as test_id,
    t.created_date
FROM tests t
JOIN projects p ON t.project_id = p.id
WHERE t.app_url IS NULL OR t.app_url = ''
ORDER BY p.name, t.created_date DESC;

-- Bulk update by project (customize per project)
UPDATE tests 
SET app_url = 'https://project-specific-url.com',
    app_type = 'traditional-web'
WHERE project_id = (SELECT id FROM projects WHERE name = 'Project Name')
  AND (app_url IS NULL OR app_url = '');
```

## Summary

| Aspect | With `--shared-browser-context` | Without `--shared-browser-context` |
|--------|----------------------------------|-------------------------------------|
| Browser state | Shared (pages persist) | Isolated (fresh each session) |
| Session resets | Frequent (9+ per test) | Rare (0-3 per test) |
| Token usage | Very high (80K+) | Normal (20K) |
| Rate limits | Common | Rare |
| Tests without appUrl | "Work" by accident | Fail with clear error |
| Behavior | Unpredictable | Predictable |
| Debugging | Confusing | Clear |

## The Bottom Line

**This isn't a bug - it's a feature!**

Removing `--shared-browser-context` exposed that tests need proper `appUrl` configuration. This makes your test suite more robust and predictable.

**Action Required:**
1. Update tests to include `app_url`
2. Tests will now always start from a known state
3. Enjoy consistent, reliable test execution

## Related Documents

- `backend/MCP_SESSION_ARCHITECTURE_FIX.md` - Why we removed `--shared-browser-context`
- `backend/AUTO_NAVIGATION_FIX.md` - Auto-navigation logic details
- `backend/check-and-fix-appurl.sql` - Diagnostic and fix script


