/**
 * DocumentSecurity - Secure document creation utility with proper permissions
 * Based on BE-AW-10 ticket requirements
 * 
 * This class provides secure document creation methods that automatically set
 * appropriate permissions based on facility and user context.
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');
const { PermissionValidator } = require('./permission-validator');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');

// Import configuration
const teamPermissions = require('../config/team-permissions.json');
const { generateFacilityTeamName } = require('../config/team-structure');
const { ROLE_LABELS } = require('../config/roles');

class DocumentSecurity {
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
      enableAuditLogging: options.enableAuditLogging !== false,
      strictPermissions: options.strictPermissions !== false,
      ...options.config
    };
  }

  /**
   * Create patient with proper security permissions
   * @param {Object} patientData - Patient data
   * @param {string} userId - User ID creating the patient
   * @returns {Promise<Object>} Creation result with security details
   */
  async createPatientWithSecurity(patientData, userId) {
    try {
      if (!patientData || !userId) {
        throw new Error('Patient data and user ID are required');
      }

      // Validate user can create patients
      const canCreate = await this.permissionValidator.canAccessCollection(userId, 'patients', 'create');
      if (!canCreate.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canCreate.reason}`,
          operation: 'create_patient'
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          operation: 'create_patient'
        };
      }

      // Ensure facility ID is set
      const facilityId = patientData.facilityId || patientData.facility_id || roleInfo.facilityId;
      if (!facilityId) {
        return {
          success: false,
          error: 'Facility ID is required for patient creation',
          operation: 'create_patient'
        };
      }

      // Prepare patient data with security fields
      const securePatientData = {
        ...patientData,
        facilityId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      };

      // Generate document permissions
      const permissions = await this._generateDocumentPermissions('patients', facilityId, userId, roleInfo.role);

      // Create the patient document
      const patient = await this.databases.createDocument(
        this.config.databaseId,
        'patients',
        'unique()',
        securePatientData,
        permissions
      );

      // Log audit trail if enabled
      if (this.config.enableAuditLogging) {
        await this._logAuditEvent('patient_created', {
          documentId: patient.$id,
          userId,
          facilityId,
          role: roleInfo.role
        });
      }

      return {
        success: true,
        patient,
        security: {
          facilityId,
          createdBy: userId,
          permissions: permissions.length,
          role: roleInfo.role
        },
        operation: 'create_patient'
      };

    } catch (error) {
      console.error('Error creating patient with security:', error);
      return {
        success: false,
        error: error.message,
        operation: 'create_patient'
      };
    }
  }

  /**
   * Create immunization record with proper security permissions
   * @param {Object} recordData - Immunization record data
   * @param {string} userId - User ID creating the record
   * @returns {Promise<Object>} Creation result with security details
   */
  async createImmunizationRecordWithSecurity(recordData, userId) {
    try {
      if (!recordData || !userId) {
        throw new Error('Immunization record data and user ID are required');
      }

      // Validate user can create immunization records
      const canCreate = await this.permissionValidator.canAccessCollection(userId, 'immunization_records', 'create');
      if (!canCreate.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canCreate.reason}`,
          operation: 'create_immunization_record'
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          operation: 'create_immunization_record'
        };
      }

      // Validate patient access if patientId is provided
      if (recordData.patientId) {
        const canAccessPatient = await this.permissionValidator.canAccessDocument(
          userId, 'patients', recordData.patientId, 'read'
        );
        if (!canAccessPatient.allowed) {
          return {
            success: false,
            error: `Cannot access patient: ${canAccessPatient.reason}`,
            operation: 'create_immunization_record'
          };
        }
      }

      // Determine facility ID
      const facilityId = recordData.facilityId || recordData.facility_id || roleInfo.facilityId;
      if (!facilityId) {
        return {
          success: false,
          error: 'Facility ID is required for immunization record creation',
          operation: 'create_immunization_record'
        };
      }

      // Prepare record data with security fields
      const secureRecordData = {
        ...recordData,
        facilityId,
        administeredBy: userId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      };

      // Generate document permissions
      const permissions = await this._generateDocumentPermissions('immunization_records', facilityId, userId, roleInfo.role);

      // Create the immunization record
      const record = await this.databases.createDocument(
        this.config.databaseId,
        'immunization_records',
        'unique()',
        secureRecordData,
        permissions
      );

      // Log audit trail if enabled
      if (this.config.enableAuditLogging) {
        await this._logAuditEvent('immunization_record_created', {
          documentId: record.$id,
          patientId: recordData.patientId,
          userId,
          facilityId,
          role: roleInfo.role
        });
      }

      return {
        success: true,
        record,
        security: {
          facilityId,
          administeredBy: userId,
          createdBy: userId,
          permissions: permissions.length,
          role: roleInfo.role
        },
        operation: 'create_immunization_record'
      };

    } catch (error) {
      console.error('Error creating immunization record with security:', error);
      return {
        success: false,
        error: error.message,
        operation: 'create_immunization_record'
      };
    }
  }

  /**
   * Create notification with proper security permissions
   * @param {Object} notificationData - Notification data
   * @param {string} userId - User ID creating the notification
   * @returns {Promise<Object>} Creation result with security details
   */
  async createNotificationWithSecurity(notificationData, userId) {
    try {
      if (!notificationData || !userId) {
        throw new Error('Notification data and user ID are required');
      }

      // Validate user can create notifications
      const canCreate = await this.permissionValidator.canAccessCollection(userId, 'notifications', 'create');
      if (!canCreate.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canCreate.reason}`,
          operation: 'create_notification'
        };
      }

      // Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        return {
          success: false,
          error: 'Could not determine user role',
          operation: 'create_notification'
        };
      }

      // Determine facility ID
      const facilityId = notificationData.facilityId || notificationData.facility_id || roleInfo.facilityId;
      if (!facilityId) {
        return {
          success: false,
          error: 'Facility ID is required for notification creation',
          operation: 'create_notification'
        };
      }

      // Prepare notification data with security fields
      const secureNotificationData = {
        ...notificationData,
        facilityId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        status: notificationData.status || 'pending'
      };

      // Generate document permissions
      const permissions = await this._generateDocumentPermissions('notifications', facilityId, userId, roleInfo.role);

      // Create the notification
      const notification = await this.databases.createDocument(
        this.config.databaseId,
        'notifications',
        'unique()',
        secureNotificationData,
        permissions
      );

      // Log audit trail if enabled
      if (this.config.enableAuditLogging) {
        await this._logAuditEvent('notification_created', {
          documentId: notification.$id,
          userId,
          facilityId,
          role: roleInfo.role,
          type: notificationData.type
        });
      }

      return {
        success: true,
        notification,
        security: {
          facilityId,
          createdBy: userId,
          permissions: permissions.length,
          role: roleInfo.role
        },
        operation: 'create_notification'
      };

    } catch (error) {
      console.error('Error creating notification with security:', error);
      return {
        success: false,
        error: error.message,
        operation: 'create_notification'
      };
    }
  }

  /**
   * Update document with security validation
   * @param {string} collectionId - Collection ID
   * @param {string} documentId - Document ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID performing the update
   * @returns {Promise<Object>} Update result with security details
   */
  async updateDocumentWithSecurity(collectionId, documentId, updateData, userId) {
    try {
      if (!collectionId || !documentId || !updateData || !userId) {
        throw new Error('Collection ID, document ID, update data, and user ID are required');
      }

      // Validate user can update the document
      const canUpdate = await this.permissionValidator.canAccessDocument(userId, collectionId, documentId, 'update');
      if (!canUpdate.allowed) {
        return {
          success: false,
          error: `Permission denied: ${canUpdate.reason}`,
          operation: 'update_document'
        };
      }

      // Add security fields to update data
      const secureUpdateData = {
        ...updateData,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      };

      // Update the document
      const updatedDocument = await this.databases.updateDocument(
        this.config.databaseId,
        collectionId,
        documentId,
        secureUpdateData
      );

      // Log audit trail if enabled
      if (this.config.enableAuditLogging) {
        await this._logAuditEvent('document_updated', {
          collectionId,
          documentId,
          userId,
          updatedFields: Object.keys(updateData)
        });
      }

      return {
        success: true,
        document: updatedDocument,
        security: {
          updatedBy: userId,
          updatedAt: secureUpdateData.updatedAt
        },
        operation: 'update_document'
      };

    } catch (error) {
      console.error('Error updating document with security:', error);
      return {
        success: false,
        error: error.message,
        operation: 'update_document'
      };
    }
  }

  // Private helper methods

  /**
   * Generate document permissions based on facility and user context
   * @private
   */
  async _generateDocumentPermissions(collectionId, facilityId, userId, userRole) {
    const permissions = [];

    try {
      // Global admin permissions
      const globalAdminTeam = teamPermissions.globalAdminTeam.name;
      permissions.push(Permission.read(Role.team(globalAdminTeam, 'owner')));
      permissions.push(Permission.write(Role.team(globalAdminTeam, 'owner')));
      permissions.push(Permission.delete(Role.team(globalAdminTeam, 'owner')));

      // Facility team permissions
      const facilityTeamName = generateFacilityTeamName(facilityId);
      const collectionRules = teamPermissions.collectionTeamRules[collectionId];

      if (collectionRules) {
        // Read permissions
        if (collectionRules.readPermissions) {
          for (const rolePattern of collectionRules.readPermissions) {
            if (rolePattern.includes('{facilityId}')) {
              const role = rolePattern.replace('{facilityId}', facilityId);
              const [teamPart, rolePart] = role.split('/');
              const teamName = teamPart.replace('team:', '');
              permissions.push(Permission.read(Role.team(teamName, rolePart)));
            }
          }
        }

        // Write permissions
        if (collectionRules.writePermissions) {
          for (const rolePattern of collectionRules.writePermissions) {
            if (rolePattern.includes('{facilityId}')) {
              const role = rolePattern.replace('{facilityId}', facilityId);
              const [teamPart, rolePart] = role.split('/');
              const teamName = teamPart.replace('team:', '');
              permissions.push(Permission.write(Role.team(teamName, rolePart)));
            }
          }
        }

        // Delete permissions (usually only global admin)
        if (collectionRules.deletePermissions) {
          for (const rolePattern of collectionRules.deletePermissions) {
            if (rolePattern.includes('global-admin-team')) {
              permissions.push(Permission.delete(Role.team('global-admin-team', 'owner')));
            }
          }
        }
      }

      // Creator permissions (user who created the document)
      permissions.push(Permission.read(Role.user(userId)));
      if (userRole !== 'data_entry_clerk') {
        permissions.push(Permission.write(Role.user(userId)));
      }

    } catch (error) {
      console.error('Error generating document permissions:', error);
      // Fallback to basic permissions
      permissions.push(Permission.read(Role.user(userId)));
      permissions.push(Permission.write(Role.user(userId)));
    }

    return permissions;
  }

  /**
   * Log audit event
   * @private
   */
  async _logAuditEvent(eventType, eventData) {
    try {
      const auditLog = {
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
        source: 'DocumentSecurity'
      };

      // In a real implementation, this would write to an audit log collection
      console.log('Audit Log:', JSON.stringify(auditLog));
      
      // TODO: Implement actual audit logging to database
      // await this.databases.createDocument(
      //   this.config.databaseId,
      //   'audit_logs',
      //   'unique()',
      //   auditLog
      // );

    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Validate facility access for document creation
   * @private
   */
  async _validateFacilityAccess(userId, facilityId) {
    try {
      const facilityAccess = await this.teamChecker.checkFacilityAccess(userId, facilityId);
      return facilityAccess.allowed;
    } catch (error) {
      console.error('Error validating facility access:', error);
      return false;
    }
  }

  /**
   * Get document security metadata
   */
  async getDocumentSecurityInfo(collectionId, documentId) {
    try {
      const document = await this.databases.getDocument(this.config.databaseId, collectionId, documentId);
      
      return {
        success: true,
        security: {
          facilityId: document.facilityId || document.facility_id,
          createdBy: document.createdBy,
          createdAt: document.createdAt,
          updatedBy: document.updatedBy,
          updatedAt: document.updatedAt,
          permissions: document.$permissions || []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DocumentSecurity;