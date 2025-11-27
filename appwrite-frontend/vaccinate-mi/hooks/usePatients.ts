import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsService } from '../services/patientsService';
import type { Patient } from '../types/appwrite';

// Query keys
export const patientKeys = {
    all: ['patients'] as const,
    lists: () => [...patientKeys.all, 'list'] as const,
    list: (filters?: any) => [...patientKeys.lists(), filters] as const,
    details: () => [...patientKeys.all, 'detail'] as const,
    detail: (id: string) => [...patientKeys.details(), id] as const,
};

/**
 * Hook to fetch paginated list of patients
 */
export function usePatients(params?: {
    limit?: number;
    offset?: number;
}) {
    return useQuery({
        queryKey: patientKeys.list(params),
        queryFn: () => patientsService.list(params),
    });
}

/**
 * Hook to fetch a single patient by ID
 */
export function usePatient(id: string) {
    return useQuery({
        queryKey: patientKeys.detail(id),
        queryFn: () => patientsService.get(id),
        enabled: !!id,
    });
}

/**
 * Hook to create a new patient
 */
export function useCreatePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<Patient, keyof import('../types/appwrite').AppwriteDocument>) =>
            patientsService.create(data),
        onSuccess: () => {
            // Invalidate and refetch patients list
            queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

/**
 * Hook to update an existing patient
 */
export function useUpdatePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: {
            id: string;
            data: Partial<Omit<Patient, keyof import('../types/appwrite').AppwriteDocument>>
        }) => patientsService.update(id, data),
        onSuccess: (updatedPatient) => {
            // Invalidate the specific patient detail
            queryClient.invalidateQueries({
                queryKey: patientKeys.detail(updatedPatient.$id)
            });
            // Invalidate the patients list
            queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

/**
 * Hook to delete a patient
 */
export function useDeletePatient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => patientsService.delete(id),
        onSuccess: () => {
            // Invalidate and refetch patients list
            queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

/**
 * Hook to search patients by name
 */
export function useSearchPatients(searchTerm: string) {
    return useQuery({
        queryKey: [...patientKeys.all, 'search', searchTerm],
        queryFn: () => patientsService.searchByName(searchTerm),
        enabled: searchTerm.length > 0,
    });
}

/**
 * Hook to fetch patients by facility
 */
export function usePatientsByFacility(facilityId: string, limit?: number) {
    return useQuery({
        queryKey: [...patientKeys.all, 'facility', facilityId],
        queryFn: () => patientsService.getByFacility(facilityId, limit),
        enabled: !!facilityId,
    });
}
