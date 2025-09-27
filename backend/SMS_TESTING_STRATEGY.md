# SMS Testing Strategy for Orange API Integration

## Overview

This document outlines a comprehensive testing strategy for the Orange SMS API integration in the Immune-Me healthcare system. The testing strategy covers all aspects from unit tests to production monitoring to ensure reliable SMS delivery for patient notifications.

## Table of Contents

1. [Unit Testing Strategy](#unit-testing-strategy)
2. [Integration Testing Strategy](#integration-testing-strategy)
3. [End-to-End Testing Strategy](#end-to-end-testing-strategy)
4. [Manual Testing Procedures](#manual-testing-procedures)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Compliance Testing](#compliance-testing)
8. [Production Monitoring](#production-monitoring)
9. [Test Data Management](#test-data-management)
10. [Continuous Integration](#continuous-integration)

---

## Unit Testing Strategy

### 1. SMS Service Tests (`SmsService`)

#### Test File: `tests/unit/services/sms_service.test.ts`

**Core Method Tests:**

```typescript
describe('SmsService', () => {
  describe('sendSms()', () => {
    // Test successful SMS sending
    test('should send SMS successfully with valid inputs')
    
    // Test input validation
    test('should reject empty phone number')
    test('should reject empty message')
    test('should reject message longer than 160 characters')
    test('should reject invalid Liberian phone format')
    
    // Test phone number formatting
    test('should format phone number with leading 0 correctly')
    test('should format phone number with 231 prefix correctly')
    test('should format phone number without prefix correctly')
    test('should handle phone numbers with spaces and dashes')
    
    // Test API error handling
    test('should handle Orange API authentication errors')
    test('should handle Orange API rate limiting')
    test('should handle Orange API service unavailable')
    test('should handle network timeout errors')
    test('should handle malformed API responses')
    
    // Test retry logic
    test('should not retry on validation errors')
    test('should handle service configuration errors')
  })
  
  describe('subscribeToDeliveryReceipts()', () => {
    test('should subscribe successfully with valid webhook URL')
    test('should handle missing webhook URL gracefully')
    test('should handle subscription API errors')
    test('should parse subscription response correctly')
  })
  
  describe('processDeliveryReceipt()', () => {
    test('should process delivered status correctly')
    test('should process failed status correctly')
    test('should process pending status correctly')
    test('should handle malformed receipt data')
    test('should extract message ID correctly')
    test('should handle missing message ID')
  })
  
  describe('Configuration validation', () => {
    test('should detect missing API key')
    test('should detect missing sender address')
    test('should detect missing base URL')
    test('should return correct configuration status')
  })
})
```

**Mock Strategy:**
- Mock `fetch` API for Orange SMS API calls
- Mock environment variables for configuration testing
- Mock logger to verify error logging
- Use test fixtures for API response data

### 2. SMS Template Service Tests (`SmsTemplateService`)

#### Test File: `tests/unit/services/sms_template_service.test.ts`

```typescript
describe('SmsTemplateService', () => {
  describe('generateMessage()', () => {
    test('should generate appointment reminder correctly')
    test('should generate overdue alert correctly')
    test('should generate confirmation message correctly')
    test('should handle missing template variables')
    test('should truncate long messages appropriately')
    test('should use shortened templates when needed')
    test('should reject unknown template types')
  })
  
  describe('Template-specific generators', () => {
    test('generateAppointmentReminder() should format all variables')
    test('generateOverdueAlert() should include urgency indicators')
    test('generateConfirmation() should handle optional next date')
  })
  
  describe('Name shortening', () => {
    test('should shorten long patient names correctly')
    test('should abbreviate vaccine names using lookup table')
    test('should shorten facility names with common replacements')
    test('should handle edge cases (empty names, single names)')
  })
  
  describe('Template validation', () => {
    test('should validate template variables correctly')
    test('should detect unreplaced variables')
    test('should calculate message length accurately')
    test('should identify invalid templates')
  })
})
```

### 3. SMS Controller Tests (`SmsController`)

#### Test File: `tests/unit/controllers/sms_controller.test.ts`

```typescript
describe('SmsController', () => {
  describe('handleDeliveryReceipt()', () => {
    test('should process valid delivery receipt')
    test('should update notification status correctly')
    test('should handle invalid receipt format')
    test('should log webhook requests properly')
    test('should return appropriate HTTP responses')
  })
  
  describe('sendNotificationSms()', () => {
    test('should send SMS for valid notification')
    test('should check user facility access')
    test('should handle missing patient phone')
    test('should update notification SMS fields')
    test('should handle template generation errors')
    test('should handle SMS sending failures')
  })
  
  describe('retrySms()', () => {
    test('should retry failed SMS successfully')
    test('should respect retry limits')
    test('should update retry counters')
    test('should handle non-failed notifications')
  })
  
  describe('getSmsStatus()', () => {
    test('should return paginated SMS status')
    test('should filter by SMS status')
    test('should respect facility access controls')
    test('should format response correctly')
  })
})
```

### 4. Notification Model Tests

#### Test File: `tests/unit/models/notification.test.ts`

```typescript
describe('Notification Model', () => {
  describe('SMS fields', () => {
    test('should save SMS tracking fields correctly')
    test('should handle null SMS fields')
    test('should update SMS status transitions')
    test('should track retry attempts')
  })
  
  describe('Relationships', () => {
    test('should load patient relationship')
    test('should load vaccine relationship')
    test('should load facility relationship')
  })
})
```

---

## Integration Testing Strategy

### 1. Orange API Integration Tests

#### Test File: `tests/integration/orange_api.test.ts`

**Mock Orange API Server Setup:**
```typescript
// Use MSW (Mock Service Worker) or similar to mock Orange API
describe('Orange API Integration', () => {
  beforeAll(() => {
    // Setup mock Orange API server
    setupMockOrangeAPI()
  })
  
  describe('SMS Sending', () => {
    test('should handle successful SMS API response')
    test('should handle authentication failures')
    test('should handle rate limiting responses')
    test('should handle malformed responses')
    test('should handle network timeouts')
  })
  
  describe('Delivery Receipt Subscription', () => {
    test('should subscribe to delivery receipts successfully')
    test('should handle subscription failures')
    test('should parse subscription responses correctly')
  })
  
  describe('Webhook Processing', () => {
    test('should process delivery receipt webhooks')
    test('should handle various webhook formats')
    test('should validate webhook signatures (if implemented)')
  })
})
```

### 2. Database Integration Tests

#### Test File: `tests/integration/database_sms.test.ts`

```typescript
describe('SMS Database Integration', () => {
  describe('Notification SMS fields', () => {
    test('should persist SMS status correctly')
    test('should update delivery timestamps')
    test('should track error messages and codes')
    test('should handle retry counters')
    test('should query by SMS status')
  })
  
  describe('SMS status queries', () => {
    test('should filter notifications by SMS status')
    test('should paginate SMS status results')
    test('should join with related models correctly')
  })
})
```

### 3. Notification Service Integration

#### Test File: `tests/integration/notification_sms.test.ts`

```typescript
describe('Notification SMS Integration', () => {
  test('should send SMS when notification is created')
  test('should update notification with SMS results')
  test('should handle SMS failures gracefully')
  test('should process delivery receipts for notifications')
  test('should retry failed SMS messages')
})
```

---

## End-to-End Testing Strategy

### 1. Complete SMS Workflow Tests

#### Test File: `tests/e2e/sms_workflow.test.ts`

```typescript
describe('SMS Workflow E2E', () => {
  test('Complete appointment reminder flow', async () => {
    // 1. Create patient with phone number
    // 2. Create vaccine and schedule
    // 3. Generate notification
    // 4. Send SMS via API
    // 5. Verify SMS status updated
    // 6. Simulate delivery receipt
    // 7. Verify final status
  })
  
  test('Overdue alert workflow', async () => {
    // Similar flow for overdue alerts
  })
  
  test('Failed SMS retry workflow', async () => {
    // 1. Create notification
    // 2. Simulate SMS failure
    // 3. Verify failure recorded
    // 4. Retry SMS
    // 5. Verify retry counter updated
  })
})
```

### 2. Bulk SMS Processing Tests

#### Test File: `tests/e2e/bulk_sms.test.ts`

```typescript
describe('Bulk SMS Processing', () => {
  test('should process multiple notifications efficiently')
  test('should handle partial failures in bulk operations')
  test('should respect rate limits during bulk sending')
  test('should track progress of bulk operations')
})
```

### 3. Webhook End-to-End Tests

#### Test File: `tests/e2e/webhook_processing.test.ts`

```typescript
describe('Webhook E2E Processing', () => {
  test('should receive and process delivery receipts')
  test('should update correct notifications from webhooks')
  test('should handle webhook authentication')
  test('should log webhook processing correctly')
})
```

---

## Manual Testing Procedures

### 1. SMS Sending Verification

**Test Checklist:**

- [ ] **Environment Setup**
  - Verify Orange API credentials are configured
  - Confirm webhook URL is accessible
  - Check sender address is registered

- [ ] **Basic SMS Sending**
  - Send test SMS to valid Liberian number
  - Verify SMS received on actual device
  - Check message content and sender name
  - Confirm delivery receipt received

- [ ] **Phone Number Formats**
  - Test with `+231XXXXXXXX` format
  - Test with `231XXXXXXXX` format
  - Test with `0XXXXXXXX` format
  - Test with spaces and dashes in number

- [ ] **Message Templates**
  - Test appointment reminder template
  - Test overdue alert template
  - Test confirmation message template
  - Verify message length stays under 160 chars

- [ ] **Error Scenarios**
  - Test with invalid phone numbers
  - Test with empty message content
  - Test with overly long messages
  - Test with missing API credentials

### 2. Webhook Testing with ngrok

**Setup Instructions:**

1. **Install and Configure ngrok:**
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start ngrok tunnel
   ngrok http 3333
   
   # Update ORANGE_SMS_WEBHOOK_URL in .env
   ORANGE_SMS_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/sms/webhook
   ```

2. **Test Webhook Reception:**
   - Send SMS through system
   - Monitor ngrok dashboard for webhook calls
   - Verify webhook payload structure
   - Check notification status updates

3. **Webhook Security Testing:**
   - Test webhook without authentication
   - Verify webhook signature validation (if implemented)
   - Test malformed webhook payloads

### 3. Orange API Credential Validation

**Validation Steps:**

1. **API Key Testing:**
   ```bash
   # Test API authentication
   curl -X POST "https://api.orange.com/smsmessaging/v1/outbound/tel:+231XXXXXXXX/requests" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"outboundSMSMessageRequest":{"address":"tel:+231XXXXXXXX","senderAddress":"tel:+231XXXXXXXX","outboundSMSTextMessage":{"message":"Test"}}}'
   ```

2. **Rate Limit Testing:**
   - Send multiple SMS in quick succession
   - Monitor for rate limiting responses
   - Verify system handles rate limits gracefully

3. **Subscription Testing:**
   - Test delivery receipt subscription
   - Verify subscription is active
   - Test subscription renewal if needed

### 4. Message Template Validation

**Template Testing Checklist:**

- [ ] **Variable Replacement**
  - All template variables are replaced
  - No `{variable}` placeholders remain
  - Special characters handled correctly

- [ ] **Message Length**
  - Standard templates under 160 characters
  - Shortened templates work correctly
  - Long names are abbreviated properly

- [ ] **Content Appropriateness**
  - Medical terminology is appropriate
  - Messages are professional and clear
  - Urgency levels are appropriate

---

## Performance Testing

### 1. Rate Limiting Tests

#### Test File: `tests/performance/rate_limiting.test.ts`

```typescript
describe('SMS Rate Limiting', () => {
  test('should respect Orange API rate limits')
  test('should queue messages when rate limited')
  test('should implement exponential backoff')
  test('should handle burst traffic appropriately')
})
```

**Performance Benchmarks:**
- Maximum SMS per minute: Based on Orange API limits
- Queue processing time: < 5 seconds per message
- Memory usage during bulk operations: < 100MB increase

### 2. Bulk SMS Performance

#### Test File: `tests/performance/bulk_sms.test.ts`

```typescript
describe('Bulk SMS Performance', () => {
  test('should process 100 SMS within acceptable time')
  test('should handle 1000+ notifications efficiently')
  test('should maintain memory usage during bulk operations')
  test('should provide progress tracking for bulk operations')
})
```

**Performance Targets:**
- 100 SMS processed in < 2 minutes
- Memory usage increase < 50MB per 100 SMS
- Database queries optimized (< 10 queries per SMS)

### 3. API Response Time Monitoring

```typescript
describe('API Response Time', () => {
  test('should track Orange API response times')
  test('should alert on slow API responses')
  test('should handle API timeouts gracefully')
})
```

**Response Time Targets:**
- Orange API response: < 5 seconds
- Webhook processing: < 1 second
- Database updates: < 500ms

---

## Security Testing

### 1. Webhook Endpoint Security

#### Test File: `tests/security/webhook_security.test.ts`

```typescript
describe('Webhook Security', () => {
  test('should validate webhook source IP')
  test('should verify webhook signatures')
  test('should handle malicious payloads')
  test('should rate limit webhook requests')
  test('should log security events')
})
```

**Security Checklist:**
- [ ] Webhook endpoint uses HTTPS
- [ ] Webhook signature validation implemented
- [ ] Rate limiting on webhook endpoint
- [ ] Input sanitization for webhook data
- [ ] Logging of security events

### 2. API Key Protection

```typescript
describe('API Key Security', () => {
  test('should not expose API keys in logs')
  test('should not return API keys in responses')
  test('should handle API key rotation')
  test('should detect API key compromise')
})
```

### 3. Input Sanitization

```typescript
describe('Input Sanitization', () => {
  test('should sanitize phone numbers')
  test('should sanitize message content')
  test('should prevent SMS injection attacks')
  test('should validate template variables')
})
```

### 4. Phone Number Privacy

```typescript
describe('Phone Number Privacy', () => {
  test('should mask phone numbers in logs')
  test('should encrypt phone numbers in database')
  test('should limit phone number access by role')
  test('should audit phone number access')
})
```

---

## Compliance Testing

### 1. Healthcare Message Content Validation

#### Test File: `tests/compliance/healthcare_content.test.ts`

```typescript
describe('Healthcare Content Compliance', () => {
  test('should validate medical terminology accuracy')
  test('should ensure appropriate urgency levels')
  test('should verify professional language use')
  test('should check for required disclaimers')
})
```

**Content Guidelines:**
- Medical information must be accurate
- Urgency levels appropriate to medical context
- Professional, clear language
- Include facility contact information
- Avoid medical advice beyond scheduling

### 2. Patient Consent Verification

```typescript
describe('Patient Consent', () => {
  test('should verify SMS consent before sending')
  test('should handle consent withdrawal')
  test('should track consent status changes')
  test('should provide opt-out mechanisms')
})
```

**Consent Requirements:**
- Explicit SMS consent required
- Opt-out instructions in messages
- Consent status tracked in database
- Consent withdrawal processed immediately

### 3. Audit Trail Completeness

```typescript
describe('Audit Trail', () => {
  test('should log all SMS sending attempts')
  test('should track delivery status changes')
  test('should record user actions')
  test('should maintain immutable audit logs')
})
```

**Audit Requirements:**
- All SMS activities logged
- User identification in logs
- Timestamp accuracy
- Log integrity protection
- Retention policy compliance

### 4. HIPAA Compliance Considerations

```typescript
describe('HIPAA Compliance', () => {
  test('should minimize PHI in SMS content')
  test('should encrypt SMS data at rest')
  test('should secure SMS data in transit')
  test('should implement access controls')
})
```

**HIPAA Checklist:**
- [ ] Minimal PHI in SMS messages
- [ ] Encryption of stored SMS data
- [ ] Secure transmission protocols
- [ ] Access logging and monitoring
- [ ] Business Associate Agreement with Orange
- [ ] Data retention policies
- [ ] Breach notification procedures

---

## Production Monitoring

### 1. SMS Delivery Rate Monitoring

**Metrics to Track:**
- SMS delivery success rate (target: >95%)
- Average delivery time
- Failed message rate by error type
- Retry success rate

**Monitoring Setup:**
```typescript
// Example monitoring configuration
const smsMetrics = {
  deliveryRate: {
    target: 0.95,
    alert: 0.90
  },
  responseTime: {
    target: 5000, // 5 seconds
    alert: 10000  // 10 seconds
  },
  errorRate: {
    target: 0.05,
    alert: 0.10
  }
}
```

### 2. Error Rate Tracking

**Error Categories:**
- Validation errors (client-side)
- API authentication errors
- Network/connectivity errors
- Orange API service errors
- Rate limiting errors

**Alert Thresholds:**
- Error rate > 10% in 5-minute window
- Authentication failures > 5 in 1 hour
- Network errors > 20% in 10 minutes

### 3. Performance Metrics

**Key Performance Indicators:**
- SMS processing throughput (SMS/minute)
- Queue depth and processing time
- Memory usage during bulk operations
- Database query performance

**Dashboard Metrics:**
```typescript
const performanceMetrics = {
  throughput: 'SMS processed per minute',
  queueDepth: 'Pending SMS in queue',
  memoryUsage: 'Memory consumption during bulk ops',
  dbQueryTime: 'Average database query time'
}
```

### 4. Alert Configurations

**Critical Alerts:**
- SMS service completely down
- Orange API authentication failure
- Webhook endpoint unreachable
- Database connection failure

**Warning Alerts:**
- Delivery rate below 90%
- High error rate (>10%)
- Slow API response times
- Queue backlog building up

**Alert Channels:**
- Email notifications for critical issues
- Slack/Teams integration for warnings
- SMS alerts for service outages (ironic but necessary)
- Dashboard notifications for operators

---

## Test Data Management

### 1. Test Phone Numbers

**Test Number Categories:**
- Valid Liberian numbers for testing
- Invalid numbers for error testing
- International numbers for format testing
- Disconnected numbers for failure testing

**Test Data Setup:**
```typescript
const testPhoneNumbers = {
  valid: ['+231770123456', '+231880123456'],
  invalid: ['123', '+1234567890', ''],
  formatted: ['0770123456', '231770123456', '+231 77 012 3456']
}
```

### 2. Test Message Templates

```typescript
const testMessages = {
  short: 'Test message',
  long: 'This is a very long test message that exceeds the 160 character limit for SMS messages and should trigger the message shortening logic in our system',
  withVariables: 'Hello {patientName}, your {vaccineName} is due on {dueDate}',
  specialChars: 'Test with émojis 🏥 and special chars: @#$%'
}
```

### 3. Mock API Responses

```typescript
const mockOrangeResponses = {
  success: {
    outboundSMSMessageRequest: {
      resourceURL: 'https://api.orange.com/smsmessaging/v1/outbound/tel:+231770123456/requests/123456'
    }
  },
  authError: {
    requestError: {
      serviceException: {
        messageId: 'SVC0001',
        text: 'Invalid access token'
      }
    }
  },
  rateLimited: {
    requestError: {
      policyException: {
        messageId: 'POL0001',
        text: 'Rate limit exceeded'
      }
    }
  }
}
```

---

## Continuous Integration

### 1. Test Pipeline Configuration

```yaml
# .github/workflows/sms-tests.yml
name: SMS Integration Tests

on:
  push:
    paths:
      - 'backend/app/services/sms_service.ts'
      - 'backend/app/services/sms_template_service.ts'
      - 'backend/app/controllers/sms_controller.ts'
      - 'backend/tests/**/*sms*'

jobs:
  sms-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run SMS unit tests
        run: npm run test:unit -- --grep "SMS"
      
      - name: Run SMS integration tests
        run: npm run test:integration -- --grep "SMS"
        env:
          ORANGE_SMS_API_KEY: ${{ secrets.TEST_ORANGE_API_KEY }}
          ORANGE_SMS_SENDER_ADDRESS: ${{ secrets.TEST_SENDER_ADDRESS }}
      
      - name: Run SMS E2E tests
        run: npm run test:e2e -- --grep "SMS"
        if: github.ref == 'refs/heads/main'
```

### 2. Test Environment Setup

```typescript
// tests/setup/sms_test_env.ts
export const setupSmsTestEnvironment = () => {
  process.env.ORANGE_SMS_API_URL = 'https://mock-orange-api.test'
  process.env.ORANGE_SMS_API_KEY = 'test-api-key'
  process.env.ORANGE_SMS_SENDER_ADDRESS = '+231770000000'
  process.env.ORANGE_SMS_WEBHOOK_URL = 'https://test-webhook.ngrok.io/sms/webhook'
}
```

### 3. Test Coverage Requirements

**Coverage Targets:**
- SMS Service: 95% line coverage
- SMS Template Service: 90% line coverage
- SMS Controller: 85% line coverage
- Integration tests: All critical paths covered

**Coverage Enforcement:**
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 85,
        "statements": 85
      },
      "./backend/app/services/sms_service.ts": {
        "branches": 90,
        "functions": 95,
        "lines": 95,
        "statements": 95
      }
    }
  }
}
```

---

## Test Execution Schedule

### 1. Development Testing
- Unit tests: Run on every commit
- Integration tests: Run on pull requests
- Linting and type checking: Run on every commit

### 2. Staging Testing
- Full test suite: Run on deployment to staging
- Manual testing: Weekly comprehensive testing
- Performance tests: Run before production deployment

### 3. Production Testing
- Smoke tests: Run after production deployment
- Monitoring tests: Continuous monitoring
- Monthly comprehensive testing review

---

## Conclusion

This comprehensive testing strategy ensures the Orange SMS API integration is thoroughly tested across all dimensions:

- **Reliability**: Unit and integration tests ensure code quality
- **Functionality**: E2E tests verify complete workflows
- **Performance**: Load tests ensure scalability
- **Security**: Security tests protect sensitive data
- **Compliance**: Healthcare-specific testing ensures regulatory compliance
- **Monitoring**: Production monitoring ensures ongoing reliability

Regular execution of these tests, combined with continuous monitoring, will ensure the SMS integration remains robust and reliable for patient communications in the healthcare system.

---

## Quick Reference

### Test Commands
```bash
# Run all SMS tests
npm run test -- --grep "SMS"

# Run unit tests only
npm run test:unit -- --grep "SMS"

# Run integration tests
npm run test:integration -- --grep "SMS"

# Run E2E tests
npm run test:e2e -- --grep "SMS"

# Run with coverage
npm run test:coverage -- --grep "SMS"
```

### Environment Variables for Testing
```bash
ORANGE_SMS_API_URL=https://api.orange.com
ORANGE_SMS_API_KEY=your-test-api-key
ORANGE_SMS_SENDER_ADDRESS=+231770000000
ORANGE_SMS_WEBHOOK_URL=https://your-domain.com/sms/webhook
```

### Test Data Cleanup
```bash
# Clean test SMS data
npm run test:cleanup:sms

# Reset test database
npm run test:db:reset