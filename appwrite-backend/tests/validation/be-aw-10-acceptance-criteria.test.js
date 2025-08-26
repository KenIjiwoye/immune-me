/**
 * BE-AW-10 Acceptance Criteria Validation Script
 * 
 * This test suite validates the implementation against all acceptance criteria
 * specified in the BE-AW-10 ticket for the enhanced permission system.
 */

const { describe, it, beforeAll, afterAll, beforeEach } = require('jest');
const { expect } = require('@jest/globals');
const path = require('path');

// Import the enhanced permission system components
const {
    ConfigurationLoader,
    getConfigLoader,
    initializePermissionSystem,
    checkEnhancedPermission
} = require('../../utils/index');

const { PermissionValidator } = require('../../utils/permission-validator');
const { DocumentSecurity } = require('../../utils/document-security');
const { FacilityScopedQueries } = require('../../utils/facility-scoped-queries');
const { CollectionPermissionsMigrator } = require('../../migrations/migrate-collection-permissions');

// Import test data
const { 
    testUsers, 
    testFacilities, 
    testDocuments, 
    permissionTestScenarios 
} = require('../fixtures/test-data');

// Import mocks
const { MockFactory } = require('../mocks/appwrite-mocks');

describe('BE-AW-10 Acceptance Criteria Validation', () => {
    let configLoader;
    let permissionValidator;
    let documentSecurity;
    let facilityScopedQueries;
    let migrator;
    let mockSDK;

    beforeAll(async () => {
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

        // Create mock SDK
        mockSDK = MockFactory.createMockAppwriteSDK();
    });

    afterAll(async () => {
        if (configLoader) {
            configLoader.clearCache();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AC1: Collection Permissions', () => {
        describe('AC1.1: Each collection has appropriate role-based permissions', () => {
            const collections = [
                'patients',
                'immunization_records', 
                'facilities',
                'vaccines',
                'vaccine_schedules',
                'vaccine_schedule_items',
                'notifications',
                'supplementary_immunizations'
            ];

            const roles = ['administrator', 'supervisor', 'doctor', 'user'];

            it('should have defined permissions for all collections', async () => {
                const collectionPermissions = await configLoader.getConfiguration('collectionPermissions');
                
                for (const collection of collections) {
                    expect(collectionPermissions.collections).toHaveProperty(collection);
                    
                    const collectionConfig = collectionPermissions.collections[collection];
                    expect(collectionConfig).toHaveProperty('permissions');
                    expect(collectionConfig.permissions).toBeDefined();
                }
            });

            it('should have role-based permissions defined for each role', async () => {
                const collectionPermissions = await configLoader.getConfiguration('collectionPermissions');
                
                for (const role of roles) {
                    expect(collectionPermissions.rolePermissions).toHaveProperty(role);
                    
                    const rolePermissions = collectionPermissions.rolePermissions[role];
                    expect(rolePermissions).toHaveProperty('collections');
                    expect(typeof rolePermissions.collections).toBe('object');
                }
            });

            it('should validate permission structure for each collection-role combination', async () => {
                const collectionPermissions = await configLoader.getConfiguration('collectionPermissions');
                
                for (const role of roles) {
                    const roleConfig = collectionPermissions.rolePermissions[role];
                    
                    for (const collection of collections) {
                        if (roleConfig.collections[collection]) {
                            const permissions = roleConfig.collections[collection];
                            
                            expect(permissions).toHaveProperty('operations');
                            expect(Array.isArray(permissions.operations)).toBe(true);
                            expect(permissions.operations.length).toBeGreaterThan(0);
                            
                            // Validate operation types
                            const validOperations = ['create', 'read', 'update', 'delete'];
                            permissions.operations.forEach(op => {
                                expect(validOperations).toContain(op);
                            });
                        }
                    }
                }
            });
        });

        describe('AC1.2: Facility-scoped collections enforce facility access', () => {
            const facilityScopedCollections = [
                'patients',
                'immunization_records',
                'notifications'
            ];

            it('should identify facility-scoped collections correctly', async () => {
                const securityRules = await configLoader.getConfiguration('securityRules');
                
                for (const collection of facilityScopedCollections) {
                    expect(securityRules.collections).toHaveProperty(collection);
                    
                    const collectionRules = securityRules.collections[collection];
                    expect(collectionRules.facilityScoped).toBe(true);
                }
            });

            it('should enforce facility scoping for non-admin users', async () => {
                const nonAdminUsers = [testUsers.supervisor, testUsers.doctor, testUsers.user];
                
                for (const user of nonAdminUsers) {
                    for (const collection of facilityScopedCollections) {
                        // Test access to same facility
                        const sameResult = await permissionValidator.checkPermission(
                            user.$id,
                            `collections.${collection}`,
                            'read',
                            { 
                                userContext: user,
                                resourceContext: { facilityId: user.facilityId }
                            }
                        );
                        
                        if (user.roles.includes('user') && collection === 'patients') {
                            expect(sameResult.allowed).toBe(true);
                        }
                        
                        // Test access to different facility (should be denied)
                        const differentFacilityId = user.facilityId === '1' ? '2' : '1';
                        const differentResult = await permissionValidator.checkPermission(
                            user.$id,
                            `collections.${collection}`,
                            'read',
                            { 
                                userContext: user,
                                resourceContext: { facilityId: differentFacilityId }
                            }
                        );
                        
                        expect(differentResult.allowed).toBe(false);
                        expect(differentResult.reason).toContain('Facility access restriction');
                    }
                }
            });
        });

        describe('AC1.3: Administrator users have unrestricted access', () => {
            const allCollections = [
                'patients',
                'immunization_records',
                'facilities',
                'vaccines',
                'vaccine_schedules',
                'vaccine_schedule_items',
                'notifications',
                'supplementary_immunizations'
            ];

            const allOperations = ['create', 'read', 'update', 'delete'];

            it('should grant administrators full access to all collections', async () => {
                const admin = testUsers.administrator;
                
                for (const collection of allCollections) {
                    for (const operation of allOperations) {
                        const result = await permissionValidator.checkPermission(
                            admin.$id,
                            `collections.${collection}`,
                            operation,
                            { userContext: admin }
                        );
                        
                        expect(result.allowed).toBe(true);
                        expect(result.scope).toBe('all_facilities');
                        expect(result.reason).toContain('Administrator access granted');
                    }
                }
            });

            it('should allow administrators cross-facility access', async () => {
                const admin = testUsers.administrator;
                const facilityScopedCollections = ['patients', 'immunization_records'];
                const testFacilityIds = ['1', '2', '999'];
                
                for (const collection of facilityScopedCollections) {
                    for (const facilityId of testFacilityIds) {
                        const result = await permissionValidator.checkPermission(
                            admin.$id,
                            `collections.${collection}`,
                            'read',
                            { 
                                userContext: admin,
                                resourceContext: { facilityId }
                            }
                        );
                        
                        expect(result.allowed).toBe(true);
                        expect(result.scope).toBe('all_facilities');
                    }
                }
            });
        });

        describe('AC1.4: Read-only reference data is properly configured', () => {
            const referenceDataCollections = [
                'vaccines',
                'vaccine_schedules',
                'vaccine_schedule_items'
            ];

            it('should allow all users read access to reference data', async () => {
                const allUsers = Object.values(testUsers);
                
                for (const user of allUsers) {
                    if (!user.status) continue; // Skip inactive users
                    
                    for (const collection of referenceDataCollections) {
                        const result = await permissionValidator.checkPermission(
                            user.$id,
                            `collections.${collection}`,
                            'read',
                            { userContext: user }
                        );
                        
                        expect(result.allowed).toBe(true);
                    }
                }
            });

            it('should restrict write access to reference data for non-admins', async () => {
                const nonAdminUsers = [testUsers.supervisor, testUsers.doctor, testUsers.user];
                const writeOperations = ['create', 'update', 'delete'];
                
                for (const user of nonAdminUsers) {
                    for (const collection of referenceDataCollections) {
                        for (const operation of writeOperations) {
                            const result = await permissionValidator.checkPermission(
                                user.$id,
                                `collections.${collection}`,
                                operation,
                                { userContext: user }
                            );
                            
                            expect(result.allowed).toBe(false);
                        }
                    }
                }
            });

            it('should allow administrators write access to reference data', async () => {
                const admin = testUsers.administrator;
                const writeOperations = ['create', 'update', 'delete'];
                
                for (const collection of referenceDataCollections) {
                    for (const operation of writeOperations) {
                        const result = await permissionValidator.checkPermission(
                            admin.$id,
                            `collections.${collection}`,
                            operation,
                            { userContext: admin }
                        );
                        
                        expect(result.allowed).toBe(true);
                    }
                }
            });
        });
    });

    describe('AC2: Document Security', () => {
        describe('AC2.1: Document-level permissions are applied for facility scoping', () => {
            it('should generate correct document permissions based on facility', async () => {
                const supervisor = testUsers.supervisor;
                const newPatient = {
                    name: 'Test Patient',
                    facilityId: supervisor.facilityId
                };
                
                const permissions = await documentSecurity.generateDocumentPermissions(
                    supervisor,
                    'patients',
                    newPatient
                );
                
                expect(permissions).toContain(`read("team:facility-${supervisor.facilityId}-team")`);
                expect(permissions).toContain(`write("role:supervisor")`);
                expect(permissions).toContain(`read("role:administrator")`);
                expect(permissions).toContain(`write("role:administrator")`);
            });

            it('should apply document-level security filters', async () => {
                const doctor = testUsers.doctor;
                const patientSameFacility = testDocuments.patients[0]; // facility 1
                const patientDifferentFacility = testDocuments.patients[1]; // facility 2
                
                // Same facility access
                const sameResult = await documentSecurity.checkDocumentAccess(
                    doctor,
                    patientSameFacility,
                    'read'
                );
                expect(sameResult.allowed).toBe(true);
                
                // Different facility access
                const differentResult = await documentSecurity.checkDocumentAccess(
                    doctor,
                    patientDifferentFacility,
                    'read'
                );
                expect(differentResult.allowed).toBe(false);
            });
        });

        describe('AC2.2: Users can only access documents from their assigned facility', () => {
            it('should enforce facility-based document access', async () => {
                const facilityScopedUsers = [testUsers.supervisor, testUsers.doctor, testUsers.user];
                
                for (const user of facilityScopedUsers) {
                    const userFacilityDocs = testDocuments.patients.filter(
                        doc => doc.facilityId === user.facilityId
                    );
                    const otherFacilityDocs = testDocuments.patients.filter(
                        doc => doc.facilityId !== user.facilityId
                    );
                    
                    // Should have access to own facility documents
                    for (const doc of userFacilityDocs) {
                        const result = await documentSecurity.checkDocumentAccess(
                            user,
                            doc,
                            'read'
                        );
                        expect(result.allowed).toBe(true);
                    }
                    
                    // Should not have access to other facility documents
                    for (const doc of otherFacilityDocs) {
                        const result = await documentSecurity.checkDocumentAccess(
                            user,
                            doc,
                            'read'
                        );
                        expect(result.allowed).toBe(false);
                    }
                }
            });
        });

        describe('AC2.3: Cross-facility access works for supervisors and administrators', () => {
            it('should allow administrators cross-facility document access', async () => {
                const admin = testUsers.administrator;
                const allDocuments = testDocuments.patients;
                
                for (const doc of allDocuments) {
                    const result = await documentSecurity.checkDocumentAccess(
                        admin,
                        doc,
                        'read'
                    );
                    expect(result.allowed).toBe(true);
                    expect(result.scope).toBe('all_facilities');
                }
            });

            it('should restrict supervisors to their facility only', async () => {
                const supervisor = testUsers.supervisor; // facility 1
                const sameFacilityDoc = testDocuments.patients.find(doc => doc.facilityId === '1');
                const differentFacilityDoc = testDocuments.patients.find(doc => doc.facilityId === '2');
                
                // Same facility access
                const sameResult = await documentSecurity.checkDocumentAccess(
                    supervisor,
                    sameFacilityDoc,
                    'read'
                );
                expect(sameResult.allowed).toBe(true);
                
                // Different facility access
                const differentResult = await documentSecurity.checkDocumentAccess(
                    supervisor,
                    differentFacilityDoc,
                    'read'
                );
                expect(differentResult.allowed).toBe(false);
            });
        });

        describe('AC2.4: Document creation automatically applies correct permissions', () => {
            it('should auto-apply permissions on document creation', async () => {
                const supervisor = testUsers.supervisor;
                const newDocument = {
                    name: 'New Patient',
                    facilityId: supervisor.facilityId
                };
                
                const permissions = await documentSecurity.generateDocumentPermissions(
                    supervisor,
                    'patients',
                    newDocument
                );
                
                // Verify facility team has read access
                expect(permissions).toContain(`read("team:facility-${supervisor.facilityId}-team")`);
                
                // Verify role-based permissions
                expect(permissions).toContain(`write("role:supervisor")`);
                expect(permissions).toContain(`write("role:doctor")`);
                expect(permissions).toContain(`read("role:administrator")`);
                expect(permissions).toContain(`write("role:administrator")`);
                
                // Verify no cross-facility access
                const otherFacilityTeam = supervisor.facilityId === '1' ? 'facility-2-team' : 'facility-1-team';
                expect(permissions).not.toContain(`read("team:${otherFacilityTeam}")`);
            });
        });
    });

    describe('AC3: Permission Validation', () => {
        describe('AC3.1: Permission validation utilities work correctly', () => {
            it('should validate permissions using the PermissionValidator', async () => {
                const testCases = [
                    {
                        user: testUsers.administrator,
                        resource: 'collections.patients',
                        operation: 'delete',
                        expected: true
                    },
                    {
                        user: testUsers.supervisor,
                        resource: 'collections.patients',
                        operation: 'delete',
                        expected: false
                    },
                    {
                        user: testUsers.doctor,
                        resource: 'collections.immunization_records',
                        operation: 'create',
                        expected: true
                    },
                    {
                        user: testUsers.user,
                        resource: 'collections.patients',
                        operation: 'update',
                        expected: false
                    }
                ];
                
                for (const testCase of testCases) {
                    const result = await permissionValidator.checkPermission(
                        testCase.user.$id,
                        testCase.resource,
                        testCase.operation,
                        { userContext: testCase.user }
                    );
                    
                    expect(result.allowed).toBe(testCase.expected);
                    expect(result).toHaveProperty('reason');
                    expect(result).toHaveProperty('scope');
                }
            });
        });

        describe('AC3.2: Role-based access is properly enforced', () => {
            it('should enforce role-based permissions according to hierarchy', async () => {
                const roleHierarchyTests = [
                    // Administrator can do everything
                    { role: 'administrator', operation: 'delete', collection: 'patients', expected: true },
                    { role: 'administrator', operation: 'create', collection: 'facilities', expected: true },
                    
                    // Supervisor can manage but not delete
                    { role: 'supervisor', operation: 'create', collection: 'patients', expected: true },
                    { role: 'supervisor', operation: 'update', collection: 'patients', expected: true },
                    { role: 'supervisor', operation: 'delete', collection: 'patients', expected: false },
                    
                    // Doctor can treat but not manage patients
                    { role: 'doctor', operation: 'read', collection: 'patients', expected: true },
                    { role: 'doctor', operation: 'update', collection: 'patients', expected: true },
                    { role: 'doctor', operation: 'create', collection: 'patients', expected: false },
                    { role: 'doctor', operation: 'create', collection: 'immunization_records', expected: true },
                    
                    // User has read-only access
                    { role: 'user', operation: 'read', collection: 'patients', expected: true },
                    { role: 'user', operation: 'create', collection: 'patients', expected: false },
                    { role: 'user', operation: 'update', collection: 'patients', expected: false }
                ];
                
                for (const test of roleHierarchyTests) {
                    const user = Object.values(testUsers).find(u => u.roles.includes(test.role));
                    if (!user) continue;
                    
                    const result = await permissionValidator.checkPermission(
                        user.$id,
                        `collections.${test.collection}`,
                        test.operation,
                        { userContext: user }
                    );
                    
                    expect(result.allowed).toBe(test.expected);
                }
            });
        });

        describe('AC3.3: Facility-scoped access is validated', () => {
            it('should validate facility scope in permission checks', async () => {
                const supervisor = testUsers.supervisor; // facility 1
                
                // Same facility access
                const sameResult = await permissionValidator.checkPermission(
                    supervisor.$id,
                    'collections.patients',
                    'read',
                    { 
                        userContext: supervisor,
                        resourceContext: { facilityId: '1' }
                    }
                );
                expect(sameResult.allowed).toBe(true);
                expect(sameResult.scope).toBe('facility_only');
                
                // Different facility access
                const differentResult = await permissionValidator.checkPermission(
                    supervisor.$id,
                    'collections.patients',
                    'read',
                    { 
                        userContext: supervisor,
                        resourceContext: { facilityId: '2' }
                    }
                );
                expect(differentResult.allowed).toBe(false);
            });
        });

        describe('AC3.4: Permission checks are efficient and cached', () => {
            it('should cache permission results for performance', async () => {
                const user = testUsers.user;
                const startTime = Date.now();
                
                // First call
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                );
                
                // Second call (should use cache)
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                );
                
                const endTime = Date.now();
                
                // Should complete quickly due to caching
                expect(endTime - startTime).toBeLessThan(100);
                
                // Verify cache is being used
                const cacheStats = configLoader.getCacheStats();
                expect(cacheStats.size).toBeGreaterThan(0);
            });
        });
    });

    describe('AC4: Query Security', () => {
        describe('AC4.1: Facility-scoped queries automatically filter by facility', () => {
            it('should build queries with facility filters for non-admin users', async () => {
                const facilityScopedUsers = [testUsers.supervisor, testUsers.doctor, testUsers.user];
                
                for (const user of facilityScopedUsers) {
                    const query = await facilityScopedQueries.buildSecureQuery(
                        user,
                        'patients',
                        { status: 'active' }
                    );
                    
                    expect(query.filters).toContain(`facilityId=${user.facilityId}`);
                    expect(query.filters).toContain('status=active');
                }
            });

            it('should not add facility filters for administrators', async () => {
                const admin = testUsers.administrator;
                const query = await facilityScopedQueries.buildSecureQuery(
                    admin,
                    'patients',
                    { status: 'active' }
                );
                
                expect(query.filters.some(f => f.includes('facilityId'))).toBe(false);
                expect(query.filters).toContain('status=active');
            });
        });

        describe('AC4.2: Cross-facility queries work for authorized users', () => {
            it('should allow administrators to query across facilities', async () => {
                const admin = testUsers.administrator;
                const databases = mockSDK.Databases();
                
                databases.listDocuments.mockResolvedValue({
                    documents: testDocuments.patients,
                    total: testDocuments.patients.length
                });
                
                const query = await facilityScopedQueries.buildSecureQuery(
                    admin,
                    'patients',
                    {}
                );
                
                const result = await facilityScopedQueries.executeSecureQuery(
                    databases,
                    'test-db',
                    'patients',
                    query
                );
                
                expect(result.documents).toHaveLength(testDocuments.patients.length);
                expect(databases.listDocuments).toHaveBeenCalledWith(
                    'test-db',
                    'patients',
                    expect.not.arrayContaining([
                        expect.stringContaining('facilityId')
                    ])
                );
            });
        });

        describe('AC4.3: Query performance is optimized', () => {
            it('should build queries efficiently', async () => {
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

        describe('AC4.4: Security is maintained at query level', () => {
            it('should maintain security filters in all query operations', async () => {
                const user = testUsers.user;
                const databases = mockSDK.Databases();
                
                // Mock response with mixed facility data
                databases.listDocuments.mockResolvedValue({
                    documents: testDocuments.patients,
                    total: testDocuments.patients.length
                });
                
                const query = await facilityScopedQueries.buildSecureQuery(
                    user,
                    'patients',
                    { name: 'John' }
                );
                
                await facilityScopedQueries.executeSecureQuery(
                    databases,
                    'test-db',
                    'patients',
                    query
                );
                
                // Verify facility filter was applied
                expect(databases.listDocuments).toHaveBeenCalledWith(
                    'test-db',
                    'patients',
                    expect.arrayContaining([
                        expect.stringContaining(`facilityId=${user.facilityId}`)
                    ])
                );
            });
        });
    });

    describe('AC5: System Integration', () => {
        describe('AC5.1: Integration with existing utilities', () => {
            it('should integrate with TeamPermissionChecker', async () => {
                // This would test integration with existing team permission utilities
                // For now, we verify the permission system can work with team-based permissions
                const supervisor = testUsers.supervisor;
                
                const result = await permissionValidator.checkPermission(
                    supervisor.$id,
                    'collections.patients',
                    'read',
                    { 
                        userContext: supervisor,
                        teamContext: supervisor.teams
                    }
                );
                
                expect(result.allowed).toBe(true);
                expect(result).toHaveProperty('appliedRules');
            });

            it('should integrate with FacilityTeamManager', async () => {
                // Verify facility team integration
                const doctor = testUsers.doctor;
                
                const result = await permissionValidator.checkPermission(
                    doctor.$id,
                    'collections.immunization_records',
                    'create',
                    { 
                        userContext: doctor,
                        facilityContext: { id: doctor.facilityId }
                    }
                );
                
                expect(result.allowed).toBe(true);
            });
        });

        describe('AC5.2: Backward compatibility', () => {
            it('should maintain compatibility with existing permission functions', async () => {
                // Test that enhanced permission system works with legacy calls
                const result = await checkEnhancedPermission(
                    testUsers.user.$id,
                    'collections.patients',
                    'read',
                    { roles: testUsers.user.roles, facilityId: testUsers.user.facilityId }
                );
                
                expect(result).toHaveProperty('allowed');
                expect(result).toHaveProperty('reason');
            });
        });

        describe('AC5.3: Migration script functionality', () => {
            it('should validate migration prerequisites', async () => {
                const databases = mockSDK.Databases();
                const teams = mockSDK.Teams();
                
                databases.get.mockResolvedValue({ $id: 'test-db', name: 'Test Database' });
                databases.listCollections.mockResolvedValue({
                    collections: [
                        { $id: 'patients', name: 'Patients' },
                        { $id: 'immunization_records', name: 'Immunization Records' }
                    ]
                });
                teams.list.mockResolvedValue({ teams: [] });
                
                await migrator.initialize();
                const validation = await migrator.validateCurrentState();
                
                expect(validation.isValid).toBe(true);
                expect(validation.collections).toHaveLength(2);
            });

            it('should build correct collection permissions for migration', () => {
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
        });
    });

    describe('AC6: Error Handling and Edge Cases', () => {
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

        it('should handle configuration errors gracefully', async () => {
            // Temporarily corrupt configuration
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

        it('should validate role hierarchy consistency', async () => {
            const roleHierarchy = configLoader.roleHierarchy;
            
            expect(roleHierarchy.get('administrator').level).toBeGreaterThan(
                roleHierarchy.get('supervisor').level
            );
            expect(roleHierarchy.get('supervisor').level).toBeGreaterThan(
                roleHierarchy.get('doctor').level
            );
            expect(roleHierarchy.get('doctor').level).toBeGreaterThan(
                roleHierarchy.get('user').level
            );
        });
    });
});