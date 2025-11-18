import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { Vaccine } from '../types/appwrite';

/**
 * Vaccines Service
 * Handles all vaccine-related database operations
 */
export class VaccinesService extends DatabaseService<Vaccine> {
  constructor() {
    super(COLLECTION_IDS.VACCINES);
  }

  /**
   * Get active vaccines
   */
  async getActive(): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('is_active', true)],
    });
    return result.documents;
  }

  /**
   * Get vaccines by disease targeted
   */
  async getByDisease(disease: string): Promise<Vaccine[]> {
    return this.search(disease, ['disease_targeted'], 10);
  }

  /**
   * Get vaccines by age group
   */
  async getByAgeGroup(ageGroup: string): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('age_group', ageGroup)],
    });
    return result.documents;
  }

  /**
   * Get vaccines by manufacturer
   */
  async getByManufacturer(manufacturer: string): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('manufacturer', manufacturer)],
    });
    return result.documents;
  }

  /**
   * Get vaccines requiring refrigeration
   */
  async getRequiringRefrigeration(): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('requires_refrigeration', true)],
    });
    return result.documents;
  }

  /**
   * Get vaccines by schedule type
   */
  async getByScheduleType(scheduleType: string): Promise<Vaccine[]> {
    const result = await this.list({
      queries: [Query.equal('schedule_type', scheduleType)],
    });
    return result.documents;
  }
}

// Export service instance
export const vaccinesService = new VaccinesService();