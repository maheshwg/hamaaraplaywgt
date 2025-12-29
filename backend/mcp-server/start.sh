#!/bin/bash

echo "🚀 Starting Playwright MCP Server locally..."
echo ""

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Starting server on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm start
