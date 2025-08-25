import { LambdaClient, ListFunctionsCommand, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { CloudWatchClient, GetMetricStatisticsCommand, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';

export class LambdaAnalyzer {
  constructor() {
    this.lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
    this.cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
    this.logsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
  }

  async analyzeFunction(functionName, timeRange, includeDetails) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeMs);

    // Get function configuration
    const functionConfig = await this.getFunctionConfig(functionName);
    
    // Get CloudWatch metrics
    const metrics = await this.getMetrics(functionName, startTime, endTime);
    
    // Analyze cold starts from logs
    const coldStartAnalysis = await this.analyzeColdStartsFromLogs(functionName, startTime, endTime);
    
    // Calculate performance statistics
    const analysis = {
      functionName,
      timeRange,
      totalInvocations: metrics.invocations || 0,
      avgDuration: metrics.avgDuration || 0,
      p50Duration: metrics.p50Duration || 0,
      p95Duration: metrics.p95Duration || 0,
      p99Duration: metrics.p99Duration || 0,
      maxDuration: metrics.maxDuration || 0,
      errorRate: this.calculateErrorRate(metrics.errors, metrics.invocations),
      coldStartRate: this.calculateColdStartRate(coldStartAnalysis.total, metrics.invocations),
      memoryUtilization: await this.calculateMemoryUtilization(functionName, startTime, endTime),
      coldStarts: {
        total: coldStartAnalysis.total,
        avgDuration: coldStartAnalysis.avgDuration,
        pattern: coldStartAnalysis.pattern
      },
      config: functionConfig
    };

    if (includeDetails) {
      analysis.details = {
        errors: await this.analyzeErrors(functionName, startTime, endTime),
        trends: await this.analyzeTrends(functionName, startTime, endTime),
        memoryUsage: await this.getMemoryUsageDetails(functionName, startTime, endTime)
      };
    }

    return analysis;
  }

  async trackColdStarts(functionName, timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeMs);

    // Get cold start data from CloudWatch Logs
    const logGroupName = `/aws/lambda/${functionName}`;
    
    try {
      const coldStartEvents = await this.getColdStartEvents(logGroupName, startTime, endTime);
      const totalInvocations = await this.getTotalInvocations(functionName, startTime, endTime);
      
      const analysis = this.analyzeColdStartPatterns(coldStartEvents, totalInvocations);
      
      return {
        total: coldStartEvents.length,
        rate: this.calculateColdStartRate(coldStartEvents.length, totalInvocations),
        avgDuration: analysis.avgDuration,
        maxDuration: analysis.maxDuration,
        peakHours: analysis.peakHours,
        frequency: analysis.frequency,
        triggers: analysis.triggers,
        recommendations: this.generateColdStartRecommendations(analysis),
        timeline: this.createColdStartTimeline(coldStartEvents, timeRange)
      };
    } catch (error) {
      console.error('Error tracking cold starts:', error);
      return {
        total: 0,
        rate: 0,
        avgDuration: 0,
        maxDuration: 0,
        peakHours: [],
        frequency: 'Unknown',
        triggers: [],
        recommendations: ['Unable to analyze cold starts - check CloudWatch Logs permissions'],
        timeline: []
      };
    }
  }

  async compareFunctions(functionNames, timeRange, metrics) {
    const comparisons = [];
    
    for (const functionName of functionNames) {
      const analysis = await this.analyzeFunction(functionName, timeRange, false);
      comparisons.push({
        name: functionName,
        values: {
          duration: analysis.avgDuration,
          'cold-starts': analysis.coldStartRate,
          errors: analysis.errorRate,
          invocations: analysis.totalInvocations,
          cost: await this.estimateCost(analysis)
        }
      });
    }

    const insights = this.generateComparisonInsights(comparisons);
    const recommendations = this.generateComparisonRecommendations(comparisons);

    return {
      functions: comparisons,
      metrics,
      insights,
      recommendations
    };
  }

  async listFunctions(runtime, includeMetrics) {
    const command = new ListFunctionsCommand({});
    const response = await this.lambdaClient.send(command);
    
    let functions = response.Functions || [];
    
    if (runtime) {
      functions = functions.filter(func => func.Runtime === runtime);
    }

    const result = [];
    for (const func of functions) {
      const functionInfo = {
        name: func.FunctionName,
        runtime: func.Runtime,
        memory: func.MemorySize,
        timeout: func.Timeout,
        lastModified: func.LastModified
      };

      if (includeMetrics) {
        try {
          const quickAnalysis = await this.analyzeFunction(func.FunctionName, '24h', false);
          functionInfo.metrics = {
            avgDuration: quickAnalysis.avgDuration,
            coldStartRate: quickAnalysis.coldStartRate,
            errorRate: quickAnalysis.errorRate
          };
        } catch (error) {
          functionInfo.metrics = null;
        }
      }

      result.push(functionInfo);
    }

    return result;
  }

  async analyzeMemoryUtilization(functionName, timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeMs);

    // Get function configuration
    const config = await this.getFunctionConfig(functionName);
    const allocatedMemory = config.MemorySize;

    // Get memory usage from logs
    const memoryUsage = await this.getMemoryUsageFromLogs(functionName, startTime, endTime);
    
    const avgUsed = memoryUsage.reduce((sum, usage) => sum + usage, 0) / memoryUsage.length || 0;
    const peakUsed = Math.max(...memoryUsage, 0);
    const minUsed = Math.min(...memoryUsage, allocatedMemory);
    const utilizationPercent = Math.round((avgUsed / allocatedMemory) * 100);

    // Generate recommendation
    const recommendation = this.generateMemoryRecommendation(
      allocatedMemory, 
      avgUsed, 
      peakUsed, 
      utilizationPercent
    );

    return {
      allocated: allocatedMemory,
      avgUsed: Math.round(avgUsed),
      peakUsed: Math.round(peakUsed),
      minUsed: Math.round(minUsed),
      utilizationPercent,
      recommended: recommendation.memory,
      reasoning: recommendation.reasoning,
      performanceImpact: recommendation.performanceImpact,
      costImpact: recommendation.costImpact,
      patterns: this.analyzeMemoryPatterns(memoryUsage)
    };
  }

  async analyzeCosts(functionName, timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeMs);

    if (functionName) {
      return await this.analyzeFunctionCosts(functionName, startTime, endTime, timeRange);
    } else {
      return await this.analyzeAccountCosts(startTime, endTime, timeRange);
    }
  }

  async monitorRealTime(functionName, duration) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (duration * 60 * 1000));

    // Get recent metrics
    const metrics = await this.getMetrics(functionName, startTime, endTime);
    
    // Get recent log events
    const recentActivity = await this.getRecentActivity(functionName, startTime, endTime);
    
    // Check for alerts
    const alerts = await this.checkPerformanceAlerts(functionName, metrics);

    return {
      activeInvocations: metrics.concurrentExecutions || 0,
      recentInvocations: metrics.invocations || 0,
      avgDuration: metrics.avgDuration || 0,
      errorRate: this.calculateErrorRate(metrics.errors, metrics.invocations),
      coldStarts: await this.getRecentColdStarts(functionName, startTime, endTime),
      alerts,
      recentActivity
    };
  }

  // Helper methods
  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange] || ranges['24h'];
  }

  async getFunctionConfig(functionName) {
    const command = new GetFunctionCommand({ FunctionName: functionName });
    const response = await this.lambdaClient.send(command);
    return response.Configuration;
  }

  async getMetrics(functionName, startTime, endTime) {
    const metrics = {};
    
    // Get invocation count
    metrics.invocations = await this.getMetricValue(
      'AWS/Lambda', 'Invocations', 'Sum', functionName, startTime, endTime
    );
    
    // Get duration metrics
    metrics.avgDuration = await this.getMetricValue(
      'AWS/Lambda', 'Duration', 'Average', functionName, startTime, endTime
    );
    
    metrics.maxDuration = await this.getMetricValue(
      'AWS/Lambda', 'Duration', 'Maximum', functionName, startTime, endTime
    );
    
    // Get error count
    metrics.errors = await this.getMetricValue(
      'AWS/Lambda', 'Errors', 'Sum', functionName, startTime, endTime
    );
    
    // Get concurrent executions
    metrics.concurrentExecutions = await this.getMetricValue(
      'AWS/Lambda', 'ConcurrentExecutions', 'Maximum', functionName, startTime, endTime
    );

    return metrics;
  }

  async getMetricValue(namespace, metricName, statistic, functionName, startTime, endTime) {
    try {
      const command = new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        Dimensions: [
          {
            Name: 'FunctionName',
            Value: functionName
          }
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300, // 5 minutes
        Statistics: [statistic]
      });

      const response = await this.cloudWatchClient.send(command);
      const datapoints = response.Datapoints || [];
      
      if (datapoints.length === 0) return 0;
      
      return datapoints.reduce((sum, point) => sum + (point[statistic] || 0), 0) / datapoints.length;
    } catch (error) {
      console.error(`Error getting metric ${metricName}:`, error);
      return 0;
    }
  }

  calculateErrorRate(errors, invocations) {
    if (!invocations || invocations === 0) return 0;
    return Math.round((errors / invocations) * 100 * 100) / 100;
  }

  calculateColdStartRate(coldStarts, invocations) {
    if (!invocations || invocations === 0) return 0;
    return Math.round((coldStarts / invocations) * 100 * 100) / 100;
  }

  async getColdStartEvents(logGroupName, startTime, endTime) {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        filterPattern: '"INIT_START"'
      });

      const response = await this.logsClient.send(command);
      return response.events || [];
    } catch (error) {
      console.error('Error getting cold start events:', error);
      return [];
    }
  }

  async getTotalInvocations(functionName, startTime, endTime) {
    return await this.getMetricValue(
      'AWS/Lambda', 'Invocations', 'Sum', functionName, startTime, endTime
    );
  }

  analyzeColdStartPatterns(coldStartEvents, totalInvocations) {
    if (coldStartEvents.length === 0) {
      return {
        avgDuration: 0,
        maxDuration: 0,
        peakHours: [],
        frequency: 'None',
        triggers: []
      };
    }

    // Analyze durations (simplified - would need more complex log parsing)
    const avgDuration = 1000; // Placeholder
    const maxDuration = 2000; // Placeholder
    
    // Analyze timing patterns
    const hours = coldStartEvents.map(event => new Date(event.timestamp).getHours());
    const peakHours = this.findPeakHours(hours);
    
    const frequency = this.determineColdStartFrequency(coldStartEvents.length, totalInvocations);
    const triggers = ['Low traffic periods', 'Function updates', 'Scaling events'];

    return {
      avgDuration,
      maxDuration,
      peakHours,
      frequency,
      triggers
    };
  }

  findPeakHours(hours) {
    const hourCounts = {};
    hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const sortedHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
    
    return sortedHours;
  }

  determineColdStartFrequency(coldStarts, invocations) {
    const rate = coldStarts / invocations;
    if (rate > 0.5) return 'Very High';
    if (rate > 0.2) return 'High';
    if (rate > 0.1) return 'Moderate';
    if (rate > 0.05) return 'Low';
    return 'Very Low';
  }

  generateColdStartRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.frequency === 'High' || analysis.frequency === 'Very High') {
      recommendations.push('Consider using Provisioned Concurrency to reduce cold starts');
      recommendations.push('Optimize function initialization code');
      recommendations.push('Use connection pooling for database connections');
    }
    
    if (analysis.avgDuration > 1000) {
      recommendations.push('Reduce package size and dependencies');
      recommendations.push('Use Lambda layers for shared dependencies');
    }
    
    recommendations.push('Consider using ARM-based Graviton2 processors for better price-performance');
    
    return recommendations;
  }

  createColdStartTimeline(coldStartEvents, timeRange) {
    // Group events by time periods
    const timeline = [];
    const periodMs = this.parseTimeRange(timeRange) / 24; // 24 periods
    
    for (let i = 0; i < 24; i++) {
      const periodStart = new Date(Date.now() - this.parseTimeRange(timeRange) + (i * periodMs));
      const periodEnd = new Date(periodStart.getTime() + periodMs);
      
      const periodEvents = coldStartEvents.filter(event => 
        event.timestamp >= periodStart.getTime() && event.timestamp < periodEnd.getTime()
      );
      
      timeline.push({
        time: periodStart.toLocaleTimeString(),
        coldStarts: periodEvents.length,
        duration: 1000 // Placeholder average
      });
    }
    
    return timeline;
  }

  generateMemoryRecommendation(allocated, avgUsed, peakUsed, utilizationPercent) {
    let recommendedMemory = allocated;
    let reasoning = '';
    let performanceImpact = 'No change expected';
    let costImpact = 'No change';

    if (utilizationPercent < 50) {
      // Over-provisioned
      recommendedMemory = Math.max(128, Math.ceil(peakUsed * 1.2 / 64) * 64);
      reasoning = 'Memory is over-provisioned. Reducing memory will lower costs.';
      costImpact = `Reduce costs by ~${Math.round((1 - recommendedMemory/allocated) * 100)}%`;
      performanceImpact = 'Minimal performance impact expected';
    } else if (utilizationPercent > 85) {
      // Under-provisioned
      recommendedMemory = Math.ceil(peakUsed * 1.3 / 64) * 64;
      reasoning = 'Memory utilization is high. Increasing memory may improve performance.';
      costImpact = `Increase costs by ~${Math.round((recommendedMemory/allocated - 1) * 100)}%`;
      performanceImpact = 'Improved performance and reduced duration expected';
    } else {
      reasoning = 'Memory allocation appears optimal for current usage patterns.';
    }

    return {
      memory: recommendedMemory,
      reasoning,
      performanceImpact,
      costImpact
    };
  }

  analyzeMemoryPatterns(memoryUsage) {
    if (memoryUsage.length === 0) return ['No memory usage data available'];
    
    const patterns = [];
    const variance = this.calculateVariance(memoryUsage);
    
    if (variance < 100) {
      patterns.push('Consistent memory usage pattern');
    } else {
      patterns.push('Variable memory usage - consider workload optimization');
    }
    
    const trend = this.calculateTrend(memoryUsage);
    if (trend > 0.1) {
      patterns.push('Increasing memory usage trend detected');
    } else if (trend < -0.1) {
      patterns.push('Decreasing memory usage trend detected');
    }
    
    return patterns;
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstAvg;
  }

  // Additional helper methods would be implemented here...
  async calculateMemoryUtilization(functionName, startTime, endTime) {
    // Placeholder implementation
    return Math.floor(Math.random() * 40) + 40; // 40-80%
  }

  async analyzeErrors(functionName, startTime, endTime) {
    // Placeholder implementation
    return [
      { type: 'Timeout', count: 5 },
      { type: 'Memory exceeded', count: 2 }
    ];
  }

  async analyzeTrends(functionName, startTime, endTime) {
    // Placeholder implementation
    return [
      'Duration trending upward over time period',
      'Error rate stable',
      'Cold start frequency decreasing'
    ];
  }

  async getMemoryUsageDetails(functionName, startTime, endTime) {
    // Placeholder implementation
    return { peak: 256, average: 180, minimum: 120 };
  }

  async getMemoryUsageFromLogs(functionName, startTime, endTime) {
    // Placeholder implementation - would parse CloudWatch logs for memory usage
    return Array.from({ length: 100 }, () => Math.floor(Math.random() * 200) + 100);
  }

  generateComparisonInsights(comparisons) {
    const insights = [];
    
    // Find best and worst performers
    const bestDuration = comparisons.reduce((best, current) => 
      current.values.duration < best.values.duration ? current : best
    );
    
    const worstColdStart = comparisons.reduce((worst, current) => 
      current.values['cold-starts'] > worst.values['cold-starts'] ? current : worst
    );
    
    insights.push(`${bestDuration.name} has the best average duration (${bestDuration.values.duration}ms)`);
    insights.push(`${worstColdStart.name} has the highest cold start rate (${worstColdStart.values['cold-starts']}%)`);
    
    return insights;
  }

  generateComparisonRecommendations(comparisons) {
    const recommendations = [];
    
    // Find functions with high cold start rates
    const highColdStart = comparisons.filter(func => func.values['cold-starts'] > 10);
    if (highColdStart.length > 0) {
      recommendations.push(`Consider optimizing cold start performance for: ${highColdStart.map(f => f.name).join(', ')}`);
    }
    
    // Find functions with high error rates
    const highError = comparisons.filter(func => func.values.errors > 1);
    if (highError.length > 0) {
      recommendations.push(`Review error handling for: ${highError.map(f => f.name).join(', ')}`);
    }
    
    return recommendations;
  }

  async estimateCost(analysis) {
    // Simplified cost calculation
    const requestCost = (analysis.totalInvocations / 1000000) * 0.20; // $0.20 per 1M requests
    const computeCost = (analysis.totalInvocations * analysis.avgDuration / 1000) * (analysis.config.MemorySize / 1024) * 0.0000166667;
    return Math.round((requestCost + computeCost) * 100) / 100;
  }

  async analyzeFunctionCosts(functionName, startTime, endTime, timeRange) {
    // Placeholder implementation
    return {
      total: 12.45,
      compute: 10.20,
      requests: 2.25,
      dataTransfer: 0.00,
      computePercent: 82,
      requestsPercent: 18,
      invocations: 150000,
      totalDuration: 45000000,
      avgDuration: 300,
      optimizations: [
        { type: 'Memory optimization', description: 'Reduce memory allocation', savings: 2.50 },
        { type: 'Duration optimization', description: 'Optimize code performance', savings: 1.80 }
      ],
      dailyAverage: 0.41,
      trend: 'Stable',
      peakDay: '2024-01-15',
      peakCost: 0.89
    };
  }

  async analyzeAccountCosts(startTime, endTime, timeRange) {
    // Placeholder implementation for account-wide analysis
    return {
      total: 245.67,
      compute: 198.45,
      requests: 47.22,
      dataTransfer: 0.00,
      computePercent: 81,
      requestsPercent: 19,
      invocations: 2500000,
      totalDuration: 750000000,
      avgDuration: 300,
      optimizations: [
        { type: 'Right-sizing', description: 'Optimize memory across functions', savings: 45.20 },
        { type: 'Cold start reduction', description: 'Implement provisioned concurrency', savings: 23.10 }
      ],
      dailyAverage: 8.19,
      trend: 'Increasing',
      peakDay: '2024-01-20',
      peakCost: 12.45
    };
  }

  async getRecentActivity(functionName, startTime, endTime) {
    // Placeholder implementation
    return [
      { timestamp: '10:30:15', event: 'Invocation', duration: 245 },
      { timestamp: '10:29:45', event: 'Cold Start', duration: 1200 },
      { timestamp: '10:28:30', event: 'Invocation', duration: 180 }
    ];
  }

  async checkPerformanceAlerts(functionName, metrics) {
    const alerts = [];
    
    if (metrics.avgDuration > 5000) {
      alerts.push('High average duration detected (>5s)');
    }
    
    if (this.calculateErrorRate(metrics.errors, metrics.invocations) > 5) {
      alerts.push('High error rate detected (>5%)');
    }
    
    if (metrics.concurrentExecutions > 900) {
      alerts.push('Approaching concurrency limit');
    }
    
    return alerts;
  }

  async getRecentColdStarts(functionName, startTime, endTime) {
    // Placeholder implementation
    return 3;
  }
}