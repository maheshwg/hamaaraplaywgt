package com.youraitester.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModuleStep {
    
    @Column(columnDefinition = "TEXT")
    private String instruction;
    
    @Column(name = "step_order")
    private Integer order;
}
