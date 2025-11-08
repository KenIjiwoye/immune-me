/**
 * Appwrite Database Service Layer
 * Provides type-safe database operations for all collections
 */

import { databases, APPWRITE_CONFIG, COLLECTION_IDS, logAppwriteError, withRetry } from './appwrite';
import { createQuery, buildFilterQueries, buildDateRangeQuery, buildGeoLocationQuery, buildSearchQuery } from '../utils/queries';
import { Query, ID } from 'react-native-appwrite';
import type {
  AppwriteDocument,
  QueryResponse,
} from '../types/appwrite';

// Advanced search and filter types
export interface SearchOptions {
  query?: string;
  fields?: string[];
  limit?: number;
  offset?: number;
}

export interface AdvancedFilter {
  field: string;
  operator: 'equal' | 'notEqual' | 'lessThan' | 'greaterThan' | 'lessThanEqual' | 'greaterThanEqual' | 'search' | 'between' | 'isNull' | 'isNotNull' | 'startsWith' | 'endsWith' | 'contains';
  value?: any;
  values?: any[];
}

export interface AdvancedSearchOptions {
  filters?: AdvancedFilter[];
  search?: SearchOptions;
  dateRange?: {
    field: string;
    start?: Date | string;
    end?: Date | string;
  };
  geoLocation?: {
    field: string;
    lat: number;
    lng: number;
    radius?: number;
  };
  sortBy?: {
    field: string;
    order: 'ASC' | 'DESC';
  };
  limit?: number;
  offset?: number;
}

export interface LogicalOperator {
  type: 'AND' | 'OR';
  conditions: (AdvancedFilter | LogicalOperator)[];
}

// Collection Types (fresh from Appwrite Cloud)
import type {
  Facility,
  Patient,
  Vaccine,
  ImmunizationRecord,
  Notification,
  SupplementaryImmunization,
  VaccineSchedule,
  VaccineScheduleItem,
  AdminProfile,
  EmployeeProfile,
  ProfileVerificationWorkflow,
  AccessAuditLog,
  AuditCollection,
  RoleChangeLog,
} from '../types/appwrite';

// =============================================================================
// GENERIC DATABASE SERVICE CLASS
// =============================================================================

/**
 * Generic database service with type safety
 */
export class DatabaseService<T extends AppwriteDocument> {
  constructor(
    private collectionId: string,
    private databaseId: string = APPWRITE_CONFIG.databaseId
  ) {}

  /**
   * Create a new document
   */
  async create(data: Omit<T, keyof AppwriteDocument>, documentId?: string): Promise<T> {
    try {
      const id = documentId || ID.unique();
      const result = await withRetry(() =>
        databases.createDocument(this.databaseId, this.collectionId, id, data)
      );
      return result as unknown as T;
    } catch (error) {
      logAppwriteError(error, `DatabaseService.create - Collection: ${this.collectionId}`);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  async get(documentId: string): Promise<T> {
    try {
      const result = await withRetry(() =>
        databases.getDocument(this.databaseId, this.collectionId, documentId)
      );
      return result as unknown as T;
    } catch (error) {
      logAppwriteError(error, `DatabaseService.get - Collection: ${this.collectionId}, ID: ${documentId}`);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async update(documentId: string, data: Partial<Omit<T, keyof AppwriteDocument>>): Promise<T> {
    try {
      const result = await withRetry(() =>
        databases.updateDocument(this.databaseId, this.collectionId, documentId, data)
      );
      return result as unknown as T;
    } catch (error) {
      logAppwriteError(error, `DatabaseService.update - Collection: ${this.collectionId}, ID: ${documentId}`);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async delete(documentId: string): Promise<void> {
    try {
      await withRetry(() =>
        databases.deleteDocument(this.databaseId, this.collectionId, documentId)
      );
    } catch (error) {
      logAppwriteError(error, `DatabaseService.delete - Collection: ${this.collectionId}, ID: ${documentId}`);
      throw error;
    }
  }

  /**
   * List documents with queries
   */
  async list(params?: {
    queries?: string[];
    limit?: number;
    offset?: number;
  }): Promise<QueryResponse<T>> {
    try {
      const queries = params?.queries || [];

      if (params?.limit) {
        queries.push(Query.limit(params.limit));
      }

      if (params?.offset) {
        queries.push(Query.offset(params.offset));
      }

      const result = await withRetry(() =>
        databases.listDocuments(this.databaseId, this.collectionId, queries)
      );

      return {
        total: result.total,
        documents: result.documents as unknown as T[],
      };
    } catch (error) {
      logAppwriteError(error, `DatabaseService.list - Collection: ${this.collectionId}`);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async search(searchTerm: string, searchFields: string[], limit: number = 25): Promise<T[]> {
    try {
      const queries = searchFields.map(field => Query.search(field, searchTerm));
      queries.push(Query.limit(limit));

      const result = await withRetry(() =>
        databases.listDocuments(this.databaseId, this.collectionId, queries)
      );

      return result.documents as unknown as T[];
    } catch (error) {
      logAppwriteError(error, `DatabaseService.search - Collection: ${this.collectionId}, Term: ${searchTerm}`);
      throw error;
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(options: AdvancedSearchOptions): Promise<QueryResponse<T>> {
    try {
      const queries: string[] = [];

      // Add filters
      if (options.filters && options.filters.length > 0) {
        const filterQueries = buildFilterQueries(options.filters.map(filter => ({
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          values: filter.values,
        })));
        queries.push(...filterQueries);
      }

      // Add search
      if (options.search?.query && options.search.fields) {
        const searchQueries = options.search.fields.map(field =>
          buildSearchQuery(field, options.search!.query!)
        );
        queries.push(...searchQueries);
      }

      // Add date range
      if (options.dateRange) {
        const dateQueries = buildDateRangeQuery(
          options.dateRange.field,
          options.dateRange.start,
          options.dateRange.end
        );
        queries.push(...dateQueries);
      }

      // Add geolocation
      if (options.geoLocation) {
        const geoQueries = buildGeoLocationQuery(
          options.geoLocation.field,
          options.geoLocation.lat,
          options.geoLocation.lng,
          options.geoLocation.radius
        );
        queries.push(...geoQueries);
      }

      // Add sorting
      if (options.sortBy) {
        queries.push(
          options.sortBy.order === 'ASC'
            ? Query.orderAsc(options.sortBy.field)
            : Query.orderDesc(options.sortBy.field)
        );
      }

      // Add pagination
      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }
      if (options.offset) {
        queries.push(Query.offset(options.offset));
      }

      const result = await withRetry(() =>
        databases.listDocuments(this.databaseId, this.collectionId, queries)
      );

      return {
        total: result.total,
        documents: result.documents as unknown as T[],
      };
    } catch (error) {
      logAppwriteError(error, `DatabaseService.advancedSearch - Collection: ${this.collectionId}`);
      throw error;
    }
  }

  /**
   * Search with logical operators (AND/OR)
   */
  async searchWithLogicalOperators(logicalOp: LogicalOperator, limit: number = 25): Promise<QueryResponse<T>> {
    try {
      const queries = this.buildLogicalQueries(logicalOp);
      queries.push(Query.limit(limit));

      const result = await withRetry(() =>
        databases.listDocuments(this.databaseId, this.collectionId, queries)
      );

      return {
        total: result.total,
        documents: result.documents as unknown as T[],
      };
    } catch (error) {
      logAppwriteError(error, `DatabaseService.searchWithLogicalOperators - Collection: ${this.collectionId}`);
      throw error;
    }
  }

  /**
   * Build queries from logical operators
   */
  private buildLogicalQueries(logicalOp: LogicalOperator): string[] {
    const queries: string[] = [];

    for (const condition of logicalOp.conditions) {
      if ('type' in condition) {
        // It's a nested logical operator
        const nestedQueries = this.buildLogicalQueries(condition);
        queries.push(...nestedQueries);
      } else {
        // It's a filter
        const filter = condition as AdvancedFilter;
        const filterQuery = buildFilterQueries([{
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          values: filter.values,
        }]);
        queries.push(...filterQuery);
      }
    }

    return queries;
  }

  /**
   * Count documents with optional filters
   */
  async count(queries?: string[]): Promise<number> {
    try {
      const result = await withRetry(() =>
        databases.listDocuments(this.databaseId, this.collectionId, [
          ...(queries || []),
          Query.limit(1), // We only need the count
        ])
      );

      return result.total;
    } catch (error) {
      logAppwriteError(error, `DatabaseService.count - Collection: ${this.collectionId}`);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async exists(documentId: string): Promise<boolean> {
    try {
      await this.get(documentId);
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Batch create documents
   */
  async batchCreate(documents: Array<Omit<T, keyof AppwriteDocument>>): Promise<T[]> {
    const results: T[] = [];
    const errors: Array<{ index: number; error: any }> = [];

    for (let i = 0; i < documents.length; i++) {
      try {
        const result = await this.create(documents[i]);
        results.push(result);
      } catch (error) {
        errors.push({ index: i, error });
      }
    }

    if (errors.length > 0) {
      console.warn(`Batch create completed with ${errors.length} errors:`, errors);
    }

    return results;
  }
}

// =============================================================================
// COLLECTION-SPECIFIC SERVICES
// =============================================================================

/**
 * Facilities Service
 */
export class FacilitiesService extends DatabaseService<Facility> {
  constructor() {
    super(COLLECTION_IDS.FACILITIES);
  }

  async getByDistrict(district: string): Promise<Facility[]> {
    const result = await this.list({
      queries: [Query.equal('district', district)],
    });
    return result.documents;
  }

  async searchByName(name: string): Promise<Facility[]> {
    return this.search(name, ['name'], 10);
  }

  /**
   * Advanced search for facilities
   */
  async advancedSearch(options: AdvancedSearchOptions): Promise<QueryResponse<Facility>> {
    return this.advancedSearch(options);
  }

  /**
   * Search facilities by location (geospatial)
   */
  async searchByLocation(lat: number, lng: number, radiusKm: number = 10): Promise<Facility[]> {
    const result = await this.advancedSearch({
      geoLocation: {
        field: 'location', // Assuming facilities have a location field
        lat,
        lng,
        radius: radiusKm,
      },
      limit: 20,
    });
    return result.documents;
  }

  /**
   * Search facilities with multiple criteria
   */
  async searchFacilities(criteria: {
    name?: string;
    district?: string;
    contactPhone?: string;
    limit?: number;
  }): Promise<Facility[]> {
    const filters: AdvancedFilter[] = [];

    if (criteria.name) {
      filters.push({ field: 'name', operator: 'search', value: criteria.name });
    }
    if (criteria.district) {
      filters.push({ field: 'district', operator: 'equal', value: criteria.district });
    }
    if (criteria.contactPhone) {
      filters.push({ field: 'contact_phone', operator: 'startsWith', value: criteria.contactPhone });
    }

    const result = await this.advancedSearch({
      filters,
      limit: criteria.limit || 25,
    });
    return result.documents;
  }
}

/**
 * Patients Service
 */
export class PatientsService extends DatabaseService<Patient> {
  constructor() {
    super(COLLECTION_IDS.PATIENTS);
  }

  async getByFacility(facilityId: string, limit: number = 50): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('facility_id', facilityId)],
      limit,
    });
    return result.documents;
  }

  async searchByName(name: string): Promise<Patient[]> {
    return this.search(name, ['full_name'], 20);
  }

  async getByHealthWorker(healthWorkerId: string): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('health_worker_id', healthWorkerId)],
    });
    return result.documents;
  }

  async getByDistrict(district: string): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('district', district)],
    });
    return result.documents;
  }

  /**
   * Advanced search for patients
   */
  async advancedSearch(options: AdvancedSearchOptions): Promise<QueryResponse<Patient>> {
    return this.advancedSearch(options);
  }

  /**
   * Search patients by multiple criteria
   */
  async searchPatients(criteria: {
    name?: string;
    district?: string;
    facilityId?: string;
    healthWorkerId?: string;
    dateOfBirthRange?: { start?: Date | string; end?: Date | string };
    limit?: number;
  }): Promise<Patient[]> {
    const filters: AdvancedFilter[] = [];

    if (criteria.name) {
      filters.push({ field: 'full_name', operator: 'search', value: criteria.name });
    }
    if (criteria.district) {
      filters.push({ field: 'district', operator: 'equal', value: criteria.district });
    }
    if (criteria.facilityId) {
      filters.push({ field: 'facility_id', operator: 'equal', value: criteria.facilityId });
    }
    if (criteria.healthWorkerId) {
      filters.push({ field: 'health_worker_id', operator: 'equal', value: criteria.healthWorkerId });
    }

    const result = await this.advancedSearch({
      filters,
      dateRange: criteria.dateOfBirthRange ? {
        field: 'date_of_birth',
        start: criteria.dateOfBirthRange.start,
        end: criteria.dateOfBirthRange.end,
      } : undefined,
      limit: criteria.limit || 50,
    });
    return result.documents;
  }

  /**
   * Get patients by age range
   */
  async getByAgeRange(minAge?: number, maxAge?: number, limit: number = 50): Promise<Patient[]> {
    const now = new Date();
    const filters: AdvancedFilter[] = [];

    if (maxAge !== undefined) {
      const maxBirthDate = new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate());
      filters.push({ field: 'date_of_birth', operator: 'greaterThanEqual', value: maxBirthDate.toISOString() });
    }

    if (minAge !== undefined) {
      const minBirthDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
      filters.push({ field: 'date_of_birth', operator: 'lessThanEqual', value: minBirthDate.toISOString() });
    }

    const result = await this.advancedSearch({
      filters,
      sortBy: { field: 'date_of_birth', order: 'DESC' },
      limit,
    });
    return result.documents;
  }
}

/**
 * Vaccines Service
 */
export class VaccinesService extends DatabaseService<Vaccine> {
  constructor() {
    super(COLLECTION_IDS.VACCINES);
  }

  async getActive(): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('is_active', true)],
    });
    return result.documents;
  }

  async getByDisease(disease: string): Promise<Vaccine[]> {
    return this.search(disease, ['disease_targeted'], 10);
  }

  async getByAgeGroup(ageGroup: string): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('age_group', ageGroup)],
    });
    return result.documents;
  }

  /**
   * Advanced search for vaccines
   */
  async advancedSearch(options: AdvancedSearchOptions): Promise<QueryResponse<Vaccine>> {
    return this.advancedSearch(options);
  }

  /**
   * Search vaccines with multiple criteria
   */
  async searchVaccines(criteria: {
    name?: string;
    disease?: string;
    manufacturer?: string;
    ageGroup?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<Vaccine[]> {
    const filters: AdvancedFilter[] = [];

    if (criteria.name) {
      filters.push({ field: 'name', operator: 'search', value: criteria.name });
    }
    if (criteria.disease) {
      filters.push({ field: 'disease_targeted', operator: 'search', value: criteria.disease });
    }
    if (criteria.manufacturer) {
      filters.push({ field: 'manufacturer', operator: 'search', value: criteria.manufacturer });
    }
    if (criteria.ageGroup) {
      filters.push({ field: 'age_group', operator: 'equal', value: criteria.ageGroup });
    }
    if (criteria.isActive !== undefined) {
      filters.push({ field: 'is_active', operator: 'equal', value: criteria.isActive });
    }

    const result = await this.advancedSearch({
      filters,
      limit: criteria.limit || 25,
    });
    return result.documents;
  }

  /**
   * Get vaccines by multiple diseases
   */
  async getByDiseases(diseases: string[]): Promise<Vaccine[]> {
    const filters: AdvancedFilter[] = diseases.map(disease => ({
      field: 'disease_targeted',
      operator: 'search',
      value: disease,
    }));

    const result = await this.advancedSearch({
      filters,
      limit: 50,
    });
    return result.documents;
  }
}

/**
 * Immunization Records Service
 */
export class ImmunizationRecordsService extends DatabaseService<ImmunizationRecord> {
  constructor() {
    super(COLLECTION_IDS.IMMUNIZATION_RECORDS);
  }

  async getByPatient(patientId: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('patient_id', patientId),
        Query.orderDesc('administration_date'),
      ],
    });
    return result.documents;
  }

  async getByFacility(facilityId: string, limit: number = 100): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('facility_id', facilityId),
        Query.orderDesc('administration_date'),
      ],
      limit,
    });
    return result.documents;
  }

  async getByVaccine(vaccineId: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('vaccine_id', vaccineId),
        Query.orderDesc('administration_date'),
      ],
    });
    return result.documents;
  }

  async getByDateRange(startDate: string, endDate: string, facilityId?: string): Promise<ImmunizationRecord[]> {
    const queries = [
      Query.greaterThanEqual('administration_date', startDate),
      Query.lessThanEqual('administration_date', endDate),
      Query.orderDesc('administration_date'),
    ];

    if (facilityId) {
      queries.push(Query.equal('facility_id', facilityId));
    }

    const result = await this.list({ queries });
    return result.documents;
  }

  /**
   * Advanced search for immunization records
   */
  async advancedSearch(options: AdvancedSearchOptions): Promise<QueryResponse<ImmunizationRecord>> {
    return this.advancedSearch(options);
  }

  /**
   * Search immunization records with multiple criteria
   */
  async searchImmunizationRecords(criteria: {
    patientId?: string;
    vaccineId?: string;
    facilityId?: string;
    administeredBy?: string;
    batchNumber?: string;
    dateRange?: { start?: Date | string; end?: Date | string };
    limit?: number;
  }): Promise<ImmunizationRecord[]> {
    const filters: AdvancedFilter[] = [];

    if (criteria.patientId) {
      filters.push({ field: 'patient_id', operator: 'equal', value: criteria.patientId });
    }
    if (criteria.vaccineId) {
      filters.push({ field: 'vaccine_id', operator: 'equal', value: criteria.vaccineId });
    }
    if (criteria.facilityId) {
      filters.push({ field: 'facility_id', operator: 'equal', value: criteria.facilityId });
    }
    if (criteria.administeredBy) {
      filters.push({ field: 'administered_by', operator: 'search', value: criteria.administeredBy });
    }
    if (criteria.batchNumber) {
      filters.push({ field: 'batch_number', operator: 'equal', value: criteria.batchNumber });
    }

    const result = await this.advancedSearch({
      filters,
      dateRange: criteria.dateRange ? {
        field: 'administration_date',
        start: criteria.dateRange.start,
        end: criteria.dateRange.end,
      } : undefined,
      sortBy: { field: 'administration_date', order: 'DESC' },
      limit: criteria.limit || 100,
    });
    return result.documents;
  }

  /**
   * Get immunization records by multiple vaccines
   */
  async getByVaccines(vaccineIds: string[]): Promise<ImmunizationRecord[]> {
    const filters: AdvancedFilter[] = vaccineIds.map(vaccineId => ({
      field: 'vaccine_id',
      operator: 'equal',
      value: vaccineId,
    }));

    const result = await this.advancedSearch({
      filters,
      sortBy: { field: 'administration_date', order: 'DESC' },
      limit: 200,
    });
    return result.documents;
  }

  /**
   * Get overdue immunizations
   */
  async getOverdueImmunizations(asOfDate?: Date | string): Promise<ImmunizationRecord[]> {
    const cutoffDate = asOfDate ? new Date(asOfDate).toISOString() : new Date().toISOString();

    const result = await this.advancedSearch({
      filters: [
        { field: 'administration_date', operator: 'lessThan', value: cutoffDate },
        { field: 'administration_date', operator: 'isNotNull', value: null },
      ],
      sortBy: { field: 'administration_date', order: 'ASC' },
      limit: 100,
    });
    return result.documents;
  }
}

/**
 * Notifications Service
 */
export class NotificationsService extends DatabaseService<Notification> {
  constructor() {
    super(COLLECTION_IDS.NOTIFICATIONS);
  }

  async getByRecipient(recipientId: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('recipient_id', recipientId),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  async getUnread(recipientId: string): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('recipient_id', recipientId),
        Query.equal('is_read', false),
        Query.orderDesc('$createdAt'),
      ],
    });
    return result.documents;
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return this.update(notificationId, { is_read: true });
  }

  async getByFacility(facilityId: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('facility_id', facilityId),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  async getByPriority(priority: string, limit: number = 25): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('priority', priority),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }
}

/**
 * Admin Profiles Service
 */
export class AdminProfilesService extends DatabaseService<AdminProfile> {
  constructor() {
    super(COLLECTION_IDS.ADMIN_PROFILES);
  }

  async getByUserId(userId: string): Promise<AdminProfile | null> {
    try {
      const result = await this.list({
        queries: [Query.equal('user_id', userId)],
        limit: 1,
      });
      return result.documents[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getByAdminLevel(adminLevel: string): Promise<AdminProfile[]> {
    const result = await this.list({
      queries: [Query.equal('admin_level', adminLevel)],
    });
    return result.documents;
  }
}

/**
 * Employee Profiles Service
 */
export class EmployeeProfilesService extends DatabaseService<EmployeeProfile> {
  constructor() {
    super(COLLECTION_IDS.EMPLOYEE_PROFILES);
  }

  async getByUserId(userId: string): Promise<EmployeeProfile | null> {
    try {
      const result = await this.list({
        queries: [Query.equal('user_id', userId)],
        limit: 1,
      });
      return result.documents[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getByFacility(facilityId: string): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('primary_facility_id', facilityId)],
    });
    return result.documents;
  }

  async getByEmployeeType(employeeType: string): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('employee_type', employeeType)],
    });
    return result.documents;
  }
}


/**
 * Profile Verification Workflow Service
 */
export class ProfileVerificationWorkflowService extends DatabaseService<ProfileVerificationWorkflow> {
  constructor() {
    super(COLLECTION_IDS.PROFILE_VERIFICATION_WORKFLOW);
  }

  async getByProfileId(profileId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('profile_id', profileId)],
    });
    return result.documents;
  }

  async getByUserId(userId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('user_id', userId)],
    });
    return result.documents;
  }

  async getByStatus(status: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('status', status)],
    });
    return result.documents;
  }

  async getByAssignedUser(assignedUserId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('assigned_to_user_id', assignedUserId)],
    });
    return result.documents;
  }

  async getByFacility(facilityId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('facility_id', facilityId)],
    });
    return result.documents;
  }

  async getByPriority(priority: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('priority', priority)],
    });
    return result.documents;
  }

  async getPending(): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('status', 'pending')],
    });
    return result.documents;
  }

  async getOverdue(): Promise<ProfileVerificationWorkflow[]> {
    const now = new Date().toISOString();
    const result = await this.list({
      queries: [
        Query.lessThan('due_date', now),
        Query.notEqual('status', 'completed'),
      ],
    });
    return result.documents;
  }
}

// =============================================================================
// SERVICE INSTANCES
// =============================================================================

export const facilitiesService = new FacilitiesService();
export const patientsService = new PatientsService();
export const vaccinesService = new VaccinesService();
export const immunizationRecordsService = new ImmunizationRecordsService();
export const notificationsService = new NotificationsService();
export const adminProfilesService = new AdminProfilesService();
export const employeeProfilesService = new EmployeeProfilesService();
export const profileVerificationWorkflowService = new ProfileVerificationWorkflowService();

// Import and export relationship service
import { relationshipService, RelationshipService, validateRelationshipData } from './relationshipService';
export { relationshipService, RelationshipService, validateRelationshipData };

// =============================================================================
// ADVANCED QUERY UTILITIES
// =============================================================================

/**
 * Build complex queries with multiple search criteria
 */
export function buildComplexQuery(options: {
  searchTerms?: string[];
  searchFields?: string[];
  filters?: AdvancedFilter[];
  dateRange?: { field: string; start?: Date | string; end?: Date | string };
  geoLocation?: { field: string; lat: number; lng: number; radius?: number };
  sortBy?: { field: string; order: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
}): string[] {
  const queries: string[] = [];

  // Multi-field search
  if (options.searchTerms && options.searchFields) {
    for (const term of options.searchTerms) {
      for (const field of options.searchFields) {
        queries.push(buildSearchQuery(field, term));
      }
    }
  }

  // Filters
  if (options.filters) {
    const filterQueries = buildFilterQueries(options.filters.map(filter => ({
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
      values: filter.values,
    })));
    queries.push(...filterQueries);
  }

  // Date range
  if (options.dateRange) {
    const dateQueries = buildDateRangeQuery(
      options.dateRange.field,
      options.dateRange.start,
      options.dateRange.end
    );
    queries.push(...dateQueries);
  }

  // Geolocation
  if (options.geoLocation) {
    const geoQueries = buildGeoLocationQuery(
      options.geoLocation.field,
      options.geoLocation.lat,
      options.geoLocation.lng,
      options.geoLocation.radius
    );
    queries.push(...geoQueries);
  }

  // Sorting
  if (options.sortBy) {
    queries.push(
      options.sortBy.order === 'ASC'
        ? Query.orderAsc(options.sortBy.field)
        : Query.orderDesc(options.sortBy.field)
    );
  }

  // Pagination
  if (options.limit) {
    queries.push(Query.limit(options.limit));
  }
  if (options.offset) {
    queries.push(Query.offset(options.offset));
  }

  return queries;
}

/**
 * Create a query builder for fluent API
 */
export class QueryBuilder {
  private queries: string[] = [];

  constructor(private collectionId: string) {}

  /**
   * Add search query
   */
  search(field: string, value: string): QueryBuilder {
    this.queries.push(buildSearchQuery(field, value));
    return this;
  }

  /**
   * Add filter query
   */
  filter(filter: AdvancedFilter): QueryBuilder {
    const filterQueries = buildFilterQueries([{
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
      values: filter.values,
    }]);
    this.queries.push(...filterQueries);
    return this;
  }

  /**
   * Add date range query
   */
  dateRange(field: string, start?: Date | string, end?: Date | string): QueryBuilder {
    const dateQueries = buildDateRangeQuery(field, start, end);
    this.queries.push(...dateQueries);
    return this;
  }

  /**
   * Add geolocation query
   */
  geoLocation(field: string, lat: number, lng: number, radius?: number): QueryBuilder {
    const geoQueries = buildGeoLocationQuery(field, lat, lng, radius);
    this.queries.push(...geoQueries);
    return this;
  }

  /**
   * Add sorting
   */
  sortBy(field: string, order: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.queries.push(
      order === 'ASC' ? Query.orderAsc(field) : Query.orderDesc(field)
    );
    return this;
  }

  /**
   * Add pagination
   */
  paginate(limit?: number, offset?: number): QueryBuilder {
    if (limit) this.queries.push(Query.limit(limit));
    if (offset) this.queries.push(Query.offset(offset));
    return this;
  }

  /**
   * Get the built queries
   */
  build(): string[] {
    return [...this.queries];
  }

  /**
   * Execute the query
   */
  async execute<T extends AppwriteDocument>(): Promise<QueryResponse<T>> {
    const service = new DatabaseService<T>(this.collectionId);
    return service.list({ queries: this.queries });
  }
}

/**
 * Create a query builder instance
 */
export function createQueryBuilder(collectionId: string): QueryBuilder {
  return new QueryBuilder(collectionId);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get service instance by collection name
 */
export function getServiceByCollection(collectionName: string): DatabaseService<any> {
  switch (collectionName) {
    case 'facilities':
      return facilitiesService;
    case 'patients':
      return patientsService;
    case 'vaccines':
      return vaccinesService;
    case 'immunization_records':
      return immunizationRecordsService;
    case 'notifications':
      return notificationsService;
    case 'admin_profiles':
      return adminProfilesService;
    case 'employee_profiles':
      return employeeProfilesService;
    case 'profile_verification_workflow':
      return profileVerificationWorkflowService;
    default:
      throw new Error(`No service found for collection: ${collectionName}`);
  }
}

/**
 * Batch operations across multiple collections
 */
export class BatchOperations {
  static async createMultiple<T extends AppwriteDocument>(
    operations: Array<{
      service: DatabaseService<T>;
      data: Omit<T, keyof AppwriteDocument>;
    }>
  ): Promise<T[]> {
    const results = await Promise.allSettled(
      operations.map(op => op.service.create(op.data))
    );

    const successful: T[] = [];
    const failed: Array<{ index: number; error: any }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({ index, error: result.reason });
      }
    });

    if (failed.length > 0) {
      console.warn('Batch operations completed with errors:', failed);
    }

    return successful;
  }
}

/**
 * Real-time subscription helper
 */
export function subscribeToCollection<T extends AppwriteDocument>(
  collectionId: string,
  callback: (payload: any) => void,
  queries?: string[]
) {
  // Note: Real-time subscriptions will be implemented in a separate service
  // This is a placeholder for the subscription functionality
  console.log(`Setting up subscription for collection: ${collectionId}`);

  // Return unsubscribe function
  return () => {
    console.log(`Unsubscribing from collection: ${collectionId}`);
  };
}

export default {
  DatabaseService,
  facilitiesService,
  patientsService,
  vaccinesService,
  immunizationRecordsService,
  notificationsService,
  adminProfilesService,
  employeeProfilesService,
  profileVerificationWorkflowService,
  relationshipService,
  getServiceByCollection,
  BatchOperations,
  subscribeToCollection,
};