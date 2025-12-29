# AI + MCP Architecture

## Overview

The system now uses a **two-tier architecture** where OpenAI interprets natural language and the MCP server executes browser actions.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User creates test step                       │
│              "Click the login button on the page"                │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AiTestExecutionService                         │
│                 (Java Backend Service)                           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  OpenAI API (GPT-4)         │
         │                             │
         │  Input: "Click the login    │
         │          button on the page"│
         │                             │
         │  Output: {                  │
         │    "action": "click",       │
         │    "selector": "button#login"│
         │  }                          │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Playwright MCP Server     │
         │   (Docker Container)        │
         │   Port: 3000                │
         │                             │
         │   POST /execute             │
         │   {                         │
         │     "action": "click",      │
         │     "params": {             │
         │       "selector": "button#login"│
         │     }                       │
         │   }                         │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Playwright Browser        │
         │   (Chromium Headless)       │
         │                             │
         │   Executes: page.click()    │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Result returned to        │
         │   Java Backend              │
         │   {                         │
         │     "success": true,        │
         │     "message": "Clicked"    │
         │   }                         │
         └─────────────────────────────┘
```

## Key Components

### 1. AiTestExecutionService (Java)
**Location:** `backend/src/main/java/com/youraitester/service/AiTestExecutionService.java`

**Responsibilities:**
- Receives natural language test instructions
- Calls OpenAI to interpret the instruction
- Sends interpreted actions to MCP server
- Returns results to test execution flow

**Flow:**
```java
executeStepWithAI(instruction) 
    → interpretWithOpenAI(instruction)  // GPT-4 interprets
    → executeWithMcp(interpretedStep)   // MCP executes
    → return result
```

### 2. OpenAI API (GPT-4)
**Purpose:** Natural language understanding

**Input Example:**
```
"Click the login button on the page"
```

**Output Example:**
```json
{
  "action": "click",
  "selector": "button#login",
  "value": null
}
```

**Supported Actions:**
- `navigate` - Go to URL
- `click` - Click element
- `type` - Type text into input
- `select` - Select dropdown option
- `assert` - Verify element exists
- `wait` - Wait for time
- `screenshot` - Take screenshot

### 3. Playwright MCP Server (Node.js/Docker)
**Location:** `backend/mcp-server/`

**Purpose:** Browser automation execution

**API Endpoints:**
- `GET /health` - Health check
- `POST /execute` - Execute browser action

**Example Request:**
```json
{
  "action": "click",
  "params": {
    "selector": "button#login"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Clicked on button#login"
}
```

## Configuration

### Backend (`application.properties`)

```properties
# OpenAI Configuration
openai.api.key=sk-your-api-key-here
openai.model=gpt-4

# MCP Server Configuration
mcp.playwright.enabled=true
mcp.playwright.server.url=http://localhost:3000
```

### Docker Compose

The MCP server runs as a separate Docker container:

```bash
# Start MCP server
docker-compose up -d playwright-mcp

# Check status
docker ps | grep playwright-mcp

# View logs
docker logs playwright-mcp-server

# Stop
docker-compose down
```

## Benefits of This Architecture

### 1. **Separation of Concerns**
- **OpenAI**: Handles natural language understanding
- **MCP Server**: Handles browser automation
- **Backend**: Orchestrates the flow

### 2. **Scalability**
- MCP server can be scaled independently
- Multiple backend instances can share one MCP server
- Can run MCP on separate hardware for better performance

### 3. **Flexibility**
- Easy to swap OpenAI for other LLMs
- MCP server can be upgraded without touching backend
- Can add more browser types (Firefox, Safari) to MCP

### 4. **Maintainability**
- Each component has single responsibility
- Easier to debug (check logs at each layer)
- Can test components independently

## Fallback Behavior

If components are unavailable, the system gracefully falls back:

1. **OpenAI + MCP** (Best) ✅
   - Full AI interpretation + automated execution
   
2. **OpenAI only** (Good) ⚠️
   - AI interpretation, returns action for manual execution
   - MCP not available or disabled
   
3. **Pattern Matching** (Basic) ⚠️
   - Simple keyword-based interpretation
   - OpenAI not configured

## Testing the Setup

### 1. Test MCP Server
```bash
# Health check
curl http://localhost:3000/health

# Test navigation
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"navigate","params":{"url":"https://example.com"}}'

# Test click
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"click","params":{"selector":"button"}}'
```

### 2. Test Backend Integration
1. Set OpenAI API key in `application.properties`
2. Enable MCP: `mcp.playwright.enabled=true`
3. Start backend
4. Create test with natural language step
5. Run test and check logs

### 3. Check Logs

**MCP Server:**
```bash
docker logs -f playwright-mcp-server
```

**Backend:**
```bash
tail -f backend/logs/application.log
```

Look for:
- `Executing step with OpenAI + MCP: {instruction}`
- `Using MCP to execute action: {action}`

## Troubleshooting

**MCP server not responding:**
- Check if container is running: `docker ps`
- Check logs: `docker logs playwright-mcp-server`
- Test health: `curl http://localhost:3000/health`

**OpenAI not working:**
- Verify API key in application.properties
- Check logs for "No OpenAI available"
- Test API key: Make a test request to OpenAI

**Backend can't connect to MCP:**
- Verify URL: `mcp.playwright.server.url=http://localhost:3000`
- Check network: Can backend reach port 3000?
- Check MCP is enabled: `mcp.playwright.enabled=true`

## Example Test Execution

**User creates test:**
```json
{
  "name": "Login Test",
  "steps": [
    {
      "instruction": "Go to https://example.com/login",
      "order": 1
    },
    {
      "instruction": "Type john@example.com in the email field",
      "order": 2
    },
    {
      "instruction": "Type password123 in the password field",
      "order": 3
    },
    {
      "instruction": "Click the login button",
      "order": 4
    }
  ]
}
```

**Execution Flow:**
1. Step 1: "Go to https://example.com/login"
   - OpenAI → `{action: "navigate", value: "https://example.com/login"}`
   - MCP → Navigates browser to URL
   
2. Step 2: "Type john@example.com in the email field"
   - OpenAI → `{action: "type", selector: "input[type='email']", value: "john@example.com"}`
   - MCP → Types into email field
   
3. Step 3: "Type password123 in the password field"
   - OpenAI → `{action: "type", selector: "input[type='password']", value: "password123"}`
   - MCP → Types into password field
   
4. Step 4: "Click the login button"
   - OpenAI → `{action: "click", selector: "button[type='submit']"}`
   - MCP → Clicks login button

**Result:** Test passes, all actions executed successfully! ✅
