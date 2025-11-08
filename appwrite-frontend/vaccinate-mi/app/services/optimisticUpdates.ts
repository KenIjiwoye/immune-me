/**
 * Optimistic Updates Service
 * Provides optimistic update patterns for React Query and Appwrite operations
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { DatabaseService } from './appwriteDatabase';
import { logAppwriteError } from '../utils/appwriteErrors';
import type { AppwriteDocument } from '../types/appwrite';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface OptimisticUpdateOptions<T extends AppwriteDocument> {
  onMutate?: (variables: any) => Promise<{ previousData?: any } | undefined> | { previousData?: any } | undefined;
  onError?: (error: any, variables: any, context: { previousData?: any }) => void;
  onSettled?: (data: T | undefined, error: any, variables: any, context: { previousData?: any }) => void;
  invalidateQueries?: string[][];
  rollbackOnError?: boolean;
}

export interface ConflictResolutionOptions {
  versionField?: string;
  lastModifiedField?: string;
  conflictStrategy?: 'client-wins' | 'server-wins' | 'merge' | 'manual';
}

// =============================================================================
// OPTIMISTIC UPDATE HOOKS
// =============================================================================

/**
 * Generic optimistic update hook for create operations
 */
export function useOptimisticCreate<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: OptimisticUpdateOptions<T>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<T, keyof AppwriteDocument>) => service.create(data),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await Promise.all(
        queryKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous values
      const previousData = queryKeys.map(key =>
        queryClient.getQueryData(key)
      );

      // Optimistically update cache
      queryKeys.forEach((key, index) => {
        queryClient.setQueryData(key, (old: any) => {
          if (Array.isArray(old?.documents)) {
            // Add to list queries
            return {
              ...old,
              documents: [newData as T, ...old.documents],
              total: old.total + 1
            };
          }
          return old;
        });
      });

      // Call custom onMutate if provided
      if (options?.onMutate) {
        return options.onMutate(newData);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (options?.rollbackOnError !== false) {
        queryKeys.forEach((key, index) => {
          queryClient.setQueryData(key, context?.previousData?.[index]);
        });
      }

      logAppwriteError(error, 'OptimisticCreate');

      // Call custom onError if provided
      if (options?.onError && context) {
        options.onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after mutation
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call custom onSettled if provided
      if (options?.onSettled && context) {
        options.onSettled(data, error, variables, context);
      }
    },
  });
}

/**
 * Generic optimistic update hook for update operations
 */
export function useOptimisticUpdate<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: OptimisticUpdateOptions<T>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<T, keyof AppwriteDocument>> }) =>
      service.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await Promise.all(
        queryKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous values
      const previousData = queryKeys.map(key =>
        queryClient.getQueryData(key)
      );

      // Optimistically update cache
      queryKeys.forEach(key => {
        queryClient.setQueryData(key, (old: any) => {
          if (Array.isArray(old?.documents)) {
            // Update in list queries
            return {
              ...old,
              documents: old.documents.map((item: T) =>
                (item as any).$id === id ? { ...item, ...data } : item
              )
            };
          } else if (old && (old as any).$id === id) {
            // Update single item queries
            return { ...old, ...data };
          }
          return old;
        });
      });

      // Call custom onMutate if provided
      if (options?.onMutate) {
        return options.onMutate({ id, data });
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (options?.rollbackOnError !== false) {
        queryKeys.forEach((key, index) => {
          queryClient.setQueryData(key, context?.previousData?.[index]);
        });
      }

      logAppwriteError(error, 'OptimisticUpdate');

      // Call custom onError if provided
      if (options?.onError && context) {
        options.onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after mutation
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call custom onSettled if provided
      if (options?.onSettled && context) {
        options.onSettled(data, error, variables, context);
      }
    },
  });
}

/**
 * Generic optimistic update hook for delete operations
 */
export function useOptimisticDelete<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: OptimisticUpdateOptions<T>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => service.delete(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await Promise.all(
        queryKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous values
      const previousData = queryKeys.map(key =>
        queryClient.getQueryData(key)
      );

      // Optimistically update cache
      queryKeys.forEach(key => {
        queryClient.setQueryData(key, (old: any) => {
          if (Array.isArray(old?.documents)) {
            // Remove from list queries
            return {
              ...old,
              documents: old.documents.filter((item: T) => (item as any).$id !== id),
              total: old.total - 1
            };
          }
          return old;
        });
      });

      // Call custom onMutate if provided
      if (options?.onMutate) {
        return options.onMutate(id);
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (options?.rollbackOnError !== false) {
        queryKeys.forEach((key, index) => {
          queryClient.setQueryData(key, context?.previousData?.[index]);
        });
      }

      logAppwriteError(error, 'OptimisticDelete');

      // Call custom onError if provided
      if (options?.onError && context) {
        options.onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after mutation
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call custom onSettled if provided
      if (options?.onSettled && context) {
        options.onSettled(data as T | undefined, error, variables, context);
      }
    },
  });
}

// =============================================================================
// CONFLICT RESOLUTION UTILITIES
// =============================================================================

/**
 * Conflict resolution for offline/online sync
 */
export class ConflictResolver<T extends AppwriteDocument> {
  constructor(
    private service: DatabaseService<T>,
    private options: ConflictResolutionOptions = {}
  ) {}

  /**
   * Resolve conflicts between local and server data
   */
  async resolveConflict(
    localData: T,
    serverData: T,
    strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual' = 'client-wins'
  ): Promise<T> {
    const conflictStrategy = strategy || this.options.conflictStrategy || 'client-wins';

    switch (conflictStrategy) {
      case 'client-wins':
        return localData;

      case 'server-wins':
        return serverData;

      case 'merge':
        return this.mergeData(localData, serverData);

      case 'manual':
        // For manual resolution, throw an error to be handled by the UI
        throw new Error('Manual conflict resolution required');

      default:
        return localData;
    }
  }

  /**
   * Merge local and server data intelligently
   */
  private mergeData(localData: T, serverData: T): T {
    const merged = { ...serverData };

    // Simple merge strategy: prefer non-null local values
    Object.keys(localData).forEach(key => {
      const localValue = (localData as any)[key];
      const serverValue = (serverData as any)[key];

      if (localValue !== null && localValue !== undefined &&
          (serverValue === null || serverValue === undefined)) {
        (merged as any)[key] = localValue;
      }
    });

    return merged;
  }

  /**
   * Check for version conflicts
   */
  hasVersionConflict(localData: T, serverData: T): boolean {
    if (!this.options.versionField) return false;

    const localVersion = (localData as any)[this.options.versionField];
    const serverVersion = (serverData as any)[this.options.versionField];

    return localVersion !== serverVersion;
  }

  /**
   * Check for timestamp conflicts
   */
  hasTimestampConflict(localData: T, serverData: T): boolean {
    if (!this.options.lastModifiedField) return false;

    const localTime = new Date((localData as any)[this.options.lastModifiedField]).getTime();
    const serverTime = new Date((serverData as any)[this.options.lastModifiedField]).getTime();

    return localTime < serverTime;
  }
}

// =============================================================================
// DATA RECOVERY UTILITIES
// =============================================================================

/**
 * Data recovery utilities for failed operations
 */
export class DataRecovery<T extends AppwriteDocument> {
  constructor(private service: DatabaseService<T>) {}

  /**
   * Retry failed operation with exponential backoff
   */
  async retryOperation(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) break;

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.warn(`Retry attempt ${attempt} failed:`, error);
      }
    }

    throw lastError;
  }

  /**
   * Fallback data loading when primary source fails
   */
  async loadWithFallback(
    primaryOperation: () => Promise<T[]>,
    fallbackOperation: () => Promise<T[]>
  ): Promise<T[]> {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn('Primary data load failed, using fallback:', error);
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error('Fallback data load also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Partial data recovery for batch operations
   */
  async batchOperationWithRecovery(
    operations: Array<() => Promise<T>>,
    continueOnError: boolean = true
  ): Promise<{ successful: T[]; failed: { index: number; error: any }[] }> {
    const successful: T[] = [];
    const failed: { index: number; error: any }[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        successful.push(result);
      } catch (error) {
        failed.push({ index: i, error });

        if (!continueOnError) {
          break;
        }
      }
    }

    return { successful, failed };
  }
}

// =============================================================================
// ENHANCED VALIDATION ERROR HANDLING
// =============================================================================

/**
 * Enhanced validation error handling for Zod and Appwrite errors
 */
export class ValidationErrorHandler {
  /**
   * Format Zod validation errors for user display
   */
  static formatZodErrors(error: any): Record<string, string> {
    if (!error?.errors) return {};

    const formattedErrors: Record<string, string> = {};

    error.errors.forEach((err: any) => {
      const path = err.path.join('.');
      formattedErrors[path] = err.message;
    });

    return formattedErrors;
  }

  /**
   * Format Appwrite validation errors
   */
  static formatAppwriteErrors(error: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (error.code === 400 && error.response?.message) {
      // Try to parse field-specific errors from response
      const message = error.response.message;
      if (message.includes(':')) {
        const [field, errorMsg] = message.split(':', 2);
        errors[field.trim()] = errorMsg.trim();
      } else {
        errors.general = message;
      }
    } else {
      errors.general = error.message || 'An unexpected error occurred';
    }

    return errors;
  }

  /**
   * Combine multiple error sources
   */
  static combineErrors(...errorSources: Record<string, string>[]): Record<string, string> {
    return errorSources.reduce((combined, source) => ({ ...combined, ...source }), {});
  }

  /**
   * Check if error is validation-related
   */
  static isValidationError(error: any): boolean {
    return error.code === 400 || error.type?.includes('validation') || error.errors;
  }
}

export default {
  useOptimisticCreate,
  useOptimisticUpdate,
  useOptimisticDelete,
  ConflictResolver,
  DataRecovery,
  ValidationErrorHandler,
};