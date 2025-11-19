import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { authService } from '../services/appwriteAuth';

interface SimpleUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'patient';
}

interface SimpleAuthContextType {
  user: SimpleUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const simplifyUser = (appwriteUser: any, profile?: any): SimpleUser => ({
    id: appwriteUser.$id,
    email: appwriteUser.email,
    name: appwriteUser.name,
    role: (profile?.type as 'admin' | 'employee' | 'patient') || 'patient'
  });

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await authService.refreshSession();
        if (session) {
          const simpleUser = simplifyUser(session.user, session.profile);
          setUser(simpleUser);
        }
      } catch (error) {
        console.error('Failed to initialize simple auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const session = await authService.login({ email, password });
      const simpleUser = simplifyUser(session.user, session.profile);
      setUser(simpleUser);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Simple auth login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Simple auth logout failed:', error);
      setUser(null);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  const value: SimpleAuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};