# Generic AI Agent Architecture

## Overview

This project now uses a **generic agent architecture** that can work with multiple LLM providers (OpenAI, Claude, etc.) and use the Playwright MCP server as a tool.

## Architecture

```
┌─────────────────────────────────────────────┐
│          TestExecutionService               │
│  (Orchestrates test execution)              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       AiTestExecutionService                │
│  (Delegates to generic agent)               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          AgentExecutor                      │
│  (Generic agent coordinator)                │
│  - Manages conversation history             │
│  - Handles tool call loop                   │
│  - Provider-agnostic                        │
└────────┬──────────────────┬─────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────────┐
│  LLM Provider   │  │  McpToolExecutor    │
│  (Interface)    │  │  (Executes tools)   │
├─────────────────┤  └──────────┬──────────┘
│ OpenAiProvider  │             │
│ ClaudeProvider  │             ▼
│ (Pluggable)     │  ┌─────────────────────┐
└─────────────────┘  │ PlaywrightMcpService│
                     │ (Docker MCP Server) │
                     └─────────────────────┘
```

## How It Works

### 1. Agent Execution Flow

When a test step like "type standard_user in username field" is executed:

1. **AgentExecutor** receives the instruction
2. **LLM Provider** (OpenAI/Claude) is called with available MCP tools
3. **LLM** decides to call `getContent()` tool to analyze the page
4. **McpToolExecutor** executes `getContent()` via **PlaywrightMcpService**
5. **MCP Server** returns the page HTML
6. **LLM** analyzes HTML and finds the correct selector (e.g., `#user-name`)
7. **LLM** decides to call `type()` tool with the found selector
8. **McpToolExecutor** executes `type()` via **PlaywrightMcpService**
9. **MCP Server** performs the actual browser action
10. Loop continues until task is complete

### 2. Key Components

#### LlmProvider Interface
```java
public interface LlmProvider {
    AgentResponse executeWithTools(
        List<Message> messages, 
        List<Tool> tools, 
        int maxIterations
    );
    String getProviderName();
    boolean isAvailable();
}
```

**Implementations:**
- `OpenAiProvider` - Uses OpenAI's Function Calling API
- `ClaudeProvider` - Uses Claude's Tool Use API
- Easily extensible for other providers (Gemini, Llama, etc.)

#### McpToolExecutor
Bridges between LLM tool calls and MCP server actions.

**Available Tools:**
- `navigate(url)` - Navigate to a URL
- `getContent()` - Get page HTML (critical for selector discovery)
- `click(selector)` - Click an element
- `type(selector, text)` - Type text into an input
- `select(selector, value)` - Select dropdown option
- `wait(milliseconds)` - Wait for specified time
- `screenshot()` - Take a screenshot
- `assert(selector)` - Verify element exists

#### AgentExecutor
Generic agent that:
- Works with any LLM provider
- Manages conversation history
- Handles tool call loop (up to max iterations)
- Returns execution results and logs

## Configuration

### application.properties

```properties
# OpenAI Configuration
openai.api.key=${OPENAI_API_KEY:your-api-key-here}
openai.model=${OPENAI_MODEL:gpt-4}
openai.timeout=${OPENAI_TIMEOUT:60}

# Claude (Anthropic) Configuration
claude.api.key=${CLAUDE_API_KEY:}
claude.model=${CLAUDE_MODEL:claude-3-5-sonnet-20241022}
claude.api.url=${CLAUDE_API_URL:https://api.anthropic.com/v1/messages}
claude.api.version=${CLAUDE_API_VERSION:2023-06-01}
claude.max.tokens=${CLAUDE_MAX_TOKENS:4096}

# Agent Configuration
agent.llm.provider=${AGENT_LLM_PROVIDER:openai}
agent.max.iterations=${AGENT_MAX_ITERATIONS:10}

# MCP Server
mcp.playwright.enabled=${MCP_PLAYWRIGHT_ENABLED:false}
mcp.playwright.server.url=${MCP_PLAYWRIGHT_SERVER_URL:http://localhost:3000}
```

### Switching LLM Providers

#### Use OpenAI:
```bash
export AGENT_LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
```

#### Use Claude:
```bash
export AGENT_LLM_PROVIDER=claude
export CLAUDE_API_KEY=sk-ant-...
```

## Running the System

### 1. Start MCP Server (Docker)
```bash
docker-compose up playwright-mcp
```

### 2. Start Backend with OpenAI
```bash
cd backend
export OPENAI_API_KEY="your-openai-key"
export MCP_PLAYWRIGHT_ENABLED=true
export AGENT_LLM_PROVIDER=openai
mvn spring-boot:run
```

### 3. Start Backend with Claude
```bash
cd backend
export CLAUDE_API_KEY="your-claude-key"
export MCP_PLAYWRIGHT_ENABLED=true
export AGENT_LLM_PROVIDER=claude
mvn spring-boot:run
```

## Example Execution Log

```
Instruction: "type standard_user in username field"

Agent Execution Log:
1. getContent() -> Returns: <html>...<input id="user-name">...</html>
2. type(selector="#user-name", text="standard_user") -> Success

Result: Task complete
```

## Benefits of This Architecture

1. **LLM Agnostic**: Switch between OpenAI, Claude, or any LLM provider
2. **Tool-Based**: LLM uses MCP as tools (proper agentic pattern)
3. **Intelligent Selector Discovery**: LLM sees HTML before choosing selectors
4. **Multi-Step Reasoning**: Can analyze, then act, then verify
5. **Extensible**: Easy to add new LLM providers or MCP tools
6. **Observable**: Full execution log for debugging

## Adding New LLM Providers

To add a new provider (e.g., Google Gemini):

1. Create `GeminiProvider.java` implementing `LlmProvider`
2. Add `@Component("gemini")` annotation
3. Add configuration to `application.properties`
4. Use: `export AGENT_LLM_PROVIDER=gemini`

Example:
```java
@Component("gemini")
public class GeminiProvider implements LlmProvider {
    @Override
    public AgentResponse executeWithTools(...) {
        // Implement Gemini function calling
    }
}
```

## Adding New MCP Tools

To add a new tool (e.g., hover):

1. Add tool definition to `McpToolExecutor.getAvailableTools()`
2. Add execution case to `McpToolExecutor.executeTool()`
3. Ensure MCP server supports the action

## Troubleshooting

### Agent not using tools
- Check logs for "Agent has X MCP tools available"
- Verify LLM provider is configured and available
- Check max iterations setting

### Wrong selector chosen
- LLM should call `getContent()` first
- If not, adjust system prompt in `AgentExecutor`
- Check page HTML is being returned correctly

### Max iterations reached
- Increase `agent.max.iterations` (default 10)
- Check if task is too complex
- Review execution log to see where it's stuck

## Testing

### Test with OpenAI
```bash
curl -X POST http://localhost:8080/api/tests/{testId}/execute \
  -H "Content-Type: application/json"
```

### Check logs
```bash
tail -f backend/logs/application.log
```

Look for:
- "Agent executing instruction: ..."
- "Agent calling tool: getContent"
- "Agent calling tool: type"
- "Agent task complete after X iterations"

## Future Enhancements

1. Add more LLM providers (Gemini, Llama, Mistral)
2. Add more MCP tools (hover, drag-drop, file upload)
3. Add tool result caching
4. Add parallel tool execution
5. Add agent memory/context persistence
6. Add self-healing tests (retry with different approach)
