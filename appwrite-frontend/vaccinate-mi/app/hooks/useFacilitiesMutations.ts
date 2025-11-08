import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { facilitiesService } from '../services/facilitiesService';
import type { Facility } from '../types/appwrite';

// Query keys for facilities
export const facilityKeys = {
  all: ['facilities'] as const,
  lists: () => [...facilityKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...facilityKeys.lists(), filters] as const,
  details: () => [...facilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...facilityKeys.details(), id] as const,
  byDistrict: (district: string) => [...facilityKeys.all, 'district', district] as const,
  byRegion: (region: string) => [...facilityKeys.all, 'region', region] as const,
  active: () => [...facilityKeys.all, 'active'] as const,
  search: (query: string) => [...facilityKeys.all, 'search', query] as const,
};

/**
 * Facilities mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateFacility = () => {
  return useOptimisticCreate<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
    ]
  );
};

/**
 * Facilities mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateFacility = () => {
  return useOptimisticUpdate<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
    ]
  );
};

/**
 * Facilities mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteFacility = () => {
  return useOptimisticDelete<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
    ]
  );
};

/**
 * Enhanced facilities mutations with comprehensive error handling and rollback
 */
export const useCreateFacilityEnhanced = () => {
  return useEnhancedCreateMutation<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
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

export const useUpdateFacilityEnhanced = () => {
  return useEnhancedUpdateMutation<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
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

export const useDeleteFacilityEnhanced = () => {
  return useEnhancedDeleteMutation<Facility>(
    facilitiesService,
    [
      [...facilityKeys.lists()],
      [...facilityKeys.all], // Invalidate all facility queries
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
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
  useCreateFacilityEnhanced,
  useUpdateFacilityEnhanced,
  useDeleteFacilityEnhanced,
};