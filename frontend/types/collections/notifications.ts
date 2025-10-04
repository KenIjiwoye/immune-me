/**
 * Notification System Types
 * Collection-specific types for notification management
 */

import { AppwriteDocument } from '../appwrite';

// =============================================================================
// NOTIFICATION COLLECTION TYPES
// =============================================================================

/**
 * Notification document from Appwrite notifications collection
 * Based on the deployed schema
 */
export interface AppwriteNotification extends AppwriteDocument {
  type: string;
  title: string;
  message: string;
  recipient_id?: string;
  recipient_type?: string;
  facility_id?: string;
  priority: string;
  status: string;
  is_read: boolean;
  scheduled_for?: string; // datetime
  sent_at?: string; // datetime
  delivery_method?: string;
  metadata?: string; // JSON string
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ENUMS AND LITERAL TYPES
// =============================================================================

/**
 * Notification types
 */
export type NotificationType = 
  | 'immunization_reminder'
  | 'appointment_reminder'
  | 'vaccine_due'
  | 'vaccine_overdue'
  | 'campaign_announcement'
  | 'system_alert'
  | 'security_alert'
  | 'maintenance_notice'
  | 'policy_update'
  | 'training_reminder'
  | 'license_expiry'
  | 'stock_alert'
  | 'equipment_maintenance'
  | 'adverse_event_report'
  | 'compliance_reminder'
  | 'workflow_assignment'
  | 'approval_request'
  | 'data_quality_alert'
  | 'performance_report'
  | 'emergency_alert';

/**
 * Notification priority levels
 */
export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

/**
 * Notification status
 */
export type NotificationStatus = 
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'retry';

/**
 * Delivery methods
 */
export type DeliveryMethod = 
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'webhook'
  | 'system_banner'
  | 'mobile_alert';

/**
 * Recipient types
 */
export type RecipientType = 
  | 'user'
  | 'patient'
  | 'employee'
  | 'admin'
  | 'facility'
  | 'district'
  | 'region'
  | 'system'
  | 'group'
  | 'role_based';

/**
 * Notification categories for organization
 */
export type NotificationCategory = 
  | 'clinical'
  | 'administrative'
  | 'system'
  | 'security'
  | 'compliance'
  | 'operational'
  | 'educational'
  | 'emergency';

/**
 * Notification frequency for recurring notifications
 */
export type NotificationFrequency = 
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'custom';

// =============================================================================
// STRUCTURED DATA INTERFACES
// =============================================================================

/**
 * Notification metadata structure
 */
export interface NotificationMetadata {
  // Delivery tracking
  delivery_attempts?: number;
  last_delivery_attempt?: string;
  delivery_errors?: Array<{
    timestamp: string;
    error_code: string;
    error_message: string;
    retry_after?: string;
  }>;
  
  // Content customization
  template_id?: string;
  template_variables?: Record<string, any>;
  localization?: {
    language: string;
    region: string;
    timezone: string;
  };
  
  // Targeting and personalization
  audience_criteria?: {
    age_range?: { min: number; max: number; };
    sex?: 'M' | 'F';
    districts?: string[];
    facilities?: string[];
    roles?: string[];
    employee_types?: string[];
  };
  
  // Business context
  related_entities?: {
    patient_ids?: string[];
    vaccine_ids?: string[];
    facility_ids?: string[];
    campaign_ids?: string[];
    workflow_ids?: string[];
  };
  
  // Interaction tracking
  opened_at?: string;
  clicked_at?: string;
  action_taken?: string;
  response_data?: Record<string, any>;
  
  // Scheduling and recurrence
  recurrence_rule?: {
    frequency: NotificationFrequency;
    interval: number;
    end_date?: string;
    max_occurrences?: number;
  };
  
  // Compliance and audit
  retention_period_days?: number;
  compliance_tags?: string[];
  audit_trail?: Array<{
    timestamp: string;
    action: string;
    user_id?: string;
    details?: string;
  }>;
}

/**
 * Notification template structure
 */
export interface NotificationTemplate {
  template_id: string;
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  title_template: string;
  message_template: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    default_value?: any;
    description?: string;
  }>;
  delivery_methods: DeliveryMethod[];
  default_priority: NotificationPriority;
  localization_support: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Notification preferences structure
 */
export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  
  // Type-specific preferences
  type_preferences: Record<NotificationType, {
    enabled: boolean;
    delivery_methods: DeliveryMethod[];
    priority_threshold: NotificationPriority;
  }>;
  
  // Timing preferences
  quiet_hours?: {
    start_time: string; // HH:MM
    end_time: string; // HH:MM
    timezone: string;
  };
  
  // Frequency limits
  max_notifications_per_day?: number;
  max_notifications_per_hour?: number;
  digest_mode?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    delivery_time: string; // HH:MM
  };
  
  // Language and localization
  language: string;
  timezone: string;
  
  updated_at: string;
}

/**
 * Notification delivery result structure
 */
export interface NotificationDeliveryResult {
  notification_id: string;
  delivery_method: DeliveryMethod;
  status: 'success' | 'failed' | 'pending' | 'retry';
  delivered_at?: string;
  error_code?: string;
  error_message?: string;
  provider_response?: Record<string, any>;
  cost?: number;
  delivery_time_ms?: number;
  recipient_response?: {
    opened: boolean;
    clicked: boolean;
    action_taken?: string;
    response_time?: string;
  };
}

// =============================================================================
// ENHANCED NOTIFICATION TYPES
// =============================================================================

/**
 * Enhanced notification with parsed metadata and related data
 */
export interface EnhancedNotification extends Omit<AppwriteNotification, 'metadata' | 'scheduled_for' | 'sent_at' | 'created_at' | 'updated_at'> {
  metadata?: NotificationMetadata;
  scheduled_for?: Date;
  sent_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Computed fields
  is_overdue?: boolean;
  is_scheduled?: boolean;
  delivery_success_rate?: number;
  time_to_delivery_minutes?: number;
  engagement_score?: number;
  
  // Related data
  recipient_details?: {
    name: string;
    email?: string;
    phone?: string;
    preferred_language?: string;
    timezone?: string;
  };
  facility_details?: {
    name: string;
    district: string;
  };
  template_details?: {
    name: string;
    category: NotificationCategory;
  };
  delivery_results?: NotificationDeliveryResult[];
}

/**
 * Notification with full context for display
 */
export interface NotificationWithContext extends EnhancedNotification {
  context: {
    // Patient context (for patient-related notifications)
    patient?: {
      $id: string;
      full_name: string;
      date_of_birth: string;
      next_immunization_due?: string;
    };
    
    // Vaccine context (for vaccine-related notifications)
    vaccine?: {
      $id: string;
      name: string;
      disease_targeted: string;
    };
    
    // Campaign context (for campaign notifications)
    campaign?: {
      $id: string;
      campaign_name: string;
      start_date: string;
      end_date: string;
    };
    
    // Workflow context (for workflow notifications)
    workflow?: {
      $id: string;
      verification_type: string;
      status: string;
      due_date?: string;
    };
    
    // System context (for system notifications)
    system?: {
      component: string;
      severity: string;
      affected_users?: number;
    };
  };
}

// =============================================================================
// FORM AND INPUT TYPES
// =============================================================================

/**
 * Notification creation form data
 */
export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  recipient_id?: string;
  recipient_type?: RecipientType;
  facility_id?: string;
  priority: NotificationPriority;
  delivery_method?: DeliveryMethod;
  scheduled_for?: string;
  metadata?: NotificationMetadata;
}

/**
 * Bulk notification creation form data
 */
export interface CreateBulkNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  recipients: Array<{
    recipient_id: string;
    recipient_type: RecipientType;
    personalization?: Record<string, any>;
  }>;
  facility_ids?: string[];
  priority: NotificationPriority;
  delivery_methods: DeliveryMethod[];
  scheduled_for?: string;
  metadata?: NotificationMetadata;
}

/**
 * Notification template creation form data
 */
export interface CreateNotificationTemplateData {
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  title_template: string;
  message_template: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    default_value?: any;
    description?: string;
  }>;
  delivery_methods: DeliveryMethod[];
  default_priority: NotificationPriority;
  localization_support: boolean;
}

/**
 * Notification preferences update form data
 */
export interface UpdateNotificationPreferencesData {
  user_id: string;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  type_preferences?: Partial<Record<NotificationType, {
    enabled: boolean;
    delivery_methods: DeliveryMethod[];
    priority_threshold: NotificationPriority;
  }>>;
  quiet_hours?: {
    start_time: string;
    end_time: string;
    timezone: string;
  };
  max_notifications_per_day?: number;
  language?: string;
  timezone?: string;
}

// =============================================================================
// QUERY AND FILTER TYPES
// =============================================================================

/**
 * Notification query parameters
 */
export interface NotificationQueryParams {
  // Pagination
  limit?: number;
  offset?: number;
  
  // Filters
  type?: NotificationType;
  recipient_id?: string;
  recipient_type?: RecipientType;
  facility_id?: string;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  is_read?: boolean;
  delivery_method?: DeliveryMethod;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  scheduled_after?: string;
  scheduled_before?: string;
  sent_after?: string;
  sent_before?: string;
  
  // Content filters
  search?: string; // Search in title and message
  category?: NotificationCategory;
  
  // Status filters
  is_overdue?: boolean;
  is_scheduled?: boolean;
  delivery_failed?: boolean;
  
  // Sorting
  order_by?: 'created_at' | 'scheduled_for' | 'sent_at' | 'priority' | 'status';
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Notification analytics query parameters
 */
export interface NotificationAnalyticsQueryParams {
  // Time period
  start_date: string;
  end_date: string;
  
  // Grouping
  group_by?: 'type' | 'priority' | 'delivery_method' | 'facility' | 'day' | 'week' | 'month';
  
  // Filters
  types?: NotificationType[];
  facilities?: string[];
  delivery_methods?: DeliveryMethod[];
  priorities?: NotificationPriority[];
  
  // Metrics
  include_engagement_metrics?: boolean;
  include_delivery_metrics?: boolean;
  include_cost_metrics?: boolean;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Notification list response
 */
export interface NotificationListResponse {
  documents: AppwriteNotification[];
  total: number;
}

/**
 * Enhanced notification list response
 */
export interface EnhancedNotificationListResponse {
  documents: EnhancedNotification[];
  total: number;
}

/**
 * Notification with context list response
 */
export interface NotificationWithContextListResponse {
  documents: NotificationWithContext[];
  total: number;
}

/**
 * Notification template list response
 */
export interface NotificationTemplateListResponse {
  documents: NotificationTemplate[];
  total: number;
}

/**
 * Bulk notification creation response
 */
export interface BulkNotificationResponse {
  total_created: number;
  successful: number;
  failed: number;
  notification_ids: string[];
  errors?: Array<{
    recipient_id: string;
    error_message: string;
  }>;
}

// =============================================================================
// ANALYTICS AND REPORTING TYPES
// =============================================================================

/**
 * Notification analytics summary
 */
export interface NotificationAnalyticsSummary {
  time_period: {
    start_date: string;
    end_date: string;
  };
  
  // Volume metrics
  total_notifications: number;
  notifications_sent: number;
  notifications_delivered: number;
  notifications_failed: number;
  
  // Engagement metrics
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  engagement_rate: number;
  
  // Delivery metrics
  delivery_rate: number;
  average_delivery_time_minutes: number;
  delivery_success_by_method: Array<{
    delivery_method: DeliveryMethod;
    sent: number;
    delivered: number;
    success_rate: number;
  }>;
  
  // Type breakdown
  by_type: Array<{
    type: NotificationType;
    count: number;
    delivery_rate: number;
    engagement_rate: number;
  }>;
  
  // Priority breakdown
  by_priority: Array<{
    priority: NotificationPriority;
    count: number;
    average_delivery_time_minutes: number;
  }>;
  
  // Facility breakdown
  by_facility: Array<{
    facility_id: string;
    facility_name: string;
    count: number;
    delivery_rate: number;
  }>;
  
  // Cost metrics (if available)
  total_cost?: number;
  cost_per_notification?: number;
  cost_by_method?: Array<{
    delivery_method: DeliveryMethod;
    total_cost: number;
    cost_per_notification: number;
  }>;
}

/**
 * User notification summary
 */
export interface UserNotificationSummary {
  user_id: string;
  user_name: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  
  // Volume
  total_received: number;
  total_read: number;
  total_unread: number;
  
  // Engagement
  total_opened: number;
  total_clicked: number;
  actions_taken: number;
  
  // By type
  by_type: Array<{
    type: NotificationType;
    received: number;
    read: number;
    engagement_rate: number;
  }>;
  
  // By priority
  by_priority: Array<{
    priority: NotificationPriority;
    received: number;
    read: number;
    average_response_time_hours: number;
  }>;
  
  // Preferences compliance
  preferences_honored: number;
  preferences_violated: number;
  
  // Response patterns
  most_active_hours: number[];
  preferred_delivery_methods: DeliveryMethod[];
  average_response_time_hours: number;
}

/**
 * Notification campaign performance
 */
export interface NotificationCampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  campaign_type: NotificationType;
  
  // Timeline
  start_date: string;
  end_date: string;
  duration_days: number;
  
  // Targeting
  target_audience_size: number;
  actual_recipients: number;
  coverage_rate: number;
  
  // Delivery performance
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  
  // Engagement performance
  total_opened: number;
  total_clicked: number;
  total_actions: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  
  // Cost analysis
  total_cost?: number;
  cost_per_recipient?: number;
  cost_per_engagement?: number;
  
  // Effectiveness metrics
  goal_achievement_rate?: number;
  roi?: number;
  
  // Breakdown by segments
  performance_by_segment: Array<{
    segment_name: string;
    recipients: number;
    delivery_rate: number;
    engagement_rate: number;
    conversion_rate: number;
  }>;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Notification validation constraints
 */
export const NotificationValidationRules = {
  type: {
    required: true,
    max_length: 50
  },
  title: {
    required: true,
    min_length: 1,
    max_length: 200
  },
  message: {
    required: true,
    min_length: 1,
    max_length: 1000
  },
  priority: {
    required: true,
    options: ['low', 'normal', 'high', 'urgent', 'critical'] as const,
    default: 'normal'
  },
  status: {
    required: true,
    options: ['pending', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'expired'] as const,
    default: 'pending'
  },
  recipient_id: {
    max_length: 255,
    format: 'uuid'
  },
  facility_id: {
    max_length: 255,
    format: 'uuid'
  },
  delivery_method: {
    max_length: 50,
    options: ['email', 'sms', 'push', 'in_app', 'webhook'] as const
  },
  scheduled_for: {
    min_date: new Date() // Cannot schedule in the past
  }
} as const;

/**
 * Notification template validation constraints
 */
export const NotificationTemplateValidationRules = {
  name: {
    required: true,
    min_length: 2,
    max_length: 100
  },
  title_template: {
    required: true,
    min_length: 1,
    max_length: 200
  },
  message_template: {
    required: true,
    min_length: 1,
    max_length: 2000
  },
  variables: {
    max_items: 20,
    variable_name: {
      pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      max_length: 50
    }
  }
} as const;