# App URL and App Type Feature

## Overview

This feature allows each test to specify:
1. **App URL** - The URL of the application being tested
2. **App Type** - The type of application (e.g., React SPA, E-Commerce, etc.)

These fields enable:
- ✅ Automatic navigation to the app before running test steps
- ✅ App-specific prompt rules loaded from `agent-prompt-categories.json`
- ✅ App-type specific rules for better test execution
- ✅ Prevention of URL hardcoding in test steps

## Changes Made

### Frontend Changes

**File: `src/pages/TestEditor.jsx`**

Added two new fields to the test editor form:

1. **Application URL** (required)
   - Input field for entering the app URL
   - Type: URL input with validation
   - Example: `https://www.saucedemo.com`
   - Helper text: "The test will automatically navigate to this URL before running"

2. **Application Type** (optional)
   - Dropdown with predefined options:
     - Other / Generic (default)
     - React SPA
     - Angular SPA
     - E-Commerce
     - Admin Dashboard
     - Form-Heavy App
   - Helper text: "Helps the AI agent understand app-specific patterns"

### Backend Changes

#### 1. Test Entity (`com.youraitester.model.Test`)

Added two new fields:
```java
@Column(name = "app_url")
private String appUrl;

@Column(name = "app_type")
private String appType;
```

#### 2. Test Execution Service (`com.youraitester.service.TestExecutionService`)

**Auto-Navigation Feature:**
- Before executing the first test step, the system automatically navigates to the configured `appUrl`
- If navigation fails, the test is marked as failed immediately
- If no `appUrl` is configured, a warning is logged and the test continues (for backward compatibility)

**URL Validation in Steps:**
- Added validation to prevent URLs in step instructions
- If a step contains `http://` or `https://`, it will fail with the message:
  - "Step instructions should not contain URLs. Configure the App URL in test settings instead."

**Code snippets:**

```java
// Auto-navigation before first step
if (test.getAppUrl() != null && !test.getAppUrl().trim().isEmpty()) {
    log.info("Auto-navigating to app URL: {}", test.getAppUrl());
    Map<String, Object> navResult = aiTestExecutionService.executeStepWithAI(
        "navigate to " + test.getAppUrl(),
        "",
        variables
    );
    // Error handling...
}

// URL validation in steps
if (containsUrl(step.getInstruction())) {
    result.setStatus("failed");
    result.setErrorMessage("Step instructions should not contain URLs...");
}
```

#### 3. Prompt System (`agent-prompt-categories.json`)

The JSON structure now supports:

```json
{
  "core": { ... },
  "apps": {
    "https://www.saucedemo.com": {
      "css_selectors": { ... },
      "sorting": { ... },
      // ... other categories
    },
    "https://www.example.com": {
      // ... app-specific rules
    }
  },
  "app_types": {
    "react-spa": { ... },
    "ecommerce": { ... },
    // ... app-type rules
  }
}
```

### Database Migration

**File: `migration-add-app-url-type.sql`**

Run this SQL script to add the new columns to existing databases:

```sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_url VARCHAR(500);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS app_type VARCHAR(100) DEFAULT 'other';
```

## Usage

### Creating a New Test

1. Open the Test Editor
2. Fill in the test name
3. **Enter the Application URL** (e.g., `https://www.saucedemo.com`)
4. **Select the Application Type** (optional, defaults to "Other")
5. Add your test steps (without any URLs!)
6. Save the test

### Step Instructions

❌ **DON'T do this:**
```
1. navigate to https://www.saucedemo.com
2. click login button
3. verify products
```

✅ **DO this:**
- **App URL field**: `https://www.saucedemo.com`
- **Steps:**
  ```
  1. click login button
  2. verify products
  ```

The system will automatically navigate to the app URL before step 1.

### Example Test Configuration

```json
{
  "name": "Login Test",
  "appUrl": "https://www.saucedemo.com",
  "appType": "ecommerce",
  "steps": [
    { "instruction": "enter standard_user in username field" },
    { "instruction": "enter secret_sauce in password field" },
    { "instruction": "click login button" },
    { "instruction": "verify Products text is displayed" }
  ]
}
```

**What happens:**
1. System navigates to `https://www.saucedemo.com` (automatic)
2. System loads prompt rules for:
   - Core rules (always included)
   - App-specific rules from `apps["https://www.saucedemo.com"]`
   - App-type rules from `app_types["ecommerce"]`
3. Executes steps with context-aware AI agent

## Benefits

### 1. No URL Duplication
- URL is defined once in test settings
- All steps focus on actions, not navigation
- Easy to change app URL for different environments

### 2. Better Prompt Context
- AI agent gets app-specific rules
- Better selector strategies for each app
- App-type specific patterns loaded automatically

### 3. Cleaner Test Steps
- Steps are more readable
- Focus on "what to do" not "where to do it"
- Easier to maintain

### 4. Fail-Fast
- If app URL is unreachable, test fails immediately
- No wasted execution on steps that can't work
- Clear error messages

## Backward Compatibility

**Existing tests without `appUrl`:**
- Will continue to work
- A warning will be logged: "No app URL configured for test. Skipping auto-navigation."
- Tests can still manually navigate using step instructions

**Migration path:**
1. Run the SQL migration script
2. Edit each test to add the `appUrl`
3. Remove manual navigation steps from test instructions
4. Optionally set `appType` for better AI context

## Next Steps (Pending)

1. **Update AgentExecutor** to:
   - Load app-URL specific rules from `apps[appUrl]`
   - Load app-type rules from `app_types[appType]`
   - Combine global, app-URL, and app-type rules dynamically

2. **Environment-Specific URLs**:
   - Support different URLs per environment (dev, staging, prod)
   - Could use URL templates or environment variables

3. **URL Validation**:
   - Add frontend validation for valid URLs
   - Check if URL is reachable before saving

## Files Changed

### Frontend
- `src/pages/TestEditor.jsx` - Added appUrl and appType fields to form

### Backend
- `backend/src/main/java/com/youraitester/model/Test.java` - Added appUrl and appType fields
- `backend/src/main/java/com/youraitester/service/TestExecutionService.java` - Auto-navigation and URL validation
- `backend/agent-prompt-categories.json` - Restructured to support app-specific and app-type rules
- `backend/migration-add-app-url-type.sql` - Database migration script

### Documentation
- `backend/APP_URL_AND_TYPE_FEATURE.md` - This file

