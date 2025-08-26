/**
 * Test Data Fixtures for BE-AW-10 Permission System Tests
 * 
 * Provides comprehensive test data including users, facilities, documents,
 * and mock Appwrite responses for testing the enhanced permission system.
 */

/**
 * Test Users with different roles and facility assignments
 */
const testUsers = {
    administrator: {
        $id: 'admin-001',
        email: 'admin@immuneme.com',
        name: 'System Administrator',
        labels: ['administrator'],
        roles: ['administrator'],
        facilityId: null,
        teams: [{ id: 'global-admin-team', role: 'owner' }],
        status: true,
        emailVerification: true,
        registration: '2023-01-01T00:00:00.000Z',
        prefs: {
            theme: 'light',
            notifications: true
        }
    },
    supervisor: {
        $id: 'supervisor-001',
        email: 'supervisor@facility1.com',
        name: 'Facility Supervisor',
        labels: ['supervisor', 'facility_1'],
        roles: ['supervisor'],
        facilityId: '1',
        teams: [{ id: 'facility-1-team', role: 'owner' }],
        status: true,
        emailVerification: true,
        registration: '2023-01-15T00:00:00.000Z',
        prefs: {
            facilityDashboard: true,
            reportNotifications: true
        }
    },
    doctor: {
        $id: 'doctor-001',
        email: 'doctor@facility1.com',
        name: 'Dr. Sarah Smith',
        labels: ['doctor', 'facility_1'],
        roles: ['doctor'],
        facilityId: '1',
        teams: [{ id: 'facility-1-team', role: 'member' }],
        status: true,
        emailVerification: true,
        registration: '2023-02-01T00:00:00.000Z',
        prefs: {
            patientAlerts: true,
            scheduleReminders: true
        }
    },
    user: {
        $id: 'user-001',
        email: 'user@facility2.com',
        name: 'Basic User',
        labels: ['user', 'facility_2'],
        roles: ['user'],
        facilityId: '2',
        teams: [{ id: 'facility-2-team', role: 'member' }],
        status: true,
        emailVerification: true,
        registration: '2023-02-15T00:00:00.000Z',
        prefs: {
            viewMode: 'simple'
        }
    },
    // Additional test users for edge cases
    multiRoleUser: {
        $id: 'multi-001',
        email: 'multi@facility1.com',
        name: 'Multi Role User',
        labels: ['doctor', 'supervisor', 'facility_1'],
        roles: ['doctor', 'supervisor'],
        facilityId: '1',
        teams: [
            { id: 'facility-1-team', role: 'owner' },
            { id: 'medical-team', role: 'member' }
        ],
        status: true,
        emailVerification: true,
        registration: '2023-03-01T00:00:00.000Z'
    },
    inactiveUser: {
        $id: 'inactive-001',
        email: 'inactive@facility1.com',
        name: 'Inactive User',
        labels: ['user', 'facility_1'],
        roles: ['user'],
        facilityId: '1',
        teams: [{ id: 'facility-1-team', role: 'member' }],
        status: false,
        emailVerification: true,
        registration: '2023-01-01T00:00:00.000Z'
    }
};

/**
 * Test Facilities
 */
const testFacilities = {
    facility1: {
        $id: '1',
        name: 'Central Hospital',
        region: 'North',
        type: 'hospital',
        address: '123 Main St, City, State',
        phone: '+1-555-0101',
        email: 'contact@central-hospital.com',
        capacity: 500,
        status: 'active',
        $createdAt: '2023-01-01T00:00:00.000Z',
        $updatedAt: '2023-01-01T00:00:00.000Z'
    },
    facility2: {
        $id: '2',
        name: 'Community Clinic',
        region: 'South',
        type: 'clinic',
        address: '456 Oak Ave, Town, State',
        phone: '+1-555-0102',
        email: 'info@community-clinic.com',
        capacity: 100,
        status: 'active',
        $createdAt: '2023-01-15T00:00:00.000Z',
        $updatedAt: '2023-01-15T00:00:00.000Z'
    },
    facility3: {
        $id: '3',
        name: 'Rural Health Center',
        region: 'West',
        type: 'health_center',
        address: '789 Pine Rd, Village, State',
        phone: '+1-555-0103',
        email: 'contact@rural-health.com',
        capacity: 50,
        status: 'active',
        $createdAt: '2023-02-01T00:00:00.000Z',
        $updatedAt: '2023-02-01T00:00:00.000Z'
    }
};

/**
 * Test Teams
 */
const testTeams = {
    globalAdminTeam: {
        $id: 'global-admin-team',
        name: 'Global Administrators',
        total: 2,
        $createdAt: '2023-01-01T00:00:00.000Z',
        $updatedAt: '2023-01-01T00:00:00.000Z'
    },
    facility1Team: {
        $id: 'facility-1-team',
        name: 'Central Hospital Team',
        total: 15,
        $createdAt: '2023-01-01T00:00:00.000Z',
        $updatedAt: '2023-01-01T00:00:00.000Z'
    },
    facility2Team: {
        $id: 'facility-2-team',
        name: 'Community Clinic Team',
        total: 8,
        $createdAt: '2023-01-15T00:00:00.000Z',
        $updatedAt: '2023-01-15T00:00:00.000Z'
    },
    medicalTeam: {
        $id: 'medical-team',
        name: 'Medical Professionals',
        total: 25,
        $createdAt: '2023-01-01T00:00:00.000Z',
        $updatedAt: '2023-01-01T00:00:00.000Z'
    }
};

/**
 * Test Documents for various collections
 */
const testDocuments = {
    patients: [
        {
            $id: 'patient-001',
            facilityId: '1',
            name: 'John Doe',
            dateOfBirth: '1990-01-01',
            gender: 'male',
            medicalRecordNumber: 'MRN001',
            contactInfo: {
                phone: '+1-555-1001',
                email: 'john.doe@email.com',
                address: '123 Patient St, City, State'
            },
            emergencyContact: {
                name: 'Jane Doe',
                relationship: 'spouse',
                phone: '+1-555-1002'
            },
            status: 'active',
            $createdAt: '2023-01-01T00:00:00.000Z',
            $updatedAt: '2023-01-01T00:00:00.000Z',
            $permissions: [
                'read("team:facility-1-team")',
                'write("role:supervisor")',
                'write("role:doctor")',
                'read("role:administrator")',
                'write("role:administrator")'
            ]
        },
        {
            $id: 'patient-002',
            facilityId: '2',
            name: 'Alice Johnson',
            dateOfBirth: '1985-05-15',
            gender: 'female',
            medicalRecordNumber: 'MRN002',
            contactInfo: {
                phone: '+1-555-2001',
                email: 'alice.johnson@email.com',
                address: '456 Patient Ave, Town, State'
            },
            status: 'active',
            $createdAt: '2023-01-15T00:00:00.000Z',
            $updatedAt: '2023-01-15T00:00:00.000Z',
            $permissions: [
                'read("team:facility-2-team")',
                'write("role:supervisor")',
                'write("role:doctor")',
                'read("role:administrator")',
                'write("role:administrator")'
            ]
        }
    ],
    immunizationRecords: [
        {
            $id: 'imm-001',
            facilityId: '1',
            patientId: 'patient-001',
            vaccineId: 'vaccine-001',
            administeredDate: '2023-01-15T10:00:00.000Z',
            administeredBy: 'doctor-001',
            batchNumber: 'BATCH001',
            expirationDate: '2024-01-15',
            site: 'left_arm',
            route: 'intramuscular',
            dose: '0.5ml',
            notes: 'Patient tolerated well',
            nextDueDate: '2023-07-15',
            status: 'completed',
            $createdAt: '2023-01-15T10:30:00.000Z',
            $updatedAt: '2023-01-15T10:30:00.000Z',
            $permissions: [
                'read("team:facility-1-team")',
                'write("role:doctor")',
                'write("role:supervisor")',
                'read("role:administrator")',
                'write("role:administrator")'
            ]
        },
        {
            $id: 'imm-002',
            facilityId: '2',
            patientId: 'patient-002',
            vaccineId: 'vaccine-002',
            administeredDate: '2023-02-01T14:00:00.000Z',
            administeredBy: 'doctor-002',
            batchNumber: 'BATCH002',
            expirationDate: '2024-02-01',
            site: 'right_arm',
            route: 'intramuscular',
            dose: '0.5ml',
            status: 'completed',
            $createdAt: '2023-02-01T14:30:00.000Z',
            $updatedAt: '2023-02-01T14:30:00.000Z',
            $permissions: [
                'read("team:facility-2-team")',
                'write("role:doctor")',
                'write("role:supervisor")',
                'read("role:administrator")',
                'write("role:administrator")'
            ]
        }
    ],
    vaccines: [
        {
            $id: 'vaccine-001',
            name: 'COVID-19 mRNA Vaccine',
            manufacturer: 'Pfizer-BioNTech',
            type: 'mRNA',
            ageGroups: ['adult', 'elderly'],
            dosesRequired: 2,
            intervalBetweenDoses: 21,
            storageTemperature: '-70°C',
            status: 'active',
            approvalDate: '2020-12-11',
            $createdAt: '2023-01-01T00:00:00.000Z',
            $updatedAt: '2023-01-01T00:00:00.000Z',
            $permissions: [
                'read("any")',
                'write("role:administrator")'
            ]
        },
        {
            $id: 'vaccine-002',
            name: 'Influenza Vaccine',
            manufacturer: 'Sanofi',
            type: 'inactivated',
            ageGroups: ['child', 'adult', 'elderly'],
            dosesRequired: 1,
            intervalBetweenDoses: 0,
            storageTemperature: '2-8°C',
            status: 'active',
            seasonality: 'annual',
            $createdAt: '2023-01-01T00:00:00.000Z',
            $updatedAt: '2023-01-01T00:00:00.000Z',
            $permissions: [
                'read("any")',
                'write("role:administrator")'
            ]
        }
    ],
    notifications: [
        {
            $id: 'notif-001',
            facilityId: '1',
            userId: 'doctor-001',
            type: 'immunization_due',
            title: 'Immunization Due',
            message: 'Patient John Doe has an immunization due',
            priority: 'medium',
            status: 'unread',
            relatedEntityType: 'patient',
            relatedEntityId: 'patient-001',
            scheduledFor: '2023-07-15T09:00:00.000Z',
            $createdAt: '2023-07-10T00:00:00.000Z',
            $updatedAt: '2023-07-10T00:00:00.000Z',
            $permissions: [
                'read("user:doctor-001")',
                'write("user:doctor-001")',
                'read("role:supervisor")',
                'write("role:supervisor")',
                'read("role:administrator")',
                'write("role:administrator")'
            ]
        }
    ]
};

/**
 * Mock Appwrite SDK Responses
 */
const mockAppwriteResponses = {
    // Database responses
    databases: {
        get: (databaseId) => ({
            $id: databaseId,
            name: `Test Database ${databaseId}`,
            $createdAt: '2023-01-01T00:00:00.000Z',
            $updatedAt: '2023-01-01T00:00:00.000Z'
        }),
        
        listCollections: () => ({
            total: 8,
            collections: [
                { $id: 'patients', name: 'Patients', enabled: true },
                { $id: 'immunization_records', name: 'Immunization Records', enabled: true },
                { $id: 'facilities', name: 'Facilities', enabled: true },
                { $id: 'vaccines', name: 'Vaccines', enabled: true },
                { $id: 'vaccine_schedules', name: 'Vaccine Schedules', enabled: true },
                { $id: 'vaccine_schedule_items', name: 'Vaccine Schedule Items', enabled: true },
                { $id: 'notifications', name: 'Notifications', enabled: true },
                { $id: 'supplementary_immunizations', name: 'Supplementary Immunizations', enabled: true }
            ]
        }),

        listDocuments: (databaseId, collectionId, queries = []) => {
            const collection = testDocuments[collectionId] || [];
            let filteredDocs = [...collection];

            // Apply basic query filtering for testing
            queries.forEach(query => {
                if (query.includes('facilityId')) {
                    const facilityId = query.split('=')[1];
                    filteredDocs = filteredDocs.filter(doc => doc.facilityId === facilityId);
                }
            });

            return {
                total: filteredDocs.length,
                documents: filteredDocs
            };
        },

        createDocument: (databaseId, collectionId, documentId, data, permissions) => ({
            $id: documentId,
            ...data,
            $permissions: permissions || [],
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        }),

        updateDocument: (databaseId, collectionId, documentId, data, permissions) => ({
            $id: documentId,
            ...data,
            $permissions: permissions || [],
            $updatedAt: new Date().toISOString()
        }),

        deleteDocument: (databaseId, collectionId, documentId) => ({
            $id: documentId,
            deleted: true
        }),

        updateCollection: (databaseId, collectionId, name, permissions, documentSecurity, enabled) => ({
            $id: collectionId,
            name: name,
            $permissions: permissions || [],
            documentSecurity: documentSecurity !== undefined ? documentSecurity : true,
            enabled: enabled !== undefined ? enabled : true,
            $updatedAt: new Date().toISOString()
        })
    },

    // Teams responses
    teams: {
        list: () => ({
            total: Object.keys(testTeams).length,
            teams: Object.values(testTeams)
        }),

        get: (teamId) => testTeams[Object.keys(testTeams).find(key => testTeams[key].$id === teamId)],

        listMemberships: (teamId) => {
            const memberships = [];
            Object.values(testUsers).forEach(user => {
                const teamMembership = user.teams.find(team => team.id === teamId);
                if (teamMembership) {
                    memberships.push({
                        $id: `membership-${user.$id}-${teamId}`,
                        userId: user.$id,
                        teamId: teamId,
                        roles: [teamMembership.role],
                        invited: new Date().toISOString(),
                        joined: new Date().toISOString(),
                        confirm: true
                    });
                }
            });
            return {
                total: memberships.length,
                memberships: memberships
            };
        }
    },

    // Users responses
    users: {
        get: (userId) => testUsers[Object.keys(testUsers).find(key => testUsers[key].$id === userId)],
        
        list: () => ({
            total: Object.keys(testUsers).length,
            users: Object.values(testUsers)
        })
    }
};

/**
 * Permission Test Scenarios
 */
const permissionTestScenarios = {
    // Administrator scenarios
    administratorFullAccess: {
        user: testUsers.administrator,
        tests: [
            { collection: 'patients', operation: 'create', expected: true },
            { collection: 'patients', operation: 'read', expected: true },
            { collection: 'patients', operation: 'update', expected: true },
            { collection: 'patients', operation: 'delete', expected: true },
            { collection: 'immunization_records', operation: 'delete', expected: true },
            { collection: 'facilities', operation: 'create', expected: true },
            { collection: 'vaccines', operation: 'update', expected: true }
        ]
    },

    // Supervisor scenarios
    supervisorFacilityScoped: {
        user: testUsers.supervisor,
        tests: [
            { collection: 'patients', operation: 'create', expected: true, facilityId: '1' },
            { collection: 'patients', operation: 'read', expected: true, facilityId: '1' },
            { collection: 'patients', operation: 'update', expected: true, facilityId: '1' },
            { collection: 'patients', operation: 'delete', expected: false, facilityId: '1' },
            { collection: 'patients', operation: 'read', expected: false, facilityId: '2' }, // Cross-facility
            { collection: 'immunization_records', operation: 'create', expected: true, facilityId: '1' },
            { collection: 'vaccines', operation: 'read', expected: true }, // Reference data
            { collection: 'vaccines', operation: 'update', expected: false } // Reference data write
        ]
    },

    // Doctor scenarios
    doctorLimitedAccess: {
        user: testUsers.doctor,
        tests: [
            { collection: 'patients', operation: 'create', expected: false },
            { collection: 'patients', operation: 'read', expected: true, facilityId: '1' },
            { collection: 'patients', operation: 'update', expected: true, facilityId: '1' },
            { collection: 'patients', operation: 'delete', expected: false },
            { collection: 'immunization_records', operation: 'create', expected: true, facilityId: '1' },
            { collection: 'immunization_records', operation: 'read', expected: true, facilityId: '1' },
            { collection: 'immunization_records', operation: 'update', expected: true, facilityId: '1' },
            { collection: 'immunization_records', operation: 'delete', expected: false }
        ]
    },

    // Basic user scenarios
    userReadOnlyAccess: {
        user: testUsers.user,
        tests: [
            { collection: 'patients', operation: 'create', expected: false },
            { collection: 'patients', operation: 'read', expected: true, facilityId: '2' },
            { collection: 'patients', operation: 'update', expected: false },
            { collection: 'patients', operation: 'delete', expected: false },
            { collection: 'immunization_records', operation: 'create', expected: false },
            { collection: 'immunization_records', operation: 'read', expected: true, facilityId: '2' },
            { collection: 'vaccines', operation: 'read', expected: true },
            { collection: 'vaccines', operation: 'update', expected: false }
        ]
    }
};

/**
 * Error Test Cases
 */
const errorTestCases = {
    invalidUser: {
        userId: 'nonexistent-user',
        userContext: null,
        expectedError: 'Invalid user context'
    },
    
    invalidResource: {
        userId: testUsers.user.$id,
        resource: 'invalid.resource',
        operation: 'read',
        expectedError: 'Invalid resource or operation'
    },
    
    invalidOperation: {
        userId: testUsers.user.$id,
        resource: 'collections.patients',
        operation: 'invalid_operation',
        expectedError: 'Invalid resource or operation'
    },
    
    crossFacilityAccess: {
        userId: testUsers.supervisor.$id,
        resource: 'collections.patients',
        operation: 'read',
        resourceContext: { facilityId: '999' },
        expectedError: 'Facility access restriction'
    }
};

/**
 * Performance Test Data
 */
const performanceTestData = {
    concurrentUsers: Array(50).fill().map((_, i) => ({
        $id: `perf-user-${i}`,
        email: `perfuser${i}@test.com`,
        name: `Performance User ${i}`,
        labels: ['user', `facility_${i % 3 + 1}`],
        roles: ['user'],
        facilityId: String(i % 3 + 1),
        teams: [{ id: `facility-${i % 3 + 1}-team`, role: 'member' }]
    })),
    
    largeBatchOperations: Array(1000).fill().map((_, i) => ({
        collection: 'patients',
        operation: 'read',
        userId: `user-${i % 10}`,
        resourceId: `patient-${i}`
    }))
};

module.exports = {
    testUsers,
    testFacilities,
    testTeams,
    testDocuments,
    mockAppwriteResponses,
    permissionTestScenarios,
    errorTestCases,
    performanceTestData
};