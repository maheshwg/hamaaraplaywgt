#!/bin/bash

################################################################################
# Local Deployment Script for YourAITester Backend
# Run this from your LOCAL machine to deploy to EC2
#
# Uses Official Playwright MCP Server (no Docker needed)
################################################################################

# Configuration - UPDATE THESE!
EC2_HOST="18.223.206.204"
EC2_USER="ec2-user"
EC2_KEY="../key1.pem"

# API Keys - UPDATE THESE!
OPENAI_API_KEY="your-openai-key-here"
CLAUDE_API_KEY="your-claude-key-here"

# Agent Configuration
AGENT_LLM_PROVIDER="claude"  # or "openai"
AGENT_CONVERSATION_HISTORY_KEEP="1"

# AWS S3 Configuration (optional - for screenshots)
AWS_S3_BUCKET="yourqatester-screenshots"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY="your-aws-access-key"
AWS_SECRET_KEY="your-aws-secret-key"
AWS_CLOUDFRONT_URL=""  # Optional: CloudFront distribution URL

echo "================================"
echo "Deploying to EC2: $EC2_HOST"
echo "================================"

# Build backend
echo "Building backend..."
mvn clean package -DskipTests

# Upload files to EC2
echo "Uploading files to EC2..."
scp -i "$EC2_KEY" target/test-automation-backend-1.0.0.jar ${EC2_USER}@${EC2_HOST}:/opt/youraitester/backend.jar
scp -i "$EC2_KEY" start.sh ${EC2_USER}@${EC2_HOST}:/opt/youraitester/
scp -i "$EC2_KEY" stop-services.sh ${EC2_USER}@${EC2_HOST}:/opt/youraitester/
scp -i "$EC2_KEY" agent-prompt-categories-mcp.json ${EC2_USER}@${EC2_HOST}:/opt/youraitester/
scp -i "$EC2_KEY" agent-system-prompt.txt ${EC2_USER}@${EC2_HOST}:/opt/youraitester/

# Create necessary directories
ssh -i "$EC2_KEY" ${EC2_USER}@${EC2_HOST} "mkdir -p /opt/youraitester/screenshots /opt/youraitester/logs"

# Update environment variables
echo "Updating environment variables..."
ssh -i "$EC2_KEY" ${EC2_USER}@${EC2_HOST} << EOF
    cd /opt/youraitester
    # Create .env if it doesn't exist
    touch .env
    
    # Update or add environment variables for new MCP setup
    grep -q "^OPENAI_API_KEY=" .env && sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=${OPENAI_API_KEY}/" .env || echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env
    grep -q "^CLAUDE_API_KEY=" .env && sed -i "s/CLAUDE_API_KEY=.*/CLAUDE_API_KEY=${CLAUDE_API_KEY}/" .env || echo "CLAUDE_API_KEY=${CLAUDE_API_KEY}" >> .env
    grep -q "^AGENT_LLM_PROVIDER=" .env && sed -i "s/AGENT_LLM_PROVIDER=.*/AGENT_LLM_PROVIDER=${AGENT_LLM_PROVIDER}/" .env || echo "AGENT_LLM_PROVIDER=${AGENT_LLM_PROVIDER}" >> .env
    grep -q "^AGENT_CONVERSATION_HISTORY_KEEP=" .env && sed -i "s/AGENT_CONVERSATION_HISTORY_KEEP=.*/AGENT_CONVERSATION_HISTORY_KEEP=${AGENT_CONVERSATION_HISTORY_KEEP}/" .env || echo "AGENT_CONVERSATION_HISTORY_KEEP=${AGENT_CONVERSATION_HISTORY_KEEP}" >> .env
    
    # Official MCP Server URL
    grep -q "^MCP_PLAYWRIGHT_SERVER_URL=" .env && sed -i "s|MCP_PLAYWRIGHT_SERVER_URL=.*|MCP_PLAYWRIGHT_SERVER_URL=http://localhost:8931/mcp|" .env || echo "MCP_PLAYWRIGHT_SERVER_URL=http://localhost:8931/mcp" >> .env
    grep -q "^MCP_ACTION_TIMEOUT=" .env && sed -i "s/MCP_ACTION_TIMEOUT=.*/MCP_ACTION_TIMEOUT=30000/" .env || echo "MCP_ACTION_TIMEOUT=30000" >> .env
    grep -q "^MCP_BROWSER=" .env && sed -i "s/MCP_BROWSER=.*/MCP_BROWSER=chrome/" .env || echo "MCP_BROWSER=chrome" >> .env
    
    # Screenshot storage (local for now)
    grep -q "^SCREENSHOT_STORAGE_TYPE=" .env && sed -i "s/SCREENSHOT_STORAGE_TYPE=.*/SCREENSHOT_STORAGE_TYPE=local/" .env || echo "SCREENSHOT_STORAGE_TYPE=local" >> .env
    
    # Optional S3 configuration
    grep -q "^AWS_S3_BUCKET=" .env && sed -i "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=${AWS_S3_BUCKET}/" .env || echo "AWS_S3_BUCKET=${AWS_S3_BUCKET}" >> .env
    grep -q "^AWS_REGION=" .env && sed -i "s/AWS_REGION=.*/AWS_REGION=${AWS_REGION}/" .env || echo "AWS_REGION=${AWS_REGION}" >> .env
    
    # Make scripts executable
    chmod +x *.sh
    mkdir -p logs screenshots
EOF

# Install Playwright browsers if not already installed
echo "Installing Playwright browsers..."
ssh -i "$EC2_KEY" ${EC2_USER}@${EC2_HOST} << EOF
    export PLAYWRIGHT_BROWSERS_PATH="\$HOME/.cache/ms-playwright"
    npx -y playwright@latest install chromium 2>/dev/null || echo "Playwright browsers already installed"
EOF

# Restart services
echo "Restarting services..."
ssh -i "$EC2_KEY" ${EC2_USER}@${EC2_HOST} << EOF
    cd /opt/youraitester
    ./stop-services.sh
    sleep 3
    ./start.sh
EOF

echo ""
echo "================================"
echo "Deployment Complete!"
echo "================================"
echo ""
echo "Backend URL: http://${EC2_HOST}:8080"
echo "MCP Server: http://${EC2_HOST}:8931/mcp"
echo ""
echo "Useful commands:"
echo ""
echo "Check health:"
echo "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} 'curl http://localhost:8080/actuator/health'"
echo ""
echo "View backend logs:"
echo "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} 'tail -f /opt/youraitester/backend.log'"
echo ""
echo "View MCP logs:"
echo "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} 'tail -f /tmp/mcp-server.log'"
echo ""
echo "Check running processes:"
echo "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST} 'ps aux | grep -E \"java|@playwright/mcp\" | grep -v grep'"
echo ""
echo "SSH to server:"
echo "  ssh -i $EC2_KEY ${EC2_USER}@${EC2_HOST}"
echo ""
