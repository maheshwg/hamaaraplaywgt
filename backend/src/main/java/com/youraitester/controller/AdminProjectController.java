package com.youraitester.controller;

import com.youraitester.model.Project;
import com.youraitester.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;

/**
 * SUPER_ADMIN-only project access across all tenants.
 */
@RestController
@RequestMapping("/api/admin/projects")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminProjectController {

    private final ProjectRepository projectRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listAllProjects() {
        List<Project> projects = projectRepository.findAll();
        List<Map<String, Object>> out = projects.stream().map(p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            m.put("description", p.getDescription());
            m.put("tenantId", p.getTenant() != null ? p.getTenant().getId() : null);
            m.put("tenantName", p.getTenant() != null ? p.getTenant().getName() : null);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }
}


