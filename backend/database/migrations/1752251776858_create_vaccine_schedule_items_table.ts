import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vaccine_schedule_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('schedule_id').unsigned().references('id').inTable('vaccine_schedules').onDelete('CASCADE')
      table.integer('vaccine_id').unsigned().references('id').inTable('vaccines').onDelete('CASCADE')
      table.string('recommended_age').notNullable() // e.g., "At birth", "6 weeks"
      table.boolean('is_required').defaultTo(true)
      table.integer('sequence_in_schedule') // Order in the schedule
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}