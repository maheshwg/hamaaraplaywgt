package com.youraitester.agent.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.youraitester.agent.LlmProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Claude (Anthropic) implementation of LlmProvider
 * Uses Claude's tool use API
 * 
 * Note: Requires anthropic-sdk or HTTP client integration
 * This is a skeleton implementation - add Anthropic SDK dependency for full functionality
 */
@Component("claude")
@Slf4j
public class ClaudeProvider implements LlmProvider {
    
    @Value("${claude.api.key:}")
    private String apiKey;
    
    @Value("${claude.model:claude-3-5-sonnet-20241022}")
    private String model;
    
    @Value("${claude.api.url:https://api.anthropic.com/v1/messages}")
    private String apiUrl;
    
    @Value("${claude.api.version:2023-06-01}")
    private String apiVersion;
    
    @Value("${claude.max.tokens:4096}")
    private int maxTokens;
    
    @Value("${agent.conversation.history.keep:2}")
    private int conversationHistoryKeep;

    /**
     * When enabled, logs the (sanitized) text payload being sent to Claude, with char counts.
     * Keep OFF in production unless debugging, as it can include user inputs and page snapshots.
     */
    @Value("${claude.request.logging.enabled:false}")
    private boolean requestLoggingEnabled;

    /**
     * Max chars to print for the "info sent to Claude" transcript.
     */
    @Value("${claude.request.logging.max.chars:4000}")
    private int requestLoggingMaxChars;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public AgentResponse executeWithTools(List<Message> messages, List<Tool> tools, int maxIterations) {
        if (!isAvailable()) {
            throw new IllegalStateException("Claude provider is not configured");
        }
        
        log.info("Claude: Executing with {} tools, max {} iterations", tools.size(), maxIterations);
        
        // Apply history truncation before converting messages (tool-use safe).
        List<Message> truncatedMessages = truncateHistory(messages);
        
        // Convert messages to Claude format
        List<Map<String, Object>> claudeMessages = convertMessages(truncatedMessages);
        List<Map<String, Object>> claudeTools = convertTools(tools);
        
        // Get system message
        String systemMessage = messages.stream()
            .filter(m -> "system".equals(m.getRole()))
            .findFirst()
            .map(Message::getContent)
            .orElse("");
        
        // Build request
        Map<String, Object> request = new HashMap<>();
        request.put("model", model);
        request.put("max_tokens", maxTokens);
        request.put("messages", claudeMessages);
        
        if (!systemMessage.isEmpty()) {
            request.put("system", systemMessage);
        }
        
        if (!claudeTools.isEmpty()) {
            request.put("tools", claudeTools);
        }
        
        try {
            // Execute request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-api-key", apiKey);
            headers.set("anthropic-version", apiVersion);
            
            // Calculate total characters being sent to understand token usage
            int totalChars = claudeMessages.stream()
                .mapToInt(m -> String.valueOf(m.get("content")).length())
                .sum();
            int estimatedTokens = totalChars / 4; // Rough estimate: 1 token ~= 4 chars
            
            log.info("Claude: Sending request to {}", apiUrl);
            log.info("Claude: Message count: {}, total chars: {}, estimated tokens: {}", 
                claudeMessages.size(), totalChars, estimatedTokens);
            log.info("Claude: Message sizes: {}", 
                claudeMessages.stream()
                    .map(m -> String.format("{role:%s, chars:%d}", 
                        m.get("role"), 
                        String.valueOf(m.get("content")).length()))
                    .collect(Collectors.joining(", ", "[", "]"))
            );

            // Optional: log the actual content we are sending (system + messages), truncated for safety.
            if (requestLoggingEnabled) {
                int systemChars = systemMessage != null ? systemMessage.length() : 0;
                int messagesChars = estimateClaudeMessagesChars(claudeMessages);
                String transcript = buildClaudeTranscript(systemMessage, claudeMessages);
                log.info(
                    "Claude: [info sent to Claude] systemChars={}, messagesChars={}, totalChars~={}, transcriptChars={}, transcript:\n{}",
                    systemChars,
                    messagesChars,
                    (systemChars + messagesChars),
                    transcript.length(),
                    truncateForLog(transcript, requestLoggingMaxChars)
                );
            }
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody == null) {
                throw new RuntimeException("Empty response from Claude API");
            }
            
            // Parse response
            String stopReason = (String) responseBody.get("stop_reason");
            List<Map<String, Object>> content = (List<Map<String, Object>>) responseBody.get("content");
            
            log.debug("Claude: Stop reason: {}, content blocks: {}", stopReason, content.size());
            
            // Check if there are tool uses
            List<SimpleToolCall> toolCalls = new ArrayList<>();
            StringBuilder textContent = new StringBuilder();
            
            for (Map<String, Object> block : content) {
                String type = (String) block.get("type");
                
                if ("text".equals(type)) {
                    textContent.append(block.get("text"));
                } else if ("tool_use".equals(type)) {
                    String toolId = (String) block.get("id");
                    String toolName = (String) block.get("name");
                    Map<String, Object> input = (Map<String, Object>) block.get("input");
                    
                    log.info("Claude: Tool use requested: {}", toolName);
                    
                    SimpleToolCall toolCall = SimpleToolCall.builder()
                        .id(toolId)
                        .name(toolName)
                        .arguments(input != null ? input : new HashMap<>())
                        .build();
                    
                    toolCalls.add(toolCall);
                }
            }
            
            if (!toolCalls.isEmpty()) {
                // Return tool calls to execute
                log.debug("Claude: Returning {} tool calls", toolCalls.size());
                return SimpleAgentResponse.builder()
                    .content(textContent.toString())
                    .toolCalls(new ArrayList<>(toolCalls))
                    .complete(false)
                    .finishReason("tool_use")
                    .build();
            } else if ("end_turn".equals(stopReason) || "stop".equals(stopReason)) {
                // Task complete
                log.info("Claude: Task complete. Final message: {}", textContent.toString());
                return SimpleAgentResponse.builder()
                    .content(textContent.toString())
                    .complete(true)
                    .finishReason("stop")
                    .build();
            } else {
                // Unexpected stop reason
                log.warn("Claude: Unexpected stop reason: {}", stopReason);
                return SimpleAgentResponse.builder()
                    .content(textContent.toString())
                    .complete(true)
                    .finishReason(stopReason != null ? stopReason : "unknown")
                    .build();
            }
            
        } catch (Exception e) {
            log.error("Claude API error", e);
            throw new RuntimeException("Failed to execute Claude request: " + e.getMessage(), e);
        }
    }

    private int estimateClaudeMessagesChars(List<Map<String, Object>> claudeMessages) {
        if (claudeMessages == null || claudeMessages.isEmpty()) return 0;
        int total = 0;
        for (Map<String, Object> msg : claudeMessages) {
            Object content = msg.get("content");
            if (content == null) continue;
            total += content.toString().length();
        }
        return total;
    }

    /**
     * Build a human-readable transcript of what we're sending to Claude.
     * Includes system prompt and each message, including tool_use and tool_result blocks.
     */
    @SuppressWarnings("unchecked")
    private String buildClaudeTranscript(String systemMessage, List<Map<String, Object>> claudeMessages) {
        StringBuilder sb = new StringBuilder();
        if (systemMessage != null && !systemMessage.isBlank()) {
            sb.append("[system]\n").append(systemMessage).append("\n\n");
        }
        if (claudeMessages == null) return sb.toString();

        for (Map<String, Object> msg : claudeMessages) {
            String role = String.valueOf(msg.getOrDefault("role", "unknown"));
            Object content = msg.get("content");

            sb.append("[").append(role).append("]\n");

            if (content instanceof List) {
                List<?> blocks = (List<?>) content;
                for (Object b : blocks) {
                    if (!(b instanceof Map)) {
                        sb.append(String.valueOf(b)).append("\n");
                        continue;
                    }
                    Map<String, Object> block = (Map<String, Object>) b;
                    String type = String.valueOf(block.getOrDefault("type", "unknown"));

                    if ("text".equals(type)) {
                        sb.append(block.getOrDefault("text", "")).append("\n");
                    } else if ("tool_use".equals(type)) {
                        String id = String.valueOf(block.getOrDefault("id", ""));
                        String name = String.valueOf(block.getOrDefault("name", ""));
                        Object input = block.get("input");
                        sb.append("[tool_use id=").append(id).append(" name=").append(name).append(" input=")
                            .append(input != null ? input.toString() : "{}")
                            .append("]\n");
                    } else if ("tool_result".equals(type)) {
                        String toolUseId = String.valueOf(block.getOrDefault("tool_use_id", ""));
                        Object trContent = block.get("content");
                        int len = trContent != null ? trContent.toString().length() : 0;
                        sb.append("[tool_result tool_use_id=").append(toolUseId).append(" chars=").append(len).append("]\n");
                        if (trContent != null) {
                            sb.append(trContent.toString()).append("\n");
                        }
                    } else {
                        sb.append("[block type=").append(type).append("] ").append(block).append("\n");
                    }
                }
            } else {
                sb.append(content != null ? content.toString() : "").append("\n");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String truncateForLog(String s, int maxChars) {
        if (s == null) return "";
        if (maxChars <= 0) return "";
        if (s.length() <= maxChars) return s;
        return s.substring(0, maxChars) + "\n\n[truncated, original chars=" + s.length() + "]";
    }
    
    @Override
    public String getProviderName() {
        return "claude";
    }
    
    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty();
    }
    
    private List<Map<String, Object>> convertMessages(List<Message> messages) {
        List<Map<String, Object>> claudeMessages = new ArrayList<>();
        List<Map<String, Object>> pendingToolResults = new ArrayList<>();
        
        for (Message msg : messages) {
            if ("system".equals(msg.getRole())) {
                continue; // System goes separately
            }
            
            if ("tool".equals(msg.getRole())) {
                // Accumulate tool results
                pendingToolResults.add(Map.of(
                    "type", "tool_result",
                    "tool_use_id", msg.getToolCallId(),
                    "content", msg.getContent()
                ));
            } else {
                // Flush pending tool results as a single user message
                if (!pendingToolResults.isEmpty()) {
                    Map<String, Object> toolResultMsg = new HashMap<>();
                    toolResultMsg.put("role", "user");
                    toolResultMsg.put("content", new ArrayList<>(pendingToolResults));
                    claudeMessages.add(toolResultMsg);
                    pendingToolResults.clear();
                }
                
                // Add regular message
                Map<String, Object> claudeMsg = new HashMap<>();
                claudeMsg.put("role", msg.getRole());
                
                // For assistant messages with tool calls, create content blocks
                if ("assistant".equals(msg.getRole()) && msg.getToolCalls() != null && !msg.getToolCalls().isEmpty()) {
                    List<Map<String, Object>> contentBlocks = new ArrayList<>();
                    
                    // Add text content if present
                    if (msg.getContent() != null && !msg.getContent().isEmpty()) {
                        contentBlocks.add(Map.of("type", "text", "text", msg.getContent()));
                    }
                    
                    // Add tool_use blocks
                    for (ToolCall toolCall : msg.getToolCalls()) {
                        Map<String, Object> toolUseBlock = new HashMap<>();
                        toolUseBlock.put("type", "tool_use");
                        toolUseBlock.put("id", toolCall.getId());
                        toolUseBlock.put("name", toolCall.getName());
                        toolUseBlock.put("input", toolCall.getArguments());
                        contentBlocks.add(toolUseBlock);
                    }
                    
                    claudeMsg.put("content", contentBlocks);
                } else {
                    // Regular text content
                    claudeMsg.put("content", msg.getContent());
                }
                
                claudeMessages.add(claudeMsg);
            }
        }
        
        // Flush any remaining tool results
        if (!pendingToolResults.isEmpty()) {
            Map<String, Object> toolResultMsg = new HashMap<>();
            toolResultMsg.put("role", "user");
            toolResultMsg.put("content", new ArrayList<>(pendingToolResults));
            claudeMessages.add(toolResultMsg);
        }
        
        return claudeMessages;
    }
    
    private List<Map<String, Object>> convertTools(List<Tool> tools) {
        return tools.stream()
            .map(tool -> {
                Map<String, Object> claudeTool = new HashMap<>();
                claudeTool.put("name", tool.getName());
                claudeTool.put("description", tool.getDescription());
                claudeTool.put("input_schema", tool.getParametersSchema());
                return claudeTool;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Truncate conversation history to keep only the most recent N iterations.
     * Each iteration includes: assistant message with tool calls + tool results
     * Always keeps: ALL system messages + the original user instruction, plus the most recent N iterations.
     * 
     * @param messages Original message list
     * @return Truncated message list
     */
    private List<Message> truncateHistory(List<Message> messages) {
        if (conversationHistoryKeep < 0 || messages.size() <= 2) {
            return messages; // No truncation or not enough messages
        }

        // Keep ALL system messages (AgentExecutor may add multiple system messages)
        // and keep the FIRST user message as the original instruction.
        List<Message> systemMessages = new ArrayList<>();
        Message originalInstruction = null;
        List<Message> nonSystem = new ArrayList<>();

        for (Message msg : messages) {
            if ("system".equals(msg.getRole())) {
                systemMessages.add(msg);
            } else {
                nonSystem.add(msg);
                if (originalInstruction == null && "user".equals(msg.getRole())) {
                    originalInstruction = msg;
                }
            }
        }

        if (originalInstruction == null) {
            // Shouldn't happen, but be safe
            return messages;
        }

        // Build "tail" history excluding the original instruction itself.
        // We only want to truncate the iterative assistant/tool exchanges.
        int instructionIdx = -1;
        for (int i = 0; i < nonSystem.size(); i++) {
            if (nonSystem.get(i) == originalInstruction) {
                instructionIdx = i;
                break;
            }
        }
        List<Message> tail = (instructionIdx >= 0 && instructionIdx + 1 < nonSystem.size())
            ? nonSystem.subList(instructionIdx + 1, nonSystem.size())
            : Collections.emptyList();
        
        if (conversationHistoryKeep == 0 || tail.isEmpty()) {
            // Keep only system + instruction
            List<Message> result = new ArrayList<>();
            result.addAll(systemMessages);
            result.add(originalInstruction);
            log.info("Claude: History truncation - keeping {} messages (system+instruction only)", result.size());
            return result;
        }
        
        // IMPORTANT (Claude tool-use protocol):
        // If we keep an assistant message containing tool_use blocks, we MUST also keep the subsequent
        // tool result messages for those tool_use ids. Otherwise Claude rejects the request.
        //
        // In our internal message stream, each "iteration" is effectively:
        //   assistant (may include toolCalls) + 0..N tool messages (role="tool")
        // So we truncate by keeping the last N assistant-led segments atomically.
        List<List<Message>> segments = new ArrayList<>();
        List<Message> current = null;
        for (Message msg : tail) {
            String role = msg.getRole();
            if ("assistant".equals(role)) {
                current = new ArrayList<>();
                current.add(msg);
                segments.add(current);
            } else if ("tool".equals(role)) {
                if (current == null) {
                    // Defensive: tool message without a preceding assistant; attach to the last segment if possible.
                    if (!segments.isEmpty()) {
                        segments.get(segments.size() - 1).add(msg);
                    }
                } else {
                    current.add(msg);
                }
            } else {
                // Other roles shouldn't normally appear in tail, but keep them safely.
                // Start a segment if none exists, otherwise append to current.
                if (current == null) {
                    current = new ArrayList<>();
                    segments.add(current);
                }
                current.add(msg);
            }
        }

        int from = Math.max(0, segments.size() - conversationHistoryKeep);
        List<Message> keptHistory = new ArrayList<>();
        for (int s = from; s < segments.size(); s++) {
            keptHistory.addAll(segments.get(s));
        }

        int iterationsFound = segments.size() - from;
        
        List<Message> result = new ArrayList<>();
        result.addAll(systemMessages);
        result.add(originalInstruction);
        result.addAll(keptHistory);
        
        int removedMessages = tail.size() - keptHistory.size();
        log.info("Claude: History truncation - keeping {} of {} total messages ({} iterations, removed {} old messages)", 
            result.size(), messages.size(), iterationsFound, removedMessages);
        
        return result;
    }
}
