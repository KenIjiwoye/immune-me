import { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'
import { DateTime } from 'luxon'
import { notificationStoreValidator } from '#validators/notification/store'
import { notificationUpdateValidator } from '#validators/notification/update'
import NotificationService from '#services/notification_service'

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
    
    // Transform the data to include flat properties for frontend compatibility
    const transformedData = {
      ...notifications.toJSON(),
      data: notifications.toJSON().data.map((notification: any) => ({
        id: notification.id,
        patientId: notification.patientId,
        vaccineId: notification.vaccineId,
        patientName: notification.patient?.fullName || 'Unknown Patient',
        vaccineName: notification.vaccine?.name || 'Unknown Vaccine',
        dueDate: notification.dueDate,
        status: notification.status,
        facilityId: notification.facilityId,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        // Keep original nested objects for backward compatibility
        patient: notification.patient,
        vaccine: notification.vaccine,
        facility: notification.facility
      }))
    }
    
    return response.json(transformedData)
  }

  /**
   * Get notification by ID
   */
  async show({ params, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    await notification.load('patient')
    await notification.load('vaccine')
    await notification.load('facility')
    
    // Transform the data to include flat properties for frontend compatibility
    const transformedNotification = {
      id: notification.id,
      patientId: notification.patientId,
      vaccineId: notification.vaccineId,
      patientName: notification.patient?.fullName || 'Unknown Patient',
      vaccineName: notification.vaccine?.name || 'Unknown Vaccine',
      dueDate: notification.dueDate,
      status: notification.status,
      facilityId: notification.facilityId,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      // Keep original nested objects for backward compatibility
      patient: notification.patient,
      vaccine: notification.vaccine,
      facility: notification.facility
    }
    
    return response.json(transformedNotification)
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
  /**
   * Get due notifications - returns notifications that are due today or within the next 7 days
   */
  async getDueNotifications({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const today = DateTime.now().toISODate()
    // Get notifications due within the next 7 days (including today)
    const dueWithinDays = DateTime.now().plus({ days: 7 }).toISODate()
    
    // Create a query builder - get notifications due today or within the next 7 days
    const query = Notification.query()
      .whereIn('status', ['pending', 'overdue'])
      .where('dueDate', '>=', today)  // Due today or later
      .where('dueDate', '<=', dueWithinDays)  // But within 7 days
      .preload('patient')
      .preload('vaccine')
      .preload('facility')
    
    // Only filter by facilityId if the user has one
    if (user.facilityId !== undefined && user.facilityId !== null) {
      query.where('facilityId', user.facilityId)
    }
    
    const notifications = await query.paginate(page, limit)
    
    // Transform the data to include flat properties for frontend compatibility
    const transformedData = {
      ...notifications.toJSON(),
      data: notifications.toJSON().data.map((notification: any) => ({
        id: notification.id,
        patientId: notification.patientId,
        vaccineId: notification.vaccineId,
        patientName: notification.patient?.fullName || 'Unknown Patient',
        vaccineName: notification.vaccine?.name || 'Unknown Vaccine',
        dueDate: notification.dueDate,
        status: notification.status,
        facilityId: notification.facilityId,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        // Keep original nested objects for backward compatibility
        patient: notification.patient,
        vaccine: notification.vaccine,
        facility: notification.facility
      }))
    }
    
    return response.json(transformedData)
  }

  /**
   * DEPRECATED: Manually trigger notification generation (admin only)
   * This method has been deprecated in favor of immediate notification creation.
   */
  async generateNotifications({ response, logger }: HttpContext) {
    logger.warn('Deprecated generateNotifications endpoint called - notifications are now created immediately')
    
    const notificationService = new NotificationService()
    
    // Only update overdue notifications, as due notifications are now created immediately
    const overdueResult = await notificationService.updateOverdueNotifications()
    
    return response.json({
      message: 'This endpoint is deprecated. Notifications are now created immediately when immunization records are created.',
      overdue: overdueResult,
      due: { processed: 0, created: 0, message: 'Due notifications are now created immediately' }
    })
  }
}