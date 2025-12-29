# YourAITester - AI-Powered Test Automation Platform

A full-stack test automation platform with AI-powered natural language test execution, multi-tenancy support, and comprehensive test management capabilities.

## Overview

YourAITester combines React frontend with Spring Boot backend to provide:
- **AI-Powered Test Execution**: Natural language test steps interpreted by OpenAI/Claude
- **Browser Automation**: Playwright-based test execution with automatic screenshot capture
- **Multi-Tenancy**: Support for vendors, tenants, projects, and role-based access control
- **Test Management**: Full CRUD operations for tests, modules, and test runs
- **Batch Execution**: Run multiple tests in parallel or sequentially
- **Comprehensive Reporting**: Test history, results, and metrics dashboard

## Architecture

```
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── api/      # API client for backend communication
│   │   ├── components/  # UI components (shadcn/ui)
│   │   └── pages/    # Application pages
│
├── backend/          # Spring Boot backend
│   ├── src/main/java/com/youraitester/
│   │   ├── controller/  # REST API controllers
│   │   ├── service/     # Business logic
│   │   ├── model/       # Domain entities
│   │   ├── repository/  # Data access layer
│   │   └── security/    # JWT authentication
│   └── mcp-server/   # Playwright MCP server (Node.js)
│
└── docker-compose.yml  # PostgreSQL, MCP server, Backend services
```

## Prerequisites

### Frontend
- Node.js 18+ and npm

### Backend
- Java 17+
- Maven 3.8+
- PostgreSQL 12+
- (Optional) OpenAI API key for AI step interpretation
- (Optional) AWS S3 credentials for screenshot storage

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Start frontend development server:**
```bash
npm run dev
```

Access the application at `http://localhost:5174`

### Option 2: Manual Setup

See [QUICKSTART.md](QUICKSTART.md) for detailed manual setup instructions.

## Running the Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5174` (default Vite port)

## Building for Production

```bash
# Build frontend
npm run build

# Output will be in dist/ directory
```

## Deployment

The project includes deployment scripts for both frontend and backend:

### Frontend Deployment to S3

Deploy the frontend to AWS S3 using the `deploy.sh` script:

```bash
./deploy.sh
```

**Configuration:**
- **S3 Bucket:** `youraitester.com` (configured in `deploy.sh`)
- **Region:** `us-east-2` (US East Ohio)
- **Backend URL:** `http://3.137.217.41:8080` (EC2 backend)

**What it does:**
1. Builds the frontend with production settings
2. Sets `VITE_API_BASE_URL` to point to the EC2 backend
3. Uploads the built files to S3
4. Optionally invalidates CloudFront cache (if configured)

**Prerequisites:**
- AWS CLI installed and configured (`aws configure`)
- S3 bucket created and configured for static website hosting
- Appropriate AWS credentials with S3 write permissions

**To update configuration:**
Edit `deploy.sh` and modify:
- `BUCKET_NAME`: Your S3 bucket name
- `AWS_REGION`: Your AWS region
- `EC2_BACKEND_URL`: Your EC2 backend URL
- `CLOUDFRONT_ID`: (Optional) Your CloudFront distribution ID

**After deployment:**
Frontend will be available at: `http://youraitester.com.s3-website-us-east-2.amazonaws.com`

### Backend Deployment to EC2

Deploy the backend to AWS EC2 using the `backend/deploy-to-ec2.sh` script:

```bash
cd backend
./deploy-to-ec2.sh
```

**Configuration:**
- **EC2 Host:** `3.137.217.41` (configured in `backend/deploy-to-ec2.sh`)
- **EC2 User:** `ec2-user`
- **Key File:** `../key1.pem` (relative to backend directory)

**What it does:**
1. Builds the Spring Boot backend JAR
2. Uploads JAR and scripts to EC2
3. Uploads MCP server files
4. Rebuilds MCP Docker container
5. Updates environment variables
6. Restarts backend and MCP services

**Prerequisites:**
- EC2 instance running with required software (Java, Docker, PostgreSQL)
- EC2 key pair file (`key1.pem`) in parent directory
- SSH access to EC2 instance
- Maven installed locally for building

**To update configuration:**
Edit `backend/deploy-to-ec2.sh` and modify:
- `EC2_HOST`: Your EC2 instance IP or hostname
- `EC2_USER`: Your EC2 user (usually `ec2-user` or `ubuntu`)
- `EC2_KEY`: Path to your EC2 key file
- `OPENAI_API_KEY`: Your OpenAI API key
- AWS S3 configuration (if using S3 for screenshots)

**After deployment:**
Backend will be available at: `http://3.137.217.41:8080`

### Deployment Workflow

1. **Deploy Backend First:**
   ```bash
   cd backend
   ./deploy-to-ec2.sh
   ```

2. **Verify Backend is Running:**
   ```bash
   curl http://3.137.217.41:8080/actuator/health
   ```

3. **Deploy Frontend:**
   ```bash
   ./deploy.sh
   ```

4. **Verify Frontend:**
   - Visit your S3 website URL
   - Frontend should connect to EC2 backend automatically

**Note:** The frontend is configured to connect to the EC2 backend URL in production builds. The connection is handled automatically via the `VITE_API_BASE_URL` environment variable set during build.

For more detailed deployment information, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Role-Based Access Control

### Roles

- **SUPER_ADMIN**: Platform administrator with access to vendor management. Can create and manage vendor admins.
- **VENDOR_ADMIN**: Manages tenants, users, projects, and billing for their vendor organization.
- **CLIENT_ADMIN**: Manages team, billing, and projects within their assigned tenant.
- **MEMBER**: Regular user with project access.

### Dashboards & Navigation

After login, users see a sidebar with tabs based on their role:

- **SUPER_ADMIN**: Dashboard, Tests, Modules, Results, Reports, Vendors (manage vendor admins)
- **VENDOR_ADMIN**: Dashboard, Tests, Modules, Results, Reports, Vendors (manage tenants)
- **CLIENT_ADMIN**: Dashboard, Tests, Modules, Results, Reports, Team, Billing, Projects

### Tenant & Project Selection

- **TenantSelector** and **ProjectSelector** components in the top bar allow switching between tenants and projects for scoped management.
- All test operations are scoped to the selected tenant/project.

### Authentication

- All API calls use JWT Bearer token authentication
- Login endpoint: `POST /api/dev-token/login`
- Tokens include role information for authorization
- Frontend stores tokens in memory/localStorage

## Development

### Frontend Development

- Hot reload enabled during development
- API proxy configured in `vite.config.js` to forward `/api` requests to backend
- Uses React Router for navigation
- UI components from shadcn/ui (Radix UI primitives)

### Connecting to Backend

The frontend is configured to connect to the backend API. Ensure:
1. Backend is running on `http://localhost:8080`
2. CORS is properly configured in backend
3. JWT tokens are included in API requests (handled by API client)

## Project Structure

### Frontend Pages

- **Dashboard**: Overview and metrics
- **Tests**: Test management and execution
- **Modules**: Test module organization
- **Results**: Test execution results and history
- **Reports**: Analytics and reporting
- **Login**: Authentication page
- **Admin Pages**: Vendor, tenant, project, team, and billing management

### API Integration

API client located in `src/api/`:
- `auth.js`: Authentication endpoints
- `base44Client.js`: Main API client for tests, modules, etc.
- `entities.js`: Entity management APIs
- `integrations.js`: Integration APIs

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Detailed setup and configuration guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide for EC2 and S3
- [backend/README.md](backend/README.md) - Backend documentation and API reference
- [backend/AI_SETUP.md](backend/AI_SETUP.md) - AI integration setup guide
- [backend/AGENT_ARCHITECTURE.md](backend/AGENT_ARCHITECTURE.md) - AI agent architecture details
- [backend/S3-SETUP.md](backend/S3-SETUP.md) - S3 screenshot storage setup guide

## Troubleshooting

### Frontend Issues

- **Blank page**: Check browser console for errors, verify dev server is running
- **API errors**: Verify backend is running and CORS is configured
- **Authentication issues**: Check token storage and API client configuration

### Common Issues

- Port conflicts: Change ports in `vite.config.js` (frontend) or `application.properties` (backend)
- CORS errors: Ensure backend allows frontend origin
- Build errors: Clear `node_modules` and reinstall dependencies

## License

MIT