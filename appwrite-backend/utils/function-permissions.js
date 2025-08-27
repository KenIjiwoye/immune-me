/**
 * Function Permission Utilities - BE-AW-11 Implementation
 * 
 * This utility provides helper functions for function permission checking,
 * role validation, and facility scoping. It integrates with the existing
 * permission system and the function permission matrix.
 */

const { Client, Databases, Users } = require('node-appwrite');
const { PermissionValidator } = require('./permission-validator');
const TeamPermissionChecker = require('./team-permission-checker');
const RoleManager = require('./role-manager');
const { 
  FUNCTION_PERMISSIONS, 
  FUNCTION_CATEGORIES, 
  EXECUTION_CONDITIONS,
  FUNCTION_SECURITY_POLICIES 
} = require('../config/function-roles');
const { ROLE_LABELS } = require('../config/roles');

class FunctionPermissions {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
    
    // Initialize related utilities
    this.permissionValidator = new PermissionValidator(options);
    this.teamChecker = new TeamPermissionChecker(options);
    this.roleManager = new RoleManager(options);
    
    // Configuration
    this.config = {
      databaseId: options.databaseId || process.env.APPWRITE_DATABASE_ID,
      cacheEnabled: options.cacheEnabled !== false,
      cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
      ...options.config
    };
    
    // Permission cache
    this.permissionCache = new Map();
  }

  /**
   * Check if a user can execute a specific function
   * @param {string} userId - User ID
   * @param {string} functionName - Function name
   * @param {string} category - Function category
   * @param {Object} context - Additional context for validation
   * @returns {Promise<Object>} Permission check result
   */
  async canExecuteFunction(userId, functionName, category, context = {}) {
    try {
      if (!userId || !functionName || !category) {
        throw new Error('User ID, function name, and category are required');
      }

      // Generate cache key
      const cacheKey = `function:${userId}:${category}:${functionName}`;
      
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
        const result = this._createResult(false, 'Could not determine user role', { 
          userId, functionName, category 
        });
        this._cacheResult(cacheKey, result);
        return result;
      }

      // Check function permissions
      const permissionResult = await this._checkFunctionPermission(
        roleInfo.role, 
        category, 
        functionName
      );
      
      if (!permissionResult.allowed) {
        const result = this._createResult(false, permissionResult.reason, {
          userId, functionName, category, role: roleInfo.role
        });
        this._cacheResult(cacheKey, result);
        return result;
      }

      // Validate execution conditions if any
      if (permissionResult.conditions && permissionResult.conditions.length > 0) {
        const conditionResult = await this._validateConditions(
          permissionResult.conditions,
          userId,
          roleInfo,
          context
        );
        
        if (!conditionResult.valid) {
          const result = this._createResult(false, conditionResult.reason, {
            userId, functionName, category, role: roleInfo.role, 
            failedCondition: conditionResult.failedCondition
          });
          this._cacheResult(cacheKey, result);
          return result;
        }
      }

      const result = this._createResult(true, 'Function execution allowed', {
        userId, functionName, category, role: roleInfo.role,
        facilityId: roleInfo.facilityId,
        permissions: permissionResult.permissions,
        rateLimit: permissionResult.rateLimit
      });
      
      this._cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Function permission check error:', error);
      return this._createResult(false, `Permission check failed: ${error.message}`, {
        userId, functionName, category
      });
    }
  }

  /**
   * Get all functions a user can execute in a category
   * @param {string} userId - User ID
   * @param {string} category - Function category
   * @returns {Promise<Object>} List of executable functions
   */
  async getUserExecutableFunctions(userId, category) {
    try {
      if (!userId || !category) {
        throw new Error('User ID and category are required');
      }

      // Get user role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          functions: []
        };
      }

      // Get role permissions for category
      const rolePermissions = FUNCTION_PERMISSIONS[roleInfo.role];
      if (!rolePermissions || !rolePermissions[category]) {
        return {
          success: true,
          userId,
          category,
          role: roleInfo.role,
          functions: [],
          message: `Role ${roleInfo.role} has no permissions for category ${category}`
        };
      }

      const categoryPermissions = rolePermissions[category];
      const allowedFunctions = categoryPermissions.allowed;
      
      // If wildcard, get all functions in category
      let executableFunctions = [];
      if (allowedFunctions.includes('*')) {
        const categoryFunctions = FUNCTION_CATEGORIES[category];
        if (categoryFunctions) {
          executableFunctions = Object.keys(categoryFunctions).map(funcName => ({
            name: funcName,
            description: categoryFunctions[funcName].description,
            riskLevel: categoryFunctions[funcName].riskLevel,
            requiresFacilityScope: categoryFunctions[funcName].requiresFacilityScope
          }));
        }
      } else {
        // Get specific allowed functions
        const categoryFunctions = FUNCTION_CATEGORIES[category];
        if (categoryFunctions) {
          executableFunctions = allowedFunctions
            .filter(funcName => categoryFunctions[funcName])
            .map(funcName => ({
              name: funcName,
              description: categoryFunctions[funcName].description,
              riskLevel: categoryFunctions[funcName].riskLevel,
              requiresFacilityScope: categoryFunctions[funcName].requiresFacilityScope
            }));
        }
      }

      return {
        success: true,
        userId,
        category,
        role: roleInfo.role,
        facilityId: roleInfo.facilityId,
        functions: executableFunctions,
        conditions: categoryPermissions.conditions || [],
        rateLimit: categoryPermissions.rateLimit
      };

    } catch (error) {
      console.error('Get executable functions error:', error);
      return {
        success: false,
        error: error.message,
        functions: []
      };
    }
  }

  /**
   * Validate role hierarchy for user management functions
   * @param {string} managerId - Manager user ID
   * @param {string} targetUserId - Target user ID
   * @returns {Promise<Object>} Validation result
   */
  async validateRoleHierarchy(managerId, targetUserId) {
    try {
      if (!managerId || !targetUserId) {
        throw new Error('Manager ID and target user ID are required');
      }

      // Get both users' role information
      const [managerRoleInfo, targetRoleInfo] = await Promise.all([
        this.roleManager.getUserRoleInfo(managerId),
        this.roleManager.getUserRoleInfo(targetUserId)
      ]);

      if (!managerRoleInfo.success) {
        return this._createResult(false, 'Could not determine manager role', {
          managerId, targetUserId
        });
      }

      if (!targetRoleInfo.success) {
        return this._createResult(false, 'Could not determine target user role', {
          managerId, targetUserId
        });
      }

      // Define role hierarchy levels
      const roleHierarchy = {
        [ROLE_LABELS.ADMINISTRATOR]: 4,
        'supervisor': 3,
        'doctor': 2,
        'user': 1
      };

      const managerLevel = roleHierarchy[managerRoleInfo.role] || 0;
      const targetLevel = roleHierarchy[targetRoleInfo.role] || 0;

      if (managerLevel <= targetLevel) {
        return this._createResult(false, 
          `Role ${managerRoleInfo.role} (level ${managerLevel}) cannot manage role ${targetRoleInfo.role} (level ${targetLevel})`, {
          managerId, targetUserId, managerRole: managerRoleInfo.role, targetRole: targetRoleInfo.role
        });
      }

      return this._createResult(true, 'Role hierarchy validation passed', {
        managerId, targetUserId, managerRole: managerRoleInfo.role, targetRole: targetRoleInfo.role,
        managerLevel, targetLevel
      });

    } catch (error) {
      console.error('Role hierarchy validation error:', error);
      return this._createResult(false, `Role hierarchy validation failed: ${error.message}`, {
        managerId, targetUserId
      });
    }
  }

  /**
   * Check facility access for facility-scoped functions
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID to check access for
   * @returns {Promise<Object>} Access check result
   */
  async checkFacilityAccess(userId, facilityId) {
    try {
      if (!userId || !facilityId) {
        throw new Error('User ID and facility ID are required');
      }

      // Get user role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return this._createResult(false, 'Could not determine user role', {
          userId, facilityId
        });
      }

      // Administrators have access to all facilities
      if (roleInfo.role === ROLE_LABELS.ADMINISTRATOR) {
        return this._createResult(true, 'Administrator has access to all facilities', {
          userId, facilityId, role: roleInfo.role, accessType: 'admin'
        });
      }

      // Check if user belongs to the facility
      if (roleInfo.facilityId === facilityId) {
        return this._createResult(true, 'User belongs to the facility', {
          userId, facilityId, role: roleInfo.role, accessType: 'member'
        });
      }

      // Check through team membership
      const facilityAccess = await this.teamChecker.checkFacilityAccess(userId, facilityId);
      if (facilityAccess.allowed) {
        return this._createResult(true, 'User has team-based access to facility', {
          userId, facilityId, role: roleInfo.role, accessType: 'team_member'
        });
      }

      return this._createResult(false, 'User does not have access to the facility', {
        userId, facilityId, role: roleInfo.role, userFacilityId: roleInfo.facilityId
      });

    } catch (error) {
      console.error('Facility access check error:', error);
      return this._createResult(false, `Facility access check failed: ${error.message}`, {
        userId, facilityId
      });
    }
  }

  /**
   * Get function security requirements
   * @param {string} category - Function category
   * @returns {Object} Security requirements
   */
  getFunctionSecurityRequirements(category) {
    const policies = FUNCTION_SECURITY_POLICIES[category];
    if (!policies) {
      return {
        found: false,
        message: `No security policies found for category: ${category}`
      };
    }

    return {
      found: true,
      category,
      requirements: policies
    };
  }

  /**
   * Get function metadata
   * @param {string} category - Function category
   * @param {string} functionName - Function name
   * @returns {Object} Function metadata
   */
  getFunctionMetadata(category, functionName) {
    const categoryFunctions = FUNCTION_CATEGORIES[category];
    if (!categoryFunctions || !categoryFunctions[functionName]) {
      return {
        found: false,
        message: `Function ${functionName} not found in category ${category}`
      };
    }

    return {
      found: true,
      category,
      functionName,
      metadata: categoryFunctions[functionName]
    };
  }

  /**
   * Validate batch function permissions
   * @param {string} userId - User ID
   * @param {Array} functions - Array of {functionName, category} objects
   * @returns {Promise<Object>} Batch validation result
   */
  async validateBatchFunctionPermissions(userId, functions) {
    try {
      if (!userId || !Array.isArray(functions)) {
        throw new Error('User ID and functions array are required');
      }

      const results = [];
      const errors = [];

      for (const func of functions) {
        try {
          const result = await this.canExecuteFunction(
            userId, 
            func.functionName, 
            func.category, 
            func.context || {}
          );
          
          results.push({
            functionName: func.functionName,
            category: func.category,
            allowed: result.allowed,
            reason: result.reason
          });
        } catch (error) {
          errors.push({
            functionName: func.functionName,
            category: func.category,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        userId,
        results,
        errors,
        summary: {
          total: functions.length,
          allowed: results.filter(r => r.allowed).length,
          denied: results.filter(r => !r.allowed).length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('Batch function permission validation error:', error);
      return {
        success: false,
        error: error.message,
        results: [],
        errors: []
      };
    }
  }

  /**
   * Get user's complete function permissions summary
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete permissions summary
   */
  async getUserFunctionPermissionsSummary(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get user role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          summary: {}
        };
      }

      const rolePermissions = FUNCTION_PERMISSIONS[roleInfo.role];
      if (!rolePermissions) {
        return {
          success: false,
          error: `No permissions found for role: ${roleInfo.role}`,
          summary: {}
        };
      }

      const summary = {
        userId,
        role: roleInfo.role,
        facilityId: roleInfo.facilityId,
        categories: {}
      };

      // Process each category
      for (const [category, permissions] of Object.entries(rolePermissions)) {
        const categoryFunctions = FUNCTION_CATEGORIES[category];
        let allowedFunctions = [];

        if (permissions.allowed.includes('*')) {
          // All functions in category
          allowedFunctions = categoryFunctions ? Object.keys(categoryFunctions) : [];
        } else {
          // Specific functions
          allowedFunctions = permissions.allowed;
        }

        summary.categories[category] = {
          allowedFunctions,
          conditions: permissions.conditions || [],
          rateLimit: permissions.rateLimit,
          functionCount: allowedFunctions.length
        };
      }

      return {
        success: true,
        summary
      };

    } catch (error) {
      console.error('Get user function permissions summary error:', error);
      return {
        success: false,
        error: error.message,
        summary: {}
      };
    }
  }

  // Private helper methods

  /**
   * Check function permission for role
   * @private
   */
  async _checkFunctionPermission(role, category, functionName) {
    const rolePermissions = FUNCTION_PERMISSIONS[role];
    if (!rolePermissions) {
      return {
        allowed: false,
        reason: `Unknown role: ${role}`
      };
    }

    const categoryPermissions = rolePermissions[category];
    if (!categoryPermissions) {
      return {
        allowed: false,
        reason: `Role ${role} has no permissions for category ${category}`
      };
    }

    const allowedFunctions = categoryPermissions.allowed;
    const isAllowed = allowedFunctions.includes('*') || allowedFunctions.includes(functionName);
    
    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Role ${role} is not allowed to execute function ${functionName}`
      };
    }

    return {
      allowed: true,
      permissions: categoryPermissions,
      conditions: categoryPermissions.conditions || [],
      rateLimit: categoryPermissions.rateLimit
    };
  }

  /**
   * Validate execution conditions
   * @private
   */
  async _validateConditions(conditions, userId, roleInfo, context) {
    for (const condition of conditions) {
      const conditionConfig = EXECUTION_CONDITIONS[condition];
      if (!conditionConfig) {
        return {
          valid: false,
          failedCondition: condition,
          reason: `Unknown execution condition: ${condition}`
        };
      }

      // Basic condition validation (can be extended)
      const isValid = await this._validateCondition(condition, userId, roleInfo, context);
      if (!isValid.valid) {
        return {
          valid: false,
          failedCondition: condition,
          reason: isValid.reason || conditionConfig.description
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate individual condition
   * @private
   */
  async _validateCondition(condition, userId, roleInfo, context) {
    switch (condition) {
      case 'facility_match':
        return await this._validateFacilityMatch(userId, roleInfo, context);
      
      case 'active_facility':
        return await this._validateActiveFacility(userId, roleInfo);
      
      case 'clinical_access':
        return await this._validateClinicalAccess(roleInfo);
      
      case 'assigned_patients':
        return await this._validateAssignedPatients(userId, roleInfo, context);
      
      case 'role_hierarchy':
        return await this._validateRoleHierarchy(userId, roleInfo, context);
      
      case 'self_only':
        return await this._validateSelfAccess(userId, context);
      
      default:
        return {
          valid: false,
          reason: `Unknown condition: ${condition}`
        };
    }
  }

  /**
   * Validate facility match condition
   * @private
   */
  async _validateFacilityMatch(userId, roleInfo, context) {
    if (!roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User is not assigned to any facility'
      };
    }

    const contextFacilityId = context.facilityId;
    if (contextFacilityId && contextFacilityId !== roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User facility does not match requested facility'
      };
    }

    return { valid: true };
  }

  /**
   * Validate active facility condition
   * @private
   */
  async _validateActiveFacility(userId, roleInfo) {
    if (!roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User is not assigned to any facility'
      };
    }

    try {
      const facility = await this.databases.getDocument(
        this.config.databaseId,
        'facilities',
        roleInfo.facilityId
      );

      if (!facility.isActive) {
        return {
          valid: false,
          reason: 'User facility is not active'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Could not verify facility status'
      };
    }
  }

  /**
   * Validate clinical access condition
   * @private
   */
  async _validateClinicalAccess(roleInfo) {
    const clinicalRoles = [ROLE_LABELS.ADMINISTRATOR, 'supervisor', 'doctor'];
    
    if (!clinicalRoles.includes(roleInfo.role)) {
      return {
        valid: false,
        reason: 'User does not have clinical access permissions'
      };
    }

    return { valid: true };
  }

  /**
   * Validate assigned patients condition
   * @private
   */
  async _validateAssignedPatients(userId, roleInfo, context) {
    // For now, assume all users in facility can access facility patients
    return await this._validateFacilityMatch(userId, roleInfo, context);
  }

  /**
   * Validate role hierarchy condition
   * @private
   */
  async _validateRoleHierarchy(userId, roleInfo, context) {
    const targetUserId = context.targetUserId || context.userId;
    if (!targetUserId) {
      return { valid: true }; // No target user to validate against
    }

    const hierarchyResult = await this.validateRoleHierarchy(userId, targetUserId);
    return {
      valid: hierarchyResult.allowed,
      reason: hierarchyResult.reason
    };
  }

  /**
   * Validate self access condition
   * @private
   */
  async _validateSelfAccess(userId, context) {
    const targetUserId = context.userId || context.targetUserId;
    if (targetUserId && targetUserId !== userId) {
      return {
        valid: false,
        reason: 'User can only access their own data'
      };
    }

    return { valid: true };
  }

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

    if (Date.now() - cached.timestamp > this.config.cacheTimeout) {
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
      maxAge: this.config.cacheTimeout
    };
  }
}

module.exports = FunctionPermissions;