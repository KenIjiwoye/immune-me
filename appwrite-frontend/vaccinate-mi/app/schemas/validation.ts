import { z } from 'zod';

// =============================================================================
// CLIENT-SIDE VALIDATION UTILITIES
// =============================================================================

// Common validation patterns
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number validation
export const phoneSchema = z.string().regex(phoneRegex, 'Invalid phone number format');

// Email validation
export const emailSchema = z.string().regex(emailRegex, 'Invalid email format');

// Date validation helpers
export const dateStringSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, 'Invalid date format');

export const futureDateSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed > new Date();
}, 'Date must be in the future');

export const pastDateSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed <= new Date();
}, 'Date cannot be in the future');

// Age validation
export const ageRangeSchema = z.string().refine((dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age >= 0 && age <= 120;
}, 'Age must be between 0 and 120 years');

// Business rule validation schemas
export const facilityContactSchema = z.object({
  contactPhone: z.string().optional(),
  contact_phone: z.string().optional(),
}).refine((data) => data.contactPhone || data.contact_phone, {
  message: 'Either contactPhone or contact_phone must be provided',
});

export const immunizationDateValidationSchema = z.object({
  administration_date: z.string(),
  expiry_date: z.string().optional(),
}).refine((data) => {
  if (data.expiry_date) {
    const adminDate = new Date(data.administration_date);
    const expiryDate = new Date(data.expiry_date);
    return expiryDate > adminDate;
  }
  return true;
}, {
  message: 'Expiry date must be after administration date',
});

export const campaignDateValidationSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
});

// Form validation helpers
export const createFormValidator = <T extends z.ZodSchema>(schema: T) => {
  return {
    validate: (data: unknown): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } => {
      const result = schema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((error) => {
          const path = error.path.join('.');
          errors[path] = error.message;
        });
        return { success: false, errors };
      }
    },

    validateField: (field: keyof z.infer<T>, value: unknown): string | null => {
      // This would require more complex schema manipulation
      // For now, return null (no field-level validation)
      return null;
    },
  };
};

// Real-time validation hooks helper
export const createValidationHook = <T extends z.ZodSchema>(schema: T) => {
  return {
    validateOnChange: (data: Partial<z.infer<T>>): Record<string, string> => {
      const errors: Record<string, string> = {};
      // Perform partial validation for real-time feedback
      Object.keys(data).forEach((key) => {
        // This is a simplified implementation
        // In a real app, you'd want more sophisticated field-level validation
      });
      return errors;
    },

    validateOnSubmit: (data: unknown): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } => {
      return createFormValidator(schema).validate(data);
    },
  };
};

// Data integrity validation functions
export const validateDataIntegrity = {
  // Check referential integrity
  checkReferentialIntegrity: async (data: any, collection: string): Promise<boolean> => {
    // This would typically make API calls to check if referenced entities exist
    // For now, just return true
    return true;
  },

  // Validate business rules
  validateBusinessRules: (data: any, collection: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (collection) {
      case 'patients':
        if (data.date_of_birth) {
          const age = new Date().getFullYear() - new Date(data.date_of_birth).getFullYear();
          if (age < 0 || age > 120) {
            errors.push('Patient age must be between 0 and 120 years');
          }
        }
        break;

      case 'immunization_records':
        if (data.administration_date && data.expiry_date) {
          if (new Date(data.expiry_date) <= new Date(data.administration_date)) {
            errors.push('Expiry date must be after administration date');
          }
        }
        break;

      case 'supplementary_immunizations':
        if (data.start_date && data.end_date) {
          if (new Date(data.end_date) <= new Date(data.start_date)) {
            errors.push('Campaign end date must be after start date');
          }
        }
        if (data.target_number && data.achieved_number > data.target_number) {
          errors.push('Achieved number cannot exceed target number');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  },

  // Validate permissions
  validatePermissions: (userRole: string, action: string, resource: string): boolean => {
    // This would check if the user has permission to perform the action
    // For now, just return true
    return true;
  },
};

// =============================================================================
// ENHANCED ERROR FORMATTING UTILITIES
// =============================================================================

/**
 * Enhanced error formatting utilities for better user experience
 */
export const errorFormatting = {
  /**
   * Format field-specific validation errors for form display
   */
  formatFieldErrors: (errors: Record<string, string>): Record<string, string> => {
    const formatted: Record<string, string> = {};

    Object.entries(errors).forEach(([field, message]) => {
      // Convert field names to user-friendly labels
      const fieldLabel = field
        .split('.')
        .map(part => part.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        .join(' ');

      formatted[field] = `${fieldLabel}: ${message}`;
    });

    return formatted;
  },

  /**
   * Create user-friendly error messages from technical errors
   */
  createUserMessage: (error: any, context?: string): string => {
    // Handle Zod validation errors
    if (error.errors) {
      const errorCount = error.errors.length;
      if (errorCount === 1) {
        return `Please correct the following error: ${error.errors[0].message}`;
      }
      return `Please correct the ${errorCount} validation errors below.`;
    }

    // Handle Appwrite errors
    if (error.code) {
      switch (error.code) {
        case 400:
          return 'Invalid data provided. Please check your input and try again.';
        case 401:
          return 'Your session has expired. Please log in again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested item was not found.';
        case 409:
          return 'This item has been modified by someone else. Please refresh and try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error occurred. Please try again later.';
        default:
          return error.message || 'An unexpected error occurred. Please try again.';
      }
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Default fallback
    return error.message || 'An unexpected error occurred. Please try again.';
  },

  /**
   * Group errors by severity for better display
   */
  groupErrorsBySeverity: (errors: Record<string, string>): {
    critical: Record<string, string>;
    warning: Record<string, string>;
    info: Record<string, string>;
  } => {
    const critical: Record<string, string> = {};
    const warning: Record<string, string> = {};
    const info: Record<string, string> = {};

    Object.entries(errors).forEach(([field, message]) => {
      // Simple heuristic: errors mentioning "required" are critical
      if (message.toLowerCase().includes('required') ||
          message.toLowerCase().includes('must') ||
          message.toLowerCase().includes('cannot be empty')) {
        critical[field] = message;
      }
      // Format errors are warnings
      else if (message.toLowerCase().includes('format') ||
               message.toLowerCase().includes('invalid')) {
        warning[field] = message;
      }
      // Everything else is info
      else {
        info[field] = message;
      }
    });

    return { critical, warning, info };
  },

  /**
   * Create summary message for multiple errors
   */
  createErrorSummary: (errors: Record<string, string>): string => {
    const errorCount = Object.keys(errors).length;

    if (errorCount === 0) return '';

    if (errorCount === 1) {
      return 'Please correct the error below.';
    }

    const criticalCount = Object.values(errors).filter(msg =>
      msg.toLowerCase().includes('required') ||
      msg.toLowerCase().includes('must')
    ).length;

    if (criticalCount > 0) {
      return `Please correct the ${errorCount} errors below, including ${criticalCount} required field${criticalCount > 1 ? 's' : ''}.`;
    }

    return `Please correct the ${errorCount} errors below.`;
  },

  /**
   * Sanitize error messages for security (remove sensitive information)
   */
  sanitizeErrorMessage: (message: string): string => {
    // Remove potential sensitive information
    return message
      .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CARD NUMBER]') // Credit cards
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[SSN]') // SSN
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
      .replace(/\b\d{10,15}\b/g, '[PHONE]'); // Phone numbers
  }
};

// Export validation result types
export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: Record<string, string> };
export type IntegrityCheckResult = { valid: boolean; errors: string[] };