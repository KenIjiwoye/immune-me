#!/usr/bin/env node

const { Client, Users, Teams, Account } = require('node-appwrite');
const TeamsSetup = require('../config/teams-setup');
const MFASetup = require('../config/mfa-setup');
const AuthTests = require('../tests/auth-tests');
require('dotenv').config();

class AuthSetup {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);
    this.account = new Account(this.client);
    
    this.teamsSetup = new TeamsSetup();
    this.mfaSetup = new MFASetup();
    this.authTests = new AuthTests();
  }
  
  async setupCompleteAuthSystem() {
    console.log('🚀 Setting up complete Appwrite authentication system...\n');
    
    try {
      // Step 1: Setup teams
      console.log('📋 Step 1: Setting up teams...');
      const teamsResult = await this.teamsSetup.setupTeams();
      console.log('✅ Teams setup completed\n');
      
      // Step 2: Configure MFA
      console.log('🔐 Step 2: Configuring MFA for admin users...');
      const mfaResult = await this.mfaSetup.setupMFAForAdminUsers();
      console.log('✅ MFA configuration completed\n');
      
      // Step 3: Run comprehensive tests
      console.log('🧪 Step 3: Running authentication tests...');
      const testResults = await this.authTests.runAllTests();
      console.log('✅ Authentication tests completed\n');
      
      // Step 4: Display summary
      console.log('📊 Setup Summary:');
      console.log('- Teams created/updated:', teamsResult.created.length + teamsResult.updated.length);
      console.log('- MFA configured for admin users');
      console.log('- All authentication utilities ready');
      
      return {
        success: true,
        teams: teamsResult,
        mfa: mfaResult,
        tests: testResults
      };
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async validateEnvironment() {
    console.log('🔍 Validating environment configuration...');
    
    const requiredEnvVars = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
      'FRONTEND_URL'
    ];
    
    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing);
      return {
        success: false,
        error: `Missing environment variables: ${missing.join(', ')}`
      };
    }
    
    console.log('✅ Environment configuration valid');
    return { success: true };
  }
  
  async createTestUsers() {
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        userId: 'test-admin',
        email: 'admin@healthcare.local',
        password: 'AdminPass123!',
        name: 'Test Administrator',
        role: 'admin'
      },
      {
        userId: 'test-healthcare',
        email: 'healthcare@healthcare.local',
        password: 'HealthcarePass123!',
        name: 'Test Healthcare Worker',
        role: 'healthcare_worker'
      },
      {
        userId: 'test-manager',
        email: 'manager@healthcare.local',
        password: 'ManagerPass123!',
        name: 'Test Facility Manager',
        role: 'facility_manager'
      }
    ];
    
    const results = {
      created: [],
      failed: []
    };
    
    for (const user of testUsers) {
      try {
        // Create user
        const newUser = await this.users.create(
          user.userId,
          user.email,
          undefined,
          user.password,
          user.name
        );
        
        // Add to appropriate team
        const teamId = `${user.role}s`.replace('_', '-');
        await this.teams.createMembership(
          teamId,
          user.email,
          ['member'],
          `${process.env.FRONTEND_URL}/auth/verify`
        );
        
        // Set user preferences
        await this.users.updatePrefs(user.userId, {
          role: user.role,
          facilityId: '1',
          createdAt: new Date().toISOString()
        });
        
        results.created.push({
          userId: user.userId,
          email: user.email,
          role: user.role
        });
        
        console.log(`✅ Created test user: ${user.email}`);
        
      } catch (error) {
        if (error.code === 409) {
          console.log(`⚠️  Test user already exists: ${user.email}`);
          results.created.push({
            userId: user.userId,
            email: user.email,
            role: user.role,
            note: 'Already existed'
          });
        } else {
          console.error(`❌ Failed to create test user ${user.email}:`, error.message);
          results.failed.push({
            email: user.email,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
  
  async displaySetupInstructions() {
    console.log('\n📖 Setup Instructions:');
    console.log('\n1. Environment Setup:');
    console.log('   - Ensure all required environment variables are set');
    console.log('   - APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
    console.log('   - FRONTEND_URL for email verification links');
    
    console.log('\n2. Run Setup:');
    console.log('   npm run setup-teams');
    console.log('   npm run setup-mfa');
    console.log('   npm run test-auth');
    
    console.log('\n3. Test Users:');
    console.log('   - admin@healthcare.local / AdminPass123!');
    console.log('   - healthcare@healthcare.local / HealthcarePass123!');
    console.log('   - manager@healthcare.local / ManagerPass123!');
    
    console.log('\n4. Integration:');
    console.log('   - Update frontend to use Appwrite SDK');
    console.log('   - Configure API endpoints to use new auth middleware');
    console.log('   - Test all authentication flows');
  }
}

// CLI functionality
if (require.main === module) {
  const setup = new AuthSetup();
  
  const command = process.argv[2] || 'setup';
  
  switch (command) {
    case 'validate':
      setup.validateEnvironment()
        .then(result => {
          if (result.success) {
            console.log('✅ Environment validation passed');
            process.exit(0);
          } else {
            console.error('❌ Environment validation failed:', result.error);
            process.exit(1);
          }
        });
      break;
      
    case 'setup':
      setup.validateEnvironment()
        .then(result => {
          if (!result.success) {
            throw new Error(result.error);
          }
          return setup.setupCompleteAuthSystem();
        })
        .then(result => {
          if (result.success) {
            console.log('🎉 Authentication system setup completed successfully!');
            return setup.createTestUsers();
          } else {
            throw new Error(result.error);
          }
        })
        .then(() => {
          setup.displaySetupInstructions();
          process.exit(0);
        })
        .catch(error => {
          console.error('❌ Setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'test-users':
      setup.createTestUsers()
        .then(results => {
          console.log('Test users created:', results);
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to create test users:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node setup-auth.js [validate|setup|test-users]');
      process.exit(1);
  }
}

module.exports = AuthSetup;