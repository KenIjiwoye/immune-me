import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  getLoggedInUser,
  isUserAuthenticated,
  logoutUser,
  SimpleUser
} from '../utils/authUtils';

/**
 * Enhanced simple authentication hook for React components.
 * This hook provides a streamlined way to handle authentication in pages.
 * 
 * Usage:
 * const { user, isLoading, logout, checkAuth } = useSimpleAuth();
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (!user) return null; // Redirect handled automatically
 * 
 * return <div>Welcome {user.name}!</div>;
 */
export const useSimpleAuth = () => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const authenticatedUser = await getLoggedInUser();
      setUser(authenticatedUser);
    } catch (error) {
      console.log('Authentication check failed, user will be redirected');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const authenticatedUser = await getLoggedInUser();
      setUser(authenticatedUser);
    } catch (error) {
      setUser(null);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    checkAuth,
    refreshUser
  };
};

/**
 * Hook for page-level authentication with automatic redirect.
 * Use this at the top level of protected pages.
 * 
 * Usage:
 * const { user, isLoading } = usePageAuth();
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (!user) return null; // Redirect handled automatically
 * 
 * return <div>Protected content for {user.name}</div>;
 */
export const usePageAuth = () => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authenticatePage = async () => {
      try {
        setIsLoading(true);
        const authenticatedUser = await getLoggedInUser();
        setUser(authenticatedUser);
      } catch (error) {
        // getLoggedInUser already handles redirect, so we just set null
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    authenticatePage();
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
};

/**
 * Hook for checking authentication status without redirect.
 * Useful for conditional rendering or early returns.
 * 
 * Usage:
 * const { isAuthenticated, isLoading, checkAuth } = useAuthCheck();
 * 
 * useEffect(() => {
 *   checkAuth();
 * }, []);
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <LoginPrompt />;
 * 
 * return <AuthenticatedContent />;
 */
export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const authStatus = await isUserAuthenticated();
      setIsAuthenticated(authStatus);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return { isAuthenticated, isLoading, checkAuth };
};