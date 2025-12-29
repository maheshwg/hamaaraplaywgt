package com.youraitester.service;

import com.youraitester.dto.InterpretedStep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.theokanning.openai.completion.chat.ChatCompletionRequest;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.service.OpenAiService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class StepInterpreterService {
    
    @Value("${openai.api.key}")
    private String openAiApiKey;
    
    public InterpretedStep interpretStep(String instruction, String pageContext, Map<String, Object> variables) {
        try {
            OpenAiService service = new OpenAiService(openAiApiKey);
            
            String prompt = buildPrompt(instruction, pageContext, variables);
            
            List<ChatMessage> messages = new ArrayList<>();
            messages.add(new ChatMessage("system", "You are a test automation expert. Convert natural language instructions into executable browser actions. " +
                    "Respond in JSON format with: action (click|type|navigate|assert|wait), selector (CSS selector), value (for type/navigate actions)"));
            messages.add(new ChatMessage("user", prompt));
            
            ChatCompletionRequest request = ChatCompletionRequest.builder()
                    .model("gpt-4")
                    .messages(messages)
                    .temperature(0.1)
                    .maxTokens(200)
                    .build();
            
            String response = service.createChatCompletion(request)
                    .getChoices()
                    .get(0)
                    .getMessage()
                    .getContent();
            
            return parseResponse(response);
            
        } catch (Exception e) {
            log.error("Failed to interpret step using AI", e);
            // Fallback to simple parsing
            return fallbackInterpretation(instruction);
        }
    }
    
    private String buildPrompt(String instruction, String pageContext, Map<String, Object> variables) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Instruction: ").append(instruction).append("\n\n");
        
        if (pageContext != null && !pageContext.isEmpty()) {
            // Extract key elements from page context (simplified)
            prompt.append("Page context available\n");
        }
        
        if (variables != null && !variables.isEmpty()) {
            prompt.append("Variables: ").append(variables).append("\n");
        }
        
        prompt.append("\nConvert this to a browser action in JSON format.");
        return prompt.toString();
    }
    
    private InterpretedStep parseResponse(String response) {
        // Simple JSON parsing (in production, use Jackson)
        InterpretedStep step = new InterpretedStep();
        
        if (response.contains("\"action\":")) {
            String action = extractJsonValue(response, "action");
            step.setAction(action);
        }
        
        if (response.contains("\"selector\":")) {
            String selector = extractJsonValue(response, "selector");
            step.setSelector(selector);
        }
        
        if (response.contains("\"value\":")) {
            String value = extractJsonValue(response, "value");
            step.setValue(value);
        }
        
        return step;
    }
    
    private String extractJsonValue(String json, String key) {
        int start = json.indexOf("\"" + key + "\"");
        if (start == -1) return null;
        
        start = json.indexOf(":", start) + 1;
        start = json.indexOf("\"", start) + 1;
        int end = json.indexOf("\"", start);
        
        return json.substring(start, end).trim();
    }
    
    private InterpretedStep fallbackInterpretation(String instruction) {
        InterpretedStep step = new InterpretedStep();
        String lower = instruction.toLowerCase();
        
        if (lower.contains("click")) {
            step.setAction("click");
            // Try to extract selector from instruction
            step.setSelector("button"); // Simplified
        } else if (lower.contains("type") || lower.contains("enter")) {
            step.setAction("type");
            step.setSelector("input");
        } else if (lower.contains("go to") || lower.contains("navigate")) {
            step.setAction("navigate");
        } else if (lower.contains("wait")) {
            step.setAction("wait");
            step.setValue("2000");
        } else {
            step.setAction("assert");
        }
        
        return step;
    }
}
