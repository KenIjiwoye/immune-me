import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
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
  declare patient: BelongsTo<any>

  @belongsTo(() => Vaccine)
  declare vaccine: BelongsTo<any>

  @belongsTo(() => Facility)
  declare facility: BelongsTo<any>
}