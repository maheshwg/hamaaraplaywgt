package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Entity
@Table(name = "test_run_step_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StepResult {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "test_run_id")
    private String testRunId;
    
    @Column(name = "step_number")
    private Integer stepNumber;
    
    @Column(columnDefinition = "TEXT")
    private String instruction;
    
    private String status; // passed, failed, skipped
    
    @Column(name = "screenshot_url")
    private String screenshotUrl;
    
    /**
     * User-facing message for this step (shown for both passed and failed steps).
     * Keep this clean and human-readable (no stack traces / internal details).
     */
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    private Long duration; // milliseconds
    
    @Column(name = "executed_at")
    private LocalDateTime executedAt;
    
    @Column(name = "extracted_variables", columnDefinition = "TEXT")
    private String extractedVariablesJson; // Store extracted variables as JSON string
    
    // Transient field for runtime use (not persisted directly)
    @Transient
    private Map<String, Object> extractedVariables = new HashMap<>();
    
    // Helper methods to sync extractedVariables with JSON
    public Map<String, Object> getExtractedVariables() {
        if (extractedVariables.isEmpty() && extractedVariablesJson != null && !extractedVariablesJson.isEmpty()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                extractedVariables = mapper.readValue(extractedVariablesJson, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse extractedVariables JSON: {}", e.getMessage());
                extractedVariables = new HashMap<>();
            }
        }
        return extractedVariables;
    }
    
    public void setExtractedVariables(Map<String, Object> extractedVariables) {
        this.extractedVariables = extractedVariables != null ? extractedVariables : new HashMap<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            this.extractedVariablesJson = mapper.writeValueAsString(this.extractedVariables);
        } catch (Exception e) {
            log.warn("Failed to serialize extractedVariables to JSON: {}", e.getMessage());
            this.extractedVariablesJson = "{}";
        }
    }
    
    @PrePersist
    @PreUpdate
    protected void syncVariables() {
        // Ensure extractedVariables JSON is synced before persist/update
        if (extractedVariablesJson == null && !extractedVariables.isEmpty()) {
            setExtractedVariables(extractedVariables);
        }
    }
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StepResult.class);
}
