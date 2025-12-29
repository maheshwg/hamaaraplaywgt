package com.youraitester.service;

import com.youraitester.model.Run;
import com.youraitester.model.TestRun;
import com.youraitester.repository.RunRepository;
import com.youraitester.repository.TestRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchExecutionService {
    
    private final TestExecutionService testExecutionService;
    private final TestRunRepository testRunRepository;
    private final RunRepository runRepository;
    
    @Transactional
    public String executeBatch(List<String> testIds, boolean parallel, String runName) {
        // Create Run entity
        Run run = new Run();
        run.setName(runName);
        run.setStatus("running");
        run.setTriggeredBy("manual"); // TODO: Get from auth context
        run = runRepository.save(run);
        
        String runId = run.getId();
        log.info("Starting batch execution: {} (runId: {}) with {} tests", runName, runId, testIds.size());
        log.info("Test IDs to execute: {}", testIds);
        
        // Execute all tests - @Async on executeTest will handle async execution
        // For sequential execution, we still call them async but they'll execute in order
        // due to the async executor's queue
        for (String testId : testIds) {
            log.info("Calling executeTest for testId={} with runId={}", testId, runId);
            testExecutionService.executeTest(testId, null, "development", "chromium", runId);
        }
        log.info("All test execution calls initiated for runId={}", runId);
        
        // Note: We can't easily wait for all async executions to complete here
        // The updateRunStatus will be called by each test execution when it completes
        // via the updateRunStatus call in TestExecutionService
        
        return runId;
    }
    
    private void updateRunStatus(String runId) {
        Run run = runRepository.findById(runId).orElse(null);
        if (run == null) return;
        
        List<TestRun> testRuns = testRunRepository.findByBatchId(runId);
        if (testRuns.isEmpty()) {
            run.setStatus("cancelled");
        } else if (testRuns.stream().anyMatch(tr -> "running".equals(tr.getStatus()))) {
            run.setStatus("running");
        } else if (testRuns.stream().anyMatch(tr -> "failed".equals(tr.getStatus()))) {
            run.setStatus("failed");
        } else if (testRuns.stream().allMatch(tr -> "passed".equals(tr.getStatus()))) {
            run.setStatus("passed");
        } else {
            run.setStatus("cancelled");
        }
        
        runRepository.save(run);
    }
    
    public Map<String, Object> getBatchStatus(String runId) {
        Run run = runRepository.findById(runId).orElse(null);
        List<TestRun> testRuns = testRunRepository.findByBatchId(runId);
        
        long total = testRuns.size();
        long completed = testRuns.stream().filter(r -> 
                "passed".equals(r.getStatus()) || "failed".equals(r.getStatus())).count();
        long passed = testRuns.stream().filter(r -> "passed".equals(r.getStatus())).count();
        long failed = testRuns.stream().filter(r -> "failed".equals(r.getStatus())).count();
        long running = testRuns.stream().filter(r -> "running".equals(r.getStatus())).count();
        
        Map<String, Object> status = new HashMap<>();
        status.put("runId", runId);
        status.put("runName", run != null ? run.getName() : null);
        status.put("total", total);
        status.put("completed", completed);
        status.put("passed", passed);
        status.put("failed", failed);
        status.put("running", running);
        status.put("runs", testRuns);
        
        return status;
    }
}
