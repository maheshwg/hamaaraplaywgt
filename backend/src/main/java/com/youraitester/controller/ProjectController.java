package com.youraitester.controller;

import com.youraitester.model.*;
import com.youraitester.repository.ProjectMembershipRepository;
import com.youraitester.repository.ProjectRepository;
import com.youraitester.repository.TenantRepository;
import com.youraitester.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ProjectMembershipRepository membershipRepository;

    @PostMapping("/tenant/{tenantId}")
    public ResponseEntity<Project> create(@PathVariable Long tenantId, @RequestBody Project project) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        project.setTenant(tenant);
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<List<Project>> list(@PathVariable Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return ResponseEntity.ok(projectRepository.findByTenant(tenant));
    }

    @PostMapping("/{projectId}/members/{userId}")
    public ResponseEntity<ProjectMembership> addMember(@PathVariable Long projectId, @PathVariable Long userId, @RequestParam(defaultValue = "READ") AccessLevel accessLevel) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        ProjectMembership membership = membershipRepository.findByProjectAndUser(project, user).orElse(new ProjectMembership());
        membership.setProject(project);
        membership.setUser(user);
        membership.setAccessLevel(accessLevel);
        return ResponseEntity.ok(membershipRepository.save(membership));
    }

    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMembership>> getMembers(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        return ResponseEntity.ok(membershipRepository.findByProject(project));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Project>> getUserProjects(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        List<ProjectMembership> memberships = membershipRepository.findByUser(user);
        List<Project> projects = memberships.stream().map(ProjectMembership::getProject).toList();
        return ResponseEntity.ok(projects);
    }
}
