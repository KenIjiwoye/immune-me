/**
 * Comprehensive TypeScript types for Appwrite Cloud Collections
 * Generated from appwrite-collections-summary.md
 * 
 * This file contains all collection interfaces based on the deployed Appwrite schema.
 * Compatible with react-native-appwrite SDK.
 */

// Base Appwrite Document Interface
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

// =============================================================================
// CORE COLLECTIONS
// =============================================================================

/**
 * Facility Collection Interface
 * Collection ID: facility
 */
export interface Facility extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contactPhone: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Facilities Collection Interface (newer version)
 * Collection ID: facilities
 */
export interface Facilities extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Patients Collection Interface
 * Collection ID: patients
 */
export interface Patients extends AppwriteDocument {
  full_name: string;
  sex: string; // Size: 1 (M/F)
  date_of_birth: string; // datetime
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
 * Vaccines Collection Interface
 * Collection ID: vaccines
 */
export interface Vaccines extends AppwriteDocument {
  name: string;
  manufacturer?: string;
  disease_targeted: string;
  dosage_info?: string;
  storage_requirements?: string;
  route_of_administration?: string;
  age_group?: string;
  contraindications?: string;
  side_effects?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Immunization Records Collection Interface
 * Collection ID: immunization_records
 */
export interface ImmunizationRecords extends AppwriteDocument {
  patient_id: string;
  vaccine_id: string;
  facility_id: string;
  administered_by: string;
  administration_date: string; // datetime
  batch_number?: string;
  expiry_date?: string; // datetime
  site_of_administration?: string;
  dose_number?: number;
  notes?: string;
  adverse_reactions?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

/**
 * Notifications Collection Interface
 * Collection ID: notifications
 */
export interface Notifications extends AppwriteDocument {
  type: string;
  title: string;
  message: string;
  recipient_id?: string;
  recipient_type?: string;
  facility_id?: string;
  priority: string; // default: "normal"
  status: string; // default: "pending"
  is_read: boolean; // default: false
  scheduled_for?: string; // datetime
  sent_at?: string; // datetime
  delivery_method?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SUPPLEMENTARY IMMUNIZATIONS
// =============================================================================

/**
 * Supplementary Immunizations Collection Interface
 * Collection ID: supplementary_immunizations
 */
export interface SupplementaryImmunizations extends AppwriteDocument {
  campaign_name: string;
  vaccine_id: string;
  target_age_group: string;
  target_population?: string;
  start_date: string; // datetime
  end_date: string; // datetime
  facility_id: string;
  target_number?: number;
  achieved_number?: number; // default: 0
  campaign_status: string; // default: "planned"
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SCHEDULING COLLECTIONS
// =============================================================================

/**
 * Vaccine Schedules Collection Interface
 * Collection ID: vaccine_schedules
 */
export interface VaccineSchedules extends AppwriteDocument {
  name: string;
  description?: string;
  target_age_group: string;
  schedule_type: string;
  is_active: boolean; // default: true
  created_at: string;
  updated_at: string;
}

/**
 * Vaccine Schedule Items Collection Interface
 * Collection ID: vaccine_schedule_items
 */
export interface VaccineScheduleItems extends AppwriteDocument {
  schedule_id: string;
  vaccine_id: string;
  dose_number: number;
  minimum_age_weeks?: number;
  maximum_age_weeks?: number;
  minimum_interval_weeks?: number;
  notes?: string;
  is_active: boolean; // default: true
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROFILE COLLECTIONS
// =============================================================================

/**
 * Admin Profiles Collection Interface
 * Collection ID: admin_profiles
 * Document Security: Enabled
 */
export interface AdminProfiles extends AppwriteDocument {
  user_id: string;
  admin_level: string;
  system_permissions?: string[]; // array
  facility_access_scope: string;
  accessible_facilities?: string[]; // array
  data_access_level: string;
  can_manage_users: boolean; // default: false
  can_manage_facilities: boolean; // default: false
  can_manage_vaccines: boolean; // default: false
  can_generate_reports: boolean; // default: false
  can_manage_system_settings: boolean; // default: false
  emergency_access: boolean; // default: false
  created_at: string;
  updated_at: string;
}

/**
 * Employee Profiles Collection Interface
 * Collection ID: employee_profiles
 * Document Security: Enabled
 */
export interface EmployeeProfiles extends AppwriteDocument {
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
  contact_information?: string;
  work_schedule?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Patient Profiles Collection Interface
 * Collection ID: patient_profiles
 * Document Security: Enabled
 */
export interface PatientProfiles extends AppwriteDocument {
  user_id: string;
  patient_id?: string;
  profile_status: string;
  verification_status: string;
  verification_method?: string;
  access_permissions?: string[]; // array
  notification_preferences?: string;
  emergency_contact?: string;
  facility_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Profile Verification Workflow Collection Interface
 * Collection ID: profile_verification_workflow
 */
export interface ProfileVerificationWorkflow extends AppwriteDocument {
  profile_id: string;
  profile_type: string;
  user_id: string;
  verification_type: string;
  verification_method: string;
  status: string;
  initiated_by_user_id: string;
  assigned_to_user_id?: string;
  facility_id: string;
  verification_data?: string;
  documents_required?: string[]; // array
  documents_submitted?: string[]; // array
  verification_notes?: string;
  rejection_reason?: string;
  priority: string;
  due_date?: string; // datetime
  completed_at?: string; // datetime
  completed_by_user_id?: string;
  workflow_steps?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// AUDIT & COMPLIANCE COLLECTIONS
// =============================================================================

/**
 * Access Audit Log Collection Interface
 * Collection ID: access_audit_log
 * Document Security: Enabled
 */
export interface AccessAuditLog extends AppwriteDocument {
  user_id: string;
  profile_id?: string;
  profile_type?: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  facility_context?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  success: boolean;
  failure_reason?: string;
  additional_data?: string;
  created_at: string;
}

/**
 * Audit Collections Collection Interface
 * Collection ID: audit_collections
 * Document Security: Enabled
 */
export interface AuditCollections extends AppwriteDocument {
  collection_name: string;
  document_id: string;
  action_type: string;
  user_id: string;
  profile_id?: string;
  profile_type?: string;
  facility_context?: string;
  old_data?: string;
  new_data?: string;
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Role Change Log Collection Interface
 * Collection ID: role_change_log
 * Document Security: Enabled
 */
export interface RoleChangeLog extends AppwriteDocument {
  target_user_id: string;
  target_profile_id?: string;
  target_profile_type?: string;
  assigned_by_user_id: string;
  assigned_by_profile_id?: string;
  role_change_type: string;
  old_role_data?: string;
  new_role_data: string;
  facility_context?: string;
  change_reason?: string;
  effective_date: string; // datetime
  expiry_date?: string; // datetime
  status: string; // default: "active"
  approval_required: boolean; // default: false
  approved_by_user_id?: string;
  approved_at?: string; // datetime
  created_at: string;
  updated_at: string;
}

/**
 * Sync Collections Collection Interface
 * Collection ID: sync_collections
 * Note: This collection has no attributes defined
 */
export interface SyncCollections extends AppwriteDocument {
  // No additional attributes beyond base AppwriteDocument
}

// =============================================================================
// TYPE UNIONS AND UTILITY TYPES
// =============================================================================

/**
 * Union type for all collection documents
 */
export type AppwriteCollectionDocument = 
  | Facility
  | Facilities
  | Patients
  | Vaccines
  | ImmunizationRecords
  | Notifications
  | SupplementaryImmunizations
  | VaccineSchedules
  | VaccineScheduleItems
  | AdminProfiles
  | EmployeeProfiles
  | PatientProfiles
  | ProfileVerificationWorkflow
  | AccessAuditLog
  | AuditCollections
  | RoleChangeLog
  | SyncCollections;

/**
 * Collection names as string literals
 */
export type CollectionName = 
  | 'facility'
  | 'facilities'
  | 'patients'
  | 'vaccines'
  | 'immunization_records'
  | 'notifications'
  | 'supplementary_immunizations'
  | 'vaccine_schedules'
  | 'vaccine_schedule_items'
  | 'admin_profiles'
  | 'employee_profiles'
  | 'patient_profiles'
  | 'profile_verification_workflow'
  | 'access_audit_log'
  | 'audit_collections'
  | 'role_change_log'
  | 'sync_collections';

/**
 * Appwrite Query Response Interface
 */
export interface AppwriteQueryResponse<T extends AppwriteDocument> {
  total: number;
  documents: T[];
}

/**
 * Common query parameters for Appwrite collections
 */
export interface AppwriteQueryParams {
  queries?: string[];
  limit?: number;
  offset?: number;
  cursor?: string;
  cursorDirection?: 'after' | 'before';
  orderAttributes?: string[];
  orderTypes?: ('ASC' | 'DESC')[];
}

// =============================================================================
// ENUM TYPES FOR COMMON VALUES
// =============================================================================

/**
 * Common status values used across collections
 */
export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

/**
 * Priority levels used in notifications and workflows
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Verification status values
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

/**
 * Employee types from employee_profiles
 */
export enum EmployeeType {
  DOCTOR = 'doctor',
  SUPERVISOR = 'supervisor',
  NURSE = 'nurse',
  DATA_ENTRY_CLERK = 'data_entry_clerk',
  TECHNICIAN = 'technician',
  ADMINISTRATOR = 'administrator'
}

/**
 * Admin levels from admin_profiles
 */
export enum AdminLevel {
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  FACILITY_ADMIN = 'facility_admin'
}

/**
 * Facility access scope values
 */
export enum FacilityAccessScope {
  ALL = 'all',
  ASSIGNED = 'assigned',
  SINGLE = 'single'
}