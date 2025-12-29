package com.youraitester.service;

import com.youraitester.agent.AgentExecutor;
import com.youraitester.model.Module;
import com.youraitester.model.ModuleStep;
import com.youraitester.model.Test;
import com.youraitester.model.TestStep;
import com.youraitester.model.TestRun;
import com.youraitester.model.TestDataset;
import com.youraitester.model.StepResult;
import com.youraitester.model.app.App;
import com.youraitester.model.app.Screen;
import com.youraitester.model.app.ScreenElement;
import com.youraitester.repository.app.AppRepository;
import com.youraitester.repository.app.ScreenRepository;
import com.youraitester.repository.TestRepository;
import com.youraitester.repository.TestRunRepository;
import com.youraitester.repository.StepResultRepository;
import com.youraitester.repository.ModuleRepository;
import com.youraitester.repository.RunRepository;
import com.youraitester.model.Run;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestExecutionService {
    
    private final TestRepository testRepository;
    private final TestRunRepository testRunRepository;
    private final StepResultRepository stepResultRepository;
    private final ModuleRepository moduleRepository;
    private final RunRepository runRepository;
    private final AiTestExecutionService aiTestExecutionService;
    private final OfficialPlaywrightMcpService mcpService;
    private final PlaywrightJavaService playwrightJavaService;
    private final AppRepository appRepository;
    private final ScreenRepository screenRepository;
    private final ScreenInferenceService screenInferenceService;
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final int LOG_VALUE_MAX_CHARS = 120;
    
    @Async
    @org.springframework.transaction.annotation.Transactional
    public void executeTest(String testId, Integer dataRowIndex, String environment, String browserType, String runId) {
        log.info("Starting test execution for testId: {}, runId: {}", testId, runId);
        
        // DON'T reset MCP session here - it causes browser to return to about:blank
        // Without --shared-browser-context, session reset = fresh browser = about:blank
        // Session will reset naturally if it expires, and retry logic will handle it
        // Only reset between COMPLETE test runs, not between steps
        // if (mcpService.isEnabled()) {
        //     mcpService.resetSession();
        //     log.info("MCP session reset for new test execution");
        // }
        log.info("Reusing existing MCP session (if any) to preserve browser state");
        
        long startTime = System.currentTimeMillis();
        TestRun testRun = null;

        try {
            Test test = testRepository.findById(testId)
                    .orElseThrow(() -> new RuntimeException("Test not found: " + testId));
        
        log.info("Loaded test '{}' - appUrl: '{}', appType: '{}'", 
            test.getName(), test.getAppUrl(), test.getAppType());
        
        // Eagerly load the steps collection to avoid LazyInitializationException
        test.getSteps().size();
        // Eagerly load the datasets collection - ElementCollection needs explicit access
        List<TestDataset> datasets = test.getDatasets();
        if (datasets != null) {
            log.info("Test datasets collection loaded. Size: {}", datasets.size());
            // Access each dataset to ensure they're loaded
            for (TestDataset ds : datasets) {
                if (ds != null) {
                    log.debug("Dataset found: data length = {}", ds.getData() != null ? ds.getData().length() : 0);
                }
            }
        } else {
            log.warn("Test datasets collection is null");
        }
        
            testRun = new TestRun();
            testRun.setTestId(testId);
            testRun.setTestName(test.getName());
            testRun.setProjectId(test.getProjectId());
            testRun.setEnvironment(environment);
            testRun.setBrowser(browserType);
            testRun.setDataRowIndex(dataRowIndex);
            if (runId != null && !runId.trim().isEmpty()) {
                testRun.setBatchId(runId); // Use runId as batchId to link TestRuns to Run
                log.info("Setting batchId={} for testRun testId={}", runId, testId);
            } else {
                log.warn("runId is null or empty for testId={}, batchId will not be set", testId);
            }
            testRun = testRunRepository.save(testRun);
            log.info("Saved TestRun id={}, batchId={}", testRun.getId(), testRun.getBatchId());

            // Reset browser context to clear cookies and session data before starting test
            // DISABLED: Resetting browser context causes MCP server to crash
            // log.info("Resetting browser context before test execution");
            // playwrightMcpService.resetBrowser();
            
            // Initialize variables map for this test run
            Map<String, Object> variables = new HashMap<>();
            
            // Load dataset data if dataset exists (datasets already loaded above)
            log.info("Checking datasets. Collection is null: {}, isEmpty: {}", 
                datasets == null, 
                datasets != null && datasets.isEmpty());
            
            if (datasets != null && !datasets.isEmpty()) {
                log.info("Test has {} dataset(s)", test.getDatasets().size());
                // Get the first dataset (assuming single dataset per test for now)
                TestDataset dataset = test.getDatasets().get(0);
                if (dataset != null) {
                    log.info("Dataset found. Data is null: {}, isEmpty: {}", 
                        dataset.getData() == null, 
                        dataset.getData() != null && dataset.getData().trim().isEmpty());
                    if (dataset.getData() != null && !dataset.getData().trim().isEmpty()) {
                        try {
                            // If dataRowIndex is provided, use that row; otherwise use row 0 (first row)
                            Integer rowToUse = (dataRowIndex != null) ? dataRowIndex : 0;
                            log.info("Loading dataset row {} (dataRowIndex: {})", rowToUse, dataRowIndex);
                            Map<String, Object> datasetVars = loadDatasetRow(dataset.getData(), rowToUse);
                            if (datasetVars != null && !datasetVars.isEmpty()) {
                                variables.putAll(datasetVars);
                                log.info("Loaded {} dataset variables from row {}: {}", datasetVars.size(), rowToUse, datasetVars.keySet());
                            } else {
                                log.warn("No dataset variables loaded for row {}. Dataset data length: {}", rowToUse, dataset.getData().length());
                            }
                        } catch (Exception e) {
                            log.error("Failed to load dataset row: {}", e.getMessage(), e);
                        }
                    } else {
                        log.warn("Dataset data is null or empty");
                    }
                } else {
                    log.warn("First dataset is null");
                }
            } else {
                log.info("Test has no datasets (datasets is null: {}, isEmpty: {})", 
                    test.getDatasets() == null, 
                    test.getDatasets() != null && test.getDatasets().isEmpty());
            }
            
            testRun.setVariables(variables);
            // Save testRun to persist variables JSON before executing steps
            testRun = testRunRepository.save(testRun);
            log.info("Saved testRun with {} variables. Variables JSON: {}", variables.size(), testRun.getVariablesJson());
            
            // Auto-navigate to app URL before first step (if appUrl is configured)
            log.info("Checking auto-navigation: appUrl='{}', isNull={}, isEmpty={}", 
                test.getAppUrl(), 
                test.getAppUrl() == null, 
                test.getAppUrl() != null && test.getAppUrl().trim().isEmpty());
            
            if (test.getAppUrl() != null && !test.getAppUrl().trim().isEmpty()) {
                log.info("✓ Auto-navigating to app URL: {} (required after session reset)", test.getAppUrl());
                try {
                    // If test is linked to app metadata, prefer deterministic navigation via MCP.
                    if (test.getAppId() != null) {
                        playwrightJavaService.navigate(test.getAppUrl());
                        log.info("Successfully navigated to app URL (deterministic Playwright Java navigate)");
                    } else {
                    Map<String, Object> navResult = aiTestExecutionService.executeStepWithAI(
                        "navigate to " + test.getAppUrl(),
                        "",
                        variables
                    );
                    if ("error".equals(navResult.get("status"))) {
                        log.error("Failed to navigate to app URL: {}", navResult.get("message"));
                        testRun.setStatus("failed");
                        testRun.setErrorMessage("Failed to navigate to app URL: " + navResult.get("message"));
                        testRun.setCompletedAt(LocalDateTime.now());
                        testRun.setDuration(System.currentTimeMillis() - startTime);
                        testRunRepository.save(testRun);
                            return;
                    }
                    log.info("Successfully navigated to app URL");
                    }
                } catch (Exception e) {
                    log.error("Exception during auto-navigation to app URL", e);
                    testRun.setStatus("failed");
                    testRun.setErrorMessage("Exception during navigation to app URL: " + e.getMessage());
                    testRun.setCompletedAt(LocalDateTime.now());
                    testRun.setDuration(System.currentTimeMillis() - startTime);
                    testRunRepository.save(testRun);
                    return; // Exit early
                }
            } else {
                // CRITICAL: Without --shared-browser-context flag, tests MUST have an app URL
                // Browser starts on about:blank after MCP session reset
                log.error("❌ CRITICAL: No app URL configured for test '{}'!", test.getName());
                log.error("❌ After removing --shared-browser-context, browser starts on about:blank");
                log.error("❌ ACTION REQUIRED: Edit this test and set the 'App URL' field");
                testRun.setStatus("failed");
                testRun.setErrorMessage("No app URL configured. Browser starts on about:blank after session reset. Please edit the test and set the App URL field.");
                testRun.setCompletedAt(LocalDateTime.now());
                testRun.setDuration(System.currentTimeMillis() - startTime);
                testRunRepository.save(testRun);
                return; // Exit early - cannot run without a URL
            }
            
            // Execute each step using AI + MCP (no local Playwright)
            boolean hasModuleSteps = test.getSteps().stream()
                .anyMatch(s -> s.getModuleId() != null && !s.getModuleId().isEmpty());

            if (hasModuleSteps) {
                // Keep legacy behavior for module-based tests for now.
                for (TestStep step : test.getSteps()) {
                    if (step.getModuleId() != null && !step.getModuleId().isEmpty()) {
                        executeModuleSteps(step, testRun, test);
                        if ("failed".equals(testRun.getStatus())) {
                            break;
                        }
                    } else {
                        StepResult stepResult = executeStepWithAI(step, testRun, test);
                        stepResultRepository.save(stepResult);
                        if (stepResult.getExtractedVariables() != null && !stepResult.getExtractedVariables().isEmpty()) {
                            Map<String, Object> currentVars = testRun.getVariables();
                            currentVars.putAll(stepResult.getExtractedVariables());
                            testRun.setVariables(currentVars);
                            testRunRepository.save(testRun);
                            log.info("Updated test run variables. Total variables: {}", currentVars.size());
                        }
                        if ("failed".equals(stepResult.getStatus())) {
                            testRun.setStatus("failed");
                            testRun.setErrorMessage(stepResult.getErrorMessage());
                            break;
                        }
                    }

                    if (step.getWaitAfter() != null && step.getWaitAfter() > 0) {
                        Thread.sleep(step.getWaitAfter());
                    }
                }
            } else {
                // Deterministic execution when test is linked to app metadata
                if (test.getAppId() != null) {
                    executeDeterministicSteps(test, testRun, variables);
            } else {
                // New behavior (option a): one agent session for the whole test; reuse latest snapshot across steps.
                Map<String, Object> sessionVars = testRun.getVariables() != null ? new HashMap<>(testRun.getVariables()) : new HashMap<>();
                String appUrl = test.getAppUrl();
                String appType = test.getAppType();

                StringBuilder plan = new StringBuilder();
                plan.append("You are executing a multi-step test.\n");
                plan.append("Execute steps IN ORDER. Try to reuse the most recent snapshot across multiple steps.\n");
                plan.append("Only request a new snapshot when you can no longer complete the next step using the current snapshot.\n\n");
                plan.append("Test name: ").append(test.getName()).append("\n");
                plan.append("App URL: ").append(appUrl).append("\n\n");
                plan.append("Steps:\n");
                for (TestStep s : test.getSteps()) {
                    plan.append(s.getOrder()).append(". ").append(s.getInstruction()).append("\n");
                }

                AgentExecutor.AgentSession session = aiTestExecutionService.startAgentTestSession(
                    plan.toString(),
                    "", // no pageContext (MCP provides it)
                    sessionVars,
                    appUrl,
                    appType
                );

                // Seed the session with ONE snapshot without calling the LLM (MCP-only).
                // This ensures the very first Claude call is the batch call (so early steps are truly part of one batch).
                try {
                    session.injectFreshSnapshot();
                    log.info("Seeded agent session with initial snapshot (MCP-only)");
                } catch (Exception e) {
                    log.warn("Failed to seed agent session with an initial snapshot: {}", e.getMessage());
                }

                // Batch mode (token saver): ask Claude ONCE to execute as many upcoming steps as possible from the
                // current snapshot; do not call Claude again for confirmation. When snapshot is needed, inject it
                // without calling Claude, then continue.
                List<TestStep> steps = test.getSteps();
                int idx = 0;
                int needSnapshotNoProgressStreak = 0;
                while (idx < steps.size()) {
                    log.info("Batch mode: attempting to execute from step index {} ({} total steps)", idx, steps.size());
                    List<TestStep> remaining = steps.subList(idx, steps.size());

                    Map<String, Object> batch = aiTestExecutionService.executeBatchWithAI(session, remaining, sessionVars);
                    String status = (String) batch.get("status");

                    @SuppressWarnings("unchecked")
                    List<Integer> executedNums = (List<Integer>) batch.getOrDefault("executedStepNumbers", List.of());
                    @SuppressWarnings("unchecked")
                    Map<Integer, AgentExecutor.StepOutcome> stepOutcomes =
                        (Map<Integer, AgentExecutor.StepOutcome>) batch.getOrDefault("stepOutcomes", Map.of());
                    @SuppressWarnings("unchecked")
                    Map<Integer, String> stepScreenshotUrls =
                        (Map<Integer, String>) batch.getOrDefault("stepScreenshotUrls", Map.of());

                    // Map executed step numbers to StepResults (pass/fail) by step order number.
                    // Do NOT assume consecutive execution; Claude may skip already-complete steps or include verifications.
                    if (executedNums != null && !executedNums.isEmpty()) {
                        needSnapshotNoProgressStreak = 0;
                        String screenshotUrl = batch.containsKey("screenshotUrl") ? String.valueOf(batch.get("screenshotUrl")) : null;

                        boolean anyFailed = false;
                        String firstFailureMsg = null;

                        // Build lookup: step order -> TestStep
                        // Build lookup: step order number -> TestStep (keep exact numbering as stored).
                        Map<Integer, TestStep> byOrder = new HashMap<>();
                        for (TestStep s : steps) {
                            if (s != null && s.getOrder() != null) byOrder.put(s.getOrder(), s);
                        }

                        for (Integer stepNum : executedNums) {
                            if (stepNum == null) continue;
                            TestStep step = byOrder.get(stepNum);
                            if (step == null) {
                                // Fallback: if order missing/mismatch, skip recording.
                                continue;
                            }

                            StepResult sr = new StepResult();
                            sr.setTestRunId(testRun.getId());
                            sr.setStepNumber(step.getOrder());
                            sr.setInstruction(step.getInstruction());
                            sr.setExecutedAt(LocalDateTime.now());

                            AgentExecutor.StepOutcome outcome = stepOutcomes != null ? stepOutcomes.get(stepNum) : null;
                            String stepStatus = outcome != null && outcome.getStatus() != null ? outcome.getStatus() : "passed";
                            sr.setStatus(stepStatus);
                            if ("failed".equalsIgnoreCase(stepStatus)) {
                                anyFailed = true;
                                String msg = outcome != null ? outcome.getMessage() : null;
                                if (msg == null || msg.isBlank()) {
                                    msg = "Step " + stepNum + " failed";
                                }
                                sr.setErrorMessage(msg);
                                if (firstFailureMsg == null) firstFailureMsg = msg;
                            }

                            // Unique screenshot per step (preferred). Fallback to last screenshotUrl if available.
                            String stepShot = stepScreenshotUrls != null ? stepScreenshotUrls.get(stepNum) : null;
                            if (stepShot != null && !stepShot.isBlank()) {
                                sr.setScreenshotUrl(stepShot);
                            } else if (screenshotUrl != null && !screenshotUrl.isBlank()) {
                                sr.setScreenshotUrl(screenshotUrl);
                            }
                            stepResultRepository.save(sr);
                        }

                        // Advance idx to the first step that does not yet have a StepResult in this run.
                        // (Lightweight approach: rely on executedNums being in-order most of the time.)
                        // For now: move idx forward while the current step order was listed as executed.
                        Set<Integer> executedSet = new HashSet<>(executedNums);
                        while (idx < steps.size()) {
                            Integer order = steps.get(idx).getOrder();
                            if (order != null && executedSet.contains(order)) {
                                idx++;
                                continue;
                            }
                            break;
                        }

                        if (anyFailed) {
                            testRun.setStatus("failed");
                            testRun.setErrorMessage(firstFailureMsg != null ? firstFailureMsg : "A batch step failed");
                            break;
                        }
                    }

                    if ("need_snapshot".equals(status)) {
                        // If we executed something, loop again (still may be able to continue without snapshot).
                        // If we executed nothing, inject a fresh snapshot and retry.
                        if (executedNums == null || executedNums.isEmpty()) {
                            needSnapshotNoProgressStreak++;
                            if (needSnapshotNoProgressStreak >= 4) {
                                TestStep step = steps.get(idx);
                                StepResult sr = new StepResult();
                                sr.setTestRunId(testRun.getId());
                                sr.setStepNumber(step.getOrder() != null ? step.getOrder() : (idx + 1));
                                sr.setInstruction(step.getInstruction());
                                sr.setExecutedAt(LocalDateTime.now());
                                sr.setStatus("failed");
                                sr.setErrorMessage("Agent requested a new snapshot repeatedly without making progress. " +
                                    "Likely the needed content is outside the truncated snapshot; consider increasing snapshot size, " +
                                    "using scoped snapshots, or adding a scroll step.");
                                stepResultRepository.save(sr);
                                testRun.setStatus("failed");
                                testRun.setErrorMessage(sr.getErrorMessage());
                                break;
                            }
                            try {
                                // Try to reveal lower content before snapshot on repeated no-progress.
                                // 1st time: plain snapshot, 2nd: PageDown+snapshot, 3rd: End+snapshot.
                                // Also escalate snapshot truncation when stuck so bottom-of-page content isn't cut off.
                                // Attempt 2+ will use agent.tool.snapshot.max.chars.escalated.
                                session.revealMoreAndInjectSnapshot(needSnapshotNoProgressStreak);
                            } catch (Exception e) {
                                log.warn("Failed to inject fresh snapshot: {}", e.getMessage());
                                testRun.setStatus("failed");
                                testRun.setErrorMessage("Failed to capture snapshot: " + e.getMessage());
                                break;
                            }
                        }
                        continue;
                    }

                    if (!"success".equals(status)) {
                        // Fail the current step (first remaining)
                        TestStep step = steps.get(idx);
                        StepResult sr = new StepResult();
                        sr.setTestRunId(testRun.getId());
                        sr.setStepNumber(step.getOrder() != null ? step.getOrder() : (idx + 1));
                        sr.setInstruction(step.getInstruction());
                        sr.setExecutedAt(LocalDateTime.now());
                        sr.setStatus("failed");
                        sr.setErrorMessage(batch.get("message") != null ? String.valueOf(batch.get("message")) : "Batch execution failed");
                        if (batch.containsKey("screenshotUrl")) {
                            sr.setScreenshotUrl(String.valueOf(batch.get("screenshotUrl")));
                        }
                        stepResultRepository.save(sr);
                        testRun.setStatus("failed");
                        testRun.setErrorMessage(sr.getErrorMessage());
                        break;
                    }

                    // If success but executed nothing and didn't request snapshot, avoid infinite loop
                    if ((executedNums == null || executedNums.isEmpty()) && !"need_snapshot".equals(status)) {
                        testRun.setStatus("failed");
                        testRun.setErrorMessage("No steps executed and no snapshot requested; aborting to avoid infinite loop.");
                        break;
                    }
                    }
                }
            }
            
            // If no failures, mark as passed
            if (!"failed".equals(testRun.getStatus())) {
                testRun.setStatus("passed");
            }

            testRun.setCompletedAt(LocalDateTime.now());
            testRun.setDuration(System.currentTimeMillis() - startTime);
            testRunRepository.save(testRun);

            // Update Run status if this test run is part of a Run
            if (runId != null) {
                updateRunStatus(runId);
            }

            log.info("Test execution completed. Status: {}", testRun.getStatus());

        } catch (Exception e) {
            log.error("Test execution failed", e);
            if (testRun != null) {
                testRun.setStatus("failed");
                testRun.setErrorMessage(e.getMessage());
                testRun.setCompletedAt(LocalDateTime.now());
                testRun.setDuration(System.currentTimeMillis() - startTime);
                testRunRepository.save(testRun);

                if (runId != null) {
                    updateRunStatus(runId);
                }
            }
        } finally {
            // Always close the Playwright MCP browser/process for this test execution thread.
            // This guarantees cleanup when the last step completes OR when any step fails/throws.
            try {
                mcpService.resetSession();
                log.info("MCP session closed/reset after test execution (thread={})", Thread.currentThread().getName());
            } catch (Exception e) {
                log.warn("Failed to reset/close MCP session after test execution", e);
            }
            // Always close Playwright Java resources for deterministic runner
            try {
                playwrightJavaService.reset();
                log.info("[PW] Playwright Java session closed/reset after test execution (thread={})", Thread.currentThread().getName());
            } catch (Exception e) {
                log.warn("Failed to reset/close Playwright Java session after test execution", e);
            }
        }
    }

    /**
     * Deterministic, metadata-driven runner:
     * - Uses App.info (application summary) + executed steps to infer current screen
     * - Resolves elementName to selector from Screen.elements
     * - Executes action via OfficialPlaywrightMcpService selector helpers (browser_evaluate)
     */
    private void executeDeterministicSteps(Test test, TestRun testRun, Map<String, Object> variables) throws Exception {
        Long appId = test.getAppId();
        App app = appRepository.findById(appId).orElseThrow(() -> new RuntimeException("App not found: " + appId));

        playwrightJavaService.ensureStarted();

        List<String> screenNames = new ArrayList<>();
        if (app.getScreens() != null) {
            for (Screen s : app.getScreens()) {
                if (s != null && s.getName() != null && !s.getName().isBlank()) screenNames.add(s.getName());
            }
        }
        if (screenNames.isEmpty()) {
            throw new RuntimeException("No screens configured for appId=" + appId);
        }

        List<String> executed = new ArrayList<>();
        String lastScreen = null;

        for (TestStep step : test.getSteps()) {
            if (step == null) continue;

            log.info("[DET] Reading step: testId={} runId={} stepOrder={} instruction='{}'",
                test.getId(), testRun.getId(), step.getOrder(), step.getInstruction());

            StepResult sr = new StepResult();
            sr.setTestRunId(testRun.getId());
            sr.setStepNumber(step.getOrder());
            sr.setInstruction(step.getInstruction());
            sr.setExecutedAt(LocalDateTime.now());
            long stepStart = System.currentTimeMillis();

            try {
                // If save-time mapping populated (type/selector/value), execute directly without any LLM.
                if (isMappedDeterministicStep(step)) {
                    log.info("[DET-MAP] Executing mapped step. stepOrder={} action='{}' selector='{}' value={}",
                        step.getOrder(),
                        step.getType(),
                        step.getSelector(),
                        step.getValue() != null ? "\"" + step.getValue() + "\"" : "null");

                    executeMappedDeterministicStep(step);

                    // Best-effort screenshot after step
                    try {
                        Path dir = Paths.get(System.getProperty("java.io.tmpdir"), "playwright-java-screenshots");
                        Files.createDirectories(dir);
                        Path shotPath = dir.resolve("run-" + testRun.getId() + "-step-" + (step.getOrder() != null ? step.getOrder() : "x") + ".png");
                        // Scroll to the acted element (or active element) before screenshot
                        try {
                            if (step.getSelector() != null && !step.getSelector().isBlank()) {
                                playwrightJavaService.scrollIntoView(step.getSelector());
                            } else {
                                playwrightJavaService.scrollToActiveElement();
                            }
                        } catch (Exception ignored) {}
                        playwrightJavaService.screenshot(shotPath);
                        sr.setScreenshotUrl(shotPath.toString());
                    } catch (Exception ignored) {}

                    sr.setStatus("passed");
                    continue;
                }

                executed.add(step.getInstruction() != null ? step.getInstruction() : "");
                String screenName = screenInferenceService.inferScreenName(app.getInfo(), screenNames, executed, lastScreen);
                lastScreen = screenName;
                log.info("[DET] Inferred screen='{}' for stepOrder={} (appId={}, appName='{}')",
                    screenName, step.getOrder(), app.getId(), app.getName());

                ParsedStep parsed = ParsedStep.parse(step.getInstruction());
                if (parsed == null) {
                    throw new RuntimeException("Unsupported step format: " + step.getInstruction());
                }
                log.info("[DET] Parsed action='{}' element='{}' value={}",
                    parsed.action,
                    parsed.elementName,
                    formatValueForLogs(parsed.elementName, parsed.value));

                Screen screen = screenRepository.findByApp_IdAndName(appId, screenName)
                    .orElseThrow(() -> new RuntimeException("Screen not found for appId=" + appId + " name=" + screenName));

                ScreenElement element = resolveElement(screen, parsed.elementName);
                if (element == null) {
                    throw new RuntimeException("Element '" + parsed.elementName + "' not found on screen '" + screenName + "'");
                }

                log.info("[DET] Resolved elementName='{}' -> selectorType='{}' selector='{}' frameSelector='{}' elementType='{}'",
                    element.getElementName(),
                    element.getSelectorType(),
                    element.getSelector(),
                    element.getFrameSelector(),
                    element.getElementType());

                executeParsedAction(element, parsed);
                log.info("[DET] Executed action='{}' on element='{}' (stepOrder={})",
                    parsed.action, element.getElementName(), step.getOrder());

                // Best-effort screenshot after step
                try {
                    Path dir = Paths.get(System.getProperty("java.io.tmpdir"), "playwright-java-screenshots");
                    Files.createDirectories(dir);
                    Path shotPath = dir.resolve("run-" + testRun.getId() + "-step-" + (step.getOrder() != null ? step.getOrder() : "x") + ".png");
                    // Scroll to the acted element (or active element) before screenshot
                    try {
                        if (element.getSelector() != null && !element.getSelector().isBlank()) {
                            playwrightJavaService.scrollIntoView(element.getSelector());
                        } else {
                            playwrightJavaService.scrollToActiveElement();
                        }
                    } catch (Exception ignored) {}
                    playwrightJavaService.screenshot(shotPath);
                    sr.setScreenshotUrl(shotPath.toString());
                } catch (Exception ignored) {}

                sr.setStatus("passed");
            } catch (Exception e) {
                sr.setStatus("failed");
                sr.setErrorMessage(e.getMessage());
                testRun.setStatus("failed");
                testRun.setErrorMessage(e.getMessage());
                stepResultRepository.save(sr);
                sr.setDuration(System.currentTimeMillis() - stepStart);
                break;
            } finally {
                sr.setDuration(System.currentTimeMillis() - stepStart);
                stepResultRepository.save(sr);
            }

            if (step.getWaitAfter() != null && step.getWaitAfter() > 0) {
                Thread.sleep(step.getWaitAfter());
            }
        }
    }

    private boolean isMappedDeterministicStep(TestStep step) {
        if (step == null) return false;
        if (step.getType() == null || step.getType().isBlank()) return false;
        String action = step.getType().trim().toLowerCase(Locale.ROOT);
        if ("navigate".equals(action)) {
            return step.getValue() != null && !step.getValue().isBlank();
        }
        if (step.getSelector() == null || step.getSelector().isBlank()) return false;
        return action.equals("fill")
            || action.equals("click")
            || action.equals("hover")
            || action.equals("select_by_value")
            || action.equals("press_key");
    }

    private void executeMappedDeterministicStep(TestStep step) {
        String action = step.getType().trim().toLowerCase(Locale.ROOT);
        log.info("[DET-MAP] Running mapped step: stepOrder={} action='{}' selector='{}' value={}",
            step.getOrder(),
            action,
            step.getSelector(),
            step.getValue() != null ? "\"" + step.getValue() + "\"" : "null");
        switch (action) {
            case "navigate" -> playwrightJavaService.navigate(step.getValue());
            case "fill" -> playwrightJavaService.fill(step.getSelector(), step.getValue() != null ? step.getValue() : "");
            case "click" -> playwrightJavaService.click(step.getSelector());
            case "hover" -> playwrightJavaService.hover(step.getSelector());
            case "select_by_value" -> playwrightJavaService.selectByValue(step.getSelector(), step.getValue() != null ? step.getValue() : "");
            case "press_key" -> playwrightJavaService.press(step.getValue() != null ? step.getValue() : "");
            default -> throw new RuntimeException("Unsupported mapped action: " + action);
        }
        log.info("[DET-MAP] Executed mapped action='{}' (stepOrder={})", action, step.getOrder());
    }

    private void executeParsedAction(ScreenElement el, ParsedStep parsed) throws Exception {
        String selectorType = el.getSelectorType();
        String selector = el.getSelector();
        String frameSelector = el.getFrameSelector();

        boolean isCss = (selectorType == null || selectorType.isBlank() || "css".equalsIgnoreCase(selectorType));
        if (!isCss) {
            throw new RuntimeException("Only css selectorType is supported for Playwright Java execution right now. Got: " + selectorType);
        }
        if (frameSelector != null && !frameSelector.isBlank()) {
            throw new RuntimeException("frameSelector is not supported for Playwright Java execution right now");
        }

        switch (parsed.action) {
            case "fill" -> {
                log.info("[DET] Using Playwright Java locator.fill for element='{}' selector='{}'", el.getElementName(), selector);
                playwrightJavaService.fill(selector, parsed.value);
            }
            case "click" -> {
                log.info("[DET] Using Playwright Java locator.click for element='{}' selector='{}'", el.getElementName(), selector);
                playwrightJavaService.click(selector);
            }
            case "hover" -> {
                log.info("[DET] Using Playwright Java locator.hover for element='{}' selector='{}'", el.getElementName(), selector);
                playwrightJavaService.hover(selector);
            }
            case "select_by_value" -> {
                log.info("[DET] Using Playwright Java locator.selectOption(value) for element='{}' selector='{}'", el.getElementName(), selector);
                playwrightJavaService.selectByValue(selector, parsed.value);
            }
            case "press_key" -> {
                log.info("[DET] Using Playwright Java keyboard.press('{}')", parsed.value);
                playwrightJavaService.press(parsed.value);
            }
            default -> throw new RuntimeException("Unsupported action: " + parsed.action);
        }
    }

    private ScreenElement resolveElement(Screen screen, String elementNameFromStep) {
        if (screen == null || screen.getElements() == null) return null;
        if (elementNameFromStep == null) return null;

        String want = normalizeElementName(elementNameFromStep);
        for (ScreenElement el : screen.getElements()) {
            if (el == null || el.getElementName() == null) continue;
            if (normalizeElementName(el.getElementName()).equals(want)) return el;
        }
        // fallback: substring contains
        for (ScreenElement el : screen.getElements()) {
            if (el == null || el.getElementName() == null) continue;
            String have = normalizeElementName(el.getElementName());
            if (have.contains(want) || want.contains(have)) return el;
        }
        return null;
    }

    private String normalizeElementName(String s) {
        if (s == null) return "";
        return s.toLowerCase()
            .replaceAll("[^a-z0-9]", "");
    }

    /**
     * Minimal parser for step instructions like:
     * - "enter VALUE in user name"
     * - "type VALUE into email"
     * - "click submitButton"
     * - "select US from countryDropdown"
     * - "hover menu"
     */
    private static class ParsedStep {
        final String action;
        final String elementName;
        final String value;

        private ParsedStep(String action, String elementName, String value) {
            this.action = action;
            this.elementName = elementName;
            this.value = value;
        }

        static ParsedStep parse(String instruction) {
            if (instruction == null) return null;
            String raw = instruction.trim();
            String lower = raw.toLowerCase();

            // click X
            if (lower.startsWith("click ")) {
                return new ParsedStep("click", raw.substring(6).trim(), null);
            }
            // hover X
            if (lower.startsWith("hover ")) {
                return new ParsedStep("hover", raw.substring(6).trim(), null);
            }
            // press KEY
            if (lower.startsWith("press ")) {
                return new ParsedStep("press_key", null, raw.substring(6).trim());
            }

            // enter VALUE in ELEMENT
            // type VALUE into ELEMENT
            String[] fillKeywords = {"enter ", "type ", "fill "};
            for (String kw : fillKeywords) {
                if (lower.startsWith(kw)) {
                    String rest = raw.substring(kw.length()).trim();
                    String splitToken = null;
                    if (rest.toLowerCase().contains(" in ")) splitToken = " in ";
                    else if (rest.toLowerCase().contains(" into ")) splitToken = " into ";
                    if (splitToken == null) return null;
                    int idx = rest.toLowerCase().lastIndexOf(splitToken);
                    String val = rest.substring(0, idx).trim();
                    String el = rest.substring(idx + splitToken.length()).trim();
                    val = stripQuotes(val);
                    return new ParsedStep("fill", el, val);
                }
            }

            // select VALUE from ELEMENT / select VALUE in ELEMENT
            if (lower.startsWith("select ")) {
                String rest = raw.substring(7).trim();
                String splitToken = null;
                if (rest.toLowerCase().contains(" from ")) splitToken = " from ";
                else if (rest.toLowerCase().contains(" in ")) splitToken = " in ";
                if (splitToken == null) return null;
                int idx = rest.toLowerCase().lastIndexOf(splitToken);
                String val = stripQuotes(rest.substring(0, idx).trim());
                String el = rest.substring(idx + splitToken.length()).trim();
                return new ParsedStep("select_by_value", el, val);
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

    private static String formatValueForLogs(String elementName, String value) {
        if (value == null) return "null";
        String el = elementName == null ? "" : elementName.toLowerCase();
        boolean sensitive = el.contains("password") || el.contains("passwd") || el.contains("passcode") || el.contains("secret") || el.contains("token");
        if (sensitive) return "\"***\"";
        String v = value;
        if (v.length() > LOG_VALUE_MAX_CHARS) {
            v = v.substring(0, LOG_VALUE_MAX_CHARS) + "...(+" + (value.length() - LOG_VALUE_MAX_CHARS) + " chars)";
        }
        // quote for clarity, escape newlines
        v = v.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
        return "\"" + v + "\"";
    }
    
    private void updateRunStatus(String runId) {
        Run run = runRepository.findById(runId).orElse(null);
        if (run == null) return;
        
        List<TestRun> testRuns = testRunRepository.findByBatchId(runId);
        if (testRuns.isEmpty()) {
            run.setStatus("cancelled");
        } else if (testRuns.stream().anyMatch(tr -> "running".equals(tr.getStatus()))) {
            run.setStatus("running");
        } else if (testRuns.stream().anyMatch(tr -> "failed".equals(tr.getStatus()))) {
            run.setStatus("failed");
        } else if (testRuns.stream().allMatch(tr -> "passed".equals(tr.getStatus()))) {
            run.setStatus("passed");
            run.setCompletedAt(LocalDateTime.now());
        } else {
            run.setStatus("cancelled");
        }
        
        runRepository.save(run);
    }
    
    @SuppressWarnings("unchecked")
    private StepResult executeStepWithAI(TestStep step, TestRun testRun, Test test) {
        StepResult result = new StepResult();
        result.setTestRunId(testRun.getId());
        result.setStepNumber(step.getOrder());
        result.setInstruction(step.getInstruction());
        result.setExecutedAt(LocalDateTime.now());
        
        long stepStart = System.currentTimeMillis();
        
        try {
            log.info("[AI] Reading step: testId={} runId={} stepOrder={} instruction='{}'",
                test.getId(), testRun.getId(), step.getOrder(), step.getInstruction());
            // Validate that step instruction doesn't contain URLs
            if (containsUrl(step.getInstruction())) {
                log.warn("Step instruction contains a URL: {}", step.getInstruction());
                result.setStatus("failed");
                result.setErrorMessage("Step instructions should not contain URLs. Configure the App URL in test settings instead.");
                result.setDuration(System.currentTimeMillis() - stepStart);
                return result;
            }
            
            // Reload testRun to ensure we have the latest variables from database
            String testRunId = testRun.getId();
            TestRun reloadedTestRun = testRunRepository.findById(testRunId)
                .orElseThrow(() -> new RuntimeException("TestRun not found: " + testRunId));
            
            // Get current variables from test run
            Map<String, Object> variables = reloadedTestRun.getVariables();
            if (variables == null) {
                variables = new HashMap<>();
            }
            
            // Use AI service to interpret and execute the step via MCP with variables and app context
            log.info("Executing step via AI+MCP: {}", step.getInstruction());
            if (!variables.isEmpty()) {
                log.info("Step has {} variables available: {}", variables.size(), variables.keySet());
                log.debug("Variables map: {}", variables);
            } else {
                log.warn("No variables available for step. TestRun variablesJson: {}", reloadedTestRun.getVariablesJson());
            }
            
            // Pass app URL and app type from test to AI service
            String appUrl = test.getAppUrl();
            String appType = test.getAppType();
            
            Map<String, Object> executionResult = aiTestExecutionService.executeStepWithAI(
                    step.getInstruction(), 
                    "", // No page content available since we're using external MCP
                    variables,
                    appUrl,
                    appType
            );
            
            // --- Robust check: Ensure intended goal of step was achieved ---
            String status = (String) executionResult.get("status");
            boolean isNavigationStep = step.getInstruction().trim().toLowerCase().startsWith("navigate");
            // boolean actionPerformed = false; // No longer used
            boolean nonNavActionSucceeded = false;
            // Check agent execution log for actions
            // Object execLogObj = executionResult.get("agentExecutionLog"); // No longer used
            // If not present, try to get from aiTestExecutionService (for backward compatibility)
            java.util.List<com.youraitester.agent.AgentExecutor.ToolExecutionLog> execLog = null;
            if (executionResult.containsKey("agentExecutionLog")) {
                execLog = (java.util.List<com.youraitester.agent.AgentExecutor.ToolExecutionLog>) executionResult.get("agentExecutionLog");
            } else if (aiTestExecutionService instanceof com.youraitester.service.AiTestExecutionService) {
                // Not available in result, try to get from agentExecutor (not ideal, but fallback)
                // (This branch is for future extensibility)
            }
            if (execLog == null && executionResult.containsKey("executionLog")) {
                execLog = (java.util.List<com.youraitester.agent.AgentExecutor.ToolExecutionLog>) executionResult.get("executionLog");
            }
            if (execLog == null) {
                // Not available, fallback to status only
                log.warn("No agent execution log found for step. Falling back to status only.");
                if ("success".equals(status)) {
                    result.setStatus("passed");
                } else {
                    result.setStatus("failed");
                    String errorMsg = executionResult.containsKey("message") 
                        ? executionResult.get("message").toString()
                        : "Step execution failed";
                    result.setErrorMessage(errorMsg);
                    log.warn("Step failed: {}", errorMsg);
                }
            } else {
                // Analyze execution log for intended actions
                for (com.youraitester.agent.AgentExecutor.ToolExecutionLog logEntry : execLog) {
                    String tool = logEntry.getToolName();
                    String toolResult = logEntry.getResult();
                    
                    // Check if this tool execution succeeded
                    // A tool succeeds if it has a result and doesn't contain error indicators
                    boolean success = toolResult != null && 
                                      !toolResult.toLowerCase().contains("error") && 
                                      !toolResult.toLowerCase().contains("failed") &&
                                      !toolResult.toLowerCase().contains("timeout");
                    
                    // Also check for explicit success indicators
                    if (toolResult != null) {
                        String lowerResult = toolResult.toLowerCase();
                        if (lowerResult.contains("clicked") || 
                            lowerResult.contains("typed") || 
                            lowerResult.contains("selected") || 
                            lowerResult.contains("success")) {
                            success = true;
                        }
                    }
                    
                    if (!"navigate".equalsIgnoreCase(tool) && success) {
                        nonNavActionSucceeded = true;
                        log.info("Detected successful non-navigation action: {} with result: {}", tool, toolResult);
                    }
                }
                
                // Check agent's final message for failure indicators (for verification/counting/sorting steps)
                // The agent may report a verification failure in its message even if tools executed successfully
                boolean agentReportedFailure = false;
                if (executionResult.containsKey("message")) {
                    String agentMessage = executionResult.get("message").toString().toLowerCase();
                    if (agentMessage.contains("failed") || 
                        agentMessage.contains("not found") ||
                        agentMessage.contains("expected") && agentMessage.contains("but found") ||
                        agentMessage.contains("mismatch") ||
                        agentMessage.contains("incorrect") ||
                        agentMessage.contains("does not match") ||
                        agentMessage.contains("verification failed") ||
                        agentMessage.contains("not sorted") ||
                        agentMessage.contains("out of order") ||
                        agentMessage.contains("wrong order") ||
                        // Agent unable to complete the task
                        agentMessage.contains("does not contain") && (agentMessage.contains("need to") || agentMessage.contains("i need")) ||
                        agentMessage.contains("cannot") && (agentMessage.contains("interact") || agentMessage.contains("perform") || agentMessage.contains("proceed")) ||
                        agentMessage.contains("to proceed, i need") ||
                        agentMessage.contains("unable to find") ||
                        agentMessage.contains("could not find") ||
                        agentMessage.contains("no visible elements") ||
                        agentMessage.contains("not visible") && agentMessage.contains("cannot") ||
                        agentMessage.contains("i need to navigate") ||
                        agentMessage.contains("please provide") && agentMessage.contains("url") ||
                        // Bot detection / access blocked
                        agentMessage.contains("blocked") || 
                        agentMessage.contains("bot detection") ||
                        agentMessage.contains("access denied") ||
                        agentMessage.contains("unfortunately") && agentMessage.contains("cannot") ||
                        agentMessage.contains("security measure") ||
                        agentMessage.contains("rate limit") ||
                        agentMessage.contains("captcha") ||
                        // Explicit failure statements
                        agentMessage.contains("there's no way to") ||
                        agentMessage.contains("i cannot proceed") ||
                        agentMessage.contains("cannot access")) {
                        agentReportedFailure = true;
                        log.warn("Agent reported failure or inability to complete in message: {}", executionResult.get("message"));
                    }
                }
                
                if (isNavigationStep) {
                    // Navigation step: pass if navigation succeeded (status success)
                    if ("success".equals(status)) {
                        result.setStatus("passed");
                    } else {
                        result.setStatus("failed");
                        String errorMsg = executionResult.containsKey("message") 
                            ? executionResult.get("message").toString()
                            : "Navigation failed";
                        result.setErrorMessage(errorMsg);
                        log.warn("Navigation step failed: {}", errorMsg);
                    }
                } else {
                    // Non-navigation step: check both tool execution AND agent's message
                    if (agentReportedFailure) {
                        // Agent explicitly reported a failure (e.g., count mismatch, verification failed)
                        result.setStatus("failed");
                        String errorMsg = executionResult.containsKey("message") 
                            ? executionResult.get("message").toString()
                            : "Agent reported verification failure";
                        result.setErrorMessage(errorMsg);
                        log.warn("Step failed: {}", errorMsg);
                    } else if (nonNavActionSucceeded) {
                        // Tools succeeded and agent didn't report failure
                        result.setStatus("passed");
                        log.info("Step passed: At least one intended action was successfully performed");
                    } else {
                        result.setStatus("failed");
                        String errorMsg = "No intended actions were successfully performed for this step.";
                        if (executionResult.containsKey("message")) {
                            errorMsg += " Details: " + executionResult.get("message");
                        }
                        result.setErrorMessage(errorMsg);
                        log.warn("Step failed: {}", errorMsg);
                    }
                }
            }
            
            // Screenshot URL if available
            if (executionResult.containsKey("screenshotUrl")) {
                String screenshotUrl = executionResult.get("screenshotUrl").toString();
                result.setScreenshotUrl(screenshotUrl);
                log.info("Screenshot URL set on step result: {}", screenshotUrl);
            } else {
                log.warn("No screenshot URL in execution result. Available keys: {}", executionResult.keySet());
            }
            
            // Extract variables from execution result
            if (executionResult.containsKey("extractedVariables")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> extractedVars = (Map<String, Object>) executionResult.get("extractedVariables");
                result.setExtractedVariables(extractedVars);
                if (!extractedVars.isEmpty()) {
                    log.info("Step extracted {} variables: {}", extractedVars.size(), extractedVars.keySet());
                }
            }
            
        } catch (Exception e) {
            log.error("Step execution failed", e);
            result.setStatus("failed");
            result.setErrorMessage(e.getMessage());
        }
        
        result.setDuration(System.currentTimeMillis() - stepStart);
        return result;
    }

    @SuppressWarnings("unchecked")
    private StepResult executeStepWithAISession(TestStep step, TestRun testRun, Test test, AgentExecutor.AgentSession session, int stepIndex) {
        StepResult result = new StepResult();
        result.setTestRunId(testRun.getId());
        // Ensure stepNumber is always present and stable for UI ordering.
        // Prefer the stored step order if available; otherwise fall back to iteration index (1-based).
        Integer stepNumber = step.getOrder() != null ? step.getOrder() : (stepIndex + 1);
        result.setStepNumber(stepNumber);
        result.setInstruction(step.getInstruction());
        result.setExecutedAt(LocalDateTime.now());

        long stepStart = System.currentTimeMillis();

        try {
            if (containsUrl(step.getInstruction())) {
                log.warn("Step instruction contains a URL: {}", step.getInstruction());
                result.setStatus("failed");
                result.setErrorMessage("Step instructions should not contain URLs. Configure the App URL in test settings instead.");
                result.setDuration(System.currentTimeMillis() - stepStart);
                return result;
            }

            // Reload testRun for freshest vars
            TestRun reloadedTestRun = testRunRepository.findById(testRun.getId())
                .orElseThrow(() -> new RuntimeException("TestRun not found: " + testRun.getId()));

            Map<String, Object> variables = reloadedTestRun.getVariables();
            if (variables == null) variables = new HashMap<>();

            log.info("Executing step via AI+MCP (session): {}", step.getInstruction());

            // Option (a): first attempt without allowing snapshot tool
            Map<String, Object> executionResult = aiTestExecutionService.executeStepWithAI(
                session,
                step.getInstruction(),
                "",
                variables,
                false
            );

            if ("need_snapshot".equals(executionResult.get("status"))) {
                // Now allow snapshot to proceed for this step
                executionResult = aiTestExecutionService.executeStepWithAI(
                    session,
                    step.getInstruction(),
                    "",
                    variables,
                    true
                );
            }

            String status = (String) executionResult.get("status");
            if ("success".equals(status)) {
                result.setStatus("passed");
                if (executionResult.containsKey("extractedVariables")) {
                    result.setExtractedVariables((Map<String, Object>) executionResult.get("extractedVariables"));
                }
            } else {
                result.setStatus("failed");
                String errorMsg = executionResult.containsKey("message")
                    ? executionResult.get("message").toString()
                    : "Step execution failed";
                result.setErrorMessage(errorMsg);
                log.warn("Step failed: {}", errorMsg);
            }

            // Screenshot URL if available
            if (executionResult.containsKey("screenshotUrl")) {
                String screenshotUrl = executionResult.get("screenshotUrl").toString();
                result.setScreenshotUrl(screenshotUrl);
                log.info("Screenshot URL set on step result: {}", screenshotUrl);
            }

        } catch (Exception e) {
            log.error("Session step execution failed", e);
            result.setStatus("failed");
            result.setErrorMessage("Step execution failed: " + e.getMessage());
        } finally {
            result.setDuration(System.currentTimeMillis() - stepStart);
        }

        return result;
    }
    
    /**
     * Load dataset row data from JSON string
     * Expected format: {"columns": ["col1", "col2"], "data": [{"col1": "val1", "col2": "val2"}, ...]}
     * Or simpler format: [{"col1": "val1", "col2": "val2"}, ...]
     * Or frontend format: {"dataset_columns": [...], "dataset": [...]}
     */
    private Map<String, Object> loadDatasetRow(String datasetJson, Integer rowIndex) {
        try {
            if (datasetJson == null || datasetJson.trim().isEmpty()) {
                log.debug("Dataset JSON is null or empty");
                return null;
            }
            
            log.debug("Parsing dataset JSON (length: {}): {}", datasetJson.length(), datasetJson.substring(0, Math.min(200, datasetJson.length())));
            
            // Try parsing as Map first
            try {
                Map<String, Object> datasetMap = objectMapper.readValue(datasetJson, new TypeReference<Map<String, Object>>() {});
                
                // Handle different JSON structures
                List<Map<String, Object>> rows = null;
                if (datasetMap.containsKey("data") && datasetMap.get("data") instanceof List) {
                    // Format: {"columns": [...], "data": [...]}
                    rows = (List<Map<String, Object>>) datasetMap.get("data");
                    log.debug("Found dataset in 'data' field with {} rows", rows.size());
                } else if (datasetMap.containsKey("dataset") && datasetMap.get("dataset") instanceof List) {
                    // Format: {"dataset_columns": [...], "dataset": [...]}
                    rows = (List<Map<String, Object>>) datasetMap.get("dataset");
                    log.debug("Found dataset in 'dataset' field with {} rows", rows.size());
                }
                
                if (rows != null && !rows.isEmpty()) {
                    if (rowIndex < 0 || rowIndex >= rows.size()) {
                        log.warn("Row index {} is out of bounds (dataset has {} rows)", rowIndex, rows.size());
                        return null;
                    }
                    
                    Map<String, Object> row = rows.get(rowIndex);
                    log.info("Loaded dataset row {}: {}", rowIndex, row);
                    return new HashMap<>(row); // Return a copy
                }
            } catch (Exception e) {
                log.debug("Failed to parse as Map, trying as List: {}", e.getMessage());
            }
            
            // Try parsing as direct array
            List<?> directList = objectMapper.readValue(datasetJson, new TypeReference<List<?>>() {});
            if (directList != null && !directList.isEmpty() && directList.get(0) instanceof Map) {
                List<Map<String, Object>> rows = (List<Map<String, Object>>) (List<?>) directList;
                log.debug("Found dataset as direct array with {} rows", rows.size());
                
                if (rowIndex < 0 || rowIndex >= rows.size()) {
                    log.warn("Row index {} is out of bounds (dataset has {} rows)", rowIndex, rows.size());
                    return null;
                }
                
                Map<String, Object> row = rows.get(rowIndex);
                log.info("Loaded dataset row {}: {}", rowIndex, row);
                return new HashMap<>(row); // Return a copy
            }
            
            log.warn("Unexpected dataset JSON format - could not parse as Map or List");
            return null;
            
        } catch (Exception e) {
            log.error("Failed to parse dataset JSON: {}", e.getMessage(), e);
            return null;
        }
    }
    
    private void executeModuleSteps(TestStep moduleStep, TestRun testRun, Test test) {
        log.info("Executing module step: {}", moduleStep.getInstruction());
        
        // Load the module
        Module module = moduleRepository.findById(moduleStep.getModuleId())
                .orElseThrow(() -> new RuntimeException("Module not found: " + moduleStep.getModuleId()));
        
        log.info("Expanding module '{}' with {} steps", module.getName(), module.getSteps().size());
        
        // Execute each step in the module
        for (ModuleStep modStep : module.getSteps()) {
            // Create a TestStep from the ModuleStep
            TestStep expandedStep = new TestStep();
            expandedStep.setInstruction(modStep.getInstruction());
            expandedStep.setOrder(modStep.getOrder());
            
            StepResult stepResult = executeStepWithAI(expandedStep, testRun, test);
            stepResultRepository.save(stepResult);
            
            if ("failed".equals(stepResult.getStatus())) {
                testRun.setStatus("failed");
                testRun.setErrorMessage("Module step failed: " + stepResult.getErrorMessage());
                break;
            }
        }
    }
    
    /**
     * Check if a string contains a URL (http:// or https://)
     */
    private boolean containsUrl(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        // Simple regex to detect http:// or https://
        return text.matches(".*https?://.*");
    }
}
