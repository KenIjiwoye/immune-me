import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import { DateTime } from 'luxon'

export default class NotificationService {
  /**
   * Generate notifications for immunizations due in the next 7 days
   */
  public async generateDueNotifications() {
    // Find immunization records with return dates in the next 7 days
    const now = DateTime.now()
    const sevenDaysLater = now.plus({ days: 7 })
    
    const records = await ImmunizationRecord.query()
      .whereNotNull('returnDate')
      .where('returnDate', '>=', now.toSQLDate() || '')
      .where('returnDate', '<=', sevenDaysLater.toSQLDate() || '')
      .preload('patient')
      .preload('vaccine')
    
    let createdCount = 0
    
    // Create notifications for each record
    for (const record of records) {
      // Skip records without a return date (should not happen due to the query filter)
      if (!record.returnDate) continue;
      
      // Check if notification already exists
      const existingNotification = await Notification.query()
        .where('patientId', record.patientId)
        .where('vaccineId', record.vaccineId)
        .where('dueDate', record.returnDate.toSQLDate() || '')
        .first()
      
      if (!existingNotification) {
        // Create new notification
        await Notification.create({
          patientId: record.patientId,
          vaccineId: record.vaccineId,
          dueDate: record.returnDate,
          status: 'pending',
          facilityId: record.facilityId
        })
        
        createdCount++
      }
    }
    
    return {
      processed: records.length,
      created: createdCount
    }
  }

  /**
   * Update overdue notifications
   */
  public async updateOverdueNotifications() {
    const now = DateTime.now()
    
    // Find notifications that are overdue and still pending
    const overdueNotifications = await Notification.query()
      .where('status', 'pending')
      .where('dueDate', '<', now.toSQLDate() || '')
    
    // Update status to overdue
    for (const notification of overdueNotifications) {
      notification.status = 'overdue'
      await notification.save()
    }
    
    return {
      updated: overdueNotifications.length
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
}