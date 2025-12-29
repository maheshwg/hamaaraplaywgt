# ✅ Scripts Updated for Official MCP Server

## Summary

All start/stop scripts have been updated to use the **official Microsoft Playwright MCP server** instead of the custom Docker container.

---

## 🎯 Quick Start

### Local Development
```bash
cd backend

# Create .env file (first time only)
cat > .env << EOF
OPENAI_API_KEY=your-key-here
AGENT_LLM_PROVIDER=openai
EOF

# Start all services
./start.sh

# Stop all services
./stop-services.sh
```

### Production (EC2)
```bash
cd /opt/youraitester

# Start services
./start-services.sh

# Stop services
./stop-services.sh
```

---

## 📝 What Changed

### Old Setup (Custom Docker)
- Docker container on port 3000
- URL: `http://localhost:3000`
- Start: `docker run ...`
- Stop: `docker stop playwright-mcp`

### New Setup (Official MCP)
- NPX process on port 8931
- URL: `http://localhost:8931/mcp`
- Start: `npx @playwright/mcp@latest --port 8931`
- Stop: `pkill -f "@playwright/mcp"`

---

## ✨ New Features

1. **✅ Colorful Output** - Green ✓ for success, Yellow ⚠ for warnings, Red ✗ for errors
2. **✅ Health Checks** - Verifies MCP server is ready before starting backend
3. **✅ PID Management** - Saves PIDs for clean shutdown
4. **✅ Claude Support** - Automatically detects and uses Claude if configured
5. **✅ Better Logging** - Shows configuration and log file locations
6. **✅ Cleanup** - Removes old Docker containers automatically

---

## 📚 Documentation

See `START_STOP_SCRIPTS.md` for:
- Detailed usage examples
- Troubleshooting guide
- Environment variables reference
- Migration instructions

---

## 🚀 Ready to Use!

The scripts are immediately ready to use. Just run:
```bash
./backend/start.sh
```

And you're good to go!

