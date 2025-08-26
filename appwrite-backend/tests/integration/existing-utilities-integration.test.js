/**
 * Integration Tests for BE-AW-10 with Existing Utilities
 * 
 * Tests the integration of the enhanced permission system with existing
 * utilities like TeamPermissionChecker and FacilityTeamManager to ensure
 * backward compatibility and seamless operation.
 */

const { describe, it, beforeAll, afterAll, beforeEach } = require('jest');
const { expect } = require('@jest/globals');
const path = require('path');

// Import enhanced permission system
const {
    ConfigurationLoader,
    getConfigLoader,
    initializePermissionSystem,
    checkEnhancedPermission
} = require('../../utils/index');

// Import existing utilities (these would be the actual existing utilities)
// For testing purposes, we'll create mock versions that simulate the existing behavior
const { MockTeamPermissionChecker } = require('../mocks/existing-utilities-mocks');
const { MockFacilityTeamManager } = require('../mocks/existing-utilities-mocks');

// Import test data and mocks
const { testUsers, testFacilities, testTeams } = require('../fixtures/test-data');
const { MockFactory } = require('../mocks/appwrite-mocks');

describe('Integration with Existing Utilities', () => {
    let configLoader;
    let teamPermissionChecker;
    let facilityTeamManager;
    let mockSDK;

    beforeAll(async () => {
        // Initialize the enhanced permission system
        await initializePermissionSystem({
            configPath: path.join(__dirname, '../../config'),
            cacheEnabled: true,
            validateOnLoad: true
        });

        configLoader = getConfigLoader();
        mockSDK = MockFactory.createMockAppwriteSDK();

        // Initialize existing utilities with enhanced system
        teamPermissionChecker = new MockTeamPermissionChecker(configLoader);
        facilityTeamManager = new MockFacilityTeamManager(configLoader);
    });

    afterAll(async () => {
        if (configLoader) {
            configLoader.clearCache();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('TeamPermissionChecker Integration', () => {
        it('should integrate with existing team permission checking', async () => {
            const supervisor = testUsers.supervisor;
            
            // Test existing team permission method
            const hasTeamAccess = await teamPermissionChecker.checkTeamAccess(
                supervisor.$id,
                'facility-1-team',
                'patients',
                'read'
            );
            
            expect(hasTeamAccess).toBe(true);
            
            // Test enhanced permission system with team context
            const enhancedResult = await checkEnhancedPermission(
                supervisor.$id,
                'collections.patients',
                'read',
                { 
                    roles: supervisor.roles,
                    facilityId: supervisor.facilityId,
                    teams: supervisor.teams
                }
            );
            
            expect(enhancedResult.allowed).toBe(true);
            expect(enhancedResult.allowed).toBe(hasTeamAccess);
        });

        it('should maintain backward compatibility with team-based permissions', async () => {
            const doctor = testUsers.doctor;
            
            // Legacy team permission check
            const legacyResult = await teamPermissionChecker.hasPermission(
                doctor.$id,
                'immunization_records',
                'create'
            );
            
            // Enhanced permission check
            const enhancedResult = await checkEnhancedPermission(
                doctor.$id,
                'collections.immunization_records',
                'create',
                { 
                    roles: doctor.roles,
                    facilityId: doctor.facilityId,
                    teams: doctor.teams
                }
            );
            
            expect(enhancedResult.allowed).toBe(legacyResult);
        });

        it('should handle team hierarchy in permission checks', async () => {
            const multiRoleUser = testUsers.multiRoleUser;
            
            // Check permissions with multiple team memberships
            const teamResults = await Promise.all(
                multiRoleUser.teams.map(team => 
                    teamPermissionChecker.checkTeamAccess(
                        multiRoleUser.$id,
                        team.id,
                        'patients',
                        'update'
                    )
                )
            );
            
            // Enhanced system should consider all team memberships
            const enhancedResult = await checkEnhancedPermission(
                multiRoleUser.$id,
                'collections.patients',
                'update',
                { 
                    roles: multiRoleUser.roles,
                    facilityId: multiRoleUser.facilityId,
                    teams: multiRoleUser.teams
                }
            );
            
            expect(enhancedResult.allowed).toBe(teamResults.some(result => result === true));
        });

        it('should preserve team-based facility scoping', async () => {
            const user = testUsers.user;
            
            // Legacy facility team check
            const facilityTeamAccess = await teamPermissionChecker.checkFacilityTeamAccess(
                user.$id,
                user.facilityId,
                'patients',
                'read'
            );
            
            // Enhanced system with facility context
            const enhancedResult = await checkEnhancedPermission(
                user.$id,
                'collections.patients',
                'read',
                { 
                    roles: user.roles,
                    facilityId: user.facilityId,
                    teams: user.teams
                }
            );
            
            expect(enhancedResult.allowed).toBe(facilityTeamAccess);
            expect(enhancedResult.scope).toBe('facility_only');
        });
    });

    describe('FacilityTeamManager Integration', () => {
        it('should integrate with existing facility team management', async () => {
            const supervisor = testUsers.supervisor;
            
            // Test existing facility team methods
            const facilityTeams = await facilityTeamManager.getFacilityTeams(supervisor.facilityId);
            const userTeams = await facilityTeamManager.getUserTeams(supervisor.$id);
            
            expect(facilityTeams).toContain('facility-1-team');
            expect(userTeams.some(team => team.id === 'facility-1-team')).toBe(true);
            
            // Enhanced system should consider facility team memberships
            const enhancedResult = await checkEnhancedPermission(
                supervisor.$id,
                'collections.patients',
                'create',
                { 
                    roles: supervisor.roles,
                    facilityId: supervisor.facilityId,
                    teams: supervisor.teams
                }
            );
            
            expect(enhancedResult.allowed).toBe(true);
        });

        it('should maintain facility team hierarchy', async () => {
            const doctor = testUsers.doctor;
            
            // Check facility team role
            const teamRole = await facilityTeamManager.getUserRoleInFacility(
                doctor.$id,
                doctor.facilityId
            );
            
            expect(teamRole).toBe('member');
            
            // Enhanced system should respect team role hierarchy
            const createResult = await checkEnhancedPermission(
                doctor.$id,
                'collections.patients',
                'create',
                { 
                    roles: doctor.roles,
                    facilityId: doctor.facilityId,
                    teams: doctor.teams
                }
            );
            
            // Doctors (team members) cannot create patients
            expect(createResult.allowed).toBe(false);
            
            const readResult = await checkEnhancedPermission(
                doctor.$id,
                'collections.patients',
                'read',
                { 
                    roles: doctor.roles,
                    facilityId: doctor.facilityId,
                    teams: doctor.teams
                }
            );
            
            // But they can read patients
            expect(readResult.allowed).toBe(true);
        });

        it('should handle facility team changes', async () => {
            const user = testUsers.user;
            
            // Simulate team role change
            await facilityTeamManager.updateUserRole(
                user.$id,
                user.facilityId,
                'supervisor'
            );
            
            // Enhanced system should reflect the change
            const updatedUser = {
                ...user,
                teams: [{ id: `facility-${user.facilityId}-team`, role: 'owner' }]
            };
            
            const result = await checkEnhancedPermission(
                user.$id,
                'collections.patients',
                'create',
                { 
                    roles: ['supervisor'], // Role changed
                    facilityId: user.facilityId,
                    teams: updatedUser.teams
                }
            );
            
            expect(result.allowed).toBe(true);
        });

        it('should support cross-facility team management for administrators', async () => {
            const admin = testUsers.administrator;
            
            // Admin should be able to manage teams across facilities
            const allFacilityTeams = await facilityTeamManager.getAllFacilityTeams();
            
            expect(allFacilityTeams.length).toBeGreaterThan(1);
            
            // Enhanced system should allow admin access to all facilities
            for (const facilityId of ['1', '2', '3']) {
                const result = await checkEnhancedPermission(
                    admin.$id,
                    'collections.patients',
                    'read',
                    { 
                        roles: admin.roles,
                        facilityId: null, // Admin has no specific facility
                        teams: admin.teams,
                        resourceContext: { facilityId }
                    }
                );
                
                expect(result.allowed).toBe(true);
                expect(result.scope).toBe('all_facilities');
            }
        });
    });

    describe('Backward Compatibility', () => {
        it('should support legacy permission function signatures', async () => {
            // Test various legacy function signatures that might exist
            const legacyTests = [
                {
                    // Simple role-based check
                    call: () => checkEnhancedPermission(
                        testUsers.user.$id,
                        'patients',
                        'read',
                        { role: 'user' }
                    ),
                    expected: true
                },
                {
                    // Collection-prefixed resource
                    call: () => checkEnhancedPermission(
                        testUsers.supervisor.$id,
                        'collections.immunization_records',
                        'create',
                        { roles: ['supervisor'], facilityId: '1' }
                    ),
                    expected: true
                },
                {
                    // Array of roles
                    call: () => checkEnhancedPermission(
                        testUsers.multiRoleUser.$id,
                        'collections.patients',
                        'update',
                        { roles: ['doctor', 'supervisor'], facilityId: '1' }
                    ),
                    expected: true
                }
            ];
            
            for (const test of legacyTests) {
                const result = await test.call();
                expect(result.allowed).toBe(test.expected);
            }
        });

        it('should maintain existing error handling patterns', async () => {
            // Test that existing error patterns are preserved
            const errorTests = [
                {
                    // Invalid user
                    call: () => checkEnhancedPermission(
                        null,
                        'collections.patients',
                        'read',
                        { roles: ['user'] }
                    ),
                    expectedError: 'Invalid user context'
                },
                {
                    // Invalid resource
                    call: () => checkEnhancedPermission(
                        testUsers.user.$id,
                        'invalid_resource',
                        'read',
                        { roles: ['user'] }
                    ),
                    expectedError: 'Invalid resource'
                }
            ];
            
            for (const test of errorTests) {
                const result = await test.call();
                expect(result.allowed).toBe(false);
                expect(result.reason).toContain(test.expectedError);
            }
        });

        it('should preserve existing configuration structure', async () => {
            // Verify that existing configuration keys are still accessible
            const config = await configLoader.getConfiguration('permissions');
            
            // These would be existing configuration keys
            expect(config).toHaveProperty('permissionMatrix');
            expect(config).toHaveProperty('roleHierarchy');
            expect(config).toHaveProperty('teamBasedPermissions');
            
            // New enhanced keys should also be present
            const collectionConfig = await configLoader.getConfiguration('collectionPermissions');
            expect(collectionConfig).toHaveProperty('rolePermissions');
            expect(collectionConfig).toHaveProperty('collections');
        });

        it('should support existing utility method signatures', async () => {
            // Test that existing utility methods still work
            const supervisor = testUsers.supervisor;
            
            // Legacy team permission checker methods
            const legacyMethods = [
                {
                    method: 'checkTeamAccess',
                    args: [supervisor.$id, 'facility-1-team', 'patients', 'read'],
                    expected: true
                },
                {
                    method: 'hasPermission',
                    args: [supervisor.$id, 'patients', 'create'],
                    expected: true
                },
                {
                    method: 'checkFacilityTeamAccess',
                    args: [supervisor.$id, supervisor.facilityId, 'patients', 'update'],
                    expected: true
                }
            ];
            
            for (const test of legacyMethods) {
                const result = await teamPermissionChecker[test.method](...test.args);
                expect(result).toBe(test.expected);
            }
            
            // Legacy facility team manager methods
            const facilityMethods = [
                {
                    method: 'getFacilityTeams',
                    args: [supervisor.facilityId],
                    expectedType: 'array'
                },
                {
                    method: 'getUserTeams',
                    args: [supervisor.$id],
                    expectedType: 'array'
                },
                {
                    method: 'getUserRoleInFacility',
                    args: [supervisor.$id, supervisor.facilityId],
                    expectedType: 'string'
                }
            ];
            
            for (const test of facilityMethods) {
                const result = await facilityTeamManager[test.method](...test.args);
                expect(typeof result === test.expectedType || Array.isArray(result)).toBe(true);
            }
        });
    });

    describe('Performance Impact Assessment', () => {
        it('should not significantly impact existing utility performance', async () => {
            const iterations = 100;
            const user = testUsers.doctor;
            
            // Measure legacy team permission check performance
            const legacyStartTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await teamPermissionChecker.hasPermission(
                    user.$id,
                    'patients',
                    'read'
                );
            }
            const legacyEndTime = Date.now();
            const legacyAvgTime = (legacyEndTime - legacyStartTime) / iterations;
            
            // Measure enhanced permission check performance
            const enhancedStartTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await checkEnhancedPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { 
                        roles: user.roles,
                        facilityId: user.facilityId,
                        teams: user.teams
                    }
                );
            }
            const enhancedEndTime = Date.now();
            const enhancedAvgTime = (enhancedEndTime - enhancedStartTime) / iterations;
            
            // Enhanced system should not be more than 2x slower than legacy
            expect(enhancedAvgTime).toBeLessThan(legacyAvgTime * 2);
            
            // Both should be reasonably fast
            expect(legacyAvgTime).toBeLessThan(10);
            expect(enhancedAvgTime).toBeLessThan(20);
        });

        it('should benefit from caching in repeated operations', async () => {
            const user = testUsers.user;
            const iterations = 50;
            
            // First run (cache miss)
            const firstRunStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await checkEnhancedPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { 
                        roles: user.roles,
                        facilityId: user.facilityId,
                        teams: user.teams
                    }
                );
            }
            const firstRunEnd = Date.now();
            
            // Second run (cache hit)
            const secondRunStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await checkEnhancedPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { 
                        roles: user.roles,
                        facilityId: user.facilityId,
                        teams: user.teams
                    }
                );
            }
            const secondRunEnd = Date.now();
            
            const firstRunTime = firstRunEnd - firstRunStart;
            const secondRunTime = secondRunEnd - secondRunStart;
            
            // Second run should be faster due to caching
            expect(secondRunTime).toBeLessThan(firstRunTime);
        });
    });

    describe('Migration Compatibility', () => {
        it('should work with existing database permissions', async () => {
            // Test that enhanced system works with current database state
            const databases = mockSDK.Databases();
            
            // Mock existing collection with legacy permissions
            databases.getCollection.mockResolvedValue({
                $id: 'patients',
                name: 'Patients',
                $permissions: [
                    'read("role:administrator")',
                    'write("role:administrator")',
                    'read("role:supervisor")',
                    'write("role:supervisor")',
                    'read("team:facility-1-team")'
                ]
            });
            
            // Enhanced system should understand legacy permissions
            const supervisor = testUsers.supervisor;
            const result = await checkEnhancedPermission(
                supervisor.$id,
                'collections.patients',
                'read',
                { 
                    roles: supervisor.roles,
                    facilityId: supervisor.facilityId,
                    teams: supervisor.teams
                }
            );
            
            expect(result.allowed).toBe(true);
        });

        it('should support gradual migration of permissions', async () => {
            // Test mixed permission scenarios during migration
            const collections = ['patients', 'immunization_records'];
            const user = testUsers.doctor;
            
            for (const collection of collections) {
                // Some collections might be migrated, others not
                const result = await checkEnhancedPermission(
                    user.$id,
                    `collections.${collection}`,
                    'read',
                    { 
                        roles: user.roles,
                        facilityId: user.facilityId,
                        teams: user.teams
                    }
                );
                
                // Should work regardless of migration state
                expect(result).toHaveProperty('allowed');
                expect(result).toHaveProperty('reason');
            }
        });
    });
});