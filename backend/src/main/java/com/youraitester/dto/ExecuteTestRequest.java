package com.youraitester.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteTestRequest {
    private Integer dataRowIndex;
    private String environment;
    private String browser;
    private String runId; // Optional: ID of the Run entity this test run belongs to
}
