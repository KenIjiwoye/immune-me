import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import env from '#start/env'

export interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
  errorCode?: string
}

export interface DeliveryReceipt {
  messageId: string
  status: 'delivered' | 'failed' | 'pending'
  timestamp: DateTime
  errorCode?: string
  errorMessage?: string
}

export interface SmsSubscription {
  subscriptionId: string
  resourceURL: string
  callbackReference: {
    notifyURL: string
  }
}

export default class SmsService {
  private baseUrl: string
  private senderAddress: string
  private clientId: string
  private clientSecret: string
  private authorizationHeader: string
  private tokenUrl: string
  private webhookUrl: string
  private accessToken: string | null = null
  private tokenExpiry: DateTime | null = null

  constructor() {
    this.baseUrl = env.get('ORANGE_SMS_API_URL', 'https://api.orange.com')
    this.senderAddress = env.get('ORANGE_SMS_SENDER_ADDRESS', '')
    this.clientId = env.get('ORANGE_SMS_CLIENT_ID', '')
    this.clientSecret = env.get('ORANGE_SMS_CLIENT_SECRET', '')
    this.authorizationHeader = env.get('ORANGE_SMS_AUTHORIZATION_HEADER', '')
    this.tokenUrl = env.get('ORANGE_SMS_TOKEN_URL', 'https://api.orange.com/oauth/v3/token')
    this.webhookUrl = env.get('ORANGE_SMS_WEBHOOK_URL', '')

    if (!this.senderAddress || !this.clientId || !this.clientSecret || !this.authorizationHeader) {
      logger.warn('SMS service not properly configured. Missing sender address, client ID, client secret, or authorization header.')
    }
  }

  /**
   * Get access token using OAuth 2.0 Client Credentials flow
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiry && DateTime.now() < this.tokenExpiry) {
        return this.accessToken
      }

      logger.info('Requesting new OAuth access token')

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': this.authorizationHeader,
          'Accept': 'application/json'
        },
        body: 'grant_type=client_credentials'
      })

      const responseData = await response.json() as any

      if (response.ok && responseData.access_token) {
        this.accessToken = responseData.access_token
        
        // Set token expiry (default to 1 hour if not provided, with 5 minute buffer)
        const expiresIn = responseData.expires_in || 3600
        this.tokenExpiry = DateTime.now().plus({ seconds: expiresIn - 300 })

        logger.info('OAuth access token obtained successfully', {
          expiresIn,
          expiryTime: this.tokenExpiry.toISO()
        })

        return this.accessToken
      } else {
        logger.error('Failed to obtain OAuth access token', {
          status: response.status,
          error: responseData.error,
          errorDescription: responseData.error_description
        })
        return null
      }
    } catch (error) {
      logger.error('Error obtaining OAuth access token', {
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * Send SMS message using Orange API
   */
  async sendSms(recipientPhone: string, message: string, senderName?: string): Promise<SmsResult> {
    try {
      // Validate inputs
      const validationResult = this.validateSmsInputs(recipientPhone, message)
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          errorCode: 'VALIDATION_ERROR'
        }
      }

      // Format phone number
      const formattedRecipient = this.formatPhoneNumber(recipientPhone)
      const formattedSender = this.formatPhoneNumber(this.senderAddress)

      // Prepare request payload
      const payload = {
        outboundSMSMessageRequest: {
          address: formattedRecipient,
          senderAddress: formattedSender,
          senderName: senderName || 'HealthSystem',
          outboundSMSTextMessage: {
            message: message
          }
        }
      }

      // Get OAuth access token
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        return {
          success: false,
          error: 'Failed to obtain OAuth access token',
          errorCode: 'AUTH_ERROR'
        }
      }

      // Make API request
      const url = `${this.baseUrl}/smsmessaging/v1/outbound/${encodeURIComponent(formattedSender)}/requests`
      
      logger.info('Sending SMS', {
        recipient: formattedRecipient,
        sender: formattedSender,
        messageLength: message.length,
        url
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const responseData = await response.json() as any

      if (response.ok) {
        // Extract message ID from response (implementation may vary based on actual Orange API response)
        const messageId = responseData.outboundSMSMessageRequest?.resourceURL?.split('/').pop() ||
                         responseData.messageId ||
                         `sms_${Date.now()}`

        logger.info('SMS sent successfully', {
          messageId,
          recipient: formattedRecipient,
          status: response.status
        })

        return {
          success: true,
          messageId
        }
      } else {
        // Handle API errors
        const errorInfo = this.parseApiError(responseData)
        
        logger.error('SMS sending failed', {
          recipient: formattedRecipient,
          status: response.status,
          error: errorInfo.message,
          errorCode: errorInfo.code,
          responseData
        })

        return {
          success: false,
          error: errorInfo.message,
          errorCode: errorInfo.code
        }
      }
    } catch (error) {
      logger.error('SMS service error', {
        error: error.message,
        recipient: recipientPhone,
        stack: error.stack
      })

      return {
        success: false,
        error: 'Network or service error',
        errorCode: 'SERVICE_ERROR'
      }
    }
  }

  /**
   * Subscribe to delivery receipts
   */
  async subscribeToDeliveryReceipts(): Promise<SmsSubscription | null> {
    try {
      if (!this.webhookUrl) {
        logger.warn('Cannot subscribe to delivery receipts: webhook URL not configured')
        return null
      }

      const formattedSender = this.formatPhoneNumber(this.senderAddress)
      const payload = {
        deliveryReceiptSubscription: {
          callbackReference: {
            notifyURL: this.webhookUrl
          }
        }
      }

      // Get OAuth access token
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        logger.error('Failed to obtain OAuth access token for delivery receipt subscription')
        return null
      }

      const url = `${this.baseUrl}/smsmessaging/v1/outbound/${encodeURIComponent(formattedSender)}/subscriptions`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const responseData = await response.json() as any

      if (response.ok) {
        const subscription: SmsSubscription = {
          subscriptionId: responseData.deliveryReceiptSubscription?.resourceURL?.split('/').pop() || 'unknown',
          resourceURL: responseData.deliveryReceiptSubscription?.resourceURL || '',
          callbackReference: {
            notifyURL: this.webhookUrl
          }
        }

        logger.info('Successfully subscribed to delivery receipts', {
          subscriptionId: subscription.subscriptionId,
          webhookUrl: this.webhookUrl
        })

        return subscription
      } else {
        const errorInfo = this.parseApiError(responseData)
        logger.error('Failed to subscribe to delivery receipts', {
          error: errorInfo.message,
          errorCode: errorInfo.code,
          status: response.status
        })
        return null
      }
    } catch (error) {
      logger.error('Error subscribing to delivery receipts', {
        error: error.message,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * Process delivery receipt webhook
   */
  async processDeliveryReceipt(receiptData: any): Promise<DeliveryReceipt | null> {
    try {
      logger.info('Processing delivery receipt', { receiptData })

      // Parse delivery receipt based on Orange API format
      // Note: Actual format may vary - adjust based on real webhook data
      const deliveryInfo = receiptData.deliveryInfoNotification || receiptData

      const receipt: DeliveryReceipt = {
        messageId: deliveryInfo.messageId || deliveryInfo.link?.href?.split('/').pop() || 'unknown',
        status: this.mapDeliveryStatus(deliveryInfo.deliveryStatus || deliveryInfo.status),
        timestamp: DateTime.now(),
        errorCode: deliveryInfo.errorCode,
        errorMessage: deliveryInfo.errorMessage
      }

      logger.info('Delivery receipt processed', {
        messageId: receipt.messageId,
        status: receipt.status,
        timestamp: receipt.timestamp.toISO()
      })

      return receipt
    } catch (error) {
      logger.error('Error processing delivery receipt', {
        error: error.message,
        receiptData,
        stack: error.stack
      })
      return null
    }
  }

  /**
   * Validate SMS inputs
   */
  private validateSmsInputs(phone: string, message: string): { valid: boolean; error?: string } {
    if (!phone || phone.trim().length === 0) {
      return { valid: false, error: 'Phone number is required' }
    }

    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message content is required' }
    }

    if (message.length > 160) {
      return { valid: false, error: `Message too long: ${message.length} characters (max 160)` }
    }

    // Validate Liberian phone number format
    const liberianPhoneRegex = /^(\+231|231|0)?[0-9]{8,9}$/
    if (!liberianPhoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return { valid: false, error: 'Invalid Liberian phone number format' }
    }

    return { valid: true }
  }

  /**
   * Format phone number to Orange API format
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) return ''

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '')

    // Handle Liberian numbers
    if (cleaned.startsWith('0')) {
      // Remove leading 0 and add Liberia country code
      cleaned = '+231' + cleaned.substring(1)
    } else if (cleaned.startsWith('231')) {
      // Add + if missing
      cleaned = '+' + cleaned
    } else if (!cleaned.startsWith('+231')) {
      // Assume it's a local number and add country code
      cleaned = '+231' + cleaned
    }

    // Return in tel: format required by Orange API
    return `tel:${cleaned}`
  }

  /**
   * Parse API error response
   */
  private parseApiError(responseData: any): { code: string; message: string } {
    // Handle different error response formats
    if (responseData.requestError) {
      const error = responseData.requestError.serviceException || responseData.requestError.policyException
      return {
        code: error?.messageId || 'UNKNOWN_ERROR',
        message: error?.text || 'Unknown API error'
      }
    }

    if (responseData.error) {
      return {
        code: responseData.error.code || 'API_ERROR',
        message: responseData.error.message || responseData.error.description || 'API error occurred'
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred'
    }
  }

  /**
   * Map delivery status from Orange API to our internal format
   */
  private mapDeliveryStatus(apiStatus: string): 'delivered' | 'failed' | 'pending' {
    const status = (apiStatus || '').toLowerCase()
    
    if (status.includes('delivered') || status.includes('success')) {
      return 'delivered'
    } else if (status.includes('failed') || status.includes('error') || status.includes('rejected')) {
      return 'failed'
    } else {
      return 'pending'
    }
  }

  /**
   * Check if SMS service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.senderAddress && this.clientId && this.clientSecret && this.authorizationHeader && this.baseUrl && this.tokenUrl)
  }

  /**
   * Get service configuration status
   */
  getConfigurationStatus(): {
    configured: boolean
    senderAddress: boolean
    clientId: boolean
    clientSecret: boolean
    authorizationHeader: boolean
    tokenUrl: boolean
    webhookUrl: boolean
    hasValidToken: boolean
  } {
    return {
      configured: this.isConfigured(),
      senderAddress: !!this.senderAddress,
      clientId: !!this.clientId,
      clientSecret: !!this.clientSecret,
      authorizationHeader: !!this.authorizationHeader,
      tokenUrl: !!this.tokenUrl,
      webhookUrl: !!this.webhookUrl,
      hasValidToken: !!(this.accessToken && this.tokenExpiry && DateTime.now() < this.tokenExpiry)
    }
  }
}