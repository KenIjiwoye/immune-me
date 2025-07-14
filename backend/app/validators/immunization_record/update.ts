import vine from '@vinejs/vine'

/**
 * Validator for updating an immunization record
 */
export const immunizationRecordUpdateValidator = vine.compile(
  vine.object({
    patientId: vine.number().optional(),
    vaccineId: vine.number().optional(),
    administeredDate: vine.date().optional(),
    administeredByUserId: vine.number().optional(),
    facilityId: vine.number().optional(),
    batchNumber: vine.string().trim().minLength(1).maxLength(50).optional(),
    returnDate: vine.date().optional(),
    notes: vine.string().trim().maxLength(500).optional()
  })
)