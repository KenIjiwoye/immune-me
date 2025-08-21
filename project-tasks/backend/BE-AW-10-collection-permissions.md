# BE-AW-10: Collection-Level Permissions for Role-Based Access

## Priority
**High** - Critical for data security and access control

## Estimated Time
6-8 hours

## Dependencies
- BE-AW-01: Appwrite project setup
- BE-AW-02: Database collections setup
- BE-AW-08: User roles setup
- BE-AW-09: Facility-based teams

## Description
Configure collection-level permissions in Appwrite to enforce role-based access control and facility-scoped data access. This task implements granular permissions for each collection based on user roles and team memberships, maintaining the current access control patterns.

## Current Collection Analysis
Based on the existing schemas, we have the following collections with facility-scoped data:
- **patients**: Contains `facility_id` for facility scoping
- **immunization_records**: Contains `facility_id` and `administered_by_user_id`
- **notifications**: Contains `facility_id` for facility scoping
- **facilities**: Master data, admin-controlled
- **vaccines**: Global reference data, admin-controlled

## Appwrite Permission System Overview

### Permission Types
- **Read**: View documents
- **Create**: Add new documents
- **Update**: Modify existing documents
- **Delete**: Remove documents

### Permission Roles
- **User-based**: `user:USER_ID`
- **Label-based**: `label:LABEL_NAME`
- **Team-based**: `team:TEAM_ID`, `team:TEAM_ID/ROLE`
- **Any authenticated**: `users`
- **Public**: `any`

## Technical Implementation

### 1. Role-Based Permission Mapping
```javascript
// Permission mapping based on current role system
const ROLE_PERMISSIONS = {
  administrator: {
    patients: ['read', 'create', 'update', 'delete'],
    immunization_records: ['read', 'create', 'update', 'delete'],
    notifications: ['read', 'create', 'update', 'delete'],
    facilities: ['read', 'create', 'update', 'delete'],
    vaccines: ['read', 'create', 'update', 'delete'],
    vaccine_schedules: ['read', 'create', 'update', 'delete'],
    vaccine_schedule_items: ['read', 'create', 'update', 'delete'],
    supplementary_immunizations: ['read', 'create', 'update', 'delete']
  },
  supervisor: {
    patients: ['read'],
    immunization_records: ['read'],
    notifications: ['read', 'create', 'update'],
    facilities: ['read'],
    vaccines: ['read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['read']
  },
  doctor: {
    patients: ['read', 'create', 'update'],
    immunization_records: ['read', 'create', 'update'],
    notifications: ['read', 'create', 'update'],
    facilities: ['read'],
    vaccines: ['read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['read', 'create', 'update']
  },
  user: {
    patients: ['read', 'create', 'update'],
    immunization_records: ['read', 'create', 'update'],
    notifications: ['read', 'update'],
    facilities: ['read'],
    vaccines: ['read'],
    vaccine_schedules: ['read'],
    vaccine_schedule_items: ['read'],
    supplementary_immunizations: ['read', 'create']
  }
};
```

### 2. Collection Permission Configuration

#### Patients Collection
```javascript
const PATIENTS_PERMISSIONS = {
  // Read permissions - facility-scoped for non-admins
  read: [
    'label:role:administrator',  // Admins can read all
    'team:facility-*-team/member'  // Team members can read facility patients
  ],
  
  // Create permissions - facility team members and above
  create: [
    'label:role:administrator',
    'label:role:doctor',
    'label:role:user',
    'team:facility-*-team/member'
  ],
  
  // Update permissions - same as create but more restricted
  update: [
    'label:role:administrator',
    'label:role:doctor',
    'label:role:user',
    'team:facility-*-team/member'
  ],
  
  // Delete permissions - administrators only
  delete: [
    'label:role:administrator'
  ]
};

// Apply with document-level security for facility scoping
await databases.updateCollection(
  DATABASE_ID,
  'patients',
  'patients',
  PATIENTS_PERMISSIONS,
  true, // documentSecurity = true for facility filtering
  true  // enabled
);
```

#### Immunization Records Collection
```javascript
const IMMUNIZATION_RECORDS_PERMISSIONS = {
  // Read permissions - facility-scoped
  read: [
    'label:role:administrator',
    'label:role:supervisor', // Supervisors can read for reporting
    'team:facility-*-team/member'
  ],
  
  // Create permissions - healthcare workers who administer vaccines
  create: [
    'label:role:administrator',
    'label:role:doctor',
    'label:role:user',
    'team:facility-*-team/member'
  ],
  
  // Update permissions - same as create
  update: [
    'label:role:administrator',
    'label:role:doctor',
    'label:role:user',
    'team:facility-*-team/member'
  ],
  
  // Delete permissions - administrators only
  delete: [
    'label:role:administrator'
  ]
};
```

#### Notifications Collection
```javascript
const NOTIFICATIONS_PERMISSIONS = {
  // Read permissions - facility-scoped
  read: [
    'label:role:administrator',
    'label:role:supervisor',
    'team:facility-*-team/member'
  ],
  
  // Create permissions - system and authorized users
  create: [
    'label:role:administrator',
    'label:role:doctor',
    'label:role:supervisor',
    'team:facility-*-team/admin' // Team admins can create notifications
  ],
  
  // Update permissions - mark as viewed/completed
  update: [
    'label:role:administrator',
    'label:role:supervisor',
    'label:role:doctor',
    'label:role:user',
    'team:facility-*-team/member'
  ],
  
  // Delete permissions - administrators only
  delete: [
    'label:role:administrator'
  ]
};
```

#### Facilities Collection
```javascript
const FACILITIES_PERMISSIONS = {
  // Read permissions - all authenticated users need to see facility info
  read: [
    'users' // All authenticated users can read facilities
  ],
  
  // Create permissions - administrators only
  create: [
    'label:role:administrator'
  ],
  
  // Update permissions - administrators only
  update: [
    'label:role:administrator'
  ],
  
  // Delete permissions - administrators only
  delete: [
    'label:role:administrator'
  ]
};
```

#### Vaccines Collection (Reference Data)
```javascript
const VACCINES_PERMISSIONS = {
  // Read permissions - all authenticated users
  read: [
    'users'
  ],
  
  // Create permissions - administrators only
  create: [
    'label:role:administrator'
  ],
  
  // Update permissions - administrators only
  update: [
    'label:role:administrator'
  ],
  
  // Delete permissions - administrators only
  delete: [
    'label:role:administrator'
  ]
};
```

### 3. Document-Level Security Implementation
```javascript
// For facility-scoped collections, implement document-level security
class DocumentSecurity {
  // Patients document security
  static async createPatientWithSecurity(patientData, userId) {
    // Get user's facility
    const user = await users.get(userId);
    const facilityId = this.getFacilityIdFromUser(user);
    
    // Set facility_id in document
    patientData.facility_id = facilityId;
    
    // Create with document permissions
    const patient = await databases.createDocument(
      DATABASE_ID,
      'patients',
      ID.unique(),
      patientData,
      [
        // Read permissions for facility team members
        `team:facility-${facilityId}-team/member`,
        'label:role:administrator',
        // Update permissions
        `team:facility-${facilityId}-team/member`,
        'label:role:administrator'
      ]
    );
    
    return patient;
  }
  
  // Immunization records document security
  static async createImmunizationRecordWithSecurity(recordData, userId) {
    const user = await users.get(userId);
    const facilityId = this.getFacilityIdFromUser(user);
    
    recordData.facility_id = facilityId;
    recordData.administered_by_user_id = userId;
    
    const record = await databases.createDocument(
      DATABASE_ID,
      'immunization_records',
      ID.unique(),
      recordData,
      [
        `team:facility-${facilityId}-team/member`,
        'label:role:administrator',
        'label:role:supervisor' // For cross-facility reporting
      ]
    );
    
    return record;
  }
}
```

### 4. Permission Validation Utilities
```javascript
class PermissionValidator {
  static async canAccessCollection(userId, collectionId, operation) {
    const user = await users.get(userId);
    
    // Check role-based permissions
    const userRole = this.getUserRole(user);
    const allowedOperations = ROLE_PERMISSIONS[userRole][collectionId] || [];
    
    if (!allowedOperations.includes(operation)) {
      return false;
    }
    
    return true;
  }
  
  static async canAccessDocument(userId, collectionId, documentId, operation) {
    // First check collection permissions
    if (!await this.canAccessCollection(userId, collectionId, operation)) {
      return false;
    }
    
    // For facility-scoped collections, check facility access
    if (this.isFacilityScopedCollection(collectionId)) {
      return await this.canAccessFacilityDocument(userId, collectionId, documentId);
    }
    
    return true;
  }
  
  static async canAccessFacilityDocument(userId, collectionId, documentId) {
    const user = await users.get(userId);
    
    // Administrators have unrestricted access
    if (this.isAdministrator(user)) {
      return true;
    }
    
    // Get document and check facility
    const document = await databases.getDocument(DATABASE_ID, collectionId, documentId);
    const documentFacilityId = document.facility_id;
    
    // Check if user can access this facility
    return await this.canAccessFacility(userId, documentFacilityId);
  }
}
```

### 5. Migration Script for Existing Permissions
```javascript
async function migrateCollectionPermissions() {
  const collections = [
    { id: 'patients', permissions: PATIENTS_PERMISSIONS },
    { id: 'immunization_records', permissions: IMMUNIZATION_RECORDS_PERMISSIONS },
    { id: 'notifications', permissions: NOTIFICATIONS_PERMISSIONS },
    { id: 'facilities', permissions: FACILITIES_PERMISSIONS },
    { id: 'vaccines', permissions: VACCINES_PERMISSIONS }
  ];
  
  for (const collection of collections) {
    try {
      await databases.updateCollection(
        DATABASE_ID,
        collection.id,
        collection.id, // name
        collection.permissions,
        true, // documentSecurity for facility-scoped collections
        true  // enabled
      );
      
      console.log(`Updated permissions for ${collection.id}`);
    } catch (error) {
      console.error(`Failed to update permissions for ${collection.id}:`, error);
    }
  }
}
```

### 6. Query Helpers for Facility Scoping
```javascript
class FacilityScopedQueries {
  static async getPatientsForUser(userId, queries = []) {
    const user = await users.get(userId);
    
    // Administrators can see all patients
    if (this.isAdministrator(user)) {
      return await databases.listDocuments(DATABASE_ID, 'patients', queries);
    }
    
    // Other users see only their facility's patients
    const facilityId = this.getFacilityIdFromUser(user);
    const facilityQuery = Query.equal('facility_id', facilityId);
    
    return await databases.listDocuments(
      DATABASE_ID, 
      'patients', 
      [...queries, facilityQuery]
    );
  }
  
  static async getImmunizationRecordsForUser(userId, queries = []) {
    const user = await users.get(userId);
    
    if (this.isAdministrator(user) || this.isSupervisor(user)) {
      return await databases.listDocuments(DATABASE_ID, 'immunization_records', queries);
    }
    
    const facilityId = this.getFacilityIdFromUser(user);
    const facilityQuery = Query.equal('facility_id', facilityId);
    
    return await databases.listDocuments(
      DATABASE_ID,
      'immunization_records',
      [...queries, facilityQuery]
    );
  }
  
  static async getNotificationsForUser(userId, queries = []) {
    const user = await users.get(userId);
    
    if (this.isAdministrator(user)) {
      return await databases.listDocuments(DATABASE_ID, 'notifications', queries);
    }
    
    const facilityId = this.getFacilityIdFromUser(user);
    const facilityQuery = Query.equal('facility_id', facilityId);
    
    return await databases.listDocuments(
      DATABASE_ID,
      'notifications',
      [...queries, facilityQuery]
    );
  }
}
```

## Files to Create/Modify

### Backend Files
1. **`appwrite-backend/utils/permission-validator.js`** - Permission checking utilities
2. **`appwrite-backend/utils/document-security.js`** - Document-level security helpers
3. **`appwrite-backend/utils/facility-scoped-queries.js`** - Facility-aware query helpers
4. **`appwrite-backend/config/collection-permissions.js`** - Permission configurations
5. **`appwrite-backend/migrations/migrate-collection-permissions.js`** - Permission migration script

### Configuration Files
1. **`appwrite-backend/config/permissions.json`** - Permission matrix for all collections
2. **`appwrite-backend/config/security-rules.json`** - Document security rules

## Acceptance Criteria

### ✅ Collection Permissions
- [ ] Each collection has appropriate role-based permissions
- [ ] Facility-scoped collections enforce facility access
- [ ] Administrator users have unrestricted access
- [ ] Read-only reference data is properly configured

### ✅ Document Security
- [ ] Document-level permissions are applied for facility scoping
- [ ] Users can only access documents from their assigned facility
- [ ] Cross-facility access works for supervisors and administrators
- [ ] Document creation automatically applies correct permissions

### ✅ Permission Validation
- [ ] Permission validation utilities work correctly
- [ ] Role-based access is properly enforced
- [ ] Facility-scoped access is validated
- [ ] Permission checks are efficient and cached

### ✅ Query Security
- [ ] Facility-scoped queries automatically filter by facility
- [ ] Cross-facility queries work for authorized users
- [ ] Query performance is optimized
- [ ] Security is maintained at query level

## Testing Requirements

### Unit Tests
```javascript
describe('Collection Permissions', () => {
  test('should allow administrators full access to all collections', async () => {
    const adminUser = { labels: ['role:administrator', 'facility:1'] };
    
    const canRead = await PermissionValidator.canAccessCollection(adminUser.$id, 'patients', 'read');
    const canCreate = await PermissionValidator.canAccessCollection(adminUser.$id, 'patients', 'create');
    const canDelete = await PermissionValidator.canAccessCollection(adminUser.$id, 'patients', 'delete');
    
    expect(canRead).toBe(true);
    expect(canCreate).toBe(true);
    expect(canDelete).toBe(true);
  });
  
  test('should restrict non-admin users from deleting', async () => {
    const doctorUser = { labels: ['role:doctor', 'facility:1'] };
    
    const canRead = await PermissionValidator.canAccessCollection(doctorUser.$id, 'patients', 'read');
    const canDelete = await PermissionValidator.canAccessCollection(doctorUser.$id, 'patients', 'delete');
    
    expect(canRead).toBe(true);
    expect(canDelete).toBe(false);
  });
  
  test('should enforce facility scoping for documents', async () => {
    const user1 = { labels: ['role:doctor', 'facility:1'] };
    const user2 = { labels: ['role:doctor', 'facility:2'] };
    
    // Create patient in facility 1
    const patient = await DocumentSecurity.createPatientWithSecurity({
      full_name: 'Test Patient',
      facility_id: '1'
    }, user1.$id);
    
    // User 1 should access, User 2 should not
    const user1CanAccess = await PermissionValidator.canAccessDocument(user1.$id, 'patients', patient.$id, 'read');
    const user2CanAccess = await PermissionValidator.canAccessDocument(user2.$id, 'patients', patient.$id, 'read');
    
    expect(user1CanAccess).toBe(true);
    expect(user2CanAccess).toBe(false);
  });
});
```

### Integration Tests
- Test permission enforcement in real Appwrite operations
- Test facility-scoped queries with various user roles
- Test document creation with automatic permission assignment
- Test migration script with sample data

## Security Best Practices

### Permission Design
- Follow principle of least privilege
- Use explicit deny where necessary
- Implement defense in depth with multiple layers
- Regular audit of permission assignments

### Document Security
- Always validate facility access on document operations
- Implement proper error handling for permission denials
- Log security violations for monitoring
- Use document-level permissions for sensitive data

### Query Security
- Never trust client-side filtering
- Always apply server-side security filters
- Validate all query parameters
- Implement rate limiting for sensitive operations

## Performance Considerations

### Optimization Strategies
- Cache permission checks for frequently accessed data
- Use indexed queries for facility filtering
- Implement efficient team membership lookups
- Monitor query performance with security filters

### Scalability
- Design for facilities with large datasets
- Consider pagination for facility-scoped queries
- Optimize permission inheritance chains
- Plan for horizontal scaling of permission checks

## Advanced Features

### Role-Based Field Access
```javascript
// Different roles see different fields
class FieldLevelSecurity {
  static filterFieldsForRole(document, userRole) {
    const roleFieldMap = {
      'user': ['full_name', 'date_of_birth', 'facility_id'],
      'doctor': ['full_name', 'date_of_birth', 'facility_id', 'mother_name', 'father_name', 'contact_phone'],
      'supervisor': ['full_name', 'date_of_birth', 'facility_id', 'district'],
      'administrator': Object.keys(document) // All fields
    };
    
    const allowedFields = roleFieldMap[userRole] || [];
    return Object.fromEntries(
      Object.entries(document).filter(([key]) => allowedFields.includes(key))
    );
  }
}
```

### Audit Logging
```javascript
// Log permission-related events
class PermissionAuditLogger {
  static async logAccessAttempt(userId, collectionId, documentId, operation, granted) {
    await databases.createDocument(
      DATABASE_ID,
      'audit_logs',
      ID.unique(),
      {
        user_id: userId,
        collection_id: collectionId,
        document_id: documentId,
        operation: operation,
        access_granted: granted,
        timestamp: new Date().toISOString(),
        ip_address: getClientIP(),
        user_agent: getUserAgent()
      }
    );
  }
}
```

## Notes
- Appwrite permissions are cumulative - if any permission grants access, it's allowed
- Document security is enforced at the database level, providing strong security
- Team-based permissions require proper team management (implemented in BE-AW-09)
- Consider implementing permission caching for high-traffic operations
- Regular security audits should validate permission configurations
- Monitor for permission-related performance bottlenecks