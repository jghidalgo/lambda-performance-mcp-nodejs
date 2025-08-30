# How to Interact with Lambda Performance MCP Server

This guide shows you how to set up, configure, and interact with the Lambda Performance MCP server with MCP clients with practical examples.

## Quick Setup

### Step 1: Install and Configure the MCP Server

1. **Install dependencies**:
```bash
cd lambda-performance-mcp-nodejs
npm install
```

2. **Set up AWS credentials**:
```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Option 2: AWS CLI profile (recommended)
aws configure --profile lambda-analyzer
export AWS_PROFILE=lambda-analyzer
```

3. **Test the server**:
```bash
npm start
```

### Step 2: Configure MCP Client Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "lambda-performance": {
      "command": "node",
      "args": ["/absolute/path/to/lambda-performance-mcp-nodejs/index.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "lambda-analyzer"
      },
      "disabled": false,
      "autoApprove": [
        "list_lambda_functions",
        "analyze_lambda_performance"
      ]
    }
  }
}
```

## Natural Language Interactions

Once configured, you can interact with the MCP server using natural language in your MCP client:

### Basic Performance Analysis

**You ask:**
> "Analyze the performance of my Lambda function called 'user-authentication-service' over the last 24 hours"

**The MCP server will:**
1. Call the `analyze_lambda_performance` tool
2. Provide comprehensive metrics including duration, cold starts, errors, and memory usage
3. Show performance trends and bottlenecks

**Example Response:**
```
# Lambda Performance Analysis: user-authentication-service

## Summary
- **Total Invocations**: 25,847
- **Average Duration**: 342ms
- **Cold Start Rate**: 8.7%
- **Error Rate**: 1.2%
- **Memory Utilization**: 73%

## Performance Metrics
- **P50 Duration**: 280ms
- **P95 Duration**: 650ms
- **P99 Duration**: 1,200ms
- **Max Duration**: 2,100ms

## Cold Start Analysis
- **Total Cold Starts**: 2,249
- **Average Cold Start Duration**: 1,450ms
- **Cold Start Pattern**: Moderate frequency during low traffic periods
```

### Cold Start Deep Dive

**You ask:**
> "I'm seeing high cold start rates on my payment-processor function. Can you analyze the cold start patterns?"

**The MCP server will:**
1. Use the `track_cold_starts` tool
2. Analyze CloudWatch logs for INIT_START events
3. Identify patterns, triggers, and provide specific recommendations

**Example Response:**
```
# Cold Start Analysis: payment-processor

## Cold Start Statistics
- **Total Cold Starts**: 1,456
- **Cold Start Rate**: 15.3%
- **Average Cold Start Duration**: 2,100ms
- **Longest Cold Start**: 3,800ms

## Cold Start Patterns
- **Peak Hours**: 09:00, 13:00, 18:00
- **Frequency**: High (15-25%)
- **Triggers**: Long idle periods (>15 minutes), Function deployments

## Optimization Opportunities
- Consider implementing Provisioned Concurrency to reduce cold starts
- Optimize function initialization code to reduce cold start duration
- Reduce deployment package size by removing unused dependencies
```

### Optimization Recommendations

**You ask:**
> "What optimizations can I make to improve the performance and reduce costs of my API gateway backend functions?"

**The MCP server will:**
1. Call `get_optimization_recommendations` for each function
2. Analyze performance bottlenecks
3. Provide prioritized, actionable recommendations

**Example Response:**
```
# Optimization Recommendations: api-gateway-backend

## Priority Recommendations
1. **Right-size Memory Allocation** (Impact: High)
   - Memory is over-provisioned at 1024MB with only 45% utilization
   - Implementation: Reduce memory to 512MB
   - Expected Improvement: Reduce costs by 35%

2. **Implement Connection Pooling** (Impact: High)
   - Database connections are created on each invocation
   - Implementation: Use RDS Proxy or connection pooling library
   - Expected Improvement: Reduce duration by 40-60%

3. **Optimize Cold Start Performance** (Impact: Medium)
   - Cold start rate of 12% is impacting user experience
   - Implementation: Implement provisioned concurrency for 3-5 instances
   - Expected Improvement: Reduce cold starts by 90%

## Cost Impact
- **Current Monthly Cost**: $127.45
- **Optimized Monthly Cost**: $78.20
- **Potential Savings**: $49.25 (39%)
```

### Function Comparison

**You ask:**
> "Compare the performance of my three microservices: user-service, order-service, and inventory-service"

**The MCP server will:**
1. Use `compare_lambda_performance` tool
2. Analyze metrics across all functions
3. Identify best and worst performers with insights

**Example Response:**
```
# Lambda Performance Comparison

## Functions Analyzed
- user-service
- order-service  
- inventory-service

## Performance Comparison
| Function | Duration | Cold-starts | Errors | Invocations | Cost |
|----------|----------|-------------|--------|-------------|------|
| user-service | 245ms | 8.2% | 0.5% | 45,230 | $23.45 |
| order-service | 890ms | 15.7% | 2.1% | 12,450 | $67.80 |
| inventory-service | 156ms | 3.4% | 0.2% | 78,920 | $18.90 |

## Key Insights
- inventory-service has the best average duration (156ms)
- order-service has the highest cold start rate (15.7%)
- user-service shows balanced performance across all metrics

## Recommendations
- Optimize cold start performance for: order-service
- Review error handling for: order-service
- Consider using inventory-service architecture as a template for others
```

### Memory Analysis

**You ask:**
> "My Lambda function seems to be using too much memory. Can you analyze the memory utilization and suggest the right size?"

**The MCP server will:**
1. Call `analyze_memory_utilization`
2. Parse CloudWatch logs for memory usage patterns
3. Provide right-sizing recommendations

**Example Response:**
```
# Memory Utilization Analysis: data-processor

## Current Configuration
- **Allocated Memory**: 1024MB
- **Average Used**: 387MB (38%)
- **Peak Usage**: 456MB
- **Minimum Usage**: 298MB

## Right-sizing Recommendation
- **Recommended Memory**: 512MB
- **Reasoning**: Memory is significantly over-provisioned. Current peak usage is well below recommended allocation.
- **Expected Performance Impact**: Minimal performance impact expected
- **Cost Impact**: Reduce costs by ~50%

## Memory Usage Patterns
- Consistent memory usage pattern
- No memory leaks detected
- Usage remains stable throughout execution
```

### Cost Analysis

**You ask:**
> "Show me a detailed cost breakdown for all my Lambda functions this month and identify where I can save money"

**The MCP server will:**
1. Use `get_cost_analysis` for account-wide analysis
2. Break down costs by compute, requests, and data transfer
3. Identify specific optimization opportunities

**Example Response:**
```
# Cost Analysis (Account-wide)

## Cost Breakdown
- **Total Cost**: $245.67
- **Compute Cost**: $198.45 (81%)
- **Request Cost**: $47.22 (19%)
- **Data Transfer**: $0.00

## Usage Statistics
- **Total Invocations**: 2,500,000
- **Total Duration**: 750,000,000ms
- **Average Duration**: 300ms

## Cost Optimization Opportunities
- **Right-sizing**: Optimize memory across functions (Potential savings: $45.20)
- **Cold start reduction**: Implement provisioned concurrency strategically (Potential savings: $23.10)
- **ARM Architecture**: Migrate compatible functions to ARM (Potential savings: $35.80)

## Trends
- **Daily Average**: $8.19
- **Trend**: Increasing by 12% month-over-month
- **Peak Day**: January 20th ($12.45)
```

### Real-time Monitoring

**You ask:**
> "Monitor my checkout-service function in real-time for the next 10 minutes and alert me if there are any performance issues"

**The MCP server will:**
1. Call `monitor_real_time_performance`
2. Track live metrics and detect anomalies
3. Provide immediate alerts for issues

**Example Response:**
```
# Real-time Performance Monitoring: checkout-service

## Live Metrics (Last 10 minutes)
- **Active Invocations**: 23
- **Recent Invocations**: 1,247
- **Average Duration**: 456ms
- **Error Rate**: 0.8%
- **Cold Starts**: 12

## Performance Alerts
Duration spike detected - average increased to 456ms (normal: 280ms)
Cold start frequency higher than usual (12 in 10 minutes)

## Recent Activity
- 14:32:15: Invocation (234ms)
- 14:32:10: Cold Start (1,200ms)
- 14:32:05: Invocation (189ms)
- 14:32:00: Invocation (267ms)
```

## Advanced Use Cases

### Troubleshooting Performance Issues

**Scenario:** Your function is timing out frequently

**You ask:**
> "My order-processing function is timing out. Help me identify what's causing the performance issues."

**The MCP server will:**
1. Analyze performance metrics and error patterns
2. Examine duration trends and outliers
3. Provide specific troubleshooting steps

### Pre-deployment Performance Validation

**You ask:**
> "I'm about to deploy a new version of my user-service. Compare the current performance with last week to establish a baseline."

**The MCP server will:**
1. Analyze current performance metrics
2. Compare with historical data
3. Provide performance baseline for comparison after deployment

### Cost Optimization Planning

**You ask:**
> "I need to reduce my Lambda costs by 30%. Analyze all my functions and create an optimization plan."

**The MCP server will:**
1. Analyze all functions for optimization opportunities
2. Prioritize recommendations by cost impact
3. Create a step-by-step optimization plan

## Direct Tool Usage (Advanced)

If you need to call specific tools directly, you can use the tool names:

### List All Functions
```
Use the list_lambda_functions tool to show all my Lambda functions with their basic metrics
```

### Specific Analysis Types
```
Use analyze_lambda_performance for my-function with timeRange=7d and includeDetails=true
```

### Targeted Optimization
```
Use get_optimization_recommendations for my-function focusing on cold-start optimization
```

## Troubleshooting Common Issues

### "No data available" responses
**Cause:** Function hasn't been invoked recently or CloudWatch logs are disabled
**Solution:** 
- Verify function name spelling
- Check if function has been invoked in the specified time range
- Ensure CloudWatch logging is enabled

### Permission errors
**Cause:** AWS credentials lack required permissions
**Solution:**
- Verify AWS credentials are configured correctly
- Ensure IAM permissions include Lambda, CloudWatch, and CloudWatch Logs access

### Connection timeouts
**Cause:** Network connectivity or AWS region issues
**Solution:**
- Check AWS region configuration
- Verify network connectivity to AWS services
- Try a different AWS region

## Best Practices

1. **Start with broad analysis** then drill down into specific issues
2. **Use time ranges appropriate** for your analysis needs (24h for recent issues, 7d for trends)
3. **Combine multiple tools** for comprehensive analysis
4. **Monitor regularly** rather than only when issues occur
5. **Implement recommendations incrementally** and measure impact

## Getting the Most Value

The Lambda Performance MCP server is most valuable when used for:

- **Proactive monitoring** - Regular performance health checks
- **Cost optimization** - Monthly cost reviews and optimization planning  
- **Troubleshooting** - Quick diagnosis of performance issues
- **Capacity planning** - Understanding usage patterns and scaling needs
- **Performance benchmarking** - Comparing functions and tracking improvements

With natural language queries, you can get deep insights into your Lambda performance without needing to navigate AWS consoles or write complex CloudWatch queries!