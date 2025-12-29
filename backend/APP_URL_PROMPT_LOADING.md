# App-URL Based Prompt Category Loading

## Overview

The system now loads prompt categories dynamically based on the **app URL** configured in each test. This allows different applications to have their own specific automation rules and instructions, improving the AI agent's accuracy and reducing token usage.

## Changes Made

### 1. AgentExecutor.java
- **Updated `buildDynamicPrompt()`** to accept `appUrl` and `appType` parameters
- **Loads categories from nested structure** in `agent-prompt-categories.json`:
  - `core` - Always included
  - `apps[appUrl][category]` - App-specific categories (e.g., `date_input`, `css_selectors`, `sorting`)
  - `app_types[appType]` - App-type specific rules (e.g., `react-spa`, `ecommerce`)
- **Keyword matching** now works on app-specific categories
- **Added overloaded `execute()` methods** to accept `appUrl` and `appType`

### 2. AiTestExecutionService.java
- **Added overloaded `executeStepWithAI()` methods** to accept and pass `appUrl` and `appType` 
- Passes app context through to `AgentExecutor`

### 3. TestExecutionService.java
- **Updated `executeStepWithAI()`** to accept `Test` object (not just `TestStep` and `TestRun`)
- **Extracts `appUrl` and `appType`** from test and passes them to `AiTestExecutionService`
- **Updated `executeModuleSteps()`** to also pass the `Test` object
- **Enhanced failure detection** to recognize when agent reports inability to complete task:
  - "does not contain... need to..."
  - "cannot interact/perform"
  - "unable to find"
  - "could not find"
  - "no visible elements"
  - "please provide... url"

### 4. agent-prompt-categories.json Structure

```json
{
  "core": {
    "description": "Always included",
    "content": "Base prompt with CSS selector rules..."
  },
  "apps": {
    "https://www.saucedemo.com": {
      "css_selectors": {...},
      "date_input": {...},
      "sorting": {...},
      ...
    },
    "https://material.angular.dev/components/datepicker/overview": {
      "css_selectors": {...},
      "date_input": {...}
    }
  },
  "app_types": {
    "react-spa": {...},
    "ecommerce": {...},
    "admin-dashboard": {...}
  }
}
```

## How It Works

### Flow:

1. **Test Configuration**:
   - User sets `appUrl` and `appType` when creating/editing a test
   - Example: 
     - `appUrl`: "https://material.angular.dev/components/datepicker/overview"
     - `appType`: "angular-spa"

2. **Test Execution**:
   - `TestExecutionService` retrieves the test's `appUrl` and `appType`
   - Passes them to `AiTestExecutionService.executeStepWithAI()`

3. **Prompt Building**:
   - `AgentExecutor.buildDynamicPrompt()` receives the app context
   - Loads `core` prompt (always included)
   - Looks for `apps[appUrl]` in the JSON
   - Matches step instruction keywords against app-specific categories
   - Includes matching categories in the prompt
   - Optionally includes `app_types[appType]` content

4. **Agent Execution**:
   - Agent receives a targeted prompt with only relevant instructions
   - No irrelevant categories = fewer tokens, better focus
   - App-specific instructions = better accuracy

## Example

### Test Configuration:
```
Name: Date Picker Test
App URL: https://material.angular.dev/components/datepicker/overview
App Type: angular-spa
```

### Step Instruction:
```
select feb 20 2026 in date element after test "basic datepicker"
```

### What Happens:

1. System loads:
   - `core` prompt (CSS selector rules, autonomy rules)
   - `apps["https://material.angular.dev..."]["date_input"]` - Because "date" keyword matches
   - `app_types["angular-spa"]` - Angular-specific rules

2. Agent receives a prompt with:
   - General CSS selector rules
   - **Material Angular date picker specific instructions**
   - Angular SPA specific patterns
   - Instructions for finding date field by label
   - Instructions for navigating calendar (year → month → date)

3. Agent can now:
   - Find "Basic datepicker" label
   - Locate nearby date input field
   - Click to open calendar
   - Navigate to correct year/month
   - Select the date

## Benefits

### 1. **Accuracy**
- App-specific instructions tailored to each application's UI patterns
- No confusion from irrelevant instructions

### 2. **Token Efficiency**
- Only loads relevant categories
- Reduces prompt size by ~50-70%
- Faster execution, lower costs

### 3. **Maintainability**
- Add new app-specific rules without affecting others
- Each app has its own instruction set
- Easy to update per-app rules

### 4. **Scalability**
- Support unlimited applications
- Each with custom automation rules
- No prompt bloat

## Adding New App-Specific Rules

### Step 1: Add App Entry in JSON

```json
{
  "apps": {
    "https://your-app-url.com": {
      "category_name": {
        "description": "When to include this category",
        "keywords": ["keyword1", "keyword2"],
        "content": "## INSTRUCTIONS:\nYour detailed instructions here..."
      }
    }
  }
}
```

### Step 2: Configure Test

In the test editor:
- Set **Application URL**: `https://your-app-url.com`
- Set **Application Type**: Choose appropriate type

### Step 3: Test

The system will automatically:
- Load app-specific categories when URL matches
- Use keyword matching to include relevant ones
- Provide targeted instructions to the agent

## Debugging

### Check Logs:

```
Built dynamic prompt with categories: [core, date_input, css_selectors]
```

This shows which categories were included for each step.

### If Categories Not Loading:

1. **Verify app URL in test matches JSON exactly**
2. **Check keywords** in instruction match category keywords
3. **Restart backend** after JSON changes
4. **Review logs** for "No app-specific categories found for URL"

## Files Changed

- `backend/src/main/java/com/youraitester/agent/AgentExecutor.java`
- `backend/src/main/java/com/youraitester/service/AiTestExecutionService.java`
- `backend/src/main/java/com/youraitester/service/TestExecutionService.java`
- `backend/agent-prompt-categories.json` (structure)
- `backend/APP_URL_PROMPT_LOADING.md` (this file)

