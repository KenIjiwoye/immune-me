/**
 * Utilities Index
 * Centralized exports for all utilities including permissions, reports, and security
 * Enhanced for BE-AW-10 with configuration loading and comprehensive permission management
 */

// Permission and Security Utilities
const { PermissionValidator, ROLE_PERMISSIONS } = require('./permission-validator');
const DocumentSecurity = require('./document-security');
const FacilityScopedQueries = require('./facility-scoped-queries');
const TeamPermissionChecker = require('./team-permission-checker');
const FacilityTeamManager = require('./facility-team-manager');
const RoleManager = require('./role-manager');
const Permissions = require('./permissions');
const { getRolePermissions, canPerformOperation, isFacilityScoped } = require('./permission-helpers');

// Configuration Loading Utilities (BE-AW-10)
const { ConfigurationLoader, getConfigLoader, initializeConfigLoader } = require('./config-loader');

// Report Utilities
const CacheManager = require('./cache-manager');
const PerformanceOptimizer = require('./performance-optimizer');
const MemoryOptimizer = require('./memory-optimizer');
const MonitoringService = require('./monitoring');
const ValidationSchemas = require('./validation-schemas');
const ErrorHandler = require('./error-handler');

// Other Utilities
const AuthMiddleware = require('./auth-middleware');
const SessionManager = require('./session-manager');
const PasswordPolicy = require('./password-policy');
const NotificationTemplates = require('./notification-templates');
const SyncUtilities = require('./sync-utilities');

// Configuration
const ReportConfig = require('../config/report-config');

module.exports = {
  // Permission and Security
  PermissionValidator,
  DocumentSecurity,
  FacilityScopedQueries,
  TeamPermissionChecker,
  FacilityTeamManager,
  RoleManager,
  Permissions,
  ROLE_PERMISSIONS,
  
  // Permission Helpers
  getRolePermissions,
  canPerformOperation,
  isFacilityScoped,
  
  // Configuration Loading (BE-AW-10)
  ConfigurationLoader,
  getConfigLoader,
  initializeConfigLoader,
  
  // Enhanced Permission Checking with Configuration Support
  checkPermission: async (userId, resource, operation, context = {}) => {
    const configLoader = getConfigLoader();
    return await configLoader.checkPermission(userId, resource, operation, context);
  },
  
  // Configuration Management Functions
  getRoleHierarchy: () => {
    const configLoader = getConfigLoader();
    return configLoader.roleHierarchy;
  },
  
  getTeamMappings: () => {
    const configLoader = getConfigLoader();
    return configLoader.teamMappings;
  },
  
  getFacilityScopeMappings: () => {
    const configLoader = getConfigLoader();
    return configLoader.facilityScopeMappings;
  },
  
  reloadConfigurations: async () => {
    const configLoader = getConfigLoader();
    return await configLoader.loadAllConfigurations();
  },
  
  clearPermissionCache: () => {
    const configLoader = getConfigLoader();
    configLoader.clearPermissionCache();
  },
  
  getCacheStats: () => {
    const configLoader = getConfigLoader();
    return configLoader.getCacheStats();
  },
  
  // Report Utilities
  CacheManager,
  PerformanceOptimizer,
  MemoryOptimizer,
  MonitoringService,
  ValidationSchemas,
  ErrorHandler,
  
  // Other Utilities
  AuthMiddleware,
  SessionManager,
  PasswordPolicy,
  NotificationTemplates,
  SyncUtilities,
  
  // Configuration
  ReportConfig
};

// Convenience exports for grouped usage
module.exports.PermissionUtils = {
  validator: PermissionValidator,
  documentSecurity: DocumentSecurity,
  scopedQueries: FacilityScopedQueries,
  teamChecker: TeamPermissionChecker,
  teamManager: FacilityTeamManager,
  roleManager: RoleManager,
  permissions: Permissions,
  helpers: {
    getRolePermissions,
    canPerformOperation,
    isFacilityScoped
  },
  constants: {
    ROLE_PERMISSIONS
  }
};

module.exports.ReportUtils = {
  cache: CacheManager,
  performance: PerformanceOptimizer,
  memory: MemoryOptimizer,
  monitoring: MonitoringService,
  validation: ValidationSchemas,
  errors: ErrorHandler,
  config: ReportConfig
};

module.exports.SecurityUtils = {
  auth: AuthMiddleware,
  sessions: SessionManager,
  passwords: PasswordPolicy,
  permissions: PermissionValidator,
  documentSecurity: DocumentSecurity
};

// Configuration Utils (BE-AW-10)
module.exports.ConfigUtils = {
  loader: ConfigurationLoader,
  getLoader: getConfigLoader,
  initialize: initializeConfigLoader,
  checkPermission: module.exports.checkPermission,
  getRoleHierarchy: module.exports.getRoleHierarchy,
  getTeamMappings: module.exports.getTeamMappings,
  getFacilityScopeMappings: module.exports.getFacilityScopeMappings,
  reloadConfigurations: module.exports.reloadConfigurations,
  clearPermissionCache: module.exports.clearPermissionCache,
  getCacheStats: module.exports.getCacheStats
};

/**
 * Initialize the permission system with configuration loading
 * This should be called during application startup
 */
async function initializePermissionSystem(options = {}) {
  try {
    const configLoader = await initializeConfigLoader({
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      hotReload: process.env.NODE_ENV === 'development',
      validateOnLoad: true,
      ...options
    });
    
    console.log('✅ Permission system initialized successfully');
    return configLoader;
    
  } catch (error) {
    console.error('❌ Failed to initialize permission system:', error);
    throw error;
  }
}

// Export initialization function
module.exports.initializePermissionSystem = initializePermissionSystem;

/**
 * Enhanced permission checking with BE-AW-10 configuration support
 * This function provides a unified interface for permission checking
 */
async function checkEnhancedPermission(userId, resource, operation, context = {}) {
  try {
    const configLoader = getConfigLoader();
    
    // Check if configuration is loaded
    if (!configLoader.configurations.permissions) {
      console.warn('Permission configurations not loaded, falling back to basic validation');
      return await PermissionValidator.validateUserPermissions(userId, resource, operation, context);
    }
    
    // Use enhanced permission checking
    return await configLoader.checkPermission(userId, resource, operation, context);
    
  } catch (error) {
    console.error('Enhanced permission check failed:', error);
    return {
      allowed: false,
      reason: 'Permission check error',
      error: error.message
    };
  }
}

// Export enhanced permission checking
module.exports.checkEnhancedPermission = checkEnhancedPermission;