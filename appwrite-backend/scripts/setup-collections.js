#!/usr/bin/env node

/**
 * Appwrite Collection Setup Script
 * BE-AW-02 Database Schema Implementation
 * 
 * This script uses the Appwrite SDK to create collections based on the existing schemas
 */

const { Client, Databases, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  projectId: process.env.APPWRITE_PROJECT_ID || 'immune-me',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'immune-me-db',
  endpoint: process.env.APPWRITE_ENDPOINT || 'http://localhost/v1',
  apiKey: process.env.APPWRITE_API_KEY,
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

class CollectionSetup {
  constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    this.createdCollections = [];
    this.errors = [];
  }

  /**
   * Initialize Appwrite client
   */
  initializeClient() {
    if (!CONFIG.apiKey) {
      throw new Error('APPWRITE_API_KEY environment variable is required');
    }

    this.client
      .setEndpoint(CONFIG.endpoint)
      .setProject(CONFIG.projectId)
      .setKey(CONFIG.apiKey);

    console.log('✅ Appwrite client initialized');
  }

  /**
   * Main setup process
   */
  async setup() {
    console.log('🚀 Starting Appwrite Collection Setup...');
    console.log(`Project: ${CONFIG.projectId}`);
    console.log(`Database: ${CONFIG.databaseId}`);
    console.log(`Endpoint: ${CONFIG.endpoint}`);
    console.log('');

    try {
      // Initialize client
      this.initializeClient();

      // Verify database exists
      await this.verifyDatabase();

      // Load and create collections
      await this.createAllCollections();

      // Generate report
      await this.generateReport();

      console.log('\n🎉 Collection setup completed successfully!');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Verify database exists
   */
  async verifyDatabase() {
    try {
      await this.databases.get(CONFIG.databaseId);
      console.log('✅ Database verified');
    } catch (error) {
      throw new Error(`Database ${CONFIG.databaseId} not found: ${error.message}`);
    }
  }

  /**
   * Create all collections
   */
  async createAllCollections() {
    console.log('📋 Creating collections...');
    
    for (const collectionName of CONFIG.collections) {
      try {
        await this.createCollection(collectionName);
        this.createdCollections.push(collectionName);
        console.log(`✅ Created: ${collectionName}`);
      } catch (error) {
        this.errors.push({ collection: collectionName, error: error.message });
        console.error(`❌ Failed: ${collectionName} - ${error.message}`);
      }
    }
  }

  /**
   * Create a single collection with all attributes and indexes
   */
  async createCollection(collectionName) {
    const schemaPath = path.join(CONFIG.schemasDir, `${collectionName}.json`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    console.log(`\n📝 Processing: ${collectionName}`);

    // Create collection
    const collection = await this.databases.createCollection(
      CONFIG.databaseId,
      schema.$id || collectionName,
      schema.name || collectionName,
      schema.permissions || ["role:admin"],
      schema.documentSecurity !== false
    );

    // Create attributes
    if (schema.attributes && schema.attributes.length > 0) {
      console.log(`   📊 Creating ${schema.attributes.length} attributes...`);
      for (const attribute of schema.attributes) {
        await this.createAttribute(collection.$id, attribute);
      }
    }

    // Create indexes
    if (schema.indexes && schema.indexes.length > 0) {
      console.log(`   🔍 Creating ${schema.indexes.length} indexes...`);
      for (const index of schema.indexes) {
        await this.createIndex(collection.$id, index);
      }
    }

    return collection;
  }

  /**
   * Create an attribute based on type
   */
  async createAttribute(collectionId, attribute) {
    const params = {
      databaseId: CONFIG.databaseId,
      collectionId,
      key: attribute.key,
      required: attribute.required || false,
      array: attribute.array || false,
      default: attribute.default
    };

    switch (attribute.type) {
      case 'string':
        return await this.databases.createStringAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          attribute.size || 255,
          params.required,
          params.default,
          params.array
        );

      case 'integer':
        return await this.databases.createIntegerAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          params.required,
          attribute.min,
          attribute.max,
          params.default,
          params.array
        );

      case 'float':
        return await this.databases.createFloatAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          params.required,
          attribute.min,
          attribute.max,
          params.default,
          params.array
        );

      case 'boolean':
        return await this.databases.createBooleanAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          params.required,
          params.default,
          params.array
        );

      case 'datetime':
        return await this.databases.createDatetimeAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          params.required,
          params.default,
          params.array
        );

      case 'email':
        return await this.databases.createEmailAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          params.required,
          params.default,
          params.array
        );

      case 'enum':
        return await this.databases.createEnumAttribute(
          params.databaseId,
          params.collectionId,
          params.key,
          attribute.elements || [],
          params.required,
          params.default,
          params.array
        );

      default:
        throw new Error(`Unsupported attribute type: ${attribute.type}`);
    }
  }

  /**
   * Create an index
   */
  async createIndex(collectionId, index) {
    return await this.databases.createIndex(
      CONFIG.databaseId,
      collectionId,
      index.key,
      index.type,
      index.attributes,
      index.orders || []
    );
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      projectId: CONFIG.projectId,
      databaseId: CONFIG.databaseId,
      endpoint: CONFIG.endpoint,
      createdCollections: this.createdCollections,
      errors: this.errors,
      totalCollections: CONFIG.collections.length,
      successRate: (this.createdCollections.length / CONFIG.collections.length * 100).toFixed(1) + '%'
    };

    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save JSON report
    const jsonReportPath = path.join(reportsDir, 'collection-setup-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Save markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(reportsDir, 'COLLECTION_SETUP_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`   - JSON: ${jsonReportPath}`);
    console.log(`   - Markdown: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Appwrite Collection Setup Report

## Summary
- **Total Collections**: ${report.totalCollections}
- **Successfully Created**: ${report.createdCollections.length}
- **Failed**: ${report.errors.length}
- **Success Rate**: ${report.successRate}
- **Timestamp**: ${report.timestamp}

## Environment
- **Project ID**: ${report.projectId}
- **Database ID**: ${report.databaseId}
- **Endpoint**: ${report.endpoint}

## Created Collections
${report.createdCollections.map(name => `- ✅ ${name}`).join('\n')}

## Errors
${report.errors.length > 0 
  ? report.errors.map(error => `- ❌ ${error.collection}: ${error.error}`).join('\n')
  : '- No errors'}

## Collection Details
${this.getCollectionDetails()}

## Next Steps
1. Verify collections in Appwrite Console
2. Test CRUD operations
3. Set up real-time subscriptions
4. Configure additional security rules
`;
  }

  /**
   * Get detailed collection information
   */
  getCollectionDetails() {
    let details = '';
    
    for (const collectionName of this.createdCollections) {
      const schemaPath = path.join(CONFIG.schemasDir, `${collectionName}.json`);
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      
      details += `\n### ${collectionName}\n`;
      details += `- **Attributes**: ${schema.attributes?.length || 0}\n`;
      details += `- **Indexes**: ${schema.indexes?.length || 0}\n`;
      details += `- **Permissions**: ${JSON.stringify(schema.permissions || {})}\n`;
    }
    
    return details;
  }

  /**
   * Test CRUD operations for all collections
   */
  async testCRUDOperations() {
    console.log('\n🧪 Testing CRUD operations...');
    
    const testResults = [];
    
    for (const collectionName of this.createdCollections) {
      try {
        console.log(`   Testing ${collectionName}...`);
        
        const result = await this.testCollection(collectionName);
        testResults.push({ collection: collectionName, ...result });
        
        console.log(`   ✅ Tests passed for ${collectionName}`);
        
      } catch (error) {
        testResults.push({
          collection: collectionName,
          status: 'failed',
          error: error.message
        });
        console.error(`   ❌ Tests failed for ${collectionName}: ${error.message}`);
      }
    }
    
    // Save test results
    const reportsDir = path.join(__dirname, '../reports');
    const testReportPath = path.join(reportsDir, 'crud-test-results.json');
    fs.writeFileSync(testReportPath, JSON.stringify(testResults, null, 2));
    
    console.log(`📄 Test results saved to: ${testReportPath}`);
    return testResults;
  }

  /**
   * Test a single collection
   */
  async testCollection(collectionName) {
    const collectionId = collectionName;
    
    // Test create
    const testDoc = await this.createTestDocument(collectionId);
    
    // Test read
    const readDoc = await this.databases.getDocument(
      CONFIG.databaseId,
      collectionId,
      testDoc.$id
    );
    
    // Test update
    const updatedDoc = await this.databases.updateDocument(
      CONFIG.databaseId,
      collectionId,
      testDoc.$id,
      { test_field: 'updated' }
    );
    
    // Test delete
    await this.databases.deleteDocument(
      CONFIG.databaseId,
      collectionId,
      testDoc.$id
    );
    
    return {
      status: 'passed',
      documentId: testDoc.$id,
      operations: ['create', 'read', 'update', 'delete']
    };
  }

  /**
   * Create a test document based on collection type
   */
  async createTestDocument(collectionId) {
    let testData = {};
    
    switch (collectionId) {
      case 'facilities':
        testData = {
          name: 'Test Facility',
          district: 'Test District',
          address: '123 Test Street',
          contact_phone: '+1234567890'
        };
        break;
        
      case 'patients':
        testData = {
          full_name: 'Test Patient',
          sex: 'M',
          date_of_birth: '2020-01-01',
          district: 'Test District',
          address: '123 Test Street',
          facility_id: ID.unique()
        };
        break;
        
      case 'vaccines':
        testData = {
          name: 'Test Vaccine',
          vaccine_code: 'TEST',
          is_active: true
        };
        break;
        
      default:
        testData = { test_field: 'test_value' };
    }
    
    return await this.databases.createDocument(
      CONFIG.databaseId,
      collectionId,
      ID.unique(),
      testData
    );
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    test: args.includes('--test'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log(`
Appwrite Collection Setup Script

Usage: node setup-collections.js [options]

Options:
  --test      Run CRUD tests after creation
  --verbose   Enable verbose logging
  --help, -h  Show this help message

Environment Variables:
  APPWRITE_PROJECT_ID     Appwrite project ID (default: immune-me)
  APPWRITE_DATABASE_ID    Appwrite database ID (default: immune-me-db)
  APPWRITE_ENDPOINT       Appwrite endpoint (default: http://localhost/v1)
  APPWRITE_API_KEY        Appwrite API key (required)
    `);
    return;
  }

  const setup = new CollectionSetup();
  await setup.setup();
  
  if (options.test) {
    await setup.testCRUDOperations();
  }
}

// Export for use as module
module.exports = CollectionSetup;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}