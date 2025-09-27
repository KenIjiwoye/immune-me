#!/usr/bin/env node

require('dotenv').config();
const chalk = require('chalk');
const ora = require('ora');

// Import all seeders
const CollectionCreator = require('./00-create-collections');
const UsersOnlySeeder = require('./01-users-only-seeder');
const ProfilesSeeder = require('./02-profiles-seeder');
const PatientSeeder = require('./patient-seeder');
const ImmunizationSeeder = require('./immunization-seeder');
const NotificationSeeder = require('./notification-seeder');

class MasterSeeder {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      facilities: 0,
      vaccines: 0,
      users: 0,
      employeeProfiles: 0,
      patientProfiles: 0,
      patients: 0,
      immunizationRecords: 0,
      notifications: 0
    };
  }

  async validateEnvironment() {
    const spinner = ora('Validating environment...').start();
    
    const required = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID', 
      'APPWRITE_DATABASE_ID',
      'APPWRITE_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      spinner.fail(`Missing environment variables: ${missing.join(', ')}`);
      return false;
    }

    spinner.succeed('Environment validated');
    return true;
  }

  async runSeeder(name, seederClass, dependencies = []) {
    const spinner = ora(`Running ${name}...`).start();
    
    try {
      const seeder = new seederClass();
      
      if (seeder.seed) {
        const result = await seeder.seed(...dependencies);
        spinner.succeed(`${name} completed`);
        return result;
      } else if (seeder.createCollections) {
        await seeder.createCollections();
        spinner.succeed(`${name} completed`);
        return null;
      } else {
        throw new Error(`Seeder ${name} has no seed method`);
      }
    } catch (error) {
      spinner.fail(`${name} failed: ${error.message}`);
      throw error;
    }
  }

  async loadExistingData() {
    const { Client, Databases } = require('node-appwrite');
    const client = new Client();
    const databases = new Databases(client);
    
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databaseId = process.env.APPWRITE_DATABASE_ID;

    try {
      // Load facilities and vaccines (should already exist)
      const facilitiesResponse = await databases.listDocuments(databaseId, 'facilities');
      const vaccinesResponse = await databases.listDocuments(databaseId, 'vaccines');
      
      this.results.facilities = facilitiesResponse.documents.length;
      this.results.vaccines = vaccinesResponse.documents.length;

      return {
        facilities: facilitiesResponse.documents,
        vaccines: vaccinesResponse.documents
      };
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not load existing facilities/vaccines data'));
      return { facilities: [], vaccines: [] };
    }
  }

  async runAllSeeders() {
    try {
      console.log(chalk.cyan('🚀 Starting Complete ImmuneMe Database Seeding Process\n'));

      // Validate environment
      const isValid = await this.validateEnvironment();
      if (!isValid) {
        process.exit(1);
      }

      // Step 1: Create missing collections
      console.log(chalk.blue('\n📋 Step 1: Creating Collections'));
      await this.runSeeder('Collection Creator', CollectionCreator);

      // Step 2: Load existing data
      console.log(chalk.blue('\n📊 Step 2: Loading Existing Data'));
      const existingData = await this.loadExistingData();

      // Step 3: Create users
      console.log(chalk.blue('\n👤 Step 3: Creating Users'));
      await this.runSeeder('Users Seeder', UsersOnlySeeder);

      // Step 4: Create profiles
      console.log(chalk.blue('\n👥 Step 4: Creating User Profiles'));
      await this.runSeeder('Profiles Seeder', ProfilesSeeder);

      // Step 5: Create patients
      console.log(chalk.blue('\n🏥 Step 5: Creating Patients'));
      const fs = require('fs');
      const profilesData = JSON.parse(fs.readFileSync('./seeded-profiles.json', 'utf8'));
      const patients = await this.runSeeder('Patient Seeder', PatientSeeder, [
        profilesData.facilities,
        profilesData.patientProfiles
      ]);
      this.results.patients = patients ? patients.length : 0;

      // Step 6: Create immunization records
      console.log(chalk.blue('\n💊 Step 6: Creating Immunization Records'));
      const immunizations = await this.runSeeder('Immunization Seeder', ImmunizationSeeder, [
        patients || [],
        existingData.vaccines,
        profilesData.facilities,
        profilesData.employeeProfiles
      ]);
      this.results.immunizationRecords = immunizations ? immunizations.length : 0;

      // Step 7: Create notifications
      console.log(chalk.blue('\n🔔 Step 7: Creating Notifications'));
      const notifications = await this.runSeeder('Notification Seeder', NotificationSeeder, [
        patients || [],
        existingData.vaccines,
        profilesData.facilities,
        profilesData.patientProfiles,
        profilesData.employeeProfiles
      ]);
      this.results.notifications = notifications ? notifications.length : 0;

      // Update results from loaded data
      this.results.users = profilesData.users.length;
      this.results.employeeProfiles = profilesData.employeeProfiles.length;
      this.results.patientProfiles = profilesData.patientProfiles.length;

      // Final summary
      this.printSummary();

    } catch (error) {
      console.error(chalk.red('\n❌ Seeding process failed:'), error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  printSummary() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    console.log(chalk.green('\n🎉 Complete Database Seeding Completed Successfully!'));
    console.log(chalk.cyan(`⏱️  Total time: ${duration} seconds`));
    
    console.log(chalk.blue('\n📊 Final Seeding Summary:'));
    console.log(`   Facilities: ${this.results.facilities}`);
    console.log(`   Vaccines: ${this.results.vaccines}`);
    console.log(`   Users: ${this.results.users}`);
    console.log(`   Employee Profiles: ${this.results.employeeProfiles}`);
    console.log(`   Patient Profiles: ${this.results.patientProfiles}`);
    console.log(`   Patients: ${this.results.patients}`);
    console.log(`   Immunization Records: ${this.results.immunizationRecords}`);
    console.log(`   Notifications: ${this.results.notifications}`);

    const totalRecords = Object.values(this.results).reduce((sum, count) => sum + count, 0);
    console.log(chalk.green(`\n📈 Total Records Created: ${totalRecords}`));
    
    console.log(chalk.yellow('\n🗂️  Generated Files:'));
    console.log('   - seeded-users.json');
    console.log('   - seeded-profiles.json');
    
    console.log(chalk.cyan('\n✅ Your ImmuneMe database is now fully populated with comprehensive seed data!'));
  }
}

// Add individual script commands to package.json
const updatePackageJson = () => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add individual seeder scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'seed:all': 'node run-all-seeders.js',
      'seed:collections': 'node 00-create-collections.js',
      'seed:users': 'node 01-users-only-seeder.js',
      'seed:profiles': 'node 02-profiles-seeder.js',
      'seed:step-by-step': 'echo "Run: npm run seed:collections && npm run seed:users && npm run seed:profiles"'
    };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log(chalk.green('✅ Package.json updated with new seeder scripts'));
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not update package.json'));
  }
};

// Run if called directly
if (require.main === module) {
  updatePackageJson();
  const masterSeeder = new MasterSeeder();
  masterSeeder.runAllSeeders().catch(console.error);
}

module.exports = MasterSeeder;