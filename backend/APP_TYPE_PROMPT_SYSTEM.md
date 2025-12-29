# App-Type Specific Prompt System Implementation Guide

## Changes Made:

### 1. Test Entity - Added Fields
- `appUrl` (String): The URL of the application being tested
- `appType` (String): The type of application (e.g., "react-spa", "ecommerce", "admin-dashboard")

### 2. Prompt JSON Structure - Enhanced
Added `app_types` section with app-specific rules:
- `react-spa`: React-specific patterns and behaviors
- `angular-spa`: Angular-specific patterns  
- `ecommerce`: E-commerce common patterns
- `admin-dashboard`: Admin/dashboard patterns
- `form-heavy`: Form-heavy application patterns

### 3. Backend Changes Needed:

#### A. AgentExecutor.java
1. Add `appType` parameter to `execute()` method
2. Modify `buildDynamicPrompt()` to load app-type-specific rules
3. Add method to load app_types from JSON

#### B. TestExecutionService.java
1. Auto-navigate to `test.getAppUrl()` before first step (if not already on that URL)
2. Validate that step instructions don't contain URLs
3. Pass `appType` to AgentExecutor.execute()

#### C. Test Controller/Service
1. Add validation: `appUrl` is required for new tests
2. Add endpoints to get/set `appUrl` and `appType`

### 4. Frontend Changes Needed:

#### A. Test Creation/Edit Form
1. Add `appUrl` field (required, URL validation)
2. Add `appType` dropdown with options:
   - react-spa
   - angular-spa
   - ecommerce
   - admin-dashboard
   - form-heavy
   - other (default)

#### B. Step Creation Form
1. Add validation: prevent URLs in step instructions
2. Show helpful message: "URLs are not allowed in steps. The test will automatically navigate to the app URL."

### 5. Migration
Need database migration to add columns:
```sql
ALTER TABLE tests ADD COLUMN app_url VARCHAR(500);
ALTER TABLE tests ADD COLUMN app_type VARCHAR(50);
```

## Benefits:

1. **No URL duplication**: App URL defined once at test level
2. **App-specific optimizations**: LLM gets context-specific instructions
3. **Better maintenance**: Change app URL in one place
4. **Smarter agent**: Understands app-specific patterns (React renders, Angular change detection, etc.)
5. **Token efficiency**: Only loads relevant app-type rules when needed

## Example Usage:

**Test Configuration:**
- App URL: `https://www.saucedemo.com`
- App Type: `ecommerce`

**Test Steps:**
1. Login with username `standard_user` and password `secret_sauce`
2. Verify products are displayed
3. Add first product to cart
4. Verify cart count is 1

**Execution Flow:**
1. Before step 1: Auto-navigate to `https://www.saucedemo.com`
2. For each step: Load `ecommerce` specific rules + keyword-matched rules
3. Agent gets context: "product listings typically have product cards, names, prices..."
4. Agent performs steps with app-specific knowledge

## Next Steps to Complete:

1. ✅ Add fields to Test entity
2. ✅ Update prompt JSON with app_types
3. ⏳ Update AgentExecutor to load app-type rules
4. ⏳ Update TestExecutionService for auto-navigation and validation
5. ⏳ Add frontend UI for appUrl and appType
6. ⏳ Create database migration
7. ⏳ Update test creation/edit APIs

