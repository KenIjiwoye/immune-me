/**
 * Get Team Members Function
 * 
 * This Appwrite Cloud Function retrieves all members of a facility team.
 * It handles permission checking, member information retrieval, and filtering.
 * 
 * Expected payload:
 * {
 *   "facilityId": "string",
 *   "requestedBy": "string (user ID of the person making the request)",
 *   "includeUserDetails": "boolean (optional - default true)",
 *   "roleFilter": "string (optional - filter by specific role: owner, admin, member)"
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
    if (!payload.facilityId) {
      return res.json({
        success: false,
        error: 'facilityId is required',
        code: 'MISSING_FACILITY_ID'
      }, 400);
    }

    if (!payload.requestedBy) {
      return res.json({
        success: false,
        error: 'requestedBy (user ID) is required',
        code: 'MISSING_REQUESTED_BY'
      }, 400);
    }

    log(`Getting team members for facility: ${payload.facilityId}`);

    // Initialize managers
    const teamManager = new FacilityTeamManager();
    const permissionChecker = new TeamPermissionChecker();

    // Check if the requesting user has access to the facility
    const facilityAccess = await permissionChecker.checkFacilityAccess(
      payload.requestedBy,
      payload.facilityId
    );

    if (!facilityAccess.allowed) {
      log(`Access denied for user ${payload.requestedBy}: ${facilityAccess.reason}`);
      return res.json({
        success: false,
        error: 'Insufficient permissions to view team members',
        reason: facilityAccess.reason,
        code: 'ACCESS_DENIED'
      }, 403);
    }

    // Validate role filter if provided
    const validRoles = ['owner', 'admin', 'member'];
    if (payload.roleFilter && !validRoles.includes(payload.roleFilter)) {
      return res.json({
        success: false,
        error: `Invalid role filter. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE_FILTER'
      }, 400);
    }

    // Get team members
    const teamMembers = await teamManager.getFacilityTeamMembers(payload.facilityId);

    if (!teamMembers) {
      return res.json({
        success: false,
        error: 'Facility team not found',
        code: 'TEAM_NOT_FOUND'
      }, 404);
    }

    // Apply role filter if specified
    let filteredMembers = teamMembers;
    if (payload.roleFilter) {
      filteredMembers = teamMembers.filter(member => 
        member.primaryRole === payload.roleFilter
      );
    }

    // Determine what user details to include
    const includeUserDetails = payload.includeUserDetails !== false; // Default to true

    // Format member data
    const formattedMembers = filteredMembers.map(member => {
      const memberData = {
        membershipId: member.$id,
        userId: member.userId,
        roles: member.roles,
        primaryRole: member.primaryRole,
        joined: member.$createdAt,
        invited: member.invited,
        confirm: member.confirm
      };

      // Include user details if requested and available
      if (includeUserDetails && member.user) {
        memberData.user = {
          $id: member.user.$id,
          name: member.user.name,
          email: member.user.email,
          phone: member.user.phone || null,
          status: member.user.status,
          labels: member.user.labels || [],
          emailVerification: member.user.emailVerification,
          phoneVerification: member.user.phoneVerification,
          registration: member.user.registration
        };
      }

      return memberData;
    });

    // Get team statistics
    const teamStats = {
      totalMembers: teamMembers.length,
      filteredMembers: filteredMembers.length,
      roleBreakdown: {
        owners: teamMembers.filter(m => m.primaryRole === 'owner').length,
        admins: teamMembers.filter(m => m.primaryRole === 'admin').length,
        members: teamMembers.filter(m => m.primaryRole === 'member').length
      }
    };

    // Log successful retrieval
    log(`Successfully retrieved ${filteredMembers.length} team members for facility ${payload.facilityId}`);

    // Return success response
    return res.json({
      success: true,
      message: 'Team members retrieved successfully',
      data: {
        facilityId: payload.facilityId,
        members: formattedMembers,
        statistics: teamStats,
        requestedBy: payload.requestedBy,
        roleFilter: payload.roleFilter || null,
        includeUserDetails,
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error(`Unexpected error in get-team-members function: ${err.message}`);
    
    return res.json({
      success: false,
      error: 'Internal server error occurred while retrieving team members',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
};

/**
 * Function configuration for Appwrite
 */
module.exports.config = {
  name: 'get-team-members',
  description: 'Retrieves all members of a facility team',
  runtime: 'node-18.0',
  execute: ['teams.read', 'users.read'],
  timeout: 30,
  variables: {
    APPWRITE_ENDPOINT: 'required',
    APPWRITE_PROJECT_ID: 'required',
    APPWRITE_API_KEY: 'required'
  }
};