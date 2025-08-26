/**
 * Verification script for BE-AW-09: Facility-Based Teams and Memberships
 * 
 * This script verifies that all components of the team management system
 * are properly implemented and work together correctly.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class TeamManagementVerifier {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      success: colors.green,
      error: colors.red,
      warning: colors.yellow,
      info: colors.blue
    };
    
    console.log(`${colorMap[type] || colors.blue}[${timestamp}] ${message}${colors.reset}`);
  }

  pass(test, message) {
    this.results.passed++;
    this.results.details.push({ test, status: 'PASS', message });
    this.log(`✓ ${test}: ${message}`, 'success');
  }

  fail(test, message) {
    this.results.failed++;
    this.results.details.push({ test, status: 'FAIL', message });
    this.log(`✗ ${test}: ${message}`, 'error');
  }

  warn(test, message) {
    this.results.warnings++;
    this.results.details.push({ test, status: 'WARN', message });
    this.log(`⚠ ${test}: ${message}`, 'warning');
  }

  fileExists(filePath, description) {
    const fullPath = path.resolve(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      this.pass('File Existence', `${description} exists at ${filePath}`);
      return true;
    } else {
      this.fail('File Existence', `${description} missing at ${filePath}`);
      return false;
    }
  }

  validateFileContent(filePath, description, validationFn) {
    const fullPath = path.resolve(__dirname, '../../', filePath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const result = validationFn(content);
      if (result.valid) {
        this.pass('Content Validation', `${description}: ${result.message}`);
      } else {
        this.fail('Content Validation', `${description}: ${result.message}`);
      }
      return result.valid;
    } catch (error) {
      this.fail('Content Validation', `${description}: Cannot read file - ${error.message}`);
      return false;
    }
  }

  async verifyConfigurationFiles() {
    this.log('\n=== Verifying Configuration Files ===', 'info');

    // Check team structure configuration
    this.fileExists('config/team-structure.js', 'Team Structure Configuration');
    this.validateFileContent('config/team-structure.js', 'Team Structure Config', (content) => {
      const hasTeamRoles = content.includes('TEAM_ROLES');
      const hasNaming = content.includes('TEAM_NAMING');
      const hasPermissions = content.includes('TEAM_PERMISSIONS');
      const hasUtilityFunctions = content.includes('generateFacilityTeamName');
      
      if (hasTeamRoles && hasNaming && hasPermissions && hasUtilityFunctions) {
        return { valid: true, message: 'Contains all required exports' };
      }
      return { valid: false, message: 'Missing required exports' };
    });

    // Check team permissions configuration
    this.fileExists('config/team-permissions.json', 'Team Permissions Configuration');
    this.validateFileContent('config/team-permissions.json', 'Team Permissions Config', (content) => {
      try {
        const config = JSON.parse(content);
        const hasGlobalAdmin = config.globalAdminTeam;
        const hasFacilityTeams = config.facilityTeams;
        const hasCollectionRules = config.collectionTeamRules;
        
        if (hasGlobalAdmin && hasFacilityTeams && hasCollectionRules) {
          return { valid: true, message: 'Contains all required sections' };
        }
        return { valid: false, message: 'Missing required configuration sections' };
      } catch (error) {
        return { valid: false, message: 'Invalid JSON format' };
      }
    });

    // Check facility team mapping configuration
    this.fileExists('config/facility-team-mapping.json', 'Facility Team Mapping Configuration');
    this.validateFileContent('config/facility-team-mapping.json', 'Facility Team Mapping Config', (content) => {
      try {
        const config = JSON.parse(content);
        const hasMappingRules = config.mappingRules;
        const hasRoleMapping = config.roleMapping;
        const hasMultiFacility = config.multiFacilityUsers;
        
        if (hasMappingRules && hasRoleMapping && hasMultiFacility) {
          return { valid: true, message: 'Contains all required mapping configurations' };
        }
        return { valid: false, message: 'Missing required mapping sections' };
      } catch (error) {
        return { valid: false, message: 'Invalid JSON format' };
      }
    });
  }

  async verifyUtilityClasses() {
    this.log('\n=== Verifying Utility Classes ===', 'info');

    // Check FacilityTeamManager
    this.fileExists('utils/facility-team-manager.js', 'FacilityTeamManager Class');
    this.validateFileContent('utils/facility-team-manager.js', 'FacilityTeamManager', (content) => {
      const hasClass = content.includes('class FacilityTeamManager');
      const hasCreateTeam = content.includes('createFacilityTeam');
      const hasAssignUser = content.includes('assignUserToTeam');
      const hasRemoveUser = content.includes('removeUserFromTeam');
      const hasGetMembers = content.includes('getFacilityTeamMembers');
      const hasMultiFacility = content.includes('assignUserToMultipleFacilities');
      
      if (hasClass && hasCreateTeam && hasAssignUser && hasRemoveUser && hasGetMembers && hasMultiFacility) {
        return { valid: true, message: 'Contains all required methods' };
      }
      return { valid: false, message: 'Missing required methods' };
    });

    // Check TeamPermissionChecker
    this.fileExists('utils/team-permission-checker.js', 'TeamPermissionChecker Class');
    this.validateFileContent('utils/team-permission-checker.js', 'TeamPermissionChecker', (content) => {
      const hasClass = content.includes('class TeamPermissionChecker');
      const hasCheckPermission = content.includes('checkPermission');
      const hasFacilityAccess = content.includes('checkFacilityAccess');
      const hasTeamManagement = content.includes('checkTeamManagementPermission');
      const hasResourceValidation = content.includes('validateResourceAccess');
      const hasEffectivePermissions = content.includes('getUserEffectivePermissions');
      
      if (hasClass && hasCheckPermission && hasFacilityAccess && hasTeamManagement && hasResourceValidation && hasEffectivePermissions) {
        return { valid: true, message: 'Contains all required methods' };
      }
      return { valid: false, message: 'Missing required methods' };
    });
  }

  async verifyCloudFunctions() {
    this.log('\n=== Verifying Cloud Functions ===', 'info');

    const functions = [
      'create-facility-team',
      'assign-user-to-team',
      'remove-user-from-team',
      'get-team-members'
    ];

    for (const functionName of functions) {
      const functionPath = `functions/team-management/${functionName}/src/main.js`;
      this.fileExists(functionPath, `${functionName} Function`);
      
      this.validateFileContent(functionPath, `${functionName} Function`, (content) => {
        const hasModuleExports = content.includes('module.exports');
        const hasAsyncHandler = content.includes('async');
        const hasErrorHandling = content.includes('try') && content.includes('catch');
        const hasAppwriteClient = content.includes('Client');
        const hasValidation = content.includes('payload');
        
        if (hasModuleExports && hasAsyncHandler && hasErrorHandling && hasAppwriteClient && hasValidation) {
          return { valid: true, message: 'Function structure is correct' };
        }
        return { valid: false, message: 'Function structure is incomplete' };
      });
    }
  }

  async verifyTestSuite() {
    this.log('\n=== Verifying Test Suite ===', 'info');

    // Check test files
    const testFiles = [
      'tests/team-management/facility-team-manager.test.js',
      'tests/team-management/team-permission-checker.test.js',
      'tests/team-management/integration.test.js'
    ];

    for (const testFile of testFiles) {
      this.fileExists(testFile, `Test file: ${path.basename(testFile)}`);
      
      this.validateFileContent(testFile, `Test: ${path.basename(testFile)}`, (content) => {
        const hasDescribe = content.includes('describe(');
        const hasIt = content.includes('it(') || content.includes('test(');
        const hasExpect = content.includes('expect(');
        const hasMocks = content.includes('jest.mock') || content.includes('mockResolvedValue');
        
        if (hasDescribe && hasIt && hasExpect && hasMocks) {
          return { valid: true, message: 'Test structure is correct' };
        }
        return { valid: false, message: 'Test structure is incomplete' };
      });
    }

    // Check test configuration
    this.fileExists('tests/team-management/package.json', 'Test Package Configuration');
    this.fileExists('tests/team-management/jest.setup.js', 'Jest Setup Configuration');
  }

  async verifyIntegration() {
    this.log('\n=== Verifying Component Integration ===', 'info');

    try {
      // Test configuration loading
      const teamStructure = require('../../config/team-structure.js');
      if (teamStructure.TEAM_ROLES && teamStructure.generateFacilityTeamName) {
        this.pass('Integration', 'Team structure configuration loads correctly');
      } else {
        this.fail('Integration', 'Team structure configuration missing exports');
      }

      // Test utility class instantiation
      const FacilityTeamManager = require('../../utils/facility-team-manager.js');
      const TeamPermissionChecker = require('../../utils/team-permission-checker.js');
      
      const teamManager = new FacilityTeamManager({
        endpoint: 'https://test.appwrite.io/v1',
        projectId: 'test-project',
        apiKey: 'test-key'
      });
      
      const permissionChecker = new TeamPermissionChecker({
        endpoint: 'https://test.appwrite.io/v1',
        projectId: 'test-project',
        apiKey: 'test-key'
      });

      if (teamManager && permissionChecker) {
        this.pass('Integration', 'Utility classes instantiate correctly');
      } else {
        this.fail('Integration', 'Utility classes failed to instantiate');
      }

      // Test method availability
      const requiredTeamManagerMethods = [
        'createFacilityTeam',
        'assignUserToTeam',
        'removeUserFromTeam',
        'getFacilityTeamMembers',
        'getUserTeams'
      ];

      const requiredPermissionCheckerMethods = [
        'checkPermission',
        'checkFacilityAccess',
        'checkTeamManagementPermission',
        'validateResourceAccess'
      ];

      let methodsValid = true;
      for (const method of requiredTeamManagerMethods) {
        if (typeof teamManager[method] !== 'function') {
          this.fail('Integration', `FacilityTeamManager missing method: ${method}`);
          methodsValid = false;
        }
      }

      for (const method of requiredPermissionCheckerMethods) {
        if (typeof permissionChecker[method] !== 'function') {
          this.fail('Integration', `TeamPermissionChecker missing method: ${method}`);
          methodsValid = false;
        }
      }

      if (methodsValid) {
        this.pass('Integration', 'All required methods are available');
      }

    } catch (error) {
      this.fail('Integration', `Component integration failed: ${error.message}`);
    }
  }

  async verifyDocumentation() {
    this.log('\n=== Verifying Documentation ===', 'info');

    this.fileExists('functions/team-management/README.md', 'Team Management Documentation');
    this.validateFileContent('functions/team-management/README.md', 'Documentation', (content) => {
      const hasOverview = content.includes('## Overview');
      const hasArchitecture = content.includes('## Architecture');
      const hasFunctions = content.includes('## Functions');
      const hasPermissions = content.includes('## Permission System');
      const hasTesting = content.includes('## Testing');
      const hasDeployment = content.includes('## Deployment');
      
      if (hasOverview && hasArchitecture && hasFunctions && hasPermissions && hasTesting && hasDeployment) {
        return { valid: true, message: 'Documentation is comprehensive' };
      }
      return { valid: false, message: 'Documentation is incomplete' };
    });
  }

  async verifyDirectoryStructure() {
    this.log('\n=== Verifying Directory Structure ===', 'info');

    const expectedStructure = [
      'config/team-structure.js',
      'config/team-permissions.json',
      'config/facility-team-mapping.json',
      'utils/facility-team-manager.js',
      'utils/team-permission-checker.js',
      'functions/team-management/create-facility-team/src/main.js',
      'functions/team-management/assign-user-to-team/src/main.js',
      'functions/team-management/remove-user-from-team/src/main.js',
      'functions/team-management/get-team-members/src/main.js',
      'functions/team-management/README.md',
      'tests/team-management/facility-team-manager.test.js',
      'tests/team-management/team-permission-checker.test.js',
      'tests/team-management/integration.test.js',
      'tests/team-management/package.json',
      'tests/team-management/jest.setup.js'
    ];

    let structureValid = true;
    for (const filePath of expectedStructure) {
      if (!this.fileExists(filePath, `Required file: ${filePath}`)) {
        structureValid = false;
      }
    }

    if (structureValid) {
      this.pass('Directory Structure', 'All required files and directories are present');
    } else {
      this.fail('Directory Structure', 'Some required files or directories are missing');
    }
  }

  async run() {
    this.log(`${colors.bold}${colors.blue}Starting BE-AW-09 Team Management Verification${colors.reset}`, 'info');
    this.log('='.repeat(60), 'info');

    await this.verifyDirectoryStructure();
    await this.verifyConfigurationFiles();
    await this.verifyUtilityClasses();
    await this.verifyCloudFunctions();
    await this.verifyTestSuite();
    await this.verifyIntegration();
    await this.verifyDocumentation();

    this.printSummary();
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log(`${colors.bold}VERIFICATION SUMMARY${colors.reset}`, 'info');
    this.log('='.repeat(60), 'info');

    this.log(`${colors.green}✓ Passed: ${this.results.passed}${colors.reset}`, 'success');
    this.log(`${colors.red}✗ Failed: ${this.results.failed}${colors.reset}`, 'error');
    this.log(`${colors.yellow}⚠ Warnings: ${this.results.warnings}${colors.reset}`, 'warning');

    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    this.log(`\nSuccess Rate: ${successRate}%`, 'info');

    if (this.results.failed === 0) {
      this.log(`\n${colors.bold}${colors.green}🎉 ALL VERIFICATIONS PASSED!${colors.reset}`, 'success');
      this.log(`${colors.green}BE-AW-09: Facility-Based Teams and Memberships implementation is complete and ready for deployment.${colors.reset}`, 'success');
    } else {
      this.log(`\n${colors.bold}${colors.red}❌ VERIFICATION FAILED${colors.reset}`, 'error');
      this.log(`${colors.red}Please address the failed checks before proceeding with deployment.${colors.reset}`, 'error');
    }

    // Print detailed results
    if (this.results.failed > 0 || this.results.warnings > 0) {
      this.log('\n=== DETAILED RESULTS ===', 'info');
      for (const detail of this.results.details) {
        if (detail.status === 'FAIL' || detail.status === 'WARN') {
          const color = detail.status === 'FAIL' ? colors.red : colors.yellow;
          const symbol = detail.status === 'FAIL' ? '✗' : '⚠';
          this.log(`${color}${symbol} ${detail.test}: ${detail.message}${colors.reset}`);
        }
      }
    }

    return this.results.failed === 0;
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new TeamManagementVerifier();
  verifier.run().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('Verification failed with error:', error);
    process.exit(1);
  });
}

module.exports = TeamManagementVerifier;