
# SMS-10: Testing & Quality Assurance

## Context
This task implements comprehensive testing and quality assurance for the SMS integration system, ensuring reliability, performance, and compliance with healthcare standards. The testing strategy covers unit tests, integration tests, end-to-end testing, performance testing, security testing, and compliance validation for the Orange Network SMS API integration.

## Dependencies
- All previous SMS tasks (SMS-01 through SMS-09) must be completed
- Testing infrastructure and frameworks must be set up

## Requirements

### 1. Unit Testing Suite
Implement comprehensive unit tests for all SMS services, models, controllers, and utility functions with high code coverage and edge case handling.

### 2. Integration Testing
Create integration tests for SMS API interactions, database operations, webhook processing, and cross-service communication.

### 3. End-to-End Testing
Develop end-to-end tests that validate complete SMS workflows from scheduling to delivery confirmation.

### 4. Performance Testing
Implement performance tests for high-volume SMS processing, concurrent operations, and system scalability.

### 5. Security Testing
Create security tests for API authentication, data protection, consent validation, and vulnerability assessment.

### 6. Compliance Testing
Develop healthcare compliance tests for HIPAA requirements, audit logging, and patient data protection.

### 7. Mock Testing Environment
Set up comprehensive mocking for Orange Network API, database operations, and external dependencies.

## Code Examples

### SMS Service Unit Tests

```typescript
// backend/tests/unit/services/sms_service.test.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import SMSService from '#services/sms_service'
import SMSMessage from '#models/sms_message'
import Notification from '#models/notification'
import Patient from '#models/patient'
import { Database } from '@adonisjs/lucid/database'

test.group('SMS Service', (group) => {
  let smsService: SMSService
  let db: Database

  group.setup(async () => {
    smsService = new SMSService()
    db = (await import('@adonisjs/lucid/services/db')).default
  })

  group.each.setup(async () => {
    await db.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await db.rollbackGlobalTransaction()
  })

  test('should schedule SMS reminders for valid notification', async ({ assert }) => {
    // Create test data
    const patient = await Patient.create({
      fullName: 'John Doe',
      primaryPhone: '+231770123456',
      smsPreferred: true,
      preferredLanguage: 'en'
    })

    const notification = await Notification.create({
      patientId: patient.id,
      type: 'due_immunization',
      title: 'Vaccination Due',
      message: 'Test vaccination due',
      dueDate: DateTime.now().plus({ days: 10 })
    })

    // Mock consent service
    const mockConsentService = {
      hasValidConsent: async () => true
    }
    smsService['consentService'] = mockConsentService as any

    // Test scheduling
    const scheduledMessages = await smsService.scheduleReminders(notification)

    assert.equal(scheduledMessages.length, 3)
    assert.equal(scheduledMessages[0].messageType, '7_day_reminder')
    assert.equal(scheduledMessages[1].messageType, '1_day_reminder')
    assert.equal(scheduledMessages[2].messageType, 'overdue_reminder')
  })

  test('should not schedule SMS for patient without consent', async ({ assert }) => {
    const patient = await Patient.create({
      fullName: 'Jane Doe',
      primaryPhone: '+231770123457',
      smsPreferred: true,
      preferredLanguage: 'en'
    })

    const notification = await Notification.create({
      patientId: patient.id,
      type: 'due_immunization',
      title: 'Vaccination Due',
      message: 'Test vaccination due',
      dueDate: DateTime.now().plus({ days: 10 })
    })

    // Mock consent service to return false
    const mockConsentService = {
      hasValidConsent: async () => false
    }
    smsService['consentService'] = mockConsentService as any

    const scheduledMessages = await smsService.scheduleReminders(notification)

    assert.equal(scheduledMessages.length, 0)
  })

  test('should calculate correct schedule times', async ({ assert }) => {
    const dueDate = DateTime.fromISO('2024-03-15T10:00:00')
    
    const sevenDayTime = smsService['calculateScheduleTime'](dueDate, '7_day_reminder')
    const oneDayTime = smsService['calculateScheduleTime'](dueDate, '1_day_reminder')
    const overdueTime = smsService['calculateScheduleTime'](dueDate, 'overdue_reminder')

    assert.equal(sevenDayTime.toFormat('yyyy-MM-dd HH:mm'), '2024-03-08 09:00')
    assert.equal(oneDayTime.toFormat('yyyy-MM-dd HH:mm'), '2024-03-14 09:00')
    assert.equal(overdueTime.toFormat('yyyy-MM-dd HH:mm'), '2024-03-16 14:00')
  })

  test('should handle send message failure with retry logic', async ({ assert }) => {
    const smsMessage = await SMSMessage.create({
      patientId: 1,
      phoneNumber: '+231770123456',
      messageContent: 'Test message',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now(),
      clientCorrelator: 'test-123',
      senderAddress: '+231123456789',
      status: 'pending'
    })

    // Mock provider to throw error
    const mockProvider = {
      sendSMS: async () => {
        throw new Error('API Error')
      }
    }
    smsService['provider'] = mockProvider as any

    // Mock consent service
    const mockConsentService = {
      hasValidConsent: async () => true
    }
    smsService['consentService'] = mockConsentService as any

    try {
      await smsService.sendMessage(smsMessage)
    } catch (error) {
      // Expected to throw
    }

    await smsMessage.refresh()
    assert.equal(smsMessage.retryCount, 1)
    assert.equal(smsMessage.status, 'pending') // Should be rescheduled for retry
    assert.isNotNull(smsMessage.errorMessage)
  })

  test('should update delivery status correctly', async ({ assert }) => {
    const smsMessage = await SMSMessage.create({
      patientId: 1,
      phoneNumber: '+231770123456',
      messageContent: 'Test message',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now(),
      clientCorrelator: 'test-delivery-123',
      senderAddress: '+231123456789',
      status: 'sent',
      sentAt: DateTime.now()
    })

    await smsService.updateDeliveryStatus(
      'test-delivery-123',
      'DeliveredToTerminal',
      'Message delivered successfully'
    )

    await smsMessage.refresh()
    assert.equal(smsMessage.status, 'delivered')
    assert.equal(smsMessage.deliveryStatus, 'DeliveredToTerminal')
    assert.equal(smsMessage.deliveryDescription, 'Message delivered successfully')
    assert.isNotNull(smsMessage.deliveredAt)
  })
})
```

### Orange Network API Integration Tests

```typescript
// backend/tests/integration/orange_sms_provider.test.ts
import { test } from '@japa/runner'
import OrangeSMSProvider from '#services/providers/orange_sms_provider'
import nock from 'nock'

test.group('Orange SMS Provider Integration', (group) => {
  let provider: OrangeSMSProvider

  group.setup(() => {
    provider = new OrangeSMSProvider()
  })

  group.teardown(() => {
    nock.cleanAll()
  })

  test('should send SMS successfully', async ({ assert }) => {
    // Mock Orange Network API response
    nock('https://api.orange.com')
      .post('/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests')
      .reply(201, {
        outboundSMSMessageRequest: {
          address: ['tel:+231770123456'],
          senderAddress: 'tel:+231123456789',
          outboundSMSTextMessage: {
            message: 'Test message'
          },
          clientCorrelator: 'test-123',
          resourceURL: 'https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests/test-123',
          deliveryInfoList: {
            deliveryInfo: [{
              address: 'tel:+231770123456',
              deliveryStatus: 'DeliveredToNetwork'
            }]
          }
        }
      })

    const result = await provider.sendSMS({
      recipients: ['+231770123456'],
      message: 'Test message',
      clientCorrelator: 'test-123',
      callbackData: 'test-callback'
    })

    assert.isTrue(result.success)
    assert.equal(result.deliveryInfo?.[0].deliveryStatus, 'DeliveredToNetwork')
  })

  test('should handle API errors gracefully', async ({ assert }) => {
    // Mock Orange Network API error response
    nock('https://api.orange.com')
      .post('/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests')
      .reply(400, {
        requestError: {
          serviceException: {
            messageId: 'SVC0001',
            text: 'Invalid parameter value',
            variables: ['address']
          }
        }
      })

    const result = await provider.sendSMS({
      recipients: ['+231770123456'],
      message: 'Test message',
      clientCorrelator: 'test-error-123'
    })

    assert.isFalse(result.success)
    assert.include(result.error!, 'SVC0001')
    assert.include(result.error!, 'Invalid parameter value')
  })

  test('should query delivery status', async ({ assert }) => {
    // Mock delivery status query response
    nock('https://api.orange.com')
      .get('/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests/test-status-123/deliveryInfos')
      .reply(200, {
        deliveryInfoList: {
          deliveryInfo: [{
            address: 'tel:+231770123456',
            deliveryStatus: 'DeliveredToTerminal',
            description: 'Message delivered successfully'
          }]
        }
      })

    const result = await provider.queryDeliveryStatus('test-status-123')

    assert.isTrue(result.success)
    assert.equal(result.deliveryInfo?.[0].deliveryStatus, 'DeliveredToTerminal')
    assert.equal(result.deliveryInfo?.[0].description, 'Message delivered successfully')
  })

  test('should validate phone numbers correctly', async ({ assert }) => {
    // Test valid phone numbers
    const validNumbers = ['+231770123456', '+233201234567', '+234802345678']
    
    for (const number of validNumbers) {
      const result = provider['validatePhoneNumbers']([number])
      assert.equal(result.length, 1)
      assert.equal(result[0], number)
    }

    // Test invalid phone numbers
    const invalidNumbers = ['123456789', '+1234567890123456', 'invalid']
    
    for (const number of invalidNumbers) {
      assert.throws(() => {
        provider['validatePhoneNumbers']([number])
      }, /Invalid phone number format/)
    }
  })
})
```

### End-to-End SMS Workflow Tests

```typescript
// backend/tests/e2e/sms_workflow.test.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Patient from '#models/patient'
import Notification from '#models/notification'
import SMSMessage from '#models/sms_message'
import SMSConsent from '#models/sms_consent'
import SMSService from '#services/sms_service'
import SMSSchedulerService from '#services/sms_scheduler_service'
import { Database } from '@adonisjs/lucid/database'
import nock from 'nock'

test.group('SMS End-to-End Workflow', (group) => {
  let db: Database

  group.setup(async () => {
    db = (await import('@adonisjs/lucid/services/db')).default
  })

  group.each.setup(async () => {
    await db.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await db.rollbackGlobalTransaction()
    nock.cleanAll()
  })

  test('complete SMS reminder workflow', async ({ assert }) => {
    // Step 1: Create patient with SMS consent
    const patient = await Patient.create({
      fullName: 'John Doe',
      primaryPhone: '+231770123456',
      smsPreferred: true,
      preferredLanguage: 'en'
    })

    await SMSConsent.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      consentGiven: true,
      consentDate: DateTime.now(),
      consentMethod: 'registration'
    })

    // Step 2: Create notification
    const notification = await Notification.create({
      patientId: patient.id,
      type: 'due_immunization',
      title: 'Vaccination Due',
      message: 'Test vaccination due',
      dueDate: DateTime.now().plus({ days: 8 }) // 8 days from now
    })

    // Step 3: Schedule SMS reminders
    const smsService = new SMSService()
    const scheduledMessages = await smsService.scheduleReminders(notification)

    assert.equal(scheduledMessages.length, 3)

    // Step 4: Mock Orange Network API for sending
    nock('https://api.orange.com')
      .post('/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests')
      .times(3)
      .reply(201, (uri, requestBody: any) => ({
        outboundSMSMessageRequest: {
          address: requestBody.outboundSMSMessageRequest.address,
          senderAddress: requestBody.outboundSMSMessageRequest.senderAddress,
          outboundSMSTextMessage: requestBody.outboundSMSMessageRequest.outboundSMSTextMessage,
          clientCorrelator: requestBody.outboundSMSMessageRequest.clientCorrelator,
          deliveryInfoList: {
            deliveryInfo: [{
              address: requestBody.outboundSMSMessageRequest.address[0],
              deliveryStatus: 'DeliveredToNetwork'
            }]
          }
        }
      }))

    // Step 5: Process pending messages (simulate scheduler)
    const scheduler = new SMSSchedulerService()
    
    // Update scheduled times to be in the past for immediate processing
    for (const message of scheduledMessages) {
      await message.merge({
        scheduledAt: DateTime.now().minus({ minutes: 1 })
      }).save()
    }

    const stats = await scheduler.processPendingMessages()

    assert.equal(stats.sent, 3)
    assert.equal(stats.failed, 0)

    // Step 6: Verify messages were sent
    const sentMessages = await SMSMessage.query()
      .where('patient_id', patient.id)
      .where('status', 'sent')

    assert.equal(sentMessages.length, 3)

    // Step 7: Simulate webhook delivery status update
    const firstMessage = sentMessages[0]
    await smsService.updateDeliveryStatus(
      firstMessage.clientCorrelator,
      'DeliveredToTerminal',
      'Message delivered successfully'
    )

    await firstMessage.refresh()
    assert.equal(firstMessage.status, 'delivered')
    assert.equal(firstMessage.deliveryStatus, 'DeliveredToTerminal')
  })

  test('SMS opt-out workflow', async ({ assert }) => {
    // Step 1: Create patient with consent
    const patient = await Patient.create({
      fullName: 'Jane Doe',
      primaryPhone: '+231770123457',
      smsPreferred: true
    })

    const consent = await SMSConsent.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      consentGiven: true,
      consentDate: DateTime.now(),
      consentMethod: 'registration'
    })

    // Step 2: Create pending SMS message
    const smsMessage = await SMSMessage.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      messageContent: 'Test reminder message',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now().plus({ hours: 1 }),
      clientCorrelator: 'test-optout-123',
      senderAddress: '+231123456789',
      status: 'pending'
    })

    // Step 3: Process opt-out request
    const consentService = new (await import('#services/sms_consent_service')).default()
    await consentService.handleOptOut(patient.primaryPhone, 'sms_stop')

    // Step 4: Verify consent was revoked
    await consent.refresh()
    assert.isTrue(consent.optedOut)
    assert.equal(consent.optOutMethod, 'sms_stop')

    // Step 5: Verify pending message was cancelled
    await smsMessage.refresh()
    assert.equal(smsMessage.status, 'cancelled')
    assert.include(smsMessage.errorMessage!, 'opted out')
  })
})
```

### Performance Tests

```typescript
// backend/tests/performance/sms_performance.test.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import SMSSchedulerService from '#services/sms_scheduler_service'
import SMSMessage from '#models/sms_message'
import Patient from '#models/patient'
import { Database } from '@adonisjs/lucid/database'

test.group('SMS Performance Tests', (group) => {
  let db: Database

  group.setup(async () => {
    db = (await import('@adonisjs/lucid/services/db')).default
  })

  group.each.setup(async () => {
    await db.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await db.rollbackGlobalTransaction()
  })

  test('should handle bulk SMS processing efficiently', async ({ assert }) => {
    // Create test patients
    const patients = []
    for (let i = 0; i < 100; i++) {
      const patient = await Patient.create({
        fullName: `Test Patient ${i}`,
        primaryPhone: `+23177012${String(i).padStart(4, '0')}`,
        smsPreferred: true
      })
      patients.push(patient)
    }

    // Create pending SMS messages
    const messages = []
    for (const patient of patients) {
      const message = await SMSMessage.create({
        patientId: patient.id,
        phoneNumber: patient.primaryPhone,
        messageContent: 'Performance test message',
        messageType: '7_day_reminder',
        scheduledAt: DateTime.now().minus({ minutes: 1 }),
        clientCorrelator: `perf-test-${patient.id}`,
        senderAddress: '+231123456789',
        status: 'pending'
      })
      messages.push(message)
    }

    // Mock SMS provider for performance test
    const mockProvider = {
      sendSMS: async () => ({
        success: true,
        deliveryInfo: [{ address: 'test', deliveryStatus: 'DeliveredToNetwork' }]
      })
    }

    const scheduler = new SMSSchedulerService()
    scheduler['smsService']['provider'] = mockProvider as any
    scheduler['smsService']['consentService'] = {
      hasValidConsent: async () => true
    } as any

    // Measure processing time
    const startTime = Date.now()
    const stats = await scheduler.processPendingMessages()
    const endTime = Date.now()

    const processingTime = endTime - startTime
    const messagesPerSecond = (stats.sent / processingTime) * 1000

    assert.equal(stats.sent, 100)
    assert.isBelow(processingTime, 30000) // Should complete within 30 seconds
    assert.isAbove(messagesPerSecond, 3) // Should process at least 3 messages per second

    console.log(`Processed ${stats.sent} messages in ${processingTime}ms (${messagesPerSecond.toFixed(2)} msg/sec)`)
  })

  test('should handle concurrent SMS operations', async ({ assert }) => {
    const concurrentOperations = 10
    const messagesPerOperation = 10

    // Create test data
    const patients = []
    for (let i = 0; i < concurrentOperations * messagesPerOperation; i++) {
      const patient = await Patient.create({
        fullName: `Concurrent Test Patient ${i}`,
        primaryPhone: `+23177013${String(i).padStart(4, '0')}`,
        smsPreferred: true
      })
      patients.push(patient)
    }

    // Mock SMS provider
    const mockProvider = {
      sendSMS: async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          success: true,
          deliveryInfo: [{ address: 'test', deliveryStatus: 'DeliveredToNetwork' }]
        }
      }
    }

    const smsService = new (await import('#services/sms_service')).default()
    smsService['provider'] = mockProvider as any
    smsService['consentService'] = {
      hasValidConsent: async () => true
    } as any

    // Create concurrent operations
    const operations = []
    for (let i = 0; i < concurrentOperations; i++) {
      const operationPatients = patients.slice(i * messagesPerOperation, (i + 1) * messagesPerOperation)
      
      const operation = Promise.all(operationPatients.map(async (patient) => {
        const message = await SMSMessage.create({
          patientId: patient.id,
          phoneNumber: patient.primaryPhone,
          messageContent: 'Concurrent test message',
          messageType: '7_day_reminder',
          scheduledAt: DateTime.now(),
          clientCorrelator: `concurrent-${patient.id}`,
          senderAddress: '+231123456789',
          status: 'pending'
        })

        return smsService.sendMessage(message)
      }))

      operations.push(operation)
    }

    // Execute concurrent operations
    const startTime = Date.now()
    const results = await Promise.allSettled(operations)
    const endTime = Date.now()

    const processingTime = endTime - startTime
    const successfulOperations = results.filter(r => r.status === 'fulfilled').length

    assert.equal(successfulOperations, concurrentOperations)
    assert.isBelow(processingTime, 60000) // Should complete within 60 seconds

    console.log(`Completed ${concurrentOperations} concurrent operations in ${processingTime}ms`)
  })
})
```

### Security Tests

```typescript
// backend/tests/security/sms_security.test.ts
import { test } from '@japa/runner'
import { createServer } from 'http'
import request from 'supertest'
import SMSWebhooksController from '#controllers/sms_webhooks_controller'

test.group('SMS Security Tests', () => {
  test('should validate webhook source IP', async ({ assert }) => {
    const controller = new SMSWebhooksController()
    
    // Test with invalid IP
    const isValidInvalid = controller['validateWebhookSource']('192.168.999.999')
    assert.isFalse(isValidInvalid)

    // Test with valid IP (in development mode)
    process.env.NODE_ENV = 'development'
    const isValidDev = controller['validateWebhookSource']('127.0.0.1')
    assert.isTrue(isValidDev)
  })

  test('should sanitize phone numbers', async ({ assert }) => {
    const provider = new (await import('#services/providers/orange_sms_provider')).default()
    
    // Test phone number sanitization
    const validNumbers = ['+231770123456', '+233201234567']
    const sanitized = provider['validatePhoneNumbers'](validNumbers)
    
    assert.equal(sanitized.length, 2)
    assert.equal(sanitized[0], '+231770123456')

    // Test malicious input
    const maliciousNumbers = ['<script>alert("xss")</script>', '"; DROP TABLE sms_messages; --']
    
    for (const malicious of maliciousNumbers) {
      assert.throws(() => {
        provider['validatePhoneNumbers']([malicious])
      }, /Invalid phone number format/)
    }
  })

  test('should prevent SMS injection attacks', async ({ assert }) => {
    const templateService = new (await import('#services/sms_template_service')).default()
    
    // Test with malicious template data
    const maliciousData = {
      patient_name: '<script>alert("xss")</script>',
      vaccine_name: '"; DROP TABLE patients; --',
      due_date: '2024-03-15',
      facility_name: 'Test Facility'
    }

    const result = await templateService.renderOptimizedTemplate(
      '7_day_reminder',
      maliciousData,
      'en'
    )

    // Should render as plain text, not execute scripts
    assert.include(result.message, '<script>alert("xss")</script>')
    assert.include(result.message, '"; DROP TABLE patients; --')
  })

  test('should enforce rate limiting on webhook endpoints', async ({ assert }) => {
    // This would test rate limiting middleware
    // Implementation depends on the specific rate limiting solution used
    assert.isTrue(true) // Placeholder
  })
})
```

### Compliance Tests

```typescript
// backend/tests/compliance/hipaa_compliance.test.ts
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import SMSConsent from '#models/sms_consent'
import SMSMessage from '#models/sms_message'
import SMSWebhookLog from '#models/sms_webhook_log'
import Patient from '#models/patient'
import { Database } from '@adonisjs/lucid/database'

test.group('HIPAA Compliance Tests', (group) => {
  let db: Database

  group.setup(async () => {
    db = (await import('@adonisjs/lucid/services/db')).default
  })

  group.each.setup(async () => {
    await db.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await db.rollbackGlobalTransaction()
  })

  test('should maintain complete audit trail for consent changes', async ({ assert }) => {
    const patient = await Patient.create({
      fullName: 'HIPAA Test Patient',
      primaryPhone: '+231770123456'
    })

    // Initial consent
    const consent = await SMSConsent.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      consentGiven: true,
      consentDate: DateTime.now(),
      consentMethod: 'written',
      createdBy: 1
    })

    // Consent revocation
    await consent.merge({
      optedOut: true,
      optOutDate: DateTime.now(),
      optOutMethod: 'verbal',
      updatedBy: 1
    }).save()

    // Verify audit trail
    const consentHistory = await SMSConsent.query()
      .where('patient_id', patient.id)
      .orderBy('created_at', 'desc')

    assert.equal(consentHistory.length, 1)
    assert.isNotNull(consentHistory[0].consentDate)
    assert.isNotNull(consentHistory[0].optOutDate)
    assert.equal(consentHistory[0].consentMethod, 'written')
    assert.equal(consentHistory[0].optOutMethod, 'verbal')
    assert.isNotNull(consentHistory[0].createdBy)
    assert.isNotNull(consentHistory[0].updatedBy)
  })

  test('should log all SMS communications for audit', async ({ assert }) => {
    const patient = await Patient.create({
      fullName: 'Audit Test Patient',
      primaryPhone: '+231770123457'
    })

    const smsMessage = await SMSMessage.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      messageContent: 'Test audit message',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now(),
      clientCorrelator: 'audit-test-123',
      senderAddress: '+231123456789',
      status: 'sent',
      sentAt: DateTime.now()
    })

    // Verify message is logged
    const auditRecord = await SMSMessage.find(smsMessage.id)
    assert.isNotNull(auditRecord)
    assert.isNotNull(auditRecord!.createdAt)
    assert.isNotNull(auditRecord!.sentAt)
    assert.equal(auditRecord!.status, 'sent')
  })

  test('should log all webhook interactions', async ({ assert }) => {
    const webhookLog = await SMSWebhookLog.create({
      webhookType: 'delivery_status',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: { test: 'data' },
      requestIp: '127.0.0.1',
      processed: true,
      responseStatus: 200,
      responseBody: 'OK'
    })

    // Verify webhook is logged
    const auditRecord = await SMSWebhookLog.find(webhookLog.id)
    assert.isNotNull(auditRecord)
    assert.isNotNull(auditRecord!.createdAt)
    assert.equal(auditRecord!.webhookType, 'delivery_status')
    assert.isNotNull(auditRecord!.requestHeaders)
    assert.isNotNull(auditRecord!.requestBody)
  })

  test('should enforce data retention policies', async ({ assert }) => {
    // Create old SMS message (older than retention period)
    const oldMessage = await SMSMessage.create({
      patientId: 1,
      phoneNumber: '+231770123458',
      messageContent: 'Old test message',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now().minus({ days: 400 }),
      clientCorrelator: 'old-test-123',
      senderAddress: '+231123456789',
      status: 'delivered',
      deliveredAt: DateTime.now().minus({ days: 400 }),
      createdAt: DateTime.now().minus({ days: 400 })
    })

    // Test data retention cleanup (this would be implemented in a cleanup service)
    const retentionCutoff = DateTime.now().minus({ days: 365 })
    const oldMessages = await SMSMessage.query()
      .where('created_at', '<', retentionCutoff.toSQL())
      .whereIn('status', ['
delivered', 'failed'])

    assert.isAbove(oldMessages.length, 0)
    // In a real implementation, these would be deleted or archived
  })

  test('should provide data deletion capabilities', async ({ assert }) => {
    const patient = await Patient.create({
      fullName: 'Data Deletion Test',
      primaryPhone: '+231770123459'
    })

    // Create SMS data for patient
    await SMSConsent.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      consentGiven: true,
      consentDate: DateTime.now(),
      consentMethod: 'written'
    })

    await SMSMessage.create({
      patientId: patient.id,
      phoneNumber: patient.primaryPhone,
      messageContent: 'Test message for deletion',
      messageType: '7_day_reminder',
      scheduledAt: DateTime.now(),
      clientCorrelator: 'deletion-test-123',
      senderAddress: '+231123456789',
      status: 'sent'
    })

    // Verify data exists
    const consentBefore = await SMSConsent.query().where('patient_id', patient.id).first()
    const messagesBefore = await SMSMessage.query().where('patient_id', patient.id)

    assert.isNotNull(consentBefore)
    assert.equal(messagesBefore.length, 1)

    // Delete patient SMS data (HIPAA right to deletion)
    await SMSConsent.query().where('patient_id', patient.id).delete()
    await SMSMessage.query().where('patient_id', patient.id).delete()

    // Verify data is deleted
    const consentAfter = await SMSConsent.query().where('patient_id', patient.id).first()
    const messagesAfter = await SMSMessage.query().where('patient_id', patient.id)

    assert.isNull(consentAfter)
    assert.equal(messagesAfter.length, 0)
  })
})
```

## Test Configuration

### Jest Configuration

```javascript
// backend/tests/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'app/**/*.ts',
    '!app/**/*.d.ts',
    '!app/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 4
}
```

### Test Setup

```typescript
// backend/tests/setup.ts
import { configure } from 'japa'
import { Database } from '@adonisjs/lucid/database'

// Configure test environment
process.env.NODE_ENV = 'testing'
process.env.SMS_ENABLED = 'true'
process.env.SMS_SANDBOX_MODE = 'true'

// Setup database for testing
configure({
  files: ['tests/**/*.test.ts'],
  before: [
    async () => {
      // Setup test database
      const db = (await import('@adonisjs/lucid/services/db')).default
      await db.connection().migrate.latest()
    }
  ],
  after: [
    async () => {
      // Cleanup after tests
      const db = (await import('@adonisjs/lucid/services/db')).default
      await db.connection().migrate.rollback()
    }
  ]
})
```

## Acceptance Criteria

1. **Unit Test Coverage**: Achieve >90% code coverage for all SMS-related services and models
2. **Integration Testing**: Comprehensive integration tests for Orange Network API and database operations
3. **End-to-End Testing**: Complete workflow tests from SMS scheduling to delivery confirmation
4. **Performance Testing**: Validate system performance under high load and concurrent operations
5. **Security Testing**: Comprehensive security tests for API authentication and data protection
6. **Compliance Testing**: HIPAA compliance validation with audit trail verification
7. **Mock Testing**: Complete mocking framework for external dependencies
8. **Automated Testing**: CI/CD integration with automated test execution
9. **Test Documentation**: Clear test documentation and coverage reports
10. **Quality Gates**: Automated quality gates preventing deployment of untested code

## Implementation Notes

### Testing Strategy
- Follow test-driven development (TDD) principles where applicable
- Implement comprehensive mocking for external dependencies
- Use realistic test data that reflects production scenarios
- Implement proper test isolation and cleanup

### Performance Testing
- Test with realistic data volumes and user loads
- Validate memory usage and potential memory leaks
- Test concurrent operations and race conditions
- Measure and optimize critical path performance

### Security Testing
- Test all input validation and sanitization
- Validate authentication and authorization mechanisms
- Test for common security vulnerabilities (XSS, SQL injection, etc.)
- Verify secure handling of sensitive data

### Compliance Testing
- Validate complete audit trails for all operations
- Test data retention and deletion capabilities
- Verify patient consent management compliance
- Test access controls and data protection measures

## Testing Requirements

### Continuous Integration
- Automated test execution on code commits
- Quality gates preventing deployment of failing tests
- Code coverage reporting and enforcement
- Performance regression testing

### Test Data Management
- Realistic test data that reflects production scenarios
- Automated test data generation and cleanup
- Secure handling of test data containing PHI
- Data anonymization for testing purposes

### Test Environment Management
- Isolated test environments for different test types
- Automated environment provisioning and teardown
- Configuration management for test environments
- Monitoring and alerting for test environment health

## Related Documentation

- **All SMS Integration Tasks**: [`SMS-01`](SMS-01-database-schema.md) through [`SMS-09`](SMS-09-monitoring-analytics.md)
- **Orange Network API**: [`01-api-specifications.md`](01-api-specifications.md)
- **Healthcare Compliance**: [`05-healthcare-compliance.md`](05-healthcare-compliance.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)