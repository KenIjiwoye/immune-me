/**
 * Audit Service
 * Handles logging of authentication events, user actions, and security events
 */

import { databases, APPWRITE_CONFIG, logAppwriteError, withRetry } from './appwrite';
import { COLLECTIONS } from '../constants/appwrite';
import { DatabaseService } from './appwriteDatabase';
import type {
  AccessAuditLog,
  RoleChangeLog,
  AuditCollection,
} from '../types/appwrite';
import { ID } from 'react-native-appwrite';

// =============================================================================
// AUDIT SERVICE TYPES
// =============================================================================

export interface AuditEventData {
  userId: string;
  profileId?: string;
  profileType?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  facilityContext?: string;
  success: boolean;
  failureReason?: string;
  additionalData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface RoleChangeData {
  targetUserId: string;
  targetProfileId?: string;
  targetProfileType?: string;
  assignedByUserId: string;
  assignedByProfileId?: string;
  roleChangeType: string;
  oldRoleData?: Record<string, any>;
  newRoleData: Record<string, any>;
  facilityContext?: string;
  changeReason?: string;
  effectiveDate: string;
  expiryDate?: string;
  approvalRequired: boolean;
}

export interface SecurityEventData {
  eventType: 'biometric_attempt' | 'biometric_success' | 'biometric_failure' |
             'device_registration' | 'device_deregistration' |
             'session_timeout' | 'session_expired' | 'security_violation';
  userId: string;
  profileId?: string;
  success: boolean;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// AUDIT SERVICE CLASS
// =============================================================================

export class AuditService {
  private accessAuditService: DatabaseService<AccessAuditLog>;
  private roleChangeService: DatabaseService<RoleChangeLog>;
  private auditCollectionService: DatabaseService<AuditCollection>;

  constructor() {
    this.accessAuditService = new DatabaseService<AccessAuditLog>(COLLECTIONS.ACCESS_AUDIT_LOG);
    this.roleChangeService = new DatabaseService<RoleChangeLog>(COLLECTIONS.ROLE_CHANGE_LOG);
    this.auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  }

  // =============================================================================
  // AUTHENTICATION AUDIT LOGGING
  // =============================================================================

  /**
   * Log authentication events (login, logout, failed attempts)
   */
  async logAuthEvent(data: AuditEventData): Promise<void> {
    try {
      const auditData: Omit<AccessAuditLog, keyof import('../types/appwrite').AppwriteDocument> = {
        user_id: data.userId,
        profile_id: data.profileId,
        profile_type: data.profileType,
        action_type: data.actionType,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        facility_context: data.facilityContext,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        session_id: data.sessionId,
        success: data.success,
        failure_reason: data.failureReason,
        additional_data: data.additionalData ? JSON.stringify(data.additionalData) : undefined,
        created_at: new Date().toISOString(),
      };

      await this.accessAuditService.create(auditData);
    } catch (error) {
      console.error('Failed to log authentication event:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(userId: string, profileId?: string, profileType?: string, sessionId?: string): Promise<void> {
    await this.logAuthEvent({
      userId,
      profileId,
      profileType,
      actionType: 'login',
      resourceType: 'authentication',
      success: true,
      sessionId,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailure(userId: string, reason: string, additionalData?: Record<string, any>): Promise<void> {
    await this.logAuthEvent({
      userId,
      actionType: 'login_failed',
      resourceType: 'authentication',
      success: false,
      failureReason: reason,
      additionalData,
    });
  }

  /**
   * Log logout event
   */
  async logLogout(userId: string, profileId?: string, profileType?: string, sessionId?: string): Promise<void> {
    await this.logAuthEvent({
      userId,
      profileId,
      profileType,
      actionType: 'logout',
      resourceType: 'authentication',
      success: true,
      sessionId,
    });
  }

  /**
   * Log session timeout
   */
  async logSessionTimeout(userId: string, profileId?: string, profileType?: string): Promise<void> {
    await this.logAuthEvent({
      userId,
      profileId,
      profileType,
      actionType: 'session_timeout',
      resourceType: 'authentication',
      success: false,
      failureReason: 'Session automatically expired due to inactivity',
    });
  }

  // =============================================================================
  // USER ACTION AUDIT LOGGING
  // =============================================================================

  /**
   * Log user actions (CRUD operations, profile switches, etc.)
   */
  async logUserAction(data: AuditEventData): Promise<void> {
    try {
      const auditData: Omit<AccessAuditLog, keyof import('../types/appwrite').AppwriteDocument> = {
        user_id: data.userId,
        profile_id: data.profileId,
        profile_type: data.profileType,
        action_type: data.actionType,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        facility_context: data.facilityContext,
        success: data.success,
        failure_reason: data.failureReason,
        additional_data: data.additionalData ? JSON.stringify(data.additionalData) : undefined,
        created_at: new Date().toISOString(),
      };

      await this.accessAuditService.create(auditData);
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }

  /**
   * Log profile switch event
   */
  async logProfileSwitch(userId: string, fromProfileId: string, toProfileId: string, profileType: string): Promise<void> {
    await this.logUserAction({
      userId,
      profileId: toProfileId,
      profileType,
      actionType: 'profile_switch',
      resourceType: 'profile',
      resourceId: toProfileId,
      success: true,
      additionalData: { fromProfileId },
    });
  }

  /**
   * Log CRUD operations
   */
  async logCrudOperation(
    userId: string,
    action: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    success: boolean,
    profileId?: string,
    profileType?: string,
    facilityContext?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    await this.logUserAction({
      userId,
      profileId,
      profileType,
      actionType: action,
      resourceType,
      resourceId,
      facilityContext,
      success,
      additionalData,
    });
  }

  // =============================================================================
  // ROLE CHANGE LOGGING
  // =============================================================================

  /**
   * Log role changes (profile assignments, permission changes)
   */
  async logRoleChange(data: RoleChangeData): Promise<void> {
    try {
      const roleChangeData: Omit<RoleChangeLog, keyof import('../types/appwrite').AppwriteDocument> = {
        target_user_id: data.targetUserId,
        target_profile_id: data.targetProfileId,
        target_profile_type: data.targetProfileType,
        assigned_by_user_id: data.assignedByUserId,
        assigned_by_profile_id: data.assignedByProfileId,
        role_change_type: data.roleChangeType,
        old_role_data: data.oldRoleData ? JSON.stringify(data.oldRoleData) : undefined,
        new_role_data: JSON.stringify(data.newRoleData),
        facility_context: data.facilityContext,
        change_reason: data.changeReason,
        effective_date: data.effectiveDate,
        expiry_date: data.expiryDate,
        status: 'active',
        approval_required: data.approvalRequired,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.roleChangeService.create(roleChangeData);
    } catch (error) {
      console.error('Failed to log role change:', error);
    }
  }

  /**
   * Log profile creation
   */
  async logProfileCreation(
    targetUserId: string,
    assignedByUserId: string,
    profileType: string,
    profileData: Record<string, any>,
    facilityContext?: string
  ): Promise<void> {
    await this.logRoleChange({
      targetUserId,
      targetProfileType: profileType,
      assignedByUserId,
      roleChangeType: 'profile_created',
      newRoleData: profileData,
      facilityContext,
      effectiveDate: new Date().toISOString(),
      approvalRequired: false,
    });
  }

  /**
   * Log profile status change
   */
  async logProfileStatusChange(
    targetUserId: string,
    targetProfileId: string,
    targetProfileType: string,
    assignedByUserId: string,
    oldStatus: string,
    newStatus: string,
    facilityContext?: string,
    reason?: string
  ): Promise<void> {
    await this.logRoleChange({
      targetUserId,
      targetProfileId,
      targetProfileType,
      assignedByUserId,
      roleChangeType: 'status_change',
      oldRoleData: { status: oldStatus },
      newRoleData: { status: newStatus },
      facilityContext,
      changeReason: reason,
      effectiveDate: new Date().toISOString(),
      approvalRequired: false,
    });
  }

  // =============================================================================
  // SECURITY EVENT LOGGING
  // =============================================================================

  /**
   * Log security events (biometric, device, session events)
   */
  async logSecurityEvent(data: SecurityEventData): Promise<void> {
    try {
      const auditData: Omit<AccessAuditLog, keyof import('../types/appwrite').AppwriteDocument> = {
        user_id: data.userId,
        profile_id: data.profileId,
        action_type: data.eventType,
        resource_type: 'security',
        success: data.success,
        additional_data: JSON.stringify({
          severity: data.severity,
          ...data.details,
        }),
        created_at: new Date().toISOString(),
      };

      await this.accessAuditService.create(auditData);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log biometric authentication events
   */
  async logBiometricEvent(
    userId: string,
    success: boolean,
    eventType: 'biometric_attempt' | 'biometric_success' | 'biometric_failure',
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      userId,
      success,
      details,
      severity: success ? 'low' : 'medium',
    });
  }

  /**
   * Log device registration events
   */
  async logDeviceEvent(
    userId: string,
    eventType: 'device_registration' | 'device_deregistration',
    deviceInfo?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      userId,
      success: true,
      details: deviceInfo,
      severity: 'low',
    });
  }

  /**
   * Log session security events
   */
  async logSessionEvent(
    userId: string,
    eventType: 'session_timeout' | 'session_expired',
    profileId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      userId,
      profileId,
      success: false,
      details,
      severity: 'medium',
    });
  }

  // =============================================================================
  // AUDIT QUERY METHODS
  // =============================================================================

  /**
   * Get access audit logs for a user
   */
  async getUserAuditLogs(userId: string, limit: number = 50): Promise<AccessAuditLog[]> {
    try {
      const result = await this.accessAuditService.list({
        queries: [`user_id=${userId}`],
        limit,
      });
      return result.documents;
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  /**
   * Get role change logs for a user
   */
  async getUserRoleChanges(userId: string, limit: number = 20): Promise<RoleChangeLog[]> {
    try {
      const result = await this.roleChangeService.list({
        queries: [`target_user_id=${userId}`],
        limit,
      });
      return result.documents;
    } catch (error) {
      console.error('Failed to get user role changes:', error);
      return [];
    }
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit: number = 100): Promise<AccessAuditLog[]> {
    try {
      const result = await this.accessAuditService.list({
        queries: [`resource_type=security`],
        limit,
      });
      return result.documents;
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }
}

// =============================================================================
// SERVICE INSTANCE
// =============================================================================

export const auditService = new AuditService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Initialize audit service on app start
 */
export const initializeAudit = async (): Promise<void> => {
  try {
    console.log('Audit service initialized');
  } catch (error) {
    console.error('Error initializing audit service:', error);
  }
};

/**
 * Get current user context for audit logging
 */
export const getCurrentUserContext = (): { userId?: string; profileId?: string; profileType?: string } => {
  // This would be implemented to get current user context from auth context
  // For now, return empty object
  return {};
};

export default {
  AuditService,
  auditService,
  initializeAudit,
  getCurrentUserContext,
};