/**
 * Audit and Compliance Types
 * Collection-specific types for audit trails and compliance tracking
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// AUDIT COLLECTION TYPES
// =============================================================================

/**
 * Access Audit Log document from Appwrite access_audit_log collection
 * Based on the deployed schema
 */
export interface AppwriteAccessAuditLog extends AppwriteDocument {
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
  additional_data?: string; // JSON string
  created_at: string;
}

/**
 * Audit Collections document from Appwrite audit_collections collection
 * Based on the deployed schema
 */
export interface AppwriteAuditCollections extends AppwriteDocument {
  collection_name: string;
  document_id: string;
  action_type: string;
  user_id: string;
  profile_id?: string;
  profile_type?: string;
  facility_context?: string;
  old_data?: string; // JSON string
  new_data?: string; // JSON string
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Role Change Log document from Appwrite role_change_log collection
 * Based on the deployed schema
 */
export interface AppwriteRoleChangeLog extends AppwriteDocument {
  target_user_id: string;
  target_profile_id?: string;
  target_profile_type?: string;
  assigned_by_user_id: string;
  assigned_by_profile_id?: string;
  role_change_type: string;
  old_role_data?: string; // JSON string
  new_role_data: string; // JSON string
  facility_context?: string;
  change_reason?: string;
  effective_date: string; // datetime
  expiry_date?: string; // datetime
  status: string;
  approval_required: boolean;
  approved_by_user_id?: string;
  approved_at?: string; // datetime
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Action types for access audit log
 */
export type AccessActionType = 
  | 'login'
  | 'logout'
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'search'
  | 'download'
  | 'upload'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign'
  | 'escalate'
  | 'emergency_access'
  | 'password_change'
  | 'permission_change'
  | 'system_configuration'
  | 'backup_restore';

/**
 * Resource types for audit logging
 */
export type ResourceType = 
  | 'patient'
  | 'vaccine'
  | 'facility'
  | 'immunization_record'
  | 'user'
  | 'admin_profile'
  | 'employee_profile'
  | 'patient_profile'
  | 'notification'
  | 'report'
  | 'system_setting'
  | 'audit_log'
  | 'role'
  | 'permission'
  | 'workflow'
  | 'campaign'
  | 'schedule';

/**
 * Collection action types for audit collections
 */
export type CollectionActionType = 
  | 'create'
  | 'update'
  | 'delete'
  | 'bulk_create'
  | 'bulk_update'
  | 'bulk_delete'
  | 'restore'
  | 'archive'
  | 'merge'
  | 'split';

/**
 * Role change types
 */
export type RoleChangeType = 
  | 'role_assignment'
  | 'role_removal'
  | 'permission_grant'
  | 'permission_revoke'
  | 'facility_assignment'
  | 'facility_removal'
  | 'profile_activation'
  | 'profile_deactivation'
  | 'profile_suspension'
  | 'profile_restoration'
  | 'emergency_access_grant'
  | 'emergency_access_revoke'
  | 'temporary_elevation'
  | 'delegation';

/**
 * Role change status
 */
export type RoleChangeStatus = 
  | 'active'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked'
  | 'suspended';

/**
 * Audit severity levels
 */
export type AuditSeverity = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'security_incident';

/**
 * Profile types for audit context
 */
export type AuditProfileType = 
  | 'admin'
  | 'employee'
  | 'patient'
  | 'system'
  | 'anonymous';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Additional data structure for access audit log
 */
export interface AccessAuditAdditionalData {
  request_details?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    query_params?: Record<string, any>;
    body_size?: number;
  };
  response_details?: {
    status_code: number;
    response_size?: number;
    processing_time_ms?: number;
  };
  security_context?: {
    authentication_method: string;
    mfa_used: boolean;
    session_duration_minutes?: number;
    concurrent_sessions?: number;
    suspicious_activity_score?: number;
  };
  business_context?: {
    affected_patients?: string[];
    affected_facilities?: string[];
    data_sensitivity_level?: 'public' | 'internal' | 'confidential' | 'restricted';
    compliance_flags?: string[];
  };
  error_details?: {
    error_code?: string;
    error_message?: string;
    stack_trace?: string;
    recovery_action?: string;
  };
}

/**
 * Old/New data structure for audit collections
 */
export interface AuditDataChange {
  field_name: string;
  old_value: any;
  new_value: any;
  change_type: 'added' | 'modified' | 'removed';
  data_type: string;
  sensitive_data: boolean;
}

/**
 * Role data structure for role change log
 */
export interface RoleData {
  profile_type: AuditProfileType;
  roles?: string[];
  permissions?: string[];
  facility_access?: {
    scope: 'all' | 'assigned' | 'single';
    facilities?: string[];
  };
  data_access_level?: string;
  special_permissions?: {
    emergency_access: boolean;
    system_admin: boolean;
    audit_access: boolean;
    backup_access: boolean;
  };
  restrictions?: {
    ip_restrictions?: string[];
    time_restrictions?: {
      start_time: string;
      end_time: string;
      days_of_week: number[];
    };
    session_timeout_minutes?: number;
    concurrent_session_limit?: number;
  };
}

/**
 * Change summary structure
 */
export interface ChangeSummary {
  total_changes: number;
  fields_added: string[];
  fields_modified: string[];
  fields_removed: string[];
  sensitive_fields_changed: string[];
  business_impact_level: 'low' | 'medium' | 'high' | 'critical';
  requires_notification: boolean;
  notification_recipients?: string[];
}

// =============================================================================
// ENHANCED AUDIT TYPES
// =============================================================================

/**
 * Enhanced access audit log with parsed JSON fields
 */
export interface EnhancedAccessAuditLog extends Omit<AppwriteAccessAuditLog, 'additional_data' | 'created_at'> {
  additional_data?: AccessAuditAdditionalData;
  created_at: Date;
  
  // Computed fields
  severity_level?: AuditSeverity;
  is_suspicious?: boolean;
  risk_score?: number;
  session_duration_minutes?: number;
  
  // Related data
  user_details?: {
    name: string;
    email: string;
    profile_type: AuditProfileType;
  };
  facility_details?: {
    name: string;
    district: string;
  };
  resource_details?: {
    name?: string;
    type: ResourceType;
    sensitive: boolean;
  };
}

/**
 * Enhanced audit collections with parsed JSON fields
 */
export interface EnhancedAuditCollections extends Omit<AppwriteAuditCollections, 'old_data' | 'new_data' | 'created_at'> {
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at: Date;
  
  // Computed fields
  changes_detail?: AuditDataChange[];
  change_summary?: ChangeSummary;
  data_sensitivity_level?: 'public' | 'internal' | 'confidential' | 'restricted';
  compliance_impact?: string[];
  
  // Related data
  user_details?: {
    name: string;
    email: string;
    profile_type: AuditProfileType;
  };
  collection_metadata?: {
    total_documents: number;
    document_type: string;
    business_criticality: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Enhanced role change log with parsed JSON fields
 */
export interface EnhancedRoleChangeLog extends Omit<AppwriteRoleChangeLog, 'old_role_data' | 'new_role_data' | 'effective_date' | 'expiry_date' | 'approved_at' | 'created_at' | 'updated_at'> {
  old_role_data?: RoleData;
  new_role_data: RoleData;
  effective_date: Date;
  expiry_date?: Date;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Computed fields
  is_active?: boolean;
  is_expired?: boolean;
  days_until_expiry?: number;
  permission_changes?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  facility_changes?: {
    added: string[];
    removed: string[];
  };
  
  // Related data
  target_user_details?: {
    name: string;
    email: string;
    current_profile_type: AuditProfileType;
  };
  assigned_by_details?: {
    name: string;
    email: string;
    profile_type: AuditProfileType;
  };
  approved_by_details?: {
    name: string;
    email: string;
    profile_type: AuditProfileType;
  };
  facility_details?: Array<{
    $id: string;
    name: string;
    district: string;
  }>;
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Access audit log creation form data
 */
export interface CreateAccessAuditLogData {
  user_id: string;
  profile_id?: string;
  profile_type?: AuditProfileType;
  action_type: AccessActionType;
  resource_type: ResourceType;
  resource_id?: string;
  facility_context?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  success: boolean;
  failure_reason?: string;
  additional_data?: AccessAuditAdditionalData;
}

/**
 * Audit collections creation form data
 */
export interface CreateAuditCollectionsData {
  collection_name: string;
  document_id: string;
  action_type: CollectionActionType;
  user_id: string;
  profile_id?: string;
  profile_type?: AuditProfileType;
  facility_context?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  changes_summary?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Role change log creation form data
 */
export interface CreateRoleChangeLogData {
  target_user_id: string;
  target_profile_id?: string;
  target_profile_type?: AuditProfileType;
  assigned_by_user_id: string;
  assigned_by_profile_id?: string;
  role_change_type: RoleChangeType;
  old_role_data?: RoleData;
  new_role_data: RoleData;
  facility_context?: string;
  change_reason?: string;
  effective_date: string;
  expiry_date?: string;
  status: RoleChangeStatus;
  approval_required: boolean;
}

/**
 * Role change approval form data
 */
export interface ApproveRoleChangeData {
  role_change_id: string;
  approved_by_user_id: string;
  approval_decision: 'approved' | 'rejected';
  approval_notes?: string;
  conditions?: string[];
  modified_expiry_date?: string;
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Access audit log query parameters
 */
export interface AccessAuditLogQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  user_id?: string;
  profile_id?: string;
  profile_type?: AuditProfileType;
  action_type?: AccessActionType;
  resource_type?: ResourceType;
  resource_id?: string;
  facility_context?: string;
  success?: boolean;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  
  // Security filters
  suspicious_activity?: boolean;
  failed_attempts?: boolean;
  emergency_access?: boolean;
  
  // IP and session filters
  ip_address?: string;
  session_id?: string;
  
  // Sorting
  order_by?: 'created_at' | 'action_type' | 'resource_type' | 'success';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Audit collections query parameters
 */
export interface AuditCollectionsQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  collection_name?: string;
  document_id?: string;
  action_type?: CollectionActionType;
  user_id?: string;
  profile_id?: string;
  profile_type?: AuditProfileType;
  facility_context?: string;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  
  // Data sensitivity filters
  has_sensitive_changes?: boolean;
  change_impact_level?: 'low' | 'medium' | 'high' | 'critical';
  
  // Sorting
  order_by?: 'created_at' | 'collection_name' | 'action_type';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Role change log query parameters
 */
export interface RoleChangeLogQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  target_user_id?: string;
  target_profile_type?: AuditProfileType;
  assigned_by_user_id?: string;
  role_change_type?: RoleChangeType;
  status?: RoleChangeStatus;
  facility_context?: string;
  approval_required?: boolean;
  approved_by_user_id?: string;
  
  // Date filters
  effective_date_from?: string;
  effective_date_to?: string;
  expiry_date_from?: string;
  expiry_date_to?: string;
  created_after?: string;
  created_before?: string;
  
  // Status filters
  is_active?: boolean;
  is_expired?: boolean;
  pending_approval?: boolean;
  
  // Sorting
  order_by?: 'effective_date' | 'created_at' | 'status' | 'role_change_type';
  order_direction?: 'ASC' | 'DESC';
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Audit list responses
 */
export interface AccessAuditLogListResponse {
  documents: AppwriteAccessAuditLog[];
  total: number;
}

export interface AuditCollectionsListResponse {
  documents: AppwriteAuditCollections[];
  total: number;
}

export interface RoleChangeLogListResponse {
  documents: AppwriteRoleChangeLog[];
  total: number;
}

/**
 * Enhanced audit list responses
 */
export interface EnhancedAccessAuditLogListResponse {
  documents: EnhancedAccessAuditLog[];
  total: number;
}

export interface EnhancedAuditCollectionsListResponse {
  documents: EnhancedAuditCollections[];
  total: number;
}

export interface EnhancedRoleChangeLogListResponse {
  documents: EnhancedRoleChangeLog[];
  total: number;
}

// =============================================================================
// ANALYTICS AND REPORTING TYPES
// =============================================================================

/**
 * Audit summary statistics
 */
export interface AuditSummaryStats {
  time_period: {
    start_date: string;
    end_date: string;
  };
  access_audit: {
    total_events: number;
    successful_events: number;
    failed_events: number;
    unique_users: number;
    unique_resources: number;
    by_action_type: Array<{
      action_type: AccessActionType;
      count: number;
      success_rate: number;
    }>;
    by_resource_type: Array<{
      resource_type: ResourceType;
      count: number;
      success_rate: number;
    }>;
    security_incidents: number;
    suspicious_activities: number;
  };
  data_changes: {
    total_changes: number;
    by_collection: Array<{
      collection_name: string;
      changes: number;
      creates: number;
      updates: number;
      deletes: number;
    }>;
    sensitive_data_changes: number;
    bulk_operations: number;
  };
  role_changes: {
    total_changes: number;
    pending_approvals: number;
    approved_changes: number;
    rejected_changes: number;
    expired_changes: number;
    by_change_type: Array<{
      change_type: RoleChangeType;
      count: number;
    }>;
    emergency_access_grants: number;
  };
}

/**
 * Security incident report
 */
export interface SecurityIncidentReport {
  incident_id: string;
  severity: AuditSeverity;
  incident_type: string;
  description: string;
  detected_at: string;
  affected_users: string[];
  affected_resources: string[];
  related_audit_logs: string[];
  investigation_status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assigned_investigator?: string;
  resolution_notes?: string;
  resolved_at?: string;
  preventive_measures: string[];
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  report_id: string;
  report_type: string;
  generated_at: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  compliance_framework: string; // e.g., "HIPAA", "GDPR", "Local Health Regulations"
  compliance_score: number; // 0-100
  requirements: Array<{
    requirement_id: string;
    requirement_name: string;
    status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable';
    evidence_count: number;
    gaps_identified: string[];
    recommendations: string[];
  }>;
  audit_trail_completeness: number; // 0-100
  data_integrity_score: number; // 0-100
  access_control_effectiveness: number; // 0-100
  findings: string[];
  recommendations: string[];
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  user_id: string;
  user_name: string;
  profile_type: AuditProfileType;
  time_period: {
    start_date: string;
    end_date: string;
  };
  activity_stats: {
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    unique_resources_accessed: number;
    unique_facilities_accessed: number;
    login_count: number;
    average_session_duration_minutes: number;
  };
  action_breakdown: Array<{
    action_type: AccessActionType;
    count: number;
    success_rate: number;
  }>;
  resource_access: Array<{
    resource_type: ResourceType;
    access_count: number;
    last_accessed: string;
  }>;
  security_events: {
    failed_login_attempts: number;
    suspicious_activities: number;
    policy_violations: number;
  };
  risk_assessment: {
    risk_score: number; // 0-100
    risk_factors: string[];
    recommendations: string[];
  };
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Audit validation constraints
 */
export const AuditValidationRules = {
  access_audit_log: {
    user_id: { required: true, format: 'uuid' },
    action_type: { required: true },
    resource_type: { required: true },
    success: { required: true, type: 'boolean' },
    ip_address: { max_length: 45, pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/ },
    user_agent: { max_length: 500 }
  },
  audit_collections: {
    collection_name: { required: true, max_length: 100 },
    document_id: { required: true, format: 'uuid' },
    action_type: { required: true },
    user_id: { required: true, format: 'uuid' }
  },
  role_change_log: {
    target_user_id: { required: true, format: 'uuid' },
    assigned_by_user_id: { required: true, format: 'uuid' },
    role_change_type: { required: true },
    new_role_data: { required: true },
    effective_date: { required: true },
    status: { required: true, options: ['active', 'pending', 'approved', 'rejected', 'expired', 'revoked'] }
  }
} as const;