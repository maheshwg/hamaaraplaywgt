package com.youraitester.controller;

import com.youraitester.dto.ExecuteTestRequest;
import com.youraitester.model.TestRun;
import com.youraitester.repository.TestRunRepository;
import com.youraitester.repository.StepResultRepository;
import com.youraitester.service.TestExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class TestExecutionController {
    
    private final TestExecutionService testExecutionService;
    private final TestRunRepository testRunRepository;
    private final StepResultRepository stepResultRepository;
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @PostMapping("/{testId}/run")
    public ResponseEntity<?> executeTest(
            @PathVariable String testId,
            @RequestBody(required = false) ExecuteTestRequest request) {
        
        log.info("Received request to execute test: {}", testId);
        
        Integer dataRowIndex = request != null ? request.getDataRowIndex() : null;
        String environment = request != null ? request.getEnvironment() : "development";
        String browser = request != null ? request.getBrowser() : "chromium";
        String runId = request != null ? request.getRunId() : null;
        
        // Execute asynchronously
        testExecutionService.executeTest(testId, dataRowIndex, environment, browser, runId);
        
        return ResponseEntity.accepted().body(Map.of(
                "message", "Test execution started",
                "testId", testId
        ));
    }
    
    @GetMapping("/{testId}/runs")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TestRun>> getTestRuns(@PathVariable String testId) {
        List<TestRun> runs = testRunRepository.findByTestId(testId);
        // Load step results for each run
        runs.forEach(run -> {
            run.setStepResults(stepResultRepository.findByTestRunIdOrdered(run.getId()));
        });
        return ResponseEntity.ok(runs);
    }
    
    @GetMapping("/runs")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TestRun>> getAllTestRuns(@RequestParam(value = "projectId", required = false) String projectId) {
        List<TestRun> runs = (projectId != null && !projectId.isBlank())
                ? testRunRepository.findByProjectId(projectId)
                : testRunRepository.findAll();
        // Load step results for each run
        runs.forEach(run -> {
            run.setStepResults(stepResultRepository.findByTestRunIdOrdered(run.getId()));
        });
        return ResponseEntity.ok(runs);
    }
    
    @GetMapping("/runs/{runId}")
    @Transactional(readOnly = true)
    public ResponseEntity<TestRun> getTestRun(@PathVariable String runId) {
        return testRunRepository.findById(runId)
                .map(run -> {
                    // Load step results
                    run.setStepResults(stepResultRepository.findByTestRunIdOrdered(run.getId()));
                    return ResponseEntity.ok(run);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/runs/{runId}")
    @Transactional
    public ResponseEntity<Void> deleteTestRun(@PathVariable String runId) {
        log.info("Deleting test run: {}", runId);
        
        if (!testRunRepository.existsById(runId)) {
            return ResponseEntity.notFound().build();
        }
        
        // Delete step results first using native SQL query to bypass Hibernate relationship management
        // This must happen before deleting the test run to avoid foreign key constraint issues
        stepResultRepository.deleteByTestRunId(runId);
        
        // Flush and clear the persistence context to ensure Hibernate doesn't try to manage the relationship
        entityManager.flush();
        entityManager.clear();
        
        // Now delete the test run
        // We use deleteById which will not trigger the orphanRemoval cascade since step results are already deleted
        testRunRepository.deleteById(runId);
        
        log.info("Successfully deleted test run: {}", runId);
        return ResponseEntity.noContent().build();
    }
}
