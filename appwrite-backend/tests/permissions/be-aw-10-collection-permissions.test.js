/**
 * BE-AW-10 Collection Permissions Test Suite
 * 
 * Comprehensive test suite for the enhanced permission system including:
 * - Unit tests for permission validation
 * - Integration tests with Appwrite operations
 * - Performance tests for caching and queries
 * - Validation against acceptance criteria
 */

const { describe, it, beforeAll, afterAll, beforeEach, afterEach } = require('jest');
const { expect } = require('@jest/globals');
const path = require('path');

// Import the enhanced permission system components
const {
    ConfigurationLoader,
    getConfigLoader,
    initializePermissionSystem,
    checkEnhancedPermission,
    ConfigUtils
} = require('../../utils/index');

const { PermissionValidator } = require('../../utils/permission-validator');
const { DocumentSecurity } = require('../../utils/document-security');
const { FacilityScopedQueries } = require('../../utils/facility-scoped-queries');
const { CollectionPermissionsMigrator } = require('../../migrations/migrate-collection-permissions');

// Mock Appwrite SDK
jest.mock('node-appwrite', () => ({
    Client: jest.fn().mockImplementation(() => ({
        setEndpoint: jest.fn().mockReturnThis(),
        setProject: jest.fn().mockReturnThis(),
        setKey: jest.fn().mockReturnThis()
    })),
    Databases: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        listCollections: jest.fn(),
        updateCollection: jest.fn(),
        listDocuments: jest.fn(),
        createDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn()
    })),
    Teams: jest.fn().mockImplementation(() => ({
        list: jest.fn(),
        get: jest.fn(),
        listMemberships: jest.fn()
    })),
    Users: jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        list: jest.fn()
    })),
    Permission: {
        read: jest.fn((role) => `read("${role}")`),
        write: jest.fn((role) => `write("${role}")`),
        create: jest.fn((role) => `create("${role}")`),
        update: jest.fn((role) => `update("${role}")`),
        delete: jest.fn((role) => `delete("${role}")`)
    },
    Role: {
        any: jest.fn(() => 'any'),
        user: jest.fn((id) => `user:${id}`),
        users: jest.fn(() => 'users'),
        team: jest.fn((id, role) => `team:${id}/${role || 'member'}`),
        member: jest.fn((id) => `member:${id}`),
        label: jest.fn((name) => `label:${name}`)
    }
}));

describe('BE-AW-10 Enhanced Collection Permissions', () => {
    let configLoader;
    let permissionValidator;
    let documentSecurity;
    let facilityScopedQueries;
    let migrator;

    // Test data fixtures
    const testUsers = {
        administrator: {
            $id: 'admin-001',
            email: 'admin@immuneme.com',
            name: 'System Administrator',
            labels: ['administrator'],
            roles: ['administrator'],
            facilityId: null,
            teams: [{ id: 'global-admin-team', role: 'owner' }]
        },
        supervisor: {
            $id: 'supervisor-001',
            email: 'supervisor@facility1.com',
            name: 'Facility Supervisor',
            labels: ['supervisor', 'facility_1'],
            roles: ['supervisor'],
            facilityId: '1',
            teams: [{ id: 'facility-1-team', role: 'owner' }]
        },
        doctor: {
            $id: 'doctor-001',
            email: 'doctor@facility1.com',
            name: 'Dr. Smith',
            labels: ['doctor', 'facility_1'],
            roles: ['doctor'],
            facilityId: '1',
            teams: [{ id: 'facility-1-team', role: 'member' }]
        },
        user: {
            $id: 'user-001',
            email: 'user@facility2.com',
            name: 'Basic User',
            labels: ['user', 'facility_2'],
            roles: ['user'],
            facilityId: '2',
            teams: [{ id: 'facility-2-team', role: 'member' }]
        }
    };

    const testFacilities = {
        facility1: { $id: '1', name: 'Central Hospital', region: 'North' },
        facility2: { $id: '2', name: 'Community Clinic', region: 'South' }
    };

    const testDocuments = {
        patient: {
            $id: 'patient-001',
            facilityId: '1',
            name: 'John Doe',
            dateOfBirth: '1990-01-01',
            medicalRecordNumber: 'MRN001'
        },
        immunizationRecord: {
            $id: 'imm-001',
            facilityId: '1',
            patientId: 'patient-001',
            vaccineId: 'vaccine-001',
            administeredDate: '2023-01-15'
        }
    };

    beforeAll(async () => {
        // Set up test environment
        process.env.NODE_ENV = 'test';
        process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
        process.env.APPWRITE_PROJECT_ID = 'test-project';
        process.env.APPWRITE_API_KEY = 'test-api-key';
        process.env.DATABASE_ID = 'test-db';

        // Initialize the permission system
        await initializePermissionSystem({
            configPath: path.join(__dirname, '../../config'),
            cacheEnabled: true,
            validateOnLoad: true
        });

        configLoader = getConfigLoader();
        permissionValidator = new PermissionValidator(configLoader);
        documentSecurity = new DocumentSecurity(configLoader);
        facilityScopedQueries = new FacilityScopedQueries(configLoader);
        migrator = new CollectionPermissionsMigrator({
            dryRun: true,
            configPath: path.join(__dirname, '../../config')
        });
    });

    afterAll(async () => {
        // Clean up
        if (configLoader) {
            configLoader.clearCache();
        }
    });

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    describe('Unit Tests - Permission Validation', () => {
        describe('Administrator Role Tests', () => {
            it('should grant full access to all collections for administrators', async () => {
                const collections = ['patients', 'immunization_records', 'facilities', 'vaccines'];
                const operations = ['create', 'read', 'update', 'delete'];

                for (const collection of collections) {
                    for (const operation of operations) {
                        const result = await permissionValidator.checkPermission(
                            testUsers.administrator.$id,
                            `collections.${collection}`,
                            operation,
                            { userContext: testUsers.administrator }
                        );

                        expect(result.allowed).toBe(true);
                        expect(result.scope).toBe('all_facilities');
                        expect(result.reason).toContain('Administrator access granted');
                    }
                }
            });

            it('should allow administrators to access cross-facility data', async () => {
                const result = await permissionValidator.checkPermission(
                    testUsers.administrator.$id,
                    'collections.patients',
                    'read',
                    { 
                        userContext: testUsers.administrator,
                        resourceContext: { facilityId: '999' } // Different facility
                    }
                );

                expect(result.allowed).toBe(true);
                expect(result.scope).toBe('all_facilities');
            });
        });

        describe('Non-Admin Role Restrictions', () => {
            it('should restrict non-admin users from deleting', async () => {
                const nonAdminRoles = ['supervisor', 'doctor', 'user'];
                
                for (const roleKey of nonAdminRoles) {
                    const user = testUsers[roleKey];
                    const result = await permissionValidator.checkPermission(
                        user.$id,
                        'collections.patients',
                        'delete',
                        { userContext: user }
                    );

                    expect(result.allowed).toBe(false);
                    expect(result.reason).toContain('Delete operation not permitted');
                }
            });

            it('should enforce facility scoping for non-admin users', async () => {
                const result = await permissionValidator.checkPermission(
                    testUsers.supervisor.$id,
                    'collections.patients',
                    'read',
                    { 
                        userContext: testUsers.supervisor,
                        resourceContext: { facilityId: '999' } // Different facility
                    }
                );

                expect(result.allowed).toBe(false);
                expect(result.reason).toContain('Facility access restriction');
            });
        });

        describe('Role-Based Permission Validation', () => {
            it('should validate supervisor permissions correctly', async () => {
                const supervisorPermissions = [
                    { collection: 'patients', operation: 'create', expected: true },
                    { collection: 'patients', operation: 'read', expected: true },
                    { collection: 'patients', operation: 'update', expected: true },
                    { collection: 'patients', operation: 'delete', expected: false },
                    { collection: 'immunization_records', operation: 'create', expected: true },
                    { collection: 'immunization_records', operation: 'read', expected: true },
                    { collection: 'immunization_records', operation: 'update', expected: true },
                    { collection: 'immunization_records', operation: 'delete', expected: false }
                ];

                for (const perm of supervisorPermissions) {
                    const result = await permissionValidator.checkPermission(
                        testUsers.supervisor.$id,
                        `collections.${perm.collection}`,
                        perm.operation,
                        { 
                            userContext: testUsers.supervisor,
                            resourceContext: { facilityId: testUsers.supervisor.facilityId }
                        }
                    );

                    expect(result.allowed).toBe(perm.expected);
                }
            });

            it('should validate doctor permissions correctly', async () => {
                const doctorPermissions = [
                    { collection: 'patients', operation: 'read', expected: true },
                    { collection: 'patients', operation: 'update', expected: true },
                    { collection: 'patients', operation: 'create', expected: false },
                    { collection: 'immunization_records', operation: 'create', expected: true },
                    { collection: 'immunization_records', operation: 'read', expected: true },
                    { collection: 'immunization_records', operation: 'update', expected: true }
                ];

                for (const perm of doctorPermissions) {
                    const result = await permissionValidator.checkPermission(
                        testUsers.doctor.$id,
                        `collections.${perm.collection}`,
                        perm.operation,
                        { 
                            userContext: testUsers.doctor,
                            resourceContext: { facilityId: testUsers.doctor.facilityId }
                        }
                    );

                    expect(result.allowed).toBe(perm.expected);
                }
            });

            it('should validate basic user permissions correctly', async () => {
                const userPermissions = [
                    { collection: 'patients', operation: 'read', expected: true },
                    { collection: 'patients', operation: 'create', expected: false },
                    { collection: 'patients', operation: 'update', expected: false },
                    { collection: 'immunization_records', operation: 'read', expected: true },
                    { collection: 'immunization_records', operation: 'create', expected: false }
                ];

                for (const perm of userPermissions) {
                    const result = await permissionValidator.checkPermission(
                        testUsers.user.$id,
                        `collections.${perm.collection}`,
                        perm.operation,
                        { 
                            userContext: testUsers.user,
                            resourceContext: { facilityId: testUsers.user.facilityId }
                        }
                    );

                    expect(result.allowed).toBe(perm.expected);
                }
            });
        });

        describe('Collection-Level Permission Checking', () => {
            it('should validate collection-level permissions for each role', async () => {
                const collections = ['patients', 'immunization_records', 'facilities', 'vaccines'];
                
                for (const collection of collections) {
                    const adminResult = await permissionValidator.validateCollectionAccess(
                        testUsers.administrator,
                        collection
                    );
                    expect(adminResult.hasAccess).toBe(true);

                    const userResult = await permissionValidator.validateCollectionAccess(
                        testUsers.user,
                        collection
                    );
                    // Users should have at least read access to most collections
                    expect(userResult.hasAccess).toBe(true);
                    expect(userResult.operations).toContain('read');
                }
            });

            it('should handle reference data collections correctly', async () => {
                const referenceCollections = ['vaccines', 'vaccine_schedules'];
                
                for (const collection of referenceCollections) {
                    // All users should have read access to reference data
                    const userResult = await permissionValidator.checkPermission(
                        testUsers.user.$id,
                        `collections.${collection}`,
                        'read',
                        { userContext: testUsers.user }
                    );
                    expect(userResult.allowed).toBe(true);

                    // Only admins should have write access to reference data
                    const userWriteResult = await permissionValidator.checkPermission(
                        testUsers.user.$id,
                        `collections.${collection}`,
                        'update',
                        { userContext: testUsers.user }
                    );
                    expect(userWriteResult.allowed).toBe(false);

                    const adminWriteResult = await permissionValidator.checkPermission(
                        testUsers.administrator.$id,
                        `collections.${collection}`,
                        'update',
                        { userContext: testUsers.administrator }
                    );
                    expect(adminWriteResult.allowed).toBe(true);
                }
            });
        });

        describe('Document-Level Security Enforcement', () => {
            it('should apply document-level permissions for facility scoping', async () => {
                const document = testDocuments.patient;
                
                // User from same facility should have access
                const sameResult = await documentSecurity.checkDocumentAccess(
                    testUsers.doctor,
                    document,
                    'read'
                );
                expect(sameResult.allowed).toBe(true);

                // User from different facility should not have access
                const differentResult = await documentSecurity.checkDocumentAccess(
                    testUsers.user, // facility 2
                    document, // facility 1
                    'read'
                );
                expect(differentResult.allowed).toBe(false);
            });

            it('should automatically apply correct permissions on document creation', async () => {
                const newDocument = {
                    name: 'Jane Doe',
                    facilityId: testUsers.supervisor.facilityId
                };

                const permissions = await documentSecurity.generateDocumentPermissions(
                    testUsers.supervisor,
                    'patients',
                    newDocument
                );

                expect(permissions).toContain(`read("team:facility-${testUsers.supervisor.facilityId}-team")`);
                expect(permissions).toContain(`write("role:supervisor")`);
                expect(permissions).toContain(`read("role:administrator")`);
            });

            it('should enforce cross-facility access restrictions', async () => {
                const crossFacilityTests = [
                    {
                        user: testUsers.supervisor, // facility 1
                        document: { ...testDocuments.patient, facilityId: '2' }, // facility 2
                        operation: 'read',
                        expected: false
                    },
                    {
                        user: testUsers.administrator, // global access
                        document: { ...testDocuments.patient, facilityId: '2' },
                        operation: 'read',
                        expected: true
                    }
                ];

                for (const test of crossFacilityTests) {
                    const result = await documentSecurity.checkDocumentAccess(
                        test.user,
                        test.document,
                        test.operation
                    );
                    expect(result.allowed).toBe(test.expected);
                }
            });
        });
    });

    describe('Integration Tests - Appwrite Operations', () => {
        let mockDatabases;
        let mockTeams;

        beforeEach(() => {
            const { Databases, Teams } = require('node-appwrite');
            mockDatabases = new Databases();
            mockTeams = new Teams();
        });

        describe('Permission Enforcement in Real Operations', () => {
            it('should enforce permissions during document queries', async () => {
                // Mock Appwrite response
                mockDatabases.listDocuments.mockResolvedValue({
                    documents: [testDocuments.patient],
                    total: 1
                });

                const query = await facilityScopedQueries.buildSecureQuery(
                    testUsers.doctor,
                    'patients',
                    { status: 'active' }
                );

                expect(query.filters).toContain(`facilityId=${testUsers.doctor.facilityId}`);
                
                const result = await facilityScopedQueries.executeSecureQuery(
                    mockDatabases,
                    'test-db',
                    'patients',
                    query
                );

                expect(mockDatabases.listDocuments).toHaveBeenCalledWith(
                    'test-db',
                    'patients',
                    expect.arrayContaining([
                        expect.stringContaining('facilityId')
                    ])
                );
            });

            it('should apply facility scoping to queries automatically', async () => {
                const testCases = [
                    {
                        user: testUsers.supervisor,
                        expectedFacilityFilter: testUsers.supervisor.facilityId
                    },
                    {
                        user: testUsers.doctor,
                        expectedFacilityFilter: testUsers.doctor.facilityId
                    },
                    {
                        user: testUsers.administrator,
                        expectedFacilityFilter: null // No facility restriction
                    }
                ];

                for (const testCase of testCases) {
                    const query = await facilityScopedQueries.buildSecureQuery(
                        testCase.user,
                        'patients',
                        {}
                    );

                    if (testCase.expectedFacilityFilter) {
                        expect(query.filters).toContain(`facilityId=${testCase.expectedFacilityFilter}`);
                    } else {
                        expect(query.filters.some(f => f.includes('facilityId'))).toBe(false);
                    }
                }
            });

            it('should validate permissions before document creation', async () => {
                mockDatabases.createDocument.mockResolvedValue({
                    $id: 'new-patient-001',
                    ...testDocuments.patient
                });

                const createTests = [
                    {
                        user: testUsers.supervisor,
                        collection: 'patients',
                        expected: true
                    },
                    {
                        user: testUsers.doctor,
                        collection: 'patients',
                        expected: false // Doctors can't create patients
                    },
                    {
                        user: testUsers.user,
                        collection: 'patients',
                        expected: false
                    }
                ];

                for (const test of createTests) {
                    const canCreate = await permissionValidator.checkPermission(
                        test.user.$id,
                        `collections.${test.collection}`,
                        'create',
                        { userContext: test.user }
                    );

                    expect(canCreate.allowed).toBe(test.expected);
                }
            });
        });

        describe('Migration Script Functionality', () => {
            it('should validate current state before migration', async () => {
                mockDatabases.get.mockResolvedValue({ $id: 'test-db', name: 'Test Database' });
                mockDatabases.listCollections.mockResolvedValue({
                    collections: [
                        { $id: 'patients', name: 'Patients' },
                        { $id: 'immunization_records', name: 'Immunization Records' }
                    ]
                });
                mockTeams.list.mockResolvedValue({ teams: [] });

                await migrator.initialize();
                const validation = await migrator.validateCurrentState();

                expect(validation.isValid).toBe(true);
                expect(validation.collections).toHaveLength(2);
            });

            it('should build correct collection permissions', () => {
                const permissions = migrator.buildCollectionPermissions(
                    'patients',
                    configLoader.configurations.collectionPermissions.rolePermissions,
                    configLoader.configurations.securityRules
                );

                expect(permissions).toContain('read("role:administrator")');
                expect(permissions).toContain('write("role:administrator")');
                expect(permissions).toContain('read("role:supervisor")');
                expect(permissions).toContain('write("role:supervisor")');
            });

            it('should handle dry-run mode correctly', async () => {
                migrator.options.dryRun = true;
                mockDatabases.updateCollection.mockResolvedValue({});

                await migrator.migrateCollectionPermissions('patients');

                // In dry-run mode, updateCollection should not be called
                expect(mockDatabases.updateCollection).not.toHaveBeenCalled();
                expect(migrator.migrationLog.some(log => log.message.includes('DRY-RUN'))).toBe(true);
            });
        });

        describe('Configuration Loading and Caching', () => {
            it('should load and cache configurations efficiently', async () => {
                const startTime = Date.now();
                
                // First load
                await configLoader.getConfiguration('permissions');
                const firstLoadTime = Date.now() - startTime;

                const secondStartTime = Date.now();
                // Second load (should use cache)
                await configLoader.getConfiguration('permissions');
                const secondLoadTime = Date.now() - secondStartTime;

                expect(secondLoadTime).toBeLessThan(firstLoadTime);
                
                const cacheStats = configLoader.getCacheStats();
                expect(cacheStats.hits).toBeGreaterThan(0);
            });

            it('should handle configuration reloading', async () => {
                const initialConfig = await configLoader.getConfiguration('permissions');
                
                // Simulate configuration change
                await configLoader.reloadConfiguration('permissions.json');
                
                const reloadedConfig = await configLoader.getConfiguration('permissions');
                expect(reloadedConfig._metadata.loadedAt).not.toEqual(initialConfig._metadata?.loadedAt);
            });
        });
    });

    describe('Performance Tests', () => {
        describe('Permission Checking Performance', () => {
            it('should check permissions efficiently with caching', async () => {
                const iterations = 100;
                const startTime = Date.now();

                for (let i = 0; i < iterations; i++) {
                    await permissionValidator.checkPermission(
                        testUsers.user.$id,
                        'collections.patients',
                        'read',
                        { userContext: testUsers.user }
                    );
                }

                const endTime = Date.now();
                const avgTime = (endTime - startTime) / iterations;

                // Should average less than 10ms per permission check with caching
                expect(avgTime).toBeLessThan(10);
            });

            it('should handle concurrent permission checks', async () => {
                const concurrentChecks = Array(50).fill().map((_, i) => 
                    permissionValidator.checkPermission(
                        testUsers.user.$id,
                        'collections.patients',
                        'read',
                        { userContext: testUsers.user }
                    )
                );

                const startTime = Date.now();
                const results = await Promise.all(concurrentChecks);
                const endTime = Date.now();

                expect(results).toHaveLength(50);
                expect(results.every(r => r.allowed !== undefined)).toBe(true);
                expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
            });
        });

        describe('Query Performance with Security Filters', () => {
            it('should build secure queries efficiently', async () => {
                const iterations = 100;
                const startTime = Date.now();

                for (let i = 0; i < iterations; i++) {
                    await facilityScopedQueries.buildSecureQuery(
                        testUsers.doctor,
                        'patients',
                        { status: 'active' }
                    );
                }

                const endTime = Date.now();
                const avgTime = (endTime - startTime) / iterations;

                expect(avgTime).toBeLessThan(5); // Should average less than 5ms per query build
            });
        });

        describe('Configuration Loading Performance', () => {
            it('should load configurations within acceptable time limits', async () => {
                // Clear cache to force reload
                configLoader.clearCache();

                const startTime = Date.now();
                await configLoader.initialize();
                const endTime = Date.now();

                expect(endTime - startTime).toBeLessThan(2000); // Should load within 2 seconds
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid user contexts gracefully', async () => {
            const result = await permissionValidator.checkPermission(
                'nonexistent-user',
                'collections.patients',
                'read',
                { userContext: null }
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Invalid user context');
        });

        it('should handle malformed permission requests', async () => {
            const result = await permissionValidator.checkPermission(
                testUsers.user.$id,
                'invalid.resource',
                'invalid_operation',
                { userContext: testUsers.user }
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Invalid resource or operation');
        });

        it('should handle configuration errors gracefully', async () => {
            // Simulate configuration error
            const originalConfig = configLoader.configurations.permissions;
            configLoader.configurations.permissions = null;

            const result = await permissionValidator.checkPermission(
                testUsers.user.$id,
                'collections.patients',
                'read',
                { userContext: testUsers.user }
            );

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Configuration error');

            // Restore configuration
            configLoader.configurations.permissions = originalConfig;
        });

        it('should handle network errors during Appwrite operations', async () => {
            const { Databases } = require('node-appwrite');
            const mockDatabases = new Databases();
            
            mockDatabases.listDocuments.mockRejectedValue(new Error('Network error'));

            try {
                await facilityScopedQueries.executeSecureQuery(
                    mockDatabases,
                    'test-db',
                    'patients',
                    { filters: [] }
                );
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Network error');
            }
        });
    });
});