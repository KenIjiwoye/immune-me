#!/usr/bin/env node

/**
 * Simple Notification Functions Test
 * Validates all notification functions exist and have correct structure
 */

const fs = require('fs');
const path = require('path');

const functions = [
  'due-immunization-reminders',
  'email-sender',
  'sms-sender',
  'push-notification-sender',
  'process-notification-queue',
  'cleanup-old-notifications',
  'schedule-notifications'
];

console.log('🧪 Testing notification functions...\n');

let passed = 0;
let failed = 0;

functions.forEach(funcName => {
  const functionPath = path.join(__dirname, '..', 'functions', 'notifications', funcName);
  const mainFile = path.join(functionPath, 'src', 'main.js');
  const packageFile = path.join(functionPath, 'package.json');
  
  console.log(`🔍 Testing ${funcName}...`);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(functionPath)) {
      throw new Error(`Directory not found: ${functionPath}`);
    }
    
    // Check if main.js exists
    if (!fs.existsSync(mainFile)) {
      throw new Error(`Main file not found: ${mainFile}`);
    }
    
    // Check if package.json exists
    if (!fs.existsSync(packageFile)) {
      throw new Error(`Package.json not found: ${packageFile}`);
    }
    
    // Check if main.js exports a function
    const functionModule = require(mainFile);
    if (typeof functionModule !== 'function') {
      throw new Error('Main.js does not export a valid function');
    }
    
    console.log(`   ✅ ${funcName} is valid`);
    passed++;
    
  } catch (error) {
    console.error(`   ❌ ${funcName} failed: ${error.message}`);
    failed++;
  }
});

console.log('\n📊 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📦 Total: ${functions.length}`);

// Test notification templates
console.log('\n🔍 Testing notification templates...');
try {
  const templatesPath = path.join(__dirname, '..', 'utils', 'notification-templates.js');
  if (!fs.existsSync(templatesPath)) {
    throw new Error('Notification templates file not found');
  }
  
  const templates = require(templatesPath);
  if (!templates.generateNotification) {
    throw new Error('Templates module missing required functions');
  }
  
  console.log('   ✅ Notification templates are valid');
  passed++;
} catch (error) {
  console.error(`   ❌ Templates test failed: ${error.message}`);
  failed++;
}

// Test configuration
console.log('\n🔍 Testing configuration files...');
try {
  const configPath = path.join(__dirname, '..', 'config', 'notification-functions.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration file not found');
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.functions || config.functions.length === 0) {
    throw new Error('Configuration file missing functions array');
  }
  
  console.log('   ✅ Configuration file is valid');
  passed++;
} catch (error) {
  console.error(`   ❌ Configuration test failed: ${error.message}`);
  failed++;
}

console.log('\n🎯 Final Results:');
console.log(`   ✅ Total Passed: ${passed}`);
console.log(`   ❌ Total Failed: ${failed}`);
console.log(`   📦 Total Tests: ${functions.length + 2}`);

if (failed > 0) {
  console.log('\n🔧 Troubleshooting:');
  console.log('   - Check file permissions');
  console.log('   - Verify all required files exist');
  console.log('   - Check Node.js modules are installed');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Ready for deployment.');
}