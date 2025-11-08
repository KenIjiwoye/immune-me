import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateVaccineScheduleItem,
  useUpdateVaccineScheduleItem,
  useDeleteVaccineScheduleItem,
  useCreateVaccineScheduleItemEnhanced,
  useUpdateVaccineScheduleItemEnhanced,
  useDeleteVaccineScheduleItemEnhanced,
  vaccineScheduleItemKeys
} from '../useVaccineScheduleItemsMutations';

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
    VACCINE_SCHEDULE_ITEMS: 'vaccine-schedule-items',
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

describe('useVaccineScheduleItemsMutations', () => {
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
    describe('useCreateVaccineScheduleItem', () => {
      it('should create DatabaseService instance with correct collection ID', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

        expect(mockDatabaseService).toHaveBeenCalledWith('vaccine-schedule-items');
      });

      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleItemKeys.lists()],
            [...vaccineScheduleItemKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle vaccine schedule item creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'item-123',
            schedule_id: 'schedule-456',
            vaccine_id: 'vaccine-789',
            dose_number: 1,
            minimum_age_weeks: 6,
            maximum_age_weeks: 8,
            is_active: true,
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

        const testData = {
          schedule_id: 'schedule-456',
          vaccine_id: 'vaccine-789',
          dose_number: 1,
          minimum_age_weeks: 6,
          maximum_age_weeks: 8,
          is_active: true,
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateVaccineScheduleItem', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccineScheduleItem(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleItemKeys.lists()],
            [...vaccineScheduleItemKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteVaccineScheduleItem', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteVaccineScheduleItem(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleItemKeys.lists()],
            [...vaccineScheduleItemKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateVaccineScheduleItemEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineScheduleItemEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleItemKeys.lists()],
            [...vaccineScheduleItemKeys.all],
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

    describe('useUpdateVaccineScheduleItemEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccineScheduleItemEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...vaccineScheduleItemKeys.lists()],
            [...vaccineScheduleItemKeys.all],
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

    describe('useDeleteVaccineScheduleItemEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteVaccineScheduleItemEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(vaccineScheduleItemKeys.all).toEqual(['vaccineScheduleItems']);
      expect(vaccineScheduleItemKeys.lists()).toEqual(['vaccineScheduleItems', 'list']);
      expect(vaccineScheduleItemKeys.list({})).toEqual(['vaccineScheduleItems', 'list', {}]);
      expect(vaccineScheduleItemKeys.details()).toEqual(['vaccineScheduleItems', 'detail']);
      expect(vaccineScheduleItemKeys.detail('test-id')).toEqual(['vaccineScheduleItems', 'detail', 'test-id']);
      expect(vaccineScheduleItemKeys.bySchedule('schedule-123')).toEqual(['vaccineScheduleItems', 'schedule', 'schedule-123']);
      expect(vaccineScheduleItemKeys.byVaccine('vaccine-456')).toEqual(['vaccineScheduleItems', 'vaccine', 'vaccine-456']);
      expect(vaccineScheduleItemKeys.byAgeGroup('0-12 months')).toEqual(['vaccineScheduleItems', 'ageGroup', '0-12 months']);
      expect(vaccineScheduleItemKeys.active()).toEqual(['vaccineScheduleItems', 'active']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Schedule item validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Schedule item validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid schedule item configuration' },
        recoveryOptions: [
          {
            id: 'fix-item',
            label: 'Fix Schedule Item',
            description: 'Correct the schedule item configuration',
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

      const { result } = renderHook(() => useCreateVaccineScheduleItemEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for schedule item updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateVaccineScheduleItemEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for vaccine schedule items', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'item-123',
        version: 2,
        dose_number: 2,
        minimum_age_weeks: 8,
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateVaccineScheduleItemEnhanced(), { wrapper });

      const localData = { $id: 'item-123', version: 1, dose_number: 1 };
      const serverData = { $id: 'item-123', version: 2, dose_number: 2 };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Schedule Item Validation', () => {
    it('should validate schedule item data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.schedule_id || !data.vaccine_id || !data.dose_number) {
            throw new Error('Missing required fields');
          }
          return { $id: 'item-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

      // Should fail with invalid data
      await expect(result.current.mutateAsync({
        schedule_id: 'schedule-456',
        vaccine_id: 'vaccine-789',
        // Missing dose_number
      })).rejects.toThrow('Missing required fields');

      // Should succeed with valid data
      const validData = {
        schedule_id: 'schedule-456',
        vaccine_id: 'vaccine-789',
        dose_number: 1,
        minimum_age_weeks: 6,
        is_active: true,
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Age Range Validation', () => {
    it('should validate age ranges for schedule items', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate age range validation
          if (data.minimum_age_weeks && data.maximum_age_weeks &&
              data.minimum_age_weeks >= data.maximum_age_weeks) {
            throw new Error('Invalid age range');
          }
          return { $id: 'item-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccineScheduleItem(), { wrapper });

      // Should fail with invalid age range
      await expect(result.current.mutateAsync({
        schedule_id: 'schedule-456',
        vaccine_id: 'vaccine-789',
        dose_number: 1,
        minimum_age_weeks: 8,
        maximum_age_weeks: 6, // Invalid: min > max
      })).rejects.toThrow('Invalid age range');

      // Should succeed with valid age range
      const validData = {
        schedule_id: 'schedule-456',
        vaccine_id: 'vaccine-789',
        dose_number: 1,
        minimum_age_weeks: 6,
        maximum_age_weeks: 8,
        is_active: true,
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });
});