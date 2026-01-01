package com.youraitester.service;

import com.microsoft.playwright.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Locale;

/**
 * Reflection-based page-object invoker for deterministic execution in environments where
 * source files may not exist (e.g., EC2 with only built artifacts).
 *
 * Convention used:
 * - package name == appName (lowercase, stripped to [a-z0-9_])
 * - class name == ScreenName in PascalCase (e.g., "products" -> "Products", "home_page" -> "HomePage")
 * - constructor(Page) exists
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PageObjectInvokerService {

    private final PlaywrightJavaService playwrightJavaService;

    public void invoke(String appName, String screenName, String methodName, List<String> args) {
        if (appName == null || appName.isBlank()) throw new IllegalArgumentException("appName is required");
        if (screenName == null || screenName.isBlank()) throw new IllegalArgumentException("screenName is required");
        if (methodName == null || methodName.isBlank()) throw new IllegalArgumentException("methodName is required");

        String pkg = normalizePackage(appName);
        String clsName = toClassName(screenName);
        List<String> candidateFqcns = List.of(
            pkg + "." + clsName,
            pkg + "." + clsName + "Page",
            pkg + "." + clsName + "Screen"
        );

        Page page = playwrightJavaService.getPage();

        try {
            Class<?> cls = null;
            String fqcn = null;
            for (String cand : candidateFqcns) {
                try {
                    cls = Class.forName(cand);
                    fqcn = cand;
                    break;
                } catch (ClassNotFoundException ignored) {}
            }
            if (cls == null) {
                throw new RuntimeException("Page-object class not found. Tried: " + candidateFqcns);
            }

            Constructor<?> ctor = cls.getConstructor(Page.class);
            Object instance = ctor.newInstance(page);

            Method m = resolveMethod(cls, methodName, args != null ? args.size() : 0);
            if (m == null) {
                throw new RuntimeException("Method not found: " + fqcn + "." + methodName + "(String x" + (args != null ? args.size() : 0) + ")");
            }

            Object[] invokeArgs = new Object[args != null ? args.size() : 0];
            for (int i = 0; i < invokeArgs.length; i++) invokeArgs[i] = args.get(i);

            log.info("[PO] Invoking {}.{}({} arg(s))", fqcn, m.getName(), invokeArgs.length);
            m.invoke(instance, invokeArgs);
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            String fqcnHint = candidateFqcns.get(0);
            throw new RuntimeException("Failed to invoke page-object method (appName=" + appName +
                ", screenName=" + screenName +
                ", methodName=" + methodName +
                ", attemptedClasses=" + candidateFqcns +
                "). BaseClassHint=" + fqcnHint, e);
        }
    }

    private Method resolveMethod(Class<?> cls, String wantedName, int argCount) {
        String wn = wantedName.trim().toLowerCase(Locale.ROOT);
        for (Method m : cls.getMethods()) {
            if (!m.getName().toLowerCase(Locale.ROOT).equals(wn)) continue;
            if (m.getParameterCount() != argCount) continue;
            boolean allString = true;
            for (Class<?> pt : m.getParameterTypes()) {
                if (!String.class.equals(pt)) { allString = false; break; }
            }
            if (allString) return m;
        }
        return null;
    }

    private String normalizePackage(String appName) {
        String s = appName.trim().toLowerCase(Locale.ROOT);
        s = s.replaceAll("[^a-z0-9_]", "");
        if (s.isEmpty()) throw new IllegalArgumentException("appName cannot be normalized to a valid package");
        return s;
    }

    private String toClassName(String screenName) {
        String[] parts = screenName.trim().split("[^A-Za-z0-9]+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0)));
            if (p.length() > 1) sb.append(p.substring(1));
        }
        if (sb.length() == 0) throw new IllegalArgumentException("screenName cannot be converted to class name");
        return sb.toString();
    }
}


