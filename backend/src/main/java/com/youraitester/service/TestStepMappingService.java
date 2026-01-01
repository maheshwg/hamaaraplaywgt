package com.youraitester.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.youraitester.agent.LlmProvider;
import com.youraitester.agent.impl.SimpleMessage;
import com.youraitester.model.Test;
import com.youraitester.model.TestStep;
import com.youraitester.model.app.App;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.repository.app.AppRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

        if (app.getScreens() == null || app.getScreens().isEmpty()) {
            log.warn("[MAP] No screens configured for appId={} - cannot map steps", test.getAppId());
            return;
        }

        // Candidate screen names
        List<String> screenNames = new ArrayList<>();
        for (Screen s : app.getScreens()) {
            if (s != null && s.getName() != null && !s.getName().isBlank()) screenNames.add(s.getName());
        }

        String lastScreen = null;
        List<String> executedSoFar = new ArrayList<>();

        for (TestStep step : test.getSteps()) {
            if (step == null) continue;
            String instr = step.getInstruction();
            executedSoFar.add(instr != null ? instr : "");

            Parsed parsed = Parsed.parse(instr);

            // LLM mapping: if enabled + provider available, try to map the instruction to known elements/methods.
            // This is the "intelligent" path for natural English like "add to cart product named X".
            if (mappingLlmEnabled && (mappingLlmPrefer || parsed == null)) {
                try {
                    LlmMapped mapped = tryMapWithLlm(app, app.getScreens(), screenNames, lastScreen, executedSoFar, instr);
                    if (mapped != null) {
                        applyMappedStep(step, mapped, app.getScreens());
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
                MethodMatch mm = resolveMethodAcrossScreens(app.getScreens(), parsed.elementName, lastScreen);
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
            Match match = resolveAcrossScreens(app.getScreens(), parsed.elementName, lastScreen);
            if (match == null) {
                // If ambiguous, try screen inference among candidate screens that contain a likely match.
                List<String> candidates = candidateScreensForElement(app.getScreens(), parsed.elementName);
                if (!candidates.isEmpty()) {
                    String inferred = screenInferenceService.inferScreenName(app.getInfo(), candidates, executedSoFar, lastScreen);
                    match = resolveWithinScreen(app.getScreens(), inferred, parsed.elementName);
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
            // Prefer args[] for method calls; store as JSON array in step.value (back-compat: fall back to value)
            try {
                if (mapped.args != null && !mapped.args.isEmpty()) {
                    step.setValue(objectMapper.writeValueAsString(mapped.args));
                } else {
                    step.setValue(mapped.value);
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

    private LlmMapped tryMapWithLlm(App app,
                                   List<Screen> screens,
                                   List<String> candidateScreenNames,
                                   String lastScreen,
                                   List<String> executedSoFar,
                                   String instruction) {
        if (instruction == null || instruction.isBlank()) return null;
        LlmProvider provider = providers.get(providerName);
        if (provider == null || !provider.isAvailable()) return null;

        String context = buildLlmMappingPrompt(app, screens, candidateScreenNames, lastScreen, executedSoFar, instruction);
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
        if (mapped.screen != null && !mapped.screen.isBlank() && candidateScreenNames != null && !candidateScreenNames.isEmpty()) {
            boolean ok = false;
            for (String s : candidateScreenNames) {
                if (s != null && s.equalsIgnoreCase(mapped.screen)) { ok = true; mapped.screen = s; break; }
            }
            if (!ok) {
                log.warn("[MAP-LLM] LLM returned screen='{}' not in candidates {}", mapped.screen, candidateScreenNames);
                return null;
            }
        }

        // Validate target exists on screen (element or method)
        if ("call_method".equals(mapped.action)) {
            if (mapped.screen == null || mapped.target == null) return null;
            if (!methodExists(screens, mapped.screen, mapped.target)) return null;
        } else if (!"navigate".equals(mapped.action)) {
            if (mapped.screen == null || mapped.target == null) return null;
            if (!elementExists(screens, mapped.screen, mapped.target)) return null;
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

    private String buildLlmMappingPrompt(App app,
                                        List<Screen> screens,
                                        List<String> candidateScreenNames,
                                        String lastScreen,
                                        List<String> executedSoFar,
                                        String instruction) {
        StringBuilder sb = new StringBuilder();
        sb.append("Map the instruction to a deterministic action.\n");
        sb.append("Return STRICT JSON with this schema:\n");
        sb.append("{\"action\":\"fill|click|select_by_value|select_by_label|hover|press_key|navigate|call_method\",");
        sb.append("\"screen\":\"<one of candidate screens>\",");
        sb.append("\"targetType\":\"element|method|none\",");
        sb.append("\"target\":\"<exact elementName or methodName>\",");
        sb.append("\"value\":\"<string or null>\",");
        sb.append("\"args\":[\"<string>\", ...]}\n\n");

        sb.append("Rules:\n");
        sb.append("- If instruction is navigation, action=navigate, targetType=none, target=null, value=url.\n");
        sb.append("- If instruction implies calling a stored method (e.g., 'add to cart ...', 'login with ...'), use action=call_method and targetType=method.\n");
        sb.append("- For call_method, put arguments in args[] (in order). value can be null.\n");
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
                sb.append("\n  methods: ");
                sb.append(listNames(s.getMethods() != null ? s.getMethods().stream().map(m -> m.getMethodName()).toList() : List.of(), 40));
                sb.append("\n");
            }
        }

        return sb.toString();
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
                    matches.add(new Match(s.getName(), el.getElementName(), el.getSelector()));
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
                    return new Match(s.getName(), el.getElementName(), el.getSelector());
                }
            }
        }
        return null;
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


