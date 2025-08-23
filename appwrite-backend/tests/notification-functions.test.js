#!/usr/bin/env node

/**
 * Notification Functions Test Suite
 * Tests all notification functions for proper functionality
 */

const fs = require('fs');
const path = require('path');

class NotificationTestSuite {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 Starting notification functions test suite...\n');

    try {
      await this.testDueImmunizationReminders();
      await this.testEmailSender();
      await this.testSMSSender();
      await this.testPushNotificationSender();
      await this.testQueueProcessor();
      await this.testCleanupFunction();
      await this.testSchedulerFunction();
      await this.testNotificationTemplates();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testDueImmunizationReminders() {
    console.log('🔍 Testing due immunization reminders function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'due-immunization-reminders', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ Due immunization reminders function structure is valid');
      this.testResults.push({ name: 'due-immunization-reminders', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ Due immunization reminders test failed: ${error.message}`);
      this.testResults.push({ name: 'due-immunization-reminders', status: 'fail', error: error.message });
    }
  }

  async testEmailSender() {
    console.log('🔍 Testing email sender function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'email-sender', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ Email sender function structure is valid');
      this.testResults.push({ name: 'email-sender', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ Email sender test failed: ${error.message}`);
      this.testResults.push({ name: 'email-sender', status: 'fail', error: error.message });
    }
  }

  async testSMSSender() {
    console.log('🔍 Testing SMS sender function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'sms-sender', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ SMS sender function structure is valid');
      this.testResults.push({ name: 'sms-sender', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ SMS sender test failed: ${error.message}`);
      this.testResults.push({ name: 'sms-sender', status: 'fail', error: error.message });
    }
  }

  async testPushNotificationSender() {
    console.log('🔍 Testing push notification sender function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'push-notification-sender', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ Push notification sender function structure is valid');
      this.testResults.push({ name: 'push-notification-sender', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ Push notification sender test failed: ${error.message}`);
      this.testResults.push({ name: 'push-notification-sender', status: 'fail', error: error.message });
    }
  }

  async testQueueProcessor() {
    console.log('🔍 Testing notification queue processor function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'process-notification-queue', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ Queue processor function structure is valid');
      this.testResults.push({ name: 'process-notification-queue', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ Queue processor test failed: ${error.message}`);
      this.testResults.push({ name: 'process-notification-queue', status: 'fail', error: error.message });
    }
  }

  async testCleanupFunction() {
    console.log('🔍 Testing cleanup function...');
    
    try {
      const functionPath = path.join(__dirname, '..', 'functions', 'notifications', 'cleanup-old-notifications', 'src', 'main.js');
      
      if (!fs.existsSync(functionPath)) {
        throw new Error(`Function file not found: ${functionPath}`);
      }

      // Test function structure
      const functionModule = require(functionPath);
      
      if (typeof functionModule !== 'function') {
        throw new Error('Function does not export a valid handler');
      }

      console.log('   ✅ Cleanup function structure is valid');
      this.testResults.push({ name: 'cleanup-old-notifications', status: 'pass' });
      
    } catch (error) {
      console.error(`   ❌ Cleanup function test failed: ${error.message}`);
      this.testResults.push({ name: 'cleanup-old-notifications', status: 'fail', error: error.message });
    }
  }

  async testSchedulerFunction() {
    console.log('