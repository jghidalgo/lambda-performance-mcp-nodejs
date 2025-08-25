#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { LambdaAnalyzer } from './src/lambda-analyzer.js';
import { PerformanceOptimizer } from './src/performance-optimizer.js';
import { ColdStartTracker } from './src/cold-start-tracker.js';

dotenv.config();

class LambdaPerformanceMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'lambda-performance-analyzer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.lambdaAnalyzer = new LambdaAnalyzer();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.coldStartTracker = new ColdStartTracker();

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_lambda_performance',
            description: 'Analyze Lambda function performance metrics including cold starts, duration, and errors',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function to analyze'
                },
                timeRange: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d', '30d'],
                  description: 'Time range for analysis (default: 24h)'
                },
                includeDetails: {
                  type: 'boolean',
                  description: 'Include detailed metrics and logs (default: true)'
                }
              },
              required: ['functionName']
            }
          },
          {
            name: 'track_cold_starts',
            description: 'Track and analyze cold start patterns for Lambda functions',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function'
                },
                timeRange: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d'],
                  description: 'Time range for cold start analysis (default: 24h)'
                }
              },
              required: ['functionName']
            }
          },
          {
            name: 'get_optimization_recommendations',
            description: 'Get performance optimization recommendations for Lambda functions',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function'
                },
                analysisType: {
                  type: 'string',
                  enum: ['cold-start', 'memory', 'duration', 'cost', 'all'],
                  description: 'Type of optimization analysis (default: all)'
                }
              },
              required: ['functionName']
            }
          },
          {
            name: 'compare_lambda_performance',
            description: 'Compare performance metrics between multiple Lambda functions',
            inputSchema: {
              type: 'object',
              properties: {
                functionNames: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of Lambda function names to compare'
                },
                timeRange: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d'],
                  description: 'Time range for comparison (default: 24h)'
                },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['duration', 'cold-starts', 'errors', 'invocations', 'cost']
                  },
                  description: 'Metrics to compare (default: all)'
                }
              },
              required: ['functionNames']
            }
          },
          {
            name: 'list_lambda_functions',
            description: 'List all Lambda functions in the account with basic performance info',
            inputSchema: {
              type: 'object',
              properties: {
                runtime: {
                  type: 'string',
                  description: 'Filter by runtime (e.g., nodejs18.x, python3.9)'
                },
                includeMetrics: {
                  type: 'boolean',
                  description: 'Include basic performance metrics (default: false)'
                }
              }
            }
          },
          {
            name: 'analyze_memory_utilization',
            description: 'Analyze memory utilization and provide right-sizing recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function'
                },
                timeRange: {
                  type: 'string',
                  enum: ['1h', '6h', '24h', '7d'],
                  description: 'Time range for memory analysis (default: 24h)'
                }
              },
              required: ['functionName']
            }
          },
          {
            name: 'get_cost_analysis',
            description: 'Analyze Lambda function costs and identify optimization opportunities',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function (optional for account-wide analysis)'
                },
                timeRange: {
                  type: 'string',
                  enum: ['24h', '7d', '30d'],
                  description: 'Time range for cost analysis (default: 30d)'
                }
              }
            }
          },
          {
            name: 'monitor_real_time_performance',
            description: 'Get real-time performance metrics and alerts for Lambda functions',
            inputSchema: {
              type: 'object',
              properties: {
                functionName: {
                  type: 'string',
                  description: 'Name of the Lambda function'
                },
                duration: {
                  type: 'number',
                  description: 'Monitoring duration in minutes (default: 5)'
                }
              },
              required: ['functionName']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_lambda_performance':
            return await this.analyzeLambdaPerformance(args);
          
          case 'track_cold_starts':
            return await this.trackColdStarts(args);
          
          case 'get_optimization_recommendations':
            return await this.getOptimizationRecommendations(args);
          
          case 'compare_lambda_performance':
            return await this.compareLambdaPerformance(args);
          
          case 'list_lambda_functions':
            return await this.listLambdaFunctions(args);
          
          case 'analyze_memory_utilization':
            return await this.analyzeMemoryUtilization(args);
          
          case 'get_cost_analysis':
            return await this.getCostAnalysis(args);
          
          case 'monitor_real_time_performance':
            return await this.monitorRealTimePerformance(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async analyzeLambdaPerformance(args) {
    const { functionName, timeRange = '24h', includeDetails = true } = args;
    
    const analysis = await this.lambdaAnalyzer.analyzeFunction(
      functionName, 
      timeRange, 
      includeDetails
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Lambda Performance Analysis: ${functionName}\n\n` +
                `## Summary\n` +
                `- **Total Invocations**: ${analysis.totalInvocations.toLocaleString()}\n` +
                `- **Average Duration**: ${analysis.avgDuration}ms\n` +
                `- **Cold Start Rate**: ${analysis.coldStartRate}%\n` +
                `- **Error Rate**: ${analysis.errorRate}%\n` +
                `- **Memory Utilization**: ${analysis.memoryUtilization}%\n\n` +
                `## Performance Metrics\n` +
                `- **P50 Duration**: ${analysis.p50Duration}ms\n` +
                `- **P95 Duration**: ${analysis.p95Duration}ms\n` +
                `- **P99 Duration**: ${analysis.p99Duration}ms\n` +
                `- **Max Duration**: ${analysis.maxDuration}ms\n\n` +
                `## Cold Start Analysis\n` +
                `- **Total Cold Starts**: ${analysis.coldStarts.total}\n` +
                `- **Average Cold Start Duration**: ${analysis.coldStarts.avgDuration}ms\n` +
                `- **Cold Start Pattern**: ${analysis.coldStarts.pattern}\n\n` +
                `${includeDetails ? this.formatDetailedMetrics(analysis.details) : ''}`
        }
      ]
    };
  }

  async trackColdStarts(args) {
    const { functionName, timeRange = '24h' } = args;
    
    const coldStartData = await this.coldStartTracker.trackColdStarts(
      functionName, 
      timeRange
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Cold Start Analysis: ${functionName}\n\n` +
                `## Cold Start Statistics\n` +
                `- **Total Cold Starts**: ${coldStartData.total}\n` +
                `- **Cold Start Rate**: ${coldStartData.rate}%\n` +
                `- **Average Cold Start Duration**: ${coldStartData.avgDuration}ms\n` +
                `- **Longest Cold Start**: ${coldStartData.maxDuration}ms\n\n` +
                `## Cold Start Patterns\n` +
                `- **Peak Hours**: ${coldStartData.peakHours.join(', ')}\n` +
                `- **Frequency**: ${coldStartData.frequency}\n` +
                `- **Triggers**: ${coldStartData.triggers.join(', ')}\n\n` +
                `## Optimization Opportunities\n` +
                `${coldStartData.recommendations.map(rec => `- ${rec}`).join('\n')}\n\n` +
                `## Timeline\n` +
                `${this.formatColdStartTimeline(coldStartData.timeline)}`
        }
      ]
    };
  }

  async getOptimizationRecommendations(args) {
    const { functionName, analysisType = 'all' } = args;
    
    const recommendations = await this.performanceOptimizer.getRecommendations(
      functionName, 
      analysisType
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Optimization Recommendations: ${functionName}\n\n` +
                `## Priority Recommendations\n` +
                `${recommendations.priority.map((rec, i) => 
                  `${i + 1}. **${rec.title}** (Impact: ${rec.impact})\n` +
                  `   - ${rec.description}\n` +
                  `   - Implementation: ${rec.implementation}\n` +
                  `   - Expected Improvement: ${rec.expectedImprovement}\n`
                ).join('\n')}\n` +
                `## Additional Optimizations\n` +
                `${recommendations.additional.map(rec => `- ${rec}`).join('\n')}\n\n` +
                `## Configuration Recommendations\n` +
                `- **Memory**: ${recommendations.config.memory}MB\n` +
                `- **Timeout**: ${recommendations.config.timeout}s\n` +
                `- **Runtime**: ${recommendations.config.runtime}\n` +
                `- **Architecture**: ${recommendations.config.architecture}\n\n` +
                `## Cost Impact\n` +
                `- **Current Monthly Cost**: $${recommendations.cost.current}\n` +
                `- **Optimized Monthly Cost**: $${recommendations.cost.optimized}\n` +
                `- **Potential Savings**: $${recommendations.cost.savings} (${recommendations.cost.savingsPercent}%)`
        }
      ]
    };
  }

  async compareLambdaPerformance(args) {
    const { functionNames, timeRange = '24h', metrics = ['duration', 'cold-starts', 'errors', 'invocations', 'cost'] } = args;
    
    const comparison = await this.lambdaAnalyzer.compareFunctions(
      functionNames, 
      timeRange, 
      metrics
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Lambda Performance Comparison\n\n` +
                `## Functions Analyzed\n` +
                `${functionNames.map(name => `- ${name}`).join('\n')}\n\n` +
                `## Performance Comparison\n` +
                `${this.formatComparisonTable(comparison)}\n\n` +
                `## Key Insights\n` +
                `${comparison.insights.map(insight => `- ${insight}`).join('\n')}\n\n` +
                `## Recommendations\n` +
                `${comparison.recommendations.map(rec => `- ${rec}`).join('\n')}`
        }
      ]
    };
  }

  async listLambdaFunctions(args) {
    const { runtime, includeMetrics = false } = args;
    
    const functions = await this.lambdaAnalyzer.listFunctions(runtime, includeMetrics);

    return {
      content: [
        {
          type: 'text',
          text: `# Lambda Functions\n\n` +
                `## Summary\n` +
                `- **Total Functions**: ${functions.length}\n` +
                `- **Runtimes**: ${[...new Set(functions.map(f => f.runtime))].join(', ')}\n\n` +
                `## Functions List\n` +
                `${functions.map(func => 
                  `### ${func.name}\n` +
                  `- **Runtime**: ${func.runtime}\n` +
                  `- **Memory**: ${func.memory}MB\n` +
                  `- **Timeout**: ${func.timeout}s\n` +
                  `- **Last Modified**: ${func.lastModified}\n` +
                  `${includeMetrics ? 
                    `- **Avg Duration**: ${func.metrics?.avgDuration || 'N/A'}ms\n` +
                    `- **Cold Start Rate**: ${func.metrics?.coldStartRate || 'N/A'}%\n` +
                    `- **Error Rate**: ${func.metrics?.errorRate || 'N/A'}%\n` : ''}\n`
                ).join('')}`
        }
      ]
    };
  }

  async analyzeMemoryUtilization(args) {
    const { functionName, timeRange = '24h' } = args;
    
    const memoryAnalysis = await this.lambdaAnalyzer.analyzeMemoryUtilization(
      functionName, 
      timeRange
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Memory Utilization Analysis: ${functionName}\n\n` +
                `## Current Configuration\n` +
                `- **Allocated Memory**: ${memoryAnalysis.allocated}MB\n` +
                `- **Average Used**: ${memoryAnalysis.avgUsed}MB (${memoryAnalysis.utilizationPercent}%)\n` +
                `- **Peak Usage**: ${memoryAnalysis.peakUsed}MB\n` +
                `- **Minimum Usage**: ${memoryAnalysis.minUsed}MB\n\n` +
                `## Right-sizing Recommendation\n` +
                `- **Recommended Memory**: ${memoryAnalysis.recommended}MB\n` +
                `- **Reasoning**: ${memoryAnalysis.reasoning}\n` +
                `- **Expected Performance Impact**: ${memoryAnalysis.performanceImpact}\n` +
                `- **Cost Impact**: ${memoryAnalysis.costImpact}\n\n` +
                `## Memory Usage Patterns\n` +
                `${memoryAnalysis.patterns.map(pattern => `- ${pattern}`).join('\n')}`
        }
      ]
    };
  }

  async getCostAnalysis(args) {
    const { functionName, timeRange = '30d' } = args;
    
    const costAnalysis = await this.lambdaAnalyzer.analyzeCosts(
      functionName, 
      timeRange
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Cost Analysis${functionName ? `: ${functionName}` : ' (Account-wide)'}\n\n` +
                `## Cost Breakdown\n` +
                `- **Total Cost**: $${costAnalysis.total}\n` +
                `- **Compute Cost**: $${costAnalysis.compute} (${costAnalysis.computePercent}%)\n` +
                `- **Request Cost**: $${costAnalysis.requests} (${costAnalysis.requestsPercent}%)\n` +
                `- **Data Transfer**: $${costAnalysis.dataTransfer}\n\n` +
                `## Usage Statistics\n` +
                `- **Total Invocations**: ${costAnalysis.invocations.toLocaleString()}\n` +
                `- **Total Duration**: ${costAnalysis.totalDuration}ms\n` +
                `- **Average Duration**: ${costAnalysis.avgDuration}ms\n\n` +
                `## Cost Optimization Opportunities\n` +
                `${costAnalysis.optimizations.map(opt => 
                  `- **${opt.type}**: ${opt.description} (Potential savings: $${opt.savings})`
                ).join('\n')}\n\n` +
                `## Trends\n` +
                `- **Daily Average**: $${costAnalysis.dailyAverage}\n` +
                `- **Trend**: ${costAnalysis.trend}\n` +
                `- **Peak Day**: ${costAnalysis.peakDay} ($${costAnalysis.peakCost})`
        }
      ]
    };
  }

  async monitorRealTimePerformance(args) {
    const { functionName, duration = 5 } = args;
    
    const monitoring = await this.lambdaAnalyzer.monitorRealTime(
      functionName, 
      duration
    );

    return {
      content: [
        {
          type: 'text',
          text: `# Real-time Performance Monitoring: ${functionName}\n\n` +
                `## Live Metrics (Last ${duration} minutes)\n` +
                `- **Active Invocations**: ${monitoring.activeInvocations}\n` +
                `- **Recent Invocations**: ${monitoring.recentInvocations}\n` +
                `- **Average Duration**: ${monitoring.avgDuration}ms\n` +
                `- **Error Rate**: ${monitoring.errorRate}%\n` +
                `- **Cold Starts**: ${monitoring.coldStarts}\n\n` +
                `## Performance Alerts\n` +
                `${monitoring.alerts.length > 0 ? 
                  monitoring.alerts.map(alert => `${alert}`).join('\n') : 
                  'No performance issues detected'}\n\n` +
                `## Recent Activity\n` +
                `${monitoring.recentActivity.map(activity => 
                  `- ${activity.timestamp}: ${activity.event} (${activity.duration}ms)`
                ).join('\n')}`
        }
      ]
    };
  }

  formatDetailedMetrics(details) {
    return `## Detailed Metrics\n` +
           `### Error Analysis\n` +
           `${details.errors.map(error => `- ${error.type}: ${error.count} occurrences`).join('\n')}\n\n` +
           `### Performance Trends\n` +
           `${details.trends.map(trend => `- ${trend}`).join('\n')}\n\n`;
  }

  formatColdStartTimeline(timeline) {
    return timeline.map(entry => 
      `- ${entry.time}: ${entry.coldStarts} cold starts (${entry.duration}ms avg)`
    ).join('\n');
  }

  formatComparisonTable(comparison) {
    const headers = ['Function', ...comparison.metrics];
    const rows = comparison.functions.map(func => [
      func.name,
      ...comparison.metrics.map(metric => func.values[metric])
    ]);

    return `| ${headers.join(' | ')} |\n` +
           `| ${headers.map(() => '---').join(' | ')} |\n` +
           rows.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lambda Performance MCP Server running on stdio');
  }
}

const server = new LambdaPerformanceMCPServer();
server.run().catch(console.error);