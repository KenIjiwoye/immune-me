import vine from '@vinejs/vine'

/**
 * Validator for updating a patient
 */
export const patientUpdateValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100).optional(),
    sex: vine.enum(['M', 'F']).optional(),
    dateOfBirth: vine.date().optional(),
    motherName: vine.string().trim().minLength(2).maxLength(100).optional(),
    fatherName: vine.string().trim().minLength(2).maxLength(100).optional(),
    district: vine.string().trim().minLength(2).maxLength(100).optional(),
    townVillage: vine.string().trim().minLength(2).maxLength(100).optional(),
    address: vine.string().trim().minLength(5).maxLength(255).optional(),
    contactPhone: vine.string().trim().minLength(5).maxLength(20).optional(),
    healthWorkerId: vine.number().optional(),
    healthWorkerName: vine.string().trim().minLength(2).maxLength(100).optional(),
    healthWorkerPhone: vine.string().trim().minLength(5).maxLength(20).optional(),
    healthWorkerAddress: vine.string().trim().minLength(5).maxLength(255).optional(),
    facilityId: vine.number().optional()
  })
)