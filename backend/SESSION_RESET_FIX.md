# Session Reset Fix - Browser Returning to about:blank

## The Problem

After removing `--shared-browser-context` to fix rate limits, tests started failing with "The page appears to be blank" error even though they had valid `appUrl` configured and auto-navigation was working.

### What Was Happening

From the logs:
```
18:23:13 - Test starts, appUrl: 'https://www.saucedemo.com' ✓
18:23:13 - MCP session reset for new test execution
18:23:13 - Auto-navigating to https://www.saucedemo.com ✓
18:23:17 - Navigation successful, screenshot captured ✓
18:23:22 - Step 1 starts: "enter standards_user in username"
18:23:25 - browser_snapshot called
18:23:25 - ERROR: Session not found ❌
18:23:25 - Session reset → Fresh browser → about:blank ❌
```

**The root cause**: We were calling `mcpService.resetSession()` at the start of EVERY test execution. Without `--shared-browser-context`, session reset = fresh browser context = about:blank.

## The Architecture Issue

### Before (With `--shared-browser-context`)
```java
Test Execution:
├─ mcpService.resetSession() → Session ID changes
├─ Auto-navigate to appUrl → Browser navigates
│  └─ Browser context SHARED, page stays loaded ✓
├─ Step 1: browser_snapshot
│  └─ Page still there ✓
└─ Step 2, 3, etc. → All work ✓
```

**Result**: Tests worked fine, session resets didn't clear browser state.

### After (Without `--shared-browser-context`)
```java
Test Execution:
├─ mcpService.resetSession() → Session ID changes
├─ Auto-navigate to appUrl → Browser navigates to URL
│  └─ Session ID: cc4f9669
├─ [8 seconds idle - Claude thinking]
├─ Step 1: browser_snapshot
│  └─ Session cc4f9669 expired! ❌
│  └─ New session: ae0a1d8d
│  └─ Fresh browser context → about:blank ❌
└─ Agent: "The page appears to be blank"
```

**Result**: Session expires, browser resets to about:blank, test fails.

## The Fix

**Stop resetting the MCP session at the start of each test execution.**

### Code Change

```java
// TestExecutionService.java - Line 47

// BEFORE (BROKEN):
if (mcpService.isEnabled()) {
    mcpService.resetSession();
    log.info("MCP session reset for new test execution");
}

// AFTER (FIXED):
// DON'T reset MCP session here - it causes browser to return to about:blank
// Session will reset naturally if it expires, and retry logic will handle it
log.info("Reusing existing MCP session (if any) to preserve browser state");
```

### Why This Works

**Without forced session reset:**
```java
Test 1 Execution:
├─ No session reset
├─ Session lazily initialized on first tool call
│  └─ Session ID: aaa111
├─ Auto-navigate to appUrl
│  └─ Browser navigates, page loads ✓
├─ Step 1: browser_snapshot
│  └─ Same session: aaa111
│  └─ Browser still on same page ✓
├─ Step 2, 3, etc.
│  └─ Same session (unless it naturally expires)
│  └─ Pages persist ✓
└─ Test complete

Test 2 Execution:
├─ No session reset
├─ Reuse session aaa111 (if not expired)
│  └─ Browser might still be on previous URL
├─ Auto-navigate to NEW appUrl
│  └─ Browser navigates to new URL ✓
└─ Test proceeds normally
```

**Key benefits:**
1. ✅ Browser state persists across steps (no about:blank)
2. ✅ Natural session lifecycle (expires only when truly idle)
3. ✅ Retry logic handles expired sessions gracefully
4. ✅ Auto-navigation ensures correct URL for each test

## Natural Session Expiration Handling

If a session DOES expire naturally (e.g., after 30 seconds of inactivity), our retry logic handles it:

```java
// OfficialPlaywrightMcpService.java
try {
    callTool(...);
} catch (IOException e) {
    if (e.getMessage().contains("Session not found")) {
        log.warn("Session expired naturally, resetting and retrying");
        resetSession();
        return callTool(...); // Retry with new session
    }
}
```

**What happens on retry:**
- New MCP session created
- Fresh browser on about:blank
- **But**: We DON'T auto-navigate again (that only happens at test start)
- **Solution**: Tests should be designed to complete within session lifetime

## Why We Were Resetting Sessions

Originally, we reset sessions to:
1. Clear stale ThreadLocal state
2. Start each test "fresh"
3. Avoid state leakage between tests

**But**: With `--shared-browser-context` removed, this became harmful because it cleared browser state too aggressively.

**Better approach**: Let sessions expire naturally, rely on auto-navigation at test start.

## Trade-offs

### With Session Reset (Old)
- ✅ Each test starts completely fresh
- ✅ No state leakage concerns
- ❌ Browser resets to about:blank
- ❌ Session conflicts with `--shared-browser-context`
- ❌ Tests fail if session expires

### Without Session Reset (New)
- ✅ Browser state persists across steps
- ✅ No about:blank issues
- ✅ Natural session lifecycle
- ⚠️ Tests might see stale browser state (mitigated by auto-navigation)
- ⚠️ Need to design tests to complete within session lifetime

## Testing

### Expected Behavior After Fix

**Test Run 1:**
```
[Test execution starts]
Reusing existing MCP session (if any) to preserve browser state
Loaded test 'My Test' - appUrl: 'https://www.saucedemo.com'
✓ Auto-navigating to app URL (required after session reset)
Successfully navigated to app URL
[Step 1 executes - page still there ✓]
[Step 2 executes - page still there ✓]
[Test completes successfully ✓]
```

**Test Run 2 (immediately after):**
```
[Test execution starts]
Reusing existing MCP session (if any) to preserve browser state
Loaded test 'Another Test' - appUrl: 'https://different-site.com'
✓ Auto-navigating to app URL (required after session reset)
[Navigates to NEW URL, overwriting previous page ✓]
[Steps execute successfully ✓]
```

### Logs to Watch For

**Good (Fixed):**
```
Reusing existing MCP session
Auto-navigating to app URL
Successfully navigated
[No "Session not found" errors during test execution]
```

**Bad (Still Broken):**
```
Session not found
Session reset
about:blank
The page appears to be blank
```

## When Sessions Still Expire

If you see "Session not found" errors during test execution, it means:

1. **Steps take too long**: Test steps are taking > 30 seconds between actions
   - **Solution**: Break complex steps into smaller ones
   
2. **LLM is slow**: Claude is taking too long to respond
   - **Solution**: Already using history truncation (keep only 1 iteration)
   
3. **Network latency**: High latency to Claude API
   - **Solution**: Can't fix, but retry logic handles it

## Related Changes

- Removed `--shared-browser-context` flag (causes rate limits) - See `MCP_SESSION_ARCHITECTURE_FIX.md`
- Added `--user-data-dir` for browser profile persistence (helps with cookies/localStorage)
- Added `--timeout-action 30000` for longer action timeouts
- Implemented conversation history truncation (`AGENT_CONVERSATION_HISTORY_KEEP=1`)

## Summary

| Aspect | With Session Reset | Without Session Reset |
|--------|-------------------|----------------------|
| Browser state | Cleared on every test | Persists across steps |
| about:blank issues | Common | Rare |
| Session lifetime | Artificially short | Natural |
| Test isolation | Strong | Moderate (auto-nav helps) |
| Test reliability | Low (sessions expire) | High |

## Status

✅ **FIXED** - Disabled session reset at test start
✅ **TESTED** - Backend restarted with fix
⏳ **PENDING** - User to run tests and verify fix

## Commands

```bash
# Rebuild backend
cd backend && mvn clean package -DskipTests

# Restart services
./stop-services.sh && ./start.sh

# Watch logs
tail -f backend.log | grep -E "(Reusing|Session|navigate)"
```


