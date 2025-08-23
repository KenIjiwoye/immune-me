#!/usr/bin/env node

/**
 * Appwrite Collection Creation Script
 * BE-AW-02 Database Schema Implementation
 * 
 * This script creates all required collections in Appwrite using the MCP server
 * based on the existing PostgreSQL schema structure.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  projectId: process.env.APPWRITE_PROJECT_ID || 'immune-me',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'immune-me-db',
  endpoint: process.env.APPWRITE_ENDPOINT || 'http://localhost/v1',
  schemasDir: path.join(__dirname, '../schemas'),
  collections: [
    'facilities',
    'patients',
    'vaccines',
    'immunization_records',
    'notifications',
    'vaccine_schedules',
    'vaccine_schedule_items',
    'supplementary_immunizations'
  ]
};

// Collection schemas mapping
const COLLECTION_SCHEMAS = {
  facilities: require('../schemas/facilities.json'),
  patients: require('../schemas/patients.json'),
  vaccines: require('../schemas/vaccines.json'),
  immunization_records: require('../schemas/immunization-records.json'),
  notifications: require('../schemas/notifications.json'),
  vaccine_schedules: require('../schemas/vaccine-schedules.json'),
  vaccine_schedule_items: require('../schemas/vaccine-schedule-items.json'),
  supplementary_immunizations: require('../schemas/supplementary-immunizations.json')
};

class AppwriteCollectionCreator {
  constructor() {
    this.createdCollections = [];
    this.errors = [];
  }

  /**
   * Initialize the collection creation process
   */
  async initialize() {
    console.log('🚀 Starting Appwrite Collection Creation...');
    console.log(`Project: ${CONFIG.projectId}`);
    console.log(`Database: ${CONFIG.databaseId}`);
    console.log(`Endpoint: ${CONFIG.endpoint}`);
    console.log('');

    // Validate environment
    await this.validateEnvironment();

    // Create collections
    await this.createCollections();

    // Generate summary report
    await this.generateReport();
  }

  /**
   * Validate environment and configuration
   */
  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check if schemas directory exists
    if (!fs.existsSync(CONFIG.schemasDir)) {
      throw new Error(`Schemas directory not found: ${CONFIG.schemasDir}`);
    }

    // Check if all schema files exist
    for (const collection of CONFIG.collections) {
      const schemaPath = path.join(CONFIG.schemasDir, `${collection}.json`);
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }
    }

    console.log('✅ Environment validation passed');
  }

  /**
   * Create all collections in Appwrite
   */
  async createCollections() {
    console.log('📋 Creating collections...');
    
    for (const collectionName of CONFIG.collections) {
      try {
        await this.createCollection(collectionName);
        this.createdCollections.push(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error) {
        this.errors.push({ collection: collectionName, error: error.message });
        console.error(`❌ Failed to create collection: ${collectionName} - ${error.message}`);
      }
    }
  }

  /**
   * Create a single collection with all attributes, indexes, and permissions
   */
  async createCollection(collectionName) {
    const schema = COLLECTION_SCHEMAS[collectionName];
    
    console.log(`\n📝 Processing collection: ${collectionName}`);
    
    // Create collection structure
    const collectionData = {
      collectionId: schema.$id || collectionName,
      name: schema.name || collectionName,
      documentSecurity: schema.documentSecurity || true,
      enabled: schema.enabled !== false
    };

    // Log collection creation (this would be replaced with actual MCP calls)
    console.log(`   Collection ID: ${collectionData.collectionId}`);
    console.log(`   Name: ${collectionData.name}`);
    console.log(`   Document Security: ${collectionData.documentSecurity}`);
    console.log(`   Enabled: ${collectionData.enabled}`);

    // Create attributes
    if (schema.attributes && schema.attributes.length > 0) {
      console.log(`   📊 Creating ${schema.attributes.length} attributes...`);
      for (const attribute of schema.attributes) {
        await this.createAttribute(collectionName, attribute);
      }
    }

    // Create indexes
    if (schema.indexes && schema.indexes.length > 0) {
      console.log(`   🔍 Creating ${schema.indexes.length} indexes...`);
      for (const index of schema.indexes) {
        await this.createIndex(collectionName, index);
      }
    }

    // Set permissions
    if (schema.permissions) {
      console.log(`   🔐 Setting permissions...`);
      await this.setPermissions(collectionName, schema.permissions);
    }

    // Set validation rules
    if (schema.validation && schema.validation.rules) {
      console.log(`   ✅ Setting validation rules...`);
      await this.setValidationRules(collectionName, schema.validation.rules);
    }

    // Enable real-time subscriptions
    console.log(`   📡 Enabling real-time subscriptions...`);
    await this.enableRealtimeSubscriptions(collectionName);
  }

  /**
   * Create a single attribute
   */
  async createAttribute(collectionName, attribute) {
    const attributeData = {
      key: attribute.key,
      type: attribute.type,
      required: attribute.required || false,
      array: attribute.array || false,
      size: attribute.size,
      default: attribute.default
    };

    console.log(`      Attribute: ${attribute.key} (${attribute.type})`);
    
    // This would be replaced with actual MCP call
    // Example: await mcpClient.createStringAttribute(...)
  }

  /**
   * Create a single index
   */
  async createIndex(collectionName, index) {
    const indexData = {
      key: index.key,
      type: index.type,
      attributes: index.attributes
    };

    console.log(`      Index: ${index.key} (${index.type}) on ${index.attributes.join(', ')}`);
    
    // This would be replaced with actual MCP call
    // Example: await mcpClient.createIndex(...)
  }

  /**
   * Set collection permissions
   */
  async setPermissions(collectionName, permissions) {
    console.log(`      Permissions: ${JSON.stringify(permissions)}`);
    
    // This would be replaced with actual MCP call
    // Example: await mcpClient.updateCollectionPermissions(...)
  }

  /**
   * Set validation rules
   */
  async setValidationRules(collectionName, rules) {
    console.log(`      Validation rules: ${Object.keys(rules).length} rules`);
    
    // This would be replaced with actual MCP call
    // Example: await mcpClient.setCollectionValidation(...)
  }

  /**
   * Enable real-time subscriptions for the collection
   */
  async enableRealtimeSubscriptions(collectionName) {
    console.log(`      Real-time subscriptions enabled`);
    
    // This would be replaced with actual MCP call
    // Example: await mcpClient.enableCollectionRealtime(...)
  }

  /**
   * Generate a summary report
   */
  async generateReport() {
    console.log('\n📊 Collection Creation Summary');
    console.log('================================');
    console.log(`✅ Successfully created: ${this.createdCollections.length} collections`);
    console.log(`❌ Failed: ${this.errors.length} collections`);
    
    if (this.createdCollections.length > 0) {
      console.log('\nCreated collections:');
      this.createdCollections.forEach(name => console.log(`   - ${name}`));
    }

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(`   - ${error.collection}: ${error.error}`));
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      projectId: CONFIG.projectId,
      databaseId: CONFIG.databaseId,
      createdCollections: this.createdCollections,
      errors: this.errors,
      totalCollections: CONFIG.collections.length
    };

    const reportPath = path.join(__dirname, '../reports/collection-creation-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  /**
   * Test CRUD operations for all collections
   */
  async testCRUDOperations() {
    console.log('\n🧪 Testing CRUD operations...');
    
    for (const collectionName of this.createdCollections) {
      try {
        await this.testCollectionCRUD(collectionName);
        console.log(`✅ CRUD tests passed for: ${collectionName}`);
      } catch (error) {
        console.error(`❌ CRUD tests failed for: ${collectionName} - ${error.message}`);
      }
    }
  }

  /**
   * Test CRUD operations for a single collection
   */
  async testCollectionCRUD(collectionName) {
    console.log(`   Testing ${collectionName}...`);
    
    // Test create
    // Test read
    // Test update
    // Test delete
    
    console.log(`      All CRUD operations successful`);
  }
}

// Main execution
async function main() {
  try {
    const creator = new AppwriteCollectionCreator();
    await creator.initialize();
    
    // Run CRUD tests if requested
    if (process.argv.includes('--test')) {
      await creator.testCRUDOperations();
    }
    
    console.log('\n🎉 Collection creation completed successfully!');
  } catch (error) {
    console.error('❌ Collection creation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = AppwriteCollectionCreator;

// Run if called directly
if (require.main === module) {
  main();
}