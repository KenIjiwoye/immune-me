import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { authService, RoleGuard, UserSession } from '../services/appwriteAuth';
import { ProfileType, Profile } from '../types/profile';

// Enhanced user type for the context
export type UserWithProfile = {
  $id: string;
  email: string;
  name: string;
  phone?: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  profileType: ProfileType;
  profile: Profile | null;
  role: 'admin' | 'employee' | 'patient';
  facilityId?: string;
  permissions: string[];
};

type AuthContextType = {
  // Enhanced user with Profile support
  user: UserWithProfile | null;
  session: UserSession | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  // Profile-specific methods
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessFacility: (facilityId: string) => boolean;
  getDisplayName: () => string;
  // Profile type and data
  profileType: ProfileType;
  profile: Profile | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from secure storage on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authService.initialize();

        // Try to refresh session and get current user
        const refreshedSession = await authService.refreshSession();
        if (refreshedSession) {
          setSession(refreshedSession);
          await loadUserWithProfile();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Load user with Profile information
  const loadUserWithProfile = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;

      // Get enhanced user with Profile data
      const userProfile = authService.getCurrentProfile();
      if (userProfile) {
        const userWithProfile: UserWithProfile = {
          $id: currentUser.$id,
          email: currentUser.email,
          name: currentUser.name,
          phone: currentUser.phone,
          emailVerification: currentUser.emailVerification,
          phoneVerification: currentUser.phoneVerification,
          profileType: userProfile.type,
          profile: userProfile.profile,
          role: userProfile.type,
          facilityId: userProfile.facilityId,
          permissions: userProfile.permissions,
        };
        setUser(userWithProfile);
      } else {
        // Fallback to basic user data if Profile loading fails
        const fallbackUser: UserWithProfile = {
          $id: currentUser.$id,
          email: currentUser.email,
          name: currentUser.name,
          phone: currentUser.phone,
          emailVerification: currentUser.emailVerification,
          phoneVerification: currentUser.phoneVerification,
          profileType: 'patient', // Default fallback
          profile: null,
          role: 'patient',
          facilityId: undefined,
          permissions: [],
        };
        setUser(fallbackUser);
      }
    } catch (error) {
      console.error('Failed to load user with profile:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userSession = await authService.login({ email, password });
      setSession(userSession);

      // Load enhanced user data with Profile
      await loadUserWithProfile();

      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();

      // Reset auth state
      setUser(null);
      setSession(null);

      // Navigate to login screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still reset state even if logout API fails
      setUser(null);
      setSession(null);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh Profile data
  const refreshProfile = async () => {
    if (user) {
      try {
        await loadUserWithProfile();
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  // Check if user can access specific facility
  const canAccessFacility = (facilityId: string): boolean => {
    return RoleGuard.canAccessFacility(authService.getCurrentProfile(), facilityId);
  };

  // Get display name with professional title
  const getDisplayName = (): string => {
    if (!user) return '';

    switch (user.profileType) {
      case 'admin':
        return `Admin ${user.name}`;
      case 'employee':
        const employeeProfile = user.profile as any; // EmployeeProfile
        return `${employeeProfile?.professional_title || 'Employee'} ${user.name}`;
      case 'patient':
        return user.name;
      default:
        return user.name;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user && !!session,
        refreshProfile,
        hasPermission,
        canAccessFacility,
        getDisplayName,
        profileType: user?.profileType || 'patient',
        profile: user?.profile || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};