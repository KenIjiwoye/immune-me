import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vaccines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('description')
      table.string('vaccine_code').notNullable() // Standardized codes (e.g., "BCG", "OPV0")
      table.integer('sequence_number').nullable() // Dose number in a series
      table.string('vaccine_series').nullable() // Group related vaccines (e.g., "OPV", "Penta")
      table.string('standard_schedule_age').nullable() // Recommended administration age
      table.boolean('is_supplementary').defaultTo(false) // Distinguish between standard and supplementary
      table.boolean('is_active').defaultTo(true)
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}