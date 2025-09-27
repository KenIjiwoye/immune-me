import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api from '../services/api';
import profileService from '../services/profileService';
import { UserWithProfile, ProfileType, Profile } from '../types/profile';

// Legacy User type for backward compatibility
type LegacyUser = {
  id: number;
  email: string;
  fullName: string;
  role: 'nurse' | 'doctor' | 'administrator' | 'supervisor';
  facilityId: number;
};

type AuthContextType = {
  // Enhanced user with Profile support
  user: UserWithProfile | null;
  // Legacy user for backward compatibility
  legacyUser: LegacyUser | null;
  token: string | null;
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
  const [legacyUser, setLegacyUser] = useState<LegacyUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from secure storage on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
          setToken(storedToken);
          api.setAuthToken(storedToken);
          
          // Fetch user data with Profile integration
          await loadUserWithProfile();
        }
      } catch (error) {
        console.error('Failed to load auth token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  // Load user with Profile information
  const loadUserWithProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const basicUser = response.data.user;
      
      // Get enhanced user with Profile data
      const userWithProfile = await profileService.getUserWithProfile(basicUser.$id);
      setUser(userWithProfile);
      
      // Create legacy user for backward compatibility
      const legacy: LegacyUser = {
        id: parseInt(basicUser.$id) || 0, // Convert string ID to number for legacy compatibility
        email: userWithProfile.email,
        fullName: userWithProfile.name,
        role: userWithProfile.role || 'nurse',
        facilityId: parseInt(userWithProfile.facilityId || '0') || 0
      };
      setLegacyUser(legacy);
      
    } catch (error) {
      console.error('Failed to load user with profile:', error);
      // Fallback to basic user data if Profile loading fails
      try {
        const response = await api.get('/auth/me');
        const basicUser = response.data.user;
        
        const fallbackUser: UserWithProfile = {
          ...basicUser,
          profileType: 'legacy',
          profile: null,
          role: extractRoleFromLabels(basicUser.labels),
          facilityId: extractFacilityFromLabels(basicUser.labels)
        };
        setUser(fallbackUser);
        
        const legacy: LegacyUser = {
          id: parseInt(basicUser.$id) || 0,
          email: fallbackUser.email,
          fullName: fallbackUser.name,
          role: fallbackUser.role || 'nurse',
          facilityId: parseInt(fallbackUser.facilityId || '0') || 0
        };
        setLegacyUser(legacy);
      } catch (fallbackError) {
        console.error('Failed to load basic user data:', fallbackError);
        throw fallbackError;
      }
    }
  };

  // Extract role from user labels for legacy compatibility
  const extractRoleFromLabels = (labels: string[]): 'nurse' | 'doctor' | 'administrator' | 'supervisor' => {
    if (labels.includes('role:administrator')) return 'administrator';
    if (labels.includes('role:supervisor')) return 'supervisor';
    if (labels.includes('role:doctor')) return 'doctor';
    return 'nurse';
  };

  // Extract facility ID from user labels for legacy compatibility
  const extractFacilityFromLabels = (labels: string[]): string | undefined => {
    const facilityLabel = labels.find(label => label.startsWith('facility_'));
    return facilityLabel ? facilityLabel.replace('facility_', '') : undefined;
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: basicUser, token: authToken } = response.data;
      
      // Save token to secure storage
      await SecureStore.setItemAsync('auth_token', authToken);
      
      // Set token and load user with Profile
      setToken(authToken);
      api.setAuthToken(authToken);
      
      // Load enhanced user data with Profile
      await loadUserWithProfile();
      
      // Navigate to home screen
      router.replace('/');
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
      // Call logout endpoint if available
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear token from secure storage
      await SecureStore.deleteItemAsync('auth_token');
      
      // Reset auth state
      setUser(null);
      setLegacyUser(null);
      setToken(null);
      api.setAuthToken(null);
      
      // Navigate to login screen
      router.replace('/login');
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
    return profileService.utils.hasPermission(user?.profile || null, permission);
  };

  // Check if user can access specific facility
  const canAccessFacility = (facilityId: string): boolean => {
    return profileService.utils.canAccessFacility(user?.profile || null, facilityId);
  };

  // Get display name with professional title
  const getDisplayName = (): string => {
    return user ? profileService.utils.getDisplayName(user) : '';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        legacyUser,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        refreshProfile,
        hasPermission,
        canAccessFacility,
        getDisplayName,
        profileType: user?.profileType || 'legacy',
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