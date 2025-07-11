import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Facility from '#models/facility'

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
  declare healthWorker: BelongsTo<any>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<any>

  // Temporarily commenting out these relationships to fix circular dependencies
  /*
  @hasMany(() => ImmunizationRecord)
  declare immunizationRecords: HasMany<any>

  @hasMany(() => Notification)
  declare notifications: HasMany<any>
  */
}