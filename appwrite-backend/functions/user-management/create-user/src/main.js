/**
 * Create User Function with Role Assignment
 * Appwrite Function for creating users with proper role and facility assignment
 */

const { Client, Users, ID } = require('node-appwrite');
const RoleManager = require('../../../../utils/role-manager');
const { ROLE_LABELS, DEFAULT_ROLE, isValidRole } = require('../../../../config/roles');

/**
 * Main function handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Response with user creation result
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Parse request payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // Validate required fields
    const { email, password, name, role, facilityId } = payload;
    
    if (!email || !password || !name) {
      return res.json({
        success: false,
        error: 'Missing required fields: email, password, name'
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({
        success: false,
        error: 'Invalid email format'
      }, 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return res.json({
        success: false,
        error: 'Password must be at least 8 characters long'
      }, 400);
    }

    // Validate role if provided
    const userRole = role || DEFAULT_ROLE;
    if (!isValidRole(userRole)) {
      return res.json({
        success: false,
        error: `Invalid role: ${userRole}`
      }, 400);
    }

    // Check if facility ID is required for the role
    if (userRole !== ROLE_LABELS.ADMINISTRATOR && !facilityId) {
      return res.json({
        success: false,
        error: 'Facility ID is required for non-administrator roles'
      }, 400);
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);
    const roleManager = new RoleManager();

    log(`Creating user with email: ${email}, role: ${userRole}`);

    // Create user in Appwrite
    const userId = ID.unique();
    const user = await users.create(
      userId,
      email,
      undefined, // phone (optional)
      password,
      name
    );

    log(`User created successfully with ID: ${user.$id}`);

    // Assign role and facility
    const roleAssignment = await roleManager.assignRole(user.$id, userRole, facilityId);
    
    if (!roleAssignment.success) {
      // If role assignment fails, we should clean up the created user
      try {
        await users.delete(user.$id);
        log(`Cleaned up user ${user.$id} due to role assignment failure`);
      } catch (cleanupError) {
        error(`Failed to cleanup user after role assignment failure: ${cleanupError.message}`);
      }

      return res.json({
        success: false,
        error: `User created but role assignment failed: ${roleAssignment.error}`
      }, 500);
    }

    log(`Role ${userRole} assigned successfully to user ${user.$id}`);

    // Get complete user info with role details
    const userInfo = await roleManager.getUserRoleInfo(user.$id);

    // Prepare response
    const response = {
      success: true,
      message: 'User created successfully with role assignment',
      user: {
        $id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        status: user.status,
        registration: user.registration,
        role: userInfo.success ? userInfo.role : userRole,
        facilityId: userInfo.success ? userInfo.facilityId : facilityId,
        permissions: userInfo.success ? userInfo.permissions : {},
        canAccessMultipleFacilities: userInfo.success ? userInfo.canAccessMultipleFacilities : false
      }
    };

    log(`User creation completed successfully for ${email}`);
    return res.json(response, 201);

  } catch (err) {
    error(`Error creating user: ${err.message}`);
    
    // Handle specific Appwrite errors
    if (err.code === 409) {
      return res.json({
        success: false,
        error: 'User with this email already exists'
      }, 409);
    }

    if (err.code === 400) {
      return res.json({
        success: false,
        error: 'Invalid user data provided'
      }, 400);
    }

    return res.json({
      success: false,
      error: 'Internal server error during user creation'
    }, 500);
  }
};