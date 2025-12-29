package com.youraitester.controller.app;

import com.youraitester.dto.app.ActionTemplateRequest;
import com.youraitester.dto.app.ScreenElementRequest;
import com.youraitester.dto.app.ScreenMethodParamRequest;
import com.youraitester.dto.app.ScreenMethodRequest;
import com.youraitester.model.app.App;
import com.youraitester.model.app.ActionTemplate;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.model.app.ScreenMethod;
import com.youraitester.model.app.ScreenMethodParam;
import com.youraitester.repository.app.AppRepository;
import com.youraitester.repository.app.ActionTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/app")
public class AppScreenController {
    private static final Logger logger = LoggerFactory.getLogger(AppScreenController.class);
    @Autowired
    private AppRepository appRepository;
    @Autowired
    private ActionTemplateRepository actionTemplateRepository;

        // Create a new app
        @PostMapping("")
        public App createApp(@RequestBody App app) {
            logger.info("Received request to create app with name: {}", app.getName());
            return appRepository.save(app);
        }

        // List all apps
        @GetMapping("")
        public List<App> getAllApps() {
            logger.info("Received request to list all apps");
            return appRepository.findAll();
        }

    // Store screens, fieldnames, methodsignatures for an app
    @PostMapping("/{appId}/screens")
    public App addScreensToApp(@PathVariable Long appId, @RequestBody List<Screen> screens) {
        logger.info("Received request to add screens to app with id: {}. Screens: {}", appId, screens);
        Optional<App> appOpt = appRepository.findById(appId);
        if (appOpt.isPresent()) {
            App app = appOpt.get();
            // IMPORTANT: App.screens uses orphanRemoval=true; do not replace the collection instance
            // or Hibernate can throw "collection ... no longer referenced by the owning entity".
            List<Screen> managedScreens = app.getScreens();
            if (managedScreens == null) {
                managedScreens = new ArrayList<>();
                app.setScreens(managedScreens);
            } else {
                managedScreens.clear();
            }

            for (Screen screen : screens) {
                screen.setApp(app);
                // Ensure child collections have backrefs set for cascade persist
                if (screen.getElements() != null) {
                    for (ScreenElement el : screen.getElements()) {
                        el.setScreen(screen);
                    }
                }
                if (screen.getMethods() != null) {
                    for (ScreenMethod m : screen.getMethods()) {
                        m.setScreen(screen);
                        if (m.getParams() != null) {
                            for (ScreenMethodParam p : m.getParams()) {
                                p.setMethod(m);
                            }
                        }
                    }
                }
                managedScreens.add(screen);
            }
            logger.info("Saving app with updated screens. App id: {}, Screens count: {}", app.getId(), screens.size());
            return appRepository.save(app);
        }
        logger.warn("App not found for id: {} when adding screens", appId);
        throw new RuntimeException("App not found");
    }

    // Get screens, fieldnames, methodsignatures for an app
    @GetMapping("/{appId}/screens")
    public List<Screen> getScreensForApp(@PathVariable Long appId) {
        logger.info("Received request to get screens for app with id: {}", appId);
        Optional<App> appOpt = appRepository.findById(appId);
        if (appOpt.isPresent()) {
            logger.info("Returning screens for app id: {}. Screens count: {}", appId, appOpt.get().getScreens().size());
            return appOpt.get().getScreens();
        }
        logger.warn("App not found for id: {} when retrieving screens", appId);
        throw new RuntimeException("App not found");
    }

    /**
     * Returns a single JSON object with the app metadata and all screens (including fieldNames + methodSignatures).
     *
     * Response shape:
     * {
     *   "appId": 123,
     *   "appName": "my-app",
     *   "screens": [
     *     { "name": "homepage", "fieldNames": [...], "methodSignatures": [...] }
     *   ]
     * }
     */
    @GetMapping("/{appId}/screens/details")
    public Map<String, Object> getAppScreensDetails(@PathVariable Long appId) {
        logger.info("Received request to get app screens details for app id: {}", appId);
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));

        List<Map<String, Object>> screens = new ArrayList<>();
        if (app.getScreens() != null) {
            for (Screen s : app.getScreens()) {
                Map<String, Object> screenJson = new HashMap<>();
                screenJson.put("name", s.getName());
                screenJson.put("fieldNames", s.getFieldNames());
                screenJson.put("methodSignatures", s.getMethodSignatures());
                screens.add(screenJson);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("appId", app.getId());
        response.put("appName", app.getName());
        response.put("screens", screens);
        return response;
    }

    /**
     * Stores arbitrary app info (up to 4000 characters) on the App record.
     *
     * Request: { "info": "..." }
     * Response: { "appId": 123, "info": "..." }
     */
    @PostMapping("/{appId}/info")
    public ResponseEntity<Map<String, Object>> setAppInfo(@PathVariable Long appId, @RequestBody Map<String, String> body) {
        String info = body == null ? null : body.get("info");
        if (info != null && info.length() > 4000) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "bad_request",
                "message", "info must be <= 4000 characters"
            ));
        }

        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        app.setInfo(info);
        appRepository.save(app);

        return ResponseEntity.ok(Map.of("appId", app.getId(), "info", app.getInfo()));
    }

    /**
     * Fetches stored app info (may be null).
     *
     * Response: { "appId": 123, "info": "..." }
     */
    @GetMapping("/{appId}/info")
    public Map<String, Object> getAppInfo(@PathVariable Long appId) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        return Map.of("appId", app.getId(), "info", app.getInfo());
    }

    /**
     * List action templates for an app (used by step mappings to execute deterministically).
     */
    @GetMapping("/{appId}/action-templates")
    public List<ActionTemplate> getActionTemplates(@PathVariable Long appId) {
        logger.info("Received request to get action templates for app id: {}", appId);
        return actionTemplateRepository.findByAppId(appId);
    }

    /**
     * Replace action templates for an app.
     *
     * Body: [{ "intent": "FILL", "elementType": "input", "template": "locator.fill(value)" }, ...]
     */
    @PostMapping("/{appId}/action-templates")
    @Transactional
    public List<ActionTemplate> replaceActionTemplates(@PathVariable Long appId, @RequestBody List<ActionTemplateRequest> templates) {
        logger.info("Received request to replace action templates for app id: {}. Count={}", appId, templates != null ? templates.size() : 0);
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));

        // Simple replace semantics
        actionTemplateRepository.deleteByAppId(appId);

        if (templates == null || templates.isEmpty()) {
            return List.of();
        }

        List<ActionTemplate> entities = new ArrayList<>();
        for (ActionTemplateRequest req : templates) {
            if (req == null) continue;
            if (req.getIntent() == null || req.getIntent().isBlank()) {
                throw new RuntimeException("intent is required");
            }
            if (req.getElementType() == null || req.getElementType().isBlank()) {
                throw new RuntimeException("elementType is required");
            }
            if (req.getTemplate() == null || req.getTemplate().isBlank()) {
                throw new RuntimeException("template is required");
            }
            if (req.getTemplate().length() > 4000) {
                throw new RuntimeException("template must be <= 4000 characters");
            }

            ActionTemplate t = new ActionTemplate();
            t.setIntent(req.getIntent());
            t.setElementType(req.getElementType());
            t.setTemplate(req.getTemplate());
            t.setApp(app);
            entities.add(t);
        }

        return actionTemplateRepository.saveAll(entities);
    }

    /**
     * Replace the screen's element registry (page-object-free runtime execution).
     *
     * Body: [{ elementName, selectorType, selector, frameSelector, elementType, actionsSupported[] }, ...]
     */
    @PutMapping("/{appId}/screens/{screenName}/elements")
    @Transactional
    public List<ScreenElement> replaceScreenElements(@PathVariable Long appId,
                                                     @PathVariable String screenName,
                                                     @RequestBody List<ScreenElementRequest> elements) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        Screen screen = findOrCreateScreen(app, screenName);

        List<ScreenElement> managed = screen.getElements();
        if (managed == null) {
            managed = new ArrayList<>();
            screen.setElements(managed);
        } else {
            managed.clear();
        }

        if (elements != null) {
            for (ScreenElementRequest req : elements) {
                if (req == null) continue;
                if (req.getElementName() == null || req.getElementName().isBlank()) {
                    throw new RuntimeException("elementName is required");
                }
                if (req.getSelector() == null || req.getSelector().isBlank()) {
                    throw new RuntimeException("selector is required");
                }
                if (req.getSelector().length() > 4000) {
                    throw new RuntimeException("selector must be <= 4000 characters");
                }
                if (req.getFrameSelector() != null && req.getFrameSelector().length() > 4000) {
                    throw new RuntimeException("frameSelector must be <= 4000 characters");
                }

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

        appRepository.save(app);
        return screen.getElements() != null ? screen.getElements() : List.of();
    }

    @GetMapping("/{appId}/screens/{screenName}/elements")
    public List<ScreenElement> getScreenElements(@PathVariable Long appId, @PathVariable String screenName) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        if (app.getScreens() != null) {
            for (Screen s : app.getScreens()) {
                if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                    return s.getElements() != null ? s.getElements() : List.of();
                }
            }
        }
        throw new RuntimeException("Screen not found");
    }

    /**
     * Replace the screen's method metadata (optional; useful if you ever add reflective method calls).
     */
    @PutMapping("/{appId}/screens/{screenName}/methods")
    @Transactional
    public List<ScreenMethod> replaceScreenMethods(@PathVariable Long appId,
                                                   @PathVariable String screenName,
                                                   @RequestBody List<ScreenMethodRequest> methods) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        Screen screen = findOrCreateScreen(app, screenName);

        List<ScreenMethod> managed = screen.getMethods();
        if (managed == null) {
            managed = new ArrayList<>();
            screen.setMethods(managed);
        } else {
            managed.clear();
        }

        if (methods != null) {
            for (ScreenMethodRequest req : methods) {
                if (req == null) continue;
                if (req.getMethodName() == null || req.getMethodName().isBlank()) {
                    throw new RuntimeException("methodName is required");
                }

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
                        if (pr.getName() == null || pr.getName().isBlank()) {
                            throw new RuntimeException("method param name is required");
                        }
                        if (pr.getType() == null || pr.getType().isBlank()) {
                            throw new RuntimeException("method param type is required");
                        }
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

        appRepository.save(app);
        return screen.getMethods() != null ? screen.getMethods() : List.of();
    }

    @GetMapping("/{appId}/screens/{screenName}/methods")
    public List<ScreenMethod> getScreenMethods(@PathVariable Long appId, @PathVariable String screenName) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        if (app.getScreens() != null) {
            for (Screen s : app.getScreens()) {
                if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                    return s.getMethods() != null ? s.getMethods() : List.of();
                }
            }
        }
        throw new RuntimeException("Screen not found");
    }

    /**
     * Convenience endpoint: everything needed for deterministic runtime mapping.
     */
    @GetMapping("/{appId}/screens/{screenName}/runtime")
    public Map<String, Object> getScreenRuntimeProfile(@PathVariable Long appId, @PathVariable String screenName) {
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found"));
        Screen screen = null;
        if (app.getScreens() != null) {
            for (Screen s : app.getScreens()) {
                if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                    screen = s;
                    break;
                }
            }
        }
        if (screen == null) {
            throw new RuntimeException("Screen not found");
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("appId", app.getId());
        resp.put("appName", app.getName());
        resp.put("screenName", screen.getName());
        resp.put("elements", screen.getElements() != null ? screen.getElements() : List.of());
        resp.put("methods", screen.getMethods() != null ? screen.getMethods() : List.of());
        resp.put("actionTemplates", actionTemplateRepository.findByAppId(appId));
        return resp;
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
}
