'use strict';

const { Client, Users, Teams, Databases } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const users = new Users(client);
  const teams = new Teams(client);
  const databases = new Databases(client);
  const dbId = process.env.APPWRITE_DATABASE_ID || 'immune-me-db';

  try {
    const {
      targetUserId,
      newRole,
      facilityId,
      assignedBy,
      reason
    } = JSON.parse(req.payload || '{}');

    if (!targetUserId || !newRole || !assignedBy) {
      return res.json({ success: false, error: 'Missing required fields: targetUserId, newRole, assignedBy' }, 400);
    }

    // Validate the assigning user has permission
    const assigningUser = await users.get(assignedBy);
    const assigningUserRole = assigningUser.prefs && assigningUser.prefs.role ? assigningUser.prefs.role : null;

    if (!canAssignRole(assigningUserRole, newRole)) {
      return res.json({
        success: false,
        error: 'Insufficient permissions to assign this role'
      }, 403);
    }

    // Get target user
    const targetUser = await users.get(targetUserId);
    const currentRole = targetUser.prefs && targetUser.prefs.role ? targetUser.prefs.role : null;

    // Remove user from current role team (best-effort)
    if (currentRole) {
      const currentTeamId = getRoleTeamId(currentRole);
      try {
        const memberships = await teams.listMemberships(currentTeamId);
        const membership = memberships.memberships.find(m => m.userId === targetUserId);
        if (membership) {
          await teams.deleteMembership(currentTeamId, membership.$id);
        }
      } catch (removeError) {
        log(`Warning: Could not remove user from current team: ${removeError.message}`);
      }
    }

    // Add user to new role team (invite if needed)
    const newTeamId = getRoleTeamId(newRole);
    try {
      // Prefer direct membership via email invite
      await teams.createMembership(
        newTeamId,
        targetUser.email,
        ['member'],
        `${process.env.FRONTEND_URL || 'https://example.com'}/auth/verify`
      );
    } catch (inviteErr) {
      log(`Membership invite failed (non-fatal): ${inviteErr.message}`);
    }

    // Update user preferences
    await users.updatePrefs(targetUserId, {
      ...targetUser.prefs,
      role: newRole,
      facilityId: facilityId || (targetUser.prefs && targetUser.prefs.facilityId ? targetUser.prefs.facilityId : null),
      roleAssignedBy: assignedBy,
      roleAssignedAt: new Date().toISOString()
    });

    // Log role change
    await logRoleChange({
      targetUserId,
      previousRole: currentRole || null,
      newRole,
      facilityId: facilityId || null,
      assignedBy,
      timestamp: new Date().toISOString(),
      reason: reason || null
    });

    log(`Role changed for user ${targetUserId}: ${currentRole} -> ${newRole}`);

    return res.json({
      success: true,
      userId: targetUserId,
      previousRole: currentRole || null,
      newRole,
      facilityId: facilityId || null
    });

  } catch (err) {
    error('Role assignment failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function canAssignRole(assigningRole, targetRole) {
    const roleHierarchy = {
      admin: ['admin', 'facility_manager', 'healthcare_worker', 'data_entry_clerk'],
      facility_manager: ['healthcare_worker', 'data_entry_clerk']
    };
    return roleHierarchy[assigningRole] && roleHierarchy[assigningRole].includes(targetRole);
  }

  function getRoleTeamId(role) {
    const teamMapping = {
      admin: 'admin-team',
      facility_manager: 'facility-managers',
      healthcare_worker: 'healthcare-workers',
      data_entry_clerk: 'data-entry-clerks'
    };
    return teamMapping[role] || 'healthcare-workers';
  }

  async function logRoleChange(changeData) {
    try {
      await databases.createDocument(
        dbId,
        'role_change_log',
        'unique()',
        changeData
      );
    } catch (logError) {
      error('Failed to log role change: ' + logError.message);
    }
  }
};