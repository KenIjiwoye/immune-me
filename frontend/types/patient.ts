import { z } from 'zod';
import { PatientProfile, UserWithProfile } from './profile';

// Patient validation schema
export const patientSchema = z.object({
  id: z.number().optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  sex: z.enum(['M', 'F'], {
    message: 'Please select a sex'
  }),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  motherName: z.string().min(2, 'Mother\'s name must be at least 2 characters'),
  fatherName: z.string().min(2, 'Father\'s name must be at least 2 characters'),
  district: z.string().min(1, 'District is required'),
  townVillage: z.string().min(2, 'Town/Village must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  contactPhone: z.string()
    .min(5, 'Contact phone must be at least 5 characters')
    .regex(/^\+?[0-9\s-()]+$/, 'Please enter a valid phone number'),
  facilityId: z.number().optional(),
});

// Patient type from schema
export type Patient = z.infer<typeof patientSchema>;

// Extended patient type with related data
export interface PatientWithRelations extends Patient {
  facility?: {
    id: number;
    name: string;
  };
  immunizationRecords?: ImmunizationRecord[];
  // Profile integration - optional for backward compatibility
  profile?: PatientProfile;
  user?: UserWithProfile;
}

// Enhanced patient type with Profile data
export interface PatientWithProfile extends PatientWithRelations {
  profile: PatientProfile;
  user: UserWithProfile;
}

// Immunization record type
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
    // Enhanced with Profile data when available
    professionalTitle?: string;
    licenseNumber?: string;
    employeeId?: string;
  };
  // Enhanced audit trail with Profile integration
  administeredByDetails?: {
    employee_id?: string;
    professional_title?: string;
    license_number?: string;
    facility_id?: string;
  };
}

// Patient list response
export interface PatientListResponse {
  data: PatientWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Patient query parameters
export interface PatientQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  district?: string;
  sex?: 'M' | 'F';
  // Profile-aware filtering
  verification_status?: 'pending' | 'verified' | 'rejected';
  profile_status?: 'active' | 'inactive' | 'suspended';
  has_profile?: boolean;
}

// Form data type (for forms)
export type PatientFormData = Omit<Patient, 'id'>;
