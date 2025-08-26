'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const rolesPath = path.resolve(__dirname, '../../config/role-definitions.json');
const raw = fs.readFileSync(rolesPath, 'utf8');
const roles = JSON.parse(raw);

(function run() {
  // Basic structure checks
  assert(roles.admin, 'Admin role must be defined');
  assert(roles.facility_manager, 'Facility manager role must be defined');
  assert(roles.healthcare_worker, 'Healthcare worker role must be defined');
  assert(roles.data_entry_clerk, 'Data entry clerk role must be defined');

  // Permission expectations based on ticket
  assert(roles.admin.permissions.patients.includes('delete'), 'Admin should be able to delete patients');
  assert(!roles.facility_manager.permissions.patients.includes('delete'), 'Facility manager should not delete patients');

  assert(roles.healthcare_worker.permissions.patients.includes('read'), 'Healthcare worker should read patients');
  assert(roles.data_entry_clerk.permissions.immunization_records.includes('read'), 'Data entry clerk reads immunization records');

  console.log('Permissions config tests passed.');
})();