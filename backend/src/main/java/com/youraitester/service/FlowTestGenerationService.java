package com.youraitester.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.youraitester.agent.LlmProvider;
import com.youraitester.agent.impl.SimpleMessage;
import com.youraitester.model.app.App;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Authoring-time helper: generate a draft test (name + English steps) from a natural-language flow.
 *
 * IMPORTANT:
 * - Uses ONLY App.info (no screens/elements/method registry) per user request.
 * - Produces instructions only (no selectors). Mapping remains a separate save-time step.
 * - This is not used during test execution.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FlowTestGenerationService {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, LlmProvider> providers;

    @Value("${agent.llm.provider:openai}")
    private String providerName;

    @Value("${flow.generation.llm.enabled:true}")
    private boolean enabled;

    public GeneratedDraft generateDraft(App app, String flowText) {
        if (!enabled) {
            throw new IllegalStateException("Flow generation is disabled (flow.generation.llm.enabled=false)");
        }
        if (app == null) throw new IllegalArgumentException("app is required");
        if (flowText == null || flowText.trim().isBlank()) throw new IllegalArgumentException("flowText is required");

        LlmProvider provider = providers != null ? providers.get(providerName) : null;
        if (provider == null || !provider.isAvailable()) {
            throw new IllegalStateException("LLM provider not available: " + providerName);
        }

        String appInfo = app.getInfo() != null ? app.getInfo().trim() : "";
        if (appInfo.isBlank()) {
            // Still allow generation, but warn: output will be generic.
            log.warn("[FLOW] App has empty info. Generation will be generic. appId={} appName='{}'",
                app.getId(), app.getName());
        }

        String system = """
You are an expert QA automation engineer.
Your task: generate a draft test from a user's flow description.

Rules:
- Use ONLY the provided APP_INFO to ground assumptions. Do NOT invent specific selectors, element IDs, or screen names.
- Output MUST be valid JSON only (no markdown, no prose).
- Output schema:
  {
    "testName": "string",
    "steps": [
      { "instruction": "string" }
    ]
  }
- Steps must be clear and editable by a human.
- Prefer single-action steps.
- Use {{var}} syntax for variables when the flow implies "any X" or values the user might provide later.
  Example: capture product name into {{product1}}.
- Keep it concise: 6 to 12 steps unless the flow truly requires more.
- If login is likely required based on APP_INFO, include it; otherwise keep login optional in wording.
""";

        String user = "APP_INFO:\n" + appInfo + "\n\nUSER_FLOW:\n" + flowText.trim();

        List<LlmProvider.Message> messages = new ArrayList<>();
        messages.add(SimpleMessage.system(system));
        messages.add(SimpleMessage.user(user));

        // No tools needed; one-shot response.
        LlmProvider.AgentResponse resp = provider.executeWithTools(messages, List.of(), 1);
        String content = resp != null ? resp.getContent() : null;
        if (content == null || content.isBlank()) {
            throw new IllegalStateException("LLM returned empty response for flow generation");
        }

        GeneratedDraft draft = parseDraftJson(content);
        if (draft.steps == null || draft.steps.isEmpty()) {
            throw new IllegalStateException("LLM returned no steps");
        }
        // Normalize: trim instructions and drop empties
        List<GeneratedStep> cleaned = new ArrayList<>();
        for (GeneratedStep s : draft.steps) {
            if (s == null || s.instruction == null) continue;
            String instr = s.instruction.trim();
            if (instr.isBlank()) continue;
            cleaned.add(new GeneratedStep(instr));
        }
        draft.steps = cleaned;

        // Default name if missing
        if (draft.testName == null || draft.testName.trim().isBlank()) {
            String base = flowText.trim();
            String shortName = base.length() > 60 ? base.substring(0, 60) + "…" : base;
            draft.testName = "Generated: " + shortName;
        } else {
            draft.testName = draft.testName.trim();
        }

        return draft;
    }

    private GeneratedDraft parseDraftJson(String raw) {
        String s = raw.trim();
        // Some providers may wrap JSON in extra text; best-effort extract first {...} block.
        if (!s.startsWith("{")) {
            int start = s.indexOf('{');
            int end = s.lastIndexOf('}');
            if (start >= 0 && end > start) {
                s = s.substring(start, end + 1).trim();
            }
        }
        try {
            JsonNode node = objectMapper.readTree(s);
            String testName = node.hasNonNull("testName") ? node.get("testName").asText() : null;
            List<GeneratedStep> steps = new ArrayList<>();
            JsonNode arr = node.get("steps");
            if (arr != null && arr.isArray()) {
                for (JsonNode st : arr) {
                    String instr = st != null && st.hasNonNull("instruction") ? st.get("instruction").asText() : null;
                    if (instr != null) steps.add(new GeneratedStep(instr));
                }
            }
            return new GeneratedDraft(testName, steps);
        } catch (Exception e) {
            log.warn("[FLOW] Failed to parse LLM JSON. rawPrefix='{}' err={}",
                raw.length() > 300 ? raw.substring(0, 300) : raw,
                e.getMessage());
            throw new IllegalStateException("Failed to parse LLM JSON for flow generation: " + e.getMessage(), e);
        }
    }

    public static class GeneratedDraft {
        public String testName;
        public List<GeneratedStep> steps;
        public GeneratedDraft() {}
        public GeneratedDraft(String testName, List<GeneratedStep> steps) {
            this.testName = testName;
            this.steps = steps;
        }
    }

    public static class GeneratedStep {
        public String instruction;
        public GeneratedStep() {}
        public GeneratedStep(String instruction) {
            this.instruction = instruction;
        }
    }
}


