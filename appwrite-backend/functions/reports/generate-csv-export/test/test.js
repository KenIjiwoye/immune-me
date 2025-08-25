import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.warn('No .env file found, using environment variables');
}

// Mock Appwrite function context
const mockContext = {
  req: {
    method: 'POST',
    body: JSON.stringify({
      reportType: 'immunization_coverage',
      dateRange: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    })
  },
  res: {
    json: (data, status = 200) => {
      console.log('Response:', JSON.stringify(data, null, 2));
      console.log('Status:', status);
      return { data, status };
    }
  },
  log: (...args) => console.log('[LOG]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Import the function
import main from '../src/main.js';

async function runTest() {
  console.log('🧪 Testing CSV Export Function...\n');

  try {
    const result = await main(mockContext);
    console.log('\n✅ Test completed successfully');
    
    if (result.data.success) {
      console.log('📊 Report generated:', result.data.data);
    } else {
      console.log('❌ Report generation failed:', result.data.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test different report types
const testCases = [
  {
    name: 'Immunization Coverage Report',
    body: {
      reportType: 'immunization_coverage',
      dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' }
    }
  },
  {
    name: 'Facility Performance Report',
    body: {
      reportType: 'facility_performance',
      dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' }
    }
  },
  {
    name: 'Due Immunizations Report',
    body: {
      reportType: 'due_immunizations',
      dateRange: { startDate: '2024-08-01', endDate: '2024-12-31' }
    }
  },
  {
    name: 'Age Distribution Report',
    body: {
      reportType: 'age_distribution',
      dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' }
    }
  },
  {
    name: 'Vaccine Usage Report',
    body: {
      reportType: 'vaccine_usage',
      dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' }
    }
  }
];

async function runAllTests() {
  console.log('🧪 Running comprehensive CSV export tests...\n');

  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    
    const testContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        body: JSON.stringify(testCase.body)
      }
    };

    try {
      const result = await main(testContext);
      
      if (result.data.success) {
        console.log(`✅ ${testCase.name}: SUCCESS`);
        console.log(`   Records: ${result.data.data.recordCount}`);
        console.log(`   File: ${result.data.data.fileName}`);
        console.log(`   Size: ${result.data.data.fileSize} bytes`);
      } else {
        console.log(`❌ ${testCase.name}: FAILED - ${result.data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
    }
  }

  console.log('\n🎯 All tests completed!');
}

// Run tests based on command line argument
const testType = process.argv[2] || 'single';

if (testType === 'all') {
  runAllTests();
} else {
  runTest();
}