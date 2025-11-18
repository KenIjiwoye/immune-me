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

// Vaccine schedule item base schema
const vaccineScheduleItemBaseSchema = appwriteDocumentSchema.extend({
  schedule_id: z.string().min(1, 'Schedule ID is required'),
  vaccine_id: z.string().min(1, 'Vaccine ID is required'),
  dose_number: z.number().int().min(1, 'Dose number must be at least 1'),
  minimum_age_weeks: z.number().int().min(0, 'Minimum age weeks must be non-negative').optional(),
  maximum_age_weeks: z.number().int().min(0, 'Maximum age weeks must be non-negative').optional(),
  minimum_interval_weeks: z.number().int().min(0, 'Minimum interval weeks must be non-negative').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Vaccine schedule item schema with business rules
export const vaccineScheduleItemSchema = vaccineScheduleItemBaseSchema.refine((data) => {
  // If both min and max age are provided, max must be greater than min
  if (data.minimum_age_weeks !== undefined && data.maximum_age_weeks !== undefined) {
    return data.maximum_age_weeks > data.minimum_age_weeks;
  }
  return true;
}, {
  message: 'Maximum age weeks must be greater than minimum age weeks',
  path: ['maximum_age_weeks'],
});

// Create vaccine schedule item schema (without Appwrite fields)
const createVaccineScheduleItemBaseSchema = vaccineScheduleItemBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createVaccineScheduleItemSchema = createVaccineScheduleItemBaseSchema.refine((data) => {
  // If both min and max age are provided, max must be greater than min
  if (data.minimum_age_weeks !== undefined && data.maximum_age_weeks !== undefined) {
    return data.maximum_age_weeks > data.minimum_age_weeks;
  }
  return true;
}, {
  message: 'Maximum age weeks must be greater than minimum age weeks',
  path: ['maximum_age_weeks'],
});

// Update vaccine schedule item schema
export const updateVaccineScheduleItemSchema = createVaccineScheduleItemBaseSchema.partial();

// Type exports
export type VaccineScheduleItem = z.infer<typeof vaccineScheduleItemSchema>;
export type CreateVaccineScheduleItem = z.infer<typeof createVaccineScheduleItemSchema>;
export type UpdateVaccineScheduleItem = z.infer<typeof updateVaccineScheduleItemSchema>;