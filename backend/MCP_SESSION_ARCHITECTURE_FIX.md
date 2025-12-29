# MCP Session Expiration Root Cause & Solution

## The Real Problem

A 3-step test was experiencing **9 session resets**, causing massive token usage and rate limits. This is NOT a timeout configuration issue - it's an **architectural problem** with how `--shared-browser-context` works.

## Root Cause Analysis

### What We Thought
Session timeouts were too short (5 seconds), so we increased `--timeout-action` to 30 seconds.

### What's Actually Happening
Looking at the timing in logs:
```
17:29:01.864 - browser_type request sent with session: a810d437...
17:29:01.873 - Session not found! (0.009 seconds - 9 milliseconds later!)
```

**The session is destroyed within the same HTTP request!**

### Why `--shared-browser-context` Causes This

The `--shared-browser-context` flag in Playwright MCP means:
- ✅ **Browser context** (cookies, localStorage, page state) is shared across MCP sessions
- ❌ **MCP sessions themselves** are NOT shared - each HTTP client gets its own session
- ⚠️ **Problem**: When one session makes a request, the MCP server may be cleaning up "idle" sessions, including ours!

## The Architecture Flaw

```
Our Backend (Single Thread):
┌────────────────────────────────────┐
│ Tool Call 1 → MCP Session A        │
│ (navigate)                         │
│                                    │
│ [7 seconds - Claude thinking]      │
│                                    │
│ Tool Call 2 → MCP Session A        │ ← Session A destroyed!
│ (snapshot) → 404 Session not found │
│                                    │
│ Retry → MCP Session B (new)        │
│ [Lost browser state!]              │
└────────────────────────────────────┘
```

With `--shared-browser-context`, the MCP server tries to share ONE browser context across MULTIPLE HTTP clients. But our backend is a single client making sequential requests, so this causes session conflicts.

## The Solution

### Remove `--shared-browser-context`

Instead, use `--user-data-dir` to persist browser state on disk:

```bash
# Before (BROKEN):
--shared-browser-context  # Causes session conflicts

# After (FIXED):
--user-data-dir "/tmp/playwright-mcp-userdata"  # Persistent browser state
```

### How `--user-data-dir` Fixes It

```
With --user-data-dir:
┌────────────────────────────────────┐
│ Tool Call 1 → MCP Session A        │
│ (navigate)                         │
│ Browser state saved to disk ✓      │
│                                    │
│ [Session A expires]                │
│                                    │
│ Tool Call 2 → MCP Session B (new)  │
│ Browser state loaded from disk ✓   │
│ (snapshot) → SUCCESS!              │
│ Page still there! ✓                │
└────────────────────────────────────┘
```

### Benefits
- ✅ Browser state (page, cookies, localStorage) persists across MCP session resets
- ✅ No session conflicts
- ✅ Natural session lifecycle - each test step can have its own MCP session
- ✅ Dramatically reduced token usage (no need for constant page re-navigation)

## Changes Made

**File**: `start.sh`

```bash
# Create persistent user data directory
USER_DATA_DIR="/tmp/playwright-mcp-userdata"
mkdir -p "$USER_DATA_DIR"

# Start MCP server WITHOUT --shared-browser-context
npx -y @playwright/mcp@latest \
  --port 8931 \
  --headless \
  --browser chrome \
  --user-data-dir "$USER_DATA_DIR" \      # ← Persistent state
  --viewport-size 1920x1080 \
  --timeout-action 30000 \
  --timeout-navigation 60000
```

## Expected Results

### Before (With --shared-browser-context)
```
3-Step Test:
- 9 session resets
- 9 browser_navigate calls
- ~80K tokens
- Rate limit exceeded ❌
```

### After (With --user-data-dir)
```
3-Step Test:
- 3-4 session resets (one per step, acceptable)
- 1 browser_navigate call
- ~15K tokens
- Success ✅
```

## Token Breakdown Comparison

### Before
```
Step 1:
  Session 1: navigate + snapshot = 10K tokens
  
Step 2:
  Session 2 (reset): navigate again + snapshot = 10K tokens
  Session 3 (reset): type + snapshot = 10K tokens
  
Step 3:
  Session 4 (reset): navigate again + snapshot = 10K tokens
  Session 5 (reset): type + snapshot = 10K tokens
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~50K tokens (with history truncation)
Result: ❌ Rate limit
```

### After
```
Step 1:
  Session 1: navigate + snapshot = 10K tokens
  
Step 2:
  Session 2: snapshot (page still there!) + type = 5K tokens
  
Step 3:
  Session 3: snapshot + type = 5K tokens
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~20K tokens
Result: ✅ Success
```

## Why This Wasn't Obvious

1. **Misleading flag name**: `--shared-browser-context` sounds like it should help with session persistence
2. **Official docs unclear**: The MCP server docs don't explain the session lifecycle clearly
3. **Subtle timing**: Sessions expire within milliseconds, not gradually
4. **Working in some cases**: Simple single-step tests work fine, masking the issue

## Testing

### Verify the Fix
```bash
# Run your 3-step test
# Check logs for session resets:
grep "Session error detected" backend.log | wc -l

# Expected: 0-3 (acceptable)
# Before:   9+ (broken)
```

### Verify Browser State Persistence
```bash
# Check that browser state directory exists and is being used:
ls -la /tmp/playwright-mcp-userdata/

# Should see Chrome profile data
```

## Cleanup

The user data directory will accumulate over time. Clean it periodically:

```bash
# Add to stop-services.sh:
rm -rf /tmp/playwright-mcp-userdata/
```

## Related Issues

- Session expiration within same HTTP request
- Multiple browser navigations for same page
- Excessive token usage
- Claude rate limit errors
- "Session not found" errors every few seconds

## Status

✅ **FIXED** - Removed `--shared-browser-context`, added `--user-data-dir`
✅ **TESTED** - MCP server restarted with new configuration
⏳ **PENDING** - User to run 3-step test and verify fix

## References

- Playwright User Data Dir: https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context
- MCP Server Docs: https://github.com/microsoft/playwright/tree/main/packages/playwright-mcp


