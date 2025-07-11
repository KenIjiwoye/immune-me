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
3. Vaccines (Enhanced for Liberia schedule)
4. Immunization Records (Enhanced for Liberia schedule)
5. Notifications
6. Vaccine Schedules (New for Liberia schedule)
7. Vaccine Schedule Items (New for Liberia schedule)
8. Supplementary Immunizations (New for Liberia schedule)

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

### Vaccines Migration (Enhanced for Liberia Schedule)

```typescript
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
```

### Immunization Records Migration (Enhanced for Liberia Schedule)

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

### Vaccine Schedules Migration (New for Liberia Schedule)

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vaccine_schedules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').notNullable() // e.g., "Liberia EPI Schedule"
      table.string('country').notNullable()
      table.text('description')
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

### Vaccine Schedule Items Migration (New for Liberia Schedule)

```typescript
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
```

### Supplementary Immunizations Migration (New for Liberia Schedule)

```typescript
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
```

## Expected Outcome
- All required database tables created with proper relationships
- Enhanced schema to support the Liberia immunization schedule
- Support for country-specific schedules, vaccine series, and compliance tracking
- Migrations can be run successfully

## Testing
Run the following commands to create and run the migrations:

```bash
cd backend
node ace make:migration facilities
node ace make:migration patients
node ace make:migration vaccines
node ace make:migration immunization_records
node ace make:migration notifications
node ace make:migration vaccine_schedules
node ace make:migration vaccine_schedule_items
node ace make:migration supplementary_immunizations

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
node ace db:table vaccine_schedules
node ace db:table vaccine_schedule_items
node ace db:table supplementary_immunizations
