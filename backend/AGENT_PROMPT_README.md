# Agent System Prompt Configuration

The agent system prompt has been externalized to allow editing without recompiling the Java code.

## Prompt File Location

The system prompt is stored in: `/backend/agent-system-prompt.txt`

## How It Works

1. The `AgentExecutor` class loads the prompt from the file specified in `application.properties`
2. Default location: `agent-system-prompt.txt` (relative to where the JAR is run)
3. The prompt is cached in memory after first load for performance
4. If the file is not found, a minimal default prompt is used as fallback

## Configuration

In `application.properties`:
```properties
# Path to system prompt file (relative to working directory or absolute path)
agent.system.prompt.file=${AGENT_SYSTEM_PROMPT_FILE:agent-system-prompt.txt}
```

You can override this with an environment variable:
```bash
export AGENT_SYSTEM_PROMPT_FILE=/path/to/custom-prompt.txt
```

## Editing the Prompt

1. Edit `backend/agent-system-prompt.txt`
2. **Restart the backend application** - The prompt is loaded and cached at startup
3. No recompilation needed!

## Important Notes

- The prompt file is loaded once at application startup and cached
- To reload changes, you must restart the backend
- Make sure the file exists at the specified path when starting the application
- If using a relative path, it's relative to where you run the JAR from (typically the `backend/` directory)

## Example Workflow

```bash
# 1. Edit the prompt
nano backend/agent-system-prompt.txt

# 2. Stop the backend (Ctrl+C)

# 3. Restart the backend
cd backend
java -jar target/test-automation-backend-1.0.0.jar

# OR if using Maven
mvn spring-boot:run
```

## Troubleshooting

If you see "System prompt file not found" in logs:
- Check the file path is correct
- Make sure you're running from the right directory
- Try using an absolute path in the configuration

If changes aren't taking effect:
- Make sure you restarted the backend
- Check the logs for "Loading agent system prompt from file: ..." message
- Verify the file size in the logs matches your edits

