/**
 * Patients React Query Hooks
 * Provides hooks for fetching, creating, updating, and deleting patients
 * with proper loading states, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { patientsService } from '../../services/appwriteDatabase';
import {
  invalidatePatients,
  invalidatePatientRelated,
} from './cacheUtils';
import type { Patients } from '../../types/appwrite.d';

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all patients with optional filters
 */
export const usePatients = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: queryKeys.patients.list(filters || {}),
    queryFn: async () => {
      const result = await patientsService.list({
        queries: [], // Add filter queries if needed
      });
      return result.documents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch a single patient by ID
 */
export const usePatient = (patientId: string) => {
  return useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => patientsService.get(patientId),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Search patients by name
 */
export const useSearchPatients = (searchTerm: string, limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.patients.search(searchTerm),
    queryFn: () => patientsService.searchByName(searchTerm),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });
};

/**
 * Fetch patients by facility
 */
export const usePatientsByFacility = (facilityId: string, limit: number = 50) => {
  return useQuery({
    queryKey: queryKeys.patients.byFacility(facilityId),
    queryFn: () => patientsService.getByFacility(facilityId, limit),
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch patients by health worker
 */
export const usePatientsByHealthWorker = (healthWorkerId: string) => {
  return useQuery({
    queryKey: queryKeys.patients.byHealthWorker(healthWorkerId),
    queryFn: () => patientsService.getByHealthWorker(healthWorkerId),
    enabled: !!healthWorkerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch patients by district
 */
export const usePatientsByDistrict = (district: string) => {
  return useQuery({
    queryKey: queryKeys.patients.byDistrict(district),
    queryFn: () => patientsService.getByDistrict(district),
    enabled: !!district,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new patient
 */
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientData: Omit<Patients, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>) =>
      patientsService.create(patientData),
    onSuccess: () => {
      invalidatePatients();
    },
  });
};

/**
 * Update an existing patient
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: Partial<Omit<Patients, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>>;
    }) => patientsService.update(id, data),
    onSuccess: (data, variables) => {
      invalidatePatientRelated(variables.id);
    },
  });
};

/**
 * Delete a patient
 */
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => patientsService.delete(patientId),
    onSuccess: (data, patientId) => {
      invalidatePatientRelated(patientId);
    },
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Prefetch patient data for better UX
 */
export const usePrefetchPatient = () => {
  const queryClient = useQueryClient();

  const prefetchPatient = (patientId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.patients.detail(patientId),
      queryFn: () => patientsService.get(patientId),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPatients = (filters?: Record<string, unknown>) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.patients.list(filters || {}),
      queryFn: async () => {
        const result = await patientsService.list({
          queries: [],
        });
        return result.documents;
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPatientsByFacility = (facilityId: string, limit: number = 50) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.patients.byFacility(facilityId),
      queryFn: () => patientsService.getByFacility(facilityId, limit),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchPatient, prefetchPatients, prefetchPatientsByFacility };
};

/**
 * Check if patient exists
 */
export const usePatientExists = (patientId: string) => {
  return useQuery({
    queryKey: [...queryKeys.patients.detail(patientId), 'exists'],
    queryFn: () => patientsService.exists(patientId),
    enabled: !!patientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};