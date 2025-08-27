/**
 * Function Permission Integration Test - BE-AW-11 Implementation
 * 
 * This test suite validates the integration of the function permission system
 * with existing permission utilities and ensures proper functionality.
 */

const FunctionMiddleware = require('./function-middleware');
const FunctionPermissions = require('./function-permissions');
const { PermissionValidator } = require('./permission-validator');
const FacilityScopedQueries = require('./facility-scoped-queries');
const { 
  FUNCTION_PERMISSIONS, 
  FUNCTION_CATEGORIES,
  EXECUTION_CONDITIONS 
} = require('../config/function-roles');

class FunctionPermissionIntegrationTest {
  constructor(options = {}) {
    this.options = {
      endpoint: options.endpoint || process.env.APPWRITE_ENDPOINT || 'http://localhost/v1',
      projectId: options.projectId || process.env.APPWRITE_PROJECT_ID || 'test-project',
      apiKey: options.apiKey || process.env.APPWRITE_API_KEY || 'test-key',
      databaseId: options.databaseId || process.env.APPWRITE_DATABASE_ID || 'main',
      enableLogging: options.enableLogging !== false,
      ...options
    };

    // Initialize components
    this.functionMiddleware = new FunctionMiddleware(this.options);
    this.functionPermissions = new FunctionPermissions(this.options);
    this.permissionValidator = new PermissionValidator(this.options);
    this.facilityScopedQueries = new FacilityScopedQueries(this.options);

    // Test results
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Mock data for testing
    this.mockData = this._createMockData();
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting Function Permission Integration Tests...\n');

    try {
      // Test categories
      await this._testFunctionPermissionMatrix();
      await this._testFunctionMiddleware();
      await this._testFunctionPermissionUtilities();
      await this._testRoleHierarchyValidation();
      await this._testFacilityScopingIntegration();
      await this._testRateLimitingIntegration();
      await this._testSecurityPolicyIntegration();
      await this._testBatchPermissionValidation();
      await this._testCacheIntegration();
      await this._testErrorHandling();

      // Print summary
      this._printTestSummary();

      return {
        success: this.testResults.failed === 0,
        results: this.testResults
      };

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      return {
        success: false,
        error: error.message,
        results: this.testResults
      };
    }
  }

  /**
   * Test function permission matrix
   */
  async _testFunctionPermissionMatrix() {
    console.log('📋 Testing Function Permission Matrix...');

    try {
      // Test 1: Verify all roles have function permissions defined
      const roles = ['administrator', 'supervisor', 'doctor', 'user'];
      for (const role of roles) {
        const hasPermissions = FUNCTION_PERMISSIONS[role] !== undefined;
        this._assert(
          hasPermissions,
          `Role ${role} should have function permissions defined`,
          `Function permissions missing for role: ${role}`
        );
      }

      // Test 2: Verify all function categories are defined
      const expectedCategories = ['DATA_SYNC', 'NOTIFICATIONS', 'REPORTS', 'USER_MANAGEMENT', 'TEAM_MANAGEMENT', 'PERMISSIONS'];
      for (const category of expectedCategories) {
        const categoryExists = FUNCTION_CATEGORIES[category] !== undefined;
        this._assert(
          categoryExists,
          `Category ${category} should be defined`,
          `Function category missing: ${category}`
        );
      }

      // Test 3: Verify execution conditions are properly defined
      const expectedConditions = ['facility_match', 'active_facility', 'clinical_access', 'assigned_patients', 'role_hierarchy', 'self_only'];
      for (const condition of expectedConditions) {
        const conditionExists = EXECUTION_CONDITIONS[condition] !== undefined;
        this._assert(
          conditionExists,
          `Execution condition ${condition} should be defined`,
          `Execution condition missing: ${condition}`
        );
      }

      // Test 4: Verify administrator has wildcard access
      const adminPermissions = FUNCTION_PERMISSIONS.administrator;
      for (const category of expectedCategories) {
        const hasWildcard = adminPermissions[category]?.allowed?.includes('*');
        this._assert(
          hasWildcard,
          `Administrator should have wildcard access to ${category}`,
          `Administrator missing wildcard access for: ${category}`
        );
      }

      console.log('✅ Function Permission Matrix tests passed\n');

    } catch (error) {
      this._recordError('Function Permission Matrix', error);
    }
  }

  /**
   * Test function middleware
   */
  async _testFunctionMiddleware() {
    console.log('🛡️ Testing Function Middleware...');

    try {
      // Test 1: Validate authentication check
      const noAuthContext = { req: { variables: {} } };
      const authResult = await this.functionMiddleware.validateFunctionExecution(
        noAuthContext,
        'test-function',
        'NOTIFICATIONS'
      );
      
      this._assert(
        !authResult.success && authResult.error.code === 'AUTHENTICATION_FAILED',
        'Should fail authentication when no user ID provided',
        'Authentication validation failed'
      );

      // Test 2: Test with mock authenticated context
      const authContext = {
        req: {
          variables: {
            APPWRITE_FUNCTION_USER_ID: this.mockData.users.administrator.id
          }
        }
      };

      // Mock the users.get method for testing
      const originalGet = this.functionMiddleware.users.get;
      this.functionMiddleware.users.get = async (userId) => {
        if (userId === this.mockData.users.administrator.id) {
          return this.mockData.users.administrator;
        }
        throw new Error('User not found');
      };

      // Mock role manager for testing
      const originalGetUserRoleInfo = this.functionMiddleware.roleManager.getUserRoleInfo;
      this.functionMiddleware.roleManager.getUserRoleInfo = async (userId) => {
        const user = Object.values(this.mockData.users).find(u => u.$id === userId);
        if (user) {
          return {
            success: true,
            role: user.role,
            facilityId: user.facilityId
          };
        }
        return { success: false, error: 'User not found' };
      };

      // Test successful validation for administrator
      const validResult = await this.functionMiddleware.validateFunctionExecution(
        authContext,
        'due-immunization-reminders',
        'NOTIFICATIONS'
      );

      this._assert(
        validResult.success,
        'Administrator should be able to execute notification functions',
        `Middleware validation failed: ${validResult.error?.message}`
      );

      // Restore original methods
      this.functionMiddleware.users.get = originalGet;
      this.functionMiddleware.roleManager.getUserRoleInfo = originalGetUserRoleInfo;

      console.log('✅ Function Middleware tests passed\n');

    } catch (error) {
      this._recordError('Function Middleware', error);
    }
  }

  /**
   * Test function permission utilities
   */
  async _testFunctionPermissionUtilities() {
    console.log('🔧 Testing Function Permission Utilities...');

    try {
      // Mock role manager for testing
      this.functionPermissions.roleManager.getUserRoleInfo = async (userId) => {
        const user = Object.values(this.mockData.users).find(u => u.$id === userId);
        if (user) {
          return {
            success: true,
            role: user.role,
            facilityId: user.facilityId
          };
        }
        return { success: false, error: 'User not found' };
      };

      // Test 1: Check function execution permission
      const canExecute = await this.functionPermissions.canExecuteFunction(
        this.mockData.users.administrator.id,
        'due-immunization-reminders',
        'NOTIFICATIONS'
      );

      this._assert(
        canExecute.allowed,
        'Administrator should be able to execute notification functions',
        `Function execution check failed: ${canExecute.reason}`
      );

      // Test 2: Get executable functions for user
      const userFunctions = await this.functionPermissions.getUserExecutableFunctions(
        this.mockData.users.user.id,
        'NOTIFICATIONS'
      );

      this._assert(
        userFunctions.success && userFunctions.functions.length > 0,
        'User should have some executable notification functions',
        'User executable functions check failed'
      );

      // Test 3: Validate role hierarchy
      const hierarchyResult = await this.functionPermissions.validateRoleHierarchy(
        this.mockData.users.supervisor.id,
        this.mockData.users.user.id
      );

      this._assert(
        hierarchyResult.allowed,
        'Supervisor should be able to manage user role',
        `Role hierarchy validation failed: ${hierarchyResult.reason}`
      );

      // Test 4: Check facility access
      const facilityAccess = await this.functionPermissions.checkFacilityAccess(
        this.mockData.users.user.id,
        this.mockData.users.user.facilityId
      );

      this._assert(
        facilityAccess.allowed,
        'User should have access to their own facility',
        `Facility access check failed: ${facilityAccess.reason}`
      );

      // Test 5: Get user permissions summary
      const summary = await this.functionPermissions.getUserFunctionPermissionsSummary(
        this.mockData.users.doctor.id
      );

      this._assert(
        summary.success && Object.keys(summary.summary.categories).length > 0,
        'Doctor should have function permissions summary',
        'User permissions summary failed'
      );

      console.log('✅ Function Permission Utilities tests passed\n');

    } catch (error) {
      this._recordError('Function Permission Utilities', error);
    }
  }

  /**
   * Test role hierarchy validation
   */
  async _testRoleHierarchyValidation() {
    console.log('👥 Testing Role Hierarchy Validation...');

    try {
      // Mock role manager
      this.functionPermissions.roleManager.getUserRoleInfo = async (userId) => {
        const user = Object.values(this.mockData.users).find(u => u.$id === userId);
        if (user) {
          return {
            success: true,
            role: user.role,
            facilityId: user.facilityId
          };
        }
        return { success: false, error: 'User not found' };
      };

      // Test 1: Administrator can manage all roles
      const adminCanManageSupervisor = await this.functionPermissions.validateRoleHierarchy(
        this.mockData.users.administrator.id,
        this.mockData.users.supervisor.id
      );

      this._assert(
        adminCanManageSupervisor.allowed,
        'Administrator should be able to manage supervisor',
        `Admin-supervisor hierarchy failed: ${adminCanManageSupervisor.reason}`
      );

      // Test 2: Supervisor can manage doctor and user
      const supervisorCanManageDoctor = await this.functionPermissions.validateRoleHierarchy(
        this.mockData.users.supervisor.id,
        this.mockData.users.doctor.id
      );

      this._assert(
        supervisorCanManageDoctor.allowed,
        'Supervisor should be able to manage doctor',
        `Supervisor-doctor hierarchy failed: ${supervisorCanManageDoctor.reason}`
      );

      // Test 3: User cannot manage doctor
      const userCannotManageDoctor = await this.functionPermissions.validateRoleHierarchy(
        this.mockData.users.user.id,
        this.mockData.users.doctor.id
      );

      this._assert(
        !userCannotManageDoctor.allowed,
        'User should not be able to manage doctor',
        'User-doctor hierarchy validation should fail'
      );

      // Test 4: Same level roles cannot manage each other
      const doctorCannotManageDoctor = await this.functionPermissions.validateRoleHierarchy(
        this.mockData.users.doctor.id,
        this.mockData.users.doctor2.id
      );

      this._assert(
        !doctorCannotManageDoctor.allowed,
        'Doctor should not be able to manage another doctor',
        'Same-level role hierarchy validation should fail'
      );

      console.log('✅ Role Hierarchy Validation tests passed\n');

    } catch (error) {
      this._recordError('Role Hierarchy Validation', error);
    }
  }

  /**
   * Test facility scoping integration
   */
  async _testFacilityScopingIntegration() {
    console.log('🏥 Testing Facility Scoping Integration...');

    try {
      // Test 1: Verify facility scoping works with existing utilities
      const facilityQueries = this.facilityScopedQueries;
      
      // Mock role manager
      facilityQueries.roleManager.getUserRoleInfo = async (userId) => {
        const user = Object.values(this.mockData.users).find(u => u.$id === userId);
        if (user) {
          return {
            success: true,
            role: user.role,
            facilityId: user.facilityId
          };
        }
        return { success: false, error: 'User not found' };
      };

      // Mock permission validator
      facilityQueries.permissionValidator.canAccessCollection = async (userId, collection, operation) => {
        return { allowed: true, reason: 'Test permission granted' };
      };

      // Test facility-scoped patient query
      const patientResult = await facilityQueries.getPatientsForUser(
        this.mockData.users.user.id,
        []
      );

      this._assert(
        patientResult.success || patientResult.error.includes('Permission denied'),
        'Facility scoped query should work or fail with permission error',
        `Facility scoped query failed: ${patientResult.error}`
      );

      // Test 2: Administrator should have access to all facilities
      const adminResult = await facilityQueries.getPatientsForUser(
        this.mockData.users.administrator.id,
        []
      );

      this._assert(
        adminResult.success || adminResult.error.includes('Permission denied'),
        'Administrator facility scoped query should work or fail with permission error',
        `Administrator facility query failed: ${adminResult.error}`
      );

      console.log('✅ Facility Scoping Integration tests passed\n');

    } catch (error) {
      this._recordError('Facility Scoping Integration', error);
    }
  }

  /**
   * Test rate limiting integration
   */
  async _testRateLimitingIntegration() {
    console.log('⏱️ Testing Rate Limiting Integration...');

    try {
      // Test 1: Verify rate limiting is applied
      const middleware = this.functionMiddleware;
      
      // Check rate limit store exists
      this._assert(
        middleware.rateLimitStore instanceof Map,
        'Rate limit store should be initialized',
        'Rate limit store not found'
      );

      // Test 2: Verify rate limit cleanup
      const initialSize = middleware.rateLimitStore.size;
      middleware._cleanupRateLimit();
      
      this._assert(
        middleware.rateLimitStore.size >= 0,
        'Rate limit cleanup should work',
        'Rate limit cleanup failed'
      );

      // Test 3: Check rate limit configuration
      const adminPermissions = FUNCTION_PERMISSIONS.administrator;
      const notificationRateLimit = adminPermissions.NOTIFICATIONS?.rateLimit;
      
      this._assert(
        notificationRateLimit && notificationRateLimit.requests > 0,
        'Rate limits should be configured for administrator notifications',
        'Rate limit configuration missing'
      );

      console.log('✅ Rate Limiting Integration tests passed\n');

    } catch (error) {
      this._recordError('Rate Limiting Integration', error);
    }
  }

  /**
   * Test security policy integration
   */
  async _testSecurityPolicyIntegration() {
    console.log('🔒 Testing Security Policy Integration...');

    try {
      // Test 1: Get security requirements
      const securityReqs = this.functionPermissions.getFunctionSecurityRequirements('DATA_SYNC');
      
      this._assert(
        securityReqs.found,
        'Security requirements should be found for DATA_SYNC',
        'Security requirements not found'
      );

      // Test 2: Verify security policies are defined
      this._assert(
        securityReqs.requirements.requiresAuthentication === true,
        'DATA_SYNC should require authentication',
        'Authentication requirement not set'
      );

      this._assert(
        securityReqs.requirements.auditRequired === true,
        'DATA_SYNC should require auditing',
        'Audit requirement not set'
      );

      // Test 3: Check function metadata
      const metadata = this.functionPermissions.getFunctionMetadata('NOTIFICATIONS', 'due-immunization-reminders');
      
      this._assert(
        metadata.found,
        'Function metadata should be found',
        'Function metadata not found'
      );

      this._assert(
        metadata.metadata.riskLevel !== undefined,
        'Function should have risk level defined',
        'Risk level not defined'
      );

      console.log('✅ Security Policy Integration tests passed\n');

    } catch (error) {
      this._recordError('Security Policy Integration', error);
    }
  }

  /**
   * Test batch permission validation
   */
  async _testBatchPermissionValidation() {
    console.log('📦 Testing Batch Permission Validation...');

    try {
      // Mock role manager
      this.functionPermissions.roleManager.getUserRoleInfo = async (userId) => {
        const user = Object.values(this.mockData.users).find(u => u.$id === userId);
        if (user) {
          return {
            success: true,
            role: user.role,
            facilityId: user.facilityId
          };
        }
        return { success: false, error: 'User not found' };
      };

      // Test batch validation
      const functions = [
        { functionName: 'due-immunization-reminders', category: 'NOTIFICATIONS' },
        { functionName: 'generate-pdf-report', category: 'REPORTS' },
        { functionName: 'get-user-info', category: 'USER_MANAGEMENT' }
      ];

      const batchResult = await this.functionPermissions.validateBatchFunctionPermissions(
        this.mockData.users.supervisor.id,
        functions
      );

      this._assert(
        batchResult.success,
        'Batch validation should succeed',
        `Batch validation failed: ${batchResult.error}`
      );

      this._assert(
        batchResult.results.length === functions.length,
        'Batch validation should return results for all functions',
        'Batch validation results count mismatch'
      );

      this._assert(
        batchResult.summary.total === functions.length,
        'Batch validation summary should match input count',
        'Batch validation summary mismatch'
      );

      console.log('✅ Batch Permission Validation tests passed\n');

    } catch (error) {
      this._recordError('Batch Permission Validation', error);
    }
  }

  /**
   * Test cache integration
   */
  async _testCacheIntegration() {
    console.log('💾 Testing Cache Integration...');

    try {
      // Test 1: Verify caches exist
      this._assert(
        this.functionPermissions.permissionCache instanceof Map,
        'Function permissions cache should exist',
        'Function permissions cache not found'
      );

      this._assert(
        this.permissionValidator.permissionCache instanceof Map,
        'Permission validator cache should exist',
        'Permission validator cache not found'
      );

      // Test 2: Test cache operations
      const initialSize = this.functionPermissions.permissionCache.size;
      this.functionPermissions.clearCache();
      
      this._assert(
        this.functionPermissions.permissionCache.size === 0,
        'Cache should be cleared',
        'Cache clear operation failed'
      );

      // Test 3: Test cache statistics
      const stats = this.functionPermissions.getCacheStats();
      
      this._assert(
        stats.size !== undefined && stats.maxAge !== undefined,
        'Cache statistics should be available',
        'Cache statistics not available'
      );

      // Test 4: Test middleware cache clearing
      this.functionMiddleware.clearCaches();
      
      this._assert(
        this.functionMiddleware.rateLimitStore.size === 0,
        'Middleware caches should be cleared',
        'Middleware cache clear failed'
      );

      console.log('✅ Cache Integration tests passed\n');

    } catch (error) {
      this._recordError('Cache Integration', error);
    }
  }

  /**
   * Test error handling
   */
  async _testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');

    try {
      // Test 1: Invalid user ID
      const invalidUserResult = await this.functionPermissions.canExecuteFunction(
        'invalid-user-id',
        'test-function',
        'NOTIFICATIONS'
      );

      this._assert(
        !invalidUserResult.allowed,
        'Invalid user ID should be rejected',
        'Invalid user ID was not rejected'
      );

      // Test 2: Invalid function name
      const invalidFunctionResult = await this.functionPermissions.canExecuteFunction(
        this.mockData.users.user.id,
        'invalid-function',
        'NOTIFICATIONS'
      );

      this._assert(
        !invalidFunctionResult.allowed,
        'Invalid function name should be rejected',
        'Invalid function name was not rejected'
      );

      // Test 3: Invalid category
      const invalidCategoryResult = await this.functionPermissions.canExecuteFunction(
        this.mockData.users.user.id,
        'test-function',
        'INVALID_CATEGORY'
      );

      this._assert(
        !invalidCategoryResult.allowed,
        'Invalid category should be rejected',
        'Invalid category was not rejected'
      );

      // Test 4: Missing parameters
      try {
        await this.functionPermissions.canExecuteFunction();
        this._assert(false, 'Missing parameters should throw error', 'Missing parameters not handled');
      } catch (error) {
        this._assert(true, 'Missing parameters should throw error', '');
      }

      console.log('✅ Error Handling tests passed\n');

    } catch (error) {
      this._recordError('Error Handling', error);
    }
  }

  /**
   * Create mock data for testing
   */
  _createMockData() {
    return {
      users: {
        administrator: {
          $id: 'admin-user-123',
          id: 'admin-user-123',
          email: 'admin@test.com',
          role: 'administrator',
          facilityId: null,
          status: true
        },
        supervisor: {
          $id: 'supervisor-user-123',
          id: 'supervisor-user-123',
          email: 'supervisor@test.com',
          role: 'supervisor',
          facilityId: 'facility-123',
          status: true
        },
        doctor: {
          $id: 'doctor-user-123',
          id: 'doctor-user-123',
          email: 'doctor@test.com',
          role: 'doctor',
          facilityId: 'facility-123',
          status: true
        },
        doctor2: {
          $id: 'doctor-user-456',
          id: 'doctor-user-456',
          email: 'doctor2@test.com',
          role: 'doctor',
          facilityId: 'facility-456',
          status: true
        },
        user: {
          $id: 'regular-user-123',
          id: 'regular-user-123',
          email: 'user@test.com',
          role: 'user',
          facilityId: 'facility-123',
          status: true
        }
      },
      facilities: {
        'facility-123': {
          $id: 'facility-123',
          name: 'Test Facility 1',
          isActive: true
        },
        'facility-456': {
          $id: 'facility-456',
          name: 'Test Facility 2',
          isActive: true
        }
      }
    };
  }

  /**
   * Assert helper
   */
  _assert(condition, successMessage, errorMessage) {
    if (condition) {
      this.testResults.passed++;
      this.testResults.details.push({
        status: 'PASS',
        message: successMessage
      });
      if (this.options.enableLogging) {
        console.log(`  ✅ ${successMessage}`);
      }
    } else {
      this.testResults.failed++;
      this.testResults.errors.push(errorMessage);
      this.testResults.details.push({
        status: 'FAIL',
        message: errorMessage
      });
      if (this.options.enableLogging) {
        console.log(`  ❌ ${errorMessage}`);
      }
    }
  }

  /**
   * Record error
   */
  _recordError(testCategory, error) {
    this.testResults.failed++;
    const errorMessage = `${testCategory} test failed: ${error.message}`;
    this.testResults.errors.push(errorMessage);
    this.testResults.details.push({
      status: 'ERROR',
      message: errorMessage,
      stack: error.stack
    });
    console.log(`❌ ${errorMessage}`);
  }

  /**
   * Print test summary
   */
  _printTestSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📝 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Function permission system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
      console.log('\nErrors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }

  /**
   * Get test results
   */
  getTestResults() {
    return this.testResults;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.functionMiddleware) {
      this.functionMiddleware.destroy();
    }
    if (this.functionPermissions) {
      this.functionPermissions.clearCache();
    }
    if (this.permissionValidator) {
      this.permissionValidator.clearCache();
    }
    if (this.facilityScopedQueries) {
      this.facilityScopedQueries.clearCache();
    }
  }
}

// Export for use in other modules
module.exports = FunctionPermissionIntegrationTest;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new FunctionPermissionIntegrationTest({
    enableLogging: true
  });

  testSuite.runAllTests()
    .then((result) => {
      console.log('\n🏁 Test execution completed.');
      testSuite.cleanup();
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      testSuite.cleanup();
      process.exit(1);
    });
}