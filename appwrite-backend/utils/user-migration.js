const { Client, Users, Teams } = require('node-appwrite');
const authConfig = require('../config/auth-config.json');

class UserMigration {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);
    this.config = authConfig.auth;
  }
  
  async createTeams() {
    console.log('Creating teams for user roles...');
    
    const teams = [
      {
        teamId: 'admin-team',
        name: 'Administrators',
        roles: ['admin']
      },
      {
        teamId: 'healthcare-workers',
        name: 'Healthcare Workers',
        roles: ['healthcare_worker']
      },
      {
        teamId: 'facility-managers',
        name: 'Facility Managers',
        roles: ['facility_manager']
      }
    ];
    
    const createdTeams = [];
    
    for (const team of teams) {
      try {
        const existingTeam = await this.teams.get(team.teamId);
        console.log(`Team ${team.name} already exists`);
        createdTeams.push(existingTeam);
      } catch (error) {
        if (error.code === 404) {
          try {
            const newTeam = await this.teams.create(
              team.teamId,
              team.name
            );
            console.log(`Created team: ${team.name}`);
            createdTeams.push(newTeam);
          } catch (createError) {
            console.error(`Failed to create team ${team.name}:`, createError);
          }
        } else {
          console.error(`Error checking team ${team.name}:`, error);
        }
      }
    }
    
    return createdTeams;
  }
  
  async migrateUser(existingUser) {
    try {
      // Create user account in Appwrite
      const appwriteUser = await this.users.create(
        existingUser.id.toString(),
        existingUser.email,
        undefined, // phone
        undefined, // password - will be set via password reset
        existingUser.fullName
      );
      
      console.log(`Created user: ${existingUser.email}`);
      
      // Add user to appropriate team
      const teamId = this.config.roles[existingUser.role]?.teamId;
      if (teamId) {
        try {
          await this.teams.createMembership(
            teamId,
            existingUser.email,
            ['member'],
            `${process.env.FRONTEND_URL}/auth/verify`
          );
          console.log(`Added ${existingUser.email} to team ${teamId}`);
        } catch (teamError) {
          console.error(`Failed to add ${existingUser.email} to team:`, teamError);
        }
      }
      
      // Set user preferences
      await this.users.updatePrefs(existingUser.id.toString(), {
        role: existingUser.role,
        facilityId: existingUser.facilityId?.toString() || null,
        migratedAt: new Date().toISOString(),
        originalId: existingUser.id.toString()
      });
      
      return {
        success: true,
        user: appwriteUser,
        originalId: existingUser.id
      };
      
    } catch (error) {
      if (error.code === 409) {
        console.log(`User ${existingUser.email} already exists, skipping...`);
        return {
          success: false,
          error: 'User already exists',
          originalId: existingUser.id
        };
      }
      
      console.error(`Failed to migrate user ${existingUser.email}:`, error);
      return {
        success: false,
        error: error.message,
        originalId: existingUser.id
      };
    }
  }
  
  async migrateUsers(existingUsers) {
    console.log(`Starting migration of ${existingUsers.length} users...`);
    
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    for (const user of existingUsers) {
      const result = await this.migrateUser(user);
      
      if (result.success) {
        results.successful++;
      } else if (result.error === 'User already exists') {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({
          user: user.email,
          error: result.error
        });
      }
    }
    
    console.log('Migration completed:', results);
    return results;
  }
  
  async generatePasswordResetTokens(users) {
    console.log('Generating password reset tokens for migrated users...');
    
    const resetTokens = [];
    
    for (const user of users) {
      try {
        const token = await this.users.createToken(
          user.id.toString(),
          6, // 6 character token
          3600 // 1 hour expiry
        );
        
        resetTokens.push({
          email: user.email,
          token: token.secret,
          userId: user.id
        });
        
        console.log(`Generated reset token for ${user.email}`);
      } catch (error) {
        console.error(`Failed to generate token for ${user.email}:`, error);
      }
    }
    
    return resetTokens;
  }
  
  async validateMigration() {
    console.log('Validating migration...');
    
    const validation = {
      teams: {},
      users: {},
      memberships: {}
    };
    
    try {
      // Check teams
      for (const [role, config] of Object.entries(this.config.roles)) {
        try {
          const team = await this.teams.get(config.teamId);
          validation.teams[config.teamId] = {
            exists: true,
            memberCount: team.total
          };
        } catch (error) {
          validation.teams[config.teamId] = {
            exists: false,
            error: error.message
          };
        }
      }
      
      // Check users
      const usersList = await this.users.list();
      validation.users.total = usersList.total;
      
      console.log('Validation completed:', validation);
      return validation;
      
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }
}

module.exports = UserMigration;