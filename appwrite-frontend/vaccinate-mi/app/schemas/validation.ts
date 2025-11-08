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

// Export validation result types
export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: Record<string, string> };
export type IntegrityCheckResult = { valid: boolean; errors: string[] };