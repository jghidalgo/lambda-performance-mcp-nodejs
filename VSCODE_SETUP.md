# VSCode Setup Guide - Lambda Performance MCP Server

This guide helps you set up VSCode for optimal development experience with the Lambda Performance MCP Server, similar to popular MCP servers like MongoDB or AWS Documentation.

## Quick Setup

### 1. Open in VSCode
```bash
# Clone and open
git clone <repository>
cd lambda-performance-mcp-nodejs
code .
```

### 2. Install Recommended Extensions
VSCode will automatically prompt you to install recommended extensions. Click "Install All" or install manually:

**Essential Extensions:**
- **AWS Toolkit** - AWS integration and Lambda development
- **Docker** - Container management and debugging
- **Kubernetes** - K8s deployment and management
- **ESLint** - Code linting and quality
- **Prettier** - Code formatting
- **GitLens** - Enhanced Git capabilities

### 3. Configure AWS Credentials
```bash
# Option 1: AWS CLI (Recommended)
aws configure
# Enter your AWS credentials

# Option 2: Environment variables
cp .env.example .env
# Edit .env with your AWS credentials
```

### 4. Setup Development Environment
```bash
# Install dependencies
npm run setup

# Start development server
npm run dev
```

## Development Features

### Command Palette Integration
Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and type:

- **"MCP: Start Server"** - Launch the MCP server
- **"MCP: Build Docker"** - Build Docker image
- **"MCP: Deploy"** - Deploy with Docker Compose
- **"AWS: Configure"** - Setup AWS credentials
- **"Docker: Build"** - Build container image

### Built-in Tasks
Access via `Terminal > Run Task...`:

- **Install Dependencies** - `npm install`
- **Start MCP Server** - Launch in development mode
- **Build Docker Image** - Create production container
- **Deploy with Docker Compose** - Full stack deployment
- **Run Tests** - Execute test suite
- **Lint Code** - Check code quality
- **Format Code** - Auto-format with Prettier

### Debugging Support
Multiple debug configurations available:

1. **Launch MCP Server** - Debug the main server
2. **Debug MCP Server** - Debug with breakpoints
3. **Test Lambda Analyzer** - Debug specific components
4. **Attach to Docker Container** - Debug containerized app

### Code Snippets
Type these prefixes and press `Tab`:

- `mcp-tool` - Create new MCP tool handler
- `aws-client` - Create AWS SDK client class
- `lambda-analysis` - Lambda function analysis method
- `docker-service` - Docker Compose service
- `k8s-deployment` - Kubernetes deployment
- `env-config` - Environment configuration

## Container Development

### Dev Container Support
Open in a containerized environment:

1. Install **Remote - Containers** extension
2. Press `F1` → "Remote-Containers: Reopen in Container"
3. VSCode will build and open the dev container

**Features:**
- Pre-configured Node.js environment
- AWS CLI and kubectl installed
- All extensions pre-installed
- Automatic port forwarding
- Shared AWS credentials

### Docker Integration
- **Build**: `Ctrl+Shift+P` → "Docker: Build Image"
- **Run**: `Ctrl+Shift+P` → "Docker: Run"
- **Logs**: `Ctrl+Shift+P` → "Docker: View Logs"
- **Compose**: Right-click `docker-compose.yml` → "Compose Up"

## Kubernetes Integration

### Cluster Management
- **Connect**: `Ctrl+Shift+P` → "Kubernetes: Set Kubeconfig"
- **Deploy**: `Ctrl+Shift+P` → "Kubernetes: Apply"
- **Logs**: Right-click pod → "Logs"
- **Port Forward**: Right-click service → "Port Forward"

### YAML Support
- Auto-completion for Kubernetes manifests
- Schema validation
- Inline documentation
- Error highlighting

## Configuration Files

### Workspace Settings (`.vscode/settings.json`)
```json
{
  "aws.profile": "default",
  "aws.region": "us-east-1",
  "mcp.servers": {
    "lambda-performance": {
      "command": "node",
      "args": ["${workspaceFolder}/index.js"]
    }
  }
}
```

### User Settings
Add to your VSCode user settings:
```json
{
  "mcp.autoStart": true,
  "aws.telemetry": false,
  "docker.showStartPage": false
}
```

## Testing Integration

### Run Tests
- **All Tests**: `npm test` or `Ctrl+Shift+P` → "Test: Run All Tests"
- **Watch Mode**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`
- **Single File**: Click "Run" above test functions

### Test Explorer
- View all tests in the Test Explorer panel
- Run individual tests or test suites
- Debug tests with breakpoints
- View test results and coverage

## Monitoring Integration

### AWS Toolkit Features
- **Lambda Functions**: Browse and invoke functions
- **CloudWatch Logs**: View logs directly in VSCode
- **S3 Buckets**: Browse and manage files
- **CloudFormation**: Deploy and manage stacks

### Docker Monitoring
- Container status in status bar
- Resource usage monitoring
- Log streaming
- Health check status

## Debugging Tips

### MCP Server Debugging
1. Set breakpoints in your code
2. Press `F5` or use "Debug MCP Server" configuration
3. Server starts with debugger attached
4. Test MCP calls trigger breakpoints

### Container Debugging
1. Start container with debug port: `docker run -p 9229:9229 ...`
2. Use "Attach to Docker Container" configuration
3. Set breakpoints and debug remotely

### AWS API Debugging
- Enable debug logging: `LOG_LEVEL=debug`
- Use AWS X-Ray for distributed tracing
- Monitor CloudWatch metrics in real-time

## Deployment Workflows

### Local Development
```bash
# Start development server with hot reload
npm run dev

# Or use VSCode task
Ctrl+Shift+P → "Tasks: Run Task" → "Start Development Server"
```

### Docker Development
```bash
# Build and run with Docker Compose
npm run docker:dev

# Or use VSCode
Right-click docker-compose.dev.yml → "Compose Up"
```

### Production Deployment
```bash
# Build production image
npm run build

# Deploy to Kubernetes
npm run k8s:deploy

# Or use VSCode tasks
Ctrl+Shift+P → "Tasks: Run Task" → "Deploy to Kubernetes"
```

## Customization

### Add Custom Tasks
Edit `.vscode/tasks.json`:
```json
{
  "label": "My Custom Task",
  "type": "shell",
  "command": "echo",
  "args": ["Hello World"],
  "group": "build"
}
```

### Add Custom Snippets
Edit `.vscode/snippets.json`:
```json
{
  "My Snippet": {
    "prefix": "my-snippet",
    "body": ["console.log('$1');"],
    "description": "My custom snippet"
  }
}
```

### Workspace Extensions
Add to `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "your.custom-extension"
  ]
}
```

## MCP Integration

### MCP Client Configuration
Add to your MCP client settings:
```json
{
  "mcpServers": {
    "lambda-performance": {
      "command": "node",
      "args": ["/path/to/lambda-performance-mcp-nodejs/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Testing MCP Tools
Use the integrated terminal:
```bash
# Test MCP server locally
node index.js

# Test specific tools
npm run test -- --grep "analyze_lambda_performance"
```

## Learning Resources

### VSCode Documentation
- [VSCode Node.js Tutorial](https://code.visualstudio.com/docs/nodejs/nodejs-tutorial)
- [Docker in VSCode](https://code.visualstudio.com/docs/containers/overview)
- [Kubernetes in VSCode](https://code.visualstudio.com/docs/azure/kubernetes)

### AWS Integration
- [AWS Toolkit Guide](https://docs.aws.amazon.com/toolkit-for-vscode/)
- [Lambda Development](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)

### MCP Development
- [MCP Specification](https://modelcontextprotocol.io/docs)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

## 🆘 Troubleshooting

### Common Issues

**1. AWS Credentials Not Found**
```bash
# Check AWS configuration
aws sts get-caller-identity

# Or use VSCode task
Ctrl+Shift+P → "Tasks: Run Task" → "AWS Configure Check"
```

**2. Docker Not Running**
```bash
# Check Docker status
docker --version

# Start Docker Desktop (Windows/Mac)
# Or start Docker service (Linux)
sudo systemctl start docker
```

**3. Node.js Version Issues**
```bash
# Check Node.js version (requires 18+)
node --version

# Use nvm to switch versions
nvm use 18
```

**4. Extension Issues**
- Reload VSCode: `Ctrl+Shift+P` → "Developer: Reload Window"
- Check extension logs: `Ctrl+Shift+P` → "Developer: Show Logs"
- Disable/enable problematic extensions

### Debug Mode
Enable debug logging in VSCode:
1. `Ctrl+Shift+P` → "Developer: Set Log Level"
2. Select "Debug"
3. Check Output panel for detailed logs

This VSCode setup makes the Lambda Performance MCP Server as easy to use as popular MCP servers, with full IDE integration, debugging support, and streamlined workflows!