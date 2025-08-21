Listeners: ((user: UserProfile | null) => void)[] = [];

  constructor() {
    this.account = appwriteClient.account;
  }

  async initialize(): Promise<void> {
    try {
      // Check for existing session
      await this.checkAuthState();
    } catch (error) {
      console.error('Auth initialization failed:', error);
    }
  }

  async checkAuthState(): Promise<void> {
    try {
      // Try to get current session from Appwrite
      const session = await this.account.getSession('current');
      if (session) {
        const user = await this.account.get();
        await this.setCurrentUser(user);
        
        // Store session locally for offline access
        await this.storeSessionLocally({
          userId: user.$id,
          sessionId: session.$id,
          email: user.email,
          name: user.name,
          role: user.prefs?.role,
          facilityId: user.prefs?.facilityId,
          expiresAt: new Date(session.expire)
        });
      }
    } catch (error) {
      // No active session, try to load from local storage for offline access
      await this.loadOfflineSession();
    }
  }

  async login(credentials: LoginCredentials): Promise<UserProfile> {
    try {
      // Create session with Appwrite
      const session = await this.account.createEmailSession(
        credentials.email,
        credentials.password
      );

      // Get user details
      const user = await this.account.get();
      await this.setCurrentUser(user);

      // Store session locally
      await this.storeSessionLocally({
        userId: user.$id,
        sessionId: session.$id,
        email: user.email,
        name: user.name,
        role: user.prefs?.role,
        facilityId: user.prefs?.facilityId,
        expiresAt: new Date(session.expire)
      });

      return this.currentUser!;
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async register(data: RegisterData): Promise<UserProfile> {
    try {
      // Create account
      const user = await this.account.create(
        ID.unique(),
        data.email,
        data.password,
        data.name
      );

      // Update user preferences with role and facility
      if (data.role || data.facilityId) {
        await this.account.updatePrefs({
          role: data.role,
          facilityId: data.facilityId
        });
      }

      // Auto-login after registration
      return await this.login({
        email: data.email,
        password: data.password
      });
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Delete current session from Appwrite
      if (this.currentSession && !this.currentSession.isOffline) {
        await this.account.deleteSession('current');
      }

      // Clear local storage
      await this.clearLocalSession();
      
      // Clear current user and session
      this.currentUser = null;
      this.currentSession = null;
      
      // Notify listeners
      this.notifyAuthListeners();
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if server logout fails
      await this.clearLocalSession();
      this.currentUser = null;
      this.currentSession = null;
      this.notifyAuthListeners();
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Update name if provided
      if (updates.name) {
        await this.account.updateName(updates.name);
      }

      // Update email if provided
      if (updates.email) {
        await this.account.updateEmail(updates.email, this.currentUser.password || '');
      }

      // Update preferences (role, facilityId, etc.)
      const prefsUpdates: any = {};
      if (updates.role !== undefined) prefsUpdates.role = updates.role;
      if (updates.facilityId !== undefined) prefsUpdates.facilityId = updates.facilityId;
      
      if (Object.keys(prefsUpdates).length > 0) {
        await this.account.updatePrefs({
          ...this.currentUser.prefs,
          ...prefsUpdates
        });
      }

      // Refresh user data
      const updatedUser = await this.account.get();
      await this.setCurrentUser(updatedUser);

      return this.currentUser!;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.account.updatePassword(newPassword, currentPassword);
    } catch (error) {
      console.error('Password change failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await this.account.createRecovery(
        email,
        `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`
      );
    } catch (error) {
      console.error('Password reset failed:', error);
      throw this.handleAuthError(error);
    }
  }

  async confirmPasswordReset(
    userId: string,
    secret: string,
    newPassword: string
  ): Promise<void> {
    try {
      await this.account.updateRecovery(userId, secret, newPassword, newPassword);
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw this.handleAuthError(error);
    }
  }

  private async setCurrentUser(user: Models.User<Models.Preferences>): Promise<void> {
    // Enhance user with additional profile data
    this.currentUser = {
      ...user,
      role: user.prefs?.role,
      facilityId: user.prefs?.facilityId,
      facilityName: await this.getFacilityName(user.prefs?.facilityId),
      permissions: this.getUserPermissions(user.prefs?.role)
    };

    // Store user data locally for offline access
    await this.storeUserLocally(this.currentUser);
    
    // Notify listeners
    this.notifyAuthListeners();
  }

  private async getFacilityName(facilityId?: string): Promise<string | undefined> {
    if (!facilityId) return undefined;

    try {
      // Try to get facility name from local database first
      const db = await databaseManager.getDatabase();
      const facility = await db.getFirstAsync(
        'SELECT name FROM facilities WHERE id = ? OR appwrite_id = ?',
        [facilityId, facilityId]
      );
      
      return facility?.name;
    } catch (error) {
      console.error('Failed to get facility name:', error);
      return undefined;
    }
  }

  private getUserPermissions(role?: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        'users.read',
        'users.write',
        'patients.read',
        'patients.write',
        'immunizations.read',
        'immunizations.write',
        'reports.read',
        'facilities.read',
        'facilities.write',
        'vaccines.read',
        'vaccines.write'
      ],
      healthcare_worker: [
        'patients.read',
        'patients.write',
        'immunizations.read',
        'immunizations.write',
        'reports.read'
      ],
      viewer: [
        'patients.read',
        'immunizations.read',
        'reports.read'
      ]
    };

    return permissions[role || 'viewer'] || permissions.viewer;
  }

  private async storeSessionLocally(session: AuthSession): Promise<void> {
    try {
      this.currentSession = session;
      await AsyncStorage.setItem('auth_session', JSON.stringify(session));
    } catch (error) {
      console.error('Failed to store session locally:', error);
    }
  }

  private async storeUserLocally(user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user locally:', error);
    }
  }

  private async loadOfflineSession(): Promise<void> {
    try {
      const sessionData = await AsyncStorage.getItem('auth_session');
      const userData = await AsyncStorage.getItem('auth_user');

      if (sessionData && userData) {
        const session: AuthSession = JSON.parse(sessionData);
        const user: UserProfile = JSON.parse(userData);

        // Check if session is still valid
        if (new Date() < new Date(session.expiresAt)) {
          this.currentSession = { ...session, isOffline: true };
          this.currentUser = user;
          this.notifyAuthListeners();
        } else {
          // Session expired, clear local data
          await this.clearLocalSession();
        }
      }
    } catch (error) {
      console.error('Failed to load offline session:', error);
    }
  }

  private async clearLocalSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['auth_session', 'auth_user']);
    } catch (error) {
      console.error('Failed to clear local session:', error);
    }
  }

  private handleAuthError(error: any): Error {
    // Map Appwrite errors to user-friendly messages
    const errorMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Invalid credentials. Please try again.',
      409: 'An account with this email already exists.',
      429: 'Too many requests. Please try again later.',
      500: 'Server error. Please try again later.'
    };

    const message = errorMessages[error.code] || error.message || 'An unexpected error occurred';
    return new Error(message);
  }

  private notifyAuthListeners(): void {
    this.authListeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  // Public getters
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isOffline(): boolean {
    return this.currentSession?.isOffline || false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions?.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  // Event listeners
  onAuthStateChange(listener: (user: UserProfile | null) => void): () => void {
    this.authListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }
}

export const appwriteAuthService = new AppwriteAuthService();
```

### Updated Authentication Context
```typescript
// frontend/context/auth.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  appwriteAuthService, 
  UserProfile, 
  LoginCredentials, 
  RegisterData 
} from '../services/auth/AppwriteAuthService';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  login: (credentials: LoginCredentials) => Promise<UserProfile>;
  register: (data: RegisterData) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize auth service
      await appwriteAuthService.initialize();
      
      // Set initial user state
      setUser(appwriteAuthService.getCurrentUser());
      
      // Listen for auth state changes
      const unsubscribe = appwriteAuthService.onAuthStateChange(setUser);
      
      return unsubscribe;
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<UserProfile> => {
    const user = await appwriteAuthService.login(credentials);
    return user;
  };

  const register = async (data: RegisterData): Promise<UserProfile> => {
    const user = await appwriteAuthService.register(data);
    return user;
  };

  const logout = async (): Promise<void> => {
    await appwriteAuthService.logout();
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    const updatedUser = await appwriteAuthService.updateProfile(updates);
    return updatedUser;
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await appwriteAuthService.changePassword(currentPassword, newPassword);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await appwriteAuthService.resetPassword(email);
  };

  const hasPermission = (permission: string): boolean => {
    return appwriteAuthService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    return appwriteAuthService.hasRole(role);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: appwriteAuthService.isAuthenticated(),
    isOffline: appwriteAuthService.isOffline(),
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    resetPassword,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Permission-based Route Protection
```typescript
// frontend/components/auth/ProtectedRoute.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/auth';
import { router } from 'expo-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback
}) => {
  const { isAuthenticated, hasPermission, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedText}>
          Access Denied: Insufficient permissions
        </Text>
      </View>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedText}>
          Access Denied: Required role not found
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
});
```

### Authentication Hook with Offline Support
```typescript
// frontend/hooks/useAuthWithOffline.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth';
import NetInfo from '@react-native-community/netinfo';

export const useAuthWithOffline = () => {
  const auth = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [canSync, setCanSync] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setCanSync((state.isConnected ?? false) && auth.isAuthenticated && !auth.isOffline);
    });

    return unsubscribe;
  }, [auth.isAuthenticated, auth.isOffline]);

  const loginWithOfflineSupport = async (credentials: any) => {
    try {
      return await auth.login(credentials);
    } catch (error) {
      if (!isOnline) {
        throw new Error('Cannot login while offline. Please check your internet connection.');
      }
      throw error;
    }
  };

  const syncWhenOnline = async () => {
    if (canSync) {
      // Trigger sync when coming back online
      // This would integrate with the sync service
      console.log('Syncing data after coming back online...');
    }
  };

  return {
    ...auth,
    isOnline,
    canSync,
    loginWithOfflineSupport,
    syncWhenOnline
  };
};
```

### Migration Utilities
```typescript
// frontend/utils/authMigration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appwriteAuthService } from '../services/auth/AppwriteAuthService';

export class AuthMigrationUtils {
  private static readonly LEGACY_AUTH_KEY = 'legacy_auth_data';
  private static readonly MIGRATION_COMPLETE_KEY = 'auth_migration_complete';

  static async checkMigrationNeeded(): Promise<boolean> {
    try {
      const migrationComplete = await AsyncStorage.getItem(this.MIGRATION_COMPLETE_KEY);
      const legacyAuth = await AsyncStorage.getItem(this.LEGACY_AUTH_KEY);
      
      return !migrationComplete && !!legacyAuth;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  static async migrateLegacyAuth(): Promise<void> {
    try {
      const legacyAuthData = await AsyncStorage.getItem(this.LEGACY_AUTH_KEY);
      
      if (!legacyAuthData) {
        await this.markMigrationComplete();
        return;
      }

      const legacyAuth = JSON.parse(legacyAuthData);
      
      // Extract user information from legacy auth
      const { email, name, role, facilityId } = legacyAuth;
      
      // Note: Password migration would require user to re-enter password
      // or use a temporary password reset flow
      
      console.log('Legacy auth data found, user will need to re-authenticate');
      
      // Clear legacy auth data
      await AsyncStorage.removeItem(this.LEGACY_AUTH_KEY);
      await this.markMigrationComplete();
      
    } catch (error) {
      console.error('Auth migration failed:', error);
      throw error;
    }
  }

  private static async markMigrationComplete(): Promise<void> {
    await AsyncStorage.setItem(this.MIGRATION_COMPLETE_KEY, 'true');
  }

  static async exportUserData(): Promise<string> {
    const user = appwriteAuthService.getCurrentUser();
    const session = appwriteAuthService.getCurrentSession();
    
    const exportData = {
      user: user ? {
        id: user.$id,
        email: user.email,
        name: user.name,
        role: user.role,
        facilityId: user.facilityId,
        facilityName: user.facilityName
      } : null,
      session: session ? {
        userId: session.userId,
        email: session.email,
        role: session.role,
        facilityId: session.facilityId,
        isOffline: session.isOffline
      } : null,
      exportedAt: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}
```

## Files to Create/Modify
- `frontend/services/auth/AppwriteAuthService.ts` - Main authentication service
- `frontend/context/auth.tsx` - Updated authentication context
- `frontend/components/auth/ProtectedRoute.tsx` - Route protection component
- `frontend/hooks/useAuthWithOffline.ts` - Authentication hook with offline support
- `frontend/utils/authMigration.ts` - Migration utilities
- `frontend/types/auth.ts` - Authentication TypeScript types

## Testing Requirements

### Authentication Service Testing
```typescript
// frontend/__tests__/services/auth/AppwriteAuthService.test.ts
import { appwriteAuthService } from '../../../services/auth/AppwriteAuthService';

describe('AppwriteAuthService', () => {
  beforeEach(() => {
    // Mock Appwrite client
    jest.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    const mockUser = {
      $id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      prefs: { role: 'healthcare_worker' }
    };

    // Mock successful login
    const user = await appwriteAuthService.login({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });

  it('should handle login errors gracefully', async () => {
    // Mock login failure
    await expect(appwriteAuthService.login({
      email: 'invalid@example.com',
      password: 'wrongpassword'
    })).rejects.toThrow();
  });

  it('should check permissions correctly', () => {
    // Mock authenticated user with healthcare_worker role
    const hasPermission = appwriteAuthService.hasPermission('patients.read');
    expect(hasPermission).toBe(true);

    const hasAdminPermission = appwriteAuthService.hasPermission('users.write');
    expect(hasAdminPermission).toBe(false);
  });
});
```

### Offline Authentication Testing
```typescript
// frontend/__tests__/hooks/useAuthWithOffline.test.ts
import { renderHook } from '@testing-library/react-native';
import { useAuthWithOffline } from '../../../hooks/useAuthWithOffline';

describe('useAuthWithOffline', () => {
  it('should handle offline login attempts', async () => {
    const { result } = renderHook(() => useAuthWithOffline());
    
    // Mock offline state
    jest.mock('@react-native-community/netinfo', () => ({
      addEventListener: jest.fn(),
      fetch: () => Promise.resolve({ isConnected: false })
    }));

    await expect(result.current.loginWithOfflineSupport({
      email: 'test@example.com',
      password: 'password'
    })).rejects.toThrow('Cannot login while offline');
  });

  it('should sync when coming back online', async () => {
    const { result } = renderHook(() => useAuthWithOffline());
    
    // Test sync trigger when network comes back
    expect(result.current.canSync).toBeDefined();
  });
});
```

### Permission Testing
```typescript
// frontend/__tests__/components/auth/ProtectedRoute.test.ts
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { AuthProvider } from '../../../context/auth';

describe('ProtectedRoute', () => {
  it('should render children when user has required permission', () => {
    const TestComponent = () => <Text>Protected Content</Text>;
    
    const { getByText } = render(
      <AuthProvider>
        <ProtectedRoute requiredPermission="patients.read">
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(getByText('Protected Content')).toBeTruthy();
  });

  it('should show access denied when user lacks permission', () => {
    const TestComponent = () => <Text>Protected Content</Text>;
    
    const { getByText } = render(
      <AuthProvider>
        <ProtectedRoute requiredPermission="admin.write">
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(getByText('Access Denied: Insufficient permissions')).toBeTruthy();
  });
});
```

## Implementation Steps

### Phase 1: Core Authentication Service (2 hours)
1. Implement AppwriteAuthService class
2. Add login, register, logout functionality
3. Implement session management
4. Test basic authentication flows

### Phase 2: Offline Support (1.5 hours)
1. Add offline session storage
2. Implement offline authentication fallback
3. Add network state monitoring
4. Test offline scenarios

### Phase 3: Context Integration (1 hour)
1. Update authentication context
2. Add permission and role checking
3. Integrate with existing components
4. Test context functionality

### Phase 4: Route Protection & Migration (1.5 hours)
1. Create protected route components
2. Implement migration utilities
3. Add backward compatibility
4. Test migration scenarios

## Success Metrics
- Appwrite authentication fully integrated
- Offline authentication working correctly
- Role-based access control functional
- Session management robust
- Migration from existing auth successful
- All tests passing
- No breaking changes to existing functionality

## Rollback Plan
- Keep existing auth system as fallback
- Implement feature flags for gradual migration
- Maintain dual authentication support during transition
- Document rollback procedures

## Next Steps
After completion, this task enables:
- FE-AW-11: Patient services migration with offline support
- FE-AW-12: Immunization services migration with offline support
- FE-AW-13: Notification services migration with offline support
- FE-AW-14: Offline indicators and conflict resolution UI