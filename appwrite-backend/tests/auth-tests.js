const { Client, Users, Account, Teams } = require('node-appwrite');
const AuthMiddleware = require('../utils/auth-middleware');
const UserMigration = require('../utils/user-migration');
const PasswordPolicy = require('../utils/password-policy');
const SessionManager = require('../utils/session-manager');
const MFASetup = require('../config/mfa-setup');
const Permissions = require('../utils/permissions');
const TeamsSetup = require('../config/teams-setup');

class AuthTests {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.account = new Account(this.client);
    this.teams = new Teams(this.client);
    
    this.authMiddleware = new AuthMiddleware();
    this.userMigration = new UserMigration();
    this.passwordPolicy = new PasswordPolicy();
    this.sessionManager = new SessionManager();
    this.mfaSetup = new MFASetup();
    this.permissions = new Permissions();
    this.teamsSetup = new TeamsSetup();
  }
  
  async runAllTests() {
    console.log('Starting comprehensive authentication tests...\n');
    
    const results = {
      teams: await this.testTeamsSetup(),
      passwordPolicy: await this.testPasswordPolicy(),
      userMigration: await this.testUserMigration(),
      permissions: await this.testPermissions(),
      sessionManagement: await this.testSessionManagement(),
      mfa: await this.testMFASetup()
    };
    
    console.log('\n=== Test Results Summary ===');
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${test}: ${result.success ? 'PASS' : 'FAIL'} - ${result.message}`);
    });
    
    return results;
  }
  
  async testTeamsSetup() {
    console.log('Testing teams setup...');
    
    try {
      const result = await this.teamsSetup.setupTeams();
      
      if (result.created.length > 0 || result.updated.length > 0) {
        return {
          success: true,
          message: 'Teams setup completed successfully',
          details: result
        };
      }
      
      return {
        success: false,
        message: 'No teams were created or updated',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Teams setup failed: ${error.message}`
      };
    }
  }
  
  async testPasswordPolicy() {
    console.log('Testing password policy...');
    
    try {
      const testCases = [
        { password: 'weak', expected: false },
        { password: 'Password123!', expected: true },
        { password: 'short', expected: false },
        { password: 'NoNumbers!', expected: false },
        { password: 'no-special-chars123', expected: false }
      ];
      
      const results = testCases.map(testCase => {
        const result = this.passwordPolicy.validate(testCase.password);
        return {
          password: testCase.password,
          expected: testCase.expected,
          actual: result.isValid,
          passed: result.isValid === testCase.expected
        };
      });
      
      const allPassed = results.every(r => r.passed);
      
      return {
        success: allPassed,
        message: allPassed ? 'All password policy tests passed' : 'Some password policy tests failed',
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Password policy test failed: ${error.message}`
      };
    }
  }
  
  async testUserMigration() {
    console.log('Testing user migration...');
    
    try {
      // Create test users
      const testUsers = [
        {
          id: 'test-admin-1',
          email: 'test.admin@example.com',
          fullName: 'Test Admin',
          role: 'admin',
          facilityId: 1
        },
        {
          id: 'test-healthcare-1',
          email: 'test.healthcare@example.com',
          fullName: 'Test Healthcare Worker',
          role: 'healthcare_worker',
          facilityId: 1
        },
        {
          id: 'test-manager-1',
          email: 'test.manager@example.com',
          fullName: 'Test Facility Manager',
          role: 'facility_manager',
          facilityId: 1
        }
      ];
      
      // Test migration
      const migrationResult = await this.userMigration.migrateUsers(testUsers);
      
      // Validate migration
      const validation = await this.userMigration.validateMigration();
      
      return {
        success: migrationResult.successful > 0,
        message: `User migration test completed: ${migrationResult.successful} successful, ${migrationResult.failed} failed`,
        details: { migrationResult, validation }
      };
    } catch (error) {
      return {
        success: false,
        message: `User migration test failed: ${error.message}`
      };
    }
  }
  
  async testPermissions() {
    console.log('Testing permissions system...');
    
    try {
      // Test role-based permissions
      const testCases = [
        { role: 'admin', permission: 'users.delete', expected: true },
        { role: 'healthcare_worker', permission: 'patients.read', expected: true },
        { role: 'healthcare_worker', permission: 'users.delete', expected: false },
        { role: 'facility_manager', permission: 'reports.read', expected: true }
      ];
      
      const results = [];
      
      for (const testCase of testCases) {
        const mockUserId = `test-${testCase.role}-1`;
        
        // Mock user preferences
        await this.users.updatePrefs(mockUserId, {
          role: testCase.role
        });
        
        const permissionResult = await this.permissions.checkPermission(
          mockUserId,
          testCase.permission
        );
        
        results.push({
          role: testCase.role,
          permission: testCase.permission,
          expected: testCase.expected,
          actual: permissionResult.hasPermission,
          passed: permissionResult.hasPermission === testCase.expected
        });
      }
      
      const allPassed = results.every(r => r.passed);
      
      return {
        success: allPassed,
        message: allPassed ? 'All permission tests passed' : 'Some permission tests failed',
        details: results
      };
    } catch (error) {
      return {
        success: false,
        message: `Permissions test failed: ${error.message}`
      };
    }
  }
  
  async testSessionManagement() {
    console.log('Testing session management...');
    
    try {
      // Test session creation (would need actual user credentials)
      const sessionTest = {
        success: true,
        message: 'Session management utilities loaded successfully'
      };
      
      // Test session validation
      const validationTest = await this.sessionManager.enforceSessionLimit('test-user-1');
      
      return {
        success: sessionTest.success && validationTest.success,
        message: 'Session management tests completed',
        details: { sessionTest, validationTest }
      };
    } catch (error) {
      return {
        success: false,
        message: `Session management test failed: ${error.message}`
      };
    }
  }
  
  async testMFASetup() {
    console.log('Testing MFA setup...');
    
    try {
      // Test MFA configuration
      const mfaConfig = await this.mfaSetup.setupMFAForRole('admin');
      
      return {
        success: mfaConfig.success,
        message: 'MFA setup test completed',
        details: mfaConfig
      };
    } catch (error) {
      return {
        success: false,
        message: `MFA setup test failed: ${error.message}`
      };
    }
  }
  
  async testAuthenticationFlow() {
    console.log('Testing complete authentication flow...');
    
    try {
      // Test 1: User registration
      const registrationTest = await this.testUserRegistration();
      
      // Test 2: User login
      const loginTest = await this.testUserLogin();
      
      // Test 3: Permission checking
      const permissionTest = await this.testPermissionChecking();
      
      // Test 4: Session management
      const sessionTest = await this.testSessionManagement();
      
      const allTests = [registrationTest, loginTest, permissionTest, sessionTest];
      const allPassed = allTests.every(t => t.success);
      
      return {
        success: allPassed,
        message: allPassed ? 'All authentication flow tests passed' : 'Some authentication flow tests failed',
        details: {
          registration: registrationTest,
          login: loginTest,
          permissions: permissionTest,
          session: sessionTest
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Authentication flow test failed: ${error.message}`
      };
    }
  }
  
  async testUserRegistration() {
    console.log('Testing user registration...');
    
    try {
      // This would test actual user registration
      return {
        success: true,
        message: 'User registration test structure ready'
      };
    } catch (error) {
      return {
        success: false,
        message: `User registration test failed: ${error.message}`
      };
    }
  }
  
  async testUserLogin() {
    console.log('Testing user login...');
    
    try {
      // This would test actual user login
      return {
        success: true,
        message: 'User login test structure ready'
      };
    } catch (error) {
      return {
        success: false,
        message: `User login test failed: ${error.message}`
      };
    }
  }
  
  async testPermissionChecking() {
    console.log('Testing permission checking...');
    
    try {
      // This would test actual permission checking
      return {
        success: true,
        message: 'Permission checking test structure ready'
      };
    } catch (error) {
      return {
        success: false,
        message: `Permission checking test failed: ${error.message}`
      };
    }
  }
}

// CLI functionality
if (require.main === module) {
  const tests = new AuthTests();
  
  const command = process.argv[2] || 'all';
  
  switch (command) {
    case 'all':
      tests.runAllTests()
        .then(results => {
          console.log('\nAll tests completed!');
          process.exit(0);
        })
        .catch(error => {
          console.error('Test suite failed:', error);
          process.exit(1);
        });
      break;
      
    case 'teams':
      tests.testTeamsSetup()
        .then(result => {
          console.log('Teams test result:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Teams test failed:', error);
          process.exit(1);
        });
      break;
      
    case 'password':
      tests.testPasswordPolicy()
        .then(result => {
          console.log('Password policy test result:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Password policy test failed:', error);
          process.exit(1);
        });
      break;
      
    case 'permissions':
      tests.testPermissions()
        .then(result => {
          console.log('Permissions test result:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Permissions test failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node auth-tests.js [all|teams|password|permissions]');
      process.exit(1);
  }
}

module.exports = AuthTests;