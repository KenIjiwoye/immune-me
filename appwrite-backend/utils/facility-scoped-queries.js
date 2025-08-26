/**
 * FacilityScopedQueries - Facility-scoped data access utility
 * Based on BE-AW-10 ticket requirements
 * 
 * This class provides methods for querying data with proper facility scoping,
 * ensuring users only access data from facilities they have permission to view.
 */

const { Client, Databases, Query } = require('node-appwrite');
const { PermissionValidator } = require('./permission-validator');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');

// Import configuration
const { ROLE_LABELS } = require('../config/roles');

class FacilityScopedQueries {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.databases = new Databases(this.client);
    
    // Initialize related utilities
    this.permissionValidator = new PermissionValidator(options);
    this.teamChecker = new TeamPermissionChecker(options);
    this.teamManager = new FacilityTeamManager(options);
    this.roleManager = new RoleManager(options);
    
    // Configuration
    this.config = {
      databaseId: options.databaseId || process.env.APPWRITE_DATABASE_ID,
      defaultLimit: options.defaultLimit || 25,
      maxLimit: options.maxLimit || 100,
      enableQueryLogging: options.enableQueryLogging !== false,
      ...options.config
    };
    
    // Query cache
    this.queryCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Get patients for user with facility scoping
   * @param {string} userId - User ID
   * @param {Array} queries - Additional query filters
   * @returns {Promise<Object>} Query result with patients
   */
  async getPatientsForUser(userId, queries = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate user can read patients
      const canRead = await this.permissionValidator.canAccessCollection(userId, 'patients', 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      // Build facility-scoped queries
      const facilityQueries = await this._buildFacilityScopedQueries(userId, roleInfo, queries);
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        'patients',
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery('patients', userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error getting patients for user:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Get immunization records for user with facility scoping
   * @param {string} userId - User ID
   * @param {Array} queries - Additional query filters
   * @returns {Promise<Object>} Query result with immunization records
   */
  async getImmunizationRecordsForUser(userId, queries = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate user can read immunization records
      const canRead = await this.permissionValidator.canAccessCollection(userId, 'immunization_records', 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      // Build facility-scoped queries
      const facilityQueries = await this._buildFacilityScopedQueries(userId, roleInfo, queries);
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        'immunization_records',
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery('immunization_records', userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error getting immunization records for user:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Get notifications for user with facility scoping
   * @param {string} userId - User ID
   * @param {Array} queries - Additional query filters
   * @returns {Promise<Object>} Query result with notifications
   */
  async getNotificationsForUser(userId, queries = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate user can read notifications
      const canRead = await this.permissionValidator.canAccessCollection(userId, 'notifications', 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      // Build facility-scoped queries with additional user-specific filters
      const facilityQueries = await this._buildFacilityScopedQueries(userId, roleInfo, queries);
      
      // Add user-specific notification filters
      if (roleInfo.role !== ROLE_LABELS.ADMINISTRATOR) {
        // Non-admin users see notifications targeted to them or their role
        facilityQueries.push(
          Query.or([
            Query.equal('targetUserId', userId),
            Query.equal('targetRole', roleInfo.role),
            Query.equal('targetType', 'facility'),
            Query.isNull('targetUserId') // General notifications
          ])
        );
      }
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        'notifications',
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery('notifications', userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error getting notifications for user:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Get facilities accessible to user
   * @param {string} userId - User ID
   * @param {Array} queries - Additional query filters
   * @returns {Promise<Object>} Query result with facilities
   */
  async getFacilitiesForUser(userId, queries = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate user can read facilities
      const canRead = await this.permissionValidator.canAccessCollection(userId, 'facilities', 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      let facilityQueries = [...queries];

      // Apply facility scoping
      if (roleInfo.role !== ROLE_LABELS.ADMINISTRATOR) {
        // Non-admin users can only see their own facility
        if (roleInfo.facilityId) {
          facilityQueries.push(Query.equal('$id', roleInfo.facilityId));
        } else {
          // User has no facility assigned, return empty result
          return {
            success: true,
            documents: [],
            total: 0,
            queries: facilityQueries,
            facilityScope: 'none'
          };
        }
      }

      // Add default sorting and limits
      facilityQueries = this._addDefaultQueryOptions(facilityQueries);
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        'facilities',
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery('facilities', userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error getting facilities for user:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Get reports accessible to user with facility scoping
   * @param {string} userId - User ID
   * @param {Array} queries - Additional query filters
   * @returns {Promise<Object>} Query result with reports
   */
  async getReportsForUser(userId, queries = []) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Validate user can read reports
      const canRead = await this.permissionValidator.canAccessCollection(userId, 'reports', 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      // Build facility-scoped queries
      const facilityQueries = await this._buildFacilityScopedQueries(userId, roleInfo, queries);
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        'reports',
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery('reports', userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error getting reports for user:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Execute custom query with facility scoping
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {Array} queries - Query filters
   * @param {string} operation - Operation type (default: 'read')
   * @returns {Promise<Object>} Query result
   */
  async executeCustomQuery(userId, collectionId, queries = [], operation = 'read') {
    try {
      if (!userId || !collectionId) {
        throw new Error('User ID and collection ID are required');
      }

      // Validate user can perform operation on collection
      const canAccess = await this.permissionValidator.canAccessCollection(userId, collectionId, operation);
      if (!canAccess.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canAccess.reason}`,
          documents: [],
          total: 0
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          documents: [],
          total: 0
        };
      }

      // Build facility-scoped queries
      const facilityQueries = await this._buildFacilityScopedQueries(userId, roleInfo, queries);
      
      // Execute query
      const result = await this.databases.listDocuments(
        this.config.databaseId,
        collectionId,
        facilityQueries
      );

      // Log query if enabled
      if (this.config.enableQueryLogging) {
        this._logQuery(collectionId, userId, facilityQueries, result.total);
      }

      return {
        success: true,
        documents: result.documents,
        total: result.total,
        queries: facilityQueries,
        facilityScope: roleInfo.role === ROLE_LABELS.ADMINISTRATOR ? 'all_facilities' : roleInfo.facilityId
      };

    } catch (error) {
      console.error('Error executing custom query:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  // Private helper methods

  /**
   * Build facility-scoped queries based on user role and permissions
   * @private
   */
  async _buildFacilityScopedQueries(userId, roleInfo, additionalQueries = []) {
    let queries = [...additionalQueries];

    // Apply facility scoping for non-admin users
    if (roleInfo.role !== ROLE_LABELS.ADMINISTRATOR) {
      if (roleInfo.facilityId) {
        // Add facility filter - try both facilityId and facility_id fields
        queries.push(
          Query.or([
            Query.equal('facilityId', roleInfo.facilityId),
            Query.equal('facility_id', roleInfo.facilityId)
          ])
        );
      } else {
        // User has no facility assigned, check if they belong to multiple facilities
        const userTeams = await this.teamManager.getUserTeams(userId);
        const facilityIds = userTeams
          .filter(team => team.isFacilityTeam)
          .map(team => team.facilityId)
          .filter(id => id);

        if (facilityIds.length > 0) {
          queries.push(
            Query.or([
              Query.in('facilityId', facilityIds),
              Query.in('facility_id', facilityIds)
            ])
          );
        } else {
          // No facility access, return empty query
          queries.push(Query.equal('$id', 'no-access'));
        }
      }
    }

    // Add default query options
    queries = this._addDefaultQueryOptions(queries);

    return queries;
  }

  /**
   * Add default query options (sorting, limits, etc.)
   * @private
   */
  _addDefaultQueryOptions(queries) {
    const hasLimit = queries.some(q => q.method === 'limit');
    const hasOrderBy = queries.some(q => q.method === 'orderBy');

    // Add default limit if not specified
    if (!hasLimit) {
      queries.push(Query.limit(this.config.defaultLimit));
    }

    // Add default ordering if not specified
    if (!hasOrderBy) {
      queries.push(Query.orderDesc('$createdAt'));
    }

    return queries;
  }

  /**
   * Log query execution
   * @private
   */
  _logQuery(collectionId, userId, queries, resultCount) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      collectionId,
      userId,
      queryCount: queries.length,
      resultCount,
      queries: queries.map(q => ({
        method: q.method,
        attribute: q.attribute,
        values: q.values
      }))
    };

    console.log('Query Log:', JSON.stringify(logEntry));
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    return {
      cacheSize: this.queryCache.size,
      cacheTimeout: this.cacheTimeout,
      defaultLimit: this.config.defaultLimit,
      maxLimit: this.config.maxLimit
    };
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
  }
}

module.exports = FacilityScopedQueries;