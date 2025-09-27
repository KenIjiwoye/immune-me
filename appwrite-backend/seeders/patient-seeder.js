const { Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class PatientSeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
    this.collectionId = 'patients';
    this.patientProfilesCollectionId = 'patient_profiles';
  }

  getLiberianDistricts() {
    return [
      // Montserrado County
      'Monrovia', 'Paynesville', 'Careysburg', 'Todee',
      
      // Margibi County
      'Kakata', 'Harbel', 'Firestone',
      
      // Bong County
      'Gbarnga', 'Suakoko', 'Salala', 'Jorquelleh',
      
      // Nimba County
      'Ganta', 'Sanniquellie', 'Tappita', 'Saclepea',
      
      // Lofa County
      'Voinjama', 'Kolahun', 'Foya', 'Salayea',
      
      // Grand Bassa County
      'Buchanan', 'Edina', 'Harbel', 'Owensgrove',
      
      // Bomi County
      'Tubmanburg', 'Suehn', 'Klay', 'Dewoin',
      
      // Grand Cape Mount County
      'Robertsport', 'Porkpa', 'Tewor', 'Gola Konneh',
      
      // Grand Gedeh County
      'Zwedru', 'Tchien', 'Konobo', 'Gbarzon',
      
      // Grand Kru County
      'Barclayville', 'Buah', 'Forpoh', 'Garraway'
    ];
  }

  getLiberianTownsVillages() {
    return [
      'New Kru Town', 'West Point', 'Clara Town', 'Logan Town', 'Congo Town',
      'Caldwell', 'Bentol', 'Johnsonville', 'Brewerville', 'Virginia',
      'Bong Mines', 'Yekepa', 'Buchanan Port', 'Greenville', 'Harper',
      'Pleebo', 'Zwedru Town', 'Fish Town', 'Sasstown', 'Rivercess',
      'Cestos City', 'Barrobo', 'Juazohn', 'Karnplay', 'Bopolu',
      'Salala Town', 'Gbatala', 'Totota', 'Kahnple', 'Belefanai',
      'Fassama', 'Zorzor', 'Wiesua', 'Kolahun Town', 'Mendekoma'
    ];
  }

  generateRandomBirthDate(minAge = 0, maxAge = 80) {
    const now = new Date();
    const minDate = new Date(now.getFullYear() - maxAge, 0, 1);
    const maxDate = new Date(now.getFullYear() - minAge, 11, 31);
    
    const randomTime = minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime());
    return new Date(randomTime);
  }

  generateLiberianNames() {
    const maleFirstNames = [
      'Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kwesi', 'Kwadwo', 'Kojo',
      'Joseph', 'John', 'James', 'Robert', 'William', 'David', 'Richard',
      'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
      'Emmanuel', 'Samuel', 'Benjamin', 'Abraham', 'Isaac', 'Jacob',
      'Moses', 'Aaron', 'Elijah', 'Joshua', 'Caleb', 'Nathan',
      'Prince', 'King', 'Noble', 'Blessing', 'Gift', 'Wisdom',
      'Augustine', 'Francis', 'Peter', 'Paul', 'Stephen', 'Michael'
    ];

    const femaleFirstNames = [
      'Ama', 'Akosua', 'Adwoa', 'Yaa', 'Efua', 'Aba', 'Akua',
      'Mary', 'Elizabeth', 'Patricia', 'Jennifer', 'Linda', 'Barbara',
      'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty',
      'Ruth', 'Esther', 'Rebecca', 'Rachel', 'Miriam', 'Hannah',
      'Grace', 'Faith', 'Hope', 'Joy', 'Peace', 'Love', 'Mercy',
      'Princess', 'Queen', 'Angel', 'Blessing', 'Gift', 'Precious',
      'Martha', 'Helen', 'Dorothy', 'Margaret', 'Rose', 'Joyce'
    ];

    const lastNames = [
      'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis',
      'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson',
      'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
      'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker',
      'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright',
      'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez',
      'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
      'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins',
      // Liberian surnames
      'Flomo', 'Konneh', 'Kamara', 'Sesay', 'Fofana', 'Bangura',
      'Mansaray', 'Turay', 'Koroma', 'Conteh', 'Jalloh', 'Barrie',
      'Dumbuya', 'Kargbo', 'Sankoh', 'Tarawally', 'Fornah', 'Suma',
      'Gborie', 'Kallon', 'Massaquoi', 'Kromah', 'Pewee', 'Kollie'
    ];

    return { maleFirstNames, femaleFirstNames, lastNames };
  }

  generateRandomName(sex) {
    const { maleFirstNames, femaleFirstNames, lastNames } = this.generateLiberianNames();
    
    const firstNames = sex === 'M' ? maleFirstNames : femaleFirstNames;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
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

  generatePhoneNumber() {
    const prefixes = ['+231-77', '+231-88', '+231-76', '+231-86'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${prefix}-${number.toString().substring(0, 3)}-${number.toString().substring(3)}`;
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

  async seed(facilities, patientProfiles = []) {
    if (!facilities || facilities.length === 0) {
      throw new Error('Facilities are required to create patients');
    }

    const spinner = ora('Creating patients...').start();
    const patients = [];
    const districts = this.getLiberianDistricts();
    const towns = this.getLiberianTownsVillages();

    const patientCount = parseInt(process.env.PATIENT_COUNT) || 100;

    try {
      for (let i = 0; i < patientCount; i++) {
        const facility = facilities[i % facilities.length];
        const district = districts[Math.floor(Math.random() * districts.length)];
        const sex = Math.random() > 0.5 ? 'M' : 'F';
        const birthDate = this.generateRandomBirthDate(0, 25); // Focus on children and young adults for immunization
        const fullName = this.generateRandomName(sex);
        const { motherName, fatherName } = this.generateParentName(sex);
        
        // Determine if this patient should be linked to a patient profile
        let patientProfileId = null;
        let profileVerificationStatus = 'not_applicable';
        let profileAccessPermissions = [];
        let profileNotificationPreferences = null;
        
        if (patientProfiles.length > 0 && i < patientProfiles.length) {
          const profile = patientProfiles[i];
          patientProfileId = profile.$id;
          profileVerificationStatus = profile.verification_status;
          profileAccessPermissions = profile.access_permissions;
          profileNotificationPreferences = profile.notification_preferences;
        }

        spinner.text = `Creating patient: ${fullName} (${i + 1}/${patientCount})`;

        const patientData = {
          full_name: fullName,
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

        // Add profile-related fields if applicable
        if (patientProfileId) {
          patientData.patient_profile_id = patientProfileId;
          patientData.profile_verification_status = profileVerificationStatus;
          patientData.profile_access_permissions = profileAccessPermissions;
          patientData.profile_notification_preferences = profileNotificationPreferences;
        }

        // Add health worker information for some patients (community health workers)
        if (Math.random() > 0.7) { // 30% have assigned health workers
          const healthWorkerName = this.generateRandomName(Math.random() > 0.5 ? 'M' : 'F');
          patientData.health_worker_name = healthWorkerName;
          patientData.health_worker_phone = this.generatePhoneNumber();
          patientData.health_worker_address = this.generateAddress(district);
        }

        const patient = await this.databases.createDocument(
          this.databaseId,
          this.collectionId,
          ID.unique(),
          patientData
        );

        // Update patient profile with patient ID if linked
        if (patientProfileId) {
          await this.databases.updateDocument(
            this.databaseId,
            this.patientProfilesCollectionId,
            patientProfileId,
            {
              patient_id: patient.$id,
              updated_at: new Date().toISOString()
            }
          );
        }

        patients.push(patient);

        // Small delay to avoid rate limits
        if (i < patientCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      spinner.succeed(`Created ${patients.length} patients`);

      // Log statistics
      const stats = {
        total: patients.length,
        male: patients.filter(p => p.sex === 'M').length,
        female: patients.filter(p => p.sex === 'F').length,
        withProfiles: patients.filter(p => p.patient_profile_id).length,
        withHealthWorkers: patients.filter(p => p.health_worker_name).length,
        withPhones: patients.filter(p => p.contact_phone).length
      };

      console.log(chalk.blue('\n📊 Patient Statistics:'));
      console.log(`   Total: ${stats.total}`);
      console.log(`   Male: ${stats.male} (${Math.round(stats.male/stats.total*100)}%)`);
      console.log(`   Female: ${stats.female} (${Math.round(stats.female/stats.total*100)}%)`);
      console.log(`   With Profiles: ${stats.withProfiles}`);
      console.log(`   With Health Workers: ${stats.withHealthWorkers}`);
      console.log(`   With Phone Numbers: ${stats.withPhones}`);

      return patients;

    } catch (error) {
      spinner.fail(`Failed to create patients: ${error.message}`);
      throw error;
    }
  }

  async clean() {
    const spinner = ora('Cleaning patients...').start();
    
    try {
      const response = await this.databases.listDocuments(this.databaseId, this.collectionId);
      
      for (const doc of response.documents) {
        await this.databases.deleteDocument(this.databaseId, this.collectionId, doc.$id);
      }

      spinner.succeed(`Cleaned ${response.documents.length} patients`);
    } catch (error) {
      spinner.fail(`Failed to clean patients: ${error.message}`);
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
  const seeder = new PatientSeeder(client, databaseId);

  console.error(chalk.red('❌ This seeder requires facilities to be created first.'));
  console.log(chalk.yellow('Please run the main database seeder or create facilities first.'));
  process.exit(1);
}

module.exports = PatientSeeder;