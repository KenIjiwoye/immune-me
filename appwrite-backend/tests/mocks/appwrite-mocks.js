/**
 * Appwrite SDK Mocks for BE-AW-10 Permission System Tests
 * 
 * Provides comprehensive mocking of the Appwrite SDK to enable
 * isolated testing of the permission system without external dependencies.
 */

const { testUsers, testFacilities, testTeams, testDocuments, mockAppwriteResponses } = require('../fixtures/test-data');

/**
 * Mock Appwrite Client
 */
class MockClient {
    constructor() {
        this.endpoint = null;
        this.project = null;
        this.key = null;
    }

    setEndpoint(endpoint) {
        this.endpoint = endpoint;
        return this;
    }

    setProject(project) {
        this.project = project;
        return this;
    }

    setKey(key) {
        this.key = key;
        return this;
    }
}

/**
 * Mock Databases Service
 */
class MockDatabases {
    constructor() {
        this.callLog = [];
        this.errorMode = false;
        this.networkDelay = 0;
    }

    // Utility methods for testing
    setErrorMode(enabled) {
        this.errorMode = enabled;
    }

    setNetworkDelay(ms) {
        this.networkDelay = ms;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }

    async _simulateNetworkCall(method, ...args) {
        this.callLog.push({ method, args, timestamp: new Date().toISOString() });
        
        if (this.networkDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.networkDelay));
        }

        if (this.errorMode) {
            throw new Error(`Mock network error for ${method}`);
        }
    }

    async get(databaseId) {
        await this._simulateNetworkCall('get', databaseId);
        return mockAppwriteResponses.databases.get(databaseId);
    }

    async listCollections(databaseId, queries = [], search = '') {
        await this._simulateNetworkCall('listCollections', databaseId, queries, search);
        return mockAppwriteResponses.databases.listCollections();
    }

    async getCollection(databaseId, collectionId) {
        await this._simulateNetworkCall('getCollection', databaseId, collectionId);
        const collections = mockAppwriteResponses.databases.listCollections().collections;
        const collection = collections.find(c => c.$id === collectionId);
        if (!collection) {
            throw new Error(`Collection ${collectionId} not found`);
        }
        return collection;
    }

    async updateCollection(databaseId, collectionId, name, permissions, documentSecurity, enabled) {
        await this._simulateNetworkCall('updateCollection', databaseId, collectionId, name, permissions, documentSecurity, enabled);
        return mockAppwriteResponses.databases.updateCollection(databaseId, collectionId, name, permissions, documentSecurity, enabled);
    }

    async listDocuments(databaseId, collectionId, queries = []) {
        await this._simulateNetworkCall('listDocuments', databaseId, collectionId, queries);
        return mockAppwriteResponses.databases.listDocuments(databaseId, collectionId, queries);
    }

    async getDocument(databaseId, collectionId, documentId) {
        await this._simulateNetworkCall('getDocument', databaseId, collectionId, documentId);
        const documents = mockAppwriteResponses.databases.listDocuments(databaseId, collectionId).documents;
        const document = documents.find(d => d.$id === documentId);
        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }
        return document;
    }

    async createDocument(databaseId, collectionId, documentId, data, permissions) {
        await this._simulateNetworkCall('createDocument', databaseId, collectionId, documentId, data, permissions);
        return mockAppwriteResponses.databases.createDocument(databaseId, collectionId, documentId, data, permissions);
    }

    async updateDocument(databaseId, collectionId, documentId, data, permissions) {
        await this._simulateNetworkCall('updateDocument', databaseId, collectionId, documentId, data, permissions);
        return mockAppwriteResponses.databases.updateDocument(databaseId, collectionId, documentId, data, permissions);
    }

    async deleteDocument(databaseId, collectionId, documentId) {
        await this._simulateNetworkCall('deleteDocument', databaseId, collectionId, documentId);
        return mockAppwriteResponses.databases.deleteDocument(databaseId, collectionId, documentId);
    }
}

/**
 * Mock Teams Service
 */
class MockTeams {
    constructor() {
        this.callLog = [];
        this.errorMode = false;
        this.networkDelay = 0;
    }

    setErrorMode(enabled) {
        this.errorMode = enabled;
    }

    setNetworkDelay(ms) {
        this.networkDelay = ms;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }

    async _simulateNetworkCall(method, ...args) {
        this.callLog.push({ method, args, timestamp: new Date().toISOString() });
        
        if (this.networkDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.networkDelay));
        }

        if (this.errorMode) {
            throw new Error(`Mock network error for ${method}`);
        }
    }

    async list(queries = [], search = '') {
        await this._simulateNetworkCall('list', queries, search);
        return mockAppwriteResponses.teams.list();
    }

    async get(teamId) {
        await this._simulateNetworkCall('get', teamId);
        const team = mockAppwriteResponses.teams.get(teamId);
        if (!team) {
            throw new Error(`Team ${teamId} not found`);
        }
        return team;
    }

    async listMemberships(teamId, queries = [], search = '') {
        await this._simulateNetworkCall('listMemberships', teamId, queries, search);
        return mockAppwriteResponses.teams.listMemberships(teamId);
    }

    async createMembership(teamId, roles, email, userId, phone, name) {
        await this._simulateNetworkCall('createMembership', teamId, roles, email, userId, phone, name);
        return {
            $id: `membership-${userId || 'new'}-${teamId}`,
            userId: userId || 'new-user',
            teamId: teamId,
            roles: roles,
            invited: new Date().toISOString(),
            joined: new Date().toISOString(),
            confirm: true
        };
    }

    async updateMembershipRoles(teamId, membershipId, roles) {
        await this._simulateNetworkCall('updateMembershipRoles', teamId, membershipId, roles);
        return {
            $id: membershipId,
            teamId: teamId,
            roles: roles,
            $updatedAt: new Date().toISOString()
        };
    }

    async deleteMembership(teamId, membershipId) {
        await this._simulateNetworkCall('deleteMembership', teamId, membershipId);
        return { $id: membershipId, deleted: true };
    }
}

/**
 * Mock Users Service
 */
class MockUsers {
    constructor() {
        this.callLog = [];
        this.errorMode = false;
        this.networkDelay = 0;
    }

    setErrorMode(enabled) {
        this.errorMode = enabled;
    }

    setNetworkDelay(ms) {
        this.networkDelay = ms;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }

    async _simulateNetworkCall(method, ...args) {
        this.callLog.push({ method, args, timestamp: new Date().toISOString() });
        
        if (this.networkDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.networkDelay));
        }

        if (this.errorMode) {
            throw new Error(`Mock network error for ${method}`);
        }
    }

    async list(queries = [], search = '') {
        await this._simulateNetworkCall('list', queries, search);
        return mockAppwriteResponses.users.list();
    }

    async get(userId) {
        await this._simulateNetworkCall('get', userId);
        const user = mockAppwriteResponses.users.get(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        return user;
    }

    async create(userId, email, phone, password, name) {
        await this._simulateNetworkCall('create', userId, email, phone, password, name);
        return {
            $id: userId,
            email: email,
            phone: phone || '',
            name: name || '',
            labels: [],
            status: true,
            emailVerification: false,
            phoneVerification: false,
            registration: new Date().toISOString(),
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        };
    }

    async updateLabels(userId, labels) {
        await this._simulateNetworkCall('updateLabels', userId, labels);
        const user = mockAppwriteResponses.users.get(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        return {
            ...user,
            labels: labels,
            $updatedAt: new Date().toISOString()
        };
    }

    async updateStatus(userId, status) {
        await this._simulateNetworkCall('updateStatus', userId, status);
        const user = mockAppwriteResponses.users.get(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        return {
            ...user,
            status: status,
            $updatedAt: new Date().toISOString()
        };
    }

    async delete(userId) {
        await this._simulateNetworkCall('delete', userId);
        return { $id: userId, deleted: true };
    }
}

/**
 * Mock Permission Helper
 */
const MockPermission = {
    read: (role) => `read("${role}")`,
    write: (role) => `write("${role}")`,
    create: (role) => `create("${role}")`,
    update: (role) => `update("${role}")`,
    delete: (role) => `delete("${role}")`
};

/**
 * Mock Role Helper
 */
const MockRole = {
    any: () => 'any',
    user: (id) => `user:${id}`,
    users: () => 'users',
    team: (id, role = 'member') => `team:${id}/${role}`,
    member: (id) => `member:${id}`,
    label: (name) => `label:${name}`
};

/**
 * Mock Query Helper
 */
const MockQuery = {
    equal: (attribute, value) => `${attribute}=${value}`,
    notEqual: (attribute, value) => `${attribute}!=${value}`,
    lessThan: (attribute, value) => `${attribute}<${value}`,
    lessThanEqual: (attribute, value) => `${attribute}<=${value}`,
    greaterThan: (attribute, value) => `${attribute}>${value}`,
    greaterThanEqual: (attribute, value) => `${attribute}>=${value}`,
    search: (attribute, value) => `${attribute}~${value}`,
    isNull: (attribute) => `${attribute}=null`,
    isNotNull: (attribute) => `${attribute}!=null`,
    between: (attribute, start, end) => `${attribute}>${start}&${attribute}<${end}`,
    startsWith: (attribute, value) => `${attribute}^${value}`,
    endsWith: (attribute, value) => `${attribute}$${value}`,
    select: (attributes) => `select=${attributes.join(',')}`,
    orderAsc: (attribute) => `orderAsc=${attribute}`,
    orderDesc: (attribute) => `orderDesc=${attribute}`,
    limit: (limit) => `limit=${limit}`,
    offset: (offset) => `offset=${offset}`
};

/**
 * Mock Factory for creating configured mock instances
 */
class MockFactory {
    static createMockAppwriteSDK(options = {}) {
        const {
            networkDelay = 0,
            errorMode = false,
            customResponses = {}
        } = options;

        const client = new MockClient();
        const databases = new MockDatabases();
        const teams = new MockTeams();
        const users = new MockUsers();

        // Configure network simulation
        if (networkDelay > 0) {
            databases.setNetworkDelay(networkDelay);
            teams.setNetworkDelay(networkDelay);
            users.setNetworkDelay(networkDelay);
        }

        if (errorMode) {
            databases.setErrorMode(true);
            teams.setErrorMode(true);
            users.setErrorMode(true);
        }

        // Apply custom responses if provided
        if (customResponses.databases) {
            Object.assign(databases, customResponses.databases);
        }
        if (customResponses.teams) {
            Object.assign(teams, customResponses.teams);
        }
        if (customResponses.users) {
            Object.assign(users, customResponses.users);
        }

        return {
            Client: () => client,
            Databases: () => databases,
            Teams: () => teams,
            Users: () => users,
            Permission: MockPermission,
            Role: MockRole,
            Query: MockQuery
        };
    }

    static createMockUserContext(overrides = {}) {
        return {
            userId: 'test-user-123',
            roles: ['user'],
            teams: [{ id: 'test-team', role: 'member' }],
            facilityId: '1',
            permissions: [],
            labels: ['user', 'facility_1'],
            status: true,
            ...overrides
        };
    }

    static createMockDocument(collectionId, overrides = {}) {
        const baseDocument = {
            $id: `${collectionId}-test-123`,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
            $permissions: []
        };

        switch (collectionId) {
            case 'patients':
                return {
                    ...baseDocument,
                    facilityId: '1',
                    name: 'Test Patient',
                    dateOfBirth: '1990-01-01',
                    medicalRecordNumber: 'TEST001',
                    ...overrides
                };
            case 'immunization_records':
                return {
                    ...baseDocument,
                    facilityId: '1',
                    patientId: 'patient-123',
                    vaccineId: 'vaccine-123',
                    administeredDate: new Date().toISOString(),
                    ...overrides
                };
            case 'facilities':
                return {
                    ...baseDocument,
                    name: 'Test Facility',
                    region: 'Test Region',
                    type: 'hospital',
                    ...overrides
                };
            default:
                return {
                    ...baseDocument,
                    ...overrides
                };
        }
    }

    static createMockPermissionResult(allowed = true, overrides = {}) {
        return {
            allowed,
            reason: allowed ? 'Permission granted' : 'Permission denied',
            scope: allowed ? 'facility_only' : null,
            appliedRules: [],
            evaluationTime: Date.now(),
            ...overrides
        };
    }
}

/**
 * Test Utilities for Mock Management
 */
class MockTestUtils {
    static resetAllMocks(mockSDK) {
        if (mockSDK.Databases) {
            const databases = mockSDK.Databases();
            if (databases.clearCallLog) databases.clearCallLog();
            if (databases.setErrorMode) databases.setErrorMode(false);
            if (databases.setNetworkDelay) databases.setNetworkDelay(0);
        }

        if (mockSDK.Teams) {
            const teams = mockSDK.Teams();
            if (teams.clearCallLog) teams.clearCallLog();
            if (teams.setErrorMode) teams.setErrorMode(false);
            if (teams.setNetworkDelay) teams.setNetworkDelay(0);
        }

        if (mockSDK.Users) {
            const users = mockSDK.Users();
            if (users.clearCallLog) users.clearCallLog();
            if (users.setErrorMode) users.setErrorMode(false);
            if (users.setNetworkDelay) users.setNetworkDelay(0);
        }
    }

    static getAllCallLogs(mockSDK) {
        const logs = {
            databases: [],
            teams: [],
            users: []
        };

        if (mockSDK.Databases) {
            const databases = mockSDK.Databases();
            if (databases.getCallLog) logs.databases = databases.getCallLog();
        }

        if (mockSDK.Teams) {
            const teams = mockSDK.Teams();
            if (teams.getCallLog) logs.teams = teams.getCallLog();
        }

        if (mockSDK.Users) {
            const users = mockSDK.Users();
            if (users.getCallLog) logs.users = users.getCallLog();
        }

        return logs;
    }

    static simulateNetworkError(mockSDK, services = ['databases', 'teams', 'users']) {
        services.forEach(service => {
            if (mockSDK[service.charAt(0).toUpperCase() + service.slice(1)]) {
                const serviceInstance = mockSDK[service.charAt(0).toUpperCase() + service.slice(1)]();
                if (serviceInstance.setErrorMode) {
                    serviceInstance.setErrorMode(true);
                }
            }
        });
    }

    static simulateNetworkDelay(mockSDK, delay, services = ['databases', 'teams', 'users']) {
        services.forEach(service => {
            if (mockSDK[service.charAt(0).toUpperCase() + service.slice(1)]) {
                const serviceInstance = mockSDK[service.charAt(0).toUpperCase() + service.slice(1)]();
                if (serviceInstance.setNetworkDelay) {
                    serviceInstance.setNetworkDelay(delay);
                }
            }
        });
    }
}

module.exports = {
    MockClient,
    MockDatabases,
    MockTeams,
    MockUsers,
    MockPermission,
    MockRole,
    MockQuery,
    MockFactory,
    MockTestUtils
};