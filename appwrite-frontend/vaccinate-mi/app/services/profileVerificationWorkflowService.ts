import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { ProfileVerificationWorkflow } from '../types/appwrite';

/**
 * Profile Verification Workflow Service
 * Handles all profile verification workflow-related database operations
 */
export class ProfileVerificationWorkflowService extends DatabaseService<ProfileVerificationWorkflow> {
  constructor() {
    super(COLLECTION_IDS.PROFILE_VERIFICATION_WORKFLOW);
  }

  /**
   * Get workflows by profile ID
   */
  async getByProfileId(profileId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('profile_id', profileId)],
    });
    return result.documents;
  }

  /**
   * Get workflows by user ID
   */
  async getByUserId(userId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('user_id', userId)],
    });
    return result.documents;
  }

  /**
   * Get workflows by status
   */
  async getByStatus(status: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('status', status)],
    });
    return result.documents;
  }

  /**
   * Get workflows assigned to a user
   */
  async getByAssignedUser(assignedUserId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('assigned_to_user_id', assignedUserId)],
    });
    return result.documents;
  }

  /**
   * Get workflows by facility
   */
  async getByFacility(facilityId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('facility_id', facilityId)],
    });
    return result.documents;
  }

  /**
   * Get workflows by priority
   */
  async getByPriority(priority: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('priority', priority)],
    });
    return result.documents;
  }

  /**
   * Get pending workflows
   */
  async getPending(): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('status', 'pending')],
    });
    return result.documents;
  }

  /**
   * Get overdue workflows
   */
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

  /**
   * Get workflows by verification type
   */
  async getByVerificationType(verificationType: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('verification_type', verificationType)],
    });
    return result.documents;
  }

  /**
   * Get workflows initiated by a user
   */
  async getByInitiatedBy(initiatedByUserId: string): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('initiated_by_user_id', initiatedByUserId)],
    });
    return result.documents;
  }

  /**
   * Get high priority workflows
   */
  async getHighPriority(): Promise<ProfileVerificationWorkflow[]> {
    const result = await this.list({
      queries: [Query.equal('priority', 'high')],
    });
    return result.documents;
  }
}

// Export service instance
export const profileVerificationWorkflowService = new ProfileVerificationWorkflowService();