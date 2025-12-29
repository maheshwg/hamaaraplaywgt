package com.youraitester.service;

import com.microsoft.playwright.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Simple per-thread Playwright Java runtime for deterministic execution (no MCP).
 * Each test thread gets its own Playwright/Browser/Context/Page.
 */
@Service
@Slf4j
public class PlaywrightJavaService {

    @Value("${browser.headless:true}")
    private boolean headless;

    @Value("${browser.timeout:30000}")
    private int timeoutMs;

    @Value("${browser.browser:chromium}")
    private String browserName;

    private final ThreadLocal<Playwright> tlPlaywright = ThreadLocal.withInitial(() -> null);
    private final ThreadLocal<Browser> tlBrowser = ThreadLocal.withInitial(() -> null);
    private final ThreadLocal<BrowserContext> tlContext = ThreadLocal.withInitial(() -> null);
    private final ThreadLocal<Page> tlPage = ThreadLocal.withInitial(() -> null);

    public Page getPage() {
        Page p = tlPage.get();
        if (p == null) throw new IllegalStateException("Playwright page not initialized for this thread");
        return p;
    }

    public void ensureStarted() {
        if (tlPage.get() != null) return;

        Playwright pw = Playwright.create();
        BrowserType bt = resolveBrowserType(pw, browserName);
        Browser browser = bt.launch(new BrowserType.LaunchOptions().setHeadless(headless));
        BrowserContext ctx = browser.newContext();
        Page page = ctx.newPage();
        page.setDefaultTimeout(timeoutMs);

        tlPlaywright.set(pw);
        tlBrowser.set(browser);
        tlContext.set(ctx);
        tlPage.set(page);

        log.info("[PW] Started Playwright Java session (browser={}, headless={}, timeoutMs={})",
            browserName, headless, timeoutMs);
    }

    public void reset() {
        Page p = tlPage.get();
        BrowserContext ctx = tlContext.get();
        Browser b = tlBrowser.get();
        Playwright pw = tlPlaywright.get();

        try { if (p != null) p.close(); } catch (Exception ignored) {}
        try { if (ctx != null) ctx.close(); } catch (Exception ignored) {}
        try { if (b != null) b.close(); } catch (Exception ignored) {}
        try { if (pw != null) pw.close(); } catch (Exception ignored) {}

        tlPage.remove();
        tlContext.remove();
        tlBrowser.remove();
        tlPlaywright.remove();
    }

    public void navigate(String url) {
        ensureStarted();
        getPage().navigate(url);
    }

    public void fill(String cssSelector, String value) {
        ensureStarted();
        getPage().locator(cssSelector).first().fill(value == null ? "" : value);
    }

    public void click(String cssSelector) {
        ensureStarted();
        getPage().locator(cssSelector).first().click();
    }

    public void hover(String cssSelector) {
        ensureStarted();
        getPage().locator(cssSelector).first().hover();
    }

    public void selectByValue(String cssSelector, String value) {
        ensureStarted();
        getPage().locator(cssSelector).first().selectOption(value == null ? "" : value);
    }

    public void press(String key) {
        ensureStarted();
        getPage().keyboard().press(key);
    }

    /**
     * Best-effort scroll so the given element is in the viewport before screenshot.
     */
    public void scrollIntoView(String cssSelector) {
        if (cssSelector == null || cssSelector.isBlank()) return;
        ensureStarted();
        getPage().locator(cssSelector).first().scrollIntoViewIfNeeded();
    }

    /**
     * Best-effort scroll to the active element (useful when we don't have a selector, e.g. press_key).
     */
    public void scrollToActiveElement() {
        ensureStarted();
        getPage().evaluate("() => { const el = document.activeElement; if (el && el.scrollIntoView) { el.scrollIntoView({block: 'center', inline: 'center'}); } }");
    }

    public void screenshot(Path path) {
        ensureStarted();
        getPage().screenshot(new Page.ScreenshotOptions().setPath(path).setFullPage(false));
    }

    private BrowserType resolveBrowserType(Playwright pw, String name) {
        String n = name == null ? "chromium" : name.trim().toLowerCase(Locale.ROOT);
        return switch (n) {
            case "firefox" -> pw.firefox();
            case "webkit" -> pw.webkit();
            default -> pw.chromium();
        };
    }

    @PreDestroy
    public void cleanup() {
        // Best-effort cleanup for current thread if any.
        reset();
    }
}


