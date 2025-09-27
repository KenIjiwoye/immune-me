/**
 * Scheduler configuration for the Immunization Records Management System
 *
 * This file previously configured the adonisjs-scheduler package to run the notification
 * generation job daily at midnight. This has been removed in favor of immediate notification
 * creation when immunization records are created.
 *
 * DEPRECATED: Batch notification generation has been removed to prevent race conditions
 * and ensure immediate notification creation.
 */

import scheduler from 'adonisjs-scheduler/services/main'

// NOTE: The notification generation scheduler has been removed.
// Notifications are now created immediately when immunization records are created
// to ensure consistency and prevent race conditions.

// If you need to run any other scheduled tasks in the future, add them here.
// Example:
// scheduler
//   .call(async () => {
//     // Your scheduled task here
//   })
//   .daily()
//   .withoutOverlapping()

/**
 * To run the scheduler (if any tasks are added in the future), use one of these commands:
 * - node ace scheduler:run
 * - node ace scheduler:work
 *
 * For development with auto-restart:
 * - node ace scheduler:run --watch
 */