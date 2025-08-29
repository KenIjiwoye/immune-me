# SMS-04: Enhanced Scheduler Implementation

## Context
The Enhanced Scheduler Implementation extends the existing AdonisJS scheduler to support the three SMS reminder types (7-day before, 1-day before, 1-day after overdue) with precise timing, batch processing, and robust error handling. This task creates a comprehensive scheduling system that integrates with the SMS service layer to automate immunization reminders while respecting patient preferences and API rate limits.

## Dependencies
- [`SMS-02`](SMS-02-sms-service-layer.md): SMS service layer must be implemented
- [`SMS-03`](SMS-03-orange-network-api.md): Orange Network API integration required
- [`BE-06`](../backend/BE-06-notification-service.md): Existing notification service for integration

## Requirements

### 1. SMS Scheduler Service
Create a dedicated scheduler service that manages SMS message processing, batch operations, and timing calculations for the three reminder types.

### 2. Cron Job Implementation
Implement AdonisJS cron jobs that run at optimal intervals to process pending SMS messages and handle different reminder schedules.

### 3. Batch Processing System
Develop efficient batch processing to handle large volumes of SMS messages while respecting Orange Network API rate limits.

### 4. Timing Logic Enhancement
Implement precise timing calculations for the three reminder types with configurable scheduling windows and timezone support.

### 5. Error Recovery & Retry
Create robust error handling with intelligent retry mechanisms, dead letter queues, and failure notification systems.

### 6. Performance Monitoring
Implement comprehensive monitoring and metrics collection for scheduler performance and SMS delivery rates.

## Code Examples

### SMS Scheduler Service

```typescript
// backend/app/services/sms_scheduler_service.ts
import { DateTime } from 'luxon'
import SMSMessage from '#models/sms_message'
import SMSService from './sms_service.js'
import Logger from '@adonisjs/core/logger'

export interface SchedulerConfig {
  batchSize: number
  processingInterval: number
  maxRetries: number
  retryDelayMinutes: number
  deadLetterThreshold: number
}

export interface SchedulerStats {
  processed: number
  sent: number
  failed: number
  retried: number
  deadLettered: number
  processingTime: number
}

export default class SMSSchedulerService {
  private smsService: SMSService
  private config: SchedulerConfig
  private isProcessing: boolean = false

  constructor() {
    this.smsService = new SMSService()
    this.config = this.loadConfig()
  }

  /**
   * Process pending SMS messages in batches
   */
  public async processPendingMessages(): Promise<SchedulerStats> {
    if (this.isProcessing) {
      Logger.warn('SMS scheduler already processing, skipping this cycle')
      return this.getEmptyStats()
    }

    this.isProcessing = true
    const startTime = DateTime.now()
    const stats: SchedulerStats = this.getEmptyStats()

    try {
      Logger.info('Starting SMS scheduler processing cycle')

      // Get pending messages in batches
      const pendingMessages = await this.getPendingMessages()
      stats.processed = pendingMessages.length

      if (pendingMessages.length === 0) {
        Logger.info('No pending SMS messages to process')
        return stats
      }

      // Process messages in batches
      const batches = this.createBatches(pendingMessages, this.config.batchSize)
      
      for (const [batchIndex, batch] of batches.entries()) {
        Logger.info(`Processing SMS batch ${batchIndex + 1}/${batches.length} (${batch.length} messages)`)
        
        const batchStats = await this.processBatch(batch)
        this.mergeBatchStats(stats, batchStats)

        // Add delay between batches to respect rate limits
        if (batchIndex < batches.length - 1) {
          await this.delay(2000) // 2 second delay between batches
        }
      }

      stats.processingTime = DateTime.now().diff(startTime).as('milliseconds')
      Logger.info(`SMS scheduler completed: ${stats.sent} sent, ${stats.failed} failed, ${stats.retried} retried`)

    } catch (error) {
      Logger.error('SMS scheduler processing failed:', error)
      throw error
    } finally {
      this.isProcessing = false
    }

    return stats
  }

  /**
   * Process a batch of SMS messages
   */
  private async processBatch(messages: SMSMessage[]): Promise<SchedulerStats> {
    const stats = this.getEmptyStats()

    for (const message of messages) {
      try {
        await this.smsService.sendMessage(message)
        stats.sent++
        
        Logger.debug(`SMS message ${message.id} sent successfully`)
        
      } catch (error) {
        Logger.error(`Failed to send SMS message ${message.id}:`, error)
        
        const retryResult = await this.handleMessageFailure(message, error)
        if (retryResult.retried) {
          stats.retried++
        } else if (retryResult.deadLettered) {
          stats.deadLettered++
        } else {
          stats.failed++
        }
      }
    }

    return stats
  }

  /**
   * Handle message sending failure with retry logic
   */
  private async handleMessageFailure(
    message: SMSMessage, 
    error: any
  ): Promise<{ retried: boolean; deadLettered: boolean }> {
    const currentRetries = message.retryCount
    const maxRetries = this.config.maxRetries

    if (currentRetries < maxRetries) {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, currentRetries) * this.config.retryDelayMinutes
      const nextRetryTime = DateTime.now().plus({ minutes: retryDelay })

      await message.merge({
        retryCount: currentRetries + 1,
        scheduledAt: nextRetryTime,
        errorMessage: error.message,
        status: 'pending'
      }).save()

      Logger.info(`SMS message ${message.id} scheduled for retry ${currentRetries + 1}/${maxRetries} at ${nextRetryTime.toISO()}`)
      return { retried: true, deadLettered: false }

    } else if (currentRetries >= this.config.deadLetterThreshold) {
      // Move to dead letter queue
      await message.merge({
        status: 'dead_letter',
        errorMessage: `Max retries exceeded: ${error.message}`,
        failedAt: DateTime.now()
      }).save()

      Logger.error(`SMS message ${message.id} moved to dead letter queue after ${currentRetries} retries`)
      return { retried: false, deadLettered: true }

    } else {
      // Mark as permanently failed
      await message.merge({
        status: 'failed',
        errorMessage: error.message,
        failedAt: DateTime.now()
      }).save()

      Logger.error(`SMS message ${message.id} marked as permanently failed`)
      return { retried: false, deadLettered: false }
    }
  }

  /**
   * Get pending SMS messages ready for processing
   */
  private async getPendingMessages(): Promise<SMSMessage[]> {
    const now = DateTime.now()
    
    return await SMSMessage.query()
      .where('status', 'pending')
      .where('scheduled_at', '<=', now.toSQL())
      .orderBy('scheduled_at', 'asc')
      .orderBy('created_at', 'asc')
      .limit(this.config.batchSize * 5) // Get more than one batch worth
  }

  /**
   * Schedule daily reminder processing
   */
  public async scheduleDailyReminders(): Promise<void> {
    Logger.info('Starting daily SMS reminder scheduling')

    try {
      // Generate new notifications (this triggers SMS scheduling)
      const notificationService = new (await import('./notification_service.js')).default()
      const newNotifications = await notificationService.generateDueNotifications()

      Logger.info(`Scheduled SMS reminders for ${newNotifications.length} new notifications`)

      // Clean up old processed messages
      await this.cleanupOldMessages()

    } catch (error) {
      Logger.error('Daily SMS reminder scheduling failed:', error)
      throw error
    }
  }

  /**
   * Process overdue reminders specifically
   */
  public async processOverdueReminders(): Promise<void> {
    Logger.info('Processing overdue SMS reminders')

    const overdueMessages = await SMSMessage.query()
      .where('message_type', 'overdue_reminder')
      .where('status', 'pending')
      .where('scheduled_at', '<=', DateTime.now().toSQL())
      .orderBy('scheduled_at', 'asc')

    if (overdueMessages.length === 0) {
      Logger.info('No overdue SMS reminders to process')
      return
    }

    const batches = this.createBatches(overdueMessages, this.config.batchSize)
    
    for (const batch of batches) {
      await this.processBatch(batch)
      await this.delay(2000) // Delay between batches
    }

    Logger.info(`Processed ${overdueMessages.length} overdue SMS reminders`)
  }

  /**
   * Cleanup old processed messages
   */
  private async cleanupOldMessages(): Promise<void> {
    const cutoffDate = DateTime.now().minus({ days: 30 })

    const deletedCount = await SMSMessage.query()
      .whereIn('status', ['delivered', 'failed', 'cancelled'])
      .where('created_at', '<', cutoffDate.toSQL())
      .delete()

    if (deletedCount > 0) {
      Logger.info(`Cleaned up ${deletedCount} old SMS messages`)
    }
  }

  /**
   * Get scheduler health status
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean
    pendingCount: number
    failedCount: number
    lastProcessed: DateTime | null
    issues: string[]
  }> {
    const issues: string[] = []

    // Check pending message count
    const pendingCount = await SMSMessage.query()
      .where('status', 'pending')
      .count('* as total')
      .first()

    const pendingTotal = Number(pendingCount?.total || 0)

    // Check failed message count in last hour
    const failedCount = await SMSMessage.query()
      .where('status', 'failed')
      .where('failed_at', '>=', DateTime.now().minus({ hours: 1 }).toSQL())
      .count('* as total')
      .first()

    const failedTotal = Number(failedCount?.total || 0)

    // Check last processed message
    const lastProcessed = await SMSMessage.query()
      .whereIn('status', ['sent', 'delivered'])
      .orderBy('sent_at', 'desc')
      .first()

    // Identify issues
    if (pendingTotal > 1000) {
      issues.push(`High pending message count: ${pendingTotal}`)
    }

    if (failedTotal > 50) {
      issues.push(`High failure rate: ${failedTotal} failures in last hour`)
    }

    if (!lastProcessed || DateTime.now().diff(lastProcessed.sentAt || DateTime.now()).as('hours') > 2) {
      issues.push('No messages processed in last 2 hours')
    }

    if (this.isProcessing) {
      issues.push('Scheduler appears to be stuck in processing state')
    }

    return {
      healthy: issues.length === 0,
      pendingCount: pendingTotal,
      failedCount: failedTotal,
      lastProcessed: lastProcessed?.sentAt || null,
      issues
    }
  }

  /**
   * Get scheduler statistics
   */
  public async getStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    sent: number
    delivered: number
    failed: number
    pending: number
    averageDeliveryTime: number
  }> {
    const since = DateTime.now().minus({ [timeframe]: 1 })

    const [sentCount, deliveredCount, failedCount, pendingCount] = await Promise.all([
      SMSMessage.query().where('status', 'sent').where('sent_at', '>=', since.toSQL()).count('* as total').first(),
      SMSMessage.query().where('status', 'delivered').where('delivered_at', '>=', since.toSQL()).count('* as total').first(),
      SMSMessage.query().where('status', 'failed').where('failed_at', '>=', since.toSQL()).count('* as total').first(),
      SMSMessage.query().where('status', 'pending').count('* as total').first()
    ])

    // Calculate average delivery time
    const deliveredMessages = await SMSMessage.query()
      .where('status', 'delivered')
      .whereNotNull('sent_at')
      .whereNotNull('delivered_at')
      .where('delivered_at', '>=', since.toSQL())
      .select('sent_at', 'delivered_at')

    let averageDeliveryTime = 0
    if (deliveredMessages.length > 0) {
      const totalDeliveryTime = deliveredMessages.reduce((sum, msg) => {
        const deliveryTime = DateTime.fromJSDate(msg.deliveredAt).diff(DateTime.fromJSDate(msg.sentAt)).as('seconds')
        return sum + deliveryTime
      }, 0)
      averageDeliveryTime = totalDeliveryTime / deliveredMessages.length
    }

    return {
      sent: Number(sentCount?.total || 0),
      delivered: Number(deliveredCount?.total || 0),
      failed: Number(failedCount?.total || 0),
      pending: Number(pendingCount?.total || 0),
      averageDeliveryTime
    }
  }

  // Utility methods
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private mergeBatchStats(total: SchedulerStats, batch: SchedulerStats): void {
    total.sent += batch.sent
    total.failed += batch.failed
    total.retried += batch.retried
    total.deadLettered += batch.deadLettered
  }

  private getEmptyStats(): SchedulerStats {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      retried: 0,
      deadLettered: 0,
      processingTime: 0
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private loadConfig(): SchedulerConfig {
    return {
      batchSize: parseInt(process.env.SMS_BATCH_SIZE || '50', 10),
      processingInterval: parseInt(process.env.SMS_PROCESSING_INTERVAL_MINUTES || '5', 10),
      maxRetries: parseInt(process.env.SMS_MAX_RETRIES || '3', 10),
      retryDelayMinutes: parseInt(process.env.SMS_RETRY_DELAY_MINUTES || '5', 10),
      deadLetterThreshold: parseInt(process.env.SMS_DEAD_LETTER_THRESHOLD || '5', 10)
    }
  }
}
```

### AdonisJS Cron Jobs

```typescript
// backend/start/scheduler.ts (enhanced)
import scheduler from 'adonisjs-scheduler/services/main'
import SMSSchedulerService from '#services/sms_scheduler_service'
import Logger from '@adonisjs/core/logger'

// Initialize SMS scheduler service
const smsScheduler = new SMSSchedulerService()

/**
 * Process pending SMS messages every 5 minutes
 */
scheduler
  .call(async () => {
    try {
      const stats = await smsScheduler.processPendingMessages()
      Logger.info(`SMS processing completed: ${JSON.stringify(stats)}`)
    } catch (error) {
      Logger.error('SMS processing job failed:', error)
    }
  })
  .everyFiveMinutes()
  .name('process_pending_sms')

/**
 * Schedule daily reminders at 6 AM
 */
scheduler
  .call(async () => {
    try {
      await smsScheduler.scheduleDailyReminders()
      Logger.info('Daily SMS reminder scheduling completed')
    } catch (error) {
      Logger.error('Daily SMS reminder scheduling failed:', error)
    }
  })
  .dailyAt('06:00')
  .name('schedule_daily_sms_reminders')

/**
 * Process overdue reminders at 2 PM daily
 */
scheduler
  .call(async () => {
    try {
      await smsScheduler.processOverdueReminders()
      Logger.info('Overdue SMS reminder processing completed')
    } catch (error) {
      Logger.error('Overdue SMS reminder processing failed:', error)
    }
  })
  .dailyAt('14:00')
  .name('process_overdue_sms_reminders')

/**
 * Health check every 30 minutes
 */
scheduler
  .call(async () => {
    try {
      const health = await smsScheduler.getHealthStatus()
      
      if (!health.healthy) {
        Logger.warn(`SMS scheduler health issues: ${health.issues.join(', ')}`)
        // Could send alerts here
      } else {
        Logger.debug('SMS scheduler health check passed')
      }
    } catch (error) {
      Logger.error('SMS scheduler health check failed:', error)
    }
  })
  .everyThirtyMinutes()
  .name('sms_scheduler_health_check')

/**
 * Generate statistics report daily at midnight
 */
scheduler
  .call(async () => {
    try {
      const stats = await smsScheduler.getStatistics('day')
      Logger.info(`Daily SMS statistics: ${JSON.stringify(stats)}`)
    } catch (error) {
      Logger.error('SMS statistics generation failed:', error)
    }
  })
  .dailyAt('00:00')
  .name('generate_sms_statistics')
```

### SMS Scheduler Command

```typescript
// backend/commands/sms_scheduler_command.ts
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SMSSchedulerService from '#services/sms_scheduler_service'

export default class SMSSchedulerCommand extends BaseCommand {
  static commandName = 'sms:process'
  static description = 'Process pending SMS messages manually'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const scheduler = new SMSSchedulerService()

    this.logger.info('Starting manual SMS processing...')

    try {
      const stats = await scheduler.processPendingMessages()
      
      this.logger.info('SMS processing completed successfully')
      this.logger.info(`Statistics: ${JSON.stringify(stats, null, 2)}`)
      
    } catch (error) {
      this.logger.error('SMS processing failed:', error)
      this.exitCode = 1
    }
  }
}
```

### SMS Health Check Command

```typescript
// backend/commands/sms_health_command.ts
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SMSSchedulerService from '#services/sms_scheduler_service'

export default class SMSHealthCommand extends BaseCommand {
  static commandName = 'sms:health'
  static description = 'Check SMS scheduler health status'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const scheduler = new SMSSchedulerService()

    this.logger.info('Checking SMS scheduler health...')

    try {
      const health = await scheduler.getHealthStatus()
      
      if (health.healthy) {
        this.logger.info('✅ SMS scheduler is healthy')
      } else {
        this.logger.warn('⚠️  SMS scheduler has issues:')
        health.issues.forEach(issue => this.logger.warn(`  - ${issue}`))
      }

      this.logger.info(`Pending messages: ${health.pendingCount}`)
      this.logger.info(`Failed messages (last hour): ${health.failedCount}`)
      this.logger.info(`Last processed: ${health.lastProcessed?.toISO() || 'Never'}`)
      
    } catch (error) {
      this.logger.error('Health check failed:', error)
      this.exitCode = 1
    }
  }
}
```

### Enhanced Timing Configuration

```typescript
// backend/config/sms_scheduler.ts
import env from '#start/env'
import { DateTime } from 'luxon'

export interface ReminderTiming {
  type: '7_day_reminder' | '1_day_reminder' | 'overdue_reminder'
  offsetDays: number
  timeOfDay: { hour: number; minute: number }
  timezone: string
}

export default {
  // Processing configuration
  processing: {
    batchSize: env.get('SMS_BATCH_SIZE', 50),
    intervalMinutes: env.get('SMS_PROCESSING_INTERVAL_MINUTES', 5),
    maxRetries: env.get('SMS_MAX_RETRIES', 3),
    retryDelayMinutes: env.get('SMS_RETRY_DELAY_MINUTES', 5),
    deadLetterThreshold: env.get('SMS_DEAD_LETTER_THRESHOLD', 5)
  },

  // Reminder timing configuration
  reminders: {
    sevenDay: {
      type: '7_day_reminder',
      offsetDays: -7,
      timeOfDay: { hour: 9, minute: 0 },
      timezone: env.get('APP_TIMEZONE', 'UTC')
    } as ReminderTiming,

    oneDay: {
      type: '1_day_reminder',
      offsetDays: -1,
      timeOfDay: { hour: 9, minute: 0 },
      timezone: env.get('APP_TIMEZONE', 'UTC')
    } as ReminderTiming,

    overdue: {
      type: 'overdue_reminder',
      offsetDays: 1,
      timeOfDay: { hour: 14, minute: 0 },
      timezone: env.get('APP_TIMEZONE', 'UTC')
    } as ReminderTiming
  },

  // Cleanup configuration
  cleanup: {
    retentionDays: env.get('SMS_RETENTION_DAYS', 30),
    batchSize: env.get('SMS_CLEANUP_BATCH_SIZE', 1000)
  },

  // Monitoring configuration
  monitoring: {
    healthCheckInterval: env.get('SMS_HEALTH_CHECK_INTERVAL_MINUTES', 30),
    alertThresholds: {
      pendingMessages: env.get('SMS_ALERT_PENDING_THRESHOLD', 1000),
      failureRate: env.get('SMS_ALERT_FAILURE_RATE', 0.1), // 10%
      processingDelay: env.get('SMS_ALERT_PROCESSING_DELAY_MINUTES', 120)
    }
  }
}
```

## Acceptance Criteria

1. **Cron Jobs Configured**: AdonisJS scheduler runs SMS processing jobs at correct intervals
2. **Batch Processing**: Messages are processed in configurable batches with rate limiting
3. **Three Reminder Types**: 7-day, 1-day, and overdue reminders are scheduled correctly
4. **Error Handling**: Failed messages are retried with exponential backoff
5. **Dead Letter Queue**: Messages exceeding retry limits are moved to dead letter status
6. **Health Monitoring**: Scheduler health status is monitored and reported
7. **Performance Metrics**: Statistics are collected and reported for monitoring
8. **Manual Commands**: CLI commands available for manual processing and health checks
9. **Cleanup Process**: Old processed messages are automatically cleaned up
10. **Configuration**: All timing and processing parameters are configurable

## Implementation Notes

### Scheduling Best Practices
- Use appropriate cron intervals to balance timeliness and resource usage
- Implement proper locking to prevent concurrent processing
- Handle timezone considerations for reminder timing
- Provide manual override capabilities for emergency processing

### Performance Optimization
- Process messages in optimal batch sizes
- Implement efficient database queries with proper indexing
- Use connection pooling for database operations
- Monitor memory usage during batch processing

### Error Handling Strategy
- Implement exponential backoff for transient failures
- Distinguish between retryable and permanent failures
- Provide detailed error logging for debugging
- Implement dead letter queue for failed messages

### Monitoring & Alerting
- Track processing times and throughput
- Monitor failure rates and error patterns
- Alert on scheduler health issues
- Provide dashboard metrics for operations team

## Testing Requirements

### Unit Testing
- Test batch processing logic with various message counts
- Validate timing calculations for all reminder types
- Test error handling and retry mechanisms
- Verify cleanup and maintenance operations

### Integration Testing
- Test cron job execution and scheduling
- Verify SMS service integration
- Test database operations under load
- Validate error recovery scenarios

### Performance Testing
- Test batch processing with large message volumes
- Validate memory usage during processing
- Test concurrent job execution
- Measure processing throughput and latency

## Related Documentation

- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Orange Network API**: [`SMS-03-orange-network-api.md`](SMS-03-orange-network-api.md)
- **Webhook & Status Tracking**: [`SMS-05-webhook-tracking.md`](SMS-05-webhook-tracking.md)
- **Existing Notification Service**: [`../backend/BE-06-notification-service.md`](../backend/BE-06-notification-service.md)