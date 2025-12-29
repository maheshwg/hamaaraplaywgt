package com.youraitester.controller;

import com.youraitester.dto.CreateClientRequest;
import com.youraitester.model.Tenant;
import com.youraitester.model.User;
import com.youraitester.model.Role;
import com.youraitester.repository.TenantRepository;
import com.youraitester.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor
@Slf4j
public class TenantAdminController {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping
    public ResponseEntity<Tenant> createTenant(@RequestBody Tenant tenant) {
        log.info("Received createTenant request: name={}, maxSeats={}", tenant.getName(), tenant.getMaxSeats());
        try {
            Tenant saved = tenantRepository.save(tenant);
            log.info("Tenant created: id={}, name={}", saved.getId(), saved.getName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Error creating tenant: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/with-admin")
    public ResponseEntity<Map<String, Object>> createTenantWithAdmin(@RequestBody CreateClientRequest request) {
        log.info("Creating client with admin: clientName={}, adminEmail={}", request.getClientName(), request.getAdminEmail());
        try {
            // Create tenant
            Tenant tenant = new Tenant();
            tenant.setName(request.getClientName());
            tenant.setMaxSeats(request.getMaxSeats());
            tenant.setUsedSeats(1); // Admin uses one seat
            Tenant savedTenant = tenantRepository.save(tenant);

            // Create admin user
            User admin = new User();
            admin.setName(request.getAdminName());
            admin.setEmail(request.getAdminEmail() != null ? request.getAdminEmail().trim().toLowerCase(Locale.ROOT) : null);
            admin.setPassword(passwordEncoder.encode(request.getAdminPassword()));
            admin.setTenant(savedTenant);
            admin.setTenantRole(Role.CLIENT_ADMIN);
            User savedAdmin = userRepository.save(admin);

            Map<String, Object> response = new HashMap<>();
            response.put("tenant", savedTenant);
            response.put("admin", savedAdmin);
            
            log.info("Client and admin created successfully: tenantId={}, adminId={}", savedTenant.getId(), savedAdmin.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error creating client with admin: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Tenant>> listTenants() {
        return ResponseEntity.ok(tenantRepository.findAll());
    }

    @GetMapping("/{tenantId}")
    public ResponseEntity<Tenant> getTenant(@PathVariable Long tenantId) {
        return tenantRepository.findById(tenantId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{tenantId}/seats")
    public ResponseEntity<Tenant> updateSeats(@PathVariable Long tenantId, @RequestParam Integer maxSeats) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        tenant.setMaxSeats(maxSeats);
        return ResponseEntity.ok(tenantRepository.save(tenant));
    }

    @PutMapping("/{tenantId}/plan")
    public ResponseEntity<Tenant> updatePlan(@PathVariable Long tenantId, @RequestBody Map<String, Object> planData) {
        log.info("Updating plan for tenant {}: {}", tenantId, planData);
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        
        if (planData.containsKey("maxSeats")) {
            Integer maxSeats = (Integer) planData.get("maxSeats");
            tenant.setMaxSeats(maxSeats);
        }
        
        return ResponseEntity.ok(tenantRepository.save(tenant));
    }

    @PostMapping("/{tenantId}/users")
    public ResponseEntity<User> inviteOrAddUser(@PathVariable Long tenantId, @RequestBody User user) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        user.setTenant(tenant);
        if (user.getTenantRole() == null) {
            user.setTenantRole(Role.MEMBER);
        }
        // Encode password if provided
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        // Seat enforcement (simple): disallow if usedSeats >= maxSeats
        if (tenant.getUsedSeats() == null) tenant.setUsedSeats(0);
        if (tenant.getMaxSeats() == null) tenant.setMaxSeats(1);
        if (tenant.getUsedSeats() >= tenant.getMaxSeats()) {
            return ResponseEntity.status(409).build();
        }
        tenant.setUsedSeats(tenant.getUsedSeats() + 1);
        tenantRepository.save(tenant);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/{tenantId}/users")
    public ResponseEntity<List<User>> getTenantUsers(@PathVariable Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        List<User> users = userRepository.findByTenant(tenant);
        return ResponseEntity.ok(users);
    }

    @PostMapping("/{tenantId}/invite-admin")
    public ResponseEntity<User> inviteAdmin(@PathVariable Long tenantId, @RequestBody Map<String, String> inviteData) {
        log.info("Inviting admin for tenant {}: {}", tenantId, inviteData.get("email"));
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        
        // Check if we have seats available
        if (tenant.getUsedSeats() == null) tenant.setUsedSeats(0);
        if (tenant.getMaxSeats() == null) tenant.setMaxSeats(1);
        if (tenant.getUsedSeats() >= tenant.getMaxSeats()) {
            return ResponseEntity.status(409).build();
        }
        
        // Create new admin user
        User admin = new User();
        admin.setEmail(inviteData.get("email").trim().toLowerCase(Locale.ROOT));
        admin.setName(inviteData.get("firstName") + " " + inviteData.get("lastName"));
        admin.setTenant(tenant);
        admin.setTenantRole(Role.CLIENT_ADMIN);
        
        // Generate a temporary password (in production, you'd want to send an invite email)
        String tempPassword = "TempPassword123!";
        admin.setPassword(passwordEncoder.encode(tempPassword));
        
        User savedAdmin = userRepository.save(admin);
        
        // Increment used seats
        tenant.setUsedSeats(tenant.getUsedSeats() + 1);
        tenantRepository.save(tenant);
        
        log.info("Admin invited successfully: userId={}, tenantId={}", savedAdmin.getId(), tenantId);
        return ResponseEntity.ok(savedAdmin);
    }

    @PutMapping("/{tenantId}/users/{userId}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long tenantId, @PathVariable Long userId, @RequestBody Map<String, String> roleData) {
        log.info("Updating user role: tenantId={}, userId={}, newRole={}", tenantId, userId, roleData.get("role"));
        
        User user = userRepository.findById(userId).orElseThrow();
        
        // Verify user belongs to this tenant
        if (!user.getTenant().getId().equals(tenantId)) {
            return ResponseEntity.status(403).build();
        }
        
        String roleStr = roleData.get("role");
        Role newRole = Role.valueOf(roleStr);
        user.setTenantRole(newRole);
        
        User savedUser = userRepository.save(user);
        log.info("User role updated successfully: userId={}, newRole={}", userId, newRole);
        
        return ResponseEntity.ok(savedUser);
    }
}
