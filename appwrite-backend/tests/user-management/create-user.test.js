/**
 * Integration Tests for Create User Function
 * Tests user creation with role assignment workflows
 */

const createUserFunction = require('../../functions/user-management/create-user/src/main');
const { Client, Users, ID } = require('node-appwrite');
const RoleManager = require('../../utils/role-manager');
const { ROLE_LABELS, DEFAULT_ROLE } = require('../../config/roles');

// Mock dependencies
jest.mock('node-appwrite');
jest.mock('../../utils/role-manager');

describe('Create User Function Integration Tests', () => {
  let mockUsers;
  let mockClient;
  let mockRoleManager;
  let mockReq;
  let mockRes;
  let mockLog;
  let mockError;

  const validUserData = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
    role: ROLE_LABELS.DOCTOR,
    facilityId: '1'
  };

  const mockCreatedUser = {
    $id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerification: false,
    status: true,
    registration: '2023-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Appwrite client and services
    mockUsers = {
      create: jest.fn(),
      delete: jest.fn()
    };

    mockClient = {
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis()
    };

    Client.mockImplementation(() => mockClient);
    Users.mockImplementation(() => mockUsers);
    ID.unique = jest.fn().mockReturnValue('user123');

    // Mock RoleManager
    mockRoleManager = {
      assignRole: jest.fn(),
      getUserRoleInfo: jest.fn()
    };
    RoleManager.mockImplementation(() => mockRoleManager);

    // Mock request/response objects
    mockReq = {
      body: JSON.stringify(validUserData)
    };

    mockRes = {
      json: jest.fn()
    };

    mockLog = jest.fn();
    mockError = jest.fn();

    // Setup default successful responses
    mockUsers.create.mockResolvedValue(mockCreatedUser);
    mockRoleManager.assignRole.mockResolvedValue({
      success: true,
      message: 'Role assigned successfully'
    });
    mockRoleManager.getUserRoleInfo.mockResolvedValue({
      success: true,
      role: ROLE_LABELS.DOCTOR,
      facilityId: '1',
      permissions: { patients: ['create', 'read', 'update'] },
      canAccessMultipleFacilities: false
    });
  });

  describe('Successful User Creation', () => {
    it('should create user with role assignment successfully', async () => {
      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockUsers.create).toHaveBeenCalledWith(
        'user123',
        'test@example.com',
        undefined,
        'SecurePass123!',
        'Test User'
      );

      expect(mockRoleManager.assignRole).toHaveBeenCalledWith(
        'user123',
        ROLE_LABELS.DOCTOR,
        '1'
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User created successfully with role assignment',
          user: expect.objectContaining({
            $id: 'user123',
            email: 'test@example.com',
            name: 'Test User',
            role: ROLE_LABELS.DOCTOR,
            facilityId: '1'
          })
        }),
        201
      );
    });

    it('should create administrator without facility ID', async () => {
      const adminData = {
        ...validUserData,
        role: ROLE_LABELS.ADMINISTRATOR,
        facilityId: undefined
      };
      mockReq.body = JSON.stringify(adminData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalledWith(
        'user123',
        ROLE_LABELS.ADMINISTRATOR,
        undefined
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            role: ROLE_LABELS.ADMINISTRATOR
          })
        }),
        201
      );
    });

    it('should use default role when no role specified', async () => {
      const userData = { ...validUserData };
      delete userData.role;
      mockReq.body = JSON.stringify(userData);

      mockRoleManager.assignRole.mockResolvedValue({
        success: true,
        message: 'Role assigned successfully'
      });

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRoleManager.assignRole).toHaveBeenCalledWith(
        'user123',
        DEFAULT_ROLE,
        '1'
      );
    });

    it('should handle object request body', async () => {
      mockReq.body = validUserData; // Object instead of string

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockUsers.create).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
        201
      );
    });
  });

  describe('Input Validation', () => {
    it('should reject missing required fields', async () => {
      const incompleteData = { email: 'test@example.com' };
      mockReq.body = JSON.stringify(incompleteData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Missing required fields: email, password, name'
        },
        400
      );

      expect(mockUsers.create).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', async () => {
      const invalidEmailData = { ...validUserData, email: 'invalid-email' };
      mockReq.body = JSON.stringify(invalidEmailData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid email format'
        },
        400
      );

      expect(mockUsers.create).not.toHaveBeenCalled();
    });

    it('should reject weak passwords', async () => {
      const weakPasswordData = { ...validUserData, password: '123' };
      mockReq.body = JSON.stringify(weakPasswordData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Password must be at least 8 characters long'
        },
        400
      );

      expect(mockUsers.create).not.toHaveBeenCalled();
    });

    it('should reject invalid roles', async () => {
      const invalidRoleData = { ...validUserData, role: 'invalid_role' };
      mockReq.body = JSON.stringify(invalidRoleData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid role: invalid_role'
        },
        400
      );

      expect(mockUsers.create).not.toHaveBeenCalled();
    });

    it('should require facility ID for non-administrator roles', async () => {
      const noFacilityData = { ...validUserData };
      delete noFacilityData.facilityId;
      mockReq.body = JSON.stringify(noFacilityData);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Facility ID is required for non-administrator roles'
        },
        400
      );

      expect(mockUsers.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Cleanup', () => {
    it('should handle user creation failure', async () => {
      const appwriteError = new Error('User creation failed');
      appwriteError.code = 500;
      mockUsers.create.mockRejectedValue(appwriteError);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Internal server error during user creation'
        },
        500
      );
    });

    it('should handle duplicate email error', async () => {
      const duplicateError = new Error('User already exists');
      duplicateError.code = 409;
      mockUsers.create.mockRejectedValue(duplicateError);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'User with this email already exists'
        },
        409
      );
    });

    it('should handle invalid data error', async () => {
      const invalidDataError = new Error('Invalid data');
      invalidDataError.code = 400;
      mockUsers.create.mockRejectedValue(invalidDataError);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid user data provided'
        },
        400
      );
    });

    it('should cleanup user when role assignment fails', async () => {
      mockRoleManager.assignRole.mockResolvedValue({
        success: false,
        error: 'Role assignment failed'
      });

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockUsers.delete).toHaveBeenCalledWith('user123');
      expect(mockRes.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'User created but role assignment failed: Role assignment failed'
        },
        500
      );
    });

    it('should handle cleanup failure gracefully', async () => {
      mockRoleManager.assignRole.mockResolvedValue({
        success: false,
        error: 'Role assignment failed'
      });
      mockUsers.delete.mockRejectedValue(new Error('Cleanup failed'));

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup user after role assignment failure')
      );
    });
  });

  describe('Role Assignment Integration', () => {
    it('should handle role manager initialization', async () => {
      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(RoleManager).toHaveBeenCalled();
      expect(mockRoleManager.assignRole).toHaveBeenCalled();
      expect(mockRoleManager.getUserRoleInfo).toHaveBeenCalled();
    });

    it('should include complete user info in response', async () => {
      const detailedRoleInfo = {
        success: true,
        role: ROLE_LABELS.DOCTOR,
        facilityId: '1',
        permissions: {
          patients: ['create', 'read', 'update'],
          immunization_records: ['create', 'read', 'update']
        },
        specialPermissions: ['patient_care'],
        canAccessMultipleFacilities: false
      };
      mockRoleManager.getUserRoleInfo.mockResolvedValue(detailedRoleInfo);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            role: ROLE_LABELS.DOCTOR,
            facilityId: '1',
            permissions: detailedRoleInfo.permissions,
            canAccessMultipleFacilities: false
          })
        }),
        201
      );
    });

    it('should handle role info retrieval failure gracefully', async () => {
      mockRoleManager.getUserRoleInfo.mockResolvedValue({
        success: false,
        error: 'Failed to get role info'
      });

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            role: ROLE_LABELS.DOCTOR,
            facilityId: '1',
            permissions: {},
            canAccessMultipleFacilities: false
          })
        }),
        201
      );
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log user creation steps', async () => {
      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockLog).toHaveBeenCalledWith(
        'Creating user with email: test@example.com, role: doctor'
      );
      expect(mockLog).toHaveBeenCalledWith(
        'User created successfully with ID: user123'
      );
      expect(mockLog).toHaveBeenCalledWith(
        'Role doctor assigned successfully to user user123'
      );
      expect(mockLog).toHaveBeenCalledWith(
        'User creation completed successfully for test@example.com'
      );
    });

    it('should log errors appropriately', async () => {
      const testError = new Error('Test error');
      mockUsers.create.mockRejectedValue(testError);

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockError).toHaveBeenCalledWith('Error creating user: Test error');
    });

    it('should log cleanup operations', async () => {
      mockRoleManager.assignRole.mockResolvedValue({
        success: false,
        error: 'Role assignment failed'
      });

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockLog).toHaveBeenCalledWith(
        'Cleaned up user user123 due to role assignment failure'
      );
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variables for Appwrite configuration', async () => {
      process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
      process.env.APPWRITE_PROJECT_ID = 'test-project';
      process.env.APPWRITE_API_KEY = 'test-key';

      await createUserFunction({ req: mockReq, res: mockRes, log: mockLog, error: mockError });

      expect(mockClient.setEndpoint).toHaveBeenCalledWith('https://test.appwrite.io/v1');
      expect(mockClient.setProject).toHaveBeenCalledWith('test-project');
      expect(mockClient.setKey).toHaveBeenCalledWith('test-key');
    });
  });
});