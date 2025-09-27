/**
 * Profile Type Definitions
 */

export interface BaseProfile {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface PatientProfile extends BaseProfile {
  patient_id: string
  profile_status: 'active' | 'inactive' | 'suspended'
  verification_status: 'pending' | 'verified' | 'rejected'
  verification_method?: string
  guardian_user_id?: string
  access_permissions: string[]
  notification_preferences?: string
  emergency_contact?: string
  facility_id: string
}

export interface EmployeeProfile extends BaseProfile {
  employee_id: string
  employee_type: 'doctor' | 'supervisor' | 'nurse' | 'data_entry_clerk' | 'technician'
  professional_title?: string
  license_number?: string
  license_expiry_date?: string
  specializations?: string[]
  primary_facility_id: string
  assigned_facilities?: string[]
  department?: string
  supervisor_user_id?: string
  employment_status: 'active' | 'inactive' | 'suspended' | 'terminated'
  hire_date?: string
  work_schedule?: string
  contact_information?: string
  emergency_contact?: string
  training_records?: string
  performance_metrics?: string
}

export interface AdminProfile extends BaseProfile {
  admin_level: 'super_admin' | 'system_admin' | 'facility_admin'
  system_permissions: string[]
  facility_access_scope: 'all' | 'assigned' | 'single'
  assigned_facilities?: string[]
  security_clearance: 'high' | 'medium' | 'standard'
  mfa_enabled: boolean
  last_security_review?: string
  audit_log_access: boolean
  system_config_access: boolean
  user_management_scope: 'global' | 'facility' | 'department'
  backup_admin_user_id?: string
  admin_notes?: string
}

export type ProfileType = 'patient' | 'employee' | 'admin' | 'legacy' | 'none' | 'error'

export interface UserProfileInfo {
  type: ProfileType
  profile: PatientProfile | EmployeeProfile | AdminProfile | null
  user: any // User model type
}

export interface UserReference {
  id: string | number
  name: string
  type: string
  facility_id: string | number | null
  profile_type: ProfileType
}

export interface ProfileValidationResult {
  valid: boolean
  message: string
  warning?: boolean
  expired_date?: string
  expiry_date?: string
}

export interface EnhancedImmunizationData {
  administered_by_user_id?: string | number
  administeredByUserId?: string | number
  facilityId?: string | number
  patientId?: any
  vaccineId?: any
  administeredDate?: any
  batchNumber?: any
  returnDate?: any
  notes?: any
  administered_by_details?: {
    employee_id: string
    professional_title: string
    license_number: string
    employee_type: string
  }
  administration_notes?: string
  [key: string]: any
}