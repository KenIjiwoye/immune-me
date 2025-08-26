/**
 * Permission Integration Test Suite
 * Tests the enhanced permission utilities integration and compatibility
 * Based on BE-AW-10 ticket requirements
 */

const { PermissionValidator, ROLE_PERMISSIONS } = require('./permission-validator');
const DocumentSecurity = require('./document-security');
const FacilityScopedQueries = require('./facility-scoped-queries');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');
const { EnhancedPermissionManager } = require('./permission-integration-example');

/**
 * Test Suite for Permission Integration
 */
class PermissionIntegrationTest {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
    
    // Mock options for testing
    this.mockOptions = {
      endpoint: 'https://test.appwrite.io/v1',
      projectId: 'test-project',
      apiKey: 'test-api-key',
      databaseId: 'test-database',
      cacheEnabled: false, // Disable cache for testing
      enableLogging: false
    };
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🧪 Starting Permission Integration Tests...\n');

    try {
      // Test 1: Utility Initialization
      await this.testUtilityInitialization();
      
      // Test 2: ROLE_PERMISSIONS Constant
      await this.testRolePermissionsConstant();
      
      // Test 3: Permission Validator Integration
      await this.testPermissionValidatorIntegration();
      
      // Test 4: Document Security Integration
      await this.testDocumentSecurityIntegration();
      
      // Test 5: Facility Scoped Queries Integration
      await this.testFacilityScopedQueriesIntegration();
      
      // Test 6: Enhanced Permission Manager
      await this.testEnhancedPermissionManager();
      
      // Test 7: Cross-Utility Compatibility
      await this.testCrossUtilityCompatibility();
      
      // Test 8: Error Handling
      await this.testErrorHandling();
      
      // Test 9: Cache Management
      await this.testCacheManagement();
      
      // Test 10: Configuration Compatibility
      await this.testConfigurationCompatibility();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    this.printTestSummary();
  }

  /**
   * Test 1: Utility Initialization
   */
  async testUtilityInitialization() {
    const testName = 'Utility Initialization';
    console.log(`🔧 Testing ${testName}...`);

    try {
      // Test individual utility initialization
      const permissionValidator = new PermissionValidator(this.mockOptions);
      const documentSecurity = new DocumentSecurity(this.mockOptions);
      const scopedQueries = new FacilityScopedQueries(this.mockOptions);
      const teamChecker = new TeamPermissionChecker(this.mockOptions);
      const teamManager = new FacilityTeamManager(this.mockOptions);
      const roleManager = new RoleManager(this.mockOptions);

      // Verify all utilities are properly initialized
      const utilities = [
        { name: 'PermissionValidator', instance: permissionValidator },
        { name: 'DocumentSecurity', instance: documentSecurity },
        { name: 'FacilityScopedQueries', instance: scopedQueries },
        { name: 'TeamPermissionChecker', instance: teamChecker },
        { name: 'FacilityTeamManager', instance: teamManager },
        { name: 'RoleManager', instance: roleManager }
      ];

      for (const utility of utilities) {
        if (!utility.instance || typeof utility.instance !== 'object') {
          throw new Error(`${utility.name} failed to initialize`);
        }
      }

      // Test EnhancedPermissionManager initialization
      const enhancedManager = new EnhancedPermissionManager(this.mockOptions);
      if (!enhancedManager || typeof enhancedManager !== 'object') {
        throw new Error('EnhancedPermissionManager failed to initialize');
      }

      this.recordTestResult(testName, true, 'All utilities initialized successfully');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 2: ROLE_PERMISSIONS Constant
   */
  async testRolePermissionsConstant() {
    const testName = 'ROLE_PERMISSIONS Constant';
    console.log(`📋 Testing ${testName}...`);

    try {
      // Verify ROLE_PERMISSIONS structure
      if (!ROLE_PERMISSIONS || typeof ROLE_PERMISSIONS !== 'object') {
        throw new Error('ROLE_PERMISSIONS constant not found or invalid');
      }

      // Check required roles
      const requiredRoles = ['administrator', 'facility_manager', 'healthcare_worker', 'data_entry_clerk'];
      for (const role of requiredRoles) {
        if (!ROLE_PERMISSIONS[role]) {
          throw new Error(`Missing role in ROLE_PERMISSIONS: ${role}`);
        }
      }

      // Check required collections for each role
      const requiredCollections = ['patients', 'immunization_records', 'facilities', 'vaccines', 'notifications'];
      for (const role of requiredRoles) {
        for (const collection of requiredCollections) {
          if (!ROLE_PERMISSIONS[role][collection]) {
            throw new Error(`Missing collection ${collection} for role ${role}`);
          }
          
          if (!Array.isArray(ROLE_PERMISSIONS[role][collection])) {
            throw new Error(`Invalid permissions format for ${role}.${collection}`);
          }
        }
      }

      // Verify administrator has full permissions
      const adminPermissions = ROLE_PERMISSIONS.administrator;
      for (const collection of requiredCollections) {
        const permissions = adminPermissions[collection];
        if (!permissions.includes('create') || !permissions.includes('read') || 
            !permissions.includes('update') || !permissions.includes('delete')) {
          throw new Error(`Administrator missing full permissions for ${collection}`);
        }
      }

      this.recordTestResult(testName, true, 'ROLE_PERMISSIONS constant is valid and complete');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 3: Permission Validator Integration
   */
  async testPermissionValidatorIntegration() {
    const testName = 'Permission Validator Integration';
    console.log(`🔐 Testing ${testName}...`);

    try {
      const validator = new PermissionValidator(this.mockOptions);

      // Test method existence
      const requiredMethods = [
        'canAccessCollection',
        'canAccessDocument',
        'canAccessFacilityDocument',
        'validateBatchPermissions',
        'getUserCollectionPermissions'
      ];

      for (const method of requiredMethods) {
        if (typeof validator[method] !== 'function') {
          throw new Error(`Missing method: ${method}`);
        }
      }

      // Test integration with other utilities
      if (!validator.teamChecker || !validator.teamManager || !validator.roleManager) {
        throw new Error('PermissionValidator missing required utility integrations');
      }

      // Test cache management
      if (typeof validator.clearCache !== 'function' || typeof validator.getCacheStats !== 'function') {
        throw new Error('PermissionValidator missing cache management methods');
      }

      this.recordTestResult(testName, true, 'PermissionValidator integration is complete');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 4: Document Security Integration
   */
  async testDocumentSecurityIntegration() {
    const testName = 'Document Security Integration';
    console.log(`🛡️ Testing ${testName}...`);

    try {
      const documentSecurity = new DocumentSecurity(this.mockOptions);

      // Test method existence
      const requiredMethods = [
        'createPatientWithSecurity',
        'createImmunizationRecordWithSecurity',
        'createNotificationWithSecurity',
        'updateDocumentWithSecurity',
        'getDocumentSecurityInfo'
      ];

      for (const method of requiredMethods) {
        if (typeof documentSecurity[method] !== 'function') {
          throw new Error(`Missing method: ${method}`);
        }
      }

      // Test integration with other utilities
      if (!documentSecurity.permissionValidator || !documentSecurity.teamChecker || 
          !documentSecurity.teamManager || !documentSecurity.roleManager) {
        throw new Error('DocumentSecurity missing required utility integrations');
      }

      this.recordTestResult(testName, true, 'DocumentSecurity integration is complete');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 5: Facility Scoped Queries Integration
   */
  async testFacilityScopedQueriesIntegration() {
    const testName = 'Facility Scoped Queries Integration';
    console.log(`🔍 Testing ${testName}...`);

    try {
      const scopedQueries = new FacilityScopedQueries(this.mockOptions);

      // Test method existence
      const requiredMethods = [
        'getPatientsForUser',
        'getImmunizationRecordsForUser',
        'getNotificationsForUser',
        'getFacilitiesForUser',
        'getReportsForUser',
        'executeCustomQuery'
      ];

      for (const method of requiredMethods) {
        if (typeof scopedQueries[method] !== 'function') {
          throw new Error(`Missing method: ${method}`);
        }
      }

      // Test integration with other utilities
      if (!scopedQueries.permissionValidator || !scopedQueries.teamChecker || 
          !scopedQueries.teamManager || !scopedQueries.roleManager) {
        throw new Error('FacilityScopedQueries missing required utility integrations');
      }

      // Test cache and stats methods
      if (typeof scopedQueries.clearCache !== 'function' || 
          typeof scopedQueries.getQueryStats !== 'function') {
        throw new Error('FacilityScopedQueries missing cache/stats methods');
      }

      this.recordTestResult(testName, true, 'FacilityScopedQueries integration is complete');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 6: Enhanced Permission Manager
   */
  async testEnhancedPermissionManager() {
    const testName = 'Enhanced Permission Manager';
    console.log(`⚡ Testing ${testName}...`);

    try {
      const manager = new EnhancedPermissionManager(this.mockOptions);

      // Test method existence
      const requiredMethods = [
        'checkCompletePermissions',
        'secureDataAccess',
        'secureDocumentCreation',
        'getUserPermissionSummary',
        'clearAllCaches',
        'getIntegrationStats'
      ];

      for (const method of requiredMethods) {
        if (typeof manager[method] !== 'function') {
          throw new Error(`Missing method: ${method}`);
        }
      }

      // Test all utilities are integrated
      const requiredUtilities = [
        'permissionValidator',
        'documentSecurity',
        'scopedQueries',
        'teamChecker',
        'teamManager',
        'roleManager'
      ];

      for (const utility of requiredUtilities) {
        if (!manager[utility]) {
          throw new Error(`Missing utility integration: ${utility}`);
        }
      }

      this.recordTestResult(testName, true, 'EnhancedPermissionManager is complete');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 7: Cross-Utility Compatibility
   */
  async testCrossUtilityCompatibility() {
    const testName = 'Cross-Utility Compatibility';
    console.log(`🔗 Testing ${testName}...`);

    try {
      // Test that utilities can work together without conflicts
      const validator = new PermissionValidator(this.mockOptions);
      const documentSecurity = new DocumentSecurity(this.mockOptions);
      const scopedQueries = new FacilityScopedQueries(this.mockOptions);

      // Test shared configuration
      if (validator.config.databaseId !== documentSecurity.config.databaseId ||
          validator.config.databaseId !== scopedQueries.config.databaseId) {
        throw new Error('Utilities have inconsistent configuration');
      }

      // Test that they all use the same underlying utilities
      const sharedUtilities = ['teamChecker', 'teamManager', 'roleManager'];
      for (const utility of sharedUtilities) {
        if (!validator[utility] || !documentSecurity[utility] || !scopedQueries[utility]) {
          throw new Error(`Inconsistent ${utility} integration across utilities`);
        }
      }

      this.recordTestResult(testName, true, 'Cross-utility compatibility verified');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 8: Error Handling
   */
  async testErrorHandling() {
    const testName = 'Error Handling';
    console.log(`⚠️ Testing ${testName}...`);

    try {
      const validator = new PermissionValidator(this.mockOptions);

      // Test invalid parameters
      const invalidTests = [
        { method: 'canAccessCollection', params: [null, 'patients', 'read'] },
        { method: 'canAccessCollection', params: ['user123', null, 'read'] },
        { method: 'canAccessCollection', params: ['user123', 'patients', null] },
        { method: 'canAccessDocument', params: ['user123', 'patients', null, 'read'] }
      ];

      for (const test of invalidTests) {
        try {
          const result = await validator[test.method](...test.params);
          if (result.allowed !== false) {
            throw new Error(`${test.method} should reject invalid parameters`);
          }
        } catch (error) {
          // Expected behavior - method should handle invalid params gracefully
          if (!error.message.includes('required')) {
            throw new Error(`Unexpected error handling in ${test.method}: ${error.message}`);
          }
        }
      }

      this.recordTestResult(testName, true, 'Error handling works correctly');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 9: Cache Management
   */
  async testCacheManagement() {
    const testName = 'Cache Management';
    console.log(`💾 Testing ${testName}...`);

    try {
      const manager = new EnhancedPermissionManager(this.mockOptions);

      // Test individual cache clearing
      if (typeof manager.permissionValidator.clearCache !== 'function') {
        throw new Error('PermissionValidator missing clearCache method');
      }

      if (typeof manager.teamChecker.clearCache !== 'function') {
        throw new Error('TeamPermissionChecker missing clearCache method');
      }

      if (typeof manager.teamManager.clearCache !== 'function') {
        throw new Error('FacilityTeamManager missing clearCache method');
      }

      // Test integrated cache clearing
      manager.clearAllCaches(); // Should not throw

      // Test stats retrieval
      const stats = manager.getIntegrationStats();
      if (!stats || typeof stats !== 'object') {
        throw new Error('Integration stats not available');
      }

      this.recordTestResult(testName, true, 'Cache management works correctly');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Test 10: Configuration Compatibility
   */
  async testConfigurationCompatibility() {
    const testName = 'Configuration Compatibility';
    console.log(`⚙️ Testing ${testName}...`);

    try {
      // Test with different configuration options
      const configs = [
        { cacheEnabled: true, strictMode: true },
        { cacheEnabled: false, strictMode: false },
        { enableLogging: true, enableAuditLogging: true },
        { defaultLimit: 50, maxLimit: 200 }
      ];

      for (const config of configs) {
        const testOptions = { ...this.mockOptions, ...config };
        
        // Test that all utilities accept the configuration
        const validator = new PermissionValidator(testOptions);
        const documentSecurity = new DocumentSecurity(testOptions);
        const scopedQueries = new FacilityScopedQueries(testOptions);
        const manager = new EnhancedPermissionManager(testOptions);

        // Verify configuration is applied
        if (config.cacheEnabled !== undefined) {
          if (validator.config.cacheEnabled !== config.cacheEnabled) {
            throw new Error('Configuration not properly applied to PermissionValidator');
          }
        }

        if (config.defaultLimit !== undefined) {
          if (scopedQueries.config.defaultLimit !== config.defaultLimit) {
            throw new Error('Configuration not properly applied to FacilityScopedQueries');
          }
        }
      }

      this.recordTestResult(testName, true, 'Configuration compatibility verified');

    } catch (error) {
      this.recordTestResult(testName, false, error.message);
    }
  }

  /**
   * Record test result
   */
  recordTestResult(testName, passed, message) {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };

    this.testResults.push(result);
    
    if (passed) {
      this.passedTests++;
      console.log(`  ✅ ${testName}: ${message}`);
    } else {
      this.failedTests++;
      console.log(`  ❌ ${testName}: ${message}`);
    }
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`Success Rate: ${((this.passedTests / this.testResults.length) * 100).toFixed(1)}%`);

    if (this.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }

    console.log('\n🎉 Integration testing completed!');
  }

  /**
   * Get test results
   */
  getTestResults() {
    return {
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.passedTests,
        failed: this.failedTests,
        successRate: (this.passedTests / this.testResults.length) * 100
      }
    };
  }
}

// Export for use in other test files
module.exports = PermissionIntegrationTest;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new PermissionIntegrationTest();
  testSuite.runAllTests().catch(console.error);
}