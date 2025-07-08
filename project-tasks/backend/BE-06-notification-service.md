# BE-06: Implement Notification Service

## Context
The Immunization Records Management System requires a notification service to automatically generate notifications for patients due for immunizations. This service will identify upcoming immunizations based on return dates and create notification records.

## Dependencies
- BE-01: Database configuration completed
- BE-02: Database migrations completed
- BE-04: Core models implemented
- BE-05: API endpoints implemented

## Requirements
1. Create a notification service that identifies immunization records with upcoming return dates
2. Generate notification records for patients due for immunizations
3. Implement a scheduled job to run the notification service regularly
4. Create endpoints to retrieve due notifications

## Code Example

### Notification Service

```typescript
// backend/app/services/notification_service.ts
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'
import { DateTime } from 'luxon'

export default class NotificationService {
  /**
   * Generate notifications for immunizations due in the next 7 days
   */
  public async generateDueNotifications() {
    // Find immunization records with return dates in the next 7 days
    const records = await ImmunizationRecord.query()
      .whereNotNull('returnDate')
      .where('returnDate', '>=', DateTime.now().toSQL())
      .where('returnDate', '<=', DateTime.now().plus({ days: 7 }).toSQL())
      .preload('patient')
      .preload('vaccine')
    
    let createdCount = 0
    
    // Create notifications for each record
    for (const record of records) {
      // Check if notification already exists
      const existingNotification = await Notification.query()
        .where('patientId', record.patientId)
        .where('vaccineId', record.vaccineId)
        .where('dueDate', record.returnDate!.toSQL())
        .first()
      
      if (!existingNotification) {
        // Create new notification
        await Notification.create({
          patientId: record.patientId,
          vaccineId: record.vaccineId,
          dueDate: record.returnDate,
          status: 'pending',
          facilityId: record.facilityId
        })
        
        createdCount++
      }
    }
    
    return {
      processed: records.length,
      created: createdCount
    }
  }

  /**
   * Update overdue notifications
   */
  public async updateOverdueNotifications() {
    // Find notifications that are overdue and still pending
    const overdueNotifications = await Notification.query()
      .where('status', 'pending')
      .where('dueDate', '<', DateTime.now().toSQL())
    
    // Update status to overdue
    for (const notification of overdueNotifications) {
      notification.status = 'overdue'
      await notification.save()
    }
    
    return {
      updated: overdueNotifications.length
    }
  }

  /**
   * Get due notifications for a facility
   */
  public async getDueNotifications(facilityId: number) {
    return Notification.query()
      .where('facilityId', facilityId)
      .whereIn('status', ['pending', 'overdue'])
      .preload('patient')
      .preload('vaccine')
      .orderBy('dueDate', 'asc')
  }
}
```

### Scheduled Command

```typescript
// backend/app/commands/generate_notifications.ts
import { BaseCommand } from '@adonisjs/core/ace'
import NotificationService from '#services/notification_service'

export default class GenerateNotifications extends BaseCommand {
  static commandName = 'notifications:generate'
  static description = 'Generate notifications for due immunizations'

  async run() {
    const notificationService = new NotificationService()
    
    this.logger.info('Generating due notifications...')
    const dueResult = await notificationService.generateDueNotifications()
    this.logger.info(`Processed ${dueResult.processed} records, created ${dueResult.created} notifications`)
    
    this.logger.info('Updating overdue notifications...')
    const overdueResult = await notificationService.updateOverdueNotifications()
    this.logger.info(`Updated ${overdueResult.updated} notifications to overdue status`)
  }
}
```

### Notifications Controller

```typescript
// backend/app/controllers/notifications_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'
import NotificationService from '#services/notification_service'

export default class NotificationsController {
  /**
   * List all notifications
   */
  async index({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    
    const notifications = await Notification.query()
      .where('facilityId', user.facilityId)
      .preload('patient')
      .preload('vaccine')
      .orderBy('dueDate', 'asc')
      .paginate(page, limit)
    
    return response.json(notifications)
  }

  /**
   * Get notification by ID
   */
  async show({ params, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    await notification.load('patient')
    await notification.load('vaccine')
    
    return response.json(notification)
  }

  /**
   * Update notification status
   */
  async update({ params, request, response }: HttpContext) {
    const notification = await Notification.findOrFail(params.id)
    
    const { status } = request.only(['status'])
    notification.status = status
    await notification.save()
    
    return response.json(notification)
  }

  /**
   * Get due notifications
   */
  async getDueNotifications({ response, auth }: HttpContext) {
    const user = auth.user!
    const notificationService = new NotificationService()
    
    const dueNotifications = await notificationService.getDueNotifications(user.facilityId)
    
    return response.json(dueNotifications)
  }

  /**
   * Manually trigger notification generation (admin only)
   */
  async generateNotifications({ response }: HttpContext) {
    const notificationService = new NotificationService()
    
    const dueResult = await notificationService.generateDueNotifications()
    const overdueResult = await notificationService.updateOverdueNotifications()
    
    return response.json({
      due: dueResult,
      overdue: overdueResult
    })
  }
}
```

### Schedule Configuration

```typescript
// backend/start/scheduler.ts
import scheduler from '@adonisjs/core/services/scheduler'
import NotificationService from '#services/notification_service'

// Schedule notification generation to run daily at midnight
scheduler.addCronJob('generate-notifications', '0 0 * * *', async () => {
  const notificationService = new NotificationService()
  await notificationService.generateDueNotifications()
  await notificationService.updateOverdueNotifications()
})
```

### Routes Configuration

```typescript
// Add to backend/start/routes.ts
// Notifications routes
router.group(() => {
  router.get('/', '#controllers/notifications_controller.index')
  router.get('/due', '#controllers/notifications_controller.getDueNotifications')
  router.get('/:id', '#controllers/notifications_controller.show')
  router.put('/:id', '#controllers/notifications_controller.update')
  router.post('/generate', '#controllers/notifications_controller.generateNotifications')
    .use(middleware.auth({ roles: ['administrator'] }))
})
  .prefix('/api/notifications')
  .use(middleware.auth())
```

## Expected Outcome
- Notification service that automatically identifies due immunizations
- Scheduled job that runs daily to generate notifications
- API endpoints to retrieve and update notifications
- Proper handling of overdue notifications

## Testing
Test the notification service with the following steps:

1. Create test immunization records with return dates in the next 7 days:

```bash
# Create test data through API or directly in database
```

2. Manually trigger notification generation:

```bash
cd backend
node ace notifications:generate
```

3. Verify notifications were created:

```bash
# Check through API
curl -X GET http://localhost:3333/api/notifications/due \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Or check directly in database
```

4. Test updating notification status:

```bash
curl -X PUT http://localhost:3333/api/notifications/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"status":"viewed"}'
