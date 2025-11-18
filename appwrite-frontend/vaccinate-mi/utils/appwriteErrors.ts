/**
 * Appwrite Error Handling System
 * Comprehensive error management for Appwrite operations including logging,
 * retry logic, offline detection, and user-friendly error messages.
 */

import { AppwriteException } from 'react-native-appwrite';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface AppwriteError extends AppwriteException {
  context?: string;
  timestamp?: string;
  retryCount?: number;
  isOffline?: boolean;
  userMessage?: string;
  category?: ErrorCategory;
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  RATE_LIMIT = 'rate_limit',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: number[];
}

export interface ErrorReport {
  error: AppwriteError;
  context: string;
  userAgent: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [500, 502, 503, 504, 408, 429] // Server errors, timeout, rate limit
};

const ERROR_MESSAGES: Record<ErrorCategory, Record<string, string>> = {
  [ErrorCategory.NETWORK]: {
    default: 'Network connection error. Please check your internet connection and try again.',
    'ENOTFOUND': 'Unable to connect to the server. Please check your internet connection.',
    'ECONNREFUSED': 'Connection refused by the server. Please try again later.',
    'ETIMEDOUT': 'Request timed out. Please check your connection and try again.'
  },
  [ErrorCategory.AUTHENTICATION]: {
    default: 'Authentication failed. Please log in again.',
    'user_invalid_credentials': 'Invalid email or password. Please check your credentials.',
    'user_session_not_found': 'Your session has expired. Please log in again.',
    'user_oauth2_bad_request': 'OAuth authentication failed. Please try again.'
  },
  [ErrorCategory.AUTHORIZATION]: {
    default: 'You do not have permission to perform this action.',
    'user_unauthorized': 'Access denied. Please contact your administrator.',
    'document_insufficient_permissions': 'Insufficient permissions to access this resource.'
  },
  [ErrorCategory.VALIDATION]: {
    default: 'Invalid data provided. Please check your input and try again.',
    'document_invalid_structure': 'Invalid data format. Please check your input.',
    'validation_error': 'Validation failed. Please correct the errors and try again.'
  },
  [ErrorCategory.SERVER]: {
    default: 'Server error occurred. Please try again later.',
    'general_server_error': 'An unexpected server error occurred. Please try again.',
    'general_database_error': 'Database error. Please try again later.'
  },
  [ErrorCategory.RATE_LIMIT]: {
    default: 'Too many requests. Please wait a moment and try again.',
    'general_rate_limit_exceeded': 'Rate limit exceeded. Please wait before making more requests.'
  },
  [ErrorCategory.OFFLINE]: {
    default: 'You are currently offline. Please check your internet connection.',
    'offline': 'No internet connection available. Please connect to the internet and try again.'
  },
  [ErrorCategory.UNKNOWN]: {
    default: 'An unexpected error occurred. Please try again or contact support.'
  }
};

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify Appwrite error based on code and type
 */
export function classifyError(error: any): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;

  const code = error.code;
  const type = error.type;

  // Network errors
  if (code >= 500 && code < 600) return ErrorCategory.SERVER;
  if (code === 408 || code === 429) return ErrorCategory.RATE_LIMIT;
  if (code === 401) return ErrorCategory.AUTHENTICATION;
  if (code === 403) return ErrorCategory.AUTHORIZATION;
  if (code >= 400 && code < 500) return ErrorCategory.VALIDATION;

  // Type-based classification
  if (type) {
    if (type.includes('auth') || type.includes('session')) return ErrorCategory.AUTHENTICATION;
    if (type.includes('permission') || type.includes('unauthorized')) return ErrorCategory.AUTHORIZATION;
    if (type.includes('validation') || type.includes('invalid')) return ErrorCategory.VALIDATION;
    if (type.includes('server') || type.includes('database')) return ErrorCategory.SERVER;
    if (type.includes('rate_limit')) return ErrorCategory.RATE_LIMIT;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  const category = classifyError(error);
  const errorType = error.type || 'default';

  const categoryMessages = ERROR_MESSAGES[category];
  return categoryMessages[errorType] || categoryMessages.default || ERROR_MESSAGES[ErrorCategory.UNKNOWN].default;
}

// =============================================================================
// OFFLINE DETECTION AND HANDLING
// =============================================================================

/**
 * Check current network connection status
 * Note: This is a simplified implementation. For production apps,
 * consider installing @react-native-community/netinfo or expo-network
 */
export async function checkConnectionStatus(): Promise<ConnectionStatus> {
  // Simplified implementation - assumes online unless network errors occur
  // In a real implementation, you'd use NetInfo or similar library
  return {
    isConnected: true, // Assume connected unless proven otherwise
    isInternetReachable: true,
    type: 'unknown',
    details: null
  };
}

/**
 * Check if device is offline
 * This is a simplified check that relies on error patterns rather than direct network detection
 */
export async function isOffline(): Promise<boolean> {
  // For now, we'll determine offline status based on error patterns
  // In a real implementation, you'd check actual network status
  return false; // Assume online unless network errors indicate otherwise
}

/**
 * Enhanced connection test with detailed status
 */
export async function testAppwriteConnection(): Promise<{
  success: boolean;
  error?: string;
  isOffline: boolean;
  connectionDetails?: ConnectionStatus;
}> {
  try {
    const connectionStatus = await checkConnectionStatus();

    // Test Appwrite connectivity by attempting a simple operation
    // This would need to be imported from the appwrite service
    // For now, we'll assume it's available
    const { account } = await import('../services/appwrite');

    try {
      await account.get();
      return {
        success: true,
        isOffline: false,
        connectionDetails: connectionStatus
      };
    } catch (error: any) {
      // If error is about authentication, connection is working
      if (error.code === 401 || error.type === 'general_unauthorized_scope') {
        return {
          success: true,
          isOffline: false,
          connectionDetails: connectionStatus
        };
      }

      // Check if it's a network-related error
      const category = classifyError(error);
      const isOfflineError = category === ErrorCategory.NETWORK ||
                            category === ErrorCategory.OFFLINE ||
                            error.code === 0; // Custom offline code

      return {
        success: false,
        error: error.message || 'Connection test failed',
        isOffline: isOfflineError,
        connectionDetails: connectionStatus
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
      isOffline: true
    };
  }
}

// =============================================================================
// ERROR LOGGING UTILITY
// =============================================================================

/**
 * Enhanced error logging with categorization and context
 */
export function logAppwriteError(
  error: any,
  context: string,
  additionalData?: Record<string, any>
): AppwriteError {
  const category = classifyError(error);
  const timestamp = new Date().toISOString();
  const isOffline = error.isOffline !== undefined ? error.isOffline : false;

  const enhancedError: AppwriteError = {
    ...error,
    context,
    timestamp,
    category,
    isOffline,
    userMessage: getUserFriendlyMessage(error),
    retryCount: error.retryCount || 0
  };

  const logData = {
    context,
    category,
    message: error.message,
    code: error.code,
    type: error.type,
    timestamp,
    isOffline,
    userMessage: enhancedError.userMessage,
    retryCount: enhancedError.retryCount,
    stack: error.stack,
    response: error.response,
    ...additionalData
  };

  console.error('🔥 Appwrite Error:', logData);

  if (__DEV__) {
    console.table({
      Context: context,
      Category: category,
      Code: error.code,
      Type: error.type,
      Message: error.message,
      'User Message': enhancedError.userMessage,
      Offline: isOffline,
      Timestamp: timestamp
    });
  }

  return enhancedError;
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

/**
 * Enhanced retry function with exponential backoff and offline detection
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'unknown'
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  let currentDelay = retryConfig.baseDelay;

  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      // Check if offline before attempting operation
      if (await isOffline()) {
        throw {
          code: 0,
          type: 'offline',
          message: 'Device is offline',
          isOffline: true,
          category: ErrorCategory.OFFLINE
        };
      }

      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      error.retryCount = attempt - 1;

      const category = classifyError(error);

      // Don't retry on non-retryable errors
      if (!retryConfig.retryableErrors.includes(error.code) &&
          category !== ErrorCategory.NETWORK &&
          category !== ErrorCategory.OFFLINE &&
          error.code !== 401 &&
          error.code !== 403) {
        break;
      }

      // Don't retry on the last attempt
      if (attempt > retryConfig.maxRetries) {
        break;
      }

      // Log retry attempt
      console.warn(`⚠️ Appwrite operation failed (attempt ${attempt}/${retryConfig.maxRetries + 1}):`, {
        context,
        error: error.message,
        code: error.code,
        category,
        willRetry: true,
        nextDelay: currentDelay
      });

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }

  // Log final failure
  logAppwriteError(lastError, `${context} (after ${retryConfig.maxRetries + 1} attempts)`, {
    maxRetries: retryConfig.maxRetries,
    finalDelay: currentDelay
  });

  throw lastError;
}

// =============================================================================
// ERROR REPORTING UTILITIES
// =============================================================================

/**
 * Generate error report for external reporting services
 */
export function generateErrorReport(
  error: AppwriteError,
  context: string,
  additionalData?: Record<string, any>
): ErrorReport {
  return {
    error,
    context,
    userAgent: 'React Native Appwrite Client',
    timestamp: error.timestamp || new Date().toISOString(),
    sessionId: additionalData?.sessionId,
    userId: additionalData?.userId,
    additionalData
  };
}

/**
 * Report error to external service (placeholder for implementation)
 */
export async function reportError(
  error: AppwriteError,
  context: string,
  additionalData?: Record<string, any>
): Promise<boolean> {
  try {
    const report = generateErrorReport(error, context, additionalData);

    // In development, just log the report
    if (__DEV__) {
      console.log('📊 Error Report Generated:', report);
      return true;
    }

    // TODO: Implement actual error reporting service
    // Examples: Sentry, LogRocket, Firebase Crashlytics, etc.
    // await errorReportingService.send(report);

    return true;
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
    return false;
  }
}

/**
 * Batch error reporting for multiple errors
 */
export async function reportErrors(
  errors: { error: AppwriteError; context: string; additionalData?: Record<string, any> }[]
): Promise<{ success: boolean; failedCount: number }> {
  let failedCount = 0;

  for (const { error, context, additionalData } of errors) {
    const success = await reportError(error, context, additionalData);
    if (!success) failedCount++;
  }

  return {
    success: failedCount === 0,
    failedCount
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wrap Appwrite operation with comprehensive error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  options: {
    retry?: Partial<RetryConfig>;
    reportError?: boolean;
    additionalData?: Record<string, any>;
  } = {}
): Promise<T> {
  try {
    if (options.retry) {
      return await withRetry(operation, options.retry, context);
    }
    return await operation();
  } catch (error: any) {
    const enhancedError = logAppwriteError(error, context, options.additionalData);

    if (options.reportError) {
      await reportError(enhancedError, context, options.additionalData);
    }

    throw enhancedError;
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const category = classifyError(error);
  return DEFAULT_RETRY_CONFIG.retryableErrors.includes(error.code) ||
         category === ErrorCategory.NETWORK ||
         category === ErrorCategory.OFFLINE;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  const category = classifyError(error);

  switch (category) {
    case ErrorCategory.OFFLINE:
    case ErrorCategory.NETWORK:
      return 'medium';
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      return 'high';
    case ErrorCategory.SERVER:
    case ErrorCategory.RATE_LIMIT:
      return 'medium';
    case ErrorCategory.VALIDATION:
      return 'low';
    default:
      return 'medium';
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DEFAULT_RETRY_CONFIG,
  ERROR_MESSAGES
};

export default {
  classifyError,
  getUserFriendlyMessage,
  checkConnectionStatus,
  isOffline,
  testAppwriteConnection,
  logAppwriteError,
  withRetry,
  generateErrorReport,
  reportError,
  reportErrors,
  withErrorHandling,
  isRetryableError,
  getErrorSeverity
};