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
public class SimpleTool implements LlmProvider.Tool {
    private String name;
    private String description;
    private Map<String, Object> parametersSchema;
}
