# Final Session Management Solution

## The Core Problem

The MCP server has an **unconfigurable session idle timeout of ~5-8 seconds**. This cannot be changed via any flag.

### Timeline of Issue

```
18:26:18 - Navigation completes to saucedemo.com ✓
18:26:23 - Auto-navigation successful ✓  
18:26:23 - Step 1 starts
18:26:26 - browser_snapshot called (3 seconds later)
18:26:26 - ERROR: Session not found (session expired after 8 seconds idle)
18:26:26 - New session created → about:blank ❌
```

**Without `--shared-browser-context`**: Session reset = new browser context = about:blank

## Attempted Solutions That Didn't Work

### ❌ Attempt 1: Increase `--timeout-action`
```bash
--timeout-action 30000  # 30 seconds
```
**Result**: Doesn't help. This only controls how long an ACTION can run, not session IDLE timeout.

### ❌ Attempt 2: Remove explicit session reset at test start
```java
// Commented out:
// mcpService.resetSession();
```
**Result**: Doesn't help. Sessions still expire naturally after 5-8 seconds of inactivity.

### ❌ Attempt 3: Use `--user-data-dir` alone
```bash
--user-data-dir "/tmp/playwright-mcp-userdata"
```
**Result**: Doesn't help. This persists cookies/localStorage, but NOT browser pages across session resets.

## The Only Solution: `--shared-browser-context`

```bash
--shared-browser-context  # ← THIS IS REQUIRED!
```

**What it does**: Browser context (pages, state) is shared across MCP sessions. When a session expires and a new one is created, the browser page is STILL THERE.

### Why We Initially Removed It

We removed it because tests were experiencing massive session resets (9+ per test) and rate limits. 

**But**: Those session resets were caused by us explicitly calling `mcpService.resetSession()` at the start of every test, NOT by the flag itself.

### The Winning Combination

```bash
# start.sh
--shared-browser-context  # ← Keep browser state across session resets
--user-data-dir "$USER_DATA_DIR"  # ← Persist cookies/localStorage

# TestExecutionService.java
// DON'T call mcpService.resetSession() at test start
// Let sessions expire naturally
```

## How It Works Now

```
Test Execution:
├─ No explicit session reset
├─ Session lazily initialized (Session A)
├─ Auto-navigate to https://www.saucedemo.com
│  └─ Browser navigates, page loads ✓
├─ [8 seconds idle - Claude thinking]
├─ Session A expires (natural idle timeout)
├─ Step 1: browser_snapshot
│  └─ Session A not found
│  └─ Create new Session B
│  └─ BUT: --shared-browser-context keeps page alive! ✓
│  └─ Page URL: https://www.saucedemo.com (NOT about:blank!) ✓
├─ Step 2, 3, etc.
│  └─ Sessions may reset, but page persists ✓
└─ Test completes successfully ✓
```

## Expected Behavior

### With This Solution
```
[Test starts]
Reusing existing MCP session (if any)
Auto-navigating to https://www.saucedemo.com
Successfully navigated ✓
[Step 1] Session expired, new session created
         BUT browser still on saucedemo.com ✓
[Step 2] Session still valid or reset again
         Page still there ✓
[Test completes] ✓
```

### Logs You'll See
```
Session not found  ← Normal! Sessions expire frequently
Resetting MCP session  ← Normal! Automatic retry
browser_snapshot → Page URL: https://www.saucedemo.com ✓  ← Good!
```

**The key**: Even with frequent session resets, the page URL should NEVER be `about:blank` (except during initial navigation).

## Why This Doesn't Cause Rate Limits Anymore

**Before (with explicit reset):**
- We called `mcpService.resetSession()` at test start
- This forced a reset even if session was valid
- Combined with natural expirations → many resets per test
- Many resets = many re-navigations = massive tokens

**Now (without explicit reset):**
- Sessions reset only when they naturally expire
- `--shared-browser-context` keeps pages alive
- No redundant navigations
- Reasonable token usage

## Trade-offs

| Aspect | Without --shared-browser-context | With --shared-browser-context |
|--------|----------------------------------|-------------------------------|
| Browser state | Lost on session reset | Persists across resets ✓ |
| about:blank issues | Frequent ❌ | Rare ✓ |
| Test reliability | Low | High ✓ |
| Token usage | High (re-navigations) | Normal ✓ |
| State isolation | Complete | Moderate (mitigated by auto-nav) |

## Configuration Summary

### MCP Server Flags (`start.sh`)
```bash
npx @playwright/mcp \
  --port 8931 \
  --headless \
  --browser chrome \
  --shared-browser-context \         # ← CRITICAL!
  --user-data-dir "$USER_DATA_DIR" \  # ← For cookies/localStorage
  --viewport-size 1920x1080 \
  --timeout-action 30000 \            # ← For long-running actions
  --timeout-navigation 60000          # ← For slow page loads
```

### Backend Configuration
```java
// TestExecutionService.java
public void executeTest(...) {
    // DON'T reset session here!
    // Sessions will reset naturally, retry logic handles it
    log.info("Reusing existing MCP session (if any) to preserve browser state");
    
    // ... rest of test execution
}
```

### Environment Variables (`.env`)
```bash
AGENT_CONVERSATION_HISTORY_KEEP=1  # Keep only last iteration
MCP_ACTION_TIMEOUT=30000           # 30 seconds for actions
MCP_BROWSER=chrome
```

## Testing

```bash
# Run a test and watch for:
tail -f backend.log | grep -E "(Session|about:blank|Page URL)"
```

**Good signs:**
```
Session not found  ← OK (natural expiration)
Resetting MCP session  ← OK (automatic retry)
Page URL: https://www.saucedemo.com  ← GOOD!
```

**Bad signs:**
```
Page URL: about:blank  ← BAD! (means shared-browser-context not working)
```

## Status

✅ **`--shared-browser-context` re-enabled**
✅ **No explicit session resets in code**
✅ **Services restarted with fix**
⏳ **User to test**

## If Tests Still Fail

If you still see `about:blank` errors:

1. **Check MCP server is running with `--shared-browser-context`:**
   ```bash
   ps aux | grep "@playwright/mcp" | grep -v grep
   ```
   Should show: `--shared-browser-context`

2. **Check browser state directory exists:**
   ```bash
   ls -la /tmp/playwright-mcp-userdata/
   ```

3. **Restart everything from scratch:**
   ```bash
   cd backend
   ./stop-services.sh
   rm -rf /tmp/playwright-mcp-userdata/
   ./start.sh
   ```

## Related Documents

- `MCP_SESSION_ARCHITECTURE_FIX.md` - Initial attempt to fix by removing `--shared-browser-context` (didn't work long-term)
- `SESSION_RESET_FIX.md` - Removed explicit session resets (helped but not enough)
- `ABOUT_BLANK_ISSUE_EXPLAINED.md` - Why tests were suddenly failing after removing `--shared-browser-context`
- `FINAL_SESSION_SOLUTION.md` - This document (the final solution)

## Conclusion

**The MCP server's session idle timeout is too aggressive and cannot be configured.** The only way to handle it is with `--shared-browser-context`, which keeps browser pages alive even when sessions expire and get recreated.

This is the correct architecture and should have been the solution from the start.


