package com.youraitester.agent.impl;

import com.youraitester.agent.LlmProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleMessage implements LlmProvider.Message {
    private String role;
    private String content;
    private String toolCallId;
    private List<LlmProvider.ToolCall> toolCalls;
    
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();
    
    public static SimpleMessage system(String content) {
        return SimpleMessage.builder()
            .role("system")
            .content(content)
            .build();
    }
    
    public static SimpleMessage user(String content) {
        return SimpleMessage.builder()
            .role("user")
            .content(content)
            .build();
    }
    
    public static SimpleMessage assistant(String content) {
        return SimpleMessage.builder()
            .role("assistant")
            .content(content)
            .build();
    }
    
    public static SimpleMessage toolResult(String toolCallId, String content) {
        return SimpleMessage.builder()
            .role("tool")
            .toolCallId(toolCallId)
            .content(content)
            .build();
    }
}
