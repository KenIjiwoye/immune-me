import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { EmployeeProfile } from '../types/appwrite';

/**
 * Employee Profiles Service
 * Handles all employee profile-related database operations
 */
export class EmployeeProfilesService extends DatabaseService<EmployeeProfile> {
  constructor() {
    super(COLLECTION_IDS.EMPLOYEE_PROFILES);
  }

  /**
   * Get employee profile by user ID
   */
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

  /**
   * Get employee profiles by facility
   */
  async getByFacility(facilityId: string): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('primary_facility_id', facilityId)],
    });
    return result.documents;
  }

  /**
   * Get employee profiles by employee type
   */
  async getByEmployeeType(employeeType: string): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('employee_type', employeeType)],
    });
    return result.documents;
  }

  /**
   * Get employee profiles by supervisor
   */
  async getBySupervisor(supervisorUserId: string): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('supervisor_user_id', supervisorUserId)],
    });
    return result.documents;
  }

  /**
   * Get active employees
   */
  async getActive(): Promise<EmployeeProfile[]> {
    const result = await this.list({
      queries: [Query.equal('employment_status', 'active')],
    });
    return result.documents;
  }

  /**
   * Search employees by name or license number
   */
  async searchByNameOrLicense(searchTerm: string): Promise<EmployeeProfile[]> {
    return this.search(searchTerm, ['professional_title', 'license_number'], 20);
  }
}

// Export service instance
export const employeeProfilesService = new EmployeeProfilesService();