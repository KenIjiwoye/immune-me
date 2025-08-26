/**
 * Permission Integration Example
 * Demonstrates how to use the enhanced permission utilities together
 * Based on BE-AW-10 ticket requirements
 */

const { PermissionValidator, ROLE_PERMISSIONS } = require('./permission-validator');
const DocumentSecurity = require('./document-security');
const FacilityScopedQueries = require('./facility-scoped-queries');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');

/**
 * Enhanced Permission Manager - Integrates all permission utilities
 * This class provides a unified interface for all permission operations
 */
class EnhancedPermissionManager {
  constructor(options = {}) {
    // Initialize all permission utilities
    this.permissionValidator = new PermissionValidator(options);
    this.documentSecurity = new DocumentSecurity(options);
    this.scopedQueries = new FacilityScopedQueries(options);
    this.teamChecker = new TeamPermissionChecker(options);
    this.teamManager = new FacilityTeamManager(options);
    this.roleManager = new RoleManager(options);
    
    this.config = {
      enableLogging: options.enableLogging !== false,
      strictMode: options.strictMode !== false,
      ...options.config
    };
  }

  /**
   * Complete permission check workflow
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @param {Object} context - Operation context
   * @returns {Promise<Object>} Complete permission analysis
   */
  async checkCompletePermissions(userId, operation, context = {}) {
    try {
      const { collectionId, documentId, facilityId } = context;
      
      // 1. Get user role and basic info
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return this._createResult(false, 'Could not determine user role', { userId, operation });
      }

      // 2. Check collection-level permissions
      const collectionAccess = await this.permissionValidator.canAccessCollection(
        userId, collectionId, operation
      );
      
      // 3. Check team-based permissions
      const teamAccess = await this.teamChecker.checkPermission(
        userId, collectionId, operation, { facilityId: facilityId || roleInfo.facilityId }
      );
      
      // 4. Check facility access if needed
      let facilityAccess = null;
      if (facilityId || roleInfo.facilityId) {
        facilityAccess = await this.teamChecker.checkFacilityAccess(
          userId, facilityId || roleInfo.facilityId
        );
      }
      
      // 5. Check document-level access if documentId provided
      let documentAccess = null;
      if (documentId) {
        documentAccess = await this.permissionValidator.canAccessDocument(
          userId, collectionId, documentId, operation
        );
      }

      // 6. Compile comprehensive result
      const overallAllowed = collectionAccess.allowed && teamAccess.allowed && 
                           (facilityAccess ? facilityAccess.allowed : true) &&
                           (documentAccess ? documentAccess.allowed : true);

      return {
        success: true,
        allowed: overallAllowed,
        userId,
        operation,
        context,
        roleInfo,
        checks: {
          collection: collectionAccess,
          team: teamAccess,
          facility: facilityAccess,
          document: documentAccess
        },
        summary: this._generatePermissionSummary(roleInfo, overallAllowed)
      };

    } catch (error) {
      console.error('Error in complete permission check:', error);
      return this._createResult(false, `Permission check failed: ${error.message}`, { userId, operation });
    }
  }

  /**
   * Secure data access workflow
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {Array} queries - Additional queries
   * @returns {Promise<Object>} Secure data access result
   */
  async secureDataAccess(userId, collectionId, queries = []) {
    try {
      // 1. Validate user can read the collection
      const canRead = await this.permissionValidator.canAccessCollection(userId, collectionId, 'read');
      if (!canRead.allowed) {
        return {
          success: false,
          error: `Read access denied: ${canRead.reason}`,
          documents: [],
          total: 0
        };
      }

      // 2. Execute facility-scoped query
      let result;
      switch (collectionId) {
        case 'patients':
          result = await this.scopedQueries.getPatientsForUser(userId, queries);
          break;
        case 'immunization_records':
          result = await this.scopedQueries.getImmunizationRecordsForUser(userId, queries);
          break;
        case 'notifications':
          result = await this.scopedQueries.getNotificationsForUser(userId, queries);
          break;
        case 'facilities':
          result = await this.scopedQueries.getFacilitiesForUser(userId, queries);
          break;
        case 'reports':
          result = await this.scopedQueries.getReportsForUser(userId, queries);
          break;
        default:
          result = await this.scopedQueries.executeCustomQuery(userId, collectionId, queries);
      }

      // 3. Add security metadata
      if (result.success) {
        result.security = {
          accessValidated: true,
          facilityScoped: result.facilityScope !== 'all_facilities',
          queryCount: queries.length,
          timestamp: new Date().toISOString()
        };
      }

      return result;

    } catch (error) {
      console.error('Error in secure data access:', error);
      return {
        success: false,
        error: error.message,
        documents: [],
        total: 0
      };
    }
  }

  /**
   * Secure document creation workflow
   * @param {string} userId - User ID
   * @param {string} collectionId - Collection ID
   * @param {Object} documentData - Document data
   * @returns {Promise<Object>} Secure creation result
   */
  async secureDocumentCreation(userId, collectionId, documentData) {
    try {
      // 1. Validate creation permissions
      const canCreate = await this.permissionValidator.canAccessCollection(userId, collectionId, 'create');
      if (!canCreate.allowed) {
        return {
          success: false,
          error: `Create access denied: ${canCreate.reason}`,
          operation: 'create_document'
        };
      }

      // 2. Use appropriate secure creation method
      let result;
      switch (collectionId) {
        case 'patients':
          result = await this.documentSecurity.createPatientWithSecurity(documentData, userId);
          break;
        case 'immunization_records':
          result = await this.documentSecurity.createImmunizationRecordWithSecurity(documentData, userId);
          break;
        case 'notifications':
          result = await this.documentSecurity.createNotificationWithSecurity(documentData, userId);
          break;
        default:
          // Generic secure creation
          result = await this._createGenericDocumentWithSecurity(collectionId, documentData, userId);
      }

      // 3. Add integration metadata
      if (result.success) {
        result.integration = {
          permissionValidated: true,
          securityApplied: true,
          timestamp: new Date().toISOString()
        };
      }

      return result;

    } catch (error) {
      console.error('Error in secure document creation:', error);
      return {
        success: false,
        error: error.message,
        operation: 'create_document'
      };
    }
  }

  /**
   * User permission summary
   * @param {string} userId - User ID
   * @param {string} facilityId - Optional facility ID
   * @returns {Promise<Object>} User permission summary
   */
  async getUserPermissionSummary(userId, facilityId = null) {
    try {
      // 1. Get role information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role'
        };
      }

      // 2. Get team memberships
      const userTeams = await this.teamManager.getUserTeams(userId);
      
      // 3. Get effective permissions for each collection
      const collections = ['patients', 'immunization_records', 'facilities', 'vaccines', 'notifications', 'reports'];
      const collectionPermissions = {};
      
      for (const collection of collections) {
        collectionPermissions[collection] = await this.permissionValidator.getUserCollectionPermissions(
          userId, collection, facilityId
        );
      }

      // 4. Get facility access summary
      const facilityAccess = facilityId ? 
        await this.teamChecker.checkFacilityAccess(userId, facilityId) : null;

      return {
        success: true,
        userId,
        roleInfo,
        teamMemberships: userTeams.length,
        facilityAccess,
        collectionPermissions,
        summary: {
          role: roleInfo.role,
          facilityId: roleInfo.facilityId,
          canAccessMultipleFacilities: roleInfo.canAccessMultipleFacilities,
          totalPermissions: Object.values(collectionPermissions)
            .reduce((total, perm) => total + (perm.permissions?.length || 0), 0)
        }
      };

    } catch (error) {
      console.error('Error getting user permission summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Private helper methods

  /**
   * Create generic document with security
   * @private
   */
  async _createGenericDocumentWithSecurity(collectionId, documentData, userId) {
    // This would implement generic secure document creation
    // For now, return a placeholder
    return {
      success: false,
      error: `Generic secure creation not implemented for ${collectionId}`,
      operation: 'create_document'
    };
  }

  /**
   * Generate permission summary
   * @private
   */
  _generatePermissionSummary(roleInfo, allowed) {
    return {
      role: roleInfo.role,
      facilityId: roleInfo.facilityId,
      accessLevel: roleInfo.role === 'administrator' ? 'global' : 'facility',
      allowed,
      reason: allowed ? 'All permission checks passed' : 'One or more permission checks failed'
    };
  }

  /**
   * Create standardized result
   * @private
   */
  _createResult(success, message, details = {}) {
    return {
      success,
      message,
      timestamp: new Date().toISOString(),
      details
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.permissionValidator.clearCache();
    this.teamChecker.clearCache();
    this.teamManager.clearCache();
    this.roleManager.clearCache();
    this.scopedQueries.clearCache();
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats() {
    return {
      permissionValidator: this.permissionValidator.getCacheStats(),
      teamChecker: this.teamChecker.getCacheStats(),
      teamManager: this.teamManager.getCacheStats(),
      scopedQueries: this.scopedQueries.getQueryStats()
    };
  }
}

// Example usage functions

/**
 * Example: Complete patient management workflow
 */
async function examplePatientWorkflow() {
  const permissionManager = new EnhancedPermissionManager();
  const userId = 'user123';
  const facilityId = 'facility456';

  try {
    console.log('=== Patient Management Workflow Example ===');

    // 1. Check if user can create patients
    const createCheck = await permissionManager.checkCompletePermissions(userId, 'create', {
      collectionId: 'patients',
      facilityId
    });
    console.log('Create Permission Check:', createCheck.allowed);

    if (createCheck.allowed) {
      // 2. Create a patient securely
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        facilityId
      };

      const createResult = await permissionManager.secureDocumentCreation(userId, 'patients', patientData);
      console.log('Patient Creation:', createResult.success);

      if (createResult.success) {
        // 3. Query patients with facility scoping
        const patientsResult = await permissionManager.secureDataAccess(userId, 'patients');
        console.log('Patients Query:', patientsResult.success, `(${patientsResult.total} patients)`);
      }
    }

    // 4. Get user permission summary
    const summary = await permissionManager.getUserPermissionSummary(userId, facilityId);
    console.log('User Permission Summary:', summary.success);

  } catch (error) {
    console.error('Workflow error:', error);
  }
}

/**
 * Example: Multi-facility user scenario
 */
async function exampleMultiFacilityWorkflow() {
  const permissionManager = new EnhancedPermissionManager();
  const adminUserId = 'admin123';

  try {
    console.log('=== Multi-Facility Admin Workflow Example ===');

    // 1. Check admin permissions across facilities
    const facilities = ['facility1', 'facility2', 'facility3'];
    
    for (const facilityId of facilities) {
      const facilityCheck = await permissionManager.checkCompletePermissions(adminUserId, 'read', {
        collectionId: 'patients',
        facilityId
      });
      console.log(`Facility ${facilityId} Access:`, facilityCheck.allowed);
    }

    // 2. Get all patients across facilities (admin can see all)
    const allPatientsResult = await permissionManager.secureDataAccess(adminUserId, 'patients');
    console.log('All Patients Access:', allPatientsResult.success, `(${allPatientsResult.total} patients)`);

    // 3. Get comprehensive permission summary
    const adminSummary = await permissionManager.getUserPermissionSummary(adminUserId);
    console.log('Admin Permission Summary:', adminSummary.success);

  } catch (error) {
    console.error('Multi-facility workflow error:', error);
  }
}

module.exports = {
  EnhancedPermissionManager,
  examplePatientWorkflow,
  exampleMultiFacilityWorkflow,
  
  // Export individual utilities for direct use
  PermissionValidator,
  DocumentSecurity,
  FacilityScopedQueries,
  TeamPermissionChecker,
  FacilityTeamManager,
  RoleManager,
  ROLE_PERMISSIONS
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running permission integration examples...\n');
  
  examplePatientWorkflow()
    .then(() => console.log('\n'))
    .then(() => exampleMultiFacilityWorkflow())
    .then(() => console.log('\nExamples completed!'))
    .catch(console.error);
}