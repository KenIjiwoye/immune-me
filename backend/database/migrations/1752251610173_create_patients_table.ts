import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'patients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('full_name').notNullable()
      table.enum('sex', ['M', 'F']).notNullable()
      table.date('date_of_birth').notNullable()
      table.string('mother_name')
      table.string('father_name')
      table.string('district').notNullable()
      table.string('town_village')
      table.string('address')
      table.string('contact_phone')
      table.integer('health_worker_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.string('health_worker_name')
      table.string('health_worker_phone')
      table.string('health_worker_address')
      table.integer('facility_id').unsigned().references('id').inTable('facilities').notNullable()
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}