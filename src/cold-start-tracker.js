import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';

export class ColdStartTracker {
  constructor() {
    this.logsClient = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
    this.coldStartPatterns = {
      initStart: /INIT_START/,
      initDuration: /INIT_DURATION: ([\d.]+) ms/,
      initEnd: /INIT_END/,
      report: /REPORT RequestId: ([\w-]+)\s+Duration: ([\d.]+) ms\s+Billed Duration: ([\d.]+) ms\s+Memory Size: (\d+) MB\s+Max Memory Used: (\d+) MB/
    };
  }

  async trackColdStarts(functionName, timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRangeMs);
    
    const logGroupName = `/aws/lambda/${functionName}`;
    
    try {
      // Get cold start events
      const coldStartEvents = await this.getColdStartEvents(logGroupName, startTime, endTime);
      
      // Get all invocation events for comparison
      const allInvocations = await this.getAllInvocations(logGroupName, startTime, endTime);
      
      // Analyze patterns
      const analysis = this.analyzeColdStartPatterns(coldStartEvents, allInvocations, timeRange);
      
      return {
        total: coldStartEvents.length,
        rate: this.calculateColdStartRate(coldStartEvents.length, allInvocations.length),
        avgDuration: analysis.avgDuration,
        maxDuration: analysis.maxDuration,
        minDuration: analysis.minDuration,
        peakHours: analysis.peakHours,
        frequency: analysis.frequency,
        triggers: analysis.triggers,
        recommendations: this.generateRecommendations(analysis),
        timeline: this.createTimeline(coldStartEvents, timeRange),
        patterns: analysis.patterns,
        statistics: analysis.statistics
      };
    } catch (error) {
      console.error('Error tracking cold starts:', error);
      return this.getEmptyResult();
    }
  }

  async getColdStartEvents(logGroupName, startTime, endTime) {
    const coldStartEvents = [];
    let nextToken = null;
    
    do {
      try {
        const command = new FilterLogEventsCommand({
          logGroupName,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
          filterPattern: '"INIT_START"',
          nextToken
        });
        
        const response = await this.logsClient.send(command);
        
        if (response.events) {
          // Process each cold start event
          for (const event of response.events) {
            const coldStartData = await this.extractColdStartData(event, logGroupName);
            if (coldStartData) {
              coldStartEvents.push(coldStartData);
            }
          }
        }
        
        nextToken = response.nextToken;
      } catch (error) {
        console.error('Error fetching cold start events:', error);
        break;
      }
    } while (nextToken);
    
    return coldStartEvents;
  }

  async extractColdStartData(initEvent, logGroupName) {
    try {
      const requestId = this.extractRequestId(initEvent.message);
      if (!requestId) return null;
      
      // Get related events for this request
      const relatedEvents = await this.getRelatedEvents(logGroupName, requestId, initEvent.timestamp);
      
      const coldStartData = {
        requestId,
        timestamp: initEvent.timestamp,
        logStream: initEvent.logStreamName,
        initDuration: null,
        totalDuration: null,
        memoryUsed: null,
        memoryAllocated: null,
        billedDuration: null,
        events: [initEvent]
      };
      
      // Process related events
      relatedEvents.forEach(event => {
        coldStartData.events.push(event);
        
        // Extract INIT_DURATION
        const initDurationMatch = event.message.match(this.coldStartPatterns.initDuration);
        if (initDurationMatch) {
          coldStartData.initDuration = parseFloat(initDurationMatch[1]);
        }
        
        // Extract REPORT data
        const reportMatch = event.message.match(this.coldStartPatterns.report);
        if (reportMatch) {
          coldStartData.totalDuration = parseFloat(reportMatch[2]);
          coldStartData.billedDuration = parseFloat(reportMatch[3]);
          coldStartData.memoryAllocated = parseInt(reportMatch[4]);
          coldStartData.memoryUsed = parseInt(reportMatch[5]);
        }
      });
      
      return coldStartData;
    } catch (error) {
      console.error('Error extracting cold start data:', error);
      return null;
    }
  }

  async getRelatedEvents(logGroupName, requestId, timestamp) {
    try {
      // Search for events within a 30-second window after the INIT_START
      const endTime = timestamp + 30000;
      
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime: timestamp,
        endTime: endTime,
        filterPattern: `"${requestId}"`
      });
      
      const response = await this.logsClient.send(command);
      return response.events || [];
    } catch (error) {
      console.error('Error getting related events:', error);
      return [];
    }
  }

  async getAllInvocations(logGroupName, startTime, endTime) {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        filterPattern: '"START RequestId"'
      });
      
      const response = await this.logsClient.send(command);
      return response.events || [];
    } catch (error) {
      console.error('Error getting all invocations:', error);
      return [];
    }
  }

  analyzeColdStartPatterns(coldStartEvents, allInvocations, timeRange) {
    if (coldStartEvents.length === 0) {
      return this.getEmptyAnalysis();
    }
    
    // Calculate duration statistics
    const durations = coldStartEvents
      .map(event => event.initDuration)
      .filter(duration => duration !== null);
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    
    // Analyze timing patterns
    const hourlyDistribution = this.analyzeHourlyDistribution(coldStartEvents);
    const peakHours = this.findPeakHours(hourlyDistribution);
    
    // Determine frequency pattern
    const frequency = this.determineColdStartFrequency(coldStartEvents, allInvocations, timeRange);
    
    // Identify triggers
    const triggers = this.identifyTriggers(coldStartEvents, allInvocations);
    
    // Analyze patterns
    const patterns = this.identifyPatterns(coldStartEvents, timeRange);
    
    // Generate statistics
    const statistics = this.generateStatistics(coldStartEvents, durations);
    
    return {
      avgDuration: Math.round(avgDuration),
      maxDuration: Math.round(maxDuration),
      minDuration: Math.round(minDuration),
      peakHours,
      frequency,
      triggers,
      patterns,
      statistics,
      hourlyDistribution
    };
  }

  analyzeHourlyDistribution(coldStartEvents) {
    const distribution = Array(24).fill(0);
    
    coldStartEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      distribution[hour]++;
    });
    
    return distribution;
  }

  findPeakHours(hourlyDistribution) {
    const hoursWithCounts = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return hoursWithCounts.map(item => `${item.hour.toString().padStart(2, '0')}:00`);
  }

  determineColdStartFrequency(coldStartEvents, allInvocations, timeRange) {
    const coldStartRate = this.calculateColdStartRate(coldStartEvents.length, allInvocations.length);
    
    if (coldStartRate > 50) return 'Very High (>50%)';
    if (coldStartRate > 25) return 'High (25-50%)';
    if (coldStartRate > 10) return 'Moderate (10-25%)';
    if (coldStartRate > 5) return 'Low (5-10%)';
    return 'Very Low (<5%)';
  }

  identifyTriggers(coldStartEvents, allInvocations) {
    const triggers = [];
    
    // Analyze time gaps between invocations
    const invocationTimes = allInvocations.map(inv => inv.timestamp).sort();
    const gaps = [];
    
    for (let i = 1; i < invocationTimes.length; i++) {
      gaps.push(invocationTimes[i] - invocationTimes[i-1]);
    }
    
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    
    if (avgGap > 15 * 60 * 1000) { // 15 minutes
      triggers.push('Long idle periods (>15 minutes)');
    }
    
    if (avgGap > 5 * 60 * 1000) { // 5 minutes
      triggers.push('Moderate idle periods (5-15 minutes)');
    }
    
    // Check for deployment-related cold starts
    const deploymentPattern = this.checkDeploymentPattern(coldStartEvents);
    if (deploymentPattern) {
      triggers.push('Function deployments/updates');
    }
    
    // Check for scaling events
    const scalingPattern = this.checkScalingPattern(coldStartEvents);
    if (scalingPattern) {
      triggers.push('Auto-scaling events');
    }
    
    return triggers.length > 0 ? triggers : ['Normal Lambda lifecycle'];
  }

  identifyPatterns(coldStartEvents, timeRange) {
    const patterns = [];
    
    // Check for time-based patterns
    const timePattern = this.analyzeTimePatterns(coldStartEvents);
    if (timePattern) {
      patterns.push(timePattern);
    }
    
    // Check for duration patterns
    const durationPattern = this.analyzeDurationPatterns(coldStartEvents);
    if (durationPattern) {
      patterns.push(durationPattern);
    }
    
    // Check for memory patterns
    const memoryPattern = this.analyzeMemoryPatterns(coldStartEvents);
    if (memoryPattern) {
      patterns.push(memoryPattern);
    }
    
    return patterns;
  }

  generateStatistics(coldStartEvents, durations) {
    if (durations.length === 0) {
      return {
        count: 0,
        percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
        distribution: {}
      };
    }
    
    const sortedDurations = [...durations].sort((a, b) => a - b);
    
    const percentiles = {
      p50: this.calculatePercentile(sortedDurations, 50),
      p90: this.calculatePercentile(sortedDurations, 90),
      p95: this.calculatePercentile(sortedDurations, 95),
      p99: this.calculatePercentile(sortedDurations, 99)
    };
    
    // Duration distribution
    const distribution = this.createDurationDistribution(durations);
    
    return {
      count: coldStartEvents.length,
      percentiles,
      distribution
    };
  }

  createTimeline(coldStartEvents, timeRange) {
    const periods = this.getTimelinePeriods(timeRange);
    const timeline = [];
    
    periods.forEach(period => {
      const periodEvents = coldStartEvents.filter(event => 
        event.timestamp >= period.start && event.timestamp < period.end
      );
      
      const avgDuration = periodEvents.length > 0
        ? periodEvents.reduce((sum, event) => sum + (event.initDuration || 0), 0) / periodEvents.length
        : 0;
      
      timeline.push({
        time: new Date(period.start).toLocaleTimeString(),
        coldStarts: periodEvents.length,
        duration: Math.round(avgDuration)
      });
    });
    
    return timeline;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    // High cold start rate recommendations
    if (analysis.frequency.includes('High') || analysis.frequency.includes('Very High')) {
      recommendations.push('Consider implementing Provisioned Concurrency to reduce cold starts');
      recommendations.push('Optimize function initialization code to reduce cold start duration');
    }
    
    // High duration recommendations
    if (analysis.avgDuration > 2000) {
      recommendations.push('Reduce deployment package size by removing unused dependencies');
      recommendations.push('Use Lambda layers for shared libraries and dependencies');
      recommendations.push('Optimize initialization code - move heavy operations outside the handler');
    }
    
    // Pattern-based recommendations
    if (analysis.peakHours.length > 0) {
      recommendations.push(`Consider scheduled provisioned concurrency during peak hours: ${analysis.peakHours.join(', ')}`);
    }
    
    // Trigger-based recommendations
    if (analysis.triggers.includes('Long idle periods')) {
      recommendations.push('Implement keep-warm strategies or use EventBridge scheduled events');
    }
    
    // Runtime-specific recommendations
    recommendations.push('Consider using ARM-based Graviton2 processors for better price-performance');
    recommendations.push('Ensure you\'re using the latest runtime version for optimal performance');
    
    return recommendations;
  }

  // Helper methods
  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange] || ranges['24h'];
  }

  calculateColdStartRate(coldStarts, totalInvocations) {
    if (totalInvocations === 0) return 0;
    return Math.round((coldStarts / totalInvocations) * 100 * 100) / 100;
  }

  extractRequestId(message) {
    const match = message.match(/RequestId: ([\w-]+)/);
    return match ? match[1] : null;
  }

  calculatePercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return Math.round(sortedArray[Math.max(0, index)]);
  }

  createDurationDistribution(durations) {
    const buckets = {
      '0-500ms': 0,
      '500-1000ms': 0,
      '1000-2000ms': 0,
      '2000-5000ms': 0,
      '5000ms+': 0
    };
    
    durations.forEach(duration => {
      if (duration <= 500) buckets['0-500ms']++;
      else if (duration <= 1000) buckets['500-1000ms']++;
      else if (duration <= 2000) buckets['1000-2000ms']++;
      else if (duration <= 5000) buckets['2000-5000ms']++;
      else buckets['5000ms+']++;
    });
    
    return buckets;
  }

  getTimelinePeriods(timeRange) {
    const now = Date.now();
    const rangeMs = this.parseTimeRange(timeRange);
    const start = now - rangeMs;
    
    const periodCount = 24; // 24 periods regardless of time range
    const periodDuration = rangeMs / periodCount;
    
    const periods = [];
    for (let i = 0; i < periodCount; i++) {
      periods.push({
        start: start + (i * periodDuration),
        end: start + ((i + 1) * periodDuration)
      });
    }
    
    return periods;
  }

  checkDeploymentPattern(coldStartEvents) {
    // Check if cold starts cluster around similar times (indicating deployments)
    if (coldStartEvents.length < 3) return false;
    
    const timestamps = coldStartEvents.map(event => event.timestamp).sort();
    let clusters = 0;
    
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i-1] < 60000) { // Within 1 minute
        clusters++;
      }
    }
    
    return clusters > timestamps.length * 0.3; // 30% of events are clustered
  }

  checkScalingPattern(coldStartEvents) {
    // Simplified scaling pattern detection
    return coldStartEvents.length > 10; // Assume scaling if many cold starts
  }

  analyzeTimePatterns(coldStartEvents) {
    const hours = coldStartEvents.map(event => new Date(event.timestamp).getHours());
    const uniqueHours = [...new Set(hours)];
    
    if (uniqueHours.length <= 3) {
      return `Cold starts concentrated in ${uniqueHours.length} hour(s): ${uniqueHours.join(', ')}`;
    }
    
    return null;
  }

  analyzeDurationPatterns(coldStartEvents) {
    const durations = coldStartEvents
      .map(event => event.initDuration)
      .filter(duration => duration !== null);
    
    if (durations.length === 0) return null;
    
    const variance = this.calculateVariance(durations);
    
    if (variance < 100) {
      return 'Consistent cold start durations';
    } else if (variance > 1000) {
      return 'Highly variable cold start durations - investigate initialization code';
    }
    
    return 'Moderate variation in cold start durations';
  }

  analyzeMemoryPatterns(coldStartEvents) {
    const memoryUsages = coldStartEvents
      .map(event => event.memoryUsed)
      .filter(memory => memory !== null);
    
    if (memoryUsages.length === 0) return null;
    
    const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
    const maxMemory = Math.max(...memoryUsages);
    
    if (maxMemory > avgMemory * 1.5) {
      return 'Variable memory usage during cold starts';
    }
    
    return 'Consistent memory usage pattern';
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  getEmptyResult() {
    return {
      total: 0,
      rate: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      peakHours: [],
      frequency: 'No data',
      triggers: [],
      recommendations: ['Unable to analyze cold starts - check CloudWatch Logs permissions'],
      timeline: [],
      patterns: [],
      statistics: { count: 0, percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }, distribution: {} }
    };
  }

  getEmptyAnalysis() {
    return {
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      peakHours: [],
      frequency: 'No cold starts detected',
      triggers: [],
      patterns: [],
      statistics: { count: 0, percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }, distribution: {} }
    };
  }
}