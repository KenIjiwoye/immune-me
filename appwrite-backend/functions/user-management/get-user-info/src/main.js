/**
 * Get User Info Function
 * Appwrite Function for retrieving comprehensive user information including roles and permissions
 */

const { Client, Users } = require('node-appwrite');
const RoleManager = require('../../../../utils/role-manager');

/**
 * Main function handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response with user information
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Get user ID from payload or query parameters
    const userId = payload.userId || req.query.userId;
    const requestingUserId = payload.requestingUserId || req.query.requestingUserId;
    const includePermissions = payload.includePermissions !== false; // default true
    const includeSensitiveData = payload.includeSensitiveData === true; // default false

    if (!userId) {
      return res.json({
        success: false,
        error: 'Missing required parameter: userId'
      }, 400);
    }

    // Initialize services
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const roleManager = new RoleManager();

    log(`Retrieving user info for ${userId}`);

    // Verify requesting user permissions if provided
    if (requestingUserId) {
      const canViewUsers = await roleManager.hasPermission(requestingUserId, 'users', 'read');
      if (!canViewUsers) {
        // Users can only view their own information
        if (requestingUserId !== userId) {
          return res.json({
            success: false,
            error: 'Insufficient permissions to view user information'
          }, 403);
        }
      }

      // Check if requesting user can view sensitive data
      if (includeSensitiveData && requestingUserId !== userId) {
        const isAdmin = await roleManager.isAdministrator(requestingUserId);
        if (!isAdmin) {
          return res.json({
            success: false,
            error: 'Insufficient permissions to view sensitive user data'
          }, 403);
        }
      }
    }

    // Get user from Appwrite
    let user;
    try {
      user = await users.get(userId);
    } catch (err) {
      if (err.code === 404) {
        return res.json({
          success: false,
          error: 'User not found'
        }, 404);
      }
      throw err;
    }

    // Get role information
    const roleInfo = await roleManager.getUserRoleInfo(userId);

    // Prepare basic user information
    const userInfo = {
      $id: user.$id,
      email: user.email,
      name: user.name,
      emailVerification: user.emailVerification,
      phoneVerification: user.phoneVerification,
      status: user.status,
      registration: user.registration,
      passwordUpdate: user.passwordUpdate,
      labels: user.labels || []
    };

    // Add phone if sensitive data is requested
    if (includeSensitiveData && user.phone) {
      userInfo.phone = user.phone;
    }

    // Add preferences if sensitive data is requested
    if (includeSensitiveData && user.prefs) {
      userInfo.prefs = user.prefs;
    }

    // Add role information if available
    if (roleInfo.success) {
      userInfo.role = {
        name: roleInfo.role,
        facilityId: roleInfo.facilityId,
        dataAccess: roleInfo.dataAccess,
        canAccessMultipleFacilities: roleInfo.canAccessMultipleFacilities
      };

      // Add detailed permissions if requested
      if (includePermissions) {
        userInfo.permissions = {
          resources: roleInfo.permissions,
          special: roleInfo.specialPermissions
        };
      }
    } else {
      userInfo.role = {
        error: roleInfo.error,
        name: null,
        facilityId: null
      };
    }

    // Get additional user statistics if sensitive data is requested
    if (includeSensitiveData) {
      try {
        // Get user sessions (last 10)
        const sessions = await users.listSessions(userId);
        userInfo.sessions = {
          total: sessions.total,
          recent: sessions.sessions.slice(0, 10).map(session => ({
            $id: session.$id,
            provider: session.provider,
            ip: session.ip,
            osName: session.osName,
            osVersion: session.osVersion,
            clientName: session.clientName,
            clientVersion: session.clientVersion,
            current: session.current,
            $createdAt: session.$createdAt
          }))
        };

        // Get user logs (last 10)
        const logs = await users.listLogs(userId);
        userInfo.activityLogs = {
          total: logs.total,
          recent: logs.logs.slice(0, 10).map(logEntry => ({
            event: logEntry.event,
            ip: logEntry.ip,
            time: logEntry.time,
            osName: logEntry.osName,
            osVersion: logEntry.osVersion,
            clientName: logEntry.clientName,
            clientVersion: logEntry.clientVersion
          }))
        };
      } catch (logError) {
        log(`Could not retrieve user sessions/logs: ${logError.message}`);
        // Don't fail the request if we can't get logs
      }
    }

    // Prepare response
    const response = {
      success: true,
      user: userInfo,
      metadata: {
        retrievedAt: new Date().toISOString(),
        includePermissions,
        includeSensitiveData,
        roleInfoAvailable: roleInfo.success
      }
    };

    log(`User info retrieved successfully for ${userId}`);
    return res.json(response, 200);

  } catch (err) {
    error(`Error retrieving user info: ${err.message}`);
    
    // Handle specific errors
    if (err.code === 404) {
      return res.json({
        success: false,
        error: 'User not found'
      }, 404);
    }

    if (err.code === 401) {
      return res.json({
        success: false,
        error: 'Unauthorized access'
      }, 401);
    }

    return res.json({
      success: false,
      error: 'Internal server error while retrieving user information'
    }, 500);
  }
};