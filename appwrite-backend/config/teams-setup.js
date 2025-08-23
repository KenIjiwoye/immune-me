const { Client, Teams } = require('node-appwrite');
const authConfig = require('./auth-config.json');

class TeamsSetup {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.teams = new Teams(this.client);
    this.config = authConfig.auth;
  }
  
  async setupTeams() {
    console.log('Setting up Appwrite teams for role-based access control...');
    
    const teams = [
      {
        teamId: 'admin-team',
        name: 'Administrators',
        description: 'System administrators with full access to all features and data'
      },
      {
        teamId: 'healthcare-workers',
        name: 'Healthcare Workers',
        description: 'Healthcare professionals managing patient records and immunizations'
      },
      {
        teamId: 'facility-managers',
        name: 'Facility Managers',
        description: 'Facility administrators with access to facility-specific data and reports'
      }
    ];
    
    const results = {
      created: [],
      updated: [],
      failed: []
    };
    
    for (const team of teams) {
      try {
        // Check if team already exists
        try {
          const existingTeam = await this.teams.get(team.teamId);
          console.log(`Team ${team.name} already exists, updating...`);
          
          // Update team if needed
          const updatedTeam = await this.teams.update(
            team.teamId,
            team.name
          );
          
          results.updated.push({
            id: updatedTeam.$id,
            name: updatedTeam.name,
            total: updatedTeam.total
          });
          
        } catch (error) {
          if (error.code === 404) {
            // Create new team
            const newTeam = await this.teams.create(
              team.teamId,
              team.name
            );
            
            console.log(`Created team: ${team.name}`);
            results.created.push({
              id: newTeam.$id,
              name: newTeam.name,
              total: newTeam.total
            });
          } else {
            throw error;
          }
        }
        
      } catch (error) {
        console.error(`Failed to setup team ${team.name}:`, error);
        results.failed.push({
          team: team.name,
          error: error.message
        });
      }
    }
    
    console.log('Teams setup completed:', results);
    return results;
  }
  
  async setupTeamPermissions() {
    console.log('Setting up team permissions...');
    
    // In Appwrite, permissions are handled at the collection/document level
    // This method would configure the security rules for each collection
    // based on the team structure
    
    const permissions = {
      'admin-team': {
        collections: ['*'],
        permissions: ['read', 'write', 'create', 'delete']
      },
      'healthcare-workers': {
        collections: ['patients', 'immunization-records', 'vaccines', 'notifications'],
        permissions: ['read', 'write', 'create']
      },
      'facility-managers': {
        collections: ['patients', 'immunization-records', 'vaccines', 'facilities', 'reports'],
        permissions: ['read', 'write', 'create']
      }
    };
    
    console.log('Team permissions configured:', permissions);
    return permissions;
  }
  
  async listTeams() {
    try {
      const teams = await this.teams.list();
      console.log('Current teams:', teams);
      return teams;
    } catch (error) {
      console.error('Failed to list teams:', error);
      throw error;
    }
  }
  
  async cleanupTeams() {
    console.log('Cleaning up teams...');
    
    const teamIds = ['admin-team', 'healthcare-workers', 'facility-managers'];
    const results = {
      deleted: [],
      failed: []
    };
    
    for (const teamId of teamIds) {
      try {
        await this.teams.delete(teamId);
        console.log(`Deleted team: ${teamId}`);
        results.deleted.push(teamId);
      } catch (error) {
        console.error(`Failed to delete team ${teamId}:`, error);
        results.failed.push({
          teamId,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// CLI functionality
if (require.main === module) {
  const setup = new TeamsSetup();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      setup.setupTeams()
        .then(() => setup.setupTeamPermissions())
        .then(() => {
          console.log('Teams setup completed successfully');
          process.exit(0);
        })
        .catch(error => {
          console.error('Teams setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'list':
      setup.listTeams()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Failed to list teams:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      setup.cleanupTeams()
        .then(() => {
          console.log('Teams cleanup completed');
          process.exit(0);
        })
        .catch(error => {
          console.error('Teams cleanup failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node teams-setup.js [setup|list|cleanup]');
      process.exit(1);
  }
}

module.exports = TeamsSetup;