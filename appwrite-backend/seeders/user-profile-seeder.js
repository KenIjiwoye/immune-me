const { Databases, Users, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class UserProfileSeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.users = new Users(client);
    this.databaseId = databaseId;
    this.employeeProfilesCollectionId = 'employee_profiles';
    this.patientProfilesCollectionId = 'patient_profiles';
  }

  getLiberianNames() {
    const firstNames = {
      male: [
        'Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kofi', 'Kwesi', 'Kwadwo',
        'Joseph', 'John', 'James', 'Robert', 'William', 'David', 'Richard',
        'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
        'Emmanuel', 'Samuel', 'Benjamin', 'Abraham', 'Isaac', 'Jacob',
        'Moses', 'Aaron', 'Elijah', 'Joshua', 'Caleb', 'Nathan',
        'Prince', 'King', 'Noble', 'Blessing', 'Gift', 'Wisdom'
      ],
      female: [
        'Ama', 'Akosua', 'Adwoa', 'Yaa', 'Efua', 'Aba', 'Akua',
        'Mary', 'Elizabeth', 'Patricia', 'Jennifer', 'Linda', 'Barbara',
        'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty',
        'Ruth', 'Esther', 'Rebecca', 'Rachel', 'Miriam', 'Hannah',
        'Grace', 'Faith', 'Hope', 'Joy', 'Peace', 'Love', 'Mercy',
        'Princess', 'Queen', 'Angel', 'Blessing', 'Gift', 'Precious'
      ]
    };

    const lastNames = [
      'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia',
      'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas',
      'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez',
      'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker',
      'Perez', 'Hall', 'Young', 'Allen', 'Sanchez', 'Wright', 'King',
      'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez',
      'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans',
      'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart',
      'Flomo', 'Konneh', 'Kamara', 'Sesay', 'Fofana', 'Bangura', 'Mansaray',
      'Turay', 'Koroma', 'Conteh', 'Jalloh', 'Barrie', 'Dumbuya', 'Kargbo'
    ];

    return { firstNames, lastNames };
  }

  generateRandomName(gender = null) {
    const { firstNames, lastNames } = this.getLiberianNames();
    
    if (!gender) {
      gender = Math.random() > 0.5 ? 'male' : 'female';
    }
    
    const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return { firstName, lastName, fullName: `${firstName} ${lastName}`, gender };
  }

  generateEmail(firstName, lastName, domain = 'immuneme.lr') {
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const random = Math.floor(Math.random() * 999);
    return `${cleanFirst}.${cleanLast}${random}@${domain}`;
  }

  generatePhoneNumber() {
    const prefixes = ['+23177', '+23188', '+23176', '+23186'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${prefix}${number}`;
  }

  async createAppwriteUser(userData) {
    try {
      const user = await this.users.create(
        ID.unique(),
        userData.email,
        userData.phone,
        userData.password,
        userData.name
      );

      // Add labels for roles
      if (userData.labels && userData.labels.length > 0) {
        await this.users.updateLabels(user.$id, userData.labels);
      }

      return user;
    } catch (error) {
      // If user already exists, try to find them
      if (error.code === 409) {
        try {
          const users = await this.users.list([`email=${userData.email}`]);
          if (users.users.length > 0) {
            return users.users[0];
          }
        } catch (findError) {
          // Continue with original error
        }
      }
      throw error;
    }
  }

  async seed(facilities) {
    if (!facilities || facilities.length === 0) {
      throw new Error('Facilities are required to create user profiles');
    }

    const spinner = ora('Creating users and profiles...').start();
    const users = [];
    const employeeProfiles = [];
    const patientProfiles = [];

    try {
      // Create admin users
      const adminUsers = await this.createAdminUsers(facilities, spinner);
      users.push(...adminUsers.users);
      employeeProfiles.push(...adminUsers.employeeProfiles);

      // Create healthcare staff
      const staffUsers = await this.createHealthcareStaff(facilities, spinner);
      users.push(...staffUsers.users);
      employeeProfiles.push(...staffUsers.employeeProfiles);

      // Create patient users with profiles
      const patientUsers = await this.createPatientUsers(facilities, spinner);
      users.push(...patientUsers.users);
      patientProfiles.push(...patientUsers.patientProfiles);

      spinner.succeed(`Created ${users.length} users, ${employeeProfiles.length} employee profiles, ${patientProfiles.length} patient profiles`);

      return { users, employeeProfiles, patientProfiles };

    } catch (error) {
      spinner.fail(`Failed to create users and profiles: ${error.message}`);
      throw error;
    }
  }

  async createAdminUsers(facilities, spinner) {
    const users = [];
    const employeeProfiles = [];

    // Create system administrator
    spinner.text = 'Creating system administrator...';
    const adminName = this.generateRandomName();
    const adminUser = await this.createAppwriteUser({
      email: process.env.ADMIN_EMAIL || 'admin@immuneme.lr',
      phone: this.generatePhoneNumber(),
      password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
      name: adminName.fullName,
      labels: ['roleadministrator']
    });

    const adminProfile = await this.databases.createDocument(
      this.databaseId,
      this.employeeProfilesCollectionId,
      ID.unique(),
      {
        user_id: adminUser.$id,
        employee_id: 'ADMIN-001',
        employee_type: 'administrator',
        professional_title: 'System Administrator',
        primary_facility_id: facilities[0].$id,
        assigned_facilities: [facilities[0].$id],
        department: 'Administration',
        employment_status: 'active',
        hire_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
        specializations: ['public_health', 'preventive_medicine'],
        contact_information: JSON.stringify({
          email: adminUser.email,
          phone: adminUser.phone,
          emergency_contact: this.generatePhoneNumber()
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    );

    users.push(adminUser);
    employeeProfiles.push(adminProfile);

    return { users, employeeProfiles };
  }

  async createHealthcareStaff(facilities, spinner) {
    const users = [];
    const employeeProfiles = [];

    const staffRoles = [
      { type: 'doctor', title: 'Medical Doctor', specializations: ['general_practice', 'pediatrics'] },
      { type: 'supervisor', title: 'Nursing Supervisor', specializations: ['nursing', 'public_health'] },
      { type: 'nurse', title: 'Registered Nurse', specializations: ['nursing', 'immunization_specialist'] },
      { type: 'nurse', title: 'Community Health Nurse', specializations: ['community_health', 'nursing'] },
      { type: 'clerk', title: 'Data Entry Clerk', specializations: [] }
    ];

    let employeeCounter = 2; // Start after admin

    for (let i = 0; i < Math.min(facilities.length * 2, 20); i++) {
      const facility = facilities[i % facilities.length];
      const role = staffRoles[i % staffRoles.length];
      const nameData = this.generateRandomName();

      spinner.text = `Creating healthcare staff: ${nameData.fullName} (${i + 1}/20)`;

      const user = await this.createAppwriteUser({
        email: this.generateEmail(nameData.firstName, nameData.lastName),
        phone: this.generatePhoneNumber(),
        password: process.env.DEFAULT_PASSWORD || 'TempPass123!',
        name: nameData.fullName,
        labels: [`role${role.type}`]
      });

      const employeeProfile = await this.databases.createDocument(
        this.databaseId,
        this.employeeProfilesCollectionId,
        ID.unique(),
        {
          user_id: user.$id,
          employee_id: `EMP-${employeeCounter.toString().padStart(3, '0')}`,
          employee_type: role.type,
          professional_title: role.title,
          license_number: role.type === 'doctor' ? `MD-${Math.floor(Math.random() * 10000)}` : 
                         role.type === 'nurse' ? `RN-${Math.floor(Math.random() * 10000)}` : null,
          license_expiry_date: role.type === 'doctor' || role.type === 'nurse' ? 
            new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() : null, // 2 years from now
          specializations: role.specializations,
          primary_facility_id: facility.$id,
          assigned_facilities: [facility.$id],
          department: role.type === 'doctor' ? 'Medical' : 
                     role.type === 'nurse' || role.type === 'supervisor' ? 'Nursing' : 
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

      users.push(user);
      employeeProfiles.push(employeeProfile);
      employeeCounter++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return { users, employeeProfiles };
  }

  async createPatientUsers(facilities, spinner) {
    const users = [];
    const patientProfiles = [];

    const patientCount = parseInt(process.env.PATIENT_PROFILE_COUNT) || 15;

    for (let i = 0; i < patientCount; i++) {
      const facility = facilities[i % facilities.length];
      const nameData = this.generateRandomName();

      spinner.text = `Creating patient profile: ${nameData.fullName} (${i + 1}/${patientCount})`;

      const user = await this.createAppwriteUser({
        email: this.generateEmail(nameData.firstName, nameData.lastName),
        phone: this.generatePhoneNumber(),
        password: process.env.DEFAULT_PASSWORD || 'TempPass123!',
        name: nameData.fullName,
        labels: ['rolepatient']
      });

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
            name: this.generateRandomName().fullName,
            relationship: Math.random() > 0.5 ? 'spouse' : 'parent',
            phone: this.generatePhoneNumber()
          }),
          facility_id: facility.$id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );

      users.push(user);
      patientProfiles.push(patientProfile);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return { users, patientProfiles };
  }

  async clean() {
    const spinner = ora('Cleaning users and profiles...').start();
    
    try {
      // Clean employee profiles
      const employeeProfiles = await this.databases.listDocuments(this.databaseId, this.employeeProfilesCollectionId);
      for (const doc of employeeProfiles.documents) {
        await this.databases.deleteDocument(this.databaseId, this.employeeProfilesCollectionId, doc.$id);
      }

      // Clean patient profiles
      const patientProfiles = await this.databases.listDocuments(this.databaseId, this.patientProfilesCollectionId);
      for (const doc of patientProfiles.documents) {
        await this.databases.deleteDocument(this.databaseId, this.patientProfilesCollectionId, doc.$id);
      }

      // Note: We don't clean Appwrite users as they might be needed for authentication
      // and cleaning them requires special permissions

      spinner.succeed(`Cleaned ${employeeProfiles.documents.length} employee profiles and ${patientProfiles.documents.length} patient profiles`);
    } catch (error) {
      spinner.fail(`Failed to clean profiles: ${error.message}`);
      throw error;
    }
  }
}

// Allow running this seeder independently
if (require.main === module) {
  require('dotenv').config();
  const { Client } = require('node-appwrite');
  
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
    .setKey(process.env.APPWRITE_API_KEY);

  const databaseId = process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc';
  const seeder = new UserProfileSeeder(client, databaseId);

  // This seeder requires facilities, so we'll just show an error
  console.error(chalk.red('❌ This seeder requires facilities to be created first.'));
  console.log(chalk.yellow('Please run the main database seeder or create facilities first.'));
  process.exit(1);
}

module.exports = UserProfileSeeder;