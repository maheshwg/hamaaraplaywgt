package com.youraitester.model.app;

import jakarta.persistence.*;
import java.util.List;

@Entity
public class App {
    public enum ExecutionMode {
        /**
         * Current behavior: execute ScreenMethod.methodBody via StoredMethodExecutionService (custom interpreter).
         */
        DB_METHOD_BODY,
        /**
         * Jar plugin behavior: load a plugin jar and invoke compiled page-object methods.
         */
        JAR_PLUGIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @Column(length = 4000)
    private String info;

    /**
     * Determines how call_method steps are executed for this app.
     * Default is DB_METHOD_BODY for backward compatibility.
     */
    @Enumerated(EnumType.STRING)
    private ExecutionMode executionMode = ExecutionMode.DB_METHOD_BODY;

    /**
     * Local filesystem path to the plugin jar (recommended under backend/plugins/).
     * Example: plugins/saucedemo-plugin-1.0.0.jar
     */
    @Column(length = 1000)
    private String pluginJarPath;

    @Column(length = 200)
    private String pluginVersion;

    /**
     * Optional SHA-256 hex of the jar. If present, the backend will verify it before loading.
     */
    @Column(length = 128)
    private String pluginSha256;

    @OneToMany(mappedBy = "app", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Screen> screens;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getInfo() { return info; }
    public void setInfo(String info) { this.info = info; }
    public ExecutionMode getExecutionMode() { return executionMode != null ? executionMode : ExecutionMode.DB_METHOD_BODY; }
    public void setExecutionMode(ExecutionMode executionMode) { this.executionMode = executionMode; }
    public String getPluginJarPath() { return pluginJarPath; }
    public void setPluginJarPath(String pluginJarPath) { this.pluginJarPath = pluginJarPath; }
    public String getPluginVersion() { return pluginVersion; }
    public void setPluginVersion(String pluginVersion) { this.pluginVersion = pluginVersion; }
    public String getPluginSha256() { return pluginSha256; }
    public void setPluginSha256(String pluginSha256) { this.pluginSha256 = pluginSha256; }
    public List<Screen> getScreens() { return screens; }
    public void setScreens(List<Screen> screens) { this.screens = screens; }
}
