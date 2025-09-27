import vine from '@vinejs/vine'

/**
 * Validator for updating an admin profile
 */
export const adminProfileUpdateValidator = vine.compile(
  vine.object({
    admin_level: vine.enum(['super_admin', 'system_admin', 'facility_admin']).optional(),
    system_permissions: vine.array(vine.string().trim().maxLength(100)).optional(),
    facility_access_scope: vine.enum(['all', 'assigned', 'single']).optional(),
    assigned_facilities: vine.array(vine.string().trim().maxLength(36)).optional(),
    security_clearance: vine.enum(['high', 'medium', 'standard']).optional(),
    mfa_enabled: vine.boolean().optional(),
    audit_log_access: vine.boolean().optional(),
    system_config_access: vine.boolean().optional(),
    user_management_scope: vine.enum(['global', 'facility', 'department']).optional(),
    backup_admin_user_id: vine.string().trim().maxLength(36).optional(),
    admin_notes: vine.string().trim().maxLength(2000).optional(),
    last_security_review: vine.date().optional()
  })
)