/**
 * Error Handling Utilities
 * Comprehensive error handling for report functions
 */

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: {
        code: 400,
        message: 'Invalid parameters provided',
        retryable: false
      },
      AUTHENTICATION_ERROR: {
        code: 401,
        message: 'Authentication failed',
        retryable: false
      },
      AUTHORIZATION_ERROR: {
        code: 403,
        message: 'Access denied',
        retryable: false
      },
      NOT_FOUND_ERROR: {
        code: 404,
        message: 'Resource not found',
        retryable: false
      },
      RATE_LIMIT_ERROR: {
        code: 429,
        message: 'Rate limit exceeded',
        retryable: true,
        retryDelay: 60000
      },
      DATABASE_ERROR: {
        code: 500,
        message: 'Database operation failed',
        retryable: true,
        retryDelay: 5000
      },
      CACHE_ERROR: {
        code: 500,
        message: 'Cache operation failed',
        retryable: true,
        retryDelay: 1000
      },
      MEMORY_ERROR: {
        code: 500,
        message: 'Memory limit exceeded',
        retryable: false
      },
      TIMEOUT_ERROR: {
        code: 504,
        message: 'Operation timed out',
        retryable: true,
        retryDelay: 1000
      },
      EXPORT_ERROR: {
        code: 500,
        message: 'Export generation failed',
        retryable: true,
        retryDelay: 2000
      },
      UNKNOWN_ERROR: {
        code: 500,
        message: 'An unexpected error occurred',
        retryable: false
      }
    };
  }

  /**
   * Create standardized error
   */
  createError(type, message = null, details = {}) {
    const errorType = this.errorTypes[type] || this.errorTypes.UNKNOWN_ERROR;
    
    const error = new Error(message || errorType.message);
    error.code = type;
    error.statusCode = errorType.code;
    error.retryable = errorType.retryable;
    error.retryDelay = errorType.retryDelay;
    error.details = details;
    error.timestamp = new Date().toISOString();
    
    return error;
  }

  /**
   * Handle Appwrite errors
   */
  handleAppwriteError(error) {
    let type = 'UNKNOWN_ERROR';
    let message = error.message;
    
    switch (error.code) {
      case 400:
        type = 'VALIDATION_ERROR';
        break;
      case 401:
        type = 'AUTHENTICATION_ERROR';
        break;
      case 403:
        type = 'AUTHORIZATION_ERROR';
        break;
      case 404:
        type = 'NOT_FOUND_ERROR';
        break;
      case 429:
        type = 'RATE_LIMIT_ERROR';
        break;
      case 500:
      case 502:
      case 503:
        type = 'DATABASE_ERROR';
        break;
      default:
        type = 'UNKNOWN_ERROR';
    }
    
    return this.createError(type, message, {
      originalError: error.message,
      code: error.code
    });
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors) {
    return this.createError('VALIDATION_ERROR', 'Validation failed', {
      errors: errors.map(err => ({
        field: err.field,
        message: err.message,
        value: err.value
      }))
    });
  }

  /**
   * Handle memory errors
   */
  handleMemoryError(usage) {
    return this.createError('MEMORY_ERROR', 'Memory limit exceeded', {
      usage: usage,
      limit: process.env.MEMORY_LIMIT_MB || 512
    });
  }

  /**
   * Handle timeout errors
   */
  handleTimeoutError(operation, timeout) {
    return this.createError('TIMEOUT_ERROR', `${operation} timed out`, {
      operation,
      timeout,
      unit: 'ms'
    });
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async retry(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!error.retryable || attempt === maxRetries) {
          throw error;
        }
        
        const delay = error.retryDelay || (initialDelay * Math.pow(2, attempt - 1));
        await this.sleep(delay);
        
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep utility for retries
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Error boundary wrapper
   */
  async withErrorBoundary(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Handle and format error response
   */
  handleError(error, context = {}) {
    const formattedError = {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        timestamp: error.timestamp || new Date().toISOString(),
        requestId: context.requestId || null
      }
    };

    // Include details in development
    if (process.env.NODE_ENV === 'development') {
      formattedError.error.details = error.details || {};
      formattedError.error.stack = error.stack;
    }

    // Log error
    console.error('Error occurred:', {
      ...formattedError.error,
      context
    });

    return formattedError;
  }

  /**
   * Error recovery strategies
   */
  async recoverFromError(error, recoveryOptions = {}) {
    const strategies = {
      DATABASE_ERROR: async () => {
        // Fallback to cache
        if (recoveryOptions.cacheFallback) {
          return await recoveryOptions.cacheFallback();
        }
        throw error;
      },
      
      CACHE_ERROR: async () => {
        // Skip cache and fetch directly
        if (recoveryOptions.directFetch) {
          return await recoveryOptions.directFetch();
        }
        throw error;
      },
      
      MEMORY_ERROR: async () => {
        // Reduce batch size or use streaming
        if (recoveryOptions.reduceBatchSize) {
          return await recoveryOptions.reduceBatchSize();
        }
        throw error;
      },
      
      TIMEOUT_ERROR: async () => {
        // Increase timeout or split operation
        if (recoveryOptions.splitOperation) {
          return await recoveryOptions.splitOperation();
        }
        throw error;
      }
    };

    const strategy = strategies[error.code];
    if (strategy) {
      try {
        return await strategy();
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError.message);
        throw error; // Re-throw original error
      }
    }

    throw error;
  }

  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker(operation, options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000
    } = options;

    let failures = 0;
    let lastFailureTime = null;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw this.createError('CIRCUIT_BREAKER_OPEN', 'Circuit breaker is open');
        }
      }

      try {
        const result = await operation(...args);
        
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= failureThreshold) {
          state = 'OPEN';
          console.error(`Circuit breaker opened after ${failures} failures`);
        }
        
        throw error;
      }
    };
  }

  /**
   * Health check with error handling
   */
  async healthCheck(checks) {
    const results = {};
    
    for (const [name, check] of Object.entries(checks)) {
      try {
        const result = await check();
        results[name] = {
          status: 'healthy',
          ...result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          code: error.code
        };
      }
    }
    
    return results;
  }

  /**
   * Error aggregation and reporting
   */
  async aggregateErrors(timeRange = '1h') {
    const cutoff = new Date(Date.now() - this.parseTimeRange(timeRange));
    
    return {
      timeRange,
      cutoff,
      errorCounts: {},
      topErrors: [],
      affectedFunctions: []
    };
  }

  parseTimeRange(range) {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = range.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour
    
    return parseInt(match[1]) * units[match[2]];
  }

  /**
   * Error rate limiting
   */
  createErrorRateLimiter(maxErrors = 10, windowMs = 60000) {
    const errors = [];
    
    return (error) => {
      const now = Date.now();
      
      // Remove old errors
      while (errors.length > 0 && errors[0] < now - windowMs) {
        errors.shift();
      }
      
      errors.push(now);
      
      if (errors.length > maxErrors) {
        throw this.createError('ERROR_RATE_LIMIT', 'Too many errors in short time period');
      }
      
      return error;
    };
  }

  /**
   * Safe JSON parsing
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return this.createError('JSON_PARSE_ERROR', 'Invalid JSON format', {
        originalError: error.message
      });
    }
  }

  /**
   * Validate and sanitize input
   */
  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: Object.keys(this.errorTypes).length,
      retryableErrors: Object.values(this.errorTypes).filter(e => e.retryable).length,
      errorTypes: Object.keys(this.errorTypes)
    };
  }
}

module.exports = new ErrorHandler();