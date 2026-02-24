package com.youraitester.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.youraitester.agent.LlmProvider;
import com.youraitester.agent.impl.SimpleMessage;
import com.youraitester.model.Test;
import com.youraitester.model.TestStep;
import com.youraitester.model.app.App;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.model.app.ScreenMethod;
import com.youraitester.repository.app.AppRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Save-time mapping:
 * Convert natural language step instructions into deterministic mapped commands stored on the step:
 * - step.type   = action name (fill/click/select_by_value/select_by_label/hover/press_key/navigate)
 * - step.selector = resolved CSS selector from Screen.elements
 * - step.value  = value for fill/select/navigate/press_key
 *
 * This allows execution to run without any LLM calls.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TestStepMappingService {

    private final AppRepository appRepository;
    private final ScreenInferenceService screenInferenceService;
    private final Map<String, LlmProvider> providers;
    private final PluginJarLoaderService pluginJarLoaderService;

    @Value("${agent.llm.provider:openai}")
    private String providerName;

    /**
     * When true and provider is available, we use LLM to map English to known elements/methods on save.
     * This reduces runtime token usage because execution runs purely from mapped steps.
     */
    @Value("${mapping.llm.enabled:true}")
    private boolean mappingLlmEnabled;

    /**
     * If true, attempt LLM mapping first (even if deterministic parser could parse).
     * If false, only call LLM when deterministic parsing fails/ambiguous.
     */
    @Value("${mapping.llm.prefer:true}")
    private boolean mappingLlmPrefer;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void mapTestSteps(Test test) {
        if (test == null) return;
        if (test.getAppId() == null) {
            log.info("[MAP] Skipping mapping: test has no appId (testId={})", test.getId());
            return;
        }
        if (test.getSteps() == null || test.getSteps().isEmpty()) {
            return;
        }

        App app = appRepository.findById(test.getAppId())
            .orElseThrow(() -> new RuntimeException("App not found: " + test.getAppId()));

        // In DB_METHOD_BODY mode, screens/elements come from DB and are required to map.
        // In JAR_PLUGIN mode, methods can come from the plugin jar, so we can still map call_method
        // even when there are no DB screens configured.
        if (app.getExecutionMode() != App.ExecutionMode.JAR_PLUGIN) {
            if (app.getScreens() == null || app.getScreens().isEmpty()) {
                log.warn("[MAP] No screens configured for appId={} - cannot map steps", test.getAppId());
                return;
            }
        }

        // Candidate screen names
        List<String> screenNames = new ArrayList<>();
        List<Screen> dbScreens = app.getScreens() != null ? app.getScreens() : List.of();
        for (Screen s : dbScreens) {
            if (s != null && s.getName() != null && !s.getName().isBlank()) screenNames.add(s.getName());
        }
        // If in JAR_PLUGIN mode and DB has no screens, derive candidate screen names from plugin jar.
        if (screenNames.isEmpty() && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
            try {
                var lp = pluginJarLoaderService.loadForApp(app);
                if (lp.plugin().getScreenNames() != null) {
                    screenNames.addAll(lp.plugin().getScreenNames());
                }
            } catch (Exception e) {
                log.warn("[MAP] JAR_PLUGIN enabled but plugin could not be loaded for candidate screens. {}", e.getMessage());
            }
        }

        String lastScreen = null;
        List<String> executedSoFar = new ArrayList<>();

        for (TestStep step : test.getSteps()) {
            if (step == null) continue;
            String instr = step.getInstruction();
            executedSoFar.add(instr != null ? instr : "");

            // Deterministic override: prefer a common "nth input field" helper method when available.
            // This avoids the LLM choosing an arbitrary element like #textarea when the intent is positional input selection.
            if (instr != null && !instr.isBlank()) {
                NthInputParsed nth = parseNthInputInstruction(instr);
                if (nth != null) {
                    MethodMatch forced = tryMapNthInputToCommonMethod(app, step, instr, dbScreens, lastScreen);
                    if (forced != null) {
                        lastScreen = forced.screenName;
                        continue;
                    }
                    // If the user didn't specify a concrete element name, we MUST NOT guess an arbitrary element.
                    // Leave it unmapped so the user can add/enable the helper method (or explicitly name a target).
                    log.warn("[MAP] Nth-input instruction detected but enterValueInNthInputField was not found/exposed. Leaving step unmapped. order={} instruction='{}'", step.getOrder(), instr);
                    continue;
                }
            }

            Parsed parsed = Parsed.parse(instr);

            // Prefer deterministic mapping for already-structured instructions when we can resolve an element.
            // This prevents the LLM from "guessing" a wrong target (e.g., mapping "password" to an email field).
            if (parsed != null && parsed.elementName != null && !parsed.elementName.isBlank()) {
                if (!"navigate".equals(parsed.action) && !"call_method".equals(parsed.action)) {
                    Match dm = resolveBestAcrossScreens(dbScreens, parsed.elementName, instr, lastScreen);
                    if (dm != null) {
                        lastScreen = dm.screenName;
                        step.setType(parsed.action);
                        step.setSelector(dm.selector);
                        step.setValue(parsed.value);
                        log.info("[MAP] Deterministic mapping chosen (skip LLM). order={} action={} screen='{}' element='{}' selector='{}' value={}",
                            step.getOrder(),
                            parsed.action,
                            dm.screenName,
                            dm.elementName,
                            dm.selector,
                            valueForLog(dm.elementName, parsed.value));
                        continue;
                    }
                }
            }

            // LLM mapping: if enabled + provider available, try to map the instruction to known elements/methods.
            // This is the "intelligent" path for natural English like "add to cart product named X".
            if (mappingLlmEnabled && (mappingLlmPrefer || parsed == null)) {
                try {
                    LlmMapped mapped = tryMapWithLlm(app, dbScreens, screenNames, lastScreen, executedSoFar, instr);
                    if (mapped != null) {
                        applyMappedStep(step, mapped, dbScreens);
                        if (mapped.screen != null) lastScreen = mapped.screen;
                        continue;
                    }
                } catch (Exception e) {
                    log.warn("[MAP-LLM] Mapping failed for step order={} (continuing with fallback). {}",
                        step.getOrder(), e.getMessage());
                }
            }

            if (parsed == null) {
                // leave unmapped
                log.info("[MAP] Unmapped step (unsupported format). order={} instruction='{}'", step.getOrder(), instr);
                continue;
            }

            // Navigation steps: mapped without app screen lookup
            if ("navigate".equals(parsed.action)) {
                step.setType("navigate");
                step.setSelector(null);
                step.setValue(parsed.value);
                log.info("[MAP] Mapped navigate step. order={} url='{}'", step.getOrder(), parsed.value);
                continue;
            }

            // Method call steps: resolve method across screens; store as call_method with "screen::method" in selector.
            if ("call_method".equals(parsed.action)) {
                MethodMatch mm = resolveMethodAcrossScreens(dbScreens, parsed.elementName, lastScreen);
                // In JAR_PLUGIN mode, allow resolving methods from the plugin jar even when DB screens/methods are empty.
                if (mm == null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
                    mm = resolveMethodAcrossPlugin(app, parsed.elementName, lastScreen);
                }
                if (mm == null) {
                    log.warn("[MAP] Could not resolve method for step. order={} method='{}' instruction='{}'",
                        step.getOrder(), parsed.elementName, instr);
                    continue;
                }
                lastScreen = mm.screenName;
                step.setType("call_method");
                step.setSelector(mm.screenName + "::" + mm.methodName);
                step.setValue(parsed.value);
                log.info("[MAP] Mapped method call. order={} screen='{}' method='{}' arg={}",
                    step.getOrder(), mm.screenName, mm.methodName, valueForLog(mm.methodName, parsed.value));
                continue;
            }

            // Resolve element across screens.
            Match match = resolveBestAcrossScreens(dbScreens, parsed.elementName, instr, lastScreen);
            if (match == null) {
                // If ambiguous, try screen inference among candidate screens that contain a likely match.
                List<String> candidates = candidateScreensForElement(dbScreens, parsed.elementName);
                if (!candidates.isEmpty()) {
                    String inferred = screenInferenceService.inferScreenName(app.getInfo(), candidates, executedSoFar, lastScreen);
                    match = resolveWithinScreen(dbScreens, inferred, parsed.elementName);
                }
            }

            if (match == null) {
                log.warn("[MAP] Could not resolve element for step. order={} action={} element='{}' instruction='{}'",
                    step.getOrder(), parsed.action, parsed.elementName, instr);
                continue;
            }

            lastScreen = match.screenName;

            // Store mapped command using existing columns
            step.setType(parsed.action);
            step.setSelector(match.selector);
            step.setValue(parsed.value);

            log.info("[MAP] Mapped step. order={} action={} screen='{}' element='{}' selector='{}' value={}",
                step.getOrder(),
                parsed.action,
                match.screenName,
                match.elementName,
                match.selector,
                valueForLog(match.elementName, parsed.value));
        }
    }

    /**
     * If the instruction looks like: "enter X in 4th input field" / "enter X in fourth input field",
     * and a method named enterValueInNthInputField exists (prefer screen "commonpage"), map to call_method.
     *
     * Returns the chosen MethodMatch when applied, else null.
     */
    private MethodMatch tryMapNthInputToCommonMethod(App app, TestStep step, String instruction, List<Screen> screens, String lastScreen) {
        if (step == null || instruction == null || screens == null) return null;

        NthInputParsed p = parseNthInputInstruction(instruction);
        if (p == null) return null;

        final String methodName = "enterValueInNthInputField";

        // In JAR_PLUGIN mode, we treat nth-input instructions as a direct call to commonpage helpers.
        // Do not leave these blank and do not guess random elements.
        if (app != null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
            List<String> args = List.of(String.valueOf(p.index), p.value);
            // Best-effort: infer arg order from plugin signature, but never fail mapping if plugin can't load.
            try {
                var lp = pluginJarLoaderService.loadForApp(app);
                var plugin = lp.plugin();
                if (plugin != null) {
                    Class<?> cls = plugin.getScreenClass("commonpage");
                    List<String> inferred = inferNthInputArgsFromReflection(cls, methodName, p.index, p.value);
                    if (inferred != null && inferred.size() == 2) args = inferred;
                }
            } catch (Exception ignored) {}

            step.setType("call_method");
            step.setSelector("commonpage::" + methodName);
            try {
                step.setValue(objectMapper.writeValueAsString(args));
            } catch (Exception e) {
                step.setValue(String.valueOf(args));
            }
            log.info("[MAP] Forced nth-input mapping (JAR_PLUGIN direct). order={} selector={} args={}",
                step.getOrder(), step.getSelector(), args);
            return new MethodMatch("commonpage", methodName);
        }

        com.youraitester.plugin.api.AppPlugin plugin = null;
        if (app != null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
            try {
                var lp = pluginJarLoaderService.loadForApp(app);
                plugin = lp.plugin();
            } catch (Exception e) {
                log.warn("[MAP] Nth-input override: failed to load plugin for method discovery (falling back to DB methods). {}", e.getMessage());
            }
        }

        // JAR_PLUGIN fast-path: if the plugin exposes commonpage.enterValueInNthInputField, map directly.
        // This avoids any ambiguity/heuristics when the user's instruction is purely positional.
        if (app != null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN && plugin != null) {
            try {
                Class<?> cls = plugin.getScreenClass("commonpage");
                if (cls != null) {
                    boolean has = false;
                    for (Method m : cls.getMethods()) {
                        if (m == null) continue;
                        if (m.getDeclaringClass() == Object.class) continue;
                        if (java.lang.reflect.Modifier.isStatic(m.getModifiers())) continue;
                        if (m.getName() != null && m.getName().equalsIgnoreCase(methodName)) { has = true; break; }
                    }
                    if (has) {
                        List<String> args = inferNthInputArgsFromReflection(cls, methodName, p.index, p.value);
                        if (args == null || args.size() != 2) args = List.of(String.valueOf(p.index), p.value);
                        step.setType("call_method");
                        step.setSelector("commonpage::" + methodName);
                        try {
                            step.setValue(objectMapper.writeValueAsString(args));
                        } catch (Exception e) {
                            step.setValue(String.valueOf(args));
                        }
                        log.info("[MAP] Forced nth-input mapping (JAR_PLUGIN fast-path). order={} selector={} args={}",
                            step.getOrder(), step.getSelector(), args);
                        return new MethodMatch("commonpage", methodName);
                    }
                }
            } catch (Exception ignored) {}
        }

        // Prefer resolving from plugin directly in JAR_PLUGIN mode (most reliable), else fall back to DB registry.
        MethodMatch mm = null;
        if (app != null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
            mm = resolveMethodAcrossPlugin(app, methodName, "commonpage");
            if (mm == null) mm = resolveMethodAcrossPlugin(app, methodName, lastScreen);
        }
        if (mm == null) {
            // DB fallback (DB_METHOD_BODY)
            mm = resolveMethodAcrossScreens(screens, methodName, "commonpage");
            if (mm == null) mm = resolveMethodAcrossScreens(screens, methodName, lastScreen);
        }
        if (mm == null) return null;

        ScreenMethod sm = findScreenMethod(screens, mm.screenName, mm.methodName); // DB params (if present)
        List<String> args = buildNthInputArgs(sm, p.index, p.value);

        // If DB method params are not available, try to infer argument order from plugin method signature.
        if ((sm == null || sm.getParams() == null || sm.getParams().isEmpty()) && plugin != null) {
            try {
                Class<?> cls = plugin.getScreenClass(mm.screenName);
                List<String> inferred = inferNthInputArgsFromReflection(cls, mm.methodName, p.index, p.value);
                if (inferred != null && inferred.size() == 2) args = inferred;
            } catch (Exception ignored) {}
        }

        step.setType("call_method");
        step.setSelector(mm.screenName + "::" + mm.methodName);
        try {
            step.setValue(objectMapper.writeValueAsString(args));
        } catch (Exception e) {
            // Fallback to a best-effort single string
            step.setValue(String.valueOf(args));
        }

        log.info("[MAP] Forced nth-input mapping to method. order={} screen='{}' method='{}' args={}",
            step.getOrder(), mm.screenName, mm.methodName, args);
        return mm;
    }

    private List<String> inferNthInputArgsFromReflection(Class<?> cls, String methodName, int index, String value) {
        if (cls == null || methodName == null) return null;
        for (Method m : cls.getMethods()) {
            if (m == null) continue;
            if (!m.getName().equalsIgnoreCase(methodName)) continue;
            if (m.getParameterCount() != 2) continue;
            Class<?>[] pt = m.getParameterTypes();
            if (pt.length != 2) continue;

            boolean p0Int = (pt[0] == int.class || pt[0] == Integer.class);
            boolean p1Int = (pt[1] == int.class || pt[1] == Integer.class);
            boolean p0Str = (pt[0] == String.class);
            boolean p1Str = (pt[1] == String.class);

            if (p0Int && p1Str) return List.of(String.valueOf(index), value);
            if (p0Str && p1Int) return List.of(value, String.valueOf(index));

            // fallback if both are strings: pass index as string first, then value
            if (p0Str && p1Str) return List.of(String.valueOf(index), value);

            // unknown types, keep default
            return List.of(String.valueOf(index), value);
        }
        return null;
    }

    private ScreenMethod findScreenMethod(List<Screen> screens, String screenName, String methodName) {
        if (screens == null || screenName == null || methodName == null) return null;
        for (Screen s : screens) {
            if (s == null || s.getName() == null) continue;
            if (!s.getName().equalsIgnoreCase(screenName)) continue;
            if (s.getMethods() == null) return null;
            for (ScreenMethod m : s.getMethods()) {
                if (m == null || m.getMethodName() == null) continue;
                if (m.getMethodName().equalsIgnoreCase(methodName)) return m;
            }
            return null;
        }
        return null;
    }

    private List<String> buildNthInputArgs(ScreenMethod sm, int index, String value) {
        // Default guess: (nth, value)
        List<String> defaultArgs = List.of(String.valueOf(index), value);
        if (sm == null || sm.getParams() == null || sm.getParams().isEmpty()) return defaultArgs;

        // If method expects exactly 2 params, order them based on type/name heuristics.
        if (sm.getParams().size() == 2) {
            String t0 = sm.getParams().get(0) != null ? sm.getParams().get(0).getType() : null;
            String t1 = sm.getParams().get(1) != null ? sm.getParams().get(1).getType() : null;
            String n0 = sm.getParams().get(0) != null ? sm.getParams().get(0).getName() : null;
            String n1 = sm.getParams().get(1) != null ? sm.getParams().get(1).getName() : null;

            boolean p0Int = isIntType(t0) || looksLikeIndexParamName(n0);
            boolean p1Int = isIntType(t1) || looksLikeIndexParamName(n1);

            if (p0Int && !p1Int) return List.of(String.valueOf(index), value);
            if (!p0Int && p1Int) return List.of(value, String.valueOf(index));
        }

        // For other arities, keep default in first two slots and ignore extras (user can refine later).
        return defaultArgs;
    }

    private boolean isIntType(String type) {
        if (type == null) return false;
        String t = type.trim().toLowerCase(Locale.ROOT);
        return t.equals("int") || t.equals("integer") || t.endsWith(".integer");
    }

    private boolean looksLikeIndexParamName(String name) {
        if (name == null) return false;
        String n = name.trim().toLowerCase(Locale.ROOT);
        return n.contains("index") || n.contains("idx") || n.contains("nth") || n.contains("position") || n.contains("pos") || n.contains("number") || n.equals("n");
    }

    // Accept common variants:
    // - "enter X in 4th input field"
    // - "enter X in fourth input"
    // - "enter X in no.4 input"
    // - "enter X in input #4"
    // - "enter X in input number 4"
    // - "enter X in input 4"
    private static final Pattern NTH_INPUT_PATTERN_A = Pattern.compile(
        "(?i)^\\s*(?:enter|type|fill)\\s+(.+?)\\s+(?:in|into)\\s+(?:the\\s+)?(.+?)\\s+input(?:\\s+(?:field|box))?\\s*$"
    );
    private static final Pattern NTH_INPUT_PATTERN_B = Pattern.compile(
        "(?i)^\\s*(?:enter|type|fill)\\s+(.+?)\\s+(?:in|into)\\s+(?:the\\s+)?input\\s+(.+?)\\s*$"
    );

    private NthInputParsed parseNthInputInstruction(String instruction) {
        if (instruction == null) return null;
        String trimmed = instruction.trim();

        Matcher m = NTH_INPUT_PATTERN_A.matcher(trimmed);
        if (!m.matches()) {
            m = NTH_INPUT_PATTERN_B.matcher(trimmed);
        }
        if (!m.matches()) return null;

        String rawValue = m.group(1) != null ? m.group(1).trim() : null;
        String ordinal = m.group(2) != null ? m.group(2).trim() : null;
        if (rawValue == null || rawValue.isBlank() || ordinal == null || ordinal.isBlank()) return null;

        String value = stripWrappingQuotes(rawValue);
        Integer idx = parseOrdinalToInt(ordinal);
        if (idx == null || idx <= 0) return null;
        return new NthInputParsed(idx, value);
    }

    private String stripWrappingQuotes(String s) {
        if (s == null) return null;
        String v = s.trim();
        if (v.length() >= 2) {
            char a = v.charAt(0);
            char b = v.charAt(v.length() - 1);
            if ((a == '"' && b == '"') || (a == '\'' && b == '\'')) {
                return v.substring(1, v.length() - 1);
            }
        }
        return v;
    }

    private Integer parseOrdinalToInt(String ordinal) {
        if (ordinal == null) return null;
        String o = ordinal.trim().toLowerCase(Locale.ROOT);

        // digits anywhere (e.g., "4th", "input 4", "4")
        Matcher dm = Pattern.compile("(\\d+)").matcher(o);
        if (dm.find()) {
            try { return Integer.parseInt(dm.group(1)); } catch (Exception ignored) {}
        }

        Map<String, Integer> word = new HashMap<>();
        word.put("first", 1);
        word.put("second", 2);
        word.put("third", 3);
        word.put("fourth", 4);
        word.put("fifth", 5);
        word.put("sixth", 6);
        word.put("seventh", 7);
        word.put("eighth", 8);
        word.put("ninth", 9);
        word.put("tenth", 10);
        // also accept cardinals (people often say "input 4" or "number four")
        word.put("one", 1);
        word.put("two", 2);
        word.put("three", 3);
        word.put("four", 4);
        word.put("five", 5);
        word.put("six", 6);
        word.put("seven", 7);
        word.put("eight", 8);
        word.put("nine", 9);
        word.put("ten", 10);

        for (var e : word.entrySet()) {
            if (o.contains(e.getKey())) return e.getValue();
        }
        return null;
    }

    private record NthInputParsed(int index, String value) {}

    private void applyMappedStep(TestStep step, LlmMapped mapped, List<Screen> screens) {
        if (mapped == null) return;

        String action = mapped.action != null ? mapped.action.trim().toLowerCase(Locale.ROOT) : "";
        if (action.isBlank()) return;

        if ("navigate".equals(action)) {
            step.setType("navigate");
            step.setSelector(null);
            step.setValue(mapped.value);
            log.info("[MAP-LLM] Mapped navigate. order={} url='{}'", step.getOrder(), mapped.value);
            return;
        }

        if ("call_method".equals(action)) {
            if (mapped.screen == null || mapped.screen.isBlank()) {
                throw new IllegalArgumentException("LLM mapping missing screen for call_method");
            }
            if (mapped.target == null || mapped.target.isBlank()) {
                throw new IllegalArgumentException("LLM mapping missing target method name");
            }
            step.setType("call_method");
            step.setSelector(mapped.screen + "::" + mapped.target);
            // Prefer args[] for method calls.
            // If user explicitly requested storing the return value, persist as JSON object:
            //   {"args":[...],"export":"varName"}
            try {
                if (mapped.args != null && !mapped.args.isEmpty()) {
                    String export = normalizeExport(mapped.export);
                    if (export != null) {
                        step.setValue(objectMapper.writeValueAsString(Map.of("args", mapped.args, "export", export)));
                    } else {
                        step.setValue(objectMapper.writeValueAsString(mapped.args));
                    }
                } else {
                    // Back-compat: keep single-arg in value, but still allow export if provided
                    String export = normalizeExport(mapped.export);
                    if (export != null && mapped.value != null) {
                        step.setValue(objectMapper.writeValueAsString(Map.of("args", List.of(mapped.value), "export", export)));
                    } else {
                        step.setValue(mapped.value);
                    }
                }
            } catch (Exception e) {
                step.setValue(mapped.value);
            }
            log.info("[MAP-LLM] Mapped method call. order={} screen='{}' method='{}' arg={}",
                step.getOrder(), mapped.screen, mapped.target, valueForLog(mapped.target, mapped.value));
            return;
        }

        // Element actions: resolve selector from Screen.elements
        if (mapped.screen == null || mapped.screen.isBlank()) {
            throw new IllegalArgumentException("LLM mapping missing screen for element action");
        }
        if (mapped.target == null || mapped.target.isBlank()) {
            throw new IllegalArgumentException("LLM mapping missing target element name");
        }

        String selector = null;
        String resolvedElementName = null;
        if (screens != null) {
            for (Screen s : screens) {
                if (s == null || s.getName() == null) continue;
                if (!s.getName().equalsIgnoreCase(mapped.screen)) continue;
                if (s.getElements() == null) break;
                for (ScreenElement el : s.getElements()) {
                    if (el == null || el.getElementName() == null || el.getSelector() == null) continue;
                    if (el.getElementName().equalsIgnoreCase(mapped.target)) {
                        selector = el.getSelector();
                        resolvedElementName = el.getElementName();
                        break;
                    }
                }
                break;
            }
        }
        if (selector == null || selector.isBlank()) {
            throw new IllegalArgumentException("LLM mapping target element not found: screen=" + mapped.screen + " element=" + mapped.target);
        }

        step.setType(action);
        step.setSelector(selector);
        step.setValue(mapped.value);
        log.info("[MAP-LLM] Mapped element action. order={} action={} screen='{}' element='{}' selector='{}' value={}",
            step.getOrder(), action, mapped.screen, resolvedElementName != null ? resolvedElementName : mapped.target, selector,
            valueForLog(mapped.target, mapped.value));
    }

    private static String normalizeExport(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.isEmpty()) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^\\{\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}\\}$").matcher(s);
        if (m.matches()) return m.group(1);
        java.util.regex.Matcher m2 = java.util.regex.Pattern.compile("^\\$\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}$").matcher(s);
        if (m2.matches()) return m2.group(1);
        return s;
    }

    private LlmMapped tryMapWithLlm(App app,
                                   List<Screen> screens,
                                   List<String> candidateScreenNames,
                                   String lastScreen,
                                   List<String> executedSoFar,
                                   String instruction) {
        if (instruction == null || instruction.isBlank()) return null;
        LlmProvider provider = providers.get(providerName);
        if (provider == null || !provider.isAvailable()) return null;

        // In JAR_PLUGIN mode, methods come from the plugin jar (compiled page objects), not the DB method registry.
        // We still include DB elements (if any) so element-action mapping can work too.
        List<Screen> screensForPrompt = screens;
        List<String> candidateNamesForPrompt = candidateScreenNames;
        if (app != null && app.getExecutionMode() == App.ExecutionMode.JAR_PLUGIN) {
            try {
                var lp = pluginJarLoaderService.loadForApp(app);
                screensForPrompt = mergeDbElementsWithPluginMethods(screens, lp.plugin());
                candidateNamesForPrompt = new ArrayList<>();
                if (lp.plugin().getScreenNames() != null) candidateNamesForPrompt.addAll(lp.plugin().getScreenNames());
            } catch (Exception e) {
                log.warn("[MAP-LLM] JAR_PLUGIN enabled but plugin could not be loaded for mapping (falling back to DB targets). {}", e.getMessage());
            }
        }

        String context = buildLlmMappingPrompt(app, screensForPrompt, candidateNamesForPrompt, lastScreen, executedSoFar, instruction);
        List<LlmProvider.Message> messages = new ArrayList<>();
        messages.add(SimpleMessage.system(
            "You map natural language test steps to a deterministic action targeting a known element or method. " +
                "Output MUST be strict JSON only. No markdown, no extra text."
        ));
        messages.add(SimpleMessage.user(context));

        LlmProvider.AgentResponse resp = provider.executeWithTools(messages, List.of(), 1);
        String out = resp != null && resp.getContent() != null ? resp.getContent().trim() : "";
        if (out.isBlank()) return null;

        // Try to extract the first JSON object if the model included extra text.
        String json = extractFirstJsonObject(out);
        if (json == null) return null;

        LlmMapped mapped;
        try {
            mapped = objectMapper.readValue(json, LlmMapped.class);
        } catch (Exception e) {
            log.warn("[MAP-LLM] Failed to parse JSON: {}", e.getMessage());
            return null;
        }

        if (mapped == null || mapped.action == null || mapped.action.isBlank()) return null;
        mapped.action = mapped.action.trim().toLowerCase(Locale.ROOT);
        if (mapped.screen != null) mapped.screen = mapped.screen.trim();
        if (mapped.target != null) mapped.target = mapped.target.trim();
        if (mapped.targetType != null) mapped.targetType = mapped.targetType.trim().toLowerCase(Locale.ROOT);

        // Validate screen is one of candidates (if provided)
        if (mapped.screen != null && !mapped.screen.isBlank() && candidateNamesForPrompt != null && !candidateNamesForPrompt.isEmpty()) {
            boolean ok = false;
            for (String s : candidateNamesForPrompt) {
                if (s != null && s.equalsIgnoreCase(mapped.screen)) { ok = true; mapped.screen = s; break; }
            }
            if (!ok) {
                log.warn("[MAP-LLM] LLM returned screen='{}' not in candidates {}", mapped.screen, candidateNamesForPrompt);
                return null;
            }
        }

        // Validate target exists on screen (element or method)
        if ("call_method".equals(mapped.action)) {
            if (mapped.screen == null || mapped.target == null) return null;
            if (!methodExists(screensForPrompt, mapped.screen, mapped.target)) return null;
        } else if (!"navigate".equals(mapped.action)) {
            if (mapped.screen == null || mapped.target == null) return null;
            if (!elementExists(screensForPrompt, mapped.screen, mapped.target)) return null;
        }

        log.info("[MAP-LLM] Mapped: action={} screen={} targetType={} target={} value={}",
            mapped.action, mapped.screen, mapped.targetType, mapped.target, valueForLog(mapped.target, mapped.value));
        return mapped;
    }

    private boolean elementExists(List<Screen> screens, String screenName, String elementName) {
        if (screens == null) return false;
        for (Screen s : screens) {
            if (s == null || s.getName() == null) continue;
            if (!s.getName().equalsIgnoreCase(screenName)) continue;
            if (s.getElements() == null) return false;
            for (ScreenElement el : s.getElements()) {
                if (el == null || el.getElementName() == null) continue;
                if (el.getElementName().equalsIgnoreCase(elementName)) return true;
            }
            return false;
        }
        return false;
    }

    private boolean methodExists(List<Screen> screens, String screenName, String methodName) {
        if (screens == null) return false;
        for (Screen s : screens) {
            if (s == null || s.getName() == null) continue;
            if (!s.getName().equalsIgnoreCase(screenName)) continue;
            if (s.getMethods() == null) return false;
            for (var m : s.getMethods()) {
                if (m == null || m.getMethodName() == null) continue;
                if (m.getMethodName().equalsIgnoreCase(methodName)) return true;
            }
            return false;
        }
        return false;
    }

    /**
     * Creates a prompt-friendly view of screens where:
     * - elements come from DB (if available)
     * - methods come from plugin jar (compiled classes)
     *
     * This lets us do method-only jar execution while still allowing element actions if DB elements exist.
     */
    private List<Screen> mergeDbElementsWithPluginMethods(List<Screen> dbScreens, com.youraitester.plugin.api.AppPlugin plugin) {
        List<Screen> out = new ArrayList<>();
        if (plugin == null) return dbScreens != null ? dbScreens : List.of();

        Set<String> pluginScreens = plugin.getScreenNames() != null ? plugin.getScreenNames() : Set.of();

        // Union of screen names (plugin + db)
        List<String> names = new ArrayList<>();
        for (String s : pluginScreens) {
            if (s != null && !s.isBlank() && !containsIgnoreCase(names, s)) names.add(s);
        }
        // Convention: allow a "commonpage" screen to be globally available even if plugin.getScreenNames()
        // didn't include it, as long as plugin.getScreenClass("commonpage") returns a class.
        try {
            Class<?> commonCls = plugin.getScreenClass("commonpage");
            if (commonCls != null && !containsIgnoreCase(names, "commonpage")) {
                names.add("commonpage");
            }
        } catch (Exception ignored) {}
        if (dbScreens != null) {
            for (Screen s : dbScreens) {
                if (s == null || s.getName() == null || s.getName().isBlank()) continue;
                if (!containsIgnoreCase(names, s.getName())) names.add(s.getName());
            }
        }

        for (String screenName : names) {
            Screen synthetic = new Screen();
            synthetic.setName(screenName);

            // attach DB elements if present for this screen
            if (dbScreens != null) {
                for (Screen s : dbScreens) {
                    if (s != null && s.getName() != null && s.getName().equalsIgnoreCase(screenName)) {
                        synthetic.setElements(s.getElements());
                        break;
                    }
                }
            }

            // attach plugin methods (names only) for this screen
            List<ScreenMethod> methods = new ArrayList<>();
            Class<?> cls = null;
            try { cls = plugin.getScreenClass(screenName); } catch (Exception ignored) {}
            if (cls != null) {
                for (Method m : cls.getMethods()) {
                    if (m == null) continue;
                    if (m.getDeclaringClass() == Object.class) continue;
                    if (java.lang.reflect.Modifier.isStatic(m.getModifiers())) continue;
                    String mn = m.getName();
                    if (mn == null || mn.isBlank()) continue;
                    // avoid duplicates (overloads) for prompt display; mapping is method-name based
                    if (methods.stream().anyMatch(x -> x != null && x.getMethodName() != null && x.getMethodName().equalsIgnoreCase(mn))) continue;
                    ScreenMethod sm = new ScreenMethod();
                    sm.setMethodName(mn);
                    methods.add(sm);
                }
            }
            synthetic.setMethods(methods);
            out.add(synthetic);
        }

        return out;
    }

    private boolean containsIgnoreCase(List<String> list, String value) {
        if (list == null || value == null) return false;
        for (String s : list) {
            if (s != null && s.equalsIgnoreCase(value)) return true;
        }
        return false;
    }

    private String buildLlmMappingPrompt(App app,
                                        List<Screen> screens,
                                        List<String> candidateScreenNames,
                                        String lastScreen,
                                        List<String> executedSoFar,
                                        String instruction) {
        StringBuilder sb = new StringBuilder();
        sb.append("Map the instruction to a deterministic action.\n");
        sb.append("Return STRICT JSON with this schema:\n");
        sb.append("{\"action\":\"fill|click|select_by_value|select_by_label|hover|press_key|navigate|call_method|extract_text\",");
        sb.append("\"screen\":\"<one of candidate screens>\",");
        sb.append("\"targetType\":\"element|method|none\",");
        sb.append("\"target\":\"<exact elementName or methodName>\",");
        sb.append("\"value\":\"<string or null>\",");
        sb.append("\"args\":[\"<string>\", ...],");
        sb.append("\"export\":\"<string or null>\"}\n\n");

        sb.append("Rules:\n");
        sb.append("- If instruction is navigation, action=navigate, targetType=none, target=null, value=url.\n");
        sb.append("- If instruction implies calling a stored method (e.g., 'add to cart ...', 'login with ...'), use action=call_method and targetType=method.\n");
        sb.append("- If instruction refers to an ordinal/nth input field (e.g., 'enter X in 4th input field' / 'enter X in fourth input field'), prefer action=call_method targeting method enterValueInNthInputField when available; pass args in the method's param order (nth/index and value).\n");
        sb.append("- If instruction says input/text field, treat HTML <input> and <textarea> as equivalent. Prefer targeting an element whose selector contains \"input\" or \"textarea\".\n");
        sb.append("- If a method exists on screen \"commonpage\", it may be used from ANY step, regardless of the current page. Prefer commonpage methods when the instruction is generic and could apply on multiple pages.\n");
        sb.append("- For call_method, put arguments in args[] (in order). value can be null.\n");
        sb.append("- If the user explicitly asks to store the result (e.g. 'store ... as {{price}}'), set export=\"price\".\n");
        sb.append("- Only set export when the user explicitly provides a variable name.\n");
        sb.append("- If instruction asks to capture/store text from an element for later reuse, use action=extract_text, targetType=element, and set value to the variable name (WITHOUT braces). Example: value=\"price1\".\n");
        sb.append("- target must match EXACTLY one of the provided names for that screen.\n");
        sb.append("- Prefer lastScreen when it makes sense.\n\n");

        sb.append("Candidate screens: ").append(candidateScreenNames).append("\n");
        if (lastScreen != null && !lastScreen.isBlank()) sb.append("Last screen: ").append(lastScreen).append("\n");
        sb.append("\nInstruction:\n").append(instruction).append("\n\n");

        sb.append("Known elements/methods by screen:\n");
        if (screens != null) {
            for (Screen s : screens) {
                if (s == null || s.getName() == null) continue;
                sb.append("- ").append(s.getName()).append(":\n");
                sb.append("  elements: ");
                sb.append(listNames(s.getElements() != null ? s.getElements().stream().map(ScreenElement::getElementName).toList() : List.of(), 80));
                sb.append("\n  elementsDetailed(name=>selector): ");
                sb.append(listElementDetails(s.getElements(), 80));
                sb.append("\n  methods: ");
                sb.append(listNames(s.getMethods() != null ? s.getMethods().stream().map(m -> m.getMethodName()).toList() : List.of(), 40));
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    private String listElementDetails(List<ScreenElement> els, int max) {
        if (els == null || els.isEmpty()) return "[]";
        List<String> out = new ArrayList<>();
        for (ScreenElement el : els) {
            if (el == null) continue;
            String n = el.getElementName();
            String sel = el.getSelector();
            if (n == null || n.isBlank() || sel == null || sel.isBlank()) continue;
            // Keep it compact and deterministic for prompt
            out.add(n + "=>" + sel);
            if (out.size() >= max) break;
        }
        return out.toString();
    }

    private String listNames(List<String> names, int max) {
        if (names == null || names.isEmpty()) return "[]";
        List<String> out = new ArrayList<>();
        for (String n : names) {
            if (n == null || n.isBlank()) continue;
            out.add(n);
            if (out.size() >= max) break;
        }
        return out.toString();
    }

    private String extractFirstJsonObject(String text) {
        if (text == null) return null;
        int start = text.indexOf('{');
        if (start < 0) return null;
        int depth = 0;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) return text.substring(start, i + 1);
            }
        }
        return null;
    }

    private static class LlmMapped {
        public String action;
        public String screen;
        public String targetType;
        public String target;
        public String value;
        public List<String> args;
        /**
         * Optional: store the step output into this variable name (no braces).
         * Used for call_method return values (JAR_PLUGIN) and for extract_text.
         */
        public String export;
    }

    private Match resolveAcrossScreens(List<Screen> screens, String elementFromStep, String lastScreen) {
        if (screens == null || elementFromStep == null) return null;
        String want = norm(elementFromStep);

        // Collect all matching candidates
        List<Match> matches = new ArrayList<>();
        for (Screen s : screens) {
            if (s == null || s.getName() == null) continue;
            if (s.getElements() == null) continue;
            for (ScreenElement el : s.getElements()) {
                if (el == null || el.getElementName() == null || el.getSelector() == null) continue;
                String have = norm(el.getElementName());
                if (have.equals(want) || have.contains(want) || want.contains(have)) {
                    matches.add(new Match(s.getName(), el.getElementName(), formatElementSelector(el)));
                }
            }
        }

        if (matches.isEmpty()) return null;
        if (matches.size() == 1) return matches.get(0);

        // Prefer lastScreen if it has a match
        if (lastScreen != null) {
            for (Match m : matches) {
                if (m.screenName.equalsIgnoreCase(lastScreen)) return m;
            }
        }

        // Too ambiguous: return null so caller can use inference
        return null;
    }

    private List<String> candidateScreensForElement(List<Screen> screens, String elementFromStep) {
        List<String> out = new ArrayList<>();
        if (screens == null || elementFromStep == null) return out;
        String want = norm(elementFromStep);
        for (Screen s : screens) {
            if (s == null || s.getName() == null || s.getElements() == null) continue;
            for (ScreenElement el : s.getElements()) {
                if (el == null || el.getElementName() == null || el.getSelector() == null) continue;
                String have = norm(el.getElementName());
                if (have.equals(want) || have.contains(want) || want.contains(have)) {
                    out.add(s.getName());
                    break;
                }
            }
        }
        return out;
    }

    private Match resolveWithinScreen(List<Screen> screens, String screenName, String elementFromStep) {
        if (screens == null || screenName == null || elementFromStep == null) return null;
        String want = norm(elementFromStep);
        for (Screen s : screens) {
            if (s == null || s.getName() == null) continue;
            if (!s.getName().equalsIgnoreCase(screenName)) continue;
            if (s.getElements() == null) return null;
            for (ScreenElement el : s.getElements()) {
                if (el == null || el.getElementName() == null || el.getSelector() == null) continue;
                String have = norm(el.getElementName());
                if (have.equals(want) || have.contains(want) || want.contains(have)) {
                    return new Match(s.getName(), el.getElementName(), formatElementSelector(el));
                }
            }
        }
        return null;
    }

    private String formatElementSelector(ScreenElement el) {
        if (el == null) return null;
        String st = el.getSelectorType();
        String sel = el.getSelector();
        if (sel == null) return null;
        if (st == null || st.isBlank() || "css".equalsIgnoreCase(st)) return sel;
        // Encode non-css selector types into the selector string so the runner can interpret them.
        return st + "::" + sel;
    }

    private Match resolveBestAcrossScreens(List<Screen> screens, String elementFromStep, String instruction, String lastScreen) {
        if (screens == null || elementFromStep == null) return null;
        String want = norm(elementFromStep);
        if (want.isBlank()) return null;

        List<Match> matches = new ArrayList<>();
        for (Screen s : screens) {
            if (s == null || s.getName() == null || s.getElements() == null) continue;
            for (ScreenElement el : s.getElements()) {
                if (el == null || el.getElementName() == null || el.getSelector() == null) continue;
                String have = norm(el.getElementName());
                if (have.equals(want) || have.contains(want) || want.contains(have)) {
                    matches.add(new Match(s.getName(), el.getElementName(), formatElementSelector(el)));
                }
            }
        }
        if (matches.isEmpty()) return null;
        if (matches.size() == 1) return matches.get(0);

        String instr = instruction != null ? instruction.toLowerCase(Locale.ROOT) : "";
        Match best = null;
        int bestScore = Integer.MIN_VALUE;
        for (Match m : matches) {
            int score = 0;
            String have = norm(m.elementName);
            if (have.equals(want)) score += 200;
            if (have.startsWith(want)) score += 120;
            if (have.contains(want)) score += 80;
            if (want.contains(have)) score += 40;
            if (lastScreen != null && m.screenName != null && m.screenName.equalsIgnoreCase(lastScreen)) score += 30;

            // keyword boosts to avoid LLM-style mistakes
            score += keywordBoost(instr, have, "password");
            score += keywordBoost(instr, have, "email");
            score += keywordBoost(instr, have, "phone");
            score += keywordBoost(instr, have, "username");
            score += keywordBoost(instr, have, "user");

            // penalties: if instruction says password, avoid email/phone
            if (instr.contains("password")) {
                if (have.contains("email")) score -= 60;
                if (have.contains("phone")) score -= 60;
            }
            if (instr.contains("email")) {
                if (have.contains("password")) score -= 40;
            }

            if (score > bestScore) {
                bestScore = score;
                best = m;
            }
        }
        return best;
    }

    private int keywordBoost(String instr, String elementNorm, String kw) {
        if (instr == null || elementNorm == null || kw == null) return 0;
        String k = kw.toLowerCase(Locale.ROOT);
        if (!instr.contains(k)) return 0;
        return elementNorm.contains(k) ? 120 : 0;
    }

    private MethodMatch resolveMethodAcrossScreens(List<Screen> screens, String methodFromStep, String lastScreen) {
        if (screens == null || methodFromStep == null) return null;
        String want = methodFromStep.trim().toLowerCase(Locale.ROOT);

        List<MethodMatch> matches = new ArrayList<>();
        for (Screen s : screens) {
            if (s == null || s.getName() == null || s.getMethods() == null) continue;
            for (var m : s.getMethods()) {
                if (m == null || m.getMethodName() == null) continue;
                String have = m.getMethodName().trim().toLowerCase(Locale.ROOT);
                if (have.equals(want)) {
                    matches.add(new MethodMatch(s.getName(), m.getMethodName()));
                }
            }
        }
        if (matches.isEmpty()) return null;
        if (matches.size() == 1) return matches.get(0);

        if (lastScreen != null) {
            for (MethodMatch mm : matches) {
                if (mm.screenName.equalsIgnoreCase(lastScreen)) return mm;
            }
        }
        return null;
    }

    private MethodMatch resolveMethodAcrossPlugin(App app, String methodFromStep, String lastScreen) {
        if (app == null || methodFromStep == null) return null;
        String want = methodFromStep.trim().toLowerCase(Locale.ROOT);
        try {
            var lp = pluginJarLoaderService.loadForApp(app);
            var plugin = lp.plugin();
            if (plugin == null) return null;

            List<MethodMatch> matches = new ArrayList<>();
            List<String> pluginScreens = new ArrayList<>();
            if (plugin.getScreenNames() != null) pluginScreens.addAll(plugin.getScreenNames());
            // Also include "commonpage" if available by convention.
            try {
                Class<?> commonCls = plugin.getScreenClass("commonpage");
                if (commonCls != null && pluginScreens.stream().noneMatch(s -> s != null && s.equalsIgnoreCase("commonpage"))) {
                    pluginScreens.add("commonpage");
                }
            } catch (Exception ignored) {}

            for (String screen : pluginScreens) {
                if (screen == null || screen.isBlank()) continue;
                Class<?> cls = null;
                try { cls = plugin.getScreenClass(screen); } catch (Exception ignored) {}
                if (cls == null) continue;
                for (Method m : cls.getMethods()) {
                    if (m == null) continue;
                    if (m.getDeclaringClass() == Object.class) continue;
                    if (java.lang.reflect.Modifier.isStatic(m.getModifiers())) continue;
                    String have = m.getName() != null ? m.getName().trim().toLowerCase(Locale.ROOT) : "";
                    if (have.equals(want)) {
                        matches.add(new MethodMatch(screen, m.getName()));
                    }
                }
            }
            if (matches.isEmpty()) return null;
            if (matches.size() == 1) return matches.get(0);
            if (lastScreen != null) {
                for (MethodMatch mm : matches) {
                    if (mm.screenName != null && mm.screenName.equalsIgnoreCase(lastScreen)) return mm;
                }
            }
            // If still ambiguous, prefer commonpage (global helpers)
            for (MethodMatch mm : matches) {
                if (mm.screenName != null && mm.screenName.equalsIgnoreCase("commonpage")) return mm;
            }
            // ambiguous
            return null;
        } catch (Exception e) {
            log.warn("[MAP] Failed to resolve method from plugin. appId={} method={} err={}", app.getId(), methodFromStep, e.getMessage());
            return null;
        }
    }

    private String norm(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static String valueForLog(String elementName, String value) {
        if (value == null) return "null";
        String el = elementName == null ? "" : elementName.toLowerCase(Locale.ROOT);
        boolean sensitive = el.contains("password") || el.contains("token") || el.contains("secret");
        return sensitive ? "\"***\"" : "\"" + value + "\"";
    }

    private static class Match {
        final String screenName;
        final String elementName;
        final String selector;
        Match(String screenName, String elementName, String selector) {
            this.screenName = screenName;
            this.elementName = elementName;
            this.selector = selector;
        }
    }

    private static class MethodMatch {
        final String screenName;
        final String methodName;
        MethodMatch(String screenName, String methodName) {
            this.screenName = screenName;
            this.methodName = methodName;
        }
    }

    /**
     * Minimal NL parser matching current deterministic runner grammar.
     */
    private static class Parsed {
        final String action;
        final String elementName;
        final String value;

        Parsed(String action, String elementName, String value) {
            this.action = action;
            this.elementName = elementName;
            this.value = value;
        }

        static Parsed parse(String instruction) {
            if (instruction == null) return null;
            String raw = instruction.trim();
            if (raw.isEmpty()) return null;
            String lower = raw.toLowerCase(Locale.ROOT);

            // navigate to URL
            if (lower.startsWith("navigate ")) {
                String url = raw.substring("navigate".length()).trim();
                url = url.replaceFirst("(?i)^to\\s+", "").trim();
                return new Parsed("navigate", null, url);
            }
            if (lower.startsWith("go to ")) {
                return new Parsed("navigate", null, raw.substring(6).trim());
            }

            if (lower.startsWith("click ")) {
                return new Parsed("click", raw.substring(6).trim(), null);
            }
            if (lower.startsWith("hover ")) {
                return new Parsed("hover", raw.substring(6).trim(), null);
            }
            if (lower.startsWith("press ")) {
                return new Parsed("press_key", null, raw.substring(6).trim());
            }

            // add to cart product named X / add to cart X
            if (lower.startsWith("add to cart")) {
                String rest = raw.substring("add to cart".length()).trim();
                rest = rest.replaceFirst("(?i)^product\\s+named\\s+", "").trim();
                rest = stripQuotes(rest);
                if (rest != null && !rest.isBlank()) {
                    // Map this sentence to a method call; method resolution is done later using Screen.methods
                    return new Parsed("call_method", "addToCart", rest);
                }
            }

            for (String kw : new String[]{"enter ", "type ", "fill "}) {
                if (lower.startsWith(kw)) {
                    String rest = raw.substring(kw.length()).trim();
                    String token = rest.toLowerCase().contains(" into ") ? " into " : (rest.toLowerCase().contains(" in ") ? " in " : null);
                    if (token == null) return null;
                    int idx = rest.toLowerCase().lastIndexOf(token);
                    String val = stripQuotes(rest.substring(0, idx).trim());
                    String el = rest.substring(idx + token.length()).trim();
                    return new Parsed("fill", el, val);
                }
            }

            if (lower.startsWith("select ")) {
                String rest = raw.substring(7).trim();
                String token = rest.toLowerCase().contains(" from ") ? " from " : (rest.toLowerCase().contains(" in ") ? " in " : null);
                if (token == null) return null;
                int idx = rest.toLowerCase().lastIndexOf(token);
                String val = stripQuotes(rest.substring(0, idx).trim());
                String el = rest.substring(idx + token.length()).trim();
                return new Parsed("select_by_value", el, val);
            }

            return null;
        }

        private static String stripQuotes(String s) {
            if (s == null) return null;
            String t = s.trim();
            if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
                return t.substring(1, t.length() - 1);
            }
            return t;
        }
    }
}


