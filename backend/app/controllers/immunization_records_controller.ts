// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import NotificationService from '#services/notification_service'
import { immunizationRecordStoreValidator } from '#validators/immunization_record/store'
import { immunizationRecordUpdateValidator } from '#validators/immunization_record/update'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class ImmunizationRecordsController {
  /**
   * List all immunization records
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const records = await ImmunizationRecord.query()
      .preload('patient')
      .preload('vaccine')
      .preload('administeredBy')
      .preload('facility')
      .paginate(page, limit)
    
    return response.json(records)
  }

  /**
   * Get immunization record by ID
   */
  async show({ params, response }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    await record.load('patient')
    await record.load('vaccine')
    await record.load('administeredBy')
    await record.load('facility')
    
    return response.json(record)
  }

  /**
   * Create new immunization record
   */
  async store({ request, response, auth, logger }: HttpContext) {
    const user = auth.user!
    
    // Validate request
    await request.validateUsing(immunizationRecordStoreValidator)
    
    const data = request.only([
      'patientId',
      'vaccineId',
      'administeredDate',
      'batchNumber',
      'returnDate',
      'notes'
    ])
    
    // Set administered by user ID and facility ID from authenticated user
    const recordData = {
      ...data,
      administeredByUserId: user.id,
      facilityId: user.facilityId
    }
    
    // Use database transaction to ensure atomicity
    const trx = await db.transaction()
    
    try {
      // Create the immunization record within the transaction
      const record = await ImmunizationRecord.create(recordData, { client: trx })
      
      // If a return date is provided, create a notification immediately within the same transaction
      if (data.returnDate) {
        logger.info(`Creating notification for immunization record ${record.id} with return date ${data.returnDate}`)
        
        // Parse and validate the return date
        let dueDate: DateTime
        try {
          if (typeof data.returnDate === 'string') {
            // Handle ISO string format
            dueDate = DateTime.fromISO(data.returnDate)
          } else if (data.returnDate instanceof Date) {
            // Handle JavaScript Date object
            dueDate = DateTime.fromJSDate(data.returnDate)
          } else {
            // Assume it's already a DateTime object
            dueDate = data.returnDate as DateTime
          }
          
          // Validate the parsed date
          if (!dueDate.isValid) {
            throw new Error(`Invalid return date format: ${data.returnDate}. Error: ${dueDate.invalidReason}`)
          }
          
          // Ensure the due date is in the future
          if (dueDate <= DateTime.now()) {
            logger.warn(`Return date ${dueDate.toISODate()} is not in the future, but creating notification anyway`)
          }
          
        } catch (dateError) {
          logger.error(`Failed to parse return date: ${dateError.message}`)
          await trx.rollback()
          return response.badRequest({
            error: 'Invalid return date format',
            details: dateError.message
          })
        }
        
        try {
          // Check if notification already exists for this patient, vaccine, and due date
          const existingNotification = await Notification.query({ client: trx })
            .where('patientId', record.patientId)
            .where('vaccineId', record.vaccineId)
            .where('dueDate', dueDate.toSQLDate() || '')
            .first()
          
          if (!existingNotification) {
            // Create new notification within the same transaction
            const notification = await Notification.create({
              patientId: record.patientId,
              vaccineId: record.vaccineId,
              dueDate: dueDate,
              status: 'pending',
              facilityId: record.facilityId
            }, { client: trx })
            
            logger.info(`Successfully created notification ${notification.id} for immunization record ${record.id}`)
          } else {
            logger.info(`Notification already exists for patient ${record.patientId}, vaccine ${record.vaccineId}, due date ${dueDate.toISODate()}`)
          }
          
        } catch (notificationError) {
          logger.error(`Failed to create notification for immunization record ${record.id}:`, notificationError)
          await trx.rollback()
          return response.internalServerError({
            error: 'Failed to create notification',
            details: 'The immunization record could not be created because notification creation failed. Please try again.'
          })
        }
      }
      
      // Commit the transaction
      await trx.commit()
      
      logger.info(`Successfully created immunization record ${record.id}${data.returnDate ? ' with notification' : ''}`)
      
      return response.created(record)
      
    } catch (error) {
      // Rollback the transaction on any error
      await trx.rollback()
      logger.error('Failed to create immunization record:', error)
      
      return response.internalServerError({
        error: 'Failed to create immunization record',
        details: error.message
      })
    }
  }

  /**
   * Update immunization record
   */
  async update({ params, request, response, logger }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    
    // Validate request
    await request.validateUsing(immunizationRecordUpdateValidator)
    
    const data = request.only([
      'patientId',
      'vaccineId',
      'administeredDate',
      'administeredByUserId',
      'facilityId',
      'batchNumber',
      'returnDate',
      'notes'
    ])
    
    // Use database transaction for consistency
    const trx = await db.transaction()
    
    try {
      // Get the old return date before updating
      const oldReturnDate = record.returnDate
      
      // Update the record
      record.merge(data)
      record.useTransaction(trx)
      await record.save()
      
      // Handle notification updates if return date changed
      if (data.returnDate !== undefined) {
        const newReturnDate = data.returnDate
        
        // If return date was removed, we might want to handle existing notifications
        if (!newReturnDate && oldReturnDate) {
          logger.info(`Return date removed from immunization record ${record.id}, existing notifications remain`)
        }
        
        // If return date was added or changed, create/update notification
        if (newReturnDate) {
          let dueDate: DateTime
          try {
            if (typeof newReturnDate === 'string') {
              dueDate = DateTime.fromISO(newReturnDate)
            } else if (newReturnDate instanceof Date) {
              dueDate = DateTime.fromJSDate(newReturnDate)
            } else {
              dueDate = newReturnDate as DateTime
            }
            
            if (!dueDate.isValid) {
              throw new Error(`Invalid return date format: ${newReturnDate}`)
            }
            
            // Create notification service instance
            const notificationService = new NotificationService()
            
            // Create or update notification
            await notificationService.createNotificationForRecord(
              record.patientId,
              record.vaccineId,
              dueDate,
              record.facilityId
            )
            
            logger.info(`Updated notification for immunization record ${record.id}`)
            
          } catch (dateError) {
            logger.error(`Failed to handle notification update: ${dateError.message}`)
            await trx.rollback()
            return response.badRequest({
              error: 'Invalid return date format',
              details: dateError.message
            })
          }
        }
      }
      
      await trx.commit()
      return response.json(record)
      
    } catch (error) {
      await trx.rollback()
      logger.error('Failed to update immunization record:', error)
      return response.internalServerError({
        error: 'Failed to update immunization record',
        details: error.message
      })
    }
  }

  /**
   * Delete immunization record
   */
  async destroy({ params, response }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    await record.delete()
    
    return response.noContent()
  }

  /**
   * Get immunization records for a patient
   */
  async getPatientRecords({ params, response }: HttpContext) {
    const records = await ImmunizationRecord.query()
      .where('patientId', params.patientId)
      .preload('vaccine')
      .preload('administeredBy')
      .preload('facility')
    
    return response.json(records)
  }
}