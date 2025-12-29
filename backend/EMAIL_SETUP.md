# Email Configuration Guide

This guide explains how to configure email functionality for trial signups and notifications in YourAITester.

## Overview

The application sends two types of emails when a user signs up for a free trial:

1. **Notification to Support Team** - Sent to `support@youraitester.com` with user details
2. **Confirmation to User** - Sent to the user confirming their signup and next steps

## Configuration Options

### Option 1: Gmail SMTP (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account

2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the generated 16-character password

3. **Configure Environment Variables**:

```bash
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-16-char-app-password
export MAIL_FROM=support@youraitester.com
export TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

Or add to your `.env` file:

```properties
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=support@youraitester.com
TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up for SendGrid** at https://sendgrid.com/

2. **Create an API Key**:
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key

3. **Configure Environment Variables**:

```bash
export MAIL_HOST=smtp.sendgrid.net
export MAIL_PORT=587
export MAIL_USERNAME=apikey
export MAIL_PASSWORD=your-sendgrid-api-key
export MAIL_FROM=support@youraitester.com
export TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

### Option 3: AWS SES

1. **Set up AWS SES**:
   - Verify your domain or email addresses
   - Request production access (if needed)
   - Create SMTP credentials

2. **Configure Environment Variables**:

```bash
export MAIL_HOST=email-smtp.us-east-1.amazonaws.com
export MAIL_PORT=587
export MAIL_USERNAME=your-ses-smtp-username
export MAIL_PASSWORD=your-ses-smtp-password
export MAIL_FROM=support@youraitester.com
export TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

### Option 4: Other SMTP Providers

You can use any SMTP provider (Mailgun, Postmark, etc.):

```bash
export MAIL_HOST=smtp.your-provider.com
export MAIL_PORT=587
export MAIL_USERNAME=your-username
export MAIL_PASSWORD=your-password
export MAIL_FROM=support@youraitester.com
export TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

## Testing Email Configuration

### 1. Test Email Endpoint

```bash
curl -X POST http://localhost:8080/api/public/trial/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "testpass123",
    "company": "Test Company",
    "agreeToTerms": true
  }'
```

### 2. Check Logs

Watch the application logs for email sending status:

```bash
tail -f backend/logs/application.log | grep -i "email\|trial"
```

You should see logs like:
```
INFO  c.y.service.EmailService - Trial signup notification sent to support@youraitester.com for user: test@example.com
INFO  c.y.service.EmailService - Trial confirmation email sent to user: test@example.com
```

### 3. Check Email Inbox

- Check `support@youraitester.com` for the notification
- Check the user's email for the confirmation

## Email Templates

### Support Team Notification Email

```
Subject: New Free Trial Signup - [Full Name]

A new user has signed up for a free trial.

User Details:
=================
Name: [Full Name]
Email: [Email]
Company: [Company]
Phone: [Phone]

Timestamp: [Current Time]

Action Required:
=================
1. Create a tenant account for this user
2. Set up their project and credentials
3. Send them their login details via email within 24-48 business hours

Please respond to this signup promptly to ensure a great user experience.
```

### User Confirmation Email

```
Subject: Welcome to YourAITester - Your Free Trial is Being Set Up!

Hi [Full Name],

Thank you for signing up for YourAITester!

We're excited to have you on board. Our team is currently setting up your account 
and will send you your login credentials via email within 24-48 business hours.

What happens next:
  • Our team will create your personalized tenant account
  • You'll receive login credentials via email
  • You can start testing immediately with full access to all features

Your free trial includes:
  ✓ 14 days of full platform access
  ✓ 50 test cases
  ✓ 5,000 test executions
  ✓ Natural language test creation
  ✓ CI/CD integrations
  ✓ Export to Playwright
  ✓ Email support

If you have any questions in the meantime, feel free to reply to this email 
or contact us at support@youraitester.com.

Best regards,
The YourAITester Team
```

## Troubleshooting

### Emails Not Sending

1. **Check Configuration**:
   ```bash
   # Verify environment variables are set
   echo $MAIL_USERNAME
   echo $MAIL_HOST
   ```

2. **Check Application Logs**:
   ```bash
   tail -100 backend/logs/application.log | grep -i error
   ```

3. **Test SMTP Connection**:
   - Use a tool like `telnet` or `openssl` to test SMTP connectivity
   ```bash
   openssl s_client -connect smtp.gmail.com:587 -starttls smtp
   ```

### Gmail Specific Issues

- **"Less secure app access"**: Use App Passwords instead
- **"Username and Password not accepted"**: Enable 2FA and create App Password
- **Rate limiting**: Gmail has sending limits (500 emails/day for free accounts)

### SendGrid Issues

- **"Unauthorized"**: Ensure username is literally `apikey` (not your email)
- **"Domain not verified"**: Verify your sending domain in SendGrid
- **"Sandbox mode"**: Add verified recipients in sandbox mode

## Production Recommendations

1. **Use a Dedicated Email Service**:
   - SendGrid, AWS SES, or Mailgun for better deliverability
   - Don't use personal Gmail for production

2. **Configure SPF, DKIM, and DMARC**:
   - Set up proper DNS records for your domain
   - Improves email deliverability

3. **Monitor Email Delivery**:
   - Track bounce rates and delivery status
   - Set up alerts for failed emails

4. **Use a Professional From Address**:
   - Default: `support@youraitester.com` (replies go to support)
   - Alternative: `hello@youraitester.com` for a friendlier tone
   - Verify your domain with your email provider

5. **Rate Limiting**:
   - Implement rate limiting to prevent abuse
   - Consider queueing emails for high volume

## Security Best Practices

1. **Never Commit Credentials**:
   - Use environment variables or secrets management
   - Add `.env` to `.gitignore`

2. **Use TLS/SSL**:
   - Always enable `starttls` for SMTP connections
   - Configuration already includes this

3. **Rotate API Keys**:
   - Regularly rotate SMTP passwords and API keys
   - Use separate credentials for dev/staging/production

4. **Limit Access**:
   - Create API keys with minimal required permissions
   - Use separate keys for different environments

## Support

If you encounter issues:

1. Check the logs: `backend/logs/application.log`
2. Verify SMTP credentials and connectivity
3. Test with a simple curl command
4. Contact your email provider's support if needed

For questions about the YourAITester email implementation, check:
- `backend/src/main/java/com/youraitester/service/EmailService.java`
- `backend/src/main/java/com/youraitester/controller/TrialSignupController.java`

