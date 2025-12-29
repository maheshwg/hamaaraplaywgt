package com.youraitester.service;

import com.youraitester.model.app.App;
import com.youraitester.repository.app.AppRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Resolves an App from a test URL by checking which App.name appears in the URL.
 *
 * Rule: choose the app whose name appears earliest in the URL (case-insensitive).
 * Ties: prefer longer name (more specific), then lower appId.
 */
@Service
@RequiredArgsConstructor
public class AppResolutionService {

    private final AppRepository appRepository;

    public Optional<App> resolveAppFromUrl(String url) {
        if (url == null || url.isBlank()) return Optional.empty();
        String u = url.toLowerCase(Locale.ROOT);

        List<App> apps = appRepository.findAll();
        return apps.stream()
            .filter(a -> a != null && a.getName() != null && !a.getName().isBlank())
            .map(a -> new Match(a, u.indexOf(a.getName().toLowerCase(Locale.ROOT))))
            .filter(m -> m.index >= 0)
            .sorted(Comparator
                .comparingInt((Match m) -> m.index)
                .thenComparing((Match m) -> m.app.getName().length(), Comparator.reverseOrder())
                .thenComparing(m -> m.app.getId() == null ? Long.MAX_VALUE : m.app.getId())
            )
            .map(m -> m.app)
            .findFirst();
    }

    private static class Match {
        final App app;
        final int index;
        Match(App app, int index) { this.app = app; this.index = index; }
    }
}


