import vine from '@vinejs/vine'

/**
 * Validator for creating a new facility
 */
export const facilityStoreValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    district: vine.string().trim().minLength(2).maxLength(100),
    address: vine.string().trim().minLength(5).maxLength(255),
    contactPhone: vine.string().trim().minLength(5).maxLength(20)
  })
)