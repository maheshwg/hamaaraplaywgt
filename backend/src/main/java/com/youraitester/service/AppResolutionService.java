package com.youraitester.service;

import com.youraitester.model.app.App;
import com.youraitester.repository.app.AppRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Resolves an App from a test URL by checking which App.name appears in the URL.
 *
 * IMPORTANT:
 * A single host can contain multiple "apps" (e.g. blogspot site name in hostname + page name in path).
 * So we prefer matches in the URL PATH (especially near the end) over matches in the hostname.
 */
@Service
@RequiredArgsConstructor
public class AppResolutionService {

    private final AppRepository appRepository;

    public Optional<App> resolveAppFromUrl(String url) {
        if (url == null || url.isBlank()) return Optional.empty();
        String raw = url.trim();
        String u = raw.toLowerCase(Locale.ROOT);

        String host = "";
        String path = "";
        try {
            URI uri = URI.create(raw);
            host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
            path = uri.getPath() != null ? uri.getPath().toLowerCase(Locale.ROOT) : "";
        } catch (Exception ignored) {
            // Fall back to substring matching on the whole URL
        }

        final String hostFinal = host;
        final String pathFinal = path;

        List<App> apps = appRepository.findAll();
        return apps.stream()
            .filter(a -> a != null && a.getName() != null && !a.getName().isBlank())
            .map(a -> score(a, u, hostFinal, pathFinal))
            .filter(m -> m.found)
            .sorted(Comparator
                // smaller score wins
                .comparingInt((Match m) -> m.score)
                // ties: prefer longer name (more specific), then lower appId
                .thenComparing((Match m) -> m.app.getName().length(), Comparator.reverseOrder())
                .thenComparing(m -> m.app.getId() == null ? Long.MAX_VALUE : m.app.getId())
            )
            .map(m -> m.app)
            .findFirst();
    }

    private static class Match {
        final App app;
        final boolean found;
        final int score;
        Match(App app, boolean found, int score) { this.app = app; this.found = found; this.score = score; }
    }

    private Match score(App app, String fullUrlLower, String hostLower, String pathLower) {
        String name = app.getName().toLowerCase(Locale.ROOT);
        int inFull = fullUrlLower.indexOf(name);
        if (inFull < 0) return new Match(app, false, Integer.MAX_VALUE);

        int inPath = (pathLower != null && !pathLower.isBlank()) ? pathLower.indexOf(name) : -1;
        int inHost = (hostLower != null && !hostLower.isBlank()) ? hostLower.indexOf(name) : -1;

        // Prefer a PATH match closest to the end of the path (often the page identifier).
        if (inPath >= 0 && pathLower != null) {
            int distanceFromEnd = Math.max(0, pathLower.length() - inPath);
            // base 0-999 reserved for path matches
            return new Match(app, true, 0 + distanceFromEnd);
        }

        // Next best: any other match in full URL, but avoid letting hostname-only matches dominate.
        if (inHost >= 0) {
            // base 2000+ for host matches so they lose to path matches
            return new Match(app, true, 2000 + inHost);
        }

        // Fallback: match somewhere else in URL (query, fragment, etc.)
        return new Match(app, true, 5000 + inFull);
    }
}


