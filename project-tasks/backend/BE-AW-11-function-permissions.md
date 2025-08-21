# BE-AW-11: Function-Level Permissions for Different Roles

## Priority
**High** - Critical for securing backend operations and API endpoints

## Estimated Time
5-7 hours

## Dependencies
- BE-AW-01: Appwrite project setup
- BE-AW-08: User roles setup
- BE-AW-09: Facility-based teams
- BE-AW-10: Collection-level permissions

## Description
Set up function-level permissions for Appwrite Functions to control access to backend operations based on user roles and facility associations. This task implements role-based access control for server-side functions including data synchronization, reporting, and notification services.

## Current Function Analysis
Based on the existing backend structure, we need to secure the following function categories:
- **Data Sync Functions**: Patient and immunization data synchronization
- **Report Functions**: Generate facility and cross-facility reports
- **Notification Functions**: Send and manage notifications
- **Admin Functions**: User management, facility management, system configuration

## Appwrite Functions Permission System

### Function Execution Permissions
- **Execute**: Who can invoke the function
- **Read**: Who can view function logs and details
- **Update**: Who can modify function code/settings
- **Delete**: Who can remove functions

### Permission Scopes
- **Role-based**: Based on user labels (`label:role:administrator`)
- **Team-based**: Based on team membership (`team:TEAM_ID/ROLE`)
- **User-specific**: Individual user permissions (`user:USER_ID`)
- **Public**: Anyone can execute (`any`)

## Technical Implementation

### 1. Function Permission Matrix
```javascript
const FUNCTION_PERMISSIONS = {
  // Data synchronization functions
  'data-sync-patients': {
    execute: [
      'label:role:administrator',
      'label:role:doctor',
      'label:role:user',
      'team:facility-*-team/member'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'data-sync-immunizations': {
    execute: [
      'label:role:administrator',
      'label:role:doctor',
      'label:role:user',
      'team:facility-*-team/member'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  // Reporting functions
  'reports-facility-summary': {
    execute: [
      'label:role:administrator',
      'label:role:supervisor',
      'label:role:doctor',
      'team:facility-*-team/admin'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'reports-cross-facility': {
    execute: [
      'label:role:administrator',
      'label:role:supervisor'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'reports-immunization-coverage': {
    execute: [
      'label:role:administrator',
      'label:role:supervisor',
      'label:role:doctor'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  // Notification functions
  'notifications-send': {
    execute: [
      'label:role:administrator',
      'label:role:supervisor',
      'label:role:doctor',
      'team:facility-*-team/admin'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'notifications-schedule': {
    execute: [
      'label:role:administrator',
      'label:role:doctor',
      'team:facility-*-team/member'
    ],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  // Administrative functions
  'admin-user-management': {
    execute: ['label:role:administrator'],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'admin-facility-management': {
    execute: ['label:role:administrator'],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  },
  
  'admin-system-config': {
    execute: ['label:role:administrator'],
    read: ['label:role:administrator'],
    update: ['label:role:administrator'],
    delete: ['label:role:administrator']
  }
};
```

### 2. Function Implementation with Role Checking

#### Data Sync Function Example
```javascript
// appwrite-backend/functions/data-sync/src/main.js
import { Client, Databases, Users } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);

  try {
    // Extract user ID from JWT or session
    const userId = req.headers['x-appwrite-user-id'];
    if (!userId) {
      return res.json({ error: 'Unauthorized: No user ID provided' }, 401);
    }

    // Get user and validate permissions
    const user = await users.get(userId);
    if (!await canExecuteDataSync(user)) {
      return res.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }

    // Get user's facility for scoping
    const facilityId = getFacilityIdFromUser(user);
    
    // Perform data sync operation (facility-scoped for non-admins)
    const syncResult = await performDataSync(facilityId, isAdministrator(user));
    
    log('Data sync completed successfully');
    return res.json({ 
      success: true, 
      syncResult,
      facilityId: isAdministrator(user) ? 'all' : facilityId
    });

  } catch (err) {
    error('Data sync failed: ' + err.message);
    return res.json({ error: 'Internal server error' }, 500);
  }
};

async function canExecuteDataSync(user) {
  const allowedRoles = ['administrator', 'doctor', 'user'];
  const userRole = getUserRole(user);
  return allowedRoles.includes(userRole);
}

function getUserRole(user) {
  const roleLabel = user.labels.find(label => label.startsWith('role:'));
  return roleLabel ? roleLabel.split(':')[1] : null;
}

function getFacilityIdFromUser(user) {
  const facilityLabel = user.labels.find(label => label.startsWith('facility:'));
  return facilityLabel ? facilityLabel.split(':')[1] : null;
}

function isAdministrator(user) {
  return user.labels.includes('role:administrator');
}
```

#### Reporting Function Example
```javascript
// appwrite-backend/functions/reports/src/main.js
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);

  try {
    const userId = req.headers['x-appwrite-user-id'];
    const reportType = req.body.reportType;
    const facilityIds = req.body.facilityIds || [];

    if (!userId) {
      return res.json({ error: 'Unauthorized' }, 401);
    }

    const user = await users.get(userId);
    
    // Validate permissions based on report type
    if (!await canExecuteReport(user, reportType, facilityIds)) {
      return res.json({ error: 'Forbidden: Insufficient permissions for this report' }, 403);
    }

    // Generate report based on user's access level
    const reportData = await generateReport(user, reportType, facilityIds);
    
    log(`Report generated: ${reportType} for user ${userId}`);
    return res.json({ 
      success: true, 
      reportData,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    error('Report generation failed: ' + err.message);
    return res.json({ error: 'Internal server error' }, 500);
  }
};

async function canExecuteReport(user, reportType, facilityIds) {
  const userRole = getUserRole(user);
  const userFacilityId = getFacilityIdFromUser(user);
  
  switch (reportType) {
    case 'facility-summary':
      // Can generate for own facility or if admin/supervisor
      if (userRole === 'administrator' || userRole === 'supervisor') {
        return true;
      }
      return facilityIds.length === 1 && facilityIds[0] === userFacilityId;
      
    case 'cross-facility':
      // Only administrators and supervisors
      return ['administrator', 'supervisor'].includes(userRole);
      
    case 'immunization-coverage':
      // Administrators, supervisors, and doctors
      return ['administrator', 'supervisor', 'doctor'].includes(userRole);
      
    default:
      return false;
  }
}

async function generateReport(user, reportType, facilityIds) {
  const userRole = getUserRole(user);
  const userFacilityId = getFacilityIdFromUser(user);
  
  // Scope facilities based on user permissions
  let scopedFacilityIds = facilityIds;
  if (userRole !== 'administrator' && userRole !== 'supervisor') {
    scopedFacilityIds = [userFacilityId];
  }
  
  // Generate report data
  switch (reportType) {
    case 'facility-summary':
      return await generateFacilitySummaryReport(scopedFacilityIds);
    case 'cross-facility':
      return await generateCrossFacilityReport(scopedFacilityIds);
    case 'immunization-coverage':
      return await generateImmunizationCoverageReport(scopedFacilityIds);
    default:
      throw new Error('Unknown report type');
  }
}
```

#### Notification Function Example
```javascript
// appwrite-backend/functions/notifications/src/main.js
export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const users = new Users(client);

  try {
    const userId = req.headers['x-appwrite-user-id'];
    const action = req.body.action; // 'send', 'schedule', 'cancel'
    const notificationData = req.body.notification;

    if (!userId) {
      return res.json({ error: 'Unauthorized' }, 401);
    }

    const user = await users.get(userId);
    
    // Validate permissions for notification action
    if (!await canExecuteNotificationAction(user, action, notificationData)) {
      return res.json({ error: 'Forbidden: Cannot perform this notification action' }, 403);
    }

    // Execute notification action
    const result = await executeNotificationAction(user, action, notificationData);
    
    log(`Notification action executed: ${action} by user ${userId}`);
    return res.json({ success: true, result });

  } catch (err) {
    error('Notification action failed: ' + err.message);
    return res.json({ error: 'Internal server error' }, 500);
  }
};

async function canExecuteNotificationAction(user, action, notificationData) {
  const userRole = getUserRole(user);
  const userFacilityId = getFacilityIdFromUser(user);
  
  switch (action) {
    case 'send':
      // Administrators, supervisors, doctors, and facility admins
      if (['administrator', 'supervisor', 'doctor'].includes(userRole)) {
        return true;
      }
      // Check if user is facility admin for the notification's facility
      return notificationData.facility_id === userFacilityId;
      
    case 'schedule':
      // All roles can schedule notifications for their facility
      return notificationData.facility_id === userFacilityId || 
             userRole === 'administrator';
      
    case 'cancel':
      // Same as send permissions
      return ['administrator', 'supervisor', 'doctor'].includes(userRole) ||
             notificationData.facility_id === userFacilityId;
      
    default:
      return false;
  }
}
```

### 3. Function Permission Setup Script
```javascript
// appwrite-backend/scripts/setup-function-permissions.js
import { Client, Functions } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const functions = new Functions(client);

async function setupFunctionPermissions() {
  for (const [functionId, permissions] of Object.entries(FUNCTION_PERMISSIONS)) {
    try {
      // Update function permissions
      await functions.update(
        functionId,
        functionId, // name
        permissions.execute, // execute permissions
        undefined, // runtime (keep existing)
        undefined, // entrypoint (keep existing)
        undefined, // commands (keep existing)
        undefined, // scopes (keep existing)
        undefined, // events (keep existing)
        undefined, // schedule (keep existing)
        undefined, // timeout (keep existing)
        true // enabled
      );
      
      console.log(`Updated permissions for function: ${functionId}`);
    } catch (error) {
      console.error(`Failed to update permissions for function ${functionId}:`, error);
    }
  }
}

// Run the setup
setupFunctionPermissions().catch(console.error);
```

### 4. Function Middleware for Role Validation
```javascript
// appwrite-backend/utils/function-middleware.js
export class FunctionMiddleware {
  static async validateUserPermissions(req, requiredRoles = [], requiredFacilityAccess = false) {
    const userId = req.headers['x-appwrite-user-id'];
    
    if (!userId) {
      throw new Error('Unauthorized: No user ID provided');
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const user = await users.get(userId);
    
    // Check role requirements
    if (requiredRoles.length > 0) {
      const userRole = this.getUserRole(user);
      if (!requiredRoles.includes(userRole)) {
        throw new Error(`Forbidden: Required roles: ${requiredRoles.join(', ')}`);
      }
    }
    
    // Check facility access if required
    if (requiredFacilityAccess) {
      const facilityId = req.body.facilityId || req.query.facilityId;
      if (facilityId && !await this.canAccessFacility(user, facilityId)) {
        throw new Error('Forbidden: Cannot access specified facility');
      }
    }
    
    return user;
  }
  
  static getUserRole(user) {
    const roleLabel = user.labels.find(label => label.startsWith('role:'));
    return roleLabel ? roleLabel.split(':')[1] : null;
  }
  
  static getFacilityId(user) {
    const facilityLabel = user.labels.find(label => label.startsWith('facility:'));
    return facilityLabel ? facilityLabel.split(':')[1] : null;
  }
  
  static isAdministrator(user) {
    return user.labels.includes('role:administrator');
  }
  
  static async canAccessFacility(user, facilityId) {
    // Administrators can access all facilities
    if (this.isAdministrator(user)) {
      return true;
    }
    
    // Check if user's facility matches
    const userFacilityId = this.getFacilityId(user);
    return userFacilityId === facilityId;
  }
}
```

### 5. Function Deployment Configuration
```javascript
// appwrite-backend/functions/deploy-config.js
export const FUNCTION_CONFIGS = {
  'data-sync-patients': {
    name: 'Data Sync - Patients',
    runtime: 'node-18.0',
    execute: [
      'label:role:administrator',
      'label:role:doctor',
      'label:role:user',
      'team:facility-*-team/member'
    ],
    events: [],
    schedule: '',
    timeout: 300,
    enabled: true
  },
  
  'reports-facility-summary': {
    name: 'Reports - Facility Summary',
    runtime: 'node-18.0',
    execute: [
      'label:role:administrator',
      'label:role:supervisor',
      'label:role:doctor',
      'team:facility-*-team/admin'
    ],
    events: [],
    schedule: '',
    timeout: 600,
    enabled: true
  },
  
  'notifications-send': {
    name: 'Notifications - Send',
    runtime: 'node-18.0',
    execute: [
      'label:role:administrator',
      'label:role:supervisor',
      'label:role:doctor',
      'team:facility-*-team/admin'
    ],
    events: ['databases.*.collections.*.documents.*.create'],
    schedule: '',
    timeout: 180,
    enabled: true
  }
};
```

## Files to Create/Modify

### Function Files
1. **`appwrite-backend/functions/data-sync/src/main.js`** - Data synchronization with role checking
2. **`appwrite-backend/functions/reports/src/main.js`** - Report generation with access control
3. **`appwrite-backend/functions/notifications/src/main.js`** - Notification management with permissions
4. **`appwrite-backend/functions/admin/src/main.js`** - Administrative functions (admin-only)

### Utility Files
1. **`appwrite-backend/utils/function-middleware.js`** - Common middleware for role validation
2. **`appwrite-backend/utils/function-permissions.js`** - Permission checking utilities
3. **`appwrite-backend/config/function-roles.js`** - Role-based function access configuration

### Setup Scripts
1. **`appwrite-backend/scripts/setup-function-permissions.js`** - Function permission setup
2. **`appwrite-backend/scripts/deploy-functions.js`** - Function deployment with permissions

## Acceptance Criteria

### ✅ Function Security
- [ ] All functions have appropriate role-based execute permissions
- [ ] Function code validates user permissions before execution
- [ ] Facility-scoped functions enforce facility access control
- [ ] Administrative functions are restricted to administrators only

### ✅ Role-Based Access
- [ ] Different roles have appropriate function access levels
- [ ] Cross-facility functions are restricted to supervisors and administrators
- [ ] Facility-specific operations are properly scoped
- [ ] Permission validation is consistent across all functions

### ✅ Error Handling
- [ ] Proper error responses for unauthorized access attempts
- [ ] Detailed logging for security events
- [ ] Graceful handling of permission validation failures
- [ ] Audit trail for function executions

### ✅ Performance
- [ ] Permission checks are optimized and cached where appropriate
- [ ] Function execution times are within acceptable limits
- [ ] Resource usage is monitored and controlled
- [ ] Concurrent execution limits are properly configured

## Testing Requirements

### Unit Tests
```javascript
describe('Function Permissions', () => {
  test('should allow administrators to execute all functions', async () => {
    const adminUser = { 
      $id: 'admin123',
      labels: ['role:administrator', 'facility:1'] 
    };
    
    const canExecuteDataSync = await canExecuteDataSync(adminUser);
    const canExecuteReports = await canExecuteReport(adminUser, 'cross-facility', []);
    const canExecuteNotifications = await canExecuteNotificationAction(adminUser, 'send', {});
    
    expect(canExecuteDataSync).toBe(true);
    expect(canExecuteReports).toBe(true);
    expect(canExecuteNotifications).toBe(true);
  });
  
  test('should restrict non-admin users from cross-facility reports', async () => {
    const doctorUser = { 
      $id: 'doctor123',
      labels: ['role:doctor', 'facility:1'] 
    };
    
    const canExecuteCrossFacility = await canExecuteReport(doctorUser, 'cross-facility', [1, 2]);
    const canExecuteFacilitySummary = await canExecuteReport(doctorUser, 'facility-summary', [1]);
    
    expect(canExecuteCrossFacility).toBe(false);
    expect(canExecuteFacilitySummary).toBe(true);
  });
  
  test('should enforce facility scoping for regular users', async () => {
    const user = { 
      $id: 'user123',
      labels: ['role:user', 'facility:1'] 
    };
    
    const canAccessOwnFacility = await FunctionMiddleware.canAccessFacility(user, '1');
    const canAccessOtherFacility = await FunctionMiddleware.canAccessFacility(user, '2');
    
    expect(canAccessOwnFacility).toBe(true);
    expect(canAccessOtherFacility).toBe(false);
  });
});
```

### Integration Tests
- Test function execution with different user roles
- Test facility-scoped function operations
- Test permission validation middleware
- Test function deployment with correct permissions

## Security Best Practices

### Function Security
- Always validate user permissions at function entry point
- Use middleware for consistent permission checking
- Implement proper error handling for security violations
- Log all security-related events for auditing

### Access Control
- Follow principle of least privilege for function permissions
- Implement defense in depth with multiple validation layers
- Use facility scoping to limit data access
- Regular review of function permissions and access patterns

### Data Protection
- Validate all input parameters for security
- Sanitize data before processing
- Implement rate limiting for sensitive functions
- Use secure communication channels for function calls

## Performance Considerations

### Optimization Strategies
- Cache user permission data to reduce API calls
- Implement efficient role checking algorithms
- Use connection pooling for database operations
- Monitor function execution times and resource usage

### Scalability
- Design functions to handle concurrent executions
- Implement proper timeout and retry mechanisms
- Use asynchronous processing where appropriate
- Plan for horizontal scaling of function infrastructure

## Advanced Features

### Function Chaining with Permissions
```javascript
// Chain functions with permission inheritance
class FunctionChain {
  static async executeChain(userId, functionChain) {
    const user = await users.get(userId);
    
    for (const functionCall of functionChain) {
      if (!await this.canExecuteFunction(user, functionCall.functionId)) {
        throw new Error(`Permission denied for function: ${functionCall.functionId}`);
      }
      
      const result = await this.executeFunction(functionCall.functionId, functionCall.params);
      functionCall.result = result;
    }
    
    return functionChain;
  }
}
```

### Dynamic Permission Evaluation
```javascript
// Evaluate permissions based on runtime context
class DynamicPermissions {
  static async evaluatePermission(user, functionId, context) {
    const basePermission = await this.hasBasicPermission(user, functionId);
    if (!basePermission) return false;
    
    // Additional context-based checks
    if (context.requiresFacilityAccess) {
      return await this.canAccessFacility(user, context.facilityId);
    }
    
    if (context.requiresDataOwnership) {
      return await this.ownsData(user, context.dataId);
    }
    
    return true;
  }
}
```

## Notes
- Appwrite Functions support execution permissions but not read/update/delete permissions in the same way as collections
- Function permissions are enforced at the API level, but additional validation should be implemented within function code
- Consider implementing function-level rate limiting for security
- Monitor function execution logs for security events and performance issues
- Plan for function versioning and permission migration strategies
- Document all function permissions and access patterns for security audits