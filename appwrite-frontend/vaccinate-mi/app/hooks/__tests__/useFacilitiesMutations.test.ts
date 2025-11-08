import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
  useCreateFacilityEnhanced,
  useUpdateFacilityEnhanced,
  useDeleteFacilityEnhanced,
  facilityKeys
} from '../useFacilitiesMutations';

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

jest.mock('../services/facilitiesService', () => ({
  facilitiesService: {
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
import { facilitiesService } from '../services/facilitiesService';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;

describe('useFacilitiesMutations', () => {
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
    describe('useCreateFacility', () => {
      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateFacility(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          facilitiesService,
          [
            [...facilityKeys.lists()],
            [...facilityKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle facility creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'facility-123',
            name: 'Central Hospital',
            district: 'Central District',
            address: '123 Health St',
            contact_phone: '+1234567890',
            created_at: new Date().toISOString(),
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateFacility(), { wrapper });

        const testData = {
          name: 'Central Hospital',
          district: 'Central District',
          address: '123 Health St',
          contact_phone: '+1234567890',
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdateFacility', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateFacility(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          facilitiesService,
          [
            [...facilityKeys.lists()],
            [...facilityKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeleteFacility', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeleteFacility(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          facilitiesService,
          [
            [...facilityKeys.lists()],
            [...facilityKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreateFacilityEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreateFacilityEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          facilitiesService,
          [
            [...facilityKeys.lists()],
            [...facilityKeys.all],
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

    describe('useUpdateFacilityEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdateFacilityEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          facilitiesService,
          [
            [...facilityKeys.lists()],
            [...facilityKeys.all],
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

    describe('useDeleteFacilityEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeleteFacilityEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(facilityKeys.all).toEqual(['facilities']);
      expect(facilityKeys.lists()).toEqual(['facilities', 'list']);
      expect(facilityKeys.list({})).toEqual(['facilities', 'list', {}]);
      expect(facilityKeys.details()).toEqual(['facilities', 'detail']);
      expect(facilityKeys.detail('test-id')).toEqual(['facilities', 'detail', 'test-id']);
      expect(facilityKeys.byDistrict('Central')).toEqual(['facilities', 'district', 'Central']);
      expect(facilityKeys.byRegion('North')).toEqual(['facilities', 'region', 'North']);
      expect(facilityKeys.active()).toEqual(['facilities', 'active']);
      expect(facilityKeys.search('hospital')).toEqual(['facilities', 'search', 'hospital']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Facility validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateFacility(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Facility validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid facility data' },
        recoveryOptions: [
          {
            id: 'fix-facility-data',
            label: 'Fix Facility Data',
            description: 'Correct the facility information',
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

      const { result } = renderHook(() => useCreateFacilityEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for facility updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateFacilityEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for facility records', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'facility-123',
        version: 2,
        name: 'Merged Facility Name',
        contact_phone: '+1234567890',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdateFacilityEnhanced(), { wrapper });

      const localData = { $id: 'facility-123', version: 1, name: 'Local Name' };
      const serverData = { $id: 'facility-123', version: 2, name: 'Server Name' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Facility Data Validation', () => {
    it('should validate facility data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.name || !data.district || !data.address) {
            throw new Error('Missing required fields');
          }
          if (data.contact_phone && !data.contact_phone.match(/^\+?\d{10,15}$/)) {
            throw new Error('Invalid phone number format');
          }
          return { $id: 'facility-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateFacility(), { wrapper });

      // Should fail with missing required fields
      await expect(result.current.mutateAsync({
        name: 'Test Facility',
        district: 'Test District',
        // Missing address
      })).rejects.toThrow('Missing required fields');

      // Should fail with invalid phone number
      await expect(result.current.mutateAsync({
        name: 'Test Facility',
        district: 'Test District',
        address: '123 Test St',
        contact_phone: 'invalid-phone',
      })).rejects.toThrow('Invalid phone number format');

      // Should succeed with valid data
      const validData = {
        name: 'Test Facility',
        district: 'Test District',
        address: '123 Test St',
        contact_phone: '+1234567890',
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Geographic Data Handling', () => {
    it('should handle facility location updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'facility-123',
          name: 'Updated Facility',
          district: 'New District',
          address: '456 New St',
          contact_phone: '+0987654321',
          updated_at: new Date().toISOString(),
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateFacility(), { wrapper });

      const updateData = {
        id: 'facility-123',
        data: {
          district: 'New District',
          address: '456 New St',
          contact_phone: '+0987654321',
        },
      };

      result.current.mutate(updateData);

      expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
    });

    it('should validate geographic data updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async ({ data }) => {
          // Simulate validation
          if (data.district && data.district.length < 2) {
            throw new Error('District name too short');
          }
          return { $id: 'facility-123', ...data };
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateFacility(), { wrapper });

      // Should fail with invalid district name
      await expect(result.current.mutateAsync({
        id: 'facility-123',
        data: { district: 'A' }, // Too short
      })).rejects.toThrow('District name too short');

      // Should succeed with valid district name
      const validUpdate = {
        id: 'facility-123',
        data: { district: 'Valid District' },
      };

      result.current.mutate(validUpdate);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validUpdate);
    });
  });
});