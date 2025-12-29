package com.youraitester.repository.app;

import com.youraitester.model.app.App;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppRepository extends JpaRepository<App, Long> {
    Optional<App> findByNameIgnoreCase(String name);
}
