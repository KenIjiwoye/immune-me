/**
 * Performance Tests for BE-AW-10 Enhanced Permission System
 * 
 * Tests performance characteristics of the permission system including:
 * - Permission checking performance with caching
 * - Query performance with security filters
 * - Configuration loading performance
 * - Concurrent permission checks
 * - Cache effectiveness
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

// Import test data and mocks
const { testUsers, performanceTestData } = require('../fixtures/test-data');
const { MockFactory } = require('../mocks/appwrite-mocks');

describe('Permission System Performance Tests', () => {
    let configLoader;
    let permissionValidator;
    let documentSecurity;
    let facilityScopedQueries;
    let mockSDK;

    // Performance benchmarks (in milliseconds)
    const PERFORMANCE_BENCHMARKS = {
        PERMISSION_CHECK_AVG: 10,
        PERMISSION_CHECK_CACHED: 5,
        QUERY_BUILD_AVG: 5,
        CONFIG_LOAD_MAX: 2000,
        CONCURRENT_OPERATIONS: 1000,
        CACHE_HIT_RATIO_MIN: 0.8
    };

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

    describe('Permission Checking Performance', () => {
        it('should check permissions efficiently with caching', async () => {
            const user = testUsers.user;
            const iterations = 100;
            
            // Warm up the cache
            await permissionValidator.checkPermission(
                user.$id,
                'collections.patients',
                'read',
                { userContext: user }
            );

            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                );
            }

            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;

            expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_CACHED);
            
            console.log(`✓ Cached permission check average: ${avgTime.toFixed(2)}ms (target: <${PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_CACHED}ms)`);
        });

        it('should handle cold cache permission checks within acceptable time', async () => {
            const iterations = 50;
            const users = Object.values(testUsers).slice(0, 4); // Use first 4 users
            
            // Clear cache to ensure cold start
            configLoader.clearCache();

            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const user = users[i % users.length];
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                );
            }

            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;

            expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_AVG);
            
            console.log(`✓ Cold cache permission check average: ${avgTime.toFixed(2)}ms (target: <${PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_AVG}ms)`);
        });

        it('should handle concurrent permission checks efficiently', async () => {
            const concurrentChecks = 50;
            const user = testUsers.doctor;
            
            const promises = Array(concurrentChecks).fill().map((_, i) => 
                permissionValidator.checkPermission(
                    user.$id,
                    'collections.immunization_records',
                    'create',
                    { userContext: user }
                )
            );

            const startTime = Date.now();
            const results = await Promise.all(promises);
            const endTime = Date.now();

            const totalTime = endTime - startTime;
            const avgTime = totalTime / concurrentChecks;

            expect(results).toHaveLength(concurrentChecks);
            expect(results.every(r => r.allowed !== undefined)).toBe(true);
            expect(totalTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONCURRENT_OPERATIONS);
            
            console.log(`✓ Concurrent operations (${concurrentChecks}): ${totalTime}ms total, ${avgTime.toFixed(2)}ms average`);
        });

        it('should demonstrate cache effectiveness', async () => {
            const user = testUsers.supervisor;
            const iterations = 100;
            
            // Clear cache and perform operations
            configLoader.clearCache();
            
            // First run - cache misses
            const firstRunStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'update',
                    { userContext: user }
                );
            }
            const firstRunEnd = Date.now();
            
            // Second run - cache hits
            const secondRunStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'update',
                    { userContext: user }
                );
            }
            const secondRunEnd = Date.now();
            
            const firstRunTime = firstRunEnd - firstRunStart;
            const secondRunTime = secondRunEnd - secondRunStart;
            const improvement = (firstRunTime - secondRunTime) / firstRunTime;
            
            expect(improvement).toBeGreaterThan(PERFORMANCE_BENCHMARKS.CACHE_HIT_RATIO_MIN);
            
            console.log(`✓ Cache effectiveness: ${(improvement * 100).toFixed(1)}% improvement (target: >${(PERFORMANCE_BENCHMARKS.CACHE_HIT_RATIO_MIN * 100)}%)`);
        });

        it('should handle permission checks for different roles efficiently', async () => {
            const roles = ['administrator', 'supervisor', 'doctor', 'user'];
            const operations = ['create', 'read', 'update', 'delete'];
            const collections = ['patients', 'immunization_records'];
            
            const totalOperations = roles.length * operations.length * collections.length;
            
            const startTime = Date.now();
            
            for (const roleKey of roles) {
                const user = testUsers[roleKey];
                if (!user) continue;
                
                for (const collection of collections) {
                    for (const operation of operations) {
                        await permissionValidator.checkPermission(
                            user.$id,
                            `collections.${collection}`,
                            operation,
                            { userContext: user }
                        );
                    }
                }
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / totalOperations;
            
            expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_AVG);
            
            console.log(`✓ Multi-role permission checks: ${avgTime.toFixed(2)}ms average across ${totalOperations} operations`);
        });
    });

    describe('Query Performance with Security Filters', () => {
        it('should build secure queries efficiently', async () => {
            const iterations = 100;
            const user = testUsers.doctor;
            
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                await facilityScopedQueries.buildSecureQuery(
                    user,
                    'patients',
                    { status: 'active', name: `Patient ${i}` }
                );
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.QUERY_BUILD_AVG);
            
            console.log(`✓ Secure query building average: ${avgTime.toFixed(2)}ms (target: <${PERFORMANCE_BENCHMARKS.QUERY_BUILD_AVG}ms)`);
        });

        it('should handle complex query filters efficiently', async () => {
            const user = testUsers.supervisor;
            const complexFilters = {
                status: 'active',
                dateOfBirth: '1990-01-01',
                gender: 'male',
                lastVisit: '2023-01-01',
                immunizationStatus: 'up_to_date'
            };
            
            const iterations = 50;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                await facilityScopedQueries.buildSecureQuery(
                    user,
                    'patients',
                    complexFilters
                );
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.QUERY_BUILD_AVG * 2); // Allow 2x for complex queries
            
            console.log(`✓ Complex query building average: ${avgTime.toFixed(2)}ms`);
        });

        it('should execute secure queries with acceptable performance', async () => {
            const user = testUsers.user;
            const databases = mockSDK.Databases();
            
            // Mock database response
            databases.listDocuments.mockResolvedValue({
                documents: Array(100).fill().map((_, i) => ({
                    $id: `patient-${i}`,
                    facilityId: user.facilityId,
                    name: `Patient ${i}`
                })),
                total: 100
            });
            
            const iterations = 20;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const query = await facilityScopedQueries.buildSecureQuery(
                    user,
                    'patients',
                    { status: 'active' }
                );
                
                await facilityScopedQueries.executeSecureQuery(
                    databases,
                    'test-db',
                    'patients',
                    query
                );
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            expect(avgTime).toBeLessThan(50); // 50ms for query execution
            
            console.log(`✓ Secure query execution average: ${avgTime.toFixed(2)}ms`);
        });
    });

    describe('Configuration Loading Performance', () => {
        it('should load configurations within acceptable time limits', async () => {
            // Clear cache to force reload
            configLoader.clearCache();
            
            const startTime = Date.now();
            await configLoader.initialize();
            const endTime = Date.now();
            
            const loadTime = endTime - startTime;
            
            expect(loadTime).toBeLessThan(PERFORMANCE_BENCHMARKS.CONFIG_LOAD_MAX);
            
            console.log(`✓ Configuration loading time: ${loadTime}ms (target: <${PERFORMANCE_BENCHMARKS.CONFIG_LOAD_MAX}ms)`);
        });

        it('should cache configurations effectively', async () => {
            const iterations = 50;
            
            // First load (cache miss)
            const firstLoadStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await configLoader.getConfiguration('permissions');
            }
            const firstLoadEnd = Date.now();
            
            // Second load (cache hit)
            const secondLoadStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                await configLoader.getConfiguration('permissions');
            }
            const secondLoadEnd = Date.now();
            
            const firstLoadTime = firstLoadEnd - firstLoadStart;
            const secondLoadTime = secondLoadEnd - secondLoadStart;
            
            expect(secondLoadTime).toBeLessThan(firstLoadTime / 2); // Should be at least 2x faster
            
            console.log(`✓ Configuration caching: ${firstLoadTime}ms → ${secondLoadTime}ms (${((1 - secondLoadTime/firstLoadTime) * 100).toFixed(1)}% improvement)`);
        });

        it('should handle concurrent configuration access efficiently', async () => {
            const concurrentRequests = 25;
            const configTypes = ['permissions', 'collectionPermissions', 'securityRules'];
            
            const promises = Array(concurrentRequests).fill().map((_, i) => 
                configLoader.getConfiguration(configTypes[i % configTypes.length])
            );
            
            const startTime = Date.now();
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            
            expect(results).toHaveLength(concurrentRequests);
            expect(results.every(r => r !== null && r !== undefined)).toBe(true);
            expect(totalTime).toBeLessThan(500); // 500ms for concurrent config access
            
            console.log(`✓ Concurrent configuration access (${concurrentRequests}): ${totalTime}ms`);
        });
    });

    describe('Document Security Performance', () => {
        it('should generate document permissions efficiently', async () => {
            const user = testUsers.supervisor;
            const iterations = 100;
            
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const document = {
                    name: `Patient ${i}`,
                    facilityId: user.facilityId
                };
                
                await documentSecurity.generateDocumentPermissions(
                    user,
                    'patients',
                    document
                );
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            expect(avgTime).toBeLessThan(5); // 5ms for permission generation
            
            console.log(`✓ Document permission generation average: ${avgTime.toFixed(2)}ms`);
        });

        it('should check document access efficiently', async () => {
            const user = testUsers.doctor;
            const document = {
                $id: 'test-patient',
                facilityId: user.facilityId,
                name: 'Test Patient'
            };
            
            const iterations = 100;
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                await documentSecurity.checkDocumentAccess(
                    user,
                    document,
                    'read'
                );
            }
            
            const endTime = Date.now();
            const avgTime = (endTime - startTime) / iterations;
            
            expect(avgTime).toBeLessThan(3); // 3ms for document access check
            
            console.log(`✓ Document access check average: ${avgTime.toFixed(2)}ms`);
        });
    });

    describe('Large Scale Performance Tests', () => {
        it('should handle large batch operations efficiently', async () => {
            const batchSize = 1000;
            const operations = performanceTestData.largeBatchOperations.slice(0, batchSize);
            
            const startTime = Date.now();
            
            const promises = operations.map(op => 
                permissionValidator.checkPermission(
                    op.userId,
                    `collections.${op.collection}`,
                    op.operation,
                    { userContext: testUsers.user } // Use a default user context
                )
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / batchSize;
            
            expect(results).toHaveLength(batchSize);
            expect(avgTime).toBeLessThan(20); // 20ms average for large batches
            
            console.log(`✓ Large batch operations (${batchSize}): ${totalTime}ms total, ${avgTime.toFixed(2)}ms average`);
        });

        it('should maintain performance with many concurrent users', async () => {
            const concurrentUsers = performanceTestData.concurrentUsers.slice(0, 50);
            
            const promises = concurrentUsers.map(user => 
                permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                )
            );
            
            const startTime = Date.now();
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / concurrentUsers.length;
            
            expect(results).toHaveLength(concurrentUsers.length);
            expect(totalTime).toBeLessThan(2000); // 2 seconds for 50 concurrent users
            
            console.log(`✓ Concurrent users (${concurrentUsers.length}): ${totalTime}ms total, ${avgTime.toFixed(2)}ms average`);
        });
    });

    describe('Memory Usage and Resource Management', () => {
        it('should manage cache memory efficiently', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Perform many operations to populate cache
            const iterations = 500;
            const users = Object.values(testUsers);
            
            for (let i = 0; i < iterations; i++) {
                const user = users[i % users.length];
                await permissionValidator.checkPermission(
                    user.$id,
                    'collections.patients',
                    'read',
                    { userContext: user }
                );
            }
            
            const afterOperationsMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterOperationsMemory - initialMemory;
            
            // Clear cache
            configLoader.clearCache();
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const afterClearMemory = process.memoryUsage().heapUsed;
            const memoryAfterClear = afterClearMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
            
            console.log(`✓ Memory usage: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB during operations, +${(memoryAfterClear / 1024 / 1024).toFixed(2)}MB after cleanup`);
        });

        it('should handle cache eviction gracefully', async () => {
            const user = testUsers.user;
            
            // Fill cache with many different permission checks
            const operations = [];
            for (let i = 0; i < 100; i++) {
                operations.push(
                    permissionValidator.checkPermission(
                        user.$id,
                        `collections.patients`,
                        'read',
                        { userContext: { ...user, cacheKey: i } } // Different cache keys
                    )
                );
            }
            
            const startTime = Date.now();
            await Promise.all(operations);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            const avgTime = totalTime / operations.length;
            
            expect(avgTime).toBeLessThan(15); // Should handle cache eviction gracefully
            
            console.log(`✓ Cache eviction handling: ${avgTime.toFixed(2)}ms average with cache pressure`);
        });
    });

    describe('Performance Regression Detection', () => {
        it('should maintain baseline performance metrics', async () => {
            const metrics = {
                permissionCheck: 0,
                queryBuild: 0,
                documentSecurity: 0,
                configLoad: 0
            };
            
            const iterations = 20;
            
            // Permission check performance
            let startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await permissionValidator.checkPermission(
                    testUsers.user.$id,
                    'collections.patients',
                    'read',
                    { userContext: testUsers.user }
                );
            }
            metrics.permissionCheck = (Date.now() - startTime) / iterations;
            
            // Query build performance
            startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await facilityScopedQueries.buildSecureQuery(
                    testUsers.doctor,
                    'patients',
                    { status: 'active' }
                );
            }
            metrics.queryBuild = (Date.now() - startTime) / iterations;
            
            // Document security performance
            startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await documentSecurity.checkDocumentAccess(
                    testUsers.doctor,
                    { $id: 'test', facilityId: testUsers.doctor.facilityId },
                    'read'
                );
            }
            metrics.documentSecurity = (Date.now() - startTime) / iterations;
            
            // Configuration load performance
            configLoader.clearCache();
            startTime = Date.now();
            await configLoader.getConfiguration('permissions');
            metrics.configLoad = Date.now() - startTime;
            
            // Validate against benchmarks
            expect(metrics.permissionCheck).toBeLessThan(PERFORMANCE_BENCHMARKS.PERMISSION_CHECK_CACHED);
            expect(metrics.queryBuild).toBeLessThan(PERFORMANCE_BENCHMARKS.QUERY_BUILD_AVG);
            expect(metrics.documentSecurity).toBeLessThan(5);
            expect(metrics.configLoad).toBeLessThan(100);
            
            console.log('✓ Performance baseline metrics:');
            console.log(`  - Permission check: ${metrics.permissionCheck.toFixed(2)}ms`);
            console.log(`  - Query build: ${metrics.queryBuild.toFixed(2)}ms`);
            console.log(`  - Document security: ${metrics.documentSecurity.toFixed(2)}ms`);
            console.log(`  - Config load: ${metrics.configLoad}ms`);
        });
    });
});