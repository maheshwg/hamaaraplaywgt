package com.youraitester.dto.app;

import java.util.List;

public class ScreenElementRequest {
    private String elementName;
    private String selectorType;   // css | xpath | text | role | testid
    private String selector;       // selector value (css/xpath/etc) or raw selector when selectorType is null
    private String frameSelector;  // optional iframe selector
    private String elementType;    // input/select/button/...
    private List<String> actionsSupported;

    public String getElementName() { return elementName; }
    public void setElementName(String elementName) { this.elementName = elementName; }
    public String getSelectorType() { return selectorType; }
    public void setSelectorType(String selectorType) { this.selectorType = selectorType; }
    public String getSelector() { return selector; }
    public void setSelector(String selector) { this.selector = selector; }
    public String getFrameSelector() { return frameSelector; }
    public void setFrameSelector(String frameSelector) { this.frameSelector = frameSelector; }
    public String getElementType() { return elementType; }
    public void setElementType(String elementType) { this.elementType = elementType; }
    public List<String> getActionsSupported() { return actionsSupported; }
    public void setActionsSupported(List<String> actionsSupported) { this.actionsSupported = actionsSupported; }
}


