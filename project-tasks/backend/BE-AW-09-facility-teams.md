# BE-AW-09: Facility-Based Teams and Memberships

## Priority
**High** - Essential for facility-scoped access control

## Estimated Time
5-7 hours

## Dependencies
- BE-AW-01: Appwrite project setup
- BE-AW-02: Database collections setup
- BE-AW-08: User roles setup

## Description
Implement facility-based teams and memberships using Appwrite Teams to maintain facility-scoped access control. This task creates a team structure where each facility has its own team, and users are assigned to teams based on their facility association.

## Current Facility System Analysis
Based on the existing system:
- Users are associated with specific facilities via `facilityId`
- Non-administrator users can only access data from their assigned facility
- Administrators have cross-facility access
- Supervisors can access multiple facilities for reporting

## Appwrite Teams Implementation Strategy

### Team Structure
```
Facility Teams:
├── facility-1-team (Facility ID: 1)
│   ├── Users assigned to Facility 1
│   └── Roles: owner, admin, member
├── facility-2-team (Facility ID: 2)
│   ├── Users assigned to Facility 2
│   └── Roles: owner, admin, member
└── global-admin-team
    ├── Administrator users
    └── Cross-facility access
```

### Team Roles Mapping
- **Owner**: Facility administrators (local admin for that facility)
- **Admin**: Supervisors and doctors with elevated permissions
- **Member**: Regular users (nurses, basic staff)

## Technical Implementation

### 1. Team Creation for Facilities
```javascript
// Create teams for each facility
async function createFacilityTeams() {
  const facilities = await getFacilities();
  
  for (const facility of facilities) {
    try {
      const team = await teams.create(
        ID.unique(),
        `facility-${facility.id}-team`,
        [`facility:${facility.id}`, 'type:facility-team']
      );
      
      // Store team ID mapping
      await storeFacilityTeamMapping(facility.id, team.$id);
      
    } catch (error) {
      console.error(`Failed to create team for facility ${facility.id}:`, error);
    }
  }
  
  // Create global admin team
  const globalTeam = await teams.create(
    ID.unique(),
    'global-admin-team',
    ['type:global-admin', 'access:cross-facility']
  );
}
```

### 2. User Team Assignment
```javascript
class FacilityTeamManager {
  static async assignUserToFacilityTeam(userId, facilityId, role = 'member') {
    const teamId = await getFacilityTeamId(facilityId);
    
    // Add user to facility team
    await teams.createMembership(
      teamId,
      ['member'], // Appwrite team roles
      userId
    );
    
    // For administrators, also add to global team
    const user = await users.get(userId);
    if (this.isAdministrator(user)) {
      const globalTeamId = await getGlobalTeamId();
      await teams.createMembership(
        globalTeamId,
        ['admin'],
        userId
      );
    }
  }
  
  static async removeUserFromFacilityTeam(userId, facilityId) {
    const teamId = await getFacilityTeamId(facilityId);
    const memberships = await teams.listMemberships(teamId);
    
    const membership = memberships.memberships.find(m => m.userId === userId);
    if (membership) {
      await teams.deleteMembership(teamId, membership.$id);
    }
  }
  
  static async getUserFacilityTeams(userId) {
    const memberships = await teams.listMemberships();
    return memberships.memberships
      .filter(m => m.userId === userId)
      .map(m => m.teamId);
  }
  
  static async getFacilityTeamMembers(facilityId, role = null) {
    const teamId = await getFacilityTeamId(facilityId);
    const memberships = await teams.listMemberships(teamId);
    
    if (role) {
      return memberships.memberships.filter(m => m.roles.includes(role));
    }
    
    return memberships.memberships;
  }
}
```

### 3. Permission Checking with Teams
```javascript
class TeamPermissionChecker {
  static async canAccessFacility(userId, facilityId) {
    // Check if user is administrator (global access)
    const user = await users.get(userId);
    if (this.isAdministrator(user)) {
      return true;
    }
    
    // Check if user is member of facility team
    const facilityTeamId = await getFacilityTeamId(facilityId);
    const memberships = await teams.listMemberships(facilityTeamId);
    
    return memberships.memberships.some(m => m.userId === userId);
  }
  
  static async getUserAccessibleFacilities(userId) {
    const user = await users.get(userId);
    
    // Administrators have access to all facilities
    if (this.isAdministrator(user)) {
      return await getAllFacilities();
    }
    
    // Get user's team memberships
    const userTeams = await this.getUserFacilityTeams(userId);
    const facilities = [];
    
    for (const teamId of userTeams) {
      const facilityId = await getFacilityIdFromTeam(teamId);
      if (facilityId) {
        facilities.push(facilityId);
      }
    }
    
    return facilities;
  }
  
  static async canManageFacilityUsers(userId, facilityId) {
    const user = await users.get(userId);
    
    // Administrators can manage all users
    if (this.isAdministrator(user)) {
      return true;
    }
    
    // Check if user has admin role in facility team
    const facilityTeamId = await getFacilityTeamId(facilityId);
    const memberships = await teams.listMemberships(facilityTeamId);
    
    const userMembership = memberships.memberships.find(m => m.userId === userId);
    return userMembership && userMembership.roles.includes('admin');
  }
}
```

### 4. Migration Strategy
```javascript
async function migrateFacilityTeams() {
  // 1. Create teams for all existing facilities
  await createFacilityTeams();
  
  // 2. Migrate existing users to appropriate teams
  const users = await getAllUsers();
  
  for (const user of users) {
    try {
      if (user.facilityId) {
        // Determine team role based on user role
        let teamRole = 'member';
        if (user.role === 'administrator') {
          teamRole = 'admin';
        } else if (user.role === 'supervisor') {
          teamRole = 'admin';
        }
        
        await FacilityTeamManager.assignUserToFacilityTeam(
          user.appwriteId,
          user.facilityId,
          teamRole
        );
      }
    } catch (error) {
      console.error(`Failed to migrate user ${user.id} to team:`, error);
    }
  }
}
```

### 5. Team-Based Collection Permissions
```javascript
// Collection permission rules using teams
const COLLECTION_PERMISSIONS = {
  patients: {
    read: [
      'team:facility-*-team/member',
      'team:global-admin-team/admin'
    ],
    write: [
      'team:facility-*-team/admin',
      'team:global-admin-team/admin'
    ],
    delete: [
      'team:global-admin-team/admin'
    ]
  },
  immunization_records: {
    read: [
      'team:facility-*-team/member',
      'team:global-admin-team/admin'
    ],
    write: [
      'team:facility-*-team/member',
      'team:global-admin-team/admin'
    ],
    delete: [
      'team:facility-*-team/admin',
      'team:global-admin-team/admin'
    ]
  }
};
```

## Files to Create/Modify

### Backend Files
1. **`appwrite-backend/utils/facility-team-manager.js`** - Team management utilities
2. **`appwrite-backend/utils/team-permission-checker.js`** - Permission checking with teams
3. **`appwrite-backend/config/team-structure.js`** - Team configuration and mapping
4. **`appwrite-backend/migrations/migrate-facility-teams.js`** - Team migration script
5. **`appwrite-backend/functions/team-management/`** - Team CRUD operations

### Configuration Files
1. **`appwrite-backend/config/team-permissions.json`** - Team-based permission rules
2. **`appwrite-backend/config/facility-team-mapping.json`** - Facility to team ID mapping

## Acceptance Criteria

### ✅ Team Structure
- [ ] Each facility has a corresponding Appwrite team
- [ ] Global admin team exists for cross-facility access
- [ ] Team naming convention is consistent and searchable
- [ ] Team labels properly identify facility association

### ✅ User Assignment
- [ ] Users are correctly assigned to facility teams
- [ ] Administrators are assigned to global admin team
- [ ] Team roles reflect user permissions appropriately
- [ ] Migration script successfully converts existing associations

### ✅ Permission Checking
- [ ] Facility-scoped access is properly enforced
- [ ] Cross-facility access works for administrators
- [ ] Team-based permission queries are efficient
- [ ] Permission inheritance works correctly

### ✅ Team Management
- [ ] New users can be assigned to appropriate teams
- [ ] Users can be moved between facility teams
- [ ] Team membership can be revoked when needed
- [ ] Bulk operations for team management work correctly

## Testing Requirements

### Unit Tests
```javascript
describe('Facility Team Manager', () => {
  test('should assign user to correct facility team', async () => {
    const userId = 'user123';
    const facilityId = 1;
    
    await FacilityTeamManager.assignUserToFacilityTeam(userId, facilityId);
    
    const canAccess = await TeamPermissionChecker.canAccessFacility(userId, facilityId);
    expect(canAccess).toBe(true);
  });
  
  test('should prevent access to non-assigned facilities', async () => {
    const userId = 'user123';
    const assignedFacility = 1;
    const otherFacility = 2;
    
    await FacilityTeamManager.assignUserToFacilityTeam(userId, assignedFacility);
    
    const canAccessAssigned = await TeamPermissionChecker.canAccessFacility(userId, assignedFacility);
    const canAccessOther = await TeamPermissionChecker.canAccessFacility(userId, otherFacility);
    
    expect(canAccessAssigned).toBe(true);
    expect(canAccessOther).toBe(false);
  });
  
  test('should allow administrators access to all facilities', async () => {
    const adminUserId = 'admin123';
    // Assume user has administrator role
    
    const facilities = [1, 2, 3];
    for (const facilityId of facilities) {
      const canAccess = await TeamPermissionChecker.canAccessFacility(adminUserId, facilityId);
      expect(canAccess).toBe(true);
    }
  });
});
```

### Integration Tests
- Test team creation for new facilities
- Test user assignment and removal from teams
- Test permission checking across different scenarios
- Test migration script with sample data
- Test team-based collection access

## Security Best Practices

### Team Management Security
- Only administrators can create/delete teams
- Team membership changes require proper authorization
- Audit logging for all team modifications
- Regular validation of team memberships

### Access Control
- Implement principle of least privilege for team roles
- Regular review of team memberships
- Automated detection of unauthorized team access
- Secure team invitation and acceptance process

## Performance Considerations

### Optimization Strategies
- Cache team memberships in user sessions
- Use efficient team-based queries for data filtering
- Implement batch operations for team management
- Monitor team-based permission query performance

### Scalability
- Design for facilities with large user counts
- Optimize team membership lookups
- Consider team hierarchy for complex organizations
- Plan for team-based data partitioning

## Advanced Features

### Multi-Facility Users
```javascript
// Support for users with access to multiple facilities
class MultiFacilityManager {
  static async assignUserToMultipleFacilities(userId, facilityIds, role = 'member') {
    for (const facilityId of facilityIds) {
      await FacilityTeamManager.assignUserToFacilityTeam(userId, facilityId, role);
    }
  }
  
  static async getUserFacilities(userId) {
    return await TeamPermissionChecker.getUserAccessibleFacilities(userId);
  }
}
```

### Team Hierarchy
```javascript
// Support for hierarchical team structures
const TEAM_HIERARCHY = {
  'global-admin-team': {
    level: 0,
    inherits: []
  },
  'facility-*-team': {
    level: 1,
    inherits: ['global-admin-team']
  }
};
```

## Notes
- Appwrite teams have a limit on the number of members (check current limits)
- Team names must be unique across the project
- Consider implementing team-based notifications for facility updates
- Plan for team archival when facilities are decommissioned
- Document team-based business rules and access patterns