package com.youraitester.agent.impl;

import com.youraitester.agent.LlmProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleToolCall implements LlmProvider.ToolCall {
    private String id;
    private String name;
    private Map<String, Object> arguments;
}
