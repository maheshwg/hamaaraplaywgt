/* eslint-env node */
/* global require, process */
const express = require('express');
const bodyParser = require('body-parser');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
app.use(bodyParser.json());

let browser = null;
let context = null;
let page = null;

// Helpers for param validation and CSS checks
function ensureString(value, name, { nonEmpty = true } = {}) {
    if (typeof value !== 'string') return `${name} must be a string`;
    const trimmed = value.trim();
    if (nonEmpty && trimmed.length === 0) return `${name} must be a non-empty string`;
    return null;
}

function ensureNumber(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${name} must be a finite number`;
    return null;
}

function validateCssSelectorValue(selector) {
    if (typeof selector !== 'string' || selector.trim().length === 0) {
        return 'selector must be a non-empty CSS selector string';
    }
    const s = selector.trim();
    const lower = s.toLowerCase();
    
    // Disallow common non-standard pseudo-selectors that cause errors
    // Check case-insensitively for common variations
    if (s.includes(':contains(') || lower.includes(':contains(')) {
        return `Invalid selector: "${selector}". The :contains() pseudo-selector is not supported. Use standard CSS selectors (e.g., [aria-label="text"], [data-testid="id"], .class, #id) or use visionAnalyze + clickAtCoordinates.`;
    }
    if (s.includes(':has-text(') || lower.includes(':has-text(')) {
        return `Invalid selector: "${selector}". The :has-text() pseudo-selector is not supported. Use standard CSS selectors derived from getContent() (classes, ids, attributes).`;
    }
    // Check for other common non-standard pseudo-selectors
    if (s.includes(':text(') || lower.includes(':text(')) {
        return `Invalid selector: "${selector}". The :text() pseudo-selector is not supported. Use standard CSS selectors or use visionAnalyze + clickAtCoordinates.`;
    }
    // Guard against Playwright test-id shorthands
    if (s.startsWith('getBy') || lower.startsWith('getby')) {
        return `Invalid selector: "${selector}". getBy* selectors are not supported. Provide a standard CSS selector.`;
    }
    // Guard against XPath (not CSS)
    if (s.startsWith('//') || s.startsWith('/') || s.startsWith('xpath:') || lower.startsWith('xpath:')) {
        return `Invalid selector: "${selector}". XPath is not supported. Use standard CSS selectors.`;
    }
    return null;
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Initialize browser on startup
async function initBrowser() {
    console.log('Initializing Playwright browser...');
    browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    context = await browser.newContext();
    page = await context.newPage();
    console.log('Browser initialized successfully');
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', browserReady: page !== null });
});

// Serve screenshot files
app.get('/screenshots/:filename', (req, res) => {
    const { filename } = req.params;
    const filepath = path.join('/tmp', filename);
    
    console.log('Screenshot request for:', filepath);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
        console.error('Screenshot not found:', filepath);
        return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    console.log('Sending screenshot:', filepath);
    res.sendFile(filepath, (err) => {
        if (err) {
            console.error('Error sending screenshot:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error sending screenshot' });
            }
        }
    });
});

// Execute action endpoint
app.post('/execute', async (req, res) => {
    try {
        const { action, params = {} } = req.body || {};

        if (!page) {
            try {
                await initBrowser();
            } catch (e) {
                return res.status(503).json({ success: false, error: `Browser initialization failed: ${e.message}` });
            }
        }

        let result = { success: true };

        switch (action) {
            case 'navigate':
                {
                    const err = ensureString(params.url, 'url');
                    if (err) { result.success = false; result.error = `navigate: ${err}`; break; }
                    try {
                        await page.goto(params.url.trim(), { waitUntil: 'domcontentloaded' });
                        result.message = `Navigated to ${params.url.trim()}`;
                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to navigate to ${params.url}: ${e.message}`;
                    }
                }
                break;

            case 'click':
                {
                    const selErr = validateCssSelectorValue(params.selector);
                    if (selErr) { result.success = false; result.error = `click: ${selErr}`; break; }
                    try {
                        await page.click(params.selector.trim());
                        result.message = `Clicked on ${params.selector.trim()}`;
                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to click ${params.selector}: ${e.message}`;
                    }
                }
                break;

            case 'clickAtCoordinates':
                {
                    const ex = ensureNumber(params.x, 'x') || ensureNumber(params.y, 'y');
                    if (ex) { result.success = false; result.error = `clickAtCoordinates: ${ex}`; break; }
                    try {
                        await page.mouse.click(params.x, params.y);
                        result.message = `Clicked at coordinates (${params.x}, ${params.y})`;
                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to click at coordinates (${params.x}, ${params.y}): ${e.message}`;
                    }
                }
                break;

            case 'highlightAtCoordinates':
                {
                    const ex = ensureNumber(params.x, 'x') || ensureNumber(params.y, 'y');
                    if (ex) { result.success = false; result.error = `highlightAtCoordinates: ${ex}`; break; }

                    const sizeRaw = (typeof params.size === 'number' && Number.isFinite(params.size)) ? params.size : 5;
                    const size = Math.max(1, Math.min(50, Math.floor(sizeRaw)));
                    const x = params.x;
                    const y = params.y;

                    const highlightId = `mcp-highlight-${Date.now()}`;
                    try {
                        // Draw a small marker on the page itself (fixed-position overlay)
                        await page.evaluate(({ highlightId, x, y, size }) => {
                            // Remove any previous marker with the same id (defensive)
                            const prev = document.getElementById(highlightId);
                            if (prev) prev.remove();

                            const el = document.createElement('div');
                            el.id = highlightId;
                            el.style.position = 'fixed';
                            el.style.left = `${Math.round(x - size / 2)}px`;
                            el.style.top = `${Math.round(y - size / 2)}px`;
                            el.style.width = `${size}px`;
                            el.style.height = `${size}px`;
                            el.style.border = '2px solid red';
                            el.style.boxSizing = 'border-box';
                            el.style.zIndex = '2147483647';
                            el.style.pointerEvents = 'none';

                            // Add a small crosshair for visibility
                            const h = document.createElement('div');
                            h.style.position = 'absolute';
                            h.style.left = '-10px';
                            h.style.top = '50%';
                            h.style.width = `${size + 20}px`;
                            h.style.height = '1px';
                            h.style.background = 'red';
                            h.style.transform = 'translateY(-0.5px)';

                            const v = document.createElement('div');
                            v.style.position = 'absolute';
                            v.style.top = '-10px';
                            v.style.left = '50%';
                            v.style.width = '1px';
                            v.style.height = `${size + 20}px`;
                            v.style.background = 'red';
                            v.style.transform = 'translateX(-0.5px)';

                            el.appendChild(h);
                            el.appendChild(v);
                            document.body.appendChild(el);
                        }, { highlightId, x, y, size });

                        // Screenshot with marker visible
                        const screenshotPath = `/tmp/highlight-${Date.now()}-x${Math.round(x)}-y${Math.round(y)}.png`;
                        await page.screenshot({ path: screenshotPath });
                        result.path = screenshotPath;
                        result.message = `Highlighted (${x}, ${y}) size=${size} and saved screenshot to ${screenshotPath}`;

                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to highlight at (${x}, ${y}): ${e.message}`;
                    } finally {
                        // Cleanup marker
                        try {
                            await page.evaluate(({ highlightId }) => {
                                const el = document.getElementById(highlightId);
                                if (el) el.remove();
                            }, { highlightId });
                        } catch (e) {
                            // ignore cleanup errors
                        }
                    }
                }
                break;

            case 'highlightText':
                {
                    const textErr = ensureString(params.text, 'text');
                    if (textErr) { result.success = false; result.error = `highlightText: ${textErr}`; break; }

                    const mode = (typeof params.mode === 'string' && params.mode.trim().length > 0) ? params.mode.trim().toLowerCase() : 'box';

                    const paddingRaw = (typeof params.padding === 'number' && Number.isFinite(params.padding)) ? params.padding : 4;
                    const padding = Math.max(0, Math.min(30, Math.floor(paddingRaw)));

                    const sizeRaw = (typeof params.size === 'number' && Number.isFinite(params.size)) ? params.size : 5;
                    const size = Math.max(1, Math.min(50, Math.floor(sizeRaw)));

                    const color = (typeof params.color === 'string' && params.color.trim().length > 0) ? params.color.trim() : 'red';
                    const targetText = params.text.trim();

                    const highlightId = `mcp-highlight-text-${Date.now()}`;

                    try {
                        const found = await page.evaluate(({ targetText, highlightId, padding, color, mode, size }) => {
                            const needle = targetText.toLowerCase();

                            function isElementVisible(el) {
                                if (!el) return false;
                                const style = window.getComputedStyle(el);
                                if (!style) return false;
                                const opacity = parseFloat(style.opacity || '1');
                                if (style.display === 'none' || style.visibility === 'hidden' || opacity === 0) return false;
                                const rect = el.getBoundingClientRect();
                                return rect.width > 0 && rect.height > 0;
                            }

                            // 1) Prefer matching visible TEXT NODES (more reliable than element.textContent)
                            // This catches cases where "Login" is inside nested spans, etc.
                            let candidate = null;
                            try {
                                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                                let node;
                                while ((node = walker.nextNode())) {
                                    const text = (node.nodeValue || '').trim();
                                    if (!text) continue;
                                    const lower = text.toLowerCase();
                                    if (lower === needle || lower.includes(needle)) {
                                        const el = node.parentElement;
                                        if (el && isElementVisible(el)) {
                                            candidate = el;
                                            break;
                                        }
                                    }
                                }
                            } catch (e) {
                                // ignore
                            }

                            // 2) If still not found, match common label-like attributes / input values
                            if (!candidate) {
                                const all = Array.from(document.querySelectorAll('body *'));
                                const getAttrText = (el) => {
                                    const parts = [];
                                    // Inputs/buttons often expose label via value/aria-label/placeholder
                                    if (el instanceof HTMLInputElement) {
                                        if (el.value) parts.push(el.value);
                                        if (el.placeholder) parts.push(el.placeholder);
                                    }
                                    if (el instanceof HTMLButtonElement) {
                                        // button text will also be covered by TreeWalker, but keep as fallback
                                        if (el.textContent) parts.push(el.textContent);
                                    }
                                    const aria = el.getAttribute && el.getAttribute('aria-label');
                                    if (aria) parts.push(aria);
                                    const title = el.getAttribute && el.getAttribute('title');
                                    if (title) parts.push(title);
                                    const alt = el.getAttribute && el.getAttribute('alt');
                                    if (alt) parts.push(alt);
                                    return parts.join(' ').trim();
                                };

                                for (const el of all) {
                                    if (!isElementVisible(el)) continue;
                                    const txt = getAttrText(el).toLowerCase();
                                    if (!txt) continue;
                                    if (txt === needle || txt.includes(needle)) {
                                        candidate = el;
                                        break;
                                    }
                                }
                            }

                            if (!candidate) return { found: false, reason: 'text not found' };

                            // Scroll into view so the screenshot captures it
                            try { candidate.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) {}

                            const rect = candidate.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;

                            let left, top, width, height;
                            if (mode === 'marker') {
                                left = Math.max(0, centerX - size / 2);
                                top = Math.max(0, centerY - size / 2);
                                width = Math.max(1, size);
                                height = Math.max(1, size);
                            } else {
                                // box mode (default): draw around full element
                                left = Math.max(0, rect.left - padding);
                                top = Math.max(0, rect.top - padding);
                                width = Math.max(1, rect.width + padding * 2);
                                height = Math.max(1, rect.height + padding * 2);
                            }

                            // Remove existing marker if present
                            const prev = document.getElementById(highlightId);
                            if (prev) prev.remove();

                            const box = document.createElement('div');
                            box.id = highlightId;
                            box.style.position = 'fixed';
                            box.style.left = `${Math.round(left)}px`;
                            box.style.top = `${Math.round(top)}px`;
                            box.style.width = `${Math.round(width)}px`;
                            box.style.height = `${Math.round(height)}px`;
                            box.style.border = `3px solid ${color}`;
                            box.style.boxSizing = 'border-box';
                            box.style.zIndex = '2147483647';
                            box.style.pointerEvents = 'none';
                            document.body.appendChild(box);

                            return {
                                found: true,
                                rect: { left, top, width, height, centerX, centerY, mode },
                                tag: candidate.tagName
                            };
                        }, { targetText, highlightId, padding, color, mode, size });

                        if (!found || found.found === false) {
                            result.success = false;
                            result.error = `highlightText: Element containing text "${targetText}" not found`;
                            break;
                        }

                        const screenshotPath = `/tmp/highlight-text-${Date.now()}.png`;
                        await page.screenshot({ path: screenshotPath });
                        result.path = screenshotPath;
                        result.message = `Highlighted text "${targetText}" and saved screenshot to ${screenshotPath}`;
                        result.highlight = found.rect;
                    } catch (e) {
                        result.success = false;
                        result.error = `highlightText failed: ${e.message}`;
                    } finally {
                        // Cleanup marker
                        try {
                            await page.evaluate(({ highlightId }) => {
                                const el = document.getElementById(highlightId);
                                if (el) el.remove();
                            }, { highlightId });
                        } catch (e) {
                            // ignore cleanup errors
                        }
                    }
                }
                break;

            case 'type':
                {
                    const selErr = validateCssSelectorValue(params.selector) || ensureString(params.text, 'text');
                    if (selErr) { result.success = false; result.error = `type: ${selErr}`; break; }
                    try {
                        await page.fill(params.selector.trim(), params.text);
                        result.message = `Typed text into ${params.selector.trim()}`;
                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to type into ${params.selector}: ${e.message}`;
                    }
                }
                break;

            case 'select':
                {
                    const selErr = validateCssSelectorValue(params.selector) || ensureString(params.value, 'value');
                    if (selErr) { result.success = false; result.error = `select: ${selErr}`; break; }
                    try {
                        await page.selectOption(params.selector.trim(), params.value);
                        result.message = `Selected option in ${params.selector.trim()}`;
                    } catch (e) {
                        result.success = false;
                        result.error = `Failed to select option in ${params.selector}: ${e.message}`;
                    }
                }
                break;

            case 'assert': {
                // Support two modes:
                // 1) selector + optional text (current behavior)
                // 2) text-only (no selector) → global page text search

                const hasSelector = typeof params.selector === 'string' && params.selector.trim().length > 0;
                const hasText = typeof params.text === 'string' && params.text.trim().length > 0;

                if (!hasSelector && !hasText) {
                    throw new Error('Assert requires either a non-empty CSS selector or a non-empty text parameter');
                }

                if (hasSelector) {
                    // Validate selector before assertion to avoid Playwright errors
                    if (params.selector.includes(':contains(')) {
                        throw new Error(`Invalid selector: "${params.selector}". The :contains() pseudo-selector is not supported. Use standard CSS selectors or assert by text using visionAnalyze when appropriate.`);
                    }
                    if (params.selector.includes(':has-text(')) {
                        throw new Error(`Invalid selector: "${params.selector}". The :has-text() pseudo-selector is not supported. Use standard CSS selectors and verify text via params.text if needed.`);
                    }

                    const visible = await page.isVisible(params.selector);
                    result.visible = visible;

                    if (hasText) {
                        if (!visible) {
                            result.error = `Element ${params.selector} is not visible`;
                            result.message = result.error;
                        } else {
                            const textContent = await page.textContent(params.selector);
                            const textMatches = textContent && textContent.includes(params.text);
                            if (!textMatches) {
                                result.error = `Element ${params.selector} does not contain text "${params.text}". Found: "${textContent}"`;
                                result.message = result.error;
                            } else {
                                result.message = `Element ${params.selector} contains text "${params.text}"`;
                            }
                        }
                    } else {
                        result.message = `Element ${params.selector} is ${visible ? 'visible' : 'not visible'}`;
                        if (!visible) {
                            result.error = result.message;
                        }
                    }
                } else if (hasText) {
                    // Global text-only assert: search the page for any element containing the text
                    const foundText = await page.evaluate((targetText) => {
                        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                        let node;
                        while ((node = walker.nextNode())) {
                            if (node.nodeValue && node.nodeValue.includes(targetText)) {
                                // Ensure the text node's parent element is visible
                                const el = node.parentElement;
                                if (!el) continue;
                                const style = window.getComputedStyle(el);
                                const isVisible = style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                                if (isVisible) return true;
                            }
                        }
                        return false;
                    }, params.text);

                    if (foundText) {
                        result.message = `Text "${params.text}" is visible on the page`;
                        result.visible = true;
                    } else {
                        result.error = `Text "${params.text}" not found or not visible on the page`;
                        result.message = result.error;
                        result.visible = false;
                    }
                }
                break;
            }

            case 'wait': {
                const timeoutRaw = (typeof params.timeout === 'number' && Number.isFinite(params.timeout)) ? params.timeout :
                                   (typeof params.milliseconds === 'number' && Number.isFinite(params.milliseconds)) ? params.milliseconds : 2000;
                const timeout = Math.max(0, Math.floor(timeoutRaw));
                try {
                    await page.waitForTimeout(timeout);
                    result.message = `Waited for ${timeout}ms`;
                } catch (e) {
                    result.success = false;
                    result.error = `Failed to wait: ${e.message}`;
                }
                break;
            }

            case 'screenshot': {
                const screenshotPath = `/tmp/screenshot-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath });
                result.path = screenshotPath;
                result.message = `Screenshot saved to ${screenshotPath}`;
                break;
            }

            case 'visionAnalyze': {
                try {
                    // Capture screenshot both as buffer (for vision API) and save to disk (for storage)
                    const screenshotPath = `/tmp/screenshot-${Date.now()}.png`;
                    const screenshotBuffer = await page.screenshot({ 
                        type: 'png',
                        path: screenshotPath  // Save to disk
                    });
                    const base64Image = screenshotBuffer.toString('base64');
                    
                    // Store the screenshot path for later retrieval
                    result.screenshotPath = screenshotPath;
                    
                    // Call OpenAI Vision API
                    const response = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `${params.question}\n\nAnalyze the screenshot carefully. \n\nFor position-based questions (e.g., "top right", "top left", "bottom", "center"):\n- If the element is found in the CORRECT position: Return {"found": true, "x": <number>, "y": <number>, "description": "<what you found and its position>"}\n- If the element is found but in the WRONG position: Return {"found": false, "description": "<element found but in wrong position - specify actual position vs expected position>"}\n- If the element is NOT found: Return {"found": false, "description": "<explain why it's not visible>"}\n\nFor non-position questions:\n- If you can find the element: Return {"found": true, "x": <number>, "y": <number>, "description": "<what you found>"}\n- If you CANNOT find the element: Return {"found": false, "description": "<explain why it's not visible>"}\n\nBe precise with coordinates (x,y are pixel positions from top-left corner). For position verification, be strict - if the question asks for "top right" but the element is in "top left", return found: false.`
                                    },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/png;base64,${base64Image}`
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 300
                    });
                    
                    const content = response.choices[0].message.content;
                    
                    // Try to parse JSON from response
                    try {
                        const jsonMatch = content.match(/\{[^}]+\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            
                            if (parsed.found === false) {
                                // Element not found or in wrong position - this should fail the test
                                result.success = false;
                                result.error = `Element not found: ${parsed.description || 'Not visible in screenshot'}`;
                                result.message = result.error;
                                result.found = false;
                                result.description = parsed.description;
                                result.path = screenshotPath;  // Include screenshot path in error
                            } else {
                                // Element found
                                result.x = parsed.x;
                                result.y = parsed.y;
                                result.found = true;
                                result.description = parsed.description || content;
                                result.message = `Vision analysis complete: ${result.description}`;
                                result.path = screenshotPath;  // Include screenshot path in success too
                            }
                        } else {
                            // Couldn't parse JSON, analyze text description for position mismatches
                            const lowerContent = content.toLowerCase();
                            
                            // Check if this is a position verification question
                            const isPositionQuestion = params.question && (
                                params.question.toLowerCase().includes('top right') ||
                                params.question.toLowerCase().includes('top left') ||
                                params.question.toLowerCase().includes('bottom') ||
                                params.question.toLowerCase().includes('center') ||
                                params.question.toLowerCase().includes('upper right') ||
                                params.question.toLowerCase().includes('lower left')
                            );
                            
                            if (isPositionQuestion) {
                                // Extract expected position from question
                                let expectedPosition = null;
                                if (params.question.toLowerCase().includes('top right')) expectedPosition = 'top right';
                                else if (params.question.toLowerCase().includes('top left')) expectedPosition = 'top left';
                                else if (params.question.toLowerCase().includes('bottom')) expectedPosition = 'bottom';
                                else if (params.question.toLowerCase().includes('center')) expectedPosition = 'center';
                                else if (params.question.toLowerCase().includes('upper right')) expectedPosition = 'upper right';
                                else if (params.question.toLowerCase().includes('lower left')) expectedPosition = 'lower left';
                                
                                // Check if description mentions a different position
                                if (expectedPosition) {
                                    // More comprehensive position mismatch detection
                                    const positionMismatch = (
                                        // Right vs Left mismatches
                                        (expectedPosition.includes('right') && (
                                            lowerContent.includes('left') && !lowerContent.includes('right') ||
                                            lowerContent.includes('not the top right') ||
                                            lowerContent.includes('not in the top right') ||
                                            lowerContent.includes('wrong position')
                                        )) ||
                                        (expectedPosition.includes('left') && (
                                            lowerContent.includes('right') && !lowerContent.includes('left') ||
                                            lowerContent.includes('not the top left') ||
                                            lowerContent.includes('not in the top left') ||
                                            lowerContent.includes('wrong position')
                                        )) ||
                                        // Top vs Bottom mismatches
                                        (expectedPosition.includes('top') && !expectedPosition.includes('bottom') && 
                                         lowerContent.includes('bottom') && !lowerContent.includes('top')) ||
                                        (expectedPosition.includes('bottom') && 
                                         lowerContent.includes('top') && !lowerContent.includes('bottom')) ||
                                        // Explicit mismatch indicators
                                        lowerContent.includes('wrong position') ||
                                        lowerContent.includes('not in the correct position') ||
                                        lowerContent.includes('not the correct position') ||
                                        // Pattern: "X is in Y, not Z" where Z is expected
                                        (expectedPosition.includes('right') && lowerContent.includes('not the top right')) ||
                                        (expectedPosition.includes('left') && lowerContent.includes('not the top left'))
                                    );
                                    
                                    if (positionMismatch) {
                                        // Position mismatch detected - fail the test
                                        result.success = false;
                                        result.error = `Position verification failed: ${content}`;
                                        result.message = result.error;
                                        result.found = false;
                                        result.description = content;
                                        result.path = screenshotPath;
                                    } else {
                                        // Position seems correct or not explicitly wrong
                                        result.analysis = content;
                                        result.message = `Vision analysis: ${content}`;
                                        result.path = screenshotPath;
                                    }
                                } else {
                                    // Position question but couldn't determine expected position
                                    result.analysis = content;
                                    result.message = `Vision analysis: ${content}`;
                                    result.path = screenshotPath;
                                }
                            } else {
                                // Not a position question, treat as analysis text
                                result.analysis = content;
                                result.message = `Vision analysis: ${content}`;
                                result.path = screenshotPath;
                            }
                        }
                    } catch (parseError) {
                        // If JSON parse fails, keep raw content
                        console.debug('Vision JSON parse error:', parseError && parseError.message);
                        result.analysis = content;
                        result.message = `Vision analysis: ${content}`;
                        result.path = screenshotPath;
                    }
                } catch (error) {
                    result.success = false;
                    result.error = `Vision analysis failed: ${error.message}`;
                    result.message = result.error;
                }
                break;
            }

            case 'getContent': {
                // Get cleaned HTML - remove scripts, styles, comments, hidden elements
                try {
                    const content = await page.evaluate(() => {
                        const clone = document.body.cloneNode(true);
                        
                        // Remove scripts, styles, noscript
                        clone.querySelectorAll('script, style, noscript, link[rel="stylesheet"]').forEach(el => el.remove());
                        
                        // Remove hidden elements
                        clone.querySelectorAll('[hidden], [style*="display: none"], [style*="display:none"]').forEach(el => el.remove());
                        
                        // Remove comments
                        const removeComments = (node) => {
                            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                                const child = node.childNodes[i];
                                if (child.nodeType === 8) { // Comment node
                                    node.removeChild(child);
                                } else if (child.nodeType === 1) { // Element node
                                    removeComments(child);
                                }
                            }
                        };
                        removeComments(clone);
                        
                        // Keep only essential attributes
                        clone.querySelectorAll('*').forEach(el => {
                            const keepAttrs = ['id', 'class', 'name', 'type', 'placeholder', 'value', 'href', 'src', 'alt', 'title', 'data-testid'];
                            const attrs = [...el.attributes];
                            attrs.forEach(attr => {
                                if (!keepAttrs.includes(attr.name)) {
                                    el.removeAttribute(attr.name);
                                }
                            });
                        });
                        
                        return clone.innerHTML;
                    });
                    result.content = content;
                    result.message = 'Retrieved cleaned page content';
                } catch (e) {
                    result.success = false;
                    result.error = `Failed to get content: ${e.message}`;
                }
                break;
            }

            case 'reset': {
                // Close existing context and create a fresh one
                console.log('Resetting browser context...');
                if (context) {
                    await context.close();
                }
                context = await browser.newContext();
                page = await context.newPage();
                result.message = 'Browser context reset - all cookies and session data cleared';
                break;
            }

            case 'dismissPopups': {
                // Best-effort closing of common popups/modals/cookie banners using CSS-only selectors
                const candidates = [
                    // Common close buttons
                    'button[aria-label="Close"]',
                    'button[aria-label="Dismiss"]',
                    'button[aria-label*="close" i]',
                    '.close', '.close-btn', '.close-button', '.btn-close', '.modal-close',
                    '[data-dismiss]', '[data-action="close"]', '[data-testid*="close" i]', '[data-test*="close" i]',
                    // Cookie banners/consent
                    '#onetrust-accept-btn-handler', '#onetrust-close-btn-container button', '.cookie-banner .close', '.cookie-consent-reject', '.cookie-consent-accept',
                    // Dialog regions
                    '[role="dialog"] .close', '[role="dialog"] button[aria-label*="close" i]'
                ];

                const clicked = [];
                try {
                    // Try ESC first (often dismisses modals)
                    await page.keyboard.press('Escape').catch(() => {});

                    for (const sel of candidates) {
                        try {
                            const locator = page.locator(sel);
                            const count = await locator.count();
                            for (let i = 0; i < Math.min(count, 3); i++) {
                                const nth = locator.nth(i);
                                if (await nth.isVisible().catch(() => false)) {
                                    await nth.click({ timeout: 500 }).catch(() => {});
                                    clicked.push(sel);
                                    await page.waitForTimeout(100);
                                }
                            }
                        } catch (e) {
                            // ignore individual selector errors
                            console.debug('dismissPopups selector error for', sel, e && e.message);
                        }
                    }
                    result.message = clicked.length > 0
                        ? `Dismissed ${clicked.length} popup element(s)`
                        : 'No popups detected to dismiss';
                    result.clickedSelectors = clicked;
                } catch (e) {
                    result.success = false;
                    result.error = `dismissPopups failed: ${e.message}`;
                }
                break;
            }

            default:
                result.success = false;
                result.error = `Unknown action: ${action}`;
        }

        res.json(result);

    } catch (error) {
        console.error('Error executing action:', error);
        // Avoid 500 for known client-side validation errors
        if (error && error.isClientError) {
            return res.status(error.status || 400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing browser...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing browser...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

// Never let the process die on unhandled errors; log them instead
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const PORT = process.env.PORT || 3000;

initBrowser().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Playwright MCP Server listening on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize browser:', err);
    process.exit(1);
});
