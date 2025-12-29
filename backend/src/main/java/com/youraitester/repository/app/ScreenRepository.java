package com.youraitester.repository.app;

import com.youraitester.model.app.Screen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ScreenRepository extends JpaRepository<Screen, Long> {
    Optional<Screen> findByApp_IdAndName(Long appId, String name);
}
