/**
 * Patient and Patient Profile Types
 * Collection-specific types for patient management
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// PATIENT COLLECTION TYPES
// =============================================================================

/**
 * Patient document from Appwrite patients collection
 * Based on the deployed schema
 */
export interface AppwritePatient extends AppwriteDocument {
  full_name: string;
  sex: 'M' | 'F';
  date_of_birth: string; // ISO datetime string
  mother_name?: string;
  father_name?: string;
  district: string;
  town_village?: string;
  address: string;
  contact_phone?: string;
  health_worker_id?: string;
  health_worker_name?: string;
  health_worker_phone?: string;
  health_worker_address?: string;
  facility_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Patient Profile document from Appwrite patient_profiles collection
 * Based on the deployed schema
 */
export interface AppwritePatientProfile extends AppwriteDocument {
  user_id: string;
  patient_id?: string;
  profile_status: PatientProfileStatus;
  verification_status: PatientVerificationStatus;
  verification_method?: PatientVerificationMethod;
  access_permissions?: PatientAccessPermission[];
  notification_preferences?: string; // JSON string
  emergency_contact?: string; // JSON string
  facility_id: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Patient sex options
 */
export type PatientSex = 'M' | 'F';

/**
 * Patient profile status values
 */
export type PatientProfileStatus = 'active' | 'inactive' | 'suspended';

/**
 * Patient verification status values
 */
export type PatientVerificationStatus = 'pending' | 'verified' | 'rejected';

/**
 * Patient verification methods
 */
export type PatientVerificationMethod = 'phone' | 'email' | 'in_person' | 'guardian';

/**
 * Patient access permissions
 */
export type PatientAccessPermission = 
  | 'view_own_records'
  | 'receive_notifications'
  | 'update_contact_info'
  | 'view_immunization_history'
  | 'schedule_appointments'
  | 'download_certificates'
  | 'manage_family_records';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Patient notification preferences structure
 * Parsed from notification_preferences JSON string
 */
export interface PatientNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  immunization_reminders: boolean;
  appointment_reminders: boolean;
  health_alerts: boolean;
  system_notifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

/**
 * Patient emergency contact structure
 * Parsed from emergency_contact JSON string
 */
export interface PatientEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  is_primary: boolean;
}

/**
 * Health worker information embedded in patient record
 */
export interface PatientHealthWorker {
  id?: string;
  name?: string;
  phone?: string;
  address?: string;
}

// =============================================================================
// ENHANCED PATIENT TYPES
// =============================================================================

/**
 * Enhanced patient with parsed JSON fields and related data
 */
export interface EnhancedPatient extends Omit<AppwritePatient, 'date_of_birth'> {
  date_of_birth: Date; // Parsed date
  age?: number; // Calculated age
  health_worker?: PatientHealthWorker;
  // Computed fields
  full_address?: string;
  display_name?: string;
}

/**
 * Enhanced patient profile with parsed JSON fields
 */
export interface EnhancedPatientProfile extends Omit<AppwritePatientProfile, 'notification_preferences' | 'emergency_contact'> {
  notification_preferences?: PatientNotificationPreferences;
  emergency_contact?: PatientEmergencyContact;
}

/**
 * Complete patient record with profile and related data
 */
export interface PatientWithProfile extends EnhancedPatient {
  profile?: EnhancedPatientProfile;
  immunization_count?: number;
  last_immunization_date?: string;
  upcoming_immunizations?: Array<{
    vaccine_name: string;
    due_date: string;
    is_overdue: boolean;
  }>;
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Patient creation form data
 */
export interface CreatePatientData {
  full_name: string;
  sex: PatientSex;
  date_of_birth: string;
  mother_name?: string;
  father_name?: string;
  district: string;
  town_village?: string;
  address: string;
  contact_phone?: string;
  health_worker_id?: string;
  health_worker_name?: string;
  health_worker_phone?: string;
  health_worker_address?: string;
  facility_id: string;
}

/**
 * Patient update form data
 */
export interface UpdatePatientData extends Partial<CreatePatientData> {
  $id: string;
}

/**
 * Patient profile creation form data
 */
export interface CreatePatientProfileData {
  user_id: string;
  patient_id?: string;
  profile_status: PatientProfileStatus;
  verification_status: PatientVerificationStatus;
  verification_method?: PatientVerificationMethod;
  access_permissions?: PatientAccessPermission[];
  notification_preferences?: PatientNotificationPreferences;
  emergency_contact?: PatientEmergencyContact;
  facility_id: string;
}

/**
 * Patient profile update form data
 */
export interface UpdatePatientProfileData extends Partial<CreatePatientProfileData> {
  $id: string;
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Patient query parameters for filtering and searching
 */
export interface PatientQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Search and filters
  search?: string; // Search in full_name
  sex?: PatientSex;
  district?: string;
  facility_id?: string;
  
  // Age filters
  min_age?: number;
  max_age?: number;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  
  // Profile filters
  has_profile?: boolean;
  profile_status?: PatientProfileStatus;
  verification_status?: PatientVerificationStatus;
  
  // Health worker filters
  health_worker_id?: string;
  has_health_worker?: boolean;
  
  // Sorting
  order_by?: 'full_name' | 'date_of_birth' | 'created_at' | 'updated_at';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Patient profile query parameters
 */
export interface PatientProfileQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  user_id?: string;
  facility_id?: string;
  profile_status?: PatientProfileStatus;
  verification_status?: PatientVerificationStatus;
  verification_method?: PatientVerificationMethod;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  
  // Sorting
  order_by?: 'created_at' | 'updated_at' | 'profile_status';
  order_direction?: 'ASC' | 'DESC';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Patient list response from API
 */
export interface PatientListResponse {
  documents: AppwritePatient[];
  total: number;
}

/**
 * Enhanced patient list response with computed fields
 */
export interface EnhancedPatientListResponse {
  documents: PatientWithProfile[];
  total: number;
}

/**
 * Patient profile list response from API
 */
export interface PatientProfileListResponse {
  documents: AppwritePatientProfile[];
  total: number;
}

/**
 * Single patient response from API
 */
export interface PatientResponse {
  data: AppwritePatient;
  message?: string;
}

/**
 * Enhanced single patient response with related data
 */
export interface EnhancedPatientResponse {
  data: PatientWithProfile;
  message?: string;
}

/**
 * Patient profile response from API
 */
export interface PatientProfileResponse {
  data: AppwritePatientProfile;
  message?: string;
}

// =============================================================================
// UTILITY FUNCTIONS TYPES
// =============================================================================

/**
 * Patient age calculation result
 */
export interface PatientAge {
  years: number;
  months: number;
  days: number;
  total_days: number;
  is_infant: boolean; // < 1 year
  is_child: boolean; // 1-17 years
  is_adult: boolean; // >= 18 years
}

/**
 * Patient immunization status summary
 */
export interface PatientImmunizationStatus {
  total_immunizations: number;
  up_to_date: boolean;
  overdue_count: number;
  upcoming_count: number;
  last_immunization_date?: string;
  next_due_date?: string;
  completion_percentage: number;
}

/**
 * Patient search result with highlighting
 */
export interface PatientSearchResult extends PatientWithProfile {
  search_score: number;
  highlighted_fields: {
    full_name?: string;
    mother_name?: string;
    father_name?: string;
    address?: string;
  };
}

// =============================================================================
// VALIDATION SCHEMAS (ZOD COMPATIBLE)
// =============================================================================

/**
 * Patient validation constraints
 */
export const PatientValidationRules = {
  full_name: {
    min_length: 2,
    max_length: 255,
    required: true
  },
  sex: {
    options: ['M', 'F'] as const,
    required: true
  },
  date_of_birth: {
    required: true,
    max_date: new Date(), // Cannot be in the future
    min_date: new Date('1900-01-01') // Reasonable minimum
  },
  district: {
    min_length: 1,
    max_length: 100,
    required: true
  },
  address: {
    min_length: 5,
    max_length: 500,
    required: true
  },
  contact_phone: {
    min_length: 5,
    max_length: 20,
    pattern: /^\+?[0-9\s\-\(\)]+$/
  },
  facility_id: {
    required: true,
    format: 'uuid'
  }
} as const;

/**
 * Patient profile validation constraints
 */
export const PatientProfileValidationRules = {
  user_id: {
    required: true,
    format: 'uuid'
  },
  profile_status: {
    options: ['active', 'inactive', 'suspended'] as const,
    required: true
  },
  verification_status: {
    options: ['pending', 'verified', 'rejected'] as const,
    required: true
  },
  verification_method: {
    options: ['phone', 'email', 'in_person', 'guardian'] as const
  },
  facility_id: {
    required: true,
    format: 'uuid'
  }
} as const;