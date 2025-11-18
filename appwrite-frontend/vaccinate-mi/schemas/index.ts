import { z } from 'zod';

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

// Core collections
export * from './facility';
export * from './patient';
export * from './vaccine';
export * from './immunizationRecord';

// Notification system
export * from './notification';

// Supplementary immunizations
export * from './supplementaryImmunization';

// Scheduling collections
export * from './vaccineSchedule';
export * from './vaccineScheduleItem';

// Profile collections
export * from './adminProfile';
export * from './employeeProfile';
export * from './patientProfile';
export * from './profileVerificationWorkflow';

// Audit & compliance collections
export * from './accessAuditLog';
export * from './roleChangeLog';

// Validation utilities
export * from './validation';
export type { IntegrityCheckResult } from './integrity';
export { dataIntegrityChecks, batchIntegrityChecks } from './integrity';

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

// Common validation patterns
export const phoneRegex = /^\+?[1-9]\d{1,14}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reusable validation functions
export const validateDateString = (dateString: string): boolean => {
  const parsed = new Date(dateString);
  return !isNaN(parsed.getTime());
};

export const validateFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date > new Date();
};

export const validatePastDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date <= new Date();
};

export const validateDateRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end > start;
};

// Business rule validation functions
export const validatePatientAge = (dateOfBirth: string): boolean => {
  const birthDate = new Date(dateOfBirth);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age >= 0 && age <= 120;
};

export const validateLicenseExpiry = (expiryDate: string): boolean => {
  const expiry = new Date(expiryDate);
  return expiry > new Date();
};

export const validateFacilityContact = (contactPhone?: string, contact_phone?: string): boolean => {
  return !!(contactPhone || contact_phone);
};

// Schema validation helpers
export const safeParseSchema = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
};

export const validateAndTransform = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Data integrity checks
export const validateRelationships = {
  // Check if patient exists for immunization record
  immunizationPatientExists: (patientId: string, facilityId: string): boolean => {
    // This would typically call a service to check existence
    // For now, just validate the IDs are non-empty
    return !!(patientId && facilityId);
  },

  // Check if vaccine exists for immunization record
  immunizationVaccineExists: (vaccineId: string): boolean => {
    // This would typically call a service to check existence
    return !!vaccineId;
  },

  // Check if facility exists
  facilityExists: (facilityId: string): boolean => {
    // This would typically call a service to check existence
    return !!facilityId;
  },

  // Check if user profile exists
  userProfileExists: (userId: string, profileType: 'admin' | 'employee' | 'patient'): boolean => {
    // This would typically call a service to check existence
    return !!(userId && profileType);
  },
};

// Export common types
export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: z.ZodError };
export type SchemaValidationError = z.ZodError;