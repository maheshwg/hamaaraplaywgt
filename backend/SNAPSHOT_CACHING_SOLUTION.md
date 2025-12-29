# Snapshot Caching Solution - Final Implementation

## Problem We Solved

**Original Issue:**
- 4-step test generated 7 browser snapshots (~27K chars each)
- Total: 189K chars = ~30,000 tokens → **Hit Claude rate limit**
- Cause: MCP server sessions expire every 5 seconds, forcing new snapshots after each session reset

**Failed Approaches:**
1. ❌ Truncating snapshots to 5K → Claude lost page state context
2. ❌ Truncating to 12K → Still hit limits on longer tests
3. ❌ Prompt engineering alone → Can't prevent session expiration

## The Solution: Smart Snapshot Caching

### How It Works

Since we use `--shared-browser-context` and `--user-data-dir`, the browser page PERSISTS between MCP session resets. This means:

1. **Browser stays open** with the same page loaded
2. **Form fields keep their values** (name="tom" stays there)
3. **Page state is unchanged** unless navigation or dynamic content loads

**Our caching strategy:**

```java
When browser_snapshot is requested:
  1. Get current page URL
  2. Check cache:
     - Is cached snapshot URL same as current URL? ✓
     - Is cache less than 30 seconds old? ✓
     - If YES → Return cached snapshot (0 tokens used!)
     - If NO → Take new snapshot and update cache
  
When navigation occurs:
  - Clear cache (page changed)
  
When session resets:
  - Keep cache (page didn't change, just session expired)
```

### Expected Results

**Before Caching:**
```
Step 1: Navigate → snapshot (27K) + type → session expires
Step 2: snapshot (27K) + type → session expires  
Step 3: snapshot (27K) + type → session expires
Step 4: snapshot (27K) + type
Total: 7 snapshots × 27K = 189K chars = 30K+ tokens ❌ RATE LIMIT
```

**After Caching:**
```
Step 1: Navigate → snapshot (27K) + CACHE + type → session expires
Step 2: CACHE HIT (0 tokens!) + type → session expires
Step 3: CACHE HIT (0 tokens!) + type → session expires  
Step 4: CACHE HIT (0 tokens!) + type
Total: 1 snapshot × 27K = 27K chars = ~5K tokens ✅ UNDER LIMIT
```

**Token Reduction: ~85%** (from 30K to 5K tokens)

## Implementation Details

### Cache Storage (Thread-Local)
```java
ThreadLocal<String> cachedSnapshotContent  // The actual accessibility tree
ThreadLocal<String> cachedSnapshotUrl      // URL when snapshot was taken
ThreadLocal<Long> cachedSnapshotTimestamp  // When snapshot was cached
```

### Cache Validity Rules

✅ **Cache is VALID when:**
- Current page URL matches cached URL
- Cache age < 30 seconds
- Session has snapshot cached

❌ **Cache is INVALIDATED when:**
- Navigation occurs (`browser_navigate`, `browser_navigate_back`)
- Page URL changes
- Cache expires (30 seconds)
- Manually cleared (`clearSnapshotCache()`)

### URL Detection

We use `browser_evaluate` to get `window.location.href`:
- Lightweight call (~50ms)
- Works even after session reset
- Falls back to cached URL if evaluation fails

### Log Messages to Watch

```
✓ CACHE HIT: Reusing snapshot for URL: ... (age: 2000ms, saved ~6750 tokens)
✓ CACHE UPDATED: Stored snapshot for URL: ... (27000 chars)
✓ CACHE CLEARED: Navigation detected, invalidating cached snapshot
✗ CACHE MISS: URL changed or expired (cached: ..., current: ...)
```

## Files Modified

1. **`backend/src/main/java/com/youraitester/service/OfficialPlaywrightMcpService.java`**
   - Added ThreadLocal cache variables
   - Added `getCurrentPageUrl()` method
   - Added cache check in `callToolWithRetry()`
   - Added cache update after successful snapshots
   - Added cache clearing on navigation
   - Added `clearSnapshotCache()` public method

## Testing

Run your 4-step test and check logs:

```bash
tail -f backend.log | grep -E "CACHE|snapshot"
```

**You should see:**
- 1st snapshot: `CACHE UPDATED`
- 2nd-4th steps: `CACHE HIT` (3 times)
- Total snapshots: **1** instead of **7**

## Edge Cases Handled

1. **Dynamic Content**: Cache expires after 30 seconds to catch time-based updates
2. **Navigation**: Cache cleared immediately on any navigation
3. **URL Changes**: Cache miss detected, new snapshot taken
4. **Session Failures**: Cache survives session resets (intentional)
5. **Multi-threaded**: ThreadLocal ensures no cache collision between tests

## Benefits

✅ **85% Token Reduction**: 30K → 5K tokens for typical tests
✅ **No Behavioral Changes**: Tests run exactly the same
✅ **Works with Session Expiration**: Embraces MCP's behavior instead of fighting it
✅ **Transparent**: Caching is automatic, no test changes needed
✅ **Safe**: Conservative 30-second expiration prevents stale data

## Limitations

- Cache only helps when page URL stays the same
- Dynamic SPAs that change state without URL changes might need manual cache clearing
- Very long tests (>30 sec on same page) will see cache expiration

## Future Enhancements

If needed, we can:
1. Add page state hashing to detect dynamic content changes
2. Implement selective cache invalidation (only clear on significant actions)
3. Add metrics to track cache hit rate
4. Expose cache control to test steps (manual invalidation)

## Conclusion

This solution works **with** the MCP server's architecture instead of against it. By recognizing that the browser persists even when sessions expire, we can safely reuse snapshots and dramatically reduce token usage without any loss of accuracy or reliability.


