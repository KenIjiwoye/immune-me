# SMS Delivery Tracking and Webhook Implementation

## Overview

This document details the implementation of SMS delivery tracking using Orange Network's webhook system. Proper delivery tracking is essential for monitoring message success rates, handling failures, and maintaining audit trails for healthcare communications.

## Delivery Status Lifecycle

### Message Status Flow

```
[Scheduled] → [Pending] → [Sent] → [DeliveredToNetwork] → [DeliveredToTerminal]
                ↓              ↓                    ↓
            [Cancelled]    [Failed]         [DeliveryImpossible]
                                                    ↓
                                            [MessageWaiting]
```

### Status Definitions

#### Internal System Status
- **Scheduled**: Message queued for future sending
- **Pending**: Message ready to be sent to Orange Network API
- **Sent**: Successfully submitted to Orange Network API
- **Cancelled**: Message cancelled before sending
- **Failed**: System-level failure (API error, network issue)

#### Orange Network Delivery Status
- **DeliveredToNetwork**: Accepted by mobile network operator
- **DeliveredToTerminal**: Successfully delivered to recipient's device
- **DeliveryImpossible**: Permanent delivery failure
- **MessageWaiting**: Queued due to device being offline
- **DeliveredToGateway**: Reached SMS gateway but not yet delivered
- **DeliveryUncertain**: Status cannot be determined

## Webhook Implementation

### Webhook Endpoints

#### 1. Delivery Status Webhook

**Endpoint**: `POST /api/sms/webhook/delivery-status`

**Purpose**: Receive real-time delivery status updates from Orange Network

```typescript
// backend/app/controllers/sms_webhooks_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import SMSMessage from '#models/sms_message'
import SMSWebhookLog from '#models/sms_webhook_log'
import Logger from '@adonisjs/core/services/logger'

export default class SMSWebhooksController {
  /**
   * Handle delivery status notifications from Orange Network
   */
  async deliveryStatus({ request, response }: HttpContext) {
    const startTime = Date.now()
    let webhookLog: SMSWebhookLog | null = null
    
    try {
      // Log incoming webhook for audit
      webhookLog = await SMSWebhookLog.create({
        webhookType: 'delivery_status',
        requestHeaders: request.headers(),
        requestBody: request.body(),
        requestIp: request.ip()
      })

      const webhookData = request.body()
      const deliveryInfo = webhookData.deliveryInfoNotification?.deliveryInfo
      
      if (!deliveryInfo) {
        throw new Error('Invalid webhook payload: missing deliveryInfo')
      }

      // Extract callback data to identify the message
      const callbackData = webhookData.deliveryInfoNotification?.callbackData
      const phoneNumber = this.normalizePhoneNumber(deliveryInfo.address)
      
      // Find the SMS message
      const smsMessage = await this.findSMSMessage(callbackData, phoneNumber)
      
      if (smsMessage) {
        await this.updateMessageDeliveryStatus(smsMessage, deliveryInfo)
        
        // Update webhook log with success
        webhookLog.processed = true
        webhookLog.relatedSmsMessageId = smsMessage.id
        await webhookLog.save()
        
        Logger.info('Delivery status updated', {
          messageId: smsMessage.id,
          status: deliveryInfo.deliveryStatus,
          phoneNumber: phoneNumber
        })
      } else {
        Logger.warn('SMS message not found for delivery status', {
          callbackData,
          phoneNumber
        })
      }

      return response.status(200).send('OK')
      
    } catch (error) {
      Logger.error('Webhook processing failed', {
        error: error.message,
        requestBody: request.body()
      })
      
      // Update webhook log with error
      if (webhookLog) {
        webhookLog.processingError = error.message
        await webhookLog.save()
      }
      
      // Return 200 to prevent Orange Network retries for permanent errors
      return response.status(200).send('ERROR')
    } finally {
      // Log processing time
      const processingTime = Date.now() - startTime
      Logger.info('Webhook processing completed', { processingTime })
    }
  }

  /**
   * Find SMS message by callback data or phone number
   */
  private async findSMSMessage(callbackData: string, phoneNumber: string): Promise<SMSMessage | null> {
    // Try to find by callback data first (most reliable)
    if (callbackData) {
      const message = await SMSMessage.query()
        .where('callbackData', callbackData)
        .where('phoneNumber', phoneNumber)
        .first()
      
      if (message) return message
    }
    
    // Fallback: find by phone number and recent timestamp
    return SMSMessage.query()
      .where('phoneNumber', phoneNumber)
      .where('status', 'sent')
      .where('sentAt', '>', DateTime.now().minus({ hours: 24 }).toSQL())
      .orderBy('sentAt', 'desc')
      .first()
  }

  /**
   * Update message delivery status
   */
  private async updateMessageDeliveryStatus(
    smsMessage: SMSMessage, 
    deliveryInfo: any
  ): Promise<void> {
    const oldStatus = smsMessage.status
    const newDeliveryStatus = deliveryInfo.deliveryStatus
    
    // Update delivery status from Orange Network
    smsMessage.deliveryStatus = newDeliveryStatus
    smsMessage.deliveryDescription = deliveryInfo.description
    
    // Update internal status based on delivery status
    switch (newDeliveryStatus) {
      case 'DeliveredToTerminal':
        smsMessage.status = 'delivered'
        smsMessage.deliveredAt = DateTime.now()
        break
        
      case 'DeliveryImpossible':
        smsMessage.status = 'failed'
        smsMessage.failedAt = DateTime.now()
        smsMessage.errorMessage = deliveryInfo.description
        break
        
      case 'DeliveredToNetwork':
      case 'DeliveredToGateway':
      case 'MessageWaiting':
        // Keep status as 'sent' but update delivery status
        break
        
      case 'DeliveryUncertain':
        // Log for manual investigation but don't change status
        Logger.warn('Delivery status uncertain', {
          messageId: smsMessage.id,
          phoneNumber: smsMessage.phoneNumber
        })
        break
    }
    
    await smsMessage.save()
    
    // Trigger additional processing if needed
    if (oldStatus !== smsMessage.status) {
      await this.handleStatusChange(smsMessage, oldStatus)
    }
  }

  /**
   * Handle status change side effects
   */
  private async handleStatusChange(smsMessage: SMSMessage, oldStatus: string): Promise<void> {
    switch (smsMessage.status) {
      case 'delivered':
        // Update related notification status
        if (smsMessage.notificationId) {
          const notification = await smsMessage.related('notification').query().first()
          if (notification) {
            notification.smsDeliveryStatus = 'delivered'
            await notification.save()
          }
        }
        break
        
      case 'failed':
        // Consider retry logic or alternative notification methods
        await this.handleDeliveryFailure(smsMessage)
        break
    }
  }

  /**
   * Handle delivery failures
   */
  private async handleDeliveryFailure(smsMessage: SMSMessage): Promise<void> {
    // Log failure for analysis
    Logger.error('SMS delivery failed', {
      messageId: smsMessage.id,
      phoneNumber: smsMessage.phoneNumber,
      error: smsMessage.errorMessage,
      retryCount: smsMessage.retryCount
    })
    
    // Consider retry for certain failure types
    if (this.shouldRetry(smsMessage)) {
      await this.scheduleRetry(smsMessage)
    } else {
      // Mark as permanently failed and consider alternative notification
      await this.handlePermanentFailure(smsMessage)
    }
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(address: string): string {
    // Remove 'tel:' prefix if present
    return address.replace(/^tel:/, '')
  }
}
```

#### 2. Inbound Message Webhook

**Endpoint**: `POST /api/sms/webhook/inbound-message`

**Purpose**: Handle inbound SMS messages (STOP requests, replies)

```typescript
/**
 * Handle inbound SMS messages (STOP requests, replies)
 */
async inboundMessage({ request, response }: HttpContext) {
  try {
    // Log incoming webhook
    await SMSWebhookLog.create({
      webhookType: 'inbound_message',
      requestHeaders: request.headers(),
      requestBody: request.body(),
      requestIp: request.ip(),
      processed: true
    })

    const webhookData = request.body()
    const inboundMessage = webhookData.inboundSMSMessageNotification?.inboundSMSMessage
    
    if (inboundMessage) {
      await this.processInboundMessage(inboundMessage)
    }

    return response.status(200).send('OK')
    
  } catch (error) {
    Logger.error('Inbound message processing failed', {
      error: error.message,
      requestBody: request.body()
    })
    
    return response.status(200).send('ERROR')
  }
}

/**
 * Process inbound SMS messages
 */
private async processInboundMessage(inboundMessage: any): Promise<void> {
  const phoneNumber = this.normalizePhoneNumber(inboundMessage.senderAddress)
  const messageText = inboundMessage.message?.trim().toUpperCase()
  const receivedAt = DateTime.fromISO(inboundMessage.dateTime)
  
  // Handle STOP requests
  if (messageText === 'STOP' || messageText === 'UNSUBSCRIBE') {
    await this.handleOptOut(phoneNumber, receivedAt)
  }
  
  // Handle START requests (re-opt-in)
  else if (messageText === 'START' || messageText === 'SUBSCRIBE') {
    await this.handleOptIn(phoneNumber, receivedAt)
  }
  
  // Log other messages for potential manual review
  else {
    Logger.info('Inbound SMS received', {
      phoneNumber,
      message: messageText,
      receivedAt: receivedAt.toISO()
    })
  }
}

/**
 * Handle opt-out requests
 */
private async handleOptOut(phoneNumber: string, receivedAt: DateTime): Promise<void> {
  // Find patient by phone number
  const patient = await Patient.query()
    .where('primaryPhone', phoneNumber)
    .orWhere('secondaryPhone', phoneNumber)
    .first()
  
  if (patient) {
    // Update or create consent record
    const consent = await SMSConsent.updateOrCreate(
      { patientId: patient.id, phoneNumber },
      {
        optedOut: true,
        optOutDate: receivedAt,
        optOutMethod: 'sms_stop'
      }
    )
    
    // Cancel any pending SMS messages for this patient
    await SMSMessage.query()
      .where('patientId', patient.id)
      .where('phoneNumber', phoneNumber)
      .whereIn('status', ['scheduled', 'pending'])
      .update({ 
        status: 'cancelled',
        errorMessage: 'Patient opted out via SMS'
      })
    
    Logger.info('Patient opted out via SMS', {
      patientId: patient.id,
      phoneNumber,
      optOutDate: receivedAt.toISO()
    })
  }
}
```

### Webhook Security

#### IP Whitelist Validation
```typescript
// backend/app/middleware/webhook_security_middleware.ts
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'

export default class WebhookSecurityMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const clientIP = request.ip()
    
    // Orange Network IP ranges (example - verify with Orange Network)
    const allowedIPRanges = [
      '41.202.219.0/24',
      '41.202.220.0/24',
      '196.200.96.0/24'
    ]
    
    if (!this.isIPAllowed(clientIP, allowedIPRanges)) {
      Logger.warn('Webhook request from unauthorized IP', { clientIP })
      return response.status(403).send('Forbidden')
    }
    
    await next()
  }
  
  private isIPAllowed(ip: string, allowedRanges: string[]): boolean {
    // Implement IP range checking logic
    // This is a simplified example - use a proper IP range library
    return allowedRanges.some(range => this.ipInRange(ip, range))
  }
}
```

#### Request Validation
```typescript
// Webhook request validation
async validateWebhookRequest(request: any): Promise<boolean> {
  // Validate required headers
  const contentType = request.header('content-type')
  if (!contentType?.includes('application/json')) {
    return false
  }
  
  // Validate request structure
  const body = request.body()
  if (!body || typeof body !== 'object') {
    return false
  }
  
  // Validate Orange Network webhook signature if provided
  const signature = request.header('x-orange-signature')
  if (signature && !this.verifySignature(body, signature)) {
    return false
  }
  
  return true
}
```

## Status Polling Implementation

### Backup Status Checking

For messages that don't receive webhook notifications, implement polling:

```typescript
// backend/app/services/sms_status_polling_service.ts
export default class SMSStatusPollingService {
  private orangeProvider: OrangeSMSProvider

  constructor() {
    this.orangeProvider = new OrangeSMSProvider()
  }

  /**
   * Poll delivery status for messages without recent updates
   */
  async pollPendingMessages(): Promise<void> {
    // Find messages sent but without delivery status update in last hour
    const pendingMessages = await SMSMessage.query()
      .where('status', 'sent')
      .where('sentAt', '<', DateTime.now().minus({ hours: 1 }).toSQL())
      .whereNull('deliveryStatus')
      .limit(50) // Process in batches
    
    for (const message of pendingMessages) {
      try {
        const deliveryStatus = await this.orangeProvider.checkDeliveryStatus(
          message.clientCorrelator
        )
        
        if (deliveryStatus) {
          await this.updateMessageFromPolling(message, deliveryStatus)
        }
        
        // Rate limiting - wait between requests
        await this.sleep(200) // 200ms delay
        
      } catch (error) {
        Logger.error('Status polling failed', {
          messageId: message.id,
          error: error.message
        })
      }
    }
  }

  private async updateMessageFromPolling(
    message: SMSMessage, 
    deliveryStatus: any
  ): Promise<void> {
    // Similar logic to webhook processing
    const deliveryInfo = deliveryStatus.deliveryInfoList?.deliveryInfo?.[0]
    
    if (deliveryInfo) {
      message.deliveryStatus = deliveryInfo.deliveryStatus
      message.deliveryDescription = deliveryInfo.description
      
      // Update internal status
      if (deliveryInfo.deliveryStatus === 'DeliveredToTerminal') {
        message.status = 'delivered'
        message.deliveredAt = DateTime.now()
      } else if (deliveryInfo.deliveryStatus === 'DeliveryImpossible') {
        message.status = 'failed'
        message.failedAt = DateTime.now()
      }
      
      await message.save()
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Scheduled Polling Job

```typescript
// backend/start/scheduler.ts (addition)
import SMSStatusPollingService from '#services/sms_status_polling_service'

// Poll SMS delivery status every 30 minutes
scheduler.addCronJob('poll-sms-status', '*/30 * * * *', async () => {
  const pollingService = new SMSStatusPollingService()
  await pollingService.pollPendingMessages()
})
```

## Retry Logic Implementation

### Retry Strategy

```typescript
// backend/app/services/sms_retry_service.ts
export default class SMSRetryService {
  /**
   * Determine if message should be retried
   */
  shouldRetry(smsMessage: SMSMessage): boolean {
    // Don't retry if already attempted max times
    if (smsMessage.retryCount >= 3) return false
    
    // Don't retry permanent failures
    const permanentFailures = [
      'DeliveryImpossible',
      'Invalid phone number',
      'Blocked number'
    ]
    
    if (permanentFailures.some(failure => 
      smsMessage.deliveryDescription?.includes(failure)
    )) {
      return false
    }
    
    // Retry temporary failures
    const retryableFailures = [
      'Network timeout',
      'Temporary service unavailable',
      'Rate limit exceeded'
    ]
    
    return retryableFailures.some(failure =>
      smsMessage.errorMessage?.includes(failure) ||
      smsMessage.deliveryDescription?.includes(failure)
    )
  }

  /**
   * Schedule message retry with exponential backoff
   */
  async scheduleRetry(smsMessage: SMSMessage): Promise<void> {
    const retryCount = smsMessage.retryCount + 1
    const backoffMinutes = Math.pow(2, retryCount) * 5 // 5, 10, 20 minutes
    const retryAt = DateTime.now().plus({ minutes: backoffMinutes })
    
    // Create new message for retry
    const retryMessage = await SMSMessage.create({
      ...smsMessage.toJSON(),
      id: undefined, // Let database generate new ID
      retryCount,
      scheduledAt: retryAt,
      status: 'scheduled',
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      deliveryStatus: null,
      deliveryDescription: null,
      errorMessage: null,
      clientCorrelator: this.generateNewCorrelator(smsMessage.clientCorrelator)
    })
    
    // Mark original as retry scheduled
    smsMessage.status = 'retry_scheduled'
    await smsMessage.save()
    
    Logger.info('SMS retry scheduled', {
      originalMessageId: smsMessage.id,
      retryMessageId: retryMessage.id,
      retryCount,
      retryAt: retryAt.toISO()
    })
  }

  private generateNewCorrelator(originalCorrelator: string): string {
    const timestamp = Date.now()
    return `${originalCorrelator}_retry_${timestamp}`
  }
}
```

## Monitoring and Alerting

### Delivery Metrics

```typescript
// backend/app/services/sms_metrics_service.ts
export default class SMSMetricsService {
  /**
   * Calculate delivery success rate
   */
  async getDeliveryMetrics(timeRange: { start: DateTime, end: DateTime }) {
    const totalMessages = await SMSMessage.query()
      .whereBetween('sentAt', [timeRange.start.toSQL(), timeRange.end.toSQL()])
      .count('* as total')
    
    const deliveredMessages = await SMSMessage.query()
      .whereBetween('sentAt', [timeRange.start.toSQL(), timeRange.end.toSQL()])
      .where('status', 'delivered')
      .count('* as delivered')
    
    const failedMessages = await SMSMessage.query()
      .whereBetween('sentAt', [timeRange.start.toSQL(), timeRange.end.toSQL()])
      .where('status', 'failed')
      .count('* as failed')
    
    const total = totalMessages[0].total
    const delivered = deliveredMessages[0].delivered
    const failed = failedMessages[0].failed
    
    return {
      total,
      delivered,
      failed,
      pending: total - delivered - failed,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0
    }
  }

  /**
   * Get delivery status distribution
   */
  async getDeliveryStatusDistribution(timeRange: { start: DateTime, end: DateTime }) {
    const statusCounts = await SMSMessage.query()
      .whereBetween('sentAt', [timeRange.start.toSQL(), timeRange.end.toSQL()])
      .groupBy('deliveryStatus')
      .count('* as count')
      .select('deliveryStatus')
    
    return statusCounts.reduce((acc, row) => {
      acc[row.deliveryStatus || 'unknown'] = row.count
      return acc
    }, {})
  }
}
```

### Alert Conditions

```typescript
// backend/app/services/sms_alerting_service.ts
export default class SMSAlertingService {
  async checkAlertConditions(): Promise<void> {
    const last24Hours = {
      start: DateTime.now().minus({ hours: 24 }),
      end: DateTime.now()
    }
    
    const metrics = await new SMSMetricsService().getDeliveryMetrics(last24Hours)
    
    // Alert if delivery rate drops below 90%
    if (metrics.deliveryRate < 90 && metrics.total > 10) {
      await this.sendAlert('LOW_DELIVERY_RATE', {
        deliveryRate: metrics.deliveryRate,
        totalMessages: metrics.total
      })
    }
    
    // Alert if failure rate exceeds 10%
    if (metrics.failureRate > 10 && metrics.total > 10) {
      await this.sendAlert('HIGH_FAILURE_RATE', {
        failureRate: metrics.failureRate,
        totalMessages: metrics.total
      })
    }
    
    // Alert if too many messages pending
    if (metrics.pending > 100) {
      await this.sendAlert('HIGH_PENDING_COUNT', {
        pendingCount: metrics.pending
      })
    }
  }

  private async sendAlert(alertType: string, data: any): Promise<void> {
    // Send alert via email, Slack, or other notification system
    Logger.error(`SMS Alert: ${alertType}`, data)
    
    // Implementation depends on your alerting system
    // Could send email, Slack message, etc.
  }
}
```

## Database Queries and Reporting

### Common Queries

```sql
-- Delivery success rate by day
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as delivery_rate
FROM sms_messages 
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- Failed messages by error type
SELECT 
  delivery_description,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM sms_messages WHERE status = 'failed'), 2) as percentage
FROM sms_messages 
WHERE status = 'failed' 
  AND sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY delivery_description
ORDER BY count DESC;

-- Webhook processing performance
SELECT 
  webhook_type,
  COUNT(*) as total_webhooks,
  COUNT(CASE WHEN processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN processing_error IS NOT NULL THEN 1 END) as errors,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM sms_webhook_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY webhook_type;
```

## Related Documentation

- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Performance & Scalability**: [`08-performance-scalability.md`](08-performance-scalability.md)
- **Operational Constraints**: [`10-operational-constraints.md`](10-operational-constraints.md)
- **Quick Reference**: [`12-quick-reference.md`](12-quick-reference.md)