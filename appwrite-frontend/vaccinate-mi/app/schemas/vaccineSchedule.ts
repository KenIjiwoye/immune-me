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

// Vaccine schedule base schema
const vaccineScheduleBaseSchema = appwriteDocumentSchema.extend({
  name: z.string().min(1, 'Schedule name is required').max(100, 'Schedule name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  target_age_group: z.string().min(1, 'Target age group is required').max(50, 'Target age group must be less than 50 characters'),
  schedule_type: z.enum(['routine', 'catch_up', 'special', 'custom'], {
    errorMap: () => ({ message: 'Schedule type must be one of: routine, catch_up, special, custom' }),
  }),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Vaccine schedule schema with business rules
export const vaccineScheduleSchema = vaccineScheduleBaseSchema.refine((data) => {
  // If schedule is active, ensure critical fields are present
  if (data.is_active) {
    return data.name && data.target_age_group;
  }
  return true;
}, {
  message: 'Active schedules must have name and target_age_group fields',
  path: ['is_active'],
});

// Create vaccine schedule schema (without Appwrite fields)
const createVaccineScheduleBaseSchema = vaccineScheduleBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createVaccineScheduleSchema = createVaccineScheduleBaseSchema.refine((data) => {
  // If schedule is active, ensure critical fields are present
  if (data.is_active) {
    return data.name && data.target_age_group;
  }
  return true;
}, {
  message: 'Active schedules must have name and target_age_group fields',
  path: ['is_active'],
});

// Update vaccine schedule schema
export const updateVaccineScheduleSchema = createVaccineScheduleBaseSchema.partial();

// Type exports
export type VaccineSchedule = z.infer<typeof vaccineScheduleSchema>;
export type CreateVaccineSchedule = z.infer<typeof createVaccineScheduleSchema>;
export type UpdateVaccineSchedule = z.infer<typeof updateVaccineScheduleSchema>;