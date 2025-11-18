import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { Facility } from '../types/appwrite';

/**
 * Facilities Service
 * Handles all facility-related database operations
 */
export class FacilitiesService extends DatabaseService<Facility> {
  constructor() {
    super(COLLECTION_IDS.FACILITIES);
  }

  /**
   * Get facilities by district
   */
  async getByDistrict(district: string): Promise<Facility[]> {
    const result = await this.list({
      queries: [Query.equal('district', district)],
    });
    return result.documents;
  }

  /**
   * Search facilities by name
   */
  async searchByName(name: string): Promise<Facility[]> {
    return this.search(name, ['name'], 10);
  }

  /**
   * Get facilities by region
   */
  async getByRegion(region: string): Promise<Facility[]> {
    const result = await this.list({
      queries: [Query.equal('region', region)],
    });
    return result.documents;
  }

  /**
   * Get active facilities
   */
  async getActive(): Promise<Facility[]> {
    const result = await this.list({
      queries: [Query.equal('is_active', true)],
    });
    return result.documents;
  }
}

// Export service instance
export const facilitiesService = new FacilitiesService();