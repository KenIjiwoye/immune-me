#!/usr/bin/env node

require('dotenv').config();
const { Client, Users, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class UsersOnlySeeder {
  constructor() {
    this.client = new Client();
    this.users = new Users(this.client);
    
    // Configure Appwrite client
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
      .setKey(process.env.APPWRITE_API_KEY);
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

  async seed() {
    const spinner = ora('Creating users...').start();
    const users = [];

    try {
      console.log(chalk.cyan('🚀 Creating Appwrite Users Only\n'));

      // Create admin user
      spinner.text = 'Creating system administrator...';
      const adminName = this.generateRandomName();
      const adminUser = await this.createAppwriteUser({
        email: process.env.ADMIN_EMAIL || 'admin@immuneme.lr',
        phone: this.generatePhoneNumber(),
        password: process.env.ADMIN_PASSWORD || 'AdminPass123!',
        name: adminName.fullName,
        labels: ['roleadministrator']
      });
      users.push({ ...adminUser, role: 'administrator', employeeId: 'ADMIN-001' });

      // Create healthcare staff users
      const staffRoles = [
        { type: 'doctor', title: 'Medical Doctor' },
        { type: 'supervisor', title: 'Nursing Supervisor' },
        { type: 'nurse', title: 'Registered Nurse' },
        { type: 'nurse', title: 'Community Health Nurse' },
        { type: 'clerk', title: 'Data Entry Clerk' }
      ];

      let employeeCounter = 2;
      for (let i = 0; i < 20; i++) {
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

        users.push({ 
          ...user, 
          role: role.type, 
          employeeId: `EMP-${employeeCounter.toString().padStart(3, '0')}`,
          title: role.title
        });
        employeeCounter++;

        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Create patient users
      const patientCount = parseInt(process.env.PATIENT_PROFILE_COUNT) || 15;
      for (let i = 0; i < patientCount; i++) {
        const nameData = this.generateRandomName();

        spinner.text = `Creating patient user: ${nameData.fullName} (${i + 1}/${patientCount})`;

        const user = await this.createAppwriteUser({
          email: this.generateEmail(nameData.firstName, nameData.lastName),
          phone: this.generatePhoneNumber(),
          password: process.env.DEFAULT_PASSWORD || 'TempPass123!',
          name: nameData.fullName,
          labels: ['rolepatient']
        });

        users.push({ ...user, role: 'patient' });
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      spinner.succeed(`Created ${users.length} users successfully`);

      // Save users to JSON file for next step
      const fs = require('fs');
      fs.writeFileSync('./seeded-users.json', JSON.stringify(users, null, 2));

      console.log(chalk.green('\n🎉 Users created successfully!'));
      console.log(chalk.blue('\n📊 User Summary:'));
      console.log(`   Total Users: ${users.length}`);
      console.log(`   Administrators: ${users.filter(u => u.role === 'administrator').length}`);
      console.log(`   Healthcare Staff: ${users.filter(u => u.role !== 'administrator' && u.role !== 'patient').length}`);
      console.log(`   Patients: ${users.filter(u => u.role === 'patient').length}`);
      console.log(chalk.yellow('\n📄 User data saved to: seeded-users.json'));
      console.log(chalk.cyan('\n➡️  Next: Run the profile seeder to create user profiles'));

    } catch (error) {
      spinner.fail(`Failed to create users: ${error.message}`);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new UsersOnlySeeder();
  seeder.seed().catch(console.error);
}

module.exports = UsersOnlySeeder;