# Dynamic Agent System Prompt

The agent system prompt uses a **dynamic, category-based approach** that includes only relevant instructions based on the task, significantly reducing token usage.

## How It Works

### Traditional Approach (Old)
- Single massive prompt (~20K tokens)
- Sent with every request regardless of task
- High API costs
- Slower response times

### Dynamic Approach (New) ✨
- Prompt split into **categories** with keywords
- Only relevant categories included per request
- **~60-80% token reduction** for most tasks
- Much lower API costs
- Faster responses

## Files

1. **`agent-prompt-categories.json`** - Categorized prompt sections with keywords
2. **`agent-system-prompt.txt`** - Full prompt (fallback/legacy)

## Prompt Categories

| Category | Keywords | Always Included? |
|----------|----------|------------------|
| `core` | - | ✅ Yes |
| `css_selectors` | click, type, select, enter, fill | ✅ Yes |
| `multiple_elements` | click, select | When matched |
| `dropdown` | dropdown, select, choose, option, menu | When matched |
| `date_input` | date, calendar, pick | When matched |
| `verification` | verify, check, assert, confirm | When matched |
| `counting` | count, total, number of, X items | When matched |
| `item_properties` | has price, has property, item, product | When matched |
| `sorting` | sort, sorted, order, ascending, descending | When matched |
| `navigation` | navigate, go to, visit, open | When matched |

## Examples

### Example 1: Simple Click
**Instruction:** `"Click the login button"`

**Included categories:**
- ✅ `core` (always)
- ✅ `css_selectors` (always)
- ✅ `multiple_elements` (matched "click")

**Token savings:** ~70% (only 3 of 10 categories)

### Example 2: Verify Sorting
**Instruction:** `"verify products are sorted by price low to high"`

**Included categories:**
- ✅ `core` (always)
- ✅ `css_selectors` (always)
- ✅ `verification` (matched "verify")
- ✅ `sorting` (matched "sorted", "price")

**Token savings:** ~60% (only 4 of 10 categories)

### Example 3: Count Items
**Instruction:** `"verify there are a total of 10 products"`

**Included categories:**
- ✅ `core` (always)
- ✅ `css_selectors` (always)
- ✅ `verification` (matched "verify")
- ✅ `counting` (matched "total", "10 products")

**Token savings:** ~60% (only 4 of 10 categories)

## Configuration

In `application.properties`:

```properties
# Enable/disable dynamic prompts
agent.prompt.dynamic=${AGENT_PROMPT_DYNAMIC:true}

# Path to categories file
agent.prompt.categories.file=${AGENT_PROMPT_CATEGORIES_FILE:agent-prompt-categories.json}

# Fallback full prompt file
agent.system.prompt.file=${AGENT_SYSTEM_PROMPT_FILE:agent-system-prompt.txt}
```

## Adding New Categories

Edit `agent-prompt-categories.json`:

```json
{
  "my_new_category": {
    "description": "What this category covers",
    "keywords": ["keyword1", "keyword2", "phrase"],
    "content": "The actual prompt instructions..."
  }
}
```

**Keyword matching:**
- Case-insensitive
- Matches anywhere in instruction
- Multiple keywords = OR logic (any match includes category)

## Editing Categories

**No recompilation needed!**

```bash
# 1. Edit the JSON file
nano backend/agent-prompt-categories.json

# 2. Restart backend
cd backend
./start.sh
```

## Disabling Dynamic Prompts

To use the full prompt for all requests:

```properties
# In application.properties:
agent.prompt.dynamic=false
```

Or via environment variable:

```bash
export AGENT_PROMPT_DYNAMIC=false
```

## Monitoring

Check logs to see which categories are included:

```
INFO  c.youraitester.agent.AgentExecutor - Built dynamic prompt with categories: [core, css_selectors, verification, counting]
```

## Best Practices

1. **Keep categories focused** - Each should cover one specific topic
2. **Choose keywords carefully** - Think about how users phrase instructions
3. **Test keyword matching** - Ensure important categories are triggered
4. **Monitor token usage** - Check logs to verify savings
5. **Update as needed** - Add categories for new features or common patterns

## Fallback Behavior

If categories file is not found or parsing fails:
- Falls back to `agent-system-prompt.txt`
- Logs warning message
- System continues to work normally

## Token Usage Comparison

| Task Type | Old Prompt | Dynamic Prompt | Savings |
|-----------|-----------|----------------|---------|
| Simple click | ~20K tokens | ~6K tokens | 70% |
| Verify text | ~20K tokens | ~8K tokens | 60% |
| Fill form | ~20K tokens | ~6K tokens | 70% |
| Count items | ~20K tokens | ~8K tokens | 60% |
| Complex multi-step | ~20K tokens | ~12K tokens | 40% |

**Average savings: ~60%** 🎉

## Troubleshooting

**Problem:** Too many/few categories included

**Solution:** Adjust keywords in `agent-prompt-categories.json`

**Problem:** Categories not loading

**Solution:** Check file path and JSON syntax, check logs for errors

**Problem:** Want to debug category selection

**Solution:** Check logs for "Including category" and "Built dynamic prompt" messages

