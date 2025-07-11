import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
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
  declare batchNumber: string

  @column()
  declare healthOfficer: string | null

  @column()
  declare isStandardSchedule: boolean

  @column()
  declare scheduleStatus: 'on_schedule' | 'delayed' | 'missed' | null

  @column.date()
  declare returnDate: DateTime

  @column()
  declare notes: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Patient)
  declare patient: BelongsTo<any>

  @belongsTo(() => Vaccine)
  declare vaccine: BelongsTo<any>

  @belongsTo(() => User, {
    foreignKey: 'administeredByUserId',
  })
  declare administeredBy: BelongsTo<any>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<any>
}