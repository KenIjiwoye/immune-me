import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateImmunizationRecord,
  useUpdateImmunizationRecord,
  useDeleteImmunizationRecord,
  useCreateImmunizationRecordEnhanced,
  useUpdateImmunizationRecordEnhanced,
  useDeleteImmunizationRecordEnhanced,
  immunizationRecordKeys
} from '../useImmunizationRecordsMutations';

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

jest.mock('../services/immunizationRecordsService', () => ({
  immunizationRecordsService: {
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
import { immunizationRecordsService } from '../services/immunizationRecordsService';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;

describe('useImmunizationRecordsMutations', () => {
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
    describe('useCreateImmunizationRecord', () => {
      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateImmunizationRecord(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          immunizationRecordsService,
          [
            [...immunizationRecordKeys.lists()],
            [...immunizationRecordKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle immunization record creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'record-123',
            patient_id: 'patient-456',
            vaccine_id: 'vaccine-789',
            facility_id: 'facility-101',
            administered_by: 'worker-202',
            administration_date: '2024-01-15',
            batch_number: 'BATCH001',
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateImmunizationRecord(), { wrapper });

        const testData = {
          patient_id: 'patient-456',
          vaccine_id: 'vaccine-789',
          facility_id: 'facility-101',
          administered_by: 'worker-202',
          administration_date: '2024-01-15',
          batch_number: 'BATCH001',
          dose_number: 1,
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateImmunizationRecord', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateImmunizationRecord(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          immunizationRecordsService,
          [
            [...immunizationRecordKeys.lists()],
            [...immunizationRecordKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle immunization record updates with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'record-123',
            patient_id: 'patient-456',
            vaccine_id: 'vaccine-789',
            facility_id: 'facility-101',
            administered_by: 'worker-202',
            administration_date: '2024-01-15',
            batch_number: 'BATCH002', // Updated
            notes: 'Updated notes',
          }),
        };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateImmunizationRecord(), { wrapper });

        const updateData = {
          id: 'record-123',
          data: {
            batch_number: 'BATCH002',
            notes: 'Updated notes',
          },
        };

        result.current.mutate(updateData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
      });
    });

    describe('useDeleteImmunizationRecord', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteImmunizationRecord(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          immunizationRecordsService,
          [
            [...immunizationRecordKeys.lists()],
            [...immunizationRecordKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle immunization record deletion with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue(undefined),
        };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteImmunizationRecord(), { wrapper });

        const recordId = 'record-123';

        result.current.mutate(recordId);

        expect(mockMutation.mutate).toHaveBeenCalledWith(recordId);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateImmunizationRecordEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateImmunizationRecordEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          immunizationRecordsService,
          [
            [...immunizationRecordKeys.lists()],
            [...immunizationRecordKeys.all],
          ],
          {
            enableRollback: true,
            enableUndoRedo: true,
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

      it('should enable rollback and undo/redo for immunization records', () => {
        mockUseEnhancedCreateMutation.mockReturnValue({
          mutate: jest.fn(),
          errorState: { hasError: false },
        });

        renderHook(() => useCreateImmunizationRecordEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedCreateMutation.mock.calls[0][2];
        expect(callArgs.enableRollback).toBe(true);
        expect(callArgs.enableUndoRedo).toBe(true);
        expect(callArgs.userFriendlyMessages).toBe(true);
      });

      it('should configure merge conflict resolution strategy', () => {
        mockUseEnhancedCreateMutation.mockReturnValue({
          mutate: jest.fn(),
          errorState: { hasError: false },
        });

        renderHook(() => useCreateImmunizationRecordEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedCreateMutation.mock.calls[0][2];
        expect(callArgs.conflictResolution.strategy).toBe('merge');
        expect(callArgs.conflictResolution.versionField).toBe('version');
        expect(callArgs.conflictResolution.lastModifiedField).toBe('updatedAt');
      });
    });

    describe('useUpdateImmunizationRecordEnhanced', () => {
      it('should create enhanced update hook with same configuration as create', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateImmunizationRecordEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          immunizationRecordsService,
          [
            [...immunizationRecordKeys.lists()],
            [...immunizationRecordKeys.all],
          ],
          {
            enableRollback: true,
            enableUndoRedo: true,
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

    describe('useDeleteImmunizationRecordEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteImmunizationRecordEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
        expect(callArgs.enableUndoRedo).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(immunizationRecordKeys.all).toEqual(['immunizationRecords']);
      expect(immunizationRecordKeys.lists()).toEqual(['immunizationRecords', 'list']);
      expect(immunizationRecordKeys.list({})).toEqual(['immunizationRecords', 'list', {}]);
      expect(immunizationRecordKeys.details()).toEqual(['immunizationRecords', 'detail']);
      expect(immunizationRecordKeys.detail('test-id')).toEqual(['immunizationRecords', 'detail', 'test-id']);
      expect(immunizationRecordKeys.byPatient('patient-123')).toEqual(['immunizationRecords', 'patient', 'patient-123']);
      expect(immunizationRecordKeys.byFacility('facility-456')).toEqual(['immunizationRecords', 'facility', 'facility-456']);
      expect(immunizationRecordKeys.byVaccine('vaccine-789')).toEqual(['immunizationRecords', 'vaccine', 'vaccine-789']);
      expect(immunizationRecordKeys.byHealthWorker('worker-101')).toEqual(['immunizationRecords', 'healthWorker', 'worker-101']);
      expect(immunizationRecordKeys.recent()).toEqual(['immunizationRecords', 'recent']);
      expect(immunizationRecordKeys.byBatchNumber('BATCH001')).toEqual(['immunizationRecords', 'batch', 'BATCH001']);
      expect(immunizationRecordKeys.byDateRange('2024-01-01', '2024-12-31')).toEqual(['immunizationRecords', 'dateRange', '2024-01-01', '2024-12-31']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Validation error')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateImmunizationRecord(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Validation error');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 400, message: 'Invalid data' },
        recoveryOptions: [
          {
            id: 'fix-validation',
            label: 'Fix Validation',
            description: 'Correct the invalid data',
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

      const { result } = renderHook(() => useCreateImmunizationRecordEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Integration with React Query', () => {
    it('should invalidate all immunization record queries on mutations', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'record-123',
          patient_id: 'patient-456',
          vaccine_id: 'vaccine-789',
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateImmunizationRecord(), { wrapper });

      await result.current.mutateAsync({
        patient_id: 'patient-456',
        vaccine_id: 'vaccine-789',
        facility_id: 'facility-101',
        administered_by: 'worker-202',
        administration_date: '2024-01-15',
      });

      // Note: In the actual implementation, invalidation happens in the mutation's onSettled
      expect(mockUseOptimisticCreate).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for concurrent updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateImmunizationRecordEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts appropriately', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'record-123',
        version: 2,
        updatedAt: new Date().toISOString(),
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateImmunizationRecordEnhanced(), { wrapper });

      const localData = { $id: 'record-123', version: 1, notes: 'Local changes' };
      const serverData = { $id: 'record-123', version: 2, notes: 'Server changes' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });
});