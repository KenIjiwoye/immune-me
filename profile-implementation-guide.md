
# Profile Model Implementation Guide

## Overview

This comprehensive implementation guide provides step-by-step instructions for implementing the Profile model architecture in the Appwrite-based Immunization Records Management System. It covers all aspects from initial setup to production deployment.

## Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [Implementation Phases](#implementation-phases)
3. [Code Examples and Templates](#code-examples-and-templates)
4. [Testing Strategies](#testing-strategies)
5. [Deployment Instructions](#deployment-instructions)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Best Practices](#best-practices)

## Prerequisites and Setup

### System Requirements

- **Appwrite Server**: Version 1.4.x or higher
- **Node.js**: Version 18.x or higher
- **Database**: Appwrite Database with existing collections
- **Storage**: Minimum 10GB for profile data and backups
- **Memory**: 4GB RAM minimum for development, 8GB+ for production

### Development Environment Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd immune-me

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Configure Appwrite connection
# Edit .env file with your Appwrite credentials
APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=main

# 5. Install Appwrite CLI
npm install -g appwrite-cli

# 6. Login to Appwrite
appwrite login

# 7. Initialize project
appwrite init project
```

### Required Dependencies

```json
{
  "dependencies": {
    "appwrite": "^13.0.0",
    "node-appwrite": "^9.0.0",
    "@apollo/server": "^4.9.0",
    "graphql": "^16.8.0",
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.0",
    "winston": "^3.10.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "typescript": "^5.1.0",
    "jest": "^29.6.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0"
  }
}
```

## Implementation Phases

### Phase 1: Foundation Setup (Week 1-2)

#### Step 1.1: Create Profile Collections

```bash
# Create collections using Appwrite CLI
appwrite deploy collection --collectionId=patient_profiles
appwrite deploy collection --collectionId=employee_profiles
appwrite deploy collection --collectionId=admin_profiles
```

#### Step 1.2: Collection Configuration Files

Create collection configuration files in `appwrite-backend/collections/`:

**patient_profiles.json**
```json
{
  "$id": "patient_profiles",
  "name": "Patient Profiles",
  "enabled": true,
  "documentSecurity": true,
  "attributes": [
    {
      "key": "user_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "patient_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    },
    {
      "key": "profile_status",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20,
      "default": "active"
    },
    {
      "key": "verification_status",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 20,
      "default": "pending"
    },
    {
      "key": "facility_id",
      "type": "string",
      "status": "available",
      "required": true,
      "array": false,
      "size": 36
    }
  ],
  "indexes": [
    {
      "key": "user_id_unique",
      "type": "unique",
      "status": "available",
      "attributes": ["user_id"]
    },
    {
      "key": "patient_id_unique",
      "type": "unique",
      "status": "available",
      "attributes": ["patient_id"]
    }
  ]
}
```

#### Step 1.3: Setup Profile Services

Create the core profile service:

**src/services/ProfileService.js**
```javascript
const { Client, Databases, Users, Teams, Query, ID } = require('node-appwrite');

class ProfileService {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);
  }
  
  async getUserProfileType(userId) {
    try {
      const [patientProfile, employeeProfile, adminProfile] = await Promise.allSettled([
        this.databases.listDocuments('main', 'patient_profiles', [Query.equal('user_id', userId)]),
        this.databases.listDocuments('main', 'employee_profiles', [Query.equal('user_id', userId)]),
        this.databases.listDocuments('main', 'admin_profiles', [Query.equal('user_id', userId)])
      ]);
      
      if (patientProfile.status === 'fulfilled' && patientProfile.value.documents.length > 0) {
        return { type: 'patient', profile: patientProfile.value.documents[0] };
      }
      
      if (employeeProfile.status === 'fulfilled' && employeeProfile.value.documents.length > 0) {
        return { type: 'employee', profile: employeeProfile.value.documents[0] };
      }
      
      if (adminProfile.status === 'fulfilled' && adminProfile.value.documents.length > 0) {
        return { type: 'admin', profile: adminProfile.value.documents[0] };
      }
      
      return { type: 'legacy', profile: null };
    } catch (error) {
      console.error('Error getting user profile type:', error);
      throw error;
    }
  }
  
  async createPatientProfile(data) {
    try {
      // Validate patient exists
      const patient = await this.databases.getDocument('main', 'patients', data.patient_id);
      if (!patient) {
        throw new Error('Patient record not found');
      }
      
      // Create user account
      const user = await this.users.create(
        ID.unique(),
        data.email,
        data.phone,
        data.password,
        patient.full_name
      );
      
      // Add patient role labels
      await this.users.updateLabels(user.$id, ['role:patient', `facility_${patient.facility_id}`]);
      
      // Create patient profile
      const profile = await this.databases.createDocument('main', 'patient_profiles', ID.unique(), {
        user_id: user.$id,
        patient_id: data.patient_id,
        facility_id: patient.facility_id,
        verification_status: 'pending',
        verification_method: data.verification_method || 'email',
        access_permissions: ['view_own_records', 'receive_notifications'],
        notification_preferences: JSON.stringify(data.notification_preferences || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return { user, profile };
    } catch (error) {
      console.error('Error creating patient profile:', error);
      throw error;
    }
  }
  
  async createEmployeeProfile(data) {
    try {
      // Create user account
      const user = await this.users.create(
        ID.unique(),
        data.email,
        data.phone,
        data.password,
        data.name
      );
      
      // Add role labels
      const roleLabel = `role:${data.employee_type}`;
      const facilityLabel = `facility_${data.primary_facility_id}`;
      await this.users.updateLabels(user.$id, [roleLabel, facilityLabel]);
      
      // Add to facility team
      const teamId = `facility-${data.primary_facility_id}-team`;
      const teamRole = this.getTeamRoleFromEmployeeType(data.employee_type);
      await this.teams.createMembership(teamId, user.$id, [], teamRole);
      
      // Create employee profile
      const profile = await this.databases.createDocument('main', 'employee_profiles', ID.unique(), {
        user_id: user.$id,
        employee_id: data.employee_id,
        employee_type: data.employee_type,
        professional_title: data.professional_title,
        license_number: data.license_number,
        license_expiry_date: data.license_expiry_date,
        primary_facility_id: data.primary_facility_id,
        assigned_facilities: data.assigned_facilities || [data.primary_facility_id],
        employment_status: 'active',
        hire_date: new Date().toISOString(),
        contact_information: JSON.stringify({
          email: data.email,
          phone: data.phone,
          address: data.address
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return { user, profile };
    } catch (error) {
      console.error('Error creating employee profile:', error);
      throw error;
    }
  }
  
  getTeamRoleFromEmployeeType(employeeType) {
    const roleMapping = {
      'supervisor': 'owner',
      'doctor': 'admin',
      'nurse': 'member',
      'data_entry_clerk': 'member'
    };
    return roleMapping[employeeType] || 'member';
  }
}

module.exports = ProfileService;
```

#### Step 1.4: Validation Scripts

Create validation scripts to ensure proper setup:

**scripts/validate-phase1.js**
```javascript
const { Client, Databases } = require('node-appwrite');

async function validatePhase1() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  
  const databases = new Databases(client);
  
  const validations = [];
  
  try {
    // Check collection creation
    const collections = await databases.listCollections('main');
    const profileCollections = ['patient_profiles', 'employee_profiles', 'admin_profiles'];
    
    for (const collectionId of profileCollections) {
      const exists = collections.collections.find(c => c.$id === collectionId);
      validations.push({
        test: `Collection ${collectionId} exists`,
        passed: !!exists,
        details: exists ? 'Created successfully' : 'Missing collection'
      });
      
      if (exists) {
        // Check indexes
        const indexes = await databases.listIndexes('main', collectionId);
        validations.push({
          test: `${collectionId} indexes`,
          passed: indexes.indexes.length > 0,
          details: `${indexes.indexes.length} indexes created`
        });
      }
    }
  } catch (error) {
    validations.push({
      test: 'Collection validation',
      passed: false,
      details: error.message
    });
  }
  
  // Print results
  console.log('\n=== Phase 1 Validation Results ===');
  validations.forEach(v => {
    const status = v.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${v.test}: ${v.details}`);
  });
  
  const allPassed = validations.every(v => v.passed);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

if (require.main === module) {
  validatePhase1().catch(console.error);
}

module.exports = validatePhase1;
```

### Phase 2: Data Migration (Week 3-4)

#### Step 2.1: User Analysis Script

**scripts/analyze-users.js**
```javascript
const { Client, Users } = require('node-appwrite');

async function analyzeExistingUsers() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  
  const users = new Users(client);
  
  try {
    const usersList = await users.list();
    const analysis = {
      total: usersList.users.length,
      administrators: [],
      supervisors: [],
      doctors: [],
      regular_users: [],
      uncategorized: []
    };
    
    for (const user of usersList.users) {
      const labels = user.labels || [];
      
      if (labels.includes('role:administrator')) {
        analysis.administrators.push(user);
      } else if (labels.includes('role:supervisor')) {
        analysis.supervisors.push(user);
      } else if (labels.includes('role:doctor')) {
        analysis.doctors.push(user);
      } else if (labels.includes('role:user')) {
        analysis.regular_users.push(user);
      } else {
        analysis.uncategorized.push(user);
      }
    }
    
    console.log('\n=== User Analysis Results ===');
    console.log(`Total Users: ${analysis.total}`);
    console.log(`Administrators: ${analysis.administrators.length}`);
    console.log(`Supervisors: ${analysis.supervisors.length}`);
    console.log(`Doctors: ${analysis.doctors.length}`);
    console.log(`Regular Users: ${analysis.regular_users.length}`);
    console.log(`Uncategorized: ${analysis.uncategorized.length}`);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing users:', error);
    throw error;
  }
}

if (require.main === module) {
  analyzeExistingUsers().catch(console.error);
}

module.exports = analyzeExistingUsers;
```

#### Step 2.2: Migration Script

**scripts/migrate-profiles.js**
```javascript
const ProfileService = require('../src/services/ProfileService');
const analyzeExistingUsers = require('./analyze-users');

async function migrateProfiles() {
  const profileService = new ProfileService();
  
  console.log('Starting profile migration...');
  
  // Analyze existing users
  const userAnalysis = await analyzeExistingUsers();
  
  const migrationResults = {
    employees: [],
    admins: [],
    errors: []
  };
  
  // Migrate employee profiles
  const employeeUsers = [
    ...userAnalysis.supervisors,
    ...userAnalysis.doctors,
    ...userAnalysis.regular_users
  ];
  
  console.log(`\nMigrating ${employeeUsers.length} employee profiles...`);
  
  for (const user of employeeUsers) {
    try {
      let employeeType = 'user';
      if (user.labels.includes('role:supervisor')) employeeType = 'supervisor';
      if (user.labels.includes('role:doctor')) employeeType = 'doctor';
      
      // Extract facility information
      const facilityLabels = user.labels.filter(label => label.startsWith('facility_'));
      const primaryFacilityId = facilityLabels[0]?.replace('facility_', '') || null;
      
      if (!primaryFacilityId) {
        throw new Error('No facility assignment found');
      }
      
      const profileData = {
        user_id: user.$id,
        employee_id: user.prefs?.employee_id || `EMP_${user.$id.substring(0, 8)}`,
        employee_type: employeeType,
        professional_title: user.prefs?.title || '',
        primary_facility_id: primaryFacilityId,
        assigned_facilities: facilityLabels.map(label => label.replace('facility_', '')),
        employment_status: 'active',
        contact_information: JSON.stringify({
          email: user.email,
          phone: user.phone,
          name: user.name
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const profile = await profileService.databases.createDocument(
        'main',
        'employee_profiles',
        profileService.ID.unique(),
        profileData
      );
      
      migrationResults.employees.push({
        userId: user.$id,
        profileId: profile.$id,
        status: 'success',
        employeeType
      });
      
      console.log(`✅ Migrated employee: ${user.name} (${employeeType})`);
      
    } catch (error) {
      migrationResults.errors.push({
        userId: user.$id,
        userName: user.name,
        error: error.message,
        type: 'employee'
      });
      
      console.log(`❌ Failed to migrate employee: ${user.name} - ${error.message}`);
    }
  }
  
  // Migrate admin profiles
  console.log(`\nMigrating ${userAnalysis.administrators.length} admin profiles...`);
  
  for (const user of userAnalysis.administrators) {
    try {
      const adminLevel = user.labels.includes('super_admin') ? 'super_admin' : 'system_admin';
      
      const profileData = {
        user_id: user.$id,
        admin_level: adminLevel,
        system_permissions: [
          'user_management',
          'system_configuration',
          'audit_access',
          'cross_facility_access'
        ],
        facility_access_scope: 'all',
        security_clearance: 'high',
        mfa_enabled: true,
        audit_log_access: true,
        system_config_access: true,
        user_management_scope: 'global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const profile = await profileService.databases.createDocument(
        'main',
        'admin_profiles',
        profileService.ID.unique(),
        profileData
      );
      
      migrationResults.admins.push({
        userId: user.$id,
        profileId: profile.$id,
        status: 'success',
        adminLevel
      });
      
      console.log(`✅ Migrated admin: ${user.name} (${adminLevel})`);
      
    } catch (error) {
      migrationResults.errors.push({
        userId: user.$id,
        userName: user.name,
        error: error.message,
        type: 'admin'
      });
      
      console.log(`❌ Failed to migrate admin: ${user.name} - ${error.message}`);
    }
  }
  
  // Print summary
  console.log('\n=== Migration Summary ===');
  console.log(`Employee profiles created: ${migrationResults.employees.length}`);
  console.log(`Admin profiles created: ${migrationResults.admins.length}`);
  console.log(`Errors encountered: ${migrationResults.errors.length}`);
  
  if (migrationResults.errors.length > 0) {
    console.log('\nErrors:');
    migrationResults.errors.forEach(error => {
      console.log(`- ${error.userName}: ${error.error}`);
    });
  }
  
  return migrationResults;
}

if (require.main === module) {
  migrateProfiles().catch(console.error);
}

module.exports = migrateProfiles;
```

### Phase 3: Service Integration (Week 5-6)

#### Step 3.1: Enhanced Authentication Middleware

**src/middleware/profileAuth.js**
```javascript
const ProfileService = require('../services/ProfileService');

class ProfileAuthMiddleware {
  constructor() {
    this.profileService = new ProfileService();
  }
  
  async enhancedAuth(req, res, next) {
    try {
      // Standard authentication (assuming existing auth middleware ran first)
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get enhanced profile information
      const profileInfo = await this.profileService.getUserProfileType(req.user.$id);
      
      // Attach profile information to request
      req.userProfile = {
        userId: req.user.$id,
        type: profileInfo.type,
        profile: profileInfo.profile,
        user: req.user
      };
      
      // Calculate permissions
      req.userPermissions = await this.calculateUserPermissions(req.userProfile);
      
      next();
    } catch (error) {
      console.error('Profile authentication error:', error);
      res.status(500).json({ error: 'Authentication service error' });
    }
  }
  
  async calculateUserPermissions(userProfile) {
    const permissions = {
      collections: {},
      facilities: [],
      specialPermissions: []
    };
    
    switch (userProfile.type) {
      case 'admin':
        permissions.collections = {
          patients: ['create', 'read', 'update', 'delete'],
          immunization_records: ['create', 'read', 'update', 'delete'],
          employee_profiles: ['create', 'read', 'update', 'delete'],
          patient_profiles: ['create', 'read', 'update', 'delete']
        };
        permissions.facilities = ['all'];
        permissions.specialPermissions = ['system_admin', 'user_management'];
        break;
        
      case 'employee':
        permissions.collections = {
          patients: ['create', 'read', 'update'],
          immunization_records: ['create', 'read', 'update'],
          patient_profiles: ['read', 'update']
        };
        permissions.facilities = [
          userProfile.profile.primary_facility_id,
          ...(userProfile.profile.assigned_facilities || [])
        ];
        break;
        
      case 'patient':
        permissions.collections = {
          patients: ['read'],
          immunization_records: ['read']
        };
        permissions.facilities = [userProfile.profile.facility_id];
        permissions.specialPermissions = ['self_access_only'];
        break;
        
      default:
        // Legacy user - use existing label-based permissions
        permissions = await this.getLegacyPermissions(userProfile.user);
    }
    
    return permissions;
  }
  
  requireProfileType(allowedTypes) {
    return (req, res, next) => {
      if (!req.userProfile) {
        return res.status(401).json({ error: 'Profile authentication required' });
      }
      
      if (!allowedTypes.includes(req.userProfile.type)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedTypes,
          current: req.userProfile.type
        });
      }
      
      next();
    };
  }
  
  requireFacilityAccess(facilityId) {
    return (req, res, next) => {
      if (!req.userPermissions) {
        return res.status(401).json({ error: 'Permissions not loaded' });
      }
      
      const hasAccess = req.userPermissions.facilities.includes('all') ||
                       req.userPermissions.facilities.includes(facilityId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Facility access denied' });
      }
      
      next();
    };
  }
}

module.exports = ProfileAuthMiddleware;
```

#### Step 3.2: Enhanced API Endpoints

**src/routes/profiles.js**
```javascript
const express = require('express');
const ProfileService = require('../services/ProfileService');
const ProfileAuthMiddleware = require('../middleware/profileAuth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();
const profileService = new ProfileService();
const authMiddleware = new ProfileAuthMiddleware();

// Apply enhanced authentication to all profile routes
router.use(authMiddleware.enhancedAuth.bind(authMiddleware));

// Get user's own profile
router.get('/me', async (req, res) => {
  try {
    const userProfile = req.userProfile;
    
    res.json({
      success: true,
      data: {
        type: userProfile.type,
        profile: userProfile.profile,
        permissions: req.userPermissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create patient profile
router.post('/patient', [
  authMiddleware.requireProfileType(['admin', 'employee']),
  body('patient_id').isUUID().withMessage('Valid patient ID required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('verification_method').optional().isIn(['email', 'phone', 'in_person'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await profileService.createPatientProfile(req.body);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee profile
router.post('/employee', [
  authMiddleware.requireProfileType(['admin']),
  body('employee_id').notEmpty().withMessage('Employee ID required'),
  body('employee_type').isIn(['doctor', 'supervisor', 'nurse', 'data_entry_clerk']),
  body('email').isEmail().withMessage('Valid email required'),
  body('primary_facility_id').isUUID().withMessage('Valid facility ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await profileService.createEmployeeProfile(req.body);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile by user ID
router.get('/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId } = req.params;
    const requestingUser = req.userProfile;
    
    // Check access permissions
    if (requestingUser.type === 'patient' && requestingUser.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const profileInfo = await profileService.getUserProfileType(userId);
    
    if (profileInfo.type === 'legacy') {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({
      success: true,
      data: {
        type: profileInfo.type,
        profile: profileInfo.profile
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Phase 4: Testing Strategies

#### Step 4.1: Unit Tests

**tests/services/ProfileService.test.js**
```javascript
const ProfileService = require('../../src/services/ProfileService');
const { Client } = require('node-appwrite');

// Mock Appwrite client
jest.mock('node-appwrite');

describe('ProfileService', () => {
  let profileService;
  let mockDatabases;
  let mockUsers;
  
  beforeEach(() => {
    mockDatabases = {
      listDocuments: jest.fn(),
      createDocument: jest.fn(),
      getDocument: jest.fn()
    };
    
    mockUsers = {
      create: jest.fn(),
      updateLabels: jest.fn()
    };
    
    Client.mockImplementation(() => ({
      setEndpoint: jest.fn().mockReturnThis(),
      setProject: jest.fn().mockReturnThis(),
      setKey: jest.fn().mockReturnThis()
    }));
    
    profileService = new ProfileService();
    profileService.databases = mockDatabases;
    profileService.users = mockUsers;
  });
  
  describe('getUserProfileType', () => {
    it('should return patient profile when patient profile exists', async () => {
      const mockPatientProfile = { $id: 'profile1', user_id: 'user1', patient_id: 'patient1' };
      
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [mockPatientProfile] }) // patient_profiles
        .mockResolvedValueOnce({ documents: [] }) // employee_profiles
        .mockResolvedValueOnce({ documents: [] }); // admin_profiles
      
      const result = await profileService.getUserProfileType('user1');
      
      expect(result.type).toBe('patient');
      expect(result.profile).toEqual(mockPatientProfile);
    });
    
    it('should return employee profile when employee profile exists', async () => {
      const mockEmployeeProfile = { $id: 'profile1', user_id: 'user1', employee_type: 'doctor' };
      
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [] }) // patient_profiles
        .mockResolvedValueOnce({ documents: [mockEmployeeProfile] }) // employee_profiles
        .mockResolvedValueOnce({ documents: [] }); // admin_profiles
      
      const result = await profileService.getUserProfileType('user1');
      
      expect(result.type).toBe('employee');
      expect(result.profile).toEqual(mockEmployeeProfile);
    });
    
    it('should return legacy when no profile exists', async () => {
      mockDatabases.listDocuments
        .mockResolvedValue({ documents: [] });
      
      const result = await profileService.getUserProfileType('user1');
      
      expect(result.type).toBe('legacy');
      expect(result.profile).toBeNull();
    });
  });
  
  describe('createPatientProfile', () => {
    it('should create patient profile successfully', async () => {
      const mockPatient = {