import vine from '@vinejs/vine'

/**
 * Validator for updating a user
 */
export const userUpdateValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(3).maxLength(50).optional(),
    email: vine.string().trim().email().optional(),
    password: vine.string().minLength(8).maxLength(100).optional(),
    fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
    role: vine.string().trim().in(['administrator', 'healthcare_worker', 'supervisor', 'doctor']).optional(),
    facilityId: vine.number().positive().optional()
  })
)