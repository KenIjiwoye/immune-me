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

// Admin profile base schema
const adminProfileBaseSchema = appwriteDocumentSchema.extend({
  user_id: z.string().min(1, 'User ID is required'),
  admin_level: z.enum(['super_admin', 'regional_admin', 'facility_admin'], {
    errorMap: () => ({ message: 'Admin level must be one of: super_admin, regional_admin, facility_admin' }),
  }),
  system_permissions: z.array(z.string()).optional(),
  facility_access_scope: z.enum(['all', 'regional', 'facility_specific'], {
    errorMap: () => ({ message: 'Facility access scope must be one of: all, regional, facility_specific' }),
  }),
  accessible_facilities: z.array(z.string()).optional(),
  data_access_level: z.enum(['full', 'restricted', 'read_only'], {
    errorMap: () => ({ message: 'Data access level must be one of: full, restricted, read_only' }),
  }),
  can_manage_users: z.boolean(),
  can_manage_facilities: z.boolean(),
  can_manage_vaccines: z.boolean(),
  can_generate_reports: z.boolean(),
  can_manage_system_settings: z.boolean(),
  emergency_access: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Admin profile schema with business rules
export const adminProfileSchema = adminProfileBaseSchema.refine((data) => {
  // If facility_access_scope is facility_specific, accessible_facilities must be provided
  if (data.facility_access_scope === 'facility_specific') {
    return data.accessible_facilities && data.accessible_facilities.length > 0;
  }
  return true;
}, {
  message: 'Accessible facilities must be provided when access scope is facility_specific',
  path: ['accessible_facilities'],
}).refine((data) => {
  // Super admin must have full access
  if (data.admin_level === 'super_admin') {
    return data.data_access_level === 'full' && data.can_manage_system_settings;
  }
  return true;
}, {
  message: 'Super admin must have full data access and system settings management',
  path: ['admin_level'],
});

// Create admin profile schema (without Appwrite fields)
const createAdminProfileBaseSchema = adminProfileBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createAdminProfileSchema = createAdminProfileBaseSchema.refine((data) => {
  // If facility_access_scope is facility_specific, accessible_facilities must be provided
  if (data.facility_access_scope === 'facility_specific') {
    return data.accessible_facilities && data.accessible_facilities.length > 0;
  }
  return true;
}, {
  message: 'Accessible facilities must be provided when access scope is facility_specific',
  path: ['accessible_facilities'],
}).refine((data) => {
  // Super admin must have full access
  if (data.admin_level === 'super_admin') {
    return data.data_access_level === 'full' && data.can_manage_system_settings;
  }
  return true;
}, {
  message: 'Super admin must have full data access and system settings management',
  path: ['admin_level'],
});

// Update admin profile schema
export const updateAdminProfileSchema = createAdminProfileBaseSchema.partial();

// Type exports
export type AdminProfile = z.infer<typeof adminProfileSchema>;
export type CreateAdminProfile = z.infer<typeof createAdminProfileSchema>;
export type UpdateAdminProfile = z.infer<typeof updateAdminProfileSchema>;