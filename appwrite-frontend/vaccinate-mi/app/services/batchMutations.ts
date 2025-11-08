/**
 * Batch Mutations Service
 * Provides batch mutation capabilities with optimistic updates and rollback
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { DatabaseService } from './appwriteDatabase';
import { logAppwriteError } from '../utils/appwriteErrors';
import type { AppwriteDocument } from '../types/appwrite';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type BatchOperationType = 'create' | 'update' | 'delete';

export interface BatchOperation<T extends AppwriteDocument> {
  type: BatchOperationType;
  service: DatabaseService<T>;
  data?: Omit<T, keyof AppwriteDocument>;
  id?: string;
  updateData?: Partial<Omit<T, keyof AppwriteDocument>>;
  queryKeys: string[][];
}

export interface BatchMutationResult<T extends AppwriteDocument> {
  operation: BatchOperation<T>;
  result?: T;
  error?: any;
  success: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentOperation?: string;
}

export interface BatchMutationOptions<T extends AppwriteDocument> {
  onProgress?: (progress: BatchProgress) => void;
  onPartialSuccess?: (results: BatchMutationResult<T>[]) => void;
  continueOnError?: boolean;
  rollbackOnError?: boolean;
  onError?: (error: any, variables: any, context: any) => void;
  onSettled?: (data: BatchMutationResult<T>[] | undefined, error: any, variables: any, context: any) => void;
}

// =============================================================================
// BATCH MUTATIONS HOOK
// =============================================================================

/**
 * Hook for performing batch mutations with optimistic updates and rollback
 */
export function useBatchMutations<T extends AppwriteDocument>(
  operations: BatchOperation<T>[],
  options?: BatchMutationOptions<T> & UseMutationOptions<BatchMutationResult<T>[], any, void>
) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BatchProgress>({
    total: operations.length,
    completed: 0,
    failed: 0,
  });

  const updateProgress = useCallback((completed: number, failed: number, currentOp?: string) => {
    const newProgress = {
      total: operations.length,
      completed,
      failed,
      currentOperation: currentOp,
    };
    setProgress(newProgress);
    options?.onProgress?.(newProgress);
  }, [operations.length, options]);

  const executeBatchOperation = async (operation: BatchOperation<T>): Promise<BatchMutationResult<T>> => {
    try {
      let result: T | undefined;

      switch (operation.type) {
        case 'create':
          if (!operation.data) throw new Error('Create operation requires data');
          result = await operation.service.create(operation.data);
          break;
        case 'update':
          if (!operation.id || !operation.updateData) throw new Error('Update operation requires id and updateData');
          result = await operation.service.update(operation.id, operation.updateData);
          break;
        case 'delete':
          if (!operation.id) throw new Error('Delete operation requires id');
          await operation.service.delete(operation.id);
          // Delete operations don't return data
          break;
        default:
          throw new Error(`Unknown operation type: ${(operation as any).type}`);
      }

      return {
        operation,
        result,
        success: true,
      };
    } catch (error) {
      return {
        operation,
        error,
        success: false,
      };
    }
  };

  const applyOptimisticUpdates = async (): Promise<Map<string, any>> => {
    const snapshots = new Map<string, any>();

    // Cancel all outgoing refetches
    const allQueryKeys = operations.flatMap(op => op.queryKeys);
    await Promise.all(
      allQueryKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
    );

    // Take snapshots of current data
    allQueryKeys.forEach(key => {
      const data = queryClient.getQueryData(key);
      if (data) {
        snapshots.set(JSON.stringify(key), data);
      }
    });

    // Apply optimistic updates
    operations.forEach(operation => {
      operation.queryKeys.forEach(key => {
        queryClient.setQueryData(key, (old: any) => {
          if (!old) return old;

          switch (operation.type) {
            case 'create':
              if (Array.isArray(old?.documents) && operation.data) {
                return {
                  ...old,
                  documents: [operation.data as T, ...old.documents],
                  total: old.total + 1
                };
              }
              break;
            case 'update':
              if (Array.isArray(old?.documents) && operation.id && operation.updateData) {
                return {
                  ...old,
                  documents: old.documents.map((item: T) =>
                    (item as any).$id === operation.id ? { ...item, ...operation.updateData } : item
                  )
                };
              } else if (old && (old as any).$id === operation.id && operation.updateData) {
                return { ...old, ...operation.updateData };
              }
              break;
            case 'delete':
              if (Array.isArray(old?.documents) && operation.id) {
                return {
                  ...old,
                  documents: old.documents.filter((item: T) => (item as any).$id !== operation.id),
                  total: old.total - 1
                };
              }
              break;
          }
          return old;
        });
      });
    });

    return snapshots;
  };

  const rollbackOptimisticUpdates = (snapshots: Map<string, any>) => {
    snapshots.forEach((data, keyString) => {
      const key = JSON.parse(keyString);
      queryClient.setQueryData(key, data);
    });
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<BatchMutationResult<T>[]> => {
      const snapshots = await applyOptimisticUpdates();

      const results: BatchMutationResult<T>[] = [];
      let completed = 0;
      let failed = 0;

      try {
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          updateProgress(completed, failed, `${operation.type} operation ${i + 1}`);

          const result = await executeBatchOperation(operation);
          results.push(result);

          if (result.success) {
            completed++;
          } else {
            failed++;
            logAppwriteError(result.error, `BatchOperation-${operation.type}`);

            if (!options?.continueOnError) {
              // Rollback and stop on first error
              rollbackOptimisticUpdates(snapshots);
              updateProgress(completed, failed);
              throw result.error;
            }
          }

          updateProgress(completed, failed);
        }

        // All operations completed
        return results;
      } catch (error) {
        // Rollback on error if configured
        if (options?.rollbackOnError !== false) {
          rollbackOptimisticUpdates(snapshots);
        }
        throw error;
      }
    },
    onError: (error, variables, context) => {
      logAppwriteError(error, 'BatchMutations');
      options?.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Invalidate all affected queries
      const allQueryKeys = operations.flatMap(op => op.queryKeys);
      allQueryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Reset progress
      setProgress({
        total: operations.length,
        completed: 0,
        failed: 0,
      });

      options?.onSettled?.(data, error, variables, context);
    },
    ...options,
  });

  return {
    ...mutation,
    progress,
    execute: mutation.mutate,
    executeAsync: mutation.mutateAsync,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a batch operation for create mutations
 */
export function createBatchCreateOperation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  data: Omit<T, keyof AppwriteDocument>,
  queryKeys: string[][]
): BatchOperation<T> {
  return {
    type: 'create',
    service,
    data,
    queryKeys,
  };
}

/**
 * Create a batch operation for update mutations
 */
export function createBatchUpdateOperation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  id: string,
  updateData: Partial<Omit<T, keyof AppwriteDocument>>,
  queryKeys: string[][]
): BatchOperation<T> {
  return {
    type: 'update',
    service,
    id,
    updateData,
    queryKeys,
  };
}

/**
 * Create a batch operation for delete mutations
 */
export function createBatchDeleteOperation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  id: string,
  queryKeys: string[][]
): BatchOperation<T> {
  return {
    type: 'delete',
    service,
    id,
    queryKeys,
  };
}

export default {
  useBatchMutations,
  createBatchCreateOperation,
  createBatchUpdateOperation,
  createBatchDeleteOperation,
};