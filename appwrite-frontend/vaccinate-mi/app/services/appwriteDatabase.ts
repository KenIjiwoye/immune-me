/**
 * Appwrite Database Service Layer
 * Provides type-safe database operations for all collections
 */

import { databases, APPWRITE_CONFIG, COLLECTION_IDS, logAppwriteError, withRetry } from './appwrite';
import { createQuery } from '../utils/queries';
import { Query, ID } from 'react-native-appwrite';
import type {
  AppwriteDocument,
  QueryResponse,
} from '../types/appwrite';

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
  PatientProfile,
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
 * Patient Profiles Service
 */
export class PatientProfilesService extends DatabaseService<PatientProfile> {
  constructor() {
    super(COLLECTION_IDS.PATIENT_PROFILES);
  }

  async getByUserId(userId: string): Promise<PatientProfile | null> {
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

  async getByFacility(facilityId: string): Promise<PatientProfile[]> {
    const result = await this.list({
      queries: [Query.equal('facility_id', facilityId)],
    });
    return result.documents;
  }

  async getByVerificationStatus(status: string): Promise<PatientProfile[]> {
    const result = await this.list({
      queries: [Query.equal('verification_status', status)],
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
export const patientProfilesService = new PatientProfilesService();

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
    case 'patient_profiles':
      return patientProfilesService;
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
  patientProfilesService,
  getServiceByCollection,
  BatchOperations,
  subscribeToCollection,
};