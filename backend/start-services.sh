#!/bin/bash

################################################################################
# Service Startup Script - Updated for Official Microsoft Playwright MCP
# Run this script to start all backend services
################################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f /opt/youraitester/.env ]; then
    export $(cat /opt/youraitester/.env | grep -v '^#' | xargs)
fi

echo -e "${GREEN}Starting Official Microsoft Playwright MCP Server...${NC}"

# Check if official MCP server is already running
MCP_PID=$(pgrep -f "@playwright/mcp.*--port 8931" || echo "")

if [ ! -z "$MCP_PID" ]; then
    echo -e "${YELLOW}Official MCP server already running (PID: $MCP_PID)${NC}"
else
    # Start official Microsoft Playwright MCP server
    cd /opt/youraitester
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Start MCP server in background
    echo "Starting official MCP server on port 8931..."
    npx -y @playwright/mcp@latest \
      --port 8931 \
      --headless \
      --browser ${MCP_BROWSER:-chromium} \
      > logs/mcp-server.log 2>&1 &
    
    MCP_PID=$!
    echo -e "${GREEN}Official MCP server started (PID: $MCP_PID)${NC}"
    
    # Save PID for stop script
    echo $MCP_PID > /opt/youraitester/.mcp-server.pid
fi

# Wait for MCP to be ready
echo "Waiting for MCP server to start..."
for i in {1..30}; do
    if curl -s http://localhost:8931/mcp \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
        > /dev/null 2>&1; then
        echo -e "${GREEN}MCP server is ready!${NC}"
        break
    fi
    echo "Waiting... (attempt $i/30)"
    sleep 1
done

echo -e "${GREEN}Starting Backend Application...${NC}"
cd /opt/youraitester

# Kill existing backend process if running
pkill -f "test-automation-backend" || true

# Kill any process using port 8080
if command -v lsof > /dev/null 2>&1; then
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
elif command -v fuser > /dev/null 2>&1; then
    fuser -k 8080/tcp 2>/dev/null || true
fi
sleep 1

# Start backend application
nohup java -jar test-automation-backend-1.0.0.jar \
  --server.port=${SERVER_PORT:-8080} \
  --spring.datasource.url=jdbc:postgresql://${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME} \
  --spring.datasource.username=${DB_USER} \
  --spring.datasource.password=${DB_PASSWORD} \
  --server.public.url=${SERVER_PUBLIC_URL:-http://localhost:8080} \
  --openai.api.key=${OPENAI_API_KEY} \
  --claude.api.key=${CLAUDE_API_KEY:-} \
  --agent.llm.provider=${AGENT_LLM_PROVIDER:-openai} \
  --mcp.playwright.enabled=${MCP_PLAYWRIGHT_ENABLED:-true} \
  --mcp.playwright.server.url=${MCP_PLAYWRIGHT_SERVER_URL:-http://localhost:8931/mcp} \
  --screenshot.storage.type=${SCREENSHOT_STORAGE_TYPE:-local} \
  --aws.s3.bucket-name=${AWS_S3_BUCKET:-} \
  --aws.s3.region=${AWS_REGION:-us-east-1} \
  --aws.access.key=${AWS_ACCESS_KEY:-} \
  --aws.secret.key=${AWS_SECRET_KEY:-} \
  --aws.s3.cloudfront.url=${AWS_CLOUDFRONT_URL:-} \
  > logs/application.log 2>&1 &

BACKEND_PID=$!
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

# Wait and check if services are running
echo "Checking service health..."
sleep 5

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Service Status:${NC}"
echo "═══════════════════════════════════════════════════════════"

# Check MCP Server
if pgrep -f "@playwright/mcp.*--port 8931" > /dev/null; then
    echo -e "MCP Server (Official):     ${GREEN}✓ Running${NC} (port 8931)"
else
    echo -e "MCP Server (Official):     ${RED}✗ Not Running${NC}"
fi

# Check Backend
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo -e "Backend Application:       ${GREEN}✓ Running${NC} (port 8080)"
else
    echo -e "Backend Application:       ${YELLOW}⚠ Starting...${NC} (check logs)"
fi

echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  Backend:    tail -f /opt/youraitester/logs/application.log"
echo "  MCP Server: tail -f /opt/youraitester/logs/mcp-server.log"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  LLM Provider:    ${AGENT_LLM_PROVIDER:-openai}"
echo "  MCP Server URL:  ${MCP_PLAYWRIGHT_SERVER_URL:-http://localhost:8931/mcp}"
echo "  Browser:         ${MCP_BROWSER:-chromium}"
echo ""
