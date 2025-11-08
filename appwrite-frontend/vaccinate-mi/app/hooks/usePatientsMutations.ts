import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { patientsService } from '../services/patientsService';
import type { Patient } from '../types/appwrite';

// Query keys for patients
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  byFacility: (facilityId: string) => [...patientKeys.all, 'facility', facilityId] as const,
  search: (query: string) => [...patientKeys.all, 'search', query] as const,
};

/**
 * Patients mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreatePatient = () => {
  return useOptimisticCreate<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
    ]
  );
};

/**
 * Patients mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdatePatient = () => {
  return useOptimisticUpdate<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
    ]
  );
};

/**
 * Patients mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeletePatient = () => {
  return useOptimisticDelete<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
    ]
  );
};

/**
 * Enhanced patients mutations with comprehensive error handling and rollback
 */
export const useCreatePatientEnhanced = () => {
  return useEnhancedCreateMutation<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
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

export const useUpdatePatientEnhanced = () => {
  return useEnhancedUpdateMutation<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
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

export const useDeletePatientEnhanced = () => {
  return useEnhancedDeleteMutation<Patient>(
    patientsService,
    [
      [...patientKeys.lists()],
      [...patientKeys.all], // Invalidate all patient queries
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
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
  useCreatePatientEnhanced,
  useUpdatePatientEnhanced,
  useDeletePatientEnhanced,
};