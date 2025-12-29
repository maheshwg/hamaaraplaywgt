# Environment Configuration Guide

## Overview

The Claude API key and other sensitive configuration values are now stored in a `.env` file for better security and easier configuration management.

## Setup

### 1. Local Development

The `.env` file has been created in the `backend/` directory with your Claude API key:

```bash
backend/.env
```

This file is automatically loaded by `start.sh` when starting services locally.

### 2. Production/Deployment

For production environments, create a `.env` file at `/opt/youraitester/.env` (or your deployment directory) with the necessary environment variables.

A template file `.env.example` is provided to help you get started.

## Configuration Files

### `.env`
- Contains actual API keys and sensitive values
- **Never commit this file to version control** (already in `.gitignore`)
- Automatically loaded by startup scripts

### `.env.example`
- Template file with placeholder values
- Safe to commit to version control
- Copy this file to `.env` and fill in actual values

## How It Works

### Local Development (`start.sh`)
The startup script loads the `.env` file from the backend directory:

```bash
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi
```

### Production (`start-services.sh`)
The service script loads from `/opt/youraitester/.env`:

```bash
if [ -f /opt/youraitester/.env ]; then
    export $(cat /opt/youraitester/.env | grep -v '^#' | xargs)
fi
```

## Available Environment Variables

### Required
- `CLAUDE_API_KEY` - Your Claude API key (now configured)
- `OPENAI_API_KEY` - Your OpenAI API key (if using OpenAI)

### Optional
- `AGENT_LLM_PROVIDER` - Which LLM to use: `openai` or `claude` (default: `openai`)
- `CLAUDE_MODEL` - Claude model to use (default: `claude-3-5-sonnet-20241022`)
- `OPENAI_MODEL` - OpenAI model to use (default: `gpt-4-turbo`)
- `MCP_PLAYWRIGHT_SERVER_URL` - MCP server URL (default: `http://localhost:8931/mcp`)
- `MCP_BROWSER` - Browser to use for automation (default: `chromium`)
- `SCREENSHOT_STORAGE_TYPE` - Where to store screenshots: `local` or `s3`
- Database configuration (see `.env.example`)
- AWS configuration (if using S3 for screenshots)

## Security Best Practices

1. **Never commit `.env` to git** - Already configured in `.gitignore`
2. **Use `.env.example` for documentation** - Shows what variables are needed without exposing values
3. **Rotate keys regularly** - Update the `.env` file and restart services
4. **Restrict file permissions** - Keep `.env` readable only by the service user

```bash
chmod 600 .env
```

## Switching LLM Providers

To switch from OpenAI to Claude (or vice versa), update the `.env` file:

```bash
# Use Claude
AGENT_LLM_PROVIDER=claude
CLAUDE_API_KEY=your-claude-key

# Or use OpenAI
AGENT_LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
```

Then restart services:

```bash
./start.sh  # local development
# or
./start-services.sh  # production
```

## Verifying Configuration

After starting services, the startup script will display your configuration (with masked keys):

```
Configuration:
  • LLM Provider:    claude
  • Claude Key:      sk-ant-api03-bkQOph...GOQAo
  • MCP Server URL:  http://localhost:8931/mcp
  • Browser:         chromium
```

## Troubleshooting

### API Key Not Found
If you see errors about missing API keys:

1. Check that `.env` exists in the correct location
2. Verify the file contains the correct key name (`CLAUDE_API_KEY=...`)
3. Ensure there are no extra spaces around the `=` sign
4. Restart the services after updating `.env`

### Provider Mismatch
If you set `AGENT_LLM_PROVIDER=claude` but only have `OPENAI_API_KEY` configured, the startup script will fail with a clear error message. Make sure both the provider and corresponding key are set.

## Current Configuration

Your Claude API key has been securely stored in:
- **File**: `backend/.env`
- **Key**: `CLAUDE_API_KEY`
- **Value**: `sk-ant-api03-bkQOph743yU...` (masked for security)

The key is ready to use with the Claude Sonnet model when you start services.

