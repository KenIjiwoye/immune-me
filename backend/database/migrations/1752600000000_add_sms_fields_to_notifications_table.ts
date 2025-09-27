import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('sms_message_id').nullable().comment('Orange SMS API message ID')
      table.enum('sms_status', ['not_sent', 'sent', 'delivered', 'failed']).nullable().comment('SMS delivery status')
      table.timestamp('sms_sent_at').nullable().comment('When SMS was sent')
      table.timestamp('sms_delivered_at').nullable().comment('When SMS was delivered')
      table.text('sms_error_message').nullable().comment('SMS error message if failed')
      table.string('sms_error_code').nullable().comment('SMS error code if failed')
      table.integer('sms_retry_count').defaultTo(0).comment('Number of SMS retry attempts')
      table.timestamp('sms_last_retry_at').nullable().comment('Last SMS retry attempt timestamp')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sms_message_id')
      table.dropColumn('sms_status')
      table.dropColumn('sms_sent_at')
      table.dropColumn('sms_delivered_at')
      table.dropColumn('sms_error_message')
      table.dropColumn('sms_error_code')
      table.dropColumn('sms_retry_count')
      table.dropColumn('sms_last_retry_at')
    })
  }
}