# User Management Functions

This directory contains Appwrite Functions for managing users with role-based access control (RBAC) based on the BE-AW-08 ticket requirements.

## Overview

The user management system implements a label-based role system using Appwrite's user labels feature. It supports four main roles with hierarchical permissions and facility-based access control.

## Functions

### 1. create-user
**Function ID:** `create-user`  
**Purpose:** Create new users with automatic role assignment

**Payload:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "role": "doctor",
  "facilityId": "facility_001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully with role assignment",
  "user": {
    "$id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "doctor",
    "facilityId": "facility_001",
    "permissions": {...},
    "canAccessMultipleFacilities": false
  }
}
```

### 2. assign-role
**Function ID:** `assign-role`  
**Purpose:** Assign or update user roles with permission validation

**Payload:**
```json
{
  "userId": "user_id",
  "role": "supervisor",
  "facilityId": "facility_001",
  "requestingUserId": "admin_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role assigned successfully",
  "userId": "user_id",
  "roleChange": {
    "previous": {"role": "doctor", "facilityId": "facility_001"},
    "current": {"role": "supervisor", "facilityId": "facility_001"}
  },
  "userInfo": {...}
}
```

### 3. check-permissions
**Function ID:** `check-permissions`  
**Purpose:** Check multiple permission types for a user

**Payload:**
```json
{
  "userId": "user_id",
  "checks": [
    {"type": "role", "role": "doctor"},
    {"type": "permission", "resource": "patients", "operation": "create"},
    {"type": "facility_access", "facilityId": "facility_001"},
    {"type": "administrator"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user_id",
  "userRole": "doctor",
  "facilityId": "facility_001",
  "checks": [
    {
      "type": "role",
      "identifier": "role:doctor",
      "success": true,
      "hasPermission": true,
      "details": {...}
    }
  ],
  "summary": {
    "total": 4,
    "passed": 3,
    "failed": 1,
    "errors": 0
  }
}
```

### 4. get-user-info
**Function ID:** `get-user-info`  
**Purpose:** Retrieve comprehensive user information including roles and permissions

**Payload:**
```json
{
  "userId": "user_id",
  "requestingUserId": "admin_user_id",
  "includePermissions": true,
  "includeSensitiveData": false
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "$id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": {
      "name": "doctor",
      "facilityId": "facility_001",
      "dataAccess": "facility_only",
      "canAccessMultipleFacilities": false
    },
    "permissions": {
      "resources": {...},
      "special": [...]
    }
  },
  "metadata": {...}
}
```

## Role System

### Available Roles
1. **administrator** - System administrators with full access
2. **supervisor** - Facility supervisors with administrative access to their facility
3. **doctor** - Healthcare professionals managing patient care
4. **user** - Basic users with limited read-only access

### Role Hierarchy
- Administrator (Level 4) - Highest privilege
- Supervisor (Level 3)
- Doctor (Level 2)
- User (Level 1) - Lowest privilege

### Permissions by Role

#### Administrator
- Full access to all resources and operations
- Can access multiple facilities
- User management across all facilities
- System configuration access

#### Supervisor
- Full access within assigned facility
- User management within facility
- Advanced reporting capabilities
- Facility settings management

#### Doctor
- Patient care management
- Medical record access
- Immunization administration
- Basic reporting within facility

#### User
- Read-only access to assigned facility data
- View patient and immunization records
- Basic facility information access

## Label System

The system uses Appwrite user labels for role management:

### Role Labels
- `administrator`
- `supervisor`
- `doctor`
- `user`

### Facility Labels
- Format: `facility_{facilityId}`
- Example: `facility_001`, `facility_hospital_main`

### Special Labels (Optional)
- `multi_facility_access`
- `emergency_access`
- `audit_access`
- `system_config`
- `user_management`
- `reporting_advanced`

## Security Features

1. **Permission Validation**: All functions validate requesting user permissions
2. **Privilege Escalation Prevention**: Users cannot assign roles higher than their own
3. **Facility Isolation**: Non-administrators can only manage users within their facility
4. **Input Validation**: Comprehensive validation of all inputs
5. **Error Handling**: Proper error responses with appropriate HTTP status codes

## Usage Examples

### Creating a New Doctor
```javascript
const payload = {
  email: "dr.smith@hospital.com",
  password: "SecurePass123!",
  name: "Dr. John Smith",
  role: "doctor",
  facilityId: "hospital_main"
};

const response = await functions.createExecution('create-user', JSON.stringify(payload));
```

### Checking Multiple Permissions
```javascript
const payload = {
  userId: "doctor_user_id",
  checks: [
    { type: "permission", resource: "patients", operation: "update" },
    { type: "facility_access", facilityId: "hospital_main" },
    { type: "special_permission", identifier: "emergency_access" }
  ]
};

const response = await functions.createExecution('check-permissions', JSON.stringify(payload));
```

## Error Handling

All functions return standardized error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (for user creation)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (user not found)
- `409` - Conflict (user already exists)
- `500` - Internal Server Error

## Dependencies

- `node-appwrite`: ^13.0.0
- Custom utilities:
  - `../../../../utils/role-manager.js`
  - `../../../../config/roles.js`

## Environment Variables

Required environment variables:
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`

## Deployment

Each function can be deployed independently using the Appwrite CLI:

```bash
appwrite functions deploy --functionId create-user
appwrite functions deploy --functionId assign-role
appwrite functions deploy --functionId check-permissions
appwrite functions deploy --functionId get-user-info
```

## Testing

Test the functions using the Appwrite Console or programmatically:

```javascript
// Test user creation
const createResult = await functions.createExecution(
  'create-user',
  JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'Test User',
    role: 'user',
    facilityId: 'test_facility'
  })
);

console.log('User created:', createResult.response);
```

## Migration Notes

- This is a new implementation, no migration from existing systems required
- Existing user data in `user.prefs` should be migrated to the new label system if needed
- The system is designed to work alongside existing permission structures