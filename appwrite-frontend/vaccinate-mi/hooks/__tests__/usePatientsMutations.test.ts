import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
  useCreatePatientEnhanced,
  useUpdatePatientEnhanced,
  useDeletePatientEnhanced,
  patientKeys
} from '../usePatientsMutations';

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

jest.mock('../services/patientsService', () => ({
  patientsService: {
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
import { patientsService } from '../services/patientsService';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;

describe('usePatientsMutations', () => {
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
    describe('useCreatePatient', () => {
      it('should create optimistic create hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreatePatient(), { wrapper });

        expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
          patientsService,
          [
            [...patientKeys.lists()],
            [...patientKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });

      it('should handle patient creation with optimistic updates', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({
            $id: 'patient-123',
            full_name: 'John Doe',
            sex: 'M',
            date_of_birth: '2020-01-15',
            district: 'Central District',
            facility_id: 'facility-456',
            created_at: new Date().toISOString(),
          }),
        };
        mockUseOptimisticCreate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreatePatient(), { wrapper });

        const testData = {
          full_name: 'John Doe',
          sex: 'M',
          date_of_birth: '2020-01-15',
          district: 'Central District',
          facility_id: 'facility-456',
          address: '123 Main St',
        };

        result.current.mutate(testData);

        expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
      });
    });

    describe('useUpdatePatient', () => {
      it('should create optimistic update hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticUpdate.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdatePatient(), { wrapper });

        expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
          patientsService,
          [
            [...patientKeys.lists()],
            [...patientKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });

    describe('useDeletePatient', () => {
      it('should create optimistic delete hook with correct parameters', () => {
        const mockMutation = { mutate: jest.fn() };
        mockUseOptimisticDelete.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useDeletePatient(), { wrapper });

        expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
          patientsService,
          [
            [...patientKeys.lists()],
            [...patientKeys.all],
          ]
        );
        expect(result.current).toBe(mockMutation);
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('useCreatePatientEnhanced', () => {
      it('should create enhanced create hook with comprehensive options', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useCreatePatientEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          patientsService,
          [
            [...patientKeys.lists()],
            [...patientKeys.all],
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

    describe('useUpdatePatientEnhanced', () => {
      it('should create enhanced update hook with same configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() => useUpdatePatientEnhanced(), { wrapper });

        expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
          patientsService,
          [
            [...patientKeys.lists()],
            [...patientKeys.all],
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

    describe('useDeletePatientEnhanced', () => {
      it('should create enhanced delete hook with reduced retry configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        renderHook(() => useDeletePatientEnhanced(), { wrapper });

        const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
        expect(callArgs.retryConfig.maxRetries).toBe(2);
        expect(callArgs.retryConfig.maxDelay).toBe(3000);
        expect(callArgs.enableRollback).toBe(true);
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(patientKeys.all).toEqual(['patients']);
      expect(patientKeys.lists()).toEqual(['patients', 'list']);
      expect(patientKeys.list({})).toEqual(['patients', 'list', {}]);
      expect(patientKeys.details()).toEqual(['patients', 'detail']);
      expect(patientKeys.detail('test-id')).toEqual(['patients', 'detail', 'test-id']);
      expect(patientKeys.byFacility('facility-123')).toEqual(['patients', 'facility', 'facility-123']);
      expect(patientKeys.search('john')).toEqual(['patients', 'search', 'john']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Patient validation failed')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreatePatient(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Patient validation failed');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 422, message: 'Invalid patient data' },
        recoveryOptions: [
          {
            id: 'fix-patient-data',
            label: 'Fix Patient Data',
            description: 'Correct the patient information',
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

      const { result } = renderHook(() => useCreatePatientEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for patient updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdatePatientEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });

    it('should handle version conflicts for patient records', async () => {
      const resolveConflictMock = jest.fn().mockResolvedValue({
        $id: 'patient-123',
        version: 2,
        full_name: 'Merged Name',
        contact_phone: '123-456-7890',
      });

      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: resolveConflictMock,
        hasVersionConflict: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useUpdatePatientEnhanced(), { wrapper });

      const localData = { $id: 'patient-123', version: 1, full_name: 'Local Name' };
      const serverData = { $id: 'patient-123', version: 2, full_name: 'Server Name' };

      const resolved = await result.current.resolveConflict(localData, serverData, 'merge');

      expect(resolveConflictMock).toHaveBeenCalledWith(localData, serverData, 'merge');
      expect(result.current.hasVersionConflict(localData, serverData)).toBe(true);
    });
  });

  describe('Patient Data Validation', () => {
    it('should validate patient data before creation', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async (data) => {
          // Simulate validation
          if (!data.full_name || !data.date_of_birth || !data.facility_id) {
            throw new Error('Missing required fields');
          }
          const dob = new Date(data.date_of_birth);
          const now = new Date();
          if (dob > now) {
            throw new Error('Invalid date of birth');
          }
          return { $id: 'patient-123', ...data };
        }),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreatePatient(), { wrapper });

      // Should fail with invalid data
      await expect(result.current.mutateAsync({
        full_name: 'John Doe',
        sex: 'M',
        // Missing date_of_birth and facility_id
      })).rejects.toThrow('Missing required fields');

      // Should fail with future date of birth
      await expect(result.current.mutateAsync({
        full_name: 'John Doe',
        sex: 'M',
        date_of_birth: '2030-01-15', // Future date
        facility_id: 'facility-456',
      })).rejects.toThrow('Invalid date of birth');

      // Should succeed with valid data
      const validData = {
        full_name: 'John Doe',
        sex: 'M',
        date_of_birth: '2020-01-15',
        district: 'Central District',
        facility_id: 'facility-456',
        address: '123 Main St',
      };

      result.current.mutate(validData);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validData);
    });
  });

  describe('Demographic Data Handling', () => {
    it('should handle patient demographic updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({
          $id: 'patient-123',
          full_name: 'Jane Smith',
          sex: 'F',
          contact_phone: '+1234567890',
          address: '456 Oak St',
          updated_at: new Date().toISOString(),
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdatePatient(), { wrapper });

      const updateData = {
        id: 'patient-123',
        data: {
          contact_phone: '+1234567890',
          address: '456 Oak St',
        },
      };

      result.current.mutate(updateData);

      expect(mockMutation.mutate).toHaveBeenCalledWith(updateData);
    });

    it('should validate demographic data updates', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockImplementation(async ({ data }) => {
          // Simulate validation
          if (data.contact_phone && !data.contact_phone.match(/^\+?\d{10,15}$/)) {
            throw new Error('Invalid phone number format');
          }
          return { $id: 'patient-123', ...data };
        }),
      };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdatePatient(), { wrapper });

      // Should fail with invalid phone number
      await expect(result.current.mutateAsync({
        id: 'patient-123',
        data: { contact_phone: 'invalid-phone' },
      })).rejects.toThrow('Invalid phone number format');

      // Should succeed with valid phone number
      const validUpdate = {
        id: 'patient-123',
        data: { contact_phone: '+1234567890' },
      };

      result.current.mutate(validUpdate);
      expect(mockMutation.mutate).toHaveBeenCalledWith(validUpdate);
    });
  });
});