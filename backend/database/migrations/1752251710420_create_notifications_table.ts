import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('patient_id').unsigned().references('id').inTable('patients').onDelete('CASCADE')
      table.integer('vaccine_id').unsigned().references('id').inTable('vaccines').onDelete('CASCADE')
      table.date('due_date').notNullable()
      table.enum('status', ['pending', 'viewed', 'completed', 'overdue']).defaultTo('pending')
      table.integer('facility_id').unsigned().references('id').inTable('facilities')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}