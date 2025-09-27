import vine from '@vinejs/vine'

/**
 * Validator for creating a new patient profile
 */
export const patientProfileStoreValidator = vine.compile(
  vine.object({
    patient_id: vine.string().trim().minLength(1).maxLength(36),
    email: vine.string().trim().email().maxLength(255),
    phone: vine.string().trim().minLength(5).maxLength(20).optional(),
    password: vine.string().minLength(8).maxLength(255),
    verification_method: vine.enum(['phone', 'email', 'in_person', 'guardian']).optional(),
    guardian_user_id: vine.string().trim().maxLength(36).optional(),
    access_permissions: vine.array(vine.string().trim().maxLength(50)).optional(),
    notification_preferences: vine.object({
      email_notifications: vine.boolean().optional(),
      sms_notifications: vine.boolean().optional(),
      push_notifications: vine.boolean().optional(),
      reminder_frequency: vine.enum(['daily', 'weekly', 'monthly']).optional(),
      preferred_language: vine.string().trim().maxLength(10).optional()
    }).optional(),
    emergency_contact: vine.object({
      name: vine.string().trim().minLength(2).maxLength(100),
      relationship: vine.string().trim().minLength(2).maxLength(50),
      phone: vine.string().trim().minLength(5).maxLength(20),
      email: vine.string().trim().email().maxLength(255).optional(),
      address: vine.string().trim().minLength(5).maxLength(255).optional()
    }).optional()
  })
)