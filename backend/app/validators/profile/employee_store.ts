import vine from '@vinejs/vine'

/**
 * Validator for creating a new employee profile
 */
export const employeeProfileStoreValidator = vine.compile(
  vine.object({
    employee_id: vine.string().trim().minLength(1).maxLength(50),
    employee_type: vine.enum(['doctor', 'supervisor', 'nurse', 'data_entry_clerk', 'technician']),
    professional_title: vine.string().trim().minLength(1).maxLength(100).optional(),
    license_number: vine.string().trim().minLength(1).maxLength(100).optional(),
    license_expiry_date: vine.date().optional(),
    specializations: vine.array(vine.string().trim().maxLength(100)).optional(),
    primary_facility_id: vine.string().trim().minLength(1).maxLength(36),
    assigned_facilities: vine.array(vine.string().trim().maxLength(36)).optional(),
    department: vine.string().trim().minLength(1).maxLength(100).optional(),
    supervisor_user_id: vine.string().trim().maxLength(36).optional(),
    email: vine.string().trim().email().maxLength(255),
    phone: vine.string().trim().minLength(5).maxLength(20).optional(),
    password: vine.string().minLength(8).maxLength(255),
    name: vine.string().trim().minLength(2).maxLength(100),
    address: vine.string().trim().minLength(5).maxLength(255).optional(),
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
    emergency_contact: vine.object({
      name: vine.string().trim().minLength(2).maxLength(100),
      relationship: vine.string().trim().minLength(2).maxLength(50),
      phone: vine.string().trim().minLength(5).maxLength(20),
      email: vine.string().trim().email().maxLength(255).optional(),
      address: vine.string().trim().minLength(5).maxLength(255).optional()
    }).optional()
  })
)