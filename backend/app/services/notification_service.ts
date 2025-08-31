import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export default class NotificationService {
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
        facilityId
      })

      logger.info(`Successfully created notification ${notification.id} for patient ${patientId}, vaccine ${vaccineId}`)
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
}