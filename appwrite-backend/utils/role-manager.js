/**
 * RoleManager - Utility class for managing user roles and permissions in Appwrite Auth
 * Based on BE-AW-08 ticket requirements
 */

const { Client, Users } = require('node-appwrite');
const {
  ROLE_LABELS,
  FACILITY_LABEL_PREFIX,
  DEFAULT_ROLE,
  getRoleConfig,
  isValidRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  generateFacilityLabel,
  parseFacilityId,
  getMultiFacilityRoles
} = require('../config/roles');

class RoleManager {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.cache = new Map(); // Simple in-memory cache for user roles
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes default
  }

  /**
   * Check if user has a specific role
   * @param {Object|string} user - User object or user ID
   * @param {string} requiredRole - Required role to check
   * @returns {Promise<boolean>} True if user has the role
   */
  async hasRole(user, requiredRole) {
    try {
      if (!isValidRole(requiredRole)) {
        throw new Error(`Invalid role: ${requiredRole}`);
      }

      const userObj = await this._getUserObject(user);
      if (!userObj) {
        return false;
      }

      const userRole = this._extractRoleFromLabels(userObj.labels || []);
      return userRole === requiredRole;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   * @param {Object|string} user - User object or user ID
   * @param {Array<string>} roles - Array of roles to check
   * @returns {Promise<boolean>} True if user has any of the roles
   */
  async hasAnyRole(user, roles) {
    try {
      if (!Array.isArray(roles) || roles.length === 0) {
        throw new Error('Roles must be a non-empty array');
      }

      // Validate all roles
      for (const role of roles) {
        if (!isValidRole(role)) {
          throw new Error(`Invalid role: ${role}`);
        }
      }

      const userObj = await this._getUserObject(user);
      if (!userObj) {
        return false;
      }

      const userRole = this._extractRoleFromLabels(userObj.labels || []);
      return roles.includes(userRole);
    } catch (error) {
      console.error('Error checking user roles:', error);
      return false;
    }
  }

  /**
   * Get facility ID from user labels
   * @param {Object|string} user - User object or user ID
   * @returns {Promise<string|null>} Facility ID or null if not found
   */
  async getFacilityId(user) {
    try {
      const userObj = await this._getUserObject(user);
      if (!userObj) {
        return null;
      }

      const facilityLabels = (userObj.labels || [])
        .filter(label => label.startsWith(FACILITY_LABEL_PREFIX));

      if (facilityLabels.length === 0) {
        return null;
      }

      // Return the first facility ID (users typically belong to one facility)
      return parseFacilityId(facilityLabels[0]);
    } catch (error) {
      console.error('Error getting facility ID:', error);
      return null;
    }
  }

  /**
   * Check if user is an administrator
   * @param {Object|string} user - User object or user ID
   * @returns {Promise<boolean>} True if user is administrator
   */
  async isAdministrator(user) {
    return await this.hasRole(user, ROLE_LABELS.ADMINISTRATOR);
  }

  /**
   * Check if user can access multiple facilities
   * @param {Object|string} user - User object or user ID
   * @returns {Promise<boolean>} True if user can access multiple facilities
   */
  async canAccessMultipleFacilities(user) {
    try {
      const userObj = await this._getUserObject(user);
      if (!userObj) {
        return false;
      }

      const userRole = this._extractRoleFromLabels(userObj.labels || []);
      const multiFacilityRoles = getMultiFacilityRoles();
      
      return multiFacilityRoles.includes(userRole);
    } catch (error) {
      console.error('Error checking multi-facility access:', error);
      return false;
    }
  }

  /**
   * Get user's role and permissions
   * @param {Object|string} user - User object or user ID
   * @returns {Promise<Object>} User role information
   */
  async getUserRoleInfo(user) {
    try {
      const userObj = await this._getUserObject(user);
      if (!userObj) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const userRole = this._extractRoleFromLabels(userObj.labels || []);
      const facilityId = await this.getFacilityId(userObj);
      const roleConfig = getRoleConfig(userRole);

      return {
        success: true,
        userId: userObj.$id,
        role: userRole,
        facilityId,
        permissions: roleConfig?.permissions || {},
        specialPermissions: roleConfig?.specialPermissions || [],
        canAccessMultipleFacilities: roleConfig?.canAccessMultipleFacilities || false,
        dataAccess: roleConfig?.dataAccess || 'facility_only'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Assign role to user
   * @param {string} userId - User ID
   * @param {string} role - Role to assign
   * @param {string} facilityId - Facility ID (required for non-admin roles)
   * @returns {Promise<Object>} Operation result
   */
  async assignRole(userId, role, facilityId = null) {
    try {
      if (!isValidRole(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      const userObj = await this._getUserObject(userId);
      if (!userObj) {
        throw new Error('User not found');
      }

      // Check if facility ID is required
      if (role !== ROLE_LABELS.ADMINISTRATOR && !facilityId) {
        throw new Error('Facility ID is required for non-administrator roles');
      }

      // Remove existing role labels
      let newLabels = (userObj.labels || [])
        .filter(label => !Object.values(ROLE_LABELS).includes(label))
        .filter(label => !label.startsWith(FACILITY_LABEL_PREFIX));

      // Add new role label
      newLabels.push(role);

      // Add facility label if provided
      if (facilityId) {
        newLabels.push(generateFacilityLabel(facilityId));
      }

      // Update user labels
      await this.users.updateLabels(userId, newLabels);

      // Clear cache for this user
      this._clearUserCache(userId);

      return {
        success: true,
        message: `Role ${role} assigned successfully`,
        userId,
        role,
        facilityId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove role from user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Operation result
   */
  async removeRole(userId) {
    try {
      const userObj = await this._getUserObject(userId);
      if (!userObj) {
        throw new Error('User not found');
      }

      // Remove role and facility labels, keep other labels
      const newLabels = (userObj.labels || [])
        .filter(label => !Object.values(ROLE_LABELS).includes(label))
        .filter(label => !label.startsWith(FACILITY_LABEL_PREFIX));

      // Assign default role
      newLabels.push(DEFAULT_ROLE);

      await this.users.updateLabels(userId, newLabels);

      // Clear cache for this user
      this._clearUserCache(userId);

      return {
        success: true,
        message: 'Role removed and default role assigned',
        userId,
        newRole: DEFAULT_ROLE
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has permission for specific operation
   * @param {Object|string} user - User object or user ID
   * @param {string} resource - Resource name (e.g., 'patients', 'reports')
   * @param {string} operation - Operation name (e.g., 'create', 'read', 'update', 'delete')
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(user, resource, operation) {
    try {
      const roleInfo = await this.getUserRoleInfo(user);
      if (!roleInfo.success) {
        return false;
      }

      const resourcePermissions = roleInfo.permissions[resource];
      if (!resourcePermissions) {
        return false;
      }

      return resourcePermissions.includes(operation);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Validate facility access for user
   * @param {Object|string} user - User object or user ID
   * @param {string} requestedFacilityId - Facility ID to check access for
   * @returns {Promise<boolean>} True if user can access the facility
   */
  async validateFacilityAccess(user, requestedFacilityId) {
    try {
      const roleInfo = await this.getUserRoleInfo(user);
      if (!roleInfo.success) {
        return false;
      }

      // Administrators can access all facilities
      if (roleInfo.role === ROLE_LABELS.ADMINISTRATOR) {
        return true;
      }

      // Other roles can only access their assigned facility
      return roleInfo.facilityId === requestedFacilityId;
    } catch (error) {
      console.error('Error validating facility access:', error);
      return false;
    }
  }

  /**
   * Get user object from cache or fetch from Appwrite
   * @private
   * @param {Object|string} user - User object or user ID
   * @returns {Promise<Object|null>} User object or null
   */
  async _getUserObject(user) {
    try {
      // If already a user object, return it
      if (typeof user === 'object' && user.$id) {
        return user;
      }

      // If user ID string, fetch from cache or API
      if (typeof user === 'string') {
        const cached = this._getUserFromCache(user);
        if (cached) {
          return cached;
        }

        const userObj = await this.users.get(user);
        this._cacheUser(userObj);
        return userObj;
      }

      return null;
    } catch (error) {
      console.error('Error getting user object:', error);
      return null;
    }
  }

  /**
   * Extract role from user labels
   * @private
   * @param {Array<string>} labels - User labels
   * @returns {string} User role or default role
   */
  _extractRoleFromLabels(labels) {
    const roleLabels = labels.filter(label => Object.values(ROLE_LABELS).includes(label));
    return roleLabels.length > 0 ? roleLabels[0] : DEFAULT_ROLE;
  }

  /**
   * Cache user object
   * @private
   * @param {Object} user - User object
   */
  _cacheUser(user) {
    this.cache.set(user.$id, {
      user,
      timestamp: Date.now()
    });
  }

  /**
   * Get user from cache
   * @private
   * @param {string} userId - User ID
   * @returns {Object|null} Cached user object or null
   */
  _getUserFromCache(userId) {
    const cached = this.cache.get(userId);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(userId);
      return null;
    }

    return cached.user;
  }

  /**
   * Clear user from cache
   * @private
   * @param {string} userId - User ID
   */
  _clearUserCache(userId) {
    this.cache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = RoleManager;