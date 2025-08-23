#!/usr/bin/env node

/**
 * Schema Validation Script
 * Validates Appwrite collection schemas against PostgreSQL structure
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
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

class SchemaValidator {
  constructor() {
    this.validationResults = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Main validation process
   */
  async validate() {
    console.log('🔍 Starting schema validation...');
    
    for (const collectionName of CONFIG.collections) {
      try {
        await this.validateCollection(collectionName);
      } catch (error) {
        this.errors.push({ collection: collectionName, error: error.message });
      }
    }
    
    this.generateValidationReport();
  }

  /**
   * Validate a single collection schema
   */
  async validateCollection(collectionName) {
    console.log(`\n📋 Validating: ${collectionName}`);
    
    const schemaPath = path.join(CONFIG.schemasDir, `${collectionName}.json`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    const result = {
      collection: collectionName,
      valid: true,
      issues: []
    };
    
    // Validate required fields
    this.validateRequiredFields(schema, result);
    
    // Validate attributes
    this.validateAttributes(schema.attributes || [], result);
    
    // Validate indexes
    this.validateIndexes(schema.indexes || [], result);
    
    // Validate permissions
    this.validatePermissions(schema.permissions || {}, result);
    
    // Validate naming conventions
    this.validateNamingConventions(schema, result);
    
    this.validationResults.push(result);
    
    if (result.valid) {
      console.log(`   ✅ ${collectionName} is valid`);
    } else {
      console.log(`   ❌ ${collectionName} has issues`);
    }
  }

  /**
   * Validate required schema fields
   */
  validateRequiredFields(schema, result) {
    const requiredFields = ['$id', 'name', 'attributes'];
    
    for (const field of requiredFields) {
      if (!schema[field]) {
        result.valid = false;
        result.issues.push({
          type: 'missing_field',
          field,
          message: `Missing required field: ${field}`
        });
      }
    }
  }

  /**
   * Validate attributes
   */
  validateAttributes(attributes, result) {
    const attributeNames = new Set();
    
    for (const attr of attributes) {
      // Check for duplicate names
      if (attributeNames.has(attr.key)) {
        result.valid = false;
        result.issues.push({
          type: 'duplicate_attribute',
          attribute: attr.key,
          message: `Duplicate attribute name: ${attr.key}`
        });
      }
      attributeNames.add(attr.key);
      
      // Validate attribute structure
      this.validateAttributeStructure(attr, result);
    }
  }

  /**
   * Validate attribute structure
   */
  validateAttributeStructure(attr, result) {
    const required = ['key', 'type'];
    
    for (const field of required) {
      if (!attr[field]) {
        result.valid = false;
        result.issues.push({
          type: 'invalid_attribute',
          attribute: attr.key || 'unknown',
          message: `Missing required attribute field: ${field}`
        });
      }
    }
    
    // Validate type
    const validTypes = ['string', 'integer', 'float', 'boolean', 'datetime', 'email', 'enum', 'url', 'ip'];
    if (attr.type && !validTypes.includes(attr.type)) {
      result.valid = false;
      result.issues.push({
        type: 'invalid_type',
        attribute: attr.key,
        message: `Invalid attribute type: ${attr.type}`
      });
    }
    
    // Validate enum elements
    if (attr.type === 'enum' && (!attr.elements || !Array.isArray(attr.elements))) {
      result.valid = false;
      result.issues.push({
        type: 'invalid_enum',
        attribute: attr.key,
        message: 'Enum type must have elements array'
      });
    }
  }

  /**
   * Validate indexes
   */
  validateIndexes(indexes, result) {
    const indexNames = new Set();
    
    for (const index of indexes) {
      // Check for duplicate names
      if (indexNames.has(index.key)) {
        result.valid = false;
        result.issues.push({
          type: 'duplicate_index',
          index: index.key,
          message: `Duplicate index name: ${index.key}`
        });
      }
      indexNames.add(index.key);
      
      // Validate index structure
      this.validateIndexStructure(index, result);
    }
  }

  /**
   * Validate index structure
   */
  validateIndexStructure(index, result) {
    const required = ['key', 'type', 'attributes'];
    
    for (const field of required) {
      if (!index[field]) {
        result.valid = false;
        result.issues.push({
          type: 'invalid_index',
          index: index.key || 'unknown',
          message: `Missing required index field: ${field}`
        });
      }
    }
    
    // Validate type
    const validTypes = ['key', 'fulltext', 'unique', 'array'];
    if (index.type && !validTypes.includes(index.type)) {
      result.valid = false;
      result.issues.push({
        type: 'invalid_index_type',
        index: index.key,
        message: `Invalid index type: ${index.type}`
      });
    }
    
    // Validate attributes array
    if (index.attributes && !Array.isArray(index.attributes)) {
      result.valid = false;
      result.issues.push({
        type: 'invalid_index_attributes',
        index: index.key,
        message: 'Index attributes must be an array'
      });
    }
  }

  /**
   * Validate permissions
   */
  validatePermissions(permissions, result) {
    const validRoles = ['role:admin', 'role:healthcare_worker', 'role:patient', 'role:guest'];
    
    for (const [action, roles] of Object.entries(permissions)) {
      if (!Array.isArray(roles)) {
        result.valid = false;
        result.issues.push({
          type: 'invalid_permissions',
          action,
          message: `Permissions for ${action} must be an array`
        });
        continue;
      }
      
      for (const role of roles) {
        if (!validRoles.includes(role) && !role.startsWith('user:') && !role.startsWith('team:')) {
          this.warnings.push({
            type: 'unknown_role',
            role,
            message: `Unknown role in permissions: ${role}`
          });
        }
      }
    }
  }

  /**
   * Validate naming conventions
   */
  validateNamingConventions(schema, result) {
    // Check collection ID format
    if (schema.$id && !/^[a-z0-9_-]+$/.test(schema.$id)) {
      result.valid = false;
      result.issues.push({
        type: 'invalid_collection_id',
        id: schema.$id,
        message: 'Collection ID must contain only lowercase letters, numbers, hyphens, and underscores'
      });
    }
    
    // Check attribute naming
    for (const attr of schema.attributes || []) {
      if (!/^[a-z0-9_]+$/.test(attr.key)) {
        result.valid = false;
        result.issues.push({
          type: 'invalid_attribute_name',
          attribute: attr.key,
          message: 'Attribute name must contain only lowercase letters, numbers, and underscores'
        });
      }
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    console.log('\n📊 Validation Summary');
    console.log('=====================');
    
    const validCount = this.validationResults.filter(r => r.valid).length;
    const totalCount = this.validationResults.length;
    
    console.log(`✅ Valid collections: ${validCount}/${totalCount}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    
    // Detailed results
    if (this.validationResults.length > 0) {
      console.log('\n📋 Detailed Results:');
      for (const result of this.validationResults) {
        const status = result.valid ? '✅' : '❌';
        console.log(`   ${status} ${result.collection}`);
        
        if (result.issues.length > 0) {
          for (const issue of result.issues) {
            console.log(`      - ${issue.message}`);
          }
        }
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of this.warnings) {
        console.log(`   - ${warning.message}`);
      }
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalCount,
        valid: validCount,
        errors: this.errors.length,
        warnings: this.warnings.length
      },
      results: this.validationResults,
      errors: this.errors,
      warnings: this.warnings
    };
    
    const reportPath = path.join(__dirname, '../reports/schema-validation-report.json');
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(reportsDir, 'SCHEMA_VALIDATION_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    return `# Schema Validation Report

## Summary
- **Total Collections**: ${report.summary.total}
- **Valid Collections**: ${report.summary.valid}
- **Errors**: ${report.summary.errors}
- **Warnings**: ${report.summary.warnings}
- **Timestamp**: ${report.timestamp}

## Validation Results

${report.results.map(result => `
### ${result.collection}
- **Status**: ${result.valid ? '✅ Valid' : '❌ Invalid'}
- **Issues**: ${result.issues.length}

${result.issues.map(issue => `- ${issue.message}`).join('\n')}
`).join('\n')}

## Errors
${report.errors.length > 0 
  ? report.errors.map(error => `- ${error.error}`).join('\n')
  : '- No errors'}

## Warnings
${report.warnings.length > 0 
  ? report.warnings.map(warning => `- ${warning.message}`).join('\n')
  : '- No warnings'}

## Recommendations
1. Fix all errors before proceeding with collection creation
2. Review warnings for potential improvements
3. Ensure all collections follow naming conventions
4. Verify permissions are correctly configured
`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Schema Validation Script

Usage: node validate-schemas.js [options]

Options:
  --help, -h  Show this help message

Validates all collection schemas against Appwrite requirements and best practices.
    `);
    return;
  }

  const validator = new SchemaValidator();
  await validator.validate();
}

// Export for use as module
module.exports = SchemaValidator;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}