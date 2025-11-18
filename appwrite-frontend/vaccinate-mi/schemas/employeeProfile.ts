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

// Employee profile base schema
const employeeProfileBaseSchema = appwriteDocumentSchema.extend({
  user_id: z.string().min(1, 'User ID is required'),
  employee_id: z.string().min(1, 'Employee ID is required').max(50, 'Employee ID must be less than 50 characters'),
  employee_type: z.enum(['doctor', 'nurse', 'health_worker', 'administrator', 'technician'], {
    errorMap: () => ({ message: 'Employee type must be one of: doctor, nurse, health_worker, administrator, technician' }),
  }),
  professional_title: z.string().min(1, 'Professional title is required').max(100, 'Professional title must be less than 100 characters'),
  license_number: z.string().max(50, 'License number must be less than 50 characters').optional(),
  license_expiry_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'License expiry date must be a valid date').optional(),
  specializations: z.array(z.string()).optional(),
  primary_facility_id: z.string().min(1, 'Primary facility ID is required'),
  assigned_facilities: z.array(z.string()).optional(),
  department: z.string().max(50, 'Department must be less than 50 characters').optional(),
  employment_status: z.enum(['active', 'inactive', 'suspended', 'terminated'], {
    errorMap: () => ({ message: 'Employment status must be one of: active, inactive, suspended, terminated' }),
  }),
  hire_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed <= new Date();
  }, 'Hire date must be a valid date in the past').optional(),
  contact_information: z.string().max(200, 'Contact information must be less than 200 characters').optional(),
  work_schedule: z.string().max(200, 'Work schedule must be less than 200 characters').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Employee profile schema with business rules
export const employeeProfileSchema = employeeProfileBaseSchema.refine((data) => {
  // If license_number is provided, license_expiry_date should also be provided
  if (data.license_number) {
    return data.license_expiry_date !== undefined;
  }
  return true;
}, {
  message: 'License expiry date is required when license number is provided',
  path: ['license_expiry_date'],
}).refine((data) => {
  // License expiry date should be in the future if provided
  if (data.license_expiry_date) {
    const expiryDate = new Date(data.license_expiry_date);
    return expiryDate > new Date();
  }
  return true;
}, {
  message: 'License expiry date must be in the future',
  path: ['license_expiry_date'],
}).refine((data) => {
  // Primary facility should be included in assigned facilities
  if (data.assigned_facilities) {
    return data.assigned_facilities.includes(data.primary_facility_id);
  }
  return true;
}, {
  message: 'Primary facility must be included in assigned facilities',
  path: ['assigned_facilities'],
});

// Create employee profile schema (without Appwrite fields)
const createEmployeeProfileBaseSchema = employeeProfileBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createEmployeeProfileSchema = createEmployeeProfileBaseSchema.refine((data) => {
  // If license_number is provided, license_expiry_date should also be provided
  if (data.license_number) {
    return data.license_expiry_date !== undefined;
  }
  return true;
}, {
  message: 'License expiry date is required when license number is provided',
  path: ['license_expiry_date'],
}).refine((data) => {
  // License expiry date should be in the future if provided
  if (data.license_expiry_date) {
    const expiryDate = new Date(data.license_expiry_date);
    return expiryDate > new Date();
  }
  return true;
}, {
  message: 'License expiry date must be in the future',
  path: ['license_expiry_date'],
}).refine((data) => {
  // Primary facility should be included in assigned facilities
  if (data.assigned_facilities) {
    return data.assigned_facilities.includes(data.primary_facility_id);
  }
  return true;
}, {
  message: 'Primary facility must be included in assigned facilities',
  path: ['assigned_facilities'],
});

// Update employee profile schema
export const updateEmployeeProfileSchema = createEmployeeProfileBaseSchema.partial();

// Type exports
export type EmployeeProfile = z.infer<typeof employeeProfileSchema>;
export type CreateEmployeeProfile = z.infer<typeof createEmployeeProfileSchema>;
export type UpdateEmployeeProfile = z.infer<typeof updateEmployeeProfileSchema>;