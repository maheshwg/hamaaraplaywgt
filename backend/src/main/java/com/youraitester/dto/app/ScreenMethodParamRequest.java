package com.youraitester.dto.app;

public class ScreenMethodParamRequest {
    private String name;
    private String type;
    private Boolean optional;
    private String defaultValue;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Boolean getOptional() { return optional; }
    public void setOptional(Boolean optional) { this.optional = optional; }
    public String getDefaultValue() { return defaultValue; }
    public void setDefaultValue(String defaultValue) { this.defaultValue = defaultValue; }
}


