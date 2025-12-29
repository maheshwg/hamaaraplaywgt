package com.youraitester.config;

import com.youraitester.model.Role;
import com.youraitester.model.Tenant;
import com.youraitester.model.User;
import com.youraitester.repository.TenantRepository;
import com.youraitester.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initializeVendorAdmin();
    }

    private void initializeVendorAdmin() {
        // Check if any VENDOR_ADMIN or SUPER_ADMIN users exist
        boolean adminExists = userRepository.findAll().stream()
                .anyMatch(user -> user.getTenantRole() == Role.VENDOR_ADMIN 
                        || user.getTenantRole() == Role.SUPER_ADMIN);

        if (!adminExists) {
            log.info("No admin users found. Creating default vendor admin...");
            
            // Create a system tenant for platform administrators
            Tenant systemTenant = tenantRepository.findAll().stream()
                    .filter(t -> "System".equals(t.getName()))
                    .findFirst()
                    .orElseGet(() -> {
                        Tenant tenant = new Tenant();
                        tenant.setName("System");
                        tenant.setMaxSeats(10);
                        tenant.setUsedSeats(1);
                        return tenantRepository.save(tenant);
                    });

            // Create default vendor admin user
            User vendorAdmin = new User();
            vendorAdmin.setName("Vendor Admin");
            vendorAdmin.setEmail("admin@youraitester.com");
            vendorAdmin.setPassword(passwordEncoder.encode("admin123")); // Change this in production!
            vendorAdmin.setTenant(systemTenant);
            vendorAdmin.setTenantRole(Role.VENDOR_ADMIN);
            
            userRepository.save(vendorAdmin);
            
            log.info("=".repeat(80));
            log.info("Default vendor admin user created:");
            log.info("  Email: admin@youraitester.com");
            log.info("  Password: admin123");
            log.info("  Role: VENDOR_ADMIN");
            log.info("  !!! IMPORTANT: Please change this password in production !!!");
            log.info("=".repeat(80));
        } else {
            log.info("Admin users already exist. Skipping initialization.");
        }
    }
}

