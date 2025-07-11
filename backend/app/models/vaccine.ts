import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import * as ImmunizationRecordModel from '#models/immunization_record'
import * as NotificationModel from '#models/notification'

export default class Vaccine extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare vaccineCode: string
  
  @column()
  declare sequenceNumber: number | null
  
  @column()
  declare vaccineSeries: string | null
  
  @column()
  declare standardScheduleAge: string | null
  
  // Alias for standardScheduleAge to maintain compatibility with test script
  get recommendedAge(): string | null {
    return this.standardScheduleAge
  }
  
  set recommendedAge(value: string | null) {
    this.standardScheduleAge = value
  }
  
  @column()
  declare isSupplementary: boolean
  
  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ImmunizationRecordModel.default)
  declare immunizationRecords: HasMany<typeof ImmunizationRecordModel.default>

  @hasMany(() => NotificationModel.default)
  declare notifications: HasMany<typeof NotificationModel.default>
}