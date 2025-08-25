import { generateScheduledReports, healthCheck } from '../src/main.js';

async function runTests() {
  console.log('🧪 Running Scheduled Reports Tests...\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await healthCheck();
    console.log('   Health Status:', health);
    
    // Test 2: Generate Weekly Reports (with mock data)
    console.log('\n2. Testing weekly report generation...');
    process.env.SCHEDULE_TYPE = 'weekly';
    process.env.REPORT_RECIPIENTS = 'test@example.com';
    
    const reports = await generateScheduledReports('weekly');
    console.log(`   Generated ${reports.length} report types`);
    
    reports.forEach(report => {
      console.log(`   - ${report.name}: ${report.files.length} files`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}