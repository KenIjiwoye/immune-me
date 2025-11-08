import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { notificationsService } from '../services/notificationsService';
import type { Notification } from '../types/appwrite';

// Query keys for notifications
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...notificationKeys.lists(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  byRecipient: (recipientId: string) => [...notificationKeys.all, 'recipient', recipientId] as const,
  byFacility: (facilityId: string) => [...notificationKeys.all, 'facility', facilityId] as const,
  byPriority: (priority: string) => [...notificationKeys.all, 'priority', priority] as const,
  byType: (type: string) => [...notificationKeys.all, 'type', type] as const,
  unread: (recipientId: string) => [...notificationKeys.all, 'unread', recipientId] as const,
};

/**
 * Notifications mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateNotification = () => {
  return useOptimisticCreate<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ]
  );
};

/**
 * Notifications mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateNotification = () => {
  return useOptimisticUpdate<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ]
  );
};

/**
 * Notifications mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteNotification = () => {
  return useOptimisticDelete<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ]
  );
};

/**
 * Enhanced notifications mutations with comprehensive error handling and rollback
 */
export const useCreateNotificationEnhanced = () => {
  return useEnhancedCreateMutation<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useUpdateNotificationEnhanced = () => {
  return useEnhancedUpdateMutation<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      conflictResolution: {
        strategy: 'merge',
        versionField: 'version',
        lastModifiedField: 'updatedAt'
      },
      userFriendlyMessages: true
    }
  );
};

export const useDeleteNotificationEnhanced = () => {
  return useEnhancedDeleteMutation<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ],
    {
      enableRollback: true,
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

/**
 * Mark notification as read mutation
 */
export const useMarkNotificationAsRead = () => {
  return useEnhancedUpdateMutation<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ],
    {
      enableRollback: false, // Read status changes are typically not rolled back
      retryConfig: {
        maxRetries: 2,
        baseDelay: 500,
        maxDelay: 2000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

/**
 * Mark multiple notifications as read mutation
 */
export const useMarkMultipleNotificationsAsRead = () => {
  return useEnhancedUpdateMutation<Notification>(
    notificationsService,
    [
      [...notificationKeys.lists()],
      [...notificationKeys.all], // Invalidate all notification queries
    ],
    {
      enableRollback: false, // Read status changes are typically not rolled back
      retryConfig: {
        maxRetries: 2,
        baseDelay: 500,
        maxDelay: 2000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: true
    }
  );
};

export default {
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
  useCreateNotificationEnhanced,
  useUpdateNotificationEnhanced,
  useDeleteNotificationEnhanced,
  useMarkNotificationAsRead,
  useMarkMultipleNotificationsAsRead,
};