import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useCreateAdminProfile,
  useUpdateAdminProfile,
  useDeleteAdminProfile,
  useCreateEmployeeProfile,
  useUpdateEmployeeProfile,
  useDeleteEmployeeProfile,
  useCreatePatientProfile,
  useUpdatePatientProfile,
  useDeletePatientProfile,
  useCreateAdminProfileEnhanced,
  useUpdateAdminProfileEnhanced,
  useDeleteAdminProfileEnhanced,
  useCreateEmployeeProfileEnhanced,
  useUpdateEmployeeProfileEnhanced,
  useDeleteEmployeeProfileEnhanced,
  useCreatePatientProfileEnhanced,
  useUpdatePatientProfileEnhanced,
  useDeletePatientProfileEnhanced,
  profileKeys
} from '../useProfilesMutations';

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

jest.mock('../services/adminProfilesService', () => ({
  adminProfilesService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../services/employeeProfilesService', () => ({
  employeeProfilesService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../services/profileService', () => ({
  profileService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
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
    PATIENT_PROFILES: 'patient-profiles',
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
import { adminProfilesService } from '../services/adminProfilesService';
import { employeeProfilesService } from '../services/employeeProfilesService';
import { DatabaseService } from '../services/appwriteDatabase';

const mockUseOptimisticCreate = useOptimisticCreate as jest.MockedFunction<typeof useOptimisticCreate>;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.MockedFunction<typeof useOptimisticUpdate>;
const mockUseOptimisticDelete = useOptimisticDelete as jest.MockedFunction<typeof useOptimisticDelete>;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.MockedFunction<typeof useEnhancedCreateMutation>;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.MockedFunction<typeof useEnhancedUpdateMutation>;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.MockedFunction<typeof useEnhancedDeleteMutation>;
const mockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;

describe('useProfilesMutations', () => {
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
    describe('Admin Profile Mutations', () => {
      describe('useCreateAdminProfile', () => {
        it('should create optimistic create hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreateAdminProfile(), { wrapper });

          expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
            adminProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.admin()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });

        it('should handle admin profile creation with optimistic updates', async () => {
          const mockMutation = {
            mutate: jest.fn(),
            mutateAsync: jest.fn().mockResolvedValue({
              $id: 'admin-123',
              user_id: 'user-456',
              admin_level: 'super_admin',
              system_permissions: ['read', 'write'],
            }),
          };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreateAdminProfile(), { wrapper });

          const testData = {
            user_id: 'user-456',
            admin_level: 'super_admin',
            system_permissions: ['read', 'write'],
            facility_access_scope: 'all',
            can_manage_users: true,
          };

          result.current.mutate(testData);

          expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
        });
      });

      describe('useUpdateAdminProfile', () => {
        it('should create optimistic update hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticUpdate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useUpdateAdminProfile(), { wrapper });

          expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
            adminProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.admin()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });

      describe('useDeleteAdminProfile', () => {
        it('should create optimistic delete hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticDelete.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useDeleteAdminProfile(), { wrapper });

          expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
            adminProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.admin()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });
    });

    describe('Employee Profile Mutations', () => {
      describe('useCreateEmployeeProfile', () => {
        it('should create optimistic create hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreateEmployeeProfile(), { wrapper });

          expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
            employeeProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.employee()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });

        it('should handle employee profile creation with optimistic updates', async () => {
          const mockMutation = {
            mutate: jest.fn(),
            mutateAsync: jest.fn().mockResolvedValue({
              $id: 'employee-123',
              user_id: 'user-456',
              employee_id: 'EMP001',
              employee_type: 'nurse',
              professional_title: 'Registered Nurse',
            }),
          };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreateEmployeeProfile(), { wrapper });

          const testData = {
            user_id: 'user-456',
            employee_id: 'EMP001',
            employee_type: 'nurse',
            professional_title: 'Registered Nurse',
            primary_facility_id: 'facility-789',
            employment_status: 'active',
          };

          result.current.mutate(testData);

          expect(mockMutation.mutate).toHaveBeenCalledWith(testData);
        });
      });

      describe('useUpdateEmployeeProfile', () => {
        it('should create optimistic update hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticUpdate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useUpdateEmployeeProfile(), { wrapper });

          expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
            employeeProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.employee()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });

      describe('useDeleteEmployeeProfile', () => {
        it('should create optimistic delete hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticDelete.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useDeleteEmployeeProfile(), { wrapper });

          expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
            employeeProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.employee()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });
    });

    describe('Patient Profile Mutations', () => {
      describe('useCreatePatientProfile', () => {
        it('should create DatabaseService instance with correct collection ID', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          renderHook(() => useCreatePatientProfile(), { wrapper });

          expect(mockDatabaseService).toHaveBeenCalledWith('patient-profiles');
        });

        it('should create optimistic create hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticCreate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreatePatientProfile(), { wrapper });

          expect(mockUseOptimisticCreate).toHaveBeenCalledWith(
            expect.any(DatabaseService),
            [
              [...profileKeys.lists()],
              [...profileKeys.patient()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });

      describe('useUpdatePatientProfile', () => {
        it('should create optimistic update hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticUpdate.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useUpdatePatientProfile(), { wrapper });

          expect(mockUseOptimisticUpdate).toHaveBeenCalledWith(
            expect.any(DatabaseService),
            [
              [...profileKeys.lists()],
              [...profileKeys.patient()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });

      describe('useDeletePatientProfile', () => {
        it('should create optimistic delete hook with correct parameters', () => {
          const mockMutation = { mutate: jest.fn() };
          mockUseOptimisticDelete.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useDeletePatientProfile(), { wrapper });

          expect(mockUseOptimisticDelete).toHaveBeenCalledWith(
            expect.any(DatabaseService),
            [
              [...profileKeys.lists()],
              [...profileKeys.patient()],
            ]
          );
          expect(result.current).toBe(mockMutation);
        });
      });
    });
  });

  describe('Enhanced Mutations', () => {
    describe('Admin Profile Enhanced Mutations', () => {
      describe('useCreateAdminProfileEnhanced', () => {
        it('should create enhanced create hook with comprehensive options', () => {
          const mockMutation = {
            mutate: jest.fn(),
            errorState: { hasError: false },
          };
          mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useCreateAdminProfileEnhanced(), { wrapper });

          expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
            adminProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.admin()],
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

      describe('useUpdateAdminProfileEnhanced', () => {
        it('should create enhanced update hook with same configuration', () => {
          const mockMutation = {
            mutate: jest.fn(),
            errorState: { hasError: false },
          };
          mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

          const { result } = renderHook(() => useUpdateAdminProfileEnhanced(), { wrapper });

          expect(mockUseEnhancedUpdateMutation).toHaveBeenCalledWith(
            adminProfilesService,
            [
              [...profileKeys.lists()],
              [...profileKeys.admin()],
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

      describe('useDeleteAdminProfileEnhanced', () => {
        it('should create enhanced delete hook with reduced retry configuration', () => {
          const mockMutation = {
            mutate: jest.fn(),
            errorState: { hasError: false },
          };
          mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

          renderHook(() => useDeleteAdminProfileEnhanced(), { wrapper });

          const callArgs = mockUseEnhancedDeleteMutation.mock.calls[0][2];
          expect(callArgs.retryConfig.maxRetries).toBe(2);
          expect(callArgs.retryConfig.maxDelay).toBe(3000);
          expect(callArgs.enableRollback).toBe(true);
        });
      });
    });

    describe('Employee Profile Enhanced Mutations', () => {
      it('should create enhanced employee profile hooks with correct service', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        renderHook(() => useCreateEmployeeProfileEnhanced(), { wrapper });

        expect(mockUseEnhancedCreateMutation).toHaveBeenCalledWith(
          employeeProfilesService,
          expect.any(Array),
          expect.any(Object)
        );
      });
    });

    describe('Patient Profile Enhanced Mutations', () => {
      it('should create DatabaseService instance for patient profiles', () => {
        const mockMutation = {
          mutate: jest.fn(),
          errorState: { hasError: false },
        };
        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        renderHook(() => useCreatePatientProfileEnhanced(), { wrapper });

        expect(mockDatabaseService).toHaveBeenCalledWith('patient-profiles');
      });
    });
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(profileKeys.all).toEqual(['profiles']);
      expect(profileKeys.lists()).toEqual(['profiles', 'list']);
      expect(profileKeys.list({})).toEqual(['profiles', 'list', {}]);
      expect(profileKeys.details()).toEqual(['profiles', 'detail']);
      expect(profileKeys.detail('test-id')).toEqual(['profiles', 'detail', 'test-id']);
      expect(profileKeys.byUser('user-123')).toEqual(['profiles', 'user', 'user-123']);
      expect(profileKeys.byFacility('facility-456')).toEqual(['profiles', 'facility', 'facility-456']);
      expect(profileKeys.admin()).toEqual(['profiles', 'admin']);
      expect(profileKeys.employee()).toEqual(['profiles', 'employee']);
      expect(profileKeys.patient()).toEqual(['profiles', 'patient']);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimistic update errors gracefully', async () => {
      const mockMutation = {
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockRejectedValue(new Error('Permission denied')),
      };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateAdminProfile(), { wrapper });

      await expect(result.current.mutateAsync({})).rejects.toThrow('Permission denied');
    });

    it('should handle enhanced mutation errors with error state', () => {
      const mockErrorState = {
        hasError: true,
        error: { code: 403, message: 'Insufficient permissions' },
        recoveryOptions: [
          {
            id: 'request-permission',
            label: 'Request Permission',
            description: 'Contact administrator for access',
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

      const { result } = renderHook(() => useCreateAdminProfileEnhanced(), { wrapper });

      expect(result.current.errorState).toEqual(mockErrorState);
    });
  });

  describe('Conflict Resolution', () => {
    it('should configure merge strategy for profile updates', () => {
      mockUseEnhancedUpdateMutation.mockReturnValue({
        mutate: jest.fn(),
        errorState: { hasError: false },
        resolveConflict: jest.fn(),
        hasVersionConflict: jest.fn(),
      });

      const { result } = renderHook(() => useUpdateAdminProfileEnhanced(), { wrapper });

      expect(result.current.resolveConflict).toBeDefined();
      expect(result.current.hasVersionConflict).toBeDefined();
    });
  });
});