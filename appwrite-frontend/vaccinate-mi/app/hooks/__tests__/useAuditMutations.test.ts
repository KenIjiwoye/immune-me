import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the services
jest.mock('@/app/services/optimisticUpdates', () => ({
  useOptimisticCreate: jest.fn(),
  useOptimisticUpdate: jest.fn(),
  useOptimisticDelete: jest.fn(),
}));

jest.mock('@/app/services/mutationErrorHandler', () => ({
  useEnhancedCreateMutation: jest.fn(),
  useEnhancedUpdateMutation: jest.fn(),
  useEnhancedDeleteMutation: jest.fn(),
}));

jest.mock('@/app/services/appwriteDatabase', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('@/app/services/appwrite', () => ({
  COLLECTION_IDS: {
    ACCESS_AUDIT_LOG: 'access-audit-log',
    ROLE_CHANGE_LOG: 'role-change-log',
  },
}));

// Import after mocking
import {
  useCreateAccessAuditLog,
  useUpdateAccessAuditLog,
  useDeleteAccessAuditLog,
  useCreateAuditCollection,
  useUpdateAuditCollection,
  useDeleteAuditCollection,
  useCreateRoleChangeLog,
  useUpdateRoleChangeLog,
  useDeleteRoleChangeLog,
  useCreateAccessAuditLogEnhanced,
  useUpdateAccessAuditLogEnhanced,
  useDeleteAccessAuditLogEnhanced,
  useCreateAuditCollectionEnhanced,
  useUpdateAuditCollectionEnhanced,
  useDeleteAuditCollectionEnhanced,
  useCreateRoleChangeLogEnhanced,
  useUpdateRoleChangeLogEnhanced,
  useDeleteRoleChangeLogEnhanced,
  auditKeys
} from '@/app/hooks/useAuditMutations';

import {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
} from '@/app/services/optimisticUpdates';
import {
  useEnhancedCreateMutation,
  useEnhancedUpdateMutation,
  useEnhancedDeleteMutation,
} from '@/app/services/mutationErrorHandler';

const mockUseOptimisticCreate = useOptimisticCreate as jest.Mock;
const mockUseOptimisticUpdate = useOptimisticUpdate as jest.Mock;
const mockUseOptimisticDelete = useOptimisticDelete as jest.Mock;
const mockUseEnhancedCreateMutation = useEnhancedCreateMutation as jest.Mock;
const mockUseEnhancedUpdateMutation = useEnhancedUpdateMutation as jest.Mock;
const mockUseEnhancedDeleteMutation = useEnhancedDeleteMutation as jest.Mock;

describe('useAuditMutations', () => {
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
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    jest.clearAllMocks();
  });

  describe('Basic Structure', () => {
    it('should have all expected hooks exported', () => {
      expect(typeof useCreateAccessAuditLog).toBe('function');
      expect(typeof useUpdateAccessAuditLog).toBe('function');
      expect(typeof useDeleteAccessAuditLog).toBe('function');
      expect(typeof useCreateAccessAuditLogEnhanced).toBe('function');
      expect(typeof useUpdateAccessAuditLogEnhanced).toBe('function');
      expect(typeof useDeleteAccessAuditLogEnhanced).toBe('function');
    });

    it('should have audit keys defined', () => {
      expect(auditKeys.all).toEqual(['audit']);
      expect(typeof auditKeys.lists).toBe('function');
      expect(typeof auditKeys.accessAudit).toBe('function');
    });
  });

  describe('Legacy Optimistic Mutations', () => {
    it('should call useOptimisticCreate for access audit log', () => {
      const mockMutation = { mutate: jest.fn(), errorState: { hasError: false } };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateAccessAuditLog(), { wrapper });

      expect(mockUseOptimisticCreate).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });

    it('should call useOptimisticUpdate for access audit log', () => {
      const mockMutation = { mutate: jest.fn(), errorState: { hasError: false } };
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateAccessAuditLog(), { wrapper });

      expect(mockUseOptimisticUpdate).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });

    it('should call useOptimisticDelete for access audit log', () => {
      const mockMutation = { mutate: jest.fn(), errorState: { hasError: false } };
      mockUseOptimisticDelete.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useDeleteAccessAuditLog(), { wrapper });

      expect(mockUseOptimisticDelete).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });
  });

  describe('Enhanced Mutations', () => {
    it('should call useEnhancedCreateMutation for enhanced access audit log', () => {
      const mockMutation = { 
        mutate: jest.fn(), 
        errorState: { 
          hasError: false,
          error: null,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        } 
      };
      mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useCreateAccessAuditLogEnhanced(), { wrapper });

      expect(mockUseEnhancedCreateMutation).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });

    it('should call useEnhancedDeleteMutation for enhanced access audit log', () => {
      const mockMutation = { 
        mutate: jest.fn(), 
        errorState: { 
          hasError: false,
          error: null,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        } 
      };
      mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useDeleteAccessAuditLogEnhanced(), { wrapper });

      expect(mockUseEnhancedDeleteMutation).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });

    it('should call useEnhancedUpdateMutation for enhanced access audit log', () => {
      const mockMutation = { 
        mutate: jest.fn(), 
        errorState: { 
          hasError: false,
          error: null,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        } 
      };
      mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useUpdateAccessAuditLogEnhanced(), { wrapper });

      expect(mockUseEnhancedUpdateMutation).toHaveBeenCalled();
      expect(result.current).toBe(mockMutation);
    });
  });

  describe('Audit Collection Operations', () => {
    it('should call appropriate services for audit collection operations', () => {
      const mockMutation = { mutate: jest.fn(), errorState: { hasError: false } };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);
      mockUseOptimisticUpdate.mockReturnValue(mockMutation);
      mockUseOptimisticDelete.mockReturnValue(mockMutation);

      renderHook(() => useCreateAuditCollection(), { wrapper });
      expect(mockUseOptimisticCreate).toHaveBeenCalled();

      renderHook(() => useUpdateAuditCollection(), { wrapper });
      expect(mockUseOptimisticUpdate).toHaveBeenCalled();

      renderHook(() => useDeleteAuditCollection(), { wrapper });
      expect(mockUseOptimisticDelete).toHaveBeenCalled();
    });

    it('should call appropriate enhanced services for audit collection operations', () => {
      const mockMutation = { 
        mutate: jest.fn(), 
        errorState: { 
          hasError: false,
          error: null,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        } 
      };
      mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);
      mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);
      mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

      renderHook(() => useCreateAuditCollectionEnhanced(), { wrapper });
      expect(mockUseEnhancedCreateMutation).toHaveBeenCalled();

      renderHook(() => useUpdateAuditCollectionEnhanced(), { wrapper });
      expect(mockUseEnhancedUpdateMutation).toHaveBeenCalled();

      renderHook(() => useDeleteAuditCollectionEnhanced(), { wrapper });
      expect(mockUseEnhancedDeleteMutation).toHaveBeenCalled();
    });
  });

  describe('Role Change Log Operations', () => {
    it('should call appropriate services for role change log operations', () => {
      const mockMutation = { mutate: jest.fn(), errorState: { hasError: false } };
      mockUseOptimisticCreate.mockReturnValue(mockMutation);

      renderHook(() => useCreateRoleChangeLog(), { wrapper });
      expect(mockUseOptimisticCreate).toHaveBeenCalled();
    });

    it('should call appropriate enhanced services for role change log operations', () => {
      const mockMutation = { 
        mutate: jest.fn(), 
        errorState: { 
          hasError: false,
          error: null,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        } 
      };
      mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);
      mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);
      mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

      renderHook(() => useCreateRoleChangeLogEnhanced(), { wrapper });
      expect(mockUseEnhancedCreateMutation).toHaveBeenCalled();

      renderHook(() => useUpdateRoleChangeLogEnhanced(), { wrapper });
      expect(mockUseEnhancedUpdateMutation).toHaveBeenCalled();

      renderHook(() => useDeleteRoleChangeLogEnhanced(), { wrapper });
      expect(mockUseEnhancedDeleteMutation).toHaveBeenCalled();
    });
  });
});

export {};