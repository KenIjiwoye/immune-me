# SMS-01: Database Schema Extensions

## Context
The SMS integration requires extending the existing database schema to support SMS message tracking, patient consent management, message templates, and webhook logging. This task establishes the foundational data structures needed for the Orange Network SMS API integration into the Immunization Records Management System.

## Dependencies
- [`SMS-00`](SMS-00-oauth-token-management.md): OAuth 2.0 authentication must be implemented for Orange Network API access
- [`BE-02`](../backend/BE-02-database-migrations.md): Database migrations system must be in place
- Existing database schema with patients, notifications, and users tables

## Requirements

### 1. SMS Messages Tracking Table
Create a comprehensive table to track all SMS messages sent through the system, including Orange Network API integration fields and delivery status tracking.

### 2. Patient SMS Consent Management
Implement a consent tracking system that manages patient opt-in/opt-out preferences for SMS notifications, ensuring healthcare compliance.

### 3. SMS Message Templates
Create a template system for the three reminder types (7-day, 1-day, overdue) with multi-language support and character count optimization.

### 4. Webhook Logging System
Implement audit logging for all webhook requests from Orange Network for delivery status and inbound message tracking.

### 5. Existing Table Enhancements
Extend existing patients and notifications tables with SMS-related fields to support the integration.

## Code Examples

### SMS Messages Table Migration

```typescript
// backend/database/migrations/create_sms_messages_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sms_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Foreign key relationships
      table.integer('patient_id').unsigned().notNullable()
        .references('id').inTable('patients').onDelete('CASCADE')
      table.integer('notification_id').unsigned().nullable()
        .references('id').inTable('notifications').onDelete('SET NULL')
      
      // Message details
      table.string('phone_number', 20).notNullable()
      table.text('message_content').notNullable()
      table.string('message_type', 50).notNullable() // '7_day_reminder', '1_day_reminder', 'overdue_reminder'
      
      // Orange Network API fields
      table.string('client_correlator', 100).notNullable().unique()
      table.string('sender_address', 20).notNullable()
      
      // Status tracking
      table.string('status', 50).defaultTo('pending') // 'pending', 'sent', 'delivered', 'failed', 'cancelled'
      table.string('delivery_status', 50).nullable() // Orange Network delivery status
      table.text('delivery_description').nullable()
      
      // Timestamps
      table.timestamp('scheduled_at').nullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('delivered_at').nullable()
      table.timestamp('failed_at').nullable()
      
      // Metadata
      table.integer('retry_count').defaultTo(0)
      table.text('error_message').nullable()
      table.string('callback_data', 200).nullable()
      
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    // Create indexes for performance
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['patient_id'], 'idx_sms_messages_patient_id')
      table.index(['status'], 'idx_sms_messages_status')
      table.index(['scheduled_at'], 'idx_sms_messages_scheduled_at')
      table.index(['client_correlator'], 'idx_sms_messages_client_correlator')
      table.index(['message_type'], 'idx_sms_messages_type')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### SMS Consent Table Migration

```typescript
// backend/database/migrations/create_sms_consent_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sms_consent'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Patient relationship
      table.integer('patient_id').unsigned().notNullable()
        .references('id').inTable('patients').onDelete('CASCADE')
      table.string('phone_number', 20).notNullable()
      
      // Consent status
      table.boolean('consent_given').defaultTo(false)
      table.timestamp('consent_date').nullable()
      table.string('consent_method', 50).nullable() // 'registration', 'verbal', 'written', 'sms_reply'
      
      // Opt-out tracking
      table.boolean('opted_out').defaultTo(false)
      table.timestamp('opt_out_date').nullable()
      table.string('opt_out_method', 50).nullable() // 'sms_stop', 'verbal', 'written', 'admin'
      
      // Metadata
      table.integer('created_by').unsigned().nullable()
        .references('id').inTable('users')
      table.integer('updated_by').unsigned().nullable()
        .references('id').inTable('users')
      
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      
      // Unique constraint
      table.unique(['patient_id', 'phone_number'])
    })

    // Create indexes
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['patient_id'], 'idx_sms_consent_patient_id')
      table.index(['phone_number'], 'idx_sms_consent_phone_number')
      table.index(['consent_given', 'opted_out'], 'idx_sms_consent_status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### SMS Templates Table Migration

```typescript
// backend/database/migrations/create_sms_templates_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sms_templates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Template identification
      table.string('name', 100).notNullable().unique()
      table.string('template_type', 50).notNullable() // '7_day_reminder', '1_day_reminder', 'overdue_reminder'
      
      // Template content
      table.text('message_template').notNullable()
      table.integer('character_count').notNullable()
      
      // Localization
      table.string('language_code', 5).defaultTo('en')
      
      // Status
      table.boolean('is_active').defaultTo(true)
      
      // Metadata
      table.integer('created_by').unsigned().nullable()
        .references('id').inTable('users')
      table.integer('updated_by').unsigned().nullable()
        .references('id').inTable('users')
      
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    // Create indexes
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['template_type'], 'idx_sms_templates_type')
      table.index(['language_code'], 'idx_sms_templates_language')
      table.index(['is_active'], 'idx_sms_templates_active')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### SMS Templates Seeder

```typescript
// backend/database/seeders/sms_templates_seeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SMSTemplate from '#models/sms_template'

export default class extends BaseSeeder {
  async run() {
    const templates = [
      {
        name: '7_day_reminder_en',
        templateType: '7_day_reminder',
        messageTemplate: 'Reminder: {patient_name}\'s {vaccine_name} vaccination is due on {due_date} at {facility_name}. Reply STOP to opt out.',
        characterCount: 128,
        languageCode: 'en',
        isActive: true
      },
      {
        name: '1_day_reminder_en',
        templateType: '1_day_reminder',
        messageTemplate: 'Tomorrow: {patient_name}\'s {vaccine_name} vaccination at {facility_name}. Time: {appointment_time}. Reply STOP to opt out.',
        characterCount: 125,
        languageCode: 'en',
        isActive: true
      },
      {
        name: 'overdue_reminder_en',
        templateType: 'overdue_reminder',
        messageTemplate: 'Overdue: {patient_name}\'s {vaccine_name} vaccination was due {days_overdue} days ago. Please visit {facility_name}. Reply STOP to opt out.',
        characterCount: 142,
        languageCode: 'en',
        isActive: true
      }
    ]

    for (const template of templates) {
      await SMSTemplate.updateOrCreate(
        { name: template.name },
        template
      )
    }
  }
}
```

### Webhook Logs Table Migration

```typescript
// backend/database/migrations/create_sms_webhook_logs_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sms_webhook_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      
      // Webhook details
      table.string('webhook_type', 50).notNullable() // 'delivery_status', 'inbound_message'
      
      // Request details
      table.jsonb('request_headers').nullable()
      table.jsonb('request_body').notNullable()
      table.string('request_ip', 45).nullable()
      
      // Processing details
      table.boolean('processed').defaultTo(false)
      table.text('processing_error').nullable()
      table.integer('related_sms_message_id').unsigned().nullable()
        .references('id').inTable('sms_messages')
      
      // Response details
      table.integer('response_status').defaultTo(200)
      table.text('response_body').nullable()
      
      table.timestamp('created_at', { useTz: true })
    })

    // Create indexes
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['webhook_type'], 'idx_sms_webhook_logs_type')
      table.index(['processed'], 'idx_sms_webhook_logs_processed')
      table.index(['created_at'], 'idx_sms_webhook_logs_created_at')
      table.index(['related_sms_message_id'], 'idx_sms_webhook_logs_message_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Existing Table Enhancements

```typescript
// backend/database/migrations/enhance_patients_table_for_sms.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'patients'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // SMS-related fields
      table.string('primary_phone', 20).nullable()
      table.string('secondary_phone', 20).nullable()
      table.boolean('sms_preferred').defaultTo(false)
      table.string('preferred_language', 5).defaultTo('en')
    })

    // Create indexes for new fields
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['primary_phone'], 'idx_patients_primary_phone')
      table.index(['sms_preferred'], 'idx_patients_sms_preferred')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('primary_phone')
      table.dropColumn('secondary_phone')
      table.dropColumn('sms_preferred')
      table.dropColumn('preferred_language')
    })
  }
}
```

```typescript
// backend/database/migrations/enhance_notifications_table_for_sms.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // SMS tracking fields
      table.boolean('sms_enabled').defaultTo(false)
      table.integer('sms_message_id').unsigned().nullable()
        .references('id').inTable('sms_messages')
      table.timestamp('sms_sent_at').nullable()
      table.string('sms_delivery_status', 50).nullable()
    })

    // Create indexes
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['sms_enabled'], 'idx_notifications_sms_enabled')
      table.index(['sms_message_id'], 'idx_notifications_sms_message_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sms_enabled')
      table.dropColumn('sms_message_id')
      table.dropColumn('sms_sent_at')
      table.dropColumn('sms_delivery_status')
    })
  }
}
```

## Model Definitions

### SMS Message Model

```typescript
// backend/app/models/sms_message.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Patient from './patient.js'
import Notification from './notification.js'

export default class SMSMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare patientId: number

  @column()
  declare notificationId: number | null

  @column()
  declare phoneNumber: string

  @column()
  declare messageContent: string

  @column()
  declare messageType: string

  @column()
  declare clientCorrelator: string

  @column()
  declare senderAddress: string

  @column()
  declare status: string

  @column()
  declare deliveryStatus: string | null

  @column()
  declare deliveryDescription: string | null

  @column.dateTime()
  declare scheduledAt: DateTime | null

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime()
  declare deliveredAt: DateTime | null

  @column.dateTime()
  declare failedAt: DateTime | null

  @column()
  declare retryCount: number

  @column()
  declare errorMessage: string | null

  @column()
  declare callbackData: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Notification)
  declare notification: BelongsTo<typeof Notification>

  // Helper methods
  public static generateCorrelator(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public isDelivered(): boolean {
    return this.deliveryStatus === 'DeliveredToTerminal'
  }

  public isFailed(): boolean {
    return this.deliveryStatus === 'DeliveryImpossible' || this.status === 'failed'
  }

  public canRetry(): boolean {
    return this.retryCount < 3 && !this.isDelivered() && !this.isFailed()
  }
}
```

### SMS Consent Model

```typescript
// backend/app/models/sms_consent.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Patient from './patient.js'
import User from './user.js'

export default class SMSConsent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare patientId: number

  @column()
  declare phoneNumber: string

  @column()
  declare consentGiven: boolean

  @column.dateTime()
  declare consentDate: DateTime | null

  @column()
  declare consentMethod: string | null

  @column()
  declare optedOut: boolean

  @column.dateTime()
  declare optOutDate: DateTime | null

  @column()
  declare optOutMethod: string | null

  @column()
  declare createdBy: number | null

  @column()
  declare updatedBy: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  declare updater: BelongsTo<typeof User>

  // Helper methods
  public hasValidConsent(): boolean {
    return this.consentGiven && !this.optedOut
  }

  public static async findByPatientAndPhone(patientId: number, phoneNumber: string) {
    return await this.query()
      .where('patient_id', patientId)
      .where('phone_number', phoneNumber)
      .first()
  }
}
```

## Acceptance Criteria

1. **Database Tables Created**: All four new tables (sms_messages, sms_consent, sms_templates, sms_webhook_logs) are created with proper indexes
2. **Existing Tables Enhanced**: Patients and notifications tables are extended with SMS-related fields
3. **Models Defined**: Lucid ORM models are created for all new tables with proper relationships
4. **Seeders Working**: SMS templates are seeded with the three reminder types
5. **Migrations Reversible**: All migrations can be rolled back without data loss
6. **Indexes Optimized**: Database queries for SMS operations are optimized with appropriate indexes
7. **Relationships Established**: Foreign key relationships are properly defined and enforced

## Implementation Notes

### Database Performance Considerations
- Index frequently queried columns (patient_id, status, scheduled_at)
- Use appropriate data types for phone numbers and message content
- Implement soft deletes for audit trail requirements
- Consider partitioning for high-volume SMS logs

### Data Integrity
- Enforce foreign key constraints with appropriate cascade rules
- Use unique constraints for client_correlator to prevent duplicate messages
- Validate phone number formats at the database level
- Implement check constraints for status values

### Security Considerations
- Consider encrypting phone numbers in the database
- Implement audit logging for consent changes
- Use secure defaults for consent (opt-in required)
- Log all SMS-related database operations

### Healthcare Compliance
- Maintain complete audit trail for all SMS communications
- Implement data retention policies for SMS logs
- Ensure patient consent is properly tracked and enforced
- Provide mechanisms for data deletion upon request

## Testing Requirements

### Migration Testing
- Test forward and backward migrations
- Verify data integrity during migrations
- Test migration performance with large datasets
- Validate index creation and performance

### Model Testing
- Test model relationships and queries
- Validate helper methods and business logic
- Test constraint enforcement
- Verify data validation rules

### Integration Testing
- Test with existing notification system
- Verify foreign key relationships work correctly
- Test cascade delete operations
- Validate seeder data integrity

## Related Documentation

- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Orange Network API**: [`SMS-03-orange-network-api.md`](SMS-03-orange-network-api.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Backend Models**: [`../backend/BE-04-core-models.md`](../backend/BE-04-core-models.md)