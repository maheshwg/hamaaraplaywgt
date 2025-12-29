#!/bin/bash

################################################################################
# Service Stop Script - Updated for Official Microsoft Playwright MCP
# Run this script to stop all backend services
################################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping Backend Application...${NC}"
if pkill -f "test-automation-backend"; then
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}⚠ Backend was not running${NC}"
fi

echo -e "${YELLOW}Stopping Official Microsoft Playwright MCP Server...${NC}"

# Try to kill using PID file first
if [ -f /opt/youraitester/.mcp-server.pid ]; then
    MCP_PID=$(cat /opt/youraitester/.mcp-server.pid)
    if ps -p $MCP_PID > /dev/null 2>&1; then
        kill $MCP_PID
        echo -e "${GREEN}✓ MCP server stopped (PID: $MCP_PID)${NC}"
    fi
    rm /opt/youraitester/.mcp-server.pid
fi

# Kill any remaining MCP processes
if pkill -f "@playwright/mcp"; then
    echo -e "${GREEN}✓ Additional MCP processes stopped${NC}"
fi

# Kill old custom Docker MCP server if it's still running (cleanup)
if docker ps -q -f name=playwright-mcp > /dev/null 2>&1; then
    echo -e "${YELLOW}Found old custom MCP container, stopping...${NC}"
    docker stop playwright-mcp 2>/dev/null
    docker rm playwright-mcp 2>/dev/null
    echo -e "${GREEN}✓ Old custom MCP container removed${NC}"
fi

# Wait a moment for processes to clean up
sleep 1

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}All services stopped.${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verify nothing is running
if pgrep -f "test-automation-backend" > /dev/null || \
   pgrep -f "@playwright/mcp" > /dev/null; then
    echo -e "${RED}Warning: Some processes may still be running${NC}"
    echo "Run: ps aux | grep -E 'test-automation-backend|playwright.*mcp'"
else
    echo -e "${GREEN}✓ Verified: All services stopped${NC}"
fi

echo ""
