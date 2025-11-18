import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateVaccine,
  useUpdateVaccine,
  useDeleteVaccine,
  useCreateVaccineEnhanced,
  useUpdateVaccineEnhanced,
  useDeleteVaccineEnhanced,
  vaccineKeys
} from '../useVaccinesMutations';

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

jest.mock('../services/vaccinesService', () => ({
  vaccinesService: {
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
import { vaccinesService } from '../services/vaccinesService';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;

describe('useVaccinesMutations', () => {
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
    describe('useCreateVaccine', () => {
      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccine(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          vaccinesService,
          [
            [...vaccineKeys.lists()],
            [...vaccineKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle vaccine creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'vaccine-123',
            name: 'BCG Vaccine',
            disease_targeted: 'Tuberculosis',
            manufacturer: 'Serum Institute',
            dosage_info: '0.05 ml',
            age_group: '0-1 month',
            is_active: true,
            created_at: new Date().toISOString(),
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccine(), { wrapper });

        const testData = {
          name: 'BCG Vaccine',
          disease_targeted: 'Tuberculosis',
          manufacturer: 'Serum Institute',
          dosage_info: '0.05 ml',
          age_group: '0-1 month',
          is_active: true,
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateVaccine', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccine(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          vaccinesService,
          [
            [...vaccineKeys.lists()],
            [...vaccineKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteVaccine', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteVaccine(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          vaccinesService,
          [
            [...vaccineKeys.lists()],
            [...vaccineKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateVaccineEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateVaccineEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          vaccinesService,
          [
            [...vaccineKeys.lists()],
            [...vaccineKeys.all],
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

    describe('useUpdateVaccineEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateVaccineEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          vaccinesService,
          [
            [...vaccineKeys.lists()],
            [...vaccineKeys.all],
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

    describe('useDeleteVaccineEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteVaccineEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(vaccineKeys.all).toEqual(['vaccines']);
      expect(vaccineKeys.lists()).toEqual(['vaccines', 'list']);
      expect(vaccineKeys.list({})).toEqual(['vaccines', 'list', {}]);
      expect(vaccineKeys.details()).toEqual(['vaccines', 'detail']);
      expect(vaccineKeys.detail('test-id')).toEqual(['vaccines', 'detail', 'test-id']);
      expect(vaccineKeys.active()).toEqual(['vaccines', 'active']);
      expect(vaccineKeys.byDisease('measles')).toEqual(['vaccines', 'disease', 'measles']);
      expect(vaccineKeys.byAgeGroup('0-12 months')).toEqual(['vaccines', 'ageGroup', '0-12 months']);
      expect(vaccineKeys.byManufacturer('pfizer')).toEqual(['vaccines', 'manufacturer', 'pfizer']);
      expect(vaccineKeys.requiringRefrigeration()).toEqual(['vaccines', 'refrigeration']);
      expect(vaccineKeys.byScheduleType('standard')).toEqual(['vaccines', 'scheduleType', 'standard']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Vaccine validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccine(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Vaccine validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid vaccine data' },
        recoveryOptions: [
          {
            id: 'fix-vaccine-data',
            label: 'Fix Vaccine Data',
            description: 'Correct the vaccine information',
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

      const { result } = renderHook(() => useCreateVaccineEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for vaccine updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateVaccineEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for vaccine records', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'vaccine-123',
        version: 2,
        name: 'Merged Vaccine Name',
        manufacturer: 'Updated Manufacturer',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateVaccineEnhanced(), { wrapper });

      const localData = { $id: 'vaccine-123', version: 1, name: 'Local Name' };
      const serverData = { $id: 'vaccine-123', version: 2, name: 'Server Name' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Vaccine Data Validation', () => {
    it('should validate vaccine data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.name || !data.disease_targeted) {
            throw new Error('Missing required fields');
          }
          return { $id: 'vaccine-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateVaccine(), { wrapper });

      // Should fail with missing required fields
      await expect(result.current.mutateAsync({
        manufacturer: 'Test Manufacturer',
        age_group: '0-12 months',
      })).rejects.toThrow('Missing required fields');

      // Should succeed with valid data
      const validData = {
        name: 'Test Vaccine',
        disease_targeted: 'Test Disease',
        manufacturer: 'Test Manufacturer',
        age_group: '0-12 months',
        is_active: true,
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Vaccine Status Management', () => {
    it('should handle vaccine activation/deactivation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'vaccine-123',
          name: 'Test Vaccine',
          is_active: false,
          updated_at: new Date().toISOString(),
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateVaccine(), { wrapper });

      const updateData = {
        id: 'vaccine-123',
        data: { is_active: false },
      };

      result.current.mutate(updateData);

      expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
    });

    it('should validate vaccine status changes', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async ({ data }) => {
          // Simulate validation - can't deactivate critical vaccines
          if (data.is_active === false && data.disease_targeted === 'Polio') {
            throw new Error('Cannot deactivate critical vaccines');
          }
          return { $id: 'vaccine-123', ...data };
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateVaccine(), { wrapper });

      // Should fail with critical vaccine deactivation
      await expect(result.current.mutateAsync({
        id: 'vaccine-123',
        data: { is_active: false, disease_targeted: 'Polio' },
      })).rejects.toThrow('Cannot deactivate critical vaccines');

      // Should succeed with non-critical vaccine
      const validUpdate = {
        id: 'vaccine-123',
        data: { is_active: false, disease_targeted: 'Optional Disease' },
      };

      result.current.mutate(validUpdate);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validUpdate);
    });
  });

  describe('Storage Requirements', () => {
    it('should handle vaccine storage requirement updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'vaccine-123',
          name: 'Test Vaccine',
          storage_requirements: '2-8°C refrigerator',
          updated_at: new Date().toISOString(),
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateVaccine(), { wrapper });

      const updateData = {
        id: 'vaccine-123',
        data: { storage_requirements: '2-8°C refrigerator' },
      };

      result.current.mutate(updateData);

      expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
    });

    it('should validate storage requirement changes', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async ({ data }) => {
          // Simulate validation
          if (data.storage_requirements && data.storage_requirements.length < 5) {
            throw new Error('Storage requirements too brief');
          }
          return { $id: 'vaccine-123', ...data };
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateVaccine(), { wrapper });

      // Should fail with too brief storage requirements
      await expect(result.current.mutateAsync({
        id: 'vaccine-123',
        data: { storage_requirements: 'Cold' },
      })).rejects.toThrow('Storage requirements too brief');

      // Should succeed with detailed requirements
      const validUpdate = {
        id: 'vaccine-123',
        data: { storage_requirements: 'Store between 2-8°C in refrigerator' },
      };

      result.current.mutate(validUpdate);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validUpdate);
    });
  });
});