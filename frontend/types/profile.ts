import { z } from 'zod';

// Base Profile types from backend schemas
export type ProfileStatus = 'active' | 'inactive' | 'suspended';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type VerificationMethod = 'phone' | 'email' | 'in_person' | 'guardian';
export type EmployeeType = 'doctor' | 'supervisor' | 'nurse' | 'data_entry_clerk' | 'technician' | 'administrator';
export type EmploymentStatus = 'active' | 'inactive' | 'suspended' | 'terminated' | 'on_leave';
export type AdminLevel = 'super_admin' | 'system_admin' | 'facility_admin';
export type SecurityClearance = 'high' | 'medium' | 'standard';
export type FacilityAccessScope = 'all' | 'assigned' | 'single';
export type UserManagementScope = 'global' | 'facility' | 'department';

// Patient Profile Access Permissions
export type PatientAccessPermission = 
  | 'view_own_records'
  | 'receive_notifications'
  | 'update_contact_info'
  | 'view_immunization_history'
  | 'schedule_appointments'
  | 'download_certificates'
  | 'manage_family_records';

// Employee Specializations
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
  | 'community_health';

// System Permissions for Admin
export type SystemPermission = 
  | 'user_management'
  | 'facility_management'
  | 'system_configuration'
  | 'audit_log_access'
  | 'backup_management'
  | 'security_settings'
  | 'report_generation'
  | 'data_export'
  | 'notification_management'
  | 'vaccine_management';

// Notification Preferences Interface
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  immunization_reminders: boolean;
  appointment_reminders: boolean;
  health_alerts: boolean;
  system_notifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

// Emergency Contact Interface
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  is_primary: boolean;
}

// Work Schedule Interface
export interface WorkSchedule {
  monday?: { start: string; end: string; };
  tuesday?: { start: string; end: string; };
  wednesday?: { start: string; end: string; };
  thursday?: { start: string; end: string; };
  friday?: { start: string; end: string; };
  saturday?: { start: string; end: string; };
  sunday?: { start: string; end: string; };
  timezone: string;
  break_duration?: number; // minutes
}

// Contact Information Interface
export interface ContactInformation {
  primary_phone: string;
  secondary_phone?: string;
  personal_email?: string;
  work_email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// Training Record Interface
export interface TrainingRecord {
  id: string;
  title: string;
  provider: string;
  completion_date: string;
  expiry_date?: string;
  certificate_number?: string;
  status: 'active' | 'expired' | 'pending_renewal';
}

// Performance Metrics Interface
export interface PerformanceMetrics {
  immunizations_administered: number;
  patients_served: number;
  accuracy_rate: number;
  completion_rate: number;
  last_evaluation_date: string;
  next_evaluation_date: string;
  goals: Array<{
    title: string;
    target: number;
    current: number;
    deadline: string;
  }>;
}

// Base Profile Interface
export interface BaseProfile {
  $id: string;
  user_id: string;
  facility_id: string;
  created_at: string;
  updated_at: string;
}

// Patient Profile Interface
export interface PatientProfile extends BaseProfile {
  patient_id: string;
  profile_status: ProfileStatus;
  verification_status: VerificationStatus;
  verification_method?: VerificationMethod;
  guardian_user_id?: string;
  access_permissions: PatientAccessPermission[];
  notification_preferences?: NotificationPreferences;
  emergency_contact?: EmergencyContact;
}

// Employee Profile Interface
export interface EmployeeProfile extends BaseProfile {
  employee_id: string;
  employee_type: EmployeeType;
  professional_title?: string;
  license_number?: string;
  license_expiry_date?: string;
  specializations?: EmployeeSpecialization[];
  primary_facility_id: string;
  assigned_facilities?: string[];
  department?: string;
  supervisor_user_id?: string;
  employment_status: EmploymentStatus;
  hire_date?: string;
  work_schedule?: WorkSchedule;
  contact_information?: ContactInformation;
  emergency_contact?: EmergencyContact;
  training_records?: TrainingRecord[];
  performance_metrics?: PerformanceMetrics;
}

// Admin Profile Interface
export interface AdminProfile extends BaseProfile {
  admin_level: AdminLevel;
  system_permissions: SystemPermission[];
  facility_access_scope: FacilityAccessScope;
  assigned_facilities?: string[];
  security_clearance: SecurityClearance;
  mfa_enabled: boolean;
  last_security_review?: string;
  audit_log_access: boolean;
  system_config_access: boolean;
  user_management_scope: UserManagementScope;
  backup_admin_user_id?: string;
  admin_notes?: string;
}

// Union type for all profiles
export type Profile = PatientProfile | EmployeeProfile | AdminProfile;

// Profile type detection
export type ProfileType = 'patient' | 'employee' | 'admin' | 'legacy';

// Profile with type information
export interface ProfileWithType {
  type: ProfileType;
  profile: Profile | null;
}

// Enhanced User type with Profile integration
export interface User {
  $id: string;
  email: string;
  name: string;
  phone?: string;
  labels: string[];
  prefs?: Record<string, any>;
  registration: string;
  status: boolean;
  emailVerification: boolean;
  phoneVerification: boolean;
}

// User with Profile information
export interface UserWithProfile extends User {
  profileType: ProfileType;
  profile: Profile | null;
  // Legacy compatibility fields
  role?: 'nurse' | 'doctor' | 'administrator' | 'supervisor';
  facilityId?: string;
}

// Validation schemas using Zod
export const patientProfileSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  profile_status: z.enum(['active', 'inactive', 'suspended']),
  verification_status: z.enum(['pending', 'verified', 'rejected']),
  verification_method: z.enum(['phone', 'email', 'in_person', 'guardian']).optional(),
  guardian_user_id: z.string().optional(),
  access_permissions: z.array(z.string()),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    immunization_reminders: z.boolean(),
    appointment_reminders: z.boolean(),
    health_alerts: z.boolean(),
    system_notifications: z.boolean(),
    frequency: z.enum(['immediate', 'daily', 'weekly'])
  }).optional(),
  emergency_contact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    address: z.string().optional(),
    is_primary: z.boolean()
  }).optional(),
  facility_id: z.string().min(1, 'Facility ID is required')
});

export const employeeProfileSchema = z.object({
  employee_id: z.string().min(3, 'Employee ID must be at least 3 characters'),
  employee_type: z.enum(['doctor', 'supervisor', 'nurse', 'data_entry_clerk', 'technician', 'administrator']),
  professional_title: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry_date: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  primary_facility_id: z.string().min(1, 'Primary facility ID is required'),
  assigned_facilities: z.array(z.string()).optional(),
  department: z.string().optional(),
  supervisor_user_id: z.string().optional(),
  employment_status: z.enum(['active', 'inactive', 'suspended', 'terminated', 'on_leave']),
  hire_date: z.string().optional(),
  facility_id: z.string().min(1, 'Facility ID is required')
});

export const adminProfileSchema = z.object({
  admin_level: z.enum(['super_admin', 'system_admin', 'facility_admin']),
  system_permissions: z.array(z.string()),
  facility_access_scope: z.enum(['all', 'assigned', 'single']),
  assigned_facilities: z.array(z.string()).optional(),
  security_clearance: z.enum(['high', 'medium', 'standard']),
  mfa_enabled: z.boolean(),
  last_security_review: z.string().optional(),
  audit_log_access: z.boolean(),
  system_config_access: z.boolean(),
  user_management_scope: z.enum(['global', 'facility', 'department']),
  backup_admin_user_id: z.string().optional(),
  admin_notes: z.string().optional(),
  facility_id: z.string().min(1, 'Facility ID is required')
});

// Form data types
export type PatientProfileFormData = z.infer<typeof patientProfileSchema>;
export type EmployeeProfileFormData = z.infer<typeof employeeProfileSchema>;
export type AdminProfileFormData = z.infer<typeof adminProfileSchema>;

// API Response types
export interface ProfileResponse<T = Profile> {
  data: T;
  message: string;
}

export interface ProfileListResponse<T = Profile> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Profile query parameters
export interface ProfileQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  facility_id?: string;
  profile_status?: ProfileStatus;
  verification_status?: VerificationStatus;
  employee_type?: EmployeeType;
  employment_status?: EmploymentStatus;
}

// Profile creation/update types
export interface CreatePatientProfileData extends Omit<PatientProfile, '$id' | 'created_at' | 'updated_at'> {}
export interface CreateEmployeeProfileData extends Omit<EmployeeProfile, '$id' | 'created_at' | 'updated_at'> {}
export interface CreateAdminProfileData extends Omit<AdminProfile, '$id' | 'created_at' | 'updated_at'> {}

export interface UpdatePatientProfileData extends Partial<CreatePatientProfileData> {}
export interface UpdateEmployeeProfileData extends Partial<CreateEmployeeProfileData> {}
export interface UpdateAdminProfileData extends Partial<CreateAdminProfileData> {}