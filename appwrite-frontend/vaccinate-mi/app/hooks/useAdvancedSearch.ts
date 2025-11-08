/**
 * Advanced Search Hooks for Appwrite Collections
 * Provides React Query hooks for advanced search and filtering capabilities
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  patientsService,
  facilitiesService,
  vaccinesService,
  immunizationRecordsService,
  AdvancedSearchOptions,
  SearchOptions,
  AdvancedFilter,
  QueryBuilder,
  createQueryBuilder,
} from '../services/appwriteDatabase';
import type {
  Patient,
  Facility,
  Vaccine,
  ImmunizationRecord,
  QueryResponse,
} from '../types/appwrite';

// Query keys for advanced search
export const searchKeys = {
  all: ['search'] as const,
  patients: () => [...searchKeys.all, 'patients'] as const,
  patientSearch: (options: AdvancedSearchOptions) => [...searchKeys.patients(), options] as const,
  facilities: () => [...searchKeys.all, 'facilities'] as const,
  facilitySearch: (options: AdvancedSearchOptions) => [...searchKeys.facilities(), options] as const,
  vaccines: () => [...searchKeys.all, 'vaccines'] as const,
  vaccineSearch: (options: AdvancedSearchOptions) => [...searchKeys.vaccines(), options] as const,
  immunizationRecords: () => [...searchKeys.all, 'immunizationRecords'] as const,
  immunizationRecordSearch: (options: AdvancedSearchOptions) => [...searchKeys.immunizationRecords(), options] as const,
};

// =============================================================================
// PATIENT SEARCH HOOKS
// =============================================================================

/**
 * Advanced search hook for patients
 */
export const useAdvancedPatientSearch = (
  options: AdvancedSearchOptions,
  queryOptions?: UseQueryOptions<QueryResponse<Patient>>
) => {
  return useQuery({
    queryKey: searchKeys.patientSearch(options),
    queryFn: () => patientsService.advancedSearch(options),
    enabled: !!options && Object.keys(options).length > 0,
    ...queryOptions,
  });
};

/**
 * Patient search with specific criteria
 */
export const usePatientSearch = (
  criteria: {
    name?: string;
    district?: string;
    facilityId?: string;
    healthWorkerId?: string;
    dateOfBirthRange?: { start?: Date | string; end?: Date | string };
    limit?: number;
  },
  queryOptions?: UseQueryOptions<Patient[]>
) => {
  return useQuery({
    queryKey: ['patients', 'search', criteria],
    queryFn: () => patientsService.searchPatients(criteria),
    enabled: !!criteria && Object.keys(criteria).some(key => criteria[key as keyof typeof criteria] !== undefined),
    ...queryOptions,
  });
};

/**
 * Patients by age range
 */
export const usePatientsByAgeRange = (
  minAge?: number,
  maxAge?: number,
  limit: number = 50,
  queryOptions?: UseQueryOptions<Patient[]>
) => {
  return useQuery({
    queryKey: ['patients', 'ageRange', { minAge, maxAge, limit }],
    queryFn: () => patientsService.getByAgeRange(minAge, maxAge, limit),
    enabled: minAge !== undefined || maxAge !== undefined,
    ...queryOptions,
  });
};

// =============================================================================
// FACILITY SEARCH HOOKS
// =============================================================================

/**
 * Advanced search hook for facilities
 */
export const useAdvancedFacilitySearch = (
  options: AdvancedSearchOptions,
  queryOptions?: UseQueryOptions<QueryResponse<Facility>>
) => {
  return useQuery({
    queryKey: searchKeys.facilitySearch(options),
    queryFn: () => facilitiesService.advancedSearch(options),
    enabled: !!options && Object.keys(options).length > 0,
    ...queryOptions,
  });
};

/**
 * Facility search with specific criteria
 */
export const useFacilitySearch = (
  criteria: {
    name?: string;
    district?: string;
    contactPhone?: string;
    limit?: number;
  },
  queryOptions?: UseQueryOptions<Facility[]>
) => {
  return useQuery({
    queryKey: ['facilities', 'search', criteria],
    queryFn: () => facilitiesService.searchFacilities(criteria),
    enabled: !!criteria && Object.keys(criteria).some(key => criteria[key as keyof typeof criteria] !== undefined),
    ...queryOptions,
  });
};

/**
 * Facilities by location (geospatial search)
 */
export const useFacilitiesByLocation = (
  lat: number,
  lng: number,
  radiusKm: number = 10,
  queryOptions?: UseQueryOptions<Facility[]>
) => {
  return useQuery({
    queryKey: ['facilities', 'location', { lat, lng, radiusKm }],
    queryFn: () => facilitiesService.searchByLocation(lat, lng, radiusKm),
    enabled: lat !== undefined && lng !== undefined,
    ...queryOptions,
  });
};

// =============================================================================
// VACCINE SEARCH HOOKS
// =============================================================================

/**
 * Advanced search hook for vaccines
 */
export const useAdvancedVaccineSearch = (
  options: AdvancedSearchOptions,
  queryOptions?: UseQueryOptions<QueryResponse<Vaccine>>
) => {
  return useQuery({
    queryKey: searchKeys.vaccineSearch(options),
    queryFn: () => vaccinesService.advancedSearch(options),
    enabled: !!options && Object.keys(options).length > 0,
    ...queryOptions,
  });
};

/**
 * Vaccine search with specific criteria
 */
export const useVaccineSearch = (
  criteria: {
    name?: string;
    disease?: string;
    manufacturer?: string;
    ageGroup?: string;
    isActive?: boolean;
    limit?: number;
  },
  queryOptions?: UseQueryOptions<Vaccine[]>
) => {
  return useQuery({
    queryKey: ['vaccines', 'search', criteria],
    queryFn: () => vaccinesService.searchVaccines(criteria),
    enabled: !!criteria && Object.keys(criteria).some(key => criteria[key as keyof typeof criteria] !== undefined),
    ...queryOptions,
  });
};

/**
 * Vaccines by multiple diseases
 */
export const useVaccinesByDiseases = (
  diseases: string[],
  queryOptions?: UseQueryOptions<Vaccine[]>
) => {
  return useQuery({
    queryKey: ['vaccines', 'diseases', diseases],
    queryFn: () => vaccinesService.getByDiseases(diseases),
    enabled: diseases && diseases.length > 0,
    ...queryOptions,
  });
};

// =============================================================================
// IMMUNIZATION RECORD SEARCH HOOKS
// =============================================================================

/**
 * Advanced search hook for immunization records
 */
export const useAdvancedImmunizationRecordSearch = (
  options: AdvancedSearchOptions,
  queryOptions?: UseQueryOptions<QueryResponse<ImmunizationRecord>>
) => {
  return useQuery({
    queryKey: searchKeys.immunizationRecordSearch(options),
    queryFn: () => immunizationRecordsService.advancedSearch(options),
    enabled: !!options && Object.keys(options).length > 0,
    ...queryOptions,
  });
};

/**
 * Immunization record search with specific criteria
 */
export const useImmunizationRecordSearch = (
  criteria: {
    patientId?: string;
    vaccineId?: string;
    facilityId?: string;
    administeredBy?: string;
    batchNumber?: string;
    dateRange?: { start?: Date | string; end?: Date | string };
    limit?: number;
  },
  queryOptions?: UseQueryOptions<ImmunizationRecord[]>
) => {
  return useQuery({
    queryKey: ['immunizationRecords', 'search', criteria],
    queryFn: () => immunizationRecordsService.searchImmunizationRecords(criteria),
    enabled: !!criteria && Object.keys(criteria).some(key => criteria[key as keyof typeof criteria] !== undefined),
    ...queryOptions,
  });
};

/**
 * Immunization records by multiple vaccines
 */
export const useImmunizationRecordsByVaccines = (
  vaccineIds: string[],
  queryOptions?: UseQueryOptions<ImmunizationRecord[]>
) => {
  return useQuery({
    queryKey: ['immunizationRecords', 'vaccines', vaccineIds],
    queryFn: () => immunizationRecordsService.getByVaccines(vaccineIds),
    enabled: vaccineIds && vaccineIds.length > 0,
    ...queryOptions,
  });
};

/**
 * Overdue immunizations
 */
export const useOverdueImmunizations = (
  asOfDate?: Date | string,
  limit: number = 100,
  queryOptions?: UseQueryOptions<ImmunizationRecord[]>
) => {
  return useQuery({
    queryKey: ['immunizationRecords', 'overdue', { asOfDate, limit }],
    queryFn: () => immunizationRecordsService.getOverdueImmunizations(asOfDate),
    ...queryOptions,
  });
};

// =============================================================================
// QUERY BUILDER HOOKS
// =============================================================================

/**
 * Hook for using query builder pattern
 */
export const useQueryBuilder = (collectionId: string) => {
  const queryClient = useQueryClient();

  const executeQuery = useMutation({
    mutationFn: async (builder: QueryBuilder) => {
      return builder.execute();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: searchKeys.all });
    },
  });

  return {
    createBuilder: () => createQueryBuilder(collectionId),
    executeQuery,
  };
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for debounced search
 */
export const useDebouncedSearch = (
  searchTerm: string,
  collection: 'patients' | 'facilities' | 'vaccines' | 'immunizationRecords',
  searchFields: string[],
  delay: number = 300
) => {
  return useQuery({
    queryKey: ['debouncedSearch', collection, searchTerm, searchFields],
    queryFn: async () => {
      // Simulate debounced search
      await new Promise(resolve => setTimeout(resolve, delay));

      switch (collection) {
        case 'patients':
          return patientsService.search(searchTerm, searchFields);
        case 'facilities':
          return facilitiesService.search(searchTerm, searchFields);
        case 'vaccines':
          return vaccinesService.search(searchTerm, searchFields);
        case 'immunizationRecords':
          return immunizationRecordsService.search(searchTerm, searchFields);
        default:
          return [];
      }
    },
    enabled: !!searchTerm && searchTerm.length > 2,
  });
};

export default {
  useAdvancedPatientSearch,
  usePatientSearch,
  usePatientsByAgeRange,
  useAdvancedFacilitySearch,
  useFacilitySearch,
  useFacilitiesByLocation,
  useAdvancedVaccineSearch,
  useVaccineSearch,
  useVaccinesByDiseases,
  useAdvancedImmunizationRecordSearch,
  useImmunizationRecordSearch,
  useImmunizationRecordsByVaccines,
  useOverdueImmunizations,
  useQueryBuilder,
  useDebouncedSearch,
};