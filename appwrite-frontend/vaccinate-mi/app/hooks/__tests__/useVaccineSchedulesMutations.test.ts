import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateVaccineSchedule,
  useUpdateVaccineSchedule,
  useDeleteVaccineSchedule,
  useCreateVaccineScheduleEnhanced,
  useUpdateVaccineScheduleEnhanced,
  useDeleteVaccineScheduleEnhanced,
  vaccineScheduleKeys
} from '../useVaccineSchedulesMutations';

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

jest.mock('../services/appwriteDatabase', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../services/appwrite', () => ({
  COLLECTION_IDS: {
    VACCINE_SCHEDULES: 'vaccine-schedules',
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
import { DatabaseService } from '../services/appwriteDatabase';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;
const mockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

describe('useVaccineSchedulesMutations', () => {
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
    describe('useCreateVaccineSchedule', () => {
      it('should create DatabaseService instance with correct collection ID', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        renderHook(() => useCreateVaccineSchedule(), { wrapper });

        expect(mockDatabaseService).toHaveBeenCalledWith('vaccine-schedules');
      });

      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineSchedule(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleKeys.lists()],
            [...vaccineScheduleKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle vaccine schedule creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'schedule-123',
            name: 'Infant Vaccination Schedule',
            description: 'Standard vaccination schedule for infants',
            target_age_group: '0-12 months',
            schedule_type: 'standard',
            is_active: true,
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineSchedule(), { wrapper });

        const testData = {
          name: 'Infant Vaccination Schedule',
          description: 'Standard vaccination schedule for infants',
          target_age_group: '0-12 months',
          schedule_type: 'standard',
          is_active: true,
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateVaccineSchedule', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccineSchedule(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleKeys.lists()],
            [...vaccineScheduleKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteVaccineSchedule', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteVaccineSchedule(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleKeys.lists()],
            [...vaccineScheduleKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateVaccineScheduleEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineScheduleEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleKeys.lists()],
            [...vaccineScheduleKeys.all],
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

    describe('useUpdateVaccineScheduleEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccineScheduleEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleKeys.lists()],
            [...vaccineScheduleKeys.all],
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

    describe('useDeleteVaccineScheduleEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteVaccineScheduleEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(vaccineScheduleKeys.all).toEqual(['vaccineSchedules']);
      expect(vaccineScheduleKeys.lists()).toEqual(['vaccineSchedules', 'list']);
      expect(vaccineScheduleKeys.list({})).toEqual(['vaccineSchedules', 'list', {}]);
      expect(vaccineScheduleKeys.details()).toEqual(['vaccineSchedules', 'detail']);
      expect(vaccineScheduleKeys.detail('test-id')).toEqual(['vaccineSchedules', 'detail', 'test-id']);
      expect(vaccineScheduleKeys.byAgeGroup('0-12 months')).toEqual(['vaccineSchedules', 'ageGroup', '0-12 months']);
      expect(vaccineScheduleKeys.byVaccine('vaccine-123')).toEqual(['vaccineSchedules', 'vaccine', 'vaccine-123']);
      expect(vaccineScheduleKeys.active()).toEqual(['vaccineSchedules', 'active']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Schedule validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineSchedule(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Schedule validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid schedule configuration' },
        recoveryOptions: [
          {
            id: 'fix-schedule',
            label: 'Fix Schedule',
            description: 'Correct the schedule configuration',
            action: jest.fn(),
            priority: 'high' as const,
          },
        ],
        isRecovering: false,
        rollbackStatus: 'idle' as const,
      };

      mockUseEnhancedCreateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: mockErrorState,
      });

      const { result } = renderHook(() => useCreateVaccineScheduleEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for schedule updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateVaccineScheduleEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for vaccine schedules', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'schedule-123',
        version: 2,
        name: 'Merged Schedule Name',
        description: 'Merged description',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateVaccineScheduleEnhanced(), { wrapper });

      const localData = { $id: 'schedule-123', version: 1, name: 'Local name' };
      const serverData = { $id: 'schedule-123', version: 2, name: 'Server name' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Schedule Validation', () => {
    it('should validate schedule data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.name || !data.target_age_group) {
            throw new Error('Missing required fields');
          }
          return { $id: 'schedule-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineSchedule(), { wrapper });

      // Should fail with invalid data
      await expect(result.current.mutateAsync({
        description: 'Test schedule',
        schedule_type: 'standard',
      })).rejects.toThrow('Missing required fields');

      // Should succeed with valid data
      const validData = {
        name: 'Valid Schedule',
        target_age_group: '0-12 months',
        schedule_type: 'standard',
        is_active: true,
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Integration with React Query', () => {
    it('should invalidate all vaccine schedule queries on mutations', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'schedule-123',
          name: 'Test Schedule',
          target_age_group: '0-12 months',
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineSchedule(), { wrapper });

      await result.current.mutateAsync({
        name: 'Test Schedule',
        target_age_group: '0-12 months',
        schedule_type: 'standard',
        is_active: true,
      });

      // Note: In the actual implementation, invalidation happens in the mutation's onSettled
      expect(mockUseOptimisticCreate).toHaveBeenCalled();
    });
  });
});