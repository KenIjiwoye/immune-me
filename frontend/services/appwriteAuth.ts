/**
 * Appwrite Authentication Service
 * Handles user authentication, session management, and profile integration
 */

import { account, logAppwriteError, withRetry } from './appwrite';
import { adminProfilesService, employeeProfilesService, patientProfilesService } from './appwriteDatabase';
import { ID } from 'react-native-appwrite';
import type { UserSession, AdminProfiles, EmployeeProfiles, PatientProfiles } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface User {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  email: string;
  phone: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  prefs: Record<string, any>;
  status: boolean;
  labels: string[];
  accessedAt: string;
}

export interface Session {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  expire: string;
  provider: string;
  providerUid: string;
  providerAccessToken: string;
  providerAccessTokenExpiry: string;
  providerRefreshToken: string;
  ip: string;
  osCode: string;
  osName: string;
  osVersion: string;
  clientType: string;
  clientCode: string;
  clientName: string;
  clientVersion: string;
  clientEngine: string;
  clientEngineVersion: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  countryCode: string;
  countryName: string;
  current: boolean;
}

export interface UserProfile {
  type: 'admin' | 'employee' | 'patient';
  profile: AdminProfiles | EmployeeProfiles | PatientProfiles;
  permissions: string[];
  facilityId?: string;
}

// =============================================================================
// AUTHENTICATION SERVICE CLASS
// =============================================================================

export class AuthService {
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private currentProfile: UserProfile | null = null;
  private authListeners: Array<(user: User | null) => void> = [];

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    try {
      await this.getCurrentUser();
    } catch (error) {
      console.log('No active session found');
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    try {
      // Create email session
      const session = await withRetry(() =>
        account.createEmailPasswordSession(credentials.email, credentials.password)
      );

      this.currentSession = session;

      // Get user details
      const user = await this.getCurrentUser();
      
      // Get user profile
      const profile = await this.getUserProfile(user.$id);

      const userSession: UserSession = {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
        },
        profile: profile ? {
          type: profile.type,
          profileId: profile.profile.$id,
          facilityId: profile.facilityId,
          permissions: profile.permissions,
        } : undefined,
        session: {
          $id: session.$id,
          provider: session.provider,
          providerUid: session.providerUid,
          expire: session.expire,
        },
        preferences: {
          language: user.prefs?.language || 'en',
          timezone: user.prefs?.timezone || 'UTC',
          theme: user.prefs?.theme || 'light',
          notifications: user.prefs?.notifications || {},
        },
      };

      this.notifyAuthListeners(user);
      return userSession;
    } catch (error) {
      logAppwriteError(error, 'AuthService.login');
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    try {
      const user = await withRetry(() =>
        account.create(ID.unique(), data.email, data.password, data.name)
      );

      // Automatically login after registration
      await this.login({
        email: data.email,
        password: data.password,
      });

      return user as unknown as User;
    } catch (error) {
      logAppwriteError(error, 'AuthService.register');
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await withRetry(() => account.deleteSession('current'));
      
      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;
      
      this.notifyAuthListeners(null);
    } catch (error) {
      logAppwriteError(error, 'AuthService.logout');
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      const user = await withRetry(() => account.get());
      this.currentUser = user as unknown as User;
      
      return this.currentUser;
    } catch (error) {
      this.currentUser = null;
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      if (this.currentSession) {
        return this.currentSession;
      }

      const session = await withRetry(() => account.getSession('current'));
      this.currentSession = session as unknown as Session;
      
      return this.currentSession;
    } catch (error) {
      this.currentSession = null;
      return null;
    }
  }

  /**
   * Get user profile based on user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Check admin profile first
      const adminProfile = await adminProfilesService.getByUserId(userId);
      if (adminProfile) {
        return {
          type: 'admin',
          profile: adminProfile,
          permissions: adminProfile.system_permissions || [],
          facilityId: adminProfile.accessible_facilities?.[0],
        };
      }

      // Check employee profile
      const employeeProfile = await employeeProfilesService.getByUserId(userId);
      if (employeeProfile) {
        return {
          type: 'employee',
          profile: employeeProfile,
          permissions: [], // Employee permissions would be defined elsewhere
          facilityId: employeeProfile.primary_facility_id,
        };
      }

      // Check patient profile
      const patientProfile = await patientProfilesService.getByUserId(userId);
      if (patientProfile) {
        return {
          type: 'patient',
          profile: patientProfile,
          permissions: patientProfile.access_permissions || [],
          facilityId: patientProfile.facility_id,
        };
      }

      return null;
    } catch (error) {
      logAppwriteError(error, 'AuthService.getUserProfile');
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(prefs: Record<string, any>): Promise<User> {
    try {
      const user = await withRetry(() => account.updatePrefs(prefs));
      this.currentUser = user as unknown as User;
      return this.currentUser;
    } catch (error) {
      logAppwriteError(error, 'AuthService.updatePreferences');
      throw error;
    }
  }

  /**
   * Update user name
   */
  async updateName(name: string): Promise<User> {
    try {
      const user = await withRetry(() => account.updateName(name));
      this.currentUser = user as unknown as User;
      return this.currentUser;
    } catch (error) {
      logAppwriteError(error, 'AuthService.updateName');
      throw error;
    }
  }

  /**
   * Update user email
   */
  async updateEmail(email: string, password: string): Promise<User> {
    try {
      const user = await withRetry(() => account.updateEmail(email, password));
      this.currentUser = user as unknown as User;
      return this.currentUser;
    } catch (error) {
      logAppwriteError(error, 'AuthService.updateEmail');
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string, oldPassword: string): Promise<User> {
    try {
      const user = await withRetry(() => account.updatePassword(newPassword, oldPassword));
      return user as unknown as User;
    } catch (error) {
      logAppwriteError(error, 'AuthService.updatePassword');
      throw error;
    }
  }

  /**
   * Send password recovery email
   */
  async sendPasswordRecovery(email: string, url: string): Promise<void> {
    try {
      await withRetry(() => account.createRecovery(email, url));
    } catch (error) {
      logAppwriteError(error, 'AuthService.sendPasswordRecovery');
      throw error;
    }
  }

  /**
   * Complete password recovery
   */
  async completePasswordRecovery(
    userId: string,
    secret: string,
    password: string
  ): Promise<void> {
    try {
      await withRetry(() => account.updateRecovery(userId, secret, password));
    } catch (error) {
      logAppwriteError(error, 'AuthService.completePasswordRecovery');
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(url: string): Promise<void> {
    try {
      await withRetry(() => account.createVerification(url));
    } catch (error) {
      logAppwriteError(error, 'AuthService.sendEmailVerification');
      throw error;
    }
  }

  /**
   * Complete email verification
   */
  async completeEmailVerification(userId: string, secret: string): Promise<void> {
    try {
      await withRetry(() => account.updateVerification(userId, secret));
      
      // Refresh current user to get updated verification status
      if (this.currentUser) {
        await this.getCurrentUser();
      }
    } catch (error) {
      logAppwriteError(error, 'AuthService.completeEmailVerification');
      throw error;
    }
  }

  /**
   * Send phone verification
   */
  async sendPhoneVerification(): Promise<void> {
    try {
      await withRetry(() => account.createPhoneVerification());
    } catch (error) {
      logAppwriteError(error, 'AuthService.sendPhoneVerification');
      throw error;
    }
  }

  /**
   * Complete phone verification
   */
  async completePhoneVerification(userId: string, secret: string): Promise<void> {
    try {
      await withRetry(() => account.updatePhoneVerification(userId, secret));
      
      // Refresh current user to get updated verification status
      if (this.currentUser) {
        await this.getCurrentUser();
      }
    } catch (error) {
      logAppwriteError(error, 'AuthService.completePhoneVerification');
      throw error;
    }
  }

  /**
   * Get all user sessions
   */
  async getSessions(): Promise<Session[]> {
    try {
      const sessions = await withRetry(() => account.listSessions());
      return sessions.sessions as unknown as Session[];
    } catch (error) {
      logAppwriteError(error, 'AuthService.getSessions');
      throw error;
    }
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await withRetry(() => account.deleteSession(sessionId));
    } catch (error) {
      logAppwriteError(error, 'AuthService.deleteSession');
      throw error;
    }
  }

  /**
   * Delete all sessions except current
   */
  async deleteOtherSessions(): Promise<void> {
    try {
      await withRetry(() => account.deleteSessions());
    } catch (error) {
      logAppwriteError(error, 'AuthService.deleteOtherSessions');
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user profile
   */
  getCurrentProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'admin' | 'employee' | 'patient'): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.type === role;
  }

  /**
   * Add authentication state listener
   */
  addAuthListener(listener: (user: User | null) => void): () => void {
    this.authListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all auth listeners
   */
  private notifyAuthListeners(user: User | null): void {
    this.authListeners.forEach(listener => {
      try {
        listener(user);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Refresh user session and profile
   */
  async refreshSession(): Promise<UserSession | null> {
    try {
      const user = await this.getCurrentUser();
      const session = await this.getCurrentSession();
      const profile = await this.getUserProfile(user.$id);

      if (!session) return null;

      this.currentProfile = profile;

      return {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          emailVerification: user.emailVerification,
          phoneVerification: user.phoneVerification,
        },
        profile: profile ? {
          type: profile.type,
          profileId: profile.profile.$id,
          facilityId: profile.facilityId,
          permissions: profile.permissions,
        } : undefined,
        session: {
          $id: session.$id,
          provider: session.provider,
          providerUid: session.providerUid,
          expire: session.expire,
        },
        preferences: {
          language: user.prefs?.language || 'en',
          timezone: user.prefs?.timezone || 'UTC',
          theme: user.prefs?.theme || 'light',
          notifications: user.prefs?.notifications || {},
        },
      };
    } catch (error) {
      return null;
    }
  }
}

// =============================================================================
// SERVICE INSTANCE
// =============================================================================

export const authService = new AuthService();

// =============================================================================
// ROLE-BASED ACCESS CONTROL HELPERS
// =============================================================================

export class RoleGuard {
  /**
   * Check if user can access admin features
   */
  static canAccessAdmin(profile: UserProfile | null): boolean {
    return profile?.type === 'admin';
  }

  /**
   * Check if user can manage users
   */
  static canManageUsers(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfiles;
    return adminProfile.can_manage_users;
  }

  /**
   * Check if user can manage facilities
   */
  static canManageFacilities(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfiles;
    return adminProfile.can_manage_facilities;
  }

  /**
   * Check if user can manage vaccines
   */
  static canManageVaccines(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfiles;
    return adminProfile.can_manage_vaccines;
  }

  /**
   * Check if user can generate reports
   */
  static canGenerateReports(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfiles;
    return adminProfile.can_generate_reports;
  }

  /**
   * Check if user can access facility data
   */
  static canAccessFacility(profile: UserProfile | null, facilityId: string): boolean {
    if (!profile) return false;

    switch (profile.type) {
      case 'admin':
        const adminProfile = profile.profile as AdminProfiles;
        if (adminProfile.facility_access_scope === 'all') return true;
        return adminProfile.accessible_facilities?.includes(facilityId) || false;
      
      case 'employee':
        const employeeProfile = profile.profile as EmployeeProfiles;
        return employeeProfile.primary_facility_id === facilityId ||
               employeeProfile.assigned_facilities?.includes(facilityId) || false;
      
      case 'patient':
        const patientProfile = profile.profile as PatientProfiles;
        return patientProfile.facility_id === facilityId;
      
      default:
        return false;
    }
  }
}

export default {
  AuthService,
  authService,
  RoleGuard,
};