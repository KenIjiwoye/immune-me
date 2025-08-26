/**
 * Jest Configuration for Role Management System Tests
 * Comprehensive testing setup for unit and integration tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './utils/role-manager.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './functions/user-management/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'utils/role-manager.js',
    'utils/permissions.js',
    'config/roles.js',
    'functions/user-management/**/*.js',
    '!functions/user-management/**/node_modules/**',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Error handling
  errorOnDeprecated: true,

  // Module name mapping for easier imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@functions/(.*)$': '<rootDir>/functions/$1'
  },

  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.APPWRITE_ENDPOINT': 'https://test.appwrite.io/v1',
    'process.env.APPWRITE_PROJECT_ID': 'test-project',
    'process.env.APPWRITE_API_KEY': 'test-api-key'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/'
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        suiteName: 'Role Management System Tests'
      }
    ]
  ],

  // Bail configuration
  bail: false,

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Max workers for parallel execution
  maxWorkers: '50%'
};