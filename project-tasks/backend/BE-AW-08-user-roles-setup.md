# BE-AW-08: User Roles Setup in Appwrite Auth

## Priority
**High** - Critical for security and access control

## Estimated Time
4-6 hours

## Dependencies
- BE-AW-01: Appwrite project setup
- BE-AW-02: Database collections setup

## Description
Set up user roles and labels in Appwrite Auth to maintain the current role-based access control system. This task involves configuring Appwrite user labels to represent roles and creating utilities for role management.

## Current Role System Analysis
Based on the existing system, we have four distinct roles:
- **administrator**: Full system access, cross-facility operations
- **supervisor**: Multi-facility reporting access, can view data across facilities
- **doctor**: Standard user with reporting access, facility-scoped
- **user**: Basic facility-scoped access (equivalent to 'nurse' in frontend)

## Appwrite Implementation Strategy

### User Labels for Role Assignment
Appwrite doesn't have built-in roles, so we'll use **Labels** to assign roles to users:
- Each user will have a label indicating their role: `role:administrator`, `role:supervisor`, `role:doctor`, `role:user`
- Labels are searchable and can be used in permission rules
- Multiple labels can be assigned for complex permission scenarios

### Role Hierarchy
```
administrator (highest)
├── supervisor
├── doctor  
└── user (lowest)
```

## Technical Implementation

### 1. Appwrite User Labels Configuration
```javascript
// Role labels to be assigned to users
const ROLE_LABELS = {
  ADMINISTRATOR: 'role:administrator',
  SUPERVISOR: 'role:supervisor', 
  DOCTOR: 'role:doctor',
  USER: 'role:user'
};

// Facility labels for scoping
const FACILITY_LABEL_PREFIX = 'facility:';
```

### 2. User Creation with Roles
```javascript
// Example: Creating a user with role and facility
await users.create(
  ID.unique(),
  email,
  phone,
  password,
  name
);

// Assign role and facility labels
await users.updateLabels(
  userId,
  [
    ROLE_LABELS.DOCTOR,
    `${FACILITY_LABEL_PREFIX}${facilityId}`
  ]
);
```

### 3. Role Checking Utilities
```javascript
// Backend utility functions
class RoleManager {
  static hasRole(user, requiredRole) {
    return user.labels.includes(ROLE_LABELS[requiredRole.toUpperCase()]);
  }
  
  static hasAnyRole(user, roles) {
    return roles.some(role => 
      user.labels.includes(ROLE_LABELS[role.toUpperCase()])
    );
  }
  
  static getFacilityId(user) {
    const facilityLabel = user.labels.find(label => 
      label.startsWith(FACILITY_LABEL_PREFIX)
    );
    return facilityLabel ? facilityLabel.split(':')[1] : null;
  }
  
  static isAdministrator(user) {
    return this.hasRole(user, 'administrator');
  }
  
  static canAccessMultipleFacilities(user) {
    return this.hasAnyRole(user, ['administrator', 'supervisor']);
  }
}
```

### 4. Migration Strategy from Current Auth System
```javascript
// Migration function to convert existing users
async function migrateUsersToAppwrite() {
  // 1. Fetch all users from current system
  const existingUsers = await getCurrentSystemUsers();
  
  for (const user of existingUsers) {
    try {
      // 2. Create user in Appwrite
      const appwriteUser = await users.create(
        ID.unique(),
        user.email,
        user.phone || undefined,
        generateTemporaryPassword(), // Users will need to reset
        user.fullName
      );
      
      // 3. Assign role and facility labels
      const labels = [
        ROLE_LABELS[user.role.toUpperCase()],
        `${FACILITY_LABEL_PREFIX}${user.facilityId}`
      ];
      
      await users.updateLabels(appwriteUser.$id, labels);
      
      // 4. Store mapping for reference
      await storeMigrationMapping(user.id, appwriteUser.$id);
      
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
}
```

## Files to Create/Modify

### Backend Files
1. **`appwrite-backend/utils/role-manager.js`** - Role management utilities
2. **`appwrite-backend/config/roles.js`** - Role constants and configuration
3. **`appwrite-backend/migrations/migrate-users.js`** - User migration script
4. **`appwrite-backend/functions/user-management/`** - User CRUD operations with role handling

### Configuration Files
1. **`appwrite-backend/config/user-labels.json`** - Label definitions
2. **`.env`** - Add role-related environment variables

## Acceptance Criteria

### ✅ Role Assignment
- [ ] Users can be assigned one of four roles via labels
- [ ] Facility association is maintained through labels
- [ ] Role hierarchy is properly implemented
- [ ] Migration script successfully converts existing users

### ✅ Role Checking
- [ ] Backend utilities can check user roles accurately
- [ ] Cross-facility access is properly controlled
- [ ] Administrator users have unrestricted access
- [ ] Facility-scoped users are properly restricted

### ✅ Security
- [ ] Role labels cannot be modified by unauthorized users
- [ ] Proper validation prevents role escalation
- [ ] Audit trail for role changes is maintained

### ✅ Performance
- [ ] Role checking operations are optimized
- [ ] Label queries perform efficiently
- [ ] Caching is implemented where appropriate

## Testing Requirements

### Unit Tests
```javascript
describe('Role Manager', () => {
  test('should correctly identify administrator role', () => {
    const user = { labels: ['role:administrator', 'facility:1'] };
    expect(RoleManager.isAdministrator(user)).toBe(true);
  });
  
  test('should extract facility ID from labels', () => {
    const user = { labels: ['role:doctor', 'facility:123'] };
    expect(RoleManager.getFacilityId(user)).toBe('123');
  });
  
  test('should check multi-facility access correctly', () => {
    const supervisor = { labels: ['role:supervisor', 'facility:1'] };
    const doctor = { labels: ['role:doctor', 'facility:1'] };
    
    expect(RoleManager.canAccessMultipleFacilities(supervisor)).toBe(true);
    expect(RoleManager.canAccessMultipleFacilities(doctor)).toBe(false);
  });
});
```

### Integration Tests
- Test user creation with role assignment
- Test role-based access to Appwrite collections
- Test migration script with sample data
- Test role modification workflows

## Security Best Practices

### Label Management
- Only administrators can modify user labels
- Role changes require proper authorization
- Audit logging for all role modifications
- Regular validation of user role assignments

### Access Control
- Implement principle of least privilege
- Regular review of user permissions
- Automated detection of privilege escalation attempts
- Secure storage of role configuration

## Performance Considerations

### Optimization Strategies
- Cache user roles in session/JWT tokens
- Use indexed queries for role-based filtering
- Implement efficient label-based searches
- Monitor query performance for role checks

### Monitoring
- Track role-based query performance
- Monitor failed authorization attempts
- Alert on unusual role modification patterns
- Regular audit of role distribution

## Notes
- Appwrite labels are case-sensitive, maintain consistent naming
- Consider implementing role inheritance for future extensibility
- Document all role-based business rules clearly
- Plan for role-based feature flags and gradual rollouts