import { Client, Databases, Storage } from 'node-appwrite';
import ExcelReportGenerator from './src/main.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
  STORAGE_BUCKET_ID: process.env.STORAGE_BUCKET_ID || 'reports',
  DATABASE_ID: process.env.DATABASE_ID || 'immunization-db'
};

// Test data
const testCases = [
  {
    name: 'Immunization Coverage Report',
    reportType: 'immunization_coverage',
    filters: {},
    expectedWorksheets: ['Immunization Coverage', 'Coverage Summary']
  },
  {
    name: 'Facility Performance Report',
    reportType: 'facility_performance',
    filters: {},
    expectedWorksheets: ['Facility Performance']
  },
  {
    name: 'Age Distribution Report',
    reportType: 'age_distribution',
    filters: {},
    expectedWorksheets: ['Age Distribution']
  },
  {
    name: 'Vaccine Usage Report',
    reportType: 'vaccine_usage',
    filters: {},
    expectedWorksheets: ['Vaccine Usage']
  },
  {
    name: 'Due Immunizations Report',
    reportType: 'due_immunizations',
    filters: {},
    expectedWorksheets: ['Due Immunizations']
  }
];

// Test runner
async function runTests() {
  console.log('🧪 Starting Excel Export Function Tests...\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      
      // Create generator instance
      const generator = new ExcelReportGenerator();
      
      // Generate report
      await generator.generateReport(testCase.reportType, testCase.filters);
      
      // Save test file
      const testFilename = `test_${testCase.reportType}_${Date.now()}.xlsx`;
      const testPath = path.join('./', testFilename);
      
      await generator.saveToFile(testPath);
      
      // Verify file exists
      if (fs.existsSync(testPath)) {
        console.log(`✅ ${testCase.name} - File generated successfully`);
        console.log(`   📁 File: ${testFilename}`);
        
        // Verify worksheets
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(testPath);
        
        const worksheets = workbook.worksheets.map(ws => ws.name);
        const expectedWorksheets = testCase.expectedWorksheets;
        
        const hasAllWorksheets = expectedWorksheets.every(ws => worksheets.includes(ws));
        
        if (hasAllWorksheets) {
          console.log(`✅ Worksheets verified: ${worksheets.join(', ')}`);
          passed++;
        } else {
          console.log(`❌ Missing worksheets. Expected: ${expectedWorksheets.join(', ')}, Got: ${worksheets.join(', ')}`);
          failed++;
        }
        
        // Clean up test file
        fs.unlinkSync(testPath);
      } else {
        console.log(`❌ ${testCase.name} - File not generated`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${testCase.name} - Error: ${error.message}`);
      failed++;
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return { passed, failed };
}

// Environment validation
function validateEnvironment() {
  const required = ['APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('Please copy .env.example to .env and configure the required variables');
    return false;
  }
  
  return true;
}

// Main test runner
async function main() {
  console.log('🔍 Validating environment...\n');
  
  if (!validateEnvironment()) {
    process.exit(1);
  }

  try {
    await runTests();
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runTests, validateEnvironment, testCases };