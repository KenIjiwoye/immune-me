# Monitoring Setup Guide - Immunization Reporting Functions

## Overview

This guide provides comprehensive instructions for setting up monitoring, alerting, and observability for the immunization reporting functions deployed on Appwrite.

## Monitoring Architecture

### Components
- **Appwrite Console**: Built-in monitoring dashboard
- **Custom Metrics**: Application-specific metrics
- **Log Aggregation**: Centralized logging
- **Alerting**: Real-time notifications
- **Performance Monitoring**: Response time and resource usage

## Setup Instructions

### 1. Appwrite Console Monitoring

#### Accessing the Console
1. Navigate to [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Select your project
3. Go to **Functions** → **Monitoring**

#### Key Metrics to Monitor
- **Function Executions**: Total, successful, failed
- **Response Times**: Average, 95th percentile, 99th percentile
- **Memory Usage**: Peak, average
- **Error Rates**: 4xx, 5xx errors
- **Cold Start Times**: Function initialization duration

### 2. Custom Monitoring Dashboard

#### Create Monitoring Function
```bash
# Create monitoring function
appwrite functions create \
    --functionId "monitoring-dashboard" \
    --name "Monitoring Dashboard" \
    --runtime node-18.0 \
    --entrypoint src/main.js
```

#### Monitoring Script
```javascript
// monitoring-dashboard/src/main.js
const { Client, Functions, Databases } = require('node-appwrite');

class MonitoringService {
    constructor() {
        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);
        
        this.functions = new Functions(this.client);
        this.databases = new Databases(this.client);
    }

    async collectMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            functions: {},
            database: {},
            storage: {}
        };

        // Collect function metrics
        for (const func of REPORTING_FUNCTIONS) {
            const stats = await this.getFunctionStats(func);
            metrics.functions[func] = stats;
        }

        return metrics;
    }

    async getFunctionStats(functionId) {
        try {
            const executions = await this.functions.listExecutions(functionId);
            const recentExecutions = executions.executions.slice(0, 100);
            
            return {
                totalExecutions: executions.total,
                successRate: this.calculateSuccessRate(recentExecutions),
                avgResponseTime: this.calculateAvgResponseTime(recentExecutions),
                errorRate: this.calculateErrorRate(recentExecutions),
                coldStartRate: this.calculateColdStartRate(recentExecutions)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    calculateSuccessRate(executions) {
        const successful = executions.filter(e => e.status === 'completed').length;
        return (successful / executions.length) * 100;
    }

    calculateAvgResponseTime(executions) {
        const times = executions.map(e => e.duration);
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    calculateErrorRate(executions) {
        const failed = executions.filter(e => e.status === 'failed').length;
        return (failed / executions.length) * 100;
    }

    calculateColdStartRate(executions) {
        const coldStarts = executions.filter(e => e.duration > 3000).length;
        return (coldStarts / executions.length) * 100;
    }
}
```

### 3. Alert Configuration

#### Email Alerts Setup
```bash
# Create email alert configuration
cat > alerts/email-alerts.json << EOF
{
    "alerts": [
        {
            "name": "High Error Rate",
            "condition": "error_rate > 5%",
            "duration": "5m",
            "severity": "critical",
            "recipients": ["admin@healthcenter.com"]
        },
        {
            "name": "Slow Response Time",
            "condition": "response_time > 5000ms",
            "duration": "10m",
            "severity": "warning",
            "recipients": ["dev@healthcenter.com"]
        },
        {
            "name": "Memory Usage High",
            "condition": "memory_usage > 80%",
            "duration": "5m",
            "severity": "warning",
            "recipients": ["ops@healthcenter.com"]
        }
    ]
}
EOF
```

#### Slack Integration
```javascript
// alerts/slack-webhook.js
const axios = require('axios');

class SlackNotifier {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    async sendAlert(alert) {
        const payload = {
            text: `🚨 Alert: ${alert.name}`,
            attachments: [{
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                    { title: 'Function', value: alert.function, short: true },
                    { title: 'Metric', value: alert.metric, short: true },
                    { title: 'Value', value: alert.value, short: true },
                    { title: 'Threshold', value: alert.threshold, short: true }
                ],
                footer: 'Immunization Reporting System',
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        await axios.post(this.webhookUrl, payload);
    }
}
```

### 4. Log Management

#### Structured Logging
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'immunization-reports' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

module.exports = logger;
```

#### Log Analysis Script
```bash
#!/bin/bash
# log-analyzer.sh

LOG_DIR="logs"
REPORT_FILE="log-analysis-$(date +%Y%m%d).json"

analyze_logs() {
    echo "Analyzing logs..."
    
    # Error analysis
    ERROR_COUNT=$(grep -c "ERROR" "$LOG_DIR/combined.log" || echo 0)
    WARN_COUNT=$(grep -c "WARN" "$LOG_DIR/combined.log" || echo 0)
    
    # Response time analysis
    AVG_RESPONSE_TIME=$(grep "response_time" "$LOG_DIR/combined.log" | \
        awk -F'response_time":' '{print $2}' | \
        awk -F',' '{sum+=$1; count++} END {print sum/count}' || echo 0)
    
    # Create report
    cat > "$REPORT_FILE" << EOF
{
    "analysis_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "error_count": $ERROR_COUNT,
    "warning_count": $WARN_COUNT,
    "avg_response_time": $AVG_RESPONSE_TIME,
    "log_file_size": $(stat -c%s "$LOG_DIR/combined.log" 2>/dev/null || echo 0)
}
EOF
    
    echo "Analysis complete. Report saved to $REPORT_FILE"
}
```

### 5. Performance Monitoring

#### Custom Metrics Collection
```javascript
// metrics/performance-metrics.js
class PerformanceMetrics {
    constructor() {
        this.metrics = {
            responseTime: new Map(),
            errorRate: new Map(),
            throughput: new Map()
        };
    }

    recordResponseTime(functionName, duration) {
        if (!this.metrics.responseTime.has(functionName)) {
            this.metrics.responseTime.set(functionName, []);
        }
        this.metrics.responseTime.get(functionName).push(duration);
    }

    recordError(functionName, error) {
        if (!this.metrics.errorRate.has(functionName)) {
            this.metrics.errorRate.set(functionName, { errors: 0, total: 0 });
        }
        this.metrics.errorRate.get(functionName).errors++;
        this.metrics.errorRate.get(functionName).total++;
    }

    getMetrics(functionName) {
        const responseTimes = this.metrics.responseTime.get(functionName) || [];
        const errorStats = this.metrics.errorRate.get(functionName) || { errors: 0, total: 0 };
        
        return {
            avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
            errorRate: (errorStats.errors / errorStats.total) * 100 || 0,
            totalExecutions: errorStats.total
        };
    }
}
```

### 6. Health Check Endpoints

#### Health Check Function
```javascript
// health-check/src/main.js
const { Client, Functions, Databases, Storage } = require('node-appwrite');

module.exports = async (req, res) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const functions = new Functions(client);
    const databases = new Databases(client);
    const storage = new Storage(client);

    const health = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: {}
    };

    try {
        // Check database connectivity
        await databases.get(process.env.DATABASE_ID);
        health.checks.database = 'healthy';
    } catch (error) {
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
    }

    try {
        // Check storage connectivity
        await storage.getBucket(process.env.BUCKET_ID);
        health.checks.storage = 'healthy';
    } catch (error) {
        health.checks.storage = 'unhealthy';
        health.status = 'unhealthy';
    }

    try {
        // Check function status
        const functionList = await functions.list();
        health.checks.functions = {
            total: functionList.total,
            status: 'healthy'
        };
    } catch (error) {
        health.checks.functions = 'unhealthy';
        health.status = 'unhealthy';
    }

    res.json(health);
};
```

### 7. Monitoring Dashboard Setup

#### Grafana Dashboard Configuration
```json
{
    "dashboard": {
        "title": "Immunization Reporting Functions",
        "panels": [
            {
                "title": "Function Executions",
                "type": "graph",
                "targets": [
                    {
                        "expr": "sum(rate(appwrite_function_executions_total[5m])) by (function)"
                    }
                ]
            },
            {
                "title": "Response Times",
                "type": "graph",
                "targets": [
                    {
                        "expr": "histogram_quantile(0.95, rate(appwrite_function_duration_seconds_bucket[5m]))"
                    }
                ]
            },
            {
                "title": "Error Rate",
                "type": "singlestat",
                "targets": [
                    {
                        "expr": "sum(rate(appwrite_function_failures_total[5m])) / sum(rate(appwrite_function_executions_total[5m])) * 100"
                    }
                ]
            }
        ]
    }
}
```

### 8. Alert Rules Configuration

#### Prometheus Alert Rules
```yaml
# alerts/prometheus-alerts.yml
groups:
  - name: immunization-reports
    rules:
      - alert: HighErrorRate
        expr: rate(appwrite_function_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Function {{ $labels.function }} has error rate above 5%"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(appwrite_function_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "Function {{ $labels.function }} 95th percentile response time above 5s"

      - alert: MemoryUsageHigh
        expr: appwrite_function_memory_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Function {{ $labels.function }} memory usage above 80%"
```

### 9. Setup Commands

#### Quick Setup Script
```bash
#!/bin/bash
# setup-monitoring.sh

echo "Setting up monitoring for immunization reporting functions..."

# Install monitoring dependencies
npm install node-appwrite winston axios

# Create monitoring directories
mkdir -p monitoring/{alerts,dashboards,logs}

# Copy configuration files
cp monitoring-config.json monitoring/
cp alert-rules.json monitoring/alerts/

# Create log directories
mkdir -p logs/{functions,system}

# Set up log rotation
cat > /etc/logrotate.d/immunization-reports << EOF
/var/log/immunization-reports/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 appwrite appwrite
}
EOF

# Start monitoring services
node monitoring/start-monitoring.js

echo "Monitoring setup complete!"
```

### 10. Monitoring Checklist

#### Daily Monitoring Tasks
- [ ] Check function execution counts
- [ ] Review error rates
- [ ] Monitor response times
- [ ] Check memory usage
- [ ] Review log files for errors

#### Weekly Monitoring Tasks
- [ ] Analyze performance trends
- [ ] Review alert configurations
- [ ] Check storage usage
- [ ] Validate backup procedures
- [ ] Update monitoring thresholds

#### Monthly Monitoring Tasks
- [ ] Performance optimization review
- [ ] Capacity planning assessment
- [ ] Security audit
- [ ] Documentation updates
- [ ] Stakeholder reporting

## Emergency Procedures

### Incident Response
1. **Immediate Response** (0-15 minutes)
   - Check system health dashboard
   - Identify affected functions
   - Assess impact scope

2. **Investigation** (15-60 minutes)
   - Review error logs
   - Check recent deployments
   - Analyze performance metrics

3. **Resolution** (1-4 hours)
   - Implement fix or rollback
   - Verify system stability
   - Update stakeholders

4. **Post-Incident** (24-48 hours)
   - Conduct post-mortem
   - Update monitoring rules
   - Document lessons learned

### Contact Information
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Technical Lead**: tech-lead@healthcenter.com
- **Operations Team**: ops@healthcenter.com
- **Emergency Escalation**: emergency@healthcenter.com

---

**Monitoring Setup Complete** ✅  
For questions or issues, refer to the troubleshooting guide or contact the operations team.