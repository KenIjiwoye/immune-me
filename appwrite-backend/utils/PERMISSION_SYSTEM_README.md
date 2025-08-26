# Enhanced Permission System - BE-AW-10 Implementation

This document describes the enhanced collection-level permission utilities that extend the existing permission system with specific collection-level permission logic from the BE-AW-10 ticket.

## Overview

The enhanced permission system provides:
- **Collection-level permission validation**
- **Secure document creation with proper permissions**
- **Facility-scoped data queries**
- **Integration with existing team-based permissions**
- **Role-based access control mapping**

## Architecture

The system consists of several interconnected utilities that work together:

```
┌─────────────────────────────────────────────────────────────┐
│                Enhanced Permission System                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ PermissionValidator │  │ DocumentSecurity │  │ FacilityScoped │ │
│  │                 │  │                 │  │   Queries    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                   │       │
│           └─────────────────────┼───────────────────┘       │
│                                 │                           │
├─────────────────────────────────┼───────────────────────────┤
│              Existing System    │                           │
│  ┌─────────────────┐  ┌─────────┴─────────┐  ┌──────────────┐ │
│  │TeamPermissionChecker│  │FacilityTeamManager│  │ RoleManager  │ │
│  └─────────────────┘  └───────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. PermissionValidator

**File**: `permission-validator.js`

Provides collection-level permission validation with role-based access control.

#### Key Methods:
- `canAccessCollection(userId, collectionId, operation)` - Check role-based collection access
- `canAccessDocument(userId, collectionId, documentId, operation)` - Check document-level access
- `canAccessFacilityDocument(userId, collectionId, documentId)` - Facility-scoped document access
- `validateBatchPermissions(userId, permissions)` - Validate multiple permissions at once
- `getUserCollectionPermissions(userId, collectionId, facilityId)` - Get user's effective permissions

#### Usage Example:
```javascript
const { PermissionValidator } = require('./permission-validator');

const validator = new PermissionValidator();

// Check if user can create patients
const canCreate = await validator.canAccessCollection('user123', 'patients', 'create');
if (canCreate.allowed) {
  // Proceed with patient creation
}

// Check document-level access
const canAccess = await validator.canAccessDocument('user123', 'patients', 'patient456', 'read');
```

### 2. DocumentSecurity

**File**: `document-security.js`

Provides secure document creation methods that automatically set appropriate permissions.

#### Key Methods:
- `createPatientWithSecurity(patientData, userId)` - Create patients with proper permissions
- `createImmunizationRecordWithSecurity(recordData, userId)` - Create immunization records with security
- `createNotificationWithSecurity(notificationData, userId)` - Create notifications with security
- `updateDocumentWithSecurity(collectionId, documentId, updateData, userId)` - Update with validation
- `getDocumentSecurityInfo(collectionId, documentId)` - Get security metadata

#### Usage Example:
```javascript
const DocumentSecurity = require('./document-security');

const docSecurity = new DocumentSecurity();

// Create patient with automatic security
const result = await docSecurity.createPatientWithSecurity({
  firstName: 'John',
  lastName: 'Doe',
  facilityId: 'facility123'
}, 'user456');

if (result.success) {
  console.log('Patient created with security:', result.patient.$id);
}
```

### 3. FacilityScopedQueries

**File**: `facility-scoped-queries.js`

Provides methods for querying data with proper facility scoping.

#### Key Methods:
- `getPatientsForUser(userId, queries)` - Get patients with facility scoping
- `getImmunizationRecordsForUser(userId, queries)` - Get immunization records with scoping
- `getNotificationsForUser(userId, queries)` - Get notifications with scoping
- `getFacilitiesForUser(userId, queries)` - Get accessible facilities
- `getReportsForUser(userId, queries)` - Get reports with scoping
- `executeCustomQuery(userId, collectionId, queries, operation)` - Custom scoped queries

#### Usage Example:
```javascript
const FacilityScopedQueries = require('./facility-scoped-queries');

const scopedQueries = new FacilityScopedQueries();

// Get patients for user with facility scoping
const patients = await scopedQueries.getPatientsForUser('user123', [
  Query.equal('status', 'active')
]);

console.log(`Found ${patients.total} patients in user's facility`);
```

### 4. ROLE_PERMISSIONS Constant

**File**: `permission-validator.js`

Maps each role to their allowed operations on each collection.

```javascript
const ROLE_PERMISSIONS = {
  administrator: {
    patients: ['create', 'read', 'update', 'delete'],
    immunization_records: ['create', 'read', 'update', 'delete'],
    facilities: ['create', 'read', 'update', 'delete'],
    // ... more collections
  },
  facility_manager: {
    patients: ['create', 'read', 'update'],
    immunization_records: ['create', 'read', 'update'],
    facilities: ['read', 'update'],
    // ... more collections
  },
  // ... more roles
};
```

## Integration with Existing System

The enhanced utilities integrate seamlessly with the existing permission system:

### Existing Utilities Used:
- **TeamPermissionChecker** - For team-based permission validation
- **FacilityTeamManager** - For facility team management
- **RoleManager** - For user role management
- **Permission helpers** - For role-based operations

### Configuration Files Used:
- `team-permissions.json` - Team permission rules
- `team-structure.js` - Team structure and roles
- `role-definitions.json` - Role definitions
- `roles.js` - Role constants and utilities

## Enhanced Permission Manager

**File**: `permission-integration-example.js`

Provides a unified interface for all permission operations.

```javascript
const { EnhancedPermissionManager } = require('./permission-integration-example');

const manager = new EnhancedPermissionManager();

// Complete permission workflow
const permissionCheck = await manager.checkCompletePermissions('user123', 'create', {
  collectionId: 'patients',
  facilityId: 'facility456'
});

// Secure data access
const patients = await manager.secureDataAccess('user123', 'patients');

// Secure document creation
const result = await manager.secureDocumentCreation('user123', 'patients', patientData);

// User permission summary
const summary = await manager.getUserPermissionSummary('user123');
```

## Usage Patterns

### 1. Basic Permission Check
```javascript
const { PermissionValidator } = require('./utils/permission-validator');

const validator = new PermissionValidator();
const canAccess = await validator.canAccessCollection(userId, 'patients', 'read');

if (canAccess.allowed) {
  // Proceed with operation
} else {
  // Handle permission denied
  console.log('Access denied:', canAccess.reason);
}
```

### 2. Secure Document Creation
```javascript
const DocumentSecurity = require('./utils/document-security');

const docSecurity = new DocumentSecurity();
const result = await docSecurity.createPatientWithSecurity(patientData, userId);

if (result.success) {
  // Document created with proper permissions
  console.log('Created:', result.patient.$id);
} else {
  // Handle creation failure
  console.log('Creation failed:', result.error);
}
```

### 3. Facility-Scoped Data Access
```javascript
const FacilityScopedQueries = require('./utils/facility-scoped-queries');

const queries = new FacilityScopedQueries();
const result = await queries.getPatientsForUser(userId, [
  Query.equal('status', 'active'),
  Query.limit(25)
]);

// Results are automatically scoped to user's facility
console.log(`Found ${result.total} patients`);
```

### 4. Comprehensive Permission Management
```javascript
const { EnhancedPermissionManager } = require('./utils/permission-integration-example');

const manager = new EnhancedPermissionManager();

// Complete workflow
const workflow = async (userId, operation, context) => {
  // 1. Check permissions
  const permCheck = await manager.checkCompletePermissions(userId, operation, context);
  
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.checks.collection.reason}`);
  }
  
  // 2. Perform secure operation
  if (operation === 'create') {
    return await manager.secureDocumentCreation(userId, context.collectionId, context.data);
  } else if (operation === 'read') {
    return await manager.secureDataAccess(userId, context.collectionId, context.queries);
  }
};
```

## Error Handling

All utilities provide consistent error handling:

```javascript
const result = await validator.canAccessCollection(userId, collectionId, operation);

if (!result.allowed) {
  console.log('Permission denied:', result.reason);
  console.log('Details:', result.details);
}
```

## Caching

The system includes intelligent caching:

```javascript
// Clear individual caches
validator.clearCache();
teamChecker.clearCache();

// Clear all caches (Enhanced Permission Manager)
manager.clearAllCaches();

// Get cache statistics
const stats = manager.getIntegrationStats();
console.log('Cache stats:', stats);
```

## Testing

Run the integration tests:

```bash
node appwrite-backend/utils/permission-integration-test.js
```

Or use the test programmatically:

```javascript
const PermissionIntegrationTest = require('./permission-integration-test');

const testSuite = new PermissionIntegrationTest();
const results = await testSuite.runAllTests();
console.log('Test results:', testSuite.getTestResults());
```

## Configuration

All utilities accept configuration options:

```javascript
const options = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  cacheEnabled: true,
  cacheTimeout: 300000, // 5 minutes
  strictMode: true,
  enableLogging: true,
  enableAuditLogging: true
};

const validator = new PermissionValidator(options);
```

## Migration from Existing System

To migrate from the existing permission system:

1. **Replace direct permission checks** with `PermissionValidator`:
   ```javascript
   // Old way
   const hasPermission = await permissions.checkPermission(userId, 'patients:create');
   
   // New way
   const canAccess = await validator.canAccessCollection(userId, 'patients', 'create');
   ```

2. **Replace document creation** with `DocumentSecurity`:
   ```javascript
   // Old way
   const patient = await databases.createDocument(databaseId, 'patients', 'unique()', data);
   
   // New way
   const result = await docSecurity.createPatientWithSecurity(data, userId);
   ```

3. **Replace data queries** with `FacilityScopedQueries`:
   ```javascript
   // Old way
   const patients = await databases.listDocuments(databaseId, 'patients', queries);
   
   // New way
   const result = await scopedQueries.getPatientsForUser(userId, queries);
   ```

## Best Practices

1. **Always validate permissions** before operations
2. **Use secure document creation** methods
3. **Leverage facility scoping** for data access
4. **Handle errors gracefully**
5. **Clear caches** when needed
6. **Monitor performance** with stats
7. **Test thoroughly** with integration tests

## Support

For questions or issues with the enhanced permission system:

1. Check the integration tests for examples
2. Review the permission integration example
3. Consult the existing team permission documentation
4. Test with the provided test suite

## Future Enhancements

Planned improvements:
- Real-time permission updates
- Advanced audit logging
- Permission analytics
- Performance optimizations
- Additional security features