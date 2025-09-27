#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class PatientsSeeder {
  constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    
    // Configure Appwrite client
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
      .setKey(process.env.APPWRITE_API_KEY);

    this.databaseId = process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc';
    this.collectionId = 'patients';
  }

  generateLiberianNames() {
    const maleFirstNames = [
      'Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwesi', 'Kwadwo', 'Kojo',
      'Joseph', 'John', 'James', 'Robert', 'William', 'David', 'Richard',
      'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
      'Emmanuel', 'Samuel', 'Benjamin', 'Abraham', 'Isaac', 'Jacob',
      'Moses', 'Aaron', 'Elijah', 'Joshua', 'Caleb', 'Nathan',
      'Prince', 'King', 'Noble', 'Blessing', 'Gift', 'Wisdom'
    ];

    const femaleFirstNames = [
      'Ama', 'Akosua', 'Adwoa', 'Yaa', 'Efua', 'Aba', 'Akua',
      'Mary', 'Elizabeth', 'Patricia', 'Jennifer', 'Linda', 'Barbara',
      'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty',
      'Ruth', 'Esther', 'Rebecca', 'Rachel', 'Miriam', 'Hannah',
      'Grace', 'Faith', 'Hope', 'Joy', 'Peace', 'Love', 'Mercy',
      'Princess', 'Queen', 'Angel', 'Blessing', 'Gift', 'Precious'
    ];

    const lastNames = [
      'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis',
      'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
      'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
      'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker',
      // Liberian surnames
      'Flomo', 'Konneh', 'Kamara', 'Sesay', 'Fofana', 'Bangura',
      'Mansaray', 'Turay', 'Koroma', 'Conteh', 'Jalloh', 'Barrie',
      'Dumbuya', 'Kargbo', 'Sankoh', 'Tarawally', 'Fornah', 'Suma'
    ];

    return { maleFirstNames, femaleFirstNames, lastNames };
  }

  generateRandomName(gender) {
    const { maleFirstNames, femaleFirstNames, lastNames } = this.generateLiberianNames();
    
    const firstNames = gender === 'male' ? maleFirstNames : femaleFirstNames;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  }

  getLiberianDistricts() {
    return [
      'Monrovia', 'Paynesville', 'Careysburg', 'Todee',
      'Kakata', 'Harbel', 'Firestone',
      'Gbarnga', 'Suakoko', 'Salala', 'Jorquelleh',
      'Ganta', 'Sanniquellie', 'Tappita', 'Saclepea',
      'Voinjama', 'Kolahun', 'Foya', 'Salayea',
      'Buchanan', 'Edina', 'Harbel', 'Owensgrove',
      'Tubmanburg', 'Suehn', 'Klay', 'Dewoin',
      'Robertsport', 'Porkpa', 'Tewor', 'Gola Konneh',
      'Zwedru', 'Tchien', 'Konobo', 'Gbarzon',
      'Barclayville', 'Buah', 'Forpoh', 'Garraway'
    ];
  }

  getLiberianTownsVillages() {
    return [
      'New Kru Town', 'West Point', 'Clara Town', 'Logan Town', 'Congo Town',
      'Caldwell', 'Bentol', 'Johnsonville', 'Brewerville', 'Virginia',
      'Bong Mines', 'Yekepa', 'Buchanan Port', 'Greenville', 'Harper',
      'Pleebo', 'Zwedru Town', 'Fish Town', 'Sasstown', 'Rivercess'
    ];
  }

  generateRandomBirthDate(minAge = 0, maxAge = 25) {
    const now = new Date();
    const minDate = new Date(now.getFullYear() - maxAge, 0, 1);
    const maxDate = new Date(now.getFullYear() - minAge, 11, 31);
    
    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    return new Date(randomTime);
  }

  generatePhoneNumber() {
    const prefixes = ['+23177', '+23188', '+23176', '+23186'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${prefix}${number}`;
  }

  generateAddress(district) {
    const towns = this.getLiberianTownsVillages();
    const town = towns[Math.floor(Math.random() * towns.length)];
    const streetNumbers = ['12', '45', '78', '23', '56', '89', '34', '67'];
    const streetNames = ['Main Street', 'Market Street', 'Church Street', 'School Road', 'Hospital Road', 'Community Road'];
    
    const streetNumber = streetNumbers[Math.floor(Math.random() * streetNumbers.length)];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    
    return `${streetNumber} ${streetName}, ${town}, ${district}`;
  }

  generateParentName(childSex) {
    const { maleFirstNames, femaleFirstNames, lastNames } = this.generateLiberianNames();
    
    // Mother names
    const motherFirstName = femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
    const motherLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const motherName = `${motherFirstName} ${motherLastName}`;
    
    // Father names
    const fatherFirstName = maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)];
    const fatherLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fatherName = `${fatherFirstName} ${fatherLastName}`;
    
    return { motherName, fatherName };
  }

  async loadFacilities() {
    const spinner = ora('Loading facilities...').start();
    try {
      const response = await this.databases.listDocuments(this.databaseId, 'facilities');
      if (response.documents.length === 0) {
        spinner.fail('No facilities found');
        throw new Error('No facilities found. Please run facilities seeder first.');
      }
      spinner.succeed(`Loaded ${response.documents.length} facilities`);
      return response.documents;
    } catch (error) {
      spinner.fail('Failed to load facilities');
      throw new Error(`Could not load facilities: ${error.message}`);
    }
  }

  async seed() {
    try {
      console.log(chalk.cyan('🚀 Creating Patients\n'));

      // Load facilities
      const facilities = await this.loadFacilities();

      const spinner = ora('Creating patients...').start();
      const patients = [];
      const patientCount = parseInt(process.env.PATIENT_COUNT) || 100;

      for (let i = 0; i < patientCount; i++) {
        const facility = facilities[i % facilities.length];
        const districts = this.getLiberianDistricts();
        const towns = this.getLiberianTownsVillages();
        
        const sex = Math.random() > 0.5 ? 'M' : 'F';
        const nameData = this.generateRandomName(sex === 'M' ? 'male' : 'female');
        const birthDate = this.generateRandomBirthDate(0, 25); // Focus on children and young adults
        const district = districts[Math.floor(Math.random() * districts.length)];
        const { motherName, fatherName } = this.generateParentName(sex);

        spinner.text = `Creating patient: ${nameData.fullName} (${i + 1}/${patientCount})`;

        const patientData = {
          full_name: nameData.fullName,
          sex: sex,
          date_of_birth: birthDate.toISOString(),
          mother_name: Math.random() > 0.1 ? motherName : null, // 90% have mother name
          father_name: Math.random() > 0.3 ? fatherName : null, // 70% have father name
          district: district,
          town_village: Math.random() > 0.2 ? towns[Math.floor(Math.random() * towns.length)] : null,
          address: this.generateAddress(district),
          contact_phone: Math.random() > 0.4 ? this.generatePhoneNumber() : null, // 60% have phone
          facility_id: facility.$id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Add health worker information for some patients (30% have assigned health workers)
        if (Math.random() > 0.7) {
          const healthWorkerName = this.generateRandomName(Math.random() > 0.5 ? 'male' : 'female');
          patientData.health_worker_name = healthWorkerName.fullName;
          patientData.health_worker_phone = this.generatePhoneNumber();
          patientData.health_worker_address = this.generateAddress(district);
        }

        const patient = await this.databases.createDocument(
          this.databaseId,
          this.collectionId,
          ID.unique(),
          patientData
        );

        patients.push(patient);
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      }

      spinner.succeed(`Created ${patients.length} patients`);

      // Save patients data for next steps
      const fs = require('fs');
      fs.writeFileSync('./seeded-patients.json', JSON.stringify(patients, null, 2));

      // Statistics
      const stats = {
        total: patients.length,
        male: patients.filter(p => p.sex === 'M').length,
        female: patients.filter(p => p.sex === 'F').length,
        withPhones: patients.filter(p => p.contact_phone).length,
        facilitiesUsed: [...new Set(patients.map(p => p.facility_id))].length
      };

      console.log(chalk.green('\n🎉 Patients created successfully!'));
      console.log(chalk.blue('\n📊 Patient Statistics:'));
      console.log(`   Total Patients: ${stats.total}`);
      console.log(`   Male: ${stats.male} (${Math.round(stats.male/stats.total*100)}%)`);
      console.log(`   Female: ${stats.female} (${Math.round(stats.female/stats.total*100)}%)`);
      console.log(`   With Phone Numbers: ${stats.withPhones} (${Math.round(stats.withPhones/stats.total*100)}%)`);
      console.log(`   Distributed across ${stats.facilitiesUsed} facilities`);
      console.log(chalk.yellow('\n📄 Patient data saved to: seeded-patients.json'));
      console.log(chalk.cyan('\n➡️  Next: Run immunization and notification seeders'));

      return patients;

    } catch (error) {
      console.error(chalk.red('\n❌ Patient seeding failed:'), error.message);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new PatientsSeeder();
  seeder.seed().catch(console.error);
}

module.exports = PatientsSeeder;