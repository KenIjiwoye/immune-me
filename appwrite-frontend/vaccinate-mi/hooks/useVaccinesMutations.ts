import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { vaccinesService } from '../services/vaccinesService';
import type { Vaccine } from '../types/appwrite';

// Query keys for vaccines
export const vaccineKeys = {
  all: ['vaccines'] as const,
  lists: () => [...vaccineKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...vaccineKeys.lists(), filters] as const,
  details: () => [...vaccineKeys.all, 'detail'] as const,
  detail: (id: string) => [...vaccineKeys.details(), id] as const,
  active: () => [...vaccineKeys.all, 'active'] as const,
  byDisease: (disease: string) => [...vaccineKeys.all, 'disease', disease] as const,
  byAgeGroup: (ageGroup: string) => [...vaccineKeys.all, 'ageGroup', ageGroup] as const,
  byManufacturer: (manufacturer: string) => [...vaccineKeys.all, 'manufacturer', manufacturer] as const,
  requiringRefrigeration: () => [...vaccineKeys.all, 'refrigeration'] as const,
  byScheduleType: (scheduleType: string) => [...vaccineKeys.all, 'scheduleType', scheduleType] as const,
};

/**
 * Vaccines mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateVaccine = () => {
  return useOptimisticCreate<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
    ]
  );
};

/**
 * Vaccines mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateVaccine = () => {
  return useOptimisticUpdate<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
    ]
  );
};

/**
 * Vaccines mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteVaccine = () => {
  return useOptimisticDelete<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
    ]
  );
};

/**
 * Enhanced vaccines mutations with comprehensive error handling and rollback
 */
export const useCreateVaccineEnhanced = () => {
  return useEnhancedCreateMutation<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
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

export const useUpdateVaccineEnhanced = () => {
  return useEnhancedUpdateMutation<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
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

export const useDeleteVaccineEnhanced = () => {
  return useEnhancedDeleteMutation<Vaccine>(
    vaccinesService,
    [
      [...vaccineKeys.lists()],
      [...vaccineKeys.all], // Invalidate all vaccine queries
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
  useCreateVaccine,
  useUpdateVaccine,
  useDeleteVaccine,
  useCreateVaccineEnhanced,
  useUpdateVaccineEnhanced,
  useDeleteVaccineEnhanced,
};