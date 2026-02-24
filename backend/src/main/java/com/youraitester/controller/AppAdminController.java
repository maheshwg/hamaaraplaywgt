package com.youraitester.controller;

import com.youraitester.dto.app.AdminScreenUpsertRequest;
import com.youraitester.dto.app.ScreenElementRequest;
import com.youraitester.dto.app.ScreenMethodParamRequest;
import com.youraitester.dto.app.ScreenMethodRequest;
import com.youraitester.model.app.App;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.model.app.ScreenMethod;
import com.youraitester.model.app.ScreenMethodParam;
import com.youraitester.repository.TestRepository;
import com.youraitester.repository.app.AppRepository;
import com.youraitester.service.JavaLocatorImportService;
import com.youraitester.service.JavaMethodImportService;
import com.youraitester.service.PluginJarLoaderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/apps")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AppAdminController {

    private final AppRepository appRepository;
    private final TestRepository testRepository;
    private final JavaLocatorImportService javaLocatorImportService;
    private final JavaMethodImportService javaMethodImportService;
    private final PluginJarLoaderService pluginJarLoaderService;

    /**
     * Returns all apps with their info (for Super Admin app metadata management).
     */
    @GetMapping
    public ResponseEntity<List<App>> listApps() {
        return ResponseEntity.ok(appRepository.findAll());
    }

    /**
     * SUPER_ADMIN: create a new app.
     * Body: { "name": "myapp", "info": "optional (<=4000 chars)" }
     */
    @PostMapping
    public ResponseEntity<?> createApp(@RequestBody Map<String, String> body) {
        String name = body != null ? body.get("name") : null;
        String info = body != null ? body.get("info") : null;

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "name is required"));
        }
        name = name.trim();
        if (name.length() > 200) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "name must be <= 200 characters"));
        }
        if (info != null && info.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_request", "message", "info must be <= 4000 characters"));
        }

        if (appRepository.findByNameIgnoreCase(name).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "conflict", "message", "App already exists with name: " + name));
        }

        App app = new App();
        app.setName(name);
        app.setInfo(info);
        App saved = appRepository.save(app);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{appId}")
    public ResponseEntity<App> getApp(@PathVariable Long appId) {
        return appRepository.findById(appId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update app info (max 4000 chars).
     * Body: { "info": "..." }
     */
    @PutMapping("/{appId}/info")
    public ResponseEntity<?> updateInfo(@PathVariable Long appId, @RequestBody Map<String, String> body) {
        String info = body != null ? body.get("info") : null;
        if (info != null && info.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "bad_request",
                "message", "info must be <= 4000 characters"
            ));
        }

        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();

        app.setInfo(info);
        App saved = appRepository.save(app);
        return ResponseEntity.ok(saved);
    }

    /**
     * Update plugin/JAR execution settings for an app.
     *
     * Body (all optional):
     * {
     *   "executionMode": "DB_METHOD_BODY|JAR_PLUGIN",
     *   "pluginJarPath": "plugins/saucedemo-plugin-1.0.0.jar",
     *   "pluginVersion": "1.0.0",
     *   "pluginSha256": "<sha256 hex>"
     * }
     */
    @PutMapping("/{appId}/plugin")
    public ResponseEntity<?> updatePluginSettings(@PathVariable Long appId, @RequestBody Map<String, String> body) {
        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();

        String executionMode = body != null ? body.get("executionMode") : null;
        String pluginJarPath = body != null ? body.get("pluginJarPath") : null;
        String pluginVersion = body != null ? body.get("pluginVersion") : null;
        String pluginSha256 = body != null ? body.get("pluginSha256") : null;

        if (executionMode != null && !executionMode.isBlank()) {
            try {
                app.setExecutionMode(App.ExecutionMode.valueOf(executionMode.trim().toUpperCase()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "bad_request",
                    "message", "executionMode must be one of: DB_METHOD_BODY, JAR_PLUGIN"
                ));
            }
        }

        if (pluginJarPath != null) {
            String p = pluginJarPath.trim();
            if (!p.isEmpty() && !p.toLowerCase().endsWith(".jar")) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "bad_request",
                    "message", "pluginJarPath must end with .jar"
                ));
            }
            if (p.length() > 1000) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "bad_request",
                    "message", "pluginJarPath must be <= 1000 characters"
                ));
            }
            app.setPluginJarPath(p.isEmpty() ? null : p);
        }

        if (pluginVersion != null) {
            String v = pluginVersion.trim();
            if (v.length() > 200) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "bad_request",
                    "message", "pluginVersion must be <= 200 characters"
                ));
            }
            app.setPluginVersion(v.isEmpty() ? null : v);
        }

        if (pluginSha256 != null) {
            String s = pluginSha256.trim().toLowerCase();
            if (!s.isEmpty() && (s.length() < 32 || s.length() > 128)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "bad_request",
                    "message", "pluginSha256 must be a hex string (length 32-128)"
                ));
            }
            app.setPluginSha256(s.isEmpty() ? null : s);
        }

        App saved = appRepository.save(app);
        return ResponseEntity.ok(saved);
    }

    /**
     * Validate and describe the configured plugin jar for an app.
     *
     * This loads the jar (enforcing allowlist + optional sha256 verification) and returns:
     * - plugin appName
     * - jar path + computed sha256
     * - screens and their public instance methods (for mapping/debugging)
     */
    @GetMapping("/{appId}/plugin/describe")
    public ResponseEntity<?> describePlugin(@PathVariable Long appId) {
        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();

        try {
            PluginJarLoaderService.LoadedPlugin lp = pluginJarLoaderService.loadForApp(app);
            var plugin = lp.plugin();

            Map<String, Object> out = new HashMap<>();
            out.put("appId", app.getId());
            out.put("appName", app.getName());
            out.put("executionMode", app.getExecutionMode());
            out.put("pluginJarPath", app.getPluginJarPath());
            out.put("pluginVersion", app.getPluginVersion());
            out.put("pluginSha256Expected", app.getPluginSha256());

            out.put("loadedJarPath", lp.jarPath().toString());
            out.put("loadedJarSha256", lp.sha256());
            out.put("pluginAppName", plugin.getAppName());
            out.put("screenNames", plugin.getScreenNames());

            Map<String, Object> methodsByScreen = new HashMap<>();
            if (plugin.getScreenNames() != null) {
                for (String screen : plugin.getScreenNames()) {
                    if (screen == null || screen.isBlank()) continue;
                    Class<?> cls = null;
                    try { cls = plugin.getScreenClass(screen); } catch (Exception ignored) {}
                    if (cls == null) {
                        methodsByScreen.put(screen, List.of());
                        continue;
                    }
                    List<String> methodNames = new ArrayList<>();
                    for (Method m : cls.getMethods()) {
                        if (m == null) continue;
                        if (m.getDeclaringClass() == Object.class) continue;
                        if (Modifier.isStatic(m.getModifiers())) continue;
                        methodNames.add(m.getName());
                    }
                    methodsByScreen.put(screen, methodNames);
                }
            }
            out.put("methodsByScreen", methodsByScreen);

            return ResponseEntity.ok(out);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "bad_request",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * SUPER_ADMIN: return all apps with screens and full runtime metadata.
     * (screen fields + method signatures + element registry + method metadata)
     */
    @GetMapping("/screens/details")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listAllAppsWithScreensDetails() {
        List<App> apps = appRepository.findAll();
        List<Map<String, Object>> out = new ArrayList<>();

        for (App app : apps) {
            Map<String, Object> appJson = new HashMap<>();
            appJson.put("appId", app.getId());
            appJson.put("appName", app.getName());
            appJson.put("info", app.getInfo());

            List<Map<String, Object>> screens = new ArrayList<>();
            if (app.getScreens() != null) {
                for (Screen s : app.getScreens()) {
                    if (s == null) continue;
                    Map<String, Object> sJson = new HashMap<>();
                    sJson.put("screenId", s.getId());
                    sJson.put("name", s.getName());
                    sJson.put("fieldNames", s.getFieldNames());
                    sJson.put("methodSignatures", s.getMethodSignatures());
                    sJson.put("elements", s.getElements());
                    sJson.put("methods", s.getMethods());
                    screens.add(sJson);
                }
            }
            appJson.put("screens", screens);
            out.add(appJson);
        }

        return ResponseEntity.ok(out);
    }

    /**
     * SUPER_ADMIN: upsert a screen and replace its metadata.
     *
     * Body:
     * {
     *   "fieldNames": [...],
     *   "methodSignatures": [...],
     *   "elements": [...],
     *   "methods": [...]
     * }
     */
    @PutMapping("/{appId}/screens/{screenName}")
    @Transactional
    public ResponseEntity<Screen> upsertScreen(@PathVariable Long appId,
                                               @PathVariable String screenName,
                                               @RequestBody AdminScreenUpsertRequest body) {
        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();
        Screen screen = findOrCreateScreen(app, screenName);

        if (body != null) {
            screen.setFieldNames(body.getFieldNames());
            screen.setMethodSignatures(body.getMethodSignatures());

            // Replace elements
            replaceElements(screen, body.getElements());
            // Replace methods
            replaceMethods(screen, body.getMethods());
        }

        // Save via app for cascade
        appRepository.save(app);

        // Reload so generated IDs are populated in the response
        App reloaded = appRepository.findById(appId).orElse(app);
        if (reloaded.getScreens() != null) {
            for (Screen s : reloaded.getScreens()) {
                if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                    return ResponseEntity.ok(s);
                }
            }
        }
        return ResponseEntity.ok(screen);
    }

    /**
     * SUPER_ADMIN: refresh a screen's element registry from any Java page-object file by parsing
     * `page.locator("...")` assignments.
     *
     * Parameters:
     * - sourcePath: path to a .java file UNDER backend/src/main/java (required)
     *
     * Example:
     * POST /api/admin/apps/by-name/testautomationpractice/screens/homepage/import-elements-from-java?sourcePath=src/main/java/testautomationpractice/HomePage.java
     */
    @PostMapping("/by-name/{appName}/screens/{screenName}/import-elements-from-java")
    @Transactional
    public ResponseEntity<?> importElementsFromHomePageJava(@PathVariable String appName,
                                                            @PathVariable String screenName,
                                                            @RequestParam String sourcePath) {
        App app = appRepository.findByNameIgnoreCase(appName).orElse(null);
        if (app == null) {
            return ResponseEntity.status(404).body(Map.of(
                "error", "not_found",
                "message", "App not found: " + appName
            ));
        }

        Screen screen = findOrCreateScreen(app, screenName);
        List<ScreenElementRequest> elements = javaLocatorImportService.loadElementsFromJavaSource(sourcePath);
        replaceElements(screen, elements);
        appRepository.save(app);

        return ResponseEntity.ok(Map.of(
            "appId", app.getId(),
            "appName", app.getName(),
            "screenName", screenName,
            "sourcePath", sourcePath,
            "elementsImported", elements != null ? elements.size() : 0
        ));
    }

    /**
     * SUPER_ADMIN: refresh a screen's method registry from any Java page-object file by parsing
     * `public ... method(...) { ... }` blocks and storing signatures + bodies.
     *
     * Parameters:
     * - sourcePath: path to a .java file UNDER backend/src/main/java (required)
     *
     * Example:
     * POST /api/admin/apps/by-name/testautomationpractice/screens/homepage/import-methods-from-java?sourcePath=src/main/java/testautomationpractice/HomePage.java
     */
    @PostMapping("/by-name/{appName}/screens/{screenName}/import-methods-from-java")
    @Transactional
    public ResponseEntity<?> importMethodsFromJava(@PathVariable String appName,
                                                   @PathVariable String screenName,
                                                   @RequestParam String sourcePath) {
        App app = appRepository.findByNameIgnoreCase(appName).orElse(null);
        if (app == null) {
            return ResponseEntity.status(404).body(Map.of(
                "error", "not_found",
                "message", "App not found: " + appName
            ));
        }

        Screen screen = findOrCreateScreen(app, screenName);
        List<ScreenMethodRequest> methods = javaMethodImportService.loadMethodsFromJavaSource(sourcePath);
        replaceMethods(screen, methods);
        appRepository.save(app);

        return ResponseEntity.ok(Map.of(
            "appId", app.getId(),
            "appName", app.getName(),
            "screenName", screenName,
            "sourcePath", sourcePath,
            "methodsImported", methods != null ? methods.size() : 0
        ));
    }

    /**
     * Back-compat alias (older endpoint name).
     * Uses the generic endpoint with the historic default HomePage.java path.
     */
    @PostMapping("/by-name/{appName}/screens/{screenName}/import-elements-from-homepage-java")
    @Transactional
    public ResponseEntity<?> importElementsFromHomePageJavaAlias(@PathVariable String appName,
                                                                 @PathVariable String screenName) {
        String defaultSourcePath = "src/main/java/testautomationpractice/HomePage.java";
        return importElementsFromHomePageJava(appName, screenName, defaultSourcePath);
    }

    @DeleteMapping("/{appId}/screens/{screenName}")
    @Transactional
    public ResponseEntity<?> deleteScreen(@PathVariable Long appId, @PathVariable String screenName) {
        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();
        if (app.getScreens() == null) return ResponseEntity.noContent().build();

        app.getScreens().removeIf(s -> s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName));
        appRepository.save(app);
        return ResponseEntity.noContent().build();
    }

    /**
     * SUPER_ADMIN: delete an app and its screen registry.
     *
     * Safety: before deleting the app, we unlink any tests that reference this appId by setting test.appId = null.
     * This avoids breaking existing tests due to FK constraints and makes the impact explicit in the response.
     */
    @DeleteMapping("/{appId}")
    @Transactional
    public ResponseEntity<?> deleteApp(@PathVariable Long appId) {
        App app = appRepository.findById(appId).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();

        int unlinked = 0;
        try {
            unlinked = testRepository.clearAppIdForTests(appId);
        } catch (Exception e) {
            log.warn("Failed to unlink tests for appId={} before delete: {}", appId, e.getMessage());
        }

        String appName = app.getName();
        appRepository.delete(app);

        return ResponseEntity.ok(Map.of(
            "deleted", true,
            "appId", appId,
            "appName", appName,
            "testsUnlinked", unlinked
        ));
    }

    private Screen findOrCreateScreen(App app, String screenName) {
        if (screenName == null || screenName.isBlank()) {
            throw new RuntimeException("screenName is required");
        }
        List<Screen> screens = app.getScreens();
        if (screens == null) {
            screens = new ArrayList<>();
            app.setScreens(screens);
        }
        for (Screen s : screens) {
            if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                return s;
            }
        }
        Screen created = new Screen();
        created.setName(screenName);
        created.setApp(app);
        screens.add(created);
        return created;
    }

    private void replaceElements(Screen screen, List<ScreenElementRequest> elements) {
        List<ScreenElement> managed = screen.getElements();
        if (managed == null) {
            managed = new ArrayList<>();
            screen.setElements(managed);
        } else {
            managed.clear();
        }
        if (elements == null) return;
        for (ScreenElementRequest req : elements) {
            if (req == null) continue;
            ScreenElement el = new ScreenElement();
            el.setElementName(req.getElementName());
            el.setSelectorType(req.getSelectorType());
            el.setSelector(req.getSelector());
            el.setFrameSelector(req.getFrameSelector());
            // Keep the element registry minimal: elementName + selector (+ optional frameSelector).
            // We intentionally do not persist elementType/actionsSupported to keep the model lightweight.
            el.setElementType(null);
            el.setActionsSupported(null);
            el.setScreen(screen);
            managed.add(el);
        }
    }

    private void replaceMethods(Screen screen, List<ScreenMethodRequest> methods) {
        List<ScreenMethod> managed = screen.getMethods();
        if (managed == null) {
            managed = new ArrayList<>();
            screen.setMethods(managed);
        } else {
            managed.clear();
        }
        if (methods == null) return;

        for (ScreenMethodRequest req : methods) {
            if (req == null) continue;
            ScreenMethod m = new ScreenMethod();
            m.setMethodName(req.getMethodName());
            m.setMethodSignature(req.getMethodSignature());
            m.setMethodBody(req.getMethodBody());
            m.setReturnHandling(req.getReturnHandling());
            m.setSideEffectFlags(req.getSideEffectFlags());
            m.setScreen(screen);

            List<ScreenMethodParam> params = new ArrayList<>();
            if (req.getParams() != null) {
                for (ScreenMethodParamRequest pr : req.getParams()) {
                    if (pr == null) continue;
                    ScreenMethodParam p = new ScreenMethodParam();
                    p.setName(pr.getName());
                    p.setType(pr.getType());
                    p.setOptional(pr.getOptional());
                    p.setDefaultValue(pr.getDefaultValue());
                    p.setMethod(m);
                    params.add(p);
                }
            }
            m.setParams(params);
            managed.add(m);
        }
    }
}


