/**
 * Check Permissions Function
 * Appwrite Function for checking user permissions and role-based access
 */

const RoleManager = require('../../../../utils/role-manager');
const { ROLE_LABELS } = require('../../../../config/roles');

/**
 * Main function handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response with permission check results
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validate required fields
    const { userId, checks } = payload;
    
    if (!userId) {
      return res.json({
        success: false,
        error: 'Missing required field: userId'
      }, 400);
    }

    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      return res.json({
        success: false,
        error: 'Missing or invalid checks array'
      }, 400);
    }

    // Initialize role manager
    const roleManager = new RoleManager();

    log(`Checking permissions for user ${userId}`);

    // Get user role information
    const userInfo = await roleManager.getUserRoleInfo(userId);
    if (!userInfo.success) {
      return res.json({
        success: false,
        error: 'User not found or could not retrieve user information'
      }, 404);
    }

    log(`User ${userId} has role: ${userInfo.role}, facility: ${userInfo.facilityId}`);

    // Process permission checks
    const results = [];
    
    for (const check of checks) {
      try {
        const result = await processPermissionCheck(roleManager, userId, userInfo, check, log);
        results.push(result);
      } catch (checkError) {
        error(`Error processing check: ${checkError.message}`);
        results.push({
          type: check.type || 'unknown',
          identifier: check.identifier || 'unknown',
          success: false,
          hasPermission: false,
          error: checkError.message
        });
      }
    }

    // Prepare response
    const response = {
      success: true,
      userId,
      userRole: userInfo.role,
      facilityId: userInfo.facilityId,
      canAccessMultipleFacilities: userInfo.canAccessMultipleFacilities,
      checks: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.hasPermission).length,
        failed: results.filter(r => !r.hasPermission).length,
        errors: results.filter(r => !r.success).length
      }
    };

    log(`Permission check completed for user ${userId}: ${response.summary.passed}/${response.summary.total} passed`);
    return res.json(response, 200);

  } catch (err) {
    error(`Error checking permissions: ${err.message}`);
    return res.json({
      success: false,
      error: 'Internal server error during permission check'
    }, 500);
  }
};

/**
 * Process individual permission check
 * @param {RoleManager} roleManager - Role manager instance
 * @param {string} userId - User ID
 * @param {Object} userInfo - User information
 * @param {Object} check - Permission check configuration
 * @param {Function} log - Logging function
 * @returns {Object} Check result
 */
async function processPermissionCheck(roleManager, userId, userInfo, check, log) {
  const { type, identifier, resource, operation, role, roles, facilityId } = check;

  switch (type) {
    case 'role':
      // Check if user has specific role
      if (!role) {
        throw new Error('Role check requires "role" parameter');
      }
      const hasRole = await roleManager.hasRole(userId, role);
      return {
        type: 'role',
        identifier: identifier || `role:${role}`,
        success: true,
        hasPermission: hasRole,
        details: {
          requiredRole: role,
          userRole: userInfo.role,
          match: hasRole
        }
      };

    case 'any_role':
      // Check if user has any of the specified roles
      if (!roles || !Array.isArray(roles)) {
        throw new Error('Any role check requires "roles" array parameter');
      }
      const hasAnyRole = await roleManager.hasAnyRole(userId, roles);
      return {
        type: 'any_role',
        identifier: identifier || `any_role:${roles.join(',')}`,
        success: true,
        hasPermission: hasAnyRole,
        details: {
          requiredRoles: roles,
          userRole: userInfo.role,
          match: hasAnyRole
        }
      };

    case 'permission':
      // Check specific resource/operation permission
      if (!resource || !operation) {
        throw new Error('Permission check requires "resource" and "operation" parameters');
      }
      const hasPermission = await roleManager.hasPermission(userId, resource, operation);
      return {
        type: 'permission',
        identifier: identifier || `${resource}:${operation}`,
        success: true,
        hasPermission,
        details: {
          resource,
          operation,
          userRole: userInfo.role,
          userPermissions: userInfo.permissions[resource] || [],
          match: hasPermission
        }
      };

    case 'facility_access':
      // Check facility access permission
      if (!facilityId) {
        throw new Error('Facility access check requires "facilityId" parameter');
      }
      const hasFacilityAccess = await roleManager.validateFacilityAccess(userId, facilityId);
      return {
        type: 'facility_access',
        identifier: identifier || `facility:${facilityId}`,
        success: true,
        hasPermission: hasFacilityAccess,
        details: {
          requestedFacilityId: facilityId,
          userFacilityId: userInfo.facilityId,
          userRole: userInfo.role,
          canAccessMultipleFacilities: userInfo.canAccessMultipleFacilities,
          match: hasFacilityAccess
        }
      };

    case 'administrator':
      // Check if user is administrator
      const isAdmin = await roleManager.isAdministrator(userId);
      return {
        type: 'administrator',
        identifier: identifier || 'is_administrator',
        success: true,
        hasPermission: isAdmin,
        details: {
          userRole: userInfo.role,
          isAdministrator: isAdmin
        }
      };

    case 'multi_facility':
      // Check if user can access multiple facilities
      const canAccessMultiple = await roleManager.canAccessMultipleFacilities(userId);
      return {
        type: 'multi_facility',
        identifier: identifier || 'multi_facility_access',
        success: true,
        hasPermission: canAccessMultiple,
        details: {
          userRole: userInfo.role,
          canAccessMultipleFacilities: canAccessMultiple
        }
      };

    case 'special_permission':
      // Check special permission
      if (!identifier) {
        throw new Error('Special permission check requires "identifier" parameter');
      }
      const hasSpecialPermission = userInfo.specialPermissions.includes(identifier);
      return {
        type: 'special_permission',
        identifier,
        success: true,
        hasPermission: hasSpecialPermission,
        details: {
          requiredPermission: identifier,
          userSpecialPermissions: userInfo.specialPermissions,
          match: hasSpecialPermission
        }
      };

    default:
      throw new Error(`Unknown permission check type: ${type}`);
  }
}