# EC2 Backend Deployment Guide

## Prerequisites

1. **EC2 Instance**: Amazon Linux 2023, t3.medium or larger
2. **Security Group**: Open ports 22 (SSH), 8080 (Backend), 5432 (PostgreSQL - optional for external access)
3. **Key Pair**: Your EC2 SSH key (.pem file)

## Initial Setup (One-time)

### Step 1: Connect to EC2
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Step 2: Upload and Run Setup Script
From your **local machine**:
```bash
# Upload setup script
scp -i your-key.pem backend/setup-ec2.sh ec2-user@your-ec2-ip:~/

# Connect to EC2 and run setup
ssh -i your-key.pem ec2-user@your-ec2-ip
chmod +x setup-ec2.sh
./setup-ec2.sh
```

This will install:
- Java 17
- PostgreSQL 15
- Docker & Docker Compose
- Node.js 20

### Step 3: Update OpenAI API Key
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
nano /opt/youraitester/.env
# Update OPENAI_API_KEY with your actual key
```

## Deploy Application

### Option 1: Automated Deployment (Recommended)
From your **local machine**:

1. Edit `backend/deploy-to-ec2.sh`:
   - Set `EC2_HOST`
   - Set `EC2_KEY`
   - Set `OPENAI_API_KEY`

2. Run deployment:
```bash
chmod +x backend/deploy-to-ec2.sh
./backend/deploy-to-ec2.sh
```

### Option 2: Manual Deployment
```bash
# Build backend
cd backend
mvn clean package -DskipTests

# Upload to EC2
scp -i your-key.pem target/test-automation-backend-1.0.0.jar ec2-user@your-ec2-ip:/opt/youraitester/
scp -i your-key.pem -r mcp-server ec2-user@your-ec2-ip:/opt/youraitester/

# Start services on EC2
ssh -i your-key.pem ec2-user@your-ec2-ip
cd /opt/youraitester
bash start-services.sh
```

## Service Management

### Start Services
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
bash /opt/youraitester/start-services.sh
```

### Stop Services
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
bash /opt/youraitester/stop-services.sh
```

### Check Status
```bash
# Backend health
curl http://localhost:8080/actuator/health

# MCP container
docker ps | grep playwright-mcp

# View backend logs
tail -f /opt/youraitester/logs/application.log

# View MCP logs
docker logs -f playwright-mcp
```

## Update Frontend to Use Backend

Update `src/api/base44Client.js`:
```javascript
const API_BASE_URL = 'http://your-ec2-ip:8080/api';
```

Or use domain name if you set up Route53:
```javascript
const API_BASE_URL = 'https://api.yourqatester.com/api';
```

## Setup Domain for Backend (Optional)

1. **Route 53**: Create A record pointing to EC2 public IP
   - `api.yourqatester.com` → EC2 IP

2. **Security Group**: Open port 443 for HTTPS

3. **Install Nginx** (for reverse proxy and SSL):
```bash
sudo dnf install -y nginx certbot python3-certbot-nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourqatester.com

# Configure nginx to proxy to backend
sudo nano /etc/nginx/conf.d/api.conf
```

Nginx config:
```nginx
server {
    listen 80;
    server_name api.yourqatester.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourqatester.com;

    ssl_certificate /etc/letsencrypt/live/api.yourqatester.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourqatester.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Backend won't start
```bash
# Check Java is installed
java -version

# Check if port is in use
sudo lsof -i :8080

# Check logs
tail -f /opt/youraitester/logs/application.log
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U testuser -d test_automation

# Check PostgreSQL logs
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

### MCP server issues
```bash
# Check Docker is running
sudo systemctl status docker

# Check MCP container
docker ps -a | grep playwright-mcp

# Restart MCP
cd /opt/youraitester/mcp-server
docker-compose down
docker-compose up -d

# View MCP logs
docker logs -f playwright-mcp
```

## Security Recommendations

1. **Database**: Keep PostgreSQL on localhost only (don't open port 5432)
2. **API Key**: Store OpenAI key in AWS Secrets Manager
3. **Firewall**: Use security groups to restrict access
4. **SSL**: Always use HTTPS in production
5. **Backups**: Setup automated PostgreSQL backups
