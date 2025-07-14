import vine from '@vinejs/vine'

/**
 * Validator for updating a notification
 */
export const notificationUpdateValidator = vine.compile(
  vine.object({
    patientId: vine.number().optional(),
    vaccineId: vine.number().optional(),
    dueDate: vine.date().optional(),
    status: vine.enum(['pending', 'viewed', 'completed', 'overdue']).optional(),
    facilityId: vine.number().optional()
  })
)