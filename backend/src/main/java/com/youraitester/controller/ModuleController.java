package com.youraitester.controller;

import com.youraitester.model.Module;
import com.youraitester.repository.ModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ModuleController {
    
    private final ModuleRepository moduleRepository;
    
    @GetMapping
    public ResponseEntity<List<Module>> getAllModules() {
        return ResponseEntity.ok(moduleRepository.findAll());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Module> getModule(@PathVariable String id) {
        return moduleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<Module> createModule(@RequestBody Module module) {
        Module saved = moduleRepository.save(module);
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Module> updateModule(@PathVariable String id, @RequestBody Module module) {
        if (!moduleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        module.setId(id);
        Module updated = moduleRepository.save(module);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable String id) {
        if (!moduleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        moduleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
