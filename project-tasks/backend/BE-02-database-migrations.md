# BE-02: Create Database Migrations for Core Tables

## Context
The Immunization Records Management System requires several database tables to store data for patients, facilities, vaccines, immunization records, and notifications. These tables need to be created using AdonisJS migrations.

## Dependencies
- BE-01: Database configuration completed
- AdonisJS Lucid ORM understanding

## Requirements
Create migrations for the following tables:
1. Facilities
2. Patients
3. Vaccines
4. Immunization Records
5. Notifications

Note: Users table migration already exists.

## Code Example

### Facilities Migration

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'facilities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('district').notNullable()
      table.string('address')
      table.string('contact_phone')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Patients Migration

```typescript
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
```

### Vaccines Migration

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vaccines'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('description')
      table.string('recommended_age')
      table.boolean('is_active').defaultTo(true)
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Immunization Records Migration

```typescript
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
      table.integer('facility_id').unsigned().references('id').inTable('facilities')
      table.string('batch_number')
      table.date('return_date')
      table.text('notes')
      
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Notifications Migration

```typescript
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
```

## Expected Outcome
- All required database tables created with proper relationships
- Migrations can be run successfully
- Database schema matches the requirements in the project brief

## Testing
Run the following commands to create and run the migrations:

```bash
cd backend
node ace make:migration facilities
node ace make:migration patients
node ace make:migration vaccines
node ace make:migration immunization_records
node ace make:migration notifications

# After creating all migration files and adding the code
node ace migration:run
```

Verify the tables were created correctly:

```bash
node ace db:table facilities
node ace db:table patients
node ace db:table vaccines
node ace db:table immunization_records
node ace db:table notifications
