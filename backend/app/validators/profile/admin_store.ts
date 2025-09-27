import vine from '@vinejs/vine'

/**
 * Validator for creating a new admin profile
 */
export const adminProfileStoreValidator = vine.compile(
  vine.object({
    admin_level: vine.enum(['super_admin', 'system_admin', 'facility_admin']),
    system_permissions: vine.array(vine.string().trim().maxLength(100)),
    facility_access_scope: vine.enum(['all', 'assigned', 'single']),
    assigned_facilities: vine.array(vine.string().trim().maxLength(36)).optional(),
    security_clearance: vine.enum(['high', 'medium', 'standard']),
    mfa_enabled: vine.boolean().optional(),
    audit_log_access: vine.boolean().optional(),
    system_config_access: vine.boolean().optional(),
    user_management_scope: vine.enum(['global', 'facility', 'department']),
    backup_admin_user_id: vine.string().trim().maxLength(36).optional(),
    admin_notes: vine.string().trim().maxLength(2000).optional(),
    email: vine.string().trim().email().maxLength(255),
    phone: vine.string().trim().minLength(5).maxLength(20).optional(),
    password: vine.string().minLength(8).maxLength(255),
    name: vine.string().trim().minLength(2).maxLength(100)
  })
)