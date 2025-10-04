/**
 * Profile-Related Types
 * Collection-specific types for all profile management (Admin, Employee, Patient)
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// PROFILE COLLECTION TYPES
// =============================================================================

/**
 * Admin Profile document from Appwrite admin_profiles collection
 * Based on the deployed schema
 */
export interface AppwriteAdminProfile extends AppwriteDocument {
  user_id: string;
  admin_level: string;
  system_permissions?: string[]; // array
  facility_access_scope: string;
  accessible_facilities?: string[]; // array
  data_access_level: string;
  can_manage_users: boolean;
  can_manage_facilities: boolean;
  can_manage_vaccines: boolean;
  can_generate_reports: boolean;
  can_manage_system_settings: boolean;
  emergency_access: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Employee Profile document from Appwrite employee_profiles collection
 * Based on the deployed schema
 */
export interface AppwriteEmployeeProfile extends AppwriteDocument {
  user_id: string;
  employee_id: string;
  employee_type: string;
  professional_title: string;
  license_number?: string;
  license_expiry_date?: string; // datetime
  specializations?: string[]; // array
  primary_facility_id: string;
  assigned_facilities?: string[]; // array
  department?: string;
  employment_status: string;
  hire_date?: string; // datetime
  contact_information?: string; // JSON string
  work_schedule?: string; // JSON string
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
  profile_status: string;
  verification_status: string;
  verification_method?: string;
  access_permissions?: string[]; // array
  notification_preferences?: string; // JSON string
  emergency_contact?: string; // JSON string
  facility_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Profile Verification Workflow document from Appwrite profile_verification_workflow collection
 * Based on the deployed schema
 */
export interface AppwriteProfileVerificationWorkflow extends AppwriteDocument {
  profile_id: string;
  profile_type: string;
  user_id: string;
  verification_type: string;
  verification_method: string;
  status: string;
  initiated_by_user_id: string;
  assigned_to_user_id?: string;
  facility_id: string;
  verification_data?: string; // JSON string
  documents_required?: string[]; // array
  documents_submitted?: string[]; // array
  verification_notes?: string;
  rejection_reason?: string;
  priority: string;
  due_date?: string; // datetime
  completed_at?: string; // datetime
  completed_by_user_id?: string;
  workflow_steps?: string; // JSON string
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Admin levels
 */
export type AdminLevel = 
  | 'super_admin'
  | 'system_admin'
  | 'facility_admin'
  | 'district_admin'
  | 'regional_admin';

/**
 * System permissions for admin profiles
 */
export type SystemPermission = 
  | 'user_management'
  | 'facility_management'
  | 'vaccine_management'
  | 'system_configuration'
  | 'audit_log_access'
  | 'backup_management'
  | 'security_settings'
  | 'report_generation'
  | 'data_export'
  | 'notification_management'
  | 'role_management'
  | 'emergency_override';

/**
 * Facility access scope options
 */
export type FacilityAccessScope = 
  | 'all'
  | 'assigned'
  | 'single'
  | 'district'
  | 'region';

/**
 * Data access levels
 */
export type DataAccessLevel = 
  | 'full'
  | 'facility_only'
  | 'district_only'
  | 'region_only'
  | 'read_only'
  | 'limited';

/**
 * Employee types
 */
export type EmployeeType = 
  | 'doctor'
  | 'supervisor'
  | 'nurse'
  | 'data_entry_clerk'
  | 'technician'
  | 'administrator'
  | 'midwife'
  | 'pharmacist'
  | 'laboratory_technician'
  | 'community_health_worker';

/**
 * Employment status options
 */
export type EmploymentStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'terminated'
  | 'on_leave'
  | 'probation'
  | 'retired';

/**
 * Employee specializations
 */
export type EmployeeSpecialization = 
  | 'pediatrics'
  | 'internal_medicine'
  | 'family_medicine'
  | 'nursing'
  | 'public_health'
  | 'immunization_specialist'
  | 'general_practice'
  | 'infectious_diseases'
  | 'preventive_medicine'
  | 'community_health'
  | 'maternal_health'
  | 'child_health'
  | 'emergency_medicine';

/**
 * Profile status options
 */
export type ProfileStatus = 
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_verification'
  | 'archived';

/**
 * Verification status options
 */
export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'under_review'
  | 'requires_documents';

/**
 * Verification methods
 */
export type VerificationMethod = 
  | 'phone'
  | 'email'
  | 'in_person'
  | 'guardian'
  | 'document_upload'
  | 'biometric'
  | 'supervisor_approval';

/**
 * Verification types
 */
export type VerificationType = 
  | 'identity'
  | 'professional_license'
  | 'employment'
  | 'address'
  | 'emergency_contact'
  | 'guardian_consent'
  | 'medical_history';

/**
 * Workflow status options
 */
export type WorkflowStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'escalated';

/**
 * Workflow priority levels
 */
export type WorkflowPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

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
  | 'manage_family_records'
  | 'view_test_results'
  | 'access_health_education';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Contact information structure for employee profiles
 */
export interface EmployeeContactInformation {
  primary_phone: string;
  secondary_phone?: string;
  personal_email?: string;
  work_email?: string;
  address?: {
    street: string;
    city: string;
    district: string;
    region?: string;
    postal_code?: string;
    country: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

/**
 * Work schedule structure for employee profiles
 */
export interface EmployeeWorkSchedule {
  monday?: { start: string; end: string; break_start?: string; break_end?: string; };
  tuesday?: { start: string; end: string; break_start?: string; break_end?: string; };
  wednesday?: { start: string; end: string; break_start?: string; break_end?: string; };
  thursday?: { start: string; end: string; break_start?: string; break_end?: string; };
  friday?: { start: string; end: string; break_start?: string; break_end?: string; };
  saturday?: { start: string; end: string; break_start?: string; break_end?: string; };
  sunday?: { start: string; end: string; break_start?: string; break_end?: string; };
  timezone: string;
  total_hours_per_week: number;
  overtime_eligible: boolean;
  shift_type?: 'day' | 'night' | 'rotating' | 'on_call';
}

/**
 * Patient notification preferences structure
 */
export interface PatientNotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  immunization_reminders: boolean;
  appointment_reminders: boolean;
  health_alerts: boolean;
  system_notifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  preferred_time?: string; // HH:MM format
  language_preference?: string;
}

/**
 * Emergency contact structure
 */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  is_primary: boolean;
  can_make_medical_decisions: boolean;
  notes?: string;
}

/**
 * Verification data structure
 */
export interface VerificationData {
  documents_provided?: Array<{
    type: string;
    document_id: string;
    file_url?: string;
    verified: boolean;
    verified_by?: string;
    verified_at?: string;
    notes?: string;
  }>;
  identity_verification?: {
    method: VerificationMethod;
    verified_by: string;
    verification_date: string;
    confidence_score?: number;
    notes?: string;
  };
  professional_verification?: {
    license_verified: boolean;
    license_authority: string;
    verification_date: string;
    expiry_date?: string;
    verified_by: string;
    notes?: string;
  };
  employment_verification?: {
    employer_confirmed: boolean;
    start_date: string;
    position_title: string;
    supervisor_name: string;
    supervisor_contact: string;
    verified_by: string;
    verification_date: string;
  };
}

/**
 * Workflow steps structure
 */
export interface WorkflowSteps {
  steps: Array<{
    step_number: number;
    step_name: string;
    description: string;
    required: boolean;
    completed: boolean;
    completed_by?: string;
    completed_at?: string;
    notes?: string;
    documents_required?: string[];
    estimated_duration_hours?: number;
  }>;
  current_step: number;
  total_steps: number;
  estimated_completion_date?: string;
}

// =============================================================================
// ENHANCED PROFILE TYPES
// =============================================================================

/**
 * Enhanced admin profile with parsed JSON fields
 */
export interface EnhancedAdminProfile extends AppwriteAdminProfile {
  // Computed fields
  is_super_admin?: boolean;
  total_accessible_facilities?: number;
  permission_count?: number;
  last_login?: string;
  security_score?: number;
  
  // Related data
  managed_facilities?: Array<{
    $id: string;
    name: string;
    district: string;
  }>;
  recent_actions?: Array<{
    action: string;
    timestamp: string;
    resource: string;
  }>;
}

/**
 * Enhanced employee profile with parsed JSON fields
 */
export interface EnhancedEmployeeProfile extends Omit<AppwriteEmployeeProfile, 'contact_information' | 'work_schedule' | 'hire_date' | 'license_expiry_date'> {
  contact_information?: EmployeeContactInformation;
  work_schedule?: EmployeeWorkSchedule;
  hire_date?: Date;
  license_expiry_date?: Date;
  
  // Computed fields
  years_of_service?: number;
  is_license_valid?: boolean;
  days_until_license_expiry?: number;
  total_assigned_facilities?: number;
  current_age?: number;
  
  // Related data
  primary_facility?: {
    $id: string;
    name: string;
    district: string;
  };
  assigned_facility_details?: Array<{
    $id: string;
    name: string;
    district: string;
    role?: string;
  }>;
  recent_immunizations_administered?: number;
  performance_metrics?: {
    immunizations_this_month: number;
    patients_served_this_month: number;
    accuracy_rate: number;
    attendance_rate: number;
  };
}

/**
 * Enhanced patient profile with parsed JSON fields
 */
export interface EnhancedPatientProfile extends Omit<AppwritePatientProfile, 'notification_preferences' | 'emergency_contact'> {
  notification_preferences?: PatientNotificationPreferences;
  emergency_contact?: EmergencyContact;
  
  // Computed fields
  is_verified?: boolean;
  verification_completion_percentage?: number;
  days_since_registration?: number;
  
  // Related data
  linked_patient?: {
    $id: string;
    full_name: string;
    date_of_birth: string;
    sex: 'M' | 'F';
  };
  facility?: {
    $id: string;
    name: string;
    district: string;
  };
  guardian?: {
    $id: string;
    name: string;
    relationship: string;
  };
  immunization_summary?: {
    total_immunizations: number;
    up_to_date: boolean;
    overdue_count: number;
    next_due_date?: string;
  };
}

/**
 * Enhanced verification workflow with parsed JSON fields
 */
export interface EnhancedProfileVerificationWorkflow extends Omit<AppwriteProfileVerificationWorkflow, 'verification_data' | 'workflow_steps' | 'due_date' | 'completed_at'> {
  verification_data?: VerificationData;
  workflow_steps?: WorkflowSteps;
  due_date?: Date;
  completed_at?: Date;
  
  // Computed fields
  is_overdue?: boolean;
  days_until_due?: number;
  completion_percentage?: number;
  estimated_completion_date?: Date;
  
  // Related data
  profile_details?: {
    profile_type: string;
    user_name: string;
    facility_name: string;
  };
  assigned_to?: {
    $id: string;
    name: string;
    professional_title?: string;
  };
  initiated_by?: {
    $id: string;
    name: string;
    role: string;
  };
}

// =============================================================================
// UNION TYPES
// =============================================================================

/**
 * Union type for all profile documents
 */
export type AnyProfile = AppwriteAdminProfile | AppwriteEmployeeProfile | AppwritePatientProfile;

/**
 * Union type for all enhanced profile documents
 */
export type AnyEnhancedProfile = EnhancedAdminProfile | EnhancedEmployeeProfile | EnhancedPatientProfile;

/**
 * Profile type identifier
 */
export type ProfileType = 'admin' | 'employee' | 'patient';

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Admin profile creation form data
 */
export interface CreateAdminProfileData {
  user_id: string;
  admin_level: AdminLevel;
  system_permissions?: SystemPermission[];
  facility_access_scope: FacilityAccessScope;
  accessible_facilities?: string[];
  data_access_level: DataAccessLevel;
  can_manage_users: boolean;
  can_manage_facilities: boolean;
  can_manage_vaccines: boolean;
  can_generate_reports: boolean;
  can_manage_system_settings: boolean;
  emergency_access: boolean;
}

/**
 * Employee profile creation form data
 */
export interface CreateEmployeeProfileData {
  user_id: string;
  employee_id: string;
  employee_type: EmployeeType;
  professional_title: string;
  license_number?: string;
  license_expiry_date?: string;
  specializations?: EmployeeSpecialization[];
  primary_facility_id: string;
  assigned_facilities?: string[];
  department?: string;
  employment_status: EmploymentStatus;
  hire_date?: string;
  contact_information?: EmployeeContactInformation;
  work_schedule?: EmployeeWorkSchedule;
}

/**
 * Patient profile creation form data
 */
export interface CreatePatientProfileData {
  user_id: string;
  patient_id?: string;
  profile_status: ProfileStatus;
  verification_status: VerificationStatus;
  verification_method?: VerificationMethod;
  access_permissions?: PatientAccessPermission[];
  notification_preferences?: PatientNotificationPreferences;
  emergency_contact?: EmergencyContact;
  facility_id: string;
}

/**
 * Profile verification workflow creation form data
 */
export interface CreateProfileVerificationWorkflowData {
  profile_id: string;
  profile_type: ProfileType;
  user_id: string;
  verification_type: VerificationType;
  verification_method: VerificationMethod;
  status: WorkflowStatus;
  initiated_by_user_id: string;
  assigned_to_user_id?: string;
  facility_id: string;
  verification_data?: VerificationData;
  documents_required?: string[];
  priority: WorkflowPriority;
  due_date?: string;
  workflow_steps?: WorkflowSteps;
}

/**
 * Update form data types
 */
export interface UpdateAdminProfileData extends Partial<CreateAdminProfileData> {
  $id: string;
}

export interface UpdateEmployeeProfileData extends Partial<CreateEmployeeProfileData> {
  $id: string;
}

export interface UpdatePatientProfileData extends Partial<CreatePatientProfileData> {
  $id: string;
}

export interface UpdateProfileVerificationWorkflowData extends Partial<CreateProfileVerificationWorkflowData> {
  $id: string;
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Admin profile query parameters
 */
export interface AdminProfileQueryParams {
  limit?: number;
  offset?: number;
  admin_level?: AdminLevel;
  facility_access_scope?: FacilityAccessScope;
  data_access_level?: DataAccessLevel;
  has_emergency_access?: boolean;
  can_manage_users?: boolean;
  facility_id?: string;
  created_after?: string;
  created_before?: string;
  order_by?: 'created_at' | 'updated_at' | 'admin_level';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Employee profile query parameters
 */
export interface EmployeeProfileQueryParams {
  limit?: number;
  offset?: number;
  employee_type?: EmployeeType;
  employment_status?: EmploymentStatus;
  primary_facility_id?: string;
  department?: string;
  specialization?: EmployeeSpecialization;
  license_expiring_within_days?: number;
  hire_date_from?: string;
  hire_date_to?: string;
  search?: string; // Search in employee_id, professional_title
  order_by?: 'employee_id' | 'hire_date' | 'created_at' | 'license_expiry_date';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Patient profile query parameters
 */
export interface PatientProfileQueryParams {
  limit?: number;
  offset?: number;
  profile_status?: ProfileStatus;
  verification_status?: VerificationStatus;
  verification_method?: VerificationMethod;
  facility_id?: string;
  has_emergency_contact?: boolean;
  created_after?: string;
  created_before?: string;
  order_by?: 'created_at' | 'updated_at' | 'verification_status';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Profile verification workflow query parameters
 */
export interface ProfileVerificationWorkflowQueryParams {
  limit?: number;
  offset?: number;
  profile_type?: ProfileType;
  verification_type?: VerificationType;
  status?: WorkflowStatus;
  priority?: WorkflowPriority;
  assigned_to_user_id?: string;
  facility_id?: string;
  is_overdue?: boolean;
  due_date_from?: string;
  due_date_to?: string;
  order_by?: 'due_date' | 'priority' | 'created_at' | 'status';
  order_direction?: 'ASC' | 'DESC';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Profile list responses
 */
export interface AdminProfileListResponse {
  documents: AppwriteAdminProfile[];
  total: number;
}

export interface EmployeeProfileListResponse {
  documents: AppwriteEmployeeProfile[];
  total: number;
}

export interface PatientProfileListResponse {
  documents: AppwritePatientProfile[];
  total: number;
}

export interface ProfileVerificationWorkflowListResponse {
  documents: AppwriteProfileVerificationWorkflow[];
  total: number;
}

/**
 * Enhanced profile list responses
 */
export interface EnhancedAdminProfileListResponse {
  documents: EnhancedAdminProfile[];
  total: number;
}

export interface EnhancedEmployeeProfileListResponse {
  documents: EnhancedEmployeeProfile[];
  total: number;
}

export interface EnhancedPatientProfileListResponse {
  documents: EnhancedPatientProfile[];
  total: number;
}

export interface EnhancedProfileVerificationWorkflowListResponse {
  documents: EnhancedProfileVerificationWorkflow[];
  total: number;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Profile validation constraints
 */
export const ProfileValidationRules = {
  admin_profile: {
    user_id: { required: true, format: 'uuid' },
    admin_level: { required: true, options: ['super_admin', 'system_admin', 'facility_admin'] },
    facility_access_scope: { required: true, options: ['all', 'assigned', 'single'] },
    data_access_level: { required: true, options: ['full', 'facility_only', 'read_only'] }
  },
  employee_profile: {
    user_id: { required: true, format: 'uuid' },
    employee_id: { required: true, min_length: 3, max_length: 50 },
    employee_type: { required: true },
    professional_title: { required: true, max_length: 100 },
    primary_facility_id: { required: true, format: 'uuid' },
    employment_status: { required: true },
    license_number: { max_length: 50 },
    license_expiry_date: { min_date: new Date() }
  },
  patient_profile: {
    user_id: { required: true, format: 'uuid' },
    profile_status: { required: true, options: ['active', 'inactive', 'suspended'] },
    verification_status: { required: true, options: ['pending', 'verified', 'rejected'] },
    facility_id: { required: true, format: 'uuid' }
  },
  verification_workflow: {
    profile_id: { required: true, format: 'uuid' },
    profile_type: { required: true, options: ['admin', 'employee', 'patient'] },
    user_id: { required: true, format: 'uuid' },
    verification_type: { required: true },
    verification_method: { required: true },
    status: { required: true },
    initiated_by_user_id: { required: true, format: 'uuid' },
    facility_id: { required: true, format: 'uuid' },
    priority: { required: true, options: ['low', 'normal', 'high', 'urgent'] }
  }
} as const;