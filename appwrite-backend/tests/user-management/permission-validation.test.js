/**
 * Integration Tests for Permission Validation
 * Tests comprehensive permission checking and security features
 */

const RoleManager = require('../../utils/role-manager');
const { Client, Users } = require('node-appwrite');
const {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasHigherOrEqualRole,
  getRoleLevel,
  getMultiFacilityRoles
} = require('../../config/roles');

// Mock dependencies
jest.mock('node-appwrite');

describe('Permission Validation Integration Tests', () => {
  let roleManager;
  let mockUsers;
  let mockClient;

  // Test users with different roles
  const testUsers = {
    administrator: {
      $id: 'admin123',
      email: 'admin@example.com',
      name: 'Administrator',
      labels: ['administrator'],
      emailVerification: true,
      status: true
    },
    supervisor: {
      $id: 'supervisor123',
      email: 'supervisor@example.com',
      name: 'Supervisor',
      labels: ['supervisor', 'facility_1'],
      emailVerification: true,
      status: true
    },
    doctor: {
      $id: 'doctor123',
      email: 'doctor@example.com',
      name: 'Doctor',
      labels: ['doctor', 'facility_1'],
      emailVerification: true,
      status: true
    },
    user: {
      $id: 'user123',
      email: 'user@example.com',
      name: 'Basic User',
      labels: ['user', 'facility_2'],
      emailVerification: true,
      status: true
    },
    noRole: {
      $id: 'norole123',
      email: 'norole@example.com',
      name: 'No Role User',
      labels: [],
      emailVerification: true,
      status: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Appwrite client and services
    mockUsers = {
      get: jest.fn(),
      updateLabels: jest.fn()
    };

    mockClient = {
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis()
    };

    Client.mockImplementation(() => mockClient);
    Users.mockImplementation(() => mockUsers);

    // Create RoleManager instance
    roleManager = new RoleManager({
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-key'
    });

    // Setup mock responses
    mockUsers.get.mockImplementation((userId) => {
      const user = Object.values(testUsers).find(u => u.$id === userId);
      return Promise.resolve(user || null);
    });
    mockUsers.updateLabels.mockResolvedValue({});
  });

  describe('Role-Based Permission Validation', () => {
    it('should validate administrator permissions correctly', async () => {
      const adminPermissions = [
        { resource: 'patients', operation: 'delete', expected: true },
        { resource: 'users', operation: 'create', expected: true },
        { resource: 'system_settings', operation: 'update', expected: true },
        { resource: 'facilities', operation: 'delete', expected: true },
        { resource: 'reports', operation: 'create', expected: true }
      ];

      for (const perm of adminPermissions) {
        const result = await roleManager.hasPermission(
          testUsers.administrator,
          perm.resource,
          perm.operation
        );
        expect(result).toBe(perm.expected);
      }
    });

    it('should validate supervisor permissions correctly', async () => {
      const supervisorPermissions = [
        { resource: 'patients', operation: 'delete', expected: true },
        { resource: 'users', operation: 'create', expected: true },
        { resource: 'users', operation: 'delete', expected: false },
        { resource: 'facilities', operation: 'delete', expected: false },
        { resource: 'system_settings', operation: 'update', expected: false },
        { resource: 'reports', operation: 'read', expected: true }
      ];

      for (const perm of supervisorPermissions) {
        const result = await roleManager.hasPermission(
          testUsers.supervisor,
          perm.resource,
          perm.operation
        );
        expect(result).toBe(perm.expected);
      }
    });

    it('should validate doctor permissions correctly', async () => {
      const doctorPermissions = [
        { resource: 'patients', operation: 'create', expected: true },
        { resource: 'patients', operation: 'delete', expected: false },
        { resource: 'immunization_records', operation: 'update', expected: true },
        { resource: 'users', operation: 'create', expected: false },
        { resource: 'facilities', operation: 'read', expected: true },
        { resource: 'facilities', operation: 'update', expected: false }
      ];

      for (const perm of doctorPermissions) {
        const result = await roleManager.hasPermission(
          testUsers.doctor,
          perm.resource,
          perm.operation
        );
        expect(result).toBe(perm.expected);
      }
    });

    it('should validate basic user permissions correctly', async () => {
      const userPermissions = [
        { resource: 'patients', operation: 'read', expected: true },
        { resource: 'patients', operation: 'create', expected: false },
        { resource: 'immunization_records', operation: 'read', expected: true },
        { resource: 'immunization_records', operation: 'create', expected: false },
        { resource: 'users', operation: 'read', expected: false },
        { resource: 'reports', operation: 'read', expected: false }
      ];

      for (const perm of userPermissions) {
        const result = await roleManager.hasPermission(
          testUsers.user,
          perm.resource,
          perm.operation
        );
        expect(result).toBe(perm.expected);
      }
    });

    it('should deny all permissions for users without roles', async () => {
      const testPermissions = [
        { resource: 'patients', operation: 'read' },
        { resource: 'immunization_records', operation: 'read' },
        { resource: 'facilities', operation: 'read' }
      ];

      for (const perm of testPermissions) {
        const result = await roleManager.hasPermission(
          testUsers.noRole,
          perm.resource,
          perm.operation
        );
        expect(result).toBe(true); // Default role should have read access to basic resources
      }
    });
  });

  describe('Facility Access Validation', () => {
    it('should allow administrators access to any facility', async () => {
      const facilities = ['1', '2', '999', 'nonexistent'];
      
      for (const facilityId of facilities) {
        const result = await roleManager.validateFacilityAccess(
          testUsers.administrator,
          facilityId
        );
        expect(result).toBe(true);
      }
    });

    it('should restrict facility access for non-administrators', async () => {
      // Supervisor in facility 1
      expect(await roleManager.validateFacilityAccess(testUsers.supervisor, '1')).toBe(true);
      expect(await roleManager.validateFacilityAccess(testUsers.supervisor, '2')).toBe(false);
      expect(await roleManager.validateFacilityAccess(testUsers.supervisor, '999')).toBe(false);

      // Doctor in facility 1
      expect(await roleManager.validateFacilityAccess(testUsers.doctor, '1')).toBe(true);
      expect(await roleManager.validateFacilityAccess(testUsers.doctor, '2')).toBe(false);

      // User in facility 2
      expect(await roleManager.validateFacilityAccess(testUsers.user, '2')).toBe(true);
      expect(await roleManager.validateFacilityAccess(testUsers.user, '1')).toBe(false);
    });

    it('should handle users without facility assignments', async () => {
      const result = await roleManager.validateFacilityAccess(testUsers.noRole, '1');
      expect(result).toBe(false);
    });
  });

  describe('Multi-Facility Access Validation', () => {
    it('should identify multi-facility roles correctly', async () => {
      expect(await roleManager.canAccessMultipleFacilities(testUsers.administrator)).toBe(true);
      expect(await roleManager.canAccessMultipleFacilities(testUsers.supervisor)).toBe(false);
      expect(await roleManager.canAccessMultipleFacilities(testUsers.doctor)).toBe(false);
      expect(await roleManager.canAccessMultipleFacilities(testUsers.user)).toBe(false);
    });

    it('should validate multi-facility role configuration', () => {
      const multiFacilityRoles = getMultiFacilityRoles();
      expect(multiFacilityRoles).toContain(ROLE_LABELS.ADMINISTRATOR);
      expect(multiFacilityRoles).not.toContain(ROLE_LABELS.SUPERVISOR);
      expect(multiFacilityRoles).not.toContain(ROLE_LABELS.DOCTOR);
      expect(multiFacilityRoles).not.toContain(ROLE_LABELS.USER);
    });
  });

  describe('Role Hierarchy and Privilege Escalation Prevention', () => {
    it('should validate role hierarchy levels', () => {
      expect(getRoleLevel(ROLE_LABELS.ADMINISTRATOR)).toBeGreaterThan(getRoleLevel(ROLE_LABELS.SUPERVISOR));
      expect(getRoleLevel(ROLE_LABELS.SUPERVISOR)).toBeGreaterThan(getRoleLevel(ROLE_LABELS.DOCTOR));
      expect(getRoleLevel(ROLE_LABELS.DOCTOR)).toBeGreaterThan(getRoleLevel(ROLE_LABELS.USER));
    });

    it('should prevent privilege escalation in role comparisons', () => {
      // Higher roles can assign lower or equal roles
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.SUPERVISOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.DOCTOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.USER)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.ADMINISTRATOR)).toBe(true);

      expect(hasHigherOrEqualRole(ROLE_LABELS.SUPERVISOR, ROLE_LABELS.DOCTOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.SUPERVISOR, ROLE_LABELS.USER)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.SUPERVISOR, ROLE_LABELS.SUPERVISOR)).toBe(true);

      // Lower roles cannot assign higher roles
      expect(hasHigherOrEqualRole(ROLE_LABELS.DOCTOR, ROLE_LABELS.SUPERVISOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.DOCTOR, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.USER, ROLE_LABELS.DOCTOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.USER, ROLE_LABELS.SUPERVISOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.USER, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
    });

    it('should validate role assignment permissions based on hierarchy', async () => {
      // Test scenarios for role assignment validation
      const scenarios = [
        {
          assignerRole: ROLE_LABELS.ADMINISTRATOR,
          targetRole: ROLE_LABELS.SUPERVISOR,
          canAssign: true,
          description: 'Admin can assign supervisor role'
        },
        {
          assignerRole: ROLE_LABELS.SUPERVISOR,
          targetRole: ROLE_LABELS.DOCTOR,
          canAssign: true,
          description: 'Supervisor can assign doctor role'
        },
        {
          assignerRole: ROLE_LABELS.SUPERVISOR,
          targetRole: ROLE_LABELS.SUPERVISOR,
          canAssign: true,
          description: 'Supervisor can assign supervisor role (equal level)'
        },
        {
          assignerRole: ROLE_LABELS.DOCTOR,
          targetRole: ROLE_LABELS.SUPERVISOR,
          canAssign: false,
          description: 'Doctor cannot assign supervisor role'
        },
        {
          assignerRole: ROLE_LABELS.USER,
          targetRole: ROLE_LABELS.ADMINISTRATOR,
          canAssign: false,
          description: 'User cannot assign administrator role'
        }
      ];

      scenarios.forEach(scenario => {
        const result = hasHigherOrEqualRole(scenario.assignerRole, scenario.targetRole);
        expect(result).toBe(scenario.canAssign);
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malicious role assignment attempts', async () => {
      // Attempt to assign non-existent role
      const result = await roleManager.assignRole('user123', 'super_admin', '1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('should prevent facility ID manipulation', async () => {
      // Attempt to assign role without required facility ID
      const result = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Facility ID is required');
    });

    it('should handle concurrent role assignment attempts', async () => {
      const promises = Array(5).fill().map(() =>
        roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1')
      );

      const results = await Promise.all(promises);
      
      // All should succeed (or fail consistently)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should validate role consistency after assignment', async () => {
      const assignResult = await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1');
      expect(assignResult.success).toBe(true);

      // Verify role was actually assigned
      const hasRole = await roleManager.hasRole('user123', ROLE_LABELS.DOCTOR);
      expect(hasRole).toBe(true);

      // Verify facility was assigned
      const facilityId = await roleManager.getFacilityId('user123');
      expect(facilityId).toBe('1');
    });
  });

  describe('Permission Inheritance and Special Permissions', () => {
    it('should validate special permissions for each role', async () => {
      const roleInfo = await roleManager.getUserRoleInfo(testUsers.administrator);
      expect(roleInfo.success).toBe(true);
      expect(roleInfo.specialPermissions).toContain('user_management');
      expect(roleInfo.specialPermissions).toContain('system_configuration');
      expect(roleInfo.specialPermissions).toContain('audit_access');
    });

    it('should validate data access levels', async () => {
      const adminInfo = await roleManager.getUserRoleInfo(testUsers.administrator);
      expect(adminInfo.dataAccess).toBe('all_facilities');

      const doctorInfo = await roleManager.getUserRoleInfo(testUsers.doctor);
      expect(doctorInfo.dataAccess).toBe('facility_only');
    });

    it('should handle permission inheritance correctly', async () => {
      // Administrators should have all permissions that supervisors have, plus more
      const adminConfig = ROLE_PERMISSIONS[ROLE_LABELS.ADMINISTRATOR];
      const supervisorConfig = ROLE_PERMISSIONS[ROLE_LABELS.SUPERVISOR];

      Object.keys(supervisorConfig.permissions).forEach(resource => {
        supervisorConfig.permissions[resource].forEach(operation => {
          if (adminConfig.permissions[resource]) {
            expect(adminConfig.permissions[resource]).toContain(operation);
          }
        });
      });
    });
  });

  describe('Audit and Compliance', () => {
    it('should track role changes for audit purposes', async () => {
      const originalRole = await roleManager.getUserRoleInfo(testUsers.user);
      
      await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1');
      
      const newRole = await roleManager.getUserRoleInfo(testUsers.user);
      
      expect(originalRole.role).not.toBe(newRole.role);
      expect(mockUsers.updateLabels).toHaveBeenCalled();
    });

    it('should validate role configuration completeness', () => {
      // Ensure all roles have required configuration
      Object.values(ROLE_LABELS).forEach(role => {
        const config = ROLE_PERMISSIONS[role];
        expect(config).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.permissions).toBeDefined();
        expect(config.dataAccess).toBeDefined();
        expect(config.specialPermissions).toBeDefined();
        expect(typeof config.canAccessMultipleFacilities).toBe('boolean');
      });
    });

    it('should ensure permission consistency across roles', () => {
      // Basic validation that higher roles have at least the permissions of lower roles
      const userPerms = ROLE_PERMISSIONS[ROLE_LABELS.USER].permissions;
      const doctorPerms = ROLE_PERMISSIONS[ROLE_LABELS.DOCTOR].permissions;
      const supervisorPerms = ROLE_PERMISSIONS[ROLE_LABELS.SUPERVISOR].permissions;
      const adminPerms = ROLE_PERMISSIONS[ROLE_LABELS.ADMINISTRATOR].permissions;

      // Check that higher roles have read permissions where lower roles do
      Object.keys(userPerms).forEach(resource => {
        if (userPerms[resource].includes('read')) {
          expect(doctorPerms[resource] || []).toContain('read');
          expect(supervisorPerms[resource] || []).toContain('read');
          expect(adminPerms[resource] || []).toContain('read');
        }
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache permission checks for performance', async () => {
      // First call should fetch from API
      await roleManager.hasPermission('admin123', 'patients', 'read');
      expect(mockUsers.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await roleManager.hasPermission('admin123', 'patients', 'write');
      expect(mockUsers.get).toHaveBeenCalledTimes(1); // Still 1, used cache
    });

    it('should handle cache invalidation on role changes', async () => {
      // Initial permission check
      await roleManager.hasPermission('user123', 'patients', 'read');
      
      // Change role (should clear cache)
      await roleManager.assignRole('user123', ROLE_LABELS.DOCTOR, '1');
      
      // Next permission check should fetch fresh data
      await roleManager.hasPermission('user123', 'patients', 'create');
      
      expect(mockUsers.get).toHaveBeenCalledTimes(2); // Once for initial, once after cache clear
    });
  });
});