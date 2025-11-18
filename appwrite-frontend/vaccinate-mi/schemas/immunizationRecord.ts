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

// Immunization record base schema
const immunizationRecordBaseSchema = appwriteDocumentSchema.extend({
  patient_id: z.string().min(1, 'Patient ID is required'),
  vaccine_id: z.string().min(1, 'Vaccine ID is required'),
  facility_id: z.string().min(1, 'Facility ID is required'),
  administered_by: z.string().min(1, 'Administered by is required').max(100, 'Administered by must be less than 100 characters'),
  administration_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed <= new Date();
  }, 'Administration date must be a valid date in the past'),
  batch_number: z.string().max(50, 'Batch number must be less than 50 characters').optional(),
  expiry_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Expiry date must be a valid date').optional(),
  site_of_administration: z.enum(['left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'other'], {
    errorMap: () => ({ message: 'Site of administration must be one of: left_arm, right_arm, left_thigh, right_thigh, other' }),
  }).optional(),
  dose_number: z.number().int().min(1, 'Dose number must be at least 1').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  adverse_reactions: z.string().max(500, 'Adverse reactions must be less than 500 characters').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Immunization record schema with business rules
export const immunizationRecordSchema = immunizationRecordBaseSchema.refine((data) => {
  // If expiry date is provided, it must be after administration date
  if (data.expiry_date) {
    const adminDate = new Date(data.administration_date);
    const expiryDate = new Date(data.expiry_date);
    return expiryDate > adminDate;
  }
  return true;
}, {
  message: 'Expiry date must be after administration date',
  path: ['expiry_date'],
});

// Create immunization record schema (without Appwrite fields)
const createImmunizationRecordBaseSchema = immunizationRecordBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createImmunizationRecordSchema = createImmunizationRecordBaseSchema.refine((data) => {
  // If expiry date is provided, it must be after administration date
  if (data.expiry_date) {
    const adminDate = new Date(data.administration_date);
    const expiryDate = new Date(data.expiry_date);
    return expiryDate > adminDate;
  }
  return true;
}, {
  message: 'Expiry date must be after administration date',
  path: ['expiry_date'],
});

// Update immunization record schema
export const updateImmunizationRecordSchema = createImmunizationRecordBaseSchema.partial();

// Type exports
export type ImmunizationRecord = z.infer<typeof immunizationRecordSchema>;
export type CreateImmunizationRecord = z.infer<typeof createImmunizationRecordSchema>;
export type UpdateImmunizationRecord = z.infer<typeof updateImmunizationRecordSchema>;