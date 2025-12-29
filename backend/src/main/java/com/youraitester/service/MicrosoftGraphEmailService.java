package com.youraitester.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class MicrosoftGraphEmailService {

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${microsoft.tenant.id:}")
    private String tenantId;

    @Value("${microsoft.client.id:}")
    private String clientId;

    @Value("${microsoft.client.secret:}")
    private String clientSecret;

    @Value("${mail.from:support@youraitester.com}")
    private String fromEmail;

    @Value("${trial.support.email:support@youraitester.com}")
    private String supportEmail;

    /**
     * Get OAuth2 access token from Microsoft
     */
    private String getAccessToken() throws IOException {
        String tokenUrl = String.format("https://login.microsoftonline.com/%s/oauth2/v2.0/token", tenantId);

        RequestBody formBody = new FormBody.Builder()
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("grant_type", "client_credentials")
                .add("scope", "https://graph.microsoft.com/.default")
                .build();

        Request request = new Request.Builder()
                .url(tokenUrl)
                .post(formBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to get access token. Status: {}, Body: {}", response.code(), errorBody);
                throw new IOException("Failed to get access token: " + response.code());
            }

            String responseBody = response.body().string();
            JsonNode jsonNode = objectMapper.readTree(responseBody);
            return jsonNode.get("access_token").asText();
        }
    }

    /**
     * Send email using Microsoft Graph API
     */
    private void sendEmail(String toEmail, String subject, String body) throws IOException {
        String accessToken = getAccessToken();

        // Construct email JSON for Microsoft Graph API
        String emailJson = String.format("""
            {
              "message": {
                "subject": "%s",
                "body": {
                  "contentType": "Text",
                  "content": "%s"
                },
                "toRecipients": [
                  {
                    "emailAddress": {
                      "address": "%s"
                    }
                  }
                ]
              },
              "saveToSentItems": "true"
            }
            """, 
            escapeJson(subject),
            escapeJson(body),
            toEmail
        );

        String graphUrl = String.format("https://graph.microsoft.com/v1.0/users/%s/sendMail", fromEmail);

        RequestBody requestBody = RequestBody.create(
                emailJson,
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(graphUrl)
                .addHeader("Authorization", "Bearer " + accessToken)
                .addHeader("Content-Type", "application/json")
                .post(requestBody)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error details";
                log.error("Failed to send email. Status: {}, Body: {}", response.code(), errorBody);
                throw new IOException("Failed to send email: " + response.code());
            }
            log.info("Email sent successfully to: {}", toEmail);
        }
    }

    /**
     * Escape special characters for JSON
     */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    /**
     * Send trial signup notification to support team
     */
    public void sendTrialSignupNotification(String fullName, String email, String company, String phone) {
        try {
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

            String subject = "New Free Trial Signup - " + fullName;

            sendEmail(supportEmail, subject, body.toString());
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
            body.append("or contact us at ").append(supportEmail).append(".\n\n");
            body.append("Best regards,\n");
            body.append("The YourAITester Team\n");

            String subject = "Welcome to YourAITester - Your Free Trial is Being Set Up!";

            sendEmail(email, subject, body.toString());
            log.info("Trial confirmation email sent to user: {}", email);

        } catch (Exception e) {
            log.error("Failed to send trial confirmation email to user: {}", email, e);
            // Don't throw - we don't want to fail the signup if user email fails
            // The support team still gets notified
        }
    }
}




