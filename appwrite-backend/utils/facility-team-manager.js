/**
 * FacilityTeamManager - Utility class for managing facility-based teams and memberships
 * Based on BE-AW-09 ticket requirements
 * 
 * This class provides comprehensive team management functionality including:
 * - Team creation and management
 * - User assignment and removal
 * - Multi-facility user support
 * - Permission-based access control
 * - Efficient caching and error handling
 */

const { Client, Teams, Users } = require('node-appwrite');
const {
  TEAM_NAMING,
  TEAM_ROLES,
  TEAM_CONFIG,
  generateFacilityTeamName,
  parseFacilityIdFromTeamName,
  isFacilityTeam,
  isGlobalAdminTeam,
  getTeamRoleFromLabel,
  hasHigherOrEqualRole,
  validateTeamConfig
} = require('../config/team-structure');

const facilityTeamMapping = require('../config/facility-team-mapping.json');
const teamPermissions = require('../config/team-permissions.json');

class FacilityTeamManager {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.teams = new Teams(this.client);
    this.users = new Users(this.client);
    
    // Initialize caches
    this.teamCache = new Map();
    this.membershipCache = new Map();
    this.permissionCache = new Map();
    
    // Cache configuration
    this.cacheTimeout = options.cacheTimeout || TEAM_CONFIG.CACHE_TIMEOUT;
    this.maxCacheSize = options.maxCacheSize || 1000;
    
    // Configuration
    this.config = {
      ...TEAM_CONFIG,
      ...options.config
    };
  }

  /**
   * Create a new facility team
   * @param {string} facilityId - Facility ID
   * @param {Object} options - Team creation options
   * @returns {Promise<Object>} Operation result with team information
   */
  async createFacilityTeam(facilityId, options = {}) {
    try {
      if (!facilityId || typeof facilityId !== 'string') {
        throw new Error('Valid facility ID is required');
      }

      const teamName = generateFacilityTeamName(facilityId);
      
      // Check if team already exists
      const existingTeam = await this._getTeamByName(teamName);
      if (existingTeam) {
        return {
          success: true,
          team: existingTeam,
          message: 'Team already exists',
          created: false
        };
      }

      // Prepare team configuration
      const teamConfig = {
        teamId: options.teamId || `team_${facilityId}_${Date.now()}`,
        name: teamName,
        roles: Object.values(TEAM_ROLES),
        ...facilityTeamMapping.facilityTeamDefaults.teamSettings,
        ...options
      };

      // Validate configuration
      const validation = validateTeamConfig(teamConfig);
      if (!validation.valid) {
        throw new Error(`Invalid team configuration: ${validation.errors.join(', ')}`);
      }

      // Create the team
      const team = await this.teams.create(
        teamConfig.teamId,
        teamConfig.name,
        teamConfig.roles
      );

      // Cache the team
      this._cacheTeam(team);

      // Log team creation
      console.log(`Created facility team: ${teamName} for facility: ${facilityId}`);

      return {
        success: true,
        team,
        facilityId,
        message: 'Facility team created successfully',
        created: true
      };

    } catch (error) {
      console.error('Error creating facility team:', error);
      return {
        success: false,
        error: error.message,
        facilityId
      };
    }
  }

  /**
   * Get or create facility team
   * @param {string} facilityId - Facility ID
   * @returns {Promise<Object>} Team object or null
   */
  async getOrCreateFacilityTeam(facilityId) {
    try {
      const teamName = generateFacilityTeamName(facilityId);
      
      // Try to get existing team
      let team = await this._getTeamByName(teamName);
      
      // Create team if it doesn't exist and auto-creation is enabled
      if (!team && this.config.CREATION.AUTO_CREATE_FOR_FACILITIES) {
        const result = await this.createFacilityTeam(facilityId);
        if (result.success) {
          team = result.team;
        }
      }

      return team;
    } catch (error) {
      console.error('Error getting or creating facility team:', error);
      return null;
    }
  }

  /**
   * Assign user to facility team
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID
   * @param {string} teamRole - Team role (optional, will be determined from user role)
   * @returns {Promise<Object>} Operation result
   */
  async assignUserToTeam(userId, facilityId, teamRole = null) {
    try {
      if (!userId || !facilityId) {
        throw new Error('User ID and facility ID are required');
      }

      // Get or create facility team
      const team = await this.getOrCreateFacilityTeam(facilityId);
      if (!team) {
        throw new Error(`Could not get or create team for facility: ${facilityId}`);
      }

      // Get user information
      const user = await this.users.get(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Determine team role if not provided
      if (!teamRole) {
        const userRoleLabel = this._extractRoleFromLabels(user.labels || []);
        teamRole = getTeamRoleFromLabel(userRoleLabel);
      }

      // Validate team role
      if (!Object.values(TEAM_ROLES).includes(teamRole)) {
        throw new Error(`Invalid team role: ${teamRole}`);
      }

      // Check if user is already a member
      const existingMembership = await this._getUserTeamMembership(userId, team.$id);
      if (existingMembership) {
        // Update role if different
        if (existingMembership.roles.includes(teamRole)) {
          return {
            success: true,
            message: 'User already has the specified role in the team',
            userId,
            teamId: team.$id,
            teamRole,
            updated: false
          };
        } else {
          return await this.updateUserTeamRole(userId, team.$id, teamRole);
        }
      }

      // Add user to team
      const membership = await this.teams.createMembership(
        team.$id,
        [teamRole],
        userId
      );

      // Clear relevant caches
      this._clearUserMembershipCache(userId);
      this._clearTeamCache(team.$id);

      // Log membership creation
      console.log(`Added user ${userId} to team ${team.name} with role ${teamRole}`);

      return {
        success: true,
        message: 'User assigned to team successfully',
        userId,
        teamId: team.$id,
        teamName: team.name,
        teamRole,
        membership,
        updated: false
      };

    } catch (error) {
      console.error('Error assigning user to team:', error);
      return {
        success: false,
        error: error.message,
        userId,
        facilityId
      };
    }
  }

  /**
   * Remove user from facility team
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID
   * @returns {Promise<Object>} Operation result
   */
  async removeUserFromTeam(userId, facilityId) {
    try {
      if (!userId || !facilityId) {
        throw new Error('User ID and facility ID are required');
      }

      const teamName = generateFacilityTeamName(facilityId);
      const team = await this._getTeamByName(teamName);
      
      if (!team) {
        return {
          success: true,
          message: 'Team does not exist, user was not a member',
          userId,
          facilityId
        };
      }

      // Get user's membership
      const membership = await this._getUserTeamMembership(userId, team.$id);
      if (!membership) {
        return {
          success: true,
          message: 'User was not a member of the team',
          userId,
          teamId: team.$id
        };
      }

      // Remove user from team
      await this.teams.deleteMembership(team.$id, membership.$id);

      // Clear relevant caches
      this._clearUserMembershipCache(userId);
      this._clearTeamCache(team.$id);

      // Log membership removal
      console.log(`Removed user ${userId} from team ${team.name}`);

      return {
        success: true,
        message: 'User removed from team successfully',
        userId,
        teamId: team.$id,
        teamName: team.name
      };

    } catch (error) {
      console.error('Error removing user from team:', error);
      return {
        success: false,
        error: error.message,
        userId,
        facilityId
      };
    }
  }

  /**
   * Update user's role in a team
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @param {string} newRole - New team role
   * @returns {Promise<Object>} Operation result
   */
  async updateUserTeamRole(userId, teamId, newRole) {
    try {
      if (!userId || !teamId || !newRole) {
        throw new Error('User ID, team ID, and new role are required');
      }

      // Validate new role
      if (!Object.values(TEAM_ROLES).includes(newRole)) {
        throw new Error(`Invalid team role: ${newRole}`);
      }

      // Get user's current membership
      const membership = await this._getUserTeamMembership(userId, teamId);
      if (!membership) {
        throw new Error('User is not a member of the team');
      }

      // Update membership roles
      const updatedMembership = await this.teams.updateMembershipRoles(
        teamId,
        membership.$id,
        [newRole]
      );

      // Clear relevant caches
      this._clearUserMembershipCache(userId);
      this._clearTeamCache(teamId);

      // Log role update
      console.log(`Updated user ${userId} role to ${newRole} in team ${teamId}`);

      return {
        success: true,
        message: 'User role updated successfully',
        userId,
        teamId,
        newRole,
        membership: updatedMembership
      };

    } catch (error) {
      console.error('Error updating user team role:', error);
      return {
        success: false,
        error: error.message,
        userId,
        teamId
      };
    }
  }

  /**
   * Get all teams for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of team memberships
   */
  async getUserTeams(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Check cache first
      const cached = this._getUserMembershipsFromCache(userId);
      if (cached) {
        return cached;
      }

      // Get user's team memberships
      const memberships = await this.teams.listMemberships(userId);
      
      // Enhance with team information
      const userTeams = [];
      for (const membership of memberships.memberships) {
        const team = await this._getTeamById(membership.teamId);
        if (team) {
          userTeams.push({
            ...membership,
            team,
            facilityId: parseFacilityIdFromTeamName(team.name),
            isFacilityTeam: isFacilityTeam(team.name),
            isGlobalAdminTeam: isGlobalAdminTeam(team.name)
          });
        }
      }

      // Cache the result
      this._cacheUserMemberships(userId, userTeams);

      return userTeams;

    } catch (error) {
      console.error('Error getting user teams:', error);
      return [];
    }
  }

  /**
   * Get all members of a facility team
   * @param {string} facilityId - Facility ID
   * @returns {Promise<Array>} Array of team members
   */
  async getFacilityTeamMembers(facilityId) {
    try {
      if (!facilityId) {
        throw new Error('Facility ID is required');
      }

      const teamName = generateFacilityTeamName(facilityId);
      const team = await this._getTeamByName(teamName);
      
      if (!team) {
        return [];
      }

      // Get team memberships
      const memberships = await this.teams.listMemberships(team.$id);
      
      // Enhance with user information
      const members = [];
      for (const membership of memberships.memberships) {
        try {
          const user = await this.users.get(membership.userId);
          members.push({
            ...membership,
            user,
            primaryRole: membership.roles[0] || TEAM_ROLES.MEMBER
          });
        } catch (error) {
          console.warn(`Could not get user info for member ${membership.userId}:`, error.message);
        }
      }

      return members;

    } catch (error) {
      console.error('Error getting facility team members:', error);
      return [];
    }
  }

  /**
   * Check if user belongs to facility team
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID
   * @returns {Promise<boolean>} True if user is team member
   */
  async isUserInFacilityTeam(userId, facilityId) {
    try {
      const userTeams = await this.getUserTeams(userId);
      return userTeams.some(membership => membership.facilityId === facilityId);
    } catch (error) {
      console.error('Error checking user facility team membership:', error);
      return false;
    }
  }

  /**
   * Get user's role in facility team
   * @param {string} userId - User ID
   * @param {string} facilityId - Facility ID
   * @returns {Promise<string|null>} Team role or null if not a member
   */
  async getUserRoleInFacilityTeam(userId, facilityId) {
    try {
      const userTeams = await this.getUserTeams(userId);
      const facilityMembership = userTeams.find(membership => membership.facilityId === facilityId);
      
      if (!facilityMembership) {
        return null;
      }

      return facilityMembership.roles[0] || TEAM_ROLES.MEMBER;
    } catch (error) {
      console.error('Error getting user role in facility team:', error);
      return null;
    }
  }

  /**
   * Handle multi-facility user assignment
   * @param {string} userId - User ID
   * @param {Array<string>} facilityIds - Array of facility IDs
   * @param {string} defaultRole - Default team role
   * @returns {Promise<Object>} Operation result
   */
  async assignUserToMultipleFacilities(userId, facilityIds, defaultRole = TEAM_ROLES.MEMBER) {
    try {
      if (!userId || !Array.isArray(facilityIds) || facilityIds.length === 0) {
        throw new Error('User ID and facility IDs array are required');
      }

      if (facilityIds.length > this.config.MAX_TEAMS_PER_USER) {
        throw new Error(`User cannot belong to more than ${this.config.MAX_TEAMS_PER_USER} teams`);
      }

      const results = [];
      const errors = [];

      for (const facilityId of facilityIds) {
        try {
          const result = await this.assignUserToTeam(userId, facilityId, defaultRole);
          results.push({
            facilityId,
            ...result
          });
        } catch (error) {
          errors.push({
            facilityId,
            error: error.message
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        userId,
        facilitiesProcessed: facilityIds.length,
        successCount: results.filter(r => r.success).length,
        errorCount: errors.length
      };

    } catch (error) {
      console.error('Error assigning user to multiple facilities:', error);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  // Private helper methods

  /**
   * Get team by name
   * @private
   */
  async _getTeamByName(teamName) {
    try {
      // Check cache first
      const cached = this._getTeamFromCache(teamName);
      if (cached) {
        return cached;
      }

      // List teams and find by name
      const teams = await this.teams.list();
      const team = teams.teams.find(t => t.name === teamName);
      
      if (team) {
        this._cacheTeam(team);
      }

      return team || null;
    } catch (error) {
      console.error('Error getting team by name:', error);
      return null;
    }
  }

  /**
   * Get team by ID
   * @private
   */
  async _getTeamById(teamId) {
    try {
      // Check cache first
      const cached = this._getTeamFromCache(teamId);
      if (cached) {
        return cached;
      }

      const team = await this.teams.get(teamId);
      this._cacheTeam(team);
      
      return team;
    } catch (error) {
      console.error('Error getting team by ID:', error);
      return null;
    }
  }

  /**
   * Get user's membership in a specific team
   * @private
   */
  async _getUserTeamMembership(userId, teamId) {
    try {
      const memberships = await this.teams.listMemberships(teamId);
      return memberships.memberships.find(m => m.userId === userId) || null;
    } catch (error) {
      console.error('Error getting user team membership:', error);
      return null;
    }
  }

  /**
   * Extract role from user labels
   * @private
   */
  _extractRoleFromLabels(labels) {
    const roleLabels = ['admin', 'facility_manager', 'healthcare_worker', 'data_entry_clerk'];
    const userRole = labels.find(label => roleLabels.includes(label));
    return userRole || 'healthcare_worker'; // Default role
  }

  // Cache management methods

  /**
   * Cache team object
   * @private
   */
  _cacheTeam(team) {
    const key = team.name || team.$id;
    this.teamCache.set(key, {
      team,
      timestamp: Date.now()
    });
    
    // Also cache by ID if we have name as key
    if (team.name && team.$id !== team.name) {
      this.teamCache.set(team.$id, {
        team,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get team from cache
   * @private
   */
  _getTeamFromCache(key) {
    const cached = this.teamCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.teamCache.delete(key);
      return null;
    }

    return cached.team;
  }

  /**
   * Cache user memberships
   * @private
   */
  _cacheUserMemberships(userId, memberships) {
    this.membershipCache.set(userId, {
      memberships,
      timestamp: Date.now()
    });
  }

  /**
   * Get user memberships from cache
   * @private
   */
  _getUserMembershipsFromCache(userId) {
    const cached = this.membershipCache.get(userId);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.membershipCache.delete(userId);
      return null;
    }

    return cached.memberships;
  }

  /**
   * Clear team cache
   * @private
   */
  _clearTeamCache(teamId) {
    this.teamCache.delete(teamId);
  }

  /**
   * Clear user membership cache
   * @private
   */
  _clearUserMembershipCache(userId) {
    this.membershipCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.teamCache.clear();
    this.membershipCache.clear();
    this.permissionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      teamCache: {
        size: this.teamCache.size,
        maxSize: this.maxCacheSize
      },
      membershipCache: {
        size: this.membershipCache.size,
        maxSize: this.maxCacheSize
      },
      permissionCache: {
        size: this.permissionCache.size,
        maxSize: this.maxCacheSize
      }
    };
  }
}

module.exports = FacilityTeamManager;