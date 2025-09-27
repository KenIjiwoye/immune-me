import vine from '@vinejs/vine'

/**
 * Validator for updating an employee profile
 */
export const employeeProfileUpdateValidator = vine.compile(
  vine.object({
    professional_title: vine.string().trim().minLength(1).maxLength(100).optional(),
    license_number: vine.string().trim().minLength(1).maxLength(100).optional(),
    license_expiry_date: vine.date().optional(),
    specializations: vine.array(vine.string().trim().maxLength(100)).optional(),
    assigned_facilities: vine.array(vine.string().trim().maxLength(36)).optional(),
    department: vine.string().trim().minLength(1).maxLength(100).optional(),
    supervisor_user_id: vine.string().trim().maxLength(36).optional(),
    employment_status: vine.enum(['active', 'inactive', 'suspended', 'terminated']).optional(),
    work_schedule: vine.object({
      monday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      tuesday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      wednesday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      thursday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      friday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      saturday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional(),
      sunday: vine.object({
        start: vine.string().trim().optional(),
        end: vine.string().trim().optional(),
        break_start: vine.string().trim().optional(),
        break_end: vine.string().trim().optional()
      }).optional()
    }).optional(),
    contact_information: vine.object({
      email: vine.string().trim().email().maxLength(255).optional(),
      phone: vine.string().trim().minLength(5).maxLength(20).optional(),
      address: vine.string().trim().minLength(5).maxLength(255).optional()
    }).optional(),
    emergency_contact: vine.object({
      name: vine.string().trim().minLength(2).maxLength(100),
      relationship: vine.string().trim().minLength(2).maxLength(50),
      phone: vine.string().trim().minLength(5).maxLength(20),
      email: vine.string().trim().email().maxLength(255).optional(),
      address: vine.string().trim().minLength(5).maxLength(255).optional()
    }).optional(),
    training_records: vine.array(vine.object({
      training_name: vine.string().trim().minLength(1).maxLength(200),
      completion_date: vine.date(),
      expiry_date: vine.date().optional(),
      certificate_number: vine.string().trim().maxLength(100).optional(),
      provider: vine.string().trim().maxLength(200).optional()
    })).optional(),
    performance_notes: vine.string().trim().maxLength(2000).optional()
  })
)