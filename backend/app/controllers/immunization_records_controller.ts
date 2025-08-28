// backend/app/controllers/immunization_records_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import { immunizationRecordStoreValidator } from '#validators/immunization_record/store'
import { immunizationRecordUpdateValidator } from '#validators/immunization_record/update'
import { DateTime } from 'luxon'

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
    
    // If a return date is provided, create a notification immediately
    if (data.returnDate) {
      try {
        // Convert returnDate to DateTime if it's a string
        const dueDate = typeof data.returnDate === 'string'
          ? DateTime.fromISO(data.returnDate)
          : DateTime.fromJSDate(data.returnDate)
        
        // Check if notification already exists for this patient, vaccine, and due date
        const existingNotification = await Notification.query()
          .where('patientId', record.patientId)
          .where('vaccineId', record.vaccineId)
          .where('dueDate', dueDate.toSQLDate() || '')
          .first()
        
        if (!existingNotification) {
          await Notification.create({
            patientId: record.patientId,
            vaccineId: record.vaccineId,
            dueDate: dueDate,
            status: 'pending',
            facilityId: record.facilityId
          })
        }
      } catch (error) {
        // Log error but don't fail the immunization record creation
        console.error('Failed to create notification for immunization record:', error)
      }
    }
    
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