# Integration Requirements and Technical Prerequisites

## Overview

This document outlines the technical prerequisites, system requirements, and integration specifications needed to successfully implement the Orange Network SMS API integration into the Immunization Records Management System.

## System Prerequisites

### Backend Requirements

#### AdonisJS Framework
- **Version**: AdonisJS v6.x or higher
- **Node.js**: v18.x or higher
- **TypeScript**: v5.x or higher
- **Database**: PostgreSQL 13+ or MySQL 8+

#### Required Dependencies
```json
{
  "dependencies": {
    "@adonisjs/core": "^6.2.0",
    "@adonisjs/lucid": "^20.1.0",
    "@adonisjs/auth": "^9.1.0",
    "@adonisjs/mail": "^9.1.0",
    "luxon": "^3.4.0",
    "axios": "^1.6.0",
    "crypto": "^1.0.1",
    "validator": "^13.11.0"
  },
  "devDependencies": {
    "@types/luxon": "^3.3.0",
    "@types/validator": "^13.11.0"
  }
}
```

#### Environment Configuration
```bash
# Orange Network SMS API Configuration
ORANGE_SMS_API_KEY=your_api_key_here
ORANGE_SMS_BASE_URL=https://api.orange.com/smsmessaging/v1
ORANGE_SMS_SENDER_ADDRESS=+231123456789
ORANGE_SMS_WEBHOOK_BASE_URL=https://your-domain.com

# SMS Feature Flags
SMS_ENABLED=true
SMS_SANDBOX_MODE=false
SMS_RATE_LIMIT_PER_MINUTE=100
SMS_RETRY_ATTEMPTS=3
SMS_RETRY_DELAY_MS=5000

# Database Configuration (existing)
DB_CONNECTION=pg
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_DATABASE=immunization_db
```

### Infrastructure Requirements

#### Server Specifications
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD
- **Network**: Stable internet connection with 99.9% uptime
- **SSL Certificate**: Required for webhook endpoints

#### Network Configuration
- **Outbound HTTPS**: Port 443 access to `api.orange.com`
- **Inbound HTTPS**: Webhook endpoints accessible from Orange Network
- **Firewall**: Allow Orange Network IP ranges for webhooks
- **Load Balancer**: Support for webhook distribution (if clustered)

## Database Schema Extensions

### New Tables Required

#### 1. SMS Messages Table
```sql
CREATE TABLE sms_messages (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- '7_day_reminder', '1_day_reminder', 'overdue_reminder'
    
    -- Orange Network API fields
    client_correlator VARCHAR(100) UNIQUE NOT NULL,
    sender_address VARCHAR(20) NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'cancelled'
    delivery_status VARCHAR(50), -- Orange Network delivery status
    delivery_description TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Metadata
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    callback_data VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sms_messages_patient_id ON sms_messages(patient_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_scheduled_at ON sms_messages(scheduled_at);
CREATE INDEX idx_sms_messages_client_correlator ON sms_messages(client_correlator);
```

#### 2. SMS Consent Table
```sql
CREATE TABLE sms_consent (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    
    -- Consent status
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMP,
    consent_method VARCHAR(50), -- 'registration', 'verbal', 'written', 'sms_reply'
    
    -- Opt-out tracking
    opted_out BOOLEAN DEFAULT false,
    opt_out_date TIMESTAMP,
    opt_out_method VARCHAR(50), -- 'sms_stop', 'verbal', 'written', 'admin'
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(patient_id, phone_number)
);

-- Indexes
CREATE INDEX idx_sms_consent_patient_id ON sms_consent(patient_id);
CREATE INDEX idx_sms_consent_phone_number ON sms_consent(phone_number);
CREATE INDEX idx_sms_consent_status ON sms_consent(consent_given, opted_out);
```

#### 3. SMS Templates Table
```sql
CREATE TABLE sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    template_type VARCHAR(50) NOT NULL, -- '7_day_reminder', '1_day_reminder', 'overdue_reminder'
    
    -- Template content
    message_template TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    
    -- Localization
    language_code VARCHAR(5) DEFAULT 'en',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample templates
INSERT INTO sms_templates (name, template_type, message_template, character_count, language_code) VALUES
('7_day_reminder_en', '7_day_reminder', 'Reminder: {patient_name}''s {vaccine_name} vaccination is due on {due_date} at {facility_name}. Reply STOP to opt out.', 128, 'en'),
('1_day_reminder_en', '1_day_reminder', 'Tomorrow: {patient_name}''s {vaccine_name} vaccination at {facility_name}. Time: {appointment_time}. Reply STOP to opt out.', 125, 'en'),
('overdue_reminder_en', 'overdue_reminder', 'Overdue: {patient_name}''s {vaccine_name} vaccination was due {days_overdue} days ago. Please visit {facility_name}. Reply STOP to opt out.', 142, 'en');
```

#### 4. SMS Webhook Logs Table
```sql
CREATE TABLE sms_webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL, -- 'delivery_status', 'inbound_message'
    
    -- Request details
    request_headers JSONB,
    request_body JSONB NOT NULL,
    request_ip VARCHAR(45),
    
    -- Processing details
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    related_sms_message_id INTEGER REFERENCES sms_messages(id),
    
    -- Response details
    response_status INTEGER DEFAULT 200,
    response_body TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sms_webhook_logs_type ON sms_webhook_logs(webhook_type);
CREATE INDEX idx_sms_webhook_logs_processed ON sms_webhook_logs(processed);
CREATE INDEX idx_sms_webhook_logs_created_at ON sms_webhook_logs(created_at);
```

### Existing Table Modifications

#### Patients Table Enhancement
```sql
-- Add SMS-related fields to existing patients table
ALTER TABLE patients 
ADD COLUMN primary_phone VARCHAR(20),
ADD COLUMN secondary_phone VARCHAR(20),
ADD COLUMN sms_preferred BOOLEAN DEFAULT false,
ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';

-- Update existing records with phone numbers from contact info if available
-- This would be handled in a migration script
```

#### Notifications Table Enhancement
```sql
-- Add SMS tracking to existing notifications table
ALTER TABLE notifications 
ADD COLUMN sms_enabled BOOLEAN DEFAULT false,
ADD COLUMN sms_message_id INTEGER REFERENCES sms_messages(id),
ADD COLUMN sms_sent_at TIMESTAMP,
ADD COLUMN sms_delivery_status VARCHAR(50);
```

## Service Layer Architecture

### SMS Service Integration

#### Enhanced Notification Service
```typescript
// backend/app/services/notification_service.ts (enhanced)
import SMSService from './sms_service'
import SMSConsentService from './sms_consent_service'

export default class NotificationService {
  private smsService: SMSService
  private consentService: SMSConsentService

  constructor() {
    this.smsService = new SMSService()
    this.consentService = new SMSConsentService()
  }

  /**
   * Generate notifications with SMS support
   */
  public async generateDueNotifications() {
    // Existing logic for creating notification records
    const notifications = await this.createNotificationRecords()
    
    // New: Schedule SMS messages for consented patients
    for (const notification of notifications) {
      await this.scheduleSMSReminders(notification)
    }
    
    return notifications
  }

  private async scheduleSMSReminders(notification: Notification) {
    const hasConsent = await this.consentService.hasValidConsent(
      notification.patientId, 
      notification.patient.primaryPhone
    )
    
    if (hasConsent && notification.patient.smsPreferred) {
      // Schedule 7-day reminder
      await this.smsService.scheduleReminder(notification, '7_day_reminder')
      
      // Schedule 1-day reminder
      await this.smsService.scheduleReminder(notification, '1_day_reminder')
      
      // Schedule overdue reminder
      await this.smsService.scheduleReminder(notification, 'overdue_reminder')
    }
  }
}
```

#### New SMS Service
```typescript
// backend/app/services/sms_service.ts
import { DateTime } from 'luxon'
import SMSMessage from '#models/sms_message'
import SMSTemplate from '#models/sms_template'
import OrangeSMSProvider from './providers/orange_sms_provider'

export default class SMSService {
  private provider: OrangeSMSProvider

  constructor() {
    this.provider = new OrangeSMSProvider()
  }

  async scheduleReminder(notification: Notification, reminderType: string) {
    const template = await SMSTemplate.findByType(reminderType)
    const scheduledTime = this.calculateScheduleTime(notification.dueDate, reminderType)
    
    const message = await SMSMessage.create({
      patientId: notification.patientId,
      notificationId: notification.id,
      phoneNumber: notification.patient.primaryPhone,
      messageContent: this.renderTemplate(template, notification),
      messageType: reminderType,
      scheduledAt: scheduledTime,
      clientCorrelator: this.generateCorrelator(),
      senderAddress: process.env.ORANGE_SMS_SENDER_ADDRESS
    })

    return message
  }

  private calculateScheduleTime(dueDate: DateTime, reminderType: string): DateTime {
    switch (reminderType) {
      case '7_day_reminder':
        return dueDate.minus({ days: 7 }).set({ hour: 9, minute: 0 })
      case '1_day_reminder':
        return dueDate.minus({ days: 1 }).set({ hour: 9, minute: 0 })
      case 'overdue_reminder':
        return dueDate.plus({ days: 1 }).set({ hour: 14, minute: 0 })
      default:
        throw new Error(`Unknown reminder type: ${reminderType}`)
    }
  }
}
```

## API Integration Points

### Webhook Endpoints

#### 1. Delivery Status Webhook
```typescript
// backend/app/controllers/sms_webhooks_controller.ts
export default class SMSWebhooksController {
  async deliveryStatus({ request, response }: HttpContext) {
    const webhookData = request.body()
    
    // Log webhook for audit
    await SMSWebhookLog.create({
      webhookType: 'delivery_status',
      requestBody: webhookData,
      requestHeaders: request.headers(),
      requestIp: request.ip()
    })

    // Process delivery status
    const deliveryInfo = webhookData.deliveryInfoNotification?.deliveryInfo
    if (deliveryInfo) {
      await this.updateMessageDeliveryStatus(deliveryInfo)
    }

    return response.status(200).send('OK')
  }

  async inboundMessage({ request, response }: HttpContext) {
    const webhookData = request.body()
    
    // Handle STOP requests and other inbound messages
    const inboundMessage = webhookData.inboundSMSMessageNotification?.inboundSMSMessage
    if (inboundMessage) {
      await this.processInboundMessage(inboundMessage)
    }

    return response.status(200).send('OK')
  }
}
```

#### 2. Route Configuration
```typescript
// backend/start/routes.ts (additions)
router.group(() => {
  router.post('/delivery-status', '#controllers/sms_webhooks_controller.deliveryStatus')
  router.post('/inbound-message', '#controllers/sms_webhooks_controller.inboundMessage')
})
  .prefix('/api/sms/webhook')
  .middleware(['throttle:1000,1']) // High rate limit for webhooks
```

## Configuration Management

### Environment Variables
```typescript
// backend/config/sms.ts
import env from '#start/env'

export default {
  enabled: env.get('SMS_ENABLED', false),
  sandboxMode: env.get('SMS_SANDBOX_MODE', true),
  
  orange: {
    apiKey: env.get('ORANGE_SMS_API_KEY'),
    baseUrl: env.get('ORANGE_SMS_BASE_URL'),
    senderAddress: env.get('ORANGE_SMS_SENDER_ADDRESS'),
    webhookBaseUrl: env.get('ORANGE_SMS_WEBHOOK_BASE_URL')
  },
  
  rateLimits: {
    perMinute: env.get('SMS_RATE_LIMIT_PER_MINUTE', 100),
    retryAttempts: env.get('SMS_RETRY_ATTEMPTS', 3),
    retryDelayMs: env.get('SMS_RETRY_DELAY_MS', 5000)
  },
  
  scheduling: {
    batchSize: env.get('SMS_BATCH_SIZE', 50),
    processingInterval: env.get('SMS_PROCESSING_INTERVAL_MINUTES', 5)
  }
}
```

## Security Requirements

### API Key Management
- Store API keys in secure environment variables
- Use different keys for sandbox and production
- Implement key rotation procedures
- Monitor API key usage and anomalies

### Webhook Security
- Validate webhook source IP addresses
- Implement request signature verification
- Use HTTPS for all webhook endpoints
- Rate limit webhook endpoints

### Data Protection
- Encrypt phone numbers in database
- Implement access controls for SMS data
- Log all SMS-related activities
- Provide data deletion capabilities

## Performance Considerations

### Database Optimization
- Index frequently queried columns
- Implement database connection pooling
- Use read replicas for reporting queries
- Archive old SMS logs regularly

### Message Processing
- Implement queue-based message processing
- Use batch processing for bulk messages
- Implement circuit breaker patterns
- Monitor and alert on processing delays

### Caching Strategy
- Cache SMS templates in memory
- Cache consent status for active patients
- Use Redis for rate limiting
- Implement template compilation caching

## Monitoring and Logging

### Required Metrics
- SMS send success/failure rates
- Delivery status distribution
- API response times
- Webhook processing times
- Queue depths and processing rates

### Logging Requirements
- All SMS API requests and responses
- Webhook deliveries and processing
- Consent changes and opt-outs
- Error conditions and retries
- Performance metrics

### Alerting Thresholds
- SMS failure rate > 5%
- API response time > 5 seconds
- Webhook processing delays > 1 minute
- Queue depth > 1000 messages
- Consent opt-out rate > 10%

## Testing Requirements

### Unit Testing
- SMS service methods
- Template rendering logic
- Consent validation
- Webhook processing
- Error handling scenarios

### Integration Testing
- Orange Network API integration
- Database operations
- Webhook endpoint functionality
- End-to-end message flow
- Failure recovery scenarios

### Load Testing
- Bulk message sending
- Webhook processing under load
- Database performance
- API rate limiting
- Queue processing capacity

## Deployment Considerations

### Environment Setup
- Separate sandbox and production configurations
- SSL certificate installation
- Firewall configuration for webhooks
- Database migration execution
- Environment variable configuration

### Rollback Strategy
- Database migration rollback scripts
- Feature flag for SMS functionality
- API key rollback procedures
- Webhook endpoint versioning
- Data backup and recovery plans

## Related Documentation

- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)
- **Message Constraints**: [`03-message-constraints.md`](03-message-constraints.md)
- **Healthcare Compliance**: [`05-healthcare-compliance.md`](05-healthcare-compliance.md)
- **Implementation Checklist**: [`11-implementation-checklist.md`](11-implementation-checklist.md)