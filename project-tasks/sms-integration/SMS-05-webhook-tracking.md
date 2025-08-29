# SMS-05: Webhook & Status Tracking

## Context
This task implements comprehensive webhook handling and real-time status tracking for SMS messages sent through the Orange Network API. The webhook system receives delivery status updates, processes inbound messages (including STOP requests), and maintains a complete audit trail of all SMS communications for healthcare compliance and monitoring purposes.

## Dependencies
- [`SMS-03`](SMS-03-orange-network-api.md): Orange Network API integration must be completed
- [`SMS-01`](SMS-01-database-schema.md): Database schema with webhook logging tables required

## Requirements

### 1. Webhook Controller Implementation
Create robust webhook endpoints that handle Orange Network delivery status updates and inbound message notifications with proper validation and error handling.

### 2. Delivery Status Processing
Implement real-time processing of delivery status updates from Orange Network, updating message records and triggering appropriate actions.

### 3. Inbound Message Handling
Process inbound SMS messages including STOP requests, opt-out handling, and patient reply management.

### 4. Webhook Security & Validation
Implement security measures including IP validation, request verification, and rate limiting for webhook endpoints.

### 5. Audit Logging System
Create comprehensive logging of all webhook interactions for compliance, debugging, and monitoring purposes.

### 6. Status Synchronization
Implement periodic status synchronization to handle missed webhooks and ensure data consistency.

## Code Examples

### SMS Webhooks Controller

```typescript
// backend/app/controllers/sms_webhooks_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import SMSMessage from '#models/sms_message'
import SMSWebhookLog from '#models/sms_webhook_log'
import SMSConsentService from '#services/sms_consent_service'
import Logger from '@adonisjs/core/logger'
import { DateTime } from 'luxon'

export default class SMSWebhooksController {
  private consentService: SMSConsentService

  constructor() {
    this.consentService = new SMSConsentService()
  }

  /**
   * Handle delivery status webhook from Orange Network
   */
  public async deliveryStatus({ request, response }: HttpContext) {
    const startTime = DateTime.now()
    let webhookLog: SMSWebhookLog | null = null

    try {
      // Log incoming webhook request
      webhookLog = await SMSWebhookLog.create({
        webhookType: 'delivery_status',
        requestHeaders: request.headers(),
        requestBody: request.body(),
        requestIp: request.ip(),
        processed: false
      })

      // Validate webhook source
      if (!this.validateWebhookSource(request.ip())) {
        Logger.warn(`Invalid webhook source IP: ${request.ip()}`)
        return response.status(403).send('Forbidden')
      }

      // Extract delivery information
      const deliveryNotification = request.body()?.deliveryInfoNotification
      if (!deliveryNotification) {
        Logger.error('Invalid delivery status webhook format')
        await this.updateWebhookLog(webhookLog, false, 'Invalid webhook format')
        return response.status(400).send('Invalid format')
      }

      // Process delivery status
      await this.processDeliveryStatus(deliveryNotification, webhookLog)

      // Update webhook log as processed
      await this.updateWebhookLog(webhookLog, true, 'Successfully processed')

      const processingTime = DateTime.now().diff(startTime).as('milliseconds')
      Logger.info(`Delivery status webhook processed in ${processingTime}ms`)

      return response.status(200).send('OK')

    } catch (error) {
      Logger.error('Delivery status webhook processing failed:', error)
      
      if (webhookLog) {
        await this.updateWebhookLog(webhookLog, false, error.message)
      }

      return response.status(500).send('Internal Server Error')
    }
  }

  /**
   * Handle inbound message webhook from Orange Network
   */
  public async inboundMessage({ request, response }: HttpContext) {
    const startTime = DateTime.now()
    let webhookLog: SMSWebhookLog | null = null

    try {
      // Log incoming webhook request
      webhookLog = await SMSWebhookLog.create({
        webhookType: 'inbound_message',
        requestHeaders: request.headers(),
        requestBody: request.body(),
        requestIp: request.ip(),
        processed: false
      })

      // Validate webhook source
      if (!this.validateWebhookSource(request.ip())) {
        Logger.warn(`Invalid webhook source IP: ${request.ip()}`)
        return response.status(403).send('Forbidden')
      }

      // Extract inbound message information
      const messageNotification = request.body()?.inboundSMSMessageNotification
      if (!messageNotification) {
        Logger.error('Invalid inbound message webhook format')
        await this.updateWebhookLog(webhookLog, false, 'Invalid webhook format')
        return response.status(400).send('Invalid format')
      }

      // Process inbound message
      await this.processInboundMessage(messageNotification, webhookLog)

      // Update webhook log as processed
      await this.updateWebhookLog(webhookLog, true, 'Successfully processed')

      const processingTime = DateTime.now().diff(startTime).as('milliseconds')
      Logger.info(`Inbound message webhook processed in ${processingTime}ms`)

      return response.status(200).send('OK')

    } catch (error) {
      Logger.error('Inbound message webhook processing failed:', error)
      
      if (webhookLog) {
        await this.updateWebhookLog(webhookLog, false, error.message)
      }

      return response.status(500).send('Internal Server Error')
    }
  }

  /**
   * Process delivery status update
   */
  private async processDeliveryStatus(
    deliveryNotification: any, 
    webhookLog: SMSWebhookLog
  ): Promise<void> {
    const deliveryInfo = deliveryNotification.deliveryInfo
    const callbackData = deliveryNotification.callbackData

    if (!deliveryInfo) {
      throw new Error('Missing delivery info in webhook')
    }

    // Extract phone number and status
    const phoneNumber = deliveryInfo.address?.replace('tel:', '')
    const deliveryStatus = deliveryInfo.deliveryStatus
    const description = deliveryInfo.description

    Logger.info(`Processing delivery status: ${phoneNumber} -> ${deliveryStatus}`)

    // Find SMS message by callback data or phone number
    let smsMessage: SMSMessage | null = null

    if (callbackData) {
      // Try to find by callback data first
      smsMessage = await SMSMessage.query()
        .where('callback_data', callbackData)
        .where('phone_number', phoneNumber)
        .orderBy('created_at', 'desc')
        .first()
    }

    if (!smsMessage && phoneNumber) {
      // Fallback to finding by phone number and recent timestamp
      smsMessage = await SMSMessage.query()
        .where('phone_number', phoneNumber)
        .where('status', 'sent')
        .where('sent_at', '>=', DateTime.now().minus({ hours: 24 }).toSQL())
        .orderBy('sent_at', 'desc')
        .first()
    }

    if (!smsMessage) {
      Logger.warn(`SMS message not found for delivery status: ${phoneNumber}`)
      return
    }

    // Update message status based on delivery status
    const updates: Partial<SMSMessage> = {
      deliveryStatus,
      deliveryDescription: description
    }

    switch (deliveryStatus) {
      case 'DeliveredToTerminal':
        updates.status = 'delivered'
        updates.deliveredAt = DateTime.now()
        break
      case 'DeliveryImpossible':
        updates.status = 'failed'
        updates.failedAt = DateTime.now()
        break
      case 'MessageWaiting':
        // Keep status as 'sent', just update delivery status
        break
      default:
        Logger.warn(`Unknown delivery status: ${deliveryStatus}`)
    }

    await smsMessage.merge(updates).save()

    // Update related notification if exists
    if (smsMessage.notificationId) {
      const { default: Notification } = await import('#models/notification')
      const notification = await Notification.find(smsMessage.notificationId)
      
      if (notification) {
        await notification.merge({
          smsDeliveryStatus: deliveryStatus,
          smsMessageId: smsMessage.id
        }).save()
      }
    }

    // Link webhook log to SMS message
    await webhookLog.merge({
      relatedSmsMessageId: smsMessage.id
    }).save()

    Logger.info(`Updated SMS message ${smsMessage.id} with delivery status: ${deliveryStatus}`)
  }

  /**
   * Process inbound message (STOP requests, replies)
   */
  private async processInboundMessage(
    messageNotification: any, 
    webhookLog: SMSWebhookLog
  ): Promise<void> {
    const inboundMessage = messageNotification.inboundSMSMessage

    if (!inboundMessage) {
      throw new Error('Missing inbound message in webhook')
    }

    const senderAddress = inboundMessage.senderAddress?.replace('tel:', '')
    const message = inboundMessage.message?.trim().toUpperCase()
    const messageId = inboundMessage.messageId
    const dateTime = inboundMessage.dateTime

    Logger.info(`Processing inbound message from ${senderAddress}: "${message}"`)

    // Handle STOP requests
    if (this.isStopRequest(message)) {
      await this.consentService.handleOptOut(senderAddress, 'sms_stop')
      Logger.info(`Processed STOP request from ${senderAddress}`)
    }
    // Handle START/RESUME requests
    else if (this.isStartRequest(message)) {
      await this.consentService.handleOptIn(senderAddress, 'sms_start')
      Logger.info(`Processed START request from ${senderAddress}`)
    }
    // Handle other replies
    else {
      Logger.info(`Received reply from ${senderAddress}: "${message}"`)
      // Could implement reply handling logic here
    }

    // Store inbound message for audit
    await this.storeInboundMessage({
      senderAddress,
      message: inboundMessage.message,
      messageId,
      dateTime,
      webhookLogId: webhookLog.id
    })
  }

  /**
   * Check if message is a STOP request
   */
  private isStopRequest(message: string): boolean {
    const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'ARRET']
    return stopKeywords.some(keyword => message.includes(keyword))
  }

  /**
   * Check if message is a START request
   */
  private isStartRequest(message: string): boolean {
    const startKeywords = ['START', 'SUBSCRIBE', 'YES', 'RESUME', 'COMMENCER']
    return startKeywords.some(keyword => message.includes(keyword))
  }

  /**
   * Store inbound message for audit
   */
  private async storeInboundMessage(data: {
    senderAddress: string
    message: string
    messageId: string
    dateTime: string
    webhookLogId: number
  }): Promise<void> {
    // Could create a separate inbound_messages table or use custom_data
    const { default: SMSCustomData } = await import('#models/sms_custom_data')
    
    await SMSCustomData.create({
      category: 'inbound_messages',
      key: `${data.messageId}_${Date.now()}`,
      value: {
        senderAddress: data.senderAddress,
        message: data.message,
        messageId: data.messageId,
        dateTime: data.dateTime,
        webhookLogId: data.webhookLogId,
        processedAt: DateTime.now().toISO()
      }
    })
  }

  /**
   * Validate webhook source IP
   */
  private validateWebhookSource(ip: string): boolean {
    // Orange Network webhook IP ranges (example)
    const allowedIpRanges = [
      '192.168.1.0/24',  // Example range
      '10.0.0.0/8',      // Example range
      '127.0.0.1'        // Localhost for testing
    ]

    // In production, implement proper IP range validation
    // For now, allow all IPs in development
    if (process.env.NODE_ENV === 'development') {
      return true
    }

    // Implement IP range checking logic here
    return allowedIpRanges.some(range => this.ipInRange(ip, range))
  }

  /**
   * Check if IP is in range (simplified implementation)
   */
  private ipInRange(ip: string, range: string): boolean {
    // Simplified IP range check - implement proper CIDR checking in production
    if (range.includes('/')) {
      const [network] = range.split('/')
      return ip.startsWith(network.split('.').slice(0, 3).join('.'))
    }
    return ip === range
  }

  /**
   * Update webhook log with processing result
   */
  private async updateWebhookLog(
    webhookLog: SMSWebhookLog, 
    processed: boolean, 
    message: string
  ): Promise<void> {
    await webhookLog.merge({
      processed,
      processingError: processed ? null : message,
      responseStatus: processed ? 200 : 500,
      responseBody: processed ? 'OK' : message
    }).save()
  }
}
```

### Webhook Status Synchronization Service

```typescript
// backend/app/services/sms_webhook_sync_service.ts
import { DateTime } from 'luxon'
import SMSMessage from '#models/sms_message'
import OrangeSMSProvider from './providers/orange_sms_provider.js'
import Logger from '@adonisjs/core/logger'

export default class SMSWebhookSyncService {
  private provider: OrangeSMSProvider

  constructor() {
    this.provider = new OrangeSMSProvider()
  }

  /**
   * Synchronize delivery status for messages missing webhook updates
   */
  public async syncMissingDeliveryStatus(): Promise<{
    checked: number
    updated: number
    errors: number
  }> {
    const stats = { checked: 0, updated: 0, errors: 0 }

    try {
      // Find messages sent but without final delivery status
      const pendingMessages = await SMSMessage.query()
        .where('status', 'sent')
        .whereNotIn('delivery_status', ['DeliveredToTerminal', 'DeliveryImpossible'])
        .where('sent_at', '>=', DateTime.now().minus({ days: 7 }).toSQL())
        .where('sent_at', '<=', DateTime.now().minus({ minutes: 30 }).toSQL()) // Allow 30 min for webhook
        .orderBy('sent_at', 'asc')
        .limit(100) // Process in batches

      Logger.info(`Syncing delivery status for ${pendingMessages.length} messages`)

      for (const message of pendingMessages) {
        try {
          stats.checked++

          // Query delivery status from Orange Network
          const response = await this.provider.queryDeliveryStatus(message.clientCorrelator)

          if (response.success && response.deliveryInfo && response.deliveryInfo.length > 0) {
            const deliveryInfo = response.deliveryInfo[0]
            const deliveryStatus = deliveryInfo.deliveryStatus

            // Update message if status changed
            if (deliveryStatus !== message.deliveryStatus) {
              const updates: Partial<SMSMessage> = {
                deliveryStatus,
                deliveryDescription: deliveryInfo.description
              }

              // Update final status
              if (deliveryStatus === 'DeliveredToTerminal') {
                updates.status = 'delivered'
                updates.deliveredAt = DateTime.now()
              } else if (deliveryStatus === 'DeliveryImpossible') {
                updates.status = 'failed'
                updates.failedAt = DateTime.now()
              }

              await message.merge(updates).save()
              stats.updated++

              Logger.info(`Synced delivery status for message ${message.id}: ${deliveryStatus}`)
            }
          }

          // Add delay to respect rate limits
          await this.delay(1000)

        } catch (error) {
          stats.errors++
          Logger.error(`Failed to sync delivery status for message ${message.id}:`, error)
        }
      }

      Logger.info(`Delivery status sync completed: ${stats.updated} updated, ${stats.errors} errors`)

    } catch (error) {
      Logger.error('Delivery status sync failed:', error)
      throw error
    }

    return stats
  }

  /**
   * Clean up old webhook logs
   */
  public async cleanupWebhookLogs(): Promise<number> {
    const cutoffDate = DateTime.now().minus({ days: 90 })

    const deletedCount = await (await import('#models/sms_webhook_log')).default
      .query()
      .where('created_at', '<', cutoffDate.toSQL())
      .delete()

    if (deletedCount > 0) {
      Logger.info(`Cleaned up ${deletedCount} old webhook logs`)
    }

    return deletedCount
  }

  /**
   * Get webhook processing statistics
   */
  public async getWebhookStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number
    processed: number
    failed: number
    deliveryStatus: number
    inboundMessage: number
    averageProcessingTime: number
  }> {
    const since = DateTime.now().minus({ [timeframe]: 1 })
    const SMSWebhookLog = await import('#models/sms_webhook_log')

    const [totalCount, processedCount, failedCount, deliveryCount, inboundCount] = await Promise.all([
      SMSWebhookLog.default.query().where('created_at', '>=', since.toSQL()).count('* as total').first(),
      SMSWebhookLog.default.query().where('created_at', '>=', since.toSQL()).where('processed', true).count('* as total').first(),
      SMSWebhookLog.default.query().where('created_at', '>=', since.toSQL()).where('processed', false).count('* as total').first(),
      SMSWebhookLog.default.query().where('created_at', '>=', since.toSQL()).where('webhook_type', 'delivery_status').count('* as total').first(),
      SMSWebhookLog.default.query().where('created_at', '>=', since.toSQL()).where('webhook_type', 'inbound_message').count('* as total').first()
    ])

    return {
      total: Number(totalCount?.total || 0),
      processed: Number(processedCount?.total || 0),
      failed: Number(failedCount?.total || 0),
      deliveryStatus: Number(deliveryCount?.total || 0),
      inboundMessage: Number(inboundCount?.total || 0),
      averageProcessingTime: 0 // Could calculate from processing timestamps
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Webhook Routes Configuration

```typescript
// backend/start/routes.ts (webhook routes)
import router from '@adonisjs/core/services/router'

// SMS webhook routes
router.group(() => {
  router.post('/delivery-status', '#controllers/sms_webhooks_controller.deliveryStatus')
  router.post('/inbound-message', '#controllers/sms_webhooks_controller.inboundMessage')
})
  .prefix('/api/sms/webhook')
  .middleware(['throttle:1000,1']) // High rate limit for webhooks
```

### Webhook Monitoring Command

```typescript
// backend/commands/sms_webhook_monitor_command.ts
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SMSWebhookSyncService from '#services/sms_webhook_sync_service'

export default class SMSWebhookMonitorCommand extends BaseCommand {
  static commandName = 'sms:webhook:monitor'
  static description = 'Monitor and sync webhook status'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const syncService = new SMSWebhookSyncService()

    this.logger.info('Starting webhook monitoring and sync...')

    try {
      // Sync missing delivery status
      const syncStats = await syncService.syncMissingDeliveryStatus()
      this.logger.info(`Sync completed: ${JSON.stringify(syncStats)}`)

      // Get webhook statistics
      const webhookStats = await syncService.getWebhookStats('day')
      this.logger.info(`Webhook stats: ${JSON.stringify(webhookStats)}`)

      // Cleanup old logs
      const cleanedUp = await syncService.cleanupWebhookLogs()
      this.logger.info(`Cleaned up ${cleanedUp} old webhook logs`)

    } catch (error) {
      this.logger.error('Webhook monitoring failed:', error)
      this.exitCode = 1
    }
  }
}
```

## Acceptance Criteria

1. **Webhook Endpoints**: Delivery status and inbound message webhooks are implemented and secured
2. **Real-time Updates**: SMS message status is updated in real-time from webhook notifications
3. **STOP Handling**: Inbound STOP requests are processed and patient consent is updated
4. **Security**: Webhook endpoints are secured with IP validation and rate limiting
5. **Audit Logging**: All webhook interactions are logged for compliance and debugging
6. **Status Sync**: Periodic synchronization handles missed webhooks
7. **Error Handling**: Comprehensive error handling with proper logging and recovery
8. **Monitoring**: Webhook processing statistics and health monitoring
9. **Cleanup**: Automated cleanup of old webhook logs
10. **Testing**: Webhook endpoints can be tested with mock data

## Implementation Notes

### Security Best Practices
- Validate webhook source IP addresses
- Implement request signature verification if available
- Use HTTPS for all webhook endpoints
- Rate limit webhook endpoints to prevent abuse
- Log all webhook requests for security monitoring

### Error Handling Strategy
- Handle malformed webhook payloads gracefully
- Implement retry logic for failed webhook processing
- Log all errors with sufficient context for debugging
- Provide fallback mechanisms for missed webhooks

### Performance Considerations
- Process webhooks asynchronously when possible
- Implement efficient database queries for status updates
- Use proper indexing for webhook log queries
- Batch process webhook synchronization operations

### Compliance Requirements
- Maintain complete audit trail of all webhook interactions
- Log all SMS status changes with timestamps
- Ensure HIPAA compliance for patient data handling
- Provide data retention and deletion capabilities

## Testing Requirements

### Unit Testing
- Test webhook payload processing with various formats
- Validate security checks and IP filtering
- Test STOP/START request handling
- Verify error handling scenarios

### Integration Testing
- Test webhook endpoints with Orange Network sandbox
- Verify database updates from webhook processing
- Test status synchronization functionality
- Validate audit logging completeness

### Security Testing
- Test webhook endpoint security measures
- Validate IP filtering and rate limiting
- Test with malformed and malicious payloads
- Verify audit trail integrity

## Related Documentation

- **Orange Network API**: [`SMS-03-orange-network-api.md`](SMS-03-orange-network-api.md)
- **Database Schema**: [`SMS-01-database-schema.md`](SMS-01-database-schema.md)
- **Patient Consent**: [`SMS-07-patient-consent.md`](SMS-07-patient-consent.md)
- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)