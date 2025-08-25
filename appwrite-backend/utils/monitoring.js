/**
 * Monitoring and Logging Utilities
 * Comprehensive monitoring for report functions
 */

const { Databases, Query } = require('node-appwrite');

class MonitoringService {
  constructor(databases, databaseId, config = {}) {
    this.databases = databases;
    this.databaseId = databaseId;
    this.config = {
      metricsCollection: 'function_metrics',
      logsCollection: 'function_logs',
      alertsCollection: 'function_alerts',
      enableMetrics: true,
      enableLogs: true,
      enableAlerts: true,
      logLevel: 'info',
      retentionDays: 30,
      ...config
    };
    
    this.startTime = Date.now();
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      avgResponseTime: 0,
      lastRequestTime: null
    };
  }

  /**
   * Log function execution
   */
  async log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        functionName: process.env.APPWRITE_FUNCTION_NAME || 'unknown',
        functionId: process.env.APPWRITE_FUNCTION_ID || 'unknown',
        executionId: process.env.APPWRITE_FUNCTION_EXECUTION_ID || 'unknown',
        memoryUsage: process.memoryUsage(),
        uptime: Date.now() - this.startTime
      }
    };

    // Console logging
    console.log(JSON.stringify(logEntry));

    // Database logging
    if (this.config.enableLogs) {
      try {
        await this.databases.createDocument(
          this.databaseId,
          this.config.logsCollection,
          'unique()',
          logEntry
        );
      } catch (error) {
        console.error('Failed to store log:', error.message);
      }
    }
  }

  /**
   * Track function metrics
   */
  async trackMetric(type, value, tags = {}) {
    if (!this.config.enableMetrics) return;

    const metric = {
      timestamp: new Date().toISOString(),
      type,
      value,
      tags: {
        ...tags,
        functionName: process.env.APPWRITE_FUNCTION_NAME || 'unknown',
        functionId: process.env.APPWRITE_FUNCTION_ID || 'unknown'
      }
    };

    try {
      await this.databases.createDocument(
        this.databaseId,
        this.config.metricsCollection,
        'unique()',
        metric
      );
    } catch (error) {
      console.error('Failed to store metric:', error.message);
    }
  }

  /**
   * Track request metrics
   */
  async trackRequest(duration, success = true, error = null) {
    this.metrics.requests++;
    this.metrics.lastRequestTime = new Date().toISOString();
    
    if (!success) {
      this.metrics.errors++;
    }

    // Update average response time
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.requests - 1) + duration) / 
      this.metrics.requests;

    await this.trackMetric('request_duration', duration, {
      success: success.toString(),
      error: error?.message || 'none'
    });

    await this.trackMetric('request_count', 1, {
      success: success.toString()
    });
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(operation, duration, metadata = {}) {
    await this.trackMetric('performance', duration, {
      operation,
      ...metadata
    });

    await this.log('info', `Performance metric: ${operation}`, {
      duration,
      ...metadata
    });
  }

  /**
   * Track cache metrics
   */
  async trackCacheMetrics(hit, key, size = 0) {
    await this.trackMetric('cache_operation', 1, {
      operation: hit ? 'hit' : 'miss',
      key,
      size: size.toString()
    });

    if (hit) {
      await this.log('debug', `Cache hit for key: ${key}`);
    } else {
      await this.log('debug', `Cache miss for key: ${key}`);
    }
  }

  /**
   * Track memory usage
   */
  async trackMemoryUsage() {
    const usage = process.memoryUsage();
    
    await this.trackMetric('memory_usage', usage.heapUsed, {
      heapUsed: usage.heapUsed.toString(),
      heapTotal: usage.heapTotal.toString(),
      external: usage.external.toString()
    });

    // Alert on high memory usage
    const usageMB = usage.heapUsed / 1024 / 1024;
    if (usageMB > 400) { // 400MB threshold
      await this.createAlert('high_memory_usage', `High memory usage: ${usageMB.toFixed(2)}MB`, {
        usage: usageMB
      });
    }
  }

  /**
   * Create alert
   */
  async createAlert(type, message, details = {}) {
    if (!this.config.enableAlerts) return;

    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
      resolved: false,
      functionName: process.env.APPWRITE_FUNCTION_NAME || 'unknown'
    };

    try {
      await this.databases.createDocument(
        this.databaseId,
        this.config.alertsCollection,
        'unique()',
        alert
      );
    } catch (error) {
      console.error('Failed to create alert:', error.message);
    }

    // Also log as error
    await this.log('error', `ALERT: ${message}`, details);
  }

  /**
   * Get function health status
   */
  async getHealthStatus(functionName = null) {
    const queries = [];
    if (functionName) {
      queries.push(Query.equal('tags.functionName', functionName));
    }

    try {
      // Get recent metrics
      const metricsResponse = await this.databases.listDocuments(
        this.databaseId,
        this.config.metricsCollection,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(100),
          ...queries
        ]
      );

      // Get recent errors
      const errorsResponse = await this.databases.listDocuments(
        this.databaseId,
        this.config.logsCollection,
        [
          Query.equal('level', 'error'),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
          ...queries
        ]
      );

      // Get active alerts
      const alertsResponse = await this.databases.listDocuments(
        this.databaseId,
        this.config.alertsCollection,
        [
          Query.equal('resolved', false),
          ...queries
        ]
      );

      // Calculate health score
      const recentMetrics = metricsResponse.documents;
      const errorRate = this.calculateErrorRate(recentMetrics);
      const avgResponseTime = this.calculateAvgResponseTime(recentMetrics);

      return {
        status: errorRate > 0.1 || avgResponseTime > 5000 ? 'unhealthy' : 'healthy',
        errorRate,
        avgResponseTime,
        totalRequests: recentMetrics.filter(m => m.type === 'request_count').length,
        totalErrors: errorsResponse.documents.length,
        activeAlerts: alertsResponse.documents.length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  calculateErrorRate(metrics) {
    const requests = metrics.filter(m => m.type === 'request_count');
    const errors = requests.filter(m => m.tags.success === 'false');
    
    return requests.length > 0 ? errors.length / requests.length : 0;
  }

  calculateAvgResponseTime(metrics) {
    const durations = metrics
      .filter(m => m.type === 'request_duration')
      .map(m => m.value);
    
    return durations.length > 0 
      ? durations.reduce((sum, val) => sum + val, 0) / durations.length 
      : 0;
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(timeRange = '24h', functionName = null) {
    const now = new Date();
    const startTime = new Date(now.getTime() - this.parseTimeRange(timeRange));
    
    const queries = [
      Query.greaterThanEqual('$createdAt', startTime.toISOString()),
      Query.orderDesc('$createdAt')
    ];
    
    if (functionName) {
      queries.push(Query.equal('tags.functionName', functionName));
    }

    try {
      const [metrics, logs, alerts] = await Promise.all([
        this.databases.listDocuments(
          this.databaseId,
          this.config.metricsCollection,
          queries
        ),
        this.databases.listDocuments(
          this.databaseId,
          this.config.logsCollection,
          queries
        ),
        this.databases.listDocuments(
          this.databaseId,
          this.config.alertsCollection,
          queries
        )
      ]);

      return {
        timeRange,
        metrics: metrics.documents,
        logs: logs.documents,
        alerts: alerts.documents,
        summary: this.generateSummary(metrics.documents, logs.documents)
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  parseTimeRange(range) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };
    
    const match = range.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h
    
    return parseInt(match[1]) * units[match[2]];
  }

  generateSummary(metrics, logs) {
    const requestMetrics = metrics.filter(m => m.type === 'request_count');
    const durationMetrics = metrics.filter(m => m.type === 'request_duration');
    
    const totalRequests = requestMetrics.length;
    const successfulRequests = requestMetrics.filter(m => m.tags.success === 'true').length;
    const errors = logs.filter(l => l.level === 'error').length;
    
    const avgResponseTime = durationMetrics.length > 0
      ? durationMetrics.reduce((sum, m) => sum + m.value, 0) / durationMetrics.length
      : 0;

    return {
      totalRequests,
      successfulRequests,
      errorRate: totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0,
      avgResponseTime,
      errors
    };
  }

  /**
   * Cleanup old logs and metrics
   */
  async cleanupOldData(retentionDays = this.config.retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const collections = [
      this.config.logsCollection,
      this.config.metricsCollection,
      this.config.alertsCollection
    ];

    let totalDeleted = 0;

    for (const collection of collections) {
      try {
        const response = await this.databases.listDocuments(
          this.databaseId,
          collection,
          [
            Query.lessThan('$createdAt', cutoffDate.toISOString())
          ]
        );

        const deletePromises = response.documents.map(doc =>
          this.databases.deleteDocument(this.databaseId, collection, doc.$id)
        );

        await Promise.all(deletePromises);
        totalDeleted += deletePromises.length;
      } catch (error) {
        console.error(`Failed to cleanup ${collection}:`, error.message);
      }
    }

    await this.log('info', `Cleanup completed`, { totalDeleted, retentionDays });
    return totalDeleted;
  }

  /**
   * Log level checking
   */
  shouldLog(level) {
    const levels = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3
    };
    
    return levels[level] <= levels[this.config.logLevel];
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return {
      ...this.metrics,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime
    };
  }
}

module.exports = MonitoringService;