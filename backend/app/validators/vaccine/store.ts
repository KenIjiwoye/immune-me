import vine from '@vinejs/vine'

/**
 * Validator for creating a new vaccine
 */
export const vaccineStoreValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    description: vine.string().trim().minLength(5).maxLength(500),
    vaccineCode: vine.string().trim().minLength(1).maxLength(50),
    sequenceNumber: vine.number().optional(),
    vaccineSeries: vine.string().trim().maxLength(100).optional(),
    standardScheduleAge: vine.string().trim().maxLength(100).optional(),
    isSupplementary: vine.boolean(),
    isActive: vine.boolean()
  })
)