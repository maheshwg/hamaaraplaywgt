package com.youraitester.agent;

import java.util.List;
import java.util.Map;

/**
 * Generic interface for LLM providers (OpenAI, Claude, etc.)
 * Supports function/tool calling pattern for agentic behavior
 */
public interface LlmProvider {
    
    /**
     * Execute a chat completion with available tools
     * 
     * @param messages Conversation history
     * @param tools Available tools the LLM can call
     * @param maxIterations Maximum number of function call iterations
     * @return Final response after all tool calls complete
     */
    AgentResponse executeWithTools(
        List<Message> messages, 
        List<Tool> tools, 
        int maxIterations
    );
    
    /**
     * Get the provider name (e.g., "openai", "claude")
     */
    String getProviderName();
    
    /**
     * Check if the provider is properly configured and available
     */
    boolean isAvailable();
    
    /**
     * Represents a message in the conversation
     */
    interface Message {
        String getRole(); // "system", "user", "assistant", "tool"
        String getContent();
        String getToolCallId(); // For tool result messages
        List<ToolCall> getToolCalls(); // For assistant messages with tool calls
        Map<String, Object> getMetadata(); // Provider-specific data
    }
    
    /**
     * Represents a tool that can be called by the LLM
     */
    interface Tool {
        String getName();
        String getDescription();
        Map<String, Object> getParametersSchema(); // JSON Schema
    }
    
    /**
     * Represents a tool call requested by the LLM
     */
    interface ToolCall {
        String getId();
        String getName();
        Map<String, Object> getArguments();
    }
    
    /**
     * Response from the LLM
     */
    interface AgentResponse {
        String getContent(); // Final text response
        List<ToolCall> getToolCalls(); // Tools to execute
        boolean isComplete(); // Whether agent finished the task
        String getFinishReason(); // "stop", "tool_calls", "length", etc.
    }
}
