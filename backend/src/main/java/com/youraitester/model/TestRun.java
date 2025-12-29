package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Entity
@Table(name = "test_runs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestRun {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "test_id")
    private String testId;
    
    @Column(name = "test_name")
    private String testName;

    // Project scoping: link a test run to a specific project
    @Column(name = "project_id")
    private String projectId;
    
    private String status; // running, passed, failed, cancelled
    
    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    private Long duration; // milliseconds
    
    private String environment; // dev, staging, production
    
    private String browser; // chrome, firefox, edge
    
    @Column(name = "data_row_index")
    private Integer dataRowIndex;
    
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "test_run_id")
    private List<StepResult> stepResults;
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "batch_id")
    private String batchId;
    
    @Column(name = "triggered_by")
    private String triggeredBy; // user_id or "scheduled"
    
    @Column(name = "variables", columnDefinition = "TEXT")
    private String variablesJson; // Store variables as JSON string
    
    // Transient field for runtime use (not persisted directly)
    @Transient
    private Map<String, Object> variables = new HashMap<>();
    
    // Helper methods to sync variables with JSON
    public Map<String, Object> getVariables() {
        if (variables.isEmpty() && variablesJson != null && !variablesJson.isEmpty()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                variables = mapper.readValue(variablesJson, new TypeReference<Map<String, Object>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse variables JSON: {}", e.getMessage());
                variables = new HashMap<>();
            }
        }
        return variables;
    }
    
    public void setVariables(Map<String, Object> variables) {
        this.variables = variables != null ? variables : new HashMap<>();
        try {
            ObjectMapper mapper = new ObjectMapper();
            this.variablesJson = mapper.writeValueAsString(this.variables);
        } catch (Exception e) {
            log.warn("Failed to serialize variables to JSON: {}", e.getMessage());
            this.variablesJson = "{}";
        }
    }
    
    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "running";
        }
        // Ensure variables JSON is synced before persist
        if (variablesJson == null && !variables.isEmpty()) {
            setVariables(variables);
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        // Ensure variables JSON is synced before update
        if (!variables.isEmpty()) {
            setVariables(variables);
        }
    }
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TestRun.class);
}
