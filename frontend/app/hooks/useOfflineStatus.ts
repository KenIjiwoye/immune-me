/**
 * Offline Status Hook
 * Provides offline/online status and sync indicators
 */

import { useState, useEffect } from 'react';
import { onlineManager, useIsFetching, useIsMutating } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineStatus {
  isOnline: boolean;
  isFetching: boolean;
  isMutating: boolean;
  hasPendingMutations: boolean;
  lastSyncTime: Date | null;
}

/**
 * Hook to track online/offline status and sync state
 */
export const useOfflineStatus = (): OfflineStatus => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Track if any queries are currently fetching
  const isFetching = useIsFetching() > 0;

  // Track if any mutations are currently running
  const isMutating = useIsMutating() > 0;

  // Check for pending mutations (mutations that failed and are retrying)
  const hasPendingMutations = useIsMutating({ status: 'pending' }) > 0;

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);

      // Update last sync time when coming back online
      if (online && !isOnline) {
        setLastSyncTime(new Date());
      }
    });

    // Set initial online status
    NetInfo.fetch().then((state) => {
      setIsOnline(!!state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline]);

  return {
    isOnline,
    isFetching,
    isMutating,
    hasPendingMutations,
    lastSyncTime,
  };
};

/**
 * Hook to get sync status text for UI display
 */
export const useSyncStatusText = (): string => {
  const { isOnline, isFetching, isMutating, hasPendingMutations } = useOfflineStatus();

  if (!isOnline) {
    return 'Offline - Changes will sync when online';
  }

  if (isMutating) {
    return 'Syncing changes...';
  }

  if (hasPendingMutations) {
    return 'Pending changes - Retrying...';
  }

  if (isFetching) {
    return 'Refreshing data...';
  }

  return 'All changes synced';
};

/**
 * Hook to check if app is in a "busy" state (fetching or mutating)
 */
export const useIsAppBusy = (): boolean => {
  const { isFetching, isMutating } = useOfflineStatus();
  return isFetching || isMutating;
};

/**
 * Hook to get offline indicator color for UI
 */
export const useOfflineIndicatorColor = (): string => {
  const { isOnline, isMutating, hasPendingMutations } = useOfflineStatus();

  if (!isOnline) {
    return '#ff6b6b'; // Red for offline
  }

  if (isMutating) {
    return '#ffd93d'; // Yellow for actively syncing
  }

  if (hasPendingMutations) {
    return '#ff8c42'; // Orange for pending changes
  }

  return '#51cf66'; // Green for online and synced
};