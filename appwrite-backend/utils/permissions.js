const { Client, Users, Teams } = require('node-appwrite');
const authConfig = require('../config/auth-config.json');

class Permissions {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);
    this.config = authConfig.auth;
  }
  
  async getUserRole(userId) {
    try {
      const user = await this.users.get(userId);
      const userPrefs = user.prefs || {};
      
      return {
        success: true,
        role: userPrefs.role,
        facilityId: userPrefs.facilityId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUserPermissions(userId) {
    try {
      const roleResult = await this.getUserRole(userId);
      
      if (!roleResult.success) {
        return roleResult;
      }
      
      const roleConfig = this.config.roles[roleResult.role];
      
      if (!roleConfig) {
        return {
          success: false,
          error: `Unknown role: ${roleResult.role}`
        };
      }
      
      return {
        success: true,
        role: roleResult.role,
        permissions: roleConfig.permissions,
        facilityId: roleResult.facilityId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async checkPermission(userId, requiredPermission) {
    try {
      const permissionsResult = await this.getUserPermissions(userId);
      
      if (!permissionsResult.success) {
        return permissionsResult;
      }
      
      const { permissions } = permissionsResult;
      
      // Check for wildcard permission
      if (permissions.includes('*')) {
        return {
          success: true,
          hasPermission: true,
          role: permissionsResult.role
        };
      }
      
      // Check specific permission
      const hasPermission = permissions.some(p => this.matchPermission(p, requiredPermission));
      
      return {
        success: true,
        hasPermission,
        role: permissionsResult.role
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async checkPermissions(userId, requiredPermissions) {
    try {
      const permissionsResult = await this.getUserPermissions(userId);
      
      if (!permissionsResult.success) {
        return permissionsResult;
      }
      
      const { permissions } = permissionsResult;
      
      // Check for wildcard permission
      if (permissions.includes('*')) {
        return {
          success: true,
          hasAllPermissions: true,
          role: permissionsResult.role
        };
      }
      
      // Check each required permission
      const results = {};
      let hasAllPermissions = true;
      
      for (const permission of requiredPermissions) {
        const hasPermission = permissions.some(p => this.matchPermission(p, permission));
        results[permission] = hasPermission;
        
        if (!hasPermission) {
          hasAllPermissions = false;
        }
      }
      
      return {
        success: true,
        hasAllPermissions,
        permissions: results,
        role: permissionsResult.role
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  matchPermission(userPermission, requiredPermission) {
    // Handle wildcard permissions
    if (userPermission.endsWith('*')) {
      const prefix = userPermission.slice(0, -1);
      return requiredPermission.startsWith(prefix);
    }
    
    // Handle exact matches
    return userPermission === requiredPermission;
  }
  
  async getTeamMembers(teamId) {
    try {
      const memberships = await this.teams.listMemberships(teamId);
      
      return {
        success: true,
        members: memberships.memberships.map(member => ({
          userId: member.userId,
          email: member.userEmail,
          name: member.userName,
          roles: member.roles,
          joined: member.joined
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async addUserToTeam(userId, teamId, roles = ['member']) {
    try {
      const user = await this.users.get(userId);
      
      const membership = await this.teams.createMembership(
        teamId,
        user.email,
        roles,
        `${process.env.FRONTEND_URL}/auth/verify`
      );
      
      return {
        success: true,
        membership: {
          id: membership.$id,
          teamId: membership.teamId,
          userId: membership.userId,
          roles: membership.roles
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async removeUserFromTeam(userId, teamId) {
    try {
      // Get team memberships
      const memberships = await this.teams.listMemberships(teamId);
      
      // Find membership for this user
      const membership = memberships.memberships.find(
        m => m.userId === userId
      );
      
      if (!membership) {
        return {
          success: false,
          error: 'User is not a member of this team'
        };
      }
      
      await this.teams.deleteMembership(teamId, membership.$id);
      
      return {
        success: true,
        message: 'User removed from team'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUserTeams(userId) {
    try {
      const user = await this.users.get(userId);
      
      // Get all teams and check memberships
      const teams = [];
      
      for (const [role, config] of Object.entries(this.config.roles)) {
        try {
          const memberships = await this.teams.listMemberships(config.teamId);
          const membership = memberships.memberships.find(
            m => m.userId === userId
          );
          
          if (membership) {
            teams.push({
              teamId: config.teamId,
              teamName: config.description,
              role: role,
              permissions: config.permissions,
              joined: membership.joined
            });
          }
        } catch (error) {
          // Team might not exist, skip
          continue;
        }
      }
      
      return {
        success: true,
        teams
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async validateFacilityAccess(userId, facilityId) {
    try {
      const roleResult = await this.getUserRole(userId);
      
      if (!roleResult.success) {
        return roleResult;
      }
      
      const { role, facilityId: userFacilityId } = roleResult;
      
      // Admin has access to all facilities
      if (role === 'admin') {
        return {
          success: true,
          hasAccess: true,
          role: 'admin'
        };
      }
      
      // Check if user belongs to the facility
      const hasAccess = userFacilityId === facilityId.toString();
      
      return {
        success: true,
        hasAccess,
        role,
        userFacilityId,
        requestedFacilityId: facilityId.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getAccessibleFacilities(userId) {
    try {
      const roleResult = await this.getUserRole(userId);
      
      if (!roleResult.success) {
        return roleResult;
      }
      
      const { role, facilityId } = roleResult;
      
      if (role === 'admin') {
        // Admin can access all facilities
        return {
          success: true,
          facilities: ['*'], // All facilities
          role: 'admin'
        };
      }
      
      // Other roles can only access their assigned facility
      return {
        success: true,
        facilities: [facilityId],
        role
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = Permissions;