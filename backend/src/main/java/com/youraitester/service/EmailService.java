package com.youraitester.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@youraitester.com}")
    private String fromEmail;

    @Value("${trial.support.email:support@youraitester.com}")
    private String supportEmail;

    /**
     * Send trial signup notification to support team
     */
    public void sendTrialSignupNotification(String fullName, String email, String company, String phone) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(supportEmail);
            message.setSubject("New Free Trial Signup - " + fullName);
            
            StringBuilder body = new StringBuilder();
            body.append("A new user has signed up for a free trial.\n\n");
            body.append("User Details:\n");
            body.append("=================\n");
            body.append("Name: ").append(fullName).append("\n");
            body.append("Email: ").append(email).append("\n");
            
            if (company != null && !company.isEmpty()) {
                body.append("Company: ").append(company).append("\n");
            }
            
            if (phone != null && !phone.isEmpty()) {
                body.append("Phone: ").append(phone).append("\n");
            }
            
            body.append("\nTimestamp: ").append(java.time.LocalDateTime.now()).append("\n");
            body.append("\n");
            body.append("Action Required:\n");
            body.append("=================\n");
            body.append("1. Create a tenant account for this user\n");
            body.append("2. Set up their project and credentials\n");
            body.append("3. Send them their login details via email within 24-48 business hours\n");
            body.append("\n");
            body.append("Please respond to this signup promptly to ensure a great user experience.");
            
            message.setText(body.toString());
            
            mailSender.send(message);
            log.info("Trial signup notification sent to {} for user: {}", supportEmail, email);
            
        } catch (Exception e) {
            log.error("Failed to send trial signup notification for user: {}", email, e);
            throw new RuntimeException("Failed to send email notification", e);
        }
    }

    /**
     * Send confirmation email to user
     */
    public void sendTrialConfirmationToUser(String fullName, String email) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(email);
            message.setSubject("Welcome to YourAITester - Your Free Trial is Being Set Up!");
            
            StringBuilder body = new StringBuilder();
            body.append("Hi ").append(fullName).append(",\n\n");
            body.append("Thank you for signing up for YourAITester!\n\n");
            body.append("We're excited to have you on board. Our team is currently setting up your account ");
            body.append("and will send you your login credentials via email within 24-48 business hours.\n\n");
            body.append("What happens next:\n");
            body.append("  • Our team will create your personalized tenant account\n");
            body.append("  • You'll receive login credentials via email\n");
            body.append("  • You can start testing immediately with full access to all features\n\n");
            body.append("Your free trial includes:\n");
            body.append("  ✓ 14 days of full platform access\n");
            body.append("  ✓ 50 test cases\n");
            body.append("  ✓ 5,000 test executions\n");
            body.append("  ✓ Natural language test creation\n");
            body.append("  ✓ CI/CD integrations\n");
            body.append("  ✓ Export to Playwright\n");
            body.append("  ✓ Email support\n\n");
            body.append("If you have any questions in the meantime, feel free to reply to this email ");
            body.append("or contact us at support@youraitester.com.\n\n");
            body.append("Best regards,\n");
            body.append("The YourAITester Team\n");
            
            message.setText(body.toString());
            
            mailSender.send(message);
            log.info("Trial confirmation email sent to user: {}", email);
            
        } catch (Exception e) {
            log.error("Failed to send trial confirmation email to user: {}", email, e);
            // Don't throw - we don't want to fail the signup if user email fails
            // The support team still gets notified
        }
    }
}




