# Counting Verification Fix + Hardcoded Selector Removal

## Problem 1: Counting Verification Incorrectly Passing
The counting verification step was incorrectly passing when it should fail:
- Instruction: "verify there are a total of 10 products shown on the page"
- Actual result: Only 6 products exist on the page
- Expected: Step should **FAIL**
- Actual: Step was **PASSING** ❌

## Problem 2: Hardcoded Selectors in Prompt Examples
The prompt examples contained hardcoded selectors like:
- `class="product-item"`
- `class="inventory_item"`
- `.product-price`
- `div.product-card`

This could cause the LLM to use these selectors on **different websites** where they don't exist, leading to failures.

## Root Causes

### 1. Agent Not Completing the Counting Task
The agent was calling `getContent()` to fetch the HTML but then immediately finishing without:
- Actually counting the elements in the HTML
- Comparing the count to the expected value
- Reporting the verification result (PASS/FAIL)

**Logs showed only 2 iterations:**
```
Iteration 1: Called getContent()
Iteration 2: Task complete (without counting or reporting!)
```

### 2. TestExecutionService Only Checking Tool Success
The `TestExecutionService` was only checking if tools (like `getContent()`) executed successfully, not whether the **agent reported a verification failure** in its final message.

**Current logic:**
- `getContent()` succeeds → Tool succeeded → Step marked as PASSED ✅ (wrong!)
- Agent's message saying "Expected 10 but found 6" → **IGNORED** ❌

### 3. Hardcoded Selectors in Examples
Prompt examples used actual selector names from specific websites, which could mislead the LLM to use them universally.

## Solutions

### Solution 1: Enhanced Counting Instructions
Updated `agent-prompt-categories.json` to make the counting instructions much more explicit:

**Key additions:**
1. **"YOU MUST COUNT THE ELEMENTS YOURSELF AND REPORT THE RESULT!"** - Makes it clear counting is mandatory
2. **Step-by-step instructions with concrete examples**:
   - Extract selector from ACTUAL HTML
   - Count occurrences manually (e.g., "found 6 occurrences")
   - Compare to expected (e.g., "Expected 10, Found 6 → MISMATCH!")
   - Explicitly report: "FAILED: Expected 10 but found 6"
3. **Multiple examples** showing both passing and failing scenarios
4. **Clear warnings**: "Don't just call getContent() and finish - you must COUNT and REPORT!"

### Solution 2: TestExecutionService Checks Agent's Message
Updated `TestExecutionService.executeStepWithAI()` to check the agent's final message for failure indicators.

**New logic:**
1. Check tool execution success (existing)
2. **NEW:** Check agent's message for failure keywords:
   - "failed"
   - "not found"
   - "expected X but found Y"
   - "mismatch"
   - "incorrect"
   - "does not match"
   - "verification failed"
3. If agent reported failure → Mark step as **FAILED** even if tools succeeded
4. If agent didn't report failure AND tools succeeded → Mark as **PASSED**

**Example:**
```java
// Agent's message: "FAILED: Expected 10 products but found 6"
// agentReportedFailure = true
// Step status = "failed" ✅
```

### Solution 3: Replaced Hardcoded Selectors with Placeholders
Updated ALL categories in `agent-prompt-categories.json` to use generic placeholders instead of real selectors:

**Categories updated:**
1. **counting**: Changed `<div class="product-item">` → `<div class="[actual-product-class]">`
2. **item_properties**: Changed `div.product-card .product-price` → `[item-container-from-HTML] [property-element-from-HTML]`
3. **css_selectors**: Changed `div.class1 + div.class2` → `div.[class1] + div.[class2]`
4. **sorting**: Changed `.product-price` → `[actual-price-selector-from-HTML]`

**Added explicit warnings in each category:**
- "Examples above use PLACEHOLDERS - you MUST replace with real selectors from getContent()!"
- "NEVER use example selectors unless they actually exist in the HTML!"
- "EVERY website has different HTML structure - you MUST examine actual HTML from getContent()!"
- "Use the ACTUAL class/id from getContent() HTML, NOT these examples!"

## Files Modified

1. **`/Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend/agent-prompt-categories.json`**
   - Enhanced counting instructions with explicit steps and warnings
   - Replaced all hardcoded selectors with placeholders in brackets: `[actual-class]`, `[item-container]`, etc.
   - Added warnings in all categories to use actual selectors from HTML

2. **`/Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend/src/main/java/com/youraitester/service/TestExecutionService.java`**
   - Added agent message analysis for failure indicators
   - Logic now checks both tool execution AND agent's reported result

## Testing the Fix

### Before Fix:
```
Instruction: verify there are a total of 10 products shown on the page
Agent: Calls getContent(), sees 6 products, finishes
Result: PASSED ❌ (wrong!)
```

### After Fix:
```
Instruction: verify there are a total of 10 products shown on the page
Agent: 
  1. Calls getContent()
  2. Extracts selector from ACTUAL HTML: div.inventory_item
  3. Counts elements: Found 6 occurrences
  4. Compares: Expected 10, Found 6 → MISMATCH
  5. Reports: "FAILED: Expected 10 products but found 6 products (counted 6 elements matching div.inventory_item)"
TestExecutionService:
  1. Sees agent message contains "FAILED" and "Expected...but found"
  2. Sets agentReportedFailure = true
  3. Marks step as FAILED ✅
Result: FAILED ✅ (correct!)
```

### Hardcoded Selector Prevention:
```
Before:
- Example shows: "See <div class="product-item">"
- Agent on different site: Tries to use "product-item" class → FAILS ❌

After:
- Example shows: "See <div class="[actual-product-class]">"
- Explicit warning: "Use ACTUAL class from getContent() HTML!"
- Agent: Examines actual HTML, finds "inventory_item" class → SUCCESS ✅
```

## Benefits

1. **Correct verification results**: Counting steps now accurately reflect actual vs expected counts
2. **Explicit failure reporting**: Agent clearly states what was expected vs what was found
3. **Better debugging**: Agent's message explains why verification failed
4. **Robust detection**: TestExecutionService checks both tool execution AND agent's analysis
5. **Future-proof**: Works for all verification types (counts, sorting, properties, etc.)
6. **No hardcoded selectors**: All examples use placeholders, preventing cross-site selector pollution
7. **Universal applicability**: Agent will examine actual HTML on every site, not assume selector names

## Impact on Token Usage

The enhanced prompts are slightly longer due to:
- More explicit instructions
- Placeholder warnings
- Multiple examples

However, these are still only loaded when relevant keywords are present. Token usage remains efficient:

```
Dynamic prompt categories: [counting, core, item_properties, css_selectors, verification]
Estimated tokens: 2867 (vs 8000+ before) ✅
System prompt length: 4276 characters (vs 24769+ before) ✅
Token reduction: ~65% ✅
```

## Summary of Placeholder Format

All examples now use this format:
- `[actual-class]` - Must be replaced with class from HTML
- `[item-container]` - Must be replaced with container element
- `[property-element]` - Must be replaced with property element
- `[ACTUAL-selector-from-HTML]` - Generic reminder to use real selectors

Every category that shows selectors includes warnings like:
> **CRITICAL:** Examples use PLACEHOLDERS - you MUST replace with real selectors from getContent()!


