import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  MutationErrorHandler,
  useEnhancedCreateMutation,
  useEnhancedUpdateMutation,
  useEnhancedDeleteMutation,
  createRollbackOperation,
  formatErrorWithRecovery
} from '../mutationErrorHandler';

// Mock the services
jest.mock('../optimisticUpdates', () => ({
  ConflictResolver: jest.fn(),
  DataRecovery: jest.fn(),
  ValidationErrorHandler: jest.fn(),
}));

jest.mock('../undoRedoManager', () => ({
  undoRedoManager: {
    execute: jest.fn(),
  },
}));

jest.mock('../appwriteDatabase', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  })),
}));

jest.mock('../utils/appwriteErrors', () => ({
  logAppwriteError: jest.fn(),
  withRetry: jest.fn(),
  classifyError: jest.fn(),
  getUserFriendlyMessage: jest.fn(),
  ErrorCategory: {
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    VALIDATION: 'validation',
  },
  DEFAULT_RETRY_CONFIG: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
  },
}));

import {
  ConflictResolver,
  DataRecovery,
  ValidationErrorHandler,
} from '../optimisticUpdates';
import { undoRedoManager } from '../undoRedoManager';
import { DatabaseService } from '../appwriteDatabase';
import {
  logAppwriteError,
  withRetry,
  classifyError,
  getUserFriendlyMessage,
  ErrorCategory,
} from '../utils/appwriteErrors';

const mockConflictResolver = ConflictResolver as jest.MockedClass<typeof ConflictResolver>;
const mockDataRecovery = DataRecovery as jest.MockedClass<typeof DataRecovery>;
const mockValidationErrorHandler = ValidationErrorHandler as jest.MockedClass<typeof ValidationErrorHandler>;
const mockUndoRedoManager = undoRedoManager as jest.Mocked<typeof undoRedoManager>;
const mockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockLogAppwriteError = logAppwriteError as jest.MockedFunction<typeof logAppwriteError>;
const mockWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;
const mockClassifyError = classifyError as jest.MockedFunction<typeof classifyError>;
const mockGetUserFriendlyMessage = getUserFriendlyMessage as jest.MockedFunction<typeof getUserFriendlyMessage>;

describe('MutationErrorHandler', () => {
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

  describe('MutationErrorHandler Class', () => {
    let errorHandler: MutationErrorHandler<any>;
    let mockService: any;

    beforeEach(() => {
      mockService = {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
      };

      mockConflictResolver.mockClear();
      mockDataRecovery.mockClear();

      errorHandler = new MutationErrorHandler(mockService, {
        enableRollback: true,
        retryConfig: { maxRetries: 3, baseDelay: 1000 },
        conflictResolution: { strategy: 'merge' },
        userFriendlyMessages: true,
      });
    });

    describe('executeWithErrorHandling', () => {
      it('should execute operation successfully', async () => {
        const operation = jest.fn().mockResolvedValue({ $id: 'test-1' });
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        const result = await errorHandler.executeWithErrorHandling(operation, context);

        expect(operation).toHaveBeenCalled();
        expect(result).toEqual({ $id: 'test-1' });
      });

      it('should handle errors with retry logic', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Network error'));
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockWithRetry.mockResolvedValue({ $id: 'test-1' });

        const result = await errorHandler.executeWithErrorHandling(operation, context);

        expect(mockWithRetry).toHaveBeenCalledWith(
          operation,
          { maxRetries: 3, baseDelay: 1000 },
          'create-TestService'
        );
        expect(result).toEqual({ $id: 'test-1' });
      });

      it('should perform rollback on error when enabled', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        const rollbackOperation = {
          type: 'create' as const,
          service: mockService,
          documentId: 'test-1',
        };

        errorHandler = new MutationErrorHandler(mockService, {
          enableRollback: true,
          rollbackOperations: [rollbackOperation],
        });

        mockService.delete = jest.fn().mockResolvedValue(undefined);

        await expect(errorHandler.executeWithErrorHandling(operation, context)).rejects.toThrow('Operation failed');

        expect(mockService.delete).toHaveBeenCalledWith('test-1');
      });

      it('should log errors appropriately', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Test error'));
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          documentId: 'test-1',
          userId: 'user-123',
          timestamp: new Date().toISOString(),
          attemptNumber: 1,
        };

        mockClassifyError.mockReturnValue(ErrorCategory.NETWORK);

        await expect(errorHandler.executeWithErrorHandling(operation, context)).rejects.toThrow('Test error');

        expect(mockLogAppwriteError).toHaveBeenCalledWith(
          expect.any(Object),
          'create-TestService',
          {
            documentId: 'test-1',
            userId: 'user-123',
            attemptNumber: 1,
          }
        );
      });
    });

    describe('createUndoRedoCommand', () => {
      it('should create undo command for create operations', () => {
        const command = errorHandler.createUndoRedoCommand(
          'create',
          mockService,
          { data: { name: 'Test' } },
          { $id: 'test-1', name: 'Test' }
        );

        expect(command.do).toBeDefined();
        expect(command.undo).toBeDefined();
      });

      it('should create undo command for update operations', () => {
        const command = errorHandler.createUndoRedoCommand(
          'update',
          mockService,
          { id: 'test-1', data: { name: 'Updated' }, previousData: { name: 'Original' } },
          { $id: 'test-1', name: 'Updated' }
        );

        expect(command.do).toBeDefined();
        expect(command.undo).toBeDefined();
      });

      it('should create undo command for delete operations', () => {
        const command = errorHandler.createUndoRedoCommand(
          'delete',
          mockService,
          { id: 'test-1', previousData: { name: 'Deleted' } },
          undefined
        );

        expect(command.do).toBeDefined();
        expect(command.undo).toBeDefined();
      });
    });

    describe('generateRecoveryOptions', () => {
      it('should generate network recovery options', () => {
        const error = { code: 500, message: 'Network error' };
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockClassifyError.mockReturnValue(ErrorCategory.NETWORK);

        const options = errorHandler.generateRecoveryOptions(error, context);

        expect(options).toHaveLength(2); // Network + generic retry
        expect(options[0].id).toBe('retry-connection');
        expect(options[0].priority).toBe('high');
      });

      it('should generate authentication recovery options', () => {
        const error = { code: 401, message: 'Unauthorized' };
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockClassifyError.mockReturnValue(ErrorCategory.AUTHENTICATION);

        const options = errorHandler.generateRecoveryOptions(error, context);

        expect(options[0].id).toBe('re-authenticate');
        expect(options[0].priority).toBe('high');
      });

      it('should generate validation recovery options', () => {
        const error = { code: 400, message: 'Validation error' };
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockClassifyError.mockReturnValue(ErrorCategory.VALIDATION);

        const options = errorHandler.generateRecoveryOptions(error, context);

        expect(options[0].id).toBe('fix-validation');
        expect(options[0].priority).toBe('medium');
      });

      it('should include conflict resolution options when configured', () => {
        const error = { code: 409, message: 'Conflict' };
        const context = {
          operation: 'update' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockClassifyError.mockReturnValue('conflict' as any);

        const options = errorHandler.generateRecoveryOptions(error, context);

        expect(options.some(option => option.id === 'resolve-conflict')).toBe(true);
      });

      it('should sort options by priority', () => {
        const error = { code: 500, message: 'Error' };
        const context = {
          operation: 'create' as const,
          service: 'TestService',
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
        };

        mockClassifyError.mockReturnValue(ErrorCategory.NETWORK);

        const options = errorHandler.generateRecoveryOptions(error, context);

        expect(options[0].priority).toBe('high');
        expect(options[options.length - 1].priority).toBe('low');
      });
    });

    describe('resolveConflict', () => {
      it('should delegate to conflict resolver', async () => {
        const mockResolverInstance = {
          resolveConflict: jest.fn().mockResolvedValue({ resolved: true }),
        };
        mockConflictResolver.mockImplementation(() => mockResolverInstance as any);

        errorHandler = new MutationErrorHandler(mockService);

        const localData = { name: 'Local' };
        const serverData = { name: 'Server' };

        const result = await errorHandler.resolveConflict(localData, serverData, 'merge');

        expect(mockResolverInstance.resolveConflict).toHaveBeenCalledWith(localData, serverData, 'merge');
        expect(result).toEqual({ resolved: true });
      });
    });

    describe('hasVersionConflict', () => {
      it('should delegate to conflict resolver', () => {
        const mockResolverInstance = {
          hasVersionConflict: jest.fn().mockReturnValue(true),
        };
        mockConflictResolver.mockImplementation(() => mockResolverInstance as any);

        errorHandler = new MutationErrorHandler(mockService);

        const localData = { version: 1 };
        const serverData = { version: 2 };

        const result = errorHandler.hasVersionConflict(localData, serverData);

        expect(mockResolverInstance.hasVersionConflict).toHaveBeenCalledWith(localData, serverData);
        expect(result).toBe(true);
      });
    });
  });

  describe('Enhanced Mutation Hooks', () => {
    describe('useEnhancedCreateMutation', () => {
      it('should create enhanced create hook with proper configuration', () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn(),
          errorState: { hasError: false },
        };

        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() =>
          useEnhancedCreateMutation(mockDatabaseService.mock.instances[0], [['test']], {
            enableRollback: true,
            userFriendlyMessages: true,
          }),
          { wrapper }
        );

        expect(result.current).toBe(mockMutation);
      });

      it('should handle successful mutations with undo/redo', async () => {
        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockResolvedValue({ $id: 'test-1' }),
          errorState: { hasError: false },
        };

        mockUseEnhancedCreateMutation.mockReturnValue(mockMutation);
        mockUndoRedoManager.execute.mockResolvedValue(undefined);

        const { result } = renderHook(() =>
          useEnhancedCreateMutation(mockDatabaseService.mock.instances[0], [['test']], {
            enableUndoRedo: true,
          }),
          { wrapper }
        );

        await result.current.mutateAsync({ name: 'Test' });

        expect(mockUndoRedoManager.execute).toHaveBeenCalled();
      });

      it('should handle errors with recovery options', () => {
        const mockErrorState = {
          hasError: true,
          error: { code: 422, message: 'Validation failed' },
          recoveryOptions: [
            {
              id: 'fix-validation',
              label: 'Fix Validation',
              description: 'Correct the input data',
              action: jest.fn(),
              priority: 'high' as const,
            },
          ],
          isRecovering: false,
          rollbackStatus: 'idle' as const,
        };

        mockUseEnhancedCreateMutation.mockReturnValue({
          mutate: jest.fn(),
          mutateAsync: jest.fn(),
          errorState: mockErrorState,
        });

        const { result } = renderHook(() =>
          useEnhancedCreateMutation(mockDatabaseService.mock.instances[0], [['test']]),
          { wrapper }
        );

        expect(result.current.errorState).toEqual(mockErrorState);
      });
    });

    describe('useEnhancedUpdateMutation', () => {
      it('should fetch previous data for undo operations', async () => {
        const mockServiceInstance = {
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Updated' }),
          delete: jest.fn(),
          get: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Original' }),
        };

        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockImplementation(async ({ id, data }) => {
            return mockServiceInstance.update(id, data);
          }),
          errorState: { hasError: false },
          resolveConflict: jest.fn(),
          hasVersionConflict: jest.fn(),
        };

        mockUseEnhancedUpdateMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() =>
          useEnhancedUpdateMutation(mockServiceInstance as any, [['test']], {
            enableUndoRedo: true,
          }),
          { wrapper }
        );

        await result.current.mutateAsync({ id: 'test-1', data: { name: 'Updated' } });

        expect(mockServiceInstance.get).toHaveBeenCalledWith('test-1');
        expect(mockUndoRedoManager.execute).toHaveBeenCalled();
      });
    });

    describe('useEnhancedDeleteMutation', () => {
      it('should fetch previous data for undo operations', async () => {
        const mockServiceInstance = {
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'To Delete' }),
        };

        const mockMutation = {
          mutate: jest.fn(),
          mutateAsync: jest.fn().mockImplementation(async (id) => {
            return mockServiceInstance.delete(id);
          }),
          errorState: { hasError: false },
          retryWithBackoff: jest.fn(),
        };

        mockUseEnhancedDeleteMutation.mockReturnValue(mockMutation);

        const { result } = renderHook(() =>
          useEnhancedDeleteMutation(mockServiceInstance as any, [['test']], {
            enableUndoRedo: true,
          }),
          { wrapper }
        );

        await result.current.mutateAsync('test-1');

        expect(mockServiceInstance.get).toHaveBeenCalledWith('test-1');
        expect(mockUndoRedoManager.execute).toHaveBeenCalled();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createRollbackOperation', () => {
      it('should create rollback operation for create', () => {
        const operation = createRollbackOperation(
          'create',
          mockDatabaseService.mock.instances[0],
          'test-1',
          { name: 'Original' },
          { name: 'Updated' }
        );

        expect(operation).toEqual({
          type: 'create',
          service: mockDatabaseService.mock.instances[0],
          documentId: 'test-1',
          previousData: { name: 'Original' },
          rollbackData: { name: 'Updated' },
        });
      });

      it('should create rollback operation for update', () => {
        const operation = createRollbackOperation(
          'update',
          mockDatabaseService.mock.instances[0],
          'test-1',
          undefined,
          { name: 'Original' }
        );

        expect(operation).toEqual({
          type: 'update',
          service: mockDatabaseService.mock.instances[0],
          documentId: 'test-1',
          previousData: undefined,
          rollbackData: { name: 'Original' },
        });
      });

      it('should create rollback operation for delete', () => {
        const operation = createRollbackOperation(
          'delete',
          mockDatabaseService.mock.instances[0],
          undefined,
          { name: 'Deleted' },
          undefined
        );

        expect(operation).toEqual({
          type: 'delete',
          service: mockDatabaseService.mock.instances[0],
          documentId: undefined,
          previousData: { name: 'Deleted' },
          rollbackData: undefined,
        });
      });
    });

    describe('formatErrorWithRecovery', () => {
      it('should format network errors', () => {
        const error = {
          code: 500,
          type: 'network',
          message: 'Connection failed',
          category: ErrorCategory.NETWORK,
        };
        const recoveryOptions = [
          {
            id: 'retry',
            label: 'Retry',
            description: 'Try again',
            action: jest.fn(),
            priority: 'high' as const,
          },
        ];

        mockGetUserFriendlyMessage.mockReturnValue('Please check your connection');

        const formatted = formatErrorWithRecovery(error, recoveryOptions);

        expect(formatted.title).toBe('Connection Issue');
        expect(formatted.severity).toBe('warning');
        expect(formatted.recoveryOptions).toEqual(recoveryOptions);
      });

      it('should format validation errors', () => {
        const error = {
          code: 400,
          type: 'validation',
          message: 'Invalid input',
          category: ErrorCategory.VALIDATION,
        };
        const recoveryOptions = [];

        mockGetUserFriendlyMessage.mockReturnValue('Please correct the input');

        const formatted = formatErrorWithRecovery(error, recoveryOptions);

        expect(formatted.title).toBe('Invalid Input');
        expect(formatted.severity).toBe('warning');
      });

      it('should format authentication errors', () => {
        const error = {
          code: 401,
          type: 'auth',
          message: 'Unauthorized',
          category: ErrorCategory.AUTHENTICATION,
        };
        const recoveryOptions = [];

        mockGetUserFriendlyMessage.mockReturnValue('Please log in again');

        const formatted = formatErrorWithRecovery(error, recoveryOptions);

        expect(formatted.title).toBe('Access Denied');
        expect(formatted.severity).toBe('error');
      });
    });
  });
});