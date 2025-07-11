import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
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
  declare users: HasMany<any>

  @hasMany(() => Patient)
  declare patients: HasMany<any>

  @hasMany(() => ImmunizationRecord)
  declare immunizationRecords: HasMany<any>

  @hasMany(() => Notification)
  declare notifications: HasMany<any>
}