# Quick Start: Generic AI Agent with MCP

## What Changed?

Your test automation system now uses a **generic AI agent** that can work with **OpenAI, Claude, or any LLM provider**, and uses the Playwright MCP server as a tool (proper agentic architecture).

## Quick Start

### Option 1: Use OpenAI (Default)

```bash
# 1. Start MCP server
docker-compose up -d playwright-mcp

# 2. Start backend with OpenAI
cd backend
export OPENAI_API_KEY="your-openai-api-key"
export MCP_PLAYWRIGHT_ENABLED=true
export AGENT_LLM_PROVIDER=openai
mvn spring-boot:run
```

### Option 2: Use Claude (Anthropic)

```bash
# 1. Start MCP server
docker-compose up -d playwright-mcp

# 2. Start backend with Claude
cd backend
export CLAUDE_API_KEY="your-claude-api-key"
export MCP_PLAYWRIGHT_ENABLED=true
export AGENT_LLM_PROVIDER=claude
mvn spring-boot:run
```

## What Happens Now?

When you run a test with instruction "type standard_user in username field":

### Old Architecture (BROKEN)
```
❌ OpenAI guesses selector "#username" without seeing page
❌ MCP tries to find "#username"
❌ Times out - selector doesn't exist
```

### New Architecture (WORKING)
```
✅ Agent calls getContent() → Gets page HTML
✅ OpenAI/Claude analyzes HTML → Finds selector "#user-name"  
✅ Agent calls type("#user-name", "standard_user")
✅ MCP executes successfully
```

## Key Features

1. **Multiple LLM Providers**: Switch between OpenAI, Claude, etc. with one environment variable
2. **Tool-Based Execution**: LLM uses MCP as tools (proper function calling)
3. **Intelligent Selectors**: LLM sees HTML before choosing selectors
4. **Multi-Step Reasoning**: Can analyze, execute, verify in multiple steps
5. **Full Execution Log**: See every tool call for debugging

## Configuration

### Environment Variables

```bash
# Choose LLM provider
AGENT_LLM_PROVIDER=openai    # or: claude, gemini (future)

# OpenAI config
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4           # or: gpt-4-turbo, gpt-3.5-turbo

# Claude config  
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Agent config
AGENT_MAX_ITERATIONS=10      # Max tool calls per instruction

# MCP server
MCP_PLAYWRIGHT_ENABLED=true
MCP_PLAYWRIGHT_SERVER_URL=http://localhost:3000
```

## Verifying It Works

### 1. Check Logs

```bash
tail -f backend/logs/application.log
```

Look for:
```
Agent executing instruction: type standard_user in username field
Agent calling tool: getContent
Agent calling tool: type
Agent task complete after 2 iterations
```

### 2. Run a Test

From frontend or API:
```bash
curl -X POST http://localhost:8080/api/tests/{testId}/execute
```

### 3. Check Execution Log

Logs will show:
```
Agent execution log:
  - getContent({}) -> Page content retrieved: <html>...
  - type({selector="#user-name", text="standard_user"}) -> Success
```

## Troubleshooting

### "LLM provider not available"
- Check API key is set: `echo $OPENAI_API_KEY`
- Check provider name: `echo $AGENT_LLM_PROVIDER`
- Backend logs: "OpenAI provider is not configured"

### "MCP execution failed"
- Check MCP server running: `docker ps | grep playwright`
- Check MCP health: `curl http://localhost:3000/health`
- Backend logs: "MCP execution failed"

### "Max iterations reached"
- Task may be too complex
- Increase: `AGENT_MAX_ITERATIONS=20`
- Check execution log to see where it's stuck

### Agent not calling getContent()
- This should happen automatically
- If not, check system prompt in `AgentExecutor.java`
- May need to add emphasis: "ALWAYS call getContent() first"

## Testing Different Providers

### Test OpenAI
```bash
# Terminal 1: Backend with OpenAI
export AGENT_LLM_PROVIDER=openai
export OPENAI_API_KEY="sk-..."
mvn spring-boot:run

# Terminal 2: Run test
curl -X POST http://localhost:8080/api/tests/your-test-id/execute
```

### Test Claude
```bash
# Terminal 1: Backend with Claude
export AGENT_LLM_PROVIDER=claude
export CLAUDE_API_KEY="sk-ant-..."
mvn spring-boot:run

# Terminal 2: Run test (same as above)
```

## What You Can Do

1. **Switch LLM providers** instantly with environment variable
2. **Compare performance** between OpenAI and Claude
3. **Add more providers** easily (see AGENT_ARCHITECTURE.md)
4. **Debug execution** with full tool call logs
5. **Extend tools** by adding to McpToolExecutor

## Next Steps

1. ✅ Test with OpenAI (you have the key)
2. ⬜ Try with Claude (if you have an API key)
3. ⬜ Add more MCP tools (hover, drag-drop, etc.)
4. ⬜ Add self-healing (retry with different approach)
5. ⬜ Add more LLM providers (Gemini, Llama, etc.)

## Documentation

- **Full Architecture**: See `AGENT_ARCHITECTURE.md`
- **MCP Setup**: See existing MCP documentation
- **OpenAI Setup**: See `OPENAI_MCP_SETUP.md`

## Important Files

- `AgentExecutor.java` - Main agent coordinator
- `OpenAiProvider.java` - OpenAI implementation
- `ClaudeProvider.java` - Claude implementation  
- `McpToolExecutor.java` - MCP tools bridge
- `AiTestExecutionService.java` - Simplified service using agent
- `application.properties` - Configuration

## Support

If something doesn't work:

1. Check logs: `tail -f backend/logs/application.log`
2. Check MCP: `docker logs playwright-mcp-server`
3. Check config: `cat backend/src/main/resources/application.properties`
4. Review architecture: `cat backend/AGENT_ARCHITECTURE.md`

---

**You now have a production-ready, LLM-agnostic, tool-based AI testing agent! 🚀**
