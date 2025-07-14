/**
 * Scheduler configuration for the Immunization Records Management System
 *
 * This file configures the adonisjs-scheduler package to run the notification
 * generation job daily at midnight.
 */

import scheduler from 'adonisjs-scheduler/services/main'
import NotificationService from '#services/notification_service'

// Schedule notification generation to run daily at midnight
scheduler
  .call(async () => {
    const notificationService = new NotificationService()
    await notificationService.generateDueNotifications()
    await notificationService.updateOverdueNotifications()
  })
  .daily()
  .withoutOverlapping()

/**
 * Alternative: Use the command directly
 *
 * The scheduler can also be configured to run the command directly:
 *
 * scheduler.command('notifications:generate').daily()
 *
 * To run the scheduler, use one of these commands:
 * - node ace scheduler:run
 * - node ace scheduler:work
 *
 * For development with auto-restart:
 * - node ace scheduler:run --watch
 */