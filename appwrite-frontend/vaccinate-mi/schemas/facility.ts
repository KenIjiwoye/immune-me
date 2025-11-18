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

// Facility base schema
const facilityBaseSchema = appwriteDocumentSchema.extend({
  name: z.string().min(1, 'Facility name is required').max(100, 'Facility name must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(50, 'District must be less than 50 characters'),
  address: z.string().min(1, 'Address is required').max(200, 'Address must be less than 200 characters'),
  contactPhone: z.string().optional(),
  contact_phone: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Facility schema with business rules
export const facilitySchema = facilityBaseSchema.refine((data) => data.contactPhone || data.contact_phone, {
  message: 'Either contactPhone or contact_phone must be provided',
  path: ['contactPhone'],
});

// Create facility schema (without Appwrite fields)
const createFacilityBaseSchema = facilityBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createFacilitySchema = createFacilityBaseSchema.refine((data) => data.contactPhone || data.contact_phone, {
  message: 'Either contactPhone or contact_phone must be provided',
  path: ['contactPhone'],
});

// Update facility schema
export const updateFacilitySchema = createFacilityBaseSchema.partial();

// Type exports
export type Facility = z.infer<typeof facilitySchema>;
export type CreateFacility = z.infer<typeof createFacilitySchema>;
export type UpdateFacility = z.infer<typeof updateFacilitySchema>;