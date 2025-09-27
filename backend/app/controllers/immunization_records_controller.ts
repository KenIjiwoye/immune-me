// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'
import { immunizationRecordStoreValidator } from '#validators/immunization_record/store'
import { immunizationRecordUpdateValidator } from '#validators/immunization_record/update'
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
  async store({ request, response, auth, userProfile, credentialWarning }: HttpContext) {
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
    
    const record = await ImmunizationRecord.create(recordData)
    
    // Enhanced response with Profile context
    const response_data = {
      ...record.toJSON(),
      administered_by_profile: userProfile ? {
        type: userProfile.type,
        user_reference: await this.profileService.getUserReference(user.id),
        credential_status: credentialWarning ? 'warning' : 'valid'
      } : null,
      profile_enhanced: !!userProfile
    }
    
    return response.created(response_data)
  }

  /**
   * Update immunization record
   */
  async update({ params, request, response, auth, userProfile }: HttpContext) {
    const record = await ImmunizationRecord.findOrFail(params.id)
    const user = auth.user!
    
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
    
    record.merge(data)
    await record.save()
    
    // Enhanced response with Profile context
    const response_data = {
      ...record.toJSON(),
      updated_by_profile: userProfile ? {
        type: userProfile.type,
        user_reference: await this.profileService.getUserReference(user.id)
      } : null
    }
    
    return response.json(response_data)
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