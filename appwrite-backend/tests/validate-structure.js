#!/usr/bin/env node

/**
 * Structure Validation Test
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

console.log('🧪 Validating notification functions structure...\n');

let passed = 0;
let failed = 0;

functions.forEach(funcName => {
  const functionPath = path.join(__dirname, '..', 'functions', 'notifications', funcName);
  const mainFile = path.join(functionPath, 'src', 'main.js');
  const packageFile = path.join(functionPath, 'package.json');
  
  console.log(`🔍 Validating ${funcName}...`);
  
  try {
    // Check if directory exists
    if (!fs.existsSync(functionPath)) {
      throw new Error(`Directory not found: ${functionPath}`);
    }
    
    // Check if src directory exists
    const srcPath = path.join(functionPath, 'src');
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Src directory not found: ${srcPath}`);
    }
    
    // Check if main.js exists
    if (!fs.existsSync(mainFile)) {
      throw new Error(`Main file not found: ${mainFile}`);
    }
    
    // Check if package.json exists
    if (!fs.existsSync(packageFile)) {
      throw new Error(`Package.json not found: ${packageFile}`);
    }
    
    // Check package.json structure
    const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (!packageContent.name || !packageContent.version || !packageContent.dependencies) {
      throw new Error('Invalid package.json structure');
    }
    
    // Check if main.js has correct structure (without requiring it)
    const mainContent = fs.readFileSync(mainFile, 'utf8');
    if (!mainContent.includes('module.exports') && !mainContent.includes('export default')) {
      throw new Error('Main.js does not export a function');
    }
    
    console.log(`   ✅ ${funcName} structure is valid`);
    passed++;
    
  } catch (error) {
    console.error(`   ❌ ${funcName} failed: ${error.message}`);
    failed++;
  }
});

// Test notification templates
console.log('\n🔍 Validating notification templates...');
try {
  const templatesPath = path.join(__dirname, '..', 'utils', 'notification-templates.js');
  if (!fs.existsSync(templatesPath)) {
    throw new Error('Notification templates file not found');
  }
  
  const templatesContent = fs.readFileSync(templatesPath, 'utf8');
  if (!templatesContent.includes('generateNotification')) {
    throw new Error('Templates module missing required functions');
  }
  
  console.log('   ✅ Notification templates are valid');
  passed++;
} catch (error) {
  console.error(`   ❌ Templates validation failed: ${error.message}`);
  failed++;
}

// Test configuration
console.log('\n🔍 Validating configuration files...');
try {
  const configPath = path.join(__dirname, '..', 'config', 'notification-functions.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration file not found');
  }
  
  const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!configContent.functions || configContent.functions.length === 0) {
    throw new Error('Configuration file missing functions array');
  }
  
  // Validate each function in config
  configContent.functions.forEach(func => {
    if (!func.name || !func.runtime || !func.schedule) {
      throw new Error(`Invalid function configuration: ${JSON.stringify(func)}`);
    }
  });
  
  console.log('   ✅ Configuration file is valid');
  passed++;
} catch (error) {
  console.error(`   ❌ Configuration validation failed: ${error.message}`);
  failed++;
}

// Test deployment script
console.log('\n🔍 Validating deployment script...');
try {
  const deployPath = path.join(__dirname, '..', 'scripts', 'deploy-notifications.js');
  if (!fs.existsSync(deployPath)) {
    throw new Error('Deployment script not found');
  }
  
  const deployContent = fs.readFileSync(deployPath, 'utf8');
  if (!deployContent.includes('deployFunctions')) {
    throw new Error('Deployment script missing main function');
  }
  
  console.log('   ✅ Deployment script is valid');
  passed++;
} catch (error) {
  console.error(`   ❌ Deployment script validation failed: ${error.message}`);
  failed++;
}

console.log('\n📊 Validation Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📦 Total: ${functions.length + 3}`);

if (failed > 0) {
  console.log('\n🔧 Issues found:');
  console.log('   - Check file paths and permissions');
  console.log('   - Verify all required files exist');
  console.log('   - Check JSON syntax in configuration files');
  process.exit(1);
} else {
  console.log('\n🎉 All structure validations passed!');
  console.log('📋 Summary of created components:');
  console.log('   ✅ 7 notification functions created');
  console.log('   ✅ Function configuration files');
  console.log('   ✅ Notification templates utility');
  console.log('   ✅ Deployment and test scripts');
  console.log('   ✅ Package.json files for each function');
}