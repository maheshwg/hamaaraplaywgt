#!/bin/bash

################################################################################
# Local Development Start Script - Updated for Official Microsoft Playwright MCP
# Run this to start services in local development mode
################################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

# Load .env file if it exists
if [ -f .env ]; then
    echo -e "${GREEN}Loading .env file...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Set default values if not in .env
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export CLAUDE_API_KEY="${CLAUDE_API_KEY:-}"
export AGENT_LLM_PROVIDER="${AGENT_LLM_PROVIDER:-openai}"
# Use the MCP-optimized system prompt by default to reduce token usage
export AGENT_SYSTEM_PROMPT_FILE="${AGENT_SYSTEM_PROMPT_FILE:-agent-system-prompt-mcp.txt}"
# Max tool response sizes (reduce LLM input tokens)
export AGENT_TOOL_SNAPSHOT_MAX_CHARS="${AGENT_TOOL_SNAPSHOT_MAX_CHARS:-8000}"
export AGENT_TOOL_RESPONSE_MAX_CHARS="${AGENT_TOOL_RESPONSE_MAX_CHARS:-2000}"
# Conversation history truncation: keep last N tool iterations (set -1 to disable).
export AGENT_CONVERSATION_HISTORY_KEEP="${AGENT_CONVERSATION_HISTORY_KEEP:-2}"
export MCP_PLAYWRIGHT_ENABLED="${MCP_PLAYWRIGHT_ENABLED:-true}"
export MCP_BROWSER="${MCP_BROWSER:-chrome}"
export MCP_ACTION_TIMEOUT="${MCP_ACTION_TIMEOUT:-30000}"
# Custom selector MCP server (HTTP, port 3000) - used for native page.fill/click/select by CSS selector
export SELECTOR_MCP_ENABLED="${SELECTOR_MCP_ENABLED:-false}"
export SELECTOR_MCP_PORT="${SELECTOR_MCP_PORT:-3000}"

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting YourAITester Services (Development Mode)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Validate API keys
if [ -z "$OPENAI_API_KEY" ] && [ -z "$CLAUDE_API_KEY" ]; then
    echo -e "${RED}ERROR: No LLM API key configured!${NC}"
    echo "Please set OPENAI_API_KEY or CLAUDE_API_KEY in .env file"
    exit 1
fi

if [ "$AGENT_LLM_PROVIDER" = "openai" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}ERROR: AGENT_LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not set${NC}"
    exit 1
fi

if [ "$AGENT_LLM_PROVIDER" = "claude" ] && [ -z "$CLAUDE_API_KEY" ]; then
    echo -e "${RED}ERROR: AGENT_LLM_PROVIDER is 'claude' but CLAUDE_API_KEY is not set${NC}"
    exit 1
fi

echo -e "${YELLOW}Stopping existing services...${NC}"

# Kill existing Java backend processes
pkill -f "test-automation-backend-1.0.0.jar" 2>/dev/null || true
pkill -f "test-automation-backend" 2>/dev/null || true

# Kill anything still listening on backend port (8080)
echo -e "${YELLOW}Ensuring port 8080 is free...${NC}"
PIDS_8080=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PIDS_8080" ]; then
    echo "Found process(es) on port 8080: $PIDS_8080"
    # Try graceful stop first
    echo "Sending SIGTERM to: $PIDS_8080"
    echo "$PIDS_8080" | xargs kill 2>/dev/null || true
    sleep 2
    # Force kill if still running
    PIDS_8080_AFTER=$(lsof -ti:8080 2>/dev/null || true)
    if [ -n "$PIDS_8080_AFTER" ]; then
        echo -e "${YELLOW}Port 8080 still in use, force killing: $PIDS_8080_AFTER${NC}"
        echo "$PIDS_8080_AFTER" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
fi

# Kill existing MCP processes
pkill -f "@playwright/mcp" 2>/dev/null || true

# Kill processes on MCP ports
lsof -ti:8931 | xargs kill -9 2>/dev/null || true  # Official MCP port
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # Old custom MCP port

sleep 2

# Wait briefly for 8080 to actually become free (avoids flakey restarts)
for i in {1..10}; do
    if lsof -ti:8080 >/dev/null 2>&1; then
        echo -e "${YELLOW}Waiting for port 8080 to be released... (${i}/10)${NC}"
        sleep 1
    else
        break
    fi
done
if lsof -ti:8080 >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Port 8080 is still in use after attempts to free it. Aborting start.${NC}"
    lsof -nP -iTCP:8080 -sTCP:LISTEN || true
    exit 1
fi

echo -e "${GREEN}Preparing Playwright MCP environment (STDIO mode)...${NC}"

# Create user data directory for persistent browser sessions
USER_DATA_DIR="/tmp/playwright-mcp-userdata"
mkdir -p "$USER_DATA_DIR"

# Ensure Playwright browsers are installed (will be used by STDIO processes)
echo "Checking Playwright installation..."
export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"

# Pre-install @playwright/mcp to speed up first STDIO connection
if ! command -v npx &> /dev/null; then
    echo -e "${RED}✗ npx not found! Please install Node.js${NC}"
    exit 1
fi

echo "Pre-installing @playwright/mcp (will be cached for STDIO processes)..."
npx -y @playwright/mcp@latest --version > /dev/null 2>&1 || true

echo -e "${GREEN}✓ MCP environment ready (STDIO mode: each test spawns its own process)${NC}"

echo -e "${YELLOW}Selector MCP server disabled (we now use Playwright Java directly for deterministic execution).${NC}"

echo -e "${GREEN}Starting Backend Application...${NC}"

# Build backend jar unless explicitly skipped
START_SH_SKIP_BUILD="${START_SH_SKIP_BUILD:-false}"
if [ "$START_SH_SKIP_BUILD" != "true" ]; then
  echo -e "${YELLOW}Building backend (mvn -DskipTests clean package)...${NC}"
  # Use clean to avoid packaging stale .class files produced by IDEs (can cause NoClassDefFoundError on startup)
  (cd . && mvn -q -DskipTests clean package) || {
    echo -e "${RED}ERROR: Backend build failed. Not starting the server.${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ Backend build completed${NC}"
else
  echo -e "${YELLOW}Skipping backend build (START_SH_SKIP_BUILD=true)${NC}"
fi

# Start Java backend
nohup env \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  CLAUDE_API_KEY="$CLAUDE_API_KEY" \
  AGENT_LLM_PROVIDER="$AGENT_LLM_PROVIDER" \
  AGENT_SYSTEM_PROMPT_FILE="$AGENT_SYSTEM_PROMPT_FILE" \
  AGENT_TOOL_SNAPSHOT_MAX_CHARS="$AGENT_TOOL_SNAPSHOT_MAX_CHARS" \
  AGENT_TOOL_RESPONSE_MAX_CHARS="$AGENT_TOOL_RESPONSE_MAX_CHARS" \
  AGENT_CONVERSATION_HISTORY_KEEP="$AGENT_CONVERSATION_HISTORY_KEEP" \
  MCP_PLAYWRIGHT_ENABLED="$MCP_PLAYWRIGHT_ENABLED" \
  java -jar target/test-automation-backend-1.0.0.jar \
  > backend.log 2>&1 &

BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID, port: 8080)${NC}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Services Started Successfully!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}Running Services:${NC}"
echo "  • Official MCP (STDIO)   (per test thread) - enabled: ${MCP_PLAYWRIGHT_ENABLED}"
echo "  • Backend Application    (port 8080) - PID: $BACKEND_PID"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  • LLM Provider:    ${AGENT_LLM_PROVIDER}"
if [ "$AGENT_LLM_PROVIDER" = "openai" ]; then
    echo "  • OpenAI Key:      ${OPENAI_API_KEY:0:20}...${OPENAI_API_KEY: -4}"
elif [ "$AGENT_LLM_PROVIDER" = "claude" ]; then
    echo "  • Claude Key:      ${CLAUDE_API_KEY:0:20}...${CLAUDE_API_KEY: -4}"
fi
echo "  • MCP Server URL:  http://localhost:8931/mcp"
echo "  • Browser:         ${MCP_BROWSER}"
echo "  • System Prompt:   ${AGENT_SYSTEM_PROMPT_FILE}"
echo "  • Snapshot Chars:  ${AGENT_TOOL_SNAPSHOT_MAX_CHARS}"
echo "  • Tool Chars:      ${AGENT_TOOL_RESPONSE_MAX_CHARS}"
echo "  • History Keep:    ${AGENT_CONVERSATION_HISTORY_KEEP} (set -1 to disable)"
echo "  • Action Timeout:  ${MCP_ACTION_TIMEOUT}ms"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  • MCP Server:  tail -f /tmp/mcp-server.log"
echo "  • Backend:     tail -f backend.log"
echo ""
echo -e "${YELLOW}Access:${NC}"
echo "  • Backend API: http://localhost:8080"
echo "  • Health Check: http://localhost:8080/actuator/health"
echo ""
echo -e "${GREEN}To stop services: ./stop-services.sh${NC}"
echo ""
