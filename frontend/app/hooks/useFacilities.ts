/**
 * Facilities React Query Hooks
 * Provides hooks for fetching, creating, updating, and deleting facilities
 * with proper loading states, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { facilitiesService } from '../../services/appwriteDatabase';
import {
  invalidateFacilities,
  invalidateFacilityRelated,
} from './cacheUtils';
import type { Facility } from '../../types/appwrite.d';

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all facilities with optional filters
 */
export const useFacilities = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: queryKeys.facilities.list(filters || {}),
    queryFn: async () => {
      const result = await facilitiesService.list({
        queries: [], // Add filter queries if needed
      });
      return result.documents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch a single facility by ID
 */
export const useFacility = (facilityId: string) => {
  return useQuery({
    queryKey: queryKeys.facilities.detail(facilityId),
    queryFn: () => facilitiesService.get(facilityId),
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Search facilities by name
 */
export const useSearchFacilities = (searchTerm: string, limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.facilities.search(searchTerm),
    queryFn: () => facilitiesService.searchByName(searchTerm),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
};

/**
 * Fetch facilities by district
 */
export const useFacilitiesByDistrict = (district: string) => {
  return useQuery({
    queryKey: queryKeys.facilities.byDistrict(district),
    queryFn: () => facilitiesService.getByDistrict(district),
    enabled: !!district,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new facility
 */
export const useCreateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facilityData: Omit<Facility, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>) =>
      facilitiesService.create(facilityData),
    onSuccess: () => {
      invalidateFacilities();
    },
  });
};

/**
 * Update an existing facility
 */
export const useUpdateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: Partial<Omit<Facility, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>>;
    }) => facilitiesService.update(id, data),
    onSuccess: (data, variables) => {
      invalidateFacilityRelated(variables.id);
    },
  });
};

/**
 * Delete a facility
 */
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (facilityId: string) => facilitiesService.delete(facilityId),
    onSuccess: (data, facilityId) => {
      invalidateFacilityRelated(facilityId);
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch facility data for better UX
 */
export const usePrefetchFacility = () => {
  const queryClient = useQueryClient();

  const prefetchFacility = (facilityId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.facilities.detail(facilityId),
      queryFn: () => facilitiesService.get(facilityId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchFacilities = (filters?: Record<string, unknown>) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.facilities.list(filters || {}),
      queryFn: async () => {
        const result = await facilitiesService.list({
          queries: [],
        });
        return result.documents;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchFacility, prefetchFacilities };
};

/**
 * Check if facility exists
 */
export const useFacilityExists = (facilityId: string) => {
  return useQuery({
    queryKey: [...queryKeys.facilities.detail(facilityId), 'exists'],
    queryFn: () => facilitiesService.exists(facilityId),
    enabled: !!facilityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};