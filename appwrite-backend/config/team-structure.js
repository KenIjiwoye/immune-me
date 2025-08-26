/**
 * Team Structure Configuration for BE-AW-09: Facility-Based Teams and Memberships
 * 
 * This module defines the team structure, roles, and configuration for facility-based
 * access control using Appwrite Teams functionality.
 */

// Team naming conventions
const TEAM_NAMING = {
  FACILITY_PREFIX: 'facility-',
  FACILITY_SUFFIX: '-team',
  GLOBAL_ADMIN_TEAM: 'global-admin-team'
};

// Team roles mapping to Appwrite team roles
const TEAM_ROLES = {
  OWNER: 'owner',        // Facility administrators
  ADMIN: 'admin',        // Supervisors/doctors
  MEMBER: 'member'       // Regular users (healthcare workers, data entry clerks)
};

// Role hierarchy levels (higher number = more permissions)
const ROLE_HIERARCHY = {
  [TEAM_ROLES.MEMBER]: 1,
  [TEAM_ROLES.ADMIN]: 2,
  [TEAM_ROLES.OWNER]: 3
};

// Mapping from existing role labels to team roles
const ROLE_LABEL_TO_TEAM_ROLE = {
  'admin': TEAM_ROLES.OWNER,                    // System admin -> Global admin team owner
  'facility_manager': TEAM_ROLES.OWNER,        // Facility manager -> Facility team owner
  'healthcare_worker': TEAM_ROLES.ADMIN,       // Healthcare worker -> Facility team admin
  'data_entry_clerk': TEAM_ROLES.MEMBER        // Data entry clerk -> Facility team member
};

// Team permissions configuration
const TEAM_PERMISSIONS = {
  // Global admin team permissions (cross-facility access)
  GLOBAL_ADMIN: {
    collections: {
      patients: ['create', 'read', 'update', 'delete'],
      immunization_records: ['create', 'read', 'update', 'delete'],
      facilities: ['create', 'read', 'update', 'delete'],
      vaccines: ['create', 'read', 'update', 'delete'],
      notifications: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'update', 'delete']
    },
    specialPermissions: [
      'cross_facility_access',
      'user_management',
      'system_configuration',
      'audit_access'
    ]
  },
  
  // Facility team permissions (facility-scoped access)
  FACILITY: {
    [TEAM_ROLES.OWNER]: {
      collections: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read', 'update'],
        facilities: ['read', 'update'],
        vaccines: ['read'],
        notifications: ['create', 'read', 'update'],
        users: ['create', 'read', 'update'],
        reports: ['create', 'read']
      },
      specialPermissions: [
        'facility_user_management',
        'facility_reports',
        'team_management'
      ]
    },
    
    [TEAM_ROLES.ADMIN]: {
      collections: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read', 'update'],
        facilities: ['read'],
        vaccines: ['read'],
        notifications: ['read', 'update']
      },
      specialPermissions: [
        'patient_care',
        'immunization_management'
      ]
    },
    
    [TEAM_ROLES.MEMBER]: {
      collections: {
        patients: ['create', 'read', 'update'],
        immunization_records: ['create', 'read'],
        facilities: ['read'],
        vaccines: ['read'],
        notifications: ['read']
      },
      specialPermissions: [
        'data_entry'
      ]
    }
  }
};

// Team configuration settings
const TEAM_CONFIG = {
  // Maximum number of teams a user can belong to
  MAX_TEAMS_PER_USER: 5,
  
  // Cache timeout for team membership queries (in milliseconds)
  CACHE_TIMEOUT: 300000, // 5 minutes
  
  // Team creation settings
  CREATION: {
    // Auto-create teams for new facilities
    AUTO_CREATE_FOR_FACILITIES: true,
    
    // Default team settings for new facility teams
    DEFAULT_FACILITY_TEAM: {
      name: null, // Will be generated using naming convention
      description: 'Facility team for healthcare staff access control'
    }
  },
  
  // Team membership settings
  MEMBERSHIP: {
    // Allow users to be in multiple facility teams (for multi-facility users)
    ALLOW_MULTI_FACILITY: true,
    
    // Require approval for team membership changes
    REQUIRE_APPROVAL: false,
    
    // Default role for new team members
    DEFAULT_ROLE: TEAM_ROLES.MEMBER
  }
};

/**
 * Generate facility team name using naming convention
 * @param {string} facilityId - Facility ID
 * @returns {string} Generated team name
 */
function generateFacilityTeamName(facilityId) {
  return `${TEAM_NAMING.FACILITY_PREFIX}${facilityId}${TEAM_NAMING.FACILITY_SUFFIX}`;
}

/**
 * Parse facility ID from team name
 * @param {string} teamName - Team name
 * @returns {string|null} Facility ID or null if not a facility team
 */
function parseFacilityIdFromTeamName(teamName) {
  if (!teamName.startsWith(TEAM_NAMING.FACILITY_PREFIX) || 
      !teamName.endsWith(TEAM_NAMING.FACILITY_SUFFIX)) {
    return null;
  }
  
  const prefixLength = TEAM_NAMING.FACILITY_PREFIX.length;
  const suffixLength = TEAM_NAMING.FACILITY_SUFFIX.length;
  
  return teamName.substring(prefixLength, teamName.length - suffixLength);
}

/**
 * Check if team name is a facility team
 * @param {string} teamName - Team name
 * @returns {boolean} True if facility team
 */
function isFacilityTeam(teamName) {
  return parseFacilityIdFromTeamName(teamName) !== null;
}

/**
 * Check if team name is the global admin team
 * @param {string} teamName - Team name
 * @returns {boolean} True if global admin team
 */
function isGlobalAdminTeam(teamName) {
  return teamName === TEAM_NAMING.GLOBAL_ADMIN_TEAM;
}

/**
 * Get team role from existing role label
 * @param {string} roleLabel - Existing role label
 * @returns {string} Team role
 */
function getTeamRoleFromLabel(roleLabel) {
  return ROLE_LABEL_TO_TEAM_ROLE[roleLabel] || TEAM_ROLES.MEMBER;
}

/**
 * Check if role has higher or equal permissions
 * @param {string} userRole - User's team role
 * @param {string} requiredRole - Required team role
 * @returns {boolean} True if user role has sufficient permissions
 */
function hasHigherOrEqualRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get permissions for team role
 * @param {string} teamRole - Team role
 * @param {boolean} isGlobalAdmin - Whether this is for global admin team
 * @returns {Object} Permissions object
 */
function getTeamRolePermissions(teamRole, isGlobalAdmin = false) {
  if (isGlobalAdmin) {
    return TEAM_PERMISSIONS.GLOBAL_ADMIN;
  }
  
  return TEAM_PERMISSIONS.FACILITY[teamRole] || TEAM_PERMISSIONS.FACILITY[TEAM_ROLES.MEMBER];
}

/**
 * Validate team configuration
 * @param {Object} config - Team configuration to validate
 * @returns {Object} Validation result
 */
function validateTeamConfig(config) {
  const errors = [];
  
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Team name is required and must be a string');
  }
  
  if (config.facilityId && typeof config.facilityId !== 'string') {
    errors.push('Facility ID must be a string if provided');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  TEAM_NAMING,
  TEAM_ROLES,
  ROLE_HIERARCHY,
  ROLE_LABEL_TO_TEAM_ROLE,
  TEAM_PERMISSIONS,
  TEAM_CONFIG,
  
  // Utility functions
  generateFacilityTeamName,
  parseFacilityIdFromTeamName,
  isFacilityTeam,
  isGlobalAdminTeam,
  getTeamRoleFromLabel,
  hasHigherOrEqualRole,
  getTeamRolePermissions,
  validateTeamConfig
};