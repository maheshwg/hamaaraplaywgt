# Official MCP Migration - Remaining Work

## Status: 80% Complete

### ✅ Completed
1. Created `OfficialPlaywrightMcpService.java` - JSON-RPC 2.0 client for official MCP server
2. Simplified `McpToolExecutor.java` - Uses official tool names (`browser_*`)
3. Created `agent-prompt-categories-mcp.json` - Accessibility tree prompts (not HTML)
4. Updated `application.properties` - Points to official MCP server at `http://localhost:8931/mcp`
5. Started official MCP server successfully (tested JSON-RPC communication)

### ⚠️ Remaining Work (10-15 minutes)

#### 1. Fix `AgentExecutor.java` Compilation Errors
**File**: `backend/src/main/java/com/youraitester/agent/AgentExecutor.java`

**Changes needed**:
- **Line 516**: Change `mcpToolExecutor.executeTool(toolCall)` to `mcpToolExecutor.executeTool(toolCall.getName(), toolCall.getArguments())`
- **Lines 519-533**: Remove all `screenshotUrl` logic (no longer part of ToolExecutionResult)
- **Lines 538-583**: Remove entire `isSelectorValidationError` block (we removed this feature)
- **Lines 595-612**: Simplify - Remove `isGetContent` check, change to `browser_snapshot` check instead
- **Line 555-559**: Remove `buildSelectorErrorFeedback` method call (delete the entire method at line 688 too)

**Simplified replacement for lines 515-620**:
```java
// Execute via MCP
McpToolExecutor.ToolExecutionResult toolResult = mcpToolExecutor.executeTool(
    toolCall.getName(),
    toolCall.getArguments()
);

ToolExecutionLog logEntry = new ToolExecutionLog(
    toolCall.getName(),
    toolCall.getArguments(),
    toolResult.getMessage(),
    null
);
executionLog.add(logEntry);

if (!toolResult.isSuccess()) {
    log.error("Tool execution failed: {}", toolResult.getMessage());
    return AgentExecutionResult.error("Tool execution failed: " + toolResult.getMessage(), executionLog);
}

// Add tool result to conversation
Map<String, Object> metadata = new HashMap<>();
metadata.put("function_name", toolCall.getName());

String toolContent = toolResult.getContent() != null ? toolResult.getContent() : toolResult.getMessage();
if ("browser_snapshot".equals(toolCall.getName()) && toolContent.length() > maxGetContentChars) {
    toolContent = toolContent.substring(0, maxGetContentChars) + "\n\n[Truncated]";
}

messages.add(SimpleMessage.builder()
    .role("tool")
    .content(toolContent)
    .toolCallId(toolCall.getId())
    .metadata(metadata)
    .build());
```

#### 2. Remove Unused Methods in `AgentExecutor.java`
- Delete `buildSelectorErrorFeedback()` method (around line 688)
- Delete `truncateHtmlAroundInstruction()` method (around line 700-800) - not needed for accessibility trees
- Delete `keywordMatchesInstruction()` references to `getContent` - change to `browser_snapshot`

#### 3. Start the Official MCP Server
```bash
cd /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend
npx @playwright/mcp@latest --port 8931 --headless &
```

#### 4. Build and Test
```bash
cd /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend
mvn clean package -DskipTests
java -jar target/test-automation-backend-0.0.1-SNAPSHOT.jar
```

#### 5. Test with a Simple Step
Create a test with these steps:
1. Step: "click on login button"
2. appUrl: "https://www.saucedemo.com"

Expected flow:
- Agent calls `browser_navigate` to https://www.saucedemo.com
- Agent calls `browser_snapshot` to get accessibility tree
- Agent finds "button 'Login' [ref_42]" in tree
- Agent calls `browser_click` with `{element: "Login button", ref: "ref_42"}`

### 🗑️ Optional: Remove Custom MCP Server
Once official MCP is working:
```bash
rm -rf /Users/gauravmaheshwari/dev/projects/repos/youraitesterfrontend/backend/mcp-server/
```

### 📝 Notes
- Old prompt file: `agent-prompt-categories.json` (HTML-based, for custom server)
- New prompt file: `agent-prompt-categories-mcp.json` (accessibility tree, for official server)
- Counting/sorting/verification features: Removed for now (will add back iteratively)
- Vision integration: Not available in official MCP (can add back with `--caps=vision` if needed)

### 🔧 Quick Fix Script
If you want, I can create a Python script to automatically apply the remaining fixes to `AgentExecutor.java`.

