package com.youraitester.controller;

import com.youraitester.dto.BatchRunRequest;
import com.youraitester.service.BatchExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class BatchExecutionController {
    
    private final BatchExecutionService batchExecutionService;
    
    @PostMapping("/run")
    public ResponseEntity<?> runBatch(@RequestBody BatchRunRequest request) {
        log.info("Starting batch run with {} tests, name: {}", request.getTestIds().size(), request.getRunName());
        
        if (request.getRunName() == null || request.getRunName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "runName is required for batch execution"
            ));
        }
        
        String runId = batchExecutionService.executeBatch(
                request.getTestIds(),
                request.getParallel() != null ? request.getParallel() : false,
                request.getRunName()
        );
        
        return ResponseEntity.accepted().body(Map.of(
                "message", "Batch execution started",
                "runId", runId
        ));
    }
    
    @GetMapping("/{runId}/status")
    public ResponseEntity<?> getBatchStatus(@PathVariable String runId) {
        var status = batchExecutionService.getBatchStatus(runId);
        return ResponseEntity.ok(status);
    }
}
