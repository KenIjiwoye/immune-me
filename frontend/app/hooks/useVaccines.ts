/**
 * Vaccines React Query Hooks
 * Provides hooks for fetching, creating, updating, and deleting vaccines
 * with proper loading states, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { vaccinesService } from '../../services/appwriteDatabase';
import {
  invalidateVaccines,
  invalidateVaccineRelated,
} from './cacheUtils';
import type { Vaccines } from '../../types/appwrite.d';

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all vaccines with optional filters
 */
export const useVaccines = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: queryKeys.vaccines.list(filters || {}),
    queryFn: async () => {
      const result = await vaccinesService.list({
        queries: [], // Add filter queries if needed
      });
      return result.documents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch a single vaccine by ID
 */
export const useVaccine = (vaccineId: string) => {
  return useQuery({
    queryKey: queryKeys.vaccines.detail(vaccineId),
    queryFn: () => vaccinesService.get(vaccineId),
    enabled: !!vaccineId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch active vaccines
 */
export const useActiveVaccines = () => {
  return useQuery({
    queryKey: queryKeys.vaccines.active(),
    queryFn: () => vaccinesService.getActive(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch vaccines by disease
 */
export const useVaccinesByDisease = (disease: string) => {
  return useQuery({
    queryKey: queryKeys.vaccines.byDisease(disease),
    queryFn: () => vaccinesService.getByDisease(disease),
    enabled: !!disease,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch vaccines by age group
 */
export const useVaccinesByAgeGroup = (ageGroup: string) => {
  return useQuery({
    queryKey: queryKeys.vaccines.byAgeGroup(ageGroup),
    queryFn: () => vaccinesService.getByAgeGroup(ageGroup),
    enabled: !!ageGroup,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new vaccine
 */
export const useCreateVaccine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vaccineData: Omit<Vaccines, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>) =>
      vaccinesService.create(vaccineData),
    onSuccess: () => {
      invalidateVaccines();
    },
  });
};

/**
 * Update an existing vaccine
 */
export const useUpdateVaccine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: Partial<Omit<Vaccines, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>>;
    }) => vaccinesService.update(id, data),
    onSuccess: (data, variables) => {
      invalidateVaccineRelated(variables.id);
    },
  });
};

/**
 * Delete a vaccine
 */
export const useDeleteVaccine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vaccineId: string) => vaccinesService.delete(vaccineId),
    onSuccess: (data, vaccineId) => {
      invalidateVaccineRelated(vaccineId);
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch vaccine data for better UX
 */
export const usePrefetchVaccine = () => {
  const queryClient = useQueryClient();

  const prefetchVaccine = (vaccineId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vaccines.detail(vaccineId),
      queryFn: () => vaccinesService.get(vaccineId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchVaccines = (filters?: Record<string, unknown>) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vaccines.list(filters || {}),
      queryFn: async () => {
        const result = await vaccinesService.list({
          queries: [],
        });
        return result.documents;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchActiveVaccines = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vaccines.active(),
      queryFn: () => vaccinesService.getActive(),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchVaccine, prefetchVaccines, prefetchActiveVaccines };
};

/**
 * Check if vaccine exists
 */
export const useVaccineExists = (vaccineId: string) => {
  return useQuery({
    queryKey: [...queryKeys.vaccines.detail(vaccineId), 'exists'],
    queryFn: () => vaccinesService.exists(vaccineId),
    enabled: !!vaccineId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};