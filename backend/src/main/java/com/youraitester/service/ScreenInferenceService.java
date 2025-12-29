package com.youraitester.service;

import com.youraitester.agent.LlmProvider;
import com.youraitester.agent.impl.SimpleMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Uses the configured LLM provider (NO tools) to infer the current screen name
 * from the app summary and steps executed so far.
 *
 * This is intentionally "small": we only want a deterministic choice among known screens.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScreenInferenceService {

    private final Map<String, LlmProvider> providers;

    @Value("${agent.llm.provider:openai}")
    private String providerName;

    public String inferScreenName(String appSummary, List<String> candidateScreenNames, List<String> executedSteps, String lastKnownScreen) {
        if (candidateScreenNames == null || candidateScreenNames.isEmpty()) {
            throw new IllegalArgumentException("candidateScreenNames is empty");
        }

        // If LLM provider isn't available (no API key in env), fall back to deterministic heuristics.
        LlmProvider provider = providers.get(providerName);
        if (provider == null || !provider.isAvailable()) {
            return fallback(candidateScreenNames, lastKnownScreen);
        }

        StringBuilder user = new StringBuilder();
        user.append("Choose the current screen name from the list.\n");
        user.append("Return EXACTLY one screen name from the list and nothing else.\n\n");
        user.append("Known screens: ").append(candidateScreenNames).append("\n");
        if (lastKnownScreen != null && !lastKnownScreen.isBlank()) {
            user.append("Last known screen: ").append(lastKnownScreen).append("\n");
        }
        user.append("\nApp summary:\n");
        user.append(appSummary == null ? "" : appSummary).append("\n\n");
        user.append("Steps executed so far:\n");
        if (executedSteps != null) {
            for (int i = 0; i < executedSteps.size(); i++) {
                user.append(i + 1).append(". ").append(executedSteps.get(i)).append("\n");
            }
        }

        List<LlmProvider.Message> messages = new ArrayList<>();
        messages.add(SimpleMessage.system(
            "You are a strict classifier. Output must be exactly one of the provided screen names. No extra text."
        ));
        messages.add(SimpleMessage.user(user.toString()));

        String out;
        try {
            LlmProvider.AgentResponse resp = provider.executeWithTools(messages, List.of(), 1);
            out = resp != null && resp.getContent() != null ? resp.getContent().trim() : "";
        } catch (Exception e) {
            log.warn("Screen inference LLM call failed ({}). Falling back.", e.getMessage());
            return fallback(candidateScreenNames, lastKnownScreen);
        }

        // Normalize: pick the first line, strip quotes
        if (out.contains("\n")) {
            out = out.substring(0, out.indexOf('\n')).trim();
        }
        out = out.replaceAll("^\"|\"$", "").trim();

        // Validate it's one of the candidates (case-insensitive)
        for (String s : candidateScreenNames) {
            if (s != null && s.equalsIgnoreCase(out)) {
                return s; // return canonical stored name
            }
        }

        log.warn("Screen inference returned '{}', not in candidates {}", out, candidateScreenNames);
        return fallback(candidateScreenNames, lastKnownScreen);
    }

    private String fallback(List<String> candidateScreenNames, String lastKnownScreen) {
        if (lastKnownScreen != null) {
            for (String s : candidateScreenNames) {
                if (s != null && s.equalsIgnoreCase(lastKnownScreen)) return s;
            }
        }
        return candidateScreenNames.get(0);
    }
}


