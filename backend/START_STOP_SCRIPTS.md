# Updated Start/Stop Scripts for Official MCP Server

## ✅ What Changed

The scripts have been updated to use the **official Microsoft Playwright MCP server** instead of the custom Docker container.

---

## 📁 Updated Scripts

### 1. `backend/start.sh` (Local Development)
**Use for**: Local development on your machine

**What it does**:
- Starts official MCP server via `npx @playwright/mcp@latest`
- Starts backend application
- Validates API keys
- Shows colorful status output

**Usage**:
```bash
cd backend
./start.sh
```

**Requirements**:
- Node.js 18+ (for npx)
- Java 17+ (for backend)
- API key in `.env` file or environment variable

### 2. `backend/start-services.sh` (Production/EC2)
**Use for**: Production deployments (EC2, server)

**What it does**:
- Loads `/opt/youraitester/.env`
- Starts official MCP server on port 8931
- Starts backend with all production settings
- Health checks
- PID file management

**Usage**:
```bash
cd /opt/youraitester
./start-services.sh
```

### 3. `backend/stop-services.sh` (Both)
**Use for**: Stopping all services

**What it does**:
- Stops backend application
- Stops official MCP server
- Cleans up PID files
- Removes old custom Docker container (if present)
- Verifies everything stopped

**Usage**:
```bash
cd backend  # or /opt/youraitester
./stop-services.sh
```

---

## 🔧 Key Changes from Old Version

| Aspect | Old (Custom) | New (Official) |
|--------|--------------|----------------|
| **MCP Server** | Docker container `playwright-mcp` | NPX `@playwright/mcp@latest` |
| **Port** | 3000 | 8931 |
| **URL** | `http://localhost:3000` | `http://localhost:8931/mcp` |
| **Start Command** | `docker run ...` | `npx @playwright/mcp@latest --port 8931` |
| **Stop Command** | `docker stop playwright-mcp` | `pkill -f "@playwright/mcp"` |
| **Logs** | `docker logs -f playwright-mcp` | `tail -f /tmp/mcp-server.log` |

---

## 🚀 Usage Examples

### Local Development

**Step 1: Create `.env` file**
```bash
cd backend
cat > .env << EOF
OPENAI_API_KEY=sk-your-openai-key-here
CLAUDE_API_KEY=sk-ant-your-claude-key-here
AGENT_LLM_PROVIDER=openai
MCP_PLAYWRIGHT_ENABLED=true
MCP_BROWSER=chromium
EOF
```

**Step 2: Start services**
```bash
./start.sh
```

**Step 3: Check logs**
```bash
# MCP server logs
tail -f /tmp/mcp-server.log

# Backend logs
tail -f backend.log
```

**Step 4: Stop services**
```bash
./stop-services.sh
```

### Production (EC2)

**Step 1: Ensure `.env` exists**
```bash
cat /opt/youraitester/.env
# Should contain:
# OPENAI_API_KEY=...
# DB_NAME=...
# DB_USER=...
# etc.
```

**Step 2: Start services**
```bash
cd /opt/youraitester
./start-services.sh
```

**Step 3: Check status**
```bash
# Check if services are running
ps aux | grep -E 'test-automation-backend|@playwright/mcp'

# Check MCP server health
curl -s http://localhost:8931/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# Check backend health
curl http://localhost:8080/actuator/health
```

---

## 🔑 Environment Variables

### Required
- `OPENAI_API_KEY` or `CLAUDE_API_KEY` - LLM API key

### Optional
- `AGENT_LLM_PROVIDER` - `openai` or `claude` (default: `openai`)
- `MCP_PLAYWRIGHT_ENABLED` - `true` or `false` (default: `true`)
- `MCP_PLAYWRIGHT_SERVER_URL` - MCP URL (default: `http://localhost:8931/mcp`)
- `MCP_BROWSER` - `chromium`, `firefox`, or `webkit` (default: `chromium`)
- `SERVER_PORT` - Backend port (default: `8080`)
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_NAME` - Database name (required for production)
- `DB_USER` - Database user (required for production)
- `DB_PASSWORD` - Database password (required for production)

---

## 🐛 Troubleshooting

### MCP Server Won't Start

**Check Node.js version:**
```bash
node --version  # Should be 18+
```

**Check if port is in use:**
```bash
lsof -i :8931
# Kill process if needed
kill -9 <PID>
```

**Check logs:**
```bash
tail -f /tmp/mcp-server.log
```

### Backend Won't Connect to MCP

**Verify MCP is running:**
```bash
curl -s http://localhost:8931/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

**Check backend configuration:**
```bash
grep "mcp.playwright" backend/src/main/resources/application.properties
# Should show:
# mcp.playwright.server.url=http://localhost:8931/mcp
```

### Services Won't Stop

**Force kill everything:**
```bash
# Kill backend
pkill -9 -f "test-automation-backend"

# Kill MCP
pkill -9 -f "@playwright/mcp"

# Kill processes on ports
lsof -ti:8080 | xargs kill -9
lsof -ti:8931 | xargs kill -9
```

---

## 📊 Output Examples

### Successful Start (Local)
```
═══════════════════════════════════════════════════════════
Starting YourAITester Services (Development Mode)
═══════════════════════════════════════════════════════════

Stopping existing services...
✓ Official MCP server started (PID: 12345, port: 8931)
Waiting for MCP server to initialize...
✓ MCP server is ready!
✓ Backend started (PID: 12346, port: 8080)

═══════════════════════════════════════════════════════════
Services Started Successfully!
═══════════════════════════════════════════════════════════

Running Services:
  • Official MCP Server    (port 8931) - PID: 12345
  • Backend Application    (port 8080) - PID: 12346

Configuration:
  • LLM Provider:    openai
  • OpenAI Key:      sk-proj-LPaLOSgvPI6no...n0A
  • MCP Server URL:  http://localhost:8931/mcp
  • Browser:         chromium

Logs:
  • MCP Server:  tail -f /tmp/mcp-server.log
  • Backend:     tail -f backend.log

To stop services: ./stop-services.sh
```

### Successful Stop
```
Stopping Backend Application...
✓ Backend stopped

Stopping Official Microsoft Playwright MCP Server...
✓ MCP server stopped (PID: 12345)

═══════════════════════════════════════════════════════════
All services stopped.
═══════════════════════════════════════════════════════════

✓ Verified: All services stopped
```

---

## 🔄 Migration from Old Scripts

If you're upgrading from the old custom Docker MCP server:

1. **Stop old services:**
   ```bash
   docker stop playwright-mcp
   docker rm playwright-mcp
   ```

2. **Update environment variables:**
   ```bash
   # Old
   MCP_PLAYWRIGHT_SERVER_URL=http://localhost:3000
   
   # New
   MCP_PLAYWRIGHT_SERVER_URL=http://localhost:8931/mcp
   ```

3. **Use new scripts:**
   ```bash
   ./start.sh
   ```

The `stop-services.sh` script will automatically clean up any old Docker containers.

---

## ✅ Checklist

Before running in production:
- [ ] Node.js 18+ installed
- [ ] Java 17+ installed  
- [ ] Environment variables set in `/opt/youraitester/.env`
- [ ] Database is running and accessible
- [ ] Port 8931 is available (MCP)
- [ ] Port 8080 is available (Backend)
- [ ] API keys are valid
- [ ] JAR file exists: `/opt/youraitester/test-automation-backend-1.0.0.jar`

---

**Ready to use!** The scripts are now configured for the official Microsoft Playwright MCP server.

