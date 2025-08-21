# INT-AW-01: Migrate Existing Data from PostgreSQL to Appwrite

## Title
Migrate Existing Data from PostgreSQL to Appwrite

## Priority
High

## Estimated Time
12-16 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system migrated

## Description
Migrate all existing data from the PostgreSQL database to Appwrite collections, ensuring data integrity, maintaining relationships, and preserving historical records. This includes creating migration scripts, data transformation utilities, validation procedures, and rollback mechanisms to ensure a safe and complete data migration.

The migration will handle user accounts, patient records, immunization data, facilities, vaccines, and all related metadata while maintaining referential integrity and audit trails.

## Acceptance Criteria
- [ ] Data migration scripts created for all entities
- [ ] User accounts migrated with proper role assignments
- [ ] Patient records migrated with complete history
- [ ] Immunization records migrated with relationships intact
- [ ] Facility and vaccine data migrated successfully
- [ ] Data validation and integrity checks passed
- [ ] Migration rollback procedures tested
- [ ] Performance optimization for large datasets
- [ ] Migration monitoring and logging implemented
- [ ] Data consistency verification completed

## Technical Notes

### Migration Architecture

#### Migration Framework
```javascript
// appwrite-backend/migrations/migration-framework.js
const { Client, Databases, Users, Teams } = require('node-appwrite');
const { Pool } = require('pg');

class MigrationFramework {
  constructor() {
    // Appwrite client
    this.appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    this.databases = new Databases(this.appwriteClient);
    this.users = new Users(this.appwriteClient);
    this.teams = new Teams(this.appwriteClient);

    // PostgreSQL client
    this.pgPool = new Pool({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
    });

    this.migrationLog = [];
    this.errors = [];
    this.stats = {
      users: { total: 0, migrated: 0, errors: 0 },
      patients: { total: 0, migrated: 0, errors: 0 },
      immunizations: { total: 0, migrated: 0, errors: 0 },
      facilities: { total: 0, migrated: 0, errors: 0 },
      vaccines: { total: 0, migrated: 0, errors: 0 },
      notifications: { total: 0, migrated: 0, errors: 0 }
    };
  }

  async runMigration() {
    try {
      console.log('Starting data migration from PostgreSQL to Appwrite...');
      this.logMigration('Migration started', 'info');

      // Migration order is important due to foreign key relationships
      await this.migrateFacilities();
      await this.migrateVaccines();
      await this.migrateUsers();
      await this.migratePatients();
      await this.migrateImmunizationRecords();
      await this.migrateNotifications();

      // Verify data integrity
      await this.verifyDataIntegrity();

      console.log('Migration completed successfully!');
      this.logMigration('Migration completed', 'success');
      
      return {
        success: true,
        stats: this.stats,
        log: this.migrationLog,
        errors: this.errors
      };

    } catch (error) {
      console.error('Migration failed:', error);
      this.logMigration(`Migration failed: ${error.message}`, 'error');
      
      return {
        success: false,
        error: error.message,
        stats: this.stats,
        log: this.migrationLog,
        errors: this.errors
      };
    } finally {
      await this.pgPool.end();
    }
  }

  async migrateFacilities() {
    console.log('Migrating facilities...');
    this.logMigration('Starting facilities migration', 'info');

    try {
      const result = await this.pgPool.query('SELECT * FROM facilities ORDER BY id');
      this.stats.facilities.total = result.rows.length;

      for (const facility of result.rows) {
        try {
          const appwriteFacility = {
            name: facility.name,
            type: facility.type,
            district: facility.district,
            address: facility.address || '',
            contactPhone: facility.contact_phone || '',
            contactEmail: facility.contact_email || '',
            isActive: facility.is_active !== false
          };

          await this.databases.createDocument(
            'immune-me-db',
            'facilities',
            facility.id.toString(),
            appwriteFacility
          );

          this.stats.facilities.migrated++;
          
          if (this.stats.facilities.migrated % 10 === 0) {
            console.log(`Migrated ${this.stats.facilities.migrated}/${this.stats.facilities.total} facilities`);
          }

        } catch (error) {
          this.stats.facilities.errors++;
          this.errors.push({
            entity: 'facility',
            id: facility.id,
            error: error.message
          });
          console.error(`Failed to migrate facility ${facility.id}:`, error.message);
        }
      }

      this.logMigration(`Facilities migration completed: ${this.stats.facilities.migrated}/${this.stats.facilities.total}`, 'success');

    } catch (error) {
      this.logMigration(`Facilities migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateVaccines() {
    console.log('Migrating vaccines...');
    this.logMigration('Starting vaccines migration', 'info');

    try {
      const result = await this.pgPool.query('SELECT * FROM vaccines ORDER BY id');
      this.stats.vaccines.total = result.rows.length;

      for (const vaccine of result.rows) {
        try {
          const appwriteVaccine = {
            name: vaccine.name,
            description: vaccine.description || '',
            manufacturer: vaccine.manufacturer || '',
            dosageForm: vaccine.dosage_form || '',
            routeOfAdministration: vaccine.route_of_administration || '',
            storageRequirements: vaccine.storage_requirements || '',
            isActive: vaccine.is_active !== false
          };

          await this.databases.createDocument(
            'immune-me-db',
            'vaccines',
            vaccine.id.toString(),
            appwriteVaccine
          );

          this.stats.vaccines.migrated++;

        } catch (error) {
          this.stats.vaccines.errors++;
          this.errors.push({
            entity: 'vaccine',
            id: vaccine.id,
            error: error.message
          });
          console.error(`Failed to migrate vaccine ${vaccine.id}:`, error.message);
        }
      }

      this.logMigration(`Vaccines migration completed: ${this.stats.vaccines.migrated}/${this.stats.vaccines.total}`, 'success');

    } catch (error) {
      this.logMigration(`Vaccines migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateUsers() {
    console.log('Migrating users...');
    this.logMigration('Starting users migration', 'info');

    try {
      const result = await this.pgPool.query(`
        SELECT u.*, f.name as facility_name 
        FROM users u 
        LEFT JOIN facilities f ON u.facility_id = f.id 
        ORDER BY u.id
      `);
      this.stats.users.total = result.rows.length;

      // Create teams first if they don't exist
      await this.ensureTeamsExist();

      for (const user of result.rows) {
        try {
          // Create user account in Appwrite
          const appwriteUser = await this.users.create(
            user.id.toString(),
            user.email,
            user.phone || undefined,
            undefined, // No password - users will need to reset
            user.full_name
          );

          // Set user preferences
          await this.users.updatePrefs(user.id.toString(), {
            role: user.role,
            facilityId: user.facility_id?.toString(),
            facilityName: user.facility_name,
            migratedAt: new Date().toISOString(),
            originalId: user.id
          });

          // Add user to appropriate team
          const teamId = this.getRoleTeamId(user.role);
          if (teamId) {
            try {
              await this.teams.createMembership(
                teamId,
                user.email,
                ['member'],
                `${process.env.FRONTEND_URL}/auth/verify`
              );
            } catch (teamError) {
              console.warn(`Failed to add user ${user.id} to team ${teamId}:`, teamError.message);
            }
          }

          this.stats.users.migrated++;

          if (this.stats.users.migrated % 10 === 0) {
            console.log(`Migrated ${this.stats.users.migrated}/${this.stats.users.total} users`);
          }

        } catch (error) {
          this.stats.users.errors++;
          this.errors.push({
            entity: 'user',
            id: user.id,
            error: error.message
          });
          console.error(`Failed to migrate user ${user.id}:`, error.message);
        }
      }

      this.logMigration(`Users migration completed: ${this.stats.users.migrated}/${this.stats.users.total}`, 'success');

    } catch (error) {
      this.logMigration(`Users migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migratePatients() {
    console.log('Migrating patients...');
    this.logMigration('Starting patients migration', 'info');

    try {
      const result = await this.pgPool.query('SELECT * FROM patients ORDER BY id');
      this.stats.patients.total = result.rows.length;

      // Process in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < result.rows.length; i += batchSize) {
        const batch = result.rows.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (patient) => {
          try {
            const appwritePatient = {
              fullName: patient.full_name,
              sex: patient.sex,
              dateOfBirth: patient.date_of_birth.toISOString(),
              motherName: patient.mother_name || '',
              fatherName: patient.father_name || '',
              district: patient.district,
              townVillage: patient.town_village || '',
              address: patient.address || '',
              contactPhone: patient.contact_phone || '',
              healthWorkerId: patient.health_worker_id?.toString() || '',
              healthWorkerName: patient.health_worker_name || '',
              healthWorkerPhone: patient.health_worker_phone || '',
              healthWorkerAddress: patient.health_worker_address || '',
              facilityId: patient.facility_id.toString()
            };

            await this.databases.createDocument(
              'immune-me-db',
              'patients',
              patient.id.toString(),
              appwritePatient
            );

            this.stats.patients.migrated++;

          } catch (error) {
            this.stats.patients.errors++;
            this.errors.push({
              entity: 'patient',
              id: patient.id,
              error: error.message
            });
            console.error(`Failed to migrate patient ${patient.id}:`, error.message);
          }
        }));

        console.log(`Migrated ${Math.min(i + batchSize, result.rows.length)}/${this.stats.patients.total} patients`);
      }

      this.logMigration(`Patients migration completed: ${this.stats.patients.migrated}/${this.stats.patients.total}`, 'success');

    } catch (error) {
      this.logMigration(`Patients migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateImmunizationRecords() {
    console.log('Migrating immunization records...');
    this.logMigration('Starting immunization records migration', 'info');

    try {
      const result = await this.pgPool.query('SELECT * FROM immunization_records ORDER BY id');
      this.stats.immunizations.total = result.rows.length;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < result.rows.length; i += batchSize) {
        const batch = result.rows.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (record) => {
          try {
            const appwriteRecord = {
              patientId: record.patient_id.toString(),
              vaccineId: record.vaccine_id.toString(),
              facilityId: record.facility_id.toString(),
              administeredBy: record.administered_by.toString(),
              dateAdministered: record.date_administered.toISOString(),
              doseNumber: record.dose_number,
              batchNumber: record.batch_number || '',
              expirationDate: record.expiration_date ? record.expiration_date.toISOString() : '',
              siteOfAdministration: record.site_of_administration || '',
              adverseEvents: record.adverse_events || '',
              notes: record.notes || ''
            };

            await this.databases.createDocument(
              'immune-me-db',
              'immunization_records',
              record.id.toString(),
              appwriteRecord
            );

            this.stats.immunizations.migrated++;

          } catch (error) {
            this.stats.immunizations.errors++;
            this.errors.push({
              entity: 'immunization_record',
              id: record.id,
              error: error.message
            });
            console.error(`Failed to migrate immunization record ${record.id}:`, error.message);
          }
        }));

        console.log(`Migrated ${Math.min(i + batchSize, result.rows.length)}/${this.stats.immunizations.total} immunization records`);
      }

      this.logMigration(`Immunization records migration completed: ${this.stats.immunizations.migrated}/${this.stats.immunizations.total}`, 'success');

    } catch (error) {
      this.logMigration(`Immunization records migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async migrateNotifications() {
    console.log('Migrating notifications...');
    this.logMigration('Starting notifications migration', 'info');

    try {
      const result = await this.pgPool.query('SELECT * FROM notifications ORDER BY id');
      this.stats.notifications.total = result.rows.length;

      for (const notification of result.rows) {
        try {
          const appwriteNotification = {
            patientId: notification.patient_id.toString(),
            vaccineId: notification.vaccine_id.toString(),
            facilityId: notification.facility_id.toString(),
            type: notification.type,
            status: notification.status,
            dueDate: notification.due_date.toISOString(),
            message: notification.message || '',
            priority: notification.priority || 'medium'
          };

          await this.databases.createDocument(
            'immune-me-db',
            'notifications',
            notification.id.toString(),
            appwriteNotification
          );

          this.stats.notifications.migrated++;

        } catch (error) {
          this.stats.notifications.errors++;
          this.errors.push({
            entity: 'notification',
            id: notification.id,
            error: error.message
          });
          console.error(`Failed to migrate notification ${notification.id}:`, error.message);
        }
      }

      this.logMigration(`Notifications migration completed: ${this.stats.notifications.migrated}/${this.stats.notifications.total}`, 'success');

    } catch (error) {
      this.logMigration(`Notifications migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async ensureTeamsExist() {
    const teams = [
      { id: 'admin-team', name: 'Administrators' },
      { id: 'facility-managers', name: 'Facility Managers' },
      { id: 'healthcare-workers', name: 'Healthcare Workers' },
      { id: 'data-entry-clerks', name: 'Data Entry Clerks' }
    ];

    for (const team of teams) {
      try {
        await this.teams.get(team.id);
      } catch (error) {
        if (error.code === 404) {
          // Team doesn't exist, create it
          await this.teams.create(team.id, team.name);
          console.log(`Created team: ${team.name}`);
        }
      }
    }
  }

  getRoleTeamId(role) {
    const roleTeamMapping = {
      'admin': 'admin-team',
      'facility_manager': 'facility-managers',
      'healthcare_worker': 'healthcare-workers',
      'data_entry_clerk': 'data-entry-clerks'
    };

    return roleTeamMapping[role] || 'healthcare-workers';
  }

  async verifyDataIntegrity() {
    console.log('Verifying data integrity...');
    this.logMigration('Starting data integrity verification', 'info');

    const verificationResults = {
      users: await this.verifyUsers(),
      patients: await this.verifyPatients(),
      immunizations: await this.verifyImmunizations(),
      facilities: await this.verifyFacilities(),
      vaccines: await this.verifyVaccines(),
      notifications: await this.verifyNotifications()
    };

    console.log('Data integrity verification results:', verificationResults);
    this.logMigration(`Data integrity verification completed`, 'info');

    return verificationResults;
  }

  async verifyUsers() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM users');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.users.list();
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async verifyPatients() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM patients');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.databases.listDocuments('immune-me-db', 'patients');
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async verifyImmunizations() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM immunization_records');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.databases.listDocuments('immune-me-db', 'immunization_records');
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async verifyFacilities() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM facilities');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.databases.listDocuments('immune-me-db', 'facilities');
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async verifyVaccines() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM vaccines');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.databases.listDocuments('immune-me-db', 'vaccines');
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async verifyNotifications() {
    try {
      const pgResult = await this.pgPool.query('SELECT COUNT(*) FROM notifications');
      const pgCount = parseInt(pgResult.rows[0].count);

      const appwriteResult = await this.databases.listDocuments('immune-me-db', 'notifications');
      const appwriteCount = appwriteResult.total;

      return {
        postgresql: pgCount,
        appwrite: appwriteCount,
        match: pgCount === appwriteCount
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  logMigration(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    this.migrationLog.push(logEntry);
    
    if (level === 'error') {
      console.error(`[${logEntry.timestamp}] ERROR: ${message}`);
    } else {
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`);
    }
  }
}

module.exports = MigrationFramework;
```

### Migration Execution Script

#### Main Migration Script
```javascript
// appwrite-backend/migrations/run-migration.js
const MigrationFramework = require('./migration-framework');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const migration = new MigrationFramework();
  
  try {
    console.log('='.repeat(60));
    console.log('IMMUNE ME - DATA MIGRATION TO APPWRITE');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    const result = await migration.runMigration();
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // Save migration report
    const report = {
      ...result,
      duration: `${duration} seconds`,
      timestamp: new Date().toISOString()
    };
    
    const reportPath = path.join(__dirname, 'reports', `migration-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Duration: ${duration} seconds`);
    console.log('\nEntity Statistics:');
    
    Object.entries(result.stats).forEach(([entity, stats]) => {
      console.log(`  ${entity}: ${stats.migrated}/${stats.total} (${stats.errors} errors)`);
    });
    
    if (result.errors.length > 0) {
      console.log(`\nTotal Errors: ${result.errors.length}`);
      console.log('See migration report for details:', reportPath);
    }
    
    console.log('\nMigration report saved to:', reportPath);
    console.log('='.repeat(60));
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nMigration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nMigration terminated');
  process.exit(1);
});

// Run migration
runMigration();
```

### Data Validation and Rollback

#### Rollback Script
```javascript
// appwrite-backend/migrations/rollback-migration.js
const { Client, Databases, Users } = require('node-appwrite');

class MigrationRollback {
  constructor() {
    this.appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    this.databases = new Databases(this.appwriteClient);
    this.users = new Users(this.appwriteClient);
  }

  async rollback() {
    console.log('Starting migration rollback...');
    
    try {
      // Delete all migrated data in reverse order
      await this.deleteNotifications();
      await this.deleteImmunizationRecords();
      await this.deletePatients();
      await this.deleteUsers();
      await this.deleteVaccines();
      await this.deleteFacilities();
      
      console.log('Rollback completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCollection(collectionId) {
    console.log(`Deleting all documents from ${collectionId}...`);
    
    let hasMore = true;
    let deleted = 0;
    
    while (hasMore) {
      const documents = await this.databases.listDocuments(
        'immune-me-db',
        collectionId,
        ['limit(100)']
      );
      
      if (documents.documents.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const doc of documents.documents) {
        await this.databases.deleteDocument('immune-me-db', collectionId, doc.$id);
        deleted++;
      }
      
      console.log(`Deleted ${deleted} documents from ${collectionId}`);
    }
    
    console.log(`Completed deletion of ${collectionId}: ${deleted} documents`);
  }

  async deleteNotifications() {
    await this.deleteCollection('notifications');
  }

  async deleteImmunizationRecords() {
    await this.deleteCollection('immunization_records');
  }

  async deletePatients() {
    await this.deleteCollection('patients');
  }

  async deleteVaccines() {
    await this.deleteCollection('vaccines');
  }

  async deleteFacilities() {
    await this.deleteCollection('facilities');
  }

  async deleteUsers() {
    console.log('Deleting migrated users...');
    
    let hasMore = true;
    let deleted = 0;
    
    while (hasMore) {
      const users = await this.users.list(['limit(100)']);
      
      if (users.users.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const user of users.users) {
        // Only delete users that were migrated (have originalId in prefs)
        if (user.prefs && user.prefs.originalId) {
          await this.users.delete(user.$id);
          deleted++;
        }
      }
      
      console.log(`Deleted ${deleted} migrated users`);
    }
    
    console.log(`Completed user deletion: ${deleted} users`);
  }
}

async function runRollback() {
  const rollback = new MigrationRollback();
  
  console.log('WARNING: This will delete all migrated data from Appwrite!');
  console.log('Make sure you have a backup before proceeding.');
  
  // In a real scenario, you might want to add a confirmation prompt
  const result = await rollback.rollback();
  
  if (result.success) {
    console.log('Rollback completed successfully');
    process.exit(0);
  } else {
    console.error('Rollback failed:', result.error);
    process.exit(1);
  }
}

runRollback();
```

## Files to Create/Modify
- `appwrite-backend/migrations/migration-framework.js` - Main migration framework
- `appwrite-backend/migrations/run-migration.js` - Migration execution script
- `appwrite-backend/migrations/rollback-migration.js` - Rollback script
- `appwrite-backend/migrations/validate-migration.js` - Data validation script
- `appwrite-backend/migrations/config/migration-config.json` - Migration configuration
- `appwrite-backend/migrations/utils/data-transformers.js` - Data transformation utilities
- `appwrite-backend/migrations/utils/batch-processor.js` - Batch processing utilities
- `appwrite-backend/migrations/reports/` - Migration reports directory
- `package.json` - Add migration dependencies

## Testing Requirements

### Migration Testing
1. **Dry Run Test**
   ```javascript
   // Test migration without actually migrating data
   describe('Migration Dry Run', () => {
     it('should validate migration plan', async () => {
       const migration = new MigrationFramework();
       const plan = await migration.createMigrationPlan();
       
       expect(plan.entities).toContain('users');
       expect(plan.entities).toContain('patients');
       expect(plan.totalRecords).toBeGreaterThan(0);
     });
   });
   ```

2. **Data Integrity Test**
   ```javascript
   // Test data integrity after migration
   describe('Data Integrity', () => {
     it('should maintain referential integrity', async () => {
       const migration = new MigrationFramework();
       const result = await migration.runMigration();
       
       expect(result.success).toBe(true);
       
       const verification = await migration.verifyDataIntegrity();
       expect(verification.patients.match).toBe(true);
       expect(verification.immunizations.match).toBe(true);
     });
   });
   ```

### Rollback Testing
1. **Rollback Functionality Test**
   ```javascript
   describe('Migration Rollback', () => {
     it('should successfully rollback migration', async () => {
       const rollback = new MigrationRollback();
       const result = await rollback.rollback();
       
       expect(result.success).toBe(true);
     });
   });
   ```

## Implementation Steps

### Phase 1: Migration Framework Setup
1. Create migration framework structure
2. Set up database connections
3. Implement logging and monitoring
4. Create configuration management

### Phase 2: Entity Migration Implementation
1. Implement facilities migration
2. Implement vaccines migration
3. Implement users