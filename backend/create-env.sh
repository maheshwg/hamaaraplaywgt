#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f ".env" ]; then
  echo "backend/.env already exists - nothing to do."
  exit 0
fi

if [ ! -f "env.example" ]; then
  echo "ERROR: backend/env.example not found."
  exit 1
fi

cp env.example .env
chmod 600 .env || true
echo "Created backend/.env from backend/env.example"
echo ""
echo "✅ Environment file created!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and set required values:"
echo "   - OPENAI_API_KEY (for AI features)"
echo "   - MAIL_USERNAME and MAIL_PASSWORD (for trial signups)"
echo "   - DB credentials (if not using defaults)"
echo "   - AWS S3 credentials (if using S3 for screenshots)"
echo ""
echo "2. For email setup, see backend/EMAIL_SETUP.md"
echo ""
echo "Quick email setup with Gmail:"
echo "   - Enable 2FA on your Gmail account"
echo "   - Create App Password at https://myaccount.google.com/apppasswords"
echo "   - Set MAIL_USERNAME and MAIL_PASSWORD in .env"
echo ""



