# Quick Start: Free Trial Email Notifications

Get email notifications working in **5 minutes** for trial signups.

## Prerequisites
- Gmail account (or any SMTP email service)
- Backend running

## Setup Steps

### 1. Configure Email (Gmail)

**Create Gmail App Password:**

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" → "2-Step Verification" → Enable it
3. Go back to Security → "App passwords": https://myaccount.google.com/apppasswords
4. Generate password for "Mail" → "Other (Custom name)" → "YourAITester"
5. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)

### 2. Set Environment Variables

**Option A: Quick Terminal Setup (Mac/Linux)**
```bash
cd backend

# Set email credentials (replace with your values)
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-16-char-app-password"
export MAIL_FROM="support@youraitester.com"
export TRIAL_SUPPORT_EMAIL="support@youraitester.com"
```

**Option B: Create .env File**
```bash
cd backend
./create-env.sh

# Then edit .env file:
nano .env
# Or: code .env

# Add these lines:
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=support@youraitester.com
TRIAL_SUPPORT_EMAIL=support@youraitester.com
```

### 3. Restart Backend

```bash
cd backend
./start.sh
```

Wait for: `Started TestAutomationBackendApplication`

### 4. Test It!

**Option A: Via Frontend**

1. Open your browser: http://localhost:5173/start-trial
2. Fill out the form
3. Click "Start Free Trial"
4. ✅ You should see success message
5. ✅ Check your email inbox

**Option B: Via API**

```bash
curl -X POST http://localhost:8080/api/public/trial/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "test@example.com",
    "password": "testpass123",
    "company": "Test Company",
    "agreeToTerms": true
  }'
```

### 5. Check Emails

You should receive **TWO emails**:

1. **To your support email** (default: support@youraitester.com):
   - Subject: "New Free Trial Signup - John Doe"
   - Contains all user details
   - Action items for account setup

2. **To the user's email** (test@example.com):
   - Subject: "Welcome to YourAITester..."
   - Confirmation that account is being set up
   - Timeline: 24-48 business hours

### 6. Check Logs (Optional)

```bash
tail -f backend/logs/application.log | grep -i "email\|trial"
```

Look for:
```
INFO  Trial signup notification sent to support@youraitester.com
INFO  Trial confirmation email sent to user: test@example.com
```

## Troubleshooting

### "Invalid credentials" error

❌ **Problem**: Email/password not accepted

✅ **Solution**:
- Make sure you created an **App Password** (not your regular Gmail password)
- Verify 2FA is enabled on your Gmail account
- Double-check the 16-character password has no spaces

### Emails not arriving

❌ **Problem**: No emails received

✅ **Solution**:
1. Check spam/junk folder
2. Verify `TRIAL_SUPPORT_EMAIL` is set correctly
3. Check logs for errors: `tail backend/logs/application.log`
4. Test SMTP connection:
   ```bash
   telnet smtp.gmail.com 587
   ```

### Backend won't start

❌ **Problem**: Errors on startup

✅ **Solution**:
1. Make sure PostgreSQL is running
2. Check if port 8080 is available
3. View logs: `tail backend/logs/application.log`
4. Rebuild: `cd backend && mvn clean install -DskipTests`

## What Changed?

When a user signs up for free trial:

**Before:**
- ❌ No notification sent
- ❌ No account created
- ❌ Vague success message

**After:**
- ✅ Email sent to support@youraitester.com with user details
- ✅ Confirmation email sent to user
- ✅ Clear message: "We'll email you in 24-48 hours"
- ✅ Professional email templates

## Production Setup

For production, use a dedicated email service:

- **SendGrid** (recommended): See EMAIL_SETUP.md
- **AWS SES**: See EMAIL_SETUP.md
- **Mailgun**: See EMAIL_SETUP.md

Don't use personal Gmail for production!

## Email Template Preview

### Support Team Gets:
```
Subject: New Free Trial Signup - John Doe

User Details:
=================
Name: John Doe
Email: john@company.com
Company: Acme Inc.

Action Required:
=================
1. Create tenant account
2. Set up project & credentials
3. Send login details within 24-48 hours
```

### User Gets:
```
Subject: Welcome to YourAITester!

Hi John,

Thank you for signing up!

We're setting up your account and will send you 
login credentials within 24-48 business hours.

Your free trial includes:
  ✓ 14 days full access
  ✓ 50 test cases
  ✓ 5,000 test executions
  ✓ All features unlocked
```

## Next Steps

1. ✅ Configure email (you just did this!)
2. 📝 Update `TRIAL_SUPPORT_EMAIL` to your actual support email
3. 🎨 Customize email templates in `backend/src/main/java/com/youraitester/service/EmailService.java`
4. 🚀 Deploy to production (use SendGrid/AWS SES)
5. 📧 Set up SPF/DKIM for better deliverability

## Need Help?

- 📖 **Full docs**: See `backend/EMAIL_SETUP.md`
- 🐛 **Issues**: Check `backend/logs/application.log`
- 📧 **Questions**: Check the EmailService.java file

---

**Time to Setup**: ~5 minutes  
**Difficulty**: Easy  
**Status**: ✅ Ready to use  

Enjoy automated trial signup notifications! 🎉

