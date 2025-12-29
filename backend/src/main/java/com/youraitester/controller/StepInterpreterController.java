package com.youraitester.controller;

import com.youraitester.dto.InterpretStepRequest;
import com.youraitester.dto.InterpretedStep;
import com.youraitester.service.StepInterpreterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/steps")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class StepInterpreterController {
    
    private final StepInterpreterService stepInterpreterService;
    
    @PostMapping("/interpret")
    public ResponseEntity<InterpretedStep> interpretStep(@RequestBody InterpretStepRequest request) {
        log.info("Interpreting step: {}", request.getInstruction());
        
        InterpretedStep result = stepInterpreterService.interpretStep(
                request.getInstruction(),
                request.getPageContext(),
                request.getVariables()
        );
        
        return ResponseEntity.ok(result);
    }
}
