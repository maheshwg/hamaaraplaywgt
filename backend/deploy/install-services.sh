#!/bin/bash

# Install systemd services for YourAITester
# Run this after copying application files to /opt/youraitester/

set -e

echo "================================================================"
echo "Installing YourAITester Services"
echo "================================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check if application files exist
if [ ! -f "/opt/youraitester/backend.jar" ]; then
    echo "ERROR: backend.jar not found in /opt/youraitester/"
    echo "Please copy your application files first"
    exit 1
fi

if [ ! -f "/opt/youraitester/.env" ]; then
    echo "ERROR: .env file not found in /opt/youraitester/"
    echo "Please copy your .env file first"
    exit 1
fi

# Install Playwright browsers for the youraitester user
echo "Installing Playwright browsers..."
sudo -u youraitester bash -c "PLAYWRIGHT_BROWSERS_PATH=/home/youraitester/.cache/ms-playwright npx -y playwright@latest install chromium"

# Copy service files
echo "Installing systemd service files..."
cp /opt/youraitester/deploy/youraitester-backend.service /etc/systemd/system/
cp /opt/youraitester/deploy/youraitester-mcp.service /etc/systemd/system/

# Reload systemd
echo "Reloading systemd..."
systemctl daemon-reload

# Enable services
echo "Enabling services..."
systemctl enable youraitester-mcp.service
systemctl enable youraitester-backend.service

# Start MCP server first
echo "Starting MCP server..."
systemctl start youraitester-mcp.service
sleep 3

# Check MCP status
if systemctl is-active --quiet youraitester-mcp.service; then
    echo "✓ MCP server started successfully"
else
    echo "✗ MCP server failed to start"
    journalctl -u youraitester-mcp.service -n 50
    exit 1
fi

# Start backend
echo "Starting backend service..."
systemctl start youraitester-backend.service
sleep 5

# Check backend status
if systemctl is-active --quiet youraitester-backend.service; then
    echo "✓ Backend started successfully"
else
    echo "✗ Backend failed to start"
    journalctl -u youraitester-backend.service -n 50
    exit 1
fi

echo ""
echo "================================================================"
echo "Services Installed Successfully!"
echo "================================================================"
echo ""
echo "Service Status:"
systemctl status youraitester-mcp.service --no-pager -l
echo ""
systemctl status youraitester-backend.service --no-pager -l
echo ""
echo "Useful commands:"
echo "  sudo systemctl status youraitester-backend"
echo "  sudo systemctl status youraitester-mcp"
echo "  sudo systemctl restart youraitester-backend"
echo "  sudo systemctl restart youraitester-mcp"
echo "  sudo journalctl -u youraitester-backend -f"
echo "  sudo journalctl -u youraitester-mcp -f"
echo "  tail -f /var/log/youraitester/backend.log"
echo "  tail -f /var/log/youraitester/mcp.log"
echo ""


