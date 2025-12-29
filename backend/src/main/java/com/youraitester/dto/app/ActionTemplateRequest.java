package com.youraitester.dto.app;

public class ActionTemplateRequest {
    private String intent;      // FILL, CLICK, SELECT_BY_VALUE, HOVER, etc.
    private String elementType; // input/select/button/...
    private String template;    // e.g. "locator.fill(value)"

    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public String getElementType() { return elementType; }
    public void setElementType(String elementType) { this.elementType = elementType; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
}


