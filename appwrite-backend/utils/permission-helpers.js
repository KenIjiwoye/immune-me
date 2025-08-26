'use strict';

const fs = require('fs');
const path = require('path');

function loadRoleDefinitions() {
  // Attempt to load shared config; fallback to inline defaults if not present.
  const configPath = path.resolve(__dirname, '../config/role-definitions.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {
      admin: {
        description: 'System administrators with full access',
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
        specialPermissions: ['user_management', 'system_configuration', 'audit_access']
      },
      facility_manager: {
        description: 'Facility managers with administrative access to their facility',
        permissions: {
          patients: ['create', 'read', 'update'],
          immunization_records: ['create', 'read', 'update'],
          facilities: ['read', 'update'],
          vaccines: ['read'],
          notifications: ['create', 'read', 'update'],
          users: ['create', 'read', 'update'],
          reports: ['create', 'read']
        },
        dataAccess: 'facility_only',
        specialPermissions: ['facility_user_management', 'facility_reports']
      },
      healthcare_worker: {
        description: 'Healthcare workers managing patient records',
        permissions: {
          patients: ['create', 'read', 'update'],
          immunization_records: ['create', 'read', 'update'],
          facilities: ['read'],
          vaccines: ['read'],
          notifications: ['read', 'update']
        },
        dataAccess: 'facility_only',
        specialPermissions: ['patient_care']
      },
      data_entry_clerk: {
        description: 'Data entry personnel with limited access',
        permissions: {
          patients: ['create', 'read', 'update'],
          immunization_records: ['create', 'read'],
          facilities: ['read'],
          vaccines: ['read'],
          notifications: ['read']
        },
        dataAccess: 'facility_only',
        specialPermissions: []
      }
    };
  }
}

const roleDefinitions = loadRoleDefinitions();

function getRolePermissions(role) {
  return roleDefinitions[role] || roleDefinitions.healthcare_worker;
}

function canPerformOperation(role, collection, operation) {
  const def = getRolePermissions(role);
  return !!def.permissions[collection] && def.permissions[collection].includes(operation);
}

function isFacilityScoped(role) {
  const def = getRolePermissions(role);
  return def.dataAccess === 'facility_only';
}

module.exports = {
  getRolePermissions,
  canPerformOperation,
  isFacilityScoped
};