import { HttpContext } from '@adonisjs/core/http'
import SmsService from '#services/sms_service'
import SmsTemplateService from '#services/sms_template_service'
import Notification from '#models/notification'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class SmsController {
  private smsService: SmsService
  private templateService: SmsTemplateService

  constructor() {
    this.smsService = new SmsService()
    this.templateService = new SmsTemplateService()
  }

  /**
   * Handle delivery receipt webhook from Orange SMS API
   */
  async handleDeliveryReceipt({ request, response }: HttpContext) {
    try {
      const receiptData = request.body()
      
      logger.info('Received SMS delivery receipt webhook', {
        body: receiptData,
        headers: request.headers(),
        ip: request.ip()
      })

      // Process the delivery receipt
      const receipt = await this.smsService.processDeliveryReceipt(receiptData)
      
      if (!receipt) {
        logger.warn('Failed to process delivery receipt', { receiptData })
        return response.badRequest({ 
          error: 'Invalid delivery receipt format' 
        })
      }

      // Update notification with delivery status
      await this.updateNotificationSmsStatus(receipt.messageId, receipt)

      logger.info('Successfully processed delivery receipt', {
        messageId: receipt.messageId,
        status: receipt.status
      })

      return response.ok({ 
        status: 'processed',
        messageId: receipt.messageId 
      })
    } catch (error) {
      logger.error('Error handling delivery receipt webhook', {
        error: error.message,
        stack: error.stack,
        body: request.body()
      })

      return response.internalServerError({ 
        error: 'Failed to process delivery receipt' 
      })
    }
  }

  /**
   * Send SMS for a specific notification
   */
  async sendNotificationSms({ params, request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const notificationId = params.id
      const { templateType, customMessage } = request.body()

      // Find the notification
      const notification = await Notification.query()
        .where('id', notificationId)
        .preload('patient')
        .preload('vaccine')
        .preload('facility')
        .first()

      if (!notification) {
        return response.notFound({ error: 'Notification not found' })
      }

      // Check if user has access to this notification
      if (user.facilityId && notification.facilityId !== user.facilityId) {
        return response.forbidden({ error: 'Access denied' })
      }

      // Check if patient has a phone number
      if (!notification.patient.contactPhone) {
        return response.badRequest({ 
          error: 'Patient does not have a contact phone number' 
        })
      }

      // Generate SMS message
      let messageResult
      if (customMessage) {
        messageResult = { message: customMessage, success: true }
      } else {
        const type = templateType || 'appointment_reminder'
        if (type === 'appointment_reminder') {
          messageResult = await this.templateService.generateAppointmentReminder(
            notification.patient,
            notification.vaccine,
            notification.dueDate,
            notification.facility
          )
        } else if (type === 'overdue_alert') {
          messageResult = await this.templateService.generateOverdueAlert(
            notification.patient,
            notification.vaccine,
            notification.dueDate,
            notification.facility
          )
        } else {
          return response.badRequest({ error: 'Invalid template type' })
        }
      }

      if (!messageResult.success) {
        return response.badRequest({ 
          error: 'Failed to generate message',
          details: messageResult.error 
        })
      }

      // Send SMS
      const smsResult = await this.smsService.sendSms(
        notification.patient.contactPhone,
        messageResult.message
      )

      // Update notification with SMS status
      notification.smsStatus = smsResult.success ? 'sent' : 'failed'
      notification.smsMessageId = smsResult.messageId || null
      notification.smsSentAt = smsResult.success ? DateTime.now() : null
      notification.smsErrorMessage = smsResult.error || null
      notification.smsErrorCode = smsResult.errorCode || null
      
      if (!smsResult.success) {
        notification.smsRetryCount = (notification.smsRetryCount || 0) + 1
        notification.smsLastRetryAt = DateTime.now()
      }

      await notification.save()

      logger.info('SMS sent for notification', {
        notificationId,
        patientId: notification.patientId,
        success: smsResult.success,
        messageId: smsResult.messageId
      })

      return response.json({
        success: smsResult.success,
        messageId: smsResult.messageId,
        message: messageResult.message,
        error: smsResult.error,
        notification: {
          id: notification.id,
          smsStatus: notification.smsStatus,
          smsSentAt: notification.smsSentAt
        }
      })
    } catch (error) {
      logger.error('Error sending SMS for notification', {
        error: error.message,
        notificationId: params.id,
        stack: error.stack
      })

      return response.internalServerError({ 
        error: 'Failed to send SMS' 
      })
    }
  }

  /**
   * Retry failed SMS for a notification
   */
  async retrySms({ params, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const notificationId = params.id

      const notification = await Notification.query()
        .where('id', notificationId)
        .where('smsStatus', 'failed')
        .preload('patient')
        .preload('vaccine')
        .preload('facility')
        .first()

      if (!notification) {
        return response.notFound({ 
          error: 'Notification not found or SMS not failed' 
        })
      }

      // Check access
      if (user.facilityId && notification.facilityId !== user.facilityId) {
        return response.forbidden({ error: 'Access denied' })
      }

      // Check retry limit
      const maxRetries = 3
      if ((notification.smsRetryCount || 0) >= maxRetries) {
        return response.badRequest({ 
          error: `Maximum retry attempts (${maxRetries}) exceeded` 
        })
      }

      // Generate message and retry SMS
      const messageResult = await this.templateService.generateAppointmentReminder(
        notification.patient,
        notification.vaccine,
        notification.dueDate,
        notification.facility
      )

      if (!messageResult.success) {
        return response.badRequest({ 
          error: 'Failed to generate message',
          details: messageResult.error 
        })
      }

      const smsResult = await this.smsService.sendSms(
        notification.patient.contactPhone,
        messageResult.message
      )

      // Update notification
      notification.smsStatus = smsResult.success ? 'sent' : 'failed'
      notification.smsMessageId = smsResult.messageId || notification.smsMessageId
      notification.smsRetryCount = (notification.smsRetryCount || 0) + 1
      notification.smsLastRetryAt = DateTime.now()
      
      if (smsResult.success) {
        notification.smsSentAt = DateTime.now()
        notification.smsErrorMessage = null
        notification.smsErrorCode = null
      } else {
        notification.smsErrorMessage = smsResult.error || null
        notification.smsErrorCode = smsResult.errorCode || null
      }

      await notification.save()

      return response.json({
        success: smsResult.success,
        messageId: smsResult.messageId,
        retryCount: notification.smsRetryCount,
        error: smsResult.error
      })
    } catch (error) {
      logger.error('Error retrying SMS', {
        error: error.message,
        notificationId: params.id,
        stack: error.stack
      })

      return response.internalServerError({ 
        error: 'Failed to retry SMS' 
      })
    }
  }

  /**
   * Get SMS status for notifications
   */
  async getSmsStatus({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      const page = request.input('page', 1)
      const limit = request.input('limit', 20)
      const status = request.input('status') // Filter by SMS status

      const query = Notification.query()
        .whereNotNull('smsStatus')
        .preload('patient')
        .preload('vaccine')
        .preload('facility')

      if (user.facilityId) {
        query.where('facilityId', user.facilityId)
      }

      if (status) {
        query.where('smsStatus', status)
      }

      const notifications = await query
        .orderBy('smsSentAt', 'desc')
        .paginate(page, limit)

      const transformedData = {
        ...notifications.toJSON(),
        data: notifications.toJSON().data.map((notification: any) => ({
          id: notification.id,
          patientName: notification.patient?.fullName || 'Unknown',
          vaccineName: notification.vaccine?.name || 'Unknown',
          dueDate: notification.dueDate,
          smsStatus: notification.smsStatus,
          smsMessageId: notification.smsMessageId,
          smsSentAt: notification.smsSentAt,
          smsDeliveredAt: notification.smsDeliveredAt,
          smsRetryCount: notification.smsRetryCount,
          smsErrorMessage: notification.smsErrorMessage,
          smsErrorCode: notification.smsErrorCode
        }))
      }

      return response.json(transformedData)
    } catch (error) {
      logger.error('Error getting SMS status', {
        error: error.message,
        stack: error.stack
      })

      return response.internalServerError({ 
        error: 'Failed to get SMS status' 
      })
    }
  }

  /**
   * Get SMS service configuration status
   */
  async getServiceStatus({ response }: HttpContext) {
    try {
      const configStatus = this.smsService.getConfigurationStatus()
      
      return response.json({
        configured: configStatus.configured,
        details: configStatus,
        templates: Object.keys(this.templateService.getAvailableTemplates())
      })
    } catch (error) {
      logger.error('Error getting SMS service status', {
        error: error.message,
        stack: error.stack
      })

      return response.internalServerError({ 
        error: 'Failed to get service status' 
      })
    }
  }

  /**
   * Test SMS sending (admin only)
   */
  async testSms({ request, response }: HttpContext) {
    try {
      const { phoneNumber, message } = request.body()

      if (!phoneNumber || !message) {
        return response.badRequest({ 
          error: 'Phone number and message are required' 
        })
      }

      const smsResult = await this.smsService.sendSms(phoneNumber, message)

      return response.json({
        success: smsResult.success,
        messageId: smsResult.messageId,
        error: smsResult.error,
        errorCode: smsResult.errorCode
      })
    } catch (error) {
      logger.error('Error testing SMS', {
        error: error.message,
        stack: error.stack
      })

      return response.internalServerError({ 
        error: 'Failed to test SMS' 
      })
    }
  }

  /**
   * Update notification SMS status from delivery receipt
   */
  private async updateNotificationSmsStatus(messageId: string, receipt: any) {
    try {
      const notification = await Notification.query()
        .where('smsMessageId', messageId)
        .first()

      if (!notification) {
        logger.warn('No notification found for SMS message ID', { messageId })
        return
      }

      notification.smsStatus = receipt.status
      notification.smsDeliveredAt = receipt.status === 'delivered' ? receipt.timestamp : null
      
      if (receipt.status === 'failed') {
        notification.smsErrorMessage = receipt.errorMessage || null
        notification.smsErrorCode = receipt.errorCode || null
      }

      await notification.save()

      logger.info('Updated notification SMS status', {
        notificationId: notification.id,
        messageId,
        status: receipt.status
      })
    } catch (error) {
      logger.error('Error updating notification SMS status', {
        error: error.message,
        messageId,
        stack: error.stack
      })
    }
  }
}