// =============================================================================
// APPWRITE DOCUMENT TYPES
// =============================================================================

// Base Appwrite document interface
export interface AppwriteDocument {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
}

// =============================================================================
// CORE COLLECTIONS
// =============================================================================

export interface Facility extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contactPhone: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Patient extends AppwriteDocument {
  full_name: string;
  sex: string;
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
  created_at: string;
  updated_at: string;
}

export interface Vaccine extends AppwriteDocument {
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

export interface ImmunizationRecord extends AppwriteDocument {
  patient_id: string;
  vaccine_id: string;
  facility_id: string;
  administered_by_user_id: string;
  administered_date: string;
  batch_number?: string;
  health_officer?: string;
  return_date?: string;
  is_standard_schedule: boolean;
  schedule_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  administered_by_profile_id?: string;
  administered_by_employee_id?: string;
  administered_by_professional_title?: string;
  administered_by_license_number?: string;
  administered_by_specializations?: string[];
  supervisor_profile_id?: string;
  quality_assurance_verified?: boolean;
  verification_timestamp?: string;
}

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

export interface Notification extends AppwriteDocument {
  type: string;
  title: string;
  message: string;
  recipient_id?: string;
  recipient_type?: string;
  facility_id?: string;
  priority: string;
  status: string;
  is_read: boolean;
  scheduled_for?: string;
  sent_at?: string;
  delivery_method?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SUPPLEMENTARY IMMUNIZATIONS
// =============================================================================

export interface SupplementaryImmunization extends AppwriteDocument {
  campaign_name: string;
  vaccine_id: string;
  target_age_group: string;
  target_population?: string;
  start_date: string;
  end_date: string;
  facility_id: string;
  target_number?: number;
  achieved_number: number;
  campaign_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SCHEDULING COLLECTIONS
// =============================================================================

export interface VaccineSchedule extends AppwriteDocument {
  name: string;
  description?: string;
  target_age_group: string;
  schedule_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaccineScheduleItem extends AppwriteDocument {
  schedule_id: string;
  vaccine_id: string;
  dose_number: number;
  minimum_age_weeks?: number;
  maximum_age_weeks?: number;
  minimum_interval_weeks?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// PROFILE COLLECTIONS
// =============================================================================

export interface AdminProfile extends AppwriteDocument {
  user_id: string;
  admin_level: string;
  system_permissions?: string[];
  facility_access_scope: string;
  accessible_facilities?: string[];
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

export interface EmployeeProfile extends AppwriteDocument {
  user_id: string;
  employee_id: string;
  employee_type: string;
  professional_title: string;
  license_number?: string;
  license_expiry_date?: string;
  specializations?: string[];
  primary_facility_id: string;
  assigned_facilities?: string[];
  department?: string;
  employment_status: string;
  hire_date?: string;
  contact_information?: string;
  work_schedule?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile extends AppwriteDocument {
  user_id: string;
  patient_id?: string;
  profile_status: string;
  verification_status: string;
  verification_method?: string;
  access_permissions?: string[];
  notification_preferences?: string;
  emergency_contact?: string;
  facility_id: string;
  created_at: string;
  updated_at: string;
}

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
  documents_required?: string[];
  documents_submitted?: string[];
  verification_notes?: string;
  rejection_reason?: string;
  priority: string;
  due_date?: string;
  completed_at?: string;
  completed_by_user_id?: string;
  workflow_steps?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// AUDIT & COMPLIANCE COLLECTIONS
// =============================================================================

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

export interface AuditCollection extends AppwriteDocument {
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
  effective_date: string;
  expiry_date?: string;
  status: string;
  approval_required: boolean;
  approved_by_user_id?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// SYNC COLLECTIONS
// =============================================================================

export interface SyncCollection extends AppwriteDocument {
  // No additional attributes defined
}

// =============================================================================
// FACILITIES (NEWER VERSION)
// =============================================================================

export interface Facilities extends AppwriteDocument {
  name: string;
  district: string;
  address: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// QUERY RESPONSE TYPES
// =============================================================================

export interface QueryResponse<T> {
  documents: T[];
  total: number;
}

// =============================================================================
// RELATIONSHIP TYPES (FE-AW-03.4)
// =============================================================================

// Patient-Immunization Relationships
export interface PatientImmunizationHistory {
  patientId: string;
  immunizations: ImmunizationRecord[];
  vaccineSchedule: VaccineScheduleItem[];
  nextDueVaccines: Array<{
    vaccineId: string;
    vaccineName: string;
    dueDate: string;
    doseNumber: number;
  }>;
  completedVaccines: Array<{
    vaccineId: string;
    vaccineName: string;
    completionDate: string;
    administeredBy: string;
  }>;
}

export interface PatientVaccineStatus {
  patientId: string;
  vaccineId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'exempted';
  dosesReceived: number;
  dosesRequired: number;
  lastDoseDate?: string;
  nextDoseDate?: string;
  notes?: string;
}

export interface ImmunizationScheduleCompliance {
  patientId: string;
  overallCompliance: number; // percentage
  onTimeDoses: number;
  delayedDoses: number;
  missedDoses: number;
  upcomingDoses: Array<{
    vaccineId: string;
    dueDate: string;
    daysOverdue?: number;
  }>;
}

// Facility-Employee Relationships
export interface FacilityEmployeeAssignment {
  employeeId: string;
  facilityId: string;
  assignmentType: 'primary' | 'secondary' | 'temporary' | 'consultant';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  role: string;
  department?: string;
  permissions: string[];
}

export interface EmployeeFacilityHistory {
  employeeId: string;
  facilityAssignments: FacilityEmployeeAssignment[];
  currentFacility?: Facility;
  primaryFacility?: Facility;
  assignedFacilities: Facility[];
}

export interface FacilityStaffing {
  facilityId: string;
  totalStaff: number;
  staffByRole: Record<string, number>;
  staffByType: Record<string, number>;
  activeStaff: EmployeeProfile[];
  staffingGaps?: Array<{
    role: string;
    required: number;
    current: number;
  }>;
}

// User-Profile Relationships
export interface UserProfileLink {
  userId: string;
  profileId: string;
  profileType: 'admin' | 'employee' | 'patient';
  isPrimary: boolean;
  status: 'active' | 'inactive' | 'pending_verification';
  createdAt: string;
  verifiedAt?: string;
}

export interface UserProfileCollection {
  userId: string;
  profiles: UserProfileLink[];
  primaryProfile?: UserProfileLink;
  activeProfiles: UserProfileLink[];
}

export interface ProfileUserDetails {
  profileId: string;
  user: {
    $id: string;
    email: string;
    name?: string;
    phone?: string;
    emailVerification: boolean;
    phoneVerification: boolean;
    status: boolean;
    labels: string[];
    prefs: Record<string, any>;
    $createdAt: string;
    $updatedAt: string;
  };
  profileType: 'admin' | 'employee' | 'patient';
  verificationStatus: string;
}

// Audit Trail Types
export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  userId: string;
  profileId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, { old?: any; new?: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditTrailSummary {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByUser: Record<string, number>;
  entriesByResourceType: Record<string, number>;
  recentEntries: AuditTrailEntry[];
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ChangeLog {
  documentId: string;
  collectionName: string;
  changes: Array<{
    field: string;
    oldValue?: any;
    newValue?: any;
    changeType: 'added' | 'modified' | 'removed';
  }>;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

// =============================================================================
// CRUD UTILITY TYPES
// =============================================================================

export type CreateData<T extends AppwriteDocument> = Omit<T, keyof AppwriteDocument>;

export type UpdateData<T extends AppwriteDocument> = Partial<Omit<T, keyof AppwriteDocument>>;

export type DocumentId = string;

export type CollectionId = string;

// Query filter types
export interface QueryFilter {
  attribute: string;
  values: string[];
  method?: 'equal' | 'notEqual' | 'lessThan' | 'lessThanEqual' | 'greaterThan' | 'greaterThanEqual' | 'search';
}

// Pagination options
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  cursorDirection?: 'after' | 'before';
}

// Sort options
export interface SortOptions {
  attribute: string;
  order?: 'ASC' | 'DESC';
}

// Combined query options
export interface QueryOptions {
  filters?: QueryFilter[];
  sorts?: SortOptions[];
  pagination?: PaginationOptions;
}

// CRUD operation result types
export interface CreateResult<T extends AppwriteDocument> {
  document: T;
}

export interface UpdateResult<T extends AppwriteDocument> {
  document: T;
}

export interface DeleteResult {
  success: boolean;
}

export interface ListResult<T extends AppwriteDocument> extends QueryResponse<T> {}

// Error types
export interface AppwriteError {
  code: number;
  type: string;
  message: string;
  response?: any;
}