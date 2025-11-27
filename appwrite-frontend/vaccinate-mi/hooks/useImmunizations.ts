import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { immunizationRecordsService } from '../services/immunizationRecordsService';
import type { ImmunizationRecord } from '../types/appwrite';

// Query keys
export const immunizationKeys = {
    all: ['immunizations'] as const,
    lists: () => [...immunizationKeys.all, 'list'] as const,
    list: (filters?: any) => [...immunizationKeys.lists(), filters] as const,
    details: () => [...immunizationKeys.all, 'detail'] as const,
    detail: (id: string) => [...immunizationKeys.details(), id] as const,
    byPatient: (patientId: string) => [...immunizationKeys.all, 'patient', patientId] as const,
    byFacility: (facilityId: string) => [...immunizationKeys.all, 'facility', facilityId] as const,
    byVaccine: (vaccineId: string) => [...immunizationKeys.all, 'vaccine', vaccineId] as const,
    recent: (limit?: number) => [...immunizationKeys.all, 'recent', limit] as const,
};

/**
 * Hook to fetch paginated list of immunization records
 */
export function useImmunizations(params?: {
    limit?: number;
    offset?: number;
}) {
    return useQuery({
        queryKey: immunizationKeys.list(params),
        queryFn: () => immunizationRecordsService.list(params),
    });
}

/**
 * Hook to fetch a single immunization record by ID
 */
export function useImmunization(id: string) {
    return useQuery({
        queryKey: immunizationKeys.detail(id),
        queryFn: () => immunizationRecordsService.get(id),
        enabled: !!id,
    });
}

/**
 * Hook to fetch immunization records by patient ID
 */
export function useImmunizationsByPatient(patientId: string) {
    return useQuery({
        queryKey: immunizationKeys.byPatient(patientId),
        queryFn: () => immunizationRecordsService.getByPatient(patientId),
        enabled: !!patientId,
    });
}

/**
 * Hook to fetch immunization records by facility ID
 */
export function useImmunizationsByFacility(facilityId: string, limit?: number) {
    return useQuery({
        queryKey: immunizationKeys.byFacility(facilityId),
        queryFn: () => immunizationRecordsService.getByFacility(facilityId, limit),
        enabled: !!facilityId,
    });
}

/**
 * Hook to fetch immunization records by vaccine ID
 */
export function useImmunizationsByVaccine(vaccineId: string) {
    return useQuery({
        queryKey: immunizationKeys.byVaccine(vaccineId),
        queryFn: () => immunizationRecordsService.getByVaccine(vaccineId),
        enabled: !!vaccineId,
    });
}

/**
 * Hook to fetch recent immunization records
 */
export function useRecentImmunizations(limit: number = 50) {
    return useQuery({
        queryKey: immunizationKeys.recent(limit),
        queryFn: () => immunizationRecordsService.getRecent(limit),
    });
}

/**
 * Hook to fetch immunization records by date range
 */
export function useImmunizationsByDateRange(
    startDate: string,
    endDate: string,
    facilityId?: string
) {
    return useQuery({
        queryKey: [...immunizationKeys.all, 'dateRange', startDate, endDate, facilityId],
        queryFn: () => immunizationRecordsService.getByDateRange(startDate, endDate, facilityId),
        enabled: !!startDate && !!endDate,
    });
}

/**
 * Hook to create a new immunization record
 */
export function useCreateImmunization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<ImmunizationRecord, keyof import('../types/appwrite').AppwriteDocument>) =>
            immunizationRecordsService.create(data),
        onSuccess: (newRecord) => {
            // Invalidate all immunization lists
            queryClient.invalidateQueries({ queryKey: immunizationKeys.lists() });
            // Invalidate patient-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byPatient(newRecord.patient_id)
            });
            // Invalidate facility-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byFacility(newRecord.facility_id)
            });
            // Invalidate vaccine-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byVaccine(newRecord.vaccine_id)
            });
            // Invalidate recent immunizations
            queryClient.invalidateQueries({ queryKey: immunizationKeys.recent() });
        },
    });
}

/**
 * Hook to update an existing immunization record
 */
export function useUpdateImmunization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: {
            id: string;
            data: Partial<Omit<ImmunizationRecord, keyof import('../types/appwrite').AppwriteDocument>>
        }) => immunizationRecordsService.update(id, data),
        onSuccess: (updatedRecord) => {
            // Invalidate the specific immunization detail
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.detail(updatedRecord.$id)
            });
            // Invalidate all immunization lists
            queryClient.invalidateQueries({ queryKey: immunizationKeys.lists() });
            // Invalidate patient-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byPatient(updatedRecord.patient_id)
            });
            // Invalidate facility-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byFacility(updatedRecord.facility_id)
            });
            // Invalidate vaccine-specific immunizations
            queryClient.invalidateQueries({
                queryKey: immunizationKeys.byVaccine(updatedRecord.vaccine_id)
            });
        },
    });
}

/**
 * Hook to delete an immunization record
 */
export function useDeleteImmunization() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => immunizationRecordsService.delete(id),
        onSuccess: () => {
            // Invalidate all immunization lists and caches
            queryClient.invalidateQueries({ queryKey: immunizationKeys.all });
        },
    });
}
