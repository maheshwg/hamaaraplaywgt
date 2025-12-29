package com.youraitester.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * STDIO-based MCP client for Playwright.
 * Spawns a Node process running @playwright/mcp and communicates via stdin/stdout.
 * This is the recommended approach from Microsoft - no session timeout issues!
 */
@Slf4j
public class StdioMcpClient {

    private final ObjectMapper objectMapper;
    private final AtomicLong requestIdCounter = new AtomicLong(1);
    
    private Process mcpProcess;
    private BufferedWriter processStdin;
    private BufferedReader processStdout;
    private BufferedReader processStderr;
    
    private final BlockingQueue<JsonNode> responseQueue = new LinkedBlockingQueue<>();
    private final Map<Long, CompletableFuture<JsonNode>> pendingRequests = new ConcurrentHashMap<>();
    private Thread stdoutReaderThread;
    private Thread stderrReaderThread;
    
    private volatile boolean isRunning = false;

    public StdioMcpClient() {
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Start the MCP server process and connect via STDIO
     */
    public void connect() throws IOException {
        if (isRunning) {
            log.warn("MCP process already running");
            return;
        }

        log.info("Starting Playwright MCP server via STDIO...");

        // Build the command to spawn the MCP server
        // --snapshot-mode=incremental: Critical for reducing token usage!
        ProcessBuilder pb = new ProcessBuilder(
            "npx",
            "-y",
            "@playwright/mcp@latest",
            "--snapshot-mode", "incremental"
        );
        
        // Set environment variables
        Map<String, String> env = pb.environment();
        String homeDir = System.getProperty("user.home");
        env.put("PLAYWRIGHT_BROWSERS_PATH", homeDir + "/.cache/ms-playwright");
        env.put("USER_DATA_DIR", "/tmp/playwright-mcp-userdata");
        
        pb.redirectErrorStream(false); // Keep stderr separate for debugging
        
        try {
            mcpProcess = pb.start();
            
            // Get streams
            processStdin = new BufferedWriter(new OutputStreamWriter(mcpProcess.getOutputStream()));
            processStdout = new BufferedReader(new InputStreamReader(mcpProcess.getInputStream()));
            processStderr = new BufferedReader(new InputStreamReader(mcpProcess.getErrorStream()));
            
            isRunning = true;
            
            // Start reader threads
            startStdoutReaderThread();
            startStderrReaderThread();
            
            log.info("✓ MCP server process started (PID: {})", mcpProcess.pid());
            
        } catch (IOException e) {
            log.error("Failed to start MCP server process", e);
            cleanup();
            throw e;
        }
    }

    /**
     * Start thread to read responses from stdout
     */
    private void startStdoutReaderThread() {
        stdoutReaderThread = new Thread(() -> {
            log.info("STDOUT reader thread started");
            try {
                String line;
                while (isRunning && (line = processStdout.readLine()) != null) {
                    log.debug("Received from MCP stdout: {}", line);
                    
                    try {
                        JsonNode response = objectMapper.readTree(line);
                        
                        // Match response to pending request
                        if (response.has("id") && response.get("id").isIntegralNumber()) {
                            long responseId = response.get("id").asLong();
                            CompletableFuture<JsonNode> future = pendingRequests.remove(responseId);
                            
                            if (future != null) {
                                if (response.has("error")) {
                                    JsonNode error = response.get("error");
                                    String errorMsg = error.has("message") ? error.get("message").asText() : error.toString();
                                    future.completeExceptionally(new IOException("MCP error: " + errorMsg));
                                } else {
                                    future.complete(response);
                                }
                            } else {
                                log.warn("Received response for unknown request ID: {}", responseId);
                            }
                        } else {
                            log.warn("Received message without valid ID: {}", line);
                        }
                        
                    } catch (IOException e) {
                        log.error("Error parsing JSON from MCP stdout: {}", line, e);
                    }
                }
            } catch (IOException e) {
                if (isRunning) {
                    log.error("Error reading from MCP stdout", e);
                }
            }
            log.info("STDOUT reader thread exiting");
        }, "MCP-STDOUT-Reader");
        
        stdoutReaderThread.setDaemon(true);
        stdoutReaderThread.start();
    }

    /**
     * Start thread to read error output from stderr
     */
    private void startStderrReaderThread() {
        stderrReaderThread = new Thread(() -> {
            log.info("STDERR reader thread started");
            try {
                String line;
                while (isRunning && (line = processStderr.readLine()) != null) {
                    log.debug("MCP stderr: {}", line);
                }
            } catch (IOException e) {
                if (isRunning) {
                    log.error("Error reading from MCP stderr", e);
                }
            }
            log.info("STDERR reader thread exiting");
        }, "MCP-STDERR-Reader");
        
        stderrReaderThread.setDaemon(true);
        stderrReaderThread.start();
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
            "arguments", arguments
        );
        return sendRequest("tools/call", params);
    }

    /**
     * Send a JSON-RPC request via stdin and wait for response via stdout
     */
    private JsonNode sendRequest(String method, Map<String, Object> params) throws IOException {
        if (!isRunning || mcpProcess == null || !mcpProcess.isAlive()) {
            throw new IOException("MCP process not running");
        }

        long requestId = requestIdCounter.getAndIncrement();
        
        ObjectNode jsonRpcRequest = objectMapper.createObjectNode();
        jsonRpcRequest.put("jsonrpc", "2.0");
        jsonRpcRequest.put("id", requestId);
        jsonRpcRequest.put("method", method);
        jsonRpcRequest.set("params", objectMapper.valueToTree(params));

        String jsonRequest = objectMapper.writeValueAsString(jsonRpcRequest);
        
        log.debug("Sending to MCP stdin: {}", jsonRequest);

        CompletableFuture<JsonNode> future = new CompletableFuture<>();
        pendingRequests.put(requestId, future);

        try {
            // Write request to stdin
            synchronized (processStdin) {
                processStdin.write(jsonRequest);
                processStdin.newLine();
                processStdin.flush();
            }

            // Wait for response (with timeout)
            JsonNode response = future.get(120, TimeUnit.SECONDS);
            
            log.debug("Received response for request {}: {}", requestId, 
                response.toString().substring(0, Math.min(200, response.toString().length())));
            
            return response;
            
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            pendingRequests.remove(requestId);
            throw new IOException("Failed to get response for request " + requestId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Disconnect and cleanup
     */
    public void disconnect() {
        log.info("Disconnecting MCP STDIO client");
        isRunning = false;
        
        // Close streams
        try {
            if (processStdin != null) {
                processStdin.close();
            }
        } catch (IOException e) {
            log.warn("Error closing stdin", e);
        }
        
        try {
            if (processStdout != null) {
                processStdout.close();
            }
        } catch (IOException e) {
            log.warn("Error closing stdout", e);
        }
        
        try {
            if (processStderr != null) {
                processStderr.close();
            }
        } catch (IOException e) {
            log.warn("Error closing stderr", e);
        }
        
        // Wait for threads to exit
        if (stdoutReaderThread != null && stdoutReaderThread.isAlive()) {
            try {
                stdoutReaderThread.join(2000);
            } catch (InterruptedException e) {
                log.warn("Interrupted waiting for stdout thread", e);
            }
        }
        
        if (stderrReaderThread != null && stderrReaderThread.isAlive()) {
            try {
                stderrReaderThread.join(2000);
            } catch (InterruptedException e) {
                log.warn("Interrupted waiting for stderr thread", e);
            }
        }
        
        // Destroy process
        if (mcpProcess != null && mcpProcess.isAlive()) {
            log.info("Destroying MCP process (PID: {})", mcpProcess.pid());
            mcpProcess.destroy();
            
            try {
                boolean exited = mcpProcess.waitFor(5, TimeUnit.SECONDS);
                if (!exited) {
                    log.warn("MCP process did not exit gracefully, force killing");
                    mcpProcess.destroyForcibly();
                }
            } catch (InterruptedException e) {
                log.warn("Interrupted waiting for process to exit", e);
                mcpProcess.destroyForcibly();
            }
        }
        
        cleanup();
        log.info("MCP STDIO client disconnected");
    }

    private void cleanup() {
        pendingRequests.clear();
        responseQueue.clear();
        mcpProcess = null;
        processStdin = null;
        processStdout = null;
        processStderr = null;
    }

    public boolean isConnected() {
        return isRunning && mcpProcess != null && mcpProcess.isAlive();
    }
}

