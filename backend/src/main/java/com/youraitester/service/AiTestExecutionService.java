package com.youraitester.service;

import com.youraitester.agent.AgentExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI-powered test execution service
 * Uses generic agent executor with pluggable LLM providers and MCP tools
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiTestExecutionService {
    
    private final AgentExecutor agentExecutor;
    private final ScreenshotStorageService screenshotStorageService;
    
    /**
     * Execute a test step using AI agent + MCP tools
     * The agent can use OpenAI, Claude, or any configured LLM provider
     */
    public Map<String, Object> executeStepWithAI(String instruction, String pageContext) {
        return executeStepWithAI(instruction, pageContext, new HashMap<>(), null, null);
    }
    
    /**
     * Execute a test step using AI agent + MCP tools with variables
     * The agent can use OpenAI, Claude, or any configured LLM provider
     */
    public Map<String, Object> executeStepWithAI(String instruction, String pageContext, Map<String, Object> variables) {
        return executeStepWithAI(instruction, pageContext, variables, null, null);
    }
    
    /**
     * Execute a test step using AI agent + MCP tools with variables and app context
     * The agent can use OpenAI, Claude, or any configured LLM provider
     * App URL and type are used to load app-specific prompt categories
     */
    public Map<String, Object> executeStepWithAI(String instruction, String pageContext, Map<String, Object> variables, String appUrl, String appType) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            log.info("Executing step with AI agent: {}", instruction);
            if (!variables.isEmpty()) {
                log.debug("Step has {} variables available: {}", variables.size(), variables.keySet());
            }
            if (appUrl != null) {
                log.debug("App context - URL: {}, Type: {}", appUrl, appType);
            }
            
            // Use the generic agent executor with variables and app context
            AgentExecutor.AgentExecutionResult executionResult = 
                agentExecutor.execute(instruction, pageContext, variables, appUrl, appType);

            // Always include the agent execution log for robust step analysis
            result.put("agentExecutionLog", executionResult.getExecutionLog());

            if (executionResult.isSuccess()) {
                result.put("status", "success");
                result.put("message", executionResult.getMessage());
                // Add extracted variables to result
                if (!executionResult.getExtractedVariables().isEmpty()) {
                    result.put("extractedVariables", executionResult.getExtractedVariables());
                    log.info("Step extracted {} variables: {}", 
                        executionResult.getExtractedVariables().size(),
                        executionResult.getExtractedVariables().keySet());
                }
            } else {
                result.put("status", "error");
                result.put("message", executionResult.getMessage());
                log.error("Agent execution failed: {}", executionResult.getMessage());
            }
            
            // Add execution log for debugging and extract screenshot URLs (for both success and failure)
            String lastScreenshotUrl = null;
            
            if (!executionResult.getExecutionLog().isEmpty()) {
                log.debug("Agent execution log:");
                
                // Iterate backwards through log entries to find the most recent screenshot URL
                // This ensures we get a screenshot even if the last tool call was getContent() (which doesn't capture screenshots)
                for (int i = executionResult.getExecutionLog().size() - 1; i >= 0; i--) {
                    AgentExecutor.ToolExecutionLog logEntry = executionResult.getExecutionLog().get(i);
                    log.debug("  - {}", logEntry);
                    
                    // Extract screenshot URL if available (automatically captured after page-changing actions)
                    if (logEntry.getScreenshotUrl() != null && !logEntry.getScreenshotUrl().isEmpty()) {
                        // Use the most recent screenshot URL found (iterating backwards)
                        lastScreenshotUrl = logEntry.getScreenshotUrl();
                        log.info("Screenshot available from tool execution: {}", lastScreenshotUrl);
                        break; // Found the most recent screenshot, no need to continue
                    }
                }
            }
            
            // Note: With official Playwright MCP server, screenshots are handled automatically by the agent
            // via the browser_take_screenshot tool. No need for fallback screenshot logic here.
            if (lastScreenshotUrl == null || lastScreenshotUrl.isEmpty()) {
                log.debug("No screenshot captured during this step execution");
            }
            
            // Use the screenshot URL (either from tool execution or fallback)
            if (lastScreenshotUrl != null && !lastScreenshotUrl.isEmpty()) {
                result.put("screenshotUrl", lastScreenshotUrl);
                log.info("Added screenshot URL to result: {}", lastScreenshotUrl);
            } else {
                log.warn("No screenshot captured for this step. Execution log has {} entries.", 
                    executionResult.getExecutionLog() != null ? executionResult.getExecutionLog().size() : 0);
                // Log all tool calls for debugging
                if (executionResult.getExecutionLog() != null) {
                    for (int i = 0; i < executionResult.getExecutionLog().size(); i++) {
                        AgentExecutor.ToolExecutionLog logEntry = executionResult.getExecutionLog().get(i);
                        log.debug("Tool call {}: {} - Screenshot: {}", i, logEntry.getToolName(), logEntry.getScreenshotUrl());
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("Error executing step with AI agent", e);
            result.put("status", "error");
            result.put("message", "Agent execution error: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * Start a per-test agent session that keeps conversation history (including the latest snapshot) across steps.
     * The first user message is a full test plan so truncation always retains it.
     */
    public AgentExecutor.AgentSession startAgentTestSession(String fullTestPlan,
                                                            String pageContext,
                                                            Map<String, Object> variables,
                                                            String appUrl,
                                                            String appType) {
        return agentExecutor.startTestSession(fullTestPlan, pageContext, variables, appUrl, appType);
    }

    /**
     * Execute a single step within an existing agent session.
     * If allowSnapshot=false and the agent cannot proceed, it will return status=need_snapshot.
     */
    public Map<String, Object> executeStepWithAI(AgentExecutor.AgentSession session,
                                                 String instruction,
                                                 String pageContext,
                                                 Map<String, Object> variables,
                                                 boolean allowSnapshot) {
        Map<String, Object> result = new HashMap<>();
        try {
            AgentExecutor.AgentExecutionResult executionResult =
                session.executeStep(instruction, pageContext, variables, allowSnapshot);

            result.put("agentExecutionLog", executionResult.getExecutionLog());

            if (!executionResult.isSuccess() && "NEED_SNAPSHOT".equalsIgnoreCase(executionResult.getMessage() != null ? executionResult.getMessage().trim() : "")) {
                result.put("status", "need_snapshot");
                result.put("message", "Agent requested a new snapshot to proceed");
                return result;
            }

            if (executionResult.isSuccess()) {
                result.put("status", "success");
                result.put("message", executionResult.getMessage());
                if (!executionResult.getExtractedVariables().isEmpty()) {
                    result.put("extractedVariables", executionResult.getExtractedVariables());
                }
            } else {
                result.put("status", "error");
                result.put("message", executionResult.getMessage());
            }

            // Extract screenshot URL from the execution log (same behavior as non-session mode)
            String lastScreenshotUrl = null;
            if (executionResult.getExecutionLog() != null && !executionResult.getExecutionLog().isEmpty()) {
                for (int i = executionResult.getExecutionLog().size() - 1; i >= 0; i--) {
                    AgentExecutor.ToolExecutionLog logEntry = executionResult.getExecutionLog().get(i);
                    if (logEntry.getScreenshotUrl() != null && !logEntry.getScreenshotUrl().isEmpty()) {
                        lastScreenshotUrl = logEntry.getScreenshotUrl();
                        break;
                    }
                }
            }
            if (lastScreenshotUrl != null && !lastScreenshotUrl.isEmpty()) {
                result.put("screenshotUrl", lastScreenshotUrl);
            }
        } catch (Exception e) {
            log.error("Error executing step with AI agent session", e);
            result.put("status", "error");
            result.put("message", "Agent execution error: " + e.getMessage());
        }
        return result;
    }

    /**
     * Batch-execute multiple ordered steps from the CURRENT snapshot (no new snapshot tool allowed).
     * Returns:
     * - status=success, executedStepNumbers=[...]
     * - status=need_snapshot if the model indicates it needs fresh page info
     * - status=error for other failures
     */
    public Map<String, Object> executeBatchWithAI(AgentExecutor.AgentSession session,
                                                  List<com.youraitester.model.TestStep> orderedSteps,
                                                  Map<String, Object> variables) {
        Map<String, Object> result = new HashMap<>();
        try {
            log.info("Executing batch with AI agent session: {} candidate steps", orderedSteps != null ? orderedSteps.size() : 0);
            AgentExecutor.BatchResult batch = session.executeBatch(orderedSteps, variables);
            AgentExecutor.AgentExecutionResult exec = batch.getAgentResult();

            result.put("agentExecutionLog", exec.getExecutionLog());
            result.put("executedStepNumbers", batch.getExecutedStepNumbers());
            result.put("stepOutcomes", batch.getStepOutcomes());
            result.put("stepScreenshotUrls", batch.getStepScreenshotUrls());

            // Include screenshot URL if any tool captured it
            String lastScreenshotUrl = null;
            if (exec.getExecutionLog() != null && !exec.getExecutionLog().isEmpty()) {
                for (int i = exec.getExecutionLog().size() - 1; i >= 0; i--) {
                    AgentExecutor.ToolExecutionLog logEntry = exec.getExecutionLog().get(i);
                    if (logEntry.getScreenshotUrl() != null && !logEntry.getScreenshotUrl().isEmpty()) {
                        lastScreenshotUrl = logEntry.getScreenshotUrl();
                        break;
                    }
                }
            }
            if (lastScreenshotUrl != null) {
                result.put("screenshotUrl", lastScreenshotUrl);
            }

            if (batch.isNeedsSnapshot()) {
                result.put("status", "need_snapshot");
                result.put("message", "Batch needs a fresh snapshot");
                return result;
            }

            if (exec.isSuccess()) {
                result.put("status", "success");
                result.put("message", exec.getMessage());
                if (exec.getExtractedVariables() != null && !exec.getExtractedVariables().isEmpty()) {
                    result.put("extractedVariables", exec.getExtractedVariables());
                }
            } else {
                result.put("status", "error");
                result.put("message", exec.getMessage());
            }
        } catch (Exception e) {
            log.error("Error executing batch with AI agent session", e);
            result.put("status", "error");
            result.put("message", "Agent batch execution error: " + e.getMessage());
        }
        return result;
    }
}
