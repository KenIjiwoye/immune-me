/**
 * Appwrite Database Service Layer
 * Provides type-safe database operations for profile collections
 */

import { databases, APPWRITE_CONFIG, COLLECTION_IDS, logAppwriteError, withRetry } from './appwrite';
import { Query, ID } from 'react-native-appwrite';
import type {
  AppwriteDocument,
  QueryResponse,
} from '../types/appwrite';

// Profile Types
import type {
  AdminProfile,
  EmployeeProfile,
  PatientProfile,
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
}

// =============================================================================
// PROFILE-SPECIFIC SERVICES
// =============================================================================

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

export const adminProfilesService = new AdminProfilesService();
export const employeeProfilesService = new EmployeeProfilesService();
export const patientProfilesService = new PatientProfilesService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export default {
  DatabaseService,
  adminProfilesService,
  employeeProfilesService,
  patientProfilesService,
};