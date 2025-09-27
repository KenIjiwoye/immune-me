// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import NotificationService from '#services/notification_service'
import { immunizationRecordStoreValidator } from '#validators/immunization_record/store'
import { immunizationRecordUpdateValidator } from '#validators/immunization_record/update'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import ProfileService from '#services/profile_service'

export default class ImmunizationRecordsController {
  private profileService = new ProfileService()
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
  async store({ request, response, auth, userProfile, credentialWarning, logger }: HttpContext) {
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
    
    // Enhanced facility ID determination using Profile data
    let facilityId = user.facilityId
    
    if (userProfile) {
      if (userProfile.type === 'employee' && userProfile.profile) {
        const employeeProfile = userProfile.profile as any
        facilityId = employeeProfile.primary_facility_id || user.facilityId
      }
    }
    
    // Prepare enhanced immunization record data
    let recordData = {
      ...data,
      administeredByUserId: user.id,
      facilityId
    }
    
    // Apply Profile-aware enhancements
    if (userProfile) {
      try {
        const enhancedData = await this.profileService.createEnhancedImmunizationRecord({
          ...recordData,
          administered_by_user_id: user.id
        })
        
        // Merge enhanced data back to recordData
        recordData = {
          ...recordData,
          ...enhancedData,
          administeredByUserId: user.id, // Ensure this stays as the correct type
          facilityId // Ensure this stays as the correct type
        }
      } catch (error) {
        return response.badRequest({
          error: error.message,
          code: 'PROFILE_VALIDATION_FAILED'
        })
      }
    }
    
    // Add credential warning to notes if present
    if (credentialWarning) {
      recordData.notes = (recordData.notes || '') + ` [SYSTEM WARNING: ${credentialWarning}]`
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
          // Create notification service instance
          const notificationService = new NotificationService()
          
          // Use NotificationService to create notification with SMS sending
          await notificationService.createNotificationForRecord(
            record.patientId,
            record.vaccineId,
            dueDate,
            record.facilityId
          )
          
          logger.info(`Successfully created notification with SMS attempt for immunization record ${record.id}`)
          
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
  async update({ params, request, response, auth, userProfile, logger }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    const user = auth.user!
    
    // Validate request
    await request.validateUsing(immunizationRecordUpdateValidator)
    
    const data = request.only([
      'patientId',
      'vaccineId',
      'administeredDate',
      'batchNumber',
      'returnDate',
      'notes'
    ])
    
    // Enhanced validation for facility access
    if (userProfile && data.facilityId) {
      const hasAccess = await this.profileService.validateFacilityAccess(userProfile, data.facilityId)
      if (!hasAccess) {
        return response.forbidden({
          error: 'Access denied to specified facility',
          user_profile_type: userProfile.type
        })
      }
    }
    
    // Enhanced validation for administered by user
    if (data.administeredByUserId && data.administeredByUserId !== user.id) {
      // Only admins and supervisors can change who administered the vaccine
      if (userProfile?.type !== 'admin' && user.role !== 'administrator' && user.role !== 'supervisor') {
        return response.forbidden({
          error: 'Insufficient permissions to change administering user'
        })
      }
      
      // Validate the new administering user has valid credentials
      try {
        const administeringUserProfile = await this.profileService.getUserProfileType(data.administeredByUserId)
        if (administeringUserProfile.type === 'employee' && administeringUserProfile.profile) {
          const credentialCheck = await this.profileService.validateProfessionalCredentials(administeringUserProfile.profile as any)
          if (!credentialCheck.valid) {
            return response.badRequest({
              error: `Cannot assign to user with invalid credentials: ${credentialCheck.message}`
            })
          }
        }
      } catch (error) {
        return response.badRequest({
          error: 'Invalid administering user specified'
        })
      }
    }
    
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
  async getPatientRecords({ params, response, auth, userProfile }: HttpContext) {
    const user = auth.user!
    
    // Enhanced access control for patient records
    if (userProfile) {
      if (userProfile.type === 'patient') {
        // Patients can only access their own records
        // This would require linking patient records to user accounts
        // For now, we'll allow access but this should be enhanced with proper patient-user linking
      } else if (userProfile.type === 'employee' && userProfile.profile) {
        // Employees can access records for patients in their assigned facilities
        const employeeProfile = userProfile.profile as any
        const assignedFacilities = employeeProfile.assigned_facilities || [employeeProfile.primary_facility_id]
        
        // We should validate that the patient belongs to one of the assigned facilities
        // This would require joining with the patients table
      }
    }
    
    const records = await ImmunizationRecord.query()
      .where('patientId', params.patientId)
      .preload('vaccine')
      .preload('administeredBy')
      .preload('facility')
    
    // Enhanced response with Profile-aware administered by information
    const enhancedRecords = await Promise.all(
      records.map(async (record) => {
        const recordData = record.toJSON()
        
        if (record.administeredByUserId) {
          try {
            const administeringUserReference = await this.profileService.getUserReference(record.administeredByUserId)
            recordData.administered_by_enhanced = {
              ...recordData.administeredBy,
              profile_reference: administeringUserReference
            }
          } catch (error) {
            // If profile reference fails, keep original data
            console.warn('Failed to get profile reference for administering user:', record.administeredByUserId)
          }
        }
        
        return recordData
      })
    )
    
    const response_data = {
      records: enhancedRecords,
      patient_id: params.patientId,
      access_context: {
        user_profile_type: userProfile?.type || 'legacy',
        enhanced_data: true
      }
    }
    
    return response.json(response_data)
  }
}