import vine from '@vinejs/vine'

/**
 * Validator for creating a new user
 */
export const userStoreValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(3).maxLength(50).unique(async (db, value) => {
      const user = await db.from('users').where('username', value).first()
      return !user
    }),
    email: vine.string().trim().email().unique(async (db, value) => {
      const user = await db.from('users').where('email', value).first()
      return !user
    }),
    password: vine.string().minLength(8).maxLength(100),
    fullName: vine.string().trim().minLength(2).maxLength(100),
    role: vine.string().trim().in(['administrator', 'healthcare_worker', 'supervisor', 'doctor']),
    facilityId: vine.number().positive()
  })
)