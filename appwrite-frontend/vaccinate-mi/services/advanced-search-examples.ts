/**
 * Advanced Search and Filtering Examples
 * Comprehensive examples for using the enhanced Appwrite database search capabilities
 */

import {
  patientsService,
  facilitiesService,
  vaccinesService,
  immunizationRecordsService,
  AdvancedSearchOptions,
  AdvancedFilter,
  LogicalOperator,
  QueryBuilder,
  createQueryBuilder,
  buildComplexQuery,
} from './appwriteDatabase';

import {
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
} from '../hooks/useAdvancedSearch';

// =============================================================================
// BASIC SEARCH EXAMPLES
// =============================================================================

/**
 * Example 1: Basic full-text search across patients
 */
export const basicPatientSearchExample = async () => {
  try {
    // Search patients by name
    const patients = await patientsService.search('John', ['full_name'], 20);
    console.log('Found patients:', patients);

    // Search facilities by name
    const facilities = await facilitiesService.search('Hospital', ['name'], 10);
    console.log('Found facilities:', facilities);

    return { patients, facilities };
  } catch (error) {
    console.error('Basic search error:', error);
    throw error;
  }
};

/**
 * Example 2: Advanced filtering with multiple criteria
 */
export const advancedFilteringExample = async () => {
  try {
    // Search patients with multiple filters
    const options: AdvancedSearchOptions = {
      filters: [
        { field: 'district', operator: 'equal', value: 'Central District' },
        { field: 'facility_id', operator: 'equal', value: 'facility-123' },
      ],
      sortBy: { field: 'full_name', order: 'ASC' },
      limit: 50,
    };

    const result = await patientsService.advancedSearch(options);
    console.log('Filtered patients:', result.documents);
    console.log('Total count:', result.total);

    return result;
  } catch (error) {
    console.error('Advanced filtering error:', error);
    throw error;
  }
};

// =============================================================================
// DATE RANGE SEARCH EXAMPLES
// =============================================================================

/**
 * Example 3: Date range filtering for immunization records
 */
export const dateRangeSearchExample = async () => {
  try {
    // Get immunizations from the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const options: AdvancedSearchOptions = {
      dateRange: {
        field: 'administration_date',
        start: oneMonthAgo.toISOString(),
        end: new Date().toISOString(),
      },
      sortBy: { field: 'administration_date', order: 'DESC' },
      limit: 100,
    };

    const result = await immunizationRecordsService.advancedSearch(options);
    console.log('Recent immunizations:', result.documents);

    return result;
  } catch (error) {
    console.error('Date range search error:', error);
    throw error;
  }
};

/**
 * Example 4: Patient age range filtering
 */
export const ageRangeSearchExample = async () => {
  try {
    // Get patients aged 1-5 years (eligible for certain vaccines)
    const patients = await patientsService.getByAgeRange(1, 5, 100);
    console.log('Children aged 1-5:', patients);

    return patients;
  } catch (error) {
    console.error('Age range search error:', error);
    throw error;
  }
};

// =============================================================================
// GEOLOCATION SEARCH EXAMPLES
// =============================================================================

/**
 * Example 5: Facility location-based search
 */
export const geolocationSearchExample = async () => {
  try {
    // Find facilities within 10km of a location
    const lat = -1.2864; // Nairobi coordinates as example
    const lng = 36.8172;

    const facilities = await facilitiesService.searchByLocation(lat, lng, 10);
    console.log('Nearby facilities:', facilities);

    return facilities;
  } catch (error) {
    console.error('Geolocation search error:', error);
    throw error;
  }
};

// =============================================================================
// LOGICAL OPERATORS EXAMPLES
// =============================================================================

/**
 * Example 6: Complex queries with logical operators
 */
export const logicalOperatorsExample = async () => {
  try {
    // Find patients who are either in Central District OR assigned to specific health worker
    const logicalOp: LogicalOperator = {
      type: 'OR',
      conditions: [
        { field: 'district', operator: 'equal', value: 'Central District' },
        { field: 'health_worker_id', operator: 'equal', value: 'worker-123' },
      ],
    };

    const result = await patientsService.searchWithLogicalOperators(logicalOp, 50);
    console.log('Patients by district OR health worker:', result.documents);

    return result;
  } catch (error) {
    console.error('Logical operators error:', error);
    throw error;
  }
};

/**
 * Example 7: Nested logical operators
 */
export const nestedLogicalOperatorsExample = async () => {
  try {
    // Complex query: (district = Central AND age < 5) OR (facility = Hospital A)
    const complexQuery: LogicalOperator = {
      type: 'OR',
      conditions: [
        {
          type: 'AND',
          conditions: [
            { field: 'district', operator: 'equal', value: 'Central District' },
            { field: 'date_of_birth', operator: 'greaterThan', value: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString() },
          ],
        },
        { field: 'facility_id', operator: 'equal', value: 'facility-456' },
      ],
    };

    const result = await patientsService.searchWithLogicalOperators(complexQuery, 100);
    console.log('Complex patient search:', result.documents);

    return result;
  } catch (error) {
    console.error('Nested logical operators error:', error);
    throw error;
  }
};

// =============================================================================
// QUERY BUILDER EXAMPLES
// =============================================================================

/**
 * Example 8: Using the Query Builder pattern
 */
export const queryBuilderExample = async () => {
  try {
    // Build a complex query using the fluent API
    const builder = createQueryBuilder('patients')
      .search('John', 'full_name')
      .filter({ field: 'district', operator: 'equal', value: 'Central District' })
      .dateRange('date_of_birth',
        new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 18 years ago
        new Date(Date.now() - 1 * 365 * 24 * 60 * 60 * 1000).toISOString()   // 1 year ago
      )
      .sortBy('full_name', 'ASC')
      .paginate(25, 0);

    const result = await builder.execute();
    console.log('Query builder result:', result.documents);

    return result;
  } catch (error) {
    console.error('Query builder error:', error);
    throw error;
  }
};

// =============================================================================
// COMPLEX QUERY UTILITY EXAMPLES
// =============================================================================

/**
 * Example 9: Using buildComplexQuery utility
 */
export const complexQueryUtilityExample = async () => {
  try {
    const queries = buildComplexQuery({
      searchTerms: ['measles', 'MMR'],
      searchFields: ['disease_targeted', 'name'],
      filters: [
        { field: 'is_active', operator: 'equal', value: true },
      ],
      sortBy: { field: 'name', order: 'ASC' },
      limit: 20,
    });

    // Execute the query using the base service
    const service = patientsService; // Replace with appropriate service
    const result = await service.list({ queries });
    console.log('Complex query result:', result.documents);

    return result;
  } catch (error) {
    console.error('Complex query utility error:', error);
    throw error;
  }
};

// =============================================================================
// REACT HOOKS EXAMPLES (for use in components)
// =============================================================================

/**
 * Example 10: Using React Query hooks in components
 */
export const reactHooksExamples = {
  // Basic patient search hook
  usePatientSearchExample: (searchTerm: string) => {
    return usePatientSearch({
      name: searchTerm,
      limit: 20,
    });
  },

  // Advanced facility search with geolocation
  useFacilityLocationSearchExample: (lat: number, lng: number) => {
    return useFacilitiesByLocation(lat, lng, 5);
  },

  // Vaccine search by multiple diseases
  useVaccineDiseaseSearchExample: (diseases: string[]) => {
    return useVaccinesByDiseases(diseases);
  },

  // Immunization records with date range
  useImmunizationDateRangeExample: (startDate: string, endDate: string) => {
    return useImmunizationRecordSearch({
      dateRange: { start: startDate, end: endDate },
      limit: 100,
    });
  },

  // Overdue immunizations
  useOverdueImmunizationsExample: () => {
    return useOverdueImmunizations(new Date().toISOString(), 50);
  },

  // Debounced search for better UX
  useDebouncedPatientSearchExample: (searchTerm: string) => {
    return useDebouncedSearch(searchTerm, 'patients', ['full_name'], 300);
  },

  // Query builder hook
  useQueryBuilderExample: () => {
    const { createBuilder, executeQuery } = useQueryBuilder('patients');

    const handleSearch = async () => {
      const builder = createBuilder()
        .search('John', 'full_name')
        .filter({ field: 'district', operator: 'equal', value: 'Central' })
        .sortBy('full_name', 'ASC')
        .paginate(10, 0);

      return executeQuery.mutateAsync(builder);
    };

    return { handleSearch, isLoading: executeQuery.isPending };
  },
};

// =============================================================================
// REAL-WORLD USE CASE EXAMPLES
// =============================================================================

/**
 * Example 11: Comprehensive vaccination campaign planning
 */
export const vaccinationCampaignExample = async () => {
  try {
    // 1. Find target facilities in a district
    const facilities = await facilitiesService.searchFacilities({
      district: 'Central District',
      limit: 10,
    });

    // 2. Find eligible patients (age 1-5 years) in those facilities
    const patientFilters: AdvancedFilter[] = [
      { field: 'facility_id', operator: 'equal', values: facilities.map(f => f.$id) },
    ];

    const patients = await patientsService.getByAgeRange(1, 5, 200);

    // 3. Find relevant vaccines
    const vaccines = await vaccinesService.searchVaccines({
      disease: 'Measles',
      isActive: true,
    });

    // 4. Check existing immunizations to avoid duplicates
    const existingImmunizations = await immunizationRecordsService.searchImmunizationRecords({
      patientId: patients[0]?.$id, // Example for first patient
      vaccineId: vaccines[0]?.$id,
      dateRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
      },
    });

    console.log('Campaign planning data:', {
      facilities: facilities.length,
      eligiblePatients: patients.length,
      availableVaccines: vaccines.length,
      existingCoverage: existingImmunizations.length,
    });

    return { facilities, patients, vaccines, existingImmunizations };
  } catch (error) {
    console.error('Vaccination campaign planning error:', error);
    throw error;
  }
};

/**
 * Example 12: Health worker dashboard data
 */
export const healthWorkerDashboardExample = async (healthWorkerId: string) => {
  try {
    // Get assigned patients
    const patients = await patientsService.getByHealthWorker(healthWorkerId);

    // Get recent immunizations administered by this worker
    const recentImmunizations = await immunizationRecordsService.searchImmunizationRecords({
      administeredBy: healthWorkerId,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      },
      limit: 100,
    });

    // Get overdue patients (patients who need vaccinations)
    const overdueImmunizations = await immunizationRecordsService.getOverdueImmunizations();

    // Get facility information
    const facilities = await facilitiesService.list({ limit: 10 });

    return {
      assignedPatients: patients,
      recentActivity: recentImmunizations,
      overdueCases: overdueImmunizations,
      facilities,
    };
  } catch (error) {
    console.error('Health worker dashboard error:', error);
    throw error;
  }
};

/**
 * Example 13: Reporting and analytics queries
 */
export const reportingQueriesExample = async () => {
  try {
    // Monthly immunization coverage report
    const monthlyReport = await immunizationRecordsService.searchImmunizationRecords({
      dateRange: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        end: new Date().toISOString(),
      },
      limit: 1000,
    });

    // Facility performance metrics
    const facilityPerformance = await facilitiesService.list({
      queries: [], // Add performance-related queries
      limit: 50,
    });

    // Vaccine stock and usage analysis
    const vaccineUsage = await vaccinesService.list({
      queries: [], // Add usage tracking queries
      limit: 100,
    });

    return {
      monthlyReport,
      facilityPerformance,
      vaccineUsage,
    };
  } catch (error) {
    console.error('Reporting queries error:', error);
    throw error;
  }
};

// =============================================================================
// EXPORT ALL EXAMPLES
// =============================================================================

export const advancedSearchExamples = {
  basicPatientSearchExample,
  advancedFilteringExample,
  dateRangeSearchExample,
  ageRangeSearchExample,
  geolocationSearchExample,
  logicalOperatorsExample,
  nestedLogicalOperatorsExample,
  queryBuilderExample,
  complexQueryUtilityExample,
  reactHooksExamples,
  vaccinationCampaignExample,
  healthWorkerDashboardExample,
  reportingQueriesExample,
};

export default advancedSearchExamples;