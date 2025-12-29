package com.youraitester.agent.impl;

import com.youraitester.agent.LlmProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleAgentResponse implements LlmProvider.AgentResponse {
    private String content;
    
    @Builder.Default
    private List<LlmProvider.ToolCall> toolCalls = new ArrayList<>();
    
    @Builder.Default
    private boolean complete = false;
    
    private String finishReason;
    
    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }
}
