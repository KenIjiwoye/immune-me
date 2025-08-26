/**
 * Jest setup file for team management tests
 * Configures global test environment and mocks
 */

// Set up environment variables for tests
process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project-id';
process.env.APPWRITE_API_KEY = 'test-api-key';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Mock user data
  createMockUser: (id, role = 'healthcare_worker', facilityId = 'FAC001') => ({
    $id: id,
    name: `Test User ${id}`,
    email: `user${id}@test.com`,
    labels: [role, `facility_${facilityId}`],
    status: true,
    emailVerification: true,
    phoneVerification: false,
    registration: '2024-01-01T00:00:00.000Z'
  }),

  // Mock team data
  createMockTeam: (id, facilityId) => ({
    $id: id,
    name: `facility-${facilityId}-team`,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z'
  }),

  // Mock membership data
  createMockMembership: (id, userId, teamId, role = 'member') => ({
    $id: id,
    userId,
    teamId,
    roles: [role],
    invited: '2024-01-01T00:00:00.000Z',
    joined: '2024-01-01T00:00:00.000Z',
    confirm: true,
    $createdAt: '2024-01-01T00:00:00.000Z'
  }),

  // Mock facility data
  createMockFacility: (id, name) => ({
    $id: id,
    name: name || `Test Facility ${id}`,
    address: '123 Test Street',
    phone: '+1234567890',
    email: `facility${id}@test.com`,
    status: 'active',
    $createdAt: '2024-01-01T00:00:00.000Z'
  }),

  // Test scenarios
  scenarios: {
    // Single facility user
    singleFacilityUser: {
      userId: 'user123',
      facilityId: 'FAC001',
      role: 'healthcare_worker',
      teamRole: 'admin'
    },

    // Multi-facility user
    multiFacilityUser: {
      userId: 'multiuser123',
      facilities: [
        { facilityId: 'FAC001', role: 'facility_manager', teamRole: 'owner' },
        { facilityId: 'FAC002', role: 'healthcare_worker', teamRole: 'admin' }
      ]
    },

    // Global admin user
    globalAdminUser: {
      userId: 'globaladmin123',
      role: 'admin',
      teamRole: 'owner'
    },

    // Test facilities
    testFacilities: [
      { id: 'FAC001', name: 'Central Hospital' },
      { id: 'FAC002', name: 'Community Clinic' },
      { id: 'FAC003', name: 'Rural Health Center' }
    ]
  }
};

// Custom matchers
expect.extend({
  toBeValidTeamResult(received) {
    const pass = received && 
                 typeof received.success === 'boolean' &&
                 (received.success ? received.team : received.error);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid team result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid team result with success boolean and team/error`,
        pass: false,
      };
    }
  },

  toBeValidPermissionResult(received) {
    const pass = received && 
                 typeof received.allowed === 'boolean' &&
                 typeof received.reason === 'string' &&
                 received.timestamp;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid permission result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid permission result with allowed, reason, and timestamp`,
        pass: false,
      };
    }
  },

  toHaveTeamRole(received, expectedRole) {
    const pass = received && 
                 received.roles && 
                 received.roles.includes(expectedRole);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have team role ${expectedRole}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have team role ${expectedRole}`,
        pass: false,
      };
    }
  }
});

// Global cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

// Global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});