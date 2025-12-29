package com.youraitester.repository.app;

import com.youraitester.model.app.ActionTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ActionTemplateRepository extends JpaRepository<ActionTemplate, Long> {
    List<ActionTemplate> findByAppId(Long appId);
    @Transactional
    void deleteByAppId(Long appId);
}


