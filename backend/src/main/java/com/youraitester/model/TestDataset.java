package com.youraitester.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestDataset {
    
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String data; // Store as JSON string
}
