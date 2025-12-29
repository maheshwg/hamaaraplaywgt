package com.youraitester.controller;

import com.youraitester.dto.TrialSignupRequest;
import com.youraitester.service.EmailService;
import com.youraitester.service.MicrosoftGraphEmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/public/trial")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TrialSignupController {

    private final EmailService emailService;
    private final MicrosoftGraphEmailService microsoftGraphEmailService;

    @Value("${microsoft.graph.enabled:false}")
    private boolean useMicrosoftGraph;

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signupForTrial(@Valid @RequestBody TrialSignupRequest request) {
        try {
            log.info("Received trial signup request for email: {}", request.getEmail());
            
            // Validate terms agreement
            if (request.getAgreeToTerms() == null || !request.getAgreeToTerms()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "You must agree to the Terms of Service and Privacy Policy"
                ));
            }
            
            // Choose email service based on configuration
            if (useMicrosoftGraph) {
                log.info("Using Microsoft Graph API for emails");
                // Send notification to support team
                microsoftGraphEmailService.sendTrialSignupNotification(
                    request.getFullName(),
                    request.getEmail(),
                    request.getCompany(),
                    request.getPhone()
                );
                
                // Send confirmation to user
                microsoftGraphEmailService.sendTrialConfirmationToUser(
                    request.getFullName(),
                    request.getEmail()
                );
            } else {
                log.info("Using SMTP for emails");
                // Send notification to support team
                emailService.sendTrialSignupNotification(
                    request.getFullName(),
                    request.getEmail(),
                    request.getCompany(),
                    request.getPhone()
                );
                
                // Send confirmation to user
                emailService.sendTrialConfirmationToUser(
                    request.getFullName(),
                    request.getEmail()
                );
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Thank you for signing up! We're setting up your account and will email you login details within 24-48 business hours.");
            response.put("email", request.getEmail());
            
            log.info("Trial signup processed successfully for: {}", request.getEmail());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error processing trial signup for email: {}", request.getEmail(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "We encountered an error processing your signup. Please try again or contact support@youraitester.com");
            errorResponse.put("error", e.getMessage());
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

