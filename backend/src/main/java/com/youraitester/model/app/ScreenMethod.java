package com.youraitester.model.app;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "screen_methods")
public class ScreenMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String methodName;

    /**
     * Optional: for prompt/debugging only.
     */
    @Column(length = 4000)
    private String methodSignature;

    /**
     * Optional: method body/source for LLM prompting/debugging.
     * Not required for runtime execution if you execute purely from ScreenElement selectors.
     */
    @Column(columnDefinition = "TEXT")
    private String methodBody;

    /**
     * ignore | assert | storeVariable (free-form for now)
     */
    private String returnHandling;

    /**
     * navigation/dialog/newPage/etc.
     */
    @ElementCollection
    @CollectionTable(name = "screen_method_side_effects", joinColumns = @JoinColumn(name = "screen_method_id"))
    @Column(name = "flag")
    private List<String> sideEffectFlags;

    @OneToMany(mappedBy = "method", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScreenMethodParam> params;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id")
    @JsonIgnore
    private Screen screen;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }
    public String getMethodSignature() { return methodSignature; }
    public void setMethodSignature(String methodSignature) { this.methodSignature = methodSignature; }
    public String getMethodBody() { return methodBody; }
    public void setMethodBody(String methodBody) { this.methodBody = methodBody; }
    public String getReturnHandling() { return returnHandling; }
    public void setReturnHandling(String returnHandling) { this.returnHandling = returnHandling; }
    public List<String> getSideEffectFlags() { return sideEffectFlags; }
    public void setSideEffectFlags(List<String> sideEffectFlags) { this.sideEffectFlags = sideEffectFlags; }
    public List<ScreenMethodParam> getParams() { return params; }
    public void setParams(List<ScreenMethodParam> params) { this.params = params; }
    public Screen getScreen() { return screen; }
    public void setScreen(Screen screen) { this.screen = screen; }
}


