package com.youraitester.controller;

import com.youraitester.model.Test;
import com.youraitester.model.TestStep;
import com.youraitester.model.TestDataset;
import com.youraitester.repository.TestRepository;
import com.youraitester.service.AppResolutionService;
import com.youraitester.service.TestStepMappingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class TestController {
    
    private final TestRepository testRepository;
    private final AppResolutionService appResolutionService;
    private final TestStepMappingService testStepMappingService;
    
    @GetMapping
    public ResponseEntity<List<Test>> getAllTests(@RequestParam(value = "projectId", required = false) String projectId) {
        boolean superAdmin = isSuperAdmin();
        if (projectId != null && !projectId.isBlank()) {
            List<Test> tests = testRepository.findByProjectId(projectId);
            return ResponseEntity.ok(sanitizeTestsForResponse(tests, superAdmin));
        }
        List<Test> tests = testRepository.findAll();
        return ResponseEntity.ok(sanitizeTestsForResponse(tests, superAdmin));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Test> getTest(@PathVariable String id) {
        return testRepository.findById(id)
                .map(t -> ResponseEntity.ok(sanitizeTestForResponse(t, isSuperAdmin())))
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Test> createTest(@RequestBody Test test) {
        log.info("Creating test with {} datasets", test.getDatasets() != null ? test.getDatasets().size() : 0);
        // Auto-resolve appId from appUrl if not provided
        if (test.getAppId() == null && test.getAppUrl() != null && !test.getAppUrl().isBlank()) {
            appResolutionService.resolveAppFromUrl(test.getAppUrl()).ifPresent(app -> {
                test.setAppId(app.getId());
                log.info("Resolved appId={} from appUrl='{}' (appName='{}')", app.getId(), test.getAppUrl(), app.getName());
            });
        }
        // Save-time mapping: populate selector/value/type so execution can run without LLM
        try {
            testStepMappingService.mapTestSteps(test);
        } catch (Exception e) {
            log.warn("Save-time step mapping failed for createTest (continuing without mappings). {}", e.getMessage());
        }
        Test saved = testRepository.save(test);
        log.info("Created test with id: {}. Datasets size: {}", saved.getId(), saved.getDatasets() != null ? saved.getDatasets().size() : 0);
        return ResponseEntity.ok(sanitizeTestForResponse(saved, isSuperAdmin()));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Test> updateTest(@PathVariable String id, @RequestBody Test test) {
        Test existing = testRepository.findById(id)
                .orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Merge only non-null fields from the request
        if (test.getName() != null) {
            existing.setName(test.getName());
        }
        if (test.getDescription() != null) {
            existing.setDescription(test.getDescription());
        }
        if (test.getTags() != null) {
            existing.setTags(test.getTags());
        }
        if (test.getSteps() != null) {
            existing.setSteps(test.getSteps());
        }
        // Always update datasets if provided (even if empty array - means clear datasets)
        if (test.getDatasets() != null) {
            log.info("Received datasets in request. Size: {}", test.getDatasets().size());
            // For ElementCollection, we need to clear the existing collection first
            // to ensure proper update (Hibernate doesn't automatically replace ElementCollection)
            if (existing.getDatasets() != null) {
                existing.getDatasets().clear();
            }
            // Set new datasets (even if empty)
            existing.setDatasets(test.getDatasets());
            log.info("Updated test datasets. New size: {}", test.getDatasets().size());
        } else {
            log.info("No datasets in request body - keeping existing datasets");
        }
        if (test.getProjectId() != null) {
            existing.setProjectId(test.getProjectId());
        }
        if (test.getStatus() != null) {
            existing.setStatus(test.getStatus());
        }
        if (test.getRunCount() != null) {
            existing.setRunCount(test.getRunCount());
        }
        if (test.getLastRunDate() != null) {
            existing.setLastRunDate(test.getLastRunDate());
        }
        if (test.getLastRunStatus() != null) {
            existing.setLastRunStatus(test.getLastRunStatus());
        }
        // Update appUrl and appType
        if (test.getAppUrl() != null) {
            existing.setAppUrl(test.getAppUrl());
        }
        if (test.getAppId() != null) {
            existing.setAppId(test.getAppId());
        } else if (test.getAppUrl() != null && !test.getAppUrl().isBlank()) {
            // appUrl changed but caller didn't explicitly set appId -> auto-resolve
            appResolutionService.resolveAppFromUrl(test.getAppUrl()).ifPresent(app -> {
                existing.setAppId(app.getId());
                log.info("Resolved appId={} from updated appUrl='{}' (appName='{}')", app.getId(), test.getAppUrl(), app.getName());
            });
        }
        if (test.getAppType() != null) {
            existing.setAppType(test.getAppType());
        }

        // Save-time mapping: populate selector/value/type so execution can run without LLM.
        // IMPORTANT: Only run mapping when the caller is actually updating steps.
        // Many codepaths (e.g. updating run_count/last_run_status during execution) call updateTest without steps,
        // and we must NOT spend LLM tokens in those cases.
        if (test.getSteps() != null) {
            try {
                testStepMappingService.mapTestSteps(existing);
            } catch (Exception e) {
                log.warn("Save-time step mapping failed for updateTest id={} (continuing without mappings). {}", id, e.getMessage());
            }
        } else {
            log.debug("Skipping save-time step mapping for updateTest id={} because steps were not provided", id);
        }
        
        log.info("Saving test update. Datasets size: {}", existing.getDatasets() != null ? existing.getDatasets().size() : 0);
        Test updated = testRepository.save(existing);
        // Reload to verify datasets were saved
        Test reloaded = testRepository.findById(id).orElse(updated);
        log.info("Test updated. Reloaded datasets size: {}", reloaded.getDatasets() != null ? reloaded.getDatasets().size() : 0);
        return ResponseEntity.ok(sanitizeTestForResponse(reloaded, isSuperAdmin()));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTest(@PathVariable String id) {
        if (!testRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        testRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/copy")
    public ResponseEntity<?> copyTest(@PathVariable String id) {
        log.info("Request to copy test: {}", id);
        
        // Find the original test
        Test original = testRepository.findById(id).orElse(null);
        if (original == null) {
            log.warn("Test not found for copy: {}", id);
            return ResponseEntity.notFound().build();
        }
        
        // Create a copy with a new ID
        Test copy = new Test();
        copy.setName(original.getName() + " (Copy)");
        copy.setDescription(original.getDescription());
        copy.setTags(original.getTags() != null ? List.copyOf(original.getTags()) : null);
        copy.setProjectId(original.getProjectId()); // Keep in same project
        copy.setAppUrl(original.getAppUrl());
        copy.setAppId(original.getAppId());
        copy.setAppType(original.getAppType());
        copy.setStatus("draft"); // New copy starts as draft
        copy.setRunCount(0); // Reset run count
        copy.setLastRunDate(null);
        copy.setLastRunStatus(null);
        copy.setCreatedBy(original.getCreatedBy());
        
        log.info("Copying test - Original appUrl: '{}', Copy appUrl: '{}'", 
            original.getAppUrl(), copy.getAppUrl());
        
        // Deep copy steps
        if (original.getSteps() != null && !original.getSteps().isEmpty()) {
            List<TestStep> copiedSteps = new ArrayList<>();
            for (TestStep step : original.getSteps()) {
                TestStep copiedStep = new TestStep();
                copiedStep.setOrder(step.getOrder());
                copiedStep.setInstruction(step.getInstruction());
                copiedStep.setType(step.getType());
                copiedStep.setSelector(step.getSelector());
                copiedStep.setValue(step.getValue());
                copiedStep.setOptional(step.getOptional());
                copiedStep.setWaitAfter(step.getWaitAfter());
                copiedStep.setModuleId(step.getModuleId());
                copiedSteps.add(copiedStep);
            }
            copy.setSteps(copiedSteps);
        }
        
        // Deep copy datasets
        if (original.getDatasets() != null && !original.getDatasets().isEmpty()) {
            List<TestDataset> copiedDatasets = new ArrayList<>();
            for (TestDataset dataset : original.getDatasets()) {
                TestDataset copiedDataset = new TestDataset();
                copiedDataset.setData(dataset.getData());
                copiedDatasets.add(copiedDataset);
            }
            copy.setDatasets(copiedDatasets);
        }

        // Save-time mapping: ensure copied test has fresh deterministic mappings
        try {
            testStepMappingService.mapTestSteps(copy);
        } catch (Exception e) {
            log.warn("Save-time step mapping failed for copyTest originalId={} (continuing without mappings). {}", id, e.getMessage());
        }
        
        Test saved = testRepository.save(copy);
        log.info("Test copied successfully. Original: {}, Copy: {}, Project: {}", 
            id, saved.getId(), saved.getProjectId());
        
        return ResponseEntity.ok(sanitizeTestForResponse(saved, isSuperAdmin()));
    }

    private boolean isSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private List<Test> sanitizeTestsForResponse(List<Test> tests, boolean isSuperAdmin) {
        if (tests == null) return null;
        if (isSuperAdmin) return tests;
        List<Test> out = new ArrayList<>();
        for (Test t : tests) out.add(sanitizeTestForResponse(t, false));
        return out;
    }

    /**
     * Only SUPER_ADMIN should see mapped fields (type/selector/value) because they are system-generated.
     * Everyone else gets steps without these fields, but the DB still stores them for execution.
     */
    private Test sanitizeTestForResponse(Test t, boolean isSuperAdmin) {
        if (t == null) return null;
        if (isSuperAdmin) return t;

        Test copy = new Test();
        copy.setId(t.getId());
        copy.setName(t.getName());
        copy.setDescription(t.getDescription());
        copy.setTags(t.getTags());
        copy.setSteps(copyStepsWithoutMappings(t.getSteps()));
        copy.setCreatedDate(t.getCreatedDate());
        copy.setModifiedDate(t.getModifiedDate());
        copy.setCreatedBy(t.getCreatedBy());
        copy.setProjectId(t.getProjectId());
        copy.setAppUrl(t.getAppUrl());
        copy.setAppId(t.getAppId());
        copy.setAppType(t.getAppType());
        copy.setStatus(t.getStatus());
        copy.setRunCount(t.getRunCount());
        copy.setLastRunDate(t.getLastRunDate());
        copy.setLastRunStatus(t.getLastRunStatus());
        copy.setDatasets(t.getDatasets());
        return copy;
    }

    private List<TestStep> copyStepsWithoutMappings(List<TestStep> steps) {
        if (steps == null) return null;
        List<TestStep> out = new ArrayList<>();
        for (TestStep s : steps) {
            if (s == null) continue;
            TestStep c = new TestStep();
            c.setInstruction(s.getInstruction());
            c.setOrder(s.getOrder());
            // hide mapped fields:
            c.setType(null);
            c.setSelector(null);
            c.setValue(null);
            c.setOptional(s.getOptional());
            c.setWaitAfter(s.getWaitAfter());
            c.setModuleId(s.getModuleId());
            out.add(c);
        }
        return out;
    }
}
