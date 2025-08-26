/**
 * Assign User to Team Function
 * 
 * This Appwrite Cloud Function assigns a user to a facility team with the appropriate role.
 * It handles permission checking, role assignment, and multi-facility user support.
 * 
 * Expected payload:
 * {
 *   "userId": "string",
 *   "facilityId": "string",
 *   "teamRole": "string (optional - will be determined from user role if not provided)",
 *   "assignedBy": "string (user ID of the person making the assignment)"
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

    if (!payload.assignedBy) {
      return res.json({
        success: false,
        error: 'assignedBy (user ID) is required',
        code: 'MISSING_ASSIGNED_BY'
      }, 400);
    }

    log(`Assigning user ${payload.userId} to facility team: ${payload.facilityId}`);

    // Initialize managers
    const teamManager = new FacilityTeamManager();
    const permissionChecker = new TeamPermissionChecker();

    // Check if the requesting user has permission to add team members
    const hasPermission = await permissionChecker.checkTeamManagementPermission(
      payload.assignedBy,
      'addMember',
      { 
        facilityId: payload.facilityId,
        targetUserId: payload.userId
      }
    );

    if (!hasPermission.allowed) {
      log(`Permission denied for user ${payload.assignedBy}: ${hasPermission.reason}`);
      return res.json({
        success: false,
        error: 'Insufficient permissions to assign user to team',
        reason: hasPermission.reason,
        code: 'PERMISSION_DENIED'
      }, 403);
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

    // Validate team role if provided
    const validRoles = ['owner', 'admin', 'member'];
    if (payload.teamRole && !validRoles.includes(payload.teamRole)) {
      return res.json({
        success: false,
        error: `Invalid team role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_TEAM_ROLE'
      }, 400);
    }

    // Check if user is already in too many teams (multi-facility limit)
    const userTeams = await teamManager.getUserTeams(payload.userId);
    const maxTeams = 5; // From team configuration
    
    if (userTeams.length >= maxTeams) {
      const isAlreadyMember = userTeams.some(membership => 
        membership.facilityId === payload.facilityId
      );
      
      if (!isAlreadyMember) {
        return res.json({
          success: false,
          error: `User cannot belong to more than ${maxTeams} teams`,
          code: 'MAX_TEAMS_EXCEEDED'
        }, 400);
      }
    }

    // Assign user to team
    const assignResult = await teamManager.assignUserToTeam(
      payload.userId,
      payload.facilityId,
      payload.teamRole
    );

    if (!assignResult.success) {
      error(`Failed to assign user to team: ${assignResult.error}`);
      return res.json({
        success: false,
        error: assignResult.error,
        code: 'ASSIGNMENT_FAILED'
      }, 500);
    }

    // Log successful assignment
    log(`Successfully assigned user ${payload.userId} to team ${assignResult.teamName} with role ${assignResult.teamRole}`);

    // Return success response
    return res.json({
      success: true,
      message: assignResult.message,
      data: {
        userId: payload.userId,
        facilityId: payload.facilityId,
        teamId: assignResult.teamId,
        teamName: assignResult.teamName,
        teamRole: assignResult.teamRole,
        assignedBy: payload.assignedBy,
        updated: assignResult.updated,
        assignedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error(`Unexpected error in assign-user-to-team function: ${err.message}`);
    
    return res.json({
      success: false,
      error: 'Internal server error occurred while assigning user to team',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
};

/**
 * Function configuration for Appwrite
 */
module.exports.config = {
  name: 'assign-user-to-team',
  description: 'Assigns a user to a facility team with appropriate role',
  runtime: 'node-18.0',
  execute: ['teams.write', 'users.read'],
  timeout: 30,
  variables: {
    APPWRITE_ENDPOINT: 'required',
    APPWRITE_PROJECT_ID: 'required',
    APPWRITE_API_KEY: 'required'
  }
};