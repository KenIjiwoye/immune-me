import { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'
import { DateTime } from 'luxon'
import { notificationStoreValidator } from '#validators/notification/store'
import { notificationUpdateValidator } from '#validators/notification/update'

export default class NotificationsController {
  /**
   * List all notifications
   */
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    // Create a query builder
    const query = Notification.query()
      .preload('patient')
      .preload('vaccine')
      .preload('facility')
    
    // Only filter by facilityId if the user has one
    if (user.facilityId !== undefined && user.facilityId !== null) {
      query.where('facilityId', user.facilityId)
    }
    
    const notifications = await query.paginate(page, limit)
    
    return response.json(notifications)
  }

  /**
   * Get notification by ID
   */
  async show({ params, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    await notification.load('patient')
    await notification.load('vaccine')
    await notification.load('facility')
    
    return response.json(notification)
  }

  /**
   * Create new notification
   * Note: Typically notifications are created automatically by the system,
   * but this endpoint allows manual creation if needed
   */
  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    // Validate request data
    const validatedData = await request.validateUsing(notificationStoreValidator)
    
    // Set facility ID from authenticated user if not provided and if user has a facilityId
    if (!validatedData.facilityId && user.facilityId !== undefined && user.facilityId !== null) {
      validatedData.facilityId = user.facilityId
    }
    
    // If no facilityId is provided and user doesn't have one, return an error
    if (!validatedData.facilityId) {
      return response.badRequest({
        message: 'A facility ID is required to create a notification'
      })
    }
    
    // Convert Date to DateTime for dueDate
    const data = {
      ...validatedData,
      dueDate: validatedData.dueDate ? DateTime.fromJSDate(validatedData.dueDate) : undefined
    }
    
    const notification = await Notification.create(data)
    
    return response.created(notification)
  }

  /**
   * Update notification
   */
  async update({ params, request, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    
    // Validate request data
    const validatedData = await request.validateUsing(notificationUpdateValidator)
    
    // Convert Date to DateTime for dueDate if provided
    const data = {
      ...validatedData,
      dueDate: validatedData.dueDate ? DateTime.fromJSDate(validatedData.dueDate) : undefined
    }
    
    notification.merge(data)
    await notification.save()
    
    return response.json(notification)
  }

  /**
   * Delete notification
   */
  async destroy({ params, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    await notification.delete()
    
    return response.noContent()
  }

  /**
   * Get due notifications
   */
  async getDueNotifications({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const today = DateTime.now().toISODate()
    
    // Create a query builder
    const query = Notification.query()
      .where('status', 'pending')
      .where('dueDate', '<=', today)
      .preload('patient')
      .preload('vaccine')
      .preload('facility')
    
    // Only filter by facilityId if the user has one
    if (user.facilityId !== undefined && user.facilityId !== null) {
      query.where('facilityId', user.facilityId)
    }
    
    const notifications = await query.paginate(page, limit)
    
    return response.json(notifications)
  }
}