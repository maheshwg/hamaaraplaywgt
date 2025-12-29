package com.youraitester.controller;

import com.youraitester.model.Run;
import com.youraitester.repository.RunRepository;
import com.youraitester.repository.StepResultRepository;
import com.youraitester.repository.TestRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.List;

@RestController
@RequestMapping("/api/runs")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class RunController {
    
    private final RunRepository runRepository;
    private final TestRunRepository testRunRepository;
    private final StepResultRepository stepResultRepository;

    @PersistenceContext
    private EntityManager entityManager;
    
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Run>> getAllRuns(@RequestParam(value = "projectId", required = false) String projectId) {
        List<Run> runs = (projectId != null && !projectId.isBlank())
                ? runRepository.findByProjectId(projectId)
                : runRepository.findAll();
        return ResponseEntity.ok(runs);
    }
    
    @GetMapping("/{runId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Run> getRun(@PathVariable String runId) {
        return runRepository.findById(runId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{runId}")
    @Transactional
    public ResponseEntity<Void> deleteRun(@PathVariable String runId) {
        log.info("Deleting run: {}", runId);
        
        if (!runRepository.existsById(runId)) {
            return ResponseEntity.notFound().build();
        }

        // Delete all test runs associated with this run (batchId = runId),
        // and delete their step results first to avoid FK issues.
        var testRuns = testRunRepository.findByBatchId(runId);
        if (testRuns != null && !testRuns.isEmpty()) {
            log.info("Deleting {} test run(s) for runId={}", testRuns.size(), runId);
            for (var tr : testRuns) {
                if (tr == null || tr.getId() == null) continue;
                stepResultRepository.deleteByTestRunId(tr.getId());
            }
            // Flush & clear persistence context to ensure Hibernate doesn't try to manage deleted relationships
            entityManager.flush();
            entityManager.clear();

            // Now delete the test runs
            for (var tr : testRuns) {
                if (tr == null || tr.getId() == null) continue;
                testRunRepository.deleteById(tr.getId());
            }
        } else {
            log.info("No test runs found for runId={} (batchId)", runId);
        }

        // Finally delete the run record
        runRepository.deleteById(runId);
        
        log.info("Successfully deleted run: {}", runId);
        return ResponseEntity.noContent().build();
    }
}

