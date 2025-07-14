import { HttpContext } from '@adonisjs/core/http'
import Vaccine from '#models/vaccine'
import { vaccineStoreValidator } from '#validators/vaccine/store'
import { vaccineUpdateValidator } from '#validators/vaccine/update'

export default class VaccinesController {
  /**
   * List all vaccines
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const vaccines = await Vaccine.query()
      .paginate(page, limit)
    
    return response.json(vaccines)
  }

  /**
   * Get vaccine by ID
   */
  async show({ params, response }: HttpContext) {
    const vaccine = await Vaccine.findOrFail(params.id)
    
    return response.json(vaccine)
  }

  /**
   * Create new vaccine
   */
  async store({ request, response }: HttpContext) {
    // Validate request data
    const data = await request.validateUsing(vaccineStoreValidator)
    
    const vaccine = await Vaccine.create(data)
    
    return response.created(vaccine)
  }

  /**
   * Update vaccine
   */
  async update({ params, request, response }: HttpContext) {
    const vaccine = await Vaccine.findOrFail(params.id)
    
    // Validate request data
    const data = await request.validateUsing(vaccineUpdateValidator)
    
    vaccine.merge(data)
    await vaccine.save()
    
    return response.json(vaccine)
  }

  /**
   * Delete vaccine
   */
  async destroy({ params, response }: HttpContext) {
    const vaccine = await Vaccine.findOrFail(params.id)
    await vaccine.delete()
    
    return response.noContent()
  }
}