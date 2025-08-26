/**
 * BE-AW-10 Integration Test Suite
 * 
 * Comprehensive test suite for the enhanced permission system including:
 * - Configuration loading and validation
 * - Permission checking with new role mappings
 * - Migration script functionality
 * - Integration with existing utilities
 */

const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs').promises;
const path = require('path');

// Import modules to test
const { 
    ConfigurationLoader, 
    getConfigLoader, 
    initializeConfigLoader,
    initializePermissionSystem,
    checkEnhancedPermission,
    ConfigUtils
} = require('../utils/index');

const { CollectionPermissionsMigrator } = require('../migrations/migrate-collection-permissions');

describe('BE-AW-10 Enhanced Permission System', function() {
    this.timeout(10000); // Increase timeout for integration tests
    
    let configLoader;
    let migrator;
    let sandbox;
    
    before(async function() {
        sandbox = sinon.createSandbox();
        
        // Mock environment variables
        process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
        process.env.APPWRITE_PROJECT_ID = 'test-project';
        process.env.APPWRITE_API_KEY = 'test-api-key';
        process.env.DATABASE_ID = 'test-db';
    });
    
    after(function() {
        sandbox.restore();
    });
    
    beforeEach(function() {
        // Clear any existing config loader instance
        if (global.globalConfigLoader) {
            global.globalConfigLoader = null;
        }
    });
    
    describe('Configuration Loading', function() {
        
        it('should load all configuration files successfully', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: true,
                validateOnLoad: true
            });
            
            await configLoader.initialize();
            
            expect(configLoader.configurations.collectionPermissions).to.exist;
            expect(configLoader.configurations.permissions).to.exist;
            expect(configLoader.configurations.securityRules).to.exist;
            expect(configLoader.configurations.teamPermissions).to.exist;
        });
        
        it('should validate configuration structure', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                validateOnLoad: true
            });
            
            await configLoader.initialize();
            
            // Validate collection permissions structure
            const collectionPerms = configLoader.configurations.collectionPermissions;
            expect(collectionPerms.rolePermissions).to.exist;
            expect(collectionPerms.rolePermissions.administrator).to.exist;
            expect(collectionPerms.rolePermissions.supervisor).to.exist;
            expect(collectionPerms.rolePermissions.doctor).to.exist;
            expect(collectionPerms.rolePermissions.user).to.exist;
            
            // Validate permissions matrix structure
            const permissions = configLoader.configurations.permissions;
            expect(permissions.permissionMatrix).to.exist;
            expect(permissions.roleHierarchy).to.exist;
            expect(permissions.teamBasedPermissions).to.exist;
        });
        
        it('should build derived configurations correctly', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config')
            });
            
            await configLoader.initialize();
            
            expect(configLoader.roleHierarchy).to.exist;
            expect(configLoader.teamMappings).to.exist;
            expect(configLoader.permissionLookupTables).to.exist;
            expect(configLoader.facilityScopeMappings).to.exist;
        });
        
        it('should handle missing configuration files gracefully', async function() {
            configLoader = new ConfigurationLoader({
                configPath: '/nonexistent/path',
                validateOnLoad: false
            });
            
            try {
                await configLoader.initialize();
                expect.fail('Should have thrown an error for missing config files');
            } catch (error) {
                expect(error.message).to.include('not found');
            }
        });
    });
    
    describe('Permission Checking', function() {
        
        beforeEach(async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: true
            });
            
            await configLoader.initialize();
        });
        
        it('should check administrator permissions correctly', async function() {
            const mockUserContext = {
                userId: 'admin-user-1',
                roles: ['administrator'],
                teams: [{ id: 'global-admin-team', role: 'owner' }],
                facilityId: null
            };
            
            // Mock getUserContext method
            sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            const result = await configLoader.checkPermission(
                'admin-user-1',
                'collections.patients',
                'delete',
                {}
            );
            
            expect(result.allowed).to.be.true;
            expect(result.reason).to.include('permission granted');
        });
        
        it('should check supervisor permissions with facility scope', async function() {
            const mockUserContext = {
                userId: 'supervisor-user-1',
                roles: ['supervisor'],
                teams: [{ id: 'facility-123-team', role: 'owner' }],
                facilityId: '123'
            };
            
            sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            const result = await configLoader.checkPermission(
                'supervisor-user-1',
                'collections.patients',
                'update',
                { facilityId: '123' }
            );
            
            expect(result.allowed).to.be.true;
            expect(result.scope).to.equal('facility_only');
        });
        
        it('should deny access for insufficient permissions', async function() {
            const mockUserContext = {
                userId: 'user-1',
                roles: ['user'],
                teams: [{ id: 'facility-123-team', role: 'member' }],
                facilityId: '123'
            };
            
            sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            const result = await configLoader.checkPermission(
                'user-1',
                'collections.patients',
                'delete',
                { facilityId: '123' }
            );
            
            expect(result.allowed).to.be.false;
            expect(result.reason).to.include('No matching permission found');
        });
        
        it('should handle cross-facility access restrictions', async function() {
            const mockUserContext = {
                userId: 'supervisor-user-1',
                roles: ['supervisor'],
                teams: [{ id: 'facility-123-team', role: 'owner' }],
                facilityId: '123'
            };
            
            sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            const result = await configLoader.checkPermission(
                'supervisor-user-1',
                'collections.patients',
                'read',
                { facilityId: '456' } // Different facility
            );
            
            expect(result.allowed).to.be.false;
        });
        
        it('should cache permission results for performance', async function() {
            const mockUserContext = {
                userId: 'user-1',
                roles: ['user'],
                teams: [{ id: 'facility-123-team', role: 'member' }],
                facilityId: '123'
            };
            
            const getUserContextStub = sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            // First call
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            // Second call (should use cache)
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            // getUserContext should only be called once due to caching
            expect(getUserContextStub.calledOnce).to.be.true;
        });
    });
    
    describe('Migration Script', function() {
        
        beforeEach(function() {
            migrator = new CollectionPermissionsMigrator({
                dryRun: true,
                verbose: false,
                configPath: path.join(__dirname, '../config')
            });
        });
        
        it('should initialize migration script successfully', async function() {
            // Mock Appwrite client initialization
            sandbox.stub(migrator, 'initialize').resolves();
            
            await migrator.initialize();
            
            expect(migrator.client).to.exist;
            expect(migrator.databases).to.exist;
            expect(migrator.teams).to.exist;
        });
        
        it('should load configuration files for migration', async function() {
            sandbox.stub(migrator, 'initialize').resolves();
            
            // Mock file reading
            const mockCollectionPermissions = {
                rolePermissions: {
                    administrator: { collections: { patients: { operations: ['create', 'read', 'update', 'delete'] } } }
                }
            };
            
            sandbox.stub(fs, 'readFile').resolves(JSON.stringify(mockCollectionPermissions));
            
            await migrator.loadConfigurations();
            
            expect(migrator.collectionPermissions).to.exist;
        });
        
        it('should validate current state before migration', async function() {
            sandbox.stub(migrator, 'initialize').resolves();
            
            // Mock Appwrite API calls
            sandbox.stub(migrator.databases, 'get').resolves({ name: 'test-db', $id: 'test-db' });
            sandbox.stub(migrator.databases, 'listCollections').resolves({
                collections: [
                    { $id: 'patients' },
                    { $id: 'immunization_records' },
                    { $id: 'facilities' }
                ]
            });
            sandbox.stub(migrator.teams, 'list').resolves({ teams: [] });
            
            await migrator.validateCurrentState();
            
            expect(migrator.migrationLog).to.have.length.greaterThan(0);
        });
        
        it('should build collection permissions correctly', function() {
            const rolePermissions = {
                administrator: {
                    collections: {
                        patients: {
                            operations: ['create', 'read', 'update', 'delete'],
                            scope: 'all_facilities'
                        }
                    }
                }
            };
            
            const securityRules = {
                facilityScoped: true,
                documentSecurity: true
            };
            
            const permissions = migrator.buildCollectionPermissions('patients', rolePermissions, securityRules);
            
            expect(permissions).to.be.an('array');
            expect(permissions).to.include('role:administrator.create');
            expect(permissions).to.include('role:administrator.read');
            expect(permissions).to.include('role:administrator.update');
            expect(permissions).to.include('role:administrator.delete');
        });
        
        it('should handle dry-run mode correctly', async function() {
            migrator.options.dryRun = true;
            
            sandbox.stub(migrator, 'initialize').resolves();
            sandbox.stub(migrator, 'validateCurrentState').resolves();
            sandbox.stub(migrator, 'backupCurrentPermissions').resolves();
            
            // Mock collection update (should not be called in dry-run)
            const updateCollectionStub = sandbox.stub(migrator.databases, 'updateCollection');
            
            await migrator.migrateCollectionPermissions('patients');
            
            expect(updateCollectionStub.called).to.be.false;
            expect(migrator.migrationLog.some(log => log.message.includes('DRY-RUN'))).to.be.true;
        });
    });
    
    describe('Integration with Existing Utilities', function() {
        
        it('should integrate with permission validator', async function() {
            await initializePermissionSystem({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: false
            });
            
            const result = await checkEnhancedPermission(
                'test-user',
                'collections.patients',
                'read',
                { roles: ['user'], facilityId: '123' }
            );
            
            expect(result).to.have.property('allowed');
            expect(result).to.have.property('reason');
        });
        
        it('should provide configuration utilities', function() {
            expect(ConfigUtils).to.exist;
            expect(ConfigUtils.loader).to.equal(ConfigurationLoader);
            expect(ConfigUtils.getLoader).to.be.a('function');
            expect(ConfigUtils.initialize).to.be.a('function');
        });
        
        it('should handle configuration reloading', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: true
            });
            
            await configLoader.initialize();
            
            const initialConfig = configLoader.configurations.permissions;
            
            // Mock file change
            sandbox.stub(configLoader, 'loadConfiguration').resolves({
                ...initialConfig,
                _metadata: { loadedAt: new Date().toISOString() }
            });
            
            await configLoader.reloadConfiguration('permissions.json');
            
            expect(configLoader.configurations.permissions._metadata.loadedAt).to.not.equal(
                initialConfig._metadata?.loadedAt
            );
        });
    });
    
    describe('Error Handling and Edge Cases', function() {
        
        it('should handle malformed configuration files', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                validateOnLoad: true
            });
            
            // Mock malformed JSON
            sandbox.stub(fs, 'readFile').resolves('{ invalid json }');
            
            try {
                await configLoader.initialize();
                expect.fail('Should have thrown an error for malformed JSON');
            } catch (error) {
                expect(error.message).to.include('Failed to load configuration');
            }
        });
        
        it('should handle permission check errors gracefully', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config')
            });
            
            await configLoader.initialize();
            
            // Mock error in permission evaluation
            sandbox.stub(configLoader, 'evaluatePermission').throws(new Error('Test error'));
            
            const result = await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            expect(result.allowed).to.be.false;
            expect(result.reason).to.equal('Permission evaluation error');
            expect(result.error).to.equal('Test error');
        });
        
        it('should handle missing user context', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config')
            });
            
            await configLoader.initialize();
            
            // Mock getUserContext returning null
            sandbox.stub(configLoader, 'getUserContext').resolves(null);
            
            const result = await configLoader.checkPermission('nonexistent-user', 'collections.patients', 'read', {});
            
            expect(result.allowed).to.be.false;
        });
        
        it('should validate role hierarchy consistency', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                validateOnLoad: true
            });
            
            await configLoader.initialize();
            
            const roleHierarchy = configLoader.roleHierarchy;
            
            // Check that administrator has highest level
            expect(roleHierarchy.get('administrator').level).to.be.greaterThan(
                roleHierarchy.get('supervisor').level
            );
            expect(roleHierarchy.get('supervisor').level).to.be.greaterThan(
                roleHierarchy.get('doctor').level
            );
            expect(roleHierarchy.get('doctor').level).to.be.greaterThan(
                roleHierarchy.get('user').level
            );
        });
    });
    
    describe('Performance and Caching', function() {
        
        it('should cache permission lookups effectively', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: true,
                cacheTTL: 1000 // 1 second for testing
            });
            
            await configLoader.initialize();
            
            const mockUserContext = {
                userId: 'user-1',
                roles: ['user'],
                teams: [],
                facilityId: '123'
            };
            
            sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            const startTime = Date.now();
            
            // First call
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            // Second call (should be faster due to caching)
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            const endTime = Date.now();
            
            // Should complete quickly due to caching
            expect(endTime - startTime).to.be.lessThan(100);
            
            const stats = configLoader.getCacheStats();
            expect(stats.size).to.be.greaterThan(0);
        });
        
        it('should expire cache entries after TTL', async function() {
            configLoader = new ConfigurationLoader({
                configPath: path.join(__dirname, '../config'),
                cacheEnabled: true,
                cacheTTL: 50 // 50ms for testing
            });
            
            await configLoader.initialize();
            
            const mockUserContext = {
                userId: 'user-1',
                roles: ['user'],
                teams: [],
                facilityId: '123'
            };
            
            const getUserContextStub = sandbox.stub(configLoader, 'getUserContext').resolves(mockUserContext);
            
            // First call
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Second call (should not use cache)
            await configLoader.checkPermission('user-1', 'collections.patients', 'read', {});
            
            // getUserContext should be called twice
            expect(getUserContextStub.calledTwice).to.be.true;
        });
    });
});

/**
 * Helper function to create mock Appwrite responses
 */
function createMockAppwriteResponse(data) {
    return Promise.resolve(data);
}

/**
 * Helper function to create mock user context
 */
function createMockUserContext(overrides = {}) {
    return {
        userId: 'test-user',
        roles: ['user'],
        teams: [],
        facilityId: '123',
        permissions: [],
        ...overrides
    };
}