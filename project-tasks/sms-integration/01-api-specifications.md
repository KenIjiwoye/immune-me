# Orange Network SMS API Specifications

## Overview

The Orange Network SMS API provides a RESTful interface for sending SMS messages with comprehensive delivery tracking and webhook support. This document details the complete API specifications, authentication methods, and integration requirements for the Immunization Records Management System.

## Base API Information

### Endpoints
- **Production**: `https://api.orange.com/smsmessaging/v1/`
- **Sandbox**: `https://api.orange.com/smsmessaging/v1/sandbox/`
- **Documentation**: `https://developer.orange.com/apis/sms-api/`

### Authentication
- **Method**: API Key Authentication
- **Header**: `Authorization: Bearer {API_KEY}`
- **Key Management**: Secure storage required, rotation every 90 days recommended

### Supported Formats
- **Request**: JSON
- **Response**: JSON
- **Character Encoding**: UTF-8
- **Content-Type**: `application/json`

## Core API Endpoints

### 1. Send SMS Message

**Endpoint**: `POST /outbound/{senderAddress}/requests`

**Description**: Send a single SMS message or bulk messages to multiple recipients.

#### Request Headers
```http
Authorization: Bearer {API_KEY}
Content-Type: application/json
Accept: application/json
```

#### Request Body
```json
{
  "outboundSMSMessageRequest": {
    "address": [
      "tel:+231770123456",
      "tel:+231880654321"
    ],
    "senderAddress": "tel:+231123456789",
    "outboundSMSTextMessage": {
      "message": "Reminder: Your child's vaccination is due on 2024-02-15. Please visit Health Center ABC. Reply STOP to opt out."
    },
    "clientCorrelator": "unique-request-id-12345",
    "receiptRequest": {
      "notifyURL": "https://your-domain.com/api/sms/webhook/delivery-status",
      "callbackData": "immunization_reminder_batch_001"
    },
    "senderName": "HealthCenter"
  }
}
```

#### Response (Success - 201 Created)
```json
{
  "outboundSMSMessageRequest": {
    "address": [
      "tel:+231770123456",
      "tel:+231880654321"
    ],
    "senderAddress": "tel:+231123456789",
    "outboundSMSTextMessage": {
      "message": "Reminder: Your child's vaccination is due on 2024-02-15. Please visit Health Center ABC. Reply STOP to opt out."
    },
    "clientCorrelator": "unique-request-id-12345",
    "resourceURL": "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests/unique-request-id-12345",
    "deliveryInfoList": {
      "deliveryInfo": [
        {
          "address": "tel:+231770123456",
          "deliveryStatus": "DeliveredToNetwork"
        },
        {
          "address": "tel:+231880654321",
          "deliveryStatus": "DeliveredToNetwork"
        }
      ]
    }
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "requestError": {
    "serviceException": {
      "messageId": "SVC0001",
      "text": "Invalid parameter value",
      "variables": ["address"]
    }
  }
}
```

### 2. Query Delivery Status

**Endpoint**: `GET /outbound/{senderAddress}/requests/{requestId}/deliveryInfos`

**Description**: Check the delivery status of a previously sent message.

#### Request Headers
```http
Authorization: Bearer {API_KEY}
Accept: application/json
```

#### Response (Success - 200 OK)
```json
{
  "deliveryInfoList": {
    "deliveryInfo": [
      {
        "address": "tel:+231770123456",
        "deliveryStatus": "DeliveredToTerminal",
        "description": "Message delivered successfully"
      },
      {
        "address": "tel:+231880654321",
        "deliveryStatus": "DeliveryImpossible",
        "description": "Invalid phone number"
      }
    ],
    "resourceURL": "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B231123456789/requests/unique-request-id-12345/deliveryInfos"
  }
}
```

### 3. Retrieve Inbound Messages

**Endpoint**: `GET /inbound/registrations/{registrationId}/messages`

**Description**: Retrieve inbound SMS messages (for handling STOP requests and replies).

#### Request Headers
```http
Authorization: Bearer {API_KEY}
Accept: application/json
```

#### Response (Success - 200 OK)
```json
{
  "inboundSMSMessageList": {
    "inboundSMSMessage": [
      {
        "dateTime": "2024-02-10T14:30:00Z",
        "destinationAddress": "tel:+231123456789",
        "messageId": "msg-12345",
        "message": "STOP",
        "senderAddress": "tel:+231770123456"
      }
    ],
    "numberOfMessagesInThisBatch": 1,
    "resourceURL": "https://api.orange.com/smsmessaging/v1/inbound/registrations/reg-001/messages",
    "totalNumberOfPendingMessages": 0
  }
}
```

## Delivery Status Values

### Primary Status Codes
| Status | Description | Action Required |
|--------|-------------|-----------------|
| `DeliveredToNetwork` | Message accepted by network | Monitor for final delivery |
| `DeliveredToTerminal` | Message delivered to recipient | Success - log delivery |
| `DeliveryImpossible` | Delivery failed permanently | Mark as failed, investigate |
| `MessageWaiting` | Message queued for delivery | Continue monitoring |
| `DeliveredToGateway` | Message reached SMS gateway | Intermediate status |
| `DeliveryUncertain` | Delivery status unknown | Retry status check |

### Detailed Status Descriptions
- **DeliveredToNetwork**: Message has been accepted by the mobile network operator
- **DeliveredToTerminal**: Message successfully delivered to the recipient's device
- **DeliveryImpossible**: Permanent failure (invalid number, blocked, etc.)
- **MessageWaiting**: Message is queued, typically due to device being offline
- **DeliveredToGateway**: Message reached the SMS gateway but not yet delivered
- **DeliveryUncertain**: Status cannot be determined, may require manual investigation

## Webhook Configuration

### Delivery Receipt Webhook

**Your Endpoint**: `POST /api/sms/webhook/delivery-status`

**Orange Network Request**:
```json
{
  "deliveryInfoNotification": {
    "callbackData": "immunization_reminder_batch_001",
    "deliveryInfo": {
      "address": "tel:+231770123456",
      "deliveryStatus": "DeliveredToTerminal",
      "description": "Message delivered successfully"
    }
  }
}
```

**Expected Response**: `200 OK` with empty body

### Inbound Message Webhook

**Your Endpoint**: `POST /api/sms/webhook/inbound-message`

**Orange Network Request**:
```json
{
  "inboundSMSMessageNotification": {
    "callbackData": "inbound_handler",
    "inboundSMSMessage": {
      "dateTime": "2024-02-10T14:30:00Z",
      "destinationAddress": "tel:+231123456789",
      "messageId": "msg-12345",
      "message": "STOP",
      "senderAddress": "tel:+231770123456"
    }
  }
}
```

## Error Handling

### Common Error Codes

| Code | Message | Description | Resolution |
|------|---------|-------------|------------|
| `SVC0001` | Invalid parameter value | Invalid request parameter | Validate input data |
| `SVC0002` | Invalid input value | Malformed request body | Check JSON format |
| `POL0001` | Policy error | Rate limit exceeded | Implement backoff strategy |
| `SVC0003` | Invalid sender address | Unauthorized sender number | Verify sender registration |
| `SVC0004` | No valid addresses | All recipient numbers invalid | Validate phone numbers |

### Error Response Format
```json
{
  "requestError": {
    "serviceException": {
      "messageId": "SVC0001",
      "text": "Invalid parameter value",
      "variables": ["address"]
    }
  }
}
```

### Rate Limiting
- **Default Limit**: 100 requests per minute
- **Burst Limit**: 1000 requests per hour
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when rate limit resets

## Phone Number Format

### International Format Requirements
- **Format**: E.164 format with `tel:` prefix
- **Example**: `tel:+231770123456` (Liberia)
- **Validation Pattern**: `^tel:\+[1-9]\d{1,14}$`

### Supported Country Codes (Africa/Middle East)
| Country | Code | Example |
|---------|------|---------|
| Liberia | +231 | tel:+231770123456 |
| Ghana | +233 | tel:+233201234567 |
| Nigeria | +234 | tel:+234802345678 |
| Senegal | +221 | tel:+221771234567 |
| Ivory Coast | +225 | tel:+22507123456 |
| Mali | +223 | tel:+22370123456 |

## Message Constraints

### Character Limits
- **Single SMS**: 160 characters (GSM 7-bit encoding)
- **Unicode SMS**: 70 characters (UCS-2 encoding)
- **Concatenated SMS**: Up to 1530 characters (10 parts maximum)
- **Recommended**: Stay within 160 characters for optimal delivery

### Content Restrictions
- **Prohibited**: Spam, adult content, illegal activities
- **Healthcare**: Medical advice disclaimers recommended
- **Opt-out**: Must include unsubscribe mechanism
- **Sender ID**: Maximum 11 alphanumeric characters

## Integration Code Examples

### TypeScript/Node.js Implementation

```typescript
interface OrangeSMSConfig {
  apiKey: string;
  baseUrl: string;
  senderAddress: string;
  webhookUrl: string;
}

interface SMSMessage {
  recipients: string[];
  message: string;
  clientCorrelator: string;
  callbackData?: string;
}

class OrangeSMSService {
  constructor(private config: OrangeSMSConfig) {}

  async sendSMS(smsData: SMSMessage): Promise<any> {
    const payload = {
      outboundSMSMessageRequest: {
        address: smsData.recipients.map(num => `tel:${num}`),
        senderAddress: `tel:${this.config.senderAddress}`,
        outboundSMSTextMessage: {
          message: smsData.message
        },
        clientCorrelator: smsData.clientCorrelator,
        receiptRequest: {
          notifyURL: this.config.webhookUrl,
          callbackData: smsData.callbackData || 'default'
        }
      }
    };

    const response = await fetch(
      `${this.config.baseUrl}/outbound/${encodeURIComponent(`tel:${this.config.senderAddress}`)}/requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SMS API Error: ${error.requestError?.serviceException?.text}`);
    }

    return response.json();
  }

  async checkDeliveryStatus(requestId: string): Promise<any> {
    const response = await fetch(
      `${this.config.baseUrl}/outbound/${encodeURIComponent(`tel:${this.config.senderAddress}`)}/requests/${requestId}/deliveryInfos`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check delivery status: ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Security Considerations

### API Key Management
- Store API keys in environment variables
- Use different keys for sandbox and production
- Implement key rotation every 90 days
- Monitor API key usage for anomalies

### Webhook Security
- Validate webhook signatures if provided
- Use HTTPS endpoints only
- Implement request rate limiting
- Log all webhook requests for audit

### Data Protection
- Encrypt phone numbers in database
- Implement access controls for SMS logs
- Comply with local data protection laws
- Provide opt-out mechanisms

## Testing and Validation

### Sandbox Environment
- **Purpose**: Development and testing
- **Limitations**: Limited to test phone numbers
- **Behavior**: Simulates real API responses
- **Cost**: Free for development

### Test Phone Numbers
```
+231000000001 - Always delivers successfully
+231000000002 - Always fails delivery
+231000000003 - Simulates network delays
+231000000004 - Simulates invalid number
```

### Validation Checklist
- [ ] API key authentication working
- [ ] Phone number format validation
- [ ] Message length constraints
- [ ] Webhook endpoint responding
- [ ] Error handling implemented
- [ ] Rate limiting respected
- [ ] Delivery status tracking
- [ ] Opt-out mechanism functional

## Related Documentation

- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Message Constraints**: [`03-message-constraints.md`](03-message-constraints.md)
- **Delivery Tracking**: [`04-delivery-tracking.md`](04-delivery-tracking.md)
- **Quick Reference**: [`12-quick-reference.md`](12-quick-reference.md)