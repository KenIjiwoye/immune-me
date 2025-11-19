import { useEffect } from 'react';
import { router } from 'expo-router';
import { useSimpleAuth } from '../context/simpleAuth';

/**
 * Hook for page-level authentication. Redirects to login if not authenticated.
 * Use this in any page component that requires authentication.
 */
export const useRequireAuth = () => {
  const { user, isLoading } = useSimpleAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);
};