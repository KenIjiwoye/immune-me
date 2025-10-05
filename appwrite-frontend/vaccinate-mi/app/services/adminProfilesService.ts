import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { AdminProfile } from '../types/appwrite';

/**
 * Admin Profiles Service
 * Handles all admin profile-related database operations
 */
export class AdminProfilesService extends DatabaseService<AdminProfile> {
  constructor() {
    super(COLLECTION_IDS.ADMIN_PROFILES);
  }

  /**
   * Get admin profile by user ID
   */
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

  /**
   * Get admin profiles by admin level
   */
  async getByAdminLevel(adminLevel: string): Promise<AdminProfile[]> {
    const result = await this.list({
      queries: [Query.equal('admin_level', adminLevel)],
    });
    return result.documents;
  }

  /**
   * Get admin profiles by facility access scope
   */
  async getByFacilityAccessScope(scope: string): Promise<AdminProfile[]> {
    const result = await this.list({
      queries: [Query.equal('facility_access_scope', scope)],
    });
    return result.documents;
  }

  /**
   * Get admin profiles with system permissions
   */
  async getWithSystemPermissions(permission: string): Promise<AdminProfile[]> {
    const result = await this.list({
      queries: [Query.search('system_permissions', permission)],
    });
    return result.documents;
  }
}

// Export service instance
export const adminProfilesService = new AdminProfilesService();