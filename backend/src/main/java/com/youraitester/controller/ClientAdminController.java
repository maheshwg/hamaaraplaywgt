package com.youraitester.controller;

import com.youraitester.dto.CreateClientRequest;
import com.youraitester.model.*;
import com.youraitester.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Locale;

@RestController
@RequestMapping("/api/client-admin")
@RequiredArgsConstructor
@Slf4j
public class ClientAdminController {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;

    // User Management
    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request, Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        // Verify current user is CLIENT_ADMIN
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can create users");
        }

        Tenant tenant = currentUser.getTenant();
        
        // Check seat availability
        if (tenant.getUsedSeats() >= tenant.getMaxSeats()) {
            return ResponseEntity.status(409).body("No available seats");
        }

        User newUser = new User();
        newUser.setName(request.get("name"));
        String rawEmail = request.get("email");
        newUser.setEmail(rawEmail != null ? rawEmail.trim().toLowerCase(Locale.ROOT) : null);
        newUser.setPassword(passwordEncoder.encode(request.get("password")));
        newUser.setTenant(tenant);
        newUser.setTenantRole(Role.MEMBER);

        tenant.setUsedSeats(tenant.getUsedSeats() + 1);
        tenantRepository.save(tenant);

        User saved = userRepository.save(newUser);
        log.info("User created by client admin: userId={}, tenantId={}", saved.getId(), tenant.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers(Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        List<User> users = userRepository.findByTenant(currentUser.getTenant());
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId, Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can delete users");
        }

        User userToDelete = userRepository.findById(userId).orElseThrow();
        
        // Verify user belongs to same tenant
        if (!userToDelete.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).body("Cannot delete user from different tenant");
        }

        // Don't allow deleting yourself
        if (userToDelete.getId().equals(currentUser.getId())) {
            return ResponseEntity.status(400).body("Cannot delete yourself");
        }

        Tenant tenant = currentUser.getTenant();
        tenant.setUsedSeats(Math.max(0, tenant.getUsedSeats() - 1));
        tenantRepository.save(tenant);

        userRepository.delete(userToDelete);
        log.info("User deleted by client admin: userId={}, tenantId={}", userId, tenant.getId());
        return ResponseEntity.ok().build();
    }

    // Project Management
    @PostMapping("/projects")
    public ResponseEntity<?> createProject(@RequestBody Map<String, String> request, Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can create projects");
        }

        Project project = new Project();
        project.setName(request.get("name"));
        project.setDescription(request.get("description"));
        project.setTenant(currentUser.getTenant());

        Project saved = projectRepository.save(project);
        log.info("Project created by client admin: projectId={}, tenantId={}", saved.getId(), currentUser.getTenant().getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/projects")
    public ResponseEntity<List<Project>> listProjects(Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        List<Project> projects = projectRepository.findByTenant(currentUser.getTenant());
        return ResponseEntity.ok(projects);
    }

    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<?> deleteProject(@PathVariable Long projectId, Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can delete projects");
        }

        Project project = projectRepository.findById(projectId).orElseThrow();
        
        if (!project.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).body("Cannot delete project from different tenant");
        }

        projectRepository.delete(project);
        log.info("Project deleted by client admin: projectId={}, tenantId={}", projectId, currentUser.getTenant().getId());
        return ResponseEntity.ok().build();
    }

    // Project Access Management
    @PostMapping("/projects/{projectId}/access")
    public ResponseEntity<?> assignUserToProject(
            @PathVariable Long projectId,
            @RequestBody Map<String, Object> request,
            Authentication auth) {
        
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can assign users to projects");
        }

        Project project = projectRepository.findById(projectId).orElseThrow();
        Long userId = Long.valueOf(request.get("userId").toString());
        User user = userRepository.findById(userId).orElseThrow();
        
        // Verify project and user are in same tenant
        if (!project.getTenant().getId().equals(currentUser.getTenant().getId()) ||
            !user.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).body("Project and user must be in the same tenant");
        }

        AccessLevel accessLevel = AccessLevel.valueOf(request.get("accessLevel").toString());
        
        ProjectMembership membership = membershipRepository.findByProjectAndUser(project, user)
                .orElse(new ProjectMembership());
        membership.setProject(project);
        membership.setUser(user);
        membership.setAccessLevel(accessLevel);

        ProjectMembership saved = membershipRepository.save(membership);
        log.info("User assigned to project: userId={}, projectId={}, accessLevel={}", userId, projectId, accessLevel);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/projects/{projectId}/access")
    public ResponseEntity<List<ProjectMembership>> getProjectAccess(@PathVariable Long projectId, Authentication auth) {
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        Project project = projectRepository.findById(projectId).orElseThrow();
        
        if (!project.getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).build();
        }

        List<ProjectMembership> memberships = membershipRepository.findByProject(project);
        return ResponseEntity.ok(memberships);
    }

    @DeleteMapping("/projects/{projectId}/access/{membershipId}")
    public ResponseEntity<?> removeUserFromProject(
            @PathVariable Long projectId,
            @PathVariable Long membershipId,
            Authentication auth) {
        
        String currentUserEmail = auth.getName();
        User currentUser = userRepository.findByEmail(currentUserEmail).orElseThrow();
        
        if (currentUser.getTenantRole() != Role.CLIENT_ADMIN) {
            return ResponseEntity.status(403).body("Only client admins can remove users from projects");
        }

        ProjectMembership membership = membershipRepository.findById(membershipId).orElseThrow();
        
        if (!membership.getProject().getTenant().getId().equals(currentUser.getTenant().getId())) {
            return ResponseEntity.status(403).body("Cannot modify access for different tenant");
        }

        membershipRepository.delete(membership);
        log.info("User removed from project: membershipId={}, projectId={}", membershipId, projectId);
        return ResponseEntity.ok().build();
    }
}

