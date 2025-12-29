#!/bin/bash

################################################################################
# EC2 Backend Setup Script
# This script sets up the complete backend environment on Amazon Linux 2023
################################################################################

set -e  # Exit on error

echo "================================"
echo "Starting EC2 Backend Setup"
echo "================================"

# Update system
echo "Updating system packages..."
sudo dnf update -y

# Install Git
echo "Installing Git..."
sudo dnf install -y git
git --version

# Install Java 17
echo "Installing Java 17..."
sudo dnf install -y java-17-amazon-corretto-devel
java -version

# Install PostgreSQL 15
echo "Installing PostgreSQL 15..."
sudo dnf install -y postgresql15 postgresql15-server
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE USER testuser WITH PASSWORD 'testpass123';"
sudo -u postgres psql -c "CREATE DATABASE test_automation OWNER testuser;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE test_automation TO testuser;"

# Update PostgreSQL to allow password authentication
sudo sed -i 's/ident$/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/peer$/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql

# Install Docker
echo "Installing Docker..."
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version

# Install Node.js 20 (for MCP server)
echo "Installing Node.js 20..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node --version

# Create application directory
echo "Creating application directories..."
sudo mkdir -p /opt/youraitester
sudo chown ec2-user:ec2-user /opt/youraitester
cd /opt/youraitester

# Create environment file
echo "Creating environment configuration..."
cat > .env << 'EOL'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_automation
DB_USER=testuser
DB_PASSWORD=testpass123

# OpenAI API Key (REPLACE THIS!)
OPENAI_API_KEY=your-openai-api-key-here

# MCP Configuration
MCP_PLAYWRIGHT_ENABLED=true
MCP_SERVER_URL=http://localhost:3000

# Screenshot Storage Configuration
SCREENSHOT_STORAGE_TYPE=s3

# AWS S3 Configuration (REPLACE THESE!)
AWS_S3_BUCKET=yourqatester-screenshots
AWS_REGION=us-east-1
AWS_ACCESS_KEY=your-aws-access-key
AWS_SECRET_KEY=your-aws-secret-key
AWS_CLOUDFRONT_URL=

# Application Configuration
SERVER_PORT=8080
EOL

echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo "1. Upload your backend jar file to /opt/youraitester/"
echo "2. Upload your MCP server code to /opt/youraitester/mcp-server/"
echo "3. Update the OPENAI_API_KEY in /opt/youraitester/.env"
echo "4. Run: sudo bash /opt/youraitester/start-services.sh"
echo ""
echo "To upload files from your local machine, use:"
echo "  scp -i your-key.pem backend/target/test-automation-backend-1.0.0.jar ec2-user@YOUR_EC2_IP:/opt/youraitester/"
echo "  scp -i your-key.pem -r backend/mcp-server ec2-user@YOUR_EC2_IP:/opt/youraitester/"
echo ""
