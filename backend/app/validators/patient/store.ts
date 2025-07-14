import vine from '@vinejs/vine'

/**
 * Validator for creating a new patient
 */
export const patientStoreValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    sex: vine.enum(['M', 'F']),
    dateOfBirth: vine.date(),
    motherName: vine.string().trim().minLength(2).maxLength(100),
    fatherName: vine.string().trim().minLength(2).maxLength(100),
    district: vine.string().trim().minLength(2).maxLength(100),
    townVillage: vine.string().trim().minLength(2).maxLength(100),
    address: vine.string().trim().minLength(5).maxLength(255),
    contactPhone: vine.string().trim().minLength(5).maxLength(20),
    healthWorkerId: vine.number().optional(),
    healthWorkerName: vine.string().trim().minLength(2).maxLength(100).optional(),
    healthWorkerPhone: vine.string().trim().minLength(5).maxLength(20).optional(),
    healthWorkerAddress: vine.string().trim().minLength(5).maxLength(255).optional()
  })
)