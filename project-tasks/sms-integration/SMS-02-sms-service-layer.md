# SMS-02: SMS Service Layer Development

## Context
The SMS Service Layer provides the core business logic for SMS functionality in the Immunization Records Management System. This task involves creating a comprehensive service architecture that handles SMS message scheduling, template rendering, consent validation, and integration with the existing notification system. The service layer acts as an abstraction between the application logic and the Orange Network SMS API.

## Dependencies
- [`SMS-00`](SMS-00-oauth-token-management.md): OAuth 2.0 authentication must be implemented for Orange Network API access
- [`SMS-01`](SMS-01-database-schema.md): Database schema extensions must be completed
- [`BE-04`](../backend/BE-04-core-models.md): Core models (Patient, Notification) must be available
- [`BE-06`](../backend/BE-06-notification-service.md): Existing notification service for integration

## Requirements

### 1. Core SMS Service
Create a main SMS service that orchestrates all SMS-related operations including message scheduling, template rendering, and delivery tracking.

### 2. SMS Consent Service
Implement a dedicated service for managing patient SMS consent, including opt-in/opt-out functionality and compliance validation.

### 3. SMS Template Service
Develop a template management service that handles message template rendering with dynamic content substitution and character count optimization.

### 4. Enhanced Notification Service
Extend the existing notification service to integrate SMS functionality while maintaining backward compatibility.

### 5. SMS Provider Abstraction
Create a provider interface that allows for future SMS provider integrations beyond Orange Network.

### 6. Message Scheduling System
Implement a scheduling system for the three reminder types (7-day, 1-day, overdue) with proper timing calculations.

## Code Examples

### Core SMS Service

```typescript
// backend/app/services/sms_service.ts
import { DateTime } from 'luxon'
import SMSMessage from '#models/sms_message'
import SMSTemplate from '#models/sms_template'
import Notification from '#models/notification'
import Patient from '#models/patient'
import SMSConsentService from './sms_consent_service.js'
import SMSTemplateService from './sms_template_service.js'
import OrangeSMSProvider from './providers/orange_sms_provider.js'
import Logger from '@adonisjs/core/logger'

export interface SMSReminderConfig {
  reminderType: '7_day_reminder' | '1_day_reminder' | 'overdue_reminder'
  scheduledAt: DateTime
  templateData: Record<string, any>
}

export default class SMSService {
  private consentService: SMSConsentService
  private templateService: SMSTemplateService
  private provider: OrangeSMSProvider

  constructor() {
    this.consentService = new SMSConsentService()
    this.templateService = new SMSTemplateService()
    this.provider = new OrangeSMSProvider()
  }

  /**
   * Schedule SMS reminders for a notification
   */
  public async scheduleReminders(notification: Notification): Promise<SMSMessage[]> {
    const patient = await notification.related('patient').query().first()
    if (!patient) {
      throw new Error(`Patient not found for notification ${notification.id}`)
    }

    // Check if patient has valid SMS consent
    const hasConsent = await this.consentService.hasValidConsent(
      patient.id,
      patient.primaryPhone
    )

    if (!hasConsent || !patient.smsPreferred || !patient.primaryPhone) {
      Logger.info(`Skipping SMS reminders for patient ${patient.id}: no consent or preference`)
      return []
    }

    const scheduledMessages: SMSMessage[] = []

    // Schedule 7-day reminder
    const sevenDayReminder = await this.scheduleReminder(notification, {
      reminderType: '7_day_reminder',
      scheduledAt: this.calculateScheduleTime(notification.dueDate, '7_day_reminder'),
      templateData: await this.buildTemplateData(notification, patient)
    })
    scheduledMessages.push(sevenDayReminder)

    // Schedule 1-day reminder
    const oneDayReminder = await this.scheduleReminder(notification, {
      reminderType: '1_day_reminder',
      scheduledAt: this.calculateScheduleTime(notification.dueDate, '1_day_reminder'),
      templateData: await this.buildTemplateData(notification, patient)
    })
    scheduledMessages.push(oneDayReminder)

    // Schedule overdue reminder
    const overdueReminder = await this.scheduleReminder(notification, {
      reminderType: 'overdue_reminder',
      scheduledAt: this.calculateScheduleTime(notification.dueDate, 'overdue_reminder'),
      templateData: await this.buildTemplateData(notification, patient)
    })
    scheduledMessages.push(overdueReminder)

    Logger.info(`Scheduled ${scheduledMessages.length} SMS reminders for notification ${notification.id}`)
    return scheduledMessages
  }

  /**
   * Schedule a single SMS reminder
   */
  public async scheduleReminder(
    notification: Notification,
    config: SMSReminderConfig
  ): Promise<SMSMessage> {
    const patient = await notification.related('patient').query().first()
    if (!patient) {
      throw new Error(`Patient not found for notification ${notification.id}`)
    }

    // Render message template
    const messageContent = await this.templateService.renderTemplate(
      config.reminderType,
      config.templateData,
      patient.preferredLanguage || 'en'
    )

    // Create SMS message record
    const smsMessage = await SMSMessage.create({
      patientId: patient.id,
      notificationId: notification.id,
      phoneNumber: patient.primaryPhone,
      messageContent,
      messageType: config.reminderType,
      scheduledAt: config.scheduledAt,
      clientCorrelator: SMSMessage.generateCorrelator(),
      senderAddress: process.env.ORANGE_SMS_SENDER_ADDRESS!,
      status: 'pending',
      callbackData: `${config.reminderType}_${notification.id}`
    })

    Logger.info(`Scheduled ${config.reminderType} for patient ${patient.id} at ${config.scheduledAt.toISO()}`)
    return smsMessage
  }

  /**
   * Send pending SMS messages
   */
  public async sendPendingMessages(): Promise<void> {
    const pendingMessages = await SMSMessage.query()
      .where('status', 'pending')
      .where('scheduled_at', '<=', DateTime.now().toSQL())
      .orderBy('scheduled_at', 'asc')
      .limit(50) // Process in batches

    Logger.info(`Processing ${pendingMessages.length} pending SMS messages`)

    for (const message of pendingMessages) {
      try {
        await this.sendMessage(message)
      } catch (error) {
        Logger.error(`Failed to send SMS message ${message.id}:`, error)
        await this.handleSendFailure(message, error)
      }
    }
  }

  /**
   * Send a single SMS message
   */
  public async sendMessage(smsMessage: SMSMessage): Promise<void> {
    try {
      // Check consent before sending
      const hasConsent = await this.consentService.hasValidConsent(
        smsMessage.patientId,
        smsMessage.phoneNumber
      )

      if (!hasConsent) {
        await smsMessage.merge({
          status: 'cancelled',
          errorMessage: 'Patient consent withdrawn'
        }).save()
        return
      }

      // Send via Orange Network API
      const response = await this.provider.sendSMS({
        recipients: [smsMessage.phoneNumber],
        message: smsMessage.messageContent,
        clientCorrelator: smsMessage.clientCorrelator,
        callbackData: smsMessage.callbackData
      })

      // Update message status
      await smsMessage.merge({
        status: 'sent',
        sentAt: DateTime.now(),
        deliveryStatus: 'DeliveredToNetwork'
      }).save()

      Logger.info(`SMS message ${smsMessage.id} sent successfully`)

    } catch (error) {
      await this.handleSendFailure(smsMessage, error)
      throw error
    }
  }

  /**
   * Handle SMS send failures
   */
  private async handleSendFailure(smsMessage: SMSMessage, error: any): Promise<void> {
    const retryCount = smsMessage.retryCount + 1
    const maxRetries = 3

    await smsMessage.merge({
      retryCount,
      errorMessage: error.message,
      failedAt: DateTime.now()
    }).save()

    if (retryCount < maxRetries) {
      // Schedule retry
      const retryDelay = Math.pow(2, retryCount) * 5 // Exponential backoff: 5, 10, 20 minutes
      await smsMessage.merge({
        scheduledAt: DateTime.now().plus({ minutes: retryDelay }),
        status: 'pending'
      }).save()

      Logger.warn(`SMS message ${smsMessage.id} scheduled for retry ${retryCount}/${maxRetries} in ${retryDelay} minutes`)
    } else {
      await smsMessage.merge({
        status: 'failed'
      }).save()

      Logger.error(`SMS message ${smsMessage.id} failed permanently after ${maxRetries} attempts`)
    }
  }

  /**
   * Calculate schedule time for reminder type
   */
  private calculateScheduleTime(dueDate: DateTime, reminderType: string): DateTime {
    const baseTime = { hour: 9, minute: 0, second: 0, millisecond: 0 }

    switch (reminderType) {
      case '7_day_reminder':
        return dueDate.minus({ days: 7 }).set(baseTime)
      case '1_day_reminder':
        return dueDate.minus({ days: 1 }).set(baseTime)
      case 'overdue_reminder':
        return dueDate.plus({ days: 1 }).set({ hour: 14, minute: 0, second: 0, millisecond: 0 })
      default:
        throw new Error(`Unknown reminder type: ${reminderType}`)
    }
  }

  /**
   * Build template data for message rendering
   */
  private async buildTemplateData(notification: Notification, patient: Patient): Promise<Record<string, any>> {
    const vaccine = await notification.related('vaccine').query().first()
    const facility = await patient.related('facility').query().first()

    return {
      patient_name: patient.fullName,
      vaccine_name: vaccine?.name || 'vaccination',
      due_date: notification.dueDate.toFormat('yyyy-MM-dd'),
      facility_name: facility?.name || 'your health facility',
      appointment_time: '9:00 AM', // Default appointment time
      days_overdue: Math.max(0, Math.floor(DateTime.now().diff(notification.dueDate, 'days').days))
    }
  }

  /**
   * Update message delivery status from webhook
   */
  public async updateDeliveryStatus(
    clientCorrelator: string,
    deliveryStatus: string,
    description?: string
  ): Promise<void> {
    const smsMessage = await SMSMessage.findBy('client_correlator', clientCorrelator)
    
    if (!smsMessage) {
      Logger.warn(`SMS message not found for correlator: ${clientCorrelator}`)
      return
    }

    const updates: Partial<SMSMessage> = {
      deliveryStatus,
      deliveryDescription: description
    }

    // Update final status based on delivery status
    if (deliveryStatus === 'DeliveredToTerminal') {
      updates.status = 'delivered'
      updates.deliveredAt = DateTime.now()
    } else if (deliveryStatus === 'DeliveryImpossible') {
      updates.status = 'failed'
      updates.failedAt = DateTime.now()
    }

    await smsMessage.merge(updates).save()

    // Update related notification
    if (smsMessage.notificationId) {
      const notification = await Notification.find(smsMessage.notificationId)
      if (notification) {
        await notification.merge({
          smsDeliveryStatus: deliveryStatus,
          smsMessageId: smsMessage.id
        }).save()
      }
    }

    Logger.info(`Updated delivery status for SMS ${smsMessage.id}: ${deliveryStatus}`)
  }

  /**
   * Get SMS statistics for monitoring
   */
  public async getStatistics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<Record<string, number>> {
    const since = DateTime.now().minus({ [timeframe]: 1 })

    const stats = await SMSMessage.query()
      .where('created_at', '>=', since.toSQL())
      .groupBy('status')
      .count('* as total')
      .select('status')

    const result: Record<string, number> = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0
    }

    for (const stat of stats) {
      result[stat.status] = Number(stat.total)
      result.total += Number(stat.total)
    }

    return result
  }
}
```

### SMS Consent Service

```typescript
// backend/app/services/sms_consent_service.ts
import { DateTime } from 'luxon'
import SMSConsent from '#models/sms_consent'
import Patient from '#models/patient'
import User from '#models/user'
import Logger from '@adonisjs/core/logger'

export interface ConsentData {
  patientId: number
  phoneNumber: string
  consentGiven: boolean
  consentMethod: 'registration' | 'verbal' | 'written' | 'sms_reply'
  userId?: number
}

export default class SMSConsentService {
  /**
   * Record patient SMS consent
   */
  public async recordConsent(data: ConsentData): Promise<SMSConsent> {
    const existingConsent = await SMSConsent.findByPatientAndPhone(
      data.patientId,
      data.phoneNumber
    )

    if (existingConsent) {
      // Update existing consent
      await existingConsent.merge({
        consentGiven: data.consentGiven,
        consentDate: data.consentGiven ? DateTime.now() : existingConsent.consentDate,
        consentMethod: data.consentMethod,
        optedOut: !data.consentGiven,
        optOutDate: !data.consentGiven ? DateTime.now() : null,
        optOutMethod: !data.consentGiven ? data.consentMethod : null,
        updatedBy: data.userId
      }).save()

      Logger.info(`Updated SMS consent for patient ${data.patientId}: ${data.consentGiven}`)
      return existingConsent
    } else {
      // Create new consent record
      const consent = await SMSConsent.create({
        patientId: data.patientId,
        phoneNumber: data.phoneNumber,
        consentGiven: data.consentGiven,
        consentDate: data.consentGiven ? DateTime.now() : null,
        consentMethod: data.consentMethod,
        optedOut: !data.consentGiven,
        optOutDate: !data.consentGiven ? DateTime.now() : null,
        optOutMethod: !data.consentGiven ? data.consentMethod : null,
        createdBy: data.userId,
        updatedBy: data.userId
      })

      Logger.info(`Created SMS consent for patient ${data.patientId}: ${data.consentGiven}`)
      return consent
    }
  }

  /**
   * Check if patient has valid SMS consent
   */
  public async hasValidConsent(patientId: number, phoneNumber: string): Promise<boolean> {
    const consent = await SMSConsent.findByPatientAndPhone(patientId, phoneNumber)
    
    if (!consent) {
      return false
    }

    return consent.hasValidConsent()
  }

  /**
   * Handle SMS STOP request
   */
  public async handleOptOut(phoneNumber: string, method: string = 'sms_stop'): Promise<void> {
    const consents = await SMSConsent.query()
      .where('phone_number', phoneNumber)
      .where('consent_given', true)
      .where('opted_out', false)

    for (const consent of consents) {
      await consent.merge({
        optedOut: true,
        optOutDate: DateTime.now(),
        optOutMethod: method
      }).save()

      Logger.info(`Patient ${consent.patientId} opted out of SMS via ${method}`)
    }

    // Cancel any pending SMS messages for this phone number
    const { default: SMSMessage } = await import('#models/sms_message')
    await SMSMessage.query()
      .where('phone_number', phoneNumber)
      .where('status', 'pending')
      .update({
        status: 'cancelled',
        error_message: `Patient opted out via ${method}`
      })
  }

  /**
   * Handle SMS opt-in request
   */
  public async handleOptIn(phoneNumber: string, method: string = 'sms_reply'): Promise<void> {
    const consents = await SMSConsent.query()
      .where('phone_number', phoneNumber)
      .where('opted_out', true)

    for (const consent of consents) {
      await consent.merge({
        consentGiven: true,
        consentDate: DateTime.now(),
        consentMethod: method,
        optedOut: false,
        optOutDate: null,
        optOutMethod: null
      }).save()

      Logger.info(`Patient ${consent.patientId} opted back in to SMS via ${method}`)
    }
  }

  /**
   * Get consent status for a patient
   */
  public async getConsentStatus(patientId: number): Promise<SMSConsent[]> {
    return await SMSConsent.query()
      .where('patient_id', patientId)
      .orderBy('created_at', 'desc')
  }

  /**
   * Bulk import consent from patient registration
   */
  public async bulkImportFromPatients(): Promise<number> {
    const patients = await Patient.query()
      .whereNotNull('primary_phone')
      .where('sms_preferred', true)
      .whereNotExists((query) => {
        query.select('*')
          .from('sms_consent')
          .whereRaw('sms_consent.patient_id = patients.id')
          .whereRaw('sms_consent.phone_number = patients.primary_phone')
      })

    let importedCount = 0

    for (const patient of patients) {
      try {
        await this.recordConsent({
          patientId: patient.id,
          phoneNumber: patient.primaryPhone!,
          consentGiven: true,
          consentMethod: 'registration'
        })
        importedCount++
      } catch (error) {
        Logger.error(`Failed to import consent for patient ${patient.id}:`, error)
      }
    }

    Logger.info(`Imported SMS consent for ${importedCount} patients`)
    return importedCount
  }
}
```

### SMS Template Service

```typescript
// backend/app/services/sms_template_service.ts
import SMSTemplate from '#models/sms_template'
import Logger from '@adonisjs/core/logger'

export default class SMSTemplateService {
  private templateCache: Map<string, SMSTemplate> = new Map()

  /**
   * Render SMS template with dynamic data
   */
  public async renderTemplate(
    templateType: string,
    data: Record<string, any>,
    languageCode: string = 'en'
  ): Promise<string> {
    const template = await this.getTemplate(templateType, languageCode)
    
    if (!template) {
      throw new Error(`SMS template not found: ${templateType}_${languageCode}`)
    }

    let renderedMessage = template.messageTemplate

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`
      renderedMessage = renderedMessage.replace(new RegExp(placeholder, 'g'), String(value))
    }

    // Validate character count
    if (renderedMessage.length > 160) {
      Logger.warn(`Rendered SMS message exceeds 160 characters: ${renderedMessage.length}`)
    }

    return renderedMessage
  }

  /**
   * Get template by type and language
   */
  public async getTemplate(templateType: string, languageCode: string = 'en'): Promise<SMSTemplate | null> {
    const cacheKey = `${templateType}_${languageCode}`
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!
    }

    // Query database
    const template = await SMSTemplate.query()
      .where('template_type', templateType)
      .where('language_code', languageCode)
      .where('is_active', true)
      .first()

    if (template) {
      this.templateCache.set(cacheKey, template)
    }

    return template
  }

  /**
   * Create or update SMS template
   */
  public async upsertTemplate(data: {
    name: string
    templateType: string
    messageTemplate: string
    languageCode?: string
    isActive?: boolean
    userId?: number
  }): Promise<SMSTemplate> {
    const characterCount = data.messageTemplate.length

    const template = await SMSTemplate.updateOrCreate(
      { name: data.name },
      {
        templateType: data.templateType,
        messageTemplate: data.messageTemplate,
        characterCount,
        languageCode: data.languageCode || 'en',
        isActive: data.isActive ?? true,
        updatedBy: data.userId
      }
    )

    // Clear cache for this template type
    const cacheKey = `${data.templateType}_${data.languageCode || 'en'}`
    this.templateCache.delete(cacheKey)

    Logger.info(`Upserted SMS template: ${data.name}`)
    return template
  }

  /**
   * Validate template character count
   */
  public validateTemplate(messageTemplate: string, data: Record<string, any>): {
    isValid: boolean
    estimatedLength: number
    warnings: string[]
  } {
    const warnings: string[] = []
    let estimatedMessage = messageTemplate

    // Replace placeholders with sample data to estimate length
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{${key}}`
      estimatedMessage = estimatedMessage.replace(new RegExp(placeholder, 'g'), String(value))
    }

    const estimatedLength = estimatedMessage.length

    if (estimatedLength > 160) {
      warnings.push(`Message exceeds 160 characters (${estimatedLength})`)
    }

    if (estimatedLength > 70 && estimatedLength <= 160) {
      warnings.push('Message may be split into multiple SMS parts')
    }

    // Check for unreplaced placeholders
    const unreplacedPlaceholders = estimatedMessage.match(/{[^}]+}/g)
    if (unreplacedPlaceholders) {
      warnings.push(`Unreplaced placeholders: ${unreplacedPlaceholders.join(', ')}`)
    }

    return {
      isValid: estimatedLength <= 160 && !unreplacedPlaceholders,
      estimatedLength,
      warnings
    }
  }

  /**
   * Clear template cache
   */
  public clearCache(): void {
    this.templateCache.clear()
    Logger.info('SMS template cache cleared')
  }
}
```

### Enhanced Notification Service

```typescript
// backend/app/services/notification_service.ts (enhanced)
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import Patient from '#models/patient'
import SMSService from './sms_service.js'
import Logger from '@adonisjs/core/logger'

export default class NotificationService {
  private smsService: SMSService

  constructor() {
    this.smsService = new SMSService()
  }

  /**
   * Generate due notifications with SMS integration
   */
  public async generateDueNotifications(): Promise<Notification[]> {
    Logger.info('Starting notification generation process')

    // Get patients with due immunizations
    const duePatients = await this.getDuePatientsQuery()

    const notifications: Notification[] = []

    for (const patient of duePatients) {
      try {
        const notification = await this.createNotificationForPatient(patient)
        notifications.push(notification)

        // Schedule SMS reminders if enabled
        if (process.env.SMS_ENABLED === 'true') {
          await this.smsService.scheduleReminders(notification)
        }
      } catch (error) {
        Logger.error(`Failed to create notification for patient ${patient.id}:`, error)
      }
    }

    Logger.info(`Generated ${notifications.length} notifications`)
    return notifications
  }

  /**
   * Create notification for a specific patient
   */
  private async createNotificationForPatient(patient: Patient): Promise<Notification> {
    // Get next due vaccine for patient
    const dueVaccine = await this.getNextDueVaccine(patient)
    
    if (!dueVaccine) {
      throw new Error(`No due vaccine found for patient ${patient.id}`)
    }

    const notification = await Notification.create({
      patientId: patient.id,
      vaccineId: dueVaccine.id,
      type: 'due_immunization',
      title: `${dueVaccine.name} Due`,
      message: `${patient.fullName} is due for ${dueVaccine.name} vaccination`,
      dueDate: dueVaccine.dueDate,
      priority: this.calculatePriority(dueVaccine.dueDate),
      status: 'pending',
      smsEnabled: patient.smsPreferred && !!patient.primaryPhone
    })

    Logger.info(`Created notification ${notification.id} for patient ${patient.id}`)
    return notification
  }

  /**
   * Process SMS delivery status updates
   */
  public async processSMSDeliveryUpdate(
    clientCorrelator: string,
    deliveryStatus: string,
    description?: string
  ): Promise<void> {
    await this.smsService.updateDeliveryStatus(clientCorrelator, deliveryStatus, description)
  }

  /**
   * Get notification statistics including SMS metrics
   */
  public async getStatistics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    notifications: Record<string, number>
    sms: Record<string, number>
  }> {
    const since = DateTime.now().minus({ [timeframe]: 1 })

    // Get notification stats
    const notificationStats = await Notification.query()
      .where('created_at', '>=', since.toSQL())
      .groupBy('status')
      .count('* as total')
      .select('status')

    const notifications: Record<string, number> = {
      total: 0,
      pending: 0,
      sent: 0,
      read: 0
    }

    for (const stat of notificationStats) {
      notifications[stat.status] = Number(stat.total)
      notifications.total += Number(stat.total)
    }

    // Get SMS stats
    const sms = await this.smsService.getStatistics(timeframe)

    return { notifications, sms }
  }

  // ... existing methods remain unchanged
  private async getDuePatientsQuery() {
    // Implementation for getting due patients
    return []
  }

  private async getNextDueVaccine(patient: Patient) {
    // Implementation for getting next due vaccine
    return null
  }

  private calculatePriority(dueDate: DateTime): string {
    const daysUntilDue = dueDate.diff(DateTime.now(), 'days').days
    
    if (daysUntilDue < 0) return 'high' // Overdue
    if (daysUntilDue <= 7) return 'medium' // Due within a week
    return 'low' // Due later
  }
}
```

## Acceptance Criteria

1. **Core SMS Service**: SMS service handles message scheduling, sending, and delivery tracking
2. **Consent Management**: Patient SMS consent is properly validated before sending messages
3. **Template Rendering**: Message templates are rendered with dynamic content and validated for character limits
4. **Integration**: Existing notification service is enhanced with SMS functionality
5. **Error Handling**: Comprehensive error handling with retry logic and failure tracking
6. **Logging**: All SMS operations are properly logged for monitoring and debugging
7. **Performance**: Services are optimized for batch processing and high-volume operations
8. **Testing**: Unit tests cover all service methods and error scenarios

## Implementation Notes

### Service Architecture
- Use dependency injection for service composition
- Implement proper error handling and logging
- Design for testability with clear interfaces
- Follow AdonisJS service patterns and conventions

### Performance Considerations
- Implement caching for frequently accessed templates
- Use batch processing for bulk SMS operations
- Optimize database queries with proper indexing
- Implement rate limiting to respect API constraints

### Error Handling
- Implement exponential backoff for retries
- Log all errors with sufficient context
- Provide meaningful error messages
- Handle network timeouts and API failures gracefully

### Security
- Validate all input data
- Implement proper access controls
- Log security-relevant events
- Handle sensitive data (phone numbers) securely

### Monitoring
- Provide comprehensive statistics and metrics
- Implement health checks for service dependencies
- Log performance metrics for optimization
- Alert on error rate thresholds

## Testing Requirements

### Unit Testing
- Test all service methods with various inputs
- Mock external dependencies (SMS provider, database)
- Test error scenarios and edge cases
- Validate template rendering logic

### Integration Testing
- Test service integration with database models
- Verify SMS provider integration
- Test webhook processing flow
- Validate notification service integration

### Performance Testing
- Test bulk message processing
- Validate memory usage with large datasets
- Test concurrent request handling
- Measure response times under load

## Related Documentation

- **Database Schema**: [`SMS-01-database-schema.md`](SMS-01-database-schema.md)
- **Orange Network API**: [`SMS-03-orange-network-api.md`](SMS-03-orange-network-api.md)
- **Enhanced Scheduler**: [`SMS-04-enhanced-scheduler.md`](SMS-04-enhanced-scheduler.md)
- **Existing Notification Service**: [`../backend/BE-06-notification-service.md`](../backend/BE-06-notification-service.md)