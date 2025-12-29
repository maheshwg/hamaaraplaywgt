# Using OpenAI + Playwright MCP for Intelligent Test Automation

This guide explains how to set up and use OpenAI with Playwright MCP for natural language test automation.

## What is Playwright MCP?

Model Context Protocol (MCP) for Playwright provides an intelligent layer between your tests and browser automation. Instead of writing complex selectors, you can use natural language descriptions like "login button" or "email input field", and the MCP server intelligently finds the right elements.

## Prerequisites

1. **Node.js and npx** (for MCP server)
2. **OpenAI API Key** (for AI interpretation)
3. **Java 17+** and **PostgreSQL** (already set up)

## Setup Steps

### 1. Install Playwright MCP Server

The backend will automatically install it via npx, but you can pre-install:

```bash
npx -y @modelcontextprotocol/server-playwright
```

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-...`)

### 3. Configure the Backend

Set your OpenAI API key as an environment variable:

**Mac/Linux:**
```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

**Or** add it to `application.properties`:
```properties
openai.api.key=sk-your-api-key-here
```

### 4. Restart the Backend

```bash
mvn spring-boot:run
```

You should see:
```
Starting Playwright MCP server...
Playwright MCP server started at http://localhost:3000
```

## How It Works

### Traditional Way (Without AI/MCP)
```json
{
  "instruction": "Click the login button",
  "type": "click",
  "selector": "#login-btn > button.primary[data-testid='submit']"
}
```
❌ Requires exact CSS selectors
❌ Breaks when UI changes
❌ Hard to write and maintain

### With OpenAI + MCP
```json
{
  "instruction": "Click the login button"
}
```
✅ Natural language only
✅ AI interprets intent
✅ MCP intelligently finds elements
✅ Resilient to UI changes

## Creating Tests with Natural Language

### Example 1: Login Flow

```javascript
{
  "name": "User Login Test",
  "steps": [
    { "instruction": "Go to https://example.com", "order": 1 },
    { "instruction": "Type john@example.com in the email field", "order": 2 },
    { "instruction": "Type password123 in the password field", "order": 3 },
    { "instruction": "Click the login button", "order": 4 },
    { "instruction": "Wait for 2 seconds", "order": 5 },
    { "instruction": "Verify welcome message is visible", "order": 6 }
  ]
}
```

### Example 2: Form Submission

```javascript
{
  "name": "Contact Form Test",
  "steps": [
    { "instruction": "Navigate to contact page", "order": 1 },
    { "instruction": "Fill in name field with John Doe", "order": 2 },
    { "instruction": "Enter email address john@example.com", "order": 3 },
    { "instruction": "Type message in textarea", "order": 4 },
    { "instruction": "Click submit button", "order": 5 }
  ]
}
```

## Behind the Scenes

When you create a test step:

1. **Frontend** → Saves instruction to database
2. **Backend** → Receives test execution request
3. **OpenAI** → Interprets natural language
   ```
   "Click the login button" 
   → {action: "click", selector: "button with text 'login'"}
   ```
4. **Playwright MCP** → Intelligently finds and clicks element
5. **Backend** → Captures screenshot and saves result

## API Endpoints

### Execute Test with AI

```bash
curl -X POST http://localhost:8080/api/tests/{testId}/run \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "development",
    "browser": "chromium"
  }'
```

### Interpret Single Step (for testing)

```bash
curl -X POST http://localhost:8080/api/steps/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Click the login button",
    "pageContext": "<html>...</html>"
  }'
```

## Configuration Options

### application.properties

```properties
# OpenAI Configuration
openai.api.key=sk-your-key-here
openai.model=gpt-4          # or gpt-3.5-turbo for faster/cheaper

# Playwright MCP
mcp.playwright.enabled=true
mcp.playwright.server.port=3000

# Browser Settings
browser.headless=true       # false to see browser
browser.timeout=30000       # 30 seconds
```

### Environment Variables

```bash
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4
export MCP_PLAYWRIGHT_ENABLED=true
export MCP_PLAYWRIGHT_PORT=3000
```

## Supported Actions

The AI can interpret and execute:

| Action | Example Instructions |
|--------|---------------------|
| **Navigate** | "Go to https://example.com"<br>"Visit the homepage"<br>"Open login page" |
| **Click** | "Click the submit button"<br>"Press login"<br>"Click on menu icon" |
| **Type** | "Type hello in search box"<br>"Enter email john@example.com"<br>"Fill in password" |
| **Select** | "Select United States from dropdown"<br>"Choose option 2" |
| **Assert** | "Verify welcome message is visible"<br>"Check that error appears" |
| **Wait** | "Wait for 3 seconds"<br>"Pause for a moment" |
| **Screenshot** | "Take a screenshot"<br>"Capture the page" |

## Troubleshooting

### MCP Server Won't Start

```bash
# Install manually
npm install -g @modelcontextprotocol/server-playwright

# Check if npx is available
which npx

# Try running directly
npx @modelcontextprotocol/server-playwright
```

### OpenAI API Errors

- **401 Unauthorized**: Check your API key
- **429 Rate Limit**: Upgrade your OpenAI plan or wait
- **Model not found**: Change to `gpt-3.5-turbo` in properties

### Tests Failing

1. Check logs: `logging.level.com.youraitester=DEBUG`
2. Disable headless: `browser.headless=false`
3. Increase timeout: `browser.timeout=60000`
4. Check MCP server: `curl http://localhost:3000/health`

## Cost Considerations

**OpenAI Costs:**
- GPT-4: ~$0.03 per 1K tokens
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- Average test step: ~100-200 tokens

**Recommendation:**
- Use GPT-3.5-turbo for development/testing
- Use GPT-4 for production tests requiring high accuracy

## Disabling AI/MCP

To run without AI (using basic Playwright):

```properties
mcp.playwright.enabled=false
openai.api.key=
```

You'll need to provide explicit selectors in test steps.

## Next Steps

1. ✅ Set up OpenAI API key
2. ✅ Test with a simple example
3. 📝 Create tests using natural language
4. 🚀 Run tests and view results
5. 📊 Set up scheduled runs (optional)

## Support

For issues:
- Check backend logs: `tail -f logs/application.log`
- Test OpenAI: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
- Test MCP: `curl http://localhost:3000/health`
