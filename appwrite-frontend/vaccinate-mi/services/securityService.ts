/**
 * Security Service
 * Handles biometric authentication, session timeout, device registration, and secure storage
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { account, logAppwriteError } from './appwrite';
import { auditService } from './auditService';

// Security storage keys
const SECURITY_KEYS = {
  BIOMETRIC_ENABLED: 'biometric_enabled',
  DEVICE_ID: 'device_id',
  DEVICE_REGISTERED: 'device_registered',
  SESSION_TIMEOUT: 'session_timeout_minutes',
  LAST_ACTIVITY: 'last_activity_timestamp',
  BIOMETRIC_CREDENTIALS: 'biometric_credentials',
} as const;

// Session timeout configuration (in minutes)
const DEFAULT_SESSION_TIMEOUT = 30; // 30 minutes

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  registeredAt: string;
  lastLoginAt: string;
}

export interface BiometricCredentials {
  userId: string;
  enabled: boolean;
  enrolledAt: string;
}

export class SecurityService {
  private sessionTimeoutMinutes: number = DEFAULT_SESSION_TIMEOUT;
  private sessionCheckInterval: number | null = null;

  constructor() {
    this.loadSessionTimeout();
    this.startSessionMonitoring();
  }

  // =============================================================================
  // BIOMETRIC AUTHENTICATION
  // =============================================================================

  /**
   * Check if biometric authentication is available on this device
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get available biometric types
   */
  async getBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting biometric types:', error);
      return [];
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateWithBiometrics(reason?: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      // Log biometric authentication event
      const eventType = result.success ? 'biometric_success' : 'biometric_failure';
      await auditService.logBiometricEvent('', result.success, eventType as any);

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      // Log biometric failure
      await auditService.logBiometricEvent('', false, 'biometric_failure', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Enable biometric authentication for a user
   */
  async enableBiometricAuth(userId: string): Promise<boolean> {
    try {
      // First check if biometric is available
      const available = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available on this device');
      }

      // Authenticate to confirm user identity
      const authenticated = await this.authenticateWithBiometrics('Enable biometric authentication');
      if (!authenticated) {
        return false;
      }

      // Store biometric credentials
      const credentials: BiometricCredentials = {
        userId,
        enabled: true,
        enrolledAt: new Date().toISOString(),
      };

      await SecureStore.setItemAsync(
        SECURITY_KEYS.BIOMETRIC_CREDENTIALS,
        JSON.stringify(credentials)
      );

      await SecureStore.setItemAsync(SECURITY_KEYS.BIOMETRIC_ENABLED, 'true');

      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURITY_KEYS.BIOMETRIC_CREDENTIALS);
      await SecureStore.setItemAsync(SECURITY_KEYS.BIOMETRIC_ENABLED, 'false');
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(SECURITY_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored biometric credentials
   */
  async getBiometricCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentials = await SecureStore.getItemAsync(SECURITY_KEYS.BIOMETRIC_CREDENTIALS);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // SESSION TIMEOUT MANAGEMENT
  // =============================================================================

  /**
   * Set session timeout in minutes
   */
  async setSessionTimeout(minutes: number): Promise<void> {
    try {
      this.sessionTimeoutMinutes = Math.max(5, Math.min(480, minutes)); // 5 min to 8 hours
      await SecureStore.setItemAsync(SECURITY_KEYS.SESSION_TIMEOUT, this.sessionTimeoutMinutes.toString());
    } catch (error) {
      console.error('Error setting session timeout:', error);
    }
  }

  /**
   * Get current session timeout
   */
  getSessionTimeout(): number {
    return this.sessionTimeoutMinutes;
  }

  /**
   * Load session timeout from storage
   */
  private async loadSessionTimeout(): Promise<void> {
    try {
      const timeout = await SecureStore.getItemAsync(SECURITY_KEYS.SESSION_TIMEOUT);
      if (timeout) {
        this.sessionTimeoutMinutes = parseInt(timeout, 10);
      }
    } catch (error) {
      console.error('Error loading session timeout:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      await SecureStore.setItemAsync(SECURITY_KEYS.LAST_ACTIVITY, timestamp);
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  /**
   * Check if session has timed out
   */
  async isSessionExpired(): Promise<boolean> {
    try {
      const lastActivity = await SecureStore.getItemAsync(SECURITY_KEYS.LAST_ACTIVITY);
      if (!lastActivity) return false;

      const lastActivityTime = parseInt(lastActivity, 10);
      const timeoutMs = this.sessionTimeoutMinutes * 60 * 1000;
      const now = Date.now();

      return (now - lastActivityTime) > timeoutMs;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return false;
    }
  }

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    // Check session every minute
    this.sessionCheckInterval = setInterval(async () => {
      const expired = await this.isSessionExpired();
      if (expired) {
        console.log('Session expired, logging out...');

        // Get current user context for audit logging
        const { authService } = await import('./appwriteAuth');
        const currentUser = authService.isAuthenticated() ? await authService.getCurrentUser() : null;
        const currentProfile = authService.getCurrentProfile();

        // Log session timeout before logout
        if (currentUser) {
          await auditService.logSessionEvent(
            currentUser.$id,
            'session_timeout',
            currentProfile?.profile.$id
          );
        }

        try {
          await authService.logout();
        } catch (error) {
          console.error('Error during automatic logout:', error);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  // =============================================================================
  // DEVICE REGISTRATION
  // =============================================================================

  /**
   * Generate or get device ID
   */
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(SECURITY_KEYS.DEVICE_ID);
      if (!deviceId) {
        // Generate a unique device ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync(SECURITY_KEYS.DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Get current device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();
    const Constants = require('expo-constants');

    return {
      id: deviceId,
      name: `${Platform.OS} Device`,
      platform: Platform.OS,
      osVersion: Platform.Version?.toString() || 'Unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  }

  /**
   * Register device with Appwrite
   */
  async registerDevice(): Promise<boolean> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      // Create a device session or store device info
      // This could be extended to store device info in a collection
      await SecureStore.setItemAsync(SECURITY_KEYS.DEVICE_REGISTERED, 'true');

      // Log device registration
      await auditService.logDeviceEvent('', 'device_registration', deviceInfo);

      console.log('Device registered:', deviceInfo);
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  /**
   * Check if device is registered
   */
  async isDeviceRegistered(): Promise<boolean> {
    try {
      const registered = await SecureStore.getItemAsync(SECURITY_KEYS.DEVICE_REGISTERED);
      return registered === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Unregister device
   */
  async unregisterDevice(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SECURITY_KEYS.DEVICE_REGISTERED);
      await SecureStore.deleteItemAsync(SECURITY_KEYS.DEVICE_ID);
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  }

  // =============================================================================
  // ENHANCED SECURE STORAGE
  // =============================================================================

  /**
   * Store sensitive data with additional encryption layer
   */
  async storeSecureData(key: string, data: any): Promise<void> {
    try {
      const encryptedData = this.simpleEncrypt(JSON.stringify(data));
      await SecureStore.setItemAsync(key, encryptedData);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw error;
    }
  }

  /**
   * Retrieve sensitive data with decryption
   */
  async getSecureData(key: string): Promise<any | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(key);
      if (!encryptedData) return null;

      const decryptedData = this.simpleDecrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  }

  /**
   * Simple encryption/decryption for additional security layer
   * Note: This is not meant to be cryptographically secure, just an additional obfuscation layer
   */
  private simpleEncrypt(data: string): string {
    // Simple XOR encryption with a key
    const key = 'immuneme_security_key';
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode
  }

  private simpleDecrypt(data: string): string {
    try {
      const decoded = atob(data); // Base64 decode
      const key = 'immuneme_security_key';
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  // =============================================================================
  // SECURITY UTILITIES
  // =============================================================================

  /**
   * Clear all security-related data
   */
  async clearSecurityData(): Promise<void> {
    try {
      const keys = Object.values(SECURITY_KEYS);
      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Error clearing security data:', error);
    }
  }

  /**
   * Get security status summary
   */
  async getSecurityStatus(): Promise<{
    biometricAvailable: boolean;
    biometricEnabled: boolean;
    deviceRegistered: boolean;
    sessionTimeout: number;
    sessionExpired: boolean;
  }> {
    const [biometricAvailable, biometricEnabled, deviceRegistered, sessionExpired] = await Promise.all([
      this.isBiometricAvailable(),
      this.isBiometricEnabled(),
      this.isDeviceRegistered(),
      this.isSessionExpired(),
    ]);

    return {
      biometricAvailable,
      biometricEnabled,
      deviceRegistered,
      sessionTimeout: this.sessionTimeoutMinutes,
      sessionExpired,
    };
  }
}

// =============================================================================
// SERVICE INSTANCE
// =============================================================================

export const securityService = new SecurityService();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if biometric authentication is enabled globally
 */
export const isBiometricAuthEnabled = (): boolean => {
  return process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH === 'true';
};

/**
 * Initialize security service on app start
 */
export const initializeSecurity = async (): Promise<void> => {
  try {
    // Register device if not already registered
    const registered = await securityService.isDeviceRegistered();
    if (!registered) {
      await securityService.registerDevice();
    }

    // Update last activity
    await securityService.updateLastActivity();

    console.log('Security service initialized');
  } catch (error) {
    console.error('Error initializing security service:', error);
  }
};

export default {
  SecurityService,
  securityService,
  isBiometricAuthEnabled,
  initializeSecurity,
};