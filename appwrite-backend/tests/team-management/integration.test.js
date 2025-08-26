/**
 * Integration tests for team management functionality
 * Tests the complete workflow of team creation, user assignment, and permission checking
 */

const FacilityTeamManager = require('../../utils/facility-team-manager');
const TeamPermissionChecker = require('../../utils/team-permission-checker');

// Mock Appwrite SDK for integration tests
jest.mock('node-appwrite', () => ({
  Client: jest.fn().mockImplementation(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setKey: jest.fn().mockReturnThis()
  })),
  Teams: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    createMembership: jest.fn(),
    deleteMembership: jest.fn(),
    updateMembershipRoles: jest.fn(),
    listMemberships: jest.fn()
  })),
  Users: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    updateLabels: jest.fn()
  }))
}));

describe('Team Management Integration Tests', () => {
  let teamManager;
  let permissionChecker;
  let mockTeams;
  let mockUsers;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize managers
    teamManager = new FacilityTeamManager({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-api-key'
    });

    permissionChecker = new TeamPermissionChecker({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-api-key'
    });

    // Get mock instances
    const { Teams, Users } = require('node-appwrite');
    mockTeams = new Teams();
    mockUsers = new Users();

    // Set up mocks on instances
    teamManager.teams = mockTeams;
    teamManager.users = mockUsers;
    permissionChecker.teams = mockTeams;
    permissionChecker.users = mockUsers;
    permissionChecker.teamManager = teamManager;
  });

  describe('Complete Team Workflow', () => {
    it('should handle complete facility team setup and user management', async () => {
      const facilityId = 'FAC001';
      const adminUserId = 'admin123';
      const doctorUserId = 'doctor456';
      const nurseUserId = 'nurse789';

      // Step 1: Create facility team
      mockTeams.list.mockResolvedValue({ teams: [] });
      mockTeams.create.mockResolvedValue({
        $id: 'team123',
        name: 'facility-FAC001-team',
        $createdAt: '2024-01-01T00:00:00.000Z'
      });

      const createResult = await teamManager.createFacilityTeam(facilityId);
      expect(createResult.success).toBe(true);
      expect(createResult.created).toBe(true);

      // Step 2: Assign admin user as owner
      mockUsers.get.mockResolvedValue({
        $id: adminUserId,
        labels: ['facility_manager']
      });
      mockTeams.listMemberships.mockResolvedValue({ memberships: [] });
      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership1',
        userId: adminUserId,
        teamId: 'team123',
        roles: ['owner']
      });

      const assignAdminResult = await teamManager.assignUserToTeam(
        adminUserId,
        facilityId,
        'owner'
      );
      expect(assignAdminResult.success).toBe(true);
      expect(assignAdminResult.teamRole).toBe('owner');

      // Step 3: Assign doctor as admin
      mockUsers.get.mockResolvedValue({
        $id: doctorUserId,
        labels: ['healthcare_worker']
      });
      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership2',
        userId: doctorUserId,
        teamId: 'team123',
        roles: ['admin']
      });

      const assignDoctorResult = await teamManager.assignUserToTeam(
        doctorUserId,
        facilityId,
        'admin'
      );
      expect(assignDoctorResult.success).toBe(true);
      expect(assignDoctorResult.teamRole).toBe('admin');

      // Step 4: Assign nurse as member
      mockUsers.get.mockResolvedValue({
        $id: nurseUserId,
        labels: ['healthcare_worker']
      });
      mockTeams.createMembership.mockResolvedValue({
        $id: 'membership3',
        userId: nurseUserId,
        teamId: 'team123',
        roles: ['member']
      });

      const assignNurseResult = await teamManager.assignUserToTeam(
        nurseUserId,
        facilityId,
        'member'
      );
      expect(assignNurseResult.success).toBe(true);
      expect(assignNurseResult.teamRole).toBe('member');

      // Step 5: Verify team members
      mockTeams.listMemberships.mockResolvedValue({
        memberships: [
          {
            $id: 'membership1',
            userId: adminUserId,
            teamId: 'team123',
            roles: ['owner']
          },
          {
            $id: 'membership2',
            userId: doctorUserId,
            teamId: 'team123',
            roles: ['admin']
          },
          {
            $id: 'membership3',
            userId: nurseUserId,
            teamId: 'team123',
            roles: ['member']
          }
        ]
      });

      mockUsers.get
        .mockResolvedValueOnce({
          $id: adminUserId,
          name: 'Admin User',
          email: 'admin@facility.com'
        })
        .mockResolvedValueOnce({
          $id: doctorUserId,
          name: 'Doctor User',
          email: 'doctor@facility.com'
        })
        .mockResolvedValueOnce({
          $id: nurseUserId,
          name: 'Nurse User',
          email: 'nurse@facility.com'
        });

      const teamMembers = await teamManager.getFacilityTeamMembers(facilityId);
      expect(teamMembers).toHaveLength(3);
      expect(teamMembers.find(m => m.userId === adminUserId).primaryRole).toBe('owner');
      expect(teamMembers.find(m => m.userId === doctorUserId).primaryRole).toBe('admin');
      expect(teamMembers.find(m => m.userId === nurseUserId).primaryRole).toBe('member');
    });

    it('should handle permission checking across different roles', async () => {
      const facilityId = 'FAC001';
      const adminUserId = 'admin123';
      const doctorUserId = 'doctor456';
      const nurseUserId = 'nurse789';

      // Mock team memberships for permission checking
      jest.spyOn(teamManager, 'getUserTeams')
        .mockImplementation((userId) => {
          const memberships = {
            [adminUserId]: [{
              team: { name: 'facility-FAC001-team' },
              roles: ['owner'],
              facilityId: 'FAC001',
              teamId: 'team123',
              isFacilityTeam: true
            }],
            [doctorUserId]: [{
              team: { name: 'facility-FAC001-team' },
              roles: ['admin'],
              facilityId: 'FAC001',
              teamId: 'team123',
              isFacilityTeam: true
            }],
            [nurseUserId]: [{
              team: { name: 'facility-FAC001-team' },
              roles: ['member'],
              facilityId: 'FAC001',
              teamId: 'team123',
              isFacilityTeam: true
            }]
          };
          return Promise.resolve(memberships[userId] || []);
        });

      // Test admin permissions
      const adminPatientCreate = await permissionChecker.checkPermission(
        adminUserId,
        'patients',
        'create',
        { facilityId }
      );
      expect(adminPatientCreate.allowed).toBe(true);

      const adminUserManagement = await permissionChecker.checkTeamManagementPermission(
        adminUserId,
        'addMember',
        { facilityId, targetUserId: 'newuser123' }
      );
      expect(adminUserManagement.allowed).toBe(true);

      // Test doctor permissions
      const doctorPatientUpdate = await permissionChecker.checkPermission(
        doctorUserId,
        'patients',
        'update',
        { facilityId }
      );
      expect(doctorPatientUpdate.allowed).toBe(true);

      const doctorUserManagement = await permissionChecker.checkTeamManagementPermission(
        doctorUserId,
        'addMember',
        { facilityId, targetUserId: 'newuser123' }
      );
      expect(doctorUserManagement.allowed).toBe(false);

      // Test nurse permissions
      const nursePatientRead = await permissionChecker.checkPermission(
        nurseUserId,
        'patients',
        'read',
        { facilityId }
      );
      expect(nursePatientRead.allowed).toBe(true);

      const nursePatientDelete = await permissionChecker.checkPermission(
        nurseUserId,
        'patients',
        'delete',
        { facilityId }
      );
      expect(nursePatientDelete.allowed).toBe(false);
    });

    it('should handle cross-facility access scenarios', async () => {
      const user1Id = 'user123';
      const facility1Id = 'FAC001';
      const facility2Id = 'FAC002';

      // Mock user belongs to facility 1 only
      jest.spyOn(teamManager, 'getUserTeams').mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: facility1Id,
          teamId: 'team123',
          isFacilityTeam: true
        }
      ]);

      // Should have access to facility 1
      const facility1Access = await permissionChecker.checkFacilityAccess(user1Id, facility1Id);
      expect(facility1Access.allowed).toBe(true);

      // Should not have access to facility 2
      const facility2Access = await permissionChecker.checkFacilityAccess(user1Id, facility2Id);
      expect(facility2Access.allowed).toBe(false);

      // Should be able to access facility 1 resources
      const facility1Resource = await permissionChecker.validateResourceAccess(
        user1Id,
        'patient',
        'patient123',
        { facilityId: facility1Id }
      );
      expect(facility1Resource.valid).toBe(true);

      // Should not be able to access facility 2 resources
      const facility2Resource = await permissionChecker.validateResourceAccess(
        user1Id,
        'patient',
        'patient456',
        { facilityId: facility2Id }
      );
      expect(facility2Resource.valid).toBe(false);
    });

    it('should handle global admin scenarios', async () => {
      const globalAdminId = 'globaladmin123';
      const facilityId = 'FAC001';

      // Mock global admin membership
      jest.spyOn(teamManager, 'getUserTeams').mockResolvedValue([
        {
          team: { name: 'global-admin-team' },
          roles: ['owner'],
          facilityId: null,
          teamId: 'globalteam123',
          isGlobalAdminTeam: true
        }
      ]);

      // Should have access to any facility
      const facilityAccess = await permissionChecker.checkFacilityAccess(globalAdminId, facilityId);
      expect(facilityAccess.allowed).toBe(true);
      expect(facilityAccess.details.accessType).toBe('global_admin');

      // Should have all permissions
      const deletePermission = await permissionChecker.checkPermission(
        globalAdminId,
        'patients',
        'delete',
        { facilityId }
      );
      expect(deletePermission.allowed).toBe(true);

      // Should be able to perform all team management operations
      const teamManagement = await permissionChecker.checkTeamManagementPermission(
        globalAdminId,
        'addMember',
        { facilityId, targetUserId: 'newuser123' }
      );
      expect(teamManagement.allowed).toBe(true);

      // Should be able to access any resource
      const resourceAccess = await permissionChecker.validateResourceAccess(
        globalAdminId,
        'patient',
        'patient123',
        { facilityId }
      );
      expect(resourceAccess.valid).toBe(true);
    });

    it('should handle multi-facility user scenarios', async () => {
      const multiUserId = 'multiuser123';
      const facility1Id = 'FAC001';
      const facility2Id = 'FAC002';

      // Mock user belongs to multiple facilities
      jest.spyOn(teamManager, 'getUserTeams').mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: facility1Id,
          teamId: 'team123',
          isFacilityTeam: true
        },
        {
          team: { name: 'facility-FAC002-team' },
          roles: ['member'],
          facilityId: facility2Id,
          teamId: 'team456',
          isFacilityTeam: true
        }
      ]);

      // Should have access to both facilities
      const facility1Access = await permissionChecker.checkFacilityAccess(multiUserId, facility1Id);
      expect(facility1Access.allowed).toBe(true);

      const facility2Access = await permissionChecker.checkFacilityAccess(multiUserId, facility2Id);
      expect(facility2Access.allowed).toBe(true);

      // Should have different permissions in each facility
      const facility1Permissions = await permissionChecker.getUserEffectivePermissions(
        multiUserId,
        facility1Id
      );
      expect(facility1Permissions.teamRole).toBe('admin');

      const facility2Permissions = await permissionChecker.getUserEffectivePermissions(
        multiUserId,
        facility2Id
      );
      expect(facility2Permissions.teamRole).toBe('member');
    });

    it('should handle team member removal workflow', async () => {
      const facilityId = 'FAC001';
      const adminUserId = 'admin123';
      const userToRemoveId = 'user456';

      // Mock admin can remove members
      jest.spyOn(teamManager, 'getUserTeams').mockImplementation((userId) => {
        if (userId === adminUserId) {
          return Promise.resolve([{
            team: { name: 'facility-FAC001-team' },
            roles: ['owner'],
            facilityId,
            teamId: 'team123',
            isFacilityTeam: true
          }]);
        }
        return Promise.resolve([]);
      });

      // Mock user exists and is in team
      mockUsers.get.mockResolvedValue({
        $id: userToRemoveId,
        name: 'User To Remove'
      });

      jest.spyOn(teamManager, 'isUserInFacilityTeam').mockResolvedValue(true);
      jest.spyOn(teamManager, 'getUserRoleInFacilityTeam').mockResolvedValue('member');

      // Mock team members (more than one owner)
      jest.spyOn(teamManager, 'getFacilityTeamMembers').mockResolvedValue([
        { primaryRole: 'owner', userId: adminUserId },
        { primaryRole: 'owner', userId: 'owner2' },
        { primaryRole: 'member', userId: userToRemoveId }
      ]);

      // Mock successful removal
      mockTeams.listMemberships.mockResolvedValue({
        memberships: [{
          $id: 'membership456',
          userId: userToRemoveId,
          teamId: 'team123'
        }]
      });
      mockTeams.deleteMembership.mockResolvedValue({});

      // Check permission to remove
      const removePermission = await permissionChecker.checkTeamManagementPermission(
        adminUserId,
        'removeMember',
        { facilityId, targetUserId: userToRemoveId }
      );
      expect(removePermission.allowed).toBe(true);

      // Remove user
      const removeResult = await teamManager.removeUserFromTeam(userToRemoveId, facilityId);
      expect(removeResult.success).toBe(true);
      expect(mockTeams.deleteMembership).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle team creation failures gracefully', async () => {
      const facilityId = 'FAC001';

      mockTeams.list.mockResolvedValue({ teams: [] });
      mockTeams.create.mockRejectedValue(new Error('Team creation failed'));

      const result = await teamManager.createFacilityTeam(facilityId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Team creation failed');
    });

    it('should handle permission check failures gracefully', async () => {
      const userId = 'user123';
      const resource = 'patients';
      const operation = 'read';

      jest.spyOn(teamManager, 'getUserTeams').mockRejectedValue(new Error('Database error'));

      const result = await permissionChecker.checkPermission(userId, resource, operation);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Permission check failed');
    });

    it('should handle user assignment to non-existent team', async () => {
      const userId = 'user123';
      const facilityId = 'NONEXISTENT';

      mockTeams.list.mockResolvedValue({ teams: [] });
      mockTeams.create.mockRejectedValue(new Error('Cannot create team'));

      const result = await teamManager.assignUserToTeam(userId, facilityId);
      expect(result.success).toBe(false);
    });
  });
});