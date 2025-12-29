package com.youraitester.agent.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.youraitester.agent.LlmProvider;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * OpenAI implementation of LlmProvider using raw HTTP requests
 * This allows us to properly set function parameters schemas
 */
@Component("openai")
@Slf4j
public class OpenAiProvider implements LlmProvider {
    
    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    
    @Value("${openai.api.key:}")
    private String apiKey;
    
    @Value("${openai.model:gpt-4}")
    private String model;
    
    @Value("${openai.timeout:60}")
    private int timeoutSeconds;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final OkHttpClient httpClient;
    
    public OpenAiProvider() {
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build();
    }
    
    @PostConstruct
    public void init() {
        log.info("OpenAI Provider initialized. API key present: {}, isAvailable: {}", 
            apiKey != null && !apiKey.isEmpty(), isAvailable());
        if (apiKey != null && !apiKey.isEmpty()) {
            log.debug("OpenAI API key length: {}, starts with: {}", apiKey.length(), apiKey.substring(0, Math.min(10, apiKey.length())));
        }
    }
    
    @Override
    public AgentResponse executeWithTools(List<Message> messages, List<Tool> tools, int maxIterations) {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenAI provider is not configured");
        }
        
        log.info("OpenAI: Executing with {} tools, max {} iterations", tools.size(), maxIterations);
        
        // Log registered tools with schemas
        for (Tool tool : tools) {
            log.debug("OpenAI: Registered function {} with schema: {}", tool.getName(), tool.getParametersSchema());
        }
        
        int iteration = 0;
        SimpleAgentResponse lastResponse = null;
        
        while (iteration < maxIterations) {
            iteration++;
            log.debug("OpenAI: Iteration {}/{}", iteration, maxIterations);
            
            try {
                // Build request JSON
                ObjectNode requestJson = buildRequestJson(messages, tools);
                String requestBody = objectMapper.writeValueAsString(requestJson);
                
                // Log token estimates
                int estimatedTokens = estimateTokenCount(requestBody);
                log.info("OpenAI: Request iteration {}, estimated tokens: {}", iteration, estimatedTokens);
                log.info("OpenAI: Message count: {}, last 3 messages: {}", 
                    messages.size(), 
                    getLastNMessagesSummary(messages, 3));
                
                // Log full request in debug mode
                if (log.isDebugEnabled()) {
                    log.debug("OpenAI: Full request body: {}", requestBody);
                } else {
                    // In INFO mode, log a truncated version
                    String truncated = requestBody.length() > 5000 ? 
                        requestBody.substring(0, 5000) + "... (truncated, total length: " + requestBody.length() + ")" : 
                        requestBody;
                    log.info("OpenAI: Request preview: {}", truncated);
                }
                
                // Execute HTTP request
                Request request = new Request.Builder()
                    .url(OPENAI_API_URL)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(requestBody, JSON))
                    .build();
                
                Response response = httpClient.newCall(request).execute();
                String responseBody = response.body().string();
                
                if (!response.isSuccessful()) {
                    log.error("OpenAI API error: {} - {}", response.code(), responseBody);
                    throw new RuntimeException("OpenAI API request failed: " + response.code());
                }
                
                log.debug("OpenAI: Response: {}", responseBody);
                
                // Parse response
                JsonNode responseJson = objectMapper.readTree(responseBody);
                JsonNode choice = responseJson.get("choices").get(0);
                JsonNode messageNode = choice.get("message");
                
                // Check if we have tool calls
                JsonNode toolCallsNode = messageNode.get("tool_calls");
                
                if (toolCallsNode != null && toolCallsNode.isArray() && toolCallsNode.size() > 0) {
                    JsonNode toolCall = toolCallsNode.get(0);
                    JsonNode function = toolCall.get("function");
                    String functionName = function.get("name").asText();
                    String argumentsJson = function.get("arguments").asText();
                    
                    log.debug("OpenAI: Function call requested: {}", functionName);
                    log.debug("OpenAI: Arguments JSON: {}", argumentsJson);
                    
                    // Parse arguments
                    @SuppressWarnings("unchecked")
                    Map<String, Object> arguments = new HashMap<>();
                    try {
                        if (argumentsJson != null && !argumentsJson.isEmpty()) {
                            arguments = objectMapper.readValue(argumentsJson, Map.class);
                        }
                    } catch (Exception e) {
                        log.error("Failed to parse function arguments", e);
                    }
                    
                    log.debug("OpenAI: Parsed arguments: {}", arguments);
                    
                    // Build tool call object for response
                    SimpleToolCall toolCallObj = SimpleToolCall.builder()
                        .id(toolCall.get("id").asText())
                        .name(functionName)
                        .arguments(arguments)
                        .build();
                    
                    // Add assistant message to history with tool_calls metadata
                    Map<String, Object> metadata = new HashMap<>();
                    // Store the raw tool_calls array from OpenAI response
                    List<Map<String, Object>> toolCallsList = new ArrayList<>();
                    Map<String, Object> toolCallMap = new HashMap<>();
                    toolCallMap.put("id", toolCall.get("id").asText());
                    toolCallMap.put("type", "function");
                    Map<String, Object> functionMap = new HashMap<>();
                    functionMap.put("name", functionName);
                    functionMap.put("arguments", argumentsJson);
                    toolCallMap.put("function", functionMap);
                    toolCallsList.add(toolCallMap);
                    metadata.put("tool_calls", toolCallsList);
                    
                    messages.add(SimpleMessage.builder()
                        .role("assistant")
                        .content(messageNode.has("content") ? messageNode.get("content").asText() : null)
                        .metadata(metadata)
                        .build());
                    
                    // Return to caller to execute the tool
                    lastResponse = SimpleAgentResponse.builder()
                        .content(messageNode.has("content") ? messageNode.get("content").asText() : null)
                        .toolCalls(List.of(toolCallObj))
                        .complete(false)
                        .finishReason("tool_calls")
                .build();
                    
                    return lastResponse;
                    
                } else {
                    // No tool calls - task complete
                    String finishReason = choice.get("finish_reason").asText();
                    String content = messageNode.has("content") ? messageNode.get("content").asText() : "";
                    
                    log.debug("OpenAI: Task complete. Finish reason: {}", finishReason);
                    
                    lastResponse = SimpleAgentResponse.builder()
                        .content(content)
                        .toolCalls(new ArrayList<>())
                        .complete(true)
                        .finishReason(finishReason)
                        .build();
                    
                    return lastResponse;
                }
                
            } catch (IOException e) {
                log.error("OpenAI API request failed", e);
                throw new RuntimeException("OpenAI API request failed", e);
            }
        }
        
        // Max iterations reached
        log.warn("OpenAI: Max iterations ({}) reached", maxIterations);
        return SimpleAgentResponse.builder()
            .content("Maximum iterations reached")
            .complete(true)
            .finishReason("length")
            .build();
    }
    
    private ObjectNode buildRequestJson(List<Message> messages, List<Tool> tools) {
        ObjectNode requestJson = objectMapper.createObjectNode();
        requestJson.put("model", model);
        requestJson.put("temperature", 0.0);
        
        // Add messages
        ArrayNode messagesArray = requestJson.putArray("messages");
        for (Message msg : messages) {
            ObjectNode messageNode = messagesArray.addObject();
            messageNode.put("role", msg.getRole());
            if (msg.getContent() != null) {
                messageNode.put("content", msg.getContent());
            }
            
            // Handle tool result messages
            if ("tool".equals(msg.getRole())) {
                String toolCallId = msg.getToolCallId();
                if (toolCallId != null) {
                    messageNode.put("tool_call_id", toolCallId);
                }
            }
            
            // Handle assistant messages with tool calls
            if ("assistant".equals(msg.getRole()) && msg.getMetadata() != null && msg.getMetadata().containsKey("tool_calls")) {
                // Add tool_calls array to assistant message
                Object toolCallsObj = msg.getMetadata().get("tool_calls");
                if (toolCallsObj != null) {
                    try {
                        String toolCallsJson = objectMapper.writeValueAsString(toolCallsObj);
                        JsonNode toolCallsNode = objectMapper.readTree(toolCallsJson);
                        messageNode.set("tool_calls", toolCallsNode);
                    } catch (Exception e) {
                        log.error("Failed to add tool_calls to assistant message", e);
                    }
                }
            }
        }
        
        // Add tools with proper schemas
        if (!tools.isEmpty()) {
            ArrayNode toolsArray = requestJson.putArray("tools");
            for (Tool tool : tools) {
                ObjectNode toolNode = toolsArray.addObject();
                toolNode.put("type", "function");
                
                ObjectNode functionNode = toolNode.putObject("function");
                functionNode.put("name", tool.getName());
                functionNode.put("description", tool.getDescription());
                
                // Add parameters schema
                Map<String, Object> schema = tool.getParametersSchema();
                if (schema != null && !schema.isEmpty()) {
                    try {
                        String schemaJson = objectMapper.writeValueAsString(schema);
                        JsonNode schemaNode = objectMapper.readTree(schemaJson);
                        functionNode.set("parameters", schemaNode);
                    } catch (Exception e) {
                        log.error("Failed to convert parameters schema for tool {}", tool.getName(), e);
                    }
                }
            }
        }
        
        return requestJson;
    }
    
    @Override
    public String getProviderName() {
        return "openai";
    }
    
    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your-api-key-here");
    }
    
    /**
     * Rough estimate of token count (1 token ~= 4 characters)
     */
    private int estimateTokenCount(String text) {
        return text.length() / 4;
    }
    
    /**
     * Get summary of last N messages for logging
     */
    private String getLastNMessagesSummary(List<Message> messages, int n) {
        int start = Math.max(0, messages.size() - n);
        StringBuilder summary = new StringBuilder("[");
        for (int i = start; i < messages.size(); i++) {
            Message msg = messages.get(i);
            String contentPreview = msg.getContent() != null && msg.getContent().length() > 100 
                ? msg.getContent().substring(0, 100) + "..." 
                : msg.getContent();
            summary.append("{role:").append(msg.getRole())
                   .append(", contentLength:").append(msg.getContent() != null ? msg.getContent().length() : 0)
                   .append(", preview:\"").append(contentPreview).append("\"}");
            if (i < messages.size() - 1) summary.append(", ");
        }
        summary.append("]");
        return summary.toString();
    }
}
