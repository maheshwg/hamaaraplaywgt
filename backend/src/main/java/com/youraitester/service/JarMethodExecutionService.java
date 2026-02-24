package com.youraitester.service;

import com.microsoft.playwright.Page;
import com.youraitester.model.app.App;
import com.youraitester.plugin.api.AppPlugin;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Executes call_method steps using a plugin jar (compiled page objects).
 *
 * Method-only phase: call_method selector is screenName::methodName, args are strings.
 * We do basic arg coercion for common primitive types, otherwise pass String values.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JarMethodExecutionService {

  private final PluginJarLoaderService pluginJarLoaderService;
  private final PlaywrightJavaService playwrightJavaService;

  public InvocationResult invoke(App app, String screenName, String methodName, List<String> args) {
    if (app == null) throw new IllegalArgumentException("app is required");
    if (screenName == null || screenName.isBlank()) throw new IllegalArgumentException("screenName is required");
    if (methodName == null || methodName.isBlank()) throw new IllegalArgumentException("methodName is required");

    PluginJarLoaderService.LoadedPlugin lp = pluginJarLoaderService.loadForApp(app);
    AppPlugin plugin = lp.plugin();
    Set<String> screens = plugin.getScreenNames();
    String chosenScreen = resolveCaseInsensitive(screens, screenName);
    if (chosenScreen == null) {
      throw new IllegalArgumentException("Plugin does not expose screen '" + screenName + "' (known=" + screens + ")");
    }

    Page page = playwrightJavaService.getPage(); // ensureStarted is handled by caller (TestExecutionService)

    Object screenObj = plugin.createScreen(chosenScreen, page);
    Class<?> screenClass = plugin.getScreenClass(chosenScreen);
    if (screenClass == null) {
      throw new IllegalStateException("Plugin returned null screenClass for screen: " + chosenScreen);
    }

    if (screenObj == null) {
      screenObj = instantiateScreen(screenClass, page);
    } else if (!screenClass.isInstance(screenObj)) {
      throw new IllegalStateException("Plugin createScreen returned unexpected type. expected=" + screenClass + " got=" + screenObj.getClass());
    }

    int providedArgCount = (args != null ? args.size() : 0);
    Method m = findCompatibleMethod(screenClass, methodName, providedArgCount);
    if (m == null) {
      // Best-effort fallback: if there's exactly one method with this name (ignoring case),
      // allow calling it even if argCount doesn't match by padding missing args with defaults.
      List<Method> candidates = findMethodsByName(screenClass, methodName);
      if (candidates.size() == 1) {
        m = candidates.get(0);
        log.warn("[JAR] Method argCount mismatch; falling back to name-only match. screen='{}' method='{}' providedArgCount={} expectedArgCount={}",
            chosenScreen, m.getName(), providedArgCount, m.getParameterCount());
      } else if (!candidates.isEmpty()) {
        StringBuilder sb = new StringBuilder();
        for (Method cm : candidates) {
          sb.append(cm.getName()).append("(").append(cm.getParameterCount()).append(" params, returns ")
              .append(cm.getReturnType() != null ? cm.getReturnType().getSimpleName() : "?").append("); ");
        }
        throw new IllegalArgumentException(
            "Method not found on screen '" + chosenScreen + "': " + methodName
                + " (argCount=" + providedArgCount + "). Available overloads: " + sb
        );
      } else {
        throw new IllegalArgumentException("Method not found on screen '" + chosenScreen + "': " + methodName + " (argCount=" + providedArgCount + ")");
      }
    }

    Object[] invokeArgs = coerceArgs(m.getParameterTypes(), args != null ? args : List.of());

    try {
      m.setAccessible(true);
      Object ret = m.invoke(screenObj, invokeArgs);
      boolean booleanReturnExpected = (m.getReturnType() == boolean.class || m.getReturnType() == Boolean.class);
      Boolean boolVal = null;
      if (booleanReturnExpected) {
        if (ret == null) {
          boolVal = null;
        } else if (ret instanceof Boolean b) {
          boolVal = b;
        } else {
          // Shouldn't happen, but keep safe
          boolVal = Boolean.parseBoolean(String.valueOf(ret));
        }
      }

      return new InvocationResult(booleanReturnExpected, boolVal, ret);
    } catch (Exception e) {
      throw new RuntimeException("Failed to invoke plugin method " + chosenScreen + "." + m.getName() + ": " + e.getMessage(), e);
    }
  }

  private Object instantiateScreen(Class<?> cls, Page page) {
    try {
      // Prefer (Page) constructor
      Constructor<?> c = cls.getDeclaredConstructor(Page.class);
      c.setAccessible(true);
      return c.newInstance(page);
    } catch (NoSuchMethodException e) {
      // Fall back to no-arg constructor
      try {
        Constructor<?> c = cls.getDeclaredConstructor();
        c.setAccessible(true);
        return c.newInstance();
      } catch (Exception ex) {
        throw new IllegalStateException("Screen class must have (Page) or no-arg constructor: " + cls.getName(), ex);
      }
    } catch (Exception e) {
      throw new RuntimeException("Failed to instantiate screen class: " + cls.getName(), e);
    }
  }

  private Method findCompatibleMethod(Class<?> cls, String name, int argCount) {
    String target = name.trim();
    Method best = null;
    for (Method m : cls.getMethods()) {
      if (m == null) continue;
      if (!m.getName().equalsIgnoreCase(target)) continue;
      if (m.getParameterCount() != argCount) continue;
      best = m;
      break;
    }
    return best;
  }

  private List<Method> findMethodsByName(Class<?> cls, String name) {
    List<Method> out = new ArrayList<>();
    if (cls == null || name == null) return out;
    String target = name.trim();
    for (Method m : cls.getMethods()) {
      if (m == null) continue;
      if (!m.getName().equalsIgnoreCase(target)) continue;
      out.add(m);
    }
    return out;
  }

  private Object[] coerceArgs(Class<?>[] paramTypes, List<String> raw) {
    Object[] out = new Object[paramTypes.length];
    for (int i = 0; i < paramTypes.length; i++) {
      Class<?> t = paramTypes[i];
      String v = i < raw.size() ? raw.get(i) : null;
      out[i] = coerceOne(t, v);
    }
    return out;
  }

  private Object coerceOne(Class<?> t, String v) {
    if (t == String.class) return v;
    if (t == int.class || t == Integer.class) return (v == null || v.isBlank()) ? 0 : Integer.parseInt(v.trim());
    if (t == long.class || t == Long.class) return (v == null || v.isBlank()) ? 0L : Long.parseLong(v.trim());
    if (t == double.class || t == Double.class) return (v == null || v.isBlank()) ? 0d : Double.parseDouble(v.trim());
    if (t == boolean.class || t == Boolean.class) return v != null && v.trim().equalsIgnoreCase("true");
    // default: pass string; may fail if method expects something else (that's fine; will surface clearly)
    return v;
  }

  private String resolveCaseInsensitive(Set<String> set, String wanted) {
    if (set == null || set.isEmpty()) return null;
    for (String s : set) {
      if (s != null && s.equalsIgnoreCase(wanted)) return s;
    }
    return null;
  }

  /**
   * returnValue is the raw reflected return (may be null). For boolean-returning methods,
   * booleanValue is populated (may be null if method returned null).
   */
  public record InvocationResult(boolean booleanReturnExpected, Boolean booleanValue, Object returnValue) {}
}


