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

// Supplementary immunization base schema
const supplementaryImmunizationBaseSchema = appwriteDocumentSchema.extend({
  campaign_name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name must be less than 100 characters'),
  vaccine_id: z.string().min(1, 'Vaccine ID is required'),
  target_age_group: z.string().min(1, 'Target age group is required').max(50, 'Target age group must be less than 50 characters'),
  target_population: z.string().max(200, 'Target population must be less than 200 characters').optional(),
  start_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Start date must be a valid date'),
  end_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'End date must be a valid date'),
  facility_id: z.string().min(1, 'Facility ID is required'),
  target_number: z.number().int().min(0, 'Target number must be non-negative').optional(),
  achieved_number: z.number().int().min(0, 'Achieved number must be non-negative'),
  campaign_status: z.enum(['planned', 'active', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Campaign status must be one of: planned, active, completed, cancelled' }),
  }),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Supplementary immunization schema with business rules
export const supplementaryImmunizationSchema = supplementaryImmunizationBaseSchema.refine((data) => {
  // End date must be after start date
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
}).refine((data) => {
  // Achieved number cannot exceed target number if target is set
  if (data.target_number !== undefined) {
    return data.achieved_number <= data.target_number;
  }
  return true;
}, {
  message: 'Achieved number cannot exceed target number',
  path: ['achieved_number'],
});

// Create supplementary immunization schema (without Appwrite fields)
const createSupplementaryImmunizationBaseSchema = supplementaryImmunizationBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createSupplementaryImmunizationSchema = createSupplementaryImmunizationBaseSchema.refine((data) => {
  // End date must be after start date
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
}).refine((data) => {
  // Achieved number cannot exceed target number if target is set
  if (data.target_number !== undefined) {
    return data.achieved_number <= data.target_number;
  }
  return true;
}, {
  message: 'Achieved number cannot exceed target number',
  path: ['achieved_number'],
});

// Update supplementary immunization schema
export const updateSupplementaryImmunizationSchema = createSupplementaryImmunizationBaseSchema.partial();

// Type exports
export type SupplementaryImmunization = z.infer<typeof supplementaryImmunizationSchema>;
export type CreateSupplementaryImmunization = z.infer<typeof createSupplementaryImmunizationSchema>;
export type UpdateSupplementaryImmunization = z.infer<typeof updateSupplementaryImmunizationSchema>;