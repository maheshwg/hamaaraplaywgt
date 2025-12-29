package com.youraitester.service;

import com.youraitester.dto.app.ScreenMethodParamRequest;
import com.youraitester.dto.app.ScreenMethodRequest;
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
 * Generic importer: parse Java source files for public method declarations and extract:
 * - methodName
 * - methodSignature
 * - methodBody (full source block)
 * - params (type + name)
 *
 * SECURITY:
 * - Enforce an allowlist: sourcePath must resolve under backend/src/main/java (prevents arbitrary file reads)
 * - .java files only, size limited
 *
 * Note: This is a lightweight parser (not a full Java parser). It is intended for typical page-object classes.
 */
@Service
@Slf4j
public class JavaMethodImportService {

    // e.g. public void foo(String a, int b) {
    // Captures: returnType, methodName, paramsText
    private static final Pattern PUBLIC_METHOD_HEADER = Pattern.compile(
        "(?m)^[\\t ]*public\\s+([\\w\\<\\>\\[\\]\\.\\,\\s\\?]+?)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(([^\\)]*)\\)\\s*\\{"
    );

    private static final long MAX_SOURCE_BYTES = 1_000_000; // 1MB

    public List<ScreenMethodRequest> loadMethodsFromJavaSource(String sourcePath) {
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

        List<ScreenMethodRequest> out = new ArrayList<>();
        Matcher m = PUBLIC_METHOD_HEADER.matcher(content);
        while (m.find()) {
            String returnType = m.group(1).trim();
            String methodName = m.group(2).trim();
            String paramsText = m.group(3) != null ? m.group(3).trim() : "";

            // Skip constructors (methodName equals class name) is tricky without className; usually returnType != className for constructors anyway.
            // Also skip trivial getters/setters if desired; for now keep everything public.

            int braceStart = m.end() - 1; // points at '{'
            int braceEnd = findMatchingBrace(content, braceStart);
            if (braceEnd <= braceStart) {
                log.warn("[IMPORT] Could not find matching brace for method {} at index {}", methodName, braceStart);
                continue;
            }

            String fullBlock = content.substring(m.start(), braceEnd + 1);
            String signature = "public " + returnType + " " + methodName + "(" + paramsText + ")";
            if (signature.length() > 4000) signature = signature.substring(0, 4000);

            ScreenMethodRequest req = new ScreenMethodRequest();
            req.setMethodName(methodName);
            req.setMethodSignature(signature);
            req.setMethodBody(fullBlock);
            req.setReturnHandling(null);
            req.setSideEffectFlags(null);
            req.setParams(parseParams(paramsText));
            out.add(req);
        }

        log.info("[IMPORT] Parsed {} public method(s) from sourcePath={}", out.size(), p);
        return out;
    }

    private List<ScreenMethodParamRequest> parseParams(String paramsText) {
        List<ScreenMethodParamRequest> params = new ArrayList<>();
        if (paramsText == null) return params;
        String t = paramsText.trim();
        if (t.isEmpty()) return params;

        // Simple split by comma; adequate for common page-object params (String, int, Locator, etc).
        // Not a full Java parser (won't handle generic commas inside <>).
        String[] parts = t.split(",");
        for (String part : parts) {
            String p = part.trim();
            if (p.isEmpty()) continue;
            // Remove annotations (e.g., @Nullable)
            p = p.replaceAll("@[A-Za-z0-9_$.]+\\s*", "").trim();

            // tokens: type tokens + name token
            String[] toks = p.split("\\s+");
            if (toks.length < 2) continue;
            String name = toks[toks.length - 1];
            StringBuilder type = new StringBuilder();
            for (int i = 0; i < toks.length - 1; i++) {
                if (i > 0) type.append(" ");
                type.append(toks[i]);
            }

            ScreenMethodParamRequest pr = new ScreenMethodParamRequest();
            pr.setName(name);
            pr.setType(type.toString());
            pr.setOptional(false);
            pr.setDefaultValue(null);
            params.add(pr);
        }
        return params;
    }

    /**
     * Finds the matching closing brace for the opening brace at openIdx.
     * Handles strings and comments to avoid counting braces inside them.
     */
    private int findMatchingBrace(String s, int openIdx) {
        int depth = 0;
        boolean inSQuote = false;
        boolean inDQuote = false;
        boolean inLineComment = false;
        boolean inBlockComment = false;
        boolean escape = false;

        for (int i = openIdx; i < s.length(); i++) {
            char c = s.charAt(i);
            char n = (i + 1 < s.length()) ? s.charAt(i + 1) : '\0';

            if (inLineComment) {
                if (c == '\n') inLineComment = false;
                continue;
            }
            if (inBlockComment) {
                if (c == '*' && n == '/') {
                    inBlockComment = false;
                    i++;
                }
                continue;
            }

            if (inSQuote) {
                if (!escape && c == '\\') { escape = true; continue; }
                if (!escape && c == '\'') inSQuote = false;
                escape = false;
                continue;
            }
            if (inDQuote) {
                if (!escape && c == '\\') { escape = true; continue; }
                if (!escape && c == '"') inDQuote = false;
                escape = false;
                continue;
            }

            // comment start
            if (c == '/' && n == '/') { inLineComment = true; i++; continue; }
            if (c == '/' && n == '*') { inBlockComment = true; i++; continue; }

            if (c == '\'') { inSQuote = true; continue; }
            if (c == '"') { inDQuote = true; continue; }

            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) return i;
            }
        }
        return -1;
    }
}


