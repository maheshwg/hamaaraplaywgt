package com.youraitester.service;

import com.youraitester.model.app.App;
import com.youraitester.plugin.api.AppPlugin;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads an AppPlugin implementation from a local plugin jar using ServiceLoader.
 *
 * Security: jar path must resolve under an allowed root (default: backend/plugins) and end with .jar.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PluginJarLoaderService {

  @Value("${plugin.jar.allowedRoot:plugins}")
  private String allowedRoot;

  private final Map<String, LoadedPlugin> cache = new ConcurrentHashMap<>();

  public LoadedPlugin loadForApp(App app) {
    if (app == null) throw new IllegalArgumentException("app is required");
    if (app.getPluginJarPath() == null || app.getPluginJarPath().isBlank()) {
      throw new IllegalArgumentException("App has no pluginJarPath configured (appId=" + app.getId() + ")");
    }

    Path jarPath = resolveAndValidateJarPath(app.getPluginJarPath());
    // Compute sha BEFORE consulting cache so rebuilding a jar at the same path is picked up
    // without requiring a backend restart.
    String sha256 = computeSha256Hex(jarPath);
    String cacheKey = jarPath.toString()
        + "::" + sha256
        + "::" + (app.getPluginVersion() != null ? app.getPluginVersion() : "");
    LoadedPlugin existing = cache.get(cacheKey);
    if (existing != null) return existing;

    if (app.getPluginSha256() != null && !app.getPluginSha256().isBlank()) {
      String expected = app.getPluginSha256().trim().toLowerCase();
      if (!sha256.equals(expected)) {
        throw new IllegalStateException("Plugin jar SHA-256 mismatch. expected=" + expected + " actual=" + sha256);
      }
    }

    try {
      URL url = jarPath.toUri().toURL();
      // Parent classloader must be able to see Playwright + plugin API.
      URLClassLoader cl = new URLClassLoader(new URL[]{url}, AppPlugin.class.getClassLoader());
      ServiceLoader<AppPlugin> loader = ServiceLoader.load(AppPlugin.class, cl);

      AppPlugin plugin = null;
      for (AppPlugin p : loader) {
        plugin = p;
        break;
      }
      if (plugin == null) {
        throw new IllegalStateException("No AppPlugin implementation found in jar (ServiceLoader). jar=" + jarPath);
      }

      // Validate app name match (best-effort; allow null/blank on either side).
      String pluginAppName = plugin.getAppName();
      if (pluginAppName != null && app.getName() != null && !pluginAppName.equalsIgnoreCase(app.getName())) {
        throw new IllegalStateException("Plugin appName mismatch. app='" + app.getName() + "' plugin='" + pluginAppName + "'");
      }

      LoadedPlugin lp = new LoadedPlugin(jarPath, sha256, cl, plugin);
      cache.put(cacheKey, lp);
      log.info("[JAR] Loaded plugin for appId={} appName='{}' jar={} sha256={}",
          app.getId(), app.getName(), jarPath, sha256);
      return lp;
    } catch (Exception e) {
      throw new RuntimeException("Failed to load plugin jar for appId=" + app.getId() + ": " + e.getMessage(), e);
    }
  }

  private Path resolveAndValidateJarPath(String jarPathStr) {
    Path backendRoot = Paths.get(System.getProperty("user.dir")).normalize().toAbsolutePath();
    Path allowed = backendRoot.resolve(allowedRoot).normalize().toAbsolutePath();

    Path p = Paths.get(jarPathStr);
    if (!p.isAbsolute()) {
      p = backendRoot.resolve(p).normalize().toAbsolutePath();
    } else {
      p = p.normalize().toAbsolutePath();
    }

    if (!p.toString().endsWith(".jar")) {
      throw new IllegalArgumentException("pluginJarPath must be a .jar file: " + p);
    }
    if (!p.startsWith(allowed)) {
      throw new IllegalArgumentException("pluginJarPath must be under " + allowed + " but got " + p);
    }
    if (!Files.exists(p)) {
      throw new IllegalArgumentException("pluginJarPath not found: " + p);
    }
    return p;
  }

  private String computeSha256Hex(Path p) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      try (InputStream in = Files.newInputStream(p)) {
        byte[] buf = new byte[8192];
        int r;
        while ((r = in.read(buf)) > 0) {
          md.update(buf, 0, r);
        }
      }
      return HexFormat.of().formatHex(md.digest());
    } catch (Exception e) {
      throw new RuntimeException("Failed to compute SHA-256 for " + p + ": " + e.getMessage(), e);
    }
  }

  public record LoadedPlugin(Path jarPath, String sha256, URLClassLoader classLoader, AppPlugin plugin) {}
}


