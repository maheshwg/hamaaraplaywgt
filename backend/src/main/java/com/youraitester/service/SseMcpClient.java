package com.youraitester.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * SSE-based MCP client that maintains a persistent connection.
 * This solves the session expiration problem by keeping the connection alive.
 */
@Slf4j
public class SseMcpClient {
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String sseUrl;
    private final AtomicInteger requestIdCounter = new AtomicInteger(1);
    private final ConcurrentHashMap<Integer, CompletableFuture<JsonNode>> pendingRequests = new ConcurrentHashMap<>();
    private final AtomicReference<String> sessionId = new AtomicReference<>();
    
    private volatile Call activeCall;
    private volatile boolean connected = false;
    private volatile Thread readerThread;
    
    public SseMcpClient(String mcpBaseUrl) {
        this.sseUrl = mcpBaseUrl.replace("/mcp", "/sse");
        this.httpClient = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS) // No timeout for SSE
            .connectTimeout(30, TimeUnit.SECONDS)
            .build();
        this.objectMapper = new ObjectMapper();
        log.info("SSE MCP Client created for URL: {}", sseUrl);
    }
    
    /**
     * Connect to the SSE endpoint and start listening
     */
    public synchronized void connect() throws IOException {
        if (connected) {
            log.debug("Already connected to SSE endpoint");
            return;
        }
        
        log.info("Connecting to SSE endpoint: {}", sseUrl);
        
        Request request = new Request.Builder()
            .url(sseUrl)
            .header("Accept", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .build();
        
        activeCall = httpClient.newCall(request);
        Response response = activeCall.execute();
        
        if (!response.isSuccessful()) {
            throw new IOException("Failed to connect to SSE: " + response.code() + " " + response.message());
        }
        
        // Capture session ID from response headers
        String responseSessionId = response.header("mcp-session-id");
        if (responseSessionId != null) {
            sessionId.set(responseSessionId);
            log.info("Captured SSE session ID: {}", responseSessionId);
        }
        
        connected = true;
        
        // Start reader thread to process SSE events
        ResponseBody body = response.body();
        if (body == null) {
            throw new IOException("Empty response body from SSE endpoint");
        }
        
        readerThread = new Thread(() -> readSseStream(body), "MCP-SSE-Reader");
        readerThread.setDaemon(true);
        readerThread.start();
        
        log.info("SSE connection established and reader thread started");
    }
    
    /**
     * Send a request over the SSE connection
     */
    public JsonNode sendRequest(String method, Map<String, Object> params) throws IOException {
        return sendRequest(method, params, 30000);
    }
    
    /**
     * Send a request over the SSE connection with timeout
     */
    public JsonNode sendRequest(String method, Map<String, Object> params, long timeoutMs) throws IOException {
        if (!connected) {
            connect();
        }
        
        int id = requestIdCounter.getAndIncrement();
        
        Map<String, Object> request = Map.of(
            "jsonrpc", "2.0",
            "id", id,
            "method", method,
            "params", params != null ? params : Map.of()
        );
        
        CompletableFuture<JsonNode> future = new CompletableFuture<>();
        pendingRequests.put(id, future);
        
        // Send the request as a POST to the endpoint URL
        String requestJson = objectMapper.writeValueAsString(request);
        log.debug("Sending SSE request (id={}): {}", id, method);
        
        // For SSE, we need to POST to the /messages endpoint
        String messagesUrl = sseUrl.replace("/sse", "/messages");
        RequestBody body = RequestBody.create(requestJson, MediaType.get("application/json"));
        
        Request httpRequest = new Request.Builder()
            .url(messagesUrl)
            .post(body)
            .header("Content-Type", "application/json")
            .build();
        
        // Add session ID if we have one
        if (sessionId.get() != null) {
            httpRequest = httpRequest.newBuilder()
                .header("mcp-session-id", sessionId.get())
                .build();
        }
        
        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                pendingRequests.remove(id);
                throw new IOException("Request failed: " + response.code() + " " + response.message());
            }
            
            // Update session ID if returned
            String newSessionId = response.header("mcp-session-id");
            if (newSessionId != null) {
                sessionId.set(newSessionId);
            }
        }
        
        // Wait for response from SSE stream
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            pendingRequests.remove(id);
            throw new IOException("Request timeout after " + timeoutMs + "ms", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            pendingRequests.remove(id);
            throw new IOException("Request interrupted", e);
        } catch (ExecutionException e) {
            pendingRequests.remove(id);
            throw new IOException("Request failed", e.getCause());
        }
    }
    
    /**
     * Read SSE events from the stream
     */
    private void readSseStream(ResponseBody body) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(body.byteStream()))) {
            log.info("SSE reader thread started");
            
            String line;
            StringBuilder eventData = new StringBuilder();
            String eventType = null;
            
            while ((line = reader.readLine()) != null && connected) {
                if (line.startsWith("event:")) {
                    eventType = line.substring(6).trim();
                } else if (line.startsWith("data:")) {
                    eventData.append(line.substring(5).trim());
                } else if (line.isEmpty() && eventData.length() > 0) {
                    // End of event
                    handleSseEvent(eventType, eventData.toString());
                    eventData.setLength(0);
                    eventType = null;
                }
            }
            
            log.info("SSE reader thread ended");
        } catch (IOException e) {
            log.error("Error reading SSE stream", e);
            connected = false;
        }
    }
    
    /**
     * Handle an SSE event
     */
    private void handleSseEvent(String eventType, String data) {
        try {
            log.debug("SSE event received: type={}, data length={}", eventType, data.length());
            
            JsonNode response = objectMapper.readTree(data);
            
            if (response.has("id")) {
                int id = response.get("id").asInt();
                CompletableFuture<JsonNode> future = pendingRequests.remove(id);
                
                if (future != null) {
                    if (response.has("error")) {
                        future.completeExceptionally(
                            new IOException("MCP error: " + response.get("error").toString())
                        );
                    } else {
                        future.complete(response);
                    }
                } else {
                    log.warn("Received response for unknown request ID: {}", id);
                }
            } else {
                log.debug("Received notification or message without ID");
            }
        } catch (Exception e) {
            log.error("Error handling SSE event", e);
        }
    }
    
    /**
     * Initialize the MCP session
     */
    public JsonNode initialize(Map<String, Object> clientInfo) throws IOException {
        Map<String, Object> params = Map.of(
            "protocolVersion", "2024-11-05",
            "capabilities", Map.of(),
            "clientInfo", clientInfo
        );
        
        return sendRequest("initialize", params);
    }
    
    /**
     * Call a tool
     */
    public JsonNode callTool(String toolName, Map<String, Object> arguments) throws IOException {
        Map<String, Object> params = Map.of(
            "name", toolName,
            "arguments", arguments != null ? arguments : Map.of()
        );
        
        return sendRequest("tools/call", params, 60000); // 60s timeout for tool calls
    }
    
    /**
     * Get current session ID
     */
    public String getSessionId() {
        return sessionId.get();
    }
    
    /**
     * Check if connected
     */
    public boolean isConnected() {
        return connected;
    }
    
    /**
     * Disconnect and cleanup
     */
    public synchronized void disconnect() {
        if (!connected) {
            return;
        }
        
        log.info("Disconnecting SSE client");
        connected = false;
        
        if (activeCall != null) {
            activeCall.cancel();
        }
        
        if (readerThread != null) {
            readerThread.interrupt();
        }
        
        pendingRequests.clear();
        sessionId.set(null);
        
        log.info("SSE client disconnected");
    }
}


