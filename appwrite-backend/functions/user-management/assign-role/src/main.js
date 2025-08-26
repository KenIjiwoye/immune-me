/**
 * Assign Role Function
 * Appwrite Function for assigning or updating user roles and facility access
 */

const { Client, Users } = require('node-appwrite');
const RoleManager = require('../../../../utils/role-manager');
const { ROLE_LABELS, isValidRole, hasHigherOrEqualRole } = require('../../../../config/roles');

/**
 * Main function handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response with role assignment result
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validate required fields
    const { userId, role, facilityId, requestingUserId } = payload;
    
    if (!userId || !role) {
      return res.json({
        success: false,
        error: 'Missing required fields: userId, role'
      }, 400);
    }

    // Validate role
    if (!isValidRole(role)) {
      return res.json({
        success: false,
        error: `Invalid role: ${role}`
      }, 400);
    }

    // Check if facility ID is required for the role
    if (role !== ROLE_LABELS.ADMINISTRATOR && !facilityId) {
      return res.json({
        success: false,
        error: 'Facility ID is required for non-administrator roles'
      }, 400);
    }

    // Initialize services
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const roleManager = new RoleManager();

    log(`Assigning role ${role} to user ${userId}`);

    // Verify target user exists
    try {
      await users.get(userId);
    } catch (err) {
      if (err.code === 404) {
        return res.json({
          success: false,
          error: 'Target user not found'
        }, 404);
      }
      throw err;
    }

    // If requesting user is provided, validate permissions
    if (requestingUserId) {
      log(`Validating permissions for requesting user ${requestingUserId}`);
      
      const requestingUserInfo = await roleManager.getUserRoleInfo(requestingUserId);
      if (!requestingUserInfo.success) {
        return res.json({
          success: false,
          error: 'Could not validate requesting user permissions'
        }, 403);
      }

      // Check if requesting user has permission to assign roles
      const canManageUsers = await roleManager.hasPermission(requestingUserId, 'users', 'update');
      if (!canManageUsers) {
        return res.json({
          success: false,
          error: 'Insufficient permissions to assign roles'
        }, 403);
      }

      // Prevent privilege escalation - users cannot assign roles higher than their own
      if (!hasHigherOrEqualRole(requestingUserInfo.role, role)) {
        return res.json({
          success: false,
          error: 'Cannot assign a role higher than your own'
        }, 403);
      }

      // Non-administrators can only assign roles within their facility
      if (requestingUserInfo.role !== ROLE_LABELS.ADMINISTRATOR) {
        if (facilityId && facilityId !== requestingUserInfo.facilityId) {
          return res.json({
            success: false,
            error: 'Cannot assign roles to users in other facilities'
          }, 403);
        }
      }
    }

    // Get current user info before role change
    const currentUserInfo = await roleManager.getUserRoleInfo(userId);
    const previousRole = currentUserInfo.success ? currentUserInfo.role : 'unknown';
    const previousFacilityId = currentUserInfo.success ? currentUserInfo.facilityId : null;

    // Assign the role
    const assignmentResult = await roleManager.assignRole(userId, role, facilityId);
    
    if (!assignmentResult.success) {
      return res.json({
        success: false,
        error: assignmentResult.error
      }, 500);
    }

    log(`Role assignment successful: ${previousRole} -> ${role} for user ${userId}`);

    // Get updated user info
    const updatedUserInfo = await roleManager.getUserRoleInfo(userId);

    // Prepare response
    const response = {
      success: true,
      message: 'Role assigned successfully',
      userId,
      roleChange: {
        previous: {
          role: previousRole,
          facilityId: previousFacilityId
        },
        current: {
          role: updatedUserInfo.success ? updatedUserInfo.role : role,
          facilityId: updatedUserInfo.success ? updatedUserInfo.facilityId : facilityId
        }
      },
      userInfo: updatedUserInfo.success ? {
        role: updatedUserInfo.role,
        facilityId: updatedUserInfo.facilityId,
        permissions: updatedUserInfo.permissions,
        specialPermissions: updatedUserInfo.specialPermissions,
        canAccessMultipleFacilities: updatedUserInfo.canAccessMultipleFacilities,
        dataAccess: updatedUserInfo.dataAccess
      } : null
    };

    log(`Role assignment completed for user ${userId}`);
    return res.json(response, 200);

  } catch (err) {
    error(`Error assigning role: ${err.message}`);
    
    // Handle specific errors
    if (err.code === 404) {
      return res.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    if (err.code === 400) {
      return res.json({
        success: false,
        error: 'Invalid request data'
      }, 400);
    }

    return res.json({
      success: false,
      error: 'Internal server error during role assignment'
    }, 500);
  }
};