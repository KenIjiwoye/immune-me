/**
 * Enhanced Mutation Error Handler
 * Provides comprehensive error handling, rollback capabilities, retry mechanisms,
 * conflict resolution, and user-friendly feedback for mutation operations.
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DatabaseService } from './appwriteDatabase';
import { ConflictResolver, DataRecovery, ValidationErrorHandler } from './optimisticUpdates';
import { undoRedoManager, MutationCommand } from './undoRedoManager';
import {
  logAppwriteError,
  withRetry,
  classifyError,
  getUserFriendlyMessage,
  ErrorCategory,
  AppwriteError,
  RetryConfig,
  DEFAULT_RETRY_CONFIG
} from '../utils/appwriteErrors';
import type { AppwriteDocument } from '../types/appwrite';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface MutationErrorContext {
  operation: 'create' | 'update' | 'delete';
  service: string;
  documentId?: string;
  userId?: string;
  timestamp: string;
  attemptNumber: number;
}

export interface RollbackOperation<T extends AppwriteDocument> {
  type: 'create' | 'update' | 'delete';
  service: DatabaseService<T>;
  documentId?: string;
  previousData?: T;
  rollbackData?: Partial<T>;
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  priority: 'high' | 'medium' | 'low';
}

export interface MutationErrorState {
  hasError: boolean;
  error?: AppwriteError;
  context?: MutationErrorContext;
  recoveryOptions: RecoveryOption[];
  isRecovering: boolean;
  rollbackStatus: 'idle' | 'rolling_back' | 'completed' | 'failed';
}

export interface EnhancedMutationOptions<TData = any, TError = any, TVariables = any> {
  enableRollback?: boolean;
  rollbackOperations?: RollbackOperation<any>[];
  retryConfig?: Partial<RetryConfig>;
  conflictResolution?: {
    strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
    versionField?: string;
    lastModifiedField?: string;
  };
  onRecoveryOptions?: (options: RecoveryOption[]) => void;
  onRollbackStart?: () => void;
  onRollbackComplete?: (success: boolean) => void;
  onRetryAttempt?: (attempt: number, maxRetries: number) => void;
  enableOfflineHandling?: boolean;
  userFriendlyMessages?: boolean;
  enableUndoRedo?: boolean;
}

// =============================================================================
// MUTATION ERROR HANDLER CLASS
// =============================================================================

export class MutationErrorHandler<T extends AppwriteDocument> {
  private conflictResolver: ConflictResolver<T>;
  private dataRecovery: DataRecovery<T>;
  private queryClient = useQueryClient();

  constructor(
    private service: DatabaseService<T>,
    private options: EnhancedMutationOptions = {}
  ) {
    this.conflictResolver = new ConflictResolver(service, {
      versionField: options.conflictResolution?.versionField,
      lastModifiedField: options.conflictResolution?.lastModifiedField,
      conflictStrategy: options.conflictResolution?.strategy || 'client-wins'
    });
    this.dataRecovery = new DataRecovery(service);
  }

  /**
   * Execute mutation with enhanced error handling
   */
  async executeWithErrorHandling<TData>(
    operation: () => Promise<TData>,
    context: MutationErrorContext
  ): Promise<TData> {
    try {
      // Execute with retry logic if configured
      if (this.options.retryConfig) {
        return await withRetry(
          operation,
          this.options.retryConfig,
          `${context.operation}-${context.service}`
        );
      }

      return await operation();
    } catch (error: any) {
      const enhancedError = this.enhanceError(error, context);

      // Log the error
      logAppwriteError(enhancedError, `${context.operation}-${context.service}`, {
        documentId: context.documentId,
        userId: context.userId,
        attemptNumber: context.attemptNumber
      });

      // Handle rollback if enabled
      if (this.options.enableRollback && this.options.rollbackOperations?.length) {
        await this.performRollback(enhancedError);
      }

      throw enhancedError;
    }
  }

  /**
   * Create undo/redo command for mutation
   */
  createUndoRedoCommand<TData>(
    operation: 'create' | 'update' | 'delete',
    service: DatabaseService<any>,
    data: any,
    result: TData
  ): MutationCommand {
    return {
      do: async () => {
        switch (operation) {
          case 'create':
            return await service.create(data);
          case 'update':
            return await service.update(data.id, data.data);
          case 'delete':
            return await service.delete(data);
        }
      },
      undo: async (result: any) => {
        switch (operation) {
          case 'create':
            if (result?.$id) {
              await service.delete(result.$id);
            }
            break;
          case 'update':
            if (data.previousData) {
              await service.update(data.id, data.previousData);
            }
            break;
          case 'delete':
            if (data.previousData) {
              await service.create(data.previousData);
            }
            break;
        }
      }
    };
  }

  /**
   * Enhance error with additional context and user-friendly messages
   */
  private enhanceError(error: any, context: MutationErrorContext): AppwriteError {
    const category = classifyError(error);
    const enhancedError: AppwriteError = {
      ...error,
      context: `${context.operation}-${context.service}`,
      timestamp: context.timestamp,
      category,
      retryCount: context.attemptNumber,
      userMessage: this.options.userFriendlyMessages !== false ?
        getUserFriendlyMessage(error) : undefined
    };

    return enhancedError;
  }

  /**
   * Perform rollback operations
   */
  private async performRollback(error: AppwriteError): Promise<void> {
    if (!this.options.rollbackOperations?.length) return;

    try {
      this.options.onRollbackStart?.();

      for (const rollbackOp of this.options.rollbackOperations) {
        await this.executeRollbackOperation(rollbackOp);
      }

      // Invalidate affected queries to ensure UI reflects rolled back state
      this.invalidateAffectedQueries();

      this.options.onRollbackComplete?.(true);
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      logAppwriteError(rollbackError, 'rollback-operation', { originalError: error });
      this.options.onRollbackComplete?.(false);
    }
  }

  /**
   * Execute a single rollback operation
   */
  private async executeRollbackOperation(operation: RollbackOperation<any>): Promise<void> {
    switch (operation.type) {
      case 'create':
        if (operation.documentId) {
          // Delete the created document
          await operation.service.delete(operation.documentId);
        }
        break;

      case 'update':
        if (operation.documentId && operation.rollbackData) {
          // Restore previous data
          await operation.service.update(operation.documentId, operation.rollbackData);
        }
        break;

      case 'delete':
        if (operation.previousData) {
          // Recreate the deleted document
          await operation.service.create(operation.previousData);
        }
        break;
    }
  }

  /**
   * Invalidate queries affected by rollback
   */
  private invalidateAffectedQueries(): void {
    // This would need to be implemented based on the specific query keys used
    // For now, we'll do a general invalidation
    this.queryClient.invalidateQueries();
  }

  /**
   * Generate recovery options based on error type
   */
  generateRecoveryOptions(error: AppwriteError, context: MutationErrorContext): RecoveryOption[] {
    const options: RecoveryOption[] = [];
    const category = error.category || classifyError(error);

    // Network/offline recovery options
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.OFFLINE) {
      options.push({
        id: 'retry-connection',
        label: 'Retry Connection',
        description: 'Check your internet connection and try again',
        action: async () => {
          // Implement connection retry logic
          await new Promise(resolve => setTimeout(resolve, 1000));
        },
        priority: 'high'
      });
    }

    // Authentication recovery options
    if (category === ErrorCategory.AUTHENTICATION) {
      options.push({
        id: 're-authenticate',
        label: 'Re-authenticate',
        description: 'Log in again to refresh your session',
        action: async () => {
          // This would trigger a re-authentication flow
          console.log('Triggering re-authentication flow');
        },
        priority: 'high'
      });
    }

    // Validation recovery options
    if (category === ErrorCategory.VALIDATION) {
      options.push({
        id: 'fix-validation',
        label: 'Review Input',
        description: 'Check your input data and correct any validation errors',
        action: async () => {
          // This would typically open a form for editing
          console.log('Opening input validation dialog');
        },
        priority: 'medium'
      });
    }

    // Conflict resolution options
    if (this.options.conflictResolution) {
      options.push({
        id: 'resolve-conflict',
        label: 'Resolve Conflict',
        description: 'Choose how to handle the data conflict',
        action: async () => {
          // This would open a conflict resolution dialog
          console.log('Opening conflict resolution dialog');
        },
        priority: 'medium'
      });
    }

    // Generic retry option
    if (error.retryCount !== undefined && error.retryCount < (this.options.retryConfig?.maxRetries || 3)) {
      options.push({
        id: 'retry-operation',
        label: 'Retry Operation',
        description: 'Try the operation again',
        action: async () => {
          // Retry logic would be handled by the calling component
          console.log('Retrying operation');
        },
        priority: 'low'
      });
    }

    return options.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Handle conflict resolution
   */
  async resolveConflict(
    localData: T,
    serverData: T,
    strategy?: 'client-wins' | 'server-wins' | 'merge' | 'manual'
  ): Promise<T> {
    return this.conflictResolver.resolveConflict(
      localData,
      serverData,
      strategy || this.options.conflictResolution?.strategy || 'client-wins'
    );
  }

  /**
   * Check for version conflicts
   */
  hasVersionConflict(localData: T, serverData: T): boolean {
    return this.conflictResolver.hasVersionConflict(localData, serverData);
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return this.dataRecovery.retryOperation(operation, maxRetries, baseDelay);
  }
}

// =============================================================================
// ENHANCED MUTATION HOOKS
// =============================================================================

/**
 * Enhanced create mutation hook with comprehensive error handling
 */
export function useEnhancedCreateMutation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: EnhancedMutationOptions & UseMutationOptions<T, AppwriteError, Omit<T, keyof AppwriteDocument>>
) {
  const [errorState, setErrorState] = useState<MutationErrorState>({
    hasError: false,
    recoveryOptions: [],
    isRecovering: false,
    rollbackStatus: 'idle'
  });

  const errorHandler = new MutationErrorHandler(service, options);

  const mutation = useMutation({
    mutationFn: async (data: Omit<T, keyof AppwriteDocument>) => {
      const context: MutationErrorContext = {
        operation: 'create',
        service: service.constructor.name,
        timestamp: new Date().toISOString(),
        attemptNumber: 0
      };

      const result = await errorHandler.executeWithErrorHandling(
        () => service.create(data),
        context
      );

      // Add to undo/redo history if enabled
      if (options?.enableUndoRedo) {
        const command = errorHandler.createUndoRedoCommand('create', service, data, result);
        await undoRedoManager.execute(command);
      }

      return result;
    },
    onError: (error, variables, context) => {
      const recoveryOptions = errorHandler.generateRecoveryOptions(error, {
        operation: 'create',
        service: service.constructor.name,
        timestamp: new Date().toISOString(),
        attemptNumber: error.retryCount || 0
      });

      setErrorState({
        hasError: true,
        error,
        recoveryOptions,
        isRecovering: false,
        rollbackStatus: options?.enableRollback ? 'completed' : 'idle'
      });

      options?.onRecoveryOptions?.(recoveryOptions);
      // Skip custom onError to avoid type issues - error handling is done via errorState
    },
    onSettled: (data, error, variables, context) => {
      if (!error) {
        setErrorState({
          hasError: false,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        });
      }
      // Skip custom onSettled to avoid type issues - state management is done via errorState
    },
    ...options
  });

  return {
    ...mutation,
    errorState,
    retryWithBackoff: useCallback((data: Omit<T, keyof AppwriteDocument>) => {
      setErrorState(prev => ({ ...prev, isRecovering: true }));
      return mutation.mutateAsync(data).finally(() => {
        setErrorState(prev => ({ ...prev, isRecovering: false }));
      });
    }, [mutation])
  };
}

/**
 * Enhanced update mutation hook with conflict resolution
 */
export function useEnhancedUpdateMutation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: EnhancedMutationOptions & UseMutationOptions<T, AppwriteError, { id: string; data: Partial<Omit<T, keyof AppwriteDocument>> }>
) {
  const [errorState, setErrorState] = useState<MutationErrorState>({
    hasError: false,
    recoveryOptions: [],
    isRecovering: false,
    rollbackStatus: 'idle'
  });

  const errorHandler = new MutationErrorHandler(service, options);

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<T, keyof AppwriteDocument>> }) => {
      const context: MutationErrorContext = {
        operation: 'update',
        service: service.constructor.name,
        documentId: id,
        timestamp: new Date().toISOString(),
        attemptNumber: 0
      };

      // Get previous data for undo
      const previousData = await service.get(id).catch(() => null);

      const result = await errorHandler.executeWithErrorHandling(
        () => service.update(id, data),
        context
      );

      // Add to undo/redo history if enabled
      if (options?.enableUndoRedo) {
        const command = errorHandler.createUndoRedoCommand('update', service, { id, data, previousData }, result);
        await undoRedoManager.execute(command);
      }

      return result;
    },
    onError: (error, variables, context) => {
      const recoveryOptions = errorHandler.generateRecoveryOptions(error, {
        operation: 'update',
        service: service.constructor.name,
        documentId: variables.id,
        timestamp: new Date().toISOString(),
        attemptNumber: error.retryCount || 0
      });

      setErrorState({
        hasError: true,
        error,
        recoveryOptions,
        isRecovering: false,
        rollbackStatus: options?.enableRollback ? 'completed' : 'idle'
      });

      options?.onRecoveryOptions?.(recoveryOptions);
      // Skip custom onError to avoid type issues - error handling is done via errorState
    },
    onSettled: (data, error, variables, context) => {
      if (!error) {
        setErrorState({
          hasError: false,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        });
      }
      // Skip custom onSettled to avoid type issues - state management is done via errorState
    },
    ...options
  });

  return {
    ...mutation,
    errorState,
    resolveConflict: useCallback(async (localData: T, serverData: T) => {
      return errorHandler.resolveConflict(localData, serverData);
    }, [errorHandler]),
    hasVersionConflict: useCallback((localData: T, serverData: T) => {
      return errorHandler.hasVersionConflict(localData, serverData);
    }, [errorHandler])
  };
}

/**
 * Enhanced delete mutation hook with rollback capabilities
 */
export function useEnhancedDeleteMutation<T extends AppwriteDocument>(
  service: DatabaseService<T>,
  queryKeys: string[][],
  options?: EnhancedMutationOptions & UseMutationOptions<void, AppwriteError, string>
) {
  const [errorState, setErrorState] = useState<MutationErrorState>({
    hasError: false,
    recoveryOptions: [],
    isRecovering: false,
    rollbackStatus: 'idle'
  });

  const errorHandler = new MutationErrorHandler(service, options);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const context: MutationErrorContext = {
        operation: 'delete',
        service: service.constructor.name,
        documentId: id,
        timestamp: new Date().toISOString(),
        attemptNumber: 0
      };

      // Get previous data for undo
      const previousData = await service.get(id).catch(() => null);

      const result = await errorHandler.executeWithErrorHandling(
        () => service.delete(id),
        context
      );

      // Add to undo/redo history if enabled
      if (options?.enableUndoRedo) {
        const command = errorHandler.createUndoRedoCommand('delete', service, { id, previousData }, result);
        await undoRedoManager.execute(command);
      }

      return result;
    },
    onError: (error, variables, context) => {
      const recoveryOptions = errorHandler.generateRecoveryOptions(error, {
        operation: 'delete',
        service: service.constructor.name,
        documentId: variables,
        timestamp: new Date().toISOString(),
        attemptNumber: error.retryCount || 0
      });

      setErrorState({
        hasError: true,
        error,
        recoveryOptions,
        isRecovering: false,
        rollbackStatus: options?.enableRollback ? 'completed' : 'idle'
      });

      options?.onRecoveryOptions?.(recoveryOptions);
      // Skip custom onError to avoid type issues - error handling is done via errorState
    },
    onSettled: (data, error, variables, context) => {
      if (!error) {
        setErrorState({
          hasError: false,
          recoveryOptions: [],
          isRecovering: false,
          rollbackStatus: 'idle'
        });
      }
      // Skip custom onSettled to avoid type issues - state management is done via errorState
    },
    ...options
  });

  return {
    ...mutation,
    errorState,
    retryWithBackoff: useCallback((id: string) => {
      setErrorState(prev => ({ ...prev, isRecovering: true }));
      return mutation.mutateAsync(id).finally(() => {
        setErrorState(prev => ({ ...prev, isRecovering: false }));
      });
    }, [mutation])
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create rollback operation for create mutations
 */
export function createRollbackOperation<T extends AppwriteDocument>(
  type: 'create' | 'update' | 'delete',
  service: DatabaseService<T>,
  documentId?: string,
  previousData?: T,
  rollbackData?: Partial<T>
): RollbackOperation<T> {
  return {
    type,
    service,
    documentId,
    previousData,
    rollbackData
  };
}

/**
 * Format error for user display with recovery suggestions
 */
export function formatErrorWithRecovery(
  error: AppwriteError,
  recoveryOptions: RecoveryOption[]
): {
  title: string;
  message: string;
  recoveryOptions: RecoveryOption[];
  severity: 'error' | 'warning' | 'info';
} {
  const category = error.category || classifyError(error);

  let severity: 'error' | 'warning' | 'info' = 'error';
  let title = 'Operation Failed';

  switch (category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.OFFLINE:
      severity = 'warning';
      title = 'Connection Issue';
      break;
    case ErrorCategory.VALIDATION:
      severity = 'warning';
      title = 'Invalid Input';
      break;
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      severity = 'error';
      title = 'Access Denied';
      break;
    default:
      severity = 'error';
      title = 'Operation Failed';
  }

  return {
    title,
    message: error.userMessage || getUserFriendlyMessage(error),
    recoveryOptions,
    severity
  };
}

export default {
  MutationErrorHandler,
  useEnhancedCreateMutation,
  useEnhancedUpdateMutation,
  useEnhancedDeleteMutation,
  createRollbackOperation,
  formatErrorWithRecovery
};