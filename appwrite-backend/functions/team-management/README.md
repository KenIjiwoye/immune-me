# Team Management Functions - BE-AW-09 Implementation

This directory contains the Appwrite Cloud Functions for facility-based team management and access control, implementing the BE-AW-09 ticket requirements.

## Overview

The team management system provides facility-scoped access control using Appwrite Teams functionality. Each healthcare facility has its own team, and users are assigned to teams based on their facility association and role.

## Architecture

### Core Components

1. **FacilityTeamManager** (`../../utils/facility-team-manager.js`)
   - Handles team creation, user assignment, and membership management
   - Supports multi-facility users
   - Provides efficient caching and error handling

2. **TeamPermissionChecker** (`../../utils/team-permission-checker.js`)
   - Validates team-based permissions and access control
   - Enforces facility-scoped access rules
   - Handles cross-facility access for administrators

3. **Configuration Files**
   - `team-structure.js` - Team roles, naming conventions, and hierarchy
   - `team-permissions.json` - Detailed permission rules for each role
   - `facility-team-mapping.json` - Facility-to-team mapping configuration

## Team Structure

### Team Naming Convention
- Facility teams: `facility-{facilityId}-team`
- Global admin team: `global-admin-team`

### Team Roles
- **Owner**: Facility administrators with full facility access
- **Admin**: Supervisors/doctors with patient care access
- **Member**: Regular users (healthcare workers, data entry clerks)

### Role Hierarchy
```
Owner (Level 3) > Admin (Level 2) > Member (Level 1)
```

## Functions

### 1. Create Facility Team (`create-facility-team/`)

Creates a new facility team for healthcare access control.

**Endpoint**: `POST /functions/create-facility-team`

**Payload**:
```json
{
  "facilityId": "FAC001",
  "facilityName": "Central Hospital",
  "description": "Healthcare facility team",
  "createdBy": "admin123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Facility team created successfully",
  "data": {
    "teamId": "team123",
    "teamName": "facility-FAC001-team",
    "facilityId": "FAC001",
    "created": true,
    "createdBy": "admin123",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Assign User to Team (`assign-user-to-team/`)

Assigns a user to a facility team with the appropriate role.

**Endpoint**: `POST /functions/assign-user-to-team`

**Payload**:
```json
{
  "userId": "user123",
  "facilityId": "FAC001",
  "teamRole": "admin",
  "assignedBy": "admin456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User assigned to team successfully",
  "data": {
    "userId": "user123",
    "facilityId": "FAC001",
    "teamId": "team123",
    "teamName": "facility-FAC001-team",
    "teamRole": "admin",
    "assignedBy": "admin456",
    "updated": false,
    "assignedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Remove User from Team (`remove-user-from-team/`)

Removes a user from a facility team.

**Endpoint**: `POST /functions/remove-user-from-team`

**Payload**:
```json
{
  "userId": "user123",
  "facilityId": "FAC001",
  "removedBy": "admin456",
  "reason": "Role change"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User removed from team successfully",
  "data": {
    "userId": "user123",
    "facilityId": "FAC001",
    "teamId": "team123",
    "teamName": "facility-FAC001-team",
    "removedBy": "admin456",
    "isSelfRemoval": false,
    "previousRole": "admin",
    "reason": "Role change",
    "removedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Get Team Members (`get-team-members/`)

Retrieves all members of a facility team.

**Endpoint**: `POST /functions/get-team-members`

**Payload**:
```json
{
  "facilityId": "FAC001",
  "requestedBy": "admin123",
  "includeUserDetails": true,
  "roleFilter": "admin"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Team members retrieved successfully",
  "data": {
    "facilityId": "FAC001",
    "members": [
      {
        "membershipId": "membership123",
        "userId": "user123",
        "roles": ["admin"],
        "primaryRole": "admin",
        "joined": "2024-01-01T00:00:00.000Z",
        "invited": "2024-01-01T00:00:00.000Z",
        "confirm": true,
        "user": {
          "$id": "user123",
          "name": "Dr. John Doe",
          "email": "john.doe@hospital.com",
          "status": true,
          "labels": ["healthcare_worker"],
          "emailVerification": true,
          "phoneVerification": false,
          "registration": "2024-01-01T00:00:00.000Z"
        }
      }
    ],
    "statistics": {
      "totalMembers": 5,
      "filteredMembers": 2,
      "roleBreakdown": {
        "owners": 1,
        "admins": 2,
        "members": 2
      }
    },
    "requestedBy": "admin123",
    "roleFilter": "admin",
    "includeUserDetails": true,
    "retrievedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Permission System

### Global Admin Team
- **Access**: All facilities and resources
- **Permissions**: Full CRUD operations on all collections
- **Special**: Cross-facility access, user management, system configuration

### Facility Teams

#### Owner Role (Facility Administrators)
- **Collections**: patients, immunization_records, facilities, vaccines, notifications, users, reports
- **Operations**: create, read, update (delete only for global admins)
- **Special**: facility user management, team management, facility reports

#### Admin Role (Supervisors/Doctors)
- **Collections**: patients, immunization_records, facilities, vaccines, notifications
- **Operations**: create, read, update
- **Special**: patient care, immunization management, clinical reports

#### Member Role (Regular Users)
- **Collections**: patients, immunization_records, facilities, vaccines, notifications
- **Operations**: create, read (limited update)
- **Special**: data entry, basic reports

## Multi-Facility Support

Users can belong to multiple facility teams with different roles:

```javascript
// Example: User belongs to two facilities
const userTeams = [
  {
    facilityId: 'FAC001',
    teamRole: 'owner',
    teamName: 'facility-FAC001-team'
  },
  {
    facilityId: 'FAC002', 
    teamRole: 'admin',
    teamName: 'facility-FAC002-team'
  }
];
```

## Security Features

### Permission Validation
- All operations require permission checks
- Facility-scoped access enforcement
- Role hierarchy validation
- Resource-level access control

### Access Control Rules
- Users can only access their facility's data
- Global admins have cross-facility access
- Team owners can manage their team members
- Self-removal is always allowed

### Audit Trail
- All team operations are logged
- Permission checks are tracked
- Access attempts are recorded
- Error conditions are monitored

## Error Handling

### Common Error Codes
- `MISSING_FACILITY_ID`: Required facility ID not provided
- `MISSING_USER_ID`: Required user ID not provided
- `PERMISSION_DENIED`: Insufficient permissions for operation
- `USER_NOT_FOUND`: Target user does not exist
- `TEAM_NOT_FOUND`: Facility team does not exist
- `MAX_TEAMS_EXCEEDED`: User cannot join more teams
- `INVALID_TEAM_ROLE`: Invalid role specified
- `LAST_OWNER_REMOVAL`: Cannot remove the last team owner

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "reason": "Detailed reason (optional)"
}
```

## Testing

### Unit Tests
- `facility-team-manager.test.js` - Tests for team management functionality
- `team-permission-checker.test.js` - Tests for permission validation
- `integration.test.js` - End-to-end workflow tests

### Test Coverage
- Team creation and management
- User assignment and removal
- Permission checking and validation
- Multi-facility scenarios
- Error handling and edge cases

### Running Tests
```bash
cd tests/team-management
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
```

## Deployment

### Environment Variables
```bash
APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
```

### Function Configuration
Each function requires:
- Runtime: `node-18.0`
- Execute permissions: `teams.write`, `users.read`
- Timeout: 30 seconds
- Environment variables: Appwrite connection details

### Deployment Steps
1. Configure Appwrite project with Teams enabled
2. Set up environment variables
3. Deploy functions using Appwrite CLI
4. Configure function permissions and triggers
5. Test functionality with sample data

## Integration with Existing System

### Role Label Mapping
The system maps existing user role labels to team roles:
- `admin` → Global admin team owner
- `facility_manager` → Facility team owner
- `healthcare_worker` → Facility team admin
- `data_entry_clerk` → Facility team member

### Collection Permissions
Update Appwrite collection permissions to use team-based rules:
```javascript
// Example collection permission
"permissions": [
  "read(\"team:facility-{facilityId}-team/admin\")",
  "write(\"team:facility-{facilityId}-team/owner\")",
  "delete(\"team:global-admin-team/owner\")"
]
```

## Monitoring and Maintenance

### Key Metrics
- Team creation/deletion rates
- User assignment/removal frequency
- Permission check performance
- Error rates by function
- Cache hit/miss ratios

### Maintenance Tasks
- Regular cache cleanup
- Permission audit reviews
- Team membership validation
- Performance optimization
- Security updates

## Support and Troubleshooting

### Common Issues
1. **Team not found**: Ensure facility team exists before assigning users
2. **Permission denied**: Verify user has required role for operation
3. **Max teams exceeded**: Check multi-facility user limits
4. **Cache issues**: Clear cache if stale data is returned

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG_TEAM_MANAGEMENT=true
```

### Contact
For issues or questions regarding the team management system, please refer to the BE-AW-09 ticket or contact the development team.