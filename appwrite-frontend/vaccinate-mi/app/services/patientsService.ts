import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { Patient } from '../types/appwrite';

/**
 * Patients Service
 * Handles all patient-related database operations
 */
export class PatientsService extends DatabaseService<Patient> {
  constructor() {
    super(COLLECTION_IDS.PATIENTS);
  }

  /**
   * Get patients by facility
   */
  async getByFacility(facilityId: string, limit: number = 50): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('facility_id', facilityId)],
      limit,
    });
    return result.documents;
  }

  /**
   * Search patients by name
   */
  async searchByName(name: string): Promise<Patient[]> {
    return this.search(name, ['full_name'], 20);
  }

  /**
   * Get patients by health worker
   */
  async getByHealthWorker(healthWorkerId: string): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('health_worker_id', healthWorkerId)],
    });
    return result.documents;
  }

  /**
   * Get patients by district
   */
  async getByDistrict(district: string): Promise<Patient[]> {
    const result = await this.list({
      queries: [Query.equal('district', district)],
    });
    return result.documents;
  }

  /**
   * Get patients by age range
   */
  async getByAgeRange(minAge: number, maxAge: number): Promise<Patient[]> {
    const result = await this.list({
      queries: [
        Query.greaterThanEqual('age', minAge),
        Query.lessThanEqual('age', maxAge),
      ],
    });
    return result.documents;
  }

  /**
   * Get patients requiring vaccination
   */
  async getRequiringVaccination(vaccineId?: string): Promise<Patient[]> {
    const queries = [Query.equal('requires_vaccination', true)];
    if (vaccineId) {
      queries.push(Query.equal('pending_vaccines', vaccineId));
    }
    const result = await this.list({ queries });
    return result.documents;
  }
}

// Export service instance
export const patientsService = new PatientsService();