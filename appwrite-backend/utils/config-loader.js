/**
 * Configuration Loader for BE-AW-10 Permission System
 * 
 * This module provides utilities for loading, validating, and caching
 * permission configurations with runtime permission lookups.
 * 
 * Features:
 * - Load and validate permission configurations
 * - Merge with existing role and team configurations
 * - Runtime permission lookups with caching
 * - Configuration hot-reloading support
 * - Performance optimization
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ConfigurationLoader extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            configPath: options.configPath || path.join(__dirname, '../config'),
            cacheEnabled: options.cacheEnabled !== false,
            cacheTTL: options.cacheTTL || 300000, // 5 minutes
            hotReload: options.hotReload || false,
            validateOnLoad: options.validateOnLoad !== false,
            ...options
        };
        
        this.cache = new Map();
        this.watchers = new Map();
        this.lastLoaded = new Map();
        
        this.configurations = {
            collectionPermissions: null,
            permissions: null,
            securityRules: null,
            teamPermissions: null,
            roleDefinitions: null
        };
        
        this.permissionCache = new Map();
        this.roleHierarchy = null;
        this.teamMappings = null;
    }
    
    /**
     * Initialize the configuration loader
     */
    async initialize() {
        try {
            await this.loadAllConfigurations();
            
            if (this.options.hotReload) {
                await this.setupFileWatchers();
            }
            
            this.emit('initialized');
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Load all configuration files
     */
    async loadAllConfigurations() {
        const configFiles = [
            'collection-permissions.json',
            'permissions.json',
            'security-rules.json',
            'team-permissions.json',
            'role-definitions.json'
        ];
        
        const loadPromises = configFiles.map(async (filename) => {
            const key = this.getConfigKey(filename);
            try {
                const config = await this.loadConfiguration(filename);
                this.configurations[key] = config;
                this.lastLoaded.set(key, Date.now());
                
                if (this.options.validateOnLoad) {
                    await this.validateConfiguration(key, config);
                }
                
                return { key, config, success: true };
            } catch (error) {
                console.warn(`Failed to load ${filename}:`, error.message);
                return { key, error, success: false };
            }
        });
        
        const results = await Promise.all(loadPromises);
        
        // Build derived configurations
        await this.buildDerivedConfigurations();
        
        // Clear permission cache after configuration reload
        this.clearPermissionCache();
        
        this.emit('configurationsLoaded', results);
        
        return results;
    }
    
    /**
     * Load a specific configuration file
     */
    async loadConfiguration(filename) {
        const filePath = path.join(this.options.configPath, filename);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const config = JSON.parse(data);
            
            // Add metadata
            config._metadata = {
                filename,
                loadedAt: new Date().toISOString(),
                filePath
            };
            
            return config;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${filename}`);
            }
            throw new Error(`Failed to load configuration ${filename}: ${error.message}`);
        }
    }
    
    /**
     * Build derived configurations for performance
     */
    async buildDerivedConfigurations() {
        // Build role hierarchy
        this.buildRoleHierarchy();
        
        // Build team mappings
        this.buildTeamMappings();
        
        // Build permission lookup tables
        this.buildPermissionLookupTables();
        
        // Build facility scope mappings
        this.buildFacilityScopeMappings();
    }
    
    /**
     * Build role hierarchy for inheritance
     */
    buildRoleHierarchy() {
        const permissions = this.configurations.permissions;
        if (!permissions?.roleHierarchy) return;
        
        this.roleHierarchy = new Map();
        
        for (const [role, config] of Object.entries(permissions.roleHierarchy)) {
            this.roleHierarchy.set(role, {
                level: config.level,
                inherits: config.inherits || [],
                canManage: config.canManage || [],
                restrictions: config.restrictions || []
            });
        }
    }
    
    /**
     * Build team mappings for quick lookups
     */
    buildTeamMappings() {
        const teamPermissions = this.configurations.teamPermissions;
        if (!teamPermissions) return;
        
        this.teamMappings = {
            globalAdmin: teamPermissions.globalAdminTeam,
            facilityTeams: teamPermissions.facilityTeams?.roles || {},
            teamNaming: teamPermissions.facilityTeams?.teamNaming || 'facility-{facilityId}-team'
        };
    }
    
    /**
     * Build permission lookup tables for performance
     */
    buildPermissionLookupTables() {
        const permissions = this.configurations.permissions;
        if (!permissions?.permissionMatrix) return;
        
        this.permissionLookupTables = {
            collections: new Map(),
            storage: new Map(),
            functions: new Map()
        };
        
        // Build collection permission lookups
        for (const [collection, roles] of Object.entries(permissions.permissionMatrix.collections)) {
            const lookupTable = new Map();
            for (const [role, config] of Object.entries(roles)) {
                lookupTable.set(role, config);
            }
            this.permissionLookupTables.collections.set(collection, lookupTable);
        }
        
        // Build storage permission lookups
        for (const [bucket, roles] of Object.entries(permissions.permissionMatrix.storage)) {
            const lookupTable = new Map();
            for (const [role, config] of Object.entries(roles)) {
                lookupTable.set(role, config);
            }
            this.permissionLookupTables.storage.set(bucket, lookupTable);
        }
        
        // Build function permission lookups
        for (const [func, roles] of Object.entries(permissions.permissionMatrix.functions)) {
            const lookupTable = new Map();
            for (const [role, operations] of Object.entries(roles)) {
                lookupTable.set(role, operations);
            }
            this.permissionLookupTables.functions.set(func, lookupTable);
        }
    }
    
    /**
     * Build facility scope mappings
     */
    buildFacilityScopeMappings() {
        const collectionPermissions = this.configurations.collectionPermissions;
        if (!collectionPermissions?.collectionSpecificRules) return;
        
        this.facilityScopeMappings = new Map();
        
        for (const [collection, rules] of Object.entries(collectionPermissions.collectionSpecificRules)) {
            this.facilityScopeMappings.set(collection, {
                facilityScoped: rules.facilityScoped || false,
                auditRequired: rules.auditRequired || false,
                encryptionRequired: rules.encryptionRequired || false,
                dataClassification: rules.dataClassification || 'internal'
            });
        }
    }
    
    /**
     * Check if user has permission for a specific operation
     */
    async checkPermission(userId, resource, operation, context = {}) {
        const cacheKey = `${userId}:${resource}:${operation}:${JSON.stringify(context)}`;
        
        // Check cache first
        if (this.options.cacheEnabled && this.permissionCache.has(cacheKey)) {
            const cached = this.permissionCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.options.cacheTTL) {
                return cached.result;
            }
        }
        
        try {
            const result = await this.evaluatePermission(userId, resource, operation, context);
            
            // Cache the result
            if (this.options.cacheEnabled) {
                this.permissionCache.set(cacheKey, {
                    result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('Permission check failed:', error);
            return {
                allowed: false,
                reason: 'Permission evaluation error',
                error: error.message
            };
        }
    }
    
    /**
     * Evaluate permission for a user
     */
    async evaluatePermission(userId, resource, operation, context) {
        // Get user roles and teams
        const userContext = await this.getUserContext(userId, context);
        
        // Parse resource (e.g., "collections.patients", "storage.reports")
        const [resourceType, resourceName] = resource.split('.');
        
        // Check direct role permissions
        const rolePermission = this.checkRolePermission(userContext.roles, resourceType, resourceName, operation);
        if (rolePermission.allowed) {
            return rolePermission;
        }
        
        // Check team permissions
        const teamPermission = this.checkTeamPermission(userContext.teams, resourceType, resourceName, operation, context);
        if (teamPermission.allowed) {
            return teamPermission;
        }
        
        // Check inherited permissions
        const inheritedPermission = this.checkInheritedPermission(userContext.roles, resourceType, resourceName, operation);
        if (inheritedPermission.allowed) {
            return inheritedPermission;
        }
        
        // Check conditions and constraints
        const conditionalPermission = await this.checkConditionalPermission(userContext, resourceType, resourceName, operation, context);
        if (conditionalPermission.allowed) {
            return conditionalPermission;
        }
        
        return {
            allowed: false,
            reason: 'No matching permission found',
            checkedRoles: userContext.roles,
            checkedTeams: userContext.teams
        };
    }
    
    /**
     * Check role-based permissions
     */
    checkRolePermission(roles, resourceType, resourceName, operation) {
        if (!this.permissionLookupTables?.[resourceType]) {
            return { allowed: false, reason: 'Unknown resource type' };
        }
        
        const resourceTable = this.permissionLookupTables[resourceType].get(resourceName);
        if (!resourceTable) {
            return { allowed: false, reason: 'Unknown resource' };
        }
        
        for (const role of roles) {
            const roleConfig = resourceTable.get(role);
            if (roleConfig && roleConfig[operation]) {
                return {
                    allowed: true,
                    reason: 'Role permission granted',
                    role,
                    scope: roleConfig.scope
                };
            }
        }
        
        return { allowed: false, reason: 'No role permission found' };
    }
    
    /**
     * Check team-based permissions
     */
    checkTeamPermission(teams, resourceType, resourceName, operation, context) {
        // Implementation would check team-based permissions
        // This is a simplified version
        
        for (const team of teams) {
            if (team.id === 'global-admin-team') {
                return {
                    allowed: true,
                    reason: 'Global admin team access',
                    team: team.id
                };
            }
            
            // Check facility team permissions
            if (team.id.startsWith('facility-') && context.facilityId) {
                const expectedTeamId = `facility-${context.facilityId}-team`;
                if (team.id === expectedTeamId) {
                    return {
                        allowed: true,
                        reason: 'Facility team access',
                        team: team.id,
                        scope: 'facility_only'
                    };
                }
            }
        }
        
        return { allowed: false, reason: 'No team permission found' };
    }
    
    /**
     * Check inherited permissions
     */
    checkInheritedPermission(roles, resourceType, resourceName, operation) {
        if (!this.roleHierarchy) {
            return { allowed: false, reason: 'No role hierarchy defined' };
        }
        
        for (const role of roles) {
            const roleConfig = this.roleHierarchy.get(role);
            if (!roleConfig) continue;
            
            // Check inherited roles
            for (const inheritedRole of roleConfig.inherits) {
                const inheritedPermission = this.checkRolePermission([inheritedRole], resourceType, resourceName, operation);
                if (inheritedPermission.allowed) {
                    return {
                        ...inheritedPermission,
                        reason: 'Inherited permission granted',
                        inheritedFrom: inheritedRole
                    };
                }
            }
        }
        
        return { allowed: false, reason: 'No inherited permission found' };
    }
    
    /**
     * Check conditional permissions
     */
    async checkConditionalPermission(userContext, resourceType, resourceName, operation, context) {
        // Implementation would check conditions like facility_match, time_based, etc.
        // This is a placeholder for the actual implementation
        
        return { allowed: false, reason: 'No conditional permission found' };
    }
    
    /**
     * Get user context (roles, teams, facility)
     */
    async getUserContext(userId, context) {
        // This would typically fetch from database or cache
        // For now, return a mock structure
        
        return {
            userId,
            roles: context.roles || ['user'],
            teams: context.teams || [],
            facilityId: context.facilityId,
            permissions: context.permissions || []
        };
    }
    
    /**
     * Get configuration by key
     */
    getConfiguration(key) {
        return this.configurations[key];
    }
    
    /**
     * Get all configurations
     */
    getAllConfigurations() {
        return { ...this.configurations };
    }
    
    /**
     * Reload specific configuration
     */
    async reloadConfiguration(filename) {
        const key = this.getConfigKey(filename);
        
        try {
            const config = await this.loadConfiguration(filename);
            this.configurations[key] = config;
            this.lastLoaded.set(key, Date.now());
            
            if (this.options.validateOnLoad) {
                await this.validateConfiguration(key, config);
            }
            
            // Rebuild derived configurations
            await this.buildDerivedConfigurations();
            
            // Clear permission cache
            this.clearPermissionCache();
            
            this.emit('configurationReloaded', { key, filename });
            
            return config;
            
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Validate configuration
     */
    async validateConfiguration(key, config) {
        const validators = {
            collectionPermissions: this.validateCollectionPermissions,
            permissions: this.validatePermissions,
            securityRules: this.validateSecurityRules,
            teamPermissions: this.validateTeamPermissions,
            roleDefinitions: this.validateRoleDefinitions
        };
        
        const validator = validators[key];
        if (validator) {
            return validator.call(this, config);
        }
        
        return true;
    }
    
    /**
     * Validate collection permissions configuration
     */
    validateCollectionPermissions(config) {
        if (!config.rolePermissions) {
            throw new Error('Missing rolePermissions in collection permissions configuration');
        }
        
        if (!config.permissionConditions) {
            throw new Error('Missing permissionConditions in collection permissions configuration');
        }
        
        return true;
    }
    
    /**
     * Validate permissions configuration
     */
    validatePermissions(config) {
        if (!config.permissionMatrix) {
            throw new Error('Missing permissionMatrix in permissions configuration');
        }
        
        if (!config.roleHierarchy) {
            throw new Error('Missing roleHierarchy in permissions configuration');
        }
        
        return true;
    }
    
    /**
     * Validate security rules configuration
     */
    validateSecurityRules(config) {
        if (!config.roles) {
            throw new Error('Missing roles in security rules configuration');
        }
        
        if (!config.collections) {
            throw new Error('Missing collections in security rules configuration');
        }
        
        return true;
    }
    
    /**
     * Validate team permissions configuration
     */
    validateTeamPermissions(config) {
        if (!config.globalAdminTeam) {
            throw new Error('Missing globalAdminTeam in team permissions configuration');
        }
        
        if (!config.facilityTeams) {
            throw new Error('Missing facilityTeams in team permissions configuration');
        }
        
        return true;
    }
    
    /**
     * Validate role definitions configuration
     */
    validateRoleDefinitions(config) {
        const requiredRoles = ['administrator', 'supervisor', 'doctor', 'user'];
        
        for (const role of requiredRoles) {
            if (!config[role]) {
                throw new Error(`Missing required role definition: ${role}`);
            }
        }
        
        return true;
    }
    
    /**
     * Setup file watchers for hot reload
     */
    async setupFileWatchers() {
        const configFiles = [
            'collection-permissions.json',
            'permissions.json',
            'security-rules.json',
            'team-permissions.json',
            'role-definitions.json'
        ];
        
        for (const filename of configFiles) {
            const filePath = path.join(this.options.configPath, filename);
            
            try {
                const watcher = fs.watch(filePath, async (eventType) => {
                    if (eventType === 'change') {
                        console.log(`Configuration file changed: ${filename}`);
                        try {
                            await this.reloadConfiguration(filename);
                        } catch (error) {
                            console.error(`Failed to reload ${filename}:`, error.message);
                        }
                    }
                });
                
                this.watchers.set(filename, watcher);
                
            } catch (error) {
                console.warn(`Failed to watch ${filename}:`, error.message);
            }
        }
    }
    
    /**
     * Clear permission cache
     */
    clearPermissionCache() {
        this.permissionCache.clear();
        this.emit('cacheCleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.permissionCache.size,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
            hits: this.cacheHits || 0,
            misses: this.cacheMisses || 0
        };
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Close file watchers
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
        
        // Clear caches
        this.cache.clear();
        this.permissionCache.clear();
        
        this.emit('cleanup');
    }
    
    /**
     * Utility functions
     */
    getConfigKey(filename) {
        return filename.replace('.json', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
}

/**
 * Singleton instance for global use
 */
let globalConfigLoader = null;

/**
 * Get or create global configuration loader instance
 */
function getConfigLoader(options = {}) {
    if (!globalConfigLoader) {
        globalConfigLoader = new ConfigurationLoader(options);
    }
    return globalConfigLoader;
}

/**
 * Initialize global configuration loader
 */
async function initializeConfigLoader(options = {}) {
    const loader = getConfigLoader(options);
    await loader.initialize();
    return loader;
}

module.exports = {
    ConfigurationLoader,
    getConfigLoader,
    initializeConfigLoader
};