#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases, Users, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');

class ProfilesSeeder {
  constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    this.users = new Users(this.client);
    
    // Configure Appwrite client
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
      .setKey(process.env.APPWRITE_API_KEY);

    this.databaseId = process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc';
    this.employeeProfilesCollectionId = 'employee_profiles';
    this.patientProfilesCollectionId = 'patient_profiles';
  }

  generatePhoneNumber() {
    const prefixes = ['+23177', '+23188', '+23176', '+23186'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${prefix}${number}`;
  }

  generateRandomName() {
    const firstNames = ['John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
    const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  async loadUsers() {
    const spinner = ora('Loading users from Appwrite...').start();
    try {
      // Get all users from Appwrite
      const response = await this.users.list();
      const users = response.users;

      // Categorize users by their labels
      const categorizedUsers = users.map(user => {
        const labels = user.labels || [];
        let role = 'patient'; // default
        let employeeId = null;
        let title = 'User';

        if (labels.includes('roleadministrator')) {
          role = 'administrator';
          employeeId = 'ADMIN-001';
          title = 'System Administrator';
        } else if (labels.includes('roledoctor')) {
          role = 'doctor';
          title = 'Medical Doctor';
        } else if (labels.includes('rolesupervisor')) {
          role = 'supervisor';
          title = 'Nursing Supervisor';
        } else if (labels.includes('rolenurse')) {
          role = 'nurse';
          title = 'Registered Nurse';
        } else if (labels.includes('roleclerk')) {
          role = 'clerk';
          title = 'Data Entry Clerk';
        }

        return {
          ...user,
          role,
          employeeId,
          title
        };
      });

      spinner.succeed(`Loaded ${users.length} users from Appwrite`);
      return categorizedUsers;
    } catch (error) {
      spinner.fail('Failed to load users from Appwrite');
      throw new Error(`Could not load users from Appwrite: ${error.message}`);
    }
  }

  async loadFacilities() {
    const spinner = ora('Loading facilities...').start();
    try {
      const response = await this.databases.listDocuments(this.databaseId, 'facilities');
      if (response.documents.length === 0) {
        spinner.fail('No facilities found');
        throw new Error('No facilities found. Please ensure facilities are seeded first.');
      }
      spinner.succeed(`Loaded ${response.documents.length} facilities`);
      return response.documents;
    } catch (error) {
      spinner.fail('Failed to load facilities');
      throw new Error(`Could not load facilities: ${error.message}`);
    }
  }

  async createEmployeeProfiles(users, facilities) {
    const spinner = ora('Creating employee profiles...').start();
    const employeeProfiles = [];

    const employeeUsers = users.filter(u => u.role !== 'patient');

    if (employeeUsers.length === 0) {
      spinner.succeed('No employee users found to create profiles for');
      return employeeProfiles;
    }

    if (facilities.length === 0) {
      spinner.fail('No facilities available for employee profiles');
      throw new Error('No facilities available. Cannot create employee profiles.');
    }

    let employeeCounter = 1;

    for (let i = 0; i < employeeUsers.length; i++) {
      const user = employeeUsers[i];
      const facility = facilities[i % facilities.length];

      spinner.text = `Creating employee profile: ${user.name} (${i + 1}/${employeeUsers.length})`;

      // Generate employee ID if not set
      const employeeId = user.employeeId || `EMP-${employeeCounter.toString().padStart(3, '0')}`;
      if (!user.employeeId) employeeCounter++;

      const specializations = user.role === 'doctor' ? ['general_practice', 'pediatrics'] :
                             user.role === 'nurse' ? ['nursing', 'immunization_specialist'] :
                             user.role === 'supervisor' ? ['nursing', 'public_health'] :
                             [];

      const employeeProfile = await this.databases.createDocument(
        this.databaseId,
        this.employeeProfilesCollectionId,
        ID.unique(),
        {
          user_id: user.$id,
          employee_id: employeeId,
          employee_type: user.role,
          professional_title: user.title || 'Healthcare Professional',
          license_number: user.role === 'doctor' ? `MD-${Math.floor(Math.random() * 10000)}` :
                         user.role === 'nurse' ? `RN-${Math.floor(Math.random() * 10000)}` : null,
          license_expiry_date: user.role === 'doctor' || user.role === 'nurse' ?
            new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() : null,
          specializations: specializations,
          primary_facility_id: facility.$id,
          assigned_facilities: [facility.$id],
          department: user.role === 'doctor' ? 'Medical' :
                     user.role === 'nurse' || user.role === 'supervisor' ? 'Nursing' :
                     'Administration',
          employment_status: 'active',
          hire_date: new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          contact_information: JSON.stringify({
            email: user.email,
            phone: user.phone,
            emergency_contact: this.generatePhoneNumber()
          }),
          work_schedule: JSON.stringify({
            monday: '08:00-17:00',
            tuesday: '08:00-17:00',
            wednesday: '08:00-17:00',
            thursday: '08:00-17:00',
            friday: '08:00-17:00',
            saturday: '08:00-12:00',
            sunday: 'off'
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      employeeProfiles.push(employeeProfile);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    spinner.succeed(`Created ${employeeProfiles.length} employee profiles`);
    return employeeProfiles;
  }

  async createPatientProfiles(users, facilities) {
    const spinner = ora('Creating patient profiles...').start();
    const patientProfiles = [];

    const patientUsers = users.filter(u => u.role === 'patient');

    for (let i = 0; i < patientUsers.length; i++) {
      const user = patientUsers[i];
      const facility = facilities[i % facilities.length];

      spinner.text = `Creating patient profile: ${user.name} (${i + 1}/${patientUsers.length})`;

      const patientProfile = await this.databases.createDocument(
        this.databaseId,
        this.patientProfilesCollectionId,
        ID.unique(),
        {
          user_id: user.$id,
          patient_id: '', // Will be filled when patient record is created
          profile_status: 'active',
          verification_status: Math.random() > 0.3 ? 'verified' : 'pending',
          verification_method: Math.random() > 0.5 ? 'phone' : 'email',
          access_permissions: [
            'view_own_records',
            'receive_notifications',
            'update_contact_info',
            'view_immunization_history'
          ],
          notification_preferences: JSON.stringify({
            email_notifications: true,
            sms_notifications: true,
            push_notifications: true,
            reminder_frequency: 'weekly',
            language: 'en'
          }),
          emergency_contact: JSON.stringify({
            name: this.generateRandomName(),
            relationship: Math.random() > 0.5 ? 'spouse' : 'parent',
            phone: this.generatePhoneNumber()
          }),
          facility_id: facility.$id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      patientProfiles.push(patientProfile);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    spinner.succeed(`Created ${patientProfiles.length} patient profiles`);
    return patientProfiles;
  }

  async seed() {
    try {
      console.log(chalk.cyan('🚀 Creating User Profiles\n'));

      // Load users and facilities
      const users = await this.loadUsers();
      const facilities = await this.loadFacilities();

      console.log(chalk.blue(`📋 Loaded ${users.length} users and ${facilities.length} facilities`));

      // Create employee profiles
      const employeeProfiles = await this.createEmployeeProfiles(users, facilities);

      // Save employee profiles data for next step (no patient profiles needed)
      const profilesData = {
        users: users.filter(u => u.role !== 'patient'), // Only employee users
        employeeProfiles,
        facilities
      };
      fs.writeFileSync('./seeded-employee-profiles.json', JSON.stringify(profilesData, null, 2));

      console.log(chalk.green('\n🎉 Employee profiles created successfully!'));
      console.log(chalk.blue('\n📊 Profile Summary:'));
      console.log(`   Employee Profiles: ${employeeProfiles.length}`);
      console.log(`   Total Users: ${users.length}`);
      console.log(`   Employee Users: ${users.filter(u => u.role !== 'patient').length}`);
      console.log(`   Patient Users: ${users.filter(u => u.role === 'patient').length} (no profiles needed - patients don't log in)`);
      console.log(chalk.yellow('\n📄 Employee profile data saved to: seeded-employee-profiles.json'));
      console.log(chalk.cyan('\n➡️  Next: Run the patients seeder (npm run seed:patients-only)'));

    } catch (error) {
      console.error(chalk.red('\n❌ Profile seeding failed:'), error.message);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new ProfilesSeeder();
  seeder.seed().catch(console.error);
}

module.exports = ProfilesSeeder;