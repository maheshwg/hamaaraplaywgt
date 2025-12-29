#!/bin/bash

# Deployment script for YourAITester Backend
# Run this from your local machine to deploy to EC2

set -e

# Configuration - UPDATE THESE!
EC2_HOST="your-ec2-instance.compute.amazonaws.com"
EC2_USER="ubuntu"
EC2_KEY="path/to/your-key.pem"
APP_DIR="/opt/youraitester"

echo "================================================================"
echo "Deploying YourAITester Backend to EC2"
echo "================================================================"
echo "Target: $EC2_USER@$EC2_HOST"
echo ""

# Build the application
echo "Building application..."
mvn clean package -DskipTests

if [ ! -f "target/test-automation-backend-1.0.0.jar" ]; then
    echo "ERROR: Build failed - JAR file not found"
    exit 1
fi

echo "✓ Build successful"

# Create deployment package
echo "Creating deployment package..."
mkdir -p deploy-package
cp target/test-automation-backend-1.0.0.jar deploy-package/backend.jar
cp -r deploy deploy-package/
cp agent-prompt-categories-mcp.json deploy-package/
cp agent-system-prompt.txt deploy-package/

# Copy .env if it exists (user should customize this)
if [ -f ".env.production" ]; then
    cp .env.production deploy-package/.env
    echo "✓ Using .env.production"
else
    echo "WARNING: .env.production not found - using .env"
    if [ -f ".env" ]; then
        cp .env deploy-package/.env
    else
        echo "ERROR: No .env file found!"
        exit 1
    fi
fi

# Create tarball
echo "Creating tarball..."
tar -czf deploy-package.tar.gz -C deploy-package .
echo "✓ Deployment package created"

# Upload to EC2
echo "Uploading to EC2..."
scp -i "$EC2_KEY" deploy-package.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# Extract and deploy on EC2
echo "Deploying on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
    set -e
    
    echo "Stopping services..."
    sudo systemctl stop youraitester-backend.service || true
    sudo systemctl stop youraitester-mcp.service || true
    
    echo "Extracting deployment package..."
    sudo mkdir -p /opt/youraitester
    cd /tmp
    sudo tar -xzf deploy-package.tar.gz -C /opt/youraitester/
    sudo chown -R youraitester:youraitester /opt/youraitester
    
    echo "Installing/updating services..."
    sudo chmod +x /opt/youraitester/deploy/*.sh
    sudo /opt/youraitester/deploy/install-services.sh
    
    echo "Cleaning up..."
    rm /tmp/deploy-package.tar.gz
    
    echo "✓ Deployment complete!"
ENDSSH

# Cleanup local files
echo "Cleaning up local files..."
rm -rf deploy-package deploy-package.tar.gz

echo ""
echo "================================================================"
echo "Deployment Complete!"
echo "================================================================"
echo ""
echo "To check status:"
echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  sudo systemctl status youraitester-backend"
echo ""
echo "To view logs:"
echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  sudo journalctl -u youraitester-backend -f"
echo ""


