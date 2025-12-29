package com.youraitester.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterpretStepRequest {
    private String instruction;
    private String pageContext;
    private Map<String, Object> variables;
}
