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

// Access audit log base schema
const accessAuditLogBaseSchema = appwriteDocumentSchema.extend({
  user_id: z.string().min(1, 'User ID is required'),
  profile_id: z.string().optional(),
  profile_type: z.enum(['admin', 'employee', 'patient'], {
    errorMap: () => ({ message: 'Profile type must be one of: admin, employee, patient' }),
  }).optional(),
  action_type: z.enum(['login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'import', 'access_denied'], {
    errorMap: () => ({ message: 'Action type must be one of: login, logout, view, create, update, delete, export, import, access_denied' }),
  }),
  resource_type: z.enum(['patient', 'immunization', 'vaccine', 'facility', 'profile', 'report', 'system'], {
    errorMap: () => ({ message: 'Resource type must be one of: patient, immunization, vaccine, facility, profile, report, system' }),
  }),
  resource_id: z.string().optional(),
  facility_context: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  session_id: z.string().optional(),
  success: z.boolean(),
  failure_reason: z.string().max(500, 'Failure reason must be less than 500 characters').optional(),
  additional_data: z.string().optional(), // JSON string
  created_at: z.string().datetime(),
});

// Access audit log schema with business rules
export const accessAuditLogSchema = accessAuditLogBaseSchema.refine((data) => {
  // If success is false, failure_reason should be provided
  if (!data.success) {
    return data.failure_reason && data.failure_reason.trim().length > 0;
  }
  return true;
}, {
  message: 'Failure reason is required when access was not successful',
  path: ['failure_reason'],
}).refine((data) => {
  // If action_type is access_denied, success should be false
  if (data.action_type === 'access_denied') {
    return !data.success;
  }
  return true;
}, {
  message: 'Access denied actions must have success set to false',
  path: ['success'],
});

// Create access audit log schema (without Appwrite fields)
const createAccessAuditLogBaseSchema = accessAuditLogBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
});

export const createAccessAuditLogSchema = createAccessAuditLogBaseSchema.refine((data) => {
  // If success is false, failure_reason should be provided
  if (!data.success) {
    return data.failure_reason && data.failure_reason.trim().length > 0;
  }
  return true;
}, {
  message: 'Failure reason is required when access was not successful',
  path: ['failure_reason'],
}).refine((data) => {
  // If action_type is access_denied, success should be false
  if (data.action_type === 'access_denied') {
    return !data.success;
  }
  return true;
}, {
  message: 'Access denied actions must have success set to false',
  path: ['success'],
});

// Update access audit log schema (audit logs are typically immutable, but allowing updates for corrections)
export const updateAccessAuditLogSchema = createAccessAuditLogBaseSchema.partial();

// Type exports
export type AccessAuditLog = z.infer<typeof accessAuditLogSchema>;
export type CreateAccessAuditLog = z.infer<typeof createAccessAuditLogSchema>;
export type UpdateAccessAuditLog = z.infer<typeof updateAccessAuditLogSchema>;