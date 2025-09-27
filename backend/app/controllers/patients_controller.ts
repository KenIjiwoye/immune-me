// backend/app/controllers/patients_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Patient from '#models/patient'
import { patientStoreValidator } from '#validators/patient/store'
import { patientUpdateValidator } from '#validators/patient/update'
import ProfileService from '#services/profile_service'

export default class PatientsController {
  private profileService = new ProfileService()
  /**
   * List all patients
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const patients = await Patient.query()
      .preload('facility')
      .paginate(page, limit)
    
    return response.json(patients)
  }

  /**
   * Get patient by ID
   */
  async show({ params, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    await patient.load('facility')
    
    return response.json(patient)
  }

  /**
   * Create new patient
   */
  async store({ request, response, auth, userProfile }: HttpContext) {
    const user = auth.user!
    
    // Validate request
    await request.validateUsing(patientStoreValidator)
    
    const data = request.only([
      'fullName',
      'sex',
      'dateOfBirth',
      'motherName',
      'fatherName',
      'district',
      'townVillage',
      'address',
      'contactPhone',
      'healthWorkerId',
      'healthWorkerName',
      'healthWorkerPhone',
      'healthWorkerAddress'
    ])
    
    // Enhanced facility ID determination using Profile data
    let facilityId = user.facilityId
    
    if (userProfile) {
      if (userProfile.type === 'employee' && userProfile.profile) {
        const employeeProfile = userProfile.profile as any
        facilityId = employeeProfile.primary_facility_id || user.facilityId
      } else if (userProfile.type === 'admin') {
        // Admins can specify facility or use their assigned facility
        facilityId = request.input('facilityId') || user.facilityId
      }
    }
    
    const patientData = {
      ...data,
      facilityId
    }
    
    const patient = await Patient.create(patientData)
    
    // Enhanced response with Profile context
    const response_data = {
      ...patient.toJSON(),
      created_by_profile: userProfile ? {
        type: userProfile.type,
        user_reference: await this.profileService.getUserReference(user.id)
      } : null
    }
    
    return response.created(response_data)
  }

  /**
   * Update patient
   */
  async update({ params, request, response, auth, userProfile }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    const user = auth.user!
    
    // Validate request
    await request.validateUsing(patientUpdateValidator)
    
    const data = request.only([
      'fullName',
      'sex',
      'dateOfBirth',
      'motherName',
      'fatherName',
      'district',
      'townVillage',
      'address',
      'contactPhone',
      'healthWorkerId',
      'healthWorkerName',
      'healthWorkerPhone',
      'healthWorkerAddress',
      'facilityId'
    ])
    
    // Enhanced facility access validation using Profile data
    if (userProfile && data.facilityId) {
      const hasAccess = await this.profileService.validateFacilityAccess(userProfile, data.facilityId)
      if (!hasAccess) {
        return response.forbidden({
          error: 'Access denied to specified facility',
          user_profile_type: userProfile.type
        })
      }
    }
    
    // Enhanced health worker validation
    if (data.healthWorkerId) {
      try {
        const healthWorkerReference = await this.profileService.getUserReference(data.healthWorkerId)
        
        // Update health worker information with Profile data if available
        if (healthWorkerReference.profile_type === 'employee') {
          data.healthWorkerName = healthWorkerReference.name
          // Additional health worker details could be populated here
        }
      } catch (error) {
        // Health worker not found or no profile, continue with provided data
        console.warn('Health worker profile not found:', data.healthWorkerId)
      }
    }
    
    patient.merge(data)
    await patient.save()
    
    // Enhanced response with Profile context
    const response_data = {
      ...patient.toJSON(),
      updated_by_profile: userProfile ? {
        type: userProfile.type,
        user_reference: await this.profileService.getUserReference(user.id)
      } : null
    }
    
    return response.json(response_data)
  }

  /**
   * Delete patient
   */
  async destroy({ params, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    await patient.delete()
    
    return response.noContent()
  }

  /**
   * Search patients
   */
  async search({ request, response, auth, userProfile }: HttpContext) {
    const { query, district, sex } = request.qs()
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const user = auth.user!
    
    const patientsQuery = Patient.query()
    
    // Enhanced facility filtering based on Profile data
    if (userProfile) {
      if (userProfile.type === 'employee' && userProfile.profile) {
        const employeeProfile = userProfile.profile as any
        const assignedFacilities = employeeProfile.assigned_facilities || [employeeProfile.primary_facility_id]
        patientsQuery.whereIn('facilityId', assignedFacilities)
      } else if (userProfile.type === 'patient' && userProfile.profile) {
        const patientProfile = userProfile.profile as any
        patientsQuery.where('facilityId', patientProfile.facility_id)
      }
      // Admin profiles can see all patients (no additional filtering)
    } else {
      // Fallback to traditional facility filtering
      if (user.facilityId) {
        patientsQuery.where('facilityId', user.facilityId)
      }
    }
    
    if (query) {
      patientsQuery.where(q => {
        q.where('fullName', 'ILIKE', `%${query}%`)
          .orWhere('motherName', 'ILIKE', `%${query}%`)
          .orWhere('fatherName', 'ILIKE', `%${query}%`)
          .orWhere('contactPhone', 'ILIKE', `%${query}%`)
      })
    }
    
    if (district) {
      patientsQuery.where('district', district)
    }
    
    if (sex) {
      patientsQuery.where('sex', sex)
    }
    
    const patients = await patientsQuery.paginate(page, limit)
    
    // Enhanced response with Profile context
    const response_data = {
      ...patients.toJSON(),
      search_context: {
        user_profile_type: userProfile?.type || 'legacy',
        facility_scope: userProfile?.type === 'admin' ? 'all' : 'restricted'
      }
    }
    
    return response.json(response_data)
  }
}