package com.youraitester.model.app;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.List;

@Entity
public class Screen {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @ElementCollection
    private List<String> fieldNames;

    @ElementCollection
    private List<String> methodSignatures;

    /**
     * Element registry for runtime execution (page-object-free).
     */
    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScreenElement> elements;

    /**
     * Optional: method metadata if you ever want to support calling page-object methods by name.
     */
    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScreenMethod> methods;

    @ManyToOne
    @JoinColumn(name = "app_id")
    @JsonIgnore
    private App app;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<String> getFieldNames() { return fieldNames; }
    public void setFieldNames(List<String> fieldNames) { this.fieldNames = fieldNames; }
    public List<String> getMethodSignatures() { return methodSignatures; }
    public void setMethodSignatures(List<String> methodSignatures) { this.methodSignatures = methodSignatures; }
    public List<ScreenElement> getElements() { return elements; }
    public void setElements(List<ScreenElement> elements) { this.elements = elements; }
    public List<ScreenMethod> getMethods() { return methods; }
    public void setMethods(List<ScreenMethod> methods) { this.methods = methods; }
    public App getApp() { return app; }
    public void setApp(App app) { this.app = app; }
}
