# BE-AW-03: Migrate Authentication System to Appwrite Auth

## Title
Migrate Authentication System to Appwrite Auth

## Priority
High

## Estimated Time
5-7 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created

## Description
Migrate the existing AdonisJS authentication system to Appwrite's built-in authentication service. This includes configuring user authentication, role-based access control (RBAC), session management, and integrating with the existing user roles (admin, healthcare_worker, facility_manager).

The migration will leverage Appwrite's authentication features while maintaining compatibility with the existing user management system and ensuring secure access to healthcare data.

## Acceptance Criteria
- [ ] Appwrite Auth configured with email/password authentication
- [ ] User roles and permissions migrated to Appwrite teams/memberships
- [ ] Session management configured with appropriate timeouts
- [ ] Password policies implemented according to healthcare standards
- [ ] Multi-factor authentication (MFA) configured for admin users
- [ ] User registration and login flows functional
- [ ] Password reset functionality implemented
- [ ] Role-based access control working for all user types
- [ ] Integration with existing user data completed
- [ ] Authentication middleware created for API protection

## Technical Notes

### Authentication Configuration

#### User Roles Mapping
```javascript
// Existing roles to Appwrite teams mapping
const roleMapping = {
  'admin': {
    teamId: 'admin-team',
    permissions: ['*'],
    description: 'System administrators with full access'
  },
  'healthcare_worker': {
    teamId: 'healthcare-workers',
    permissions: ['patients.*', 'immunizations.*', 'notifications.read'],
    description: 'Healthcare workers managing patient records'
  },
  'facility_manager': {
    teamId: 'facility-managers',
    permissions: ['facility.*', 'reports.*', 'users.facility'],
    description: 'Facility managers with administrative access to their facility'
  }
};
```

#### Authentication Settings
```javascript
// Appwrite Auth configuration
const authConfig = {
  // Session settings
  sessionLength: 86400, // 24 hours
  sessionAlerts: true,
  
  // Password policy
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    passwordHistory: 5
  },
  
  // Security settings
  maxSessions: 5,
  sessionTimeout: 3600, // 1 hour inactivity
  
  // MFA settings
  mfa: {
    enabled: true,
    requiredForRoles: ['admin'],
    methods: ['totp', 'email']
  }
};
```

### User Migration Strategy

#### 1. Create Teams for Roles
```javascript
// Create teams using MCP server
const teams = [
  {
    teamId: 'admin-team',
    name: 'Administrators',
    roles: ['admin']
  },
  {
    teamId: 'healthcare-workers',
    name: 'Healthcare Workers',
    roles: ['healthcare_worker']
  },
  {
    teamId: 'facility-managers',
    name: 'Facility Managers',
    roles: ['facility_manager']
  }
];

for (const team of teams) {
  await mcpServer.teams.create(team.teamId, team.name, team.roles);
}
```

#### 2. User Account Creation
```javascript
// Migrate existing users to Appwrite Auth
const migrateUsers = async (existingUsers) => {
  for (const user of existingUsers) {
    try {
      // Create user account
      const appwriteUser = await mcpServer.users.create(
        user.id,
        user.email,
        user.phone,
        user.hashedPassword, // Use existing hash or generate new password
        user.fullName
      );
      
      // Add user to appropriate team
      const teamId = roleMapping[user.role].teamId;
      await mcpServer.teams.createMembership(
        teamId,
        user.email,
        ['member'],
        `${process.env.FRONTEND_URL}/auth/verify`
      );
      
      // Set user preferences
      await mcpServer.users.updatePrefs(user.id, {
        role: user.role,
        facilityId: user.facilityId,
        lastLogin: user.lastLogin
      });
      
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
};
```

### Authentication Middleware

#### API Protection Middleware
```javascript
// appwrite-backend/utils/auth-middleware.js
const { Client, Account, Users } = require('node-appwrite');

class AuthMiddleware {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.account = new Account(this.client);
    this.users = new Users(this.client);
  }
  
  async verifySession(sessionId) {
    try {
      const session = await this.account.getSession(sessionId);
      const user = await this.users.get(session.userId);
      
      return {
        user,
        session,
        isValid: true
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        isValid: false,
        error: error.message
      };
    }
  }
  
  async checkPermissions(userId, requiredPermissions) {
    try {
      const user = await this.users.get(userId);
      const userPrefs = user.prefs;
      const userRole = userPrefs.role;
      
      const rolePermissions = roleMapping[userRole]?.permissions || [];
      
      // Check if user has required permissions
      for (const permission of requiredPermissions) {
        const hasPermission = rolePermissions.includes('*') || 
                            rolePermissions.some(p => this.matchPermission(p, permission));
        
        if (!hasPermission) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  matchPermission(userPermission, requiredPermission) {
    // Handle wildcard permissions
    if (userPermission.endsWith('*')) {
      const prefix = userPermission.slice(0, -1);
      return requiredPermission.startsWith(prefix);
    }
    
    return userPermission === requiredPermission;
  }
}

module.exports = AuthMiddleware;
```

### Session Management

#### Session Configuration
```javascript
// Configure session settings
const sessionConfig = {
  // Session duration
  duration: 86400, // 24 hours
  
  // Inactivity timeout
  inactivityTimeout: 3600, // 1 hour
  
  // Maximum concurrent sessions
  maxSessions: 5,
  
  // Session alerts
  alerts: {
    enabled: true,
    beforeExpiry: 300 // 5 minutes
  }
};
```

### Password Security

#### Password Policy Implementation
```javascript
// Password validation rules
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  
  // Healthcare-specific requirements
  noPersonalInfo: true,
  noCommonPasswords: true,
  passwordHistory: 5,
  
  // Validation function
  validate(password, userInfo = {}) {
    const errors = [];
    
    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters`);
    }
    
    if (!/[A-Z]/.test(password) && this.requireUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password) && this.requireLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password) && this.requireNumbers) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password) && this.requireSymbols) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
```

## Files to Create/Modify
- `appwrite-backend/config/auth-config.json` - Authentication configuration
- `appwrite-backend/utils/auth-middleware.js` - Authentication middleware
- `appwrite-backend/utils/user-migration.js` - User migration script
- `appwrite-backend/utils/password-policy.js` - Password validation
- `appwrite-backend/utils/session-manager.js` - Session management utilities
- `appwrite-backend/config/teams-setup.js` - Team creation script
- `appwrite-backend/utils/permissions.js` - Permission checking utilities
- `appwrite-backend/config/mfa-setup.js` - Multi-factor authentication setup

## Testing Requirements

### Authentication Flow Testing
1. **User Registration Test**
   ```javascript
   // Test user registration
   const testUser = {
     email: 'test@example.com',
     password: 'SecurePass123!',
     name: 'Test User'
   };
   
   const user = await mcpServer.account.create(
     'unique()',
     testUser.email,
     testUser.password,
     testUser.name
   );
   
   assert(user.$id, 'User should be created with ID');
   assert(user.email === testUser.email, 'Email should match');
   ```

2. **Login/Session Test**
   ```javascript
   // Test login and session creation
   const session = await mcpServer.account.createEmailSession(
     testUser.email,
     testUser.password
   );
   
   assert(session.$id, 'Session should be created');
   assert(session.userId === user.$id, 'Session should belong to user');
   ```

3. **Role Assignment Test**
   ```javascript
   // Test team membership
   const membership = await mcpServer.teams.createMembership(
     'healthcare-workers',
     testUser.email,
     ['member']
   );
   
   assert(membership.teamId === 'healthcare-workers', 'User should be added to team');
   ```

### Permission Testing
1. **Role-Based Access Test**
   ```javascript
   // Test permission checking
   const authMiddleware = new AuthMiddleware();
   
   const hasPermission = await authMiddleware.checkPermissions(
     user.$id,
     ['patients.read']
   );
   
   assert(hasPermission, 'Healthcare worker should have patient read permission');
   ```

2. **Unauthorized Access Test**
   ```javascript
   // Test access denial
   const hasAdminPermission = await authMiddleware.checkPermissions(
     user.$id,
     ['admin.users.delete']
   );
   
   assert(!hasAdminPermission, 'Healthcare worker should not have admin permissions');
   ```

### Security Testing
1. **Password Policy Test**
   ```javascript
   // Test password validation
   const weakPassword = 'weak';
   const strongPassword = 'SecurePass123!';
   
   const weakResult = passwordPolicy.validate(weakPassword);
   const strongResult = passwordPolicy.validate(strongPassword);
   
   assert(!weakResult.isValid, 'Weak password should be rejected');
   assert(strongResult.isValid, 'Strong password should be accepted');
   ```

2. **Session Security Test**
   ```javascript
   // Test session timeout
   const session = await mcpServer.account.createEmailSession(email, password);
   
   // Wait for timeout period
   await new Promise(resolve => setTimeout(resolve, sessionConfig.inactivityTimeout * 1000));
   
   // Session should be invalid
   try {
     await mcpServer.account.getSession(session.$id);
     assert(false, 'Session should have expired');
   } catch (error) {
     assert(error.code === 401, 'Should return unauthorized error');
   }
   ```

## Implementation Steps

### Phase 1: Authentication Setup
1. Configure Appwrite Auth settings
2. Set up password policies
3. Configure session management
4. Enable MFA for admin users

### Phase 2: Team and Role Setup
1. Create teams for each user role
2. Define role permissions
3. Set up team membership workflows
4. Configure role-based access control

### Phase 3: User Migration
1. Export existing users from AdonisJS
2. Create migration script
3. Migrate users to Appwrite Auth
4. Assign users to appropriate teams

### Phase 4: Integration and Testing
1. Create authentication middleware
2. Test all authentication flows
3. Verify permission systems
4. Test security measures

## Success Metrics
- All existing users successfully migrated
- Authentication flows working correctly
- Role-based permissions functional
- Session management secure and reliable
- Password policies enforced
- MFA working for admin users

## Rollback Plan
- Keep existing AdonisJS auth system running in parallel
- Maintain user session compatibility
- Document all authentication changes
- Test rollback procedures thoroughly

## Next Steps
After completion, this task enables:
- BE-AW-04: Notification functions creation
- BE-AW-05: Reporting functions creation
- FE-AW-03: Frontend auth integration
- All other backend and frontend tasks requiring authentication