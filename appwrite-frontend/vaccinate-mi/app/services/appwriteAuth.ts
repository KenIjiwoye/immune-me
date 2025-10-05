/**
 * Appwrite Authentication Service
 * Handles user authentication, session management, and profile integration for Expo app
 */

import { account, logAppwriteError, withRetry } from './appwrite';
import { adminProfilesService, employeeProfilesService, patientProfilesService } from './appwriteDatabase';
import { ID } from 'react-native-appwrite';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { securityService, isBiometricAuthEnabled } from './securityService';
import { auditService } from './auditService';
import type { AdminProfile, EmployeeProfile, PatientProfile } from '../types/appwrite';

// UserSession type for authentication
export interface UserSession {
  user: {
    $id: string;
    email: string;
    name: string;
    phone?: string;
    emailVerification: boolean;
    phoneVerification: boolean;
  };
  profile?: {
    type: 'admin' | 'employee' | 'patient';
    profileId: string;
    facilityId?: string;
    permissions: string[];
  };
  session: {
    $id: string;
    provider: string;
    providerUid: string;
    expire: string;
  };
  preferences: {
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: Record<string, boolean>;
  };
}

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
  profileType: 'admin' | 'employee' | 'patient';
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
  profile: AdminProfile | EmployeeProfile | PatientProfile;
  permissions: string[];
  facilityId?: string;
}

// Secure storage keys
const STORAGE_KEYS = {
  SESSION_TOKEN: 'session_token',
  USER_DATA: 'user_data',
  PROFILE_DATA: 'profile_data',
  SESSION_EXPIRY: 'session_expiry',
} as const;

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
      // Check if session has expired
      const sessionExpired = await securityService.isSessionExpired();
      if (sessionExpired) {
        console.log('Session expired during initialization');
        await this.clearStoredData();
        await securityService.clearSecurityData();
        return;
      }

      // Try to restore session from secure storage
      const storedSession = await this.getStoredSession();
      if (storedSession) {
        this.currentSession = storedSession;
        await this.getCurrentUser();
        await this.loadStoredProfile();
        // Update last activity since we're restoring a session
        await securityService.updateLastActivity();
      } else {
        // Try to get current session from Appwrite
        await this.getCurrentUser();
      }
    } catch (error) {
      console.log('No active session found');
      await this.clearStoredData();
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

      // Store session data securely
      await this.storeSessionData(userSession);

      // Update security service with last activity
      await securityService.updateLastActivity();

      // Log successful login
      await auditService.logLoginSuccess(
        user.$id,
        profile?.profile.$id,
        profile?.type,
        session.$id
      );

      // Check if biometric auth should be enabled for this user
      if (isBiometricAuthEnabled()) {
        const biometricCredentials = await securityService.getBiometricCredentials();
        if (biometricCredentials && biometricCredentials.userId === user.$id) {
          // User has biometric enabled, we could prompt here but for now just log
          console.log('Biometric authentication available for user');
        }
      }

      this.notifyAuthListeners(user);
      return userSession;
    } catch (error) {
      // Log failed login attempt
      await auditService.logLoginFailure(
        '', // We don't have userId for failed login, but we could try to get it from email
        error instanceof Error ? error.message : 'Login failed',
        { email: credentials.email }
      );

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

       // Create profile based on profile type
       await this.createUserProfile(user.$id, data.profileType);

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
      // Get current user info before logging out for audit
      const userId = this.currentUser?.$id;
      const profileId = this.currentProfile?.profile.$id;
      const profileType = this.currentProfile?.type;
      const sessionId = this.currentSession?.$id;

      await withRetry(() => account.deleteSession('current'));

      // Log logout event
      if (userId) {
        await auditService.logLogout(userId, profileId, profileType, sessionId);
      }

      this.currentUser = null;
      this.currentSession = null;
      this.currentProfile = null;

      // Clear stored data
      await this.clearStoredData();

      // Clear security data
      await securityService.clearSecurityData();

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
    * Create user profile based on profile type
    */
   private async createUserProfile(userId: string, profileType: 'admin' | 'employee' | 'patient'): Promise<void> {
     try {
       switch (profileType) {
         case 'admin':
           await adminProfilesService.create({
             user_id: userId,
             admin_level: 'facility_admin',
             system_permissions: ['read'],
             facility_access_scope: 'none',
             accessible_facilities: [],
             data_access_level: 'facility',
             can_manage_users: false,
             can_manage_facilities: false,
             can_manage_vaccines: false,
             can_generate_reports: false,
             can_manage_system_settings: false,
             emergency_access: false,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
           });
           break;

         case 'employee':
           await employeeProfilesService.create({
             user_id: userId,
             employee_id: `EMP-${Date.now()}`,
             employee_type: 'other',
             professional_title: 'Healthcare Worker',
             specializations: [],
             primary_facility_id: '',
             assigned_facilities: [],
             employment_status: 'active',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
           });
           break;

         case 'patient':
           await patientProfilesService.create({
             user_id: userId,
             profile_status: 'active',
             verification_status: 'unverified',
             access_permissions: ['read_own_records'],
             facility_id: '',
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString(),
           });
           break;
       }
     } catch (error) {
       logAppwriteError(error, 'AuthService.createUserProfile');
       throw error;
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

      // Update last activity
      await securityService.updateLastActivity();

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

  // =============================================================================
  // BIOMETRIC AUTHENTICATION METHODS
  // =============================================================================

  /**
   * Enable biometric authentication for current user
   */
  async enableBiometricAuth(): Promise<boolean> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    return await securityService.enableBiometricAuth(this.currentUser.$id);
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    return await securityService.disableBiometricAuth();
  }

  /**
   * Check if biometric authentication is available and enabled
   */
  async getBiometricStatus(): Promise<{
    available: boolean;
    enabled: boolean;
    types: string[];
  }> {
    const [available, enabled, types] = await Promise.all([
      securityService.isBiometricAvailable(),
      securityService.isBiometricEnabled(),
      securityService.getBiometricTypes().then(types =>
        types.map(type => LocalAuthentication.AuthenticationType[type])
      ),
    ]);

    return {
      available: available && isBiometricAuthEnabled(),
      enabled,
      types,
    };
  }

  /**
   * Attempt biometric login (restore session with biometric auth)
   */
  async biometricLogin(): Promise<UserSession | null> {
    try {
      // Check if biometric is enabled
      const biometricEnabled = await securityService.isBiometricEnabled();
      if (!biometricEnabled || !isBiometricAuthEnabled()) {
        return null;
      }

      // Authenticate with biometrics
      const authenticated = await securityService.authenticateWithBiometrics('Login with biometrics');
      if (!authenticated) {
        return null;
      }

      // Try to restore session
      return await this.refreshSession();
    } catch (error) {
      console.error('Biometric login failed:', error);
      return null;
    }
  }

  // =============================================================================
  // DEVICE MANAGEMENT METHODS
  // =============================================================================

  /**
   * Register current device
   */
  async registerDevice(): Promise<boolean> {
    return await securityService.registerDevice();
  }

  /**
   * Check if device is registered
   */
  async isDeviceRegistered(): Promise<boolean> {
    return await securityService.isDeviceRegistered();
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    return await securityService.getDeviceInfo();
  }

  // =============================================================================
  // SESSION MANAGEMENT METHODS
  // =============================================================================

  /**
   * Set session timeout in minutes
   */
  async setSessionTimeout(minutes: number): Promise<void> {
    await securityService.setSessionTimeout(minutes);
  }

  /**
   * Get current session timeout
   */
  getSessionTimeout(): number {
    return securityService.getSessionTimeout();
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(): Promise<void> {
    await securityService.updateLastActivity();
  }

  /**
   * Check if session is expired
   */
  async isSessionExpired(): Promise<boolean> {
    return await securityService.isSessionExpired();
  }

  /**
   * Get security status summary
   */
  async getSecurityStatus() {
    return await securityService.getSecurityStatus();
  }

  // =============================================================================
  // SECURE STORAGE METHODS
  // =============================================================================

  /**
   * Store session data securely
   */
  private async storeSessionData(userSession: UserSession): Promise<void> {
    try {
      const sessionData = {
        token: userSession.session.$id,
        expiry: userSession.session.expire,
        user: userSession.user,
        profile: userSession.profile,
        preferences: userSession.preferences,
      };

      await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_TOKEN, userSession.session.$id);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userSession.user));
      await SecureStore.setItemAsync(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(userSession.profile || null));
      await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_EXPIRY, userSession.session.expire);
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }

  /**
   * Get stored session data
   */
  private async getStoredSession(): Promise<Session | null> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_TOKEN);
      const expiry = await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_EXPIRY);

      if (!token || !expiry) return null;

      // Check if session is expired
      const expiryDate = new Date(expiry);
      if (expiryDate <= new Date()) {
        await this.clearStoredData();
        return null;
      }

      // Create a minimal session object for restoration
      return {
        $id: token,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        userId: '', // Will be populated when getting user
        expire: expiry,
        provider: 'email',
        providerUid: '',
        providerAccessToken: '',
        providerAccessTokenExpiry: '',
        providerRefreshToken: '',
        ip: '',
        osCode: '',
        osName: '',
        osVersion: '',
        clientType: '',
        clientCode: '',
        clientName: '',
        clientVersion: '',
        clientEngine: '',
        clientEngineVersion: '',
        deviceName: '',
        deviceBrand: '',
        deviceModel: '',
        countryCode: '',
        countryName: '',
        current: true,
      } as Session;
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  /**
   * Load stored profile data
   */
  private async loadStoredProfile(): Promise<void> {
    try {
      const profileData = await SecureStore.getItemAsync(STORAGE_KEYS.PROFILE_DATA);
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile) {
          this.currentProfile = profile;
        }
      }
    } catch (error) {
      console.error('Failed to load stored profile:', error);
    }
  }

  /**
   * Clear all stored authentication data
   */
  private async clearStoredData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PROFILE_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_EXPIRY);
    } catch (error) {
      console.error('Failed to clear stored data:', error);
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
    const adminProfile = profile.profile as AdminProfile;
    return adminProfile.can_manage_users;
  }

  /**
   * Check if user can manage facilities
   */
  static canManageFacilities(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfile;
    return adminProfile.can_manage_facilities;
  }

  /**
   * Check if user can manage vaccines
   */
  static canManageVaccines(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfile;
    return adminProfile.can_manage_vaccines;
  }

  /**
   * Check if user can generate reports
   */
  static canGenerateReports(profile: UserProfile | null): boolean {
    if (profile?.type !== 'admin') return false;
    const adminProfile = profile.profile as AdminProfile;
    return adminProfile.can_generate_reports;
  }

  /**
   * Check if user can access facility data
   */
  static canAccessFacility(profile: UserProfile | null, facilityId: string): boolean {
    if (!profile) return false;

    switch (profile.type) {
      case 'admin':
        const adminProfile = profile.profile as AdminProfile;
        if (adminProfile.facility_access_scope === 'all') return true;
        return adminProfile.accessible_facilities?.includes(facilityId) || false;

      case 'employee':
        const employeeProfile = profile.profile as EmployeeProfile;
        return employeeProfile.primary_facility_id === facilityId ||
               employeeProfile.assigned_facilities?.includes(facilityId) || false;

      case 'patient':
        const patientProfile = profile.profile as PatientProfile;
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