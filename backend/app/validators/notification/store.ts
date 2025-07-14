import vine from '@vinejs/vine'

/**
 * Validator for creating a new notification
 */
export const notificationStoreValidator = vine.compile(
  vine.object({
    patientId: vine.number(),
    vaccineId: vine.number(),
    dueDate: vine.date(),
    status: vine.enum(['pending', 'viewed', 'completed', 'overdue']),
    facilityId: vine.number()
  })
)