# Using Claude Sonnet with Official MCP Server

## ✅ Claude Provider is Ready!

The Claude provider has been updated and is fully working with the official Microsoft Playwright MCP server.

---

## 🔧 Configuration

### 1. Set Your Claude API Key

**Option A: Environment Variable (Recommended)**
```bash
export CLAUDE_API_KEY="your-claude-api-key-here"
```

**Option B: In application.properties**
```properties
claude.api.key=your-claude-api-key-here
```

### 2. Switch to Claude Provider

**Option A: Environment Variable**
```bash
export AGENT_LLM_PROVIDER=claude
```

**Option B: In application.properties**
```properties
agent.llm.provider=claude
```

---

## 📋 Current Claude Configuration

```properties
# Model: Claude 3.5 Sonnet (latest)
claude.model=claude-3-5-sonnet-20241022

# API Version: Latest (October 2024 - better tool support)
claude.api.version=2024-10-22

# Max Tokens: 8192 (increased from 4096 for longer responses)
claude.max.tokens=8192

# API URL
claude.api.url=https://api.anthropic.com/v1/messages
```

---

## 🎯 What's Been Fixed

### 1. ✅ Proper Tool Call Handling
- Claude now correctly returns tool calls with proper IDs
- Tool results are properly formatted in Claude's expected format

### 2. ✅ Better Logging
- Shows message count and preview of last 3 messages
- Logs stop reasons and tool call counts
- Shows final message content

### 3. ✅ Updated API Version
- Now using `2024-10-22` (latest) instead of `2023-06-01`
- Better tool use support
- More stable responses

### 4. ✅ Increased Token Limit
- Changed from 4096 to 8192 max tokens
- Allows for longer accessibility trees and responses

### 5. ✅ Works with Official MCP Tools
- Compatible with `browser_navigate`, `browser_snapshot`, `browser_click`, etc.
- Properly handles ref tokens from accessibility trees
- No code changes needed from OpenAI version

---

## 🚀 How to Start with Claude

### 1. Ensure MCP Server is Running
```bash
# Should already be running from before
ps aux | grep "playwright.*mcp"

# If not running:
cd /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend
npx @playwright/mcp@latest --port 8931 --headless &
```

### 2. Start Backend with Claude
```bash
cd /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend

# Set environment variables
export CLAUDE_API_KEY="your-api-key-here"
export AGENT_LLM_PROVIDER=claude

# Start backend
java -jar target/test-automation-backend-0.0.1-SNAPSHOT.jar
```

### 3. Test with a Simple Step
Create a test:
- **appUrl**: `https://www.saucedemo.com`
- **Step**: "click on login button"

Watch the logs for:
```
Claude: Executing with 9 tools, max 10 iterations
Claude: Tool use requested: browser_snapshot
Claude: Tool use requested: browser_click
Claude: Task complete
```

---

## 🔀 Switching Between Providers

### Quick Switch (No Rebuild Needed)

**To Claude:**
```bash
export AGENT_LLM_PROVIDER=claude
export CLAUDE_API_KEY="your-claude-key"
```

**To OpenAI:**
```bash
export AGENT_LLM_PROVIDER=openai
export OPENAI_API_KEY="your-openai-key"
```

Then restart the backend.

---

## 🆚 Claude vs OpenAI

| Feature | Claude Sonnet | GPT-4 Turbo |
|---------|---------------|-------------|
| **Model** | claude-3-5-sonnet-20241022 | gpt-4-turbo |
| **Max Tokens** | 8192 | ~4096 (default) |
| **Tool Use** | Native tool use API | Function calling |
| **Cost** | ~$3/1M input tokens | ~$10/1M input tokens |
| **Speed** | Fast | Fast |
| **Context Window** | 200K | 128K |
| **Best For** | Long conversations, complex reasoning | Quick tasks, vision |

---

## 🐛 Troubleshooting

### "Claude provider is not configured"
- Check if `CLAUDE_API_KEY` is set
- Verify it's not empty in application.properties

### "401 Unauthorized"
- Invalid API key
- Check your Anthropic console for the correct key

### "429 Rate Limit"
- Too many requests
- Wait a few seconds and try again
- Check your Anthropic usage limits

### Claude stops without completing task
- Check logs for stop_reason
- May need to increase `claude.max.tokens` if responses are too long
- Verify accessibility tree isn't too large

---

## 📊 Comparison: Test Run Logs

**OpenAI GPT-4 Turbo:**
```
OpenAI: Executing with 9 tools, max 1 iterations
OpenAI: Request iteration 1, estimated tokens: 3500
```

**Claude Sonnet:**
```
Claude: Executing with 9 tools, max 10 iterations
Claude: Message count: 2, last 3 messages: [{role:system, contentLength:2500}, {role:user, contentLength:42}]
Claude: Tool use requested: browser_snapshot
```

---

## ✅ Ready to Use!

The Claude provider is fully configured and ready to use with the official MCP server. Just set your API key and switch the provider!

**Recommendation**: Try Claude Sonnet first - it's cheaper and has excellent tool use capabilities that work great with accessibility trees.

