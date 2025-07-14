// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'
import { immunizationRecordStoreValidator } from '#validators/immunization_record/store'
import { immunizationRecordUpdateValidator } from '#validators/immunization_record/update'

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
  async store({ request, response, auth }: HttpContext) {
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
    
    const record = await ImmunizationRecord.create(recordData)
    
    return response.created(record)
  }

  /**
   * Update immunization record
   */
  async update({ params, request, response }: HttpContext) {
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
    
    record.merge(data)
    await record.save()
    
    return response.json(record)
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