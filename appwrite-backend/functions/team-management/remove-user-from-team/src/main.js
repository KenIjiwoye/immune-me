/**
 * Remove User from Team Function
 * 
 * This Appwrite Cloud Function removes a user from a facility team.
 * It handles permission checking, membership removal, and proper cleanup.
 * 
 * Expected payload:
 * {
 *   "userId": "string",
 *   "facilityId": "string",
 *   "removedBy": "string (user ID of the person making the removal)",
 *   "reason": "string (optional - reason for removal)"
 * }
 */

const { Client, Teams, Users } = require('node-appwrite');

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const teams = new Teams(client);
const users = new Users(client);

// Import utility classes (in a real deployment, these would be bundled)
const FacilityTeamManager = require('../../../utils/facility-team-manager');
const TeamPermissionChecker = require('../../../utils/team-permission-checker');

/**
 * Main function handler
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validate required parameters
    if (!payload.userId) {
      return res.json({
        success: false,
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      }, 400);
    }

    if (!payload.facilityId) {
      return res.json({
        success: false,
        error: 'facilityId is required',
        code: 'MISSING_FACILITY_ID'
      }, 400);
    }

    if (!payload.removedBy) {
      return res.json({
        success: false,
        error: 'removedBy (user ID) is required',
        code: 'MISSING_REMOVED_BY'
      }, 400);
    }

    log(`Removing user ${payload.userId} from facility team: ${payload.facilityId}`);

    // Initialize managers
    const teamManager = new FacilityTeamManager();
    const permissionChecker = new TeamPermissionChecker();

    // Check if this is a self-removal
    const isSelfRemoval = payload.userId === payload.removedBy;

    // Check permissions for removal
    if (!isSelfRemoval) {
      const hasPermission = await permissionChecker.checkTeamManagementPermission(
        payload.removedBy,
        'removeMember',
        { 
          facilityId: payload.facilityId,
          targetUserId: payload.userId
        }
      );

      if (!hasPermission.allowed) {
        log(`Permission denied for user ${payload.removedBy}: ${hasPermission.reason}`);
        return res.json({
          success: false,
          error: 'Insufficient permissions to remove user from team',
          reason: hasPermission.reason,
          code: 'PERMISSION_DENIED'
        }, 403);
      }
    }

    // Verify that the target user exists
    try {
      const targetUser = await users.get(payload.userId);
      if (!targetUser) {
        return res.json({
          success: false,
          error: 'Target user not found',
          code: 'USER_NOT_FOUND'
        }, 404);
      }
    } catch (userError) {
      log(`Error fetching target user: ${userError.message}`);
      return res.json({
        success: false,
        error: 'Target user not found or inaccessible',
        code: 'USER_NOT_FOUND'
      }, 404);
    }

    // Check if user is actually a member of the team
    const isUserInTeam = await teamManager.isUserInFacilityTeam(payload.userId, payload.facilityId);
    if (!isUserInTeam) {
      return res.json({
        success: true,
        message: 'User was not a member of the facility team',
        data: {
          userId: payload.userId,
          facilityId: payload.facilityId,
          removedBy: payload.removedBy,
          wasRemoved: false,
          reason: 'User was not a team member'
        }
      });
    }

    // Get user's current role in the team for logging
    const userRole = await teamManager.getUserRoleInFacilityTeam(payload.userId, payload.facilityId);

    // Additional check: prevent removal of the last owner (unless self-removal)
    if (userRole === 'owner' && !isSelfRemoval) {
      const teamMembers = await teamManager.getFacilityTeamMembers(payload.facilityId);
      const ownerCount = teamMembers.filter(member => member.primaryRole === 'owner').length;
      
      if (ownerCount <= 1) {
        return res.json({
          success: false,
          error: 'Cannot remove the last owner from the team. Assign another owner first.',
          code: 'LAST_OWNER_REMOVAL'
        }, 400);
      }
    }

    // Remove user from team
    const removeResult = await teamManager.removeUserFromTeam(payload.userId, payload.facilityId);

    if (!removeResult.success) {
      error(`Failed to remove user from team: ${removeResult.error}`);
      return res.json({
        success: false,
        error: removeResult.error,
        code: 'REMOVAL_FAILED'
      }, 500);
    }

    // Log successful removal
    const removalType = isSelfRemoval ? 'self-removal' : 'admin removal';
    log(`Successfully removed user ${payload.userId} from team ${removeResult.teamName} (${removalType})`);

    // Return success response
    return res.json({
      success: true,
      message: removeResult.message,
      data: {
        userId: payload.userId,
        facilityId: payload.facilityId,
        teamId: removeResult.teamId,
        teamName: removeResult.teamName,
        removedBy: payload.removedBy,
        isSelfRemoval,
        previousRole: userRole,
        reason: payload.reason || (isSelfRemoval ? 'Self-removal' : 'Admin removal'),
        removedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error(`Unexpected error in remove-user-from-team function: ${err.message}`);
    
    return res.json({
      success: false,
      error: 'Internal server error occurred while removing user from team',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
};

/**
 * Function configuration for Appwrite
 */
module.exports.config = {
  name: 'remove-user-from-team',
  description: 'Removes a user from a facility team',
  runtime: 'node-18.0',
  execute: ['teams.write', 'users.read'],
  timeout: 30,
  variables: {
    APPWRITE_ENDPOINT: 'required',
    APPWRITE_PROJECT_ID: 'required',
    APPWRITE_API_KEY: 'required'
  }
};