#!/usr/bin/env node

/**
 * Notification Functions Deployment Script
 * Deploys all notification functions to Appwrite
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

// Function configurations
const functions = [
  {
    name: 'due-immunization-reminders',
    displayName: 'Due Immunization Reminders',
    description: 'Generates notifications for due and overdue immunizations',
    runtime: 'node-18.0',
    schedule: '0 8 * * *',
    timeout: 300
  },
  {
    name: 'email-sender',
    displayName: 'Email Notification Sender',
    description: 'Sends email notifications to patients',
    runtime: 'node-18.0',
    schedule: '*/15 * * * *',
    timeout: 600
  },
  {
    name: 'sms-sender',
    displayName: 'SMS Notification Sender',
    description: 'Sends SMS notifications to patients',
    runtime: 'node-18.0',
    schedule: '*/15 * * * *',
    timeout: 300
  },
  {
    name: 'push-notification-sender',
    displayName: 'Push Notification Sender',
    description: 'Sends push notifications to mobile app users',
    runtime: 'node-18.0',
    schedule: '*/15 * * * *',
    timeout: 300
  },
  {
    name: 'process-notification-queue',
    displayName: 'Process Notification Queue',
    description: 'Processes pending notifications and creates delivery tasks',
    runtime: 'node-18.0',
    schedule: '*/5 * * * *',
    timeout: 300
  },
  {
    name: 'schedule-notifications',
    displayName: 'Schedule Notifications',
    description: 'Schedules notifications based on patient preferences',
    runtime: 'node-18.0',
    schedule: '0 */6 * * *',
    timeout: 300
  },
  {
    name: 'cleanup-old-notifications',
    displayName: 'Cleanup Old Notifications',
    description: 'Archives and deletes old notifications',
    runtime: 'node-18.0',
    schedule: '0 2 * * 0',
    timeout: 600
  }
];

async function deployFunctions() {
  console.log('🚀 Starting notification functions deployment...\n');

  // Check if Appwrite CLI is available
  try {
    execSync('appwrite --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Appwrite CLI not found. Please install it first:');
    console.error('npm install -g appwrite-cli');
    process.exit(1);
  }

  // Check environment variables
  if (!APPWRITE_PROJECT_ID || !APPWRITE_ENDPOINT || !APPWRITE_API_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('APPWRITE_PROJECT_ID, APPWRITE_ENDPOINT, APPWRITE_API_KEY');
    process.exit(1);
  }

  let successCount = 0;
  let failureCount = 0;

  for (const func of functions) {
    try {
      console.log(`📦 Deploying ${func.displayName}...`);
      
      // Check if function already exists
      try {
        execSync(`appwrite functions get --functionId ${func.name}`, { stdio: 'pipe' });
        console.log(`   ⚠️  Function ${func.name} already exists, updating...`);
        
        // Update existing function
        execSync(`appwrite functions update --functionId ${func.name} --name "${func.displayName}" --description "${func.description}"`, { stdio: 'pipe' });
      } catch (error) {
        // Create new function
        execSync(`appwrite functions create --functionId ${func.name} --name "${func.displayName}" --description "${func.description}" --runtime ${func.runtime}`, { stdio: 'pipe' });
      }

      // Deploy function code
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', func.name);
      if (fs.existsSync(functionPath)) {
        execSync(`appwrite functions createDeployment --functionId ${func.name} --entrypoint src/main.js --code ${functionPath}`, { stdio: 'pipe' });
      } else {
        console.error(`   ❌ Function directory not found: ${functionPath}`);
        failureCount++;
        continue;
      }

      // Configure schedule if provided
      if (func.schedule) {
        execSync(`appwrite functions updateSchedule --functionId ${func.name} --schedule "${func.schedule}"`, { stdio: 'pipe' });
      }

      // Configure timeout
      execSync(`appwrite functions update --functionId ${func.name} --timeout ${func.timeout}`, { stdio: 'pipe' });

      console.log(`   ✅ ${func.displayName} deployed successfully`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ Failed to deploy ${func.displayName}: ${error.message}`);
      failureCount++;
    }
  }

  console.log('\n📊 Deployment Summary:');
  console.log(`   ✅ Successfully deployed: ${successCount}`);
  console.log(`   ❌ Failed to deploy: ${failureCount}`);
  console.log(`   📦 Total functions: ${functions.length}`);

  if (failureCount > 0) {
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check Appwrite CLI configuration');
    console.log('   - Verify environment variables');
    console.log('   - Check function code for errors');
    console.log('   - Ensure Appwrite project is accessible');
  }
}

// Run deployment
if (require.main === module) {
  deployFunctions().catch(console.error);
}

module.exports = { deployFunctions, functions };