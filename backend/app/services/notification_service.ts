import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import SmsService from '#services/sms_service'
import SmsTemplateService from '#services/sms_template_service'
import env from '#start/env'

export default class NotificationService {
  private smsService: SmsService
  private templateService: SmsTemplateService
  private smsEnabled: boolean

  constructor() {
    this.smsService = new SmsService()
    this.templateService = new SmsTemplateService()
    this.smsEnabled = env.get('SMS_ENABLED', 'false') === 'true' && this.smsService.isConfigured()
  }

  /**
   * Create a notification for a specific immunization record
   * This is the primary method for creating notifications immediately when records are created
   */
  public async createNotificationForRecord(
    patientId: number,
    vaccineId: number,
    dueDate: DateTime,
    facilityId: number
  ): Promise<Notification | null> {
    try {
      // Check if notification already exists for this patient, vaccine, and due date
      const existingNotification = await Notification.query()
        .where('patientId', patientId)
        .where('vaccineId', vaccineId)
        .where('dueDate', dueDate.toSQLDate() || '')
        .first()
      
      if (existingNotification) {
        return existingNotification
      }

      // Create new notification
      const notification = await Notification.create({
        patientId,
        vaccineId,
        dueDate,
        status: 'pending',
        facilityId,
        smsStatus: 'not_sent',
        smsRetryCount: 0
      })

      logger.info(`Successfully created notification ${notification.id} for patient ${patientId}, vaccine ${vaccineId}`)

      // Attempt to send SMS if enabled
      if (this.smsEnabled) {
        await this.sendSmsForNotification(notification.id)
      }

      return notification
    } catch (error) {
      logger.error('Failed to create notification:', {
        error: error.message,
        patientId,
        vaccineId,
        dueDate: dueDate.toISODate(),
        facilityId
      })
      throw error
    }
  }

  /**
   * Update overdue notifications
   * This method can still be useful for maintenance tasks
   */
  public async updateOverdueNotifications() {
    const now = DateTime.now()
    
    try {
      // Find notifications that are overdue and still pending
      const overdueNotifications = await Notification.query()
        .where('status', 'pending')
        .where('dueDate', '<', now.toSQLDate() || '')
      
      logger.info(`Found ${overdueNotifications.length} overdue notifications to update`)
      
      // Update status to overdue
      for (const notification of overdueNotifications) {
        notification.status = 'overdue'
        await notification.save()
      }
      
      logger.info(`Successfully updated ${overdueNotifications.length} notifications to overdue status`)
      
      return {
        updated: overdueNotifications.length
      }
    } catch (error) {
      logger.error('Failed to update overdue notifications:', error)
      throw error
    }
  }

  /**
   * Get due notifications for a facility
   */
  public async getDueNotifications(facilityId: number) {
    return Notification.query()
      .where('facilityId', facilityId)
      .whereIn('status', ['pending', 'overdue'])
      .preload('patient')
      .preload('vaccine')
      .orderBy('dueDate', 'asc')
  }

  /**
   * Get notifications by status for a facility
   */
  public async getNotificationsByStatus(facilityId: number, status: string) {
    return Notification.query()
      .where('facilityId', facilityId)
      .where('status', status)
      .preload('patient')
      .preload('vaccine')
      .orderBy('dueDate', 'asc')
  }

  /**
   * Mark notification as completed
   */
  public async markNotificationCompleted(notificationId: number): Promise<Notification> {
    try {
      const notification = await Notification.findOrFail(notificationId)
      notification.status = 'completed'
      await notification.save()
      
      logger.info(`Marked notification ${notificationId} as completed`)
      return notification
    } catch (error) {
      logger.error(`Failed to mark notification ${notificationId} as completed:`, error)
      throw error
    }
  }

  /**
   * Delete notification
   */
  public async deleteNotification(notificationId: number): Promise<void> {
    try {
      const notification = await Notification.findOrFail(notificationId)
      await notification.delete()
      
      logger.info(`Successfully deleted notification ${notificationId}`)
    } catch (error) {
      logger.error(`Failed to delete notification ${notificationId}:`, error)
      throw error
    }
  }

  /**
   * Send SMS for a notification
   */
  public async sendSmsForNotification(notificationId: number): Promise<boolean> {
    try {
      if (!this.smsEnabled) {
        logger.info('SMS not enabled, skipping SMS send', { notificationId })
        return false
      }

      // Load notification with related data
      const notification = await Notification.query()
        .where('id', notificationId)
        .preload('patient')
        .preload('vaccine')
        .preload('facility')
        .first()

      if (!notification) {
        logger.error('Notification not found for SMS sending', { notificationId })
        return false
      }

      // Check if patient has a phone number
      if (!notification.patient.contactPhone) {
        logger.info('Patient has no contact phone, skipping SMS', {
          notificationId,
          patientId: notification.patientId
        })
        notification.smsStatus = 'failed'
        notification.smsErrorMessage = 'No contact phone number'
        notification.smsErrorCode = 'NO_PHONE'
        await notification.save()
        return false
      }

      // Determine message type based on notification status and due date
      const now = DateTime.now()
      const isOverdue = notification.dueDate < now
      const templateType = isOverdue ? 'overdue_alert' : 'appointment_reminder'

      // Generate message
      let messageResult
      if (templateType === 'overdue_alert') {
        messageResult = await this.templateService.generateOverdueAlert(
          notification.patient,
          notification.vaccine,
          notification.dueDate,
          notification.facility
        )
      } else {
        messageResult = await this.templateService.generateAppointmentReminder(
          notification.patient,
          notification.vaccine,
          notification.dueDate,
          notification.facility
        )
      }

      if (!messageResult.success) {
        logger.error('Failed to generate SMS message', {
          notificationId,
          error: messageResult.error
        })
        notification.smsStatus = 'failed'
        notification.smsErrorMessage = messageResult.error || 'Message generation failed'
        notification.smsErrorCode = 'MESSAGE_GENERATION_ERROR'
        await notification.save()
        return false
      }

      // Send SMS
      const smsResult = await this.smsService.sendSms(
        notification.patient.contactPhone,
        messageResult.message,
        notification.facility.name
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

      logger.info('SMS sending completed', {
        notificationId,
        success: smsResult.success,
        messageId: smsResult.messageId,
        templateType
      })

      return smsResult.success
    } catch (error) {
      logger.error('Error sending SMS for notification', {
        error: error.message,
        notificationId,
        stack: error.stack
      })

      // Update notification with error status
      try {
        const notification = await Notification.find(notificationId)
        if (notification) {
          notification.smsStatus = 'failed'
          notification.smsErrorMessage = error.message
          notification.smsErrorCode = 'SERVICE_ERROR'
          notification.smsRetryCount = (notification.smsRetryCount || 0) + 1
          notification.smsLastRetryAt = DateTime.now()
          await notification.save()
        }
      } catch (updateError) {
        logger.error('Failed to update notification with SMS error', {
          notificationId,
          updateError: updateError.message
        })
      }

      return false
    }
  }

  /**
   * Retry failed SMS notifications
   */
  public async retryFailedSms(maxRetries: number = 3): Promise<{ processed: number; successful: number }> {
    try {
      if (!this.smsEnabled) {
        logger.info('SMS not enabled, skipping retry')
        return { processed: 0, successful: 0 }
      }

      // Find failed SMS notifications that haven't exceeded retry limit
      const failedNotifications = await Notification.query()
        .where('smsStatus', 'failed')
        .where('smsRetryCount', '<', maxRetries)
        .where('createdAt', '>', DateTime.now().minus({ days: 7 }).toSQL()) // Only retry recent notifications
        .limit(50) // Process in batches

      logger.info(`Found ${failedNotifications.length} failed SMS notifications to retry`)

      let successful = 0
      for (const notification of failedNotifications) {
        const result = await this.sendSmsForNotification(notification.id)
        if (result) {
          successful++
        }
        
        // Add delay between retries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      logger.info('SMS retry completed', {
        processed: failedNotifications.length,
        successful
      })

      return {
        processed: failedNotifications.length,
        successful
      }
    } catch (error) {
      logger.error('Error retrying failed SMS', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Send bulk SMS for due notifications
   */
  public async sendBulkSmsForDueNotifications(facilityId?: number): Promise<{ processed: number; successful: number }> {
    try {
      if (!this.smsEnabled) {
        logger.info('SMS not enabled, skipping bulk SMS')
        return { processed: 0, successful: 0 }
      }

      // Find notifications that need SMS
      const query = Notification.query()
        .whereIn('status', ['pending', 'overdue'])
        .where('smsStatus', 'not_sent')
        .where('dueDate', '<=', DateTime.now().plus({ days: 7 }).toSQLDate()) // Due within 7 days
        .limit(100) // Process in batches

      if (facilityId) {
        query.where('facilityId', facilityId)
      }

      const notifications = await query

      logger.info(`Processing bulk SMS for ${notifications.length} notifications`, {
        facilityId
      })

      let successful = 0
      for (const notification of notifications) {
        const result = await this.sendSmsForNotification(notification.id)
        if (result) {
          successful++
        }
        
        // Add delay between sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      logger.info('Bulk SMS completed', {
        processed: notifications.length,
        successful,
        facilityId
      })

      return {
        processed: notifications.length,
        successful
      }
    } catch (error) {
      logger.error('Error sending bulk SMS', {
        error: error.message,
        facilityId,
        stack: error.stack
      })
      throw error
    }
  }
}