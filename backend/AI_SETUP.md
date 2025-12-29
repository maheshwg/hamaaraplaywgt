# AI-Powered Test Automation Setup Guide

This guide explains how to set up OpenAI and Playwright MCP for intelligent test automation.

## Architecture

Your backend now supports **3 levels** of AI-powered testing:

1. **Playwright MCP** (Best) - Uses Model Context Protocol for direct AI-to-browser control
2. **OpenAI + Playwright** (Good) - AI interprets commands, Playwright executes
3. **Pattern Matching** (Basic) - Simple keyword-based interpretation

## Prerequisites

### 1. Install Node.js (for MCP)
```bash
# Check if installed
node --version
npm --version

# If not installed, download from https://nodejs.org/
```

### 2. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create an account or sign in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

## Setup Instructions

### Option 1: Full AI Setup (Recommended)

**Step 1: Set Environment Variables**

On Mac/Linux:
```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
export MCP_PLAYWRIGHT_ENABLED=true
```

On Windows:
```cmd
set OPENAI_API_KEY=sk-your-actual-api-key-here
set MCP_PLAYWRIGHT_ENABLED=true
```

**Step 2: Update application.properties (Alternative)**

Edit `backend/src/main/resources/application.properties`:
```properties
# OpenAI Configuration
openai.api.key=sk-your-actual-api-key-here
openai.model=gpt-4

# MCP Configuration
mcp.playwright.enabled=true
```

**Step 3: Restart Backend**
```bash
cd backend
mvn spring-boot:run
```

You should see:
```
Starting Playwright MCP server...
Playwright MCP server started at http://localhost:3000
```

### Option 2: OpenAI Only (Without MCP)

If you don't want to use MCP (simpler but less powerful):

```properties
# In application.properties
openai.api.key=sk-your-actual-api-key-here
mcp.playwright.enabled=false
```

### Option 3: Basic Mode (No AI)

No setup needed, but you must provide:
- Exact CSS selectors
- Action types (click, type, navigate)
- Values for type/navigate actions

## How It Works

### With Full AI (MCP + OpenAI)

**You write:**
```
"Click the login button"
"Type john@example.com in the email field"
"Navigate to the dashboard"
```

**System does:**
1. MCP server receives natural language
2. Uses AI to understand page context
3. Finds correct elements automatically
4. Executes actions
5. Takes screenshots
6. Returns results

### With OpenAI Only

**You write:**
```
"Click the login button"
```

**System does:**
1. OpenAI interprets: `{action: "click", selector: "button[type='submit']"}`
2. Playwright finds element and clicks
3. Takes screenshot

### Basic Mode

**You must specify:**
```json
{
  "instruction": "Click the login button",
  "type": "click",
  "selector": "#login-btn"
}
```

## Testing Your Setup

### 1. Check Backend Logs

Look for:
```
✅ Playwright MCP server started at http://localhost:3000
✅ OpenAI API key configured
```

### 2. Create a Test

In the UI, create a test with steps like:
```
Step 1: Navigate to https://example.com
Step 2: Click the login button
Step 3: Type test@example.com in email field
Step 4: Click submit
```

### 3. Run the Test

```bash
curl -X POST http://localhost:8080/api/tests/{testId}/run \
  -H "Content-Type: application/json" \
  -d '{
    "browser": "chromium",
    "environment": "development"
  }'
```

### 4. Check Results

```bash
curl http://localhost:8080/api/tests/{testId}/runs
```

## Configuration Options

### MCP Settings

```properties
# Enable/disable MCP
mcp.playwright.enabled=true

# MCP server port
mcp.playwright.server.port=3000

# MCP server command (default uses npx)
mcp.playwright.server.command=npx
mcp.playwright.server.args=-y,@modelcontextprotocol/server-playwright
```

### OpenAI Settings

```properties
# Your API key
openai.api.key=sk-xxxxx

# Model to use (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
openai.model=gpt-4
```

### Browser Settings

```properties
# Run headless (true/false)
browser.headless=true

# Timeout in milliseconds
browser.timeout=30000

# Max concurrent sessions
browser.max-sessions=5
```

## API Endpoints

### Execute Test with AI
```bash
POST /api/tests/{testId}/run
{
  "browser": "chromium",        # chromium, firefox, webkit
  "environment": "development",  # dev, staging, production
  "dataRowIndex": 0             # optional: for data-driven tests
}
```

### Interpret Natural Language Step
```bash
POST /api/steps/interpret
{
  "instruction": "Click the login button",
  "pageContext": "<html>...</html>",  # optional
  "variables": {}                      # optional
}
```

## Troubleshooting

### MCP Server Won't Start

**Issue:** "Failed to start Playwright MCP server"

**Solutions:**
1. Check Node.js is installed: `node --version`
2. Install MCP package manually:
   ```bash
   npm install -g @modelcontextprotocol/server-playwright
   ```
3. Check port 3000 is not in use:
   ```bash
   lsof -i :3000
   ```

### OpenAI API Errors

**Issue:** "Invalid API key" or "Quota exceeded"

**Solutions:**
1. Verify API key is correct (starts with `sk-`)
2. Check OpenAI account has credits: https://platform.openai.com/usage
3. Try using `gpt-3.5-turbo` instead of `gpt-4` (cheaper):
   ```properties
   openai.model=gpt-3.5-turbo
   ```

### Tests Not Running

**Issue:** Steps show "failed" status

**Solutions:**
1. Check backend logs for errors
2. Verify selectors are correct (if not using AI)
3. Increase timeout:
   ```properties
   browser.timeout=60000
   ```
4. Run in non-headless mode to see what's happening:
   ```properties
   browser.headless=false
   ```

### Screenshots Not Saving

**Issue:** `screenshotUrl` is null

**Solutions:**
1. Check `/tmp/screenshots` directory exists and is writable
2. For S3 storage, verify AWS credentials:
   ```properties
   aws.access.key=YOUR_KEY
   aws.secret.key=YOUR_SECRET
   aws.s3.bucket-name=your-bucket
   ```

## Cost Estimation

### OpenAI API Costs (approximate)

- **GPT-4**: ~$0.03 per test (with 5 steps)
- **GPT-3.5-turbo**: ~$0.002 per test (with 5 steps)

For 1000 tests/month:
- GPT-4: ~$30/month
- GPT-3.5-turbo: ~$2/month

### MCP

- Free (runs locally)
- No external API calls beyond OpenAI

## Best Practices

1. **Use Clear Instructions**
   - ✅ "Click the blue login button"
   - ❌ "Do the thing"

2. **Be Specific**
   - ✅ "Type john@example.com in the email field"
   - ❌ "Enter email"

3. **Include Context**
   - ✅ "Navigate to https://example.com/login"
   - ❌ "Go to login"

4. **Test Incrementally**
   - Start with simple tests
   - Add complexity gradually
   - Verify each step works

## Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Restart backend
3. ✅ Create a simple test
4. ✅ Run the test
5. ✅ Review results and screenshots
6. 🚀 Build complex test suites!

## Support

- Check backend logs: Terminal where `mvn spring-boot:run` is running
- View test results: `GET /api/tests/{testId}/runs`
- Screenshot location: `/tmp/screenshots/` or S3 bucket

For issues, check:
1. Backend console output
2. Browser developer tools
3. Database records: `SELECT * FROM tests;`
