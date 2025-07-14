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