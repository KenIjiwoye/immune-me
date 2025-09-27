import { z } from 'zod';
import { EmployeeProfile, UserWithProfile } from './profile';

// Immunization record schema
export const immunizationSchema = z.object({
  patientId: z.number().positive('Patient is required'),
  vaccineId: z.number().positive('Vaccine is required'),
  administeredDate: z.string().min(1, 'Administered date is required'),
  returnDate: z.string().nullable().optional(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  administeredBy: z.string().min(1, 'Administered by is required'),
  notes: z.string().optional(),
  // Profile-aware fields
  administeredByUserId: z.string().optional(),
  administeredByProfileId: z.string().optional(),
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
    // Enhanced with Profile data when available
    professionalTitle?: string;
    licenseNumber?: string;
    employeeId?: string;
    employeeType?: string;
    department?: string;
  };
  notes?: string;
  // Profile-aware fields
  administeredByUserId?: string;
  administeredByProfile?: EmployeeProfile;
  administeredByUser?: UserWithProfile;
  // Enhanced audit trail
  administeredByDetails?: {
    employee_id?: string;
    professional_title?: string;
    license_number?: string;
    facility_id?: string;
    employee_type?: string;
    department?: string;
  };
}

// Enhanced immunization record with full Profile data
export interface ImmunizationRecordWithProfile extends ImmunizationRecord {
  administeredByProfile: EmployeeProfile;
  administeredByUser: UserWithProfile;
}

export interface CreateImmunizationResponse {
  data: ImmunizationRecord;
  message: string;
}

// Enhanced form data with Profile support
export interface EnhancedImmunizationFormData extends ImmunizationFormData {
  // Profile-aware administrator selection
  administeredByProfile?: {
    user_id: string;
    employee_id: string;
    professional_title?: string;
    license_number?: string;
    employee_type: string;
  };
}

// Immunization query parameters with Profile filtering
export interface ImmunizationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  patient_id?: number;
  vaccine_id?: number;
  administered_by_user_id?: string;
  administered_by_employee_type?: string;
  facility_id?: string;
  date_from?: string;
  date_to?: string;
  has_profile_data?: boolean;
}

// Administrator selection for immunization forms
export interface ImmunizationAdministrator {
  id: string;
  name: string;
  // Legacy fields
  user_id?: number;
  // Profile-enhanced fields
  employee_id?: string;
  professional_title?: string;
  license_number?: string;
  employee_type?: string;
  department?: string;
  facility_id?: string;
  license_expiry_date?: string;
  is_license_valid?: boolean;
}

// Validation for Profile-aware immunization administration
export const validateImmunizationAdministrator = (administrator: ImmunizationAdministrator): boolean => {
  // Check if administrator has valid license if Profile data is available
  if (administrator.license_expiry_date) {
    const expiryDate = new Date(administrator.license_expiry_date);
    const today = new Date();
    return expiryDate > today;
  }
  // Fallback to basic validation for legacy data
  return true;
};