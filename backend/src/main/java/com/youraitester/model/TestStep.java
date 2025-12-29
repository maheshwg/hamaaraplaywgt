package com.youraitester.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonInclude;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestStep {
    
    @Column(columnDefinition = "TEXT")
    private String instruction;
    
    @Column(name = "step_order")
    private Integer order;
    
    private String type; // action, assertion, navigation
    
    private String selector; // CSS selector or XPath
    
    private String value; // For input/type actions
    
    private Boolean optional;
    
    @Column(name = "wait_after")
    private Integer waitAfter; // milliseconds to wait after step
    
    @Column(name = "module_id")
    private String moduleId; // Reference to Module if this step uses a module
}
