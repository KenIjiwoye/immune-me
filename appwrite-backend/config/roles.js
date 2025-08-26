/**
 * Role Constants and Configuration for Appwrite Auth
 * Based on BE-AW-08 ticket requirements
 */

// Role label constants
const ROLE_LABELS = {
  ADMINISTRATOR: 'administrator',
  SUPERVISOR: 'supervisor', 
  DOCTOR: 'doctor',
  USER: 'user'
};

// Facility label prefix for facility-specific roles
const FACILITY_LABEL_PREFIX = 'facility_';

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY = {
  [ROLE_LABELS.USER]: 1,
  [ROLE_LABELS.DOCTOR]: 2,
  [ROLE_LABELS.SUPERVISOR]: 3,
  [ROLE_LABELS.ADMINISTRATOR]: 4
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLE_LABELS.ADMINISTRATOR]: {
    description: 'System administrators with full access to all facilities',
    permissions: {
      patients: ['create', 'read', 'update', 'delete'],
      immunization_records: ['create', 'read', 'update', 'delete'],
      facilities: ['create', 'read', 'update', 'delete'],
      vaccines: ['create', 'read', 'update', 'delete'],
      notifications: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'update', 'delete'],
      system_settings: ['read', 'update']
    },
    dataAccess: 'all_facilities',
    specialPermissions: [
      'user_management',
      'system_configuration', 
      'audit_access',
      'cross_facility_access'
    ],
    canAccessMultipleFacilities: true
  },

  [ROLE_LABELS.SUPERVISOR]: {
    description: 'Facility supervisors with administrative access to their facility',
    permissions: {
      patients: ['create', 'read', 'update', 'delete'],
      immunization_records: ['create', 'read', 'update', 'delete'],
      facilities: ['read', 'update'],
      vaccines: ['read', 'update'],
      notifications: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update'],
      reports: ['create', 'read', 'update']
    },
    dataAccess: 'facility_only',
    specialPermissions: [
      'facility_user_management',
      'facility_reports',
      'facility_settings'
    ],
    canAccessMultipleFacilities: false
  },

  [ROLE_LABELS.DOCTOR]: {
    description: 'Healthcare professionals managing patient care',
    permissions: {
      patients: ['create', 'read', 'update'],
      immunization_records: ['create', 'read', 'update'],
      facilities: ['read'],
      vaccines: ['read'],
      notifications: ['create', 'read', 'update'],
      users: ['read'],
      reports: ['read']
    },
    dataAccess: 'facility_only',
    specialPermissions: [
      'patient_care',
      'medical_records_access'
    ],
    canAccessMultipleFacilities: false
  },

  [ROLE_LABELS.USER]: {
    description: 'Basic users with limited access',
    permissions: {
      patients: ['read'],
      immunization_records: ['read'],
      facilities: ['read'],
      vaccines: ['read'],
      notifications: ['read'],
      users: [],
      reports: []
    },
    dataAccess: 'facility_only',
    specialPermissions: [],
    canAccessMultipleFacilities: false
  }
};

// Default role for new users
const DEFAULT_ROLE = ROLE_LABELS.USER;

// Role validation rules
const ROLE_VALIDATION = {
  requiredFields: ['role', 'facilityId'],
  optionalFields: ['permissions', 'specialAccess'],
  validRoles: Object.values(ROLE_LABELS)
};

/**
 * Get role configuration by role name
 * @param {string} role - Role name
 * @returns {Object|null} Role configuration or null if not found
 */
function getRoleConfig(role) {
  return ROLE_PERMISSIONS[role] || null;
}

/**
 * Check if a role exists
 * @param {string} role - Role name to check
 * @returns {boolean} True if role exists
 */
function isValidRole(role) {
  return ROLE_VALIDATION.validRoles.includes(role);
}

/**
 * Get role hierarchy level
 * @param {string} role - Role name
 * @returns {number} Hierarchy level (higher = more privileged)
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

/**
 * Check if role A has higher or equal privilege than role B
 * @param {string} roleA - First role
 * @param {string} roleB - Second role
 * @returns {boolean} True if roleA >= roleB in hierarchy
 */
function hasHigherOrEqualRole(roleA, roleB) {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

/**
 * Generate facility-specific label
 * @param {string} facilityId - Facility ID
 * @returns {string} Facility label
 */
function generateFacilityLabel(facilityId) {
  return `${FACILITY_LABEL_PREFIX}${facilityId}`;
}

/**
 * Parse facility ID from facility label
 * @param {string} facilityLabel - Facility label
 * @returns {string|null} Facility ID or null if invalid
 */
function parseFacilityId(facilityLabel) {
  if (!facilityLabel || !facilityLabel.startsWith(FACILITY_LABEL_PREFIX)) {
    return null;
  }
  return facilityLabel.substring(FACILITY_LABEL_PREFIX.length);
}

/**
 * Get all available roles
 * @returns {Array<string>} Array of role names
 */
function getAllRoles() {
  return Object.values(ROLE_LABELS);
}

/**
 * Get roles that can access multiple facilities
 * @returns {Array<string>} Array of role names
 */
function getMultiFacilityRoles() {
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([, config]) => config.canAccessMultipleFacilities)
    .map(([role]) => role);
}

module.exports = {
  // Constants
  ROLE_LABELS,
  FACILITY_LABEL_PREFIX,
  DEFAULT_ROLE,
  
  // Configuration objects
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  ROLE_VALIDATION,
  
  // Utility functions
  getRoleConfig,
  isValidRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  generateFacilityLabel,
  parseFacilityId,
  getAllRoles,
  getMultiFacilityRoles
};