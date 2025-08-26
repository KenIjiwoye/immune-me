/**
 * Unit tests for TeamPermissionChecker
 * Tests permission validation, facility access control, and resource access validation
 */

const TeamPermissionChecker = require('../../utils/team-permission-checker');
const FacilityTeamManager = require('../../utils/facility-team-manager');

// Mock the FacilityTeamManager
jest.mock('../../utils/facility-team-manager');

// Mock Appwrite SDK
jest.mock('node-appwrite', () => ({
  Client: jest.fn().mockImplementation(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setKey: jest.fn().mockReturnThis()
  })),
  Teams: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    list: jest.fn(),
    listMemberships: jest.fn()
  })),
  Users: jest.fn().mockImplementation(() => ({
    get: jest.fn()
  }))
}));

describe('TeamPermissionChecker', () => {
  let permissionChecker;
  let mockTeamManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instance
    permissionChecker = new TeamPermissionChecker({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-api-key'
    });

    // Get mock team manager instance
    mockTeamManager = FacilityTeamManager.mock.instances[0];
    permissionChecker.teamManager = mockTeamManager;
  });

  describe('checkPermission', () => {
    it('should allow global admin access to all resources', async () => {
      const userId = 'admin123';
      const resource = 'patients';
      const operation = 'delete';

      // Mock global admin team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'global-admin-team' },
          roles: ['owner'],
          facilityId: null,
          isGlobalAdminTeam: true
        }
      ]);

      const result = await permissionChecker.checkPermission(userId, resource, operation);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Global admin access');
      expect(result.details.accessType).toBe('global_admin');
    });

    it('should allow facility team member access to permitted operations', async () => {
      const userId = 'user123';
      const resource = 'patients';
      const operation = 'read';
      const context = { facilityId: 'FAC001' };

      // Mock facility team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkPermission(userId, resource, operation, context);

      expect(result.allowed).toBe(true);
      expect(result.details.accessType).toBe('facility_member');
      expect(result.details.teamRole).toBe('admin');
    });

    it('should deny access for insufficient permissions', async () => {
      const userId = 'user123';
      const resource = 'facilities';
      const operation = 'delete';
      const context = { facilityId: 'FAC001' };

      // Mock facility team membership with member role
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['member'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkPermission(userId, resource, operation, context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Operation not allowed for role');
    });

    it('should deny access for users with no team memberships', async () => {
      const userId = 'user123';
      const resource = 'patients';
      const operation = 'read';

      // Mock no team memberships
      mockTeamManager.getUserTeams.mockResolvedValue([]);

      const result = await permissionChecker.checkPermission(userId, resource, operation);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User has no team memberships');
    });

    it('should handle missing required parameters', async () => {
      const result = await permissionChecker.checkPermission('', 'patients', 'read');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User ID, resource, and operation are required');
    });
  });

  describe('checkFacilityAccess', () => {
    it('should allow global admin access to any facility', async () => {
      const userId = 'admin123';
      const facilityId = 'FAC001';

      // Mock global admin team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'global-admin-team' },
          roles: ['owner'],
          facilityId: null,
          isGlobalAdminTeam: true
        }
      ]);

      const result = await permissionChecker.checkFacilityAccess(userId, facilityId);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Global admin access');
      expect(result.details.accessType).toBe('global_admin');
    });

    it('should allow facility team member access to their facility', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';

      // Mock facility team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          teamId: 'team123',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkFacilityAccess(userId, facilityId);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Facility team member');
      expect(result.details.accessType).toBe('facility_member');
      expect(result.details.teamRole).toBe('admin');
    });

    it('should deny access to different facility', async () => {
      const userId = 'user123';
      const facilityId = 'FAC002';

      // Mock facility team membership for different facility
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkFacilityAccess(userId, facilityId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User does not belong to facility team');
    });
  });

  describe('checkTeamManagementPermission', () => {
    it('should allow global admin to perform all team management operations', async () => {
      const userId = 'admin123';
      const operation = 'addMember';
      const context = { facilityId: 'FAC001', targetUserId: 'user456' };

      // Mock global admin team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'global-admin-team' },
          roles: ['owner'],
          facilityId: null,
          isGlobalAdminTeam: true
        }
      ]);

      const result = await permissionChecker.checkTeamManagementPermission(userId, operation, context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Global admin can perform all team management operations');
    });

    it('should allow facility owner to manage team members', async () => {
      const userId = 'owner123';
      const operation = 'addMember';
      const context = { facilityId: 'FAC001', targetUserId: 'user456' };

      // Mock facility team ownership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['owner'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkTeamManagementPermission(userId, operation, context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Facility team owner can manage team members');
    });

    it('should prevent facility owner from promoting to owner role', async () => {
      const userId = 'owner123';
      const operation = 'updateMemberRole';
      const context = { 
        facilityId: 'FAC001', 
        targetUserId: 'user456',
        newRole: 'owner'
      };

      // Mock facility team ownership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['owner'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkTeamManagementPermission(userId, operation, context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Facility owners cannot promote users to owner role');
    });

    it('should deny team management for non-owners', async () => {
      const userId = 'user123';
      const operation = 'addMember';
      const context = { facilityId: 'FAC001', targetUserId: 'user456' };

      // Mock facility team membership as admin (not owner)
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.checkTeamManagementPermission(userId, operation, context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient permissions for team management operation');
    });

    it('should handle unknown team management operations', async () => {
      const userId = 'admin123';
      const operation = 'unknownOperation';

      const result = await permissionChecker.checkTeamManagementPermission(userId, operation);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown team management operation');
    });
  });

  describe('validateResourceAccess', () => {
    it('should validate resource access for facility team member', async () => {
      const userId = 'user123';
      const resourceType = 'patient';
      const resourceId = 'patient456';
      const resourceData = { facilityId: 'FAC001' };

      // Mock facility access check
      jest.spyOn(permissionChecker, 'checkFacilityAccess').mockResolvedValue({
        allowed: true,
        reason: 'Facility team member',
        details: { accessType: 'facility_member', teamRole: 'admin' }
      });

      const result = await permissionChecker.validateResourceAccess(
        userId,
        resourceType,
        resourceId,
        resourceData
      );

      expect(result.valid).toBe(true);
      expect(result.details.accessType).toBe('facility_member');
    });

    it('should deny resource access for wrong facility', async () => {
      const userId = 'user123';
      const resourceType = 'patient';
      const resourceId = 'patient456';
      const resourceData = { facilityId: 'FAC002' };

      // Mock facility access denial
      jest.spyOn(permissionChecker, 'checkFacilityAccess').mockResolvedValue({
        allowed: false,
        reason: 'User does not belong to facility team'
      });

      const result = await permissionChecker.validateResourceAccess(
        userId,
        resourceType,
        resourceId,
        resourceData
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('User cannot access resource facility');
    });

    it('should handle resource without facility information', async () => {
      const userId = 'user123';
      const resourceType = 'patient';
      const resourceId = 'patient456';
      const resourceData = {}; // No facility ID

      const result = await permissionChecker.validateResourceAccess(
        userId,
        resourceType,
        resourceId,
        resourceData
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Resource does not have facility information');
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return global admin permissions', async () => {
      const userId = 'admin123';
      const facilityId = 'FAC001';

      // Mock global admin team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'global-admin-team' },
          roles: ['owner'],
          facilityId: null,
          isGlobalAdminTeam: true
        }
      ]);

      const result = await permissionChecker.getUserEffectivePermissions(userId, facilityId);

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('global_admin');
      expect(result.permissions).toBeDefined();
      expect(result.permissions.collections).toBeDefined();
    });

    it('should return facility-specific permissions', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';

      // Mock facility team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          teamId: 'team123',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.getUserEffectivePermissions(userId, facilityId);

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('facility_member');
      expect(result.teamRole).toBe('admin');
      expect(result.facilityId).toBe('FAC001');
    });

    it('should handle user not in facility team', async () => {
      const userId = 'user123';
      const facilityId = 'FAC001';

      // Mock no relevant team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC002-team' },
          roles: ['admin'],
          facilityId: 'FAC002',
          isFacilityTeam: true
        }
      ]);

      const result = await permissionChecker.getUserEffectivePermissions(userId, facilityId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('User is not a member of the facility team');
    });
  });

  describe('Permission Caching', () => {
    it('should cache permission results', async () => {
      const userId = 'user123';
      const resource = 'patients';
      const operation = 'read';
      const context = { facilityId: 'FAC001' };

      // Mock facility team membership
      mockTeamManager.getUserTeams.mockResolvedValue([
        {
          team: { name: 'facility-FAC001-team' },
          roles: ['admin'],
          facilityId: 'FAC001',
          isFacilityTeam: true
        }
      ]);

      // First call
      const result1 = await permissionChecker.checkPermission(userId, resource, operation, context);
      
      // Second call should use cache
      const result2 = await permissionChecker.checkPermission(userId, resource, operation, context);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      
      // Should only call getUserTeams once due to caching
      expect(mockTeamManager.getUserTeams).toHaveBeenCalledTimes(1);
    });

    it('should clear permission cache', () => {
      // Add some data to cache
      permissionChecker.permissionCache.set('test', { data: 'test' });

      // Clear cache
      permissionChecker.clearCache();

      expect(permissionChecker.permissionCache.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      // Add some data to cache
      permissionChecker.permissionCache.set('test1', { data: 'test1' });
      permissionChecker.permissionCache.set('test2', { data: 'test2' });

      const stats = permissionChecker.getCacheStats();

      expect(stats.permissionCache.size).toBe(2);
      expect(stats.permissionCache.maxSize).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle team manager errors gracefully', async () => {
      const userId = 'user123';
      const resource = 'patients';
      const operation = 'read';

      // Mock team manager error
      mockTeamManager.getUserTeams.mockRejectedValue(new Error('Team manager error'));

      const result = await permissionChecker.checkPermission(userId, resource, operation);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Permission check failed');
    });

    it('should handle invalid parameters', async () => {
      const result = await permissionChecker.checkFacilityAccess('', '');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('User ID and facility ID are required');
    });
  });
});