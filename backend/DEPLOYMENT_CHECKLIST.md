# EC2 Deployment Checklist

## Pre-Deployment

### ☐ EC2 Instance Setup
- [ ] EC2 instance launched (t3.medium or larger)
- [ ] Amazon Linux 2 or Ubuntu 22.04
- [ ] Security group configured:
  - [ ] Port 22 (SSH) - Your IP only
  - [ ] Port 8080 (Backend) - Open to users
- [ ] SSH key pair (.pem) available
- [ ] Can SSH into instance

### ☐ Server Dependencies (Run on EC2)
```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check versions:
java -version    # Should be 17+
node --version   # Should be v20+
psql --version   # Should be v12+
```

- [ ] Java 17 installed
- [ ] Node.js 20 installed
- [ ] PostgreSQL installed and running
- [ ] Playwright browsers installed

### ☐ PostgreSQL Setup
```bash
sudo -u postgres psql
CREATE DATABASE youraitester;
CREATE USER youraitester WITH ENCRYPTED PASSWORD 'secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE youraitester TO youraitester;
```

- [ ] Database created
- [ ] User created with secure password
- [ ] Permissions granted

### ☐ Application Directory
```bash
sudo mkdir -p /opt/youraitester
sudo chown $(whoami):$(whoami) /opt/youraitester
cd /opt/youraitester
mkdir -p logs screenshots
```

- [ ] `/opt/youraitester` directory created
- [ ] Proper ownership set
- [ ] Subdirectories created

## Deployment Configuration

### ☐ Update deploy-to-ec2.sh
Edit `backend/deploy-to-ec2.sh` and update:

```bash
EC2_HOST="3.137.217.41"           # ← Your EC2 IP/domain
EC2_USER="ec2-user"                # ← ec2-user or ubuntu
EC2_KEY="../key1.pem"              # ← Path to your .pem file
OPENAI_API_KEY="sk-..."            # ← Your OpenAI key
CLAUDE_API_KEY="sk-ant-..."        # ← Your Claude key
AGENT_LLM_PROVIDER="claude"        # ← claude or openai
```

- [ ] EC2_HOST updated
- [ ] EC2_USER correct
- [ ] EC2_KEY path correct
- [ ] OPENAI_API_KEY set
- [ ] CLAUDE_API_KEY set
- [ ] AGENT_LLM_PROVIDER chosen

### ☐ Test SSH Connection
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# Should connect successfully
```

- [ ] SSH connection works

## Deploy

### ☐ Run Deployment
```bash
cd backend
./deploy-to-ec2.sh
```

**Expected output:**
```
================================
Deploying to EC2: 3.137.217.41
================================
Building backend...
[INFO] BUILD SUCCESS
Uploading files to EC2...
Updating environment variables...
Installing Playwright browsers...
Restarting services...
================================
Deployment Complete!
================================
```

- [ ] Build successful
- [ ] Files uploaded
- [ ] Environment configured
- [ ] Playwright browsers installed
- [ ] Services started

## Post-Deployment Verification

### ☐ Check Services Running
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
ps aux | grep -E "java|@playwright/mcp" | grep -v grep
```

**Should see:**
- Java process running backend.jar
- npx process running @playwright/mcp

- [ ] Backend process running
- [ ] MCP server process running

### ☐ Check Health Endpoint
```bash
curl http://your-ec2-ip:8080/actuator/health
```

**Expected:**
```json
{"status":"UP"}
```

- [ ] Health endpoint returns UP

### ☐ Check Logs
```bash
# Backend logs
tail -20 /opt/youraitester/backend.log

# MCP logs
tail -20 /tmp/mcp-server.log
```

**Look for:**
- `Started TestAutomationBackendApplication` in backend.log
- `Listening on http://localhost:8931` in mcp-server.log
- No ERROR messages

- [ ] Backend started successfully
- [ ] MCP server started successfully
- [ ] No critical errors in logs

### ☐ Test API
```bash
# From your local machine:
curl http://your-ec2-ip:8080/api/projects
```

**Expected:**
- JSON array (empty or with data)
- HTTP 200 status

- [ ] API responds correctly

### ☐ Test Frontend Connection
If you have the frontend deployed:
- [ ] Frontend can connect to backend
- [ ] Login works
- [ ] Projects load
- [ ] Can create/run tests

## Common Issues

### ❌ "Backend won't start"
```bash
# Check Java version
java -version

# Check database
psql -U youraitester -d youraitester -h localhost

# View logs
cat /opt/youraitester/backend.log | grep ERROR
```

### ❌ "MCP server won't start"
```bash
# Check Node version
node --version

# Check Playwright
ls ~/.cache/ms-playwright/chromium*/chrome-linux/chrome

# Reinstall if needed
npx -y playwright@latest install chromium
```

### ❌ "Tests fail with about:blank"
```bash
# Check MCP server has --shared-browser-context
ps aux | grep "@playwright/mcp"

# Restart if missing
cd /opt/youraitester
./stop-services.sh && ./start.sh
```

### ❌ "Port 8080 already in use"
```bash
# Find and kill process
sudo lsof -i :8080
kill <PID>

# Restart
./start.sh
```

## Quick Commands Reference

```bash
# SSH to server
ssh -i your-key.pem ec2-user@your-ec2-ip

# View logs (real-time)
tail -f /opt/youraitester/backend.log
tail -f /tmp/mcp-server.log

# Check services
ps aux | grep java
ps aux | grep "@playwright/mcp"

# Restart services
cd /opt/youraitester
./stop-services.sh && ./start.sh

# Check health
curl http://localhost:8080/actuator/health

# View environment
cat /opt/youraitester/.env

# Database access
psql -U youraitester -d youraitester -h localhost
```

## Final Checklist

Before marking deployment complete:

- [ ] Backend responds to health check
- [ ] MCP server is running
- [ ] Can access API from external IP
- [ ] Tests can be created and run
- [ ] Screenshots are being saved
- [ ] Logs are being written
- [ ] No critical errors in logs

## Success Criteria

✅ **Deployment is successful when:**
1. Health endpoint returns `{"status":"UP"}`
2. Backend and MCP server processes are running
3. Can create a project via API
4. Can create and run a test
5. Test completes successfully
6. Screenshots are captured and accessible

## Next Steps After Deployment

1. **Set up monitoring**: CloudWatch, Datadog, etc.
2. **Configure backups**: PostgreSQL dumps, screenshot archives
3. **Set up SSL**: Use nginx reverse proxy with Let's Encrypt
4. **Configure log rotation**: Prevent disk space issues
5. **Set up alerts**: Email/Slack notifications for failures
6. **Document API endpoints**: For frontend team
7. **Create systemd services**: For auto-restart on reboot

## Support

If stuck, check:
1. `DEPLOYMENT_GUIDE.md` - Full deployment guide
2. Logs: `/opt/youraitester/backend.log` and `/tmp/mcp-server.log`
3. Process status: `ps aux | grep -E "java|mcp"`
4. Port status: `sudo lsof -i :8080` and `sudo lsof -i :8931`


