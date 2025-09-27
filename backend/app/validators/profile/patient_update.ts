import vine from '@vinejs/vine'

/**
 * Validator for updating a patient profile
 */
export const patientProfileUpdateValidator = vine.compile(
  vine.object({
    profile_status: vine.enum(['active', 'inactive', 'suspended']).optional(),
    verification_status: vine.enum(['pending', 'verified', 'rejected']).optional(),
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