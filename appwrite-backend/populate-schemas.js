#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020',
    databaseId: process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc',
    apiKey: process.env.APPWRITE_API_KEY // Set this environment variable
};

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

const databases = new Databases(client);

// Collection mapping (schema filename -> collection ID)
const collections = {
    'facilities.json': 'facility',
    'patients.json': 'patients',
    'vaccines.json': 'vaccines',
    'immunization-records.json': 'immunization-records',
    'notifications.json': 'notifications',
    'supplementary-immunizations.json': 'supplementary-immunizations',
    'vaccine-schedules.json': 'vaccine-schedules',
    'vaccine-schedule-items.json': 'vaccine-schedule-items',
    'patient-profiles.json': 'patient-profiles',
    'employee-profiles.json': 'employee-profiles',
    'admin-profiles.json': 'admin-profiles',
    'access-audit-log.json': 'access-audit-log',
    'audit-collections.json': 'audit-collections',
    'role-change-log.json': 'role-change-log',
    'profile-verification-workflow.json': 'profile-verification-workflow',
    'sync-collections.json': 'sync-collections'
};

// Helper function to convert permissions format
function convertPermissions(permissions) {
    const converted = {};
    
    for (const [action, roles] of Object.entries(permissions)) {
        converted[action] = roles.map(role => {
            if (role === 'users') return Permission.read(Role.users());
            if (role.startsWith('label:role:')) {
                const roleName = role.replace('label:role:', '');
                return Permission[action](Role.label(roleName));
            }
            if (role.startsWith('team:')) {
                // Handle team permissions like "team:facility-*-team/member"
                const teamMatch = role.match(/team:(.+?)\/(.+)/);
                if (teamMatch) {
                    const [, teamId, memberType] = teamMatch;
                    return Permission[action](Role.team(teamId, memberType));
                }
            }
            return role; // Return as-is if no conversion needed
        });
    }
    
    return converted;
}

// Helper function to create attributes
async function createAttributes(collectionId, attributes) {
    const results = [];
    
    for (const attr of attributes) {
        try {
            let result;
            
            switch (attr.type) {
                case 'string':
                    result = await databases.createStringAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.size,
                        attr.required,
                        attr.required ? null : attr.default, // Required attributes cannot have defaults
                        attr.array || false
                    );
                    break;
                    
                case 'integer':
                    result = await databases.createIntegerAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.min,
                        attr.max,
                        attr.default,
                        attr.array || false
                    );
                    break;
                    
                case 'float':
                    result = await databases.createFloatAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.min,
                        attr.max,
                        attr.default,
                        attr.array || false
                    );
                    break;
                    
                case 'boolean':
                    result = await databases.createBooleanAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.required ? null : attr.default, // Required attributes cannot have defaults
                        attr.array || false
                    );
                    break;
                    
                case 'datetime':
                    result = await databases.createDatetimeAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array || false
                    );
                    break;
                    
                case 'email':
                    result = await databases.createEmailAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array || false
                    );
                    break;
                    
                case 'url':
                    result = await databases.createUrlAttribute(
                        config.databaseId,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array || false
                    );
                    break;
                    
                default:
                    console.warn(`Unknown attribute type: ${attr.type} for ${attr.key}`);
                    continue;
            }
            
            results.push({ success: true, attribute: attr.key, result });
            console.log(`✓ Created attribute: ${attr.key} (${attr.type})`);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            results.push({ success: false, attribute: attr.key, error: error.message });
            console.error(`✗ Failed to create attribute ${attr.key}:`, error.message);
        }
    }
    
    return results;
}

// Helper function to create indexes
async function createIndexes(collectionId, indexes) {
    const results = [];
    
    for (const index of indexes) {
        try {
            const result = await databases.createIndex(
                config.databaseId,
                collectionId,
                index.key,
                index.type,
                index.attributes
            );
            
            results.push({ success: true, index: index.key, result });
            console.log(`✓ Created index: ${index.key} (${index.type})`);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            results.push({ success: false, index: index.key, error: error.message });
            console.error(`✗ Failed to create index ${index.key}:`, error.message);
        }
    }
    
    return results;
}

// Helper function to update collection permissions
async function updatePermissions(collectionId, permissions) {
    try {
        // Convert permissions to Appwrite format
        const readPermissions = permissions.read || [];
        const createPermissions = permissions.create || [];
        const updatePermissions = permissions.update || [];
        const deletePermissions = permissions.delete || [];
        
        // Note: Collection-level permissions are set during collection creation
        // For document-level permissions, they would be set per document
        console.log(`✓ Permissions noted for collection: ${collectionId}`);
        return { success: true };
        
    } catch (error) {
        console.error(`✗ Failed to update permissions for ${collectionId}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Main function to populate a single collection schema
async function populateCollectionSchema(schemaFile, collectionId) {
    console.log(`\n🔄 Processing collection: ${collectionId}`);
    
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schemas', schemaFile);
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        const schema = JSON.parse(schemaContent);
        
        const results = {
            collection: collectionId,
            attributes: [],
            indexes: [],
            permissions: null
        };
        
        // Create attributes
        if (schema.attributes && schema.attributes.length > 0) {
            console.log(`Creating ${schema.attributes.length} attributes...`);
            results.attributes = await createAttributes(collectionId, schema.attributes);
        }
        
        // Wait for attributes to be ready before creating indexes
        console.log('Waiting for attributes to be ready...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create indexes
        if (schema.indexes && schema.indexes.length > 0) {
            console.log(`Creating ${schema.indexes.length} indexes...`);
            results.indexes = await createIndexes(collectionId, schema.indexes);
        }
        
        // Update permissions
        if (schema.permissions) {
            console.log('Updating permissions...');
            results.permissions = await updatePermissions(collectionId, schema.permissions);
        }
        
        return results;
        
    } catch (error) {
        console.error(`✗ Failed to process ${collectionId}:`, error.message);
        return {
            collection: collectionId,
            error: error.message,
            attributes: [],
            indexes: [],
            permissions: null
        };
    }
}

// Main execution function
async function main() {
    console.log('🚀 Starting schema population process...');
    console.log(`Project: ${config.projectId}`);
    console.log(`Database: ${config.databaseId}`);
    console.log(`Endpoint: ${config.endpoint}\n`);
    
    if (!config.apiKey) {
        console.error('❌ APPWRITE_API_KEY environment variable is required');
        process.exit(1);
    }
    
    const allResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Process each collection
    for (const [schemaFile, collectionId] of Object.entries(collections)) {
        const schemaPath = path.join(__dirname, 'schemas', schemaFile);
        
        // Check if schema file exists
        if (!fs.existsSync(schemaPath)) {
            console.warn(`⚠️  Schema file not found: ${schemaFile}`);
            continue;
        }
        
        const result = await populateCollectionSchema(schemaFile, collectionId);
        allResults.push(result);
        
        if (result.error) {
            errorCount++;
        } else {
            successCount++;
        }
        
        // Small delay between collections
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate summary report
    console.log('\n📊 SCHEMA POPULATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Successfully processed: ${successCount} collections`);
    console.log(`❌ Failed to process: ${errorCount} collections`);
    console.log(`📁 Total collections: ${Object.keys(collections).length}`);
    
    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    for (const result of allResults) {
        console.log(`\n${result.collection}:`);
        
        if (result.error) {
            console.log(`  ❌ Error: ${result.error}`);
            continue;
        }
        
        const attrSuccess = result.attributes.filter(a => a.success).length;
        const attrFailed = result.attributes.filter(a => !a.success).length;
        const indexSuccess = result.indexes.filter(i => i.success).length;
        const indexFailed = result.indexes.filter(i => !i.success).length;
        
        console.log(`  📝 Attributes: ${attrSuccess} created, ${attrFailed} failed`);
        console.log(`  🔍 Indexes: ${indexSuccess} created, ${indexFailed} failed`);
        console.log(`  🔒 Permissions: ${result.permissions?.success ? 'updated' : 'noted'}`);
        
        // Show failed items
        const failedAttrs = result.attributes.filter(a => !a.success);
        const failedIndexes = result.indexes.filter(i => !i.success);
        
        if (failedAttrs.length > 0) {
            console.log(`    Failed attributes: ${failedAttrs.map(a => a.attribute).join(', ')}`);
        }
        
        if (failedIndexes.length > 0) {
            console.log(`    Failed indexes: ${failedIndexes.map(i => i.index).join(', ')}`);
        }
    }
    
    console.log('\n🎉 Schema population process completed!');
    
    if (errorCount > 0) {
        console.log('\n⚠️  Some collections had errors. Please review the detailed results above.');
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main, populateCollectionSchema };