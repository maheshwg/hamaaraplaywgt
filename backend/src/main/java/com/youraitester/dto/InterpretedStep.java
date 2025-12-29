package com.youraitester.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InterpretedStep {
    private String action; // click, type, navigate, assert, wait
    private String selector; // CSS selector or XPath
    private String value; // For type/navigate actions
}
