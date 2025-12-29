package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "tests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Test {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @ElementCollection
    @CollectionTable(name = "test_tags", joinColumns = @JoinColumn(name = "test_id"))
    @Column(name = "tag")
    private List<String> tags;
    
    @ElementCollection
    @CollectionTable(name = "test_steps", joinColumns = @JoinColumn(name = "test_id"))
    private List<TestStep> steps;
    
    @Column(name = "created_date")
    private LocalDateTime createdDate;
    
    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;
    
    @Column(name = "created_by")
    private String createdBy;

    // Project scoping: link a test to a specific project
    @Column(name = "project_id")
    private String projectId;
    
    // Application URL for this test
    @Column(name = "app_url")
    private String appUrl;

    /**
     * Link to the App metadata (screens/elements/action templates/app summary).
     * When present, the test runner can execute deterministically using stored screen elements.
     */
    @Column(name = "app_id")
    private Long appId;
    
    // Application type (e.g., "react-spa", "angular-spa", "traditional-web", "ecommerce", etc.)
    @Column(name = "app_type")
    private String appType;
    
    private String status; // active, archived, draft
    
    @Column(name = "run_count")
    private Integer runCount = 0;
    
    @Column(name = "last_run_date")
    private LocalDateTime lastRunDate;
    
    @Column(name = "last_run_status")
    private String lastRunStatus; // passed, failed, running
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "test_datasets", joinColumns = @JoinColumn(name = "test_id"))
    private List<TestDataset> datasets;
    
    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        modifiedDate = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }
}
