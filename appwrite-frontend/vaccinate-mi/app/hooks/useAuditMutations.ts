import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete } from '../services/optimisticUpdates';
import { useEnhancedCreateMutation, useEnhancedUpdateMutation, useEnhancedDeleteMutation } from '../services/mutationErrorHandler';
import { DatabaseService } from '../services/appwriteDatabase';
import { COLLECTION_IDS } from '../services/appwrite';
import type { AccessAuditLog, AuditCollection, RoleChangeLog } from '../types/appwrite';

// Query keys for audit logs
export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...auditKeys.lists(), filters] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
  accessAudit: () => [...auditKeys.all, 'accessAudit'] as const,
  auditCollections: () => [...auditKeys.all, 'auditCollections'] as const,
  roleChanges: () => [...auditKeys.all, 'roleChanges'] as const,
  byUser: (userId: string) => [...auditKeys.all, 'user', userId] as const,
  byResource: (resourceType: string, resourceId: string) => [...auditKeys.all, 'resource', resourceType, resourceId] as const,
  recent: () => [...auditKeys.all, 'recent'] as const,
};

/**
 * Access Audit Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateAccessAuditLog = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useOptimisticCreate<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ]
  );
};

/**
 * Access Audit Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateAccessAuditLog = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useOptimisticUpdate<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ]
  );
};

/**
 * Access Audit Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteAccessAuditLog = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useOptimisticDelete<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ]
  );
};

/**
 * Audit Collections mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateAuditCollection = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useOptimisticCreate<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ]
  );
};

/**
 * Audit Collections mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateAuditCollection = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useOptimisticUpdate<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ]
  );
};

/**
 * Audit Collections mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteAuditCollection = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useOptimisticDelete<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ]
  );
};

/**
 * Role Change Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useCreateRoleChangeLog = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useOptimisticCreate<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ]
  );
};

/**
 * Role Change Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useUpdateRoleChangeLog = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useOptimisticUpdate<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ]
  );
};

/**
 * Role Change Log mutations with optimistic updates (legacy)
 * @deprecated Use enhanced mutation hooks for better error handling and rollback capabilities
 */
export const useDeleteRoleChangeLog = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useOptimisticDelete<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ]
  );
};

/**
 * Enhanced access audit log mutations with comprehensive error handling and rollback
 */
export const useCreateAccessAuditLogEnhanced = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useEnhancedCreateMutation<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useUpdateAccessAuditLogEnhanced = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useEnhancedUpdateMutation<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useDeleteAccessAuditLogEnhanced = () => {
  const accessAuditLogService = new DatabaseService<AccessAuditLog>(COLLECTION_IDS.ACCESS_AUDIT_LOG);
  return useEnhancedDeleteMutation<AccessAuditLog>(
    accessAuditLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.accessAudit()], // Invalidate access audit queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

/**
 * Enhanced audit collections mutations with comprehensive error handling and rollback
 */
export const useCreateAuditCollectionEnhanced = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useEnhancedCreateMutation<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useUpdateAuditCollectionEnhanced = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useEnhancedUpdateMutation<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useDeleteAuditCollectionEnhanced = () => {
  const auditCollectionService = new DatabaseService<AuditCollection>('audit-collections');
  return useEnhancedDeleteMutation<AuditCollection>(
    auditCollectionService,
    [
      [...auditKeys.lists()],
      [...auditKeys.auditCollections()], // Invalidate audit collections queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

/**
 * Enhanced role change log mutations with comprehensive error handling and rollback
 */
export const useCreateRoleChangeLogEnhanced = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useEnhancedCreateMutation<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useUpdateRoleChangeLogEnhanced = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useEnhancedUpdateMutation<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export const useDeleteRoleChangeLogEnhanced = () => {
  const roleChangeLogService = new DatabaseService<RoleChangeLog>(COLLECTION_IDS.ROLE_CHANGE_LOG);
  return useEnhancedDeleteMutation<RoleChangeLog>(
    roleChangeLogService,
    [
      [...auditKeys.lists()],
      [...auditKeys.roleChanges()], // Invalidate role changes queries
    ],
    {
      enableRollback: false, // Audit logs should not be rolled back
      retryConfig: {
        maxRetries: 2, // Fewer retries for delete operations
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 2
      },
      userFriendlyMessages: false // Audit operations are internal
    }
  );
};

export default {
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
};