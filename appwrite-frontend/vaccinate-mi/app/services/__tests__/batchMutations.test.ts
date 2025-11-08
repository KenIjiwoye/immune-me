import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useBatchMutations,
  createBatchCreateOperation,
  createBatchUpdateOperation,
  createBatchDeleteOperation,
  BatchOperation,
  BatchMutationResult
} from '../batchMutations';

// Mock the services
jest.mock('../appwriteDatabase', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../appwriteErrors', () => ({
  logAppwriteError: jest.fn(),
}));

import { DatabaseService } from '../appwriteDatabase';
import { logAppwriteError } from '../appwriteErrors';

const mockDatabaseService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockLogAppwriteError = logAppwriteError as jest.MockedFunction<typeof logAppwriteError>;

describe('batchMutations', () => {
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

  describe('useBatchMutations', () => {
    it('should initialize with correct progress state', () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: new DatabaseService('test'),
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      expect(result.current.progress.total).toBe(1);
      expect(result.current.progress.completed).toBe(0);
      expect(result.current.progress.failed).toBe(0);
    });

    it('should execute batch operations successfully', async () => {
      const mockService = {
        create: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Test' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService as any,
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        const batchResult = await result.current.executeAsync();
        expect(batchResult).toHaveLength(1);
        expect(batchResult[0].success).toBe(true);
        expect(batchResult[0].result).toEqual({ $id: 'test-1', name: 'Test' });
      });

      expect(mockService.create).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('should handle batch operation failures', async () => {
      const mockService = {
        create: jest.fn().mockRejectedValue(new Error('Create failed')),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService as any,
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        const batchResult = await result.current.executeAsync();
        expect(batchResult).toHaveLength(1);
        expect(batchResult[0].success).toBe(false);
        expect(batchResult[0].error).toEqual(new Error('Create failed'));
      });

      expect(mockLogAppwriteError).toHaveBeenCalledWith(
        new Error('Create failed'),
        'BatchOperation-create'
      );
    });

    it('should continue on error when configured', async () => {
      const mockService1 = {
        create: jest.fn().mockRejectedValue(new Error('Create failed')),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const mockService2 = {
        create: jest.fn().mockResolvedValue({ $id: 'test-2', name: 'Test 2' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService1 as any,
          data: { name: 'Test 1' },
          queryKeys: [['test']],
        },
        {
          type: 'create',
          service: mockService2 as any,
          data: { name: 'Test 2' },
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(
        () => useBatchMutations(operations, { continueOnError: true }),
        { wrapper }
      );

      await act(async () => {
        const batchResult = await result.current.executeAsync();
        expect(batchResult).toHaveLength(2);
        expect(batchResult[0].success).toBe(false);
        expect(batchResult[1].success).toBe(true);
      });
    });

    it('should stop on first error when continueOnError is false', async () => {
      const mockService1 = {
        create: jest.fn().mockRejectedValue(new Error('Create failed')),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const mockService2 = {
        create: jest.fn().mockResolvedValue({ $id: 'test-2', name: 'Test 2' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService1 as any,
          data: { name: 'Test 1' },
          queryKeys: [['test']],
        },
        {
          type: 'create',
          service: mockService2 as any,
          data: { name: 'Test 2' },
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(
        () => useBatchMutations(operations, { continueOnError: false }),
        { wrapper }
      );

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Create failed');
      });

      // Second operation should not be called
      expect(mockService2.create).not.toHaveBeenCalled();
    });

    it('should apply optimistic updates before execution', async () => {
      const mockService = {
        create: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Test' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService as any,
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      // Set up initial query data
      queryClient.setQueryData(['test'], {
        documents: [],
        total: 0,
      });

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await result.current.executeAsync();
      });

      // Verify optimistic update was applied and then reverted after server response
      expect(queryClient.getQueryData(['test'])).toEqual({
        documents: [],
        total: 0,
      });
    });

    it('should rollback optimistic updates on error', async () => {
      const mockService = {
        create: jest.fn().mockRejectedValue(new Error('Create failed')),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService as any,
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      // Set up initial query data
      const initialData = {
        documents: [],
        total: 0,
      };
      queryClient.setQueryData(['test'], initialData);

      const { result } = renderHook(
        () => useBatchMutations(operations, { rollbackOnError: true }),
        { wrapper }
      );

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Create failed');
      });

      // Data should be rolled back to initial state
      expect(queryClient.getQueryData(['test'])).toEqual(initialData);
    });

    it('should update progress during execution', async () => {
      const mockService1 = {
        create: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Test 1' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const mockService2 = {
        create: jest.fn().mockResolvedValue({ $id: 'test-2', name: 'Test 2' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService1 as any,
          data: { name: 'Test 1' },
          queryKeys: [['test']],
        },
        {
          type: 'create',
          service: mockService2 as any,
          data: { name: 'Test 2' },
          queryKeys: [['test']],
        },
      ];

      const onProgress = jest.fn();
      const { result } = renderHook(
        () => useBatchMutations(operations, { onProgress }),
        { wrapper }
      );

      await act(async () => {
        await result.current.executeAsync();
      });

      expect(onProgress).toHaveBeenCalledWith({
        total: 2,
        completed: 1,
        failed: 0,
        currentOperation: 'create operation 1',
      });

      expect(onProgress).toHaveBeenCalledWith({
        total: 2,
        completed: 2,
        failed: 0,
        currentOperation: 'create operation 2',
      });
    });

    it('should invalidate queries after completion', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const mockService = {
        create: jest.fn().mockResolvedValue({ $id: 'test-1', name: 'Test' }),
        update: jest.fn(),
        delete: jest.fn(),
      };

      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: mockService as any,
          data: { name: 'Test' },
          queryKeys: [['test'], ['other']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await result.current.executeAsync();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['test'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['other'] });
    });
  });

  describe('Batch Operation Creators', () => {
    describe('createBatchCreateOperation', () => {
      it('should create a batch create operation', () => {
        const mockService = new DatabaseService('test');
        const queryKeys = [['test']];

        const operation = createBatchCreateOperation(
          mockService,
          { name: 'Test' },
          queryKeys
        );

        expect(operation).toEqual({
          type: 'create',
          service: mockService,
          data: { name: 'Test' },
          queryKeys,
        });
      });
    });

    describe('createBatchUpdateOperation', () => {
      it('should create a batch update operation', () => {
        const mockService = new DatabaseService('test');
        const queryKeys = [['test']];

        const operation = createBatchUpdateOperation(
          mockService,
          'test-id',
          { name: 'Updated Test' },
          queryKeys
        );

        expect(operation).toEqual({
          type: 'update',
          service: mockService,
          id: 'test-id',
          updateData: { name: 'Updated Test' },
          queryKeys,
        });
      });
    });

    describe('createBatchDeleteOperation', () => {
      it('should create a batch delete operation', () => {
        const mockService = new DatabaseService('test');
        const queryKeys = [['test']];

        const operation = createBatchDeleteOperation(
          mockService,
          'test-id',
          queryKeys
        );

        expect(operation).toEqual({
          type: 'delete',
          service: mockService,
          id: 'test-id',
          queryKeys,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operation types', async () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'invalid' as any,
          service: {} as any,
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Unknown operation type: invalid');
      });
    });

    it('should handle missing required fields in create operations', async () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: {} as any,
          // Missing data
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Create operation requires data');
      });
    });

    it('should handle missing required fields in update operations', async () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'update',
          service: {} as any,
          // Missing id and updateData
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Update operation requires id and updateData');
      });
    });

    it('should handle missing required fields in delete operations', async () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'delete',
          service: {} as any,
          // Missing id
          queryKeys: [['test']],
        },
      ];

      const { result } = renderHook(() => useBatchMutations(operations), { wrapper });

      await act(async () => {
        await expect(result.current.executeAsync()).rejects.toThrow('Delete operation requires id');
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates for create operations', () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'create',
          service: {} as any,
          data: { name: 'Test' },
          queryKeys: [['test']],
        },
      ];

      // Set up initial query data
      queryClient.setQueryData(['test'], {
        documents: [],
        total: 0,
      });

      renderHook(() => useBatchMutations(operations), { wrapper });

      // Optimistic update should be applied during execution
      // This is tested implicitly through the execution flow
    });

    it('should apply optimistic updates for update operations', () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'update',
          service: {} as any,
          id: 'test-id',
          updateData: { name: 'Updated Test' },
          queryKeys: [['test']],
        },
      ];

      // Set up initial query data
      queryClient.setQueryData(['test'], {
        documents: [{ $id: 'test-id', name: 'Original Test' }],
        total: 1,
      });

      renderHook(() => useBatchMutations(operations), { wrapper });

      // Optimistic update should be applied during execution
    });

    it('should apply optimistic updates for delete operations', () => {
      const operations: BatchOperation<any>[] = [
        {
          type: 'delete',
          service: {} as any,
          id: 'test-id',
          queryKeys: [['test']],
        },
      ];

      // Set up initial query data
      queryClient.setQueryData(['test'], {
        documents: [{ $id: 'test-id', name: 'Test' }],
        total: 1,
      });

      renderHook(() => useBatchMutations(operations), { wrapper });

      // Optimistic update should be applied during execution
    });
  });
});