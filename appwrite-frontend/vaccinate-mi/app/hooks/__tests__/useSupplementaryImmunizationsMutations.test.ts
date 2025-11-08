import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateSupplementaryImmunization,
  useUpdateSupplementaryImmunization,
  useDeleteSupplementaryImmunization,
  useCreateSupplementaryImmunizationEnhanced,
  useUpdateSupplementaryImmunizationEnhanced,
  useDeleteSupplementaryImmunizationEnhanced,
  supplementaryImmunizationKeys
} from '../useSupplementaryImmunizationsMutations';

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
    SUPPLEMENTARY_IMMUNIZATIONS: 'supplementary-immunizations',
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

describe('useSupplementaryImmunizationsMutations', () => {
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
    describe('useCreateSupplementaryImmunization', () => {
      it('should create DatabaseService instance with correct collection ID', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        renderHook(() => useCreateSupplementaryImmunization(), { wrapper });

        expect(mockDatabaseService).toHaveBeenCalledWith('supplementary-immunizations');
      });

      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateSupplementaryImmunization(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...supplementaryImmunizationKeys.lists()],
            [...supplementaryImmunizationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle supplementary immunization creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'supp-123',
            campaign_name: 'Measles Campaign 2024',
            vaccine_id: 'vaccine-456',
            target_age_group: '9-59 months',
            start_date: '2024-03-01',
            end_date: '2024-03-31',
            facility_id: 'facility-789',
            target_number: 500,
            achieved_number: 0,
            campaign_status: 'planned',
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateSupplementaryImmunization(), { wrapper });

        const testData = {
          campaign_name: 'Measles Campaign 2024',
          vaccine_id: 'vaccine-456',
          target_age_group: '9-59 months',
          start_date: '2024-03-01',
          end_date: '2024-03-31',
          facility_id: 'facility-789',
          target_number: 500,
          achieved_number: 0,
          campaign_status: 'planned',
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateSupplementaryImmunization', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateSupplementaryImmunization(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...supplementaryImmunizationKeys.lists()],
            [...supplementaryImmunizationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteSupplementaryImmunization', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteSupplementaryImmunization(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...supplementaryImmunizationKeys.lists()],
            [...supplementaryImmunizationKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateSupplementaryImmunizationEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateSupplementaryImmunizationEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...supplementaryImmunizationKeys.lists()],
            [...supplementaryImmunizationKeys.all],
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

    describe('useUpdateSupplementaryImmunizationEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateSupplementaryImmunizationEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          expect.any(DatabaseService),
          [
            [...supplementaryImmunizationKeys.lists()],
            [...supplementaryImmunizationKeys.all],
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

    describe('useDeleteSupplementaryImmunizationEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteSupplementaryImmunizationEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(supplementaryImmunizationKeys.all).toEqual(['supplementaryImmunizations']);
      expect(supplementaryImmunizationKeys.lists()).toEqual(['supplementaryImmunizations', 'list']);
      expect(supplementaryImmunizationKeys.list({})).toEqual(['supplementaryImmunizations', 'list', {}]);
      expect(supplementaryImmunizationKeys.details()).toEqual(['supplementaryImmunizations', 'detail']);
      expect(supplementaryImmunizationKeys.detail('test-id')).toEqual(['supplementaryImmunizations', 'detail', 'test-id']);
      expect(supplementaryImmunizationKeys.byFacility('facility-123')).toEqual(['supplementaryImmunizations', 'facility', 'facility-123']);
      expect(supplementaryImmunizationKeys.byVaccine('vaccine-456')).toEqual(['supplementaryImmunizations', 'vaccine', 'vaccine-456']);
      expect(supplementaryImmunizationKeys.byStatus('active')).toEqual(['supplementaryImmunizations', 'status', 'active']);
      expect(supplementaryImmunizationKeys.active()).toEqual(['supplementaryImmunizations', 'active']);
      expect(supplementaryImmunizationKeys.upcoming()).toEqual(['supplementaryImmunizations', 'upcoming']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Campaign validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateSupplementaryImmunization(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Campaign validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid campaign dates' },
        recoveryOptions: [
          {
            id: 'fix-dates',
            label: 'Fix Campaign Dates',
            description: 'Correct the start and end dates',
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

      const { result } = renderHook(() => useCreateSupplementaryImmunizationEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for campaign updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateSupplementaryImmunizationEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for supplementary immunizations', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'supp-123',
        version: 2,
        achieved_number: 250,
        campaign_status: 'in_progress',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateSupplementaryImmunizationEnhanced(), { wrapper });

      const localData = { $id: 'supp-123', version: 1, achieved_number: 200 };
      const serverData = { $id: 'supp-123', version: 2, achieved_number: 250 };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Campaign Validation', () => {
    it('should validate campaign data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.campaign_name || !data.vaccine_id || !data.start_date || !data.end_date) {
            throw new Error('Missing required fields');
          }
          const startDate = new Date(data.start_date);
          const endDate = new Date(data.end_date);
          if (startDate >= endDate) {
            throw new Error('Invalid date range');
          }
          return { $id: 'supp-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateSupplementaryImmunization(), { wrapper });

      // Should fail with invalid data
      await expect(result.current.mutateAsync({
        vaccine_id: 'vaccine-456',
        start_date: '2024-03-01',
        end_date: '2024-02-01', // Invalid: start after end
      })).rejects.toThrow('Invalid date range');

      // Should succeed with valid data
      const validData = {
        campaign_name: 'Valid Campaign',
        vaccine_id: 'vaccine-456',
        target_age_group: '9-59 months',
        start_date: '2024-03-01',
        end_date: '2024-03-31',
        facility_id: 'facility-789',
        target_number: 500,
        achieved_number: 0,
        campaign_status: 'planned',
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Progress Tracking', () => {
    it('should handle progress updates during campaigns', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'supp-123',
          achieved_number: 150,
          campaign_status: 'in_progress',
          updated_at: new Date().toISOString(),
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateSupplementaryImmunization(), { wrapper });

      const updateData = {
        id: 'supp-123',
        data: {
          achieved_number: 150,
          campaign_status: 'in_progress',
        },
      };

      result.current.mutate(updateData);

      expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
    });

    it('should validate progress updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async ({ data }) => {
          // Simulate validation
          if (data.achieved_number < 0) {
            throw new Error('Invalid achieved number');
          }
          if (data.target_number && data.achieved_number > data.target_number) {
            throw new Error('Achieved number cannot exceed target');
          }
          return { $id: 'supp-123', ...data };
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateSupplementaryImmunization(), { wrapper });

      // Should fail with invalid progress
      await expect(result.current.mutateAsync({
        id: 'supp-123',
        data: { achieved_number: -10 },
      })).rejects.toThrow('Invalid achieved number');

      // Should succeed with valid progress
      const validUpdate = {
        id: 'supp-123',
        data: { achieved_number: 150, target_number: 500 },
      };

      result.current.mutate(validUpdate);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validUpdate);
    });
  });
});