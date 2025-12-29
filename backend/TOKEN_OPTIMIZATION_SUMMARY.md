# Token Usage Optimization - Summary

## Problem Analysis

Your 4-step test was consuming **~30,000 tokens/minute** and hitting Claude API rate limits due to:

1. **Frequent Session Expiration**: MCP server has hard-coded 5-second idle timeout
2. **Excessive browser_snapshot calls**: 7 snapshots for a 4-step test
3. **Large Accessibility Trees**: Each snapshot = 27,000 chars sent to Claude
4. **Total Token Waste**: 7 × 27KB = ~189,000 chars input = ~30K+ tokens

### Session Reset Timeline (from your logs)
```
Session 1: 011a148c (navigation)
Session 2: c3626f41 (step 1 - expires after 3.5s)
Session 3: a8edb7ca (step 1 - expires after 5s) 
Session 4: 3d093224 (step 2 - expires after 6s)
Session 5: cbfb3cb5 (step 2 completes)
Session 6: b6c4fe9d (step 3 - expires after 5s)
Session 7: 26f9ee5a (step 3 completes)
Session 8: (step 4 - would have expired, hit rate limit first)
```

**Root Cause**: The MCP server's `--shared-browser-context` flag doesn't prevent session expiration, it only keeps the browser page alive. Each new session still requires a fresh snapshot.

## Solutions Implemented

### 1. **Aggressive Snapshot Truncation** ✅
**File**: `backend/src/main/java/com/youraitester/agent/McpToolExecutor.java`

**Before**: Sent full 27,000 char accessibility trees to Claude
**After**: Truncated to first 5,000 chars with explanatory message

```java
// Only keep first 5000 chars of snapshot to reduce token usage
if (content.length() > 5000) {
    content = content.substring(0, 5000) + 
        "\n\n[Snapshot truncated to save tokens - showing first 5000 of " + 
        content.length() + " chars. Focus on visible interactive elements.]";
}
```

**Impact**: ~80% reduction in snapshot token usage (5K vs 27K chars)

### 2. **Reduced Token Limits in AgentExecutor** ✅
**File**: `backend/src/main/java/com/youraitester/agent/AgentExecutor.java`

**Before**: `maxGetContentChars = 50,000`
**After**: `maxGetContentChars = 8,000`

**Reasoning**: Snapshots are already pre-truncated to 5K, so the 50K limit was unnecessary

### 3. **Optimized System Prompt** ✅
**File**: `backend/agent-prompt-categories-mcp.json`

**Added instructions to Claude**:
- Minimize unnecessary snapshots between simple actions
- Reuse ref tokens from a single snapshot when filling multiple fields
- Only re-snapshot when: (1) navigating to new page, (2) page structure changes, (3) verification needed

**New guidance**:
```
OPTIMIZE TOKEN USAGE: After receiving a snapshot, if you're doing multiple 
simple actions (type, click) on the same page, you can often skip 
re-snapshotting between actions. Only snapshot again if: 
(1) You navigated to a new page
(2) The page structure likely changed (e.g., after clicking a dropdown)
(3) You need to verify a change occurred

Reuse ref tokens efficiently - If filling multiple fields on the same form, 
you can extract all refs from one snapshot and use them in sequence
```

## Expected Results

### Token Usage Reduction
**Before**:
- 7 snapshots × 27,000 chars = 189,000 chars
- Plus screenshots, conversation history
- **Total**: ~30,000+ tokens/minute → **Rate limit hit**

**After** (estimated):
- 2-3 snapshots × 5,000 chars = 10,000-15,000 chars
- Same screenshots and history
- **Total**: ~8,000-12,000 tokens/minute → **Within limits**

### Performance Improvements
1. **60-70% fewer snapshots**: Claude instructed to reuse ref tokens
2. **80% smaller snapshots**: 5K vs 27K chars each
3. **4-5x overall token reduction**: 30K → 6-8K tokens/minute

## How to Test

Run your 4-step test again:

```bash
# The test that was failing before:
# 1. Navigate to https://testautomationpractice.blogspot.com
# 2. Enter tom in name
# 3. Enter tom@gmail.com in email
# 4. Enter 876-876-0099 in phone
```

**Expected behavior**:
- Step 1: Snapshot + navigate (normal)
- Step 2: Should reuse refs from step 1 navigation snapshot (no new snapshot needed)
- Step 3: Should reuse refs (no new snapshot needed)
- Step 4: Should reuse refs (no new snapshot needed)

**Only 1-2 snapshots total** instead of 7!

## Monitoring

Watch the logs for these key indicators:

```bash
tail -f backend/backend.log | grep -E "Truncated|snapshot|Token|rate_limit"
```

**Good signs**:
- "Truncated tool response (tool=browser_snapshot) from 27000 chars to 5000 chars"
- Fewer "browser_snapshot" log entries per test
- No "rate_limit_error" messages

**If still hitting limits**:
- Further reduce `maxGetContentChars` to 5000 in AgentExecutor
- Reduce snapshot truncation to 3000 chars
- Add explicit snapshot caching logic

## Fallback Options

If you're still hitting rate limits after these changes:

### Option A: Add Explicit Snapshot Caching
Store the last snapshot and only send it once, then send lightweight "page context" summaries

### Option B: Use OpenAI Instead
OpenAI has higher rate limits (150K tokens/minute vs Claude's 30K)

### Option C: Increase MCP Timeout
Try to modify MCP server source to increase idle timeout (would require forking @playwright/mcp)

### Option D: Pre-extract Refs
Before running test, snapshot once and extract all needed refs, then inject them directly

## Files Modified
1. `backend/src/main/java/com/youraitester/agent/McpToolExecutor.java` - Snapshot truncation
2. `backend/src/main/java/com/youraitester/agent/AgentExecutor.java` - Reduced token limits
3. `backend/agent-prompt-categories-mcp.json` - Optimized system prompt
4. `backend/TOKEN_OPTIMIZATION_SUMMARY.md` - This file

## Next Steps
1. ✅ Changes implemented
2. ✅ Code compiled and services restarted
3. ⏳ **YOU**: Run your 4-step test and verify token reduction
4. Monitor logs to confirm optimizations are working
5. If still hitting limits, implement fallback options above


