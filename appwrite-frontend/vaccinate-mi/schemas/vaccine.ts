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

// Vaccine base schema
const vaccineBaseSchema = appwriteDocumentSchema.extend({
  name: z.string().min(1, 'Vaccine name is required').max(100, 'Vaccine name must be less than 100 characters'),
  manufacturer: z.string().max(100, 'Manufacturer must be less than 100 characters').optional(),
  disease_targeted: z.string().min(1, 'Disease targeted is required').max(100, 'Disease targeted must be less than 100 characters'),
  dosage_info: z.string().max(500, 'Dosage info must be less than 500 characters').optional(),
  storage_requirements: z.string().max(500, 'Storage requirements must be less than 500 characters').optional(),
  route_of_administration: z.enum(['oral', 'intramuscular', 'subcutaneous', 'intradermal', 'nasal', 'other'], {
    errorMap: () => ({ message: 'Route of administration must be one of: oral, intramuscular, subcutaneous, intradermal, nasal, other' }),
  }).optional(),
  age_group: z.string().max(50, 'Age group must be less than 50 characters').optional(),
  contraindications: z.string().max(1000, 'Contraindications must be less than 1000 characters').optional(),
  side_effects: z.string().max(1000, 'Side effects must be less than 1000 characters').optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Vaccine schema with business rules
export const vaccineSchema = vaccineBaseSchema.refine((data) => {
  // If vaccine is active, ensure critical fields are present
  if (data.is_active) {
    return data.disease_targeted && data.name;
  }
  return true;
}, {
  message: 'Active vaccines must have name and disease_targeted fields',
  path: ['is_active'],
});

// Create vaccine schema (without Appwrite fields)
const createVaccineBaseSchema = vaccineBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createVaccineSchema = createVaccineBaseSchema.refine((data) => {
  // If vaccine is active, ensure critical fields are present
  if (data.is_active) {
    return data.disease_targeted && data.name;
  }
  return true;
}, {
  message: 'Active vaccines must have name and disease_targeted fields',
  path: ['is_active'],
});

// Update vaccine schema
export const updateVaccineSchema = createVaccineBaseSchema.partial();

// Type exports
export type Vaccine = z.infer<typeof vaccineSchema>;
export type CreateVaccine = z.infer<typeof createVaccineSchema>;
export type UpdateVaccine = z.infer<typeof updateVaccineSchema>;