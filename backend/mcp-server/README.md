# Playwright MCP Server

This is a standalone Playwright MCP (Model Context Protocol) server that runs independently from the Java backend.

## What It Does

Provides an HTTP API wrapper around Playwright browser automation, allowing the backend to execute browser actions remotely.

## Architecture Overview

The system uses a **two-tier AI architecture**:

```
User writes natural language test step
         ↓
Backend (AiTestExecutionService)
         ↓
OpenAI API (GPT-4) - Interprets instruction
         ↓
MCP Server (this component) - Executes browser action
         ↓
Playwright Browser - Performs actual automation
         ↓
Result returned to backend
```

**Key Point:** OpenAI interprets "what to do", MCP server executes "how to do it".

### Example Flow

**User Input:**
```
"Click the login button on the page"
```

**OpenAI Interpretation:**
```json
{
  "action": "click",
  "selector": "button#login"
}
```

**MCP Server Executes:**
```javascript
await page.click("button#login")
```

**Result:**
```json
{
  "success": true,
  "message": "Clicked on button#login"
}
```

## Running with Docker

### Option 1: Run with Docker Compose (Recommended)

From the project root:

```bash
# Start all services including MCP server
docker-compose up playwright-mcp

# Or start everything
docker-compose up
```

### Option 2: Run Standalone

```bash
cd backend/mcp-server

# Build the image
docker build -t playwright-mcp-server .

# Run the container
docker run -p 3000:3000 playwright-mcp-server
```

## Running Locally (Without Docker)

```bash
cd backend/mcp-server

# Install dependencies
npm install

# Start the server
npm start
```

## API Endpoints

### Health Check
```http
GET /health
```

Returns:
```json
{
  "status": "ok",
  "browserReady": true
}
```

### Execute Action
```http
POST /execute
Content-Type: application/json

{
  "action": "navigate|click|type|select|assert|wait|screenshot|getContent",
  "params": {
    // Action-specific parameters
  }
}
```

### Examples

**Navigate:**
```json
{
  "action": "navigate",
  "params": {
    "url": "https://example.com"
  }
}
```

**Click:**
```json
{
  "action": "click",
  "params": {
    "selector": "button#submit"
  }
}
```

**Type:**
```json
{
  "action": "type",
  "params": {
    "selector": "input[name='email']",
    "text": "user@example.com"
  }
}
```

**Wait:**
```json
{
  "action": "wait",
  "params": {
    "timeout": 2000
  }
}
```

## Backend Configuration

Update `application.properties`:

```properties
# Enable MCP
mcp.playwright.enabled=true

# MCP server URL (default for Docker Compose)
mcp.playwright.server.url=http://playwright-mcp:3000

# For local development (when running MCP outside Docker)
mcp.playwright.server.url=http://localhost:3000

# OpenAI Configuration (required for natural language interpretation)
openai.api.key=sk-your-api-key-here
openai.model=gpt-4
```

### Environment Variables

You can also use environment variables:

```bash
# Set OpenAI API key
export OPENAI_API_KEY=sk-your-actual-key-here

# Enable MCP
export MCP_PLAYWRIGHT_ENABLED=true

# MCP server URL (optional, defaults to http://localhost:3000)
export MCP_PLAYWRIGHT_SERVER_URL=http://localhost:3000
```

Then start the backend:

```bash
cd backend
mvn spring-boot:run
```

### How Backend Uses MCP

The backend flow:

1. **Receives natural language instruction** (e.g., "Click the login button")
2. **Calls OpenAI API** to interpret the instruction into structured action
3. **Sends action to MCP server** via HTTP POST to `/execute`
4. **MCP server executes** browser action using Playwright
5. **Returns result** to backend and test execution flow

**Backend Logs to Check:**

```bash
# Watch backend logs
tail -f backend/logs/application.log

# Look for these messages:
# - "Executing step with OpenAI + MCP: {instruction}"
# - "Using MCP to execute action: {action}"
# - "Playwright MCP server is running at http://localhost:3000"
```

## Testing the Server

```bash
# Health check
curl http://localhost:3000/health

# Navigate to a page
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"navigate","params":{"url":"https://example.com"}}'

# Click an element
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"action":"click","params":{"selector":"button"}}'
```

## Troubleshooting

**Server not starting:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Ensure Node.js 18+ is installed
- Check Docker logs: `docker logs playwright-mcp-server`

**Backend can't connect:**
- Verify MCP server is running: `curl http://localhost:3000/health`
- Check firewall settings
- Ensure correct URL in application.properties
- Make sure `mcp.playwright.enabled=true`

**Browser actions failing:**
- Check MCP server logs for errors: `docker logs -f playwright-mcp-server`
- Verify selectors are correct
- Ensure page is fully loaded before actions

**OpenAI not calling MCP:**
- Verify OpenAI API key is set
- Check backend logs for "Executing step with OpenAI + MCP"
- If you see "No OpenAI available", the API key is not configured
- Backend falls back to pattern matching without OpenAI

**Complete test flow not working:**
1. Verify MCP server: `curl http://localhost:3000/health` → Should return `{"status":"ok"}`
2. Set OpenAI key: `export OPENAI_API_KEY=sk-...`
3. Enable MCP: `export MCP_PLAYWRIGHT_ENABLED=true`
4. Restart backend: `mvn spring-boot:run`
5. Check logs: `tail -f backend/logs/application.log`
6. Look for: "Playwright MCP server is running"

## Architecture Benefits

### Why This Design?

**Separation of Concerns:**
- **OpenAI**: Handles natural language understanding (the "what")
- **MCP Server**: Handles browser automation (the "how")
- **Backend**: Orchestrates the flow and manages test execution

**Scalability:**
- MCP server can run on separate hardware for better performance
- Multiple backend instances can share one MCP server
- Independent scaling of AI interpretation vs browser execution

**Flexibility:**
- Easy to swap OpenAI for other LLMs (Claude, Gemini, etc.)
- Can upgrade MCP server without touching backend code
- Support for multiple browser types (currently Chromium, can add Firefox, Safari)

**Maintainability:**
- Single responsibility per component
- Easier debugging (check logs at each layer)
- Can test components independently

## Fallback Behavior

The system gracefully handles component failures:

1. **✅ OpenAI + MCP (Best)**
   - Full AI interpretation + automated execution
   - User writes: "Click login button"
   - System executes automatically

2. **⚠️ OpenAI Only (Good)**
   - AI interpretation, manual execution
   - MCP not available or disabled
   - Returns action structure for manual handling

3. **⚠️ Pattern Matching (Basic)**
   - Simple keyword-based interpretation
   - OpenAI not configured
   - Limited accuracy, last resort fallback
