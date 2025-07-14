import { HttpContext } from '@adonisjs/core/http'
import Facility from '#models/facility'
import { facilityStoreValidator } from '#validators/facility/store'
import { facilityUpdateValidator } from '#validators/facility/update'

export default class FacilitiesController {
  /**
   * List all facilities
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const facilities = await Facility.query()
      .paginate(page, limit)
    
    return response.json(facilities)
  }

  /**
   * Get facility by ID
   */
  async show({ params, response }: HttpContext) {
    const facility = await Facility.findOrFail(params.id)
    
    return response.json(facility)
  }

  /**
   * Create new facility
   */
  async store({ request, response }: HttpContext) {
    // Validate request data
    const data = await request.validateUsing(facilityStoreValidator)
    
    const facility = await Facility.create(data)
    
    return response.created(facility)
  }

  /**
   * Update facility
   */
  async update({ params, request, response }: HttpContext) {
    const facility = await Facility.findOrFail(params.id)
    
    // Validate request data
    const data = await request.validateUsing(facilityUpdateValidator)
    
    facility.merge(data)
    await facility.save()
    
    return response.json(facility)
  }

  /**
   * Delete facility
   */
  async destroy({ params, response }: HttpContext) {
    const facility = await Facility.findOrFail(params.id)
    await facility.delete()
    
    return response.noContent()
  }
}