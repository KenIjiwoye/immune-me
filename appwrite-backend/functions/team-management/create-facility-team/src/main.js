/**
 * Create Facility Team Function
 * 
 * This Appwrite Cloud Function creates a new facility team for healthcare facility access control.
 * It handles team creation, initial configuration, and error handling.
 * 
 * Expected payload:
 * {
 *   "facilityId": "string",
 *   "facilityName": "string (optional)",
 *   "description": "string (optional)",
 *   "createdBy": "string (user ID)"
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

    if (!payload.createdBy) {
      return res.json({
        success: false,
        error: 'createdBy (user ID) is required',
        code: 'MISSING_CREATED_BY'
      }, 400);
    }

    log(`Creating facility team for facility: ${payload.facilityId}`);

    // Initialize team manager
    const teamManager = new FacilityTeamManager();
    const permissionChecker = new TeamPermissionChecker();

    // Check if the requesting user has permission to create teams
    const hasPermission = await permissionChecker.checkTeamManagementPermission(
      payload.createdBy,
      'createTeam',
      { facilityId: payload.facilityId }
    );

    if (!hasPermission.allowed) {
      log(`Permission denied for user ${payload.createdBy}: ${hasPermission.reason}`);
      return res.json({
        success: false,
        error: 'Insufficient permissions to create facility team',
        reason: hasPermission.reason,
        code: 'PERMISSION_DENIED'
      }, 403);
    }

    // Validate facility ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(payload.facilityId)) {
      return res.json({
        success: false,
        error: 'Invalid facility ID format. Only alphanumeric characters, underscores, and hyphens are allowed.',
        code: 'INVALID_FACILITY_ID'
      }, 400);
    }

    // Create team options
    const teamOptions = {
      description: payload.description || `Healthcare facility team for ${payload.facilityName || payload.facilityId}`,
      createdBy: payload.createdBy
    };

    // Create the facility team
    const result = await teamManager.createFacilityTeam(payload.facilityId, teamOptions);

    if (!result.success) {
      error(`Failed to create facility team: ${result.error}`);
      return res.json({
        success: false,
        error: result.error,
        code: 'TEAM_CREATION_FAILED'
      }, 500);
    }

    // If team was created (not already existing), add the creator as owner
    if (result.created) {
      try {
        const assignResult = await teamManager.assignUserToTeam(
          payload.createdBy,
          payload.facilityId,
          'owner'
        );

        if (!assignResult.success) {
          log(`Warning: Could not assign creator to team: ${assignResult.error}`);
        } else {
          log(`Successfully assigned creator ${payload.createdBy} as team owner`);
        }
      } catch (assignError) {
        log(`Warning: Error assigning creator to team: ${assignError.message}`);
      }
    }

    // Log successful creation
    log(`Successfully created/verified facility team: ${result.team.name}`);

    // Return success response
    return res.json({
      success: true,
      message: result.message,
      data: {
        teamId: result.team.$id,
        teamName: result.team.name,
        facilityId: payload.facilityId,
        created: result.created,
        createdBy: payload.createdBy,
        createdAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error(`Unexpected error in create-facility-team function: ${err.message}`);
    
    return res.json({
      success: false,
      error: 'Internal server error occurred while creating facility team',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
};

/**
 * Function configuration for Appwrite
 */
module.exports.config = {
  name: 'create-facility-team',
  description: 'Creates a new facility team for healthcare access control',
  runtime: 'node-18.0',
  execute: ['teams.write', 'users.read'],
  timeout: 30,
  variables: {
    APPWRITE_ENDPOINT: 'required',
    APPWRITE_PROJECT_ID: 'required',
    APPWRITE_API_KEY: 'required'
  }
};