#!/usr/bin/env node

/**
 * Playwright MCP Server with SSE Transport
 * 
 * This wraps the Playwright MCP server in a Node.js HTTP server with SSE transport
 * for persistent connections and proper session management.
 * 
 * SSE Protocol:
 * - Client connects to GET /sse -> opens SSE stream for responses
 * - Client sends commands via POST /messages -> server processes and responds via SSE
 */

import http from 'http';
import { createConnection } from '@playwright/mcp';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const PORT = process.env.MCP_PORT || 8931;
const HOST = process.env.MCP_HOST || 'localhost';
const BROWSER = process.env.MCP_BROWSER || 'chrome';
const USER_DATA_DIR = process.env.USER_DATA_DIR || '/tmp/playwright-mcp-userdata';

console.log(`Starting Playwright MCP Server with SSE transport...`);
console.log(`  Host: ${HOST}`);
console.log(`  Port: ${PORT}`);
console.log(`  Browser: ${BROWSER}`);
console.log(`  User Data Dir: ${USER_DATA_DIR}`);
console.log(`  SSE Endpoint: http://${HOST}:${PORT}/sse`);
console.log(`  Messages Endpoint: http://${HOST}:${PORT}/messages`);

// Store active MCP connections by session
const connections = new Map();

const server = http.createServer(async (req, res) => {
  // Handle CORS for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // SSE endpoint - client connects here to receive events
  if (req.method === 'GET' && (req.url === '/sse' || req.url?.startsWith('/sse?'))) {
    console.log(`[${new Date().toISOString()}] New SSE connection from ${req.socket.remoteAddress}`);
    
    try {
      // Create a Playwright MCP connection with persistent browser context
      const connection = await createConnection({ 
        browser: { 
          browserName: BROWSER,
          launchOptions: { 
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage'
            ]
          },
          userDataDir: USER_DATA_DIR  // Persistent browser profile
        },
        sharedBrowserContext: true  // CRITICAL: Keep browser context alive
      });
      
      // Create SSE transport - '/messages' is where client will POST commands
      const transport = new SSEServerTransport('/messages', res);
      await connection.connect(transport);
      
      // Generate a session ID and store the connection
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      connections.set(sessionId, { connection, transport });
      
      console.log(`[${new Date().toISOString()}] SSE connection established (session: ${sessionId})`);
      console.log(`[${new Date().toISOString()}] Active connections: ${connections.size}`);
      
      // Handle client disconnect
      req.on('close', () => {
        console.log(`[${new Date().toISOString()}] SSE connection closed (session: ${sessionId})`);
        connections.delete(sessionId);
        console.log(`[${new Date().toISOString()}] Active connections: ${connections.size}`);
      });
      
    } catch (error) {
      console.error('Error creating MCP connection:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
  // Messages endpoint - client POSTs JSON-RPC commands here
  else if (req.method === 'POST' && req.url === '/messages') {
    // SSEServerTransport will handle this automatically through its connection
    // We don't need to manually handle POST requests - the SDK does it
    // Just pass through to the transport
    console.log(`[${new Date().toISOString()}] Received POST to /messages`);
    
    // The SSEServerTransport should have registered handlers for this endpoint
    // If we reach here, it means no transport handled it
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'No active SSE connection to handle this message. Connect to /sse first.' 
    }));
  }
  // Health check endpoint
  else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      transport: 'sse',
      activeConnections: connections.size
    }));
  }
  // Unknown endpoint
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not found. Use GET /sse for SSE stream, POST /messages for commands, or GET /health for status' 
    }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n✓ Playwright MCP Server running at http://${HOST}:${PORT}`);
  console.log(`✓ SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.log(`✓ Messages endpoint: http://${HOST}:${PORT}/messages\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down MCP server...');
  connections.forEach((conn, sessionId) => {
    console.log(`Closing connection: ${sessionId}`);
  });
  connections.clear();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down MCP server...');
  connections.forEach((conn, sessionId) => {
    console.log(`Closing connection: ${sessionId}`);
  });
  connections.clear();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
