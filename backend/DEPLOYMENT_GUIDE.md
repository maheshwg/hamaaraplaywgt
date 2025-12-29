# YourAITester Backend - EC2 Deployment Guide

## Overview

This guide covers deploying the YourAITester backend to an AWS EC2 instance using the official Playwright MCP server.

## Prerequisites

### On Your Local Machine
- Maven installed
- SSH access configured
- AWS EC2 key pair (`.pem` file)

### On EC2 Instance
- **OS**: Amazon Linux 2 or Ubuntu 22.04
- **Instance Type**: t3.medium or larger (recommended)
- **Java**: OpenJDK 17 or later
- **Node.js**: v20.x or later
- **PostgreSQL**: v12 or later
- **Memory**: At least 4GB RAM
- **Storage**: At least 20GB

## Step 1: Prepare EC2 Instance

### Launch EC2 Instance

```bash
# Instance specifications:
- AMI: Amazon Linux 2 or Ubuntu 22.04
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- Storage: 20GB GP3
- Security Group:
  - Port 22 (SSH) - Your IP only
  - Port 8080 (Backend API) - 0.0.0.0/0 or specific IPs
  - Port 8931 (MCP Server) - localhost only (no external access needed)
  - Port 5432 (PostgreSQL) - localhost only
```

### SSH into Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Install Dependencies

#### For Amazon Linux 2:

```bash
# Update system
sudo yum update -y

# Install Java 17
sudo yum install -y java-17-amazon-corretto

# Install PostgreSQL
sudo amazon-linux-extras install postgresql14 -y
sudo yum install postgresql-server -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install Playwright dependencies
sudo yum install -y \
    libXcomposite libXdamage libXrandr libgbm libpangocairo-1.0-0 \
    libatk-bridge2.0-0 libgtk-3-0 libasound2

# Install Chromium browser for Playwright
export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
npx -y playwright@latest install chromium
npx -y playwright@latest install-deps chromium
```

#### For Ubuntu 22.04:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 17
sudo apt install -y openjdk-17-jdk

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Playwright dependencies
sudo npx -y playwright@latest install-deps chromium

# Install Chromium browser for Playwright
export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
npx -y playwright@latest install chromium
```

## Step 2: Setup PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE youraitester;
CREATE USER youraitester WITH ENCRYPTED PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE youraitester TO youraitester;
\c youraitester
GRANT ALL ON SCHEMA public TO youraitester;
\q
```

## Step 3: Create Application Directory

```bash
# Create directory structure
sudo mkdir -p /opt/youraitester
sudo chown $(whoami):$(whoami) /opt/youraitester
cd /opt/youraitester
mkdir -p logs screenshots
```

## Step 4: Configure Deployment Script

On your **local machine**, edit `backend/deploy-to-ec2.sh`:

```bash
# Update these values:
EC2_HOST="your-ec2-ip-or-domain"
EC2_USER="ec2-user"  # or "ubuntu" for Ubuntu
EC2_KEY="../path/to/your-key.pem"

# Add your API keys:
OPENAI_API_KEY="sk-your-openai-key"
CLAUDE_API_KEY="sk-ant-api03-your-claude-key"

# Choose LLM provider:
AGENT_LLM_PROVIDER="claude"  # or "openai"
```

## Step 5: Deploy

From your **local machine**, in the `backend` directory:

```bash
# Make deployment script executable
chmod +x deploy-to-ec2.sh

# Run deployment
./deploy-to-ec2.sh
```

The script will:
1. ✅ Build the backend JAR
2. ✅ Upload files to EC2
3. ✅ Configure environment variables
4. ✅ Install Playwright browsers
5. ✅ Restart services

## Step 6: Verify Deployment

### Check Services Are Running

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check Java process
ps aux | grep java

# Check MCP server
ps aux | grep "@playwright/mcp"

# Should see something like:
# npx -y @playwright/mcp --port 8931 --headless --browser chrome --shared-browser-context...
```

### Check Health Endpoint

```bash
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}
```

### View Logs

```bash
# Backend logs
tail -f /opt/youraitester/backend.log

# MCP server logs
tail -f /tmp/mcp-server.log
```

## Architecture on EC2

```
EC2 Instance
├─ Port 8080: Spring Boot Backend
│  └─ /opt/youraitester/backend.jar
│  └─ Logs: /opt/youraitester/backend.log
│
├─ Port 8931: Official Playwright MCP Server
│  └─ Process: npx @playwright/mcp
│  └─ Logs: /tmp/mcp-server.log
│  └─ Browser: Chrome (headless)
│  └─ User Data: /tmp/playwright-mcp-userdata
│
├─ Port 5432: PostgreSQL
│  └─ Database: youraitester
│  └─ Localhost only
│
└─ File System
   ├─ /opt/youraitester/
   │  ├─ backend.jar
   │  ├─ start.sh
   │  ├─ stop-services.sh
   │  ├─ .env
   │  ├─ screenshots/
   │  └─ logs/
   │
   └─ ~/.cache/ms-playwright/
      └─ chromium/ (Playwright browser)
```

## Environment Variables

The `.env` file on EC2 (`/opt/youraitester/.env`) contains:

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/youraitester
SPRING_DATASOURCE_USERNAME=youraitester
SPRING_DATASOURCE_PASSWORD=your-secure-password

# API Keys
OPENAI_API_KEY=sk-your-key
CLAUDE_API_KEY=sk-ant-your-key

# Agent Configuration
AGENT_LLM_PROVIDER=claude
AGENT_CONVERSATION_HISTORY_KEEP=1
AGENT_MAX_ITERATIONS=10

# MCP Server
MCP_PLAYWRIGHT_SERVER_URL=http://localhost:8931/mcp
MCP_ACTION_TIMEOUT=30000
MCP_BROWSER=chrome

# Screenshots
SCREENSHOT_STORAGE_TYPE=local
```

## Troubleshooting

### Backend Won't Start

```bash
# Check Java version
java -version  # Should be 17+

# Check if port 8080 is in use
sudo lsof -i :8080

# Check database connection
psql -U youraitester -d youraitester -h localhost

# View full logs
cat /opt/youraitester/backend.log
```

### MCP Server Won't Start

```bash
# Check Node.js version
node --version  # Should be v20+

# Check if port 8931 is in use
sudo lsof -i :8931

# Check Playwright browsers
ls -la ~/.cache/ms-playwright/

# Test MCP server manually
npx @playwright/mcp --port 8931 --headless --browser chrome

# View MCP logs
cat /tmp/mcp-server.log
```

### "Browser not found" Error

```bash
# Reinstall Playwright browsers
export PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
npx -y playwright@latest install chromium
npx -y playwright@latest install-deps chromium
```

### Tests Failing with "about:blank"

This means `--shared-browser-context` is not working. Check:

```bash
# Verify MCP server command includes the flag
ps aux | grep "@playwright/mcp" | grep "shared-browser-context"

# If not, restart services
cd /opt/youraitester
./stop-services.sh
./start.sh
```

### High Memory Usage

```bash
# Check memory
free -h

# If low, consider:
# 1. Upgrade to t3.medium or larger
# 2. Add swap space
sudo dd if=/dev/zero of=/swapfile bs=1G count=2
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Maintenance

### Update Deployment

```bash
# From local machine, in backend directory:
./deploy-to-ec2.sh
```

This will rebuild and redeploy automatically.

### Restart Services

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Restart both services
cd /opt/youraitester
./stop-services.sh && ./start.sh

# Or restart individually:
./stop-services.sh
pkill -f "@playwright/mcp"  # Stop MCP
kill $(cat backend.pid)      # Stop backend
./start.sh                   # Start both
```

### View Logs in Real-Time

```bash
# Backend logs
tail -f /opt/youraitester/backend.log

# MCP logs
tail -f /tmp/mcp-server.log

# Both together
tail -f /opt/youraitester/backend.log /tmp/mcp-server.log
```

### Database Backup

```bash
# Backup
pg_dump -U youraitester -h localhost youraitester > backup_$(date +%Y%m%d).sql

# Restore
psql -U youraitester -h localhost youraitester < backup_20241223.sql
```

### Clean Up Old Screenshots

```bash
# Find screenshots older than 7 days
find /opt/youraitester/screenshots -type f -mtime +7

# Delete them
find /opt/youraitester/screenshots -type f -mtime +7 -delete
```

## Security Best Practices

1. **Change Default Passwords**: Update PostgreSQL password from default
2. **Restrict Security Group**: Only allow necessary IPs to access port 8080
3. **Use Environment Variables**: Never commit API keys to git
4. **Enable HTTPS**: Use a reverse proxy (nginx) with SSL certificate
5. **Regular Updates**: Keep OS and dependencies updated
6. **Monitoring**: Set up CloudWatch or similar for alerts

## Scaling Considerations

### For Production:

1. **Use RDS**: Replace local PostgreSQL with AWS RDS
2. **Load Balancer**: Use ALB for multiple instances
3. **Auto Scaling**: Configure ASG based on CPU/memory
4. **S3 for Screenshots**: Store screenshots in S3 instead of local disk
5. **CloudFront CDN**: Serve static assets via CloudFront
6. **Container Orchestration**: Consider ECS or EKS for better management

## Next Steps

1. Set up monitoring (CloudWatch, Datadog, etc.)
2. Configure automated backups
3. Set up SSL/TLS with Let's Encrypt or ACM
4. Configure log rotation
5. Set up alerts for service failures
6. Consider systemd services for auto-restart on boot

## Support

For issues or questions:
- Check logs first: `/opt/youraitester/backend.log` and `/tmp/mcp-server.log`
- Review documentation: `FINAL_SESSION_SOLUTION.md`, `SESSION_RESET_FIX.md`
- Check MCP server status: `ps aux | grep "@playwright/mcp"`
