/**
 * PermissionValidator - Enhanced collection-level permission validation utility
 * Based on BE-AW-10 ticket requirements
 * 
 * This class extends the existing permission system with specific collection-level
 * permission logic, integrating with TeamPermissionChecker and FacilityTeamManager.
 */

const { Client, Databases, Users } = require('node-appwrite');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');
const { getRolePermissions, canPerformOperation, isFacilityScoped } = require('./permission-helpers');

// Import configuration
const teamPermissions = require('../config/team-permissions.json');
const roleDefinitions = require('../config/role-definitions.json');
const { ROLE_LABELS } = require('../config/roles');

/**
 * Role-based permissions mapping for collections
 * Maps each role to their allowed operations on each collection
 */
const ROLE_PERMISSIONS = {
  [ROLE_LABELS.ADMINISTRATOR]: {
    patients: ['create', 'read', 'update', 'delete'],
    immunization_records: ['create', 'read', 'update', 'delete'],
    facilities: ['create', 'read', 'update', 'delete'],
    vaccines: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    vaccine_schedules: ['create', 'read', 'update', 'delete'],
    vaccine_schedule_items: ['create', 'read', 'update', 'delete'],
    supplementary_immunizations: ['create', 'read', 'update', 'delete']
  },
  
  facility_manager: {
    patients: ['create', 'read', 'update'],
    immunization_records: ['create', 'read', 'update'],
    facilities: ['read', 'update'],
    vaccines: ['read'],
    notifications: ['create', 'read', 'update'],
    users: ['create', 'read', 'update'],
    reports: ['create', 'read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['create', 'read', 'update']
  },
  
  healthcare_worker: {
    patients: ['create', 'read', 'update'],
    immunization_records: ['create', 'read', 'update'],
    facilities: ['read'],
    vaccines: ['read'],
    notifications: ['read', 'update'],
    users: ['read'],
    reports: ['read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['create', 'read', 'update']
  },
  
  data_entry_clerk: {
    patients: ['create', 'read', 'update'],
    immunization_records: ['create', 'read'],
    facilities: ['read'],
    vaccines: ['read'],
    notifications: ['read'],
    users: ['read'],
    reports: ['read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['create', 'read']
  }
};

class PermissionValidator {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
    
    // Initialize related managers
    this.teamChecker = new TeamPermissionChecker(options);
    this.teamManager = new FacilityTeamManager(options);
    this.roleManager = new RoleManager(options);
    
    // Configuration
    this.config = {
      databaseId: options.databaseId || process.env.APPWRITE_DATABASE_ID,
      cacheEnabled: options.cacheEnabled !== false,
      strictMode: options.strictMode !== false,
      ...options.config
    };
    
    // Permission cache
    this.permissionCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Check if user can access a specific collection with given operation
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} operation - Operation (create, read, update, delete)
   * @returns {Promise<Object>} Permission check result
   */
  async canAccessCollection(userId, collectionId, operation) {
    try {
      if (!userId || !collectionId || !operation) {
        throw new Error('User ID, collection ID, and operation are required');
      }

      // Generate cache key
      const cacheKey = `collection:${userId}:${collectionId}:${operation}`;
      
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this._getFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      // Get user role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        const result = this._createResult(false, 'Could not determine user role', { userId, collectionId, operation });
        this._cacheResult(cacheKey, result);
        return result;
      }

      // Check role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[roleInfo.role];
      if (!rolePermissions) {
        const result = this._createResult(false, `Unknown role: ${roleInfo.role}`, { userId, collectionId, operation, role: roleInfo.role });
        this._cacheResult(cacheKey, result);
        return result;
      }

      const collectionPermissions = rolePermissions[collectionId];
      if (!collectionPermissions || !collectionPermissions.includes(operation)) {
        const result = this._createResult(false, `Role ${roleInfo.role} does not have ${operation} permission on ${collectionId}`, {
          userId, collectionId, operation, role: roleInfo.role, availableOperations: collectionPermissions || []
        });
        this._cacheResult(cacheKey, result);
        return result;
      }

      // For facility-scoped roles, additional validation through team system
      if (roleInfo.role !== ROLE_LABELS.ADMINISTRATOR && roleInfo.facilityId) {
        const teamCheck = await this.teamChecker.checkPermission(userId, collectionId, operation, {
          facilityId: roleInfo.facilityId
        });
        
        if (!teamCheck.allowed) {
          const result = this._createResult(false, `Team-based validation failed: ${teamCheck.reason}`, {
            userId, collectionId, operation, role: roleInfo.role, facilityId: roleInfo.facilityId, teamCheckReason: teamCheck.reason
          });
          this._cacheResult(cacheKey, result);
          return result;
        }
      }

      const result = this._createResult(true, 'Permission granted', {
        userId, collectionId, operation, role: roleInfo.role, facilityId: roleInfo.facilityId
      });
      this._cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error checking collection access:', error);
      const result = this._createResult(false, `Permission check failed: ${error.message}`, { userId, collectionId, operation });
      return result;
    }
  }

  /**
   * Check if user can access a specific document
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} documentId - Document ID
   * @param {string} operation - Operation (create, read, update, delete)
   * @returns {Promise<Object>} Permission check result
   */
  async canAccessDocument(userId, collectionId, documentId, operation) {
    try {
      if (!userId || !collectionId || !documentId || !operation) {
        throw new Error('User ID, collection ID, document ID, and operation are required');
      }

      // First check collection-level permissions
      const collectionAccess = await this.canAccessCollection(userId, collectionId, operation);
      if (!collectionAccess.allowed) {
        return {
          ...collectionAccess,
          documentId,
          reason: `Collection access denied: ${collectionAccess.reason}`
        };
      }

      // Get document to check facility-specific access
      let document;
      try {
        document = await this.databases.getDocument(this.config.databaseId, collectionId, documentId);
      } catch (error) {
        return this._createResult(false, `Document not found or inaccessible: ${error.message}`, {
          userId, collectionId, documentId, operation
        });
      }

      // Validate resource access through team system
      const resourceAccess = await this.teamChecker.validateResourceAccess(userId, collectionId, documentId, document);
      if (!resourceAccess.valid) {
        return this._createResult(false, `Document access denied: ${resourceAccess.reason}`, {
          userId, collectionId, documentId, operation, resourceValidation: resourceAccess
        });
      }

      return this._createResult(true, 'Document access granted', {
        userId, collectionId, documentId, operation, document: { $id: document.$id, facilityId: document.facilityId || document.facility_id }
      });

    } catch (error) {
      console.error('Error checking document access:', error);
      return this._createResult(false, `Document access check failed: ${error.message}`, {
        userId, collectionId, documentId, operation
      });
    }
  }

  /**
   * Check if user can access facility-scoped document
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Permission check result
   */
  async canAccessFacilityDocument(userId, collectionId, documentId) {
    try {
      if (!userId || !collectionId || !documentId) {
        throw new Error('User ID, collection ID, and document ID are required');
      }

      // Get user's role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return this._createResult(false, 'Could not determine user role', { userId, collectionId, documentId });
      }

      // Administrators can access all facility documents
      if (roleInfo.role === ROLE_LABELS.ADMINISTRATOR) {
        return this._createResult(true, 'Administrator access granted', {
          userId, collectionId, documentId, role: roleInfo.role, accessType: 'admin'
        });
      }

      // Get document to check facility
      let document;
      try {
        document = await this.databases.getDocument(this.config.databaseId, collectionId, documentId);
      } catch (error) {
        return this._createResult(false, `Document not found: ${error.message}`, { userId, collectionId, documentId });
      }

      const documentFacilityId = document.facilityId || document.facility_id;
      if (!documentFacilityId) {
        return this._createResult(false, 'Document does not have facility information', {
          userId, collectionId, documentId, document: { $id: document.$id }
        });
      }

      // Check if user belongs to the document's facility
      const facilityAccess = await this.teamChecker.checkFacilityAccess(userId, documentFacilityId);
      if (!facilityAccess.allowed) {
        return this._createResult(false, `User cannot access facility ${documentFacilityId}: ${facilityAccess.reason}`, {
          userId, collectionId, documentId, documentFacilityId, userFacilityId: roleInfo.facilityId
        });
      }

      return this._createResult(true, 'Facility document access granted', {
        userId, collectionId, documentId, role: roleInfo.role, facilityId: documentFacilityId, accessType: 'facility_member'
      });

    } catch (error) {
      console.error('Error checking facility document access:', error);
      return this._createResult(false, `Facility document access check failed: ${error.message}`, {
        userId, collectionId, documentId
      });
    }
  }

  /**
   * Validate multiple permissions at once
   * @param {string} userId - User ID
   * @param {Array} permissions - Array of permission objects {collectionId, operation, documentId?}
   * @returns {Promise<Object>} Batch validation result
   */
  async validateBatchPermissions(userId, permissions) {
    try {
      if (!userId || !Array.isArray(permissions)) {
        throw new Error('User ID and permissions array are required');
      }

      const results = [];
      const errors = [];

      for (const permission of permissions) {
        try {
          let result;
          if (permission.documentId) {
            result = await this.canAccessDocument(userId, permission.collectionId, permission.documentId, permission.operation);
          } else {
            result = await this.canAccessCollection(userId, permission.collectionId, permission.operation);
          }
          
          results.push({
            ...permission,
            allowed: result.allowed,
            reason: result.reason
          });
        } catch (error) {
          errors.push({
            ...permission,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: permissions.length,
          allowed: results.filter(r => r.allowed).length,
          denied: results.filter(r => !r.allowed).length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('Error validating batch permissions:', error);
      return {
        success: false,
        error: error.message,
        results: [],
        errors: []
      };
    }
  }

  /**
   * Get user's effective permissions for a collection
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {string} facilityId - Optional facility ID for scoped permissions
   * @returns {Promise<Object>} User's effective permissions
   */
  async getUserCollectionPermissions(userId, collectionId, facilityId = null) {
    try {
      if (!userId || !collectionId) {
        throw new Error('User ID and collection ID are required');
      }

      // Get user role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          permissions: []
        };
      }

      // Get role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[roleInfo.role];
      const collectionPermissions = rolePermissions?.[collectionId] || [];

      // For facility-scoped access, get team-based permissions
      let teamPermissions = null;
      if (roleInfo.role !== ROLE_LABELS.ADMINISTRATOR && (facilityId || roleInfo.facilityId)) {
        const targetFacilityId = facilityId || roleInfo.facilityId;
        teamPermissions = await this.teamChecker.getUserEffectivePermissions(userId, targetFacilityId);
      }

      return {
        success: true,
        userId,
        collectionId,
        role: roleInfo.role,
        facilityId: facilityId || roleInfo.facilityId,
        permissions: collectionPermissions,
        teamPermissions: teamPermissions?.permissions?.collections?.[collectionId] || null,
        accessType: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'global_admin' : 'facility_scoped'
      };

    } catch (error) {
      console.error('Error getting user collection permissions:', error);
      return {
        success: false,
        error: error.message,
        permissions: []
      };
    }
  }

  // Private helper methods

  /**
   * Create standardized result object
   * @private
   */
  _createResult(allowed, reason, details = {}) {
    return {
      allowed,
      reason,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Cache permission result
   * @private
   */
  _cacheResult(key, result) {
    if (!this.config.cacheEnabled) return;

    this.permissionCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.permissionCache.size > 1000) {
      const oldestKey = this.permissionCache.keys().next().value;
      this.permissionCache.delete(oldestKey);
    }
  }

  /**
   * Get result from cache
   * @private
   */
  _getFromCache(key) {
    const cached = this.permissionCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.permissionCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear permission cache
   */
  clearCache() {
    this.permissionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.permissionCache.size,
      maxAge: this.cacheTimeout
    };
  }
}

// Export the class and role permissions constant
module.exports = {
  PermissionValidator,
  ROLE_PERMISSIONS
};