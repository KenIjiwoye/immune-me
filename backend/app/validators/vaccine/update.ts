import vine from '@vinejs/vine'

/**
 * Validator for updating a vaccine
 */
export const vaccineUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100).optional(),
    description: vine.string().trim().minLength(5).maxLength(500).optional(),
    vaccineCode: vine.string().trim().minLength(1).maxLength(50).optional(),
    sequenceNumber: vine.number().optional(),
    vaccineSeries: vine.string().trim().maxLength(100).optional(),
    standardScheduleAge: vine.string().trim().maxLength(100).optional(),
    isSupplementary: vine.boolean().optional(),
    isActive: vine.boolean().optional()
  })
)