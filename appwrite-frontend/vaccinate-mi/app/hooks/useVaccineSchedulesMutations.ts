import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { DatabaseService } from '../services/appwriteDatabase';
import { COLLECTION_IDS } from '../services/appwrite';
import type { VaccineSchedule } from '../types/appwrite';

// Query keys for vaccine schedules
export const vaccineScheduleKeys = {
  all: ['vaccineSchedules'] as const,
  lists: () => [...vaccineScheduleKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...vaccineScheduleKeys.lists(), filters] as const,
  details: () => [...vaccineScheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vaccineScheduleKeys.details(), id] as const,
  byAgeGroup: (ageGroup: string) => [...vaccineScheduleKeys.all, 'ageGroup', ageGroup] as const,
  byVaccine: (vaccineId: string) => [...vaccineScheduleKeys.all, 'vaccine', vaccineId] as const,
  active: () => [...vaccineScheduleKeys.all, 'active'] as const,
};

/**
 * Vaccine Schedules mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateVaccineSchedule = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useOptimisticCreate<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
    ]
  );
};

/**
 * Vaccine Schedules mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateVaccineSchedule = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useOptimisticUpdate<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
    ]
  );
};

/**
 * Vaccine Schedules mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteVaccineSchedule = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useOptimisticDelete<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
    ]
  );
};

/**
 * Enhanced vaccine schedules mutations with comprehensive error handling and rollback
 */
export const useCreateVaccineScheduleEnhanced = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useEnhancedCreateMutation<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
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

export const useUpdateVaccineScheduleEnhanced = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useEnhancedUpdateMutation<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
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

export const useDeleteVaccineScheduleEnhanced = () => {
  const vaccineSchedulesService = new DatabaseService<VaccineSchedule>(COLLECTION_IDS.VACCINE_SCHEDULES);
  return useEnhancedDeleteMutation<VaccineSchedule>(
    vaccineSchedulesService,
    [
      [...vaccineScheduleKeys.lists()],
      [...vaccineScheduleKeys.all], // Invalidate all vaccine schedule queries
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
  useCreateVaccineSchedule,
  useUpdateVaccineSchedule,
  useDeleteVaccineSchedule,
  useCreateVaccineScheduleEnhanced,
  useUpdateVaccineScheduleEnhanced,
  useDeleteVaccineScheduleEnhanced,
};