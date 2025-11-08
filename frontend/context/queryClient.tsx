import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

// Configure online manager for React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

// Configure focus manager for React Native
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });

  return () => subscription?.remove();
});

// Create QueryClient with comprehensive configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.code >= 400 && error?.code < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network configuration
      networkMode: 'online', // Only run queries when online
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Background refetching
      refetchInterval: false, // Disable automatic refetching
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount, error: any) => {
        if (error?.code >= 400 && error?.code < 500) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000,

      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Add persistor to query client (AsyncStorage-based persistence)
persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (clientData) => {
      try {
        await AsyncStorage.setItem('react-query-cache', JSON.stringify(clientData));
      } catch (error) {
        console.warn('Failed to persist query client:', error);
      }
    },
    restoreClient: async () => {
      try {
        const data = await AsyncStorage.getItem('react-query-cache');
        return data ? JSON.parse(data) : undefined;
      } catch (error) {
        console.warn('Failed to restore query client:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await AsyncStorage.removeItem('react-query-cache');
      } catch (error) {
        console.warn('Failed to remove query client:', error);
      }
    },
  },
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  buster: 'v1', // Version for cache invalidation
});

// Export QueryClientProvider wrapper component
export { QueryClientProvider } from '@tanstack/react-query';