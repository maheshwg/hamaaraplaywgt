# Migration Plan: Custom MCP Server → Official Microsoft Playwright MCP

## Executive Summary

**Current State**: Custom Node.js HTTP server (`backend/mcp-server/server.js`) with REST API
**Target State**: Official Microsoft `@playwright/mcp` server with MCP JSON-RPC protocol

## Key Architectural Differences

### 1. **Communication Protocol**
| Aspect | Custom (Current) | Official (@playwright/mcp) |
|--------|------------------|----------------------------|
| Protocol | HTTP REST | **MCP JSON-RPC** (stdio or HTTP/SSE) |
| Request Format | `POST /execute` with `{action, params}` | **JSON-RPC 2.0** with `tools/call` |
| Response Format | Simple JSON `{success, message, error}` | **JSON-RPC result + content blocks** |

### 2. **Page Representation**
| Aspect | Custom (Current) | Official (@playwright/mcp) |
|--------|------------------|----------------------------|
| Page Content | **HTML** via `getContent()` | **Accessibility Tree** via `browser_snapshot` |
| Selector Strategy | CSS selectors from HTML | **`ref` tokens** from accessibility tree |
| LLM Input | Raw HTML (truncated) | Structured accessibility snapshot (roles, names, refs) |

### 3. **Tool Names & Schemas**
| Custom Tool | Official Tool | Notes |
|-------------|---------------|-------|
| `navigate` | `browser_navigate` | ✅ Direct mapping |
| `click` | `browser_click` | ⚠️ Requires `element` description + `ref` token |
| `type` | `browser_type` | ⚠️ Requires `element` + `ref` + `text` |
| `select` | `browser_select_option` | ⚠️ Requires `element` + `ref` + `values[]` |
| `getContent` | `browser_snapshot` | ❌ **Fundamentally different**: returns accessibility tree, not HTML |
| `assert` | `browser_verify_text_visible` or `browser_verify_element_visible` | ⚠️ Different approach |
| `visionAnalyze` | `browser_mouse_click_xy` | ⚠️ Requires `--caps=vision` flag |
| `clickAtCoordinates` | `browser_mouse_click_xy` | ⚠️ Requires `--caps=vision` flag |
| `screenshot` | `browser_take_screenshot` | ✅ Similar |
| `dismissPopups` | ❌ Not available | Need custom workaround |
| `highlightText` | ❌ Not available | Custom feature, not in official |
| `highlightAtCoordinates` | ❌ Not available | Custom feature, not in official |

### 4. **Custom Features at Risk**
The following custom features **do not exist** in the official MCP server:
1. **`highlightText`** - Visual debugging tool for drawing boxes around text
2. **`highlightAtCoordinates`** - Visual debugging tool for drawing markers at coordinates
3. **`dismissPopups`** - Automatic popup/overlay dismissal
4. **HTML-based selector extraction** - Official uses accessibility tree, not HTML
5. **CSS selector validation** - Official uses `ref` tokens from snapshots
6. **Vision integration** (OpenAI GPT-4o) - Official has coordinate clicks but no vision model integration
7. **Instruction-aware HTML truncation** - Official doesn't use HTML at all

## Migration Challenges

### Challenge 1: **Accessibility Tree vs HTML**
- **Current**: LLM receives HTML, extracts CSS selectors like `#id`, `.class`, `[name="..."]`
- **Official**: LLM receives accessibility tree with `ref` tokens like `ref_1234`
  
**Example Accessibility Tree**:
```
- heading "Products" [ref_1]
- button "Add to Cart" [ref_2]
  - text: "Add to Cart"
- button "Remove" [ref_3]
```

**Impact**:
- ❌ All prompt rules about CSS selectors become **obsolete**
- ❌ Rules like "find `<label for='X'>` then use `#X`" won't work
- ✅ Selector ambiguity (multiple `.class` matches) is **solved** by refs
- ⚠️ Counting/sorting tasks require different approach (no HTML parsing)

### Challenge 2: **JSON-RPC Protocol**
- **Current**: Java service calls `http://localhost:3000/execute` with simple JSON
- **Official**: Java service needs to:
  1. **Spawn** `npx @playwright/mcp@latest` subprocess (stdio)
  2. OR connect to HTTP/SSE endpoint at `http://localhost:8931/mcp`
  3. Send **JSON-RPC 2.0** messages:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "browser_click",
         "arguments": {
           "element": "Login button",
           "ref": "ref_42"
         }
       }
     }
     ```
  4. Parse JSON-RPC responses

**Implementation Options**:
- **Option A**: Use Java MCP SDK (if available)
- **Option B**: Implement JSON-RPC client manually (OkHttp + stdio pipe or SSE)
- **Option C**: Keep using HTTP/SSE mode (`--port 8931`) to minimize protocol complexity

### Challenge 3: **Vision Capabilities**
- **Current**: Direct OpenAI Vision API integration in custom server
- **Official**: Has `browser_mouse_click_xy` but **no vision model**
  - Requires `--caps=vision` flag
  - LLM must provide `(x, y)` coordinates directly (no vision analysis)
  
**Impact**:
- ❌ `visionAnalyze` tool (OpenAI GPT-4o for "where is login button?") is **not available**
- ✅ Can use LLM's vision capability (if LLM supports it) to get coordinates, then call `browser_mouse_click_xy`
- ⚠️ If LLM doesn't support vision (e.g., GPT-4-turbo), coordinate-based clicks become **impossible**

### Challenge 4: **Prompt Rewrites**
**Current `agent-prompt-categories.json` relies on**:
1. **HTML content** from `getContent()`
2. **CSS selectors** (`#id`, `.class`, `[name]`)
3. **Label → input mapping** (`<label for="X">` → `#X`)
4. **Vision coordinates** for fallback

**Official MCP requires**:
1. **Accessibility snapshots** from `browser_snapshot`
2. **`ref` tokens** from snapshot
3. **Role + Accessible Name** to describe elements
4. **No HTML**, **no CSS selectors**

**Migration Effort**: ~70% of prompt content needs **complete rewrite**

### Challenge 5: **Testing Workflow**
**Current**:
1. Agent calls `getContent()` → receives HTML
2. Agent finds selector in HTML (e.g., `button.login-btn`)
3. Agent calls `click({selector: "button.login-btn"})`
4. Java backend validates selector, calls MCP server

**Official**:
1. Agent calls `browser_snapshot` → receives accessibility tree
2. Agent finds element in tree (e.g., `button "Login" [ref_42]`)
3. Agent calls `browser_click({element: "Login button", ref: "ref_42"})`
4. Java backend sends JSON-RPC to MCP server

**Key Difference**: Agent must **always** call `browser_snapshot` first to get `ref` tokens. This is **mandatory** for every interaction.

## Migration Path

### Phase 1: Evaluation (Recommended First Step)
**Goal**: Determine if official MCP server meets your needs

1. **Test official server manually** with a simple test:
   ```bash
   cd /tmp
   npx @playwright/mcp@latest --port 8931
   ```
   
2. **Send a JSON-RPC request** (curl or Postman):
   ```bash
   curl -X POST http://localhost:8931/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "browser_navigate",
         "arguments": {"url": "https://www.saucedemo.com"}
       }
     }'
   ```

3. **Call `browser_snapshot`** and inspect the accessibility tree format

4. **Test `browser_click` with ref tokens**

5. **Evaluate**:
   - Can you perform your test scenarios?
   - Is the accessibility tree sufficient for counting/sorting/verification?
   - Do you need vision capabilities? (requires `--caps=vision`)

### Phase 2: Decision Point
Based on Phase 1 evaluation:

**Option A: Migrate to Official MCP** ✅
- **Pro**: Standard protocol, actively maintained by Microsoft, no custom server maintenance
- **Pro**: Solves selector ambiguity (ref tokens are unique)
- **Con**: Lose custom features (`highlightText`, `dismissPopups`, vision integration)
- **Con**: Major prompt rewrites (~70% of content)
- **Con**: Counting/sorting/verification logic needs redesign (no HTML parsing)

**Option B: Keep Custom Server** ⚠️
- **Pro**: Keep all custom features
- **Pro**: No prompt rewrites
- **Pro**: HTML-based approach is working
- **Con**: Ongoing maintenance burden
- **Con**: Selector ambiguity issues persist
- **Con**: Not using standard MCP protocol

**Option C: Hybrid Approach** ⚙️
- Use official MCP for **core automation** (navigate, click, type)
- Keep custom server for **advanced features** (vision, highlighting, HTML analysis)
- Agent decides which server to call based on task
- **Con**: Complex architecture, two servers to maintain

### Phase 3: Implementation (If Choosing Option A)
**Estimated Effort**: 3-5 days

#### Step 1: Update Java Backend (1-2 days)
1. **Replace `PlaywrightMcpService`**:
   - Change from HTTP REST client to **JSON-RPC over HTTP/SSE**
   - Implement JSON-RPC 2.0 message formatting
   - Handle JSON-RPC responses (success/error)
   
2. **Update `McpToolExecutor`**:
   - Replace tool names: `navigate` → `browser_navigate`, etc.
   - Update tool schemas: add `element` + `ref` parameters
   - Remove `getContent`, replace with `browser_snapshot`
   - Remove custom tools: `highlightText`, `dismissPopups`, `visionAnalyze` (unless using vision cap)
   
3. **Update `AgentExecutor`**:
   - Change tool definitions to match official MCP schema
   - Update available tools list

#### Step 2: Rewrite Prompts (1-2 days)
1. **Core prompt changes**:
   - Replace "Call `getContent()` to see HTML" with "Call `browser_snapshot` to see accessibility tree"
   - Replace "Extract CSS selector from HTML" with "Find element in snapshot, use its `ref` token"
   - Remove all CSS selector rules (no longer applicable)
   
2. **Per-category changes**:
   - **`css_selectors`**: Delete entire category (not applicable)
   - **`date_input`**: Rewrite to use accessibility tree + refs
   - **`counting`**: Rewrite to count roles/names in accessibility tree (not HTML elements)
   - **`sorting`**: Rewrite to use `browser_evaluate` for value extraction (no HTML parsing)
   - **`verification`**: Use `browser_verify_*` tools instead of manual HTML checking
   
3. **App-specific prompts**: Review and rewrite for accessibility tree approach

#### Step 3: Update Application Properties
```properties
# Change MCP server URL (HTTP mode)
mcp.playwright.server.url=http://localhost:8931/mcp

# Or: spawn stdio server (requires subprocess management)
mcp.playwright.command=npx
mcp.playwright.args=@playwright/mcp@latest
```

#### Step 4: Testing & Validation (1 day)
1. Run existing tests
2. Compare results: Custom MCP vs Official MCP
3. Identify failures and adjust prompts
4. Validate counting/sorting/verification tasks
5. Test date picker interactions

#### Step 5: Remove Custom Server
```bash
rm -rf backend/mcp-server/
```

## Recommendation

**I recommend Phase 1 (Evaluation) first** before committing to migration. Here's why:

1. **Unknown: Can accessibility tree support your use cases?**
   - Counting products: Can you reliably count product elements in accessibility tree?
   - Sorting verification: Can you extract prices from accessibility tree (or need `browser_evaluate`)?
   - Date pickers: Will accessibility tree expose calendar structure?

2. **Unknown: Do you need vision?**
   - Current tests use vision as fallback for ambiguous selectors
   - Official MCP has `--caps=vision` for coordinate clicks, but **no vision analysis**
   - If LLM (GPT-4-turbo) doesn't support vision, this won't work

3. **Major effort**: ~3-5 days of work with ~70% prompt rewrites
   - Only worth it if official MCP **clearly solves problems** (selector ambiguity)
   - Not worth it if it **creates new problems** (can't count elements, can't verify sorting)

## Next Steps

**Recommendation**: Let's do a **quick proof-of-concept**:

1. Start official MCP server in HTTP mode:
   ```bash
   npx @playwright/mcp@latest --port 8931 --headless
   ```

2. Write a **simple Java test** that:
   - Sends JSON-RPC `browser_navigate` to SauceDemo
   - Calls `browser_snapshot`
   - Inspects the accessibility tree
   - Tries `browser_click` on "Login" button using a `ref` token

3. **Evaluate** the accessibility tree:
   - Can you identify products?
   - Can you extract prices?
   - Can you count elements?

4. **Decision**: If Phase 1 looks promising → proceed with full migration. If not → keep custom server and iterate on current approach.

---

**Question for you**: Would you like me to:
- **A)** Start Phase 1 evaluation (proof-of-concept with official MCP)?
- **B)** Continue improving custom server (fix date picker, refine prompts)?
- **C)** Something else?

