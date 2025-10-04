/**
 * Centralized Configuration Management
 * Handles environment variables, database IDs, and application settings
 */

import Constants from 'expo-constants';
import { APPWRITE_CONFIG, COLLECTION_IDS, STORAGE_BUCKETS } from './appwrite';
import type { AppConfig } from '../types';

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * Environment variables with fallbacks
 */
export const ENV = {
  // Appwrite Configuration
  APPWRITE_ENDPOINT: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '68a6e04b002d20c10020',
  APPWRITE_DATABASE_ID: '68beb588001a9f2d71dc',
  
  // API Configuration
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://short-aliens-tan.loca.lt/api',
  
  // App Configuration
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'ImmuneMe',
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
  
  // Development flags
  IS_DEV: __DEV__,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Feature flags
  ENABLE_OFFLINE_MODE: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
  ENABLE_REALTIME_SYNC: process.env.EXPO_PUBLIC_ENABLE_REALTIME_SYNC !== 'false', // Default true
  ENABLE_BIOMETRIC_AUTH: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true',
  ENABLE_MULTI_LANGUAGE: process.env.EXPO_PUBLIC_ENABLE_MULTI_LANGUAGE === 'true',
  ENABLE_DARK_MODE: process.env.EXPO_PUBLIC_ENABLE_DARK_MODE !== 'false', // Default true
} as const;

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

/**
 * Database and collection configuration
 */
export const DATABASE_CONFIG = {
  databaseId: ENV.APPWRITE_DATABASE_ID,
  collections: COLLECTION_IDS,
  buckets: STORAGE_BUCKETS,
} as const;

// =============================================================================
// APPLICATION LIMITS
// =============================================================================

/**
 * Application limits and constraints
 */
export const LIMITS = {
  // File upload limits
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_DOCUMENT_SIZE_MB: 25,
  
  // Pagination limits
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  
  // Bulk operations
  MAX_BULK_OPERATIONS: 50,
  
  // Session and timeout
  SESSION_TIMEOUT_MINUTES: 60,
  IDLE_TIMEOUT_MINUTES: 30,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Search and query
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_RESULTS: 50,
  
  // Notifications
  MAX_NOTIFICATIONS_DISPLAY: 10,
  NOTIFICATION_RETENTION_DAYS: 30,
} as const;

// =============================================================================
// UI CONFIGURATION
// =============================================================================

/**
 * UI configuration and defaults
 */
export const UI_CONFIG = {
  // Theme settings
  DEFAULT_THEME: 'light' as const,
  AVAILABLE_THEMES: ['light', 'dark', 'auto'] as const,
  
  // Language settings
  DEFAULT_LANGUAGE: 'en',
  AVAILABLE_LANGUAGES: ['en', 'fr', 'es'] as const,
  
  // Date and time
  DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
  DEFAULT_TIME_FORMAT: 'HH:mm',
  DEFAULT_TIMEZONE: 'UTC',
  
  // Animation and transitions
  ANIMATION_DURATION_MS: 300,
  LOADING_DELAY_MS: 500,
  
  // Layout
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 80,
  SAFE_AREA_PADDING: 16,
} as const;

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Security settings and policies
 */
export const SECURITY_CONFIG = {
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: false,
  
  // Session security
  ENABLE_SESSION_ENCRYPTION: true,
  SESSION_STORAGE_KEY: 'immuneme_session',
  
  // Biometric authentication
  BIOMETRIC_PROMPT_TITLE: 'Authenticate',
  BIOMETRIC_PROMPT_SUBTITLE: 'Use your biometric to access the app',
  BIOMETRIC_FALLBACK_TITLE: 'Use Password',
  
  // API security
  API_TIMEOUT_MS: 30000,
  ENABLE_REQUEST_SIGNING: false,
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for enabling/disabling functionality
 */
export const FEATURE_FLAGS = {
  // Core features
  OFFLINE_MODE: ENV.ENABLE_OFFLINE_MODE,
  REALTIME_SYNC: ENV.ENABLE_REALTIME_SYNC,
  BIOMETRIC_AUTH: ENV.ENABLE_BIOMETRIC_AUTH,
  MULTI_LANGUAGE: ENV.ENABLE_MULTI_LANGUAGE,
  DARK_MODE: ENV.ENABLE_DARK_MODE,
  
  // Advanced features
  ADVANCED_SEARCH: true,
  BULK_OPERATIONS: true,
  EXPORT_FUNCTIONALITY: true,
  ANALYTICS_TRACKING: !ENV.IS_DEV,
  ERROR_REPORTING: !ENV.IS_DEV,
  
  // Experimental features
  VOICE_COMMANDS: false,
  AI_SUGGESTIONS: false,
  PREDICTIVE_TEXT: false,
} as const;

// =============================================================================
// NOTIFICATION CONFIGURATION
// =============================================================================

/**
 * Notification settings and types
 */
export const NOTIFICATION_CONFIG = {
  // Default preferences
  DEFAULT_PREFERENCES: {
    immunization_reminders: true,
    appointment_reminders: true,
    system_alerts: true,
    marketing_updates: false,
    security_alerts: true,
  },
  
  // Notification types
  TYPES: {
    IMMUNIZATION_DUE: 'immunization_due',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    SYSTEM_ALERT: 'system_alert',
    SECURITY_ALERT: 'security_alert',
    MARKETING_UPDATE: 'marketing_update',
  },
  
  // Priority levels
  PRIORITIES: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
    CRITICAL: 'critical',
  },
} as const;

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * API endpoint configuration
 */
export const API_ENDPOINTS = {
  BASE_URL: ENV.API_URL,
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh-token',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ACTIVITY: '/dashboard/recent-activity',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    PREFERENCES: '/notifications/preferences',
  },
  
  // Reports
  REPORTS: {
    GENERATE: '/reports/generate',
    LIST: '/reports',
    DOWNLOAD: '/reports/:id/download',
  },
} as const;

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Validation rules for forms and data
 */
export const VALIDATION_RULES = {
  // User validation
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 255,
  },
  
  PHONE: {
    PATTERN: /^\+?[\d\s\-\(\)]+$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 20,
  },
  
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z\s\-'\.]+$/,
  },
  
  // Patient validation
  PATIENT_ID: {
    PATTERN: /^[A-Z0-9\-]+$/,
    MIN_LENGTH: 5,
    MAX_LENGTH: 20,
  },
  
  // Vaccine validation
  BATCH_NUMBER: {
    PATTERN: /^[A-Z0-9\-]+$/,
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  
  // File validation
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

// =============================================================================
// COMPLETE APP CONFIGURATION
// =============================================================================

/**
 * Complete application configuration object
 */
export const APP_CONFIG: AppConfig = {
  appwrite: {
    endpoint: ENV.APPWRITE_ENDPOINT,
    projectId: ENV.APPWRITE_PROJECT_ID,
    databaseId: ENV.APPWRITE_DATABASE_ID,
  },
  
  features: {
    offlineMode: FEATURE_FLAGS.OFFLINE_MODE,
    realTimeSync: FEATURE_FLAGS.REALTIME_SYNC,
    biometricAuth: FEATURE_FLAGS.BIOMETRIC_AUTH,
    multiLanguage: FEATURE_FLAGS.MULTI_LANGUAGE,
    darkMode: FEATURE_FLAGS.DARK_MODE,
  },
  
  limits: {
    maxFileSize: LIMITS.MAX_FILE_SIZE_MB * 1024 * 1024, // Convert to bytes
    maxBulkOperations: LIMITS.MAX_BULK_OPERATIONS,
    sessionTimeout: LIMITS.SESSION_TIMEOUT_MINUTES * 60 * 1000, // Convert to ms
    maxRetries: LIMITS.MAX_RETRIES,
  },
  
  ui: {
    theme: UI_CONFIG.DEFAULT_THEME,
    language: UI_CONFIG.DEFAULT_LANGUAGE,
    dateFormat: UI_CONFIG.DEFAULT_DATE_FORMAT,
    timezone: UI_CONFIG.DEFAULT_TIMEZONE,
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get configuration value with fallback
 */
export function getConfig<T>(key: string, fallback: T): T {
  try {
    const value = process.env[key];
    if (value === undefined) return fallback;
    
    // Try to parse as JSON for complex types
    if (typeof fallback === 'object') {
      return JSON.parse(value) as T;
    }
    
    // Convert string to appropriate type
    if (typeof fallback === 'boolean') {
      return (value.toLowerCase() === 'true') as unknown as T;
    }
    
    if (typeof fallback === 'number') {
      return Number(value) as unknown as T;
    }
    
    return value as unknown as T;
  } catch (error) {
    console.warn(`Failed to parse config value for ${key}, using fallback:`, fallback);
    return fallback;
  }
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Get API endpoint URL
 */
export function getApiEndpoint(endpoint: string): string {
  return `${API_ENDPOINTS.BASE_URL}${endpoint}`;
}

/**
 * Validate configuration on app start
 */
export function validateConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required environment variables
  if (!ENV.APPWRITE_ENDPOINT) {
    errors.push('APPWRITE_ENDPOINT is required');
  }
  
  if (!ENV.APPWRITE_PROJECT_ID) {
    errors.push('APPWRITE_PROJECT_ID is required');
  }
  
  if (!ENV.APPWRITE_DATABASE_ID) {
    errors.push('APPWRITE_DATABASE_ID is required');
  }
  
  // Validate URL formats
  try {
    new URL(ENV.APPWRITE_ENDPOINT);
  } catch {
    errors.push('APPWRITE_ENDPOINT must be a valid URL');
  }
  
  try {
    new URL(ENV.API_URL);
  } catch {
    errors.push('API_URL must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    appName: ENV.APP_NAME,
    appVersion: ENV.APP_VERSION,
    isDevelopment: ENV.IS_DEV,
    isProduction: ENV.IS_PRODUCTION,
    platform: Constants.platform,
    expoVersion: Constants.expoVersion,
    appwriteEndpoint: ENV.APPWRITE_ENDPOINT,
    apiUrl: ENV.API_URL,
    features: FEATURE_FLAGS,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  ENV,
  DATABASE_CONFIG,
  LIMITS,
  UI_CONFIG,
  SECURITY_CONFIG,
  FEATURE_FLAGS,
  NOTIFICATION_CONFIG,
  API_ENDPOINTS,
  VALIDATION_RULES,
  APP_CONFIG,
  getConfig,
  isFeatureEnabled,
  getApiEndpoint,
  validateConfiguration,
  getEnvironmentInfo,
};