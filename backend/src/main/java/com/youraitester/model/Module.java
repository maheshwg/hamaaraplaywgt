package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "modules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Module {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @ElementCollection
    @CollectionTable(name = "module_test_ids", joinColumns = @JoinColumn(name = "module_id"))
    @Column(name = "test_id")
    private List<String> testIds;
    
    @ElementCollection
    @CollectionTable(name = "module_steps", joinColumns = @JoinColumn(name = "module_id"))
    private List<ModuleStep> steps = new ArrayList<>();
    
    @ElementCollection
    @CollectionTable(name = "module_parameters", joinColumns = @JoinColumn(name = "module_id"))
    @Column(name = "parameter")
    private List<String> parameters = new ArrayList<>();
    
    @Column(name = "created_date")
    private LocalDateTime createdDate;
    
    @Column(name = "modified_date")
    private LocalDateTime modifiedDate;
    
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
