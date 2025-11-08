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

// Patient profile base schema
const patientProfileBaseSchema = appwriteDocumentSchema.extend({
  user_id: z.string().min(1, 'User ID is required'),
  patient_id: z.string().max(50, 'Patient ID must be less than 50 characters').optional(),
  profile_status: z.enum(['active', 'inactive', 'pending_verification', 'suspended'], {
    errorMap: () => ({ message: 'Profile status must be one of: active, inactive, pending_verification, suspended' }),
  }),
  verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected'], {
    errorMap: () => ({ message: 'Verification status must be one of: unverified, pending, verified, rejected' }),
  }),
  verification_method: z.enum(['document', 'biometric', 'manual', 'self_declaration'], {
    errorMap: () => ({ message: 'Verification method must be one of: document, biometric, manual, self_declaration' }),
  }).optional(),
  access_permissions: z.array(z.string()).optional(),
  notification_preferences: z.string().max(500, 'Notification preferences must be less than 500 characters').optional(), // JSON string
  emergency_contact: z.string().max(200, 'Emergency contact must be less than 200 characters').optional(),
  facility_id: z.string().min(1, 'Facility ID is required'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Patient profile schema with business rules
export const patientProfileSchema = patientProfileBaseSchema.refine((data) => {
  // If verification_status is verified, verification_method must be provided
  if (data.verification_status === 'verified') {
    return data.verification_method !== undefined;
  }
  return true;
}, {
  message: 'Verification method is required when verification status is verified',
  path: ['verification_method'],
}).refine((data) => {
  // If profile_status is active, verification_status should be verified
  if (data.profile_status === 'active') {
    return data.verification_status === 'verified';
  }
  return true;
}, {
  message: 'Active profiles must have verified status',
  path: ['profile_status'],
});

// Create patient profile schema (without Appwrite fields)
const createPatientProfileBaseSchema = patientProfileBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createPatientProfileSchema = createPatientProfileBaseSchema.refine((data) => {
  // If verification_status is verified, verification_method must be provided
  if (data.verification_status === 'verified') {
    return data.verification_method !== undefined;
  }
  return true;
}, {
  message: 'Verification method is required when verification status is verified',
  path: ['verification_method'],
}).refine((data) => {
  // If profile_status is active, verification_status should be verified
  if (data.profile_status === 'active') {
    return data.verification_status === 'verified';
  }
  return true;
}, {
  message: 'Active profiles must have verified status',
  path: ['profile_status'],
});

// Update patient profile schema
export const updatePatientProfileSchema = createPatientProfileBaseSchema.partial();

// Type exports
export type PatientProfile = z.infer<typeof patientProfileSchema>;
export type CreatePatientProfile = z.infer<typeof createPatientProfileSchema>;
export type UpdatePatientProfile = z.infer<typeof updatePatientProfileSchema>;