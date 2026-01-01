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
import com.youraitester.repository.app.AppRepository;
import com.youraitester.service.JavaLocatorImportService;
import com.youraitester.service.JavaMethodImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
    private final JavaLocatorImportService javaLocatorImportService;
    private final JavaMethodImportService javaMethodImportService;

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
            el.setElementType(req.getElementType());
            el.setActionsSupported(req.getActionsSupported());
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


