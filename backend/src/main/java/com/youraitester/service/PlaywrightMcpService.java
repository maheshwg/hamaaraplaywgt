package com.youraitester.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class PlaywrightMcpService {
    
    @Value("${mcp.playwright.enabled:true}")
    private boolean mcpEnabled;
    
    @Value("${mcp.playwright.server.url:http://localhost:3000}")
    private String mcpServerUrl;
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    public PlaywrightMcpService() {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();
        this.objectMapper = new ObjectMapper();
    }
    
    @PostConstruct
    public void checkMcpServer() {
        if (!mcpEnabled) {
            log.info("Playwright MCP is disabled");
            return;
        }
        
        try {
            log.info("Checking Playwright MCP server at {}...", mcpServerUrl);
            
            Request request = new Request.Builder()
                    .url(mcpServerUrl + "/health")
                    .get()
                    .build();
            
            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    log.info("Playwright MCP server is running at {}", mcpServerUrl);
                } else {
                    log.warn("Playwright MCP server returned status: {}", response.code());
                    mcpEnabled = false;
                }
            }
            
        } catch (Exception e) {
            log.error("Failed to connect to Playwright MCP server at {}. MCP will be disabled.", mcpServerUrl, e);
            mcpEnabled = false;
        }
    }
    
    @PreDestroy
    public void cleanup() {
        log.info("PlaywrightMcpService shutting down (external MCP server will continue running)");
    }
    
    public boolean isEnabled() {
        return mcpEnabled;
    }
    
    public String getMcpServerUrl() {
        return mcpServerUrl;
    }
    
    /**
     * Execute a browser action using MCP with retry logic
     */
    public Map<String, Object> executeAction(String action, Map<String, Object> params) throws IOException {
        if (!isEnabled()) {
            throw new IllegalStateException("Playwright MCP is not enabled or not running");
        }
        
        Map<String, Object> request = new HashMap<>();
        request.put("action", action);
        request.put("params", params);
        
        String jsonRequest = objectMapper.writeValueAsString(request);
        
        RequestBody body = RequestBody.create(
                jsonRequest,
                MediaType.parse("application/json")
        );
        
        Request httpRequest = new Request.Builder()
                .url(mcpServerUrl + "/execute")
                .post(body)
                .build();
        
        // First attempt
        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("MCP request failed: " + response);
            }
            
            String responseBody = response.body().string();
            Map<String, Object> result = objectMapper.readValue(responseBody, Map.class);
            
            // Check if the action failed (element not found, etc.)
            if (result.containsKey("error")) {
                String errorMsg = String.valueOf(result.get("error"));
                
                // Don't retry position verification failures - they're deterministic and won't change
                boolean isPositionVerificationFailure = errorMsg.toLowerCase().contains("position verification failed") ||
                    errorMsg.toLowerCase().contains("not the top right") ||
                    errorMsg.toLowerCase().contains("not the top left") ||
                    errorMsg.toLowerCase().contains("wrong position") ||
                    (errorMsg.toLowerCase().contains("top left") && errorMsg.toLowerCase().contains("top right")) ||
                    (errorMsg.toLowerCase().contains("top right") && errorMsg.toLowerCase().contains("top left"));
                
                if (isPositionVerificationFailure) {
                    log.error("Action '{}' failed with position verification error (not retrying): {}", action, errorMsg);
                    throw new IOException("Action '" + action + "' failed: " + errorMsg);
                }

                // Special handling: sometimes the agent picks a selector like `button.some-wrapper-class`
                // where the class is actually on a wrapper element (component) and the clickable is a descendant button.
                // If the click timed out just "waiting for locator('button.X')" (no resolution), try a structural fallback
                // before sleeping/retrying.
                if ("click".equalsIgnoreCase(action)) {
                    Map<String, Object> fallback = buildClickSelectorFallback(params, errorMsg);
                    if (fallback != null) {
                        String originalSel = String.valueOf(params.get("selector"));
                        String fallbackSel = String.valueOf(fallback.get("selector"));
                        log.warn("Click selector likely incorrect (timed out waiting for locator). Trying fallback selector (direct, no recursion). original='{}' fallback='{}'", originalSel, fallbackSel);
                        try {
                            Map<String, Object> fallbackResult = directExecuteNoRetry("click", fallback);
                            if (fallbackResult != null && !fallbackResult.containsKey("error")) {
                                log.info("Fallback click succeeded. fallbackSelector='{}'", fallbackSel);
                                return fallbackResult;
                            }
                            String fbErr = fallbackResult != null ? String.valueOf(fallbackResult.get("error")) : "unknown";
                            log.warn("Fallback click returned error. fallbackSelector='{}' error={}", fallbackSel, fbErr);
                            // continue with existing retry flow
                        } catch (Exception ex) {
                            log.warn("Fallback click failed. fallbackSelector='{}' error={}", fallbackSel, ex.getMessage());
                            // continue with existing retry flow
                        }
                    }
                }
                
                // Special handling: Angular CDK overlay backdrops often intercept clicks.
                // If we detect this, try to dismiss the backdrop and retry quickly rather than sleeping.
                if ("click".equalsIgnoreCase(action) && isOverlayBackdropInterception(errorMsg)) {
                    log.warn("Action '{}' failed due to overlay backdrop interception. Attempting to dismiss overlays and retrying immediately. Error: {}", action, errorMsg);
                    tryDismissOverlayBackdrops();

                    log.info("Retrying action '{}' after overlay dismissal attempt...", action);
                    try (Response retryResponse = httpClient.newCall(httpRequest).execute()) {
                        if (!retryResponse.isSuccessful()) {
                            throw new IOException("MCP request failed on retry: " + retryResponse);
                        }

                        String retryResponseBody = retryResponse.body().string();
                        Map<String, Object> retryResult = objectMapper.readValue(retryResponseBody, Map.class);

                        if (retryResult.containsKey("error")) {
                            String retryError = String.valueOf(retryResult.get("error"));
                            log.error("Action '{}' still failed after overlay dismissal retry: {}", action, retryError);
                            throw new IOException("Action '" + action + "' failed after overlay dismissal retry: " + retryError);
                        }
                        log.info("Action '{}' succeeded after overlay dismissal retry", action);
                        return retryResult;
                    }
                }

                log.warn("Action '{}' failed on first attempt: {}. Waiting 10 seconds and retrying...", action, errorMsg);
                
                // Wait 10 seconds
                try {
                    Thread.sleep(10000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("Retry interrupted", e);
                }
                
                // Retry once
                log.info("Retrying action '{}'...", action);
                try (Response retryResponse = httpClient.newCall(httpRequest).execute()) {
                    if (!retryResponse.isSuccessful()) {
                        throw new IOException("MCP request failed on retry: " + retryResponse);
                    }
                    
                    String retryResponseBody = retryResponse.body().string();
                    Map<String, Object> retryResult = objectMapper.readValue(retryResponseBody, Map.class);
                    
                    // If still failing after retry, capture screenshot before throwing exception
                    if (retryResult.containsKey("error")) {
                        String retryError = String.valueOf(retryResult.get("error"));
                        log.error("Action '{}' failed after retry: {}", action, retryError);
                        
                        // Capture screenshot to show the failure state (direct HTTP call to avoid recursion)
                        try {
                            Map<String, Object> screenshotRequest = new HashMap<>();
                            screenshotRequest.put("action", "screenshot");
                            screenshotRequest.put("params", new HashMap<>());
                            
                            String screenshotJson = objectMapper.writeValueAsString(screenshotRequest);
                            RequestBody screenshotBody = RequestBody.create(screenshotJson, MediaType.parse("application/json"));
                            Request screenshotHttpRequest = new Request.Builder()
                                    .url(mcpServerUrl + "/execute")
                                    .post(screenshotBody)
                                    .build();
                            
                            try (Response screenshotResponse = httpClient.newCall(screenshotHttpRequest).execute()) {
                                if (screenshotResponse.isSuccessful()) {
                                    String screenshotResponseBody = screenshotResponse.body().string();
                                    Map<String, Object> screenshotResult = objectMapper.readValue(screenshotResponseBody, Map.class);
                                    if (screenshotResult.containsKey("path")) {
                                        String screenshotPath = (String) screenshotResult.get("path");
                                        log.info("Captured failure screenshot: {}", screenshotPath);
                                    }
                                }
                            }
                        } catch (Exception screenshotEx) {
                            log.warn("Failed to capture screenshot on retry failure: {}", screenshotEx.getMessage());
                        }
                        
                        throw new IOException("Action '" + action + "' failed after retry (waited 10s): " + retryError);
                    } else {
                        log.info("Action '{}' succeeded on retry", action);
                    }
                    
                    return retryResult;
                }
            }
            
            return result;
        }
    }

    /**
     * If a click selector is likely wrong (e.g., button.class where class is on wrapper),
     * return a best-effort alternative selector map, otherwise null.
     */
    private Map<String, Object> buildClickSelectorFallback(Map<String, Object> params, String errorMsg) {
        if (params == null) return null;
        Object selObj = params.get("selector");
        if (selObj == null) return null;
        String selector = String.valueOf(selObj).trim();
        if (selector.isEmpty()) return null;

        // Only apply when it looks like we never found the locator.
        // Example: "waiting for locator('button.mat-datepicker-toggle')" with timeout, no "resolved to".
        String lowerErr = errorMsg == null ? "" : errorMsg.toLowerCase();
        if (!lowerErr.contains("waiting for locator('") || lowerErr.contains("locator resolved to")) {
            return null;
        }

        // Pattern: button.some-class (no spaces, no attrs)
        if (selector.startsWith("button.") && !selector.contains(" ") && !selector.contains("[") && !selector.contains("#")) {
            String cls = selector.substring("button.".length());
            if (!cls.isEmpty() && cls.matches("[a-zA-Z0-9_-]+")) {
                // Try wrapper-class descendant button: .cls button
                return Map.of("selector", "." + cls + " button");
            }
        }

        return null;
    }

    private boolean isOverlayBackdropInterception(String errorMsg) {
        if (errorMsg == null) return false;
        String lower = errorMsg.toLowerCase();
        return lower.contains("intercepts pointer events") && lower.contains("cdk-overlay-backdrop");
    }

    /**
     * Best-effort dismissal for common Angular CDK backdrops / overlays.
     * Uses direct MCP calls without retry to avoid recursion.
     */
    private void tryDismissOverlayBackdrops() {
        if (!isEnabled()) return;
        try {
            // Click the visible backdrop (common for dialogs/menus/datepickers)
            directExecuteNoRetry("click", Map.of("selector", "div.cdk-overlay-backdrop-showing"));
        } catch (Exception e) {
            log.debug("Backdrop dismissal (cdk-overlay-backdrop-showing) failed: {}", e.getMessage());
        }
        try {
            // Some versions only have cdk-overlay-backdrop without the -showing class
            directExecuteNoRetry("click", Map.of("selector", "div.cdk-overlay-backdrop"));
        } catch (Exception e) {
            log.debug("Backdrop dismissal (cdk-overlay-backdrop) failed: {}", e.getMessage());
        }
    }

    private Map<String, Object> directExecuteNoRetry(String action, Map<String, Object> params) throws IOException {
        Map<String, Object> request = new HashMap<>();
        request.put("action", action);
        request.put("params", params);

        String jsonRequest = objectMapper.writeValueAsString(request);
        RequestBody body = RequestBody.create(jsonRequest, MediaType.parse("application/json"));
        Request httpRequest = new Request.Builder()
            .url(mcpServerUrl + "/execute")
            .post(body)
            .build();

        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("MCP direct request failed: " + response);
            }
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Map.class);
        }
    }
    
    /**
     * Navigate to a URL
     */
    public void navigate(String url) throws IOException {
        Map<String, Object> params = new HashMap<>();
        params.put("url", url);
        executeAction("navigate", params);
    }
    
    /**
     * Click an element
     */
    public void click(String selector) throws IOException {
        Map<String, Object> params = new HashMap<>();
        params.put("selector", selector);
        executeAction("click", params);
    }
    
    /**
     * Type text into an element
     */
    public void type(String selector, String text) throws IOException {
        Map<String, Object> params = new HashMap<>();
        params.put("selector", selector);
        params.put("text", text);
        executeAction("type", params);
    }

    /**
     * Select an option by value in a <select> element.
     */
    public void select(String selector, String value) throws IOException {
        Map<String, Object> params = new HashMap<>();
        params.put("selector", selector);
        params.put("value", value);
        executeAction("select", params);
    }
    
    /**
     * Take a screenshot
     */
    public String screenshot() throws IOException {
        Map<String, Object> params = new HashMap<>();
        Map<String, Object> result = executeAction("screenshot", params);
        return (String) result.get("path");
    }
    
    /**
     * Get page content
     */
    public String getPageContent() throws IOException {
        Map<String, Object> params = new HashMap<>();
        Map<String, Object> result = executeAction("getContent", params);
        return (String) result.get("content");
    }
    
    /**
     * Reset browser context - clears all cookies, session data, and creates fresh context
     */
    public void resetBrowser() throws IOException {
        Map<String, Object> params = new HashMap<>();
        executeAction("reset", params);
        log.info("Browser context reset - all session data cleared");
    }
}
