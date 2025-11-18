import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { immunizationRecordsService } from '../services/immunizationRecordsService';
import type { ImmunizationRecord } from '../types/appwrite';

// Query keys for immunization records
export const immunizationRecordKeys = {
  all: ['immunizationRecords'] as const,
  lists: () => [...immunizationRecordKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...immunizationRecordKeys.lists(), filters] as const,
  details: () => [...immunizationRecordKeys.all, 'detail'] as const,
  detail: (id: string) => [...immunizationRecordKeys.details(), id] as const,
  byPatient: (patientId: string) => [...immunizationRecordKeys.all, 'patient', patientId] as const,
  byFacility: (facilityId: string) => [...immunizationRecordKeys.all, 'facility', facilityId] as const,
  byVaccine: (vaccineId: string) => [...immunizationRecordKeys.all, 'vaccine', vaccineId] as const,
  byHealthWorker: (healthWorkerId: string) => [...immunizationRecordKeys.all, 'healthWorker', healthWorkerId] as const,
  recent: () => [...immunizationRecordKeys.all, 'recent'] as const,
  byBatchNumber: (batchNumber: string) => [...immunizationRecordKeys.all, 'batch', batchNumber] as const,
  byDateRange: (startDate: string, endDate: string) => [...immunizationRecordKeys.all, 'dateRange', startDate, endDate] as const,
};

/**
 * Immunization Records mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateImmunizationRecord = () => {
  return useOptimisticCreate<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ]
  );
};

/**
 * Immunization Records mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateImmunizationRecord = () => {
  return useOptimisticUpdate<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ]
  );
};

/**
 * Immunization Records mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteImmunizationRecord = () => {
  return useOptimisticDelete<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ]
  );
};

/**
 * Enhanced immunization records mutations with comprehensive error handling and rollback
 */
export const useCreateImmunizationRecordEnhanced = () => {
  return useEnhancedCreateMutation<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ],
    {
      enableRollback: true,
      enableUndoRedo: true,
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

export const useUpdateImmunizationRecordEnhanced = () => {
  return useEnhancedUpdateMutation<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ],
    {
      enableRollback: true,
      enableUndoRedo: true,
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

export const useDeleteImmunizationRecordEnhanced = () => {
  return useEnhancedDeleteMutation<ImmunizationRecord>(
    immunizationRecordsService,
    [
      [...immunizationRecordKeys.lists()],
      [...immunizationRecordKeys.all], // Invalidate all immunization record queries
    ],
    {
      enableRollback: true,
      enableUndoRedo: true,
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
  useCreateImmunizationRecord,
  useUpdateImmunizationRecord,
  useDeleteImmunizationRecord,
  useCreateImmunizationRecordEnhanced,
  useUpdateImmunizationRecordEnhanced,
  useDeleteImmunizationRecordEnhanced,
};