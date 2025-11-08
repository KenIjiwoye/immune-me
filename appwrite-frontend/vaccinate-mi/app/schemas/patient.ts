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

// Patient base schema
const patientBaseSchema = appwriteDocumentSchema.extend({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  sex: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Sex must be male, female, or other' }),
  }),
  date_of_birth: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed <= new Date();
  }, 'Date of birth must be a valid date in the past'),
  mother_name: z.string().max(100, 'Mother name must be less than 100 characters').optional(),
  father_name: z.string().max(100, 'Father name must be less than 100 characters').optional(),
  district: z.string().min(1, 'District is required').max(50, 'District must be less than 50 characters'),
  town_village: z.string().max(50, 'Town/village must be less than 50 characters').optional(),
  address: z.string().min(1, 'Address is required').max(200, 'Address must be less than 200 characters'),
  contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Contact phone must be a valid phone number').optional(),
  health_worker_id: z.string().optional(),
  health_worker_name: z.string().max(100, 'Health worker name must be less than 100 characters').optional(),
  health_worker_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Health worker phone must be a valid phone number').optional(),
  health_worker_address: z.string().max(200, 'Health worker address must be less than 200 characters').optional(),
  facility_id: z.string().min(1, 'Facility ID is required'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Patient schema with business rules
export const patientSchema = patientBaseSchema.refine((data) => {
  // Age validation: must be reasonable (not too old, not negative)
  const birthDate = new Date(data.date_of_birth);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age >= 0 && age <= 120;
}, {
  message: 'Patient age must be between 0 and 120 years',
  path: ['date_of_birth'],
});

// Create patient schema (without Appwrite fields)
const createPatientBaseSchema = patientBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createPatientSchema = createPatientBaseSchema.refine((data) => {
  // Age validation for creation
  const birthDate = new Date(data.date_of_birth);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age >= 0 && age <= 120;
}, {
  message: 'Patient age must be between 0 and 120 years',
  path: ['date_of_birth'],
});

// Update patient schema
export const updatePatientSchema = createPatientBaseSchema.partial();

// Type exports
export type Patient = z.infer<typeof patientSchema>;
export type CreatePatient = z.infer<typeof createPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;