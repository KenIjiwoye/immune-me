/**
 * Unit tests for FacilityTeamManager
 * Tests team creation, user assignment, removal, and multi-facility scenarios
 */

const FacilityTeamManager = require('../../utils/facility-team-manager');
const { generateFacilityTeamName } = require('../../config/team-structure');

// Mock Appwrite SDK
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

describe('FacilityTeamManager', () => {
  let teamManager;
  let mockTeams;
  let mockUsers;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instance
    teamManager = new FacilityTeamManager({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-api-key'
    });

    // Get mock instances
    const { Teams, Users } = require('node-appwrite');
    mockTeams = new Teams();
    mockUsers = new Users();
    
    // Set up the mocks on the instance
    teamManager.teams = mockTeams;
    teamManager.users = mockUsers;
  });

  describe('createFacilityTeam', () => {
    it('should create a new facility team successfully', async () => {
      const facilityId = 'FAC001';
      const expectedTeamName = generateFacilityTeamName(facilityId);
      
      // Mock team doesn't exist
      mockTeams.list.mockResolvedValue({
        teams: []
      });

      // Mock successful team creation
      const mockTeam = {
        $id: 'team123',
        name: expectedTeamName,
        $createdAt: '2024-01-01T00:00:00.000Z'
      };
      mockTeams.create.mockResolvedValue(mockTeam);

      const result = await teamManager.createFacilityTeam(facilityId);

      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(result.team.name).toBe(expectedTeamName);
      expect(mockTeams.create).toHaveBeenCalledWith(
        expect.any(String),
        expectedTeamName,
        ['owner', 'admin', 'member']
      );
    });

    it('should return existing team if already exists', async () => {
      const facilityId = 'FAC001';
      const expectedTeamName = generateFacilityTeamName(facilityId);
      
      // Mock existing team
      const existingTeam = {
        $id: 'team123',
        name: expectedTeamName,
        $createdAt: '2024-01-01T00:00:00.000Z'
      };
      mockTeams.list.mockResolvedValue({
        teams: [existingTeam]
      });

      const result = await teamManager.createFacilityTeam(facilityId);

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.team).toEqual(existingTeam);
      expect(mockTeams.create).not.toHaveBeenCalled();
    });

    it('should handle invalid facility ID', async () => {
      const result = await teamManager.createFacilityTeam('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid facility ID is required');
    });
  });

  describe('assignUserToTeam', () => {
    it('should assign user to facility team successfully', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';
      const teamRole = 'admin';

      // Mock team exists
      const mockTeam = {
        $id: 'team123',
        name: generateFacilityTeamName(facilityId)
      };
      mockTeams.list.mockResolvedValue({
        teams: [mockTeam]
      });

      // Mock user exists
      const mockUser = {
        $id: userId,
        labels: ['healthcare_worker']
      };
      mockUsers.get.mockResolvedValue(mockUser);

      // Mock no existing membership
      mockTeams.listMemberships.mockResolvedValue({
        memberships: []
      });

      // Mock successful membership creation
      const mockMembership = {
        $id: 'membership123',
        userId,
        teamId: mockTeam.$id,
        roles: [teamRole]
      };
      mockTeams.createMembership.mockResolvedValue(mockMembership);

      const result = await teamManager.assignUserToTeam(userId, facilityId, teamRole);

      expect(result.success).toBe(true);
      expect(result.teamRole).toBe(teamRole);
      expect(mockTeams.createMembership).toHaveBeenCalledWith(
        mockTeam.$id,
        [teamRole],
        userId
      );
    });

    it('should handle user already in team', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';
      const teamRole = 'admin';

      // Mock team exists
      const mockTeam = {
        $id: 'team123',
        name: generateFacilityTeamName(facilityId)
      };
      mockTeams.list.mockResolvedValue({
        teams: [mockTeam]
      });

      // Mock user exists
      const mockUser = {
        $id: userId,
        labels: ['healthcare_worker']
      };
      mockUsers.get.mockResolvedValue(mockUser);

      // Mock existing membership with same role
      mockTeams.listMemberships.mockResolvedValue({
        memberships: [{
          $id: 'membership123',
          userId,
          teamId: mockTeam.$id,
          roles: [teamRole]
        }]
      });

      const result = await teamManager.assignUserToTeam(userId, facilityId, teamRole);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
      expect(mockTeams.createMembership).not.toHaveBeenCalled();
    });

    it('should handle missing parameters', async () => {
      const result = await teamManager.assignUserToTeam('', 'FAC001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID and facility ID are required');
    });
  });

  describe('removeUserFromTeam', () => {
    it('should remove user from facility team successfully', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';

      // Mock team exists
      const mockTeam = {
        $id: 'team123',
        name: generateFacilityTeamName(facilityId)
      };
      mockTeams.list.mockResolvedValue({
        teams: [mockTeam]
      });

      // Mock existing membership
      const mockMembership = {
        $id: 'membership123',
        userId,
        teamId: mockTeam.$id,
        roles: ['member']
      };
      mockTeams.listMemberships.mockResolvedValue({
        memberships: [mockMembership]
      });

      // Mock successful deletion
      mockTeams.deleteMembership.mockResolvedValue({});

      const result = await teamManager.removeUserFromTeam(userId, facilityId);

      expect(result.success).toBe(true);
      expect(mockTeams.deleteMembership).toHaveBeenCalledWith(
        mockTeam.$id,
        mockMembership.$id
      );
    });

    it('should handle user not in team', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';

      // Mock team exists
      const mockTeam = {
        $id: 'team123',
        name: generateFacilityTeamName(facilityId)
      };
      mockTeams.list.mockResolvedValue({
        teams: [mockTeam]
      });

      // Mock no membership
      mockTeams.listMemberships.mockResolvedValue({
        memberships: []
      });

      const result = await teamManager.removeUserFromTeam(userId, facilityId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User was not a member of the team');
      expect(mockTeams.deleteMembership).not.toHaveBeenCalled();
    });
  });

  describe('getUserTeams', () => {
    it('should get all teams for a user', async () => {
      const userId = 'user123';

      // Mock user memberships
      const mockMemberships = [
        {
          $id: 'membership1',
          userId,
          teamId: 'team1',
          roles: ['admin']
        },
        {
          $id: 'membership2',
          userId,
          teamId: 'team2',
          roles: ['member']
        }
      ];
      mockTeams.listMemberships.mockResolvedValue({
        memberships: mockMemberships
      });

      // Mock team details
      mockTeams.get
        .mockResolvedValueOnce({
          $id: 'team1',
          name: 'facility-FAC001-team'
        })
        .mockResolvedValueOnce({
          $id: 'team2',
          name: 'facility-FAC002-team'
        });

      const result = await teamManager.getUserTeams(userId);

      expect(result).toHaveLength(2);
      expect(result[0].facilityId).toBe('FAC001');
      expect(result[1].facilityId).toBe('FAC002');
      expect(result[0].isFacilityTeam).toBe(true);
      expect(result[1].isFacilityTeam).toBe(true);
    });

    it('should handle user with no teams', async () => {
      const userId = 'user123';

      mockTeams.listMemberships.mockResolvedValue({
        memberships: []
      });

      const result = await teamManager.getUserTeams(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getFacilityTeamMembers', () => {
    it('should get all members of a facility team', async () => {
      const facilityId = 'FAC001';

      // Mock team exists
      const mockTeam = {
        $id: 'team123',
        name: generateFacilityTeamName(facilityId)
      };
      mockTeams.list.mockResolvedValue({
        teams: [mockTeam]
      });

      // Mock team memberships
      const mockMemberships = [
        {
          $id: 'membership1',
          userId: 'user1',
          teamId: mockTeam.$id,
          roles: ['owner']
        },
        {
          $id: 'membership2',
          userId: 'user2',
          teamId: mockTeam.$id,
          roles: ['admin']
        }
      ];
      mockTeams.listMemberships.mockResolvedValue({
        memberships: mockMemberships
      });

      // Mock user details
      mockUsers.get
        .mockResolvedValueOnce({
          $id: 'user1',
          name: 'John Doe',
          email: 'john@example.com'
        })
        .mockResolvedValueOnce({
          $id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com'
        });

      const result = await teamManager.getFacilityTeamMembers(facilityId);

      expect(result).toHaveLength(2);
      expect(result[0].primaryRole).toBe('owner');
      expect(result[1].primaryRole).toBe('admin');
      expect(result[0].user.name).toBe('John Doe');
      expect(result[1].user.name).toBe('Jane Smith');
    });
  });

  describe('assignUserToMultipleFacilities', () => {
    it('should assign user to multiple facilities successfully', async () => {
      const userId = 'user123';
      const facilityIds = ['FAC001', 'FAC002'];
      const defaultRole = 'member';

      // Mock successful assignments
      jest.spyOn(teamManager, 'assignUserToTeam')
        .mockResolvedValueOnce({
          success: true,
          message: 'User assigned successfully',
          facilityId: 'FAC001'
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'User assigned successfully',
          facilityId: 'FAC002'
        });

      const result = await teamManager.assignUserToMultipleFacilities(
        userId,
        facilityIds,
        defaultRole
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(teamManager.assignUserToTeam).toHaveBeenCalledTimes(2);
    });

    it('should handle max teams limit', async () => {
      const userId = 'user123';
      const facilityIds = Array.from({ length: 6 }, (_, i) => `FAC${i + 1}`);

      const result = await teamManager.assignUserToMultipleFacilities(
        userId,
        facilityIds
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot belong to more than 5 teams');
    });
  });

  describe('Cache Management', () => {
    it('should cache and retrieve team data', async () => {
      const teamName = 'facility-FAC001-team';
      const mockTeam = {
        $id: 'team123',
        name: teamName
      };

      // Cache the team
      teamManager._cacheTeam(mockTeam);

      // Retrieve from cache
      const cachedTeam = teamManager._getTeamFromCache(teamName);

      expect(cachedTeam).toEqual(mockTeam);
    });

    it('should expire cached data after timeout', async () => {
      const teamName = 'facility-FAC001-team';
      const mockTeam = {
        $id: 'team123',
        name: teamName
      };

      // Set very short cache timeout
      teamManager.cacheTimeout = 1;

      // Cache the team
      teamManager._cacheTeam(mockTeam);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Should return null for expired cache
      const cachedTeam = teamManager._getTeamFromCache(teamName);

      expect(cachedTeam).toBeNull();
    });

    it('should clear all caches', () => {
      // Add some data to caches
      teamManager.teamCache.set('test', { data: 'test' });
      teamManager.membershipCache.set('test', { data: 'test' });
      teamManager.permissionCache.set('test', { data: 'test' });

      // Clear all caches
      teamManager.clearCache();

      expect(teamManager.teamCache.size).toBe(0);
      expect(teamManager.membershipCache.size).toBe(0);
      expect(teamManager.permissionCache.size).toBe(0);
    });
  });
});