import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import * as FacilityModel from '#models/facility'
import * as ImmunizationRecordModel from '#models/immunization_record'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
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
  declare role: string

  @column()
  declare facilityId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => FacilityModel.default)
  declare facility: BelongsTo<typeof FacilityModel.default>

  @hasMany(() => ImmunizationRecordModel.default, {
    foreignKey: 'administeredByUserId',
  })
  declare administeredImmunizations: HasMany<typeof ImmunizationRecordModel.default>

  static accessTokens = DbAccessTokensProvider.forModel(User)
}