import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { Query } from 'react-native-appwrite';
import { patientsService } from '../services/patientsService';
import { immunizationRecordsService } from '../services/immunizationRecordsService';
import { facilitiesService } from '../services/facilitiesService';
import type { Patient, ImmunizationRecord, Facility } from '../types/appwrite';
import type { ProfileQueryOptions } from '../types/profile';

// Query keys for infinite queries
export const infiniteQueryKeys = {
  patients: {
    infinite: (filters: ProfileQueryOptions) => ['patients', 'infinite', filters],
  },
  immunizationRecords: {
    infinite: (filters: Record<string, unknown>) => ['immunizationRecords', 'infinite', filters],
  },
  facilities: {
    infinite: (filters: Record<string, unknown>) => ['facilities', 'infinite', filters],
  },
  search: {
    infinite: (query: string, type: string, filters: Record<string, unknown>) => ['search', 'infinite', query, type, filters],
  },
};

// Page size constants
const PATIENTS_PAGE_SIZE = 20;
const IMMUNIZATION_RECORDS_PAGE_SIZE = 25;
const FACILITIES_PAGE_SIZE = 15;
const SEARCH_PAGE_SIZE = 20;

// Infinite Patients Hook
export const useInfinitePatients = (
  filters: ProfileQueryOptions = {},
  options?: Omit<UseInfiniteQueryOptions<
    { documents: Patient[]; total: number },
    Error,
    { documents: Patient[]; total: number },
    any[],
    number
  >, 'queryKey' | 'queryFn' | 'getNextPageParam'>
) => {
  return useInfiniteQuery({
    queryKey: infiniteQueryKeys.patients.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const queries = [];

      // Add filters from ProfileQueryOptions
      if (filters.facilityId) {
        queries.push(Query.equal('facility_id', filters.facilityId));
      }
      if (filters.status) {
        queries.push(Query.equal('status', filters.status));
      }
      if (filters.verificationStatus) {
        queries.push(Query.equal('verification_status', filters.verificationStatus));
      }

      const result = await patientsService.list({
        queries,
        limit: PATIENTS_PAGE_SIZE,
        offset: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.documents.length, 0);
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
    initialPageParam: 0,
    ...options,
  });
};

// Infinite Immunization Records Hook
export const useInfiniteImmunizationRecords = (
  filters: {
    patientId?: string;
    facilityId?: string;
    vaccineId?: string;
    dateRange?: { start?: string; end?: string };
  } = {},
  options?: Omit<UseInfiniteQueryOptions<
    { documents: ImmunizationRecord[]; total: number },
    Error,
    { documents: ImmunizationRecord[]; total: number },
    any[],
    number
  >, 'queryKey' | 'queryFn' | 'getNextPageParam'>
) => {
  return useInfiniteQuery({
    queryKey: infiniteQueryKeys.immunizationRecords.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const queries = [];

      if (filters.patientId) {
        queries.push(Query.equal('patient_id', filters.patientId));
      }
      if (filters.facilityId) {
        queries.push(Query.equal('facility_id', filters.facilityId));
      }
      if (filters.vaccineId) {
        queries.push(Query.equal('vaccine_id', filters.vaccineId));
      }
      if (filters.dateRange?.start) {
        queries.push(Query.greaterThanEqual('administration_date', filters.dateRange.start));
      }
      if (filters.dateRange?.end) {
        queries.push(Query.lessThanEqual('administration_date', filters.dateRange.end));
      }

      queries.push(Query.orderDesc('administration_date'));

      const result = await immunizationRecordsService.list({
        queries,
        limit: IMMUNIZATION_RECORDS_PAGE_SIZE,
        offset: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.documents.length, 0);
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
    initialPageParam: 0,
    ...options,
  });
};

// Infinite Facilities Hook
export const useInfiniteFacilities = (
  filters: {
    district?: string;
    region?: string;
    isActive?: boolean;
  } = {},
  options?: Omit<UseInfiniteQueryOptions<
    { documents: Facility[]; total: number },
    Error,
    { documents: Facility[]; total: number },
    any[],
    number
  >, 'queryKey' | 'queryFn' | 'getNextPageParam'>
) => {
  return useInfiniteQuery({
    queryKey: infiniteQueryKeys.facilities.infinite(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const queries = [];

      if (filters.district) {
        queries.push(Query.equal('district', filters.district));
      }
      if (filters.region) {
        queries.push(Query.equal('region', filters.region));
      }
      if (filters.isActive !== undefined) {
        queries.push(Query.equal('is_active', filters.isActive));
      }

      const result = await facilitiesService.list({
        queries,
        limit: FACILITIES_PAGE_SIZE,
        offset: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.documents.length, 0);
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
    initialPageParam: 0,
    ...options,
  });
};

// Infinite Search Results Hook (generic for patients, facilities, etc.)
export const useInfiniteSearchResults = (
  searchQuery: string,
  searchType: 'patients' | 'facilities' | 'immunizationRecords',
  filters: Record<string, unknown> = {},
  options?: Omit<UseInfiniteQueryOptions<
    { documents: any[]; total: number },
    Error,
    { documents: any[]; total: number },
    any[],
    number
  >, 'queryKey' | 'queryFn' | 'getNextPageParam'>
) => {
  return useInfiniteQuery({
    queryKey: infiniteQueryKeys.search.infinite(searchQuery, searchType, filters),
    queryFn: async ({ pageParam = 0 }) => {
      let service;
      let searchFields: string[] = [];
      let limit = SEARCH_PAGE_SIZE;

      switch (searchType) {
        case 'patients':
          service = patientsService;
          searchFields = ['full_name', 'patient_id'];
          break;
        case 'facilities':
          service = facilitiesService;
          searchFields = ['name', 'district'];
          break;
        case 'immunizationRecords':
          service = immunizationRecordsService;
          searchFields = ['batch_number'];
          break;
        default:
          throw new Error(`Unsupported search type: ${searchType}`);
      }

      const queries = searchFields.map(field => Query.search(field, searchQuery));

      // Add any additional filters
      if (filters.queries) {
        queries.push(...(filters.queries as string[]));
      }

      const result = await service.list({
        queries,
        limit,
        offset: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.documents.length, 0);
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
    initialPageParam: 0,
    enabled: !!searchQuery.trim(),
    ...options,
  });
};

// Utility hook to flatten infinite query data
export const useFlattenedInfiniteData = <T>(infiniteQuery: {
  data?: { pages: Array<{ documents: T[]; total: number }> };
  isLoading: boolean;
  isError: boolean;
  error: any;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}) => {
  const flattenedData = infiniteQuery.data?.pages.flatMap(page => page.documents) || [];
  const totalCount = infiniteQuery.data?.pages[0]?.total || 0;

  return {
    data: flattenedData,
    totalCount,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  };
};

export default {
  useInfinitePatients,
  useInfiniteImmunizationRecords,
  useInfiniteFacilities,
  useInfiniteSearchResults,
  useFlattenedInfiniteData,
};