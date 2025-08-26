/**
 * Mock Existing Utilities for Integration Testing
 * 
 * Provides mock implementations of existing utilities like TeamPermissionChecker
 * and FacilityTeamManager to test integration with the enhanced permission system.
 */

const { testUsers, testTeams, testFacilities } = require('../fixtures/test-data');

/**
 * Mock TeamPermissionChecker
 * Simulates the existing team permission checking utility
 */
class MockTeamPermissionChecker {
    constructor(configLoader = null) {
        this.configLoader = configLoader;
        this.callLog = [];
    }

    async checkTeamAccess(userId, teamId, resource, operation) {
        this.callLog.push({ method: 'checkTeamAccess', args: [userId, teamId, resource, operation] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return false;

        const userTeam = user.teams.find(t => t.id === teamId);
        if (!userTeam) return false;

        // Simulate legacy team permission logic
        const teamPermissions = {
            'facility-1-team': {
                owner: ['patients:read', 'patients:write', 'patients:create', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create'],
                member: ['patients:read', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create']
            },
            'facility-2-team': {
                owner: ['patients:read', 'patients:write', 'patients:create', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create'],
                member: ['patients:read', 'immunization_records:read']
            },
            'global-admin-team': {
                owner: ['*:*'] // Admin team has all permissions
            },
            'medical-team': {
                member: ['patients:read', 'patients:update', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create']
            }
        };

        const teamPerms = teamPermissions[teamId];
        if (!teamPerms) return false;

        const rolePerms = teamPerms[userTeam.role];
        if (!rolePerms) return false;

        const permissionKey = `${resource}:${operation}`;
        return rolePerms.includes(permissionKey) || rolePerms.includes('*:*');
    }

    async hasPermission(userId, resource, operation) {
        this.callLog.push({ method: 'hasPermission', args: [userId, resource, operation] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return false;

        // Check permissions across all user's teams
        for (const team of user.teams) {
            const hasAccess = await this.checkTeamAccess(userId, team.id, resource, operation);
            if (hasAccess) return true;
        }

        return false;
    }

    async checkFacilityTeamAccess(userId, facilityId, resource, operation) {
        this.callLog.push({ method: 'checkFacilityTeamAccess', args: [userId, facilityId, resource, operation] });
        
        const facilityTeamId = `facility-${facilityId}-team`;
        return await this.checkTeamAccess(userId, facilityTeamId, resource, operation);
    }

    async getUserTeamPermissions(userId) {
        this.callLog.push({ method: 'getUserTeamPermissions', args: [userId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return {};

        const permissions = {};
        for (const team of user.teams) {
            const teamPermissions = await this.getTeamPermissions(team.id, team.role);
            permissions[team.id] = teamPermissions;
        }

        return permissions;
    }

    async getTeamPermissions(teamId, role) {
        this.callLog.push({ method: 'getTeamPermissions', args: [teamId, role] });
        
        // Simulate getting team permissions from configuration
        const teamPermissions = {
            'facility-1-team': {
                owner: {
                    patients: ['read', 'write', 'create'],
                    immunization_records: ['read', 'write', 'create']
                },
                member: {
                    patients: ['read'],
                    immunization_records: ['read', 'write', 'create']
                }
            },
            'facility-2-team': {
                owner: {
                    patients: ['read', 'write', 'create'],
                    immunization_records: ['read', 'write', 'create']
                },
                member: {
                    patients: ['read'],
                    immunization_records: ['read']
                }
            },
            'global-admin-team': {
                owner: {
                    '*': ['*'] // All permissions
                }
            }
        };

        return teamPermissions[teamId]?.[role] || {};
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }
}

/**
 * Mock FacilityTeamManager
 * Simulates the existing facility team management utility
 */
class MockFacilityTeamManager {
    constructor(configLoader = null) {
        this.configLoader = configLoader;
        this.callLog = [];
        this.facilityTeams = {
            '1': ['facility-1-team', 'medical-team'],
            '2': ['facility-2-team'],
            '3': ['facility-3-team']
        };
    }

    async getFacilityTeams(facilityId) {
        this.callLog.push({ method: 'getFacilityTeams', args: [facilityId] });
        return this.facilityTeams[facilityId] || [];
    }

    async getUserTeams(userId) {
        this.callLog.push({ method: 'getUserTeams', args: [userId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        return user ? user.teams : [];
    }

    async getUserRoleInFacility(userId, facilityId) {
        this.callLog.push({ method: 'getUserRoleInFacility', args: [userId, facilityId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return null;

        const facilityTeamId = `facility-${facilityId}-team`;
        const facilityTeam = user.teams.find(t => t.id === facilityTeamId);
        
        return facilityTeam ? facilityTeam.role : null;
    }

    async getAllFacilityTeams() {
        this.callLog.push({ method: 'getAllFacilityTeams', args: [] });
        
        const allTeams = [];
        Object.values(this.facilityTeams).forEach(teams => {
            allTeams.push(...teams);
        });
        
        return [...new Set(allTeams)]; // Remove duplicates
    }

    async createFacilityTeam(facilityId, teamName) {
        this.callLog.push({ method: 'createFacilityTeam', args: [facilityId, teamName] });
        
        const teamId = `facility-${facilityId}-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
        
        if (!this.facilityTeams[facilityId]) {
            this.facilityTeams[facilityId] = [];
        }
        
        this.facilityTeams[facilityId].push(teamId);
        
        return {
            $id: teamId,
            name: teamName,
            facilityId: facilityId,
            $createdAt: new Date().toISOString()
        };
    }

    async addUserToFacilityTeam(userId, facilityId, role = 'member') {
        this.callLog.push({ method: 'addUserToFacilityTeam', args: [userId, facilityId, role] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) throw new Error(`User ${userId} not found`);

        const facilityTeamId = `facility-${facilityId}-team`;
        
        // Remove existing membership if any
        user.teams = user.teams.filter(t => t.id !== facilityTeamId);
        
        // Add new membership
        user.teams.push({ id: facilityTeamId, role: role });
        
        return {
            userId: userId,
            teamId: facilityTeamId,
            role: role,
            $createdAt: new Date().toISOString()
        };
    }

    async removeUserFromFacilityTeam(userId, facilityId) {
        this.callLog.push({ method: 'removeUserFromFacilityTeam', args: [userId, facilityId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) throw new Error(`User ${userId} not found`);

        const facilityTeamId = `facility-${facilityId}-team`;
        const originalLength = user.teams.length;
        
        user.teams = user.teams.filter(t => t.id !== facilityTeamId);
        
        return user.teams.length < originalLength;
    }

    async updateUserRole(userId, facilityId, newRole) {
        this.callLog.push({ method: 'updateUserRole', args: [userId, facilityId, newRole] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) throw new Error(`User ${userId} not found`);

        const facilityTeamId = `facility-${facilityId}-team`;
        const teamMembership = user.teams.find(t => t.id === facilityTeamId);
        
        if (!teamMembership) {
            throw new Error(`User ${userId} is not a member of facility ${facilityId} team`);
        }
        
        teamMembership.role = newRole;
        
        return {
            userId: userId,
            teamId: facilityTeamId,
            role: newRole,
            $updatedAt: new Date().toISOString()
        };
    }

    async getFacilityTeamMembers(facilityId) {
        this.callLog.push({ method: 'getFacilityTeamMembers', args: [facilityId] });
        
        const facilityTeamId = `facility-${facilityId}-team`;
        const members = [];
        
        Object.values(testUsers).forEach(user => {
            const membership = user.teams.find(t => t.id === facilityTeamId);
            if (membership) {
                members.push({
                    userId: user.$id,
                    email: user.email,
                    name: user.name,
                    role: membership.role,
                    status: user.status
                });
            }
        });
        
        return members;
    }

    async validateFacilityAccess(userId, facilityId) {
        this.callLog.push({ method: 'validateFacilityAccess', args: [userId, facilityId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return false;

        // Administrators have access to all facilities
        if (user.roles.includes('administrator')) {
            return true;
        }

        // Check if user belongs to facility team
        const facilityTeamId = `facility-${facilityId}-team`;
        return user.teams.some(t => t.id === facilityTeamId);
    }

    async getFacilityHierarchy(facilityId) {
        this.callLog.push({ method: 'getFacilityHierarchy', args: [facilityId] });
        
        // Simulate facility hierarchy
        const hierarchies = {
            '1': {
                facilityId: '1',
                parentFacility: null,
                childFacilities: ['2'],
                region: 'North',
                level: 1
            },
            '2': {
                facilityId: '2',
                parentFacility: '1',
                childFacilities: [],
                region: 'South',
                level: 2
            },
            '3': {
                facilityId: '3',
                parentFacility: null,
                childFacilities: [],
                region: 'West',
                level: 1
            }
        };
        
        return hierarchies[facilityId] || null;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }
}

/**
 * Mock Legacy Permission Functions
 * Simulates existing permission functions that might be used throughout the system
 */
class MockLegacyPermissions {
    constructor() {
        this.callLog = [];
    }

    async checkUserPermission(userId, resource, action) {
        this.callLog.push({ method: 'checkUserPermission', args: [userId, resource, action] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return false;

        // Simulate legacy permission logic
        const rolePermissions = {
            administrator: ['*:*'],
            supervisor: ['patients:read', 'patients:write', 'patients:create', 'immunization_records:*'],
            doctor: ['patients:read', 'patients:update', 'immunization_records:*'],
            user: ['patients:read', 'immunization_records:read']
        };

        for (const role of user.roles) {
            const permissions = rolePermissions[role] || [];
            const permissionKey = `${resource}:${action}`;
            
            if (permissions.includes(permissionKey) || permissions.includes('*:*') || permissions.includes(`${resource}:*`)) {
                return true;
            }
        }

        return false;
    }

    async getUserPermissions(userId) {
        this.callLog.push({ method: 'getUserPermissions', args: [userId] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return [];

        const allPermissions = [];
        const rolePermissions = {
            administrator: ['*:*'],
            supervisor: ['patients:read', 'patients:write', 'patients:create', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create'],
            doctor: ['patients:read', 'patients:update', 'immunization_records:read', 'immunization_records:write', 'immunization_records:create'],
            user: ['patients:read', 'immunization_records:read']
        };

        for (const role of user.roles) {
            const permissions = rolePermissions[role] || [];
            allPermissions.push(...permissions);
        }

        return [...new Set(allPermissions)]; // Remove duplicates
    }

    async validateResourceAccess(userId, resourceId, resourceType) {
        this.callLog.push({ method: 'validateResourceAccess', args: [userId, resourceId, resourceType] });
        
        const user = Object.values(testUsers).find(u => u.$id === userId);
        if (!user) return false;

        // Administrators have access to all resources
        if (user.roles.includes('administrator')) {
            return true;
        }

        // For facility-scoped resources, check facility access
        if (resourceType === 'patient' || resourceType === 'immunization_record') {
            const resource = testUsers.patients?.find(p => p.$id === resourceId) ||
                           testUsers.immunizationRecords?.find(i => i.$id === resourceId);
            
            if (resource && resource.facilityId !== user.facilityId) {
                return false;
            }
        }

        return true;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }
}

/**
 * Mock Configuration Manager
 * Simulates existing configuration management
 */
class MockConfigurationManager {
    constructor() {
        this.configurations = new Map();
        this.callLog = [];
        
        // Initialize with legacy configuration structure
        this.configurations.set('roles', {
            administrator: {
                level: 4,
                permissions: ['*']
            },
            supervisor: {
                level: 3,
                permissions: ['manage_facility', 'view_reports', 'manage_staff']
            },
            doctor: {
                level: 2,
                permissions: ['treat_patients', 'manage_immunizations', 'view_medical_records']
            },
            user: {
                level: 1,
                permissions: ['view_patients', 'view_immunizations']
            }
        });

        this.configurations.set('facilities', {
            scoping: true,
            crossFacilityAccess: ['administrator'],
            facilityTeams: true
        });
    }

    async getConfiguration(key) {
        this.callLog.push({ method: 'getConfiguration', args: [key] });
        return this.configurations.get(key) || {};
    }

    async setConfiguration(key, value) {
        this.callLog.push({ method: 'setConfiguration', args: [key, value] });
        this.configurations.set(key, value);
        return true;
    }

    async reloadConfiguration() {
        this.callLog.push({ method: 'reloadConfiguration', args: [] });
        // Simulate configuration reload
        return true;
    }

    getCallLog() {
        return this.callLog;
    }

    clearCallLog() {
        this.callLog = [];
    }
}

module.exports = {
    MockTeamPermissionChecker,
    MockFacilityTeamManager,
    MockLegacyPermissions,
    MockConfigurationManager
};