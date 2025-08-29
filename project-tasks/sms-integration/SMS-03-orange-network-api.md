# SMS-03: Orange Network API Integration

## Context
This task implements the direct integration with the Orange Network SMS API, creating a robust provider layer that handles API communication, authentication, error handling, and response processing. The Orange Network provider serves as the concrete implementation of the SMS provider interface, enabling the system to send SMS messages and receive delivery status updates through Orange Network's REST API.

## Dependencies
- [`SMS-00`](SMS-00-oauth-token-management.md): OAuth 2.0 authentication must be implemented for Orange Network API access
- [`SMS-02`](SMS-02-sms-service-layer.md): SMS service layer must be implemented
- Orange Network API credentials and sender registration
- Network connectivity to Orange Network API endpoints

## Requirements

### 1. Orange Network SMS Provider
Create a comprehensive provider class that implements the SMS provider interface and handles all Orange Network API interactions.

### 2. API Authentication & Configuration
Implement secure API key management and configuration handling for both sandbox and production environments.

### 3. Message Sending Implementation
Develop robust message sending functionality with proper request formatting, error handling, and response processing.

### 4. Delivery Status Querying
Implement delivery status checking functionality to query message delivery status from Orange Network.

### 5. Rate Limiting & Throttling
Implement rate limiting to comply with Orange Network API constraints and prevent API quota exhaustion.

### 6. Error Handling & Retry Logic
Create comprehensive error handling for various API failure scenarios with intelligent retry mechanisms.

### 7. Phone Number Validation
Implement phone number validation and formatting according to Orange Network requirements.

## Code Examples

### Orange Network SMS Provider

```typescript
// backend/app/services/providers/orange_sms_provider.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { DateTime } from 'luxon'
import Logger from '@adonisjs/core/logger'
import OrangeAuthService from '../orange_auth_service.js'

export interface SMSMessage {
  recipients: string[]
  message: string
  clientCorrelator: string
  callbackData?: string
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  deliveryInfo?: DeliveryInfo[]
  error?: string
  rateLimitRemaining?: number
  rateLimitReset?: DateTime
}

export interface DeliveryInfo {
  address: string
  deliveryStatus: string
  description?: string
}

export interface OrangeSMSConfig {
  apiKey: string
  baseUrl: string
  senderAddress: string
  webhookBaseUrl: string
  sandboxMode: boolean
  rateLimitPerMinute: number
  retryAttempts: number
  retryDelayMs: number
}

export default class OrangeSMSProvider {
  private client: AxiosInstance
  private config: OrangeSMSConfig
  private authService: OrangeAuthService
  private rateLimitTracker: Map<string, { count: number; resetTime: DateTime }> = new Map()

  constructor() {
    this.config = this.loadConfig()
    this.authService = new OrangeAuthService()
    this.client = this.createHttpClient()
  }

  /**
   * Send SMS message via Orange Network API
   */
  public async sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
    try {
      // Validate phone numbers
      const validatedRecipients = this.validatePhoneNumbers(smsData.recipients)
      
      // Check rate limits
      await this.checkRateLimit()

      // Prepare request payload
      const payload = this.buildSendRequest(smsData, validatedRecipients)

      // Get authenticated headers
      const authHeaders = await this.authService.getAuthenticatedHeaders()

      // Send request to Orange Network API with OAuth authentication
      const response = await this.client.post(
        `/outbound/${encodeURIComponent(`tel:${this.config.senderAddress}`)}/requests`,
        payload,
        { headers: authHeaders }
      )

      // Process response
      const result = this.processSendResponse(response)
      
      // Update rate limit tracking
      this.updateRateLimitTracking(response)

      Logger.info(`SMS sent successfully via Orange Network: ${smsData.clientCorrelator}`)
      return result

    } catch (error) {
      Logger.error(`Orange Network SMS send failed: ${smsData.clientCorrelator}`, error)
      return this.handleSendError(error)
    }
  }

  /**
   * Query delivery status for a message
   */
  public async queryDeliveryStatus(clientCorrelator: string): Promise<SMSResponse> {
    try {
      await this.checkRateLimit()

      // Get authenticated headers
      const authHeaders = await this.authService.getAuthenticatedHeaders()

      const response = await this.client.get(
        `/outbound/${encodeURIComponent(`tel:${this.config.senderAddress}`)}/requests/${clientCorrelator}/deliveryInfos`,
        { headers: authHeaders }
      )

      const result = this.processDeliveryResponse(response)
      this.updateRateLimitTracking(response)

      Logger.info(`Delivery status queried: ${clientCorrelator}`)
      return result

    } catch (error) {
      Logger.error(`Delivery status query failed: ${clientCorrelator}`, error)
      return this.handleQueryError(error)
    }
  }

  /**
   * Send bulk SMS messages
   */
  public async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = []
    const batchSize = 10 // Orange Network recommended batch size

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      
      // Process batch with delay to respect rate limits
      const batchResults = await Promise.allSettled(
        batch.map(message => this.sendSMS(message))
      )

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error'
          })
        }
      }

      // Add delay between batches
      if (i + batchSize < messages.length) {
        await this.delay(1000) // 1 second delay between batches
      }
    }

    Logger.info(`Bulk SMS completed: ${results.length} messages processed`)
    return results
  }

  /**
   * Validate phone numbers according to Orange Network format
   */
  private validatePhoneNumbers(phoneNumbers: string[]): string[] {
    const validatedNumbers: string[] = []
    const e164Regex = /^\+[1-9]\d{1,14}$/

    for (const number of phoneNumbers) {
      // Remove tel: prefix if present
      const cleanNumber = number.replace(/^tel:/, '')
      
      // Validate E.164 format
      if (!e164Regex.test(cleanNumber)) {
        throw new Error(`Invalid phone number format: ${number}. Must be in E.164 format (+1234567890)`)
      }

      // Check if number is in supported regions (Africa/Middle East)
      if (!this.isSupportedRegion(cleanNumber)) {
        throw new Error(`Phone number not in supported region: ${number}`)
      }

      validatedNumbers.push(cleanNumber)
    }

    return validatedNumbers
  }

  /**
   * Check if phone number is in supported region
   */
  private isSupportedRegion(phoneNumber: string): boolean {
    const supportedCountryCodes = [
      '+231', // Liberia
      '+233', // Ghana
      '+234', // Nigeria
      '+221', // Senegal
      '+225', // Ivory Coast
      '+223', // Mali
      '+226', // Burkina Faso
      '+227', // Niger
      '+228', // Togo
      '+229', // Benin
    ]

    return supportedCountryCodes.some(code => phoneNumber.startsWith(code))
  }

  /**
   * Build Orange Network API request payload
   */
  private buildSendRequest(smsData: SMSMessage, recipients: string[]): any {
    return {
      outboundSMSMessageRequest: {
        address: recipients.map(num => `tel:${num}`),
        senderAddress: `tel:${this.config.senderAddress}`,
        outboundSMSTextMessage: {
          message: smsData.message
        },
        clientCorrelator: smsData.clientCorrelator,
        receiptRequest: {
          notifyURL: `${this.config.webhookBaseUrl}/api/sms/webhook/delivery-status`,
          callbackData: smsData.callbackData || 'default'
        },
        senderName: 'HealthCenter'
      }
    }
  }

  /**
   * Process Orange Network send response
   */
  private processSendResponse(response: AxiosResponse): SMSResponse {
    const data = response.data?.outboundSMSMessageRequest

    if (!data) {
      throw new Error('Invalid response format from Orange Network API')
    }

    const deliveryInfo: DeliveryInfo[] = []
    
    if (data.deliveryInfoList?.deliveryInfo) {
      for (const info of data.deliveryInfoList.deliveryInfo) {
        deliveryInfo.push({
          address: info.address?.replace('tel:', '') || '',
          deliveryStatus: info.deliveryStatus || 'Unknown',
          description: info.description
        })
      }
    }

    return {
      success: true,
      messageId: data.resourceURL?.split('/').pop(),
      deliveryInfo,
      rateLimitRemaining: this.extractRateLimitRemaining(response),
      rateLimitReset: this.extractRateLimitReset(response)
    }
  }

  /**
   * Process delivery status response
   */
  private processDeliveryResponse(response: AxiosResponse): SMSResponse {
    const data = response.data?.deliveryInfoList

    if (!data) {
      throw new Error('Invalid delivery status response format')
    }

    const deliveryInfo: DeliveryInfo[] = []
    
    if (data.deliveryInfo) {
      for (const info of data.deliveryInfo) {
        deliveryInfo.push({
          address: info.address?.replace('tel:', '') || '',
          deliveryStatus: info.deliveryStatus || 'Unknown',
          description: info.description
        })
      }
    }

    return {
      success: true,
      deliveryInfo,
      rateLimitRemaining: this.extractRateLimitRemaining(response),
      rateLimitReset: this.extractRateLimitReset(response)
    }
  }

  /**
   * Handle API send errors
   */
  private handleSendError(error: any): SMSResponse {
    let errorMessage = 'Unknown error'
    
    if (error.response?.data?.requestError?.serviceException) {
      const exception = error.response.data.requestError.serviceException
      errorMessage = `${exception.messageId}: ${exception.text}`
      
      if (exception.variables) {
        errorMessage += ` (${exception.variables.join(', ')})`
      }
    } else if (error.message) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      rateLimitRemaining: this.extractRateLimitRemaining(error.response),
      rateLimitReset: this.extractRateLimitReset(error.response)
    }
  }

  /**
   * Handle delivery query errors
   */
  private handleQueryError(error: any): SMSResponse {
    return this.handleSendError(error) // Same error handling logic
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = DateTime.now()
    const key = 'orange_api'
    const tracker = this.rateLimitTracker.get(key)

    if (!tracker || now > tracker.resetTime) {
      // Reset rate limit tracking
      this.rateLimitTracker.set(key, {
        count: 0,
        resetTime: now.plus({ minutes: 1 })
      })
      return
    }

    if (tracker.count >= this.config.rateLimitPerMinute) {
      const waitTime = tracker.resetTime.diff(now).as('milliseconds')
      Logger.warn(`Rate limit reached, waiting ${waitTime}ms`)
      await this.delay(waitTime)
      
      // Reset after waiting
      this.rateLimitTracker.set(key, {
        count: 0,
        resetTime: now.plus({ minutes: 1 })
      })
    }
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimitTracking(response?: AxiosResponse): void {
    if (!response) return

    const remaining = this.extractRateLimitRemaining(response)
    const reset = this.extractRateLimitReset(response)

    if (remaining !== undefined && reset) {
      const key = 'orange_api'
      const currentCount = this.config.rateLimitPerMinute - remaining
      
      this.rateLimitTracker.set(key, {
        count: currentCount,
        resetTime: reset
      })
    } else {
      // Increment local counter if no headers available
      const key = 'orange_api'
      const tracker = this.rateLimitTracker.get(key)
      
      if (tracker) {
        tracker.count++
      }
    }
  }

  /**
   * Extract rate limit remaining from response headers
   */
  private extractRateLimitRemaining(response?: AxiosResponse): number | undefined {
    if (!response?.headers) return undefined
    
    const remaining = response.headers['x-ratelimit-remaining']
    return remaining ? parseInt(remaining, 10) : undefined
  }

  /**
   * Extract rate limit reset time from response headers
   */
  private extractRateLimitReset(response?: AxiosResponse): DateTime | undefined {
    if (!response?.headers) return undefined
    
    const reset = response.headers['x-ratelimit-reset']
    return reset ? DateTime.fromSeconds(parseInt(reset, 10)) : undefined
  }

  /**
   * Create HTTP client with proper configuration
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ImmuneMe-SMS/1.0'
      }
    })

    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        Logger.debug(`Orange Network API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        Logger.error('Orange Network API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        Logger.debug(`Orange Network API Response: ${response.status} ${response.statusText}`)
        return response
      },
      (error) => {
        Logger.error(`Orange Network API Error: ${error.response?.status} ${error.response?.statusText}`)
        return Promise.reject(error)
      }
    )

    return client
  }

  /**
   * Load configuration from environment
   */
  private loadConfig(): OrangeSMSConfig {
    const requiredEnvVars = [
      'ORANGE_API_BASE_URL',
      'ORANGE_SMS_SENDER_ADDRESS',
      'ORANGE_SMS_WEBHOOK_BASE_URL'
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    return {
      apiKey: '', // No longer needed - OAuth handles authentication
      baseUrl: process.env.ORANGE_API_BASE_URL! + '/smsmessaging/v1',
      senderAddress: process.env.ORANGE_SMS_SENDER_ADDRESS!,
      webhookBaseUrl: process.env.ORANGE_SMS_WEBHOOK_BASE_URL!,
      sandboxMode: process.env.SMS_SANDBOX_MODE === 'true',
      rateLimitPerMinute: parseInt(process.env.SMS_RATE_LIMIT_PER_MINUTE || '100', 10),
      retryAttempts: parseInt(process.env.SMS_RETRY_ATTEMPTS || '3', 10),
      retryDelayMs: parseInt(process.env.SMS_RETRY_DELAY_MS || '5000', 10)
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Check OAuth authentication first
      const authStatus = await this.authService.getStatus()
      
      if (!authStatus.authenticated) {
        return {
          healthy: false,
          message: 'OAuth authentication not available'
        }
      }

      // Simple API connectivity test with OAuth
      const authHeaders = await this.authService.getAuthenticatedHeaders()
      const response = await this.client.get('/health', {
        headers: authHeaders,
        timeout: 5000
      })
      
      return {
        healthy: response.status === 200,
        message: 'Orange Network API is accessible with OAuth authentication'
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Orange Network API health check failed: ${error.message}`
      }
    }
  }
}
```

### SMS Provider Interface

```typescript
// backend/app/services/providers/sms_provider_interface.ts
export interface SMSProviderInterface {
  sendSMS(smsData: SMSMessage): Promise<SMSResponse>
  queryDeliveryStatus(clientCorrelator: string): Promise<SMSResponse>
  sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]>
  healthCheck(): Promise<{ healthy: boolean; message: string }>
}

export interface SMSMessage {
  recipients: string[]
  message: string
  clientCorrelator: string
  callbackData?: string
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  deliveryInfo?: DeliveryInfo[]
  error?: string
  rateLimitRemaining?: number
  rateLimitReset?: DateTime
}

export interface DeliveryInfo {
  address: string
  deliveryStatus: string
  description?: string
}
```

### Configuration Service

```typescript
// backend/app/services/sms_config_service.ts
import env from '#start/env'

export interface SMSConfig {
  enabled: boolean
  sandboxMode: boolean
  provider: 'orange' | 'twilio' | 'mock'
  orange: {
    apiKey: string
    baseUrl: string
    senderAddress: string
    webhookBaseUrl: string
  }
  rateLimits: {
    perMinute: number
    retryAttempts: number
    retryDelayMs: number
  }
  scheduling: {
    batchSize: number
    processingInterval: number
  }
}

export default class SMSConfigService {
  private static instance: SMSConfigService
  private config: SMSConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): SMSConfigService {
    if (!SMSConfigService.instance) {
      SMSConfigService.instance = new SMSConfigService()
    }
    return SMSConfigService.instance
  }

  public getConfig(): SMSConfig {
    return this.config
  }

  public isEnabled(): boolean {
    return this.config.enabled
  }

  public isSandboxMode(): boolean {
    return this.config.sandboxMode
  }

  public getProvider(): string {
    return this.config.provider
  }

  private loadConfig(): SMSConfig {
    return {
      enabled: env.get('SMS_ENABLED', false),
      sandboxMode: env.get('SMS_SANDBOX_MODE', true),
      provider: env.get('SMS_PROVIDER', 'orange') as 'orange' | 'twilio' | 'mock',
      
      orange: {
        apiKey: env.get('ORANGE_SMS_API_KEY', ''),
        baseUrl: env.get('ORANGE_SMS_BASE_URL', 'https://api.orange.com/smsmessaging/v1'),
        senderAddress: env.get('ORANGE_SMS_SENDER_ADDRESS', ''),
        webhookBaseUrl: env.get('ORANGE_SMS_WEBHOOK_BASE_URL', '')
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
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.enabled) {
      return { valid: true, errors: [] } // Skip validation if SMS is disabled
    }

    if (this.config.provider === 'orange') {
      if (!this.config.orange.apiKey) {
        errors.push('ORANGE_SMS_API_KEY is required')
      }
      if (!this.config.orange.senderAddress) {
        errors.push('ORANGE_SMS_SENDER_ADDRESS is required')
      }
      if (!this.config.orange.webhookBaseUrl) {
        errors.push('ORANGE_SMS_WEBHOOK_BASE_URL is required')
      }
    }

    if (this.config.rateLimits.perMinute <= 0) {
      errors.push('SMS_RATE_LIMIT_PER_MINUTE must be greater than 0')
    }

    if (this.config.scheduling.batchSize <= 0) {
      errors.push('SMS_BATCH_SIZE must be greater than 0')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
```

### Provider Factory

```typescript
// backend/app/services/providers/sms_provider_factory.ts
import OrangeSMSProvider from './orange_sms_provider.js'
import MockSMSProvider from './mock_sms_provider.js'
import SMSConfigService from '../sms_config_service.js'
import { SMSProviderInterface } from './sms_provider_interface.js'

export default class SMSProviderFactory {
  public static createProvider(): SMSProviderInterface {
    const config = SMSConfigService.getInstance().getConfig()

    switch (config.provider) {
      case 'orange':
        return new OrangeSMSProvider()
      case 'mock':
        return new MockSMSProvider()
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`)
    }
  }
}
```

### Mock Provider for Testing

```typescript
// backend/app/services/providers/mock_sms_provider.ts
import { DateTime } from 'luxon'
import Logger from '@adonisjs/core/logger'
import { SMSProviderInterface, SMSMessage, SMSResponse } from './sms_provider_interface.js'

export default class MockSMSProvider implements SMSProviderInterface {
  private deliveryStatuses: Map<string, string> = new Map()

  public async sendSMS(smsData: SMSMessage): Promise<SMSResponse> {
    Logger.info(`Mock SMS sent to ${smsData.recipients.join(', ')}: ${smsData.message}`)

    // Simulate different delivery outcomes based on phone number
    const deliveryInfo = smsData.recipients.map(recipient => {
      let deliveryStatus = 'DeliveredToTerminal'
      
      // Simulate failures for specific test numbers
      if (recipient.includes('000000002')) {
        deliveryStatus = 'DeliveryImpossible'
      } else if (recipient.includes('000000003')) {
        deliveryStatus = 'MessageWaiting'
      }

      this.deliveryStatuses.set(smsData.clientCorrelator, deliveryStatus)

      return {
        address: recipient,
        deliveryStatus,
        description: deliveryStatus === 'DeliveredToTerminal' ? 'Message delivered successfully' : 'Delivery failed'
      }
    })

    return {
      success: true,
      messageId: `mock_${smsData.clientCorrelator}`,
      deliveryInfo,
      rateLimitRemaining: 99,
      rateLimitReset: DateTime.now().plus({ minutes: 1 })
    }
  }

  public async queryDeliveryStatus(clientCorrelator: string): Promise<SMSResponse> {
    const status = this.deliveryStatuses.get(clientCorrelator) || 'DeliveredToTerminal'

    return {
      success: true,
      deliveryInfo: [{
        address: '+231000000001',
        deliveryStatus: status,
        description: 'Mock delivery status'
      }]
    }
  }

  public async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = []

    for (const message of messages) {
      results.push(await this.sendSMS(message))
    }

    return results
  }

  public async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    return {
      healthy: true,
      message: 'Mock SMS provider is always healthy'
    }
  }
}
```

## Acceptance Criteria

1. **Orange Network Integration**: Successfully sends SMS messages via Orange Network API
2. **Authentication**: Secure API key management and authentication
3. **Phone Number Validation**: Validates and formats phone numbers according to E.164 standard
4. **Rate Limiting**: Respects Orange Network API rate limits and implements throttling
5. **Error Handling**: Comprehensive error handling for all API failure scenarios
6. **Delivery Tracking**: Queries and processes delivery status from Orange Network
7. **Bulk Operations**: Supports bulk SMS sending with proper batching
8. **Configuration**: Flexible configuration for sandbox/production environments
9. **Health Checks**: Provides API connectivity health checks
10. **Testing**: Mock provider available for testing and development

## Implementation Notes

### API Integration Best Practices
- Use proper HTTP client configuration with timeouts
- Implement request/response logging for debugging
- Handle network failures gracefully
- Validate all API responses before processing

### Security Considerations
- Store API keys securely in environment variables
- Use HTTPS for all API communications
- Validate phone numbers to prevent injection attacks
- Log security-relevant events

### Performance Optimization
- Implement connection pooling for HTTP client
- Use batch processing for bulk operations
- Cache rate limit information
- Optimize retry logic to minimize delays

### Error Recovery
- Implement exponential backoff for retries
- Handle different types of API errors appropriately
- Provide meaningful error messages for debugging
- Log all errors with sufficient context

### Monitoring & Observability
- Track API response times and success rates
- Monitor rate limit usage
- Alert on API failures or degraded performance
- Provide health check endpoints

## Testing Requirements

### Unit Testing
- Test all provider methods with various inputs
- Mock HTTP client for isolated testing
- Test error handling scenarios
- Validate phone number formatting

### Integration Testing
- Test against Orange Network sandbox API
- Verify webhook delivery status processing
- Test rate limiting behavior
- Validate bulk sending functionality

### Load Testing
- Test bulk SMS sending performance
- Validate rate limiting under load
- Test concurrent request handling
- Measure memory usage and performance

## Related Documentation

- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Webhook & Status Tracking**: [`SMS-05-webhook-tracking.md`](SMS-05-webhook-tracking.md)
- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)