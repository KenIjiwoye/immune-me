# SMS Integration with Orange API - Implementation Guide

This document provides a comprehensive guide for the SMS integration with Orange API in the Immune-Me healthcare notification system.

## Overview

The SMS integration enables automatic sending of vaccination reminders and alerts to patients via SMS using the Orange SMS API. The system supports:

- Automatic SMS sending when notifications are created
- Delivery receipt tracking
- Message templates for different notification types
- Retry mechanisms for failed messages
- Bulk SMS processing
- Healthcare-specific message formatting

## Architecture Components

### 1. Core Services

#### SmsService (`backend/app/services/sms_service.ts`)
- Handles Orange API communication
- Manages SMS sending and delivery receipts
- Provides phone number validation and formatting
- Implements error handling and retry logic

#### SmsTemplateService (`backend/app/services/sms_template_service.ts`)
- Generates healthcare-specific message templates
- Handles message length optimization (160 char limit)
- Provides template customization
- Supports multiple message types

#### NotificationService (Enhanced)
- Integrates SMS sending with notification creation
- Manages SMS status tracking
- Provides bulk SMS processing
- Handles SMS retry logic

### 2. Database Schema

#### SMS Tracking Fields (Added to `notifications` table)
```sql
sms_message_id VARCHAR(255)     -- Orange API message ID
sms_status ENUM                 -- not_sent, sent, delivered, failed
sms_sent_at TIMESTAMP          -- When SMS was sent
sms_delivered_at TIMESTAMP     -- When SMS was delivered
sms_error_message TEXT         -- Error message if failed
sms_error_code VARCHAR(50)     -- Error code if failed
sms_retry_count INTEGER        -- Number of retry attempts
sms_last_retry_at TIMESTAMP    -- Last retry timestamp
```

### 3. API Endpoints

#### SMS Management Routes (`/api/sms/`)
- `POST /delivery-receipt` - Webhook for Orange delivery receipts (public)
- `POST /notifications/:id/send` - Send SMS for specific notification
- `POST /notifications/:id/retry` - Retry failed SMS
- `GET /status` - Get SMS status for notifications
- `GET /service-status` - Get SMS service configuration status
- `POST /test` - Test SMS sending (admin only)

## Configuration

### Environment Variables

```env
# SMS Service Configuration
SMS_ENABLED=true
ORANGE_SMS_API_URL=https://api.orange.com
ORANGE_SMS_SENDER_ADDRESS=tel:+231987654321
ORANGE_SMS_API_KEY=your-orange-api-key-here
ORANGE_SMS_WEBHOOK_URL=https://your-domain.com/api/sms/delivery-receipt

# Optional SMS Settings
SMS_MAX_RETRIES=3
SMS_RETRY_DELAY_MS=2000
SMS_RATE_LIMIT_PER_MINUTE=30
```

### Orange API Requirements

1. **Sender Address Format**: Must use `tel:+{countryCode}{number}` format
2. **Authentication**: API key required (obtain from Orange Developer Portal)
3. **Message Length**: Maximum 160 characters
4. **Rate Limiting**: Respect API rate limits
5. **Webhook URL**: Must be publicly accessible HTTPS endpoint

## Message Templates

### Default Templates

#### Appointment Reminder
```
Dear {patientName}, your {vaccineName} vaccination is due on {dueDate}. Please visit {facilityName}. Call {facilityPhone} for info.
```

#### Overdue Alert
```
URGENT: {patientName} missed {vaccineName} vaccination due {dueDate}. Visit {facilityName} immediately. Call {facilityPhone}.
```

#### Confirmation
```
{patientName} received {vaccineName} vaccination on {date} at {facilityName}. Next dose due: {nextDate}.
```

### Template Variables

- `{patientName}` - Patient's name (shortened for SMS)
- `{vaccineName}` - Vaccine name (abbreviated)
- `{dueDate}` - Due date (format: dd-MMM)
- `{facilityName}` - Facility name (shortened)
- `{facilityPhone}` - Facility contact phone
- `{date}` - Vaccination date
- `{nextDate}` - Next vaccination due date

### Message Optimization

The system automatically:
- Shortens patient names (e.g., "John Doe" → "John D.")
- Uses vaccine abbreviations (e.g., "Bacillus Calmette-Guérin" → "BCG")
- Shortens facility names (e.g., "Health Center" → "HC")
- Uses compact date format (e.g., "15-Jan")
- Falls back to shorter templates if message exceeds 160 characters

## Usage Examples

### 1. Automatic SMS on Notification Creation

```typescript
// SMS is automatically sent when creating notifications
const notificationService = new NotificationService()
const notification = await notificationService.createNotificationForRecord(
  patientId,
  vaccineId,
  dueDate,
  facilityId
)
// SMS will be sent automatically if SMS_ENABLED=true
```

### 2. Manual SMS Sending

```typescript
// Send SMS for specific notification
const smsController = new SmsController()
await smsController.sendNotificationSms({
  params: { id: notificationId },
  request: { 
    body: () => ({ 
      templateType: 'appointment_reminder' 
    }) 
  },
  response,
  auth: { user }
})
```

### 3. Bulk SMS Processing

```typescript
const notificationService = new NotificationService()
const result = await notificationService.sendBulkSmsForDueNotifications(facilityId)
console.log(`Processed: ${result.processed}, Successful: ${result.successful}`)
```

### 4. Retry Failed SMS

```typescript
const result = await notificationService.retryFailedSms(maxRetries = 3)
console.log(`Retried: ${result.processed}, Successful: ${result.successful}`)
```

## Error Handling

### Common Error Codes

- `VALIDATION_ERROR` - Invalid phone number or message
- `NO_PHONE` - Patient has no contact phone number
- `MESSAGE_GENERATION_ERROR` - Failed to generate message template
- `SERVICE_ERROR` - Network or API error
- `SVC0280` - Message too long (Orange API)
- `POL0001` - Policy error (Orange API)

### Retry Logic

- Failed SMS messages are automatically retried up to 3 times
- Exponential backoff between retries (1s, 2s, 4s)
- Only recent notifications (within 7 days) are retried
- Rate limiting respected between retry attempts

## Monitoring and Logging

### SMS Status Tracking

Monitor SMS delivery through:
- Database `sms_status` field
- API endpoint `/api/sms/status`
- Delivery receipt webhooks

### Logging

The system logs:
- SMS sending attempts and results
- Delivery receipt processing
- Error conditions and retry attempts
- Bulk processing statistics

### Health Checks

Check SMS service status:
```bash
curl -H "Authorization: Bearer <token>" \
  https://your-domain.com/api/sms/service-status
```

## Security Considerations

### Webhook Security

1. **HTTPS Only**: Webhook URL must use HTTPS
2. **IP Whitelisting**: Consider whitelisting Orange API IPs
3. **Request Validation**: Validate webhook payload structure
4. **Rate Limiting**: Implement rate limiting on webhook endpoint

### Data Privacy

1. **Message Content**: Avoid sensitive medical details in SMS
2. **Phone Number Validation**: Ensure valid Liberian numbers (+231)
3. **Consent Management**: Ensure SMS consent obtained during registration
4. **Audit Trail**: Log all SMS attempts for compliance

## Deployment Checklist

### Pre-deployment

- [ ] Orange API credentials configured
- [ ] Webhook URL accessible and HTTPS
- [ ] Database migration applied
- [ ] Environment variables set
- [ ] SMS templates tested

### Post-deployment

- [ ] Test SMS sending functionality
- [ ] Verify delivery receipt processing
- [ ] Monitor error logs
- [ ] Test retry mechanisms
- [ ] Validate message templates

## Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check `SMS_ENABLED` environment variable
   - Verify Orange API credentials
   - Check patient phone number format

2. **Messages Too Long**
   - Review message templates
   - Check template variable values
   - Verify automatic shortening logic

3. **Delivery Receipts Not Working**
   - Verify webhook URL accessibility
   - Check Orange API subscription status
   - Review webhook payload format

4. **High Failure Rate**
   - Check phone number formats
   - Verify Orange API rate limits
   - Review error logs for patterns

### Debug Commands

```bash
# Test SMS service configuration
node ace sms:test-config

# Send test SMS
node ace sms:test-send +231123456789 "Test message"

# Process failed SMS retries
node ace sms:retry-failed

# Send bulk SMS for due notifications
node ace sms:bulk-send --facility-id=1
```

## Performance Considerations

### Rate Limiting

- Orange API has rate limits (typically 30 SMS/minute)
- Implement delays between bulk SMS sends
- Use queue system for high-volume scenarios

### Database Optimization

- Index SMS status fields for queries
- Archive old SMS records periodically
- Monitor SMS-related query performance

### Scaling

- Consider SMS queue system for high volume
- Implement SMS service clustering if needed
- Monitor Orange API usage limits

## Compliance (Liberian Healthcare Context)

### Regulatory Requirements

1. **Patient Consent**: Obtain explicit SMS consent
2. **Data Protection**: Secure SMS content and logs
3. **Audit Trail**: Maintain SMS sending records
4. **Opt-out Mechanism**: Provide SMS STOP functionality

### Best Practices

1. **Message Timing**: Send during appropriate hours
2. **Language**: Use clear, simple language
3. **Frequency**: Avoid SMS spam
4. **Emergency Alerts**: Prioritize urgent notifications

## Support and Maintenance

### Regular Tasks

- Monitor SMS delivery rates
- Review and update message templates
- Check Orange API usage and billing
- Update phone number validation rules
- Review error logs and patterns

### Updates and Changes

- Test SMS functionality after system updates
- Validate message templates after changes
- Monitor delivery rates after Orange API updates
- Update webhook handling for API changes

For technical support or questions about the SMS integration, refer to the Orange Developer Documentation or contact the development team.