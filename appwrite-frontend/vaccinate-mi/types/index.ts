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

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface User {
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
}

export interface Session {
  $id: string;
  $createdAt: string;
  userId: string;
  expire: string;
  provider: string;
  providerUid: string;
  providerToken: string;
  ip: string;
  osCode: string;
  osName: string;
  osVersion: string;
  clientType: string;
  clientCode: string;
  clientName: string;
  clientVersion: string;
  clientEngine: string;
  clientEngineVersion: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  countryCode: string;
  countryName: string;
  current: boolean;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface PasswordResetData {
  email: string;
  url?: string;
}

export interface OAuthProvider {
  name: string;
  key: string;
  enabled: boolean;
}

// =============================================================================
// NAVIGATION TYPES
// =============================================================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProfileSetup: { profileType: 'admin' | 'employee' | 'patient' };
  VerificationPending: { profileId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { userId: string; secret: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Immunizations: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type PatientsStackParamList = {
  PatientList: undefined;
  PatientDetails: { patientId: string };
  AddPatient: undefined;
  EditPatient: { patientId: string };
};

export type ImmunizationsStackParamList = {
  ImmunizationList: undefined;
  ImmunizationDetails: { recordId: string };
  AdministerVaccine: { patientId: string };
  VaccineInventory: undefined;
};

export type ReportsStackParamList = {
  ReportList: undefined;
  ReportDetails: { reportId: string };
  GenerateReport: { reportType: string };
};

export type SettingsStackParamList = {
  Profile: undefined;
  Notifications: undefined;
  Security: undefined;
  About: undefined;
};

export interface NavigationState {
  index: number;
  routes: Array<{
    name: string;
    params?: Record<string, any>;
  }>;
}

// =============================================================================
// FORM VALIDATION TYPES
// =============================================================================

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
  warnings?: string[];
}

export interface FormField<T = any> {
  name: string;
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
  disabled?: boolean;
}

export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  submitCount: number;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, formValues?: Record<string, any>) => string | null;
}

export interface FormConfig {
  fields: Record<string, ValidationRule>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// =============================================================================
// COMMON UI TYPES
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  loading: boolean;
  success: boolean;
}

// =============================================================================
// API RESPONSE TYPES (FE-AW-03.5)
// =============================================================================

// Standardized API Response Format
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  meta?: ApiMeta;
  timestamp: string;
  requestId: string;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  filters?: Record<string, any>;
  sorts?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  totalCount?: number;
  executionTime?: number;
}

// Error Response Types
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError extends ApiError {
  field: string;
  value?: any;
  constraints?: Record<string, any>;
}

export interface AppwriteApiError {
  code: number;
  type: string;
  message: string;
  response?: any;
}

// Pagination Response Types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface PaginatedResponse<T = any> extends StandardApiResponse<T[]> {
  meta: ApiMeta & {
    pagination: PaginationMeta;
  };
}

export interface CursorPaginatedResponse<T = any> extends StandardApiResponse<T[]> {
  meta: ApiMeta & {
    pagination: {
      cursor?: string;
      hasNext: boolean;
      hasPrev: boolean;
      limit: number;
      total?: number;
    };
  };
}

// Real-time Event Types
export interface RealtimeEvent<T = any> {
  eventType: string;
  collection: string;
  documentId: string;
  data: T;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export type RealtimeEventType =
  | 'document.create'
  | 'document.update'
  | 'document.delete'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'session.create'
  | 'session.delete'
  | 'file.create'
  | 'file.update'
  | 'file.delete';

export interface RealtimeSubscription {
  channel: string;
  eventTypes: RealtimeEventType[];
  filters?: Record<string, any>;
}

export interface RealtimeEventHandler<T = any> {
  (event: RealtimeEvent<T>): void;
}

// CRUD Operation Response Types
export interface CreateResponse<T = any> extends StandardApiResponse<T> {
  data: T;
}

export interface UpdateResponse<T = any> extends StandardApiResponse<T> {
  data: T;
}

export interface DeleteResponse extends StandardApiResponse<null> {
  data: null;
}

export interface ListResponse<T = any> extends PaginatedResponse<T> {
  data: T[];
}

export interface GetResponse<T = any> extends StandardApiResponse<T> {
  data: T;
}

// Batch Operation Response Types
export interface BatchOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  operationId?: string;
}

export interface BatchResponse<T = any> extends StandardApiResponse<BatchOperationResult<T>[]> {
  data: BatchOperationResult<T>[];
  meta: ApiMeta & {
    successful: number;
    failed: number;
    total: number;
  };
}

// Authentication Response Types
export interface AuthResponse extends StandardApiResponse<{
  user: User;
  session: Session;
}> {
  data: {
    user: User;
    session: Session;
  };
}

export interface TokenResponse extends StandardApiResponse<{
  token: string;
  expiresAt: string;
}> {
  data: {
    token: string;
    expiresAt: string;
  };
}

// File Upload Response Types
export interface UploadResponse extends StandardApiResponse<{
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}> {
  data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
  };
}

// Search Response Types
export interface SearchResponse<T = any> extends PaginatedResponse<T> {
  data: T[];
  meta: ApiMeta & {
    pagination: PaginationMeta;
    search: {
      query: string;
      totalMatches: number;
      searchTime: number;
    };
  };
}

// Health Check Response Types
export interface HealthCheckResponse extends StandardApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
  }>;
  timestamp: string;
}> {
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      error?: string;
    }>;
    timestamp: string;
  };
}

// Re-export Appwrite document types
export * from './appwrite';

// Re-export Profile types
export * from './profile';