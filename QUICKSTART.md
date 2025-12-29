# Test Automation Platform - Quick Start Guide

This repository contains a full-stack AI-powered test automation platform with React frontend and Spring Boot backend.

## Architecture

```
├── frontend (React + Vite)
│   ├── src/
│   │   ├── api/         # API client (currently mocked)
│   │   ├── components/  # UI components
│   │   └── pages/       # Application pages
│
└── backend (Spring Boot + PostgreSQL)
    ├── src/main/java/com/youraitester/
    │   ├── controller/  # REST API controllers
    │   ├── service/     # Business logic
    │   ├── model/       # Domain entities
    │   └── repository/  # Data access
```

## Prerequisites

### Frontend
- Node.js 18+ and npm

### Backend
- Java 17+
- Maven 3.8+
- PostgreSQL 12+
- (Optional) OpenAI API key
- (Optional) AWS S3 credentials

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start PostgreSQL:**
```bash
docker-compose up postgres -d
```

2. **Run Backend:**
```bash
cd backend
mvn spring-boot:run
```

3. **Run Frontend:**
```bash
npm install
npm run dev
```

Access the application at `http://localhost:5174`

### Option 2: Manual Setup

#### 1. Setup PostgreSQL

```bash
# Create database
createdb test_automation

# Or using psql
psql -U postgres
CREATE DATABASE test_automation;
\q
```

#### 2. Configure Backend

Edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/test_automation
spring.datasource.username=your_username
spring.datasource.password=your_password
```

#### 3. Start Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend will start on `http://localhost:8080`

#### 4. Install Frontend Dependencies

```bash
# From project root
npm install
```

#### 5. Start Frontend

```bash
npm run dev
```

Frontend will start on `http://localhost:5174`

## Current Setup

### Frontend (Development Mode)

The frontend is currently configured with **mock API client** for development without backend:
- Mock data for tests, modules, and runs
- All UI functionality works
- No real data persistence

To connect to real backend, edit `src/api/base44Client.js` and uncomment the real client.

### Backend APIs

The backend provides these REST endpoints:

#### Test Execution
- `POST /api/tests/{testId}/run` - Execute a test
- `GET /api/tests/{testId}/runs` - Get test run history
- `GET /api/tests/runs/{runId}` - Get specific run details

#### Test Management
- `GET /api/tests` - List all tests
- `POST /api/tests` - Create test
- `PUT /api/tests/{id}` - Update test
- `DELETE /api/tests/{id}` - Delete test

#### Module Management
- `GET /api/modules` - List all modules
- `POST /api/modules` - Create module
- `PUT /api/modules/{id}` - Update module
- `DELETE /api/modules/{id}` - Delete module

#### AI Step Interpreter
- `POST /api/steps/interpret` - Convert natural language to actions

#### Batch Execution
- `POST /api/batches/run` - Run multiple tests
- `GET /api/batches/{batchId}/status` - Get batch status

## Testing the Backend

### Create a Test

```bash
curl -X POST http://localhost:8080/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Login Test",
    "description": "Test user login flow",
    "steps": [
      {
        "instruction": "Navigate to https://example.com",
        "order": 1,
        "type": "navigate",
        "value": "https://example.com"
      },
      {
        "instruction": "Click login button",
        "order": 2,
        "type": "click",
        "selector": "#login-button"
      }
    ]
  }'
```

### Execute a Test

```bash
curl -X POST http://localhost:8080/api/tests/{test-id}/run \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "development",
    "browser": "chromium"
  }'
```

## Optional Configuration

### Enable AI Step Interpretation

Set OpenAI API key:
```bash
export OPENAI_API_KEY=your-api-key
```

Or in `application.properties`:
```properties
openai.api.key=your-api-key
```

### Enable S3 Screenshot Storage

```bash
export AWS_S3_BUCKET=your-bucket
export AWS_ACCESS_KEY=your-access-key
export AWS_SECRET_KEY=your-secret-key
```

Without S3, screenshots are saved locally in `/tmp/screenshots`

## Development Workflow

1. **Frontend Development:**
   - Edit files in `src/`
   - Hot reload is enabled
   - Mock backend is active

2. **Backend Development:**
   - Edit files in `backend/src/`
   - Restart Spring Boot after changes
   - Database schema auto-updates

3. **Full Stack Testing:**
   - Start both frontend and backend
   - Update `src/api/base44Client.js` to use real backend
   - Test end-to-end functionality

## Building for Production

### Frontend

```bash
npm run build
# Output in dist/
```

### Backend

```bash
cd backend
mvn clean package
# JAR file in target/
```

### Docker

```bash
docker-compose up --build
```

## Troubleshooting

### Frontend shows blank page
- Check browser console for errors
- Verify dev server is running on correct port
- Check that QueryClientProvider is set up

### Backend won't start
- Verify PostgreSQL is running
- Check database credentials
- Ensure port 8080 is not in use

### Test execution fails
- Playwright downloads browsers on first run
- Check browser.headless setting
- Verify screenshot directory permissions

### Screenshots not displaying
- **Local Development**: Ensure `./screenshots` directory exists and is writable
- **Production**: Verify AWS S3 credentials and bucket permissions
- Check screenshot URLs in database match storage configuration

## Screenshot Storage

### Local Development (Default)

By default, screenshots are saved locally:

```properties
# application.properties
screenshot.storage.type=local
screenshot.storage.local.directory=./screenshots
```

Screenshots accessible at: `http://localhost:8080/api/screenshots/{filename}`

**Pros:**
- No AWS costs
- Fast for local development
- No internet dependency

**Cons:**
- Files lost on server restart
- Doesn't work with multiple server instances

### Production (AWS S3)

For production deployments, use S3:

```bash
# Environment variables
export SCREENSHOT_STORAGE_TYPE=s3
export AWS_S3_BUCKET=your-bucket-name
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY=your-access-key
export AWS_SECRET_KEY=your-secret-key
```

**S3 Setup Steps:**
1. Create S3 bucket in AWS Console
2. Set bucket policy for public read (or use signed URLs)
3. Configure CORS for frontend access
4. (Optional) Create CloudFront distribution for CDN
5. (Optional) Add lifecycle rule to delete old screenshots

**Pros:**
- Persistent storage
- Works with load balancing
- CDN integration
- Auto-cleanup with lifecycle rules

**Cons:**
- AWS costs (minimal, ~$0.023 per GB/month)
- Requires AWS account setup

See [backend/README.md](backend/README.md) for detailed S3 configuration.

## Next Steps

1. **Connect Frontend to Backend**: Update API client configuration
2. **Add Authentication**: Implement user auth system
3. **Set up CI/CD**: Add GitHub Actions workflows
4. **Deploy**: Deploy to cloud platform (AWS, Azure, etc.)

## Documentation

- [Backend README](backend/README.md) - Detailed backend documentation
- [Frontend README](README.md) - Frontend setup and configuration

## Support

For issues or questions, please check:
- Database logs: Check PostgreSQL logs
- Backend logs: Check Spring Boot console
- Frontend logs: Check browser console
