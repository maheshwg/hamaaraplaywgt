package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "runs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Run {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "project_id")
    private String projectId;
    
    private String status; // running, passed, failed, cancelled
    
    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "triggered_by")
    private String triggeredBy; // user_id or "scheduled"
    
    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "running";
        }
    }
}

