# Lambda Performance MCP Server (Node.js)

A comprehensive Model Context Protocol (MCP) server for analyzing AWS Lambda performance, tracking cold starts, and providing optimization recommendations. Built with Node.js and the AWS SDK v3.

## Features

### 🔍 Performance Analysis
- **Comprehensive Metrics**: Duration, memory usage, error rates, invocation counts
- **Cold Start Tracking**: Detailed analysis of cold start patterns and frequency
- **Real-time Monitoring**: Live performance metrics and alerts
- **Cost Analysis**: Detailed cost breakdown and optimization opportunities

### 📊 Advanced Analytics
- **Percentile Analysis**: P50, P90, P95, P99 duration metrics
- **Memory Utilization**: Right-sizing recommendations based on actual usage
- **Error Pattern Analysis**: Identify and categorize error types
- **Trend Analysis**: Performance trends over time

### 🎯 Optimization Recommendations
- **Cold Start Optimization**: Provisioned concurrency, package size, initialization
- **Memory Right-sizing**: Optimal memory allocation based on usage patterns
- **Cost Optimization**: ARM architecture, duration optimization, resource efficiency
- **Performance Tuning**: Code optimization, connection pooling, caching strategies

### 📈 Comparative Analysis
- **Multi-function Comparison**: Compare performance across multiple Lambda functions
- **Benchmarking**: Identify best and worst performers
- **Resource Utilization**: Compare memory, duration, and cost metrics

## Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd lambda-performance-mcp-nodejs
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your AWS credentials and configuration
```

4. **Set up AWS credentials**:
```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Option 2: AWS CLI profile
aws configure --profile lambda-analyzer
export AWS_PROFILE=lambda-analyzer

# Option 3: IAM roles (for EC2/Lambda execution)
```

## Required AWS Permissions

The MCP server requires the following AWS permissions:

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

## Usage

### Running the MCP Server

```bash
# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

### Available Tools

#### 1. Analyze Lambda Performance
```javascript
{
  "name": "analyze_lambda_performance",
  "arguments": {
    "functionName": "my-lambda-function",
    "timeRange": "24h",
    "includeDetails": true
  }
}
```

#### 2. Track Cold Starts
```javascript
{
  "name": "track_cold_starts",
  "arguments": {
    "functionName": "my-lambda-function",
    "timeRange": "24h"
  }
}
```

#### 3. Get Optimization Recommendations
```javascript
{
  "name": "get_optimization_recommendations",
  "arguments": {
    "functionName": "my-lambda-function",
    "analysisType": "all"
  }
}
```

#### 4. Compare Lambda Performance
```javascript
{
  "name": "compare_lambda_performance",
  "arguments": {
    "functionNames": ["function-1", "function-2", "function-3"],
    "timeRange": "24h",
    "metrics": ["duration", "cold-starts", "errors", "cost"]
  }
}
```

#### 5. List Lambda Functions
```javascript
{
  "name": "list_lambda_functions",
  "arguments": {
    "runtime": "nodejs18.x",
    "includeMetrics": true
  }
}
```

#### 6. Analyze Memory Utilization
```javascript
{
  "name": "analyze_memory_utilization",
  "arguments": {
    "functionName": "my-lambda-function",
    "timeRange": "24h"
  }
}
```

#### 7. Get Cost Analysis
```javascript
{
  "name": "get_cost_analysis",
  "arguments": {
    "functionName": "my-lambda-function",
    "timeRange": "30d"
  }
}
```

#### 8. Monitor Real-time Performance
```javascript
{
  "name": "monitor_real_time_performance",
  "arguments": {
    "functionName": "my-lambda-function",
    "duration": 5
  }
}
```

## Configuration with Kiro

To use this MCP server with Kiro, add it to your MCP configuration:

### Workspace Configuration (`.kiro/settings/mcp.json`)
```json
{
  "mcpServers": {
    "lambda-performance": {
      "command": "node",
      "args": ["path/to/lambda-performance-mcp-nodejs/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "your_access_key",
        "AWS_SECRET_ACCESS_KEY": "your_secret_key"
      },
      "disabled": false,
      "autoApprove": [
        "list_lambda_functions",
        "analyze_lambda_performance",
        "track_cold_starts"
      ]
    }
  }
}
```

### Global Configuration (`~/.kiro/settings/mcp.json`)
```json
{
  "mcpServers": {
    "lambda-performance": {
      "command": "node",
      "args": ["path/to/lambda-performance-mcp-nodejs/index.js"],
      "env": {
        "AWS_PROFILE": "default"
      },
      "disabled": false
    }
  }
}
```

## Key Features Explained

### Cold Start Analysis
- **Pattern Detection**: Identifies when and why cold starts occur
- **Duration Analysis**: Tracks initialization times and optimization opportunities
- **Trigger Identification**: Determines what causes cold starts (idle time, scaling, deployments)
- **Timeline Visualization**: Shows cold start frequency over time

### Performance Optimization
- **Memory Right-sizing**: Analyzes actual memory usage vs. allocated memory
- **Duration Optimization**: Identifies performance bottlenecks and optimization opportunities
- **Cost Optimization**: Provides recommendations to reduce Lambda costs
- **Architecture Recommendations**: Suggests ARM vs x86 based on workload compatibility

### Real-time Monitoring
- **Live Metrics**: Current invocation rates, duration, and error rates
- **Performance Alerts**: Automatic detection of performance issues
- **Activity Tracking**: Recent invocation history and patterns

## Example Outputs

### Performance Analysis
```
# Lambda Performance Analysis: my-function

## Summary
- **Total Invocations**: 15,432
- **Average Duration**: 245ms
- **Cold Start Rate**: 12.3%
- **Error Rate**: 0.8%
- **Memory Utilization**: 67%

## Performance Metrics
- **P50 Duration**: 180ms
- **P95 Duration**: 450ms
- **P99 Duration**: 890ms
- **Max Duration**: 1,200ms

## Cold Start Analysis
- **Total Cold Starts**: 1,898
- **Average Cold Start Duration**: 1,200ms
- **Cold Start Pattern**: Moderate frequency during low traffic
```

### Optimization Recommendations
```
# Optimization Recommendations: my-function

## Priority Recommendations
1. **Right-size Memory Allocation** (Impact: High)
   - Current memory is over-provisioned
   - Implementation: Reduce memory from 512MB to 256MB
   - Expected Improvement: Reduce costs by 25%

2. **Optimize Cold Start Performance** (Impact: High)
   - High cold start rate detected
   - Implementation: Implement provisioned concurrency for 2-3 instances
   - Expected Improvement: Reduce cold starts by 85%
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure AWS credentials have required permissions
   - Check CloudWatch Logs access for cold start analysis

2. **No Data Available**
   - Verify function name is correct
   - Check if function has been invoked in the specified time range
   - Ensure CloudWatch logging is enabled

3. **Connection Timeouts**
   - Check AWS region configuration
   - Verify network connectivity to AWS services

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm start
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Kiro Client   │────│  MCP Server      │────│  AWS Services   │
│                 │    │                  │    │                 │
│ - Tool calls    │    │ - Lambda         │    │ - Lambda API    │
│ - Responses     │    │   Analyzer       │    │ - CloudWatch    │
│                 │    │ - Performance    │    │ - CloudWatch    │
│                 │    │   Optimizer      │    │   Logs          │
│                 │    │ - Cold Start     │    │                 │
│                 │    │   Tracker        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review AWS permissions
- Verify environment configuration
- Check CloudWatch Logs for detailed error messages