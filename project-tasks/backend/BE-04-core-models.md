# BE-04: Implement Core Data Models

## Context
The Immunization Records Management System requires Lucid ORM models for each database entity. These models will define relationships between entities and provide methods for interacting with the database.

## Dependencies
- BE-01: Database configuration completed
- BE-02: Database migrations completed

## Requirements
Implement the following Lucid ORM models:
1. User model (update existing)
2. Facility model
3. Patient model
4. Vaccine model
5. ImmunizationRecord model
6. Notification model

## Code Example

### User Model

```typescript
// backend/app/models/user.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Facility from '#models/facility'
import ImmunizationRecord from '#models/immunization_record'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string

  @column()
  declare role: 'nurse' | 'doctor' | 'administrator' | 'supervisor'

  @column()
  declare facilityId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Facility)
  declare facility: BelongsTo<typeof Facility>

  @hasMany(() => ImmunizationRecord, {
    foreignKey: 'administeredByUserId',
  })
  declare administeredImmunizations: HasMany<typeof ImmunizationRecord>
}
```

### Facility Model

```typescript
// backend/app/models/facility.ts
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Patient from '#models/patient'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'

export default class Facility extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare district: string

  @column()
  declare address: string

  @column()
  declare contactPhone: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @hasMany(() => Patient)
  declare patients: HasMany<typeof Patient>

  @hasMany(() => ImmunizationRecord)
  declare immunizationRecords: HasMany<typeof ImmunizationRecord>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>
}
```

### Patient Model

```typescript
// backend/app/models/patient.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Facility from '#models/facility'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'

export default class Patient extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string

  @column()
  declare sex: 'M' | 'F'

  @column.date()
  declare dateOfBirth: DateTime

  @column()
  declare motherName: string

  @column()
  declare fatherName: string

  @column()
  declare district: string

  @column()
  declare townVillage: string

  @column()
  declare address: string

  @column()
  declare contactPhone: string

  @column()
  declare healthWorkerId: number | null

  @column()
  declare healthWorkerName: string | null

  @column()
  declare healthWorkerPhone: string | null

  @column()
  declare healthWorkerAddress: string | null

  @column()
  declare facilityId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'healthWorkerId',
  })
  declare healthWorker: BelongsTo<typeof User>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<typeof Facility>

  @hasMany(() => ImmunizationRecord)
  declare immunizationRecords: HasMany<typeof ImmunizationRecord>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>
}
```

### Vaccine Model

```typescript
// backend/app/models/vaccine.ts
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { HasMany } from '@adonisjs/lucid/types/relations'
import ImmunizationRecord from '#models/immunization_record'
import Notification from '#models/notification'

export default class Vaccine extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare recommendedAge: string

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ImmunizationRecord)
  declare immunizationRecords: HasMany<typeof ImmunizationRecord>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>
}
```

### ImmunizationRecord Model

```typescript
// backend/app/models/immunization_record.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { BelongsTo } from '@adonisjs/lucid/types/relations'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'
import User from '#models/user'
import Facility from '#models/facility'

export default class ImmunizationRecord extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare patientId: number

  @column()
  declare vaccineId: number

  @column.date()
  declare administeredDate: DateTime

  @column()
  declare administeredByUserId: number

  @column()
  declare facilityId: number

  @column()
  declare batchNumber: string | null

  @column.date()
  declare returnDate: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Vaccine)
  declare vaccine: BelongsTo<typeof Vaccine>

  @belongsTo(() => User, {
    foreignKey: 'administeredByUserId',
  })
  declare administeredBy: BelongsTo<typeof User>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<typeof Facility>
}
```

### Notification Model

```typescript
// backend/app/models/notification.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { BelongsTo } from '@adonisjs/lucid/types/relations'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'
import Facility from '#models/facility'

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare patientId: number

  @column()
  declare vaccineId: number

  @column.date()
  declare dueDate: DateTime

  @column()
  declare status: 'pending' | 'viewed' | 'completed' | 'overdue'

  @column()
  declare facilityId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Patient)
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Vaccine)
  declare vaccine: BelongsTo<typeof Vaccine>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<typeof Facility>
}
```

## Expected Outcome
- All models implemented with proper relationships
- Models follow AdonisJS Lucid ORM conventions
- Models can be used to interact with the database

## Testing
Test the models by creating a simple script to create and retrieve data:

```typescript
// Test script
import { BaseCommand } from '@adonisjs/core/ace'
import Facility from '#models/facility'
import User from '#models/user'
import Patient from '#models/patient'
import Vaccine from '#models/vaccine'

export default class TestModels extends BaseCommand {
  static commandName = 'test:models'
  static description = 'Test the models'

  async run() {
    // Create a facility
    const facility = await Facility.create({
      name: 'Test Hospital',
      district: 'Test District',
      address: '123 Test St',
      contactPhone: '123-456-7890'
    })

    this.logger.info(`Created facility: ${facility.name}`)

    // Create a user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      role: 'nurse',
      facilityId: facility.id
    })

    this.logger.info(`Created user: ${user.fullName}`)

    // Load relationship
    await user.load('facility')
    this.logger.info(`User belongs to facility: ${user.facility.name}`)

    // Test other models as needed
  }
}
```

Run the test script with:

```bash
cd backend
node ace test:models
