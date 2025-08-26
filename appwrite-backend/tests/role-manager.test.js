/**
 * Comprehensive Unit Tests for RoleManager Class
 * Tests all methods, edge cases, error handling, and caching functionality
 * Based on BE-AW-08 ticket requirements
 */

const RoleManager = require('../utils/role-manager');
const { Client, Users } = require('node-appwrite');
const {
  ROLE_LABELS,
  FACILITY_LABEL_PREFIX,
  DEFAULT_ROLE,
  getRoleConfig,
  isValidRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  generateFacilityLabel,
  parseFacilityId,
  getMultiFacilityRoles
} = require('../config/roles');

// Mock node-appwrite
jest.mock('node-appwrite');

describe('RoleManager', () => {
  let roleManager;
  let mockUsers;
  let mockClient;

  // Test data
  const mockUser = {
    $id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    labels: ['administrator', 'facility_1'],
    emailVerification: true,
    status: true,
    registration: '2023-01-01T00:00:00.000Z'
  };

  const mockFacilityUser = {
    $id: 'user456',
    email: 'facility@example.com',
    name: 'Facility User',
    labels: ['doctor', 'facility_2'],
    emailVerification: true,
    status: true,
    registration: '2023-01-01T00:00:00.000Z'
  };

  const mockUserWithoutRole = {
    $id: 'user789',
    email: 'norole@example.com',
    name: 'No Role User',
    labels: [],
    emailVerification: true,
    status: true,
    registration: '2023-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Users class
    mockUsers = {
      get: jest.fn(),
      updateLabels: jest.fn()
    };

    // Mock Client class
    mockClient = {
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis()
    };

    // Setup mocks
    Client.mockImplementation(() => mockClient);
    Users.mockImplementation(() => mockUsers);

    // Create RoleManager instance
    roleManager = new RoleManager({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-key',
      cacheTimeout: 1000 // 1 second for testing
    });
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const rm = new RoleManager();
      expect(rm.cache).toBeInstanceOf(Map);
      expect(rm.cacheTimeout).toBe(300000); // 5 minutes default
    });

    it('should initialize with custom options', () => {
      const options = {
        endpoint: 'https://custom.appwrite.io/v1',
        projectId: 'custom-project',
        apiKey: 'custom-key',
        cacheTimeout: 60000
      };
      const rm = new RoleManager(options);
      expect(rm.cacheTimeout).toBe(60000);
    });

    it('should setup Appwrite client correctly', () => {
      expect(Client).toHaveBeenCalled();
      expect(mockClient.setEndpoint).toHaveBeenCalledWith('https://test.appwrite.io/v1');
      expect(mockClient.setProject).toHaveBeenCalledWith('test-project');
      expect(mockClient.setKey).toHaveBeenCalledWith('test-key');
      expect(Users).toHaveBeenCalledWith(mockClient);
    });
  });

  describe('hasRole()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
    });

    it('should return true when user has the required role', async () => {
      const result = await roleManager.hasRole(mockUser, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(true);
    });

    it('should return false when user does not have the required role', async () => {
      const result = await roleManager.hasRole(mockUser, ROLE_LABELS.DOCTOR);
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      const result = await roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should return false for invalid role', async () => {
      const result = await roleManager.hasRole(mockUser, 'invalid_role');
      expect(result).toBe(false);
    });

    it('should return false when user is null', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.hasRole('nonexistent', ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle user without labels', async () => {
      const result = await roleManager.hasRole(mockUserWithoutRole, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should throw error for invalid role parameter', async () => {
      const result = await roleManager.hasRole(mockUser, null);
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
    });

    it('should return true when user has one of the required roles', async () => {
      const roles = [ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.DOCTOR];
      const result = await roleManager.hasAnyRole(mockFacilityUser, roles);
      expect(result).toBe(true);
    });

    it('should return false when user has none of the required roles', async () => {
      const roles = [ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.SUPERVISOR];
      const result = await roleManager.hasAnyRole(mockFacilityUser, roles);
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      const roles = [ROLE_LABELS.DOCTOR];
      const result = await roleManager.hasAnyRole('user456', roles);
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user456');
    });

    it('should handle empty roles array', async () => {
      const result = await roleManager.hasAnyRole(mockFacilityUser, []);
      expect(result).toBe(false);
    });

    it('should handle non-array roles parameter', async () => {
      const result = await roleManager.hasAnyRole(mockFacilityUser, 'not-an-array');
      expect(result).toBe(false);
    });

    it('should handle invalid roles in array', async () => {
      const roles = ['invalid_role', ROLE_LABELS.DOCTOR];
      const result = await roleManager.hasAnyRole(mockFacilityUser, roles);
      expect(result).toBe(false);
    });

    it('should handle user without labels', async () => {
      const roles = [ROLE_LABELS.DOCTOR];
      const result = await roleManager.hasAnyRole(mockUserWithoutRole, roles);
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const roles = [ROLE_LABELS.DOCTOR];
      const result = await roleManager.hasAnyRole('user456', roles);
      expect(result).toBe(false);
    });
  });

  describe('getFacilityId()', () => {
    it('should return facility ID from user labels', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.getFacilityId(mockUser);
      expect(result).toBe('1');
    });

    it('should work with user ID string', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.getFacilityId('user456');
      expect(result).toBe('2');
      expect(mockUsers.get).toHaveBeenCalledWith('user456');
    });

    it('should return null when no facility labels exist', async () => {
      const userWithoutFacility = {
        ...mockUser,
        labels: ['administrator']
      };
      const result = await roleManager.getFacilityId(userWithoutFacility);
      expect(result).toBe(null);
    });

    it('should return null when user has no labels', async () => {
      const result = await roleManager.getFacilityId(mockUserWithoutRole);
      expect(result).toBe(null);
    });

    it('should return null when user is null', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.getFacilityId('nonexistent');
      expect(result).toBe(null);
    });

    it('should handle multiple facility labels and return first one', async () => {
      const userWithMultipleFacilities = {
        ...mockUser,
        labels: ['administrator', 'facility_1', 'facility_2']
      };
      const result = await roleManager.getFacilityId(userWithMultipleFacilities);
      expect(result).toBe('1');
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.getFacilityId('user123');
      expect(result).toBe(null);
    });
  });

  describe('isAdministrator()', () => {
    it('should return true for administrator users', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.isAdministrator(mockUser);
      expect(result).toBe(true);
    });

    it('should return false for non-administrator users', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.isAdministrator(mockFacilityUser);
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.isAdministrator('user123');
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.isAdministrator('user123');
      expect(result).toBe(false);
    });
  });

  describe('canAccessMultipleFacilities()', () => {
    it('should return true for administrators', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.canAccessMultipleFacilities(mockUser);
      expect(result).toBe(true);
    });

    it('should return false for facility-only roles', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.canAccessMultipleFacilities(mockFacilityUser);
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.canAccessMultipleFacilities('user123');
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should handle user without role', async () => {
      const result = await roleManager.canAccessMultipleFacilities(mockUserWithoutRole);
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.canAccessMultipleFacilities('user123');
      expect(result).toBe(false);
    });
  });

  describe('getUserRoleInfo()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
    });

    it('should return complete user role information', async () => {
      const result = await roleManager.getUserRoleInfo(mockUser);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(result.role).toBe(ROLE_LABELS.ADMINISTRATOR);
      expect(result.facilityId).toBe('1');
      expect(result.permissions).toBeDefined();
      expect(result.specialPermissions).toBeDefined();
      expect(result.canAccessMultipleFacilities).toBe(true);
      expect(result.dataAccess).toBe('all_facilities');
    });

    it('should work with user ID string', async () => {
      const result = await roleManager.getUserRoleInfo('user123');
      expect(result.success).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should handle user not found', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.getUserRoleInfo('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle user without role gracefully', async () => {
      mockUsers.get.mockResolvedValue(mockUserWithoutRole);
      const result = await roleManager.getUserRoleInfo(mockUserWithoutRole);
      
      expect(result.success).toBe(true);
      expect(result.role).toBe(DEFAULT_ROLE);
    });

    it('should handle API errors', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.getUserRoleInfo('user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('assignRole()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
      mockUsers.updateLabels.mockResolvedValue({});
    });

    it('should assign role successfully', async () => {
      const result = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '2');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe(`Role ${ROLE_LABELS.DOCTOR} assigned successfully`);
      expect(result.userId).toBe('user123');
      expect(result.role).toBe(ROLE_LABELS.DOCTOR);
      expect(result.facilityId).toBe('2');
      
      expect(mockUsers.updateLabels).toHaveBeenCalledWith('user123', [
        ROLE_LABELS.DOCTOR,
        'facility_2'
      ]);
    });

    it('should assign administrator role without facility ID', async () => {
      const result = await roleManager.assignRole('user123', ROLE_LABELS.ADMINISTRATOR);
      
      expect(result.success).toBe(true);
      expect(mockUsers.updateLabels).toHaveBeenCalledWith('user123', [
        ROLE_LABELS.ADMINISTRATOR
      ]);
    });

    it('should preserve non-role labels', async () => {
      const userWithOtherLabels = {
        ...mockUser,
        labels: ['administrator', 'facility_1', 'custom_label', 'another_label']
      };
      mockUsers.get.mockResolvedValue(userWithOtherLabels);
      
      const result = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '2');
      
      expect(result.success).toBe(true);
      expect(mockUsers.updateLabels).toHaveBeenCalledWith('user123', [
        'custom_label',
        'another_label',
        ROLE_LABELS.DOCTOR,
        'facility_2'
      ]);
    });

    it('should require facility ID for non-administrator roles', async () => {
      const result = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Facility ID is required for non-administrator roles');
    });

    it('should reject invalid roles', async () => {
      const result = await roleManager.assignRole('user123', 'invalid_role', '1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid role: invalid_role');
    });

    it('should handle user not found', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.assignRole('nonexistent', ROLE_LABELS.DOCTOR, '1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle API errors during label update', async () => {
      mockUsers.updateLabels.mockRejectedValue(new Error('Update failed'));
      const result = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should clear user cache after successful assignment', async () => {
      // Add user to cache first
      roleManager._cacheUser(mockUser);
      expect(roleManager._getUserFromCache('user123')).toBeTruthy();
      
      await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1');
      
      expect(roleManager._getUserFromCache('user123')).toBe(null);
    });
  });

  describe('removeRole()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
      mockUsers.updateLabels.mockResolvedValue({});
    });

    it('should remove role and assign default role', async () => {
      const result = await roleManager.removeRole('user123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role removed and default role assigned');
      expect(result.userId).toBe('user123');
      expect(result.newRole).toBe(DEFAULT_ROLE);
      
      expect(mockUsers.updateLabels).toHaveBeenCalledWith('user123', [DEFAULT_ROLE]);
    });

    it('should preserve non-role labels', async () => {
      const userWithOtherLabels = {
        ...mockUser,
        labels: ['administrator', 'facility_1', 'custom_label', 'another_label']
      };
      mockUsers.get.mockResolvedValue(userWithOtherLabels);
      
      const result = await roleManager.removeRole('user123');
      
      expect(result.success).toBe(true);
      expect(mockUsers.updateLabels).toHaveBeenCalledWith('user123', [
        'custom_label',
        'another_label',
        DEFAULT_ROLE
      ]);
    });

    it('should handle user not found', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.removeRole('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle API errors during label update', async () => {
      mockUsers.updateLabels.mockRejectedValue(new Error('Update failed'));
      const result = await roleManager.removeRole('user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should clear user cache after successful removal', async () => {
      // Add user to cache first
      roleManager._cacheUser(mockUser);
      expect(roleManager._getUserFromCache('user123')).toBeTruthy();
      
      await roleManager.removeRole('user123');
      
      expect(roleManager._getUserFromCache('user123')).toBe(null);
    });
  });

  describe('hasPermission()', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
    });

    it('should return true when user has permission', async () => {
      const result = await roleManager.hasPermission(mockUser, 'patients', 'delete');
      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.hasPermission(mockFacilityUser, 'patients', 'delete');
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      const result = await roleManager.hasPermission('user123', 'patients', 'read');
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should return false for non-existent resource', async () => {
      const result = await roleManager.hasPermission(mockUser, 'nonexistent', 'read');
      expect(result).toBe(false);
    });

    it('should handle user role info failure', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.hasPermission('nonexistent', 'patients', 'read');
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.hasPermission('user123', 'patients', 'read');
      expect(result).toBe(false);
    });
  });

  describe('validateFacilityAccess()', () => {
    it('should allow administrators to access any facility', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.validateFacilityAccess(mockUser, '999');
      expect(result).toBe(true);
    });

    it('should allow users to access their assigned facility', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.validateFacilityAccess(mockFacilityUser, '2');
      expect(result).toBe(true);
    });

    it('should deny users access to other facilities', async () => {
      mockUsers.get.mockResolvedValue(mockFacilityUser);
      const result = await roleManager.validateFacilityAccess(mockFacilityUser, '999');
      expect(result).toBe(false);
    });

    it('should work with user ID string', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const result = await roleManager.validateFacilityAccess('user123', '999');
      expect(result).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledWith('user123');
    });

    it('should handle user role info failure', async () => {
      mockUsers.get.mockResolvedValue(null);
      const result = await roleManager.validateFacilityAccess('nonexistent', '1');
      expect(result).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('API Error'));
      const result = await roleManager.validateFacilityAccess('user123', '1');
      expect(result).toBe(false);
    });
  });

  describe('Caching Functionality', () => {
    beforeEach(() => {
      mockUsers.get.mockResolvedValue(mockUser);
    });

    it('should cache user objects after fetching', async () => {
      await roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR);
      
      // Second call should use cache
      await roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR);
      
      expect(mockUsers.get).toHaveBeenCalledTimes(1);
    });

    it('should return cached user when available', () => {
      roleManager._cacheUser(mockUser);
      const cached = roleManager._getUserFromCache('user123');
      expect(cached).toEqual(mockUser);
    });

    it('should return null for non-cached user', () => {
      const cached = roleManager._getUserFromCache('nonexistent');
      expect(cached).toBe(null);
    });

    it('should expire cache after timeout', async () => {
      // Create RoleManager with very short cache timeout
      const shortCacheRM = new RoleManager({ cacheTimeout: 1 });
      shortCacheRM.users = mockUsers;
      
      shortCacheRM._cacheUser(mockUser);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const cached = shortCacheRM._getUserFromCache('user123');
      expect(cached).toBe(null);
    });

    it('should clear specific user from cache', () => {
      roleManager._cacheUser(mockUser);
      expect(roleManager._getUserFromCache('user123')).toBeTruthy();
      
      roleManager._clearUserCache('user123');
      expect(roleManager._getUserFromCache('user123')).toBe(null);
    });

    it('should clear all cache', () => {
      roleManager._cacheUser(mockUser);
      roleManager._cacheUser(mockFacilityUser);
      
      expect(roleManager.cache.size).toBe(2);
      
      roleManager.clearCache();
      expect(roleManager.cache.size).toBe(0);
    });

    it('should handle user object input without caching', async () => {
      const result = await roleManager.hasRole(mockUser, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(true);
      expect(mockUsers.get).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      
      const promises = Array(10).fill().map(() => 
        roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.every(r => r === true)).toBe(true);
      expect(mockUsers.get).toHaveBeenCalledTimes(1); // Should use cache
    });

    it('should handle malformed user objects', async () => {
      const malformedUser = { id: 'wrong-field' }; // Missing $id
      const result = await roleManager.hasRole(malformedUser, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle null and undefined inputs gracefully', async () => {
      expect(await roleManager.hasRole(null, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
      expect(await roleManager.hasRole(undefined, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
      expect(await roleManager.hasRole('user123', null)).toBe(false);
      expect(await roleManager.hasRole('user123', undefined)).toBe(false);
    });

    it('should handle empty strings and invalid IDs', async () => {
      mockUsers.get.mockRejectedValue(new Error('Invalid ID'));
      const result = await roleManager.hasRole('', ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle users with malformed labels', async () => {
      const userWithBadLabels = {
        ...mockUser,
        labels: null
      };
      const result = await roleManager.hasRole(userWithBadLabels, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });
  });

  describe('Security Features', () => {
    it('should validate role hierarchy in privilege escalation prevention', () => {
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.DOCTOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.DOCTOR, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.SUPERVISOR, ROLE_LABELS.SUPERVISOR)).toBe(true);
    });

    it('should properly generate and parse facility labels', () => {
      const facilityId = '123';
      const label = generateFacilityLabel(facilityId);
      expect(label).toBe('facility_123');
      
      const parsedId = parseFacilityId(label);
      expect(parsedId).toBe('123');
    });

    it('should handle invalid facility labels', () => {
      expect(parseFacilityId('invalid_label')).toBe(null);
      expect(parseFacilityId('')).toBe(null);
      expect(parseFacilityId(null)).toBe(null);
    });

    it('should identify multi-facility roles correctly', () => {
      const multiFacilityRoles = getMultiFacilityRoles();
      expect(multiFacilityRoles).toContain(ROLE_LABELS.ADMINISTRATOR);
      expect(multiFacilityRoles).not.toContain(ROLE_LABELS.DOCTOR);
    });

    it('should validate role existence', () => {
      expect(isValidRole(ROLE_LABELS.ADMINISTRATOR)).toBe(true);
      expect(isValidRole('invalid_role')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockUsers.get.mockRejectedValue(new Error('Network timeout'));
      const result = await roleManager.hasRole('user123', ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle Appwrite API errors', async () => {
      const appwriteError = new Error('Appwrite API Error');
      appwriteError.code = 500;
      mockUsers.get.mockRejectedValue(appwriteError);
      
      const result = await roleManager.getUserRoleInfo('user123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Appwrite API Error');
    });

    it('should handle invalid user object types', async () => {
      const result = await roleManager.hasRole(123, ROLE_LABELS.ADMINISTRATOR);
      expect(result).toBe(false);
    });

    it('should handle promise rejections in cache operations', async () => {
      mockUsers.get.mockRejectedValue(new Error('Cache error'));
      const result = await roleManager._getUserObject('user123');
      expect(result).toBe(null);
    });
  });

  describe('Integration with Role Configuration', () => {
    it('should use correct role configuration for permissions', async () => {
      mockUsers.get.mockResolvedValue(mockUser);
      const roleInfo = await roleManager.getUserRoleInfo(mockUser);
      
      expect(roleInfo.success).toBe(true);
      const adminConfig = getRoleConfig(ROLE_LABELS.ADMINISTRATOR);
      expect(roleInfo.permissions).toEqual(adminConfig.permissions);
      expect(roleInfo.specialPermissions).toEqual(adminConfig.specialPermissions);
    });

    it('should handle missing role configuration gracefully', async () => {
      const userWithInvalidRole = {
        ...mockUser,
        labels: ['invalid_role', 'facility_1']
      };
      
      const roleInfo = await roleManager.getUserRoleInfo(userWithInvalidRole);
      expect(roleInfo.success).toBe(true);
      expect(roleInfo.permissions).toEqual({});
      expect(roleInfo.specialPermissions).toEqual([]);
    });
  });
});
      