const { Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class VaccineSeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
    this.collectionId = 'vaccines';
  }

  getVaccineData() {
    // Based on Liberia EPI Standard Vaccines from backend seeder
    return [
      // BCG (Anti-TB)
      {
        name: 'BCG (Anti-TB)',
        description: 'Bacillus Calmette-Guérin vaccine for tuberculosis prevention',
        vaccine_code: 'BCG',
        sequence_number: 1,
        vaccine_series: 'BCG',
        standard_schedule_age: 'At birth',
        is_supplementary: false,
        is_active: true
      },

      // OPV Series (Oral Polio Vaccine)
      {
        name: 'OPV-0 (Birth dose)',
        description: 'Oral Polio Vaccine - birth dose for polio prevention',
        vaccine_code: 'OPV0',
        sequence_number: 0,
        vaccine_series: 'OPV',
        standard_schedule_age: 'At birth',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'OPV-1',
        description: 'Oral Polio Vaccine - first dose for polio prevention',
        vaccine_code: 'OPV1',
        sequence_number: 1,
        vaccine_series: 'OPV',
        standard_schedule_age: '6 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'OPV-2',
        description: 'Oral Polio Vaccine - second dose for polio prevention',
        vaccine_code: 'OPV2',
        sequence_number: 2,
        vaccine_series: 'OPV',
        standard_schedule_age: '10 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'OPV-3',
        description: 'Oral Polio Vaccine - third dose for polio prevention',
        vaccine_code: 'OPV3',
        sequence_number: 3,
        vaccine_series: 'OPV',
        standard_schedule_age: '14 weeks',
        is_supplementary: false,
        is_active: true
      },

      // Penta Series (Pentavalent)
      {
        name: 'Penta-1 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccine_code: 'PENTA1',
        sequence_number: 1,
        vaccine_series: 'Penta',
        standard_schedule_age: '6 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'Penta-2 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccine_code: 'PENTA2',
        sequence_number: 2,
        vaccine_series: 'Penta',
        standard_schedule_age: '10 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'Penta-3 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccine_code: 'PENTA3',
        sequence_number: 3,
        vaccine_series: 'Penta',
        standard_schedule_age: '14 weeks',
        is_supplementary: false,
        is_active: true
      },

      // PCV Series (Pneumococcal Conjugate Vaccine)
      {
        name: 'PCV-1 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccine_code: 'PCV1',
        sequence_number: 1,
        vaccine_series: 'PCV',
        standard_schedule_age: '6 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'PCV-2 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccine_code: 'PCV2',
        sequence_number: 2,
        vaccine_series: 'PCV',
        standard_schedule_age: '10 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'PCV-3 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccine_code: 'PCV3',
        sequence_number: 3,
        vaccine_series: 'PCV',
        standard_schedule_age: '14 weeks',
        is_supplementary: false,
        is_active: true
      },

      // Rota Series (Rotavirus)
      {
        name: 'Rota-1 (Rotavirus)',
        description: 'Rotavirus vaccine - protects against severe diarrhea caused by rotavirus',
        vaccine_code: 'ROTA1',
        sequence_number: 1,
        vaccine_series: 'Rota',
        standard_schedule_age: '6 weeks',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'Rota-2 (Rotavirus)',
        description: 'Rotavirus vaccine - protects against severe diarrhea caused by rotavirus',
        vaccine_code: 'ROTA2',
        sequence_number: 2,
        vaccine_series: 'Rota',
        standard_schedule_age: '10 weeks',
        is_supplementary: false,
        is_active: true
      },

      // IPV (Inactivated Polio Vaccine)
      {
        name: 'IPV (Inactivated Polio)',
        description: 'Inactivated polio vaccine - provides additional polio protection',
        vaccine_code: 'IPV',
        sequence_number: 1,
        vaccine_series: 'IPV',
        standard_schedule_age: '14 weeks',
        is_supplementary: false,
        is_active: true
      },

      // MCV Series (Measles-Containing Vaccine)
      {
        name: 'MCV-1 (Measles)',
        description: 'Measles-containing vaccine - first dose for measles protection',
        vaccine_code: 'MCV1',
        sequence_number: 1,
        vaccine_series: 'MCV',
        standard_schedule_age: '9 months',
        is_supplementary: false,
        is_active: true
      },
      {
        name: 'MCV-2 (Measles)',
        description: 'Measles-containing vaccine - second dose for measles protection',
        vaccine_code: 'MCV2',
        sequence_number: 2,
        vaccine_series: 'MCV',
        standard_schedule_age: '15 months',
        is_supplementary: false,
        is_active: true
      },

      // Yellow Fever
      {
        name: 'Yellow Fever',
        description: 'Yellow fever vaccine - protects against yellow fever virus',
        vaccine_code: 'YF',
        sequence_number: 1,
        vaccine_series: 'YF',
        standard_schedule_age: '9 months',
        is_supplementary: false,
        is_active: true
      },

      // TCV (Typhoid Conjugate Vaccine)
      {
        name: 'TCV (Typhoid)',
        description: 'Typhoid conjugate vaccine - protects against typhoid fever',
        vaccine_code: 'TCV',
        sequence_number: 1,
        vaccine_series: 'TCV',
        standard_schedule_age: '9 months',
        is_supplementary: false,
        is_active: true
      },

      // Vitamin A Series
      {
        name: 'Vitamin A-1',
        description: 'Vitamin A supplementation - first dose for child health',
        vaccine_code: 'VITA1',
        sequence_number: 1,
        vaccine_series: 'Vitamin A',
        standard_schedule_age: '6 months',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'Vitamin A-2',
        description: 'Vitamin A supplementation - second dose for child health',
        vaccine_code: 'VITA2',
        sequence_number: 2,
        vaccine_series: 'Vitamin A',
        standard_schedule_age: '12 months',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'Vitamin A-3',
        description: 'Vitamin A supplementation - third dose for child health',
        vaccine_code: 'VITA3',
        sequence_number: 3,
        vaccine_series: 'Vitamin A',
        standard_schedule_age: '18 months',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'Vitamin A-4',
        description: 'Vitamin A supplementation - fourth dose for child health',
        vaccine_code: 'VITA4',
        sequence_number: 4,
        vaccine_series: 'Vitamin A',
        standard_schedule_age: '24 months',
        is_supplementary: true,
        is_active: true
      },

      // Tetanus Toxoid for Pregnant Women
      {
        name: 'TT-1 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - first dose',
        vaccine_code: 'TT1',
        sequence_number: 1,
        vaccine_series: 'TT',
        standard_schedule_age: 'First contact',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'TT-2 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - second dose',
        vaccine_code: 'TT2',
        sequence_number: 2,
        vaccine_series: 'TT',
        standard_schedule_age: '4 weeks after TT1',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'TT-3 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - third dose',
        vaccine_code: 'TT3',
        sequence_number: 3,
        vaccine_series: 'TT',
        standard_schedule_age: '6 months after TT2',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'TT-4 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - fourth dose',
        vaccine_code: 'TT4',
        sequence_number: 4,
        vaccine_series: 'TT',
        standard_schedule_age: '1 year after TT3',
        is_supplementary: true,
        is_active: true
      },
      {
        name: 'TT-5 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - fifth dose',
        vaccine_code: 'TT5',
        sequence_number: 5,
        vaccine_series: 'TT',
        standard_schedule_age: '1 year after TT4',
        is_supplementary: true,
        is_active: true
      }
    ];
  }

  async seed() {
    const spinner = ora('Creating vaccines...').start();
    const vaccines = [];
    const vaccineData = this.getVaccineData();

    try {
      for (let i = 0; i < vaccineData.length; i++) {
        const vaccine = vaccineData[i];
        
        spinner.text = `Creating vaccine: ${vaccine.name} (${i + 1}/${vaccineData.length})`;

        const document = await this.databases.createDocument(
          this.databaseId,
          this.collectionId,
          ID.unique(),
          {
            ...vaccine,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );

        vaccines.push(document);

        // Small delay to avoid rate limits
        if (i < vaccineData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      spinner.succeed(`Created ${vaccines.length} vaccines`);
      
      // Log summary by series
      const seriesSummary = vaccines.reduce((acc, vaccine) => {
        const series = vaccine.vaccine_series;
        if (!acc[series]) {
          acc[series] = { count: 0, supplementary: vaccine.is_supplementary };
        }
        acc[series].count++;
        return acc;
      }, {});

      console.log(chalk.blue('\n📊 Vaccine Series Summary:'));
      Object.entries(seriesSummary).forEach(([series, info]) => {
        const type = info.supplementary ? '(Supplementary)' : '(Standard)';
        console.log(`   ${series}: ${info.count} vaccines ${type}`);
      });

      return vaccines;

    } catch (error) {
      spinner.fail(`Failed to create vaccines: ${error.message}`);
      throw error;
    }
  }

  async clean() {
    const spinner = ora('Cleaning vaccines...').start();
    
    try {
      const response = await this.databases.listDocuments(this.databaseId, this.collectionId);
      
      for (const doc of response.documents) {
        await this.databases.deleteDocument(this.databaseId, this.collectionId, doc.$id);
      }

      spinner.succeed(`Cleaned ${response.documents.length} vaccines`);
    } catch (error) {
      spinner.fail(`Failed to clean vaccines: ${error.message}`);
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
  const seeder = new VaccineSeeder(client, databaseId);

  seeder.seed()
    .then(() => {
      console.log(chalk.green('✅ Vaccine seeding completed successfully!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('❌ Vaccine seeding failed:'), error.message);
      process.exit(1);
    });
}

module.exports = VaccineSeeder;