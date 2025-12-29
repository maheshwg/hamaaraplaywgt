package com.youraitester.service;

import com.youraitester.dto.InterpretedStep;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import com.theokanning.openai.service.OpenAiService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Enhanced service that uses OpenAI to interpret natural language test steps
 * and leverages Playwright MCP for intelligent browser automation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAiMcpService {
    
    private final PlaywrightMcpService playwrightMcpService;
    
    @Value("${openai.api.key}")
    private String openAiApiKey;
    
    @Value("${openai.model:gpt-4}")
    private String model;
    
    /**
     * Use OpenAI to interpret a natural language instruction and determine the best
     * Playwright action to take
     */
    public InterpretedStep interpretWithAI(String instruction, String pageContext) {
        try {
            if (openAiApiKey == null || openAiApiKey.equals("your-api-key-here")) {
                log.warn("OpenAI API key not configured. Using fallback interpretation.");
                return fallbackInterpretation(instruction);
            }
            
            OpenAiService service = new OpenAiService(openAiApiKey);
            
            String systemPrompt = """
                You are a test automation expert. Convert natural language test instructions into browser actions.
                
                Available actions:
                - navigate: Go to a URL
                - click: Click an element
                - type: Type text into an input field
                - select: Select an option from dropdown
                - assert: Verify element visibility or text content
                - wait: Wait for a specified time
                - screenshot: Take a screenshot
                
                Respond ONLY with valid JSON in this exact format:
                {
                  "action": "click|type|navigate|select|assert|wait|screenshot",
                  "selector": "CSS selector or element description",
                  "value": "text or URL (if applicable)"
                }
                
                For selectors:
                - Use descriptive text like "button with text 'Login'" instead of complex CSS
                - Playwright MCP will intelligently find the element
                - Be specific but natural (e.g., "email input field", "submit button")
                """;
            
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt));
            
            String userPrompt = "Instruction: " + instruction;
            if (pageContext != null && !pageContext.isEmpty()) {
                userPrompt += "\n\nPage context: " + pageContext.substring(0, Math.min(500, pageContext.length()));
            }
            
            messages.add(new ChatMessage(ChatMessageRole.USER.value(), userPrompt));
            
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model(model)
                    .messages(messages)
                    .temperature(0.1)
                    .maxTokens(200)
                    .build();
            
            String response = service.createChatCompletion(request)
                    .getChoices()
                    .get(0)
                    .getMessage()
                    .getContent();
            
            log.info("OpenAI interpretation: {}", response);
            
            return parseAIResponse(response);
            
        } catch (Exception e) {
            log.error("Failed to interpret with OpenAI", e);
            return fallbackInterpretation(instruction);
        }
    }
    
    /**
     * Execute a test step using Playwright MCP
     */
    public Map<String, Object> executeStepWithMcp(InterpretedStep step) throws Exception {
        if (!playwrightMcpService.isEnabled()) {
            throw new IllegalStateException("Playwright MCP is not enabled");
        }
        
        String action = step.getAction().toLowerCase();
        Map<String, Object> params = new java.util.HashMap<>();
        
        switch (action) {
            case "navigate":
                params.put("url", step.getValue());
                return playwrightMcpService.executeAction("navigate", params);
                
            case "click":
                params.put("selector", step.getSelector());
                return playwrightMcpService.executeAction("click", params);
                
            case "type":
                params.put("selector", step.getSelector());
                params.put("text", step.getValue());
                return playwrightMcpService.executeAction("type", params);
                
            case "select":
                params.put("selector", step.getSelector());
                params.put("value", step.getValue());
                return playwrightMcpService.executeAction("select", params);
                
            case "assert":
                // Lightweight pre-assert wait to reduce race conditions, especially for inventory page
                // We poll the page content briefly for common markers before asserting text like "Products".
                try {
                    boolean needsInventoryWait = false;
                    String expectedText = step.getValue();
                    String selector = step.getSelector();

                    // Heuristic: wait if asserting "Products" or inventory markers likely to appear after navigation/login
                    if (expectedText != null && expectedText.trim().equalsIgnoreCase("Products")) {
                        needsInventoryWait = true;
                    }
                    if (!needsInventoryWait && selector != null) {
                        String sel = selector.trim().toLowerCase();
                        if (sel.contains("inventory") || sel.contains("title")) {
                            needsInventoryWait = true;
                        }
                    }

                    if (needsInventoryWait) {
                        // Poll up to ~5 seconds, 500ms interval
                        final int maxAttempts = 10;
                        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                            String content = null;
                            try {
                                content = playwrightMcpService.getPageContent();
                            } catch (Exception e) {
                                log.debug("getPageContent failed during pre-assert wait (attempt {}): {}", attempt, e.getMessage());
                            }

                            boolean markersReady = false;
                            if (content != null) {
                                String lc = content.toLowerCase();
                                // Common inventory page readiness markers
                                if (lc.contains("products") || lc.contains("inventory_container") || lc.contains("class=\"title\"")) {
                                    markersReady = true;
                                }
                            }

                            if (markersReady) {
                                log.debug("Pre-assert wait: inventory markers present (attempt {})", attempt);
                                break; // proceed to assert
                            }
                            if (attempt < maxAttempts) {
                                try { Thread.sleep(500); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                            }
                        }
                    }
                } catch (Exception e) {
                    // Non-fatal: continue to assert even if pre-wait fails
                    log.debug("Pre-assert wait heuristic failed: {}", e.getMessage());
                }
                params.put("selector", step.getSelector());
                return playwrightMcpService.executeAction("assert", params);
                
            case "wait":
                params.put("timeout", step.getValue() != null ? Integer.parseInt(step.getValue()) : 2000);
                return playwrightMcpService.executeAction("wait", params);
                
            case "screenshot":
                return playwrightMcpService.executeAction("screenshot", params);
                
            default:
                throw new IllegalArgumentException("Unknown action: " + action);
        }
    }
    
    private InterpretedStep parseAIResponse(String response) {
        try {
            // Clean up response - remove markdown code blocks if present
            String json = response.trim();
            if (json.startsWith("```json")) {
                json = json.substring(7);
            }
            if (json.startsWith("```")) {
                json = json.substring(3);
            }
            if (json.endsWith("```")) {
                json = json.substring(0, json.length() - 3);
            }
            json = json.trim();
            
            // Simple JSON parsing (in production, use Jackson properly)
            InterpretedStep step = new InterpretedStep();
            
            if (json.contains("\"action\"")) {
                String action = extractJsonValue(json, "action");
                step.setAction(action);
            }
            
            if (json.contains("\"selector\"")) {
                String selector = extractJsonValue(json, "selector");
                step.setSelector(selector);
            }
            
            if (json.contains("\"value\"")) {
                String value = extractJsonValue(json, "value");
                step.setValue(value);
            }
            
            return step;
            
        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", response, e);
            InterpretedStep step = new InterpretedStep();
            step.setAction("wait");
            step.setValue("1000");
            return step;
        }
    }
    
    private String extractJsonValue(String json, String key) {
        int start = json.indexOf("\"" + key + "\"");
        if (start == -1) return null;
        
        start = json.indexOf(":", start) + 1;
        start = json.indexOf("\"", start) + 1;
        int end = json.indexOf("\"", start);
        
        if (end == -1) return null;
        return json.substring(start, end).trim();
    }
    
    private InterpretedStep fallbackInterpretation(String instruction) {
        InterpretedStep step = new InterpretedStep();
        String lower = instruction.toLowerCase();
        
        if (lower.contains("click")) {
            step.setAction("click");
            step.setSelector("button");
        } else if (lower.contains("type") || lower.contains("enter")) {
            step.setAction("type");
            step.setSelector("input");
        } else if (lower.contains("go to") || lower.contains("navigate") || lower.contains("visit")) {
            step.setAction("navigate");
        } else if (lower.contains("select") || lower.contains("choose")) {
            step.setAction("select");
        } else if (lower.contains("wait")) {
            step.setAction("wait");
            step.setValue("2000");
        } else {
            step.setAction("assert");
        }
        
        log.info("Fallback interpretation: {} -> {}", instruction, step);
        return step;
    }
}
