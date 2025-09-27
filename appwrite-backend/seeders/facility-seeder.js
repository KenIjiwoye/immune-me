const { Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class FacilitySeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
    this.collectionId = 'facilities';
  }

  getFacilityData() {
    return [
      // Montserrado County (Monrovia area)
      {
        name: 'John F. Kennedy Medical Center',
        district: 'Monrovia',
        address: 'Sinkor, Tubman Boulevard, Monrovia',
        contact_phone: '+231-77-555-0001'
      },
      {
        name: 'Redemption Hospital',
        district: 'Monrovia',
        address: 'New Kru Town, Bushrod Island, Monrovia',
        contact_phone: '+231-77-555-0002'
      },
      {
        name: 'ELWA Hospital',
        district: 'Paynesville',
        address: 'ELWA Junction, Paynesville City',
        contact_phone: '+231-77-555-0003'
      },
      {
        name: 'Liberia Government Hospital',
        district: 'Monrovia',
        address: 'Capitol Hill, Monrovia',
        contact_phone: '+231-77-555-0004'
      },
      {
        name: 'St. Joseph Catholic Hospital',
        district: 'Monrovia',
        address: 'Broad Street, Monrovia',
        contact_phone: '+231-77-555-0005'
      },

      // Margibi County
      {
        name: 'Firestone Medical Center',
        district: 'Harbel',
        address: 'Firestone Plantation, Harbel',
        contact_phone: '+231-77-555-0006'
      },
      {
        name: 'Kakata Government Hospital',
        district: 'Kakata',
        address: 'Kakata City Center, Margibi County',
        contact_phone: '+231-77-555-0007'
      },

      // Bong County
      {
        name: 'Phebe Hospital',
        district: 'Suakoko',
        address: 'Phebe Training Hospital, Suakoko District',
        contact_phone: '+231-77-555-0008'
      },
      {
        name: 'Gbarnga Government Hospital',
        district: 'Gbarnga',
        address: 'Gbarnga City, Bong County',
        contact_phone: '+231-77-555-0009'
      },

      // Nimba County
      {
        name: 'Ganta United Methodist Hospital',
        district: 'Ganta',
        address: 'Ganta City, Nimba County',
        contact_phone: '+231-77-555-0010'
      },
      {
        name: 'Sanniquellie Government Hospital',
        district: 'Sanniquellie',
        address: 'Sanniquellie City, Nimba County',
        contact_phone: '+231-77-555-0011'
      },

      // Lofa County
      {
        name: 'Tellewoyan Memorial Hospital',
        district: 'Voinjama',
        address: 'Voinjama City, Lofa County',
        contact_phone: '+231-77-555-0012'
      },

      // Grand Bassa County
      {
        name: 'Buchanan Government Hospital',
        district: 'Buchanan',
        address: 'Buchanan City, Grand Bassa County',
        contact_phone: '+231-77-555-0013'
      },

      // Community Health Centers
      {
        name: 'West Point Community Health Center',
        district: 'Monrovia',
        address: 'West Point Township, Monrovia',
        contact_phone: '+231-77-555-0014'
      },
      {
        name: 'Clara Town Community Clinic',
        district: 'Monrovia',
        address: 'Clara Town, Bushrod Island, Monrovia',
        contact_phone: '+231-77-555-0015'
      },
      {
        name: 'Logan Town Health Center',
        district: 'Monrovia',
        address: 'Logan Town, Monrovia',
        contact_phone: '+231-77-555-0016'
      },
      {
        name: 'Caldwell Health Center',
        district: 'Montserrado',
        address: 'Caldwell Township, Montserrado County',
        contact_phone: '+231-77-555-0017'
      },
      {
        name: 'Bentol City Health Center',
        district: 'Montserrado',
        address: 'Bentol City, Montserrado County',
        contact_phone: '+231-77-555-0018'
      },

      // Rural Health Centers
      {
        name: 'Bomi Hills Health Center',
        district: 'Tubmanburg',
        address: 'Bomi Hills, Bomi County',
        contact_phone: '+231-77-555-0019'
      },
      {
        name: 'Robertsport Health Center',
        district: 'Robertsport',
        address: 'Robertsport City, Grand Cape Mount County',
        contact_phone: '+231-77-555-0020'
      },
      {
        name: 'Zwedru Government Hospital',
        district: 'Zwedru',
        address: 'Zwedru City, Grand Gedeh County',
        contact_phone: '+231-77-555-0021'
      },

      // Specialized Clinics
      {
        name: 'Monrovia Central Immunization Clinic',
        district: 'Monrovia',
        address: 'Broad Street, Central Monrovia',
        contact_phone: '+231-77-555-0022'
      },
      {
        name: 'Paynesville Maternal Health Center',
        district: 'Paynesville',
        address: 'Red Light Market Area, Paynesville',
        contact_phone: '+231-77-555-0023'
      },
      {
        name: 'Sinkor Primary Healthcare Center',
        district: 'Monrovia',
        address: 'Sinkor Community, Monrovia',
        contact_phone: '+231-77-555-0024'
      },
      {
        name: 'Congo Town Health Post',
        district: 'Monrovia',
        address: 'Congo Town Community, Monrovia',
        contact_phone: '+231-77-555-0025'
      }
    ];
  }

  async seed() {
    const spinner = ora('Creating facilities...').start();
    const facilities = [];
    const facilityData = this.getFacilityData();

    try {
      for (let i = 0; i < facilityData.length; i++) {
        const facility = facilityData[i];
        
        spinner.text = `Creating facility: ${facility.name} (${i + 1}/${facilityData.length})`;

        const document = await this.databases.createDocument(
          this.databaseId,
          this.collectionId,
          ID.unique(),
          {
            ...facility,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );

        facilities.push(document);

        // Small delay to avoid rate limits
        if (i < facilityData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      spinner.succeed(`Created ${facilities.length} facilities`);
      return facilities;

    } catch (error) {
      spinner.fail(`Failed to create facilities: ${error.message}`);
      throw error;
    }
  }

  async clean() {
    const spinner = ora('Cleaning facilities...').start();
    
    try {
      const response = await this.databases.listDocuments(this.databaseId, this.collectionId);
      
      for (const doc of response.documents) {
        await this.databases.deleteDocument(this.databaseId, this.collectionId, doc.$id);
      }

      spinner.succeed(`Cleaned ${response.documents.length} facilities`);
    } catch (error) {
      spinner.fail(`Failed to clean facilities: ${error.message}`);
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
  const seeder = new FacilitySeeder(client, databaseId);

  seeder.seed()
    .then(() => {
      console.log(chalk.green('✅ Facility seeding completed successfully!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('❌ Facility seeding failed:'), error.message);
      process.exit(1);
    });
}

module.exports = FacilitySeeder;