# Conversation History Truncation

## Overview
To prevent Claude API token limit errors during complex multi-step interactions (like date pickers), we've implemented configurable conversation history truncation.

## The Problem
- Complex UI interactions require multiple tool calls (snapshot → click → snapshot → click...)
- Each `browser_snapshot` returns a large accessibility tree (5K-10K tokens)
- The full conversation history is sent to Claude on each iteration
- After 6-7 tool calls, accumulated history can exceed the 30,000 input tokens/minute rate limit

## The Solution
**Configurable History Truncation**: Keep only the most recent N iterations in the conversation history sent to Claude.

### What Gets Kept
- **Always kept**: System prompt + original user instruction
- **Configurable**: Last N iterations (assistant message with tool calls + tool results)

### Configuration

#### Environment Variable (`.env`)
```bash
# Keep history for N previous tool call iterations
# 0 = no history (only current), 1 = keep last iteration, 2 = keep last 2 iterations (default)
AGENT_CONVERSATION_HISTORY_KEEP=2
```

#### Application Properties (`application.properties`)
```properties
# Conversation history truncation: keep history for N previous tool call iterations
# 0 = no history (only current), 1 = keep last iteration, 2 = keep last 2 iterations, etc.
agent.conversation.history.keep=${AGENT_CONVERSATION_HISTORY_KEEP:2}
```

### How It Works

1. **Before sending to Claude**: `ClaudeProvider.truncateHistory()` is called
2. **System + Instruction**: Always preserved (first 2 messages)
3. **Recent Iterations**: Keeps last N iterations (working backwards from most recent)
4. **Old History**: Dropped to save tokens

### Example

With `AGENT_CONVERSATION_HISTORY_KEEP=2`:

**Original History** (10 messages):
```
1. System prompt
2. User: "select dec 24 2025 in date picker"
3. Assistant: tool_use[browser_snapshot]
4. Tool result: [large accessibility tree - 8K tokens]
5. Assistant: tool_use[browser_click]
6. Tool result: success
7. Assistant: tool_use[browser_snapshot]
8. Tool result: [large accessibility tree - 8K tokens]
9. Assistant: tool_use[browser_click]
10. Tool result: success
```

**Truncated History** (6 messages):
```
1. System prompt                              ← Always kept
2. User: "select dec 24 2025 in date picker" ← Always kept
7. Assistant: tool_use[browser_snapshot]      ← Last 2 iterations
8. Tool result: [large accessibility tree]    ← (iterations 3-6 dropped)
9. Assistant: tool_use[browser_click]
10. Tool result: success
```

**Token Savings**: Dropped ~16K tokens from old snapshots!

## Impact

### Before (No Truncation)
- Date picker test: **FAILED** with 429 rate limit after 6 tool calls
- Token usage: ~30,000+ input tokens

### After (Keep=2)
- Date picker test: **PASSES** 
- Token usage: ~10,000-15,000 input tokens
- LLM still has enough context (recent 2 iterations) to complete the task

## Recommended Values

| Value | Use Case | Token Usage | Risk |
|-------|----------|-------------|------|
| `0` | Simple single-action steps | Minimal | ⚠️ LLM has no memory of previous actions |
| `1` | Most standard interactions | Low | ⚠️ Limited context for multi-step flows |
| `2` | **Default - Recommended** | Medium | ✅ Good balance |
| `3` | Complex flows requiring more context | Higher | ⚠️ May hit limits on very complex pages |
| `4+` | Very complex multi-step scenarios | High | ❌ May still hit rate limits |

## Monitoring

Check logs for truncation info:
```
Claude: History truncation - keeping 6 of 10 total messages (2 iterations, removed 4 old messages)
```

## Files Changed

1. **`ClaudeProvider.java`**:
   - Added `@Value` for `agent.conversation.history.keep`
   - Added `truncateHistory()` method
   - Modified `executeWithTools()` to truncate before converting

2. **`application.properties`**:
   - Added `agent.conversation.history.keep` property

3. **`start.sh`**:
   - Added `AGENT_CONVERSATION_HISTORY_KEEP` environment variable
   - Displays history setting in startup info

## Testing

Test with a complex date picker interaction:
```bash
# Set to 2 iterations (recommended)
echo "AGENT_CONVERSATION_HISTORY_KEEP=2" >> backend/.env

# Rebuild and restart
cd backend
mvn clean package -DskipTests -q
./start.sh

# Run test with date picker step
# Should complete without rate limit errors
```

## Future Improvements

1. **Smart Truncation**: Keep only text summaries of old snapshots instead of dropping entirely
2. **Adaptive Truncation**: Automatically reduce history when token usage is high
3. **Per-Step Configuration**: Different limits for different types of steps


