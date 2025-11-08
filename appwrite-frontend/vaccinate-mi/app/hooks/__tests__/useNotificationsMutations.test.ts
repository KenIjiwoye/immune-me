import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
  useCreateNotificationEnhanced,
  useUpdateNotificationEnhanced,
  useDeleteNotificationEnhanced,
  useMarkNotificationAsRead,
  useMarkMultipleNotificationsAsRead,
  notificationKeys
} from '../useNotificationsMutations';

// Mock the services
jest.mock('../services/optimisticUpdates', () => ({
  useOptimisticCreate: jest.fn(),
  useOptimisticUpdate: jest.fn(),
  useOptimisticDelete: jest.fn(),
}));

jest.mock('../services/mutationErrorHandler', () => ({
  useEnhancedCreateMutation: jest.fn(),
  useEnhancedUpdateMutation: jest.fn(),
  useEnhancedDeleteMutation: jest.fn(),
}));

jest.mock('../services/notificationsService', () => ({
  notificationsService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '../services/optimisticUpdates';
import {
  useEnhancedCreateMutation,
  useEnhancedUpdateMutation,
  useEnhancedDeleteMutation,
} from '../services/mutationErrorHandler';
import { notificationsService } from '../services/notificationsService';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;

describe('useNotificationsMutations', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  describe('Legacy Optimistic Mutations', () => {
    describe('useCreateNotification', () => {
      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateNotification(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          notificationsService,
          [
            [...notificationKeys.lists()],
            [...notificationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle notification creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'notification-123',
            type: 'immunization_due',
            title: 'Vaccination Due',
            message: 'Child vaccination is due',
            recipient_id: 'user-456',
            priority: 'high',
            is_read: false,
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateNotification(), { wrapper });

        const testData = {
          type: 'immunization_due',
          title: 'Vaccination Due',
          message: 'Child vaccination is due',
          recipient_id: 'user-456',
          facility_id: 'facility-789',
          priority: 'high',
          status: 'pending',
          is_read: false,
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateNotification', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateNotification(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          notificationsService,
          [
            [...notificationKeys.lists()],
            [...notificationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteNotification', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteNotification(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          notificationsService,
          [
            [...notificationKeys.lists()],
            [...notificationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateNotificationEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateNotificationEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          notificationsService,
          [
            [...notificationKeys.lists()],
            [...notificationKeys.all],
          ],
          {
            enableRollback: true,
            retryConfig: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 5000,
              backoffMultiplier: 2,
            },
            conflictResolution: {
              strategy: 'merge',
              versionField: 'version',
              lastModifiedField: 'updatedAt',
            },
            userFriendlyMessages: true,
          }
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useUpdateNotificationEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateNotificationEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          notificationsService,
          [
            [...notificationKeys.lists()],
            [...notificationKeys.all],
          ],
          {
            enableRollback: true,
            retryConfig: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 5000,
              backoffMultiplier: 2,
            },
            conflictResolution: {
              strategy: 'merge',
              versionField: 'version',
              lastModifiedField: 'updatedAt',
            },
            userFriendlyMessages: true,
          }
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteNotificationEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteNotificationEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });

    describe('useMarkNotificationAsRead', () => {
      it('should create enhanced update hook with no rollback for read status', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        renderHook(() => useMarkNotificationAsRead(), { wrapper });

        const callArgs = mockUseEnhancedUpdateMutation.mock.calls[0][2];
        expect(callArgs.enableRollback).toBe(false);
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.baseDelay).toBe(500);
      });

      it('should handle marking notification as read', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'notification-123',
            is_read: true,
            updated_at: new Date().toISOString(),
          }),
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useMarkNotificationAsRead(), { wrapper });

        const updateData = {
          id: 'notification-123',
          data: { is_read: true },
        };

        result.current.mutate(updateData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
      });
    });

    describe('useMarkMultipleNotificationsAsRead', () => {
      it('should create enhanced update hook for bulk read operations', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        renderHook(() => useMarkMultipleNotificationsAsRead(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          notificationsService,
          expect.any(Array),
          expect.objectContaining({
            enableRollback: false,
            retryConfig: expect.objectContaining({
              maxRetries: 2,
              baseDelay: 500,
            }),
          })
        );
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(notificationKeys.all).toEqual(['notifications']);
      expect(notificationKeys.lists()).toEqual(['notifications', 'list']);
      expect(notificationKeys.list({})).toEqual(['notifications', 'list', {}]);
      expect(notificationKeys.details()).toEqual(['notifications', 'detail']);
      expect(notificationKeys.detail('test-id')).toEqual(['notifications', 'detail', 'test-id']);
      expect(notificationKeys.byRecipient('user-123')).toEqual(['notifications', 'recipient', 'user-123']);
      expect(notificationKeys.byFacility('facility-456')).toEqual(['notifications', 'facility', 'facility-456']);
      expect(notificationKeys.byPriority('high')).toEqual(['notifications', 'priority', 'high']);
      expect(notificationKeys.byType('alert')).toEqual(['notifications', 'type', 'alert']);
      expect(notificationKeys.unread('user-123')).toEqual(['notifications', 'unread', 'user-123']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Network timeout')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateNotification(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Network timeout');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 429, message: 'Too many requests' },
        recoveryOptions: [
          {
            id: 'retry-later',
            label: 'Retry Later',
            description: 'Wait a moment and try again',
            action: jest.fn(),
            priority: 'medium' as const,
          },
        ],
        isRecovering: false,
        rollbackStatus: 'idle' as const,
      };

      mockUseEnhancedCreateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: mockErrorState,
      });

      const { result } = renderHook(() => useCreateNotificationEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for notification updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateNotificationEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for notifications', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'notification-123',
        version: 2,
        message: 'Merged notification content',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateNotificationEnhanced(), { wrapper });

      const localData = { $id: 'notification-123', version: 1, message: 'Local changes' };
      const serverData = { $id: 'notification-123', version: 2, message: 'Server changes' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Read Status Operations', () => {
    it('should not enable rollback for read status changes', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
      });

      renderHook(() => useMarkNotificationAsRead(), { wrapper });

      const callArgs = mockUseEnhancedUpdateMutation.mock.calls[0][2];
      expect(callArgs.enableRollback).toBe(false);
    });

    it('should use faster retry configuration for read operations', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
      });

      renderHook(() => useMarkNotificationAsRead(), { wrapper });

      const callArgs = mockUseEnhancedUpdateMutation.mock.calls[0][2];
      expect(callArgs.retryConfig.baseDelay).toBe(500);
      expect(callArgs.retryConfig.maxDelay).toBe(2000);
    });
  });
});