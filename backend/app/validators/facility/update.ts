import vine from '@vinejs/vine'

/**
 * Validator for updating a facility
 */
export const facilityUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    district: vine.string().trim().minLength(2).maxLength(100).optional(),
    address: vine.string().trim().minLength(5).maxLength(255).optional(),
    contactPhone: vine.string().trim().minLength(5).maxLength(20).optional()
  })
)