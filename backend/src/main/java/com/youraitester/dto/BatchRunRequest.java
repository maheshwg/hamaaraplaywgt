package com.youraitester.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchRunRequest {
    private List<String> testIds;
    private Boolean parallel;
    private String runName; // Name for this run (required for multiple tests)
}
