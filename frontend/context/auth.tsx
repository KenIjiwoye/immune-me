import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api from '../services/api';

type User = {
  id: number;
  email: string;
  fullName: string;
  role: 'nurse' | 'doctor' | 'administrator' | 'supervisor';
  facilityId: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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
          
          // Fetch user data
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to load auth token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      // Save token to secure storage
      await SecureStore.setItemAsync('auth_token', token);
      
      // Set auth state
      setUser(user);
      setToken(token);
      api.setAuthToken(token);
      
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
      setToken(null);
      api.setAuthToken(null);
      
      // Navigate to login screen
      router.replace('/login');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
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