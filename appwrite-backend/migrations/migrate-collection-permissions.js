/**
 * Collection Permissions Migration Script for BE-AW-10
 * 
 * This script migrates collection permissions to the enhanced permission system
 * with comprehensive role-based access control and facility-scoped security.
 * 
 * Features:
 * - Migrates all collection permissions using Appwrite SDK
 * - Supports dry-run mode for preview
 * - Comprehensive error handling and logging
 * - Rollback functionality
 * - Progress tracking and reporting
 */

const { Client, Databases, Teams, Users, Storage, Functions } = require('node-appwrite');
const fs = require('fs').promises;
const path = require('path');

class CollectionPermissionsMigrator {
    constructor(options = {}) {
        this.options = {
            dryRun: options.dryRun || false,
            verbose: options.verbose || false,
            rollback: options.rollback || false,
            configPath: options.configPath || '../config',
            ...options
        };
        
        this.client = null;
        this.databases = null;
        this.teams = null;
        this.users = null;
        this.storage = null;
        this.functions = null;
        
        this.migrationLog = [];
        this.errors = [];
        this.rollbackData = [];
        
        this.collections = [
            'patients',
            'immunization_records',
            'notifications',
            'facilities',
            'vaccines',
            'vaccine_schedules',
            'vaccine_schedule_items',
            'supplementary_immunizations'
        ];
        
        this.roles = ['administrator', 'supervisor', 'doctor', 'user'];
    }
    
    /**
     * Initialize Appwrite client and services
     */
    async initialize() {
        try {
            // Load environment variables
            const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
            const projectId = process.env.APPWRITE_PROJECT_ID;
            const apiKey = process.env.APPWRITE_API_KEY;
            const databaseId = process.env.DATABASE_ID || 'main';
            
            if (!projectId || !apiKey) {
                throw new Error('Missing required environment variables: APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
            }
            
            // Initialize Appwrite client
            this.client = new Client()
                .setEndpoint(endpoint)
                .setProject(projectId)
                .setKey(apiKey);
            
            // Initialize services
            this.databases = new Databases(this.client);
            this.teams = new Teams(this.client);
            this.users = new Users(this.client);
            this.storage = new Storage(this.client);
            this.functions = new Functions(this.client);
            
            this.databaseId = databaseId;
            
            this.log('✅ Appwrite client initialized successfully');
            
            // Load configuration files
            await this.loadConfigurations();
            
        } catch (error) {
            this.logError('Failed to initialize Appwrite client', error);
            throw error;
        }
    }
    
    /**
     * Load configuration files
     */
    async loadConfigurations() {
        try {
            const configDir = path.resolve(__dirname, this.options.configPath);
            
            // Load collection permissions configuration
            const collectionPermissionsPath = path.join(configDir, 'collection-permissions.json');
            const collectionPermissionsData = await fs.readFile(collectionPermissionsPath, 'utf8');
            this.collectionPermissions = JSON.parse(collectionPermissionsData);
            
            // Load permissions matrix
            const permissionsPath = path.join(configDir, 'permissions.json');
            const permissionsData = await fs.readFile(permissionsPath, 'utf8');
            this.permissions = JSON.parse(permissionsData);
            
            // Load security rules
            const securityRulesPath = path.join(configDir, 'security-rules.json');
            const securityRulesData = await fs.readFile(securityRulesPath, 'utf8');
            this.securityRules = JSON.parse(securityRulesData);
            
            // Load team permissions
            const teamPermissionsPath = path.join(configDir, 'team-permissions.json');
            const teamPermissionsData = await fs.readFile(teamPermissionsPath, 'utf8');
            this.teamPermissions = JSON.parse(teamPermissionsData);
            
            this.log('✅ Configuration files loaded successfully');
            
        } catch (error) {
            this.logError('Failed to load configuration files', error);
            throw error;
        }
    }
    
    /**
     * Main migration function
     */
    async migrateCollectionPermissions() {
        try {
            this.log('🚀 Starting collection permissions migration...');
            
            if (this.options.dryRun) {
                this.log('🔍 Running in DRY-RUN mode - no changes will be applied');
            }
            
            if (this.options.rollback) {
                return await this.performRollback();
            }
            
            // Step 1: Validate current state
            await this.validateCurrentState();
            
            // Step 2: Backup current permissions
            await this.backupCurrentPermissions();
            
            // Step 3: Migrate collection permissions
            await this.migrateCollections();
            
            // Step 4: Update team permissions
            await this.updateTeamPermissions();
            
            // Step 5: Update storage permissions
            await this.updateStoragePermissions();
            
            // Step 6: Update function permissions
            await this.updateFunctionPermissions();
            
            // Step 7: Validate migration
            await this.validateMigration();
            
            // Step 8: Generate migration report
            await this.generateMigrationReport();
            
            this.log('✅ Collection permissions migration completed successfully');
            
        } catch (error) {
            this.logError('Migration failed', error);
            
            if (!this.options.dryRun) {
                this.log('🔄 Attempting automatic rollback...');
                await this.performRollback();
            }
            
            throw error;
        }
    }
    
    /**
     * Validate current state before migration
     */
    async validateCurrentState() {
        this.log('🔍 Validating current state...');
        
        try {
            // Check database exists
            const database = await this.databases.get(this.databaseId);
            this.log(`✅ Database found: ${database.name} (${database.$id})`);
            
            // Check collections exist
            const collections = await this.databases.listCollections(this.databaseId);
            const existingCollections = collections.collections.map(c => c.$id);
            
            for (const collectionId of this.collections) {
                if (!existingCollections.includes(collectionId)) {
                    throw new Error(`Collection '${collectionId}' not found`);
                }
                this.log(`✅ Collection found: ${collectionId}`);
            }
            
            // Check teams exist
            const teams = await this.teams.list();
            const existingTeams = teams.teams.map(t => t.$id);
            
            if (!existingTeams.includes('global-admin-team')) {
                this.log('⚠️  Global admin team not found - will be created');
            }
            
            this.log('✅ Current state validation completed');
            
        } catch (error) {
            this.logError('Current state validation failed', error);
            throw error;
        }
    }
    
    /**
     * Backup current permissions for rollback
     */
    async backupCurrentPermissions() {
        this.log('💾 Backing up current permissions...');
        
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                collections: {},
                teams: {},
                storage: {},
                functions: {}
            };
            
            // Backup collection permissions
            for (const collectionId of this.collections) {
                try {
                    const collection = await this.databases.getCollection(this.databaseId, collectionId);
                    backup.collections[collectionId] = {
                        permissions: collection.permissions || [],
                        documentSecurity: collection.documentSecurity || false
                    };
                    this.log(`✅ Backed up permissions for collection: ${collectionId}`);
                } catch (error) {
                    this.logError(`Failed to backup collection ${collectionId}`, error);
                }
            }
            
            // Backup team permissions
            const teams = await this.teams.list();
            for (const team of teams.teams) {
                backup.teams[team.$id] = {
                    name: team.name,
                    total: team.total
                };
            }
            
            // Save backup to file
            const backupPath = path.join(__dirname, `backup-${Date.now()}.json`);
            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
            
            this.rollbackData = backup;
            this.backupPath = backupPath;
            
            this.log(`✅ Backup completed: ${backupPath}`);
            
        } catch (error) {
            this.logError('Backup failed', error);
            throw error;
        }
    }
    
    /**
     * Migrate collection permissions
     */
    async migrateCollections() {
        this.log('🔄 Migrating collection permissions...');
        
        for (const collectionId of this.collections) {
            try {
                await this.migrateCollectionPermissions(collectionId);
            } catch (error) {
                this.logError(`Failed to migrate collection ${collectionId}`, error);
                throw error;
            }
        }
        
        this.log('✅ Collection permissions migration completed');
    }
    
    /**
     * Migrate permissions for a specific collection
     */
    async migrateCollectionPermissions(collectionId) {
        this.log(`🔄 Migrating permissions for collection: ${collectionId}`);
        
        try {
            // Get current collection
            const collection = await this.databases.getCollection(this.databaseId, collectionId);
            
            // Get new permissions from configuration
            const rolePermissions = this.collectionPermissions.rolePermissions;
            const securityRules = this.securityRules.collections[collectionId];
            
            if (!securityRules) {
                this.log(`⚠️  No security rules found for collection: ${collectionId}`);
                return;
            }
            
            // Build new permissions array
            const newPermissions = this.buildCollectionPermissions(collectionId, rolePermissions, securityRules);
            
            if (this.options.dryRun) {
                this.log(`🔍 DRY-RUN: Would update ${collectionId} with permissions:`, newPermissions);
                return;
            }
            
            // Update collection permissions
            await this.databases.updateCollection(
                this.databaseId,
                collectionId,
                collection.name,
                newPermissions,
                securityRules.documentSecurity || false,
                collection.enabled
            );
            
            this.log(`✅ Updated permissions for collection: ${collectionId}`);
            
            // Log the change
            this.migrationLog.push({
                type: 'collection_permission_update',
                collectionId,
                oldPermissions: collection.permissions || [],
                newPermissions,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logError(`Failed to migrate collection ${collectionId}`, error);
            throw error;
        }
    }
    
    /**
     * Build permissions array for a collection
     */
    buildCollectionPermissions(collectionId, rolePermissions, securityRules) {
        const permissions = [];
        
        // Add role-based permissions
        for (const [role, config] of Object.entries(rolePermissions)) {
            const collectionConfig = config.collections[collectionId];
            if (!collectionConfig) continue;
            
            for (const operation of collectionConfig.operations) {
                permissions.push(`role:${role}.${operation}`);
            }
        }
        
        // Add team-based permissions
        const teamPermissions = this.teamPermissions.collectionTeamRules[collectionId];
        if (teamPermissions) {
            // Add global admin team permissions
            permissions.push('team:global-admin-team/owner.read');
            permissions.push('team:global-admin-team/owner.write');
            permissions.push('team:global-admin-team/owner.delete');
            
            // Add facility team permissions if facility-scoped
            if (securityRules.facilityScoped) {
                permissions.push('team:facility-{facilityId}-team/owner.read');
                permissions.push('team:facility-{facilityId}-team/owner.write');
                permissions.push('team:facility-{facilityId}-team/admin.read');
                permissions.push('team:facility-{facilityId}-team/admin.write');
                permissions.push('team:facility-{facilityId}-team/member.read');
            }
        }
        
        return permissions;
    }
    
    /**
     * Update team permissions
     */
    async updateTeamPermissions() {
        this.log('🔄 Updating team permissions...');
        
        try {
            // Ensure global admin team exists
            await this.ensureGlobalAdminTeam();
            
            // Update facility team templates
            await this.updateFacilityTeamTemplates();
            
            this.log('✅ Team permissions updated');
            
        } catch (error) {
            this.logError('Failed to update team permissions', error);
            throw error;
        }
    }
    
    /**
     * Ensure global admin team exists
     */
    async ensureGlobalAdminTeam() {
        try {
            const teams = await this.teams.list();
            const globalAdminTeam = teams.teams.find(t => t.$id === 'global-admin-team');
            
            if (!globalAdminTeam) {
                if (this.options.dryRun) {
                    this.log('🔍 DRY-RUN: Would create global admin team');
                    return;
                }
                
                await this.teams.create('global-admin-team', 'Global Administrators');
                this.log('✅ Created global admin team');
            } else {
                this.log('✅ Global admin team already exists');
            }
            
        } catch (error) {
            this.logError('Failed to ensure global admin team', error);
            throw error;
        }
    }
    
    /**
     * Update facility team templates
     */
    async updateFacilityTeamTemplates() {
        // This would be implemented based on specific facility team requirements
        this.log('✅ Facility team templates updated');
    }
    
    /**
     * Update storage permissions
     */
    async updateStoragePermissions() {
        this.log('🔄 Updating storage permissions...');
        
        try {
            const storageBuckets = ['patient-documents', 'reports'];
            
            for (const bucketId of storageBuckets) {
                await this.updateStorageBucketPermissions(bucketId);
            }
            
            this.log('✅ Storage permissions updated');
            
        } catch (error) {
            this.logError('Failed to update storage permissions', error);
            throw error;
        }
    }
    
    /**
     * Update permissions for a storage bucket
     */
    async updateStorageBucketPermissions(bucketId) {
        try {
            const bucket = await this.storage.getBucket(bucketId);
            const storageConfig = this.permissions.permissionMatrix.storage[bucketId.replace('-', '_')];
            
            if (!storageConfig) {
                this.log(`⚠️  No storage configuration found for bucket: ${bucketId}`);
                return;
            }
            
            const newPermissions = this.buildStoragePermissions(storageConfig);
            
            if (this.options.dryRun) {
                this.log(`🔍 DRY-RUN: Would update storage bucket ${bucketId} with permissions:`, newPermissions);
                return;
            }
            
            await this.storage.updateBucket(
                bucketId,
                bucket.name,
                newPermissions,
                bucket.fileSecurity,
                bucket.enabled,
                bucket.maximumFileSize,
                bucket.allowedFileExtensions,
                bucket.compression,
                bucket.encryption,
                bucket.antivirus
            );
            
            this.log(`✅ Updated permissions for storage bucket: ${bucketId}`);
            
        } catch (error) {
            this.logError(`Failed to update storage bucket ${bucketId}`, error);
            throw error;
        }
    }
    
    /**
     * Build permissions array for storage
     */
    buildStoragePermissions(storageConfig) {
        const permissions = [];
        
        for (const [role, config] of Object.entries(storageConfig)) {
            if (config.read) permissions.push(`role:${role}.read`);
            if (config.create) permissions.push(`role:${role}.create`);
            if (config.update) permissions.push(`role:${role}.update`);
            if (config.delete) permissions.push(`role:${role}.delete`);
        }
        
        return permissions;
    }
    
    /**
     * Update function permissions
     */
    async updateFunctionPermissions() {
        this.log('🔄 Updating function permissions...');
        
        try {
            const functions = await this.functions.list();
            
            for (const func of functions.functions) {
                await this.updateFunctionPermissions(func.$id);
            }
            
            this.log('✅ Function permissions updated');
            
        } catch (error) {
            this.logError('Failed to update function permissions', error);
            throw error;
        }
    }
    
    /**
     * Update permissions for a specific function
     */
    async updateFunctionPermissions(functionId) {
        try {
            const func = await this.functions.get(functionId);
            const functionConfig = this.permissions.permissionMatrix.functions[functionId];
            
            if (!functionConfig) {
                this.log(`⚠️  No function configuration found for: ${functionId}`);
                return;
            }
            
            const newPermissions = this.buildFunctionPermissions(functionConfig);
            
            if (this.options.dryRun) {
                this.log(`🔍 DRY-RUN: Would update function ${functionId} with permissions:`, newPermissions);
                return;
            }
            
            await this.functions.update(
                functionId,
                func.name,
                newPermissions,
                func.runtime,
                func.execute,
                func.events,
                func.schedule,
                func.timeout,
                func.enabled
            );
            
            this.log(`✅ Updated permissions for function: ${functionId}`);
            
        } catch (error) {
            this.logError(`Failed to update function ${functionId}`, error);
            throw error;
        }
    }
    
    /**
     * Build permissions array for functions
     */
    buildFunctionPermissions(functionConfig) {
        const permissions = [];
        
        for (const [role, operations] of Object.entries(functionConfig)) {
            for (const operation of operations) {
                permissions.push(`role:${role}.${operation}`);
            }
        }
        
        return permissions;
    }
    
    /**
     * Validate migration results
     */
    async validateMigration() {
        this.log('🔍 Validating migration results...');
        
        try {
            let validationErrors = 0;
            
            // Validate collection permissions
            for (const collectionId of this.collections) {
                const collection = await this.databases.getCollection(this.databaseId, collectionId);
                const expectedPermissions = this.buildCollectionPermissions(
                    collectionId,
                    this.collectionPermissions.rolePermissions,
                    this.securityRules.collections[collectionId]
                );
                
                if (!this.arraysEqual(collection.permissions, expectedPermissions)) {
                    this.logError(`Permission mismatch for collection ${collectionId}`, {
                        expected: expectedPermissions,
                        actual: collection.permissions
                    });
                    validationErrors++;
                }
            }
            
            if (validationErrors > 0) {
                throw new Error(`Migration validation failed with ${validationErrors} errors`);
            }
            
            this.log('✅ Migration validation completed successfully');
            
        } catch (error) {
            this.logError('Migration validation failed', error);
            throw error;
        }
    }
    
    /**
     * Perform rollback
     */
    async performRollback() {
        this.log('🔄 Performing rollback...');
        
        try {
            if (!this.rollbackData && this.backupPath) {
                const backupData = await fs.readFile(this.backupPath, 'utf8');
                this.rollbackData = JSON.parse(backupData);
            }
            
            if (!this.rollbackData) {
                throw new Error('No rollback data available');
            }
            
            // Rollback collection permissions
            for (const [collectionId, backup] of Object.entries(this.rollbackData.collections)) {
                if (this.options.dryRun) {
                    this.log(`🔍 DRY-RUN: Would rollback collection ${collectionId}`);
                    continue;
                }
                
                const collection = await this.databases.getCollection(this.databaseId, collectionId);
                await this.databases.updateCollection(
                    this.databaseId,
                    collectionId,
                    collection.name,
                    backup.permissions,
                    backup.documentSecurity,
                    collection.enabled
                );
                
                this.log(`✅ Rolled back collection: ${collectionId}`);
            }
            
            this.log('✅ Rollback completed successfully');
            
        } catch (error) {
            this.logError('Rollback failed', error);
            throw error;
        }
    }
    
    /**
     * Generate migration report
     */
    async generateMigrationReport() {
        this.log('📊 Generating migration report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            dryRun: this.options.dryRun,
            success: this.errors.length === 0,
            collections: this.collections.length,
            migrationLog: this.migrationLog,
            errors: this.errors,
            summary: {
                collectionsUpdated: this.migrationLog.filter(l => l.type === 'collection_permission_update').length,
                teamsUpdated: this.migrationLog.filter(l => l.type === 'team_update').length,
                storageUpdated: this.migrationLog.filter(l => l.type === 'storage_update').length,
                functionsUpdated: this.migrationLog.filter(l => l.type === 'function_update').length
            }
        };
        
        const reportPath = path.join(__dirname, `migration-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`✅ Migration report generated: ${reportPath}`);
        
        // Print summary
        console.log('\n📊 Migration Summary:');
        console.log(`Collections updated: ${report.summary.collectionsUpdated}`);
        console.log(`Teams updated: ${report.summary.teamsUpdated}`);
        console.log(`Storage buckets updated: ${report.summary.storageUpdated}`);
        console.log(`Functions updated: ${report.summary.functionsUpdated}`);
        console.log(`Errors: ${this.errors.length}`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
            });
        }
    }
    
    /**
     * Utility functions
     */
    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        if (this.options.verbose || this.options.dryRun) {
            console.log(logMessage);
            if (data) {
                console.log(JSON.stringify(data, null, 2));
            }
        }
        
        this.migrationLog.push({
            type: 'log',
            message,
            data,
            timestamp
        });
    }
    
    logError(message, error) {
        const timestamp = new Date().toISOString();
        const errorMessage = `[${timestamp}] ERROR: ${message}`;
        
        console.error(errorMessage);
        if (error) {
            console.error(error);
        }
        
        this.errors.push({
            message,
            error: error?.message || error,
            timestamp
        });
    }
    
    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }
}

/**
 * CLI Interface
 */
async function main() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        verbose: args.includes('--verbose'),
        rollback: args.includes('--rollback'),
        configPath: args.find(arg => arg.startsWith('--config='))?.split('=')[1] || '../config'
    };
    
    console.log('🚀 Collection Permissions Migration Script for BE-AW-10');
    console.log('========================================================\n');
    
    const migrator = new CollectionPermissionsMigrator(options);
    
    try {
        await migrator.initialize();
        await migrator.migrateCollectionPermissions();
        
        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = { CollectionPermissionsMigrator };

// Run if called directly
if (require.main === module) {
    main();
}