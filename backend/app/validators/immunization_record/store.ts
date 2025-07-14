import vine from '@vinejs/vine'

/**
 * Validator for creating a new immunization record
 */
export const immunizationRecordStoreValidator = vine.compile(
  vine.object({
    patientId: vine.number(),
    vaccineId: vine.number(),
    administeredDate: vine.date(),
    batchNumber: vine.string().trim().minLength(1).maxLength(50),
    returnDate: vine.date().optional(),
    notes: vine.string().trim().maxLength(500).optional()
  })
)