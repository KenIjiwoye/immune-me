// backend/app/controllers/patients_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Patient from '#models/patient'
import { patientStoreValidator } from '#validators/patient/store'
import { patientUpdateValidator } from '#validators/patient/update'

export default class PatientsController {
  /**
   * List all patients
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 999)
    
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
  async store({ request, response, auth }: HttpContext) {
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
    
    // Set facility ID from authenticated user
    const patientData = {
      ...data,
      facilityId: user.facilityId
    }
    
    const patient = await Patient.create(patientData)
    
    return response.created(patient)
  }

  /**
   * Update patient
   */
  async update({ params, request, response }: HttpContext) {
    const patient = await Patient.findOrFail(params.id)
    
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
    
    patient.merge(data)
    await patient.save()
    
    return response.json(patient)
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
  async search({ request, response }: HttpContext) {
    const { query, district, sex } = request.qs()
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const patientsQuery = Patient.query()
    
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
    
    return response.json(patients)
  }
}