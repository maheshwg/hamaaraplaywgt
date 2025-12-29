package com.youraitester.service;

import com.youraitester.model.Test;
import com.youraitester.model.TestStep;
import com.youraitester.model.app.App;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.repository.app.AppRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Save-time mapping:
 * Convert natural language step instructions into deterministic mapped commands stored on the step:
 * - step.type   = action name (fill/click/select_by_value/hover/press_key/navigate)
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


