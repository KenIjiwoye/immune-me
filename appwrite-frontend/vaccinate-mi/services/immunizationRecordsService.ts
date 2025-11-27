import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { ImmunizationRecord } from '../types/appwrite';

/**
 * Immunization Records Service
 * Handles all immunization record-related database operations
 */
export class ImmunizationRecordsService extends DatabaseService<ImmunizationRecord> {
  constructor() {
    super(COLLECTION_IDS.IMMUNIZATION_RECORDS);
  }

  /**
   * Get immunization records by patient
   */
  async getByPatient(patientId: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('patient_id', patientId),
        Query.orderDesc('administered_date'),
      ],
    });
    return result.documents;
  }

  /**
   * Get immunization records by facility
   */
  async getByFacility(facilityId: string, limit: number = 100): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('facility_id', facilityId),
        Query.orderDesc('administered_date'),
      ],
      limit,
    });
    return result.documents;
  }

  /**
   * Get immunization records by vaccine
   */
  async getByVaccine(vaccineId: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('vaccine_id', vaccineId),
        Query.orderDesc('administered_date'),
      ],
    });
    return result.documents;
  }

  /**
   * Get immunization records by date range
   */
  async getByDateRange(startDate: string, endDate: string, facilityId?: string): Promise<ImmunizationRecord[]> {
    const queries = [
      Query.greaterThanEqual('administered_date', startDate),
      Query.lessThanEqual('administered_date', endDate),
      Query.orderDesc('administered_date'),
    ];

    if (facilityId) {
      queries.push(Query.equal('facility_id', facilityId));
    }

    const result = await this.list({ queries });
    return result.documents;
  }

  /**
   * Get immunization records by health worker
   */
  async getByHealthWorker(healthWorkerId: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('administered_by_user_id', healthWorkerId),
        Query.orderDesc('administered_date'),
      ],
    });
    return result.documents;
  }

  /**
   * Get recent immunization records
   */
  async getRecent(limit: number = 50): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [Query.orderDesc('administered_date')],
      limit,
    });
    return result.documents;
  }

  /**
   * Get immunization records by batch number
   */
  async getByBatchNumber(batchNumber: string): Promise<ImmunizationRecord[]> {
    const result = await this.list({
      queries: [
        Query.equal('batch_number', batchNumber),
        Query.orderDesc('administered_date'),
      ],
    });
    return result.documents;
  }
}

// Export service instance
export const immunizationRecordsService = new ImmunizationRecordsService();