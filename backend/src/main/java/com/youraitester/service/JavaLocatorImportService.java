package com.youraitester.service;

import com.youraitester.dto.app.ScreenElementRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Generic importer: parse Java source files for assignments like:
 *   someField = page.locator("css selector");
 *
 * Returns ScreenElementRequest[] suitable for replacing Screen.elements.
 *
 * SECURITY:
 * - Callers must be SUPER_ADMIN (enforced at controller layer)
 * - This service enforces an allowlist: sourcePath must resolve under backend/src/main/java
 *   to prevent arbitrary file reads.
 */
@Service
@Slf4j
public class JavaLocatorImportService {

    private static final Pattern LOCATOR_ASSIGNMENT =
        Pattern.compile("\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*page\\.locator\\(\"([^\"]+)\"\\)\\s*;");

    private static final long MAX_SOURCE_BYTES = 1_000_000; // 1MB safety limit

    public List<ScreenElementRequest> loadElementsFromJavaSource(String sourcePath) {
        if (sourcePath == null || sourcePath.isBlank()) {
            throw new IllegalArgumentException("sourcePath is required");
        }

        Path backendRoot = Paths.get(System.getProperty("user.dir")).normalize().toAbsolutePath();
        Path allowedRoot = backendRoot.resolve("src/main/java").normalize().toAbsolutePath();

        Path p = Paths.get(sourcePath);
        if (!p.isAbsolute()) {
            p = backendRoot.resolve(p).normalize().toAbsolutePath();
        } else {
            p = p.normalize().toAbsolutePath();
        }

        if (!p.toString().endsWith(".java")) {
            throw new IllegalArgumentException("sourcePath must be a .java file");
        }

        if (!p.startsWith(allowedRoot)) {
            throw new IllegalArgumentException("sourcePath must be under " + allowedRoot);
        }

        if (!Files.exists(p)) {
            throw new IllegalArgumentException("sourcePath not found: " + p);
        }

        try {
            long size = Files.size(p);
            if (size > MAX_SOURCE_BYTES) {
                throw new IllegalArgumentException("sourcePath too large (" + size + " bytes), max=" + MAX_SOURCE_BYTES);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to stat sourcePath: " + p, e);
        }

        String content;
        try {
            content = Files.readString(p, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read sourcePath: " + p, e);
        }

        List<ScreenElementRequest> out = new ArrayList<>();
        Matcher m = LOCATOR_ASSIGNMENT.matcher(content);
        while (m.find()) {
            String elementName = m.group(1);
            String selector = m.group(2);

            ScreenElementRequest req = new ScreenElementRequest();
            req.setElementName(elementName);
            req.setSelectorType("css");
            req.setSelector(selector);
            req.setFrameSelector(null);

            String elementType = inferElementType(selector);
            req.setElementType(elementType);
            req.setActionsSupported(inferActions(elementType));

            out.add(req);
        }

        log.info("[IMPORT] Parsed {} locator(s) from sourcePath={}", out.size(), p);
        if (out.isEmpty()) {
            log.warn("[IMPORT] No page.locator(\"...\") assignments matched in {}", p);
        }
        return out;
    }

    private String inferElementType(String selector) {
        if (selector == null) return "other";
        String s = selector.trim().toLowerCase();
        if (s.startsWith("textarea")) return "textarea";
        if (s.startsWith("select")) return "select";
        if (s.startsWith("button")) return "button";
        if (s.startsWith("table")) return "table";
        if (s.startsWith("svg") || s.contains("svg")) return "svg";
        if (s.startsWith("input")) {
            if (s.contains("type='radio'") || s.contains("type=\"radio\"")) return "radio";
            if (s.contains("type='checkbox'") || s.contains("type=\"checkbox\"")) return "checkbox";
            if (s.contains("type='file'") || s.contains("type=\"file\"")) return "file";
            if (s.contains("type='range'") || s.contains("type=\"range\"")) return "range";
            return "input";
        }
        return "other";
    }

    private List<String> inferActions(String elementType) {
        List<String> a = new ArrayList<>();
        if (elementType == null) return a;
        switch (elementType) {
            case "input", "textarea" -> {
                a.add("fill");
                a.add("click");
            }
            case "select" -> {
                a.add("select_by_value");
                a.add("click");
            }
            case "button", "table" -> a.add("click");
            case "radio", "checkbox" -> {
                a.add("click");
                a.add("check");
            }
            case "file" -> a.add("set_input_files");
            default -> {
                a.add("click");
                a.add("hover");
            }
        }
        return a;
    }
}


