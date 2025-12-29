package com.youraitester.model.app;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(
    name = "action_templates",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_action_template_app_intent_type", columnNames = {"app_id", "intent", "element_type"})
    }
)
public class ActionTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String intent; // FILL, CLICK, SELECT_BY_VALUE, HOVER, etc.

    @Column(name = "element_type", nullable = false)
    private String elementType; // input/select/button/...

    @Column(length = 4000, nullable = false)
    private String template; // e.g. "locator.fill(value)"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "app_id", nullable = false)
    @JsonIgnore
    private App app;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getIntent() { return intent; }
    public void setIntent(String intent) { this.intent = intent; }
    public String getElementType() { return elementType; }
    public void setElementType(String elementType) { this.elementType = elementType; }
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }
    public App getApp() { return app; }
    public void setApp(App app) { this.app = app; }
}


