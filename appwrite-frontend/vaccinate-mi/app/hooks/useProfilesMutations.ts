import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { adminProfilesService } from '../services/adminProfilesService';
import { employeeProfilesService } from '../services/employeeProfilesService';
import { profileService } from '../services/profileService';
import type { AdminProfile, EmployeeProfile, PatientProfile } from '../types/appwrite';
import { DatabaseService } from '../services/appwriteDatabase';
import { COLLECTION_IDS } from '../services/appwrite';

// Query keys for profiles
export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...profileKeys.lists(), filters] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
  byUser: (userId: string) => [...profileKeys.all, 'user', userId] as const,
  byFacility: (facilityId: string) => [...profileKeys.all, 'facility', facilityId] as const,
  admin: () => [...profileKeys.all, 'admin'] as const,
  employee: () => [...profileKeys.all, 'employee'] as const,
  patient: () => [...profileKeys.all, 'patient'] as const,
};

/**
 * Admin Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateAdminProfile = () => {
  return useOptimisticCreate<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ]
  );
};

/**
 * Admin Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateAdminProfile = () => {
  return useOptimisticUpdate<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ]
  );
};

/**
 * Admin Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteAdminProfile = () => {
  return useOptimisticDelete<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ]
  );
};

/**
 * Employee Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateEmployeeProfile = () => {
  return useOptimisticCreate<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ]
  );
};

/**
 * Employee Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateEmployeeProfile = () => {
  return useOptimisticUpdate<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ]
  );
};

/**
 * Employee Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteEmployeeProfile = () => {
  return useOptimisticDelete<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ]
  );
};

/**
 * Patient Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreatePatientProfile = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useOptimisticCreate<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ]
  );
};

/**
 * Patient Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdatePatientProfile = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useOptimisticUpdate<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ]
  );
};

/**
 * Patient Profiles mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeletePatientProfile = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useOptimisticDelete<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ]
  );
};

/**
 * Enhanced admin profiles mutations with comprehensive error handling and rollback
 */
export const useCreateAdminProfileEnhanced = () => {
  return useEnhancedCreateMutation<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useUpdateAdminProfileEnhanced = () => {
  return useEnhancedUpdateMutation<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useDeleteAdminProfileEnhanced = () => {
  return useEnhancedDeleteMutation<AdminProfile>(
    adminProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.admin()], // Invalidate admin profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

/**
 * Enhanced employee profiles mutations with comprehensive error handling and rollback
 */
export const useCreateEmployeeProfileEnhanced = () => {
  return useEnhancedCreateMutation<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useUpdateEmployeeProfileEnhanced = () => {
  return useEnhancedUpdateMutation<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useDeleteEmployeeProfileEnhanced = () => {
  return useEnhancedDeleteMutation<EmployeeProfile>(
    employeeProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.employee()], // Invalidate employee profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

/**
 * Enhanced patient profiles mutations with comprehensive error handling and rollback
 */
export const useCreatePatientProfileEnhanced = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useEnhancedCreateMutation<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useUpdatePatientProfileEnhanced = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useEnhancedUpdateMutation<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useDeletePatientProfileEnhanced = () => {
  const patientProfilesService = new DatabaseService<PatientProfile>(COLLECTION_IDS.PATIENT_PROFILES);
  return useEnhancedDeleteMutation<PatientProfile>(
    patientProfilesService,
    [
      [...profileKeys.lists()],
      [...profileKeys.patient()], // Invalidate patient profiles
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

export default {
  useCreateAdminProfile,
  useUpdateAdminProfile,
  useDeleteAdminProfile,
  useCreateEmployeeProfile,
  useUpdateEmployeeProfile,
  useDeleteEmployeeProfile,
  useCreatePatientProfile,
  useUpdatePatientProfile,
  useDeletePatientProfile,
  useCreateAdminProfileEnhanced,
  useUpdateAdminProfileEnhanced,
  useDeleteAdminProfileEnhanced,
  useCreateEmployeeProfileEnhanced,
  useUpdateEmployeeProfileEnhanced,
  useDeleteEmployeeProfileEnhanced,
  useCreatePatientProfileEnhanced,
  useUpdatePatientProfileEnhanced,
  useDeletePatientProfileEnhanced,
};