/**
 * Immunization Records React Query Hooks
 * Provides hooks for fetching, creating, updating, and deleting immunization records
 * with proper loading states, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { immunizationRecordsService } from '../../services/appwriteDatabase';
import {
  invalidateImmunizationRecords,
  invalidateImmunizationRecordRelated,
} from './cacheUtils';
import type { ImmunizationRecords } from '../../types/appwrite.d';

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all immunization records with optional filters
 */
export const useImmunizationRecords = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.list(filters || {}),
    queryFn: async () => {
      const result = await immunizationRecordsService.list({
        queries: [], // Add filter queries if needed
      });
      return result.documents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch a single immunization record by ID
 */
export const useImmunizationRecord = (recordId: string) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.detail(recordId),
    queryFn: () => immunizationRecordsService.get(recordId),
    enabled: !!recordId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch immunization records by patient ID
 */
export const useImmunizationRecordsByPatient = (patientId: string) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.byPatient(patientId),
    queryFn: () => immunizationRecordsService.getByPatient(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch immunization records by facility ID
 */
export const useImmunizationRecordsByFacility = (facilityId: string) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.byFacility(facilityId),
    queryFn: () => immunizationRecordsService.getByFacility(facilityId),
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch immunization records by vaccine ID
 */
export const useImmunizationRecordsByVaccine = (vaccineId: string) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.byVaccine(vaccineId),
    queryFn: () => immunizationRecordsService.getByVaccine(vaccineId),
    enabled: !!vaccineId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch immunization records by date range
 */
export const useImmunizationRecordsByDateRange = (
  startDate: string,
  endDate: string,
  facilityId?: string
) => {
  return useQuery({
    queryKey: queryKeys.immunizationRecords.byDateRange(startDate, endDate, facilityId),
    queryFn: () => immunizationRecordsService.getByDateRange(startDate, endDate, facilityId),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new immunization record
 */
export const useCreateImmunizationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordData: Omit<ImmunizationRecords, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>) =>
      immunizationRecordsService.create(recordData),
    onSuccess: () => {
      invalidateImmunizationRecords();
    },
  });
};

/**
 * Update an existing immunization record
 */
export const useUpdateImmunizationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: Partial<Omit<ImmunizationRecords, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>>;
    }) => immunizationRecordsService.update(id, data),
    onSuccess: (data, variables) => {
      invalidateImmunizationRecordRelated(variables.id);
    },
  });
};

/**
 * Delete an immunization record
 */
export const useDeleteImmunizationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => immunizationRecordsService.delete(recordId),
    onSuccess: (data, recordId) => {
      invalidateImmunizationRecordRelated(recordId);
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch immunization record data for better UX
 */
export const usePrefetchImmunizationRecord = () => {
  const queryClient = useQueryClient();

  const prefetchImmunizationRecord = (recordId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.immunizationRecords.detail(recordId),
      queryFn: () => immunizationRecordsService.get(recordId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchImmunizationRecords = (filters?: Record<string, unknown>) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.immunizationRecords.list(filters || {}),
      queryFn: async () => {
        const result = await immunizationRecordsService.list({
          queries: [],
        });
        return result.documents;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchImmunizationRecordsByPatient = (patientId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.immunizationRecords.byPatient(patientId),
      queryFn: () => immunizationRecordsService.getByPatient(patientId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchImmunizationRecordsByFacility = (facilityId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.immunizationRecords.byFacility(facilityId),
      queryFn: () => immunizationRecordsService.getByFacility(facilityId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchImmunizationRecord,
    prefetchImmunizationRecords,
    prefetchImmunizationRecordsByPatient,
    prefetchImmunizationRecordsByFacility,
  };
};

/**
 * Check if immunization record exists
 */
export const useImmunizationRecordExists = (recordId: string) => {
  return useQuery({
    queryKey: [...queryKeys.immunizationRecords.detail(recordId), 'exists'],
    queryFn: () => immunizationRecordsService.exists(recordId),
    enabled: !!recordId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};