/**
 * TeamPermissionChecker - Utility class for validating team-based permissions and access control
 * Based on BE-AW-09 ticket requirements
 * 
 * This class provides comprehensive permission checking functionality including:
 * - Team-based access control validation
 * - Facility-scoped permission enforcement
 * - Cross-facility access validation for administrators
 * - Resource-level permission checking
 * - Efficient permission caching and lookup
 */

const { Client, Teams, Users } = require('node-appwrite');
const {
  TEAM_NAMING,
  TEAM_ROLES,
  TEAM_PERMISSIONS,
  generateFacilityTeamName,
  parseFacilityIdFromTeamName,
  isFacilityTeam,
  isGlobalAdminTeam,
  hasHigherOrEqualRole,
  getTeamRolePermissions
} = require('../config/team-structure');

const teamPermissions = require('../config/team-permissions.json');
const facilityTeamMapping = require('../config/facility-team-mapping.json');
const FacilityTeamManager = require('./facility-team-manager');

class TeamPermissionChecker {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.teams = new Teams(this.client);
    this.users = new Users(this.client);
    
    // Initialize team manager
    this.teamManager = new FacilityTeamManager(options);
    
    // Initialize permission cache
    this.permissionCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    this.maxCacheSize = options.maxCacheSize || 1000;
    
    // Configuration
    this.config = {
      strictMode: options.strictMode !== false, // Default to strict mode
      logAccessAttempts: options.logAccessAttempts !== false,
      cacheEnabled: options.cacheEnabled !== false,
      ...options.config
    };
  }

  /**
   * Check if user has permission to perform operation on resource
   * @param {string} userId - User ID
   * @param {string} resource - Resource name (e.g., 'patients', 'reports')
   * @param {string} operation - Operation name (e.g., 'create', 'read', 'update', 'delete')
   * @param {Object} context - Additional context (facilityId, resourceId, etc.)
   * @returns {Promise<Object>} Permission check result
   */
  async checkPermission(userId, resource, operation, context = {}) {
    try {
      if (!userId || !resource || !operation) {
        throw new Error('User ID, resource, and operation are required');
      }

      // Generate cache key
      const cacheKey = this._generatePermissionCacheKey(userId, resource, operation, context);
      
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this._getPermissionFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      // Get user's team memberships
      const userTeams = await this.teamManager.getUserTeams(userId);
      if (!userTeams || userTeams.length === 0) {
        const result = this._createPermissionResult(false, 'User has no team memberships');
        this._cachePermissionResult(cacheKey, result);
        return result;
      }

      // Check global admin access first
      const globalAdminAccess = await this._checkGlobalAdminAccess(userTeams, resource, operation);
      if (globalAdminAccess.allowed) {
        const result = this._createPermissionResult(true, 'Global admin access', globalAdminAccess);
        this._cachePermissionResult(cacheKey, result);
        return result;
      }

      // Check facility-specific access
      const facilityAccess = await this._checkFacilityAccess(userTeams, resource, operation, context);
      const result = this._createPermissionResult(facilityAccess.allowed, facilityAccess.reason, facilityAccess);
      
      // Cache the result
      this._cachePermissionResult(cacheKey, result);

      // Log access attempt if enabled
      if (this.config.logAccessAttempts) {
        this._logAccessAttempt(userId, resource, operation, context, result);
      }

      return result;

    } catch (error) {
      console.error('Error checking permission:', error);
      const result = this._createPermissionResult(false, `Permission check failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Check if user can access specific facility
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID to check access for
   * @returns {Promise<Object>} Access check result
   */
  async checkFacilityAccess(userId, facilityId) {
    try {
      if (!userId || !facilityId) {
        throw new Error('User ID and facility ID are required');
      }

      // Get user's team memberships
      const userTeams = await this.teamManager.getUserTeams(userId);
      if (!userTeams || userTeams.length === 0) {
        return this._createAccessResult(false, 'User has no team memberships');
      }

      // Check if user is global admin
      const isGlobalAdmin = userTeams.some(membership => 
        isGlobalAdminTeam(membership.team.name)
      );

      if (isGlobalAdmin) {
        return this._createAccessResult(true, 'Global admin access', {
          accessType: 'global_admin',
          facilityId
        });
      }

      // Check if user belongs to the specific facility team
      const facilityMembership = userTeams.find(membership => 
        membership.facilityId === facilityId
      );

      if (facilityMembership) {
        return this._createAccessResult(true, 'Facility team member', {
          accessType: 'facility_member',
          facilityId,
          teamRole: facilityMembership.roles[0],
          teamId: facilityMembership.teamId
        });
      }

      return this._createAccessResult(false, 'User does not belong to facility team');

    } catch (error) {
      console.error('Error checking facility access:', error);
      return this._createAccessResult(false, `Facility access check failed: ${error.message}`);
    }
  }

  /**
   * Check if user can perform team management operations
   * @param {string} userId - User ID
   * @param {string} operation - Team operation (e.g., 'addMember', 'removeMember', 'updateRole')
   * @param {Object} context - Operation context (targetUserId, teamId, facilityId, etc.)
   * @returns {Promise<Object>} Permission check result
   */
  async checkTeamManagementPermission(userId, operation, context = {}) {
    try {
      if (!userId || !operation) {
        throw new Error('User ID and operation are required');
      }

      // Get team management rules
      const managementRules = teamPermissions.teamManagementRules[operation];
      if (!managementRules) {
        return this._createPermissionResult(false, `Unknown team management operation: ${operation}`);
      }

      // Get user's team memberships
      const userTeams = await this.teamManager.getUserTeams(userId);
      if (!userTeams || userTeams.length === 0) {
        return this._createPermissionResult(false, 'User has no team memberships');
      }

      // Check if user is global admin
      const isGlobalAdmin = userTeams.some(membership => 
        isGlobalAdminTeam(membership.team.name)
      );

      if (isGlobalAdmin) {
        return this._createPermissionResult(true, 'Global admin can perform all team management operations');
      }

      // Check facility-specific team management permissions
      if (context.facilityId) {
        const facilityMembership = userTeams.find(membership => 
          membership.facilityId === context.facilityId
        );

        if (facilityMembership && facilityMembership.roles.includes(TEAM_ROLES.OWNER)) {
          // Additional checks for specific operations
          if (operation === 'updateMemberRole' && context.newRole) {
            // Check role hierarchy - owners can't promote someone to owner
            if (context.newRole === TEAM_ROLES.OWNER) {
              return this._createPermissionResult(false, 'Facility owners cannot promote users to owner role');
            }
          }

          return this._createPermissionResult(true, 'Facility team owner can manage team members');
        }
      }

      return this._createPermissionResult(false, 'Insufficient permissions for team management operation');

    } catch (error) {
      console.error('Error checking team management permission:', error);
      return this._createPermissionResult(false, `Team management permission check failed: ${error.message}`);
    }
  }

  /**
   * Validate resource access based on team membership and facility scope
   * @param {string} userId - User ID
   * @param {string} resourceType - Type of resource (e.g., 'patient', 'immunization_record')
   * @param {string} resourceId - Resource ID
   * @param {Object} resourceData - Resource data containing facility information
   * @returns {Promise<Object>} Validation result
   */
  async validateResourceAccess(userId, resourceType, resourceId, resourceData = {}) {
    try {
      if (!userId || !resourceType || !resourceId) {
        throw new Error('User ID, resource type, and resource ID are required');
      }

      // Extract facility ID from resource data
      const resourceFacilityId = resourceData.facilityId || resourceData.facility_id;
      if (!resourceFacilityId) {
        return this._createValidationResult(false, 'Resource does not have facility information');
      }

      // Check if user can access the resource's facility
      const facilityAccess = await this.checkFacilityAccess(userId, resourceFacilityId);
      if (!facilityAccess.allowed) {
        return this._createValidationResult(false, 'User cannot access resource facility', {
          resourceType,
          resourceId,
          facilityId: resourceFacilityId,
          reason: facilityAccess.reason
        });
      }

      // Additional resource-specific validation
      const resourceValidation = await this._validateResourceSpecificAccess(
        userId, 
        resourceType, 
        resourceData, 
        facilityAccess
      );

      return this._createValidationResult(
        resourceValidation.valid, 
        resourceValidation.reason,
        {
          resourceType,
          resourceId,
          facilityId: resourceFacilityId,
          accessType: facilityAccess.details?.accessType,
          ...resourceValidation.details
        }
      );

    } catch (error) {
      console.error('Error validating resource access:', error);
      return this._createValidationResult(false, `Resource access validation failed: ${error.message}`);
    }
  }

  /**
   * Get user's effective permissions for a facility
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID
   * @returns {Promise<Object>} User's effective permissions
   */
  async getUserEffectivePermissions(userId, facilityId) {
    try {
      if (!userId || !facilityId) {
        throw new Error('User ID and facility ID are required');
      }

      // Get user's team memberships
      const userTeams = await this.teamManager.getUserTeams(userId);
      if (!userTeams || userTeams.length === 0) {
        return {
          success: false,
          permissions: {},
          reason: 'User has no team memberships'
        };
      }

      // Check if user is global admin
      const globalAdminMembership = userTeams.find(membership => 
        isGlobalAdminTeam(membership.team.name)
      );

      if (globalAdminMembership) {
        return {
          success: true,
          permissions: teamPermissions.globalAdminTeam.permissions,
          accessType: 'global_admin',
          facilityId,
          teamRole: globalAdminMembership.roles[0]
        };
      }

      // Get facility-specific permissions
      const facilityMembership = userTeams.find(membership => 
        membership.facilityId === facilityId
      );

      if (!facilityMembership) {
        return {
          success: false,
          permissions: {},
          reason: 'User is not a member of the facility team'
        };
      }

      const teamRole = facilityMembership.roles[0] || TEAM_ROLES.MEMBER;
      const rolePermissions = teamPermissions.facilityTeams.roles[teamRole];

      return {
        success: true,
        permissions: rolePermissions?.permissions || {},
        accessType: 'facility_member',
        facilityId,
        teamRole,
        teamId: facilityMembership.teamId
      };

    } catch (error) {
      console.error('Error getting user effective permissions:', error);
      return {
        success: false,
        permissions: {},
        error: error.message
      };
    }
  }

  // Private helper methods

  /**
   * Check global admin access
   * @private
   */
  async _checkGlobalAdminAccess(userTeams, resource, operation) {
    const globalAdminMembership = userTeams.find(membership => 
      isGlobalAdminTeam(membership.team.name)
    );

    if (!globalAdminMembership) {
      return { allowed: false, reason: 'Not a global admin' };
    }

    const globalPermissions = teamPermissions.globalAdminTeam.permissions.collections[resource];
    if (!globalPermissions) {
      return { allowed: false, reason: 'Resource not found in global admin permissions' };
    }

    const hasOperation = globalPermissions.operations.includes(operation);
    return {
      allowed: hasOperation,
      reason: hasOperation ? 'Global admin access granted' : 'Operation not allowed for global admin',
      accessType: 'global_admin',
      teamRole: globalAdminMembership.roles[0]
    };
  }

  /**
   * Check facility-specific access
   * @private
   */
  async _checkFacilityAccess(userTeams, resource, operation, context) {
    // If context has facilityId, check specific facility access
    if (context.facilityId) {
      const facilityMembership = userTeams.find(membership => 
        membership.facilityId === context.facilityId
      );

      if (!facilityMembership) {
        return { allowed: false, reason: 'User is not a member of the required facility team' };
      }

      return this._checkRolePermissions(facilityMembership.roles[0], resource, operation, context);
    }

    // Check if user has access through any facility team
    for (const membership of userTeams) {
      if (isFacilityTeam(membership.team.name)) {
        const roleCheck = this._checkRolePermissions(membership.roles[0], resource, operation, context);
        if (roleCheck.allowed) {
          return {
            ...roleCheck,
            facilityId: membership.facilityId,
            teamId: membership.teamId
          };
        }
      }
    }

    return { allowed: false, reason: 'No facility team membership grants required permission' };
  }

  /**
   * Check role-specific permissions
   * @private
   */
  _checkRolePermissions(teamRole, resource, operation, context) {
    const rolePermissions = teamPermissions.facilityTeams.roles[teamRole];
    if (!rolePermissions) {
      return { allowed: false, reason: 'Invalid team role' };
    }

    const resourcePermissions = rolePermissions.permissions.collections[resource];
    if (!resourcePermissions) {
      return { allowed: false, reason: 'Resource not found in role permissions' };
    }

    const hasOperation = resourcePermissions.operations.includes(operation);
    if (!hasOperation) {
      return { allowed: false, reason: 'Operation not allowed for role' };
    }

    // Check additional conditions
    const conditionCheck = this._checkPermissionConditions(resourcePermissions.conditions, context);
    if (!conditionCheck.valid) {
      return { allowed: false, reason: conditionCheck.reason };
    }

    return {
      allowed: true,
      reason: 'Role-based permission granted',
      accessType: 'facility_member',
      teamRole
    };
  }

  /**
   * Check permission conditions
   * @private
   */
  _checkPermissionConditions(conditions, context) {
    if (!conditions || conditions.length === 0) {
      return { valid: true };
    }

    for (const condition of conditions) {
      switch (condition) {
        case 'facility_match':
          if (!context.facilityId) {
            return { valid: false, reason: 'Facility ID required for facility_match condition' };
          }
          break;
        case 'team_match':
          if (!context.teamId) {
            return { valid: false, reason: 'Team ID required for team_match condition' };
          }
          break;
        case 'self_only':
          if (!context.userId || context.userId !== context.resourceOwnerId) {
            return { valid: false, reason: 'User can only access their own resources' };
          }
          break;
      }
    }

    return { valid: true };
  }

  /**
   * Validate resource-specific access
   * @private
   */
  async _validateResourceSpecificAccess(userId, resourceType, resourceData, facilityAccess) {
    // Default validation - can be extended for specific resource types
    switch (resourceType) {
      case 'patient':
        return this._validatePatientAccess(userId, resourceData, facilityAccess);
      case 'immunization_record':
        return this._validateImmunizationRecordAccess(userId, resourceData, facilityAccess);
      default:
        return { valid: true, reason: 'No specific validation required' };
    }
  }

  /**
   * Validate patient access
   * @private
   */
  _validatePatientAccess(userId, patientData, facilityAccess) {
    // Additional patient-specific validation logic
    return { valid: true, reason: 'Patient access validated' };
  }

  /**
   * Validate immunization record access
   * @private
   */
  _validateImmunizationRecordAccess(userId, recordData, facilityAccess) {
    // Additional immunization record-specific validation logic
    return { valid: true, reason: 'Immunization record access validated' };
  }

  // Cache management methods

  /**
   * Generate permission cache key
   * @private
   */
  _generatePermissionCacheKey(userId, resource, operation, context) {
    const contextStr = JSON.stringify(context);
    return `${userId}:${resource}:${operation}:${contextStr}`;
  }

  /**
   * Cache permission result
   * @private
   */
  _cachePermissionResult(key, result) {
    if (!this.config.cacheEnabled) return;

    this.permissionCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Clean up cache if it gets too large
    if (this.permissionCache.size > this.maxCacheSize) {
      const oldestKey = this.permissionCache.keys().next().value;
      this.permissionCache.delete(oldestKey);
    }
  }

  /**
   * Get permission from cache
   * @private
   */
  _getPermissionFromCache(key) {
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

  // Result creation helpers

  /**
   * Create permission result object
   * @private
   */
  _createPermissionResult(allowed, reason, details = {}) {
    return {
      allowed,
      reason,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Create access result object
   * @private
   */
  _createAccessResult(allowed, reason, details = {}) {
    return {
      allowed,
      reason,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Create validation result object
   * @private
   */
  _createValidationResult(valid, reason, details = {}) {
    return {
      valid,
      reason,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Log access attempt
   * @private
   */
  _logAccessAttempt(userId, resource, operation, context, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      resource,
      operation,
      context,
      allowed: result.allowed,
      reason: result.reason
    };

    console.log('Access attempt:', JSON.stringify(logEntry));
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
      permissionCache: {
        size: this.permissionCache.size,
        maxSize: this.maxCacheSize
      }
    };
  }
}

module.exports = TeamPermissionChecker;