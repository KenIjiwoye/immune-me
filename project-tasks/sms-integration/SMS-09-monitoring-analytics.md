
# SMS-09: Monitoring & Analytics

## Context
This task implements comprehensive monitoring and analytics for the SMS integration system, providing real-time performance metrics, delivery analytics, cost tracking, and system health monitoring. The monitoring system enables proactive issue detection, performance optimization, and data-driven decision making for SMS communications in the healthcare environment.

## Dependencies
- [`SMS-05`](SMS-05-webhook-tracking.md): Webhook status tracking for delivery metrics
- [`SMS-08`](SMS-08-frontend-integration.md): Frontend integration for analytics display

## Requirements

### 1. Performance Monitoring System
Implement comprehensive performance monitoring for SMS delivery rates, API response times, system throughput, and error tracking with real-time alerting.

### 2. Analytics Dashboard
Create detailed analytics dashboards showing SMS delivery statistics, patient engagement metrics, cost analysis, and system performance trends.

### 3. Health Check System
Develop automated health checks for all SMS system components including API connectivity, database performance, and scheduler operations.

### 4. Alerting & Notification System
Implement intelligent alerting for system failures, performance degradation, high error rates, and cost threshold breaches.

### 5. Reporting & Export
Create automated reporting capabilities with scheduled reports, data export functionality, and compliance reporting for healthcare requirements.

### 6. Cost Tracking & Optimization
Implement cost tracking per message, facility, and time period with optimization recommendations and budget monitoring.

## Code Examples

### SMS Analytics Service

```typescript
// backend/app/services/sms_analytics_service.ts
import { DateTime } from 'luxon'
import SMSMessage from '#models/sms_message'
import SMSWebhookLog from '#models/sms_webhook_log'
import SMSConsent from '#models/sms_consent'
import Logger from '@adonisjs/core/logger'

export interface AnalyticsTimeframe {
  start: DateTime
  end: DateTime
  period: 'hour' | 'day' | 'week' | 'month'
}

export interface SMSMetrics {
  totalSent: number
  delivered: number
  failed: number
  pending: number
  cancelled: number
  deliveryRate: number
  failureRate: number
  averageDeliveryTime: number
  costPerMessage: number
  totalCost: number
}

export interface ConsentMetrics {
  totalPatients: number
  consentedPatients: number
  optedOutPatients: number
  consentRate: number
  optOutRate: number
  recentOptOuts: number
}

export interface SystemHealth {
  apiConnectivity: boolean
  databaseHealth: boolean
  schedulerHealth: boolean
  webhookHealth: boolean
  lastHealthCheck: DateTime
  issues: string[]
}

export default class SMSAnalyticsService {
  /**
   * Get comprehensive SMS metrics for timeframe
   */
  public async getSMSMetrics(
    timeframe: AnalyticsTimeframe,
    facilityId?: number
  ): Promise<SMSMetrics> {
    let query = SMSMessage.query()
      .whereBetween('created_at', [timeframe.start.toSQL(), timeframe.end.toSQL()])

    if (facilityId) {
      query = query.whereHas('patient', (patientQuery) => {
        patientQuery.where('facility_id', facilityId)
      })
    }

    const messages = await query

    const metrics = {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      cancelled: 0,
      deliveryRate: 0,
      failureRate: 0,
      averageDeliveryTime: 0,
      costPerMessage: 0.05, // Example cost per SMS
      totalCost: 0
    }

    let totalDeliveryTime = 0
    let deliveredCount = 0

    for (const message of messages) {
      metrics.totalSent++

      switch (message.status) {
        case 'delivered':
          metrics.delivered++
          if (message.sentAt && message.deliveredAt) {
            totalDeliveryTime += DateTime.fromJSDate(message.deliveredAt)
              .diff(DateTime.fromJSDate(message.sentAt)).as('seconds')
            deliveredCount++
          }
          break
        case 'failed':
          metrics.failed++
          break
        case 'pending':
          metrics.pending++
          break
        case 'cancelled':
          metrics.cancelled++
          break
      }
    }

    metrics.deliveryRate = metrics.totalSent > 0 ? (metrics.delivered / metrics.totalSent) * 100 : 0
    metrics.failureRate = metrics.totalSent > 0 ? (metrics.failed / metrics.totalSent) * 100 : 0
    metrics.averageDeliveryTime = deliveredCount > 0 ? totalDeliveryTime / deliveredCount : 0
    metrics.totalCost = metrics.totalSent * metrics.costPerMessage

    return metrics
  }

  /**
   * Get consent and patient engagement metrics
   */
  public async getConsentMetrics(facilityId?: number): Promise<ConsentMetrics> {
    let patientQuery = (await import('#models/patient')).default.query()
    
    if (facilityId) {
      patientQuery = patientQuery.where('facility_id', facilityId)
    }

    const totalPatients = await patientQuery.count('* as total').first()
    const total = Number(totalPatients?.total || 0)

    // Get consent statistics
    let consentQuery = SMSConsent.query()
    
    if (facilityId) {
      consentQuery = consentQuery.whereHas('patient', (query) => {
        query.where('facility_id', facilityId)
      })
    }

    const consentStats = await consentQuery
      .select('consent_given', 'opted_out')
      .count('* as count')
      .groupBy('consent_given', 'opted_out')

    let consented = 0
    let optedOut = 0

    for (const stat of consentStats) {
      const count = Number(stat.count)
      if (stat.consentGiven && !stat.optedOut) {
        consented += count
      } else if (stat.optedOut) {
        optedOut += count
      }
    }

    // Recent opt-outs (last 7 days)
    const recentOptOuts = await SMSConsent.query()
      .where('opted_out', true)
      .where('opt_out_date', '>=', DateTime.now().minus({ days: 7 }).toSQL())
      .count('* as total')
      .first()

    return {
      totalPatients: total,
      consentedPatients: consented,
      optedOutPatients: optedOut,
      consentRate: total > 0 ? (consented / total) * 100 : 0,
      optOutRate: total > 0 ? (optedOut / total) * 100 : 0,
      recentOptOuts: Number(recentOptOuts?.total || 0)
    }
  }

  /**
   * Get system health status
   */
  public async getSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      apiConnectivity: false,
      databaseHealth: false,
      schedulerHealth: false,
      webhookHealth: false,
      lastHealthCheck: DateTime.now(),
      issues: []
    }

    try {
      // Test Orange Network API connectivity
      const { default: OrangeSMSProvider } = await import('./providers/orange_sms_provider.js')
      const provider = new OrangeSMSProvider()
      const apiHealth = await provider.healthCheck()
      health.apiConnectivity = apiHealth.healthy
      
      if (!apiHealth.healthy) {
        health.issues.push(`API connectivity issue: ${apiHealth.message}`)
      }
    } catch (error) {
      health.issues.push(`API health check failed: ${error.message}`)
    }

    try {
      // Test database connectivity
      await SMSMessage.query().limit(1).first()
      health.databaseHealth = true
    } catch (error) {
      health.databaseHealth = false
      health.issues.push(`Database connectivity issue: ${error.message}`)
    }

    try {
      // Check scheduler health
      const { default: SMSSchedulerService } = await import('./sms_scheduler_service.js')
      const scheduler = new SMSSchedulerService()
      const schedulerHealth = await scheduler.getHealthStatus()
      health.schedulerHealth = schedulerHealth.healthy
      
      if (!schedulerHealth.healthy) {
        health.issues.push(...schedulerHealth.issues)
      }
    } catch (error) {
      health.issues.push(`Scheduler health check failed: ${error.message}`)
    }

    try {
      // Check webhook processing health
      const recentWebhooks = await SMSWebhookLog.query()
        .where('created_at', '>=', DateTime.now().minus({ hours: 1 }).toSQL())
        .count('* as total')
        .first()

      const failedWebhooks = await SMSWebhookLog.query()
        .where('created_at', '>=', DateTime.now().minus({ hours: 1 }).toSQL())
        .where('processed', false)
        .count('* as total')
        .first()

      const totalWebhooks = Number(recentWebhooks?.total || 0)
      const failed = Number(failedWebhooks?.total || 0)
      
      health.webhookHealth = totalWebhooks === 0 || (failed / totalWebhooks) < 0.1 // Less than 10% failure rate
      
      if (!health.webhookHealth) {
        health.issues.push(`High webhook failure rate: ${failed}/${totalWebhooks}`)
      }
    } catch (error) {
      health.issues.push(`Webhook health check failed: ${error.message}`)
    }

    return health
  }

  /**
   * Get performance trends over time
   */
  public async getPerformanceTrends(
    days: number = 7,
    facilityId?: number
  ): Promise<Array<{
    date: string
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }>> {
    const trends = []
    const startDate = DateTime.now().minus({ days })

    for (let i = 0; i < days; i++) {
      const dayStart = startDate.plus({ days: i }).startOf('day')
      const dayEnd = dayStart.endOf('day')

      const timeframe: AnalyticsTimeframe = {
        start: dayStart,
        end: dayEnd,
        period: 'day'
      }

      const metrics = await this.getSMSMetrics(timeframe, facilityId)
      
      trends.push({
        date: dayStart.toFormat('yyyy-MM-dd'),
        sent: metrics.totalSent,
        delivered: metrics.delivered,
        failed: metrics.failed,
        deliveryRate: metrics.deliveryRate
      })
    }

    return trends
  }

  /**
   * Get cost analysis
   */
  public async getCostAnalysis(
    timeframe: AnalyticsTimeframe,
    facilityId?: number
  ): Promise<{
    totalCost: number
    costPerMessage: number
    costByType: Record<string, number>
    costByFacility: Array<{ facilityName: string; cost: number; messageCount: number }>
    projectedMonthlyCost: number
  }> {
    const metrics = await this.getSMSMetrics(timeframe, facilityId)
    
    // Get cost breakdown by message type
    let query = SMSMessage.query()
      .whereBetween('created_at', [timeframe.start.toSQL(), timeframe.end.toSQL()])
      .where('status', '!=', 'cancelled')

    if (facilityId) {
      query = query.whereHas('patient', (patientQuery) => {
        patientQuery.where('facility_id', facilityId)
      })
    }

    const messagesByType = await query
      .select('message_type')
      .count('* as count')
      .groupBy('message_type')

    const costByType: Record<string, number> = {}
    for (const typeData of messagesByType) {
      costByType[typeData.messageType] = Number(typeData.count) * metrics.costPerMessage
    }

    // Get cost by facility (if not filtered by facility)
    const costByFacility = []
    if (!facilityId) {
      const facilityCosts = await SMSMessage.query()
        .whereBetween('created_at', [timeframe.start.toSQL(), timeframe.end.toSQL()])
        .where('status', '!=', 'cancelled')
        .preload('patient', (patientQuery) => {
          patientQuery.preload('facility')
        })
        .select('*')

      const facilityGroups: Record<string, { count: number; name: string }> = {}
      
      for (const message of facilityCosts) {
        const facilityName = message.patient?.facility?.name || 'Unknown'
        if (!facilityGroups[facilityName]) {
          facilityGroups[facilityName] = { count: 0, name: facilityName }
        }
        facilityGroups[facilityName].count++
      }

      for (const [name, data] of Object.entries(facilityGroups)) {
        costByFacility.push({
          facilityName: name,
          cost: data.count * metrics.costPerMessage,
          messageCount: data.count
        })
      }
    }

    // Calculate projected monthly cost
    const daysInPeriod = timeframe.end.diff(timeframe.start, 'days').days
    const dailyAverage = metrics.totalCost / Math.max(daysInPeriod, 1)
    const projectedMonthlyCost = dailyAverage * 30

    return {
      totalCost: metrics.totalCost,
      costPerMessage: metrics.costPerMessage,
      costByType,
      costByFacility,
      projectedMonthlyCost
    }
  }

  /**
   * Generate automated report
   */
  public async generateReport(
    reportType: 'daily' | 'weekly' | 'monthly',
    facilityId?: number
  ): Promise<{
    reportDate: string
    timeframe: AnalyticsTimeframe
    smsMetrics: SMSMetrics
    consentMetrics: ConsentMetrics
    systemHealth: SystemHealth
    trends: any[]
    costAnalysis: any
    recommendations: string[]
  }> {
    const now = DateTime.now()
    let timeframe: AnalyticsTimeframe

    switch (reportType) {
      case 'daily':
        timeframe = {
          start: now.minus({ days: 1 }).startOf('day'),
          end: now.minus({ days: 1 }).endOf('day'),
          period: 'day'
        }
        break
      case 'weekly':
        timeframe = {
          start: now.minus({ weeks: 1 }).startOf('week'),
          end: now.minus({ weeks: 1 }).endOf('week'),
          period: 'week'
        }
        break
      case 'monthly':
        timeframe = {
          start: now.minus({ months: 1 }).startOf('month'),
          end: now.minus({ months: 1 }).endOf('month'),
          period: 'month'
        }
        break
    }

    const [smsMetrics, consentMetrics, systemHealth, trends, costAnalysis] = await Promise.all([
      this.getSMSMetrics(timeframe, facilityId),
      this.getConsentMetrics(facilityId),
      this.getSystemHealth(),
      this.getPerformanceTrends(7, facilityId),
      this.getCostAnalysis(timeframe, facilityId)
    ])

    // Generate recommendations
    const recommendations = this.generateRecommendations(smsMetrics, consentMetrics, systemHealth)

    return {
      reportDate: now.toISO(),
      timeframe,
      smsMetrics,
      consentMetrics,
      systemHealth,
      trends,
      costAnalysis,
      recommendations
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    smsMetrics: SMSMetrics,
    consentMetrics: ConsentMetrics,
    systemHealth: SystemHealth
  ): string[] {
    const recommendations: string[] = []

    // Delivery rate recommendations
    if (smsMetrics.deliveryRate < 90) {
      recommendations.push('Delivery rate is below 90%. Consider reviewing phone number validation and message content.')
    }

    // Failure rate recommendations
    if (smsMetrics.failureRate > 10) {
      recommendations.push('High failure rate detected. Review failed messages and consider updating patient phone numbers.')
    }

    // Consent rate recommendations
    if (consentMetrics.consentRate < 70) {
      recommendations.push('Low consent rate. Consider improving consent collection process and patient education.')
    }

    // Opt-out rate recommendations
    if (consentMetrics.optOutRate > 15) {
      recommendations.push('High opt-out rate. Review message content and frequency to improve patient satisfaction.')
    }

    // System health recommendations
    if (!systemHealth.apiConnectivity) {
      recommendations.push('API connectivity issues detected. Check Orange Network API status and credentials.')
    }

    if (!systemHealth.schedulerHealth) {
      recommendations.push('Scheduler health issues detected. Review scheduler logs and performance.')
    }

    // Cost optimization recommendations
    if (smsMetrics.totalCost > 1000) { // Example threshold
      recommendations.push('High SMS costs detected. Consider optimizing message frequency and targeting.')
    }

    return recommendations
  }
}
```

### Monitoring Controller

```typescript
// backend/app/controllers/sms_monitoring_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import SMSAnalyticsService from '#services/sms_analytics_service'
import { DateTime } from 'luxon'

export default class SMSMonitoringController {
  private analyticsService: SMSAnalyticsService

  constructor() {
    this.analyticsService = new SMSAnalyticsService()
  }

  /**
   * Get SMS analytics dashboard data
   */
  public async dashboard({ request, response }: HttpContext) {
    const timeframe = request.input('timeframe', 'day')
    const facilityId = request.input('facilityId')

    const now = DateTime.now()
    let analyticsTimeframe

    switch (timeframe) {
      case 'week':
        analyticsTimeframe = {
          start: now.minus({ weeks: 1 }).startOf('week'),
          end: now.endOf('day'),
          period: 'week' as const
        }
        break
      case 'month':
        analyticsTimeframe = {
          start: now.minus({ months: 1 }).startOf('month'),
          end: now.endOf('day'),
          period: 'month' as const
        }
        break
      default:
        analyticsTimeframe = {
          start: now.minus({ days: 1 }).startOf('day'),
          end: now.endOf('day'),
          period: 'day' as const
        }
    }

    const [smsMetrics, consentMetrics, systemHealth, trends] = await Promise.all([
      this.analyticsService.getSMSMetrics(analyticsTimeframe, facilityId),
      this.analyticsService.getConsentMetrics(facilityId),
      this.analyticsService.getSystemHealth(),
      this.analyticsService.getPerformanceTrends(7, facilityId)
    ])

    return response.json({
      timeframe: analyticsTimeframe,
      smsMetrics,
      consentMetrics,
      systemHealth,
      trends
    })
  }

  /**
   * Get system health status
   */
  public async health({ response }: HttpContext) {
    const health = await this.analyticsService.getSystemHealth()
    
    const statusCode = health.issues.length === 0 ? 200 : 503
    
    return response.status(statusCode).json(health)
  }

  /**
   * Get cost analysis
   */
  public async costs({ request, response }: HttpContext) {
    const timeframe = request.input('timeframe', 'month')
    const facilityId = request.input('facilityId')

    const now = DateTime.now()
    let analyticsTimeframe

    switch (timeframe) {
      case 'week':
        analyticsTimeframe = {
          start: now.minus({ weeks: 1 }).startOf('week'),
          end: now.endOf('day'),
          period: 'week' as const
        }
        break
      case 'year':
        analyticsTimeframe = {
          start: now.minus({ years: 1 }).startOf('year'),
          end: now.endOf('day'),
          period: 'month' as const
        }
        break
      default:
        analyticsTimeframe = {
          start: now.minus({ months: 1 }).startOf('month'),
          end: now.endOf('day'),
          period: 'month' as const
        }
    }

    const costAnalysis = await this.analyticsService.getCostAnalysis(analyticsTimeframe, facilityId)
    
    return response.json(costAnalysis)
  }

  /**
   * Generate and download report
   */
  public async report({ request, response }: HttpContext) {
    const reportType = request.input('type', 'weekly') as 'daily' | 'weekly' | 'monthly'
    const facilityId = request.input('facilityId')
    const format = request.input('format', 'json')

    const report = await this.analyticsService.generateReport(reportType, facilityId)

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertReportToCSV(report)
      
      response.header('Content-Type', 'text/csv')
      response.header('Content-Disposition', `attachment; filename="sms-report-${reportType}.csv"`)
      
      return response.send(csv)
    }

    return response.json(report)
  }

  /**
   * Get performance trends
   */
  public async trends({ request, response }: HttpContext) {
    const days = request.input('days', 7)
    const facilityId = request.input('facilityId')

    const trends = await this.analyticsService.getPerformanceTrends(days, facilityId)
    
    return response.json(trends)
  }

  private convertReportToCSV(report: any): string {
    // Simple CSV conversion - would be enhanced in production
    const lines = [
      'Metric,Value',
      `Report Date,${report.reportDate}`,
      `Total Sent,${report.smsMetrics.totalSent}`,
      `Delivered,${report.smsMetrics.delivered}`,
      `Failed,${report.smsMetrics.failed}`,
      `Delivery Rate,${report.smsMetrics.deliveryRate.toFixed(2)}%`,
      `Total Cost,$${report.costAnalysis.totalCost.toFixed(2)}`,
      `Consent Rate,${report.consentMetrics.consentRate.toFixed(2)}%`,
      `Opt-out Rate,${report.consentMetrics.optOutRate.toFixed(2)}%`
    ]

    return lines.join('\n')
  }
}
```

### Alerting Service

```typescript
// backend/app/services/sms_alerting_service.ts
import SMSAnalyticsService from './sms_analytics_service.js'
import Logger from '@adonisjs/core/logger'
import { DateTime } from 'luxon'

export interface AlertThresholds {
  deliveryRateMin: number
  failureRateMax: number
  optOutRateMax: number
  costThresholdDaily: number
  pendingMessagesMax: number
}

export interface Alert {
  id: string
  type: 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: DateTime
  resolved: boolean
  data?: any
}

export default class SMSAlertingService {
  private analyticsService: SMSAnalyticsService
  private thresholds: AlertThresholds

  constructor() {
    this.analyticsService = new SMSAnalyticsService()
    this.thresholds = {
      deliveryRateMin: 85, // 85% minimum delivery rate
      failureRateMax: 15,  // 15% maximum failure rate
      optOutRateMax: 20,   // 20% maximum opt-out rate
      costThresholdDaily: 100, // $100 daily cost threshold
      pendingMessagesMax: 1000 // 1000 pending messages threshold
    }
  }

  /**
   * Check all alert conditions and generate alerts
   */
  public async checkAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = []

    try {
      // Check system health
      const systemHealth = await this.analyticsService.getSystemHealth()
      if (!systemHealth.apiConnectivity || !systemHealth.databaseHealth || !systemHealth.schedulerHealth) {
        alerts.push({
          id: `system_health_${Date.now()}`,
          type: 'critical',
          title: 'System Health Issues',
          message: `System health issues detected: ${systemHealth.issues.join(', ')}`,
          timestamp: DateTime.now(),
          resolved: false,
          data: systemHealth
        })
      }

      // Check daily metrics
      const dailyTimeframe = {
        start: DateTime.now().startOf('day'),
        end: DateTime.now(),
        period: 'day' as const
      }

      const dailyMetrics = await this.analyticsService.getSMSMetrics(dailyTimeframe)

      // Check delivery rate
      if (dailyMetrics.deliveryRate < this.thresholds.deliveryRateMin && dailyMetrics.totalSent > 10) {
        alerts.push({
          id: `delivery_rate_${Date.now()}`,
          type: 'warning',
          title: 'Low Delivery Rate',
          message: `SMS delivery rate is ${dailyMetrics.deliveryRate.toFixed(1)}%, below threshold of ${this.thresholds.deliveryRateMin}%`,
          timestamp: DateTime.now(),
          resolved: false,
          data: { deliveryRate: dailyMetrics.deliveryRate, threshold: this.thresholds.deliveryRateMin }
        })
      }

      // Check failure rate
      if (dailyMetrics.failureRate > this.thresholds.failureRateMax && dailyMetrics.totalSent > 10) {
        alerts.push({
          id: `failure_rate_${Date.now()}`,
          type: 'error',
          title: 'High Failure Rate',
          message: `SMS failure rate is ${dailyMetrics.failureRate.toFixed(1)}%, above threshold of ${this.thresholds.failureRateMax}%`,
          timestamp: DateTime.now(),
          resolved: false,
          data: { failureRate: dailyMetrics.failureRate, threshold: this.thresholds.failureRateMax }
        })
      }

      // Check pending messages
      if (dailyMetrics.pending > this.thresholds.pendingMessagesMax) {
        alerts.push({
          id: `pending_messages_${Date.now()}`,
          type: 'warning',
          title: 'High Pending Messages',
          message: `${dailyMetrics.pending} messages are pending, above threshold of ${this.thresholds.pendingMessagesMax}`,
          timestamp: DateTime.now(),
          resolved: false,
          data: { pending: dailyMetrics.pending, threshold: this.thresholds.pendingMessagesMax }
        })
      }

      // Check daily cost
      if (dailyMetrics.totalCost > this.thresholds.costThresholdDaily) {
        alerts.push({
          id: `daily_cost_${Date.now()}`,
          type: 'warning',
          title: 'High Daily SMS Cost',
          message: `Daily SMS cost is $${dailyMetrics.totalCost.toFixed(2)}, above threshold of $${this.thresholds.costThresholdDaily}`,
          timestamp: DateTime.now(),
          resolved: false,
          data: { cost: dailyMetrics.totalCost, threshold: this.thresholds.costThresholdDaily }
        })
      }

      // Check consent metrics
      const consentMetrics = await this.analyticsService.getConsentMetrics()
      if (consentMetrics.optOutRate > this.thresholds.optOutRateMax) {
        alerts.push({
          id: `opt_out_rate_${Date.now()}`,
          type: 'warning',
          title: 'High Opt-out Rate',
          message: `Patient opt-out rate is ${consentMetrics.optOutRate.toFixed(1)}%, above threshold of ${this.thresholds.optOutRateMax}%`,
          timestamp: DateTime.now(),
          resolved: false,
          data: { optOutRate: consentMetrics.optOutRate, threshold: this.thresholds.optOutRateMax }
        })
      }

    } catch (error) {
      Logger.error('Failed to check SMS alerts:', error)
      alerts.push({
        id: `alert_check_error_${Date.now()}`,
        type: 'error',
        title: 'Alert Check Failed',
        message: `Failed to check SMS system alerts: ${error.message}`,
        timestamp: DateTime.now(),
        resolved: false
      })
    }

    // Log alerts
    for (const alert of alerts) {
      Logger.warn(`SMS Alert [${alert.type.toUpperCase()}]: ${alert.title} - ${alert.message}`)
    }

    return alerts
  }

  /**
   * Send alert notifications (email, Slack, etc.)
   */
  public async sendAlertNotifications(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        // Send email notification (implementation would depend on email service)
        await this.sendEmailAlert(alert)
        
        // Send Slack notification (if configured)
        await this.sendSlackAlert(alert)
        
        Logger.info(`Alert notification sent: ${alert.title}`)
      } catch (error) {
        Logger.error(`Failed to send alert notification for ${alert.title}:`, error)
      }
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Email implementation would go here
    // This would integrate with the existing email service
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    // Slack integration would go here
    // This would send alerts to a configured Slack channel
  }
}
```

## Acceptance Criteria

1. **Performance Monitoring**: Real-time tracking of SMS delivery rates, API response times, and system throughput
2. **Analytics Dashboard**: Comprehensive analytics with visual charts and trend analysis
3. **Health Monitoring**: Automated health checks for all system components with alerting
4. **Cost Tracking**: Detailed cost analysis with budget monitoring and optimization recommendations
5. **Alerting System**: Intelligent alerts for system issues, performance problems, and threshold breaches
6. **Reporting**: Automated report generation with export capabilities and scheduled delivery
7. **Trend Analysis**: Historical trend analysis with predictive insights
8. **Real-time Metrics**: Live dashboard updates with real-time performance indicators
9. **Compliance Reporting**: Healthcare-specific reporting for audit and compliance requirements
10. **Optimization Insights**: Data-driven recommendations for system and cost optimization

## Implementation Notes

### Monitoring Strategy
- Implement comprehensive metrics collection at all system layers
- Use efficient database queries with proper indexing for analytics
- Implement caching for frequently accessed metrics
- Provide real-time and historical data views

### Alerting Best Practices
- Use intelligent thresholds that adapt to usage patterns
-
Implement multiple alert channels (email, Slack, SMS)
- Avoid alert fatigue with intelligent grouping and throttling
- Provide clear escalation paths for critical issues
- Include actionable information in alert messages

### Performance Optimization
- Use efficient database queries with proper indexing
- Implement caching for frequently accessed metrics
- Use background jobs for heavy analytics processing
- Optimize dashboard loading with lazy loading and pagination

### Data Retention
- Implement appropriate data retention policies for metrics
- Archive old data to maintain performance
- Provide data export capabilities for compliance
- Balance storage costs with analytical needs

## Testing Requirements

### Unit Testing
- Test analytics calculations with various data scenarios
- Validate alert threshold logic and conditions
- Test report generation with different timeframes
- Verify cost calculation accuracy

### Integration Testing
- Test monitoring integration with all SMS system components
- Verify alert delivery through various channels
- Test dashboard performance with large datasets
- Validate real-time metric updates

### Performance Testing
- Test analytics performance with large data volumes
- Validate dashboard responsiveness under load
- Test concurrent analytics requests
- Measure and optimize query performance

## Related Documentation

- **Webhook & Status Tracking**: [`SMS-05-webhook-tracking.md`](SMS-05-webhook-tracking.md)
- **Frontend SMS Integration**: [`SMS-08-frontend-integration.md`](SMS-08-frontend-integration.md)
- **Enhanced Scheduler**: [`SMS-04-enhanced-scheduler.md`](SMS-04-enhanced-scheduler.md)
- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)