'use strict';

const { Client, Databases, Users } = require('node-appwrite');

let roleDefinitions = null;
try {
  roleDefinitions = require('../../../config/role-definitions.json');
} catch (e) {
  roleDefinitions = {
    admin: {
      description: 'System administrators with full access',
      permissions: {
        patients: ['create', 'read', 'update', 'delete'],
        immunization_records: ['create', 'read', 'update', 'delete'],
        facilities: ['create', 'read', 'update', 'delete'],
        vaccines: ['create', 'read', 'update', 'delete'],
        notifications: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete'],
        reports: ['create', 'read', 'update', 'delete'],
        system_settings: ['read', 'update']
      },
      dataAccess: 'all_facilities',
      specialPermissions: ['user_management', 'system_configuration', 'audit_access']
    },
    facility_manager: {
      description: 'Facility managers with administrative access to their facility',
      permissions: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read', 'update'],
        facilities: ['read', 'update'],
        vaccines: ['read'],
        notifications: ['create', 'read', 'update'],
        users: ['create', 'read', 'update'],
        reports: ['create', 'read']
      },
      dataAccess: 'facility_only',
      specialPermissions: ['facility_user_management', 'facility_reports']
    },
    healthcare_worker: {
      description: 'Healthcare workers managing patient records',
      permissions: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read', 'update'],
        facilities: ['read'],
        vaccines: ['read'],
        notifications: ['read', 'update']
      },
      dataAccess: 'facility_only',
      specialPermissions: ['patient_care']
    },
    data_entry_clerk: {
      description: 'Data entry personnel with limited access',
      permissions: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read'],
        facilities: ['read'],
        vaccines: ['read'],
        notifications: ['read']
      },
      dataAccess: 'facility_only',
      specialPermissions: []
    }
  };
}

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);

  try {
    const {
      userId,
      collection,
      documentId,
      operation, // 'read', 'create', 'update', 'delete'
      documentData
    } = JSON.parse(req.payload || '{}');

    if (!userId || !collection || !operation) {
      return res.json({ success: false, error: 'Missing required fields: userId, collection, operation' }, 400);
    }

    // Get user details and role
    const user = await users.get(userId);
    const userRole = user.prefs && user.prefs.role ? user.prefs.role : 'healthcare_worker';
    const userFacilityId = user.prefs && user.prefs.facilityId ? user.prefs.facilityId : null;

    // Validate access based on role and document
    const hasAccess = await validateDocumentAccess(
      userRole,
      userFacilityId,
      collection,
      documentId,
      operation,
      documentData
    );

    // Log access attempt for audit (including basic request metadata)
    await logAccessAttempt({
      userId,
      userRole,
      collection,
      documentId,
      operation,
      granted: hasAccess,
      timestamp: new Date().toISOString(),
      ipAddress: req && req.ip ? req.ip : (req && req.headers && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : (req && req.headers && req.headers['x-appwrite-user-ip'] ? req.headers['x-appwrite-user-ip'] : null)),
      userAgent: req && req.headers && req.headers['user-agent'] ? req.headers['user-agent'] : null
    });

    return res.json({
      success: true,
      hasAccess,
      userRole,
      operation,
      collection,
      documentId
    });

  } catch (err) {
    error('Permission validation failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function getRolePermissions(role) {
    return roleDefinitions[role] || roleDefinitions.healthcare_worker;
  }

  async function validateDocumentAccess(userRole, userFacilityId, collection, documentId, operation, documentData) {
    // Check role-based permissions first
    const rolePerms = getRolePermissions(userRole);
    if (!rolePerms.permissions[collection] || !rolePerms.permissions[collection].includes(operation)) {
      return false;
    }

    // For admins, allow all access
    if (userRole === 'admin') {
      return true;
    }

    // For facility-based roles, check facility access
    if (rolePerms.dataAccess === 'facility_only') {
      return await validateFacilityAccess(
        userFacilityId,
        collection,
        documentId,
        documentData
      );
    }

    return true;
  }

  async function validateFacilityAccess(userFacilityId, collection, documentId, documentData) {
    if (!userFacilityId) {
      return false; // User must be assigned to a facility
    }

    try {
      let documentFacilityId;

      if (documentData && documentData.facilityId) {
        // Use facility ID from provided data (for create operations)
        documentFacilityId = documentData.facilityId;
      } else if (documentId) {
        // Fetch document to get facility ID
        const document = await databases.getDocument(process.env.APPWRITE_DATABASE_ID || 'immune-me-db', collection, documentId);
        documentFacilityId = document.facilityId;
      }

      // Special handling for facilities collection
      if (collection === 'facilities') {
        documentFacilityId = documentId; // The document ID is the facility ID
      }

      return documentFacilityId === userFacilityId;
    } catch (fetchError) {
      if (fetchError.code === 404) {
        // Document doesn't exist, allow create if facility matches
        return documentData && documentData.facilityId === userFacilityId;
      }
      throw fetchError;
    }
  }

  async function logAccessAttempt(logData) {
    try {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID || 'immune-me-db',
        'access_audit_log',
        'unique()',
        logData
      );
    } catch (logErr) {
      error('Failed to log access attempt: ' + logErr.message);
    }
  }
};