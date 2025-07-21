import { z } from 'zod';

// Immunization record schema
export const immunizationSchema = z.object({
  patientId: z.number().positive('Patient is required'),
  vaccineId: z.number().positive('Vaccine is required'),
  administeredDate: z.string().min(1, 'Administered date is required'),
  returnDate: z.string().nullable().optional(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  administeredBy: z.string().min(1, 'Administered by is required'),
  notes: z.string().optional(),
});

// Type inference from schema
export type ImmunizationFormData = z.infer<typeof immunizationSchema>;

// Vaccine type for selector
export interface Vaccine {
  id: number;
  name: string;
  description: string;
  vaccineCode: string;
  sequenceNumber: number | null;
  vaccineSeries: string | null;
  standardScheduleAge: string | null;
  isSupplementary: boolean;
}

// API response types
export interface ImmunizationRecord {
  id: number;
  administeredDate: string;
  returnDate: string | null;
  batchNumber: string;
  vaccine: {
    id: number;
    name: string;
  };
  administeredBy: {
    id: number;
    fullName: string;
  };
  notes?: string;
}

export interface CreateImmunizationResponse {
  data: ImmunizationRecord;
  message: string;
}