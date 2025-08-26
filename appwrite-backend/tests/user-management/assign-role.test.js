/**
 * Integration Tests for Assign Role Function
 * Tests role modification workflows and permission validation
 */

const assignRoleFunction = require('../../functions/user-management/assign-role/src/main');
const { Client, Users } = require('node-appwrite');
const RoleManager = require('../../utils/role-manager');
const { ROLE_LABELS, hasHigherOrEqualRole } = require('../../config/roles');

// Mock dependencies
jest.mock('node-appwrite');
jest.mock('../../utils/role-manager');

describe('Assign Role Function Integration Tests', () => {
  let mockUsers;
  let mockClient;
  let mockRoleManager;
  let mockReq;
  let mockRes;
  let mockLog;
  let mockError;

  const validAssignmentData = {
    userId: 'user123',
    role: ROLE_LABELS.DOCTOR,
    facilityId: '1',
    requestingUserId: 'admin456'
  };

  const mockTargetUser = {
    $id: 'user123',
    email: 'target@example.com',
    name: 'Target User',
    labels: ['user', 'facility_2'],
    emailVerification: true,
    status: true
  };

  const mockRequestingAdmin = {
    success: true,
    userId: 'admin456',
    role: ROLE_LABELS.ADMINISTRATOR,
    facilityId: null,
    permissions: {
      users: ['create', 'read', 'update', 'delete']
    },
    canAccessMultipleFacilities: true
  };

  const mockRequestingSupervisor = {
    success: true,
    userId: 'supervisor789',
    role: ROLE_LABELS.SUPERVISOR,
    facilityId: '1',
    permissions: {
      users: ['create', 'read', 'update']
    },
    canAccessMultipleFacilities: false
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Appwrite client and services
    mockUsers = {
      get: jest.fn()
    };

    mockClient = {
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis()
    };

    Client.mockImplementation(() => mockClient);
    Users.mockImplementation(() => mockUsers);

    // Mock RoleManager
    mockRoleManager = {
      getUserRoleInfo: jest.fn(),
      hasPermission: jest.fn(),
      assignRole: jest.fn()
    };
    RoleManager.mockImplementation(() => mockRoleManager);

    // Mock request/response objects
    mockReq = {
      body: JSON.stringify(validAssignmentData)
    };

    mockRes = {
      json: jest.fn()
    };

    mockLog = jest.fn();
    mockError = jest.fn();

    // Setup default successful responses
    mockUsers.get.mockResolvedValue(mockTargetUser);
    mockRoleManager.getUserRoleInfo.mockImplementation((userId) => {
      if (userId === 'admin456') return Promise.resolve(mockRequestingAdmin);
      if (userId === 'supervisor789') return Promise.resolve(mockRequestingSupervisor);
      return Promise.resolve({
        success: true,
        userId,
        role: ROLE_LABELS.USER,
        facilityId: '2'
      });
    });
    mockRoleManager.hasPermission.mockResolvedValue(true);
    mockRoleManager.assignRole.mockResolvedValue({
      success: true,
      message: 'Role assigned successfully'
    });
  });

  describe('Successful Role Assignment', () => {
    it('should assign role successfully with proper permissions', async () => {
      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockUsers.get).toHaveBeenCalledWith('user123');
      expect(mockRoleManager.getUserRoleInfo).toHaveBeenCalledWith('admin456');
      expect(mockRoleManager.hasPermission).toHaveBeenCalledWith('admin456', 'users', 'update');
      expect(mockRoleManager.assignRole).toHaveBeenCalledWith('user123', ROLE_LABELS.DOCTOR, '1');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Role assigned successfully',
          userId: 'user123',
          roleChange: expect.objectContaining({
            previous: expect.any(Object),
            current: expect.any(Object)
          })
        }),
        200
      );
    });

    it('should work without requesting user validation', async () => {
      const dataWithoutRequestingUser = { ...validAssignmentData };
      delete dataWithoutRequestingUser.requestingUserId;
      mockReq.body = JSON.stringify(dataWithoutRequestingUser);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.getUserRoleInfo).not.toHaveBeenCalledWith('admin456');
      expect(mockRoleManager.assignRole).toHaveBeenCalledWith('user123', ROLE_LABELS.DOCTOR, '1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
        200
      );
    });

    it('should assign administrator role without facility ID', async () => {
      const adminAssignmentData = {
        ...validAssignmentData,
        role: ROLE_LABELS.ADMINISTRATOR,
        facilityId: undefined
      };
      mockReq.body = JSON.stringify(adminAssignmentData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalledWith(
        'user123',
        ROLE_LABELS.ADMINISTRATOR,
        undefined
      );
    });

    it('should handle object request body', async () => {
      mockReq.body = validAssignmentData; // Object instead of string

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
        200
      );
    });
  });

  describe('Input Validation', () => {
    it('should reject missing required fields', async () => {
      const incompleteData = { userId: 'user123' };
      mockReq.body = JSON.stringify(incompleteData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Missing required fields: userId, role'
        },
        400
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should reject invalid roles', async () => {
      const invalidRoleData = { ...validAssignmentData, role: 'invalid_role' };
      mockReq.body = JSON.stringify(invalidRoleData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid role: invalid_role'
        },
        400
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should require facility ID for non-administrator roles', async () => {
      const noFacilityData = { ...validAssignmentData };
      delete noFacilityData.facilityId;
      mockReq.body = JSON.stringify(noFacilityData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Facility ID is required for non-administrator roles'
        },
        400
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });
  });

  describe('Security and Permission Validation', () => {
    it('should prevent privilege escalation', async () => {
      // Supervisor trying to assign administrator role
      const escalationData = {
        ...validAssignmentData,
        role: ROLE_LABELS.ADMINISTRATOR,
        requestingUserId: 'supervisor789'
      };
      mockReq.body = JSON.stringify(escalationData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Cannot assign a role higher than your own'
        },
        403
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should allow equal role assignment', async () => {
      // Supervisor assigning supervisor role
      const equalRoleData = {
        ...validAssignmentData,
        role: ROLE_LABELS.SUPERVISOR,
        requestingUserId: 'supervisor789'
      };
      mockReq.body = JSON.stringify(equalRoleData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
        200
      );
    });

    it('should prevent cross-facility role assignment for non-administrators', async () => {
      const crossFacilityData = {
        ...validAssignmentData,
        facilityId: '999', // Different from supervisor's facility (1)
        requestingUserId: 'supervisor789'
      };
      mockReq.body = JSON.stringify(crossFacilityData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Cannot assign roles to users in other facilities'
        },
        403
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should allow administrators to assign roles across facilities', async () => {
      const crossFacilityData = {
        ...validAssignmentData,
        facilityId: '999',
        requestingUserId: 'admin456'
      };
      mockReq.body = JSON.stringify(crossFacilityData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalledWith('user123', ROLE_LABELS.DOCTOR, '999');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
        200
      );
    });

    it('should reject users without permission to manage users', async () => {
      mockRoleManager.hasPermission.mockResolvedValue(false);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Insufficient permissions to assign roles'
        },
        403
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should handle requesting user validation failure', async () => {
      mockRoleManager.getUserRoleInfo.mockResolvedValue({
        success: false,
        error: 'User not found'
      });

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Could not validate requesting user permissions'
        },
        403
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });
  });

  describe('Target User Validation', () => {
    it('should handle target user not found', async () => {
      const notFoundError = new Error('User not found');
      notFoundError.code = 404;
      mockUsers.get.mockRejectedValue(notFoundError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Target user not found'
        },
        404
      );

      expect(mockRoleManager.assignRole).not.toHaveBeenCalled();
    });

    it('should handle other user fetch errors', async () => {
      const serverError = new Error('Server error');
      serverError.code = 500;
      mockUsers.get.mockRejectedValue(serverError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Internal server error during role assignment'
        },
        500
      );
    });
  });

  describe('Role Assignment Execution', () => {
    it('should handle role assignment failure', async () => {
      mockRoleManager.assignRole.mockResolvedValue({
        success: false,
        error: 'Role assignment failed'
      });

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Role assignment failed'
        },
        500
      );
    });

    it('should track role changes in response', async () => {
      // Mock current user info
      mockRoleManager.getUserRoleInfo.mockImplementation((userId) => {
        if (userId === 'admin456') return Promise.resolve(mockRequestingAdmin);
        if (userId === 'user123') {
          // First call - before role change
          return Promise.resolve({
            success: true,
            userId: 'user123',
            role: ROLE_LABELS.USER,
            facilityId: '2'
          });
        }
        return Promise.resolve({ success: false });
      });

      // Mock updated user info after role assignment
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce(mockRequestingAdmin); // requesting user
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce({ // current user info
        success: true,
        userId: 'user123',
        role: ROLE_LABELS.USER,
        facilityId: '2'
      });
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce({ // updated user info
        success: true,
        userId: 'user123',
        role: ROLE_LABELS.DOCTOR,
        facilityId: '1',
        permissions: { patients: ['create', 'read', 'update'] },
        specialPermissions: ['patient_care'],
        canAccessMultipleFacilities: false,
        dataAccess: 'facility_only'
      });

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          roleChange: {
            previous: {
              role: ROLE_LABELS.USER,
              facilityId: '2'
            },
            current: {
              role: ROLE_LABELS.DOCTOR,
              facilityId: '1'
            }
          },
          userInfo: expect.objectContaining({
            role: ROLE_LABELS.DOCTOR,
            facilityId: '1',
            permissions: { patients: ['create', 'read', 'update'] },
            specialPermissions: ['patient_care'],
            canAccessMultipleFacilities: false,
            dataAccess: 'facility_only'
          })
        }),
        200
      );
    });

    it('should handle updated user info retrieval failure', async () => {
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce(mockRequestingAdmin); // requesting user
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce({ // current user info
        success: true,
        role: ROLE_LABELS.USER,
        facilityId: '2'
      });
      mockRoleManager.getUserRoleInfo.mockResolvedValueOnce({ // updated user info fails
        success: false,
        error: 'Failed to get updated info'
      });

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          userInfo: null
        }),
        200
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle general server errors', async () => {
      const serverError = new Error('Unexpected error');
      mockRoleManager.assignRole.mockRejectedValue(serverError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Internal server error during role assignment'
        },
        500
      );
    });

    it('should handle 404 errors specifically', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.code = 404;
      mockRoleManager.assignRole.mockRejectedValue(notFoundError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'User not found'
        },
        404
      );
    });

    it('should handle 400 errors specifically', async () => {
      const badRequestError = new Error('Bad request');
      badRequestError.code = 400;
      mockRoleManager.assignRole.mockRejectedValue(badRequestError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid request data'
        },
        400
      );
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log role assignment steps', async () => {
      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockLog).toHaveBeenCalledWith('Assigning role doctor to user user123');
      expect(mockLog).toHaveBeenCalledWith('Validating permissions for requesting user admin456');
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('Role assignment successful: user -> doctor for user user123')
      );
      expect(mockLog).toHaveBeenCalledWith('Role assignment completed for user user123');
    });

    it('should log errors appropriately', async () => {
      const testError = new Error('Test error');
      mockRoleManager.assignRole.mockRejectedValue(testError);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockError).toHaveBeenCalledWith('Error assigning role: Test error');
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variables for Appwrite configuration', async () => {
      process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
      process.env.APPWRITE_PROJECT_ID = 'test-project';
      process.env.APPWRITE_API_KEY = 'test-key';

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockClient.setEndpoint).toHaveBeenCalledWith('https://test.appwrite.io/v1');
      expect(mockClient.setProject).toHaveBeenCalledWith('test-project');
      expect(mockClient.setKey).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Role Hierarchy Validation', () => {
    it('should use role hierarchy helper correctly', () => {
      expect(hasHigherOrEqualRole(ROLE_LABELS.ADMINISTRATOR, ROLE_LABELS.DOCTOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.SUPERVISOR, ROLE_LABELS.DOCTOR)).toBe(true);
      expect(hasHigherOrEqualRole(ROLE_LABELS.DOCTOR, ROLE_LABELS.SUPERVISOR)).toBe(false);
      expect(hasHigherOrEqualRole(ROLE_LABELS.USER, ROLE_LABELS.ADMINISTRATOR)).toBe(false);
    });

    it('should prevent lower-level users from assigning higher roles', async () => {
      // Doctor trying to assign supervisor role
      const doctorUser = {
        success: true,
        userId: 'doctor123',
        role: ROLE_LABELS.DOCTOR,
        facilityId: '1',
        permissions: { users: ['read'] }
      };

      mockRoleManager.getUserRoleInfo.mockResolvedValue(doctorUser);
      mockRoleManager.hasPermission.mockResolvedValue(false); // Doctor can't manage users

      const escalationData = {
        ...validAssignmentData,
        role: ROLE_LABELS.SUPERVISOR,
        requestingUserId: 'doctor123'
      };
      mockReq.body = JSON.stringify(escalationData);

      await assignRoleFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Insufficient permissions to assign roles'
        },
        403
      );
    });
  });
});