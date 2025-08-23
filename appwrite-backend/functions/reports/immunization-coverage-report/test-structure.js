#!/usr/bin/env node

/**
 * Simple test to verify the function structure
 * This script checks if the required files exist and have proper structure
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testStructure() {
  console.log('🔍 Testing immunization coverage report function structure...\n');
  
  try {
    // Check if all required files exist
    const requiredFiles = [
      'package.json',
      'src/main.js',
      'README.md',
      '.env.example'
    ];
    
    const missingFiles = requiredFiles.filter(file => !existsSync(join(__dirname, file)));
    
    if (missingFiles.length > 0) {
      throw new Error(`Missing files: ${missingFiles.join(', ')}`);
    }
    
    console.log('✅ All required files exist');
    
    // Check package.json structure
    const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
    
    const requiredFields = ['name', 'version', 'main', 'dependencies'];
    const missingFields = requiredFields.filter(field => !packageJson[field]);
    
    if (missingFields.length > 0) {
      console.warn(`⚠️  Missing package.json fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ package.json has all required fields');
    }
    
    // Check required dependencies
    const requiredDeps = ['node-appwrite', 'date-fns', 'node-cache'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length > 0) {
      console.warn(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
    } else {
      console.log('✅ All required dependencies are specified');
    }
    
    // Check main.js structure
    const mainJs = readFileSync(join(__dirname, 'src/main.js'), 'utf8');
    
    const requiredExports = ['export default'];
    const missingExports = requiredExports.filter(exp => !mainJs.includes(exp));
    
    if (missingExports.length > 0) {
      console.warn(`⚠️  Missing exports: ${missingExports.join(', ')}`);
    } else {
      console.log('✅ main.js has proper export structure');
    }
    
    // Check for key functions
    const requiredFunctions = [
      'calculateAgeInMonths',
      'getAgeGroup',
      'calculateCoverageMetrics',
      'fetchAllDocuments'
    ];
    
    const missingFunctions = requiredFunctions.filter(fn => !mainJs.includes(fn));
    
    if (missingFunctions.length > 0) {
      console.warn(`⚠️  Missing functions: ${missingFunctions.join(', ')}`);
    } else {
      console.log('✅ All required functions are present');
    }
    
    console.log('\n🎉 Structure test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Copy .env.example to .env and configure your Appwrite credentials');
    console.log('3. Deploy to Appwrite using the CLI or console');
    
  } catch (error) {
    console.error('❌ Structure test failed:', error.message);
    process.exit(1);
  }
}

testStructure();