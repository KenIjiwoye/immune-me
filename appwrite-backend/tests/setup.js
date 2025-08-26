/**
 * Jest Test Setup File
 * Global test configuration and utilities for role management system tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-api-key';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  /**
   * Create a mock user object
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock user object
   */
  createMockUser: (overrides = {}) => ({
    $id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    labels: ['user', 'facility_1'],
    emailVerification: true,
    status: true,
    registration: '2023-01-01T00:00:00.000Z',
    ...overrides
  }),

  /**
   * Create a mock request object
   * @param {Object} body - Request body
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock request object
   */
  createMockRequest: (body = {}, overrides = {}) => ({
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json'
    },
    ...overrides
  }),

  /**
   * Create a mock response object
   * @returns {Object} Mock response object with jest functions
   */
  createMockResponse: () => ({
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    end: jest.fn()
  }),

  /**
   * Create mock Appwrite function context
   * @returns {Object} Mock function context
   */
  createMockFunctionContext: () => ({
    log: jest.fn(),
    error: jest.fn(),
    req: global.testUtils.createMockRequest(),
    res: global.testUtils.createMockResponse()
  }),

  /**
   * Wait for a specified amount of time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after the specified time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random string
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a random email
   * @returns {string} Random email address
   */
  randomEmail: () => `test-${global.testUtils.randomString(8)}@example.com`,

  /**
   * Create test data for different user roles
   * @returns {Object} Test data for various roles
   */
  createRoleTestData: () => ({
    administrator: {
      $id: 'admin-123',
      email: 'admin@example.com',
      name: 'Administrator',
      labels: ['administrator'],
      role: 'administrator',
      facilityId: null
    },
    supervisor: {
      $id: 'supervisor-123',
      email: 'supervisor@example.com',
      name: 'Supervisor',
      labels: ['supervisor', 'facility_1'],
      role: 'supervisor',
      facilityId: '1'
    },
    doctor: {
      $id: 'doctor-123',
      email: 'doctor@example.com',
      name: 'Doctor',
      labels: ['doctor', 'facility_1'],
      role: 'doctor',
      facilityId: '1'
    },
    user: {
      $id: 'user-123',
      email: 'user@example.com',
      name: 'Basic User',
      labels: ['user', 'facility_2'],
      role: 'user',
      facilityId: '2'
    }
  }),

  /**
   * Validate response structure
   * @param {Object} response - Response object to validate
   * @param {Object} expectedStructure - Expected structure
   * @returns {boolean} True if structure matches
   */
  validateResponseStructure: (response, expectedStructure) => {
    const validateObject = (obj, structure) => {
      for (const key in structure) {
        if (!(key in obj)) {
          return false;
        }
        if (typeof structure[key] === 'object' && structure[key] !== null) {
          if (!validateObject(obj[key], structure[key])) {
            return false;
          }
        } else if (typeof obj[key] !== structure[key]) {
          return false;
        }
      }
      return true;
    };

    return validateObject(response, expectedStructure);
  },

  /**
   * Create mock Appwrite error
   * @param {number} code - Error code
   * @param {string} message - Error message
   * @returns {Error} Mock Appwrite error
   */
  createAppwriteError: (code, message) => {
    const error = new Error(message);
    error.code = code;
    error.type = 'appwrite_error';
    return error;
  },

  /**
   * Assert that a function throws with specific error
   * @param {Function} fn - Function to test
   * @param {string|RegExp} expectedError - Expected error message or pattern
   */
  expectToThrow: async (fn, expectedError) => {
    let error;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    if (typeof expectedError === 'string') {
      expect(error.message).toContain(expectedError);
    } else {
      expect(error.message).toMatch(expectedError);
    }
  }
};

// Custom Jest matchers
expect.extend({
  /**
   * Check if a value is a valid user ID
   * @param {string} received - Value to check
   * @returns {Object} Jest matcher result
   */
  toBeValidUserId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      message: () => `expected ${received} to be a valid user ID`,
      pass
    };
  },

  /**
   * Check if a value is a valid role
   * @param {string} received - Value to check
   * @returns {Object} Jest matcher result
   */
  toBeValidRole(received) {
    const validRoles = ['administrator', 'supervisor', 'doctor', 'user'];
    const pass = validRoles.includes(received);
    return {
      message: () => `expected ${received} to be a valid role (${validRoles.join(', ')})`,
      pass
    };
  },

  /**
   * Check if a response has the expected success structure
   * @param {Object} received - Response object
   * @param {boolean} expectedSuccess - Expected success value
   * @returns {Object} Jest matcher result
   */
  toHaveSuccessStructure(received, expectedSuccess = true) {
    const hasSuccess = 'success' in received;
    const successMatches = received.success === expectedSuccess;
    const hasMessage = expectedSuccess ? true : 'error' in received;
    
    const pass = hasSuccess && successMatches && hasMessage;
    
    return {
      message: () => `expected response to have success structure with success: ${expectedSuccess}`,
      pass
    };
  },

  /**
   * Check if permissions object has required structure
   * @param {Object} received - Permissions object
   * @returns {Object} Jest matcher result
   */
  toHaveValidPermissionsStructure(received) {
    const isObject = typeof received === 'object' && received !== null;
    const hasValidStructure = isObject && Object.keys(received).every(resource => 
      Array.isArray(received[resource]) && 
      received[resource].every(permission => typeof permission === 'string')
    );
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have valid permissions structure`,
      pass: hasValidStructure
    };
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset modules
  jest.resetModules();
});

// Global setup
beforeAll(() => {
  // Any global setup needed
});

// Global teardown
afterAll(() => {
  // Any global cleanup needed
});