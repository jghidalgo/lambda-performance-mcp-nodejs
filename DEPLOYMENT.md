# Deployment Guide - Lambda Performance MCP Server

This guide covers all deployment options for the Lambda Performance MCP Server, from local development to production Kubernetes clusters.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- AWS credentials configured
- Node.js 18+ (for local development)

### 1-Minute Setup
```bash
# Clone and setup
git clone <repository>
cd lambda-performance-mcp-nodejs

# Copy environment template
cp .env.example .env
# Edit .env with your AWS credentials

# Build and run
chmod +x scripts/build.sh scripts/deploy.sh
./scripts/build.sh
./scripts/deploy.sh docker-compose
```

## Deployment Options

### Option 1: Docker Compose (Recommended for Development)

**Simple deployment:**
```bash
# Production
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d

# With monitoring stack
docker-compose --profile monitoring up -d
```

**What you get:**
- Lambda Performance MCP Server
- Optional: Prometheus + Grafana monitoring
- Optional: Loki log aggregation
- Automatic restarts and health checks

### Option 2: Standalone Docker

**Build and run:**
```bash
# Build image
docker build -t lambda-performance-mcp .

# Run container
docker run -d \
  --name lambda-performance-mcp \
  --env-file .env \
  -v ~/.aws:/home/mcp/.aws:ro \
  lambda-performance-mcp:latest
```

### Option 3: Kubernetes (Production)

**Deploy to K8s cluster:**
```bash
# Deploy everything
./scripts/deploy.sh kubernetes

# Or manually
kubectl apply -f k8s/
```

**Features:**
- High availability (2+ replicas)
- Auto-scaling based on CPU/memory
- Rolling updates
- Health checks and monitoring
- Secure configuration management

### Option 4: AWS ECS/Fargate

**Task Definition:**
```json
{
  "family": "lambda-performance-mcp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/lambda-mcp-task-role",
  "containerDefinitions": [
    {
      "name": "lambda-performance-mcp",
      "image": "your-registry/lambda-performance-mcp:latest",
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "us-east-1"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/lambda-performance-mcp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Configuration

### Environment Variables

**Required:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Optional:**
```bash
NODE_ENV=production
LOG_LEVEL=info
MCP_SERVER_NAME=lambda-performance-analyzer
```

### AWS Credentials Options

**1. Environment Variables (Simple)**
```bash
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

**2. AWS Profile (Recommended)**
```bash
export AWS_PROFILE=lambda-analyzer
# Mount ~/.aws directory in container
```

**3. IAM Roles (Production)**
- ECS Task Role
- EKS Service Account
- EC2 Instance Profile

### Required AWS Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:GetMetricData",
        "logs:FilterLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}
```

## Monitoring & Observability

### Health Checks

**Docker:**
```bash
# Check container health
docker ps
docker logs lambda-performance-mcp

# Manual health check
docker exec lambda-performance-mcp node -e "console.log('Health check passed')"
```

**Kubernetes:**
```bash
# Check pod status
kubectl get pods -n lambda-mcp

# View logs
kubectl logs -f deployment/lambda-performance-mcp -n lambda-mcp

# Check health
kubectl describe pod <pod-name> -n lambda-mcp
```

### Monitoring Stack

**With Docker Compose:**
```bash
# Start with monitoring
docker-compose --profile monitoring up -d

# Access Grafana
open http://localhost:3000
# Default: admin/admin

# Access Prometheus
open http://localhost:9090
```

**Metrics Available:**
- MCP server performance
- Container resource usage
- AWS API call metrics
- Error rates and response times

### Logging

**Structured JSON logs:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Lambda analysis completed",
  "functionName": "my-function",
  "duration": 245,
  "requestId": "abc-123"
}
```

**Log aggregation with Loki:**
```bash
# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={container="lambda-performance-mcp"}'
```

## Production Deployment

### Kubernetes Production Setup

**1. Create namespace and RBAC:**
```bash
kubectl apply -f k8s/namespace.yaml
```

**2. Configure secrets:**
```bash
# AWS credentials
kubectl create secret generic lambda-mcp-aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=your-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret \
  -n lambda-mcp

# Or use IAM Service Account (EKS)
kubectl annotate serviceaccount lambda-mcp-service-account \
  eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT:role/lambda-mcp-role \
  -n lambda-mcp
```

**3. Deploy application:**
```bash
kubectl apply -f k8s/
```

**4. Verify deployment:**
```bash
kubectl get all -n lambda-mcp
kubectl logs -f deployment/lambda-performance-mcp -n lambda-mcp
```

### Auto-scaling Configuration

**Horizontal Pod Autoscaler:**
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

**Vertical Pod Autoscaler (optional):**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: lambda-performance-mcp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lambda-performance-mcp
  updatePolicy:
    updateMode: "Auto"
```

## Security Best Practices

### Container Security
- Non-root user (UID 1001)
- Read-only root filesystem
- No privileged escalation
- Minimal base image (Alpine)
- Security scanning with Trivy

### Network Security
- Internal service communication only
- TLS encryption for external access
- Network policies (Kubernetes)
- VPC security groups (AWS)

### Secrets Management
- Kubernetes secrets
- AWS Secrets Manager integration
- Environment variable encryption
- Least privilege IAM roles

## Performance Tuning

### Resource Allocation

**Development:**
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

**Production:**
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Optimization Tips
- Use multi-stage Docker builds
- Enable HTTP/2 for better performance
- Configure appropriate timeouts
- Use connection pooling for AWS APIs
- Implement caching for frequently accessed data

## Troubleshooting

### Common Issues

**1. AWS Credentials Not Working**
```bash
# Check credentials
docker exec lambda-performance-mcp env | grep AWS

# Test AWS access
docker exec lambda-performance-mcp aws sts get-caller-identity
```

**2. Container Won't Start**
```bash
# Check logs
docker logs lambda-performance-mcp

# Check health
docker inspect lambda-performance-mcp
```

**3. Kubernetes Pod Issues**
```bash
# Describe pod
kubectl describe pod <pod-name> -n lambda-mcp

# Check events
kubectl get events -n lambda-mcp --sort-by='.lastTimestamp'
```

### Debug Mode

**Enable debug logging:**
```bash
# Docker
docker run -e LOG_LEVEL=debug lambda-performance-mcp

# Kubernetes
kubectl set env deployment/lambda-performance-mcp LOG_LEVEL=debug -n lambda-mcp
```

## Scaling Considerations

### Horizontal Scaling
- Stateless design allows easy horizontal scaling
- Each instance can handle multiple concurrent requests
- Load balancing across instances

### Vertical Scaling
- Monitor memory usage patterns
- CPU usage typically low except during analysis
- Scale based on concurrent request volume

### Cost Optimization
- Use spot instances for non-critical environments
- Right-size resources based on actual usage
- Implement auto-scaling to handle traffic spikes

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy Lambda MCP Server
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and push
      run: |
        ./scripts/build.sh ${{ github.sha }}
        docker push your-registry/lambda-performance-mcp:${{ github.sha }}
    - name: Deploy to K8s
      run: |
        kubectl set image deployment/lambda-performance-mcp \
          lambda-performance-mcp=your-registry/lambda-performance-mcp:${{ github.sha }} \
          -n lambda-mcp
```

This deployment guide provides everything needed to run the Lambda Performance MCP Server in any environment, from local development to production Kubernetes clusters!