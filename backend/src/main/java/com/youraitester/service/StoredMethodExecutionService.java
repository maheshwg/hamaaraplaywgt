package com.youraitester.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.model.app.ScreenMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Executes stored ScreenMethod.methodBody (Java source) as a SAFE subset of Playwright actions.
 *
 * Supported patterns (typical page-object code):
 * - page.locator(<stringExpr>).fill(<arg>);
 * - page.locator(<stringExpr>).click();
 * - page.locator(<stringExpr>).hover();
 * - page.locator(<stringExpr>).selectOption(<arg>);
 * - Locator x = page.locator(<stringExpr>);
 * - x.click() / x.fill(arg) / x.hover() / x.selectOption(arg)
 * - fieldLocators like usernameInput.fill(arg) where usernameInput exists in Screen.elements
 *
 * <stringExpr> supports Java concatenation of string literals and param identifiers:
 *   "foo" + productName + "bar"
 *
 * This avoids reflection and allows changing method bodies in DB without redeploying.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StoredMethodExecutionService {

    private final PlaywrightJavaService playwrightJavaService;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final Pattern LOC_ASSIGN =
        Pattern.compile("(?m)^[\\t ]*(?:Locator\\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*page\\.locator\\((.+?)\\)\\s*;\\s*$");

    private static final Pattern INLINE_ACTION =
        Pattern.compile("(?m)^[\\t ]*page\\.locator\\((.+?)\\)\\.(fill|click|hover|selectOption|selectByValue)\\((.*?)\\)\\s*;\\s*$");

    private static final Pattern VAR_ACTION =
        Pattern.compile("(?m)^[\\t ]*([a-zA-Z_$][a-zA-Z0-9_$]*)\\.(fill|click|hover|selectOption|selectByValue)\\((.*?)\\)\\s*;\\s*$");

    // Simple local assignments we can safely evaluate for logging/templates:
    private static final Pattern STRING_LITERAL_ASSIGN =
        Pattern.compile("(?m)^[\\t ]*String\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*(\".*?\"|'.*?')\\s*;\\s*$");

    // page.selectOption("css", new SelectOption().setLabel("United States"));
    private static final Pattern PAGE_SELECT_OPTION =
        Pattern.compile("(?m)^[\\t ]*page\\.selectOption\\((.+?)\\s*,\\s*(.+)\\)\\s*;\\s*$");

    public StoredMethodResult execute(Screen screen, String methodName, List<String> args) {
        if (screen == null) throw new IllegalArgumentException("screen is required");
        if (methodName == null || methodName.isBlank()) throw new IllegalArgumentException("methodName is required");

        ScreenMethod m = findMethod(screen, methodName);
        if (m == null) throw new RuntimeException("Method not found on screen '" + screen.getName() + "': " + methodName);
        if (m.getMethodBody() == null || m.getMethodBody().isBlank()) {
            throw new RuntimeException("Stored methodBody is empty for screen '" + screen.getName() + "' method '" + methodName + "'");
        }

        final MethodDirectives directives = parseDirectives(m.getMethodBody());
        final boolean booleanReturnExpected = isBooleanReturnExpected(m);

        // Special-case: SauceDemo Products.verifyProductPrice(productName, expectedPrice)
        // The Java method body uses loops / assignments we don't fully parse yet; evaluate directly.
        if ("verifyProductPrice".equalsIgnoreCase(m.getMethodName()) && args != null && args.size() >= 2) {
            // Still process inline @log directives that reference simple local constants (for readability).
            Map<String, String> paramsForLog = bindParams(m, args);
            processInlineLogDirectivesFromBody(screen.getName(), m.getMethodName(), m.getMethodBody(), paramsForLog);
            String productName = args.get(0);
            String expected = args.get(1);
            boolean ok = verifyProductPriceByText(screen, productName, expected);
            Map<String, Object> extracted = buildExtractedVariables(directives, bindParams(m, args));
            return StoredMethodResult.booleanResult(ok, directives.onSuccess, directives.onFailure, extracted, booleanReturnExpected);
        }

        // Special-case: common SauceDemo "isSortedBy*" boolean helpers. Evaluate directly.
        Boolean special = tryEvaluateSpecialBoolean(screen, m.getMethodName());
        if (special != null) {
            Map<String, Object> extracted = buildExtractedVariables(directives, Map.of());
            return StoredMethodResult.booleanResult(special, directives.onSuccess, directives.onFailure, extracted, booleanReturnExpected);
        }

        Map<String, String> params = bindParams(m, args);
        log.info("[SM] Executing stored method. screen='{}' method='{}' params={}", screen.getName(), m.getMethodName(), params.keySet());
        Map<String, Object> extracted = buildExtractedVariables(directives, params);

        // locals: locatorVar -> locatorExpr (string expression)
        Map<String, String> localLocators = new HashMap<>();
        // locals: simple scalar vars for logging/templates (String/int literals)
        Map<String, String> localScalars = new HashMap<>();

        Boolean returnBoolean = null;

        // Parse statements in order (simple line-based using regexes).
        // We iterate through lines but use regex with MULTILINE anchors.
        String body = m.getMethodBody();

        try {
            String[] lines = body.split("\\R");
            returnBoolean = processLines(
                lines,
                0,
                lines.length,
                screen,
                methodName,
                params,
                localLocators,
                localScalars
            );
        } catch (Exception ex) {
            // If the method defines a user-facing failure message, prefer that over internal errors.
            if (!(ex instanceof UserFacingStepException) && directives.onFailure != null && !directives.onFailure.isBlank()) {
                throw new UserFacingStepException(directives.onFailure.trim(), ex);
            }
            throw ex;
        }

        if (returnBoolean != null) {
            return StoredMethodResult.booleanResult(returnBoolean, directives.onSuccess, directives.onFailure, extracted, booleanReturnExpected);
        }
        return StoredMethodResult.noReturn(directives.onSuccess, directives.onFailure, extracted, booleanReturnExpected);
    }

    /**
     * Execute a subset of Java-ish page-object statements line-by-line, including safe if/else blocks.
     * Returns a boolean value if a supported "return <locator>.isVisible();" statement is encountered.
     */
    private Boolean processLines(String[] lines,
                                 int startInclusive,
                                 int endExclusive,
                                 Screen screen,
                                 String methodName,
                                 Map<String, String> params,
                                 Map<String, String> localLocators,
                                 Map<String, String> localScalars) {
        Boolean returnBoolean = null;
        int i = startInclusive;
        while (i < endExclusive) {
            String rawLine = lines[i];
            String line = rawLine.trim();
            if (line.isEmpty()) { i++; continue; }

            // Handle inline @log directives (so they can reference local variables declared above)
            if (line.startsWith("//")) {
                maybeLogInlineDirective(screen.getName(), methodName, line, params, localScalars);
                i++;
                continue;
            }

            // if/else (safe subset)
            if (line.startsWith("if ") || line.startsWith("if(")) {
                IfBlock b = parseIfElseBlock(lines, i);
                boolean cond = evalIfCondition(b.condition, screen, localLocators, params);
                int chosenStart = cond ? b.thenStart : b.elseStart;
                int chosenEnd = cond ? b.thenEnd : b.elseEnd;
                if (chosenStart >= 0 && chosenEnd >= 0 && chosenEnd >= chosenStart) {
                    Boolean rb = processLines(lines, chosenStart, chosenEnd, screen, methodName, params, localLocators, localScalars);
                    if (rb != null) returnBoolean = rb;
                }
                i = b.nextIndex;
                continue;
            }

            // Track simple local scalar assignments for logging/templates:
            // String testing = "Testing";
            Matcher sla = STRING_LITERAL_ASSIGN.matcher(rawLine);
            if (sla.matches()) {
                String var = sla.group(1);
                String lit = sla.group(2);
                if (var != null && !var.isBlank() && lit != null) {
                    String v = lit.trim();
                    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
                        v = unescapeJavaString(v.substring(1, v.length() - 1));
                    }
                    localScalars.put(var, v);
                }
                i++;
                continue;
            }

            // locator assignment
            Matcher a = LOC_ASSIGN.matcher(rawLine);
            if (a.matches()) {
                String var = a.group(1);
                String expr = a.group(2);
                localLocators.put(var, expr);
                i++;
                continue;
            }

            // inline action: page.locator(expr).action(arg?)
            Matcher ia = INLINE_ACTION.matcher(rawLine);
            if (ia.matches()) {
                String expr = ia.group(1);
                String action = ia.group(2);
                String argExpr = ia.group(3);
                String selector = evalStringExpr(expr, params);
                execAction(action, selector, evalArg(action, argExpr, params));
                i++;
                continue;
            }

            // page.selectOption(selector, new SelectOption().setLabel/setValue(...))
            Matcher ps = PAGE_SELECT_OPTION.matcher(rawLine);
            if (ps.matches()) {
                String selectorExpr = ps.group(1);
                String optionExpr = ps.group(2);
                String selector = evalStringExpr(selectorExpr, params);
                SelectChoice choice = parseSelectChoice(optionExpr, params);
                execSelectChoice(selector, choice);
                i++;
                continue;
            }

            // var action: x.action(arg?)
            Matcher va = VAR_ACTION.matcher(rawLine);
            if (va.matches()) {
                String var = va.group(1);
                String action = va.group(2);
                String argExpr = va.group(3);

                String selector = null;

                // local locator var
                if (localLocators.containsKey(var)) {
                    selector = evalStringExpr(localLocators.get(var), params);
                } else {
                    // field locator (from Screen.elements)
                    ScreenElement el = findElement(screen, var);
                    if (el != null) selector = el.getSelector();
                }

                if (selector == null || selector.isBlank()) {
                    throw new RuntimeException("Unsupported locator reference '" + var + "' in stored method '" + methodName + "'");
                }

                // Special handling for selectOption(new SelectOption().setLabel/setValue(...))
                if ("selectOption".equalsIgnoreCase(action)) {
                    SelectChoice choice = parseSelectChoice(argExpr, params);
                    execSelectChoice(selector, choice);
                } else {
                    execAction(action, selector, evalArg(action, argExpr, params));
                }
                i++;
                continue;
            }

            // Ignore braces and declarations
            String lc = line.toLowerCase(Locale.ROOT);
            if (lc.equals("{") || lc.equals("}") || lc.startsWith("public ") || lc.startsWith("private ") || lc.startsWith("protected ")) {
                i++;
                continue;
            }

            // Support boolean returns of the form: return someLocator.isVisible();
            if (lc.startsWith("return ") && lc.endsWith(";")) {
                Boolean b = tryEvalReturnBoolean(rawLine, screen, localLocators, params);
                if (b != null) returnBoolean = b;
                i++;
                continue;
            }

            // Fail on unknown playwright-ish statements to avoid silent no-op.
            if (lc.contains("page.") || lc.contains(".locator(") || lc.contains(".fill(") || lc.contains(".click(") || lc.contains(".selectoption(")) {
                throw new RuntimeException("Unsupported statement in stored method '" + methodName + "': " + line);
            }

            // Otherwise ignore (declarations/locals we don't care about)
            i++;
        }
        return returnBoolean;
    }

    private static class IfBlock {
        final String condition;
        final int thenStart;
        final int thenEnd;
        final int elseStart;
        final int elseEnd;
        final int nextIndex;
        IfBlock(String condition, int thenStart, int thenEnd, int elseStart, int elseEnd, int nextIndex) {
            this.condition = condition;
            this.thenStart = thenStart;
            this.thenEnd = thenEnd;
            this.elseStart = elseStart;
            this.elseEnd = elseEnd;
            this.nextIndex = nextIndex;
        }
    }

    /**
     * Parses:
     *   if (<cond>) { ... } [else { ... }]
     *
     * Supported condition subset is enforced by evalIfCondition(...).
     */
    private IfBlock parseIfElseBlock(String[] lines, int ifHeaderIdx) {
        String header = lines[ifHeaderIdx].trim();
        Matcher mh = Pattern.compile("^if\\s*\\((.*)\\)\\s*(\\{\\s*)?$").matcher(header);
        if (!mh.find()) {
            throw new RuntimeException("Unsupported if header: " + header);
        }
        String cond = mh.group(1) != null ? mh.group(1).trim() : "";

        int braceLineIdx = ifHeaderIdx;
        if (!header.contains("{")) {
            braceLineIdx = nextNonEmpty(lines, ifHeaderIdx + 1);
            if (braceLineIdx < 0 || !lines[braceLineIdx].trim().startsWith("{")) {
                throw new RuntimeException("if must use braces: " + header);
            }
        }

        int thenStart = braceLineIdx + 1;
        int thenCloseIdx = findMatchingBraceLine(lines, braceLineIdx);
        int thenEnd = thenCloseIdx; // exclusive

        int afterThen = nextNonEmpty(lines, thenCloseIdx + 1);
        int elseStart = -1, elseEnd = -1;
        int nextIdx = afterThen >= 0 ? afterThen : (thenCloseIdx + 1);

        if (afterThen >= 0) {
            String maybeElse = lines[afterThen].trim();
            if (maybeElse.startsWith("else")) {
                int elseBraceLineIdx = afterThen;
                if (!maybeElse.contains("{")) {
                    elseBraceLineIdx = nextNonEmpty(lines, afterThen + 1);
                    if (elseBraceLineIdx < 0 || !lines[elseBraceLineIdx].trim().startsWith("{")) {
                        throw new RuntimeException("else must use braces: " + maybeElse);
                    }
                }
                elseStart = elseBraceLineIdx + 1;
                int elseCloseIdx = findMatchingBraceLine(lines, elseBraceLineIdx);
                elseEnd = elseCloseIdx; // exclusive
                nextIdx = nextNonEmpty(lines, elseCloseIdx + 1);
                if (nextIdx < 0) nextIdx = elseCloseIdx + 1;
            }
        }

        return new IfBlock(cond, thenStart, thenEnd, elseStart, elseEnd, nextIdx);
    }

    private int nextNonEmpty(String[] lines, int start) {
        for (int i = start; i < lines.length; i++) {
            String t = lines[i] != null ? lines[i].trim() : "";
            if (t.isEmpty()) continue;
            return i;
        }
        return -1;
    }

    /**
     * Finds the line index containing the matching '}' for a block that starts at a line containing '{'.
     * Uses a simple brace counter that ignores braces inside string literals.
     */
    private int findMatchingBraceLine(String[] lines, int openBraceLineIdx) {
        int depth = 0;
        for (int i = openBraceLineIdx; i < lines.length; i++) {
            String raw = lines[i] != null ? lines[i] : "";
            depth += braceDelta(raw);
            if (i == openBraceLineIdx && depth == 0) depth = 1; // defensive
            if (i > openBraceLineIdx && depth == 0) return i;
        }
        throw new RuntimeException("Unclosed brace block starting at line " + openBraceLineIdx);
    }

    private int braceDelta(String s) {
        if (s == null) return 0;
        boolean inD = false;
        boolean inS = false;
        boolean esc = false;
        int delta = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (inD) {
                if (!esc && c == '\\') { esc = true; continue; }
                if (!esc && c == '"') inD = false;
                esc = false;
                continue;
            }
            if (inS) {
                if (!esc && c == '\\') { esc = true; continue; }
                if (!esc && c == '\'') inS = false;
                esc = false;
                continue;
            }
            if (c == '"') { inD = true; continue; }
            if (c == '\'') { inS = true; continue; }
            if (c == '{') delta++;
            else if (c == '}') delta--;
        }
        return delta;
    }

    /**
     * Very limited condition support for safety:
     * - <var>.isVisible()
     * - page.locator(<stringExpr>).isVisible()
     * - prefix '!' negation
     */
    private boolean evalIfCondition(String cond,
                                    Screen screen,
                                    Map<String, String> localLocators,
                                    Map<String, String> params) {
        if (cond == null) throw new RuntimeException("if condition is empty");
        String c = cond.trim();
        if (c.isEmpty()) throw new RuntimeException("if condition is empty");
        if (c.startsWith("!")) {
            return !evalIfCondition(c.substring(1).trim(), screen, localLocators, params);
        }

        // page.locator(expr).isVisible()
        Matcher pl = Pattern.compile("^page\\.locator\\((.+)\\)\\.isVisible\\(\\)\\s*$").matcher(c);
        if (pl.find()) {
            String expr = pl.group(1);
            String selector = evalStringExpr(expr, params);
            return playwrightJavaService.isVisible(selector);
        }

        // var.isVisible()
        Matcher vl = Pattern.compile("^([a-zA-Z_$][a-zA-Z0-9_$]*)\\.isVisible\\(\\)\\s*$").matcher(c);
        if (vl.find()) {
            String var = vl.group(1);
            String selector = null;
            if (localLocators != null && localLocators.containsKey(var)) {
                selector = evalStringExpr(localLocators.get(var), params);
            } else {
                ScreenElement el = findElement(screen, var);
                if (el != null) selector = el.getSelector();
            }
            if (selector == null || selector.isBlank()) {
                throw new RuntimeException("Unsupported if locator reference: " + var);
            }
            return playwrightJavaService.isVisible(selector);
        }

        throw new RuntimeException("Unsupported if condition: " + cond);
    }

    public List<String> parseArgsFromStepValue(String value) {
        if (value == null) return List.of();
        String v = value.trim();
        if (v.isEmpty()) return List.of();
        // If it's JSON array, parse it; otherwise treat it as a single arg string.
        if (v.startsWith("[") && v.endsWith("]")) {
            try {
                return objectMapper.readValue(v, new TypeReference<List<String>>() {});
            } catch (Exception ignored) {
                // fall through
            }
        }
        // Back-compat: many older mapped steps stored args as a single comma-separated string.
        // Example: "standard_user,secret_sauce"
        if (v.contains(",")) {
            String[] parts = v.split(",");
            java.util.ArrayList<String> out = new java.util.ArrayList<>();
            for (String p : parts) {
                String t = p.trim();
                if (!t.isEmpty()) out.add(t);
            }
            if (!out.isEmpty()) return out;
        }
        return List.of(v);
    }

    public static class StoredMethodResult {
        private final Boolean booleanValue;
        private final String successMessage;
        private final String failureMessage;
        private final Map<String, Object> extractedVariables;
        private final boolean booleanReturnExpected;

        private StoredMethodResult(Boolean booleanValue,
                                   String successMessage,
                                   String failureMessage,
                                   Map<String, Object> extractedVariables,
                                   boolean booleanReturnExpected) {
            this.booleanValue = booleanValue;
            this.successMessage = successMessage;
            this.failureMessage = failureMessage;
            this.extractedVariables = extractedVariables;
            this.booleanReturnExpected = booleanReturnExpected;
        }

        public static StoredMethodResult noReturn(String successMessage,
                                                 String failureMessage,
                                                 Map<String, Object> extractedVariables,
                                                 boolean booleanReturnExpected) {
            return new StoredMethodResult(null, successMessage, failureMessage, extractedVariables, booleanReturnExpected);
        }
        public static StoredMethodResult booleanResult(Boolean v,
                                                      String successMessage,
                                                      String failureMessage,
                                                      Map<String, Object> extractedVariables,
                                                      boolean booleanReturnExpected) {
            return new StoredMethodResult(v, successMessage, failureMessage, extractedVariables, booleanReturnExpected);
        }
        public Boolean getBooleanValue() { return booleanValue; }
        public String getSuccessMessage() { return successMessage; }
        public String getFailureMessage() { return failureMessage; }
        public Map<String, Object> getExtractedVariables() { return extractedVariables; }
        public boolean isBooleanReturnExpected() { return booleanReturnExpected; }
    }

    private static class MethodDirectives {
        final String onSuccess;
        final String onFailure;
        final List<String> logParams;
        final Map<String, String> exportParams; // key -> paramName

        private MethodDirectives(String onSuccess, String onFailure, List<String> logParams, Map<String, String> exportParams) {
            this.onSuccess = onSuccess;
            this.onFailure = onFailure;
            this.logParams = logParams;
            this.exportParams = exportParams;
        }
    }

    /**
     * Allows method bodies to define user-facing messages without exposing internal exceptions.
     *
     * Supported directives (as Java comments anywhere in the method body):
     * - // @onSuccess: <message>
     * - // @onFailure: <message>
     * - // @log: <paramName>                 (logs param value to application logs)
     * - // @log: <text with {{paramName}}>   (logs a readable message with param interpolation)
     *   Back-compat: also supports ${paramName}
     * - // @export: <key>=<paramName>       (stores param value into step extractedVariables)
     */
    private MethodDirectives parseDirectives(String methodBody) {
        if (methodBody == null || methodBody.isBlank()) return new MethodDirectives(null, null, List.of(), Map.of());
        String onSuccess = null;
        String onFailure = null;
        java.util.ArrayList<String> logParams = new java.util.ArrayList<>();
        java.util.LinkedHashMap<String, String> exportParams = new java.util.LinkedHashMap<>();
        String[] lines = methodBody.split("\\R");
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (!line.startsWith("//")) continue;
            Matcher s = Pattern.compile("^//\\s*@onSuccess\\s*:\\s*(.+?)\\s*$").matcher(line);
            if (s.matches()) {
                onSuccess = s.group(1);
                continue;
            }
            Matcher f = Pattern.compile("^//\\s*@onFailure\\s*:\\s*(.+?)\\s*$").matcher(line);
            if (f.matches()) {
                onFailure = f.group(1);
                continue;
            }
            Matcher lp = Pattern.compile("^//\\s*@log\\s*:\\s*(.+?)\\s*$").matcher(line);
            if (lp.matches()) {
                String v = lp.group(1).trim();
                if (!v.isEmpty()) logParams.add(v);
                continue;
            }
            Matcher ex = Pattern.compile("^//\\s*@export\\s*:\\s*(.+?)\\s*$").matcher(line);
            if (ex.matches()) {
                String v = ex.group(1).trim();
                // format: key=paramName (if no "=", use key=paramName)
                if (!v.isEmpty()) {
                    String key;
                    String param;
                    int idx = v.indexOf('=');
                    if (idx > 0) {
                        key = v.substring(0, idx).trim();
                        param = v.substring(idx + 1).trim();
                    } else {
                        key = v;
                        param = v;
                    }
                    if (!key.isEmpty() && !param.isEmpty()) {
                        exportParams.put(key, param);
                    }
                }
            }
        }
        return new MethodDirectives(onSuccess, onFailure, logParams, exportParams);
    }

    private void logDirectiveValues(String screenName, String methodName, MethodDirectives directives, Map<String, String> params) {
        if (directives == null || directives.logParams == null || directives.logParams.isEmpty()) return;
        for (String name : directives.logParams) {
            if (name == null || name.isBlank()) continue;
            // Back-compat: if the directive is a bare identifier, log key=value
            if (name.matches("^[a-zA-Z_$][a-zA-Z0-9_$]*$")) {
                String raw = params != null ? params.get(name) : null;
                String safe = isSensitiveName(name) ? "***" : (raw != null ? raw : "null");
                log.info("[SM-LOG] {}::{} {}={}", screenName, methodName, name, safe);
                continue;
            }

            // Template form: replace {{param}} (preferred) or ${param} (back-compat) placeholders with values
            String rendered = renderLogTemplate(name, params);
            log.info("[SM-LOG] {}::{} {}", screenName, methodName, rendered);
        }
    }

    private String renderLogTemplate(String template, Map<String, String> params) {
        if (template == null) return "";
        // Preferred: {{var}}
        String out = replaceLogVars(template, Pattern.compile("\\{\\{([a-zA-Z_$][a-zA-Z0-9_$]*)\\}\\}"), params, null);
        // Back-compat: ${var}
        out = replaceLogVars(out, Pattern.compile("\\$\\{([a-zA-Z_$][a-zA-Z0-9_$]*)\\}"), params, null);
        return out;
    }

    private void maybeLogInlineDirective(String screenName,
                                        String methodName,
                                        String commentLine,
                                        Map<String, String> params,
                                        Map<String, String> localScalars) {
        if (commentLine == null) return;
        Matcher lp = Pattern.compile("^//\\s*@log\\s*:\\s*(.+?)\\s*$").matcher(commentLine.trim());
        if (!lp.matches()) return;
        String payload = lp.group(1) != null ? lp.group(1).trim() : "";
        if (payload.isEmpty()) return;

        // Bare identifier: try locals first then params
        if (payload.matches("^[a-zA-Z_$][a-zA-Z0-9_$]*$")) {
            String raw = localScalars != null && localScalars.containsKey(payload) ? localScalars.get(payload)
                : (params != null ? params.get(payload) : null);
            String safe = isSensitiveName(payload) ? "***" : (raw != null ? raw : "null");
            log.info("[SM-LOG] {}::{} {}={}", screenName, methodName, payload, safe);
            return;
        }

        // Template: {{var}} (preferred) or ${var} (back-compat) can come from locals or params
        String rendered = renderLogTemplateWithLocals(payload, params, localScalars);
        log.info("[SM-LOG] {}::{} {}", screenName, methodName, rendered);
    }

    private String renderLogTemplateWithLocals(String template, Map<String, String> params, Map<String, String> localScalars) {
        if (template == null) return "";
        // Preferred: {{var}}
        String out = replaceLogVars(template, Pattern.compile("\\{\\{([a-zA-Z_$][a-zA-Z0-9_$]*)\\}\\}"), params, localScalars);
        // Back-compat: ${var}
        out = replaceLogVars(out, Pattern.compile("\\$\\{([a-zA-Z_$][a-zA-Z0-9_$]*)\\}"), params, localScalars);
        return out;
    }

    private String replaceLogVars(String input, Pattern pattern, Map<String, String> params, Map<String, String> localScalars) {
        if (input == null) return "";
        Matcher m = pattern.matcher(input);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String name = m.group(1);
            String raw = localScalars != null && localScalars.containsKey(name) ? localScalars.get(name)
                : (params != null ? params.get(name) : null);
            String safe = isSensitiveName(name) ? "***" : (raw != null ? raw : "null");
            m.appendReplacement(sb, Matcher.quoteReplacement(safe));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /**
     * For special-cased methods where we don't execute the body, we still support inline @log directives
     * that reference simple local String constants declared above them.
     */
    private void processInlineLogDirectivesFromBody(String screenName, String methodName, String body, Map<String, String> params) {
        if (body == null || body.isBlank()) return;
        Map<String, String> locals = new HashMap<>();
        String[] lines = body.split("\\R");
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            Matcher sla = STRING_LITERAL_ASSIGN.matcher(rawLine);
            if (sla.matches()) {
                String var = sla.group(1);
                String lit = sla.group(2);
                if (var != null && lit != null) {
                    String v = lit.trim();
                    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
                        v = unescapeJavaString(v.substring(1, v.length() - 1));
                    }
                    locals.put(var, v);
                }
                continue;
            }
            if (line.startsWith("//")) {
                maybeLogInlineDirective(screenName, methodName, line, params, locals);
            }
        }
    }

    private Map<String, Object> buildExtractedVariables(MethodDirectives directives, Map<String, String> params) {
        if (directives == null || directives.exportParams == null || directives.exportParams.isEmpty()) return Map.of();
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : directives.exportParams.entrySet()) {
            String key = e.getKey();
            String paramName = e.getValue();
            if (key == null || key.isBlank() || paramName == null || paramName.isBlank()) continue;
            String raw = params != null ? params.get(paramName) : null;
            out.put(key, isSensitiveName(paramName) ? "***" : raw);
        }
        return out;
    }

    private boolean isSensitiveName(String name) {
        if (name == null) return false;
        String lc = name.toLowerCase(Locale.ROOT);
        return lc.contains("password") || lc.contains("token") || lc.contains("secret") || lc.contains("apikey") || lc.contains("api_key");
    }

    private boolean isBooleanReturnExpected(ScreenMethod m) {
        if (m == null) return false;
        String sig = m.getMethodSignature();
        if (sig == null || sig.isBlank()) return false;
        // Example: "public boolean isSorted()"
        // Example: "public Boolean isSorted()"
        Matcher mm = Pattern.compile("^\\s*public\\s+([\\w$.<>\\[\\]]+)\\s+[a-zA-Z_$][a-zA-Z0-9_$]*\\s*\\(")
            .matcher(sig.trim());
        if (!mm.find()) return false;
        String rt = mm.group(1);
        if (rt == null) return false;
        String t = rt.trim();
        if (t.equalsIgnoreCase("boolean")) return true;
        return t.equals("Boolean") || t.endsWith(".Boolean");
    }

    private ScreenMethod findMethod(Screen screen, String methodName) {
        if (screen.getMethods() == null) return null;
        for (ScreenMethod m : screen.getMethods()) {
            if (m == null || m.getMethodName() == null) continue;
            if (m.getMethodName().equalsIgnoreCase(methodName)) return m;
        }
        return null;
    }

    private ScreenElement findElement(Screen screen, String elementName) {
        if (screen.getElements() == null) return null;
        for (ScreenElement e : screen.getElements()) {
            if (e == null || e.getElementName() == null) continue;
            if (e.getElementName().equalsIgnoreCase(elementName)) return e;
        }
        return null;
    }

    private Map<String, String> bindParams(ScreenMethod method, List<String> args) {
        Map<String, String> out = new HashMap<>();
        if (method.getParams() == null || method.getParams().isEmpty()) return out;
        int n = method.getParams().size();
        int m = args != null ? args.size() : 0;
        for (int i = 0; i < n; i++) {
            String name = method.getParams().get(i).getName();
            if (name == null || name.isBlank()) continue;
            String val = i < m ? args.get(i) : null;
            out.put(name, val);
        }
        return out;
    }

    private void execAction(String action, String selector, String arg) {
        String a = action.toLowerCase(Locale.ROOT);
        switch (a) {
            case "fill" -> playwrightJavaService.fill(selector, arg != null ? arg : "");
            case "click" -> playwrightJavaService.click(selector);
            case "hover" -> playwrightJavaService.hover(selector);
            case "selectbyvalue" -> playwrightJavaService.selectByValue(selector, arg != null ? arg : "");
            case "selectoption" -> throw new RuntimeException(
                "selectOption(...) in stored methods must use new SelectOption().setLabel(...) or setValue(...)."
            );
            default -> throw new RuntimeException("Unsupported action in stored method: " + action);
        }
    }

    private static class SelectChoice {
        enum Kind { LABEL, VALUE }
        final Kind kind;
        final String value;
        SelectChoice(Kind kind, String value) {
            this.kind = kind;
            this.value = value;
        }
    }

    private void execSelectChoice(String selector, SelectChoice choice) {
        if (choice == null) throw new RuntimeException("Missing SelectOption choice (setLabel/setValue)");
        if (choice.kind == SelectChoice.Kind.LABEL) {
            playwrightJavaService.selectByLabel(selector, choice.value != null ? choice.value : "");
        } else {
            playwrightJavaService.selectByValue(selector, choice.value != null ? choice.value : "");
        }
    }

    private SelectChoice parseSelectChoice(String optionExpr, Map<String, String> params) {
        if (optionExpr == null) throw new RuntimeException("selectOption(...) requires SelectOption argument");
        String t = optionExpr.trim();
        // Match setLabel(...)
        Matcher ml = Pattern.compile("setLabel\\((.*?)\\)").matcher(t);
        if (ml.find()) {
            String inside = ml.group(1).trim();
            return new SelectChoice(SelectChoice.Kind.LABEL, evalValueToken(inside, params));
        }
        // Match setValue(...)
        Matcher mv = Pattern.compile("setValue\\((.*?)\\)").matcher(t);
        if (mv.find()) {
            String inside = mv.group(1).trim();
            return new SelectChoice(SelectChoice.Kind.VALUE, evalValueToken(inside, params));
        }
        throw new RuntimeException("selectOption(...) must use new SelectOption().setLabel(...) or setValue(...)");
    }

    private Boolean tryEvalReturnBoolean(String rawLine,
                                        Screen screen,
                                        Map<String, String> localLocators,
                                        Map<String, String> params) {
        String line = rawLine.trim();
        // return <var>.isVisible();
        Matcher m = Pattern.compile("^return\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\.isVisible\\(\\)\\s*;\\s*$").matcher(line);
        if (m.find()) {
            String var = m.group(1);
            String selector = null;
            if (localLocators.containsKey(var)) {
                selector = evalStringExpr(localLocators.get(var), params);
            } else {
                ScreenElement el = findElement(screen, var);
                if (el != null) selector = el.getSelector();
            }
            if (selector == null || selector.isBlank()) {
                throw new RuntimeException("Unsupported locator reference '" + var + "' in boolean return");
            }
            return playwrightJavaService.isVisible(selector);
        }
        return null;
    }

    /**
     * SauceDemo helpers: the "sorted by" checks are better computed directly than parsed from Java streams.
     */
    private Boolean tryEvaluateSpecialBoolean(Screen screen, String methodName) {
        if (methodName == null) return null;
        String mn = methodName.trim();
        if (mn.isEmpty()) return null;

        if ("isSortedByNameAsc".equalsIgnoreCase(mn)) {
            List<String> names = fetchTextsFromElement(screen, "productNames");
            List<String> sorted = new java.util.ArrayList<>(names);
            sorted.sort(String::compareTo);
            return names.equals(sorted);
        }
        if ("isSortedByNameDesc".equalsIgnoreCase(mn)) {
            List<String> names = fetchTextsFromElement(screen, "productNames");
            List<String> sorted = new java.util.ArrayList<>(names);
            sorted.sort((a, b) -> b.compareTo(a));
            return names.equals(sorted);
        }
        if ("isSortedByPriceAsc".equalsIgnoreCase(mn)) {
            List<Double> prices = fetchPricesFromElement(screen, "productPrices");
            List<Double> sorted = new java.util.ArrayList<>(prices);
            sorted.sort(Double::compareTo);
            return prices.equals(sorted);
        }
        if ("isSortedByPriceDesc".equalsIgnoreCase(mn)) {
            List<Double> prices = fetchPricesFromElement(screen, "productPrices");
            List<Double> sorted = new java.util.ArrayList<>(prices);
            sorted.sort((a, b) -> Double.compare(b, a));
            return prices.equals(sorted);
        }
        return null;
    }

    private boolean verifyProductPriceByText(Screen screen, String productName, String expectedPrice) {
        if (productName == null || productName.isBlank()) {
            throw new RuntimeException("verifyProductPrice requires productName");
        }
        if (expectedPrice == null || expectedPrice.isBlank()) {
            throw new RuntimeException("verifyProductPrice requires expectedPrice");
        }

        // SauceDemo DOM: find the inventory_item that has a name matching productName, then read its price text.
        // Using :text('...') like your page object already does elsewhere.
        String safeName = productName.replace("'", "\\'");
        String selector = ".inventory_item:has(.inventory_item_name:text('" + safeName + "')) .inventory_item_price";
        String priceText = playwrightJavaService.textContent(selector);
        if (priceText == null) return false;

        String actual = priceText.trim().replace("$", "").trim();
        String expected = expectedPrice.trim().replace("$", "").trim();
        return actual.equalsIgnoreCase(expected);
    }

    private List<String> fetchTextsFromElement(Screen screen, String elementName) {
        ScreenElement el = findElement(screen, elementName);
        if (el == null || el.getSelector() == null || el.getSelector().isBlank()) {
            throw new RuntimeException("Missing Screen.elements selector for '" + elementName + "' (required for " + screen.getName() + ")");
        }
        return playwrightJavaService.allTextContents(el.getSelector());
    }

    private List<Double> fetchPricesFromElement(Screen screen, String elementName) {
        List<String> raw = fetchTextsFromElement(screen, elementName);
        java.util.ArrayList<Double> out = new java.util.ArrayList<>();
        for (String s : raw) {
            if (s == null) continue;
            String t = s.trim().replace("$", "");
            if (t.isEmpty()) continue;
            try {
                out.add(Double.parseDouble(t));
            } catch (Exception e) {
                throw new RuntimeException("Failed to parse price '" + s + "' from element '" + elementName + "'");
            }
        }
        return out;
    }

    private String evalArg(String action, String argExpr, Map<String, String> params) {
        if (argExpr == null) return null;
        String t = argExpr.trim();
        // click() / hover() have empty args
        if (t.isEmpty() || ")".equals(t)) return null;
        // Support selectByValue(new SelectOption().setValue(x)) style.
        String actionLc = action != null ? action.toLowerCase(Locale.ROOT) : "";
        if ((actionLc.equals("selectbyvalue")) && t.toLowerCase(Locale.ROOT).contains("setvalue(")) {
            // Extract the first setValue(...) argument
            Matcher m = Pattern.compile("setValue\\((.*?)\\)").matcher(t);
            if (m.find()) {
                t = m.group(1).trim();
            }
        }

        // strip possible commas/spaces
        if (t.endsWith(",")) t = t.substring(0, t.length() - 1).trim();
        return evalValueToken(t, params);
    }

    private String evalStringExpr(String expr, Map<String, String> params) {
        if (expr == null) return "";
        String e = expr.trim();
        // Support concatenation of "..." + var + "..." (+ var ...)
        // Tokenize by + at top level (ignore + inside quotes)
        List<String> parts = splitByPlus(e);

        // Java string literal only (no concatenation)
        if (parts.size() == 1) {
            String only = parts.get(0).trim();
            if (only.startsWith("\"") && only.endsWith("\"")) {
                return unescapeJavaString(only.substring(1, only.length() - 1));
            }
        }

        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            String tok = p.trim();
            if (tok.isEmpty()) continue;
            if (tok.startsWith("\"") && tok.endsWith("\"")) {
                sb.append(unescapeJavaString(tok.substring(1, tok.length() - 1)));
            } else {
                // identifier (param)
                String val = params.get(tok);
                if (val == null) {
                    throw new RuntimeException("Unknown identifier in locator expression: " + tok);
                }
                sb.append(val);
            }
        }
        return sb.toString();
    }

    private String evalValueToken(String token, Map<String, String> params) {
        if (token == null) return null;
        String t = token.trim();
        if (t.isEmpty()) return null;
        if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
            return unescapeJavaString(t.substring(1, t.length() - 1));
        }
        // identifier param
        if (params.containsKey(t)) return params.get(t);
        // raw string (fallback)
        return t;
    }

    private List<String> splitByPlus(String s) {
        java.util.ArrayList<String> out = new java.util.ArrayList<>();
        boolean inD = false;
        boolean esc = false;
        StringBuilder cur = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (inD) {
                cur.append(c);
                if (!esc && c == '\\') { esc = true; continue; }
                if (!esc && c == '"') inD = false;
                esc = false;
                continue;
            }
            if (c == '"') {
                inD = true;
                cur.append(c);
                continue;
            }
            if (c == '+') {
                out.add(cur.toString());
                cur.setLength(0);
                continue;
            }
            cur.append(c);
        }
        out.add(cur.toString());
        return out;
    }

    private String unescapeJavaString(String s) {
        if (s == null) return null;
        return s
            .replace("\\\\n", "\n")
            .replace("\\\\r", "\r")
            .replace("\\\\t", "\t")
            .replace("\\\\\"", "\"")
            .replace("\\\\\\\\", "\\\\");
    }
}


