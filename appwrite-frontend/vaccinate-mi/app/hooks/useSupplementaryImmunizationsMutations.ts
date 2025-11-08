import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { DatabaseService } from '../services/appwriteDatabase';
import { COLLECTION_IDS } from '../services/appwrite';
import type { SupplementaryImmunization } from '../types/appwrite';

// Query keys for supplementary immunizations
export const supplementaryImmunizationKeys = {
  all: ['supplementaryImmunizations'] as const,
  lists: () => [...supplementaryImmunizationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...supplementaryImmunizationKeys.lists(), filters] as const,
  details: () => [...supplementaryImmunizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplementaryImmunizationKeys.details(), id] as const,
  byFacility: (facilityId: string) => [...supplementaryImmunizationKeys.all, 'facility', facilityId] as const,
  byVaccine: (vaccineId: string) => [...supplementaryImmunizationKeys.all, 'vaccine', vaccineId] as const,
  byStatus: (status: string) => [...supplementaryImmunizationKeys.all, 'status', status] as const,
  active: () => [...supplementaryImmunizationKeys.all, 'active'] as const,
  upcoming: () => [...supplementaryImmunizationKeys.all, 'upcoming'] as const,
};

/**
 * Supplementary Immunizations mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateSupplementaryImmunization = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useOptimisticCreate<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
    ]
  );
};

/**
 * Supplementary Immunizations mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateSupplementaryImmunization = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useOptimisticUpdate<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
    ]
  );
};

/**
 * Supplementary Immunizations mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteSupplementaryImmunization = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useOptimisticDelete<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
    ]
  );
};

/**
 * Enhanced supplementary immunizations mutations with comprehensive error handling and rollback
 */
export const useCreateSupplementaryImmunizationEnhanced = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useEnhancedCreateMutation<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
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

export const useUpdateSupplementaryImmunizationEnhanced = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useEnhancedUpdateMutation<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
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

export const useDeleteSupplementaryImmunizationEnhanced = () => {
  const supplementaryImmunizationsService = new DatabaseService<SupplementaryImmunization>(COLLECTION_IDS.SUPPLEMENTARY_IMMUNIZATIONS);
  return useEnhancedDeleteMutation<SupplementaryImmunization>(
    supplementaryImmunizationsService,
    [
      [...supplementaryImmunizationKeys.lists()],
      [...supplementaryImmunizationKeys.all], // Invalidate all supplementary immunization queries
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
  useCreateSupplementaryImmunization,
  useUpdateSupplementaryImmunization,
  useDeleteSupplementaryImmunization,
  useCreateSupplementaryImmunizationEnhanced,
  useUpdateSupplementaryImmunizationEnhanced,
  useDeleteSupplementaryImmunizationEnhanced,
};