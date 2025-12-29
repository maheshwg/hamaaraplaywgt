package com.youraitester.agent;

import com.youraitester.agent.impl.SimpleMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Generic Agent Executor
 * Works with any LLM provider (OpenAI, Claude, etc.) and MCP tools
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentExecutor {
    
    private final Map<String, LlmProvider> providers;
    private final McpToolExecutor mcpToolExecutor;
    
    @Value("${agent.llm.provider:openai}")
    private String defaultProviderName;
    
    @Value("${agent.max.iterations:15}")
    private int maxIterations;

    /**
     * Conversation history truncation for the agent loop.
     * -1 disables truncation (keeps everything).
     * 0 keeps only system + original instruction (not recommended for tool use).
     * N keeps the last N assistant-led tool iterations.
     */
    @Value("${agent.conversation.history.keep:2}")
    private int conversationHistoryKeep;

    /**
     * Enable high-signal trace logs of the agent's reasoning/actions:
     * - LLM response text + tool calls before MCP execution
     * - Tool results after MCP execution
     *
     * Keep this OFF in production unless debugging: it can log sensitive info.
     */
    @Value("${agent.trace.logging.enabled:false}")
    private boolean traceLoggingEnabled;

    /**
     * Max chars to log for any LLM/tool text snippet in trace mode.
     */
    @Value("${agent.trace.logging.max.chars:2000}")
    private int traceLoggingMaxChars;

    /**
     * Max chars to pass back to the LLM for snapshot/accessibility-tree tool results.
     * Needs to be high enough to include relevant elements/refs, but bounded to avoid token blowups.
     */
    @Value("${agent.tool.snapshot.max.chars:8000}")
    private int maxSnapshotChars;

    /**
     * Escalated snapshot limit used only when the agent is stuck (NEED_SNAPSHOT with no progress).
     * Default 30000 is enough for many pages while staying below very large token spikes.
     */
    @Value("${agent.tool.snapshot.max.chars.escalated:30000}")
    private int maxSnapshotCharsEscalated;

    /**
     * Max chars to pass back to the LLM for non-snapshot tool results.
     */
    @Value("${agent.tool.response.max.chars:4000}")
    private int maxToolResponseChars;

    /**
     * Special marker used by session-mode execution when snapshot tool is disabled.
     * The LLM must respond with this exact string if it needs a new snapshot to proceed.
     */
    private static final String NEED_SNAPSHOT_MARKER = "NEED_SNAPSHOT";
    private static final String STEP_PROMPT_PREFIX = "Execute ONLY this step now:";
    private static final String BATCH_PROMPT_PREFIX = "BATCH_EXECUTE_STEPS:";
    private static final String EXECUTED_STEPS_MARKER = "EXECUTED_STEP_NUMBERS:";
    private static final String STEP_TAG_ARG = "_step";
    private static final String BATCH_STEP_RESULT_PREFIX = "STEP";
    
    @Value("${agent.system.prompt.file:agent-system-prompt.txt}")
    private String systemPromptFile;
    
    @Value("${agent.prompt.categories.file:agent-prompt-categories.json}")
    private String promptCategoriesFile;
    
    @Value("${agent.prompt.dynamic:true}")
    private boolean useDynamicPrompt;
    
    private String cachedSystemPrompt = null;
    private Map<String, PromptCategory> cachedCategories = null;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Prompt category structure
     */
    private static class PromptCategory {
        public String description;
        public List<String> keywords;
        public String content;
    }
    
    /**
     * Load prompt categories from JSON file
     */
    private Map<String, PromptCategory> loadPromptCategories() {
        if (cachedCategories != null) {
            return cachedCategories;
        }
        
        try {
            Path categoriesPath = Paths.get(promptCategoriesFile);
            if (!categoriesPath.isAbsolute()) {
                categoriesPath = Paths.get(System.getProperty("user.dir"), promptCategoriesFile);
            }
            
            if (Files.exists(categoriesPath)) {
                log.info("Loading prompt categories from: {}", categoriesPath);
                String json = Files.readString(categoriesPath);
                JsonNode root = objectMapper.readTree(json);
                
                Map<String, PromptCategory> categories = new HashMap<>();
                root.fields().forEachRemaining(entry -> {
                    try {
                        PromptCategory category = new PromptCategory();
                        JsonNode node = entry.getValue();
                        category.description = node.get("description").asText();
                        category.content = node.get("content").asText();
                        
                        // Keywords are optional
                        category.keywords = new ArrayList<>();
                        if (node.has("keywords")) {
                            node.get("keywords").forEach(kw -> category.keywords.add(kw.asText().toLowerCase()));
                        }
                        
                        categories.put(entry.getKey(), category);
                    } catch (Exception e) {
                        log.warn("Failed to parse category {}: {}", entry.getKey(), e.getMessage());
                    }
                });
                
                cachedCategories = categories;
                log.info("Loaded {} prompt categories", categories.size());
                return categories;
            } else {
                log.warn("Prompt categories file not found: {}", categoriesPath);
                return Collections.emptyMap();
            }
        } catch (IOException e) {
            log.error("Failed to load prompt categories: {}", e.getMessage(), e);
            return Collections.emptyMap();
        }
    }
    
    /**
     * Build dynamic system prompt based on instruction keywords and app URL
     */
    private String buildDynamicPrompt(String instruction, String appUrl, String appType) {
        if (!useDynamicPrompt) {
            return loadSystemPrompt();
        }
        
        try {
            Path categoriesPath = Paths.get(promptCategoriesFile);
            if (!categoriesPath.isAbsolute()) {
                categoriesPath = Paths.get(System.getProperty("user.dir"), promptCategoriesFile);
            }
            
            if (!Files.exists(categoriesPath)) {
                log.warn("Prompt categories file not found: {}", categoriesPath);
                return loadSystemPrompt();
            }
            
            log.info("Loading prompt categories from: {}", categoriesPath);
            String json = Files.readString(categoriesPath);
            JsonNode root = objectMapper.readTree(json);
            
            String instructionLower = instruction.toLowerCase();
            Set<String> instructionTokens = Arrays.stream(instructionLower.split("[^a-z0-9]+"))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());

            // Generic intent gating to avoid including action-specific guidance for pure verification steps.
            // This is NOT hardcoded selectors; it's only deciding which prompt sections are relevant.
            boolean isVerificationIntent = isVerificationInstruction(instructionLower);
            boolean isDateSelectionIntent = isDateSelectionInstruction(instructionLower, instructionTokens);
            StringBuilder prompt = new StringBuilder();
            Set<String> includedCategories = new HashSet<>();
            
            // Track what we're including for better logging
            List<String> loadedPaths = new ArrayList<>();
            
            // Always include core
            if (root.has("core")) {
                JsonNode coreNode = root.get("core");
                if (coreNode.has("content")) {
                    prompt.append(coreNode.get("content").asText()).append("\n\n");
                    includedCategories.add("core");
                    loadedPaths.add("root.core");
                }
            }
            
            // Load app-specific categories if appUrl is provided
            Map<String, PromptCategory> appCategories = new HashMap<>();
            if (appUrl != null && !appUrl.isEmpty() && root.has("apps")) {
                JsonNode appsNode = root.get("apps");
                if (appsNode.has(appUrl)) {
                    JsonNode appNode = appsNode.get(appUrl);
                    appNode.fields().forEachRemaining(entry -> {
                        try {
                            PromptCategory category = new PromptCategory();
                            JsonNode catNode = entry.getValue();
                            category.description = catNode.has("description") ? catNode.get("description").asText() : "";
                            category.content = catNode.has("content") ? catNode.get("content").asText() : "";
                            category.keywords = new ArrayList<>();
                            if (catNode.has("keywords")) {
                                catNode.get("keywords").forEach(kw -> category.keywords.add(kw.asText().toLowerCase()));
                            }
                            appCategories.put(entry.getKey(), category);
                        } catch (Exception e) {
                            log.warn("Failed to parse app-specific category {}: {}", entry.getKey(), e.getMessage());
                        }
                    });
                    log.info("Loaded {} app-specific categories for URL: {}", appCategories.size(), appUrl);
                } else {
                    log.warn("No app-specific categories found for URL: {}", appUrl);
                }
            }
            
            // Match categories based on keywords in instruction
            for (Map.Entry<String, PromptCategory> entry : appCategories.entrySet()) {
                String categoryName = entry.getKey();
                PromptCategory category = entry.getValue();
                
                if (includedCategories.contains(categoryName)) {
                    continue;
                }
                
                // Check if any keyword matches the instruction
                boolean matched = false;
                if (category.keywords != null) {
                    for (String keyword : category.keywords) {
                        // If this is a verification-only instruction, do not inject action categories unless
                        // the instruction clearly implies that action (e.g., selecting a date).
                        if (isVerificationIntent && "date_input".equals(categoryName) && !isDateSelectionIntent) {
                            continue;
                        }
                        if (keywordMatchesInstruction(instructionLower, instructionTokens, keyword)) {
                            prompt.append(category.content).append("\n\n");
                            includedCategories.add(categoryName);
                            String jsonPath = "root.apps[\"" + appUrl + "\"]." + categoryName;
                            loadedPaths.add(jsonPath + " (keyword: " + keyword + ")");
                            log.debug("Including app-specific category '{}' (matched keyword: '{}')", categoryName, keyword);
                            matched = true;
                            break;
                        }
                    }
                }
            }
            
            // Load app-type specific categories if appType is provided
            if (appType != null && !appType.isEmpty() && root.has("app_types")) {
                JsonNode appTypesNode = root.get("app_types");
                if (appTypesNode.has(appType)) {
                    JsonNode appTypeNode = appTypesNode.get(appType);
                    if (appTypeNode.has("content")) {
                        prompt.append(appTypeNode.get("content").asText()).append("\n\n");
                        includedCategories.add("app_type:" + appType);
                        String jsonPath = "root.app_types." + appType;
                        loadedPaths.add(jsonPath);
                        log.debug("Including app-type category: {}", appType);
                    }
                }
            }
            
            // Log what was included with full JSON paths
            log.info("Built dynamic prompt with categories: {}", includedCategories);
            log.info("Loaded prompt sections from JSON paths:");
            for (String path : loadedPaths) {
                log.info("  → {}", path);
            }
            
            return prompt.toString();
            
        } catch (IOException e) {
            log.error("Failed to build dynamic prompt: {}", e.getMessage(), e);
            return loadSystemPrompt();
        }
    }

    private boolean keywordMatchesInstruction(String instructionLower, Set<String> instructionTokens, String keywordLower) {
        if (keywordLower == null || keywordLower.isBlank()) return false;
        String kw = keywordLower.toLowerCase(Locale.ROOT).trim();
        // Multi-word phrases: fallback to substring match
        if (kw.contains(" ")) {
            return instructionLower.contains(kw);
        }
        // Single token: match whole tokens to avoid "date" matching "datepicker"
        return instructionTokens.contains(kw);
    }

    private boolean isVerificationInstruction(String instructionLower) {
        if (instructionLower == null) return false;
        String s = instructionLower.trim();
        // Generic verification verbs/phrases
        return s.startsWith("verify")
            || s.startsWith("check")
            || s.startsWith("assert")
            || s.startsWith("confirm")
            || s.startsWith("ensure")
            || s.startsWith("validate")
            || s.startsWith("make sure");
    }

    private boolean isDateSelectionInstruction(String instructionLower, Set<String> tokens) {
        if (instructionLower == null) return false;

        // If it's explicitly an action to select/pick/choose/set a date, treat as date selection.
        boolean hasActionVerb =
            instructionLower.contains("select ")
                || instructionLower.contains("pick ")
                || instructionLower.contains("choose ")
                || instructionLower.contains("set ")
                || instructionLower.contains("enter ");

        // Date-like indicators (generic, not app-specific)
        boolean hasDateWord = tokens.contains("date") || instructionLower.contains("calendar");
        boolean hasMonthName = instructionLower.matches(".*\\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\\b.*");
        boolean hasNumericDate = instructionLower.matches(".*\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b.*")
            || instructionLower.matches(".*\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b.*")
            || instructionLower.matches(".*\\b\\d{1,2}-\\d{1,2}-\\d{2,4}\\b.*");

        return hasActionVerb && (hasDateWord || hasMonthName || hasNumericDate);
    }


    /**
     * Load system prompt from file. Caches the result to avoid repeated file reads.
     */
    private String loadSystemPrompt() {
        if (cachedSystemPrompt != null) {
            return cachedSystemPrompt;
        }
        
        try {
            // Try to load from the file specified in config
            Path promptPath = Paths.get(systemPromptFile);
            if (!promptPath.isAbsolute()) {
                // If relative path, look in current directory (where jar is run from)
                promptPath = Paths.get(System.getProperty("user.dir"), systemPromptFile);
            }
            
            if (Files.exists(promptPath)) {
                log.info("Loading agent system prompt from file: {}", promptPath);
                cachedSystemPrompt = Files.readString(promptPath);
                log.info("System prompt loaded successfully ({} characters)", cachedSystemPrompt.length());
                return cachedSystemPrompt;
            } else {
                log.warn("System prompt file not found: {}. Using default prompt.", promptPath);
                return getDefaultSystemPrompt();
            }
        } catch (IOException e) {
            log.error("Failed to load system prompt from file: {}. Using default prompt.", systemPromptFile, e);
            return getDefaultSystemPrompt();
        }
    }
    
    /**
     * Get default system prompt if file is not available
     */
    private String getDefaultSystemPrompt() {
        return "You are an autonomous web automation agent with access to Playwright MCP tools. " +
               "Always call getContent() first to analyze the page structure before performing any actions. " +
               "Use standard CSS selectors only - no :contains(), :has-text(), or XPath. " +
               "Break down complex tasks into sub-steps and verify completion.";
    }
    
    /**
     * Execute an instruction using the agent
     * The agent will use the configured LLM and MCP tools to complete the task
     */
    public AgentExecutionResult execute(String instruction, String pageContext) {
        return execute(instruction, pageContext, new HashMap<>(), null, null);
    }
    
    /**
     * Execute an instruction using the agent with variables
     * The agent will use the configured LLM and MCP tools to complete the task
     * Variables can be substituted in instructions and extracted from results
     */
    public AgentExecutionResult execute(String instruction, String pageContext, Map<String, Object> variables) {
        return execute(instruction, pageContext, variables, null, null);
    }
    
    /**
     * Execute an instruction using the agent with variables and app context
     * The agent will use the configured LLM and MCP tools to complete the task
     * Variables can be substituted in instructions and extracted from results
     * App URL and type are used to load app-specific prompt categories
     */
    public AgentExecutionResult execute(String instruction, String pageContext, Map<String, Object> variables, String appUrl, String appType) {
        log.info("Agent executing instruction: {}", instruction);
        if (!variables.isEmpty()) {
            log.debug("Agent has {} variables available: {}", variables.size(), variables.keySet());
        }
        if (appUrl != null) {
            log.debug("Agent context - App URL: {}, App Type: {}", appUrl, appType);
        }
        
        // Get the configured provider
        LlmProvider provider = getProvider(defaultProviderName);
        if (!provider.isAvailable()) {
            return AgentExecutionResult.error("LLM provider " + defaultProviderName + " is not available");
        }
        
        // Get available MCP tools
        List<LlmProvider.Tool> tools = mcpToolExecutor.getAvailableTools();
        log.debug("Agent has {} MCP tools available", tools.size());
        
        // Substitute variables in instruction
        String substitutedInstruction = substituteVariables(instruction, variables);
        if (!substitutedInstruction.equals(instruction)) {
            log.debug("Instruction after variable substitution: {}", substitutedInstruction);
        }
        
        // Build conversation
        List<LlmProvider.Message> messages = new ArrayList<>();
        
        // Build system prompt dynamically based on instruction, appUrl, and appType
        String systemPrompt = buildDynamicPrompt(substitutedInstruction, appUrl, appType);
        messages.add(SimpleMessage.system(systemPrompt));
        
        // Add page context if available
        if (pageContext != null && !pageContext.isEmpty()) {
            messages.add(SimpleMessage.system("Current page context: " + pageContext));
        }
        
        // Add variables context if available
        if (!variables.isEmpty()) {
            StringBuilder varsContext = new StringBuilder("Available variables for substitution:\n");
            for (Map.Entry<String, Object> entry : variables.entrySet()) {
                varsContext.append("- ").append(entry.getKey()).append(" = ").append(entry.getValue()).append("\n");
            }
            messages.add(SimpleMessage.system(varsContext.toString()));
        }
        
        // User instruction (with variables already substituted)
        messages.add(SimpleMessage.user(substitutedInstruction));
        
        // Execute with loop for tool calls
        int iteration = 0;
        List<ToolExecutionLog> executionLog = new ArrayList<>();
        
        // IMPORTANT: Do not hardcode the provider iteration budget.
        // Many tasks (especially date selection) require multiple tool/LLM cycles.
        String substitutedLower = substitutedInstruction == null ? "" : substitutedInstruction.toLowerCase(Locale.ROOT);
        Set<String> substitutedTokens = Arrays.stream(substitutedLower.split("[^a-z0-9]+"))
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());

        int effectiveMaxIterations = maxIterations;
        // Ensure date selection has enough cycles to open popup + navigate + pick.
        if (isDateSelectionInstruction(substitutedLower, substitutedTokens)) {
            effectiveMaxIterations = Math.max(effectiveMaxIterations, 6);
        }
        // Verification-only usually needs at least 2 cycles (getContent -> analyze).
        if (isVerificationInstruction(substitutedLower)) {
            effectiveMaxIterations = Math.max(effectiveMaxIterations, 2);
        }

        while (iteration < effectiveMaxIterations) {
            iteration++;
            log.debug("Agent iteration {}/{} (configured={}, effective={})", iteration, effectiveMaxIterations, maxIterations, effectiveMaxIterations);
            
            // Call LLM with tools
            LlmProvider.AgentResponse response = provider.executeWithTools(messages, tools, effectiveMaxIterations);

            if (traceLoggingEnabled) {
                String assistantText = response.getContent() != null ? response.getContent() : "";
                log.info("[AGENT_TRACE] Iteration {}/{} - LLM says:\n{}",
                    iteration, effectiveMaxIterations, truncateForLog(assistantText));

                if (response.getToolCalls() != null && !response.getToolCalls().isEmpty()) {
                    String toolCallsSummary = response.getToolCalls().stream()
                        .map(tc -> {
                            String args;
                            try {
                                args = objectMapper.writeValueAsString(tc.getArguments());
                            } catch (Exception e) {
                                args = String.valueOf(tc.getArguments());
                            }
                            return tc.getName() + "(" + truncateForLog(args) + ")";
                        })
                        .collect(java.util.stream.Collectors.joining(", "));
                    log.info("[AGENT_TRACE] Iteration {}/{} - LLM requested tool calls: {}",
                        iteration, effectiveMaxIterations, toolCallsSummary);
                }
            }
            
            // Check if task is complete
            if (response.isComplete()) {
                log.info("Agent task complete after {} iterations", iteration);
                log.info("Agent final message: {}", response.getContent());
                
                // Fallback: if no screenshot was captured during execution, capture one now
                boolean hasScreenshot = executionLog.stream().anyMatch(log -> log.getScreenshotUrl() != null && !log.getScreenshotUrl().isEmpty());
                if (!hasScreenshot) {
                    log.info(">>> No screenshot captured during step execution, capturing fallback screenshot");
                    try {
                        Map<String, Object> screenshotArgs = new HashMap<>();
                        screenshotArgs.put("fullPage", true);
                        McpToolExecutor.ToolExecutionResult screenshotResult = 
                            mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                        
                        if (screenshotResult.isSuccess()) {
                            String screenshotPath = extractScreenshotPath(screenshotResult);
                            if (screenshotPath != null) {
                                log.info(">>> ✓ Fallback screenshot captured: {}", screenshotPath);
                                // Add a special log entry for the fallback screenshot
                                executionLog.add(new ToolExecutionLog(
                                    "fallback_screenshot",
                                    Map.of(),
                                    "Fallback screenshot captured",
                                    screenshotPath
                                ));
                            }
                        }
                    } catch (Exception e) {
                        log.warn(">>> Failed to capture fallback screenshot: {}", e.getMessage());
                    }
                }
                
                Map<String, Object> extractedVars = extractVariablesFromResponse(response.getContent());
                return AgentExecutionResult.success(response.getContent(), executionLog, extractedVars);
            }
            
            // Execute tool calls
            if (!response.getToolCalls().isEmpty()) {
                // First, add the assistant's response with tool calls to the conversation
                // This is required for providers like Claude that need tool_use blocks before tool_result blocks
                messages.add(SimpleMessage.builder()
                    .role("assistant")
                    .content(response.getContent() != null ? response.getContent() : "")
                    .toolCalls(response.getToolCalls())
                    .build());
                
                for (LlmProvider.ToolCall toolCall : response.getToolCalls()) {
                    log.info("Agent calling tool: {}", toolCall.getName());
                    
                    // Execute via MCP - returns ToolExecutionResult
                    McpToolExecutor.ToolExecutionResult toolResult = mcpToolExecutor.executeTool(
                        toolCall.getName(),
                        toolCall.getArguments()
                    );

                    if (traceLoggingEnabled) {
                        String msg = toolResult != null ? toolResult.getMessage() : null;
                        String content = toolResult != null ? toolResult.getContent() : null;
                        int contentLen = content != null ? content.length() : 0;
                        log.info("[AGENT_TRACE] Tool result: tool={}, success={}, message={}, contentChars={}",
                            toolCall.getName(),
                            toolResult != null && toolResult.isSuccess(),
                            truncateForLog(msg),
                            contentLen);
                        // Log a short content snippet only if it's not too large and is useful (e.g., snapshot).
                        if (content != null && !content.isBlank()) {
                            log.debug("[AGENT_TRACE] Tool content snippet (tool={}):\n{}",
                                toolCall.getName(), truncateForLog(content));
                        }
                    }
                    
                    // Automatically capture screenshot after page-changing actions
                    String screenshotPath = null;
                    log.debug(">>> Screenshot check: tool={}, success={}, shouldCapture={}", 
                        toolCall.getName(), toolResult.isSuccess(), shouldCaptureScreenshot(toolCall.getName()));
                    
                    if (toolResult.isSuccess() && shouldCaptureScreenshot(toolCall.getName())) {
                        try {
                            log.info(">>> AUTO-CAPTURING SCREENSHOT after: {}", toolCall.getName());
                            Map<String, Object> screenshotArgs = new HashMap<>();
                            screenshotArgs.put("fullPage", true);
                            McpToolExecutor.ToolExecutionResult screenshotResult = 
                                mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                            
                            log.info(">>> Screenshot result: success={}, path={}, message={}", 
                                screenshotResult.isSuccess(), 
                                screenshotResult.getPath(),
                                screenshotResult.getMessage());
                            
                            if (screenshotResult.isSuccess()) {
                                // Extract screenshot path from result
                                screenshotPath = extractScreenshotPath(screenshotResult);
                                log.info(">>> Extracted screenshot URL: {}", screenshotPath);
                                if (screenshotPath != null) {
                                    log.info("✓ Screenshot captured and processed: {}", screenshotPath);
                                } else {
                                    log.warn("✗ Screenshot path extraction returned null");
                                }
                            } else {
                                log.warn("✗ Screenshot capture failed: {}", screenshotResult.getMessage());
                            }
                        } catch (Exception e) {
                            log.error("✗ Exception capturing screenshot after {}: {}", toolCall.getName(), e.getMessage(), e);
                        }
                    }
                    
                    // Log execution
                    ToolExecutionLog logEntry = new ToolExecutionLog(
                        toolCall.getName(),
                        toolCall.getArguments(),
                        toolResult.getMessage(),
                        screenshotPath
                    );
                    executionLog.add(logEntry);
                    
                    // Log tool errors but don't stop - let Claude handle it
                    if (!toolResult.isSuccess()) {
                        log.warn("Tool returned error: {} - {}", toolCall.getName(), toolResult.getMessage());
                        // Continue to add error message as tool result below, Claude will handle recovery
                    }
                    
                    // Add tool result to conversation (including errors)
                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("function_name", toolCall.getName());
                    
                    // Check if this is a snapshot tool (for special handling)
                    boolean isBrowserSnapshot =
                        "snapshot".equalsIgnoreCase(toolCall.getName())
                            || "browser_snapshot".equalsIgnoreCase(toolCall.getName());
                    
                    // Prefer non-empty content, otherwise fall back to message (some tools don't return 'content')
                    String toolContent = toolResult.getContent();
                    if (toolContent == null || toolContent.isBlank()) {
                        toolContent = toolResult.getMessage();
                    }
                    if (toolContent != null) {
                        int originalLen = toolContent.length();
                        
                        // NOTE: We always send the FULL snapshot (no deduplication) because Claude needs
                        // the complete page structure to know what elements exist and how to interact with them.
                        // The token savings come from removing OLD snapshots from history (see below).
                        if (isBrowserSnapshot) {
                            log.info(">>> Sending full snapshot ({} chars) - Claude needs complete page structure", originalLen);
                        }
                        
                        int limit = isBrowserSnapshot ? maxSnapshotChars : maxToolResponseChars;
                        if (toolContent.length() > limit) {
                            toolContent = toolContent.substring(0, limit) +
                                "\n\n[Content truncated - original length: " + originalLen + " chars]";
                            log.info("Truncated tool response (tool={}) from {} chars to {} chars",
                                toolCall.getName(), originalLen, toolContent.length());
                        }
                    }
                    
                    // BEFORE adding new snapshot tool result, remove old snapshot tool results
                    // This prevents accumulating multiple 26K snapshots in history
                    if (isBrowserSnapshot) {
                        int removed = removeOldSnapshotExchanges(messages);
                        log.info(">>> Removed {} old snapshot exchange message(s) from conversation history", removed);
                    }
                    
                    messages.add(SimpleMessage.builder()
                        .role("tool")
                        .content(toolContent)
                        .toolCallId(toolCall.getId())
                        .metadata(metadata)
                        .build());
                }
                
                // Truncate history to control token usage (tool-use safe).
                pruneConversationHistory(messages);
                
            } else {
                // No tool calls but not complete - shouldn't happen
                log.warn("Agent returned no tool calls and not complete");
                
                // Fallback screenshot
                boolean hasScreenshot = executionLog.stream().anyMatch(log -> log.getScreenshotUrl() != null && !log.getScreenshotUrl().isEmpty());
                if (!hasScreenshot) {
                    log.info(">>> No screenshot captured, attempting fallback");
                    try {
                        Map<String, Object> screenshotArgs = new HashMap<>();
                        screenshotArgs.put("fullPage", true);
                        McpToolExecutor.ToolExecutionResult screenshotResult = 
                            mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                        if (screenshotResult.isSuccess()) {
                            String screenshotPath = extractScreenshotPath(screenshotResult);
                            if (screenshotPath != null) {
                                executionLog.add(new ToolExecutionLog("fallback_screenshot", Map.of(), "Fallback screenshot", screenshotPath));
                            }
                        }
                    } catch (Exception e) {
                        log.warn(">>> Failed to capture fallback screenshot: {}", e.getMessage());
                    }
                }
                
                Map<String, Object> extractedVars = extractVariablesFromResponse(response.getContent());
                return AgentExecutionResult.success(response.getContent(), executionLog, extractedVars);
            }
        }
        
        // Max iterations reached
        log.warn("Agent reached max iterations ({})", maxIterations);
        
        // Fallback screenshot before returning error
        boolean hasScreenshot = executionLog.stream().anyMatch(log -> log.getScreenshotUrl() != null && !log.getScreenshotUrl().isEmpty());
        if (!hasScreenshot) {
            log.info(">>> No screenshot captured before max iterations, attempting fallback");
            try {
                Map<String, Object> screenshotArgs = new HashMap<>();
                screenshotArgs.put("fullPage", true);
                McpToolExecutor.ToolExecutionResult screenshotResult = 
                    mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                if (screenshotResult.isSuccess()) {
                    String screenshotPath = extractScreenshotPath(screenshotResult);
                    if (screenshotPath != null) {
                        executionLog.add(new ToolExecutionLog("fallback_screenshot", Map.of(), "Fallback screenshot", screenshotPath));
                    }
                }
            } catch (Exception e) {
                log.warn(">>> Failed to capture fallback screenshot: {}", e.getMessage());
            }
        }
        
        return AgentExecutionResult.error("Maximum iterations reached", executionLog);
    }

    /**
     * Create a per-test agent session that keeps conversation history (including the latest snapshot)
     * across multiple step executions.
     *
     * The first user message in the session should contain the full test plan so Claude truncation
     * always retains it as the "original instruction".
     */
    public AgentSession startTestSession(String fullTestPlan, String pageContext, Map<String, Object> variables, String appUrl, String appType) {
        // Get the configured provider
        LlmProvider provider = getProvider(defaultProviderName);
        if (!provider.isAvailable()) {
            throw new IllegalStateException("LLM provider " + defaultProviderName + " is not available");
        }

        // Get available MCP tools (full set)
        List<LlmProvider.Tool> tools = mcpToolExecutor.getAvailableTools();

        // Build system prompt dynamically based on the full plan (so the model sees overall intent)
        String systemPrompt = buildDynamicPrompt(fullTestPlan != null ? fullTestPlan : "", appUrl, appType);

        List<LlmProvider.Message> messages = new ArrayList<>();
        messages.add(SimpleMessage.system(systemPrompt));

        if (pageContext != null && !pageContext.isEmpty()) {
            messages.add(SimpleMessage.system("Current page context: " + pageContext));
        }

        if (variables != null && !variables.isEmpty()) {
            StringBuilder varsContext = new StringBuilder("Available variables for substitution:\n");
            for (Map.Entry<String, Object> entry : variables.entrySet()) {
                varsContext.append("- ").append(entry.getKey()).append(" = ").append(entry.getValue()).append("\n");
            }
            messages.add(SimpleMessage.system(varsContext.toString()));
        }

        // IMPORTANT: this MUST be the first user message so ClaudeProvider truncation keeps it.
        messages.add(SimpleMessage.user(fullTestPlan != null ? fullTestPlan : ""));

        return new AgentSession(provider, tools, messages, appUrl, appType);
    }

    /**
     * Per-test, in-memory agent session used to execute multiple steps while reusing conversation state.
     */
    public class AgentSession {
        private final LlmProvider provider;
        private final List<LlmProvider.Tool> toolsAll;
        private final List<LlmProvider.Message> messages;
        private final String appUrl;
        private final String appType;

        private AgentSession(LlmProvider provider,
                             List<LlmProvider.Tool> toolsAll,
                             List<LlmProvider.Message> messages,
                             String appUrl,
                             String appType) {
            this.provider = provider;
            this.toolsAll = toolsAll;
            this.messages = messages;
            this.appUrl = appUrl;
            this.appType = appType;
        }

        public List<LlmProvider.Message> getMessages() {
            return messages;
        }

        /**
         * Execute as many steps as possible from the provided ordered list WITHOUT taking a new snapshot.
         * This does a SINGLE Claude call (no post-tool confirmation call) to save tokens.
         *
         * If the model needs a new snapshot to proceed, it should include NEED_SNAPSHOT in its text output.
         * It must also include a line: "EXECUTED_STEP_NUMBERS: <comma-separated step numbers>" listing the
         * steps it executed in this batch (may be empty).
         */
        public BatchResult executeBatch(List<com.youraitester.model.TestStep> orderedSteps,
                                        Map<String, Object> variables) {
            // Prevent token growth: keep only the most recent batch prompt.
            messages.removeIf(m ->
                "user".equals(m.getRole())
                    && m.getContent() != null
                    && m.getContent().startsWith(BATCH_PROMPT_PREFIX)
            );

            StringBuilder msg = new StringBuilder();
            msg.append(BATCH_PROMPT_PREFIX).append("\n");
            msg.append("Using the MOST RECENT snapshot already in this conversation, execute as many of the following steps as you can, IN ORDER, WITHOUT calling snapshot.\n");
            msg.append("Stop BEFORE the first step you cannot do from the current snapshot.\n");
            msg.append("Rules:\n");
            msg.append("- Do NOT call snapshot in this batch.\n");
            msg.append("- If a step can be done, emit the necessary tool calls.\n");
            msg.append("- IMPORTANT: For EVERY tool call you emit, include an extra argument ").append(STEP_TAG_ARG).append(" with the CURRENT step number. Example: {ref: e74, text: 'abc', ").append(STEP_TAG_ARG).append(": 2}. This argument is for bookkeeping and will NOT be sent to Playwright.\n");
            msg.append("- IMPORTANT: At the END of EACH step you execute (including pure verification/no-op steps), you MUST call browser_take_screenshot with args {fullPage: true, ").append(STEP_TAG_ARG).append(": <stepNumber>}.\n");
            msg.append("- IMPORTANT: For EACH step you execute, include an explicit result line in your text output:\n");
            msg.append("  - \"Step <n>: PASS - <short reason>\" OR \"Step <n>: FAIL - <short reason>\".\n");
            msg.append("  - If a step FAILs, STOP the batch immediately after taking that step's screenshot.\n");
            msg.append("- IMPORTANT: For ACTION steps (click/type/select/etc):\n");
            msg.append("  - If the required control is NOT present in the current snapshot and you cannot perform the action, mark the step as FAIL (do not claim it is done).\n");
            msg.append("  - Example for \"Add to cart\": if you cannot find an \"Add to cart\" button for the item (even if a \"Remove\" button is visible), mark the step as FAIL.\n");
            msg.append("- If you cannot proceed because you need new page info, include the line ").append(NEED_SNAPSHOT_MARKER).append(".\n");
            msg.append("- Always include a line at the end: ").append(EXECUTED_STEPS_MARKER).append(" <comma-separated step numbers you executed in this batch>\n\n");
            msg.append("Steps (numbered):\n");

            for (com.youraitester.model.TestStep s : orderedSteps) {
                Integer n = s.getOrder();
                String inst = substituteVariables(s.getInstruction(), variables != null ? variables : Map.of());
                // IMPORTANT: keep step numbers EXACTLY as stored (may start at 0). This must remain stable across batches.
                msg.append(n != null ? n : "?").append(". ").append(inst).append("\n");
            }

            // Explicit marker log so it's easy to confirm batch-mode is active even if request transcript logging is truncated.
            log.info("Sending batch prompt: {}", BATCH_PROMPT_PREFIX);
            messages.add(SimpleMessage.user(msg.toString()));

            // Tools: everything except snapshot
            List<LlmProvider.Tool> toolsNoSnapshot = toolsAll.stream()
                .filter(t -> !"snapshot".equalsIgnoreCase(t.getName()))
                .collect(Collectors.toList());

            AgentExecutionResult oneTurn = runSingleTurnTools(provider, toolsNoSnapshot, messages, variables != null ? variables : Map.of());

            String assistantText = oneTurn.getMessage() != null ? oneTurn.getMessage() : "";
            boolean needsSnapshot = containsNeedSnapshotMarker(assistantText);
            List<Integer> executed = parseExecutedStepNumbers(assistantText);
            Map<Integer, StepOutcome> outcomes = parseStepOutcomes(assistantText);

            // If the model indicates a hard failure on the first step in this batch (e.g., Add-to-cart missing/replaced),
            // convert it into an explicit failure so the runner stops instead of retrying with NEED_SNAPSHOT.
            try {
                Integer firstStepNum = orderedSteps != null && !orderedSteps.isEmpty() ? orderedSteps.get(0).getOrder() : null;
                if (firstStepNum != null) {
                    StepOutcome hardFail = detectHardFailureInStep(assistantText, firstStepNum);
                    if (hardFail != null) {
                        Map<Integer, StepOutcome> next = new HashMap<>(outcomes != null ? outcomes : Map.of());
                        next.put(firstStepNum, hardFail);
                        outcomes = next;
                        needsSnapshot = false;
                        if (executed == null || executed.isEmpty()) {
                            executed = List.of(firstStepNum);
                        }
                    }
                }
            } catch (Exception ignored) {}

            // If model forgot EXECUTED_STEP_NUMBERS but produced explicit pass/fail outcomes, treat those as executed.
            if ((executed == null || executed.isEmpty()) && outcomes != null && !outcomes.isEmpty()) {
                executed = outcomes.keySet().stream().sorted().collect(Collectors.toList());
            }

            // Ensure every executed step has a unique screenshot URL.
            // Preferred: the model calls browser_take_screenshot after each step (still no extra LLM calls).
            // Fallback: if it forgot, we take a screenshot here (MCP-only) to avoid missing images.
            Map<Integer, String> stepShots = new LinkedHashMap<>();
            if (oneTurn.getStepScreenshotUrls() != null) {
                stepShots.putAll(oneTurn.getStepScreenshotUrls());
            }

            // Enforce "no skipping": keep only the consecutive prefix of executed steps starting from the first step
            // in orderedSteps. This prevents us from persisting step 7/8/9 when step 5/6 wasn't executed.
            try {
                if (orderedSteps != null && !orderedSteps.isEmpty() && executed != null && !executed.isEmpty()) {
                    List<Integer> allowed = orderedSteps.stream()
                        .map(com.youraitester.model.TestStep::getOrder)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                    if (!allowed.isEmpty()) {
                        Set<Integer> executedSet = new HashSet<>(executed);
                        List<Integer> prefix = new ArrayList<>();
                        for (Integer n : allowed) {
                            if (n == null) continue;
                            if (executedSet.contains(n)) {
                                prefix.add(n);
                                // If this step is explicitly failed, stop after it.
                                StepOutcome o = outcomes != null ? outcomes.get(n) : null;
                                if (o != null && "failed".equalsIgnoreCase(o.getStatus())) break;
                                continue;
                            }
                            break;
                        }
                        executed = prefix;
                    }
                }
            } catch (Exception ignored) {}

            if (executed != null) {
                for (Integer n : executed) {
                    if (n == null) continue;
                    if (!stepShots.containsKey(n) || stepShots.get(n) == null || stepShots.get(n).isBlank()) {
                        try {
                            Map<String, Object> screenshotArgs = new HashMap<>();
                            screenshotArgs.put("fullPage", true);
                            McpToolExecutor.ToolExecutionResult screenshotResult =
                                mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                            if (screenshotResult != null && screenshotResult.isSuccess()) {
                                String p = extractScreenshotPath(screenshotResult);
                                if (p != null) stepShots.put(n, p);
                            }
                        } catch (Exception e) {
                            log.warn("Failed to capture per-step screenshot for step {}: {}", n, e.getMessage());
                        }
                    }
                }
            }

            // Best-effort: if model forgot marker but it did run tools, assume it executed at least the first step.
            if ((executed == null || executed.isEmpty()) && oneTurn.getExecutionLog() != null && !oneTurn.getExecutionLog().isEmpty()) {
                Integer first = orderedSteps != null && !orderedSteps.isEmpty() ? orderedSteps.get(0).getOrder() : null;
                if (first != null) executed = List.of(first);
            }

            // Only keep screenshots/outcomes for executed steps (avoid later-step screenshots causing persistence confusion)
            Map<Integer, String> stepShotsExecutedOnly = new LinkedHashMap<>();
            Map<Integer, StepOutcome> outcomesExecutedOnly = new HashMap<>();
            if (executed != null) {
                for (Integer n : executed) {
                    if (n == null) continue;
                    if (stepShots.containsKey(n)) stepShotsExecutedOnly.put(n, stepShots.get(n));
                    if (outcomes != null && outcomes.containsKey(n)) outcomesExecutedOnly.put(n, outcomes.get(n));
                }
            }

            return new BatchResult(oneTurn,
                executed != null ? executed : List.of(),
                needsSnapshot,
                outcomesExecutedOnly,
                stepShotsExecutedOnly
            );
        }

        /**
         * Inject a fresh snapshot into the conversation WITHOUT calling the LLM.
         * This saves tokens when we only need updated page structure.
         */
        public void injectFreshSnapshot() {
            injectFreshSnapshotWithLimit(maxSnapshotChars);
        }

        /**
         * Inject a fresh snapshot with an explicit truncation limit.
         * Use Integer.MAX_VALUE to effectively disable truncation for this snapshot.
         */
        public void injectFreshSnapshotWithLimit(int snapshotCharLimit) {
            LlmProvider.ToolCall fakeToolCall = new com.youraitester.agent.impl.SimpleToolCall(
                "local_snapshot_" + UUID.randomUUID(),
                "snapshot",
                Map.of()
            );

            // Add assistant tool_use
            messages.add(SimpleMessage.builder()
                .role("assistant")
                .content("Taking a fresh snapshot.")
                .toolCalls(List.of(fakeToolCall))
                .build());

            // Execute snapshot via MCP
            McpToolExecutor.ToolExecutionResult toolResult = mcpToolExecutor.executeTool("snapshot", Map.of());

            String toolContent = toolResult.getContent();
            if (toolContent == null || toolContent.isBlank()) {
                toolContent = toolResult.getMessage();
            }
            int effectiveLimit = snapshotCharLimit > 0 ? snapshotCharLimit : maxSnapshotChars;
            if (toolContent != null && toolContent.length() > effectiveLimit) {
                int originalLen = toolContent.length();
                toolContent = toolContent.substring(0, effectiveLimit) +
                    "\n\n[Content truncated - original length: " + originalLen + " chars]";
            }

            // Remove prior snapshot exchanges then add tool_result
            int removed = removeOldSnapshotExchanges(messages);
            log.info(">>> Removed {} old snapshot exchange message(s) from conversation history", removed);

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("function_name", "snapshot");
            messages.add(SimpleMessage.builder()
                .role("tool")
                .content(toolContent)
                .toolCallId(fakeToolCall.getId())
                .metadata(metadata)
                .build());

            pruneConversationHistory(messages);
        }

        /**
         * MCP-only: attempt to reveal more page content (scroll) before injecting a fresh snapshot.
         * This helps when the snapshot is truncated and the target content is below the fold.
         *
         * @param attempt 1=just snapshot, 2=PageDown then snapshot, 3=End then snapshot
         */
        public void revealMoreAndInjectSnapshot(int attempt) {
            int limit = (attempt >= 2) ? maxSnapshotCharsEscalated : maxSnapshotChars;
            revealMoreAndInjectSnapshot(attempt, limit);
        }

        public void revealMoreAndInjectSnapshot(int attempt, int snapshotCharLimit) {
            try {
                if (attempt == 2) {
                    // Scroll down a few pages to bring lower content into the accessible snapshot
                    Map<String, Object> args = new HashMap<>();
                    args.put("key", "PageDown");
                    for (int i = 0; i < 5; i++) {
                        mcpToolExecutor.executeTool("browser_press_key", args);
                    }
                    // tiny wait to allow layout to settle
                    mcpToolExecutor.executeTool("browser_wait_for", Map.of("time", 0.2));
                    log.info("MCP-only: pressed PageDown x5 before snapshot");
                } else if (attempt == 3) {
                    // Jump near bottom
                    mcpToolExecutor.executeTool("browser_press_key", Map.of("key", "End"));
                    mcpToolExecutor.executeTool("browser_wait_for", Map.of("time", 0.2));
                    log.info("MCP-only: pressed End before snapshot");
                }
            } catch (Exception e) {
                log.warn("MCP-only scroll attempt {} failed: {}", attempt, e.getMessage());
            }

            injectFreshSnapshotWithLimit(snapshotCharLimit);
        }

        /**
         * Execute a single step within this session.
         *
         * Option (a) support:
         * - If allowSnapshot=false, we REMOVE the snapshot tool from the tool list and instruct the model to
         *   respond with NEED_SNAPSHOT if it cannot proceed with the latest snapshot already in history.
         * - If the return message is NEED_SNAPSHOT, the caller should fetch a new snapshot and retry.
         */
        public AgentExecutionResult executeStep(String stepInstruction,
                                               String pageContext,
                                               Map<String, Object> variables,
                                               boolean allowSnapshot) {
            String substitutedInstruction = substituteVariables(stepInstruction, variables != null ? variables : Map.of());

            // Prevent token growth: keep only the most recent "Execute ONLY this step now" prompt.
            // These are plain user messages and safe to remove, since they are not tool_result blocks.
            messages.removeIf(m ->
                "user".equals(m.getRole())
                    && m.getContent() != null
                    && m.getContent().startsWith(STEP_PROMPT_PREFIX)
            );

            // Add current step instruction as a user message
            StringBuilder stepMsg = new StringBuilder();
            stepMsg.append(STEP_PROMPT_PREFIX).append("\n");
            stepMsg.append(substitutedInstruction).append("\n\n");
            stepMsg.append("Rules:\n");
            stepMsg.append("- Do NOT redo earlier steps.\n");
            stepMsg.append("- Do NOT execute any later steps.\n");
            stepMsg.append("- Stop immediately after completing this step.\n");
            stepMsg.append("- Use the most recent snapshot in conversation history if available.\n");
            stepMsg.append("- Reuse refs from that snapshot; do not call snapshot at the start of every step.\n");
            if (!allowSnapshot) {
                stepMsg.append("- You cannot call snapshot in this attempt. If you need a new snapshot to proceed, reply with EXACTLY: ")
                    .append(NEED_SNAPSHOT_MARKER)
                    .append("\n");
            } else {
                stepMsg.append("- You MAY call snapshot ONLY if you cannot find what you need in the most recent snapshot.\n");
            }

            messages.add(SimpleMessage.user(stepMsg.toString()));

            // Choose tools for this attempt
            List<LlmProvider.Tool> toolsToUse = toolsAll;
            if (!allowSnapshot) {
                toolsToUse = toolsAll.stream()
                    .filter(t -> !"snapshot".equalsIgnoreCase(t.getName()))
                    .collect(Collectors.toList());
            }

            // Run agent loop (reuses the session message history)
            AgentExecutionResult stepResult = runAgentLoop(
                provider,
                toolsToUse,
                messages,
                substitutedInstruction,
                pageContext,
                variables != null ? variables : Map.of()
            );

            // If the model signals it needs a snapshot, surface that to the caller.
            if (!allowSnapshot && stepResult != null) {
                String msg = stepResult.getMessage() != null ? stepResult.getMessage() : "";
                if (containsNeedSnapshotMarker(msg)) {
                    return AgentExecutionResult.error(NEED_SNAPSHOT_MARKER, stepResult.getExecutionLog());
                }
            }

            return stepResult;
        }
    }

    /**
     * Core agent loop extracted so it can be reused by both one-off execute() and session mode.
     * NOTE: This method mutates the provided 'messages' list (adds assistant/tool messages).
     */
    private AgentExecutionResult runAgentLoop(LlmProvider provider,
                                              List<LlmProvider.Tool> tools,
                                              List<LlmProvider.Message> messages,
                                              String substitutedInstruction,
                                              String pageContext,
                                              Map<String, Object> variables) {
        int iteration = 0;
        List<ToolExecutionLog> executionLog = new ArrayList<>();

        String substitutedLower = substitutedInstruction == null ? "" : substitutedInstruction.toLowerCase(Locale.ROOT);
        Set<String> substitutedTokens = Arrays.stream(substitutedLower.split("[^a-z0-9]+"))
            .filter(s -> !s.isBlank())
            .collect(Collectors.toSet());

        int effectiveMaxIterations = maxIterations;
        if (isDateSelectionInstruction(substitutedLower, substitutedTokens)) {
            effectiveMaxIterations = Math.max(effectiveMaxIterations, 6);
        }
        if (isVerificationInstruction(substitutedLower)) {
            effectiveMaxIterations = Math.max(effectiveMaxIterations, 2);
        }

        while (iteration < effectiveMaxIterations) {
            iteration++;

            LlmProvider.AgentResponse response = provider.executeWithTools(messages, tools, effectiveMaxIterations);

            if (traceLoggingEnabled) {
                String assistantText = response.getContent() != null ? response.getContent() : "";
                log.info("[AGENT_TRACE] Iteration {}/{} - LLM says:\n{}",
                    iteration, effectiveMaxIterations, truncateForLog(assistantText));

                if (response.getToolCalls() != null && !response.getToolCalls().isEmpty()) {
                    String toolCallsSummary = response.getToolCalls().stream()
                        .map(tc -> {
                            String args;
                            try {
                                args = objectMapper.writeValueAsString(tc.getArguments());
                            } catch (Exception e) {
                                args = String.valueOf(tc.getArguments());
                            }
                            return tc.getName() + "(" + truncateForLog(args) + ")";
                        })
                        .collect(java.util.stream.Collectors.joining(", "));
                    log.info("[AGENT_TRACE] Iteration {}/{} - LLM requested tool calls: {}",
                        iteration, effectiveMaxIterations, toolCallsSummary);
                }
            }

            if (response.isComplete()) {
                // Special case: session-mode "need snapshot" marker
                String content = response.getContent() != null ? response.getContent() : "";
                if (containsNeedSnapshotMarker(content)) {
                    return AgentExecutionResult.error(NEED_SNAPSHOT_MARKER, executionLog);
                }

                Map<String, Object> extractedVars = extractVariablesFromResponse(response.getContent());
                return AgentExecutionResult.success(response.getContent(), executionLog, extractedVars);
            }

            if (!response.getToolCalls().isEmpty()) {
                // Add assistant tool_use message
                messages.add(SimpleMessage.builder()
                    .role("assistant")
                    .content(response.getContent() != null ? response.getContent() : "")
                    .toolCalls(response.getToolCalls())
                    .build());

                for (LlmProvider.ToolCall toolCall : response.getToolCalls()) {
                    log.info("Agent calling tool: {}", toolCall.getName());

                    McpToolExecutor.ToolExecutionResult toolResult = mcpToolExecutor.executeTool(
                        toolCall.getName(),
                        toolCall.getArguments()
                    );

                    if (traceLoggingEnabled) {
                        String msg = toolResult != null ? toolResult.getMessage() : null;
                        String content = toolResult != null ? toolResult.getContent() : null;
                        int contentLen = content != null ? content.length() : 0;
                        log.info("[AGENT_TRACE] Tool result: tool={}, success={}, message={}, contentChars={}",
                            toolCall.getName(),
                            toolResult != null && toolResult.isSuccess(),
                            truncateForLog(msg),
                            contentLen);
                    }

                    // Automatically capture screenshot after page-changing actions
                    String screenshotPath = null;
                    if (toolResult.isSuccess() && shouldCaptureScreenshot(toolCall.getName())) {
                        try {
                            log.info(">>> AUTO-CAPTURING SCREENSHOT after: {}", toolCall.getName());
                            Map<String, Object> screenshotArgs = new HashMap<>();
                            screenshotArgs.put("fullPage", true);
                            McpToolExecutor.ToolExecutionResult screenshotResult =
                                mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                            if (screenshotResult.isSuccess()) {
                                screenshotPath = extractScreenshotPath(screenshotResult);
                                if (screenshotPath != null) {
                                    log.info("✓ Screenshot captured and processed: {}", screenshotPath);
                                }
                            }
                        } catch (Exception e) {
                            log.error("✗ Exception capturing screenshot after {}: {}", toolCall.getName(), e.getMessage(), e);
                        }
                    }

                    executionLog.add(new ToolExecutionLog(
                        toolCall.getName(),
                        toolCall.getArguments(),
                        toolResult.getMessage(),
                        screenshotPath
                    ));

                    // Add tool result to conversation
                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("function_name", toolCall.getName());

                    boolean isBrowserSnapshot =
                        "snapshot".equalsIgnoreCase(toolCall.getName())
                            || "browser_snapshot".equalsIgnoreCase(toolCall.getName());

                    String toolContent = toolResult.getContent();
                    if (toolContent == null || toolContent.isBlank()) {
                        toolContent = toolResult.getMessage();
                    }
                    if (toolContent != null) {
                        int originalLen = toolContent.length();
                        int limit = isBrowserSnapshot ? maxSnapshotChars : maxToolResponseChars;
                        if (toolContent.length() > limit) {
                            toolContent = toolContent.substring(0, limit) +
                                "\n\n[Content truncated - original length: " + originalLen + " chars]";
                            log.info("Truncated tool response (tool={}) from {} chars to {} chars",
                                toolCall.getName(), originalLen, toolContent.length());
                        }
                    }

                    if (isBrowserSnapshot) {
                        int removed = removeOldSnapshotExchanges(messages);
                        log.info(">>> Removed {} old snapshot exchange message(s) from conversation history", removed);
                    }

                    messages.add(SimpleMessage.builder()
                        .role("tool")
                        .content(toolContent)
                        .toolCallId(toolCall.getId())
                        .metadata(metadata)
                        .build());

                    // Truncate history to control token usage (tool-use safe)
                    pruneConversationHistory(messages);
                }
            }
        }

        return AgentExecutionResult.error("Maximum iterations reached", executionLog);
    }

    /**
     * Single-turn execution: call the LLM once, execute any returned tool calls, then RETURN WITHOUT
     * re-calling the LLM for a confirmation message. This is the key token-saving batch primitive.
     */
    private AgentExecutionResult runSingleTurnTools(LlmProvider provider,
                                                    List<LlmProvider.Tool> tools,
                                                    List<LlmProvider.Message> messages,
                                                    Map<String, Object> variables) {
        List<ToolExecutionLog> executionLog = new ArrayList<>();
        Map<Integer, String> stepScreenshotUrls = new LinkedHashMap<>();

        LlmProvider.AgentResponse response = provider.executeWithTools(messages, tools, maxIterations);

        if (traceLoggingEnabled) {
            String assistantText = response.getContent() != null ? response.getContent() : "";
            log.info("[AGENT_TRACE] SingleTurn - LLM says:\n{}", truncateForLog(assistantText));
            if (response.getToolCalls() != null && !response.getToolCalls().isEmpty()) {
                String toolCallsSummary = response.getToolCalls().stream()
                    .map(tc -> tc.getName() + "(" + truncateForLog(String.valueOf(tc.getArguments())) + ")")
                    .collect(java.util.stream.Collectors.joining(", "));
                log.info("[AGENT_TRACE] SingleTurn - LLM requested tool calls: {}", toolCallsSummary);
            }
        }

        // Always record assistant message (even if complete) so conversation stays coherent
        messages.add(SimpleMessage.builder()
            .role("assistant")
            .content(response.getContent() != null ? response.getContent() : "")
            .toolCalls(response.getToolCalls())
            .build());

        if (response.getToolCalls() == null || response.getToolCalls().isEmpty()) {
            // No tool calls; return whatever it said
            return response.isComplete()
                ? AgentExecutionResult.success(response.getContent(), executionLog, extractVariablesFromResponse(response.getContent()))
                : AgentExecutionResult.error(response.getContent() != null ? response.getContent() : "No tool calls", executionLog);
        }

        // Batch mode enhancement: if the model tags tool calls with _step, we can attach screenshots per step without
        // extra LLM calls. Preferred is that the model explicitly calls browser_take_screenshot at the end of each step.
        // We still keep a boundary-based fallback for step-tagged tool streams that don't include screenshots.
        List<LlmProvider.ToolCall> toolCalls = response.getToolCalls();
        boolean hasStepTags = toolCalls.stream().anyMatch(tc -> tc.getArguments() != null && tc.getArguments().containsKey(STEP_TAG_ARG));

        for (int i = 0; i < toolCalls.size(); i++) {
            LlmProvider.ToolCall toolCall = toolCalls.get(i);
            Integer stepTag = null;
            if (toolCall.getArguments() != null) {
                Object raw = toolCall.getArguments().get(STEP_TAG_ARG);
                if (raw != null) {
                    try {
                        stepTag = Integer.parseInt(String.valueOf(raw).trim());
                    } catch (Exception ignored) {}
                }
            }

            log.info("Agent calling tool: {}{}", toolCall.getName(), stepTag != null ? (" (step=" + stepTag + ")") : "");

            Map<String, Object> argsForMcp = toolCall.getArguments() != null ? new HashMap<>(toolCall.getArguments()) : new HashMap<>();
            argsForMcp.remove(STEP_TAG_ARG); // never send bookkeeping arg to Playwright MCP
            if ("browser_take_screenshot".equalsIgnoreCase(toolCall.getName())) {
                // Make screenshot calls resilient even if the model forgets fullPage
                argsForMcp.putIfAbsent("fullPage", true);
            }

            McpToolExecutor.ToolExecutionResult toolResult = mcpToolExecutor.executeTool(toolCall.getName(), argsForMcp);

            // Screenshot auto-capture for page-changing actions
            String screenshotPath = null;
            if (!hasStepTags && toolResult.isSuccess() && shouldCaptureScreenshot(toolCall.getName())) {
                try {
                    Map<String, Object> screenshotArgs = new HashMap<>();
                    screenshotArgs.put("fullPage", true);
                    McpToolExecutor.ToolExecutionResult screenshotResult =
                        mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                    if (screenshotResult.isSuccess()) {
                        screenshotPath = extractScreenshotPath(screenshotResult);
                    }
                } catch (Exception e) {
                    log.warn("Failed to auto-capture screenshot after {}: {}", toolCall.getName(), e.getMessage());
                }
            }

            // If the model explicitly took a screenshot, attach it to the step immediately.
            if (hasStepTags && stepTag != null && "browser_take_screenshot".equalsIgnoreCase(toolCall.getName())) {
                try {
                    String p = extractScreenshotPath(toolResult);
                    if (p != null) {
                        stepScreenshotUrls.put(stepTag, p);
                    }
                } catch (Exception ignored) {}
            }

            executionLog.add(new ToolExecutionLog(toolCall.getName(), argsForMcp, toolResult.getMessage(), screenshotPath));

            // Add tool result message
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("function_name", toolCall.getName());

            boolean isBrowserSnapshot =
                "snapshot".equalsIgnoreCase(toolCall.getName())
                    || "browser_snapshot".equalsIgnoreCase(toolCall.getName());

            String toolContent = toolResult.getContent();
            if (toolContent == null || toolContent.isBlank()) {
                toolContent = toolResult.getMessage();
            }
            if (toolContent != null) {
                int originalLen = toolContent.length();
                int limit = isBrowserSnapshot ? maxSnapshotChars : maxToolResponseChars;
                if (toolContent.length() > limit) {
                    toolContent = toolContent.substring(0, limit) +
                        "\n\n[Content truncated - original length: " + originalLen + " chars]";
                }
            }

            if (isBrowserSnapshot) {
                int removed = removeOldSnapshotExchanges(messages);
                log.info(">>> Removed {} old snapshot exchange message(s) from conversation history", removed);
            }

            messages.add(SimpleMessage.builder()
                .role("tool")
                .content(toolContent)
                .toolCallId(toolCall.getId())
                .metadata(metadata)
                .build());

            pruneConversationHistory(messages);

            // Fallback: If step-tagged and the model did NOT explicitly call browser_take_screenshot for this step,
            // capture ONE screenshot at step boundary (after the last tool for that step).
            if (hasStepTags && stepTag != null) {
                Integer nextStepTag = null;
                if (i + 1 < toolCalls.size()) {
                    Map<String, Object> nextArgs = toolCalls.get(i + 1).getArguments();
                    if (nextArgs != null && nextArgs.containsKey(STEP_TAG_ARG)) {
                        try {
                            nextStepTag = Integer.parseInt(String.valueOf(nextArgs.get(STEP_TAG_ARG)).trim());
                        } catch (Exception ignored) {}
                    }
                }
                boolean isBoundary = (nextStepTag == null) || !nextStepTag.equals(stepTag);
                if (isBoundary) {
                    // If the current tool is itself a screenshot, we already captured it above.
                    if ("browser_take_screenshot".equalsIgnoreCase(toolCall.getName())) {
                        continue;
                    }
                    if (stepScreenshotUrls.containsKey(stepTag) && stepScreenshotUrls.get(stepTag) != null && !stepScreenshotUrls.get(stepTag).isBlank()) {
                        continue;
                    }
                    try {
                        Map<String, Object> screenshotArgs = new HashMap<>();
                        screenshotArgs.put("fullPage", true);
                        McpToolExecutor.ToolExecutionResult screenshotResult =
                            mcpToolExecutor.executeTool("browser_take_screenshot", screenshotArgs);
                        if (screenshotResult != null && screenshotResult.isSuccess()) {
                            String p = extractScreenshotPath(screenshotResult);
                            if (p != null) {
                                // Always overwrite to keep "post-step" screenshot if the step had multiple tools
                                stepScreenshotUrls.put(stepTag, p);
                                executionLog.add(new ToolExecutionLog("step_screenshot", Map.of(STEP_TAG_ARG, stepTag), "Per-step screenshot", p));
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Failed to capture per-step screenshot at boundary for step {}: {}", stepTag, e.getMessage());
                    }
                }
            }
        }

        // Return the assistant text from this single turn (it should include EXECUTED_STEP_NUMBERS / NEED_SNAPSHOT markers)
        return AgentExecutionResult.success(
            response.getContent(),
            executionLog,
            extractVariablesFromResponse(response.getContent()),
            stepScreenshotUrls
        );
    }

    public static class BatchResult {
        private final AgentExecutionResult agentResult;
        private final List<Integer> executedStepNumbers;
        private final boolean needsSnapshot;
        private final Map<Integer, StepOutcome> stepOutcomes;
        private final Map<Integer, String> stepScreenshotUrls;

        public BatchResult(AgentExecutionResult agentResult,
                           List<Integer> executedStepNumbers,
                           boolean needsSnapshot,
                           Map<Integer, StepOutcome> stepOutcomes,
                           Map<Integer, String> stepScreenshotUrls) {
            this.agentResult = agentResult;
            this.executedStepNumbers = executedStepNumbers != null ? executedStepNumbers : List.of();
            this.needsSnapshot = needsSnapshot;
            this.stepOutcomes = stepOutcomes != null ? stepOutcomes : Map.of();
            this.stepScreenshotUrls = stepScreenshotUrls != null ? stepScreenshotUrls : Map.of();
        }

        public AgentExecutionResult getAgentResult() { return agentResult; }
        public List<Integer> getExecutedStepNumbers() { return executedStepNumbers; }
        public boolean isNeedsSnapshot() { return needsSnapshot; }
        public Map<Integer, StepOutcome> getStepOutcomes() { return stepOutcomes; }
        public Map<Integer, String> getStepScreenshotUrls() { return stepScreenshotUrls; }
    }

    public static class StepOutcome {
        private final String status; // passed|failed
        private final String message; // optional

        public StepOutcome(String status, String message) {
            this.status = status;
            this.message = message;
        }
        public String getStatus() { return status; }
        public String getMessage() { return message; }
    }

    /**
     * Best-effort parsing of pass/fail outcomes from the assistant text.
     * We currently support common formats like:
     * - "Step 8: ✗ FAIL - ..."
     * - "Step 7: ✓ PASS - ..."
     * - "Step 8: ... FAIL ..."
     */
    private Map<Integer, StepOutcome> parseStepOutcomes(String assistantText) {
        if (assistantText == null || assistantText.isBlank()) return Map.of();
        Map<Integer, StepOutcome> out = new HashMap<>();

        // Regex: Step <num>: ... (PASS|FAIL) ... optional "- message"
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(
            "(?im)^\\s*step\\s+(\\d+)\\s*:\\s*(?:[✓✔✗×]\\s*)?(pass|fail)\\b(?:\\s*[-–—:]\\s*(.*))?$"
        );
        java.util.regex.Matcher m = p.matcher(assistantText);
        while (m.find()) {
            try {
                int n = Integer.parseInt(m.group(1));
                String statusWord = m.group(2) != null ? m.group(2).toLowerCase(Locale.ROOT) : "";
                String status = "pass".equals(statusWord) ? "passed" : ("fail".equals(statusWord) ? "failed" : null);
                if (status == null) continue;
                String msg = m.group(3) != null ? m.group(3).trim() : null;
                if (msg != null && msg.isBlank()) msg = null;
                out.put(n, new StepOutcome(status, msg));
            } catch (Exception ignored) {}
        }

        // Some model outputs use "Verification Results:" and bullet lines.
        // Try to catch "Step <n>: ✓ PASS - ..." within the whole text (not only line-start matches above).
        java.util.regex.Pattern p2 = java.util.regex.Pattern.compile(
            "(?i)step\\s+(\\d+)\\s*:\\s*(?:[✓✔]\\s*)?\\bpass\\b(?:\\s*[-–—:]\\s*([^\\n\\r]+))?"
        );
        java.util.regex.Matcher m2 = p2.matcher(assistantText);
        while (m2.find()) {
            try {
                int n = Integer.parseInt(m2.group(1));
                String msg = m2.group(2) != null ? m2.group(2).trim() : null;
                if (msg != null && msg.isBlank()) msg = null;
                out.putIfAbsent(n, new StepOutcome("passed", msg));
            } catch (Exception ignored) {}
        }
        java.util.regex.Pattern p3 = java.util.regex.Pattern.compile(
            "(?i)step\\s+(\\d+)\\s*:\\s*(?:[✗×]\\s*)?\\bfail\\b(?:\\s*[-–—:]\\s*([^\\n\\r]+))?"
        );
        java.util.regex.Matcher m3 = p3.matcher(assistantText);
        while (m3.find()) {
            try {
                int n = Integer.parseInt(m3.group(1));
                String msg = m3.group(2) != null ? m3.group(2).trim() : null;
                if (msg != null && msg.isBlank()) msg = null;
                out.put(n, new StepOutcome("failed", msg));
            } catch (Exception ignored) {}
        }

        // Fallback: parse "step blocks" like:
        // "**Step 8 (...):** ...\n... This verification FAILS ✗"
        // This is much more robust than relying on "Step 8: FAIL" exact formatting.
        try {
            java.util.regex.Pattern stepHeader = java.util.regex.Pattern.compile("(?i)\\bstep\\s+(\\d+)\\b");
            String[] lines = assistantText.split("\\R");
            Integer currentStep = null;
            StringBuilder block = new StringBuilder();

            java.util.function.BiConsumer<Integer, String> finalizeBlock = (stepNum, blockText) -> {
                if (stepNum == null || blockText == null) return;
                String bt = blockText.toLowerCase(Locale.ROOT);
                // Decide status using strong signals
                boolean hasFail = bt.contains(" fails") || bt.contains(" fail") || bt.contains("failed") || bt.contains("✗") || bt.contains("×");
                boolean hasPass = bt.contains(" passes") || bt.contains(" pass") || bt.contains("passed") || bt.contains("✓") || bt.contains("✔");

                if (hasFail) {
                    // Extract a short failure message line if possible
                    String msg = null;
                    for (String ln : blockText.split("\\R")) {
                        String l = ln.trim();
                        if (l.isEmpty()) continue;
                        String ll = l.toLowerCase(Locale.ROOT);
                        if (ll.contains("fail")) { msg = l; break; }
                        if (l.contains("✗") || l.contains("×")) { msg = l; break; }
                        if (ll.contains("not ")) { msg = l; }
                    }
                    out.put(stepNum, new StepOutcome("failed", msg));
                    return;
                }
                if (hasPass) {
                    out.putIfAbsent(stepNum, new StepOutcome("passed", null));
                }
            };

            for (String line : lines) {
                java.util.regex.Matcher hm = stepHeader.matcher(line);
                if (hm.find()) {
                    Integer newStep = null;
                    try { newStep = Integer.parseInt(hm.group(1)); } catch (Exception ignored) {}
                    if (newStep != null) {
                        // If this line looks like a step header (contains "Step N" and a ":"), treat as boundary.
                        boolean isBoundary = line.contains(":");
                        if (isBoundary) {
                            finalizeBlock.accept(currentStep, block.toString());
                            currentStep = newStep;
                            block.setLength(0);
                        }
                    }
                }
                if (currentStep != null) {
                    block.append(line).append("\n");
                }
            }
            finalizeBlock.accept(currentStep, block.toString());
        } catch (Exception ignored) {}

        return out;
    }

    /**
     * Detect "hard failures" where the model indicates a step cannot be executed due to current state
     * (e.g., required control not present / replaced), even if it didn't emit "Step N: FAIL".
     *
     * IMPORTANT: We must not treat normal "need snapshot" cases as failures (e.g., missing info due to truncation).
     */
    private StepOutcome detectHardFailureInStep(String assistantText, Integer stepNumber) {
        if (assistantText == null || assistantText.isBlank() || stepNumber == null) return null;
        String t = assistantText.toLowerCase(Locale.ROOT);
        if (!t.contains("step " + stepNumber)) return null;

        boolean mentionsStop = t.contains("must stop") || t.contains("stop here");
        boolean mentionsCannotExecute = t.contains("cannot execute") || t.contains("can't execute") || t.contains("cannot click") || t.contains("can't click");

        // Add-to-cart specific: "Remove instead of Add to cart" / "button doesn't exist"
        boolean addToCartContext = t.contains("add to cart") || t.contains("add-to-cart");
        boolean removeInstead = t.contains("remove") && addToCartContext;
        boolean buttonMissing = t.contains("button doesn't exist") || t.contains("button does not exist") || t.contains("no \"add") || t.contains("no add to cart");

        // Avoid misclassifying "need snapshot" due to visibility/truncation
        boolean looksLikeInfoGap = t.contains("truncated") || t.contains("need a snapshot") || t.contains("need snapshot") || t.contains("cannot see") || t.contains("can't see");

        if ((mentionsStop || mentionsCannotExecute) && addToCartContext && (removeInstead || buttonMissing) && !looksLikeInfoGap) {
            return new StepOutcome("failed", "Required control not available: Add to cart is missing/replaced by Remove");
        }
        return null;
    }

    private List<Integer> parseExecutedStepNumbers(String assistantText) {
        if (assistantText == null) return List.of();
        for (String line : assistantText.split("\\R")) {
            String t = line.trim();
            if (t.toUpperCase(Locale.ROOT).startsWith(EXECUTED_STEPS_MARKER)) {
                String rest = t.substring(EXECUTED_STEPS_MARKER.length()).trim();
                if (rest.isEmpty()) return List.of();
                String[] parts = rest.split("[,\\s]+");
                List<Integer> out = new ArrayList<>();
                for (String p : parts) {
                    try {
                        if (!p.isBlank()) out.add(Integer.parseInt(p.trim()));
                    } catch (Exception ignored) {}
                }
                return out;
            }
        }
        return List.of();
    }

    /**
     * Detect the NEED_SNAPSHOT marker even if the model adds extra text.
     * We accept it if it appears as its own line or the entire trimmed message equals it.
     */
    private boolean containsNeedSnapshotMarker(String msg) {
        if (msg == null) return false;
        String trimmed = msg.trim();
        if (NEED_SNAPSHOT_MARKER.equalsIgnoreCase(trimmed)) return true;
        for (String line : trimmed.split("\\R")) {
            if (NEED_SNAPSHOT_MARKER.equalsIgnoreCase(line.trim())) {
                return true;
            }
        }
        return false;
    }

    private String truncateForLog(String s) {
        if (s == null) return "null";
        int limit = Math.max(200, traceLoggingMaxChars);
        if (s.length() <= limit) return s;
        return s.substring(0, limit) + "\n...[truncated, original chars=" + s.length() + "]";
    }
    
    private LlmProvider getProvider(String name) {
        LlmProvider provider = providers.get(name);
        if (provider == null) {
            throw new IllegalArgumentException("Unknown LLM provider: " + name);
        }
        return provider;
    }
    
    /**
     * Prune conversation history to keep only recent messages
     * Keeps system messages and last N conversation messages to avoid token limit
     */
    /**
     * Determine if we should automatically capture a screenshot after this tool
     */
    private boolean shouldCaptureScreenshot(String toolName) {
        return "browser_navigate".equals(toolName) ||
               "browser_click".equals(toolName) ||
               "browser_type".equals(toolName) ||
               "browser_select_option".equals(toolName) ||
               "browser_press_key".equals(toolName);
    }
    
    /**
     * Extract screenshot path from screenshot tool result and convert to URL
     */
    private String extractScreenshotPath(McpToolExecutor.ToolExecutionResult result) {
        // log.info(">>> extractScreenshotPath: result={}, path={}", result != null, result != null ? result.getPath() : "null");
        
        if (result == null) {
            log.warn(">>> Screenshot result is null");
            return null;
        }
        
        if (result.getPath() == null) {
            log.warn(">>> Screenshot path is null. Full result: success={}, message={}, content={}", 
                result.isSuccess(), result.getMessage(), result.getContent());
            return null;
        }
        
        try {
            String filePath = result.getPath();
            // log.info(">>> Processing screenshot file path: {}", filePath);
            
            // Copy the file to our screenshot storage directory
            java.nio.file.Path sourcePath = java.nio.file.Paths.get(filePath);
            // log.info(">>> Source path exists: {}", java.nio.file.Files.exists(sourcePath));
            
            if (!java.nio.file.Files.exists(sourcePath)) {
                log.error(">>> Screenshot file not found at: {}", filePath);
                return null;
            }
            
            // Create screenshots directory if it doesn't exist
            java.nio.file.Path screenshotsDir = java.nio.file.Paths.get("screenshots");
            java.nio.file.Files.createDirectories(screenshotsDir);
            log.info(">>> Screenshots directory: {}", screenshotsDir.toAbsolutePath());
            
            // Generate a unique filename
            String filename = "screenshot_" + System.currentTimeMillis() + "_" + sourcePath.getFileName().toString();
            java.nio.file.Path destPath = screenshotsDir.resolve(filename);
            // log.info(">>> Copying to: {}", destPath.toAbsolutePath());
            
            // Copy the file
            java.nio.file.Files.copy(sourcePath, destPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            // log.info(">>> ✓ Screenshot copied successfully");
            
            // Return the URL path
            String url = "/api/screenshots/" + filename;
            // log.info(">>> ✓ Returning URL: {}", url);
            return url;
            
        } catch (Exception e) {
            log.error(">>> ✗ Exception processing screenshot path: {}", e.getMessage(), e);
            return null;
        }
    }
    
    private void pruneConversationHistory(List<LlmProvider.Message> messages) {
        if (conversationHistoryKeep < 0 || messages == null || messages.size() <= 2) {
            return; // Disabled or not enough messages
        }

        // Keep all system messages, and keep the first user message as the original instruction.
        List<LlmProvider.Message> systemMessages = new ArrayList<>();
        LlmProvider.Message originalInstruction = null;
        List<LlmProvider.Message> nonSystem = new ArrayList<>();

        for (LlmProvider.Message msg : messages) {
            if ("system".equals(msg.getRole())) {
                systemMessages.add(msg);
            } else {
                nonSystem.add(msg);
                if (originalInstruction == null && "user".equals(msg.getRole())) {
                    originalInstruction = msg;
                }
            }
        }

        if (originalInstruction == null) {
            return; // Unexpected, but safe
        }

        if (conversationHistoryKeep == 0) {
            messages.clear();
            messages.addAll(systemMessages);
            messages.add(originalInstruction);
            return;
        }

        // Tail after original instruction
        int instructionIdx = -1;
        for (int i = 0; i < nonSystem.size(); i++) {
            if (nonSystem.get(i) == originalInstruction) {
                instructionIdx = i;
                break;
            }
        }
        List<LlmProvider.Message> tail =
            (instructionIdx >= 0 && instructionIdx + 1 < nonSystem.size())
                ? nonSystem.subList(instructionIdx + 1, nonSystem.size())
                : Collections.emptyList();

        if (tail.isEmpty()) {
            messages.clear();
            messages.addAll(systemMessages);
            messages.add(originalInstruction);
            return;
        }

        // Segment by assistant-led exchanges: assistant (tool_use) + following tool_result(s)
        List<List<LlmProvider.Message>> segments = new ArrayList<>();
        List<LlmProvider.Message> current = null;
        for (LlmProvider.Message msg : tail) {
            String role = msg.getRole();
            if ("assistant".equals(role)) {
                current = new ArrayList<>();
                current.add(msg);
                segments.add(current);
            } else if ("tool".equals(role)) {
                if (current == null) {
                    // Defensive: tool without assistant; attach to last segment if it exists.
                    if (!segments.isEmpty()) {
                        segments.get(segments.size() - 1).add(msg);
                    }
                } else {
                    current.add(msg);
                }
            } else {
                // Any other role: keep ordering safely.
                if (current == null) {
                    current = new ArrayList<>();
                    segments.add(current);
                }
                current.add(msg);
            }
        }

        int from = Math.max(0, segments.size() - conversationHistoryKeep);
        List<LlmProvider.Message> kept = new ArrayList<>();
        for (int s = from; s < segments.size(); s++) {
            kept.addAll(segments.get(s));
        }

        messages.clear();
        messages.addAll(systemMessages);
        messages.add(originalInstruction);
        messages.addAll(kept);
    }

    /**
     * Removes all prior snapshot exchanges from the conversation history:
     * - the tool_result messages (role="tool") for snapshot/browser_snapshot
     * - AND the corresponding assistant messages that contain the matching tool_use ids
     *
     * This is critical for Claude: tool_use must be immediately followed by tool_result.
     * If we remove tool results but leave old assistant tool_use messages, Claude will reject the request.
     *
     * @return number of messages removed
     */
    private int removeOldSnapshotExchanges(List<LlmProvider.Message> messages) {
        if (messages == null || messages.isEmpty()) return 0;

        // 1) Find tool messages that represent snapshot results, and collect their tool_use ids (toolCallId).
        Set<String> snapshotToolUseIds = new HashSet<>();
        List<LlmProvider.Message> toolMsgsToRemove = new ArrayList<>();

        for (LlmProvider.Message msg : messages) {
            if (!"tool".equals(msg.getRole())) continue;
            if (msg.getMetadata() == null) continue;
            Object fn = msg.getMetadata().get("function_name");
            boolean isSnapshotFn = "snapshot".equals(fn) || "browser_snapshot".equals(fn);
            if (!isSnapshotFn) continue;

            toolMsgsToRemove.add(msg);
            if (msg.getToolCallId() != null && !msg.getToolCallId().isBlank()) {
                snapshotToolUseIds.add(msg.getToolCallId());
            }
        }

        if (toolMsgsToRemove.isEmpty()) return 0;

        int before = messages.size();

        // 2) Remove the tool result messages
        messages.removeAll(toolMsgsToRemove);

        // 3) Remove assistant messages that contain matching tool_use ids.
        //    (We only remove assistant messages when we are sure they refer to removed tool results.)
        messages.removeIf(msg -> {
            if (!"assistant".equals(msg.getRole())) return false;
            if (msg.getToolCalls() == null || msg.getToolCalls().isEmpty()) return false;
            for (LlmProvider.ToolCall tc : msg.getToolCalls()) {
                if (tc != null && tc.getId() != null && snapshotToolUseIds.contains(tc.getId())) {
                    return true;
                }
            }
            return false;
        });

        return before - messages.size();
    }
    
    /**
     * Build detailed feedback message for selector validation errors
     * This helps the agent understand what went wrong and how to fix it
     */
    private String buildSelectorErrorFeedback(String errorMessage, String invalidSelector, String toolName) {
        StringBuilder feedback = new StringBuilder();
        feedback.append("❌ SELECTOR VALIDATION ERROR - Please retry with a corrected selector\n\n");
        feedback.append("Error: ").append(errorMessage).append("\n\n");
        feedback.append("Invalid selector attempted: '").append(invalidSelector != null ? invalidSelector : "null").append("'\n\n");
        
        feedback.append("🔧 HOW TO FIX THIS:\n");
        feedback.append("1. **Call getContent() FIRST** to see the actual HTML structure of the page\n");
        feedback.append("2. **Find standard CSS selectors** from the actual HTML:\n");
        feedback.append("   - Extract class names from HTML: class=\"product-price\" → use '.product-price'\n");
        feedback.append("   - Extract IDs from HTML: id=\"item-price\" → use '#item-price'\n");
        feedback.append("   - Use attributes from HTML: '[data-testid=\"price\"]', '[aria-label=\"Price\"]'\n");
        feedback.append("   - Build structural selectors from actual HTML: '[item-class] .[price-class]'\n");
        feedback.append("   - Use nth-child if items are in order: '[item-class]:nth-child(3) .[price-class]'\n");
        feedback.append("   CRITICAL: Replace [item-class], [price-class] with ACTUAL values from getContent() HTML!\n");
        feedback.append("3. **NEVER use these FORBIDDEN selectors:**\n");
        feedback.append("   - :contains('text') - NOT supported\n");
        feedback.append("   - :has-text('text') - NOT supported\n");
        feedback.append("   - :has(.element:contains('text')) - NOT supported\n");
        feedback.append("   - Any combination of :contains() or :has() with text matching\n");
        feedback.append("4. **If you need to find an element by text content:**\n");
        feedback.append("   - Option A: Use visionAnalyze to locate it visually, then use clickAtCoordinates\n");
        feedback.append("   - Option B: Use getContent() to find structural relationships, then use standard CSS selectors\n");
        feedback.append("   - Option C: If items are in a predictable order, use nth-child selectors\n\n");
        
        feedback.append("📋 EXAMPLE - Finding price for a specific item:\n");
        feedback.append("❌ WRONG: Using :contains() or :has() with text matching - FORBIDDEN!\n");
        feedback.append("✅ CORRECT APPROACH:\n");
        feedback.append("   1. getContent() → See HTML structure and extract ACTUAL class names\n");
        feedback.append("   2. If items are in order: '[actual-item-class]:nth-child(2) .[actual-price-class]'\n");
        feedback.append("   3. OR use visionAnalyze({question: 'Where is the price for [Item Name]?'}) → clickAtCoordinates\n");
        feedback.append("   4. OR if checking any item: '[actual-item-class] .[actual-price-class]'\n");
        feedback.append("   CRITICAL: Use ACTUAL class names from getContent(), not these placeholders!\n\n");
        
        feedback.append("🔄 ACTION REQUIRED:\n");
        feedback.append("Please retry the ").append(toolName).append(" tool with a corrected selector.\n");
        feedback.append("Remember: Use ONLY standard CSS selectors from getContent(), or use visionAnalyze + clickAtCoordinates.\n");
        
        return feedback.toString();
    }
    
    /**
     * Substitute variables in instruction ({{variableName}} -> value)
     */
    private String substituteVariables(String instruction, Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) {
            return instruction;
        }
        
        String result = instruction;
        for (Map.Entry<String, Object> entry : variables.entrySet()) {
            String varName = entry.getKey();
            String varValue = entry.getValue() != null ? entry.getValue().toString() : "";
            String pattern = "\\{\\{" + java.util.regex.Pattern.quote(varName) + "\\}\\}";
            result = result.replaceAll(pattern, varValue);
        }
        return result;
    }
    
    /**
     * Build variable-related instructions for the system prompt
     */
    private String buildVariableInstructions(Map<String, Object> variables) {
        if (variables == null || variables.isEmpty()) {
            return "";
        }
        
        return "\n\n## VARIABLE HANDLING:\n" +
            "You have access to variables that can be used in instructions and extracted from results.\n" +
            "\n**VARIABLE SUBSTITUTION:**\n" +
            "- Variables in the format {{variableName}} will be automatically substituted with their values\n" +
            "- Example: If variable 'orderId' = 'ORD-12345', instruction 'Click {{orderId}}' becomes 'Click ORD-12345'\n" +
            "\n**VARIABLE EXTRACTION:**\n" +
            "When the instruction asks you to extract or store a value, you MUST return it in a specific format:\n" +
            "- If instruction contains phrases like 'store ... in variable X', 'save ... as X', 'extract ... to X':\n" +
            "  * Extract the value from the page (using getContent() or tool results)\n" +
            "  * At the end of your response, add a line: \"EXTRACTED_VARIABLE:variableName=value\"\n" +
            "  * Example: \"EXTRACTED_VARIABLE:orderNumber=ORD-12345\"\n" +
            "- The extracted value will be available for use in subsequent steps\n" +
            "\n**Examples:**\n" +
            "- Instruction: 'Get the order number from the confirmation page and store it in variable orderNumber'\n" +
            "  * Execute: getContent() → Find order number → Extract value\n" +
            "  * Response: 'Order number found. EXTRACTED_VARIABLE:orderNumber=ORD-12345'\n" +
            "- Instruction: 'Click on the link with text {{orderNumber}}'\n" +
            "  * Variable substitution happens automatically before execution\n" +
            "  * Execute: Click on link with text 'ORD-12345'\n";
    }
    
    /**
     * Extract variables from agent response message
     * Looks for patterns like "EXTRACTED_VARIABLE:name=value"
     */
    private Map<String, Object> extractVariablesFromResponse(String response) {
        Map<String, Object> extracted = new HashMap<>();
        if (response == null || response.isEmpty()) {
            return extracted;
        }
        
        // Look for EXTRACTED_VARIABLE patterns
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
            "EXTRACTED_VARIABLE:(\\w+)=([^\\n]+)"
        );
        java.util.regex.Matcher matcher = pattern.matcher(response);
        
        while (matcher.find()) {
            String varName = matcher.group(1);
            String varValue = matcher.group(2).trim();
            extracted.put(varName, varValue);
            log.info("Extracted variable: {} = {}", varName, varValue);
        }
        
        return extracted;
    }
    
    /**
     * Result of agent execution
     */
    public static class AgentExecutionResult {
        private final boolean success;
        private final String message;
        private final List<ToolExecutionLog> executionLog;
        private final Map<String, Object> extractedVariables;
        // Optional: in batch mode we can attach a unique screenshot per step number (captured via MCP without extra LLM calls)
        private final Map<Integer, String> stepScreenshotUrls;
        
        private AgentExecutionResult(boolean success,
                                     String message,
                                     List<ToolExecutionLog> executionLog,
                                     Map<String, Object> extractedVariables,
                                     Map<Integer, String> stepScreenshotUrls) {
            this.success = success;
            this.message = message;
            this.executionLog = executionLog;
            this.extractedVariables = extractedVariables != null ? extractedVariables : new HashMap<>();
            this.stepScreenshotUrls = stepScreenshotUrls != null ? stepScreenshotUrls : new HashMap<>();
        }
        
        public static AgentExecutionResult success(String message, List<ToolExecutionLog> log) {
            return new AgentExecutionResult(true, message, log, new HashMap<>(), new HashMap<>());
        }
        
        public static AgentExecutionResult success(String message, List<ToolExecutionLog> log, Map<String, Object> extractedVariables) {
            return new AgentExecutionResult(true, message, log, extractedVariables, new HashMap<>());
        }

        public static AgentExecutionResult success(String message,
                                                   List<ToolExecutionLog> log,
                                                   Map<String, Object> extractedVariables,
                                                   Map<Integer, String> stepScreenshotUrls) {
            return new AgentExecutionResult(true, message, log, extractedVariables, stepScreenshotUrls);
        }
        
        public static AgentExecutionResult error(String message) {
            return new AgentExecutionResult(false, message, new ArrayList<>(), new HashMap<>(), new HashMap<>());
        }
        
        public static AgentExecutionResult error(String message, List<ToolExecutionLog> log) {
            return new AgentExecutionResult(false, message, log, new HashMap<>(), new HashMap<>());
        }
        
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public List<ToolExecutionLog> getExecutionLog() { return executionLog; }
        public Map<String, Object> getExtractedVariables() { return extractedVariables; }
        public Map<Integer, String> getStepScreenshotUrls() { return stepScreenshotUrls; }
    }
    
    /**
     * Log of a single tool execution
     */
    public static class ToolExecutionLog {
        private final String toolName;
        private final Map<String, Object> arguments;
        private final String result;
        private final String screenshotUrl;  // URL of automatically captured screenshot
        
        public ToolExecutionLog(String toolName, Map<String, Object> arguments, String result, String screenshotUrl) {
            this.toolName = toolName;
            this.arguments = arguments;
            this.result = result;
            this.screenshotUrl = screenshotUrl;
        }
        
        public String getToolName() { return toolName; }
        public Map<String, Object> getArguments() { return arguments; }
        public String getResult() { return result; }
        public String getScreenshotUrl() { return screenshotUrl; }
        
        @Override
        public String toString() {
            return String.format("%s(%s) -> %s [screenshot: %s]", toolName, arguments, result, screenshotUrl);
        }
    }
}
