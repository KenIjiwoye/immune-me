import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'supplementary_immunizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.text('description')
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()
      table.integer('facility_id').unsigned().references('id').inTable('facilities')
      table.integer('vaccine_id').unsigned().references('id').inTable('vaccines')
      table.text('target_population')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}