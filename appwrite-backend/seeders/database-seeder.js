#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases, Users, Account } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');

// Import individual seeders
const FacilitySeeder = require('./facility-seeder');
const VaccineSeeder = require('./vaccine-seeder');
const UserProfileSeeder = require('./user-profile-seeder');
const PatientSeeder = require('./patient-seeder');
const ImmunizationSeeder = require('./immunization-seeder');
const NotificationSeeder = require('./notification-seeder');

class DatabaseSeeder {
  constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
    this.account = new Account(this.client);
    
    // Configure Appwrite client
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
      .setKey(process.env.APPWRITE_API_KEY);

    this.databaseId = process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc';
    this.batchSize = parseInt(process.env.SEED_BATCH_SIZE) || 50;
    this.delayMs = parseInt(process.env.SEED_DELAY_MS) || 100;
    
    // Initialize seeders
    this.seeders = {
      facilities: new FacilitySeeder(this.client, this.databaseId),
      vaccines: new VaccineSeeder(this.client, this.databaseId),
      userProfiles: new UserProfileSeeder(this.client, this.databaseId),
      patients: new PatientSeeder(this.client, this.databaseId),
      immunizations: new ImmunizationSeeder(this.client, this.databaseId),
      notifications: new NotificationSeeder(this.client, this.databaseId)
    };

    this.seededData = {
      facilities: [],
      vaccines: [],
      users: [],
      employeeProfiles: [],
      patientProfiles: [],
      patients: [],
      immunizationRecords: [],
      notifications: []
    };
  }

  async validateConnection() {
    const spinner = ora('Validating Appwrite connection...').start();
    try {
      // Test database connection
      await this.databases.list();
      spinner.succeed('Appwrite connection validated successfully');
      return true;
    } catch (error) {
      spinner.fail(`Connection failed: ${error.message}`);
      console.log(chalk.red('\nPlease check your environment variables:'));
      console.log(chalk.yellow('- APPWRITE_ENDPOINT'));
      console.log(chalk.yellow('- APPWRITE_PROJECT_ID'));
      console.log(chalk.yellow('- APPWRITE_DATABASE_ID'));
      console.log(chalk.yellow('- APPWRITE_API_KEY'));
      return false;
    }
  }

  async promptUserConfirmation() {
    // Skip prompts if SKIP_PROMPTS is set
    if (process.env.SKIP_PROMPTS === 'true') {
      return {
        proceed: true,
        cleanFirst: process.env.CLEAN_BEFORE_SEED === 'true'
      };
    }

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'This will populate your Appwrite database with seed data. Continue?',
        default: false
      },
      {
        type: 'confirm',
        name: 'cleanFirst',
        message: 'Do you want to clean existing data first? (WARNING: This will delete all data)',
        default: false,
        when: (answers) => answers.proceed
      }
    ]);

    return answers;
  }

  async cleanDatabase() {
    const spinner = ora('Cleaning existing data...').start();
    try {
      const collections = [
        'notifications',
        'immunization_records', 
        'patients',
        'patient_profiles',
        'employee_profiles',
        'vaccines',
        'facilities'
      ];

      for (const collectionId of collections) {
        try {
          const response = await this.databases.listDocuments(this.databaseId, collectionId);
          
          if (response.documents.length > 0) {
            spinner.text = `Cleaning ${collectionId}... (${response.documents.length} documents)`;
            
            for (const doc of response.documents) {
              await this.databases.deleteDocument(this.databaseId, collectionId, doc.$id);
              await this.delay(50); // Small delay to avoid rate limits
            }
          }
        } catch (error) {
          // Collection might not exist, continue
          console.log(chalk.yellow(`Warning: Could not clean ${collectionId}: ${error.message}`));
        }
      }

      spinner.succeed('Database cleaned successfully');
    } catch (error) {
      spinner.fail(`Failed to clean database: ${error.message}`);
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async seedFacilities() {
    console.log(chalk.blue('\n📍 Seeding Facilities...'));
    const facilities = await this.seeders.facilities.seed();
    this.seededData.facilities = facilities;
    console.log(chalk.green(`✅ Created ${facilities.length} facilities`));
    return facilities;
  }

  async seedVaccines() {
    console.log(chalk.blue('\n💉 Seeding Vaccines...'));
    const vaccines = await this.seeders.vaccines.seed();
    this.seededData.vaccines = vaccines;
    console.log(chalk.green(`✅ Created ${vaccines.length} vaccines`));
    return vaccines;
  }

  async seedUserProfiles() {
    console.log(chalk.blue('\n👥 Seeding User Profiles...'));
    const { users, employeeProfiles, patientProfiles } = await this.seeders.userProfiles.seed(this.seededData.facilities);
    this.seededData.users = users;
    this.seededData.employeeProfiles = employeeProfiles;
    this.seededData.patientProfiles = patientProfiles;
    console.log(chalk.green(`✅ Created ${users.length} users, ${employeeProfiles.length} employee profiles, ${patientProfiles.length} patient profiles`));
    return { users, employeeProfiles, patientProfiles };
  }

  async seedPatients() {
    console.log(chalk.blue('\n🏥 Seeding Patients...'));
    const patients = await this.seeders.patients.seed(
      this.seededData.facilities,
      this.seededData.patientProfiles
    );
    this.seededData.patients = patients;
    console.log(chalk.green(`✅ Created ${patients.length} patients`));
    return patients;
  }

  async seedImmunizations() {
    console.log(chalk.blue('\n💊 Seeding Immunization Records...'));
    const immunizations = await this.seeders.immunizations.seed(
      this.seededData.patients,
      this.seededData.vaccines,
      this.seededData.facilities,
      this.seededData.employeeProfiles
    );
    this.seededData.immunizationRecords = immunizations;
    console.log(chalk.green(`✅ Created ${immunizations.length} immunization records`));
    return immunizations;
  }

  async seedNotifications() {
    console.log(chalk.blue('\n🔔 Seeding Notifications...'));
    const notifications = await this.seeders.notifications.seed(
      this.seededData.patients,
      this.seededData.vaccines,
      this.seededData.facilities,
      this.seededData.patientProfiles,
      this.seededData.employeeProfiles
    );
    this.seededData.notifications = notifications;
    console.log(chalk.green(`✅ Created ${notifications.length} notifications`));
    return notifications;
  }

  async seedAll() {
    const startTime = Date.now();
    
    try {
      console.log(chalk.cyan('🚀 Starting ImmuneMe Database Seeding Process\n'));
      
      // Validate connection
      const isConnected = await this.validateConnection();
      if (!isConnected) {
        process.exit(1);
      }

      // Get user confirmation
      const { proceed, cleanFirst } = await this.promptUserConfirmation();
      if (!proceed) {
        console.log(chalk.yellow('Seeding cancelled by user.'));
        process.exit(0);
      }

      // Clean database if requested
      if (cleanFirst) {
        await this.cleanDatabase();
      }

      // Seed in dependency order
      await this.seedFacilities();
      await this.seedVaccines();
      await this.seedUserProfiles();
      await this.seedPatients();
      await this.seedImmunizations();
      await this.seedNotifications();

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(chalk.green('\n🎉 Database seeding completed successfully!'));
      console.log(chalk.cyan(`⏱️  Total time: ${duration} seconds`));
      
      // Summary
      console.log(chalk.blue('\n📊 Seeding Summary:'));
      console.log(`   Facilities: ${this.seededData.facilities.length}`);
      console.log(`   Vaccines: ${this.seededData.vaccines.length}`);
      console.log(`   Users: ${this.seededData.users.length}`);
      console.log(`   Employee Profiles: ${this.seededData.employeeProfiles.length}`);
      console.log(`   Patient Profiles: ${this.seededData.patientProfiles.length}`);
      console.log(`   Patients: ${this.seededData.patients.length}`);
      console.log(`   Immunization Records: ${this.seededData.immunizationRecords.length}`);
      console.log(`   Notifications: ${this.seededData.notifications.length}`);

    } catch (error) {
      console.error(chalk.red('\n❌ Seeding failed:'), error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async seedSpecific(seederName) {
    try {
      console.log(chalk.cyan(`🚀 Starting ${seederName} seeding...\n`));
      
      const isConnected = await this.validateConnection();
      if (!isConnected) {
        process.exit(1);
      }

      switch (seederName) {
        case 'facilities':
          await this.seedFacilities();
          break;
        case 'vaccines':
          await this.seedVaccines();
          break;
        case 'users':
          // Need facilities first
          if (this.seededData.facilities.length === 0) {
            await this.seedFacilities();
          }
          await this.seedUserProfiles();
          break;
        case 'patients':
          // Need facilities and profiles first
          if (this.seededData.facilities.length === 0) {
            await this.seedFacilities();
          }
          if (this.seededData.patientProfiles.length === 0) {
            await this.seedUserProfiles();
          }
          await this.seedPatients();
          break;
        case 'immunizations':
          // Need all dependencies
          if (this.seededData.facilities.length === 0) await this.seedFacilities();
          if (this.seededData.vaccines.length === 0) await this.seedVaccines();
          if (this.seededData.employeeProfiles.length === 0) await this.seedUserProfiles();
          if (this.seededData.patients.length === 0) await this.seedPatients();
          await this.seedImmunizations();
          break;
        case 'notifications':
          // Need all dependencies
          if (this.seededData.facilities.length === 0) await this.seedFacilities();
          if (this.seededData.vaccines.length === 0) await this.seedVaccines();
          if (this.seededData.patientProfiles.length === 0) await this.seedUserProfiles();
          if (this.seededData.patients.length === 0) await this.seedPatients();
          await this.seedNotifications();
          break;
        default:
          throw new Error(`Unknown seeder: ${seederName}`);
      }

      console.log(chalk.green(`\n✅ ${seederName} seeding completed successfully!`));
    } catch (error) {
      console.error(chalk.red(`\n❌ ${seederName} seeding failed:`), error.message);
      process.exit(1);
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const seeder = new DatabaseSeeder();

  if (args.includes('--clean')) {
    await seeder.cleanDatabase();
    return;
  }

  if (args.length > 0) {
    const seederName = args[0];
    await seeder.seedSpecific(seederName);
  } else {
    await seeder.seedAll();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseSeeder;