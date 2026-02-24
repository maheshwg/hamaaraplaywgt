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
        // Use a native projection to avoid Hibernate hydration errors when DB contains bad tenant references.
        List<Object[]> rows = projectRepository.findAllProjectRowsWithTenant();
        List<Map<String, Object>> out = rows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r[0]);
            m.put("name", r[1]);
            m.put("description", r[2]);
            m.put("tenantId", r[3]);
            m.put("tenantName", r[4]);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    /**
     * SUPER_ADMIN flow: choose tenant (client) first, then list projects within that tenant.
     * Example: GET /api/admin/projects?tenantId=123
     */
    @GetMapping(params = "tenantId")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listProjectsForTenant(@RequestParam Long tenantId) {
        List<Object[]> rows = projectRepository.findProjectRowsByTenantId(tenantId);
        List<Map<String, Object>> out = rows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r[0]);
            m.put("name", r[1]);
            m.put("description", r[2]);
            m.put("tenantId", r[3]);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }
}


