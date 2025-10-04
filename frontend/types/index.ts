/**
 * Main Types Export File
 * Centralized exports for all TypeScript types in the immune-me frontend
 */

// =============================================================================
// CORE APPWRITE TYPES
// =============================================================================

// Export fresh types generated from Appwrite Cloud
export * from './appwrite.d';

// =============================================================================
// COLLECTION-SPECIFIC TYPES
// =============================================================================

// Patient and Patient Profile Types
export * from './collections/patients';

// Vaccine and Immunization Types
export * from './collections/vaccines';

// Facility Management Types
export * from './collections/facilities';

// Profile-Related Types (Admin, Employee, Patient Profiles)
export * from './collections/profiles';

// Audit and Compliance Types
export * from './collections/audit';

// Notification System Types
export * from './collections/notifications';

// =============================================================================
// LEGACY TYPES (for backward compatibility)
// =============================================================================

// Re-export specific legacy types to avoid conflicts
export type {
  Patient,
  PatientFormData,
  PatientWithRelations,
  ImmunizationRecord
} from './patient';

export type {
  User,
  UserWithProfile,
  BaseProfile,
  PatientProfile as LegacyPatientProfile,
  EmployeeProfile as LegacyEmployeeProfile,
  AdminProfile as LegacyAdminProfile,
  Profile,
  ProfileWithType,
  NotificationPreferences as LegacyNotificationPreferences,
  WorkSchedule,
  ContactInformation,
  TrainingRecord,
  PerformanceMetrics as LegacyPerformanceMetrics,
  ProfileResponse,
  ProfileListResponse,
  ProfileQueryParams as LegacyProfileQueryParams
} from './profile';

export type {
  ImmunizationFormData,
  Vaccine,
  CreateImmunizationResponse,
  ImmunizationRecord as LegacyImmunizationRecord,
  ImmunizationRecordWithProfile,
  EnhancedImmunizationFormData,
  ImmunizationQueryParams,
  ImmunizationAdministrator
} from './immunization';

export { validateImmunizationAdministrator } from './immunization';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

/**
 * Generic list response wrapper
 */
export interface ApiListResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
  success: boolean;
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Generic search parameters
 */
export interface SearchParams {
  search?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
}

/**
 * Generic query parameters combining pagination and search
 */
export interface QueryParams extends PaginationParams, SearchParams {}

/**
 * Form validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Form state for React forms
 */
export interface FormState<T = any> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string;
  lastUpdated?: string;
}

/**
 * Generic entity with common fields
 */
export interface BaseEntity {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// COMMON ENUMS
// =============================================================================

/**
 * Common status values used across the application
 */
export enum CommonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Common priority levels
 */
export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

/**
 * Common verification status
 */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  UNDER_REVIEW = 'under_review'
}

/**
 * Common approval status
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if an object is an Appwrite document
 */
export function isAppwriteDocument(obj: any): obj is BaseEntity {
  return obj && typeof obj === 'object' && '$id' in obj && '$createdAt' in obj && '$updatedAt' in obj;
}

/**
 * Type guard to check if a response is an API response
 */
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return obj && typeof obj === 'object' && 'success' in obj;
}

/**
 * Type guard to check if a response is an API list response
 */
export function isApiListResponse<T>(obj: any): obj is ApiListResponse<T> {
  return obj && typeof obj === 'object' && 'data' in obj && Array.isArray(obj.data) && 'meta' in obj;
}

// =============================================================================
// UTILITY FUNCTIONS TYPES
// =============================================================================

/**
 * Date formatting options
 */
export interface DateFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'full' | 'iso' | 'relative';
  timezone?: string;
  locale?: string;
}

/**
 * File upload progress
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

/**
 * File upload result
 */
export interface UploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
  metadata?: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
}

/**
 * Export/Import options
 */
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  fields?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
  includeHeaders?: boolean;
  filename?: string;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T = any> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  summary?: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
  };
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Application configuration
 */
export interface AppConfig {
  appwrite: {
    endpoint: string;
    projectId: string;
    databaseId: string;
  };
  features: {
    offlineMode: boolean;
    realTimeSync: boolean;
    biometricAuth: boolean;
    multiLanguage: boolean;
    darkMode: boolean;
  };
  limits: {
    maxFileSize: number;
    maxBulkOperations: number;
    sessionTimeout: number;
    maxRetries: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timezone: string;
  };
}

/**
 * User session information
 */
export interface UserSession {
  user: {
    $id: string;
    email: string;
    name: string;
    phone?: string;
    emailVerification: boolean;
    phoneVerification: boolean;
  };
  profile?: {
    type: 'admin' | 'employee' | 'patient';
    profileId: string;
    facilityId?: string;
    permissions: string[];
  };
  session: {
    $id: string;
    provider: string;
    providerUid: string;
    expire: string;
  };
  preferences: {
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: Record<string, boolean>;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Application error types
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Structured error information
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string | number;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  userId?: string;
  context?: {
    component: string;
    action: string;
    resource?: string;
  };
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkLatency?: number;
  errorRate: number;
  userSatisfactionScore?: number;
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  conditions?: {
    userTypes?: string[];
    facilities?: string[];
    regions?: string[];
    percentage?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Feature flags collection
 */
export interface FeatureFlags {
  [key: string]: FeatureFlag;
}

// =============================================================================
// THEME AND UI TYPES
// =============================================================================

/**
 * Theme configuration
 */
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}

// =============================================================================
// ACCESSIBILITY TYPES
// =============================================================================

/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  voiceControl: boolean;
  colorBlindnessType?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none';
}

// =============================================================================
// OFFLINE SUPPORT TYPES
// =============================================================================

/**
 * Offline sync status
 */
export interface OfflineSyncStatus {
  isOnline: boolean;
  lastSyncTime?: string;
  pendingChanges: number;
  syncInProgress: boolean;
  syncErrors: Array<{
    id: string;
    error: string;
    timestamp: string;
    retryCount: number;
  }>;
}

/**
 * Offline queue item
 */
export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  priority: number;
}