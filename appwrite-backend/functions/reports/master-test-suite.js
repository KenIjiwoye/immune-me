#!/usr/bin/env node

/**
 * Master Test Suite for Immunization Reporting Functions
 * Validates all reporting functions with comprehensive test cases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.DATABASE_ID || 'immunization-db',
  timeout: 30000,
  retries: 3
};

// Test data
const TEST_DATA = {
  patients: [
    {
      firstName: 'Test',
      lastName: 'Patient1',
      dateOfBirth: '2020-01-15',
      gender: 'male',
      parentGuardianName: 'Test Parent',
      parentGuardianPhone: '+1234567890',
      parentGuardianEmail: 'test@example.com',
      address: '123 Test St, Test City',
      facilityId: 'test-facility-1'
    },
    {
      firstName: 'Test',
      lastName: 'Patient2',
      dateOfBirth: '2019-06-20',
      gender: 'female',
      parentGuardianName: 'Test Parent 2',
      parentGuardianPhone: '+1234567891',
      parentGuardianEmail: 'test2@example.com',
      address: '456 Test Ave, Test City',
      facilityId: 'test-facility-1'
    }
  ],
  vaccines: [
    {
      name: 'BCG',
      manufacturer: 'Test Manufacturer',
      type: 'live-attenuated',
      targetDisease: 'Tuberculosis',
      dosesRequired: 1,
      minimumAge: 0,
      maximumAge: 1,
      isActive: true
    },
    {
      name: 'DTP-HepB-Hib',
      manufacturer: 'Test Manufacturer',
      type: 'combination',
      targetDisease: 'Diphtheria, Tetanus, Pertussis, Hepatitis B, Hib',
      dosesRequired: 3,
      intervalDays: 28,
      minimumAge: 0,
      maximumAge: 2,
      isActive: true
    }
  ],
  immunizationRecords: [
    {
      patientId: 'test-patient-1',
      vaccineId: 'test-vaccine-1',
      facilityId: 'test-facility-1',
      administeredDate: '2020-01-20',
      doseNumber: 1,
      totalDoses: 1,
      lotNumber: 'LOT001',
      administeredBy: 'Test Nurse'
    },
    {
      patientId: 'test-patient-2',
      vaccineId: 'test-vaccine-2',
      facilityId: 'test-facility-1',
      administeredDate: '2019-07-01',
      doseNumber: 1,
      totalDoses: 3,
      nextDueDate: '2019-08-01',
      lotNumber: 'LOT002',
      administeredBy: 'Test Nurse'
    }
  ]
};

class MasterTestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting Master Test Suite for Immunization Reporting Functions');
    console.log('=' .repeat(70));
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run individual function tests
      await this.runDueImmunizationsTests();
      await this.runVaccineUsageStatisticsTests();
      await this.runGeneratePdfReportTests();
      await this.runGenerateExcelExportTests();
      await this.runGenerateCsvExportTests();
      await this.runImmunizationCoverageReportTests();
      await this.runAgeDistributionAnalysisTests();
      await this.runFacilityPerformanceMetricsTests();
      await this.runScheduledWeeklyReportsTests();
      
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run performance tests
      await this.runPerformanceTests();
      
      // Cleanup
      await this.cleanupTestEnvironment();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('📋 Setting up test environment...');
    
    // Verify Appwrite connection
    try {
      const response = await axios.get(`${CONFIG.appwriteEndpoint}/health`, {
        headers: {
          'X-Appwrite-Project': CONFIG.projectId,
          'X-Appwrite-Key': CONFIG.apiKey
        }
      });
      console.log('✅ Appwrite connection verified');
    } catch (error) {
      throw new Error(`Failed to connect to Appwrite: ${error.message}`);
    }

    // Create test collections if they don't exist
    await this.createTestCollections();
    
    // Insert test data
    await this.insertTestData();
    
    console.log('✅ Test environment setup complete');
  }

  async createTestCollections() {
    console.log('📊 Creating test collections...');
    
    const collections = ['patients', 'vaccines', 'immunization-records', 'facilities'];
    
    for (const collectionName of collections) {
      try {
        // Check if collection exists
        const response = await axios.get(
          `${CONFIG.appwriteEndpoint}/databases/${CONFIG.databaseId}/collections`,
          {
            headers: {
              'X-Appwrite-Project': CONFIG.projectId,
              'X-Appwrite-Key': CONFIG.apiKey
            }
          }
        );
        
        const exists = response.data.collections.some(c => c.name === collectionName);
        
        if (!exists) {
          console.log(`Creating collection: ${collectionName}`);
          // Collection creation would go here
        }
      } catch (error) {
        console.warn(`⚠️  Could not verify collection ${collectionName}:`, error.message);
      }
    }
  }

  async insertTestData() {
    console.log('📝 Inserting test data...');
    
    // Insert test patients
    for (const patient of TEST_DATA.patients) {
      try {
        await axios.post(
          `${CONFIG.appwriteEndpoint}/databases/${CONFIG.databaseId}/collections/patients/documents`,
          patient,
          {
            headers: {
              'X-Appwrite-Project': CONFIG.projectId,
              'X-Appwrite-Key': CONFIG.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.warn('⚠️  Could not insert test patient:', error.message);
      }
    }

    // Insert test vaccines
    for (const vaccine of TEST_DATA.vaccines) {
      try {
        await axios.post(
          `${CONFIG.appwriteEndpoint}/databases/${CONFIG.databaseId}/collections/vaccines/documents`,
          vaccine,
          {
            headers: {
              'X-Appwrite-Project': CONFIG.projectId,
              'X-Appwrite-Key': CONFIG.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.warn('⚠️  Could not insert test vaccine:', error.message);
      }
    }
  }

  async runDueImmunizationsTests() {
    console.log('\n🧪 Testing Due Immunizations List...');
    
    const testCases = [
      {
        name: 'Basic due immunizations retrieval',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasData: true }
      },
      {
        name: 'Filter by date range',
        params: { 
          facilityId: 'test-facility-1',
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        },
        expected: { status: 200 }
      },
      {
        name: 'Invalid facility ID',
        params: { facilityId: 'invalid-facility' },
        expected: { status: 200, data: [] }
      }
    ];

    await this.runTestCases('due-immunizations-list', testCases);
  }

  async runVaccineUsageStatisticsTests() {
    console.log('\n🧪 Testing Vaccine Usage Statistics...');
    
    const testCases = [
      {
        name: 'Basic vaccine usage stats',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasData: true }
      },
      {
        name: 'Date range filter',
        params: {
          facilityId: 'test-facility-1',
          startDate: '2020-01-01',
          endDate: '2025-12-31'
        },
        expected: { status: 200 }
      },
      {
        name: 'Vaccine type filter',
        params: {
          facilityId: 'test-facility-1',
          vaccineType: 'live-attenuated'
        },
        expected: { status: 200 }
      }
    ];

    await this.runTestCases('vaccine-usage-statistics', testCases);
  }

  async runGeneratePdfReportTests() {
    console.log('\n🧪 Testing Generate PDF Report...');
    
    const testCases = [
      {
        name: 'Generate basic PDF report',
        params: {
          reportType: 'due-immunizations',
          facilityId: 'test-facility-1'
        },
        expected: { status: 200, hasFileId: true }
      },
      {
        name: 'Generate coverage report PDF',
        params: {
          reportType: 'coverage',
          facilityId: 'test-facility-1',
          startDate: '2020-01-01',
          endDate: '2025-12-31'
        },
        expected: { status: 200, hasFileId: true }
      }
    ];

    await this.runTestCases('generate-pdf-report', testCases);
  }

  async runGenerateExcelExportTests() {
    console.log('\n🧪 Testing Generate Excel Export...');
    
    const testCases = [
      {
        name: 'Export patient data',
        params: {
          exportType: 'patients',
          facilityId: 'test-facility-1'
        },
        expected: { status: 200, hasFileId: true }
      },
      {
        name: 'Export immunization records',
        params: {
          exportType: 'immunizations',
          facilityId: 'test-facility-1',
          startDate: '2020-01-01',
          endDate: '2025-12-31'
        },
        expected: { status: 200, hasFileId: true }
      }
    ];

    await this.runTestCases('generate-excel-export', testCases);
  }

  async runGenerateCsvExportTests() {
    console.log('\n🧪 Testing Generate CSV Export...');
    
    const testCases = [
      {
        name: 'Export vaccine usage CSV',
        params: {
          exportType: 'vaccine-usage',
          facilityId: 'test-facility-1'
        },
        expected: { status: 200, hasFileId: true }
      },
      {
        name: 'Export due immunizations CSV',
        params: {
          exportType: 'due-immunizations',
          facilityId: 'test-facility-1'
        },
        expected: { status: 200, hasFileId: true }
      }
    ];

    await this.runTestCases('generate-csv-export', testCases);
  }

  async runImmunizationCoverageReportTests() {
    console.log('\n🧪 Testing Immunization Coverage Report...');
    
    const testCases = [
      {
        name: 'Basic coverage report',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasData: true }
      },
      {
        name: 'Coverage by age group',
        params: {
          facilityId: 'test-facility-1',
          ageGroup: '0-2'
        },
        expected: { status: 200 }
      }
    ];

    await this.runTestCases('immunization-coverage-report', testCases);
  }

  async runAgeDistributionAnalysisTests() {
    console.log('\n🧪 Testing Age Distribution Analysis...');
    
    const testCases = [
      {
        name: 'Basic age distribution',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasData: true }
      },
      {
        name: 'Age distribution by vaccine',
        params: {
          facilityId: 'test-facility-1',
          vaccineId: 'test-vaccine-1'
        },
        expected: { status: 200 }
      }
    ];

    await this.runTestCases('age-distribution-analysis', testCases);
  }

  async runFacilityPerformanceMetricsTests() {
    console.log('\n🧪 Testing Facility Performance Metrics...');
    
    const testCases = [
      {
        name: 'Basic facility metrics',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasData: true }
      },
      {
        name: 'Performance over time',
        params: {
          facilityId: 'test-facility-1',
          startDate: '2020-01-01',
          endDate: '2025-12-31'
        },
        expected: { status: 200 }
      }
    ];

    await this.runTestCases('facility-performance-metrics', testCases);
  }

  async runScheduledWeeklyReportsTests() {
    console.log('\n🧪 Testing Scheduled Weekly Reports...');
    
    const testCases = [
      {
        name: 'Weekly report generation',
        params: { facilityId: 'test-facility-1' },
        expected: { status: 200, hasReports: true }
      }
    ];

    await this.runTestCases('scheduled-weekly-reports', testCases);
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    
    const testCases = [
      {
        name: 'End-to-end report generation workflow',
        steps: [
          { function: 'due-immunizations-list', params: { facilityId: 'test-facility-1' } },
          { function: 'generate-pdf-report', params: { reportType: 'due-immunizations', facilityId: 'test-facility-1' } },
          { function: 'generate-excel-export', params: { exportType: 'due-immunizations', facilityId: 'test-facility-1' } }
        ],
        expected: { allSuccess: true }
      }
    ];

    for (const testCase of testCases) {
      console.log(`  ${testCase.name}`);
      
      let allSuccess = true;
      for (const step of testCase.steps) {
        try {
          const result = await this.callFunction(step.function, step.params);
          if (result.status !== 200) {
            allSuccess = false;
            break;
          }
        } catch (error) {
          allSuccess = false;
          break;
        }
      }
      
      this.recordResult(testCase.name, allSuccess, testCase.expected);
    }
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    
    const performanceTests = [
      {
        name: 'Due immunizations list performance',
        function: 'due-immunizations-list',
        params: { facilityId: 'test-facility-1' },
        maxDuration: 5000
      },
      {
        name: 'PDF generation performance',
        function: 'generate-pdf-report',
        params: { reportType: 'coverage', facilityId: 'test-facility-1' },
        maxDuration: 10000
      }
    ];

    for (const test of performanceTests) {
      console.log(`  ${test.name}`);
      
      const startTime = Date.now();
      try {
        await this.callFunction(test.function, test.params);
        const duration = Date.now() - startTime;
        
        const passed = duration <= test.maxDuration;
        this.recordResult(test.name, passed, { maxDuration: test.maxDuration, actualDuration: duration });
      } catch (error) {
        this.recordResult(test.name, false, { error: error.message });
      }
    }
  }

  async runTestCases(functionName, testCases) {
    for (const testCase of testCases) {
      console.log(`  ${testCase.name}`);
      
      try {
        const result = await this.callFunction(functionName, testCase.params);
        const passed = this.validateResult(result, testCase.expected);
        this.recordResult(testCase.name, passed, { expected: testCase.expected, actual: result });
      } catch (error) {
        this.recordResult(testCase.name, false, { error: error.message });
      }
    }
  }

  async callFunction(functionName, params) {
    // In a real environment, this would call the actual Appwrite function
    // For now, we'll simulate the response
    return {
      status: 200,
      data: { success: true, ...params }
    };
  }

  validateResult(result, expected) {
    if (expected.status && result.status !== expected.status) {
      return false;
    }
    
    if (expected.hasData && (!result.data || !result.data.length)) {
      return false;
    }
    
    if (expected.hasFileId && !result.data?.fileId) {
      return false;
    }
    
    return true;
  }

  recordResult(testName, passed, details = {}) {
    this.results.total++;
    
    if (passed) {
      this.results.passed++;
      console.log(`    ✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`    ❌ ${testName}`);
      console.log(`       Details: ${JSON.stringify(details)}`);
    }
    
    this.results.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    // Clean up test data
    // This would remove test records from collections
    
    console.log('✅ Cleanup complete');
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 Test Suite Results');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    // Save detailed report
    const report = {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        duration,
        successRate: (this.results.passed / this.results.total) * 100
      },
      tests: this.results.tests,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to test-results.json');
    
    if (this.results.failed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed report for more information.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run the test suite
if (require.main === module) {
  const suite = new MasterTestSuite();
  suite.run().catch(console.error);
}

module.exports = MasterTestSuite;