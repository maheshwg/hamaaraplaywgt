#!/bin/bash

# Test MCP server session persistence

echo "=== Step 1: Initialize session ==="
RESPONSE=$(curl -si -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r\n')
echo "Session ID: [$SESSION_ID]"

echo ""
echo "=== Step 2: Navigate (immediate) ==="
curl -s -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://www.saucedemo.com"}}}' \
  | head -5

echo ""
echo "=== Step 3: Snapshot (after 3 second delay) ==="
sleep 3
curl -s -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_snapshot","arguments":{}}}' \
  | head -5



