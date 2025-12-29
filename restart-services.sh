#!/usr/bin/env bash

set -euo pipefail

# Restart MCP server (port 3000) and backend (port 8080)
# Usage: OPENAI_API_KEY=... ./restart-services.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
MCP_DIR="$BACKEND_DIR/mcp-server"
BACKEND_JAR="$BACKEND_DIR/target/test-automation-backend-1.0.0.jar"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "ERROR: OPENAI_API_KEY is not set. Export it before running."
  echo "Example: export OPENAI_API_KEY='sk-...'"
  exit 1
fi

echo "Stopping MCP server on port 3000 (if any) ..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Stopping backend on port 8080 (if any) ..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

echo "Starting MCP server ..."
(
  cd "$MCP_DIR"
  OPENAI_API_KEY="$OPENAI_API_KEY" node server.js > /tmp/mcp-server.log 2>&1 &
  echo $! > /tmp/mcp-server.pid
)

echo "Waiting for MCP to become healthy ..."
for i in {1..10}; do
  if curl -s "http://localhost:3000/health" | grep -q '"status":"ok"'; then
    echo "MCP server is healthy."
    break
  fi
  sleep 1
done

echo "Building backend JAR (skip tests) ..."
(
  cd "$BACKEND_DIR"
  mvn -q -DskipTests package
)

if [[ ! -f "$BACKEND_JAR" ]]; then
  echo "ERROR: Backend JAR not found at $BACKEND_JAR"
  exit 1
fi

echo "Starting backend service ..."
(
  cd "$BACKEND_DIR"
  MCP_PLAYWRIGHT_ENABLED=true OPENAI_API_KEY="$OPENAI_API_KEY" \
    java -jar "$BACKEND_JAR" > /tmp/backend.log 2>&1 &
  echo $! > /tmp/backend.pid
)

echo "Tail of backend log (first 120 lines):"
sleep 2
sed -n '1,120p' /tmp/backend.log || true

echo "Restart complete. MCP PID: $(cat /tmp/mcp-server.pid), Backend PID: $(cat /tmp/backend.pid)"