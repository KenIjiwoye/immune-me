import { z } from 'zod';

// Base Appwrite document schema
const appwriteDocumentSchema = z.object({
  $id: z.string(),
  $collectionId: z.string(),
  $databaseId: z.string(),
  $createdAt: z.string().datetime(),
  $updatedAt: z.string().datetime(),
  $permissions: z.array(z.string()),
});

// Role change log base schema
const roleChangeLogBaseSchema = appwriteDocumentSchema.extend({
  target_user_id: z.string().min(1, 'Target user ID is required'),
  target_profile_id: z.string().optional(),
  target_profile_type: z.enum(['admin', 'employee', 'patient'], {
    errorMap: () => ({ message: 'Target profile type must be one of: admin, employee, patient' }),
  }).optional(),
  assigned_by_user_id: z.string().min(1, 'Assigned by user ID is required'),
  assigned_by_profile_id: z.string().optional(),
  role_change_type: z.enum(['promotion', 'demotion', 'transfer', 'activation', 'deactivation', 'permission_change'], {
    errorMap: () => ({ message: 'Role change type must be one of: promotion, demotion, transfer, activation, deactivation, permission_change' }),
  }),
  old_role_data: z.string().optional(), // JSON string
  new_role_data: z.string().min(1, 'New role data is required'), // JSON string
  facility_context: z.string().optional(),
  change_reason: z.string().max(500, 'Change reason must be less than 500 characters').optional(),
  effective_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Effective date must be a valid date'),
  expiry_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Expiry date must be a valid date').optional(),
  status: z.enum(['active', 'expired', 'revoked'], {
    errorMap: () => ({ message: 'Status must be one of: active, expired, revoked' }),
  }),
  approval_required: z.boolean(),
  approved_by_user_id: z.string().optional(),
  approved_at: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Approved at must be a valid date').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Role change log schema with business rules
export const roleChangeLogSchema = roleChangeLogBaseSchema.refine((data) => {
  // If approval_required is true, approved_by_user_id and approved_at must be provided
  if (data.approval_required) {
    return data.approved_by_user_id && data.approved_at;
  }
  return true;
}, {
  message: 'Approved by user ID and approved at are required when approval is required',
  path: ['approved_by_user_id'],
}).refine((data) => {
  // If expiry_date is provided, it must be after effective_date
  if (data.expiry_date) {
    const effectiveDate = new Date(data.effective_date);
    const expiryDate = new Date(data.expiry_date);
    return expiryDate > effectiveDate;
  }
  return true;
}, {
  message: 'Expiry date must be after effective date',
  path: ['expiry_date'],
}).refine((data) => {
  // Effective date should not be in the past for new role changes
  const effectiveDate = new Date(data.effective_date);
  const now = new Date();
  // Allow some tolerance for backdating (e.g., 1 day)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return effectiveDate >= oneDayAgo;
}, {
  message: 'Effective date cannot be more than 1 day in the past',
  path: ['effective_date'],
});

// Create role change log schema (without Appwrite fields)
const createRoleChangeLogBaseSchema = roleChangeLogBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createRoleChangeLogSchema = createRoleChangeLogBaseSchema.refine((data) => {
  // If approval_required is true, approved_by_user_id and approved_at must be provided
  if (data.approval_required) {
    return data.approved_by_user_id && data.approved_at;
  }
  return true;
}, {
  message: 'Approved by user ID and approved at are required when approval is required',
  path: ['approved_by_user_id'],
}).refine((data) => {
  // If expiry_date is provided, it must be after effective_date
  if (data.expiry_date) {
    const effectiveDate = new Date(data.effective_date);
    const expiryDate = new Date(data.expiry_date);
    return expiryDate > effectiveDate;
  }
  return true;
}, {
  message: 'Expiry date must be after effective date',
  path: ['expiry_date'],
}).refine((data) => {
  // Effective date should not be in the past for new role changes
  const effectiveDate = new Date(data.effective_date);
  const now = new Date();
  // Allow some tolerance for backdating (e.g., 1 day)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return effectiveDate >= oneDayAgo;
}, {
  message: 'Effective date cannot be more than 1 day in the past',
  path: ['effective_date'],
});

// Update role change log schema
export const updateRoleChangeLogSchema = createRoleChangeLogBaseSchema.partial();

// Type exports
export type RoleChangeLog = z.infer<typeof roleChangeLogSchema>;
export type CreateRoleChangeLog = z.infer<typeof createRoleChangeLogSchema>;
export type UpdateRoleChangeLog = z.infer<typeof updateRoleChangeLogSchema>;