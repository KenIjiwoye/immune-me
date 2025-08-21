# BE-AW-07: Set Up Role-Based Access Control and Permissions

## Title
Set Up Role-Based Access Control and Permissions

## Priority
High

## Estimated Time
6-8 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system migrated

## Description
Implement comprehensive role-based access control (RBAC) and permission system using Appwrite's built-in security features. This includes defining user roles, setting collection-level permissions, implementing document-level security rules, and creating permission validation functions to ensure proper data access control across the healthcare system.

The implementation will ensure that healthcare workers can only access patients within their facility, facility managers have administrative access to their facility's data, and system administrators have full access while maintaining audit trails and compliance with healthcare data protection requirements.

## Acceptance Criteria
- [ ] User roles defined and configured in Appwrite teams
- [ ] Collection-level permissions set for all database collections
- [ ] Document-level security rules implemented
- [ ] Permission validation functions created and deployed
- [ ] Facility-based data isolation enforced
- [ ] Audit logging for permission changes implemented
- [ ] Role assignment and management functions operational
- [ ] Permission testing suite created and passing
- [ ] Security rules documentation completed
- [ ] Compliance validation performed

## Technical Notes

### Role Definitions

#### User Roles and Permissions Matrix
```javascript
const rolePermissions = {
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
      facilities: ['read', 'update'], // Only their facility
      vaccines: ['read'],
      notifications: ['create', 'read', 'update'],
      users: ['create', 'read', 'update'], // Only facility users
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
      facilities: ['read'], // Only their facility
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
```

### Collection-Level Permissions

#### Patients Collection Permissions
```javascript
// appwrite-backend/config/collection-permissions.js
const patientsPermissions = {
  // Read permissions
  read: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker',
    'role:data_entry_clerk'
  ],
  
  // Create permissions
  create: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker',
    'role:data_entry_clerk'
  ],
  
  // Update permissions
  update: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker',
    'role:data_entry_clerk'
  ],
  
  // Delete permissions (restricted)
  delete: [
    'role:admin'
  ]
};

const immunizationRecordsPermissions = {
  read: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker'
  ],
  
  create: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker'
  ],
  
  update: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker'
  ],
  
  delete: [
    'role:admin' // Only admins can delete immunization records
  ]
};

const facilitiesPermissions = {
  read: [
    'role:admin',
    'role:facility_manager',
    'role:healthcare_worker',
    'role:data_entry_clerk'
  ],
  
  create: [
    'role:admin'
  ],
  
  update: [
    'role:admin',
    'role:facility_manager' // Can only update their own facility
  ],
  
  delete: [
    'role:admin'
  ]
};
```

### Document-Level Security Rules

#### Permission Validation Function
```javascript
// appwrite-backend/functions/permissions/validate-document-access/src/main.js
const { Client, Databases, Users } = require('node-appwrite');

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

    // Get user details and role
    const user = await users.get(userId);
    const userRole = user.prefs?.role || 'healthcare_worker';
    const userFacilityId = user.prefs?.facilityId;

    // Validate access based on role and document
    const hasAccess = await validateDocumentAccess(
      userRole,
      userFacilityId,
      collection,
      documentId,
      operation,
      documentData
    );

    // Log access attempt for audit
    await logAccessAttempt({
      userId,
      userRole,
      collection,
      documentId,
      operation,
      granted: hasAccess,
      timestamp: new Date().toISOString()
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

  async function validateDocumentAccess(userRole, userFacilityId, collection, documentId, operation, documentData) {
    // Check role-based permissions first
    const rolePermissions = getRolePermissions(userRole);
    if (!rolePermissions.permissions[collection]?.includes(operation)) {
      return false;
    }

    // For admins, allow all access
    if (userRole === 'admin') {
      return true;
    }

    // For facility-based roles, check facility access
    if (rolePermissions.dataAccess === 'facility_only') {
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
        const document = await databases.getDocument('immune-me-db', collection, documentId);
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
        return documentData?.facilityId === userFacilityId;
      }
      throw fetchError;
    }
  }

  function getRolePermissions(role) {
    return rolePermissions[role] || rolePermissions.healthcare_worker;
  }

  async function logAccessAttempt(logData) {
    try {
      await databases.createDocument(
        'immune-me-db',
        'access_audit_log',
        'unique()',
        logData
      );
    } catch (logError) {
      error('Failed to log access attempt: ' + logError.message);
    }
  }
};
```

#### Role Assignment Function
```javascript
// appwrite-backend/functions/permissions/assign-user-role/src/main.js
const { Client, Users, Teams } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const users = new Users(client);
  const teams = new Teams(client);

  try {
    const {
      targetUserId,
      newRole,
      facilityId,
      assignedBy
    } = JSON.parse(req.payload || '{}');

    // Validate the assigning user has permission
    const assigningUser = await users.get(assignedBy);
    const assigningUserRole = assigningUser.prefs?.role;

    if (!canAssignRole(assigningUserRole, newRole)) {
      return res.json({
        success: false,
        error: 'Insufficient permissions to assign this role'
      }, 403);
    }

    // Get target user
    const targetUser = await users.get(targetUserId);
    const currentRole = targetUser.prefs?.role;

    // Remove user from current role team
    if (currentRole) {
      const currentTeamId = getRoleTeamId(currentRole);
      try {
        const memberships = await teams.listMemberships(currentTeamId);
        const membership = memberships.memberships.find(m => m.userId === targetUserId);
        if (membership) {
          await teams.deleteMembership(currentTeamId, membership.$id);
        }
      } catch (removeError) {
        log(`Warning: Could not remove user from current team: ${removeError.message}`);
      }
    }

    // Add user to new role team
    const newTeamId = getRoleTeamId(newRole);
    await teams.createMembership(
      newTeamId,
      targetUser.email,
      ['member'],
      `${process.env.FRONTEND_URL}/auth/verify`
    );

    // Update user preferences
    await users.updatePrefs(targetUserId, {
      ...targetUser.prefs,
      role: newRole,
      facilityId: facilityId || targetUser.prefs?.facilityId,
      roleAssignedBy: assignedBy,
      roleAssignedAt: new Date().toISOString()
    });

    // Log role change
    await logRoleChange({
      targetUserId,
      previousRole: currentRole,
      newRole,
      facilityId,
      assignedBy,
      timestamp: new Date().toISOString()
    });

    log(`Role changed for user ${targetUserId}: ${currentRole} -> ${newRole}`);

    return res.json({
      success: true,
      userId: targetUserId,
      previousRole: currentRole,
      newRole,
      facilityId
    });

  } catch (err) {
    error('Role assignment failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function canAssignRole(assigningRole, targetRole) {
    const roleHierarchy = {
      admin: ['admin', 'facility_manager', 'healthcare_worker', 'data_entry_clerk'],
      facility_manager: ['healthcare_worker', 'data_entry_clerk']
    };

    return roleHierarchy[assigningRole]?.includes(targetRole) || false;
  }

  function getRoleTeamId(role) {
    const teamMapping = {
      admin: 'admin-team',
      facility_manager: 'facility-managers',
      healthcare_worker: 'healthcare-workers',
      data_entry_clerk: 'data-entry-clerks'
    };

    return teamMapping[role] || 'healthcare-workers';
  }

  async function logRoleChange(changeData) {
    try {
      const { Client, Databases } = require('node-appwrite');
      const dbClient = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      const databases = new Databases(dbClient);
      
      await databases.createDocument(
        'immune-me-db',
        'role_change_log',
        'unique()',
        changeData
      );
    } catch (logError) {
      error('Failed to log role change: ' + logError.message);
    }
  }
};
```

### Security Rules Implementation

#### Collection Security Rules Setup
```javascript
// appwrite-backend/utils/setup-security-rules.js
const { Client, Databases } = require('node-appwrite');

async function setupCollectionPermissions() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const collections = [
    {
      id: 'patients',
      permissions: {
        read: ['role:admin', 'role:facility_manager', 'role:healthcare_worker', 'role:data_entry_clerk'],
        create: ['role:admin', 'role:facility_manager', 'role:healthcare_worker', 'role:data_entry_clerk'],
        update: ['role:admin', 'role:facility_manager', 'role:healthcare_worker', 'role:data_entry_clerk'],
        delete: ['role:admin']
      }
    },
    {
      id: 'immunization_records',
      permissions: {
        read: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        create: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        update: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        delete: ['role:admin']
      }
    },
    {
      id: 'facilities',
      permissions: {
        read: ['role:admin', 'role:facility_manager', 'role:healthcare_worker', 'role:data_entry_clerk'],
        create: ['role:admin'],
        update: ['role:admin', 'role:facility_manager'],
        delete: ['role:admin']
      }
    },
    {
      id: 'vaccines',
      permissions: {
        read: ['role:admin', 'role:facility_manager', 'role:healthcare_worker', 'role:data_entry_clerk'],
        create: ['role:admin'],
        update: ['role:admin'],
        delete: ['role:admin']
      }
    },
    {
      id: 'notifications',
      permissions: {
        read: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        create: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        update: ['role:admin', 'role:facility_manager', 'role:healthcare_worker'],
        delete: ['role:admin']
      }
    }
  ];

  for (const collection of collections) {
    try {
      // Update collection permissions
      await databases.updateCollection(
        'immune-me-db',
        collection.id,
        collection.id,
        [
          ...collection.permissions.read.map(p => `${p}:read`),
          ...collection.permissions.create.map(p => `${p}:create`),
          ...collection.permissions.update.map(p => `${p}:update`),
          ...collection.permissions.delete.map(p => `${p}:delete`)
        ]
      );

      console.log(`Updated permissions for collection: ${collection.id}`);
    } catch (error) {
      console.error(`Failed to update permissions for ${collection.id}:`, error.message);
    }
  }
}

module.exports = { setupCollectionPermissions };
```

### Audit and Compliance

#### Audit Collection Schemas
```json
{
  "access_audit_log": {
    "attributes": [
      {"key": "userId", "type": "string", "size": 36, "required": true},
      {"key": "userRole", "type": "string", "size": 50, "required": true},
      {"key": "collection", "type": "string", "size": 100, "required": true},
      {"key": "documentId", "type": "string", "size": 36},
      {"key": "operation", "type": "enum", "elements": ["read", "create", "update", "delete"], "required": true},
      {"key": "granted", "type": "boolean", "required": true},
      {"key": "timestamp", "type": "datetime", "required": true},
      {"key": "ipAddress", "type": "string", "size": 45},
      {"key": "userAgent", "type": "string", "size": 500}
    ],
    "indexes": [
      {"key": "userId", "type": "key"},
      {"key": "timestamp", "type": "key"},
      {"key": "granted", "type": "key"},
      {"key": "operation", "type": "key"}
    ]
  },
  
  "role_change_log": {
    "attributes": [
      {"key": "targetUserId", "type": "string", "size": 36, "required": true},
      {"key": "previousRole", "type": "string", "size": 50},
      {"key": "newRole", "type": "string", "size": 50, "required": true},
      {"key": "facilityId", "type": "string", "size": 36},
      {"key": "assignedBy", "type": "string", "size": 36, "required": true},
      {"key": "timestamp", "type": "datetime", "required": true},
      {"key": "reason", "type": "string", "size": 500}
    ],
    "indexes": [
      {"key": "targetUserId", "type": "key"},
      {"key": "assignedBy", "type": "key"},
      {"key": "timestamp", "type": "key"}
    ]
  }
}
```

## Files to Create/Modify
- `appwrite-backend/functions/permissions/validate-document-access/` - Document access validation
- `appwrite-backend/functions/permissions/assign-user-role/` - Role assignment function
- `appwrite-backend/functions/permissions/audit-access-log/` - Access logging function
- `appwrite-backend/config/role-definitions.json` - Role and permission definitions
- `appwrite-backend/config/collection-permissions.json` - Collection-level permissions
- `appwrite-backend/utils/setup-security-rules.js` - Security rules setup utility
- `appwrite-backend/utils/permission-helpers.js` - Permission utility functions
- `appwrite-backend/schemas/audit-collections.json` - Audit collection schemas
- `appwrite-backend/config/teams-setup.js` - Team creation and management

## Testing Requirements

### Permission Testing
1. **Role-Based Access Test**
   ```javascript
   // Test healthcare worker access to patient data
   const accessTest = {
     userId: 'healthcare-worker-001',
     collection: 'patients',
     documentId: 'patient-001',
     operation: 'read'
   };
   
   const result = await mcpServer.functions.createExecution(
     'validate-document-access',
     JSON.stringify(accessTest)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'Permission validation should succeed');
   assert(response.hasAccess, 'Healthcare worker should have patient access');
   ```

2. **Facility Isolation Test**
   ```javascript
   // Test that users can only access their facility's data
   const crossFacilityTest = {
     userId: 'healthcare-worker-facility-a',
     collection: 'patients',
     documentId: 'patient-facility-b', // Different facility
     operation: 'read'
   };
   
   const result = await mcpServer.functions.createExecution(
     'validate-document-access',
     JSON.stringify(crossFacilityTest)
   );
   
   const response = JSON.parse(result.response);
   assert(!response.hasAccess, 'Should not have access to other facility data');
   ```

3. **Role Assignment Test**
   ```javascript
   // Test role assignment by facility manager
   const roleAssignment = {
     targetUserId: 'new-user-001',
     newRole: 'healthcare_worker',
     facilityId: 'facility-001',
     assignedBy: 'facility-manager-001'
   };
   
   const result = await mcpServer.functions.createExecution(
     'assign-user-role',
     JSON.stringify(roleAssignment)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'Role assignment should succeed');
   assert(response.newRole === 'healthcare_worker', 'Role should be assigned correctly');
   ```

### Security Testing
1. **Privilege Escalation Test**
   - Verify users cannot escalate their own privileges
   - Test that role assignments respect hierarchy
   - Validate admin-only operations are protected

2. **Data Isolation Test**
   - Verify facility-based data isolation
   - Test cross-facility access prevention
   - Validate admin override capabilities

### Audit Testing
1. **Access Logging Test**
   ```javascript
   // Verify all access attempts are logged
   const auditLogs = await databases.listDocuments(
     'immune-me-db',
     'access_audit_log',
     [Query.equal('userId', 'test-user-001')]
   );
   
   assert(auditLogs.total > 0, 'Access attempts should be logged');
   ```

2. **Role Change Logging Test**
   ```javascript
   // Verify role changes are logged
   const roleChangeLogs = await databases.listDocuments(
     'immune-me-db',
     'role_change_log',
     [Query.equal('targetUserId', 'test-user-001')]
   );
   
   assert(roleChangeLogs.total > 0, 'Role changes should be logged');
   ```

## Implementation Steps

### Phase 1: Role and Team Setup
1. Define user roles and permissions
2. Create Appwrite teams for each role
3. Set up role hierarchy and assignment rules
4. Test basic role functionality

### Phase 2: Collection Permissions
1. Configure collection-level permissions
2. Set up document-level security rules
3. Implement permission validation functions
4. Test collection access controls

### Phase 3: Audit and Compliance
1. Create audit logging collections
2. Implement access logging functions
3. Set up role change tracking
4. Test audit trail functionality

### Phase 4: Integration and Testing
1. Integrate with authentication system
2. Test complete permission workflows
3. Validate security rules
4. Perform compliance verification

## Success Metrics
- All user roles properly configured and functional
- Collection permissions enforced correctly
- Document-level security working as expected
- Facility-based data isolation verified
- Audit logging capturing all access attempts
- Role assignment workflows operational
- Security testing passing all scenarios

## Rollback Plan
- Document all permission configurations
- Maintain backup of current security settings
- Test rollback procedures in development
- Ensure ability to restore previous permissions

## Next Steps
After completion, this task enables:
- Secure deployment of all Appwrite functions
- Frontend integration with proper access controls
- Full system security and compliance
- Production deployment readiness