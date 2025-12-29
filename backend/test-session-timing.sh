#!/bin/bash

echo "=== Initialize session ==="
RESPONSE=$(curl -si -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

SESSION_ID=$(echo "$RESPONSE" | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r\n')
echo "Session ID: [$SESSION_ID]"

echo ""
echo "=== Request 2: Navigate ==="
curl -s -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://www.saucedemo.com"}}}' | grep -o "Page URL:[^,]*"

echo ""
echo "=== Wait 8 seconds (mimicking our test delay) ==="
sleep 8

echo ""
echo "=== Request 3: Snapshot (should still work) ==="
RESULT=$(curl -s -X POST http://localhost:8931/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_snapshot","arguments":{}}}')

if echo "$RESULT" | grep -q "Session not found"; then
  echo "❌ SESSION LOST!"
  echo "$RESULT"
else
  echo "✅ Session still valid"
  echo "$RESULT" | grep -o "Page URL:[^,]*"
fi



