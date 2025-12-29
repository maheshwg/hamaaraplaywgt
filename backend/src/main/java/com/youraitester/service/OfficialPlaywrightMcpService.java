package com.youraitester.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.*;

/**
 * Service for interacting with the official Microsoft Playwright MCP server
 * using STDIO transport (the recommended approach - no session timeout issues!).
 * 
 * Each test execution thread spawns its own MCP server process and communicates
 * via stdin/stdout using JSON-RPC 2.0 protocol.
 */
@Service
@Slf4j
public class OfficialPlaywrightMcpService {
    
    @Value("${mcp.playwright.enabled:true}")
    private boolean mcpEnabled;
    
    private final ObjectMapper objectMapper;
    private volatile boolean serviceReady = false;
    
    // Thread-local STDIO client - one MCP process per test execution thread
    private final ThreadLocal<StdioMcpClient> stdioClient = ThreadLocal.withInitial(() -> null);
    private final ThreadLocal<Boolean> sessionInitialized = ThreadLocal.withInitial(() -> false);
    
    public OfficialPlaywrightMcpService() {
        this.objectMapper = new ObjectMapper();
    }
    
    @PostConstruct
    public void initialize() {
        if (!mcpEnabled) {
            log.info("Official Playwright MCP is disabled");
            return;
        }
        
        log.info("Official Playwright MCP service ready (STDIO mode)");
        log.info("Note: MCP processes will be spawned on-demand for each test execution");
        serviceReady = true;
    }
    
    /**
     * Reset the current thread's session state (public for test execution)
     */
    public void resetSession() {
        log.info("Resetting MCP session for thread: {}", Thread.currentThread().getName());
        
        // Disconnect and cleanup existing client
        StdioMcpClient client = stdioClient.get();
        if (client != null) {
            try {
                client.disconnect();
            } catch (Exception e) {
                log.warn("Error disconnecting STDIO client", e);
            }
            stdioClient.remove();
        }
        
        sessionInitialized.set(false);
        log.info("MCP session reset complete");
    }
    
    /**
     * Ensure MCP session is initialized for current thread
     */
    private void ensureSessionInitialized() throws IOException {
        if (sessionInitialized.get()) {
            // Verify process is still alive
            StdioMcpClient client = stdioClient.get();
            if (client != null && client.isConnected()) {
                return; // Already initialized and running
            } else {
                log.warn("MCP process died unexpectedly, reinitializing");
                resetSession();
            }
        }
        
        if (!mcpEnabled) {
            throw new IOException("Playwright MCP is disabled");
        }
        
        try {
            log.info("Initializing MCP session for thread: {} (STDIO mode)", Thread.currentThread().getName());
            
            // Create and connect STDIO client
            StdioMcpClient client = new StdioMcpClient();
            client.connect();
            stdioClient.set(client);
            
            // Send initialize request
            Map<String, Object> clientInfo = Map.of("name", "YourAITester", "version", "1.0");
            JsonNode response = client.initialize(clientInfo);
            
            // Check response
            if (response.has("result")) {
                JsonNode result = response.get("result");
                if (result.has("serverInfo")) {
                    JsonNode serverInfo = result.get("serverInfo");
                    String serverName = serverInfo.has("name") ? serverInfo.get("name").asText() : "unknown";
                    String serverVersion = serverInfo.has("version") ? serverInfo.get("version").asText() : "unknown";
                    log.info("STDIO MCP session initialized successfully: name={}, version={}", serverName, serverVersion);
                }
            }
            
            sessionInitialized.set(true);
            
        } catch (IOException e) {
            log.error("Failed to initialize MCP session", e);
            resetSession();
            throw e;
        }
    }
    
    /**
     * Navigate to a URL
     */
    public Map<String, Object> navigate(String url) throws IOException {
        return callTool("browser_navigate", Map.of("url", url));
    }
    
    /**
     * Take a screenshot
     */
    public Map<String, Object> takeScreenshot(Map<String, Object> options) throws IOException {
        return callTool("browser_take_screenshot", options != null ? options : Map.of());
    }
    
    /**
     * Get accessibility snapshot
     */
    public Map<String, Object> getSnapshot() throws IOException {
        return callTool("browser_snapshot", Map.of());
    }
    
    /**
     * Click an element
     */
    public Map<String, Object> click(String element, String ref, Map<String, Object> options) throws IOException {
        Map<String, Object> args = new HashMap<>();
        args.put("element", element);
        args.put("ref", ref);
        if (options != null) {
            args.putAll(options);
        }
        return callTool("browser_click", args);
    }
    
    /**
     * Type text into an element
     */
    public Map<String, Object> type(String element, String ref, String text, Map<String, Object> options) throws IOException {
        Map<String, Object> args = new HashMap<>();
        args.put("element", element);
        args.put("ref", ref);
        args.put("text", text);
        if (options != null) {
            args.putAll(options);
        }
        return callTool("browser_type", args);
    }
    
    /**
     * Hover over an element
     */
    public Map<String, Object> hover(String element, String ref) throws IOException {
        return callTool("browser_hover", Map.of("element", element, "ref", ref));
    }
    
    /**
     * Select option in dropdown
     */
    public Map<String, Object> selectOption(String element, String ref, List<String> values) throws IOException {
        return callTool("browser_select_option", Map.of("element", element, "ref", ref, "values", values));
    }
    
    /**
     * Press a key
     */
    public Map<String, Object> pressKey(String key) throws IOException {
        return callTool("browser_press_key", Map.of("key", key));
    }
    
    /**
     * Wait for text or time
     */
    public Map<String, Object> waitFor(Map<String, Object> options) throws IOException {
        return callTool("browser_wait_for", options != null ? options : Map.of());
    }
    
    /**
     * Navigate back
     */
    public Map<String, Object> navigateBack() throws IOException {
        return callTool("browser_navigate_back", Map.of());
    }
    
    /**
     * Evaluate JavaScript
     */
    public Map<String, Object> evaluate(String script) throws IOException {
        return callTool("browser_evaluate", Map.of("script", script));
    }

    private Map<String, Object> evaluateJson(String script) throws IOException {
        Map<String, Object> res = evaluate(script);
        Object contentObj = res != null ? res.get("content") : null;
        String content = contentObj != null ? String.valueOf(contentObj).trim() : "";
        if (content.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(content, Map.class);
        } catch (Exception ignored) {
            // Not JSON; return raw
            return Map.of("raw", content);
        }
    }

    /**
     * ---- Selector-based helpers (page-object-free runtime) ----
     *
     * The official MCP click/type tools require a snapshot "ref". For deterministic execution
     * from stored selectors, we use browser_evaluate() to act on DOM nodes directly.
     *
     * NOTE: This works best for same-origin DOM. Cross-origin iframes cannot be accessed.
     */
    public void clickSelector(String selectorType, String selector, String frameSelector) throws IOException {
        Map<String, Object> out = evaluateJson(buildScriptForElement(selectorType, selector, frameSelector,
            "el.scrollIntoView({block:'center', inline:'center'});\n" +
            "el.click();\n" +
            "return JSON.stringify({ ok: true });"
        ));
        if (out.containsKey("ok") && Boolean.FALSE.equals(out.get("ok"))) {
            throw new IOException("clickSelector failed: " + out);
        }
    }

    public void fillSelector(String selectorType, String selector, String frameSelector, String value) throws IOException {
        String valueJson;
        try {
            valueJson = objectMapper.writeValueAsString(value == null ? "" : value);
        } catch (Exception e) {
            valueJson = "\"\"";
        }
        Map<String, Object> out = evaluateJson(buildScriptForElement(selectorType, selector, frameSelector,
            "const v = " + valueJson + ";\n" +
            "el.scrollIntoView({block:'center', inline:'center'});\n" +
            "el.focus();\n" +
            "// React/controlled input safe value set\n" +
            "try {\n" +
            "  const proto = Object.getPrototypeOf(el);\n" +
            "  const desc = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;\n" +
            "  const setter = desc && desc.set ? desc.set : null;\n" +
            "  if (setter) setter.call(el, v);\n" +
            "  else if ('value' in el) el.value = v;\n" +
            "} catch (e) { if ('value' in el) el.value = v; }\n" +
            "const ie = (typeof InputEvent !== 'undefined') ? new InputEvent('input', { bubbles: true }) : new Event('input', { bubbles: true });\n" +
            "el.dispatchEvent(ie);\n" +
            "el.dispatchEvent(new Event('change', { bubbles: true }));\n" +
            "const actual = ('value' in el) ? el.value : null;\n" +
            "return JSON.stringify({ ok: true, value: actual });"
        ));
        if (!out.isEmpty()) {
            log.info("fillSelector result: selectorType='{}' selector='{}' ok={} value='{}'",
                selectorType, selector, out.get("ok"), out.get("value"));
        }
        // Validate best-effort: if element has a value prop, it should match.
        Object actual = out.get("value");
        if (actual != null && value != null && !String.valueOf(actual).equals(value)) {
            throw new IOException("fillSelector did not set expected value. expected='" + value + "' actual='" + actual + "'");
        }
    }

    public void hoverSelector(String selectorType, String selector, String frameSelector) throws IOException {
        evaluate(buildScriptForElement(selectorType, selector, frameSelector,
            "const r = el.getBoundingClientRect();\n" +
            "const cx = r.left + Math.min(5, r.width / 2);\n" +
            "const cy = r.top + Math.min(5, r.height / 2);\n" +
            "el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: cx, clientY: cy }));\n" +
            "el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: cx, clientY: cy }));\n" +
            "el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: cx, clientY: cy }));\n" +
            "return true;"
        ));
    }

    public void selectByValueSelector(String selectorType, String selector, String frameSelector, String value) throws IOException {
        String valueJson;
        try {
            valueJson = objectMapper.writeValueAsString(value == null ? "" : value);
        } catch (Exception e) {
            valueJson = "\"\"";
        }
        Map<String, Object> out = evaluateJson(buildScriptForElement(selectorType, selector, frameSelector,
            "const v = " + valueJson + ";\n" +
            "if (el.tagName && el.tagName.toLowerCase() === 'select') {\n" +
            "  el.value = v;\n" +
            "  el.dispatchEvent(new Event('input', { bubbles: true }));\n" +
            "  el.dispatchEvent(new Event('change', { bubbles: true }));\n" +
            "  return JSON.stringify({ ok: true, value: el.value });\n" +
            "}\n" +
            "// Best-effort for custom dropdowns: try setting value if present\n" +
            "if ('value' in el) { el.value = v; }\n" +
            "el.dispatchEvent(new Event('input', { bubbles: true }));\n" +
            "el.dispatchEvent(new Event('change', { bubbles: true }));\n" +
            "const actual = ('value' in el) ? el.value : null;\n" +
            "return JSON.stringify({ ok: true, value: actual });"
        ));
        if (out.containsKey("ok") && Boolean.FALSE.equals(out.get("ok"))) {
            throw new IOException("selectByValueSelector failed: " + out);
        }
    }

    private String buildScriptForElement(String selectorType, String selector, String frameSelector, String elementActionJs) {
        String st = selectorType != null ? selectorType.trim().toLowerCase(Locale.ROOT) : "css";
        String sel = selector != null ? selector : "";
        String frameSel = frameSelector;

        String selJson;
        String frameJson;
        try {
            selJson = objectMapper.writeValueAsString(sel);
        } catch (Exception e) {
            selJson = "\"\"";
        }
        try {
            frameJson = objectMapper.writeValueAsString(frameSel == null ? "" : frameSel);
        } catch (Exception e) {
            frameJson = "\"\"";
        }

        // Translate a couple of common selector types into something executable
        // - testid: selector is the testid value
        // - css: selector is raw CSS
        // - xpath: selector is XPath
        String resolver =
            "const selectorType = " + objectMapper.valueToTree(st).toString() + ";\n" +
            "const selector = " + selJson + ";\n" +
            "const frameSelector = " + frameJson + ";\n" +
            "const getDoc = () => {\n" +
            "  if (!frameSelector) return document;\n" +
            "  const iframe = document.querySelector(frameSelector);\n" +
            "  if (!iframe) throw new Error('iframe not found: ' + frameSelector);\n" +
            "  const doc = iframe.contentDocument;\n" +
            "  if (!doc) throw new Error('iframe has no accessible contentDocument (cross-origin?)');\n" +
            "  return doc;\n" +
            "};\n" +
            "const doc = getDoc();\n" +
            "const resolveEl = () => {\n" +
            "  if (selectorType === 'testid') {\n" +
            "    return doc.querySelector(\"[data-testid='\" + selector.replace(/'/g, \"\\\\'\") + \"']\");\n" +
            "  }\n" +
            "  if (selectorType === 'xpath') {\n" +
            "    const r = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);\n" +
            "    return r.singleNodeValue;\n" +
            "  }\n" +
            "  // default css\n" +
            "  return doc.querySelector(selector);\n" +
            "};\n" +
            "const el = resolveEl();\n" +
            "if (!el) throw new Error('element not found for ' + selectorType + ':' + selector);\n";

        return "(function() {\n" + resolver + "\n" + elementActionJs + "\n})();";
    }
    
    /**
     * Generic tool call method with retry logic (public for McpToolExecutor)
     */
    public Map<String, Object> callTool(String toolName, Map<String, Object> arguments) throws IOException {
        return callToolWithRetry(toolName, arguments, false);
    }
    
    /**
     * Call a tool with automatic retry on session errors
     */
    private Map<String, Object> callToolWithRetry(String toolName, Map<String, Object> arguments, boolean isRetry) throws IOException {
        ensureSessionInitialized();
        
        StdioMcpClient client = stdioClient.get();
        if (client == null || !client.isConnected()) {
            throw new IOException("MCP STDIO client not connected");
        }
        
        log.info("Calling MCP tool via STDIO: {}", toolName);
        
        JsonNode response;
        try {
            response = client.callTool(toolName, arguments);
        } catch (IOException e) {
            String errorMsg = e.getMessage();
            log.error("MCP tool call failed: {}", errorMsg);
            
            // If process died, retry once
            if (!isRetry && !client.isConnected()) {
                log.warn("MCP process died, resetting and retrying: {}", errorMsg);
                resetSession();
                return callToolWithRetry(toolName, arguments, true);
            }
            
            throw e;
        }
        
        // Parse response
        if (response.has("error")) {
            JsonNode error = response.get("error");
            String errorMsg = error.has("message") ? error.get("message").asText() : error.toString();
            log.error("MCP tool call returned error: {}", errorMsg);
            throw new IOException("MCP error: " + errorMsg);
        }
        
        if (!response.has("result")) {
            log.warn("MCP tool call response has no result field");
            return Map.of("success", true, "message", "Operation completed successfully");
        }
        
        JsonNode result = response.get("result");
        
        // Extract content from result
        if (!result.has("content") || !result.get("content").isArray()) {
            log.info("MCP tool call response: no result field");
            log.info("MCP response keys: {}", result.fieldNames());
            log.info(">>> Empty or missing result from MCP (successful operation with no return value like click)");
            return Map.of("success", true, "message", "Operation completed successfully");
        }
        
        JsonNode contentArray = result.get("content");
        log.info("MCP tool call response received with {} content blocks", contentArray.size());
        log.info("MCP response keys: {}", result.fieldNames());
        
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("success", true);
        resultMap.put("path", "NOT_SET"); // Will be overwritten if screenshot found
        
        // log.info(">>> Processing {} content blocks from MCP response", contentArray.size());
        
        StringBuilder combinedText = new StringBuilder();
        
        for (int i = 0; i < contentArray.size(); i++) {
            JsonNode contentBlock = contentArray.get(i);
            String type = contentBlock.has("type") ? contentBlock.get("type").asText() : "unknown";
            
            // log.info(">>> Content block {}: type={}", i, type);
            
            if ("text".equals(type) && contentBlock.has("text")) {
                String text = contentBlock.get("text").asText();
                combinedText.append(text).append("\n");
                
                // Check if this text contains a screenshot path in markdown format
                // log.info(">>> Checking text for screenshot path. Contains [Screenshot: {}, Contains ](/: {}", 
                //     text.contains("Screenshot"), text.contains("](/"));
                
                if (text.contains("Screenshot") && text.contains("](/")) {
                    int start = text.indexOf("](/") + 2;  // Position right after "(", so we include the "/"
                    int end = text.indexOf(")", start);
                    if (start > 1 && end > start) {
                        log.info(">>> Path extraction indices: start={}, end={}", start, end);
                        String screenshotPath = text.substring(start, end);
                        
                        // Ensure path starts with / (absolute path)
                        if (!screenshotPath.startsWith("/")) {
                            screenshotPath = "/" + screenshotPath;
                            log.info(">>> Added leading slash to path: {}", screenshotPath);
                        }
                        
                        resultMap.put("path", screenshotPath);
                        log.info(">>> ✓ EXTRACTED SCREENSHOT PATH from markdown: {}", screenshotPath);
                    } else {
                        log.info(">>> Path extraction failed: invalid indices");
                    }
                } else {
                    log.info(">>> No screenshot markdown pattern found in text");
                }
            } else if ("image".equals(type)) {
                log.info(">>> Skipping image content block (base64 data is too large for LLM)");
            } else if ("resource".equals(type) && contentBlock.has("resource")) {
                JsonNode resource = contentBlock.get("resource");
                if (resource.has("uri")) {
                    String uri = resource.get("uri").asText();
                    resultMap.put("resourceUri", uri);
                    log.info(">>> Resource URI: {}", uri);
                }
            }
        }
        
        resultMap.put("message", combinedText.toString().trim());
        resultMap.put("content", combinedText.toString().trim());
        
        // log.info(">>> Final resultMap keys: {}, path value: '{}'", resultMap.keySet(), resultMap.get("path"));
        
        return resultMap;
    }
    
    @PreDestroy
    public void cleanup() {
        log.info("Cleaning up Playwright MCP service");
        resetSession();
    }
    
    public boolean isReady() {
        return serviceReady && mcpEnabled;
    }
}
