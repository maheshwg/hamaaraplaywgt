# Test Automation Backend

Java Spring Boot backend for AI-powered test automation platform.

## Features

- **Test Execution Engine**: Execute automated browser tests using Playwright
- **AI Step Interpreter**: Convert natural language instructions to browser actions using OpenAI/Claude via MCP
- **Screenshot Capture**: Automatic screenshot capture during test execution
- **Batch Execution**: Run multiple tests in parallel or sequentially
- **Multi-Tenancy**: Support for vendors, tenants, projects, and users
- **Role-Based Access Control**: JWT-based authentication with SUPER_ADMIN, VENDOR_ADMIN, CLIENT_ADMIN, MEMBER roles
- **PostgreSQL Database**: Persistent storage for tests, runs, results, tenants, projects, and users
- **REST APIs**: Full CRUD operations for tests, modules, tenants, projects, and users
- **MCP Integration**: Model Context Protocol server for AI-powered browser automation

## Prerequisites

- Java 17 or higher
- Maven 3.8+
- PostgreSQL 12+
- Node.js 18+ (for MCP server)
- (Optional) OpenAI API key for AI step interpretation
- (Optional) AWS S3 credentials for screenshot storage

## Database Setup

1. Install PostgreSQL if not already installed
2. Create a database:
```sql
CREATE DATABASE test_automation;
```

3. Update credentials in `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/test_automation
spring.datasource.username=your_username
spring.datasource.password=your_password
```

## Configuration

### Required Configuration
Edit `src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/test_automation
spring.datasource.username=postgres
spring.datasource.password=postgres

# Server Port
server.port=8080
```

### Screenshot Storage Configuration

The application supports two screenshot storage modes: **Local** (for development) and **S3** (for production).

#### Local Storage (Default - Development)

Screenshots are saved to local filesystem and served via the backend API.

```properties
# Screenshot Storage Type
screenshot.storage.type=local

# Local directory for screenshots (relative or absolute path)
screenshot.storage.local.directory=./screenshots
```

**How it works:**
- Screenshots are saved to `./screenshots` directory
- Accessible via: `http://localhost:8080/api/screenshots/{filename}`
- No AWS costs, fast for local development
- **Note:** Files are lost if server restarts on ephemeral storage

#### S3 Storage (Production - AWS)

Screenshots are uploaded to AWS S3 for persistent, scalable storage.

```properties
# Screenshot Storage Type
screenshot.storage.type=s3

# AWS S3 Configuration
aws.s3.bucket-name=your-bucket-name
aws.s3.region=us-east-1
aws.access.key=your-access-key
aws.secret.key=your-secret-key

# Optional: CloudFront CDN for faster delivery
aws.s3.cloudfront.url=https://your-cloudfront-domain.cloudfront.net
```

**Environment Variables (Recommended for Production):**
```bash
export SCREENSHOT_STORAGE_TYPE=s3
export AWS_S3_BUCKET=your-bucket-name
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY=your-access-key
export AWS_SECRET_KEY=your-secret-key
export AWS_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net  # Optional
```

**Benefits of S3 Storage:**
- ✅ Persistent storage (survives instance restarts/replacements)
- ✅ Works with multiple backend instances (load balancing)
- ✅ Can integrate with CloudFront CDN for fast delivery
- ✅ Lifecycle policies to auto-delete old screenshots
- ✅ Cost-effective at scale

**S3 Bucket Setup:**
1. Create an S3 bucket in AWS Console
2. Enable public read access or use signed URLs
3. Set CORS configuration to allow frontend access
4. (Optional) Create CloudFront distribution for CDN
5. (Optional) Set lifecycle rule to delete objects older than X days

Example S3 Lifecycle Rule:
```json
{
  "Rules": [
    {
      "Id": "Delete old screenshots",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

### AI Configuration

**OpenAI API (for AI step interpretation):**
```properties
openai.api.key=your-openai-api-key
openai.model=gpt-4
```

**MCP Playwright Server:**
```properties
mcp.playwright.enabled=true
mcp.playwright.server.url=http://localhost:3000
```

**Agent Configuration:**
```properties
agent.llm.provider=openai  # or: claude
```

Or set as environment variables:
```bash
export OPENAI_API_KEY=your-key
export MCP_PLAYWRIGHT_ENABLED=true
export MCP_PLAYWRIGHT_SERVER_URL=http://localhost:3000
export AGENT_LLM_PROVIDER=openai
```

See [AI_SETUP.md](AI_SETUP.md) and [AGENT_ARCHITECTURE.md](AGENT_ARCHITECTURE.md) for detailed AI configuration.

### Authentication Configuration

**JWT Secret (Change in production!):**
```properties
jwt.secret=change-me-super-secret-key-32-bytes-min
```

**Development Login:**
- Username: `superadmin`
- Password: `tiana123!`
- **Note**: Change these credentials in production!

### Optional Configuration

**AWS S3 (for screenshot storage):**
```properties
aws.s3.bucket-name=your-bucket-name
aws.s3.region=us-east-1
aws.access.key=your-access-key
aws.secret.key=your-secret-key
```

Or set as environment variables:
```bash
export AWS_S3_BUCKET=your-bucket
export AWS_ACCESS_KEY=your-key
export AWS_SECRET_KEY=your-secret
```

## Running the Application

### Prerequisites

Before starting the backend, ensure:
1. PostgreSQL is running and database is created
2. MCP Playwright server is running (if using AI features)

### Start MCP Server

**Option 1: Docker Compose (Recommended)**
```bash
# From project root
docker-compose up -d playwright-mcp
```

**Option 2: Local Node.js**
```bash
cd backend/mcp-server
npm install
npm start
```

MCP server runs on `http://localhost:3000`

### Using Maven

```bash
# From the backend directory
cd backend

# Set environment variables (optional)
export OPENAI_API_KEY=your-key
export MCP_PLAYWRIGHT_ENABLED=true

# Run the application
mvn spring-boot:run
```

### Using JAR

```bash
# Build
mvn clean package

# Run with environment variables
export OPENAI_API_KEY=your-key
export MCP_PLAYWRIGHT_ENABLED=true
java -jar target/test-automation-backend-1.0.0.jar
```

The API will be available at `http://localhost:8080`

### Using Docker Compose

From project root:
```bash
docker-compose up -d
```

This starts PostgreSQL, MCP server, and backend together.

## API Endpoints

### Authentication

**Login (Development):**
```
POST /api/dev-token/login
```
Body:
```json
{
  "username": "superadmin",
  "password": "tiana123!"
}
```
Returns JWT token with role claims.

**Get Dev Token:**
```
GET /api/dev-token/dev-token?role=SUPER_ADMIN
```

**Refresh Token:**
```
GET /api/dev-token/refresh-token?refreshToken={token}
```

### Test Execution

**Execute a test:**
```
POST /api/tests/{testId}/run
```
Headers: `Authorization: Bearer {token}`
Body:
```json
{
  "dataRowIndex": 0,
  "environment": "development",
  "browser": "chromium"
}
```

**Get test runs:**
```
GET /api/tests/{testId}/runs
```

**Get all runs:**
```
GET /api/tests/runs
```

**Get specific run:**
```
GET /api/tests/runs/{runId}
```

### Step Interpreter (AI)

**Interpret natural language step:**
```
POST /api/steps/interpret
```
Body:
```json
{
  "instruction": "Click the login button",
  "pageContext": "<html>...</html>",
  "variables": {}
}
```

### Batch Execution

**Run multiple tests:**
```
POST /api/batches/run
```
Body:
```json
{
  "testIds": ["test-id-1", "test-id-2"],
  "parallel": true
}
```

**Get batch status:**
```
GET /api/batches/{batchId}/status
```

### Test CRUD

```
GET    /api/tests          - Get all tests (scoped to tenant/project)
GET    /api/tests/{id}     - Get test by ID
POST   /api/tests          - Create test
PUT    /api/tests/{id}     - Update test
DELETE /api/tests/{id}     - Delete test
```

### Module CRUD

```
GET    /api/modules          - Get all modules
GET    /api/modules/{id}     - Get module by ID
POST   /api/modules          - Create module
PUT    /api/modules/{id}     - Update module
DELETE /api/modules/{id}     - Delete module
```

### Tenant Management (Admin)

```
POST   /api/admin/tenants              - Create tenant (SUPER_ADMIN/VENDOR_ADMIN)
GET    /api/admin/tenants              - List tenants
POST   /api/admin/tenants/{tenantId}/seats  - Add seats to tenant
POST   /api/admin/tenants/{tenantId}/users  - Create user in tenant
```

### Project Management

```
POST   /api/projects/tenant/{tenantId}      - Create project for tenant
GET    /api/projects/tenant/{tenantId}      - List projects for tenant
POST   /api/projects/{projectId}/members/{userId}  - Add member to project
```

### Screenshots

```
GET    /api/screenshots/{filename}     - Get screenshot by filename
```

## Architecture

### Technologies

- **Spring Boot 3.2**: Application framework
- **Spring Data JPA**: Database access
- **Spring Security**: Authentication and authorization
- **PostgreSQL**: Primary database
- **Playwright**: Browser automation
- **OpenAI GPT-4 / Claude**: AI step interpretation via MCP
- **Model Context Protocol (MCP)**: AI agent tool integration
- **AWS S3**: Screenshot storage
- **JWT**: Token-based authentication
- **Lombok**: Boilerplate reduction

### Key Components

1. **Controllers**: REST API endpoints
   - `TestExecutionController`: Test execution APIs
   - `StepInterpreterController`: AI interpretation
   - `BatchExecutionController`: Batch operations
   - `TestController`: Test CRUD
   - `ModuleController`: Module CRUD
   - `TenantAdminController`: Tenant and user management (admin)
   - `ProjectController`: Project management
   - `DevTokenController`: Authentication and JWT token management
   - `ScreenshotController`: Screenshot serving

2. **Services**: Business logic
   - `TestExecutionService`: Manages test execution with Playwright
   - `StepInterpreterService`: AI-powered step interpretation
   - `OpenAiMcpService`: MCP integration for AI agent execution
   - `ScreenshotService`: Screenshot capture and S3 upload
   - `BatchExecutionService`: Batch test execution

3. **Models**: Domain entities
   - `Test`: Test definition with steps
   - `TestRun`: Test execution record
   - `StepResult`: Individual step result
   - `Module`: Test grouping
   - `Tenant`: Multi-tenant organization
   - `Project`: Project within a tenant
   - `User`: User accounts with roles
   - `ProjectMembership`: User-project associations
   - `Role`: Enum for user roles (SUPER_ADMIN, VENDOR_ADMIN, CLIENT_ADMIN, MEMBER)

4. **Security**: Authentication and authorization
   - `SecurityConfig`: Spring Security configuration
   - `JwtAuthFilter`: JWT token validation filter

## Development

### Running Tests

```bash
mvn test
```

### Building

```bash
mvn clean install
```

### Troubleshooting

**Database connection issues:**
- Ensure PostgreSQL is running: `pg_ctl status`
- Check credentials in `application.properties`
- Verify database exists: `psql -l`

**Browser automation issues:**
- Playwright will auto-download browsers on first run
- For headless mode issues, set `browser.headless=false` in properties

**Screenshots not uploading to S3:**
- Check AWS credentials are set
- Verify S3 bucket exists and has correct permissions
- Screenshots will save locally if S3 is not configured

## Multi-Tenancy

The platform supports a multi-tenant architecture:

- **Vendors**: Top-level organizations managed by SUPER_ADMIN
- **Tenants**: Organizations within vendors, managed by VENDOR_ADMIN
- **Projects**: Scoped workspaces within tenants
- **Users**: Members with roles (SUPER_ADMIN, VENDOR_ADMIN, CLIENT_ADMIN, MEMBER)

All test operations are scoped to the current tenant/project context.

## MCP Server Integration

The backend integrates with a Playwright MCP (Model Context Protocol) server for AI-powered browser automation:

- **Location**: `backend/mcp-server/` (Node.js application)
- **Port**: 3000 (default)
- **Purpose**: Provides browser automation tools to AI agents
- **Communication**: HTTP API between backend and MCP server

See [mcp-server/README.md](mcp-server/README.md) for MCP server details.

## Production Deployment

1. Update `application.properties` for production
2. **Change JWT secret** in `SecurityConfig.java` or via environment variable
3. **Change default credentials** in `DevTokenController.java`
4. Set environment variables for sensitive data (API keys, database credentials)
5. Build: `mvn clean package -DskipTests`
6. Run: `java -jar target/test-automation-backend-1.0.0.jar`

Or use Docker:
```dockerfile
FROM openjdk:17-jdk-slim
COPY target/test-automation-backend-1.0.0.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

See [EC2-DEPLOYMENT.md](EC2-DEPLOYMENT.md) for AWS EC2 deployment instructions.

## Backend Execution Flow: Step-by-Step Logic

This section describes the flow of test execution, how steps are processed, and where key logic and error checks occur in the backend codebase.

### 1. Entry Point: Test Execution
- **File:** `TestExecutionService.java`
- **Method:** `executeTest(...)`
- Triggered when a test run is started (via API or batch execution).
- Loads the test, datasets, and iterates through each test step.
- For each step, calls `executeStepWithAI(...)`.

### 2. Step Execution (AI + MCP)
- **File:** `TestExecutionService.java`
- **Method:** `executeStepWithAI(TestStep step, TestRun testRun)`
- Calls `AiTestExecutionService.executeStepWithAI(...)` to interpret and execute the step using AI and MCP tools.
- After execution, performs robust checks to ensure the intended goal of the step was achieved:
  - For navigation steps: passes if navigation succeeded.
  - For other steps: requires at least one non-navigation action (click, type, assert, select, etc.) to succeed, based on the agent execution log.
  - If no intended actions succeeded, marks the step as failed.
- Sets status, error message, screenshot URL, and extracted variables on the `StepResult`.

### 3. AI-Powered Step Interpretation
- **File:** `AiTestExecutionService.java`
- **Method:** `executeStepWithAI(String instruction, String pageContext, Map<String, Object> variables)`
- Calls the generic agent executor (`AgentExecutor`) to interpret the natural language instruction and decide which browser actions/tools to use.
- Returns a result map including status, message, screenshot URL, extracted variables, and the agent execution log (all tool calls and their results).

### 4. Agent Orchestration & LLM Calls
- **File:** `AgentExecutor.java`
- **Method:** `execute(...)`
- Orchestrates the conversation with the LLM (e.g., OpenAI, Claude) and available MCP tools.
- The LLM receives the step instruction and context, and decides which tools to call (navigate, click, type, assert, etc.).
- For each tool call, the agent calls the MCP tool executor.
- The agent execution log records every tool call, arguments, result, and screenshot.
- Returns a summary message, extracted variables, and the full execution log.

### 5. MCP Tool Execution
- **File:** `McpToolExecutor.java`
- **Method:** `executeTool(...)`
- Receives tool calls from the agent (e.g., navigate, click, type, getContent).
- Calls the MCP server to perform browser automation actions.
- Handles protocol normalization, selector validation, and error handling for each tool.
- Captures screenshots after page-changing actions.
- Returns success/failure, message, and screenshot URL for each tool call.

### 6. Error Handling & Robust Checks
- **Where:**
  - `TestExecutionService.java`: Checks if intended actions were performed and succeeded for each step. Marks step as failed if not.
  - `AiTestExecutionService.java`: Handles errors from agent execution and ensures screenshots are always captured.
  - `AgentExecutor.java`: Handles LLM/tool errors, selector validation errors, and retries if needed.
  - `McpToolExecutor.java`: Handles MCP server errors, invalid selectors, and captures error screenshots.
- **Result:**
  - Steps only pass if the intended goal is achieved (not just if a tool was called).
  - All errors are logged and included in the step result for traceability.

### 7. Where to Look for Logic
- **Test step execution and result logic:** `TestExecutionService.java`
- **AI/LLM step interpretation and orchestration:** `AiTestExecutionService.java`, `AgentExecutor.java`
- **MCP tool execution and browser automation:** `McpToolExecutor.java`
- **Error checks and robust step validation:** See `executeStepWithAI` in `TestExecutionService.java`

---

This flow ensures that each test step is only marked as passed if its intended actions were actually performed and succeeded, with robust error handling and traceability at every stage.

## License

MIT
