import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { DatabaseService } from '../services/appwriteDatabase';
import { COLLECTION_IDS } from '../services/appwrite';
import type { VaccineScheduleItem } from '../types/appwrite';

// Query keys for vaccine schedule items
export const vaccineScheduleItemKeys = {
  all: ['vaccineScheduleItems'] as const,
  lists: () => [...vaccineScheduleItemKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...vaccineScheduleItemKeys.lists(), filters] as const,
  details: () => [...vaccineScheduleItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...vaccineScheduleItemKeys.details(), id] as const,
  bySchedule: (scheduleId: string) => [...vaccineScheduleItemKeys.all, 'schedule', scheduleId] as const,
  byVaccine: (vaccineId: string) => [...vaccineScheduleItemKeys.all, 'vaccine', vaccineId] as const,
  byAgeGroup: (ageGroup: string) => [...vaccineScheduleItemKeys.all, 'ageGroup', ageGroup] as const,
  active: () => [...vaccineScheduleItemKeys.all, 'active'] as const,
};

/**
 * Vaccine Schedule Items mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateVaccineScheduleItem = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useOptimisticCreate<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
    ]
  );
};

/**
 * Vaccine Schedule Items mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateVaccineScheduleItem = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useOptimisticUpdate<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
    ]
  );
};

/**
 * Vaccine Schedule Items mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteVaccineScheduleItem = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useOptimisticDelete<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
    ]
  );
};

/**
 * Enhanced vaccine schedule items mutations with comprehensive error handling and rollback
 */
export const useCreateVaccineScheduleItemEnhanced = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useEnhancedCreateMutation<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
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

export const useUpdateVaccineScheduleItemEnhanced = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useEnhancedUpdateMutation<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
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

export const useDeleteVaccineScheduleItemEnhanced = () => {
  const vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>(COLLECTION_IDS.VACCINE_SCHEDULE_ITEMS);
  return useEnhancedDeleteMutation<VaccineScheduleItem>(
    vaccineScheduleItemsService,
    [
      [...vaccineScheduleItemKeys.lists()],
      [...vaccineScheduleItemKeys.all], // Invalidate all vaccine schedule item queries
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
  useCreateVaccineScheduleItem,
  useUpdateVaccineScheduleItem,
  useDeleteVaccineScheduleItem,
  useCreateVaccineScheduleItemEnhanced,
  useUpdateVaccineScheduleItemEnhanced,
  useDeleteVaccineScheduleItemEnhanced,
};