package com.youraitester.model.app;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "screen_elements")
public class ScreenElement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Canonical element name used in steps (e.g. "emailInput", "submitButton").
     * Must be unique within (appId, screenName) by convention.
     */
    @Column(nullable = false)
    private String elementName;

    /**
     * One of: css | xpath | text | role | testid (free-form for now).
     * If "selectorType" is null/empty, "selector" is assumed to be a raw CSS selector.
     */
    private String selectorType;

    /**
     * The selector value (e.g. "input[name='email']" or "button#submit").
     */
    @Column(length = 4000)
    private String selector;

    /**
     * Optional: iframe selector to scope the locator.
     */
    @Column(length = 4000)
    private String frameSelector;

    /**
     * input/select/button/checkbox/radio/link/table/etc.
     */
    private String elementType;

    /**
     * Supported actions for this element: fill, click, check, selectOption, hover, press, etc.
     */
    @ElementCollection
    @CollectionTable(name = "screen_element_actions", joinColumns = @JoinColumn(name = "screen_element_id"))
    @Column(name = "action")
    private List<String> actionsSupported;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id")
    @JsonIgnore
    private Screen screen;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
    public Screen getScreen() { return screen; }
    public void setScreen(Screen screen) { this.screen = screen; }
}


