import { BaseCommand } from '@adonisjs/core/ace'

/**
 * DEPRECATED: This command has been deprecated in favor of immediate notification creation.
 * 
 * Previously, this command was used to generate notifications for due immunizations
 * in batch mode. This approach has been removed to prevent race conditions and
 * ensure notifications are created immediately when immunization records are created.
 * 
 * If you need to manually create notifications for existing records, consider
 * creating a one-time migration or manual script instead.
 */
export default class GenerateNotifications extends BaseCommand {
  static commandName = 'notifications:generate'
  static description = '[DEPRECATED] Generate notifications for due immunizations - use immediate creation instead'

  async run() {
    this.logger.error('This command has been deprecated.')
    this.logger.error('Notifications are now created immediately when immunization records are created.')
    this.logger.error('This prevents race conditions and ensures consistency.')
    this.logger.error('')
    this.logger.error('If you need to create notifications for existing records, please create a custom migration.')
    
    process.exit(1)
  }
}