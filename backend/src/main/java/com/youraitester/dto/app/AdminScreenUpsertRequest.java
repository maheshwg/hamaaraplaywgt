package com.youraitester.dto.app;

import java.util.List;

/**
 * Admin upsert payload for a screen: legacy prompt fields + runtime registries.
 */
public class AdminScreenUpsertRequest {
    private List<String> fieldNames;
    private List<String> methodSignatures;
    private List<ScreenElementRequest> elements;
    private List<ScreenMethodRequest> methods;

    public List<String> getFieldNames() { return fieldNames; }
    public void setFieldNames(List<String> fieldNames) { this.fieldNames = fieldNames; }
    public List<String> getMethodSignatures() { return methodSignatures; }
    public void setMethodSignatures(List<String> methodSignatures) { this.methodSignatures = methodSignatures; }
    public List<ScreenElementRequest> getElements() { return elements; }
    public void setElements(List<ScreenElementRequest> elements) { this.elements = elements; }
    public List<ScreenMethodRequest> getMethods() { return methods; }
    public void setMethods(List<ScreenMethodRequest> methods) { this.methods = methods; }
}


