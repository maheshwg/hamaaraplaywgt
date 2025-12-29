#!/bin/bash

# EC2 Setup Script for YourAITester Backend
# Run this on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "================================================================"
echo "YourAITester Backend - EC2 Setup"
echo "================================================================"

# Update system
echo "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Java 17
echo "Installing Java 17..."
sudo apt install -y openjdk-17-jdk

# Install PostgreSQL
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Install Node.js 20.x (for MCP server)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Playwright dependencies
echo "Installing Playwright dependencies..."
sudo npx -y playwright@latest install-deps chromium

# Create application user
echo "Creating application user..."
sudo useradd -m -s /bin/bash youraitester || echo "User already exists"

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/youraitester
sudo chown youraitester:youraitester /opt/youraitester

# Create directories for logs, screenshots, etc.
sudo mkdir -p /var/log/youraitester
sudo mkdir -p /opt/youraitester/screenshots
sudo mkdir -p /opt/youraitester/mcp-data
sudo chown -R youraitester:youraitester /var/log/youraitester
sudo chown -R youraitester:youraitester /opt/youraitester

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo -u postgres psql <<EOF
-- Create database and user (change password in production!)
CREATE DATABASE youraitester;
CREATE USER youraitester WITH ENCRYPTED PASSWORD 'changeme123';
GRANT ALL PRIVILEGES ON DATABASE youraitester TO youraitester;
\c youraitester
GRANT ALL ON SCHEMA public TO youraitester;
EOF

echo ""
echo "================================================================"
echo "EC2 Setup Complete!"
echo "================================================================"
echo ""
echo "Next steps:"
echo "1. Copy your application files to /opt/youraitester/"
echo "2. Copy .env file with production settings"
echo "3. Run: sudo ./deploy/install-service.sh"
echo "4. Configure security group to allow:"
echo "   - Port 8080 (backend API)"
echo "   - Port 5432 (PostgreSQL - only from your IP)"
echo ""
echo "IMPORTANT: Change the PostgreSQL password!"
echo "  sudo -u postgres psql"
echo "  ALTER USER youraitester WITH PASSWORD 'your-secure-password';"
echo ""


