
# Profile Migration Strategy

## Overview

This document outlines a comprehensive migration strategy for implementing the Profile model architecture while maintaining backward compatibility, ensuring zero downtime, and preserving data integrity throughout the transition.

## Migration Principles

### Core Principles
1. **Zero Downtime**: System remains operational throughout migration
2. **Backward Compatibility**: Existing user references continue to function
3. **Data Integrity**: No data loss during migration process
4. **Progressive Enhancement**: New features added incrementally
5. **Rollback Capability**: Ability to revert changes at any phase
6. **Validation at Each Step**: Comprehensive testing before proceeding

### Risk Mitigation
- **Parallel Systems**: Run old and new systems simultaneously during transition
- **Feature Flags**: Control rollout of new functionality
- **Comprehensive Backups**: Full system backups before each phase
- **Monitoring**: Enhanced monitoring during migration phases
- **Staged Rollout**: Gradual deployment across facilities

## Migration Phases

### Phase 1: Foundation Setup (Week 1-2)
**Objective**: Create Profile collections and basic infrastructure

#### 1.1 Collection Creation
```bash
# Create Profile collections using Appwrite CLI
appwrite deploy collection --collectionId=patient_profiles
appwrite deploy collection --collectionId=employee_profiles  
appwrite deploy collection --collectionId=admin_profiles
```

#### 1.2 Index Creation
```javascript
// Create optimized indexes for Profile collections
const indexes = [
  // PatientProfile indexes
  { collection: 'patient_profiles', key: 'user_id_unique', type: 'unique', attributes: ['user_id'] },
  { collection: 'patient_profiles', key: 'patient_id_unique', type: 'unique', attributes: ['patient_id'] },
  { collection: 'patient_profiles', key: 'facility_id_index', type: 'key', attributes: ['facility_id'] },
  
  // EmployeeProfile indexes
  { collection: 'employee_profiles', key: 'user_id_unique', type: 'unique', attributes: ['user_id'] },
  { collection: 'employee_profiles', key: 'employee_id_unique', type: 'unique', attributes: ['employee_id'] },
  { collection: 'employee_profiles', key: 'primary_facility_id_index', type: 'key', attributes: ['primary_facility_id'] },
  
  // AdminProfile indexes
  { collection: 'admin_profiles', key: 'user_id_unique', type: 'unique', attributes: ['user_id'] },
  { collection: 'admin_profiles', key: 'admin_level_index', type: 'key', attributes: ['admin_level'] }
];

// Deploy indexes
for (const index of indexes) {
  await databases.createIndex('main', index.collection, index.key, index.type, index.attributes);
}
```

#### 1.3 Permission Setup
```javascript
// Set up collection permissions
const permissions = {
  patient_profiles: {
    read: ['user:self', 'label:role:administrator', 'label:role:supervisor', 'label:role:doctor'],
    create: ['label:role:administrator', 'label:role:supervisor', 'label:role:doctor'],
    update: ['user:self', 'label:role:administrator', 'label:role:supervisor', 'label:role:doctor'],
    delete: ['label:role:administrator']
  },
  employee_profiles: {
    read: ['user:self', 'label:role:administrator', 'label:role:supervisor'],
    create: ['label:role:administrator', 'label:role:supervisor'],
    update: ['user:self', 'label:role:administrator', 'label:role:supervisor'],
    delete: ['label:role:administrator']
  },
  admin_profiles: {
    read: ['user:self', 'label:role:administrator'],
    create: ['label:role:administrator'],
    update: ['user:self', 'label:role:administrator'],
    delete: ['label:role:administrator']
  }
};

// Apply permissions
for (const [collection, perms] of Object.entries(permissions)) {
  await databases.updateCollection('main', collection, collection, perms);
}
```

#### 1.4 Validation Scripts
```javascript
// Phase 1 validation script
async function validatePhase1() {
  const validations = [];
  
  // Check collection creation
  try {
    const collections = await databases.listCollections('main');
    const profileCollections = ['patient_profiles', 'employee_profiles', 'admin_profiles'];
    
    for (const collectionId of profileCollections) {
      const exists = collections.collections.find(c => c.$id === collectionId);
      validations.push({
        test: `Collection ${collectionId} exists`,
        passed: !!exists,
        details: exists ? 'Created successfully' : 'Missing collection'
      });
    }
  } catch (error) {
    validations.push({
      test: 'Collection validation',
      passed: false,
      details: error.message
    });
  }
  
  // Check indexes
  for (const collectionId of ['patient_profiles', 'employee_profiles', 'admin_profiles']) {
    try {
      const indexes = await databases.listIndexes('main', collectionId);
      validations.push({
        test: `${collectionId} indexes`,
        passed: indexes.indexes.length > 0,
        details: `${indexes.indexes.length} indexes created`
      });
    } catch (error) {
      validations.push({
        test: `${collectionId} indexes`,
        passed: false,
        details: error.message
      });
    }
  }
  
  return validations;
}
```

### Phase 2: Data Migration (Week 3-4)
**Objective**: Migrate existing user data to Profile collections

#### 2.1 User Analysis and Categorization
```javascript
// Analyze existing users and categorize them
async function analyzeExistingUsers() {
  const users = await users.list();
  const analysis = {
    administrators: [],
    supervisors: [],
    doctors: [],
    regular_users: [],
    uncategorized: []
  };
  
  for (const user of users.users) {
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
  
  return analysis;
}
```

#### 2.2 Employee Profile Migration
```javascript
// Migrate healthcare workers to EmployeeProfile
async function migrateEmployeeProfiles() {
  const userAnalysis = await analyzeExistingUsers();
  const employeeUsers = [
    ...userAnalysis.supervisors,
    ...userAnalysis.doctors,
    ...userAnalysis.regular_users
  ];
  
  const migrationResults = [];
  
  for (const user of employeeUsers) {
    try {
      // Determine employee type from labels
      let employeeType = 'user';
      if (user.labels.includes('role:supervisor')) employeeType = 'supervisor';
      if (user.labels.includes('role:doctor')) employeeType = 'doctor';
      
      // Extract facility information from labels
      const facilityLabels = user.labels.filter(label => label.startsWith('facility_'));
      const primaryFacilityId = facilityLabels[0]?.replace('facility_', '') || null;
      
      // Create employee profile
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
      
      const profile = await databases.createDocument(
        'main',
        'employee_profiles',
        ID.unique(),
        profileData
      );
      
      migrationResults.push({
        userId: user.$id,
        profileId: profile.$id,
        status: 'success',
        employeeType
      });
      
    } catch (error) {
      migrationResults.push({
        userId: user.$id,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return migrationResults;
}
```

#### 2.3 Admin Profile Migration
```javascript
// Migrate administrators to AdminProfile
async function migrateAdminProfiles() {
  const userAnalysis = await analyzeExistingUsers();
  const adminUsers = userAnalysis.administrators;
  
  const migrationResults = [];
  
  for (const user of adminUsers) {
    try {
      // Determine admin level and permissions
      const adminLevel = user.labels.includes('super_admin') ? 'super_admin' : 'system_admin';
      const systemPermissions = [
        'user_management',
        'system_configuration',
        'audit_access',
        'cross_facility_access'
      ];
      
      const profileData = {
        user_id: user.$id,
        admin_level: adminLevel,
        system_permissions: systemPermissions,
        facility_access_scope: 'all',
        security_clearance: 'high',
        mfa_enabled: true,
        audit_log_access: true,
        system_config_access: true,
        user_management_scope: 'global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const profile = await databases.createDocument(
        'main',
        'admin_profiles',
        ID.unique(),
        profileData
      );
      
      migrationResults.push({
        userId: user.$id,
        profileId: profile.$id,
        status: 'success',
        adminLevel
      });
      
    } catch (error) {
      migrationResults.push({
        userId: user.$id,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return migrationResults;
}
```

#### 2.4 Patient Profile Preparation
```javascript
// Prepare for patient profile creation (for future patient users)
async function preparePatientProfiles() {
  // Analyze existing patients that might need user accounts
  const patients = await databases.listDocuments('main', 'patients');
  
  const patientAnalysis = {
    total_patients: patients.documents.length,
    patients_with_contact: patients.documents.filter(p => p.contact_phone).length,
    patients_by_facility: {}
  };
  
  // Group by facility for targeted rollout
  for (const patient of patients.documents) {
    const facilityId = patient.facility_id;
    if (!patientAnalysis.patients_by_facility[facilityId]) {
      patientAnalysis.patients_by_facility[facilityId] = [];
    }
    patientAnalysis.patients_by_facility[facilityId].push(patient);
  }
  
  return patientAnalysis;
}
```

#### 2.5 Data Validation and Integrity Checks
```javascript
// Comprehensive data validation after migration
async function validatePhase2Migration() {
  const validations = [];
  
  // Check employee profile migration
  const users = await users.list();
  const employeeProfiles = await databases.listDocuments('main', 'employee_profiles');
  
  const employeeUsers = users.users.filter(u => 
    u.labels.some(label => ['role:supervisor', 'role:doctor', 'role:user'].includes(label))
  );
  
  validations.push({
    test: 'Employee profile migration completeness',
    passed: employeeProfiles.documents.length === employeeUsers.length,
    details: `${employeeProfiles.documents.length}/${employeeUsers.length} profiles created`
  });
  
  // Check admin profile migration
  const adminProfiles = await databases.listDocuments('main', 'admin_profiles');
  const adminUsers = users.users.filter(u => u.labels.includes('role:administrator'));
  
  validations.push({
    test: 'Admin profile migration completeness',
    passed: adminProfiles.documents.length === adminUsers.length,
    details: `${adminProfiles.documents.length}/${adminUsers.length} profiles created`
  });
  
  // Check data integrity
  for (const profile of employeeProfiles.documents) {
    const user = users.users.find(u => u.$id === profile.user_id);
    validations.push({
      test: `Employee profile ${profile.$id} user reference`,
      passed: !!user,
      details: user ? 'Valid reference' : 'Broken reference'
    });
  }
  
  return validations;
}
```

### Phase 3: Service Integration (Week 5-6)
**Objective**: Integrate Profile services with existing APIs

#### 3.1 Profile Service Implementation
```javascript
// Profile service with backward compatibility
class ProfileService {
  async getUserProfile(userId) {
    // Try to get profile from each collection
    const [patientProfile, employeeProfile, adminProfile] = await Promise.allSettled([
      databases.listDocuments('main', 'patient_profiles', [Query.equal('user_id', userId)]),
      databases.listDocuments('main', 'employee_profiles', [Query.equal('user_id', userId)]),
      databases.listDocuments('main', 'admin_profiles', [Query.equal('user_id', userId)])
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
    
    // Fallback to legacy user data
    const user = await users.get(userId);
    return { type: 'legacy', profile: null, user };
  }
  
  async getEnhancedUserInfo(userId) {
    const profileInfo = await this.getUserProfile(userId);
    const user = await users.get(userId);
    
    const baseInfo = {
      id: userId,
      name: user.name,
      email: user.email,
      labels: user.labels
    };
    
    switch (profileInfo.type) {
      case 'employee':
        return {
          ...baseInfo,
          type: 'employee',
          employeeId: profileInfo.profile.employee_id,
          employeeType: profileInfo.profile.employee_type,
          professionalTitle: profileInfo.profile.professional_title,
          primaryFacilityId: profileInfo.profile.primary_facility_id,
          assignedFacilities: profileInfo.profile.assigned_facilities,
          licenseNumber: profileInfo.profile.license_number,
          licenseExpiryDate: profileInfo.profile.license_expiry_date
        };
        
      case 'patient':
        return {
          ...baseInfo,
          type: 'patient',
          patientId: profileInfo.profile.patient_id,
          verificationStatus: profileInfo.profile.verification_status,
          accessPermissions: profileInfo.profile.access_permissions,
          facilityId: profileInfo.profile.facility_id
        };
        
      case 'admin':
        return {
          ...baseInfo,
          type: 'admin',
          adminLevel: profileInfo.profile.admin_level,
          systemPermissions: profileInfo.profile.system_permissions,
          facilityAccessScope: profileInfo.profile.facility_access_scope,
          securityClearance: profileInfo.profile.security_clearance
        };
        
      default:
        return {
          ...baseInfo,
          type: 'legacy'
        };
    }
  }
}
```

#### 3.2 API Middleware Integration
```javascript
// Enhanced authentication middleware
async function enhancedAuthMiddleware(req, res, next) {
  try {
    // Standard authentication
    const session = await account.getSession('current');
    const user = await account.get();
    
    // Get enhanced profile information
    const profileService = new ProfileService();
    const enhancedUserInfo = await profileService.getEnhancedUserInfo(user.$id);
    
    // Attach to request
    req.user = user;
    req.userProfile = enhancedUserInfo;
    req.profileType = enhancedUserInfo.type;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Enhanced permission checking
function requireProfileType(allowedTypes) {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.profileType)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Enhanced facility access checking
function requireFacilityAccess(facilityId) {
  return (req, res, next) => {
    const userProfile = req.userProfile;
    
    switch (userProfile.type) {
      case 'admin':
        if (userProfile.facilityAccessScope === 'all') {
          return next();
        }
        if (userProfile.assignedFacilities?.includes(facilityId)) {
          return next();
        }
        break;
        
      case 'employee':
        if (userProfile.primaryFacilityId === facilityId) {
          return next();
        }
        if (userProfile.assignedFacilities?.includes(facilityId)) {
          return next();
        }
        break;
        
      case 'patient':
        if (userProfile.facilityId === facilityId) {
          return next();
        }
        break;
        
      case 'legacy':
        // Fallback to label-based checking
        if (req.user.labels.includes(`facility_${facilityId}`)) {
          return next();
        }
        break;
    }
    
    res.status(403).json({ error: 'Facility access denied' });
  };
}
```

#### 3.3 Enhanced Immunization Record Creation
```javascript
// Enhanced immunization record service
async function createEnhancedImmunizationRecord(data) {
  const profileService = new ProfileService();
  
  // Get administering user profile
  const administeringUser = await profileService.getEnhancedUserInfo(data.administered_by_user_id);
  
  // Enhanced validation for employee profiles
  if (administeringUser.type === 'employee') {
    // Check license validity
    if (administeringUser.licenseExpiryDate && new Date(administeringUser.licenseExpiryDate) < new Date()) {
      throw new Error('Healthcare worker license has expired');
    }
    
    // Check facility authorization
    if (!administeringUser.assignedFacilities?.includes(data.facility_id) && 
        administeringUser.primaryFacilityId !== data.facility_id) {
      throw new Error('Healthcare worker not authorized for this facility');
    }
    
    // Enhanced audit trail
    data.administered_by_details = {
      employee_id: administeringUser.employeeId,
      professional_title: administeringUser.professionalTitle,
      license_number: administeringUser.licenseNumber,
      employee_type: administeringUser.employeeType
    };
  }
  
  // Create record with enhanced data
  const record = await databases.createDocument(
    'main',
    'immunization_records',
    ID.unique(),
    {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  );
  
  return record;
}
```

### Phase 4: Feature Enhancement (Week 7-8)
**Objective**: Enable new features using Profile data

#### 4.1 Patient Self-Service Portal
```javascript
// Patient registration and profile creation
async function registerPatientUser(registrationData) {
  const { patientId, email, phone, password, verificationMethod } = registrationData;
  
  // Verify patient exists
  const patient = await databases.getDocument('main', 'patients', patientId);
  if (!patient) {
    throw new Error('Patient record not found');
  }
  
  // Create user account
  const user = await users.create(
    ID.unique(),
    email,
    phone,
    password,
    patient.full_name
  );
  
  // Add patient role label
  await users.updateLabels(user.$id, ['role:patient', `facility_${patient.facility_id}`]);
  
  // Create patient profile
  const profile = await databases.createDocument('main', 'patient_profiles', ID.unique(), {
    user_id: user.$id,
    patient_id: patientId,
    facility_id: patient.facility_id,
    verification_status: 'pending',
    verification_method: verificationMethod,
    access_permissions: ['view_own_records', 'receive_notifications'],
    notification_preferences: JSON.stringify({
      email_notifications: true,
      sms_notifications: true,
      reminder_days: [7, 1]
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  return { user, profile };
}

// Patient record access with profile-based permissions
async function getPatientRecords(userId) {
  const profileService = new ProfileService();
  const userProfile = await profileService.getEnhancedUserInfo(userId);
  
  if (userProfile.type !== 'patient') {
    throw new Error('Access denied: Not a patient user');
  }
  
  if (userProfile.verificationStatus !== 'verified') {
    throw new Error('Account verification required');
  }
  
  // Get patient's immunization records
  const records = await databases.listDocuments('main', 'immunization_records', [
    Query.equal('patient_id', userProfile.patientId)
  ]);
  
  // Filter based on access permissions
  const allowedFields = userProfile.accessPermissions.includes('view_detailed_records') 
    ? ['*'] 
    : ['vaccine_id', 'administered_date', 'return_date', 'facility_id'];
  
  return {
    patient: await databases.getDocument('main', 'patients', userProfile.patientId),
    records: records.documents,
    accessLevel: userProfile.accessPermissions
  };
}
```

#### 4.2 Enhanced Staff Management
```javascript
// Staff performance tracking
async function getStaffPerformanceMetrics(facilityId, dateRange) {
  const employeeProfiles = await databases.listDocuments('main', 'employee_profiles', [
    Query.equal('primary_facility_id', facilityId),
    Query.equal('employment_status', 'active')
  ]);
  
  const performanceData = [];
  
  for (const profile of employeeProfiles.documents) {
    // Get immunization records administered by this employee
    const records = await databases.listDocuments('main', 'immunization_records', [
      Query.equal('administered_by_user_id', profile.user_id),
      Query.greaterThanEqual('administered_date', dateRange.start),
      Query.lessThanEqual('administered_date', dateRange.end)
    ]);
    
    // Calculate performance metrics
    const metrics = {
      employeeId: profile.employee_id,
      name: profile.professional_title,
      employeeType: profile.employee_type,
      immunizationsAdministered: records.documents.length,
      averagePerDay: records.documents.length / dateRange.days,
      licenseStatus: profile.license_expiry_date > new Date() ? 'valid' : 'expired',
      specializations: profile.specializations || []
    };
    
    performanceData.push(metrics);
  }
  
  return performanceData;
}

// License expiry monitoring
async function monitorLicenseExpiry() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const expiringLicenses = await databases.listDocuments('main', 'employee_profiles', [
    Query.lessThanEqual('license_expiry_date', thirtyDaysFromNow.toISOString()),
    Query.equal('employment_status', 'active')
  ]);
  
  // Create notifications for expiring licenses
  for (const profile of expiringLicenses.documents) {
    await databases.createDocument('main', 'notifications', ID.unique(), {
      type: 'license_expiry_warning',
      title: 'License Expiry Warning',
      message: `Professional license expires on ${profile.license_expiry_date}`,
      recipient_id: profile.user_id,
      facility_id: profile.primary_facility_id,
      priority: 'high',
      is_read: false,
      created_at: new Date().toISOString()
    });
  }
  
  return expiringLicenses.documents;
}
```

### Phase 5: Full Integration and Optimization (Week 9-10)
**Objective**: Complete integration and performance optimization

#### 5.1 Performance Optimization
```javascript
// Profile caching service
class ProfileCacheService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  async getUserProfile(userId) {
    const cacheKey = `profile_${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Fetch from database
    const profileService = new ProfileService();
    const profile = await profileService.getEnhancedUserInfo(userId);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: profile,
      timestamp: Date.now()
    });
    
    return profile;
  }
  
  invalidateUserProfile(userId) {
    this.cache.delete(`profile_${userId}`);
  }
  
  clearCache() {
    this.cache.clear();
  }
}

// Batch profile operations
async function batchUpdateEmployeeProfiles(updates) {
  const results = [];
  const batchSize = 10;
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (update) => {
      try {
        const profile = await databases.updateDocument(
          'main',
          'employee_profiles',
          update.profileId,
          update.data
        );
        
        // Invalidate cache
        profileCache.invalidateUserProfile(profile.user_id);
        
        return { profileId: update.profileId, status: 'success' };
      } catch (error) {
        return { profileId: update.profileId, status: 'error', error: error.message };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.map(r => r.value || r.reason));
  }
  
  return results;
}
```

#### 5.2 Monitoring and Analytics
```javascript
// Profile usage analytics
async function generateProfileAnalytics() {
  const analytics = {
    totalProfiles: 0,
    profileTypes: {},
    facilityDistribution: {},
    verificationStatus: {},
    licenseStatus: {}
  };
  
  // Employee profiles analytics
  const employeeProfiles = await databases.listDocuments('main', 'employee_profiles');
  analytics.totalProfiles += employeeProfiles.documents.length;
  
  for (const profile of employeeProfiles.documents) {
    // Profile type distribution
    analytics.profileTypes[profile.employee_type] = 
      (analytics.profileTypes[profile.employee_type] || 0) + 1;
    
    // Facility distribution
    analytics.facilityDistribution[profile.primary_facility_id] = 
      (analytics.facilityDistribution[profile.primary_facility_id] || 0) + 1;
    
    // License status
    const licenseValid = profile.license_expiry_date > new Date().toISOString();
    analytics.licenseStatus[licenseValid ? 'valid' : 'expired'] = 
      (analytics.licenseStatus[licenseValid ? 'valid' : 'expired'] || 0) + 1;
  }
  
  // Patient profiles analytics
  const patientProfiles = await databases.listDocuments('main', 'patient_profiles');
  analytics.totalProfiles += patientProfiles.documents.length;
  analytics.profileTypes['patient'] = patientProfiles.documents.length;
  
  for (const profile of patientProfiles.documents) {
    analytics.verificationStatus[profile.verification_status] = 
      (analytics.verificationStatus[profile.verification_status] || 0) + 1;
  }
  
  // Admin profiles analytics
  const adminProfiles = await databases.listDocuments('main', 'admin_profiles');
  analytics.totalProfiles += adminProfiles.documents.length;
  analytics.profileTypes['admin'] = adminProfiles.documents.length;
  
  return analytics;
}
```

## Rollback Procedures

### Emergency Rollback Plan
```javascript
// Emergency rollback to pre-profile state
async function emergencyRollback() {
  console.log('Starting emergency rollback...');
  
  // 1. Disable profile-based features
  await disableFeatureFlags(['profile_authentication', 'enhanced_permissions', 'patient_portal']);
  
  // 2. Restore legacy API endpoints
  await enableLegacyEndpoints();
  
  // 3. Clear profile caches
  profileCache.clearCache();
  
  // 4. Revert to label-based permissions
  await revertToLabelBasedPermissions();
  
  console.log('Emergency rollback completed');
}

// Gradual rollback by phase
async function rollbackPhase(phase) {
  switch (phase) {
    case 5:
      await disableOptimizations();
      // Fall through
    case 4:
      await disableEnhancedFeatures();
      // Fall through
    case 3:
      await disableProfileServices();
      // Fall through
    case 2:
      // Keep profile data but don't use it
      await disableProfileMigration();
      // Fall through
    case 1:
      // Remove profile collections if needed
      await removeProfileCollections();
      break;
  }
}
```

## Testing Strategy

### Automated Testing
```javascript
// Comprehensive test suite for profile migration
describe('Profile Migration Tests', () => {
  test('Phase 1: Collection Creation', async () => {
    const validations = await validatePhase1();
    expect(validations.every(v => v.passed)).toBe(true);
  });
  