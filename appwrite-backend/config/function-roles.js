/**
 * Function Permission Matrix - BE-AW-11 Implementation
 * 
 * This configuration defines the comprehensive permission matrix for all Appwrite functions,
 * specifying which roles can execute which functions and under what conditions.
 * 
 * Integrates with the existing permission system and follows the role hierarchy:
 * administrator > supervisor > doctor > user
 */

const { ROLE_LABELS } = require('./roles');

/**
 * Function categories and their associated functions
 */
const FUNCTION_CATEGORIES = {
  // Data synchronization functions
  DATA_SYNC: {
    'incremental-data-sync': {
      description: 'Synchronizes data incrementally between systems',
      riskLevel: 'high',
      requiresFacilityScope: false
    },
    'real-time-sync-trigger': {
      description: 'Triggers real-time data synchronization',
      riskLevel: 'high',
      requiresFacilityScope: false
    },
    'conflict-resolution': {
      description: 'Resolves data conflicts during synchronization',
      riskLevel: 'high',
      requiresFacilityScope: false
    },
    'data-validation': {
      description: 'Validates data integrity during sync operations',
      riskLevel: 'medium',
      requiresFacilityScope: false
    },
    'offline-queue-processor': {
      description: 'Processes offline data queue',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'sync-status-monitor': {
      description: 'Monitors synchronization status',
      riskLevel: 'low',
      requiresFacilityScope: false
    }
  },

  // Notification functions
  NOTIFICATIONS: {
    'due-immunization-reminders': {
      description: 'Sends immunization due reminders',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'email-sender': {
      description: 'Sends email notifications',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'sms-sender': {
      description: 'Sends SMS notifications',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'push-notification-sender': {
      description: 'Sends push notifications',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'process-notification-queue': {
      description: 'Processes notification queue',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'schedule-notifications': {
      description: 'Schedules future notifications',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'cleanup-old-notifications': {
      description: 'Cleans up old notification records',
      riskLevel: 'low',
      requiresFacilityScope: false
    }
  },

  // Report generation functions
  REPORTS: {
    'immunization-coverage-report': {
      description: 'Generates immunization coverage reports',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'facility-performance-metrics': {
      description: 'Generates facility performance metrics',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'vaccine-usage-statistics': {
      description: 'Generates vaccine usage statistics',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'age-distribution-analysis': {
      description: 'Analyzes patient age distribution',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'due-immunizations-list': {
      description: 'Generates list of due immunizations',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'generate-pdf-report': {
      description: 'Generates PDF reports',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'generate-excel-export': {
      description: 'Generates Excel exports',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'generate-csv-export': {
      description: 'Generates CSV exports',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'scheduled-weekly-reports': {
      description: 'Generates scheduled weekly reports',
      riskLevel: 'low',
      requiresFacilityScope: true
    }
  },

  // User management functions
  USER_MANAGEMENT: {
    'create-user': {
      description: 'Creates new user accounts',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'assign-role': {
      description: 'Assigns roles to users',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'get-user-info': {
      description: 'Retrieves user information',
      riskLevel: 'medium',
      requiresFacilityScope: true
    },
    'check-permissions': {
      description: 'Checks user permissions',
      riskLevel: 'low',
      requiresFacilityScope: true
    }
  },

  // Team management functions
  TEAM_MANAGEMENT: {
    'create-facility-team': {
      description: 'Creates facility teams',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'assign-user-to-team': {
      description: 'Assigns users to teams',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'remove-user-from-team': {
      description: 'Removes users from teams',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'get-team-members': {
      description: 'Retrieves team member information',
      riskLevel: 'low',
      requiresFacilityScope: true
    }
  },

  // Permission management functions
  PERMISSIONS: {
    'assign-user-role': {
      description: 'Assigns roles to users with validation',
      riskLevel: 'high',
      requiresFacilityScope: true
    },
    'validate-document-access': {
      description: 'Validates document access permissions',
      riskLevel: 'low',
      requiresFacilityScope: true
    },
    'audit-access-log': {
      description: 'Logs access attempts for auditing',
      riskLevel: 'low',
      requiresFacilityScope: false
    }
  }
};

/**
 * Role-based function permissions matrix
 * Defines which roles can execute which functions and under what conditions
 */
const FUNCTION_PERMISSIONS = {
  [ROLE_LABELS.ADMINISTRATOR]: {
    // Administrators have full access to all functions
    DATA_SYNC: {
      allowed: ['*'], // All data sync functions
      conditions: [],
      rateLimit: {
        requests: 50,
        duration: 3600 // 1 hour
      }
    },
    NOTIFICATIONS: {
      allowed: ['*'], // All notification functions
      conditions: [],
      rateLimit: {
        requests: 200,
        duration: 3600
      }
    },
    REPORTS: {
      allowed: ['*'], // All report functions
      conditions: [],
      rateLimit: {
        requests: 100,
        duration: 3600
      }
    },
    USER_MANAGEMENT: {
      allowed: ['*'], // All user management functions
      conditions: [],
      rateLimit: {
        requests: 50,
        duration: 3600
      }
    },
    TEAM_MANAGEMENT: {
      allowed: ['*'], // All team management functions
      conditions: [],
      rateLimit: {
        requests: 50,
        duration: 3600
      }
    },
    PERMISSIONS: {
      allowed: ['*'], // All permission functions
      conditions: [],
      rateLimit: {
        requests: 100,
        duration: 3600
      }
    }
  },

  supervisor: {
    // Supervisors have facility-scoped access to most functions
    DATA_SYNC: {
      allowed: [
        'offline-queue-processor',
        'sync-status-monitor'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 20,
        duration: 3600
      }
    },
    NOTIFICATIONS: {
      allowed: [
        'due-immunization-reminders',
        'email-sender',
        'sms-sender',
        'push-notification-sender',
        'process-notification-queue',
        'schedule-notifications'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 100,
        duration: 3600
      }
    },
    REPORTS: {
      allowed: ['*'], // All report functions for facility
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 50,
        duration: 3600
      }
    },
    USER_MANAGEMENT: {
      allowed: [
        'create-user',
        'assign-role',
        'get-user-info',
        'check-permissions'
      ],
      conditions: ['facility_match', 'active_facility', 'role_hierarchy'],
      rateLimit: {
        requests: 30,
        duration: 3600
      }
    },
    TEAM_MANAGEMENT: {
      allowed: [
        'create-facility-team',
        'assign-user-to-team',
        'remove-user-from-team',
        'get-team-members'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 30,
        duration: 3600
      }
    },
    PERMISSIONS: {
      allowed: [
        'assign-user-role',
        'validate-document-access',
        'audit-access-log'
      ],
      conditions: ['facility_match', 'active_facility', 'role_hierarchy'],
      rateLimit: {
        requests: 50,
        duration: 3600
      }
    }
  },

  doctor: {
    // Doctors have limited access focused on clinical functions
    DATA_SYNC: {
      allowed: [
        'sync-status-monitor'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 10,
        duration: 3600
      }
    },
    NOTIFICATIONS: {
      allowed: [
        'due-immunization-reminders',
        'schedule-notifications'
      ],
      conditions: ['facility_match', 'active_facility', 'clinical_access'],
      rateLimit: {
        requests: 50,
        duration: 3600
      }
    },
    REPORTS: {
      allowed: [
        'immunization-coverage-report',
        'vaccine-usage-statistics',
        'age-distribution-analysis',
        'due-immunizations-list',
        'generate-pdf-report'
      ],
      conditions: ['facility_match', 'active_facility', 'clinical_access'],
      rateLimit: {
        requests: 30,
        duration: 3600
      }
    },
    USER_MANAGEMENT: {
      allowed: [
        'get-user-info',
        'check-permissions'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 20,
        duration: 3600
      }
    },
    TEAM_MANAGEMENT: {
      allowed: [
        'get-team-members'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 20,
        duration: 3600
      }
    },
    PERMISSIONS: {
      allowed: [
        'validate-document-access'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 30,
        duration: 3600
      }
    }
  },

  user: {
    // Regular users have minimal function access
    DATA_SYNC: {
      allowed: [
        'sync-status-monitor'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 5,
        duration: 3600
      }
    },
    NOTIFICATIONS: {
      allowed: [
        'due-immunization-reminders'
      ],
      conditions: ['facility_match', 'active_facility', 'assigned_patients'],
      rateLimit: {
        requests: 20,
        duration: 3600
      }
    },
    REPORTS: {
      allowed: [
        'due-immunizations-list',
        'generate-pdf-report'
      ],
      conditions: ['facility_match', 'active_facility', 'assigned_patients'],
      rateLimit: {
        requests: 10,
        duration: 3600
      }
    },
    USER_MANAGEMENT: {
      allowed: [
        'get-user-info',
        'check-permissions'
      ],
      conditions: ['facility_match', 'active_facility', 'self_only'],
      rateLimit: {
        requests: 10,
        duration: 3600
      }
    },
    TEAM_MANAGEMENT: {
      allowed: [
        'get-team-members'
      ],
      conditions: ['facility_match', 'active_facility'],
      rateLimit: {
        requests: 10,
        duration: 3600
      }
    },
    PERMISSIONS: {
      allowed: [
        'validate-document-access'
      ],
      conditions: ['facility_match', 'active_facility', 'self_only'],
      rateLimit: {
        requests: 20,
        duration: 3600
      }
    }
  }
};

/**
 * Function execution conditions
 * Defines the conditions that must be met for function execution
 */
const EXECUTION_CONDITIONS = {
  facility_match: {
    description: 'User must belong to the same facility as the data being accessed',
    validator: 'validateFacilityMatch'
  },
  active_facility: {
    description: 'User must be assigned to an active facility',
    validator: 'validateActiveFacility'
  },
  clinical_access: {
    description: 'User must have clinical access permissions',
    validator: 'validateClinicalAccess'
  },
  assigned_patients: {
    description: 'User can only access data for assigned patients',
    validator: 'validateAssignedPatients'
  },
  role_hierarchy: {
    description: 'User can only manage users with lower role hierarchy',
    validator: 'validateRoleHierarchy'
  },
  self_only: {
    description: 'User can only access their own data',
    validator: 'validateSelfAccess'
  }
};

/**
 * Function security policies
 * Defines security requirements for different function categories
 */
const FUNCTION_SECURITY_POLICIES = {
  DATA_SYNC: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: true,
    ipRestriction: true,
    timeRestriction: false
  },
  NOTIFICATIONS: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: false,
    ipRestriction: false,
    timeRestriction: false
  },
  REPORTS: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: true,
    ipRestriction: false,
    timeRestriction: false
  },
  USER_MANAGEMENT: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: true,
    ipRestriction: true,
    timeRestriction: false
  },
  TEAM_MANAGEMENT: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: true,
    ipRestriction: true,
    timeRestriction: false
  },
  PERMISSIONS: {
    requiresAuthentication: true,
    requiresAuthorization: true,
    auditRequired: true,
    encryptionRequired: true,
    ipRestriction: true,
    timeRestriction: false
  }
};

/**
 * Default rate limits for different risk levels
 */
const DEFAULT_RATE_LIMITS = {
  high: {
    requests: 10,
    duration: 3600
  },
  medium: {
    requests: 50,
    duration: 3600
  },
  low: {
    requests: 100,
    duration: 3600
  }
};

/**
 * Function metadata for enhanced security and monitoring
 */
const FUNCTION_METADATA = {
  version: '1.0.0',
  lastUpdated: '2025-08-26T12:30:00Z',
  description: 'Comprehensive function permission matrix for BE-AW-11',
  compliance: {
    hipaa: true,
    gdpr: true
  },
  monitoring: {
    enabled: true,
    alertOnFailure: true,
    logLevel: 'info'
  }
};

module.exports = {
  FUNCTION_CATEGORIES,
  FUNCTION_PERMISSIONS,
  EXECUTION_CONDITIONS,
  FUNCTION_SECURITY_POLICIES,
  DEFAULT_RATE_LIMITS,
  FUNCTION_METADATA
};