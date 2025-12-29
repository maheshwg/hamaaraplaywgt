package com.youraitester.agent;

import com.youraitester.agent.impl.SimpleTool;
import com.youraitester.service.OfficialPlaywrightMcpService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Executes official Microsoft Playwright MCP tools
 * Bridges between LLM tool calls and official MCP server
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class McpToolExecutor {
    
    private final OfficialPlaywrightMcpService mcpService;
    
    /**
     * Result of tool execution
     */
    @Data
    @Builder
    public static class ToolExecutionResult {
        private String message;
        private String content; // Full content for LLM (e.g., accessibility tree)
        private boolean success;
        private String path; // File path for resources like screenshots
    }
    
    /**
     * Get all available official MCP tools
     */
    public List<LlmProvider.Tool> getAvailableTools() {
        List<LlmProvider.Tool> tools = new ArrayList<>();
        
        // browser_navigate
        tools.add(SimpleTool.builder()
            .name("browser_navigate")
            .description("Navigate to a URL")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "url", Map.of(
                        "type", "string",
                        "description", "The URL to navigate to"
                    )
                ),
                "required", List.of("url")
            ))
            .build());
        
        // snapshot
        tools.add(SimpleTool.builder()
            .name("snapshot")
            .description(
                "Capture an accessibility snapshot of the page. " +
                "Use the optional 'selector' parameter to scope the snapshot " +
                "to a specific container such as 'dialog', 'form', 'main', or 'table'."
            )
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "selector", Map.of(
                        "type", "string",
                        "description", "Optional CSS selector to scope the snapshot"
                    )
                )
            ))
            .build());
        
        // browser_click
        tools.add(SimpleTool.builder()
            .name("browser_click")
            .description("Click an element on the page. Requires element description and ref token from snapshot.")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "element", Map.of(
                        "type", "string",
                        "description", "Human-readable element description (e.g., 'Login button')"
                    ),
                    "ref", Map.of(
                        "type", "string",
                        "description", "Exact target element reference from the page snapshot (e.g., 'e11'). Use the exact value shown in [ref=...] in the snapshot, without any prefix."
                    )
                ),
                "required", List.of("element", "ref")
            ))
            .build());
        
        // browser_type
        tools.add(SimpleTool.builder()
            .name("browser_type")
            .description("Type text into an input field. Requires element description, ref token (from snapshot), and text to type.")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "element", Map.of(
                        "type", "string",
                        "description", "Human-readable element description (e.g., 'Username input')"
                    ),
                    "ref", Map.of(
                        "type", "string",
                        "description", "Exact target element reference from the page snapshot (e.g., 'e11'). Use the exact value shown in [ref=...] without any prefix."
                    ),
                    "text", Map.of(
                        "type", "string",
                        "description", "Text to type into the element"
                    )
                ),
                "required", List.of("element", "ref", "text")
            ))
            .build());
        
        // browser_select_option
        tools.add(SimpleTool.builder()
            .name("browser_select_option")
            .description("Select an option in a dropdown. Requires element description, ref token, and values array.")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "element", Map.of(
                        "type", "string",
                        "description", "Human-readable dropdown description"
                    ),
                    "ref", Map.of(
                        "type", "string",
                        "description", "Exact target element reference from the page snapshot (e.g., 'e11'). Use the exact value shown in [ref=...] without any prefix."
                    ),
                    "values", Map.of(
                        "type", "array",
                        "items", Map.of("type", "string"),
                        "description", "Array of values to select"
                    )
                ),
                "required", List.of("element", "ref", "values")
            ))
            .build());
        
        // browser_press_key
        tools.add(SimpleTool.builder()
            .name("browser_press_key")
            .description("Press a key on the keyboard (e.g., 'Enter', 'Escape', 'ArrowDown')")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "key", Map.of(
                        "type", "string",
                        "description", "Name of the key to press (e.g., 'Enter', 'a')"
                    )
                ),
                "required", List.of("key")
            ))
            .build());
        
        // browser_wait_for
        tools.add(SimpleTool.builder()
            .name("browser_wait_for")
            .description("Wait for text to appear/disappear or for a specified time to pass")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "time", Map.of(
                        "type", "number",
                        "description", "The time to wait in seconds (optional)"
                    ),
                    "text", Map.of(
                        "type", "string",
                        "description", "The text to wait for to appear (optional)"
                    ),
                    "textGone", Map.of(
                        "type", "string",
                        "description", "The text to wait for to disappear (optional)"
                    )
                )
            ))
            .build());
        
        // browser_take_screenshot
        tools.add(SimpleTool.builder()
            .name("browser_take_screenshot")
            .description("Take a screenshot of the current page or a specific element")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of(
                    "element", Map.of(
                        "type", "string",
                        "description", "Human-readable element description (optional)"
                    ),
                    "ref", Map.of(
                        "type", "string",
                        "description", "Exact target element reference from snapshot (e.g., 'e11'). Use exact value from [ref=...] without any prefix. (optional)"
                    ),
                    "fullPage", Map.of(
                        "type", "boolean",
                        "description", "Take full scrollable page screenshot (optional)"
                    )
                )
            ))
            .build());
        
        // browser_navigate_back
        tools.add(SimpleTool.builder()
            .name("browser_navigate_back")
            .description("Go back to the previous page")
            .parametersSchema(Map.of(
                "type", "object",
                "properties", Map.of()
            ))
            .build());
        
        return tools;
    }
    
    /**
     * Execute an MCP tool
     */
    public ToolExecutionResult executeTool(String toolName, Map<String, Object> arguments) {
        log.info("Executing MCP tool: {} with args: {}", toolName, arguments);
        
        try {
            // Backwards-compatible aliasing:
            // - The official Playwright MCP tool name is "browser_snapshot"
            // - We expose it to the LLM as "snapshot" (shorter + stable)
            String mcpToolName = "snapshot".equals(toolName) ? "browser_snapshot" : toolName;
            Map<String, Object> result = mcpService.callTool(mcpToolName, arguments);
            
            String message = result.getOrDefault("message", "").toString();
            String content = result.get("content") != null ? result.get("content").toString() : null;
            String path = result.get("path") != null ? result.get("path").toString() : null;
            boolean success = Boolean.TRUE.equals(result.get("success"));
            
            // Debug logging for screenshot calls
            if ("browser_take_screenshot".equals(toolName)) {
                log.info(">>> MCP screenshot result keys: {}", result.keySet());
                log.info(">>> MCP screenshot success: {}", success);
                log.info(">>> MCP screenshot path: {}", path);
                log.info(">>> MCP screenshot message: {}", message);
                log.info(">>> MCP screenshot content length: {}", content != null ? content.length() : 0);
            }
            
            // For browser_snapshot, truncate message but keep full content
            if (("browser_snapshot".equals(toolName) || "snapshot".equals(toolName)) && content != null && content.length() > 500) {
                message = "Accessibility tree captured (" + content.length() + " chars)";
            }
            
            return ToolExecutionResult.builder()
                .success(success)
                .message(message)
                .content(content)
                .path(path)
                .build();
                
        } catch (Exception e) {
            log.error("Tool execution failed: {}", e.getMessage());
            return ToolExecutionResult.builder()
                .success(false)
                .message("Tool execution failed: " + e.getMessage())
                .content("")
                .build();
        }
    }
}
