package com.youraitester.model.app;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "screen_method_params")
public class ScreenMethodParam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    private Boolean optional;

    @Column(length = 4000)
    private String defaultValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_method_id")
    @JsonIgnore
    private ScreenMethod method;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Boolean getOptional() { return optional; }
    public void setOptional(Boolean optional) { this.optional = optional; }
    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }
    public ScreenMethod getMethod() { return method; }
    public void setMethod(ScreenMethod method) { this.method = method; }
}


