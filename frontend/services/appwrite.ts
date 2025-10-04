/**
 * Appwrite Client Configuration
 * Initializes and configures Appwrite services for React Native
 */

import { Client, Account, Databases, Storage, Functions, Teams, Messaging, Query, ID } from 'react-native-appwrite';
import Constants from 'expo-constants';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

export const APPWRITE_CONFIG = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '68a6e04b002d20c10020',
  databaseId: '68beb588001a9f2d71dc',
  platform: 'com.immuneme.app',
} as const;

// Collection IDs from the backend configuration
export const COLLECTION_IDS = {
  // Core Collections
  FACILITIES: 'facilities',
  FACILITY: 'facility', // Legacy collection
  PATIENTS: 'patients',
  VACCINES: 'vaccines',
  IMMUNIZATION_RECORDS: 'immunization_records',
  
  // Notification System
  NOTIFICATIONS: 'notifications',
  
  // Supplementary Immunizations
  SUPPLEMENTARY_IMMUNIZATIONS: 'supplementary_immunizations',
  
  // Scheduling Collections
  VACCINE_SCHEDULES: 'vaccine_schedules',
  VACCINE_SCHEDULE_ITEMS: 'vaccine_schedule_items',
  
  // Profile Collections
  ADMIN_PROFILES: 'admin_profiles',
  EMPLOYEE_PROFILES: 'employee_profiles',
  PATIENT_PROFILES: 'patient_profiles',
  PROFILE_VERIFICATION_WORKFLOW: 'profile_verification_workflow',
  
  // Audit & Compliance Collections
  ACCESS_AUDIT_LOG: 'access_audit_log',
  AUDIT_COLLECTIONS: 'audit_collections',
  ROLE_CHANGE_LOG: 'role_change_log',
  SYNC_COLLECTIONS: 'sync_collections',
} as const;

// Storage bucket IDs
export const STORAGE_BUCKETS = {
  PATIENT_DOCUMENTS: 'patient-documents',
  VACCINE_IMAGES: 'vaccine-images',
  REPORTS: 'reports',
  PROFILE_IMAGES: 'profile-images',
} as const;

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Initialize Appwrite client with proper configuration
 */
function createAppwriteClient(): Client {
  const client = new Client();
  
  try {
    client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId)
      .setPlatform(APPWRITE_CONFIG.platform);
    
    console.log('✅ Appwrite client initialized successfully', {
      endpoint: APPWRITE_CONFIG.endpoint,
      projectId: APPWRITE_CONFIG.projectId,
      platform: APPWRITE_CONFIG.platform,
    });
    
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Appwrite client:', error);
    throw new Error(`Appwrite client initialization failed: ${error}`);
  }
}

// =============================================================================
// SERVICE INSTANCES
// =============================================================================

// Create client instance
export const client = createAppwriteClient();

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const teams = new Teams(client);
export const messaging = new Messaging(client);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if Appwrite client is properly configured
 */
export function isAppwriteConfigured(): boolean {
  try {
    return !!(
      APPWRITE_CONFIG.endpoint &&
      APPWRITE_CONFIG.projectId &&
      APPWRITE_CONFIG.databaseId
    );
  } catch (error) {
    console.error('❌ Appwrite configuration check failed:', error);
    return false;
  }
}

/**
 * Get current Appwrite configuration
 */
export function getAppwriteConfig() {
  return {
    ...APPWRITE_CONFIG,
    isConfigured: isAppwriteConfigured(),
    collections: COLLECTION_IDS,
    buckets: STORAGE_BUCKETS,
  };
}

/**
 * Validate environment variables
 */
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT) {
    errors.push('EXPO_PUBLIC_APPWRITE_ENDPOINT is not defined');
  }
  
  if (!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID) {
    errors.push('EXPO_PUBLIC_APPWRITE_PROJECT_ID is not defined');
  }
  
  // Validate endpoint format
  if (process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT && 
      !process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT.startsWith('http')) {
    errors.push('EXPO_PUBLIC_APPWRITE_ENDPOINT must be a valid URL');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Test Appwrite connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Test connection by getting account info (will fail if not authenticated, but connection works)
    await account.get();
    return { success: true };
  } catch (error: any) {
    // If error is about authentication, connection is working
    if (error.code === 401 || error.type === 'general_unauthorized_scope') {
      return { success: true };
    }
    
    console.error('❌ Appwrite connection test failed:', error);
    return { 
      success: false, 
      error: error.message || 'Connection test failed' 
    };
  }
}

/**
 * Log Appwrite errors with context
 */
export function logAppwriteError(error: any, context: string) {
  const errorInfo = {
    context,
    message: error.message,
    code: error.code,
    type: error.type,
    response: error.response,
    timestamp: new Date().toISOString(),
  };
  
  console.error('🔥 Appwrite Error:', errorInfo);
  
  // In production, you might want to send this to a logging service
  if (__DEV__) {
    console.table(errorInfo);
  }
}

/**
 * Handle Appwrite exceptions with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on authentication or authorization errors
      if (error.code === 401 || error.code === 403) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      console.warn(`⚠️ Appwrite operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

/**
 * Create standardized query parameters using Appwrite Query builder
 */
export function createQuery(params: {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderType?: 'ASC' | 'DESC';
  filters?: Array<{ field: string; operator: string; value: any }>;
}) {
  const queries: string[] = [];
  
  if (params.limit) {
    queries.push(Query.limit(params.limit));
  }
  
  if (params.offset) {
    queries.push(Query.offset(params.offset));
  }
  
  if (params.orderBy) {
    const orderType = params.orderType || 'ASC';
    if (orderType === 'ASC') {
      queries.push(Query.orderAsc(params.orderBy));
    } else {
      queries.push(Query.orderDesc(params.orderBy));
    }
  }
  
  if (params.filters) {
    params.filters.forEach(filter => {
      switch (filter.operator) {
        case 'equal':
          queries.push(Query.equal(filter.field, filter.value));
          break;
        case 'notEqual':
          queries.push(Query.notEqual(filter.field, filter.value));
          break;
        case 'lessThan':
          queries.push(Query.lessThan(filter.field, filter.value));
          break;
        case 'greaterThan':
          queries.push(Query.greaterThan(filter.field, filter.value));
          break;
        case 'search':
          queries.push(Query.search(filter.field, filter.value));
          break;
        default:
          queries.push(Query.equal(filter.field, filter.value));
      }
    });
  }
  
  return queries;
}

// =============================================================================
// INITIALIZATION CHECK
// =============================================================================

// Validate configuration on module load
const validation = validateEnvironment();
if (!validation.isValid) {
  console.error('❌ Appwrite configuration errors:', validation.errors);
  if (__DEV__) {
    console.warn('🔧 Please check your .env.local file and ensure all required environment variables are set');
  }
} else {
  console.log('✅ Appwrite configuration validated successfully');
}

// Export default client for backward compatibility
export default client;