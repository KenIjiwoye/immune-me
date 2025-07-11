import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'immunization_records'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('patient_id').unsigned().references('id').inTable('patients').onDelete('CASCADE')
      table.integer('vaccine_id').unsigned().references('id').inTable('vaccines').onDelete('CASCADE')
      table.date('administered_date').notNullable()
      table.integer('administered_by_user_id').unsigned().references('id').inTable('users')
      table.string('health_officer').nullable() // Who administered the vaccine
      table.integer('facility_id').unsigned().references('id').inTable('facilities')
      table.string('batch_number')
      table.date('return_date')
      table.boolean('is_standard_schedule').defaultTo(true) // If part of standard schedule
      table.enum('schedule_status', ['on_schedule', 'delayed', 'missed']).nullable() // Track compliance with schedule
      table.text('notes')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}