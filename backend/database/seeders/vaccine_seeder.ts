import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Vaccine from '#models/vaccine'

export default class extends BaseSeeder {
  async run() {
    // Liberia EPI Standard Vaccines
    const vaccines = [
      // BCG (Anti-TB)
      {
        name: 'BCG (Anti-TB)',
        description: 'Bacillus Calmette-Guérin vaccine for tuberculosis prevention',
        vaccineCode: 'BCG',
        sequenceNumber: 1,
        vaccineSeries: 'BCG',
        standardScheduleAge: 'At birth',
        isSupplementary: false,
        isActive: true
      },

      // OPV Series (Oral Polio Vaccine)
      {
        name: 'OPV-0 (Birth dose)',
        description: 'Oral Polio Vaccine - birth dose for polio prevention',
        vaccineCode: 'OPV0',
        sequenceNumber: 0,
        vaccineSeries: 'OPV',
        standardScheduleAge: 'At birth',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'OPV-1',
        description: 'Oral Polio Vaccine - first dose for polio prevention',
        vaccineCode: 'OPV1',
        sequenceNumber: 1,
        vaccineSeries: 'OPV',
        standardScheduleAge: '6 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'OPV-2',
        description: 'Oral Polio Vaccine - second dose for polio prevention',
        vaccineCode: 'OPV2',
        sequenceNumber: 2,
        vaccineSeries: 'OPV',
        standardScheduleAge: '10 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'OPV-3',
        description: 'Oral Polio Vaccine - third dose for polio prevention',
        vaccineCode: 'OPV3',
        sequenceNumber: 3,
        vaccineSeries: 'OPV',
        standardScheduleAge: '14 weeks',
        isSupplementary: false,
        isActive: true
      },

      // Penta Series (Pentavalent)
      {
        name: 'Penta-1 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccineCode: 'PENTA1',
        sequenceNumber: 1,
        vaccineSeries: 'Penta',
        standardScheduleAge: '6 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'Penta-2 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccineCode: 'PENTA2',
        sequenceNumber: 2,
        vaccineSeries: 'Penta',
        standardScheduleAge: '10 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'Penta-3 (DTP-HepB-Hib)',
        description: 'Pentavalent vaccine - protects against diphtheria, tetanus, pertussis, hepatitis B, and Hib',
        vaccineCode: 'PENTA3',
        sequenceNumber: 3,
        vaccineSeries: 'Penta',
        standardScheduleAge: '14 weeks',
        isSupplementary: false,
        isActive: true
      },

      // PCV Series (Pneumococcal Conjugate Vaccine)
      {
        name: 'PCV-1 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccineCode: 'PCV1',
        sequenceNumber: 1,
        vaccineSeries: 'PCV',
        standardScheduleAge: '6 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'PCV-2 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccineCode: 'PCV2',
        sequenceNumber: 2,
        vaccineSeries: 'PCV',
        standardScheduleAge: '10 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'PCV-3 (Pneumococcal)',
        description: 'Pneumococcal conjugate vaccine - protects against pneumococcal diseases',
        vaccineCode: 'PCV3',
        sequenceNumber: 3,
        vaccineSeries: 'PCV',
        standardScheduleAge: '14 weeks',
        isSupplementary: false,
        isActive: true
      },

      // Rota Series (Rotavirus)
      {
        name: 'Rota-1 (Rotavirus)',
        description: 'Rotavirus vaccine - protects against severe diarrhea caused by rotavirus',
        vaccineCode: 'ROTA1',
        sequenceNumber: 1,
        vaccineSeries: 'Rota',
        standardScheduleAge: '6 weeks',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'Rota-2 (Rotavirus)',
        description: 'Rotavirus vaccine - protects against severe diarrhea caused by rotavirus',
        vaccineCode: 'ROTA2',
        sequenceNumber: 2,
        vaccineSeries: 'Rota',
        standardScheduleAge: '10 weeks',
        isSupplementary: false,
        isActive: true
      },

      // IPV (Inactivated Polio Vaccine)
      {
        name: 'IPV (Inactivated Polio)',
        description: 'Inactivated polio vaccine - provides additional polio protection',
        vaccineCode: 'IPV',
        sequenceNumber: 1,
        vaccineSeries: 'IPV',
        standardScheduleAge: '14 weeks',
        isSupplementary: false,
        isActive: true
      },

      // MCV Series (Measles-Containing Vaccine)
      {
        name: 'MCV-1 (Measles)',
        description: 'Measles-containing vaccine - first dose for measles protection',
        vaccineCode: 'MCV1',
        sequenceNumber: 1,
        vaccineSeries: 'MCV',
        standardScheduleAge: '9 months',
        isSupplementary: false,
        isActive: true
      },
      {
        name: 'MCV-2 (Measles)',
        description: 'Measles-containing vaccine - second dose for measles protection',
        vaccineCode: 'MCV2',
        sequenceNumber: 2,
        vaccineSeries: 'MCV',
        standardScheduleAge: '15 months',
        isSupplementary: false,
        isActive: true
      },

      // Yellow Fever
      {
        name: 'Yellow Fever',
        description: 'Yellow fever vaccine - protects against yellow fever virus',
        vaccineCode: 'YF',
        sequenceNumber: 1,
        vaccineSeries: 'YF',
        standardScheduleAge: '9 months',
        isSupplementary: false,
        isActive: true
      },

      // TCV (Typhoid Conjugate Vaccine)
      {
        name: 'TCV (Typhoid)',
        description: 'Typhoid conjugate vaccine - protects against typhoid fever',
        vaccineCode: 'TCV',
        sequenceNumber: 1,
        vaccineSeries: 'TCV',
        standardScheduleAge: '9 months',
        isSupplementary: false,
        isActive: true
      },

      // Vitamin A Series
      {
        name: 'Vitamin A-1',
        description: 'Vitamin A supplementation - first dose for child health',
        vaccineCode: 'VITA1',
        sequenceNumber: 1,
        vaccineSeries: 'Vitamin A',
        standardScheduleAge: '6 months',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'Vitamin A-2',
        description: 'Vitamin A supplementation - second dose for child health',
        vaccineCode: 'VITA2',
        sequenceNumber: 2,
        vaccineSeries: 'Vitamin A',
        standardScheduleAge: '12 months',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'Vitamin A-3',
        description: 'Vitamin A supplementation - third dose for child health',
        vaccineCode: 'VITA3',
        sequenceNumber: 3,
        vaccineSeries: 'Vitamin A',
        standardScheduleAge: '18 months',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'Vitamin A-4',
        description: 'Vitamin A supplementation - fourth dose for child health',
        vaccineCode: 'VITA4',
        sequenceNumber: 4,
        vaccineSeries: 'Vitamin A',
        standardScheduleAge: '24 months',
        isSupplementary: true,
        isActive: true
      },

      // Tetanus Toxoid for Pregnant Women
      {
        name: 'TT-1 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - first dose',
        vaccineCode: 'TT1',
        sequenceNumber: 1,
        vaccineSeries: 'TT',
        standardScheduleAge: 'First contact',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'TT-2 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - second dose',
        vaccineCode: 'TT2',
        sequenceNumber: 2,
        vaccineSeries: 'TT',
        standardScheduleAge: '4 weeks after TT1',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'TT-3 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - third dose',
        vaccineCode: 'TT3',
        sequenceNumber: 3,
        vaccineSeries: 'TT',
        standardScheduleAge: '6 months after TT2',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'TT-4 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - fourth dose',
        vaccineCode: 'TT4',
        sequenceNumber: 4,
        vaccineSeries: 'TT',
        standardScheduleAge: '1 year after TT3',
        isSupplementary: true,
        isActive: true
      },
      {
        name: 'TT-5 (Tetanus Toxoid)',
        description: 'Tetanus toxoid for pregnant women - fifth dose',
        vaccineCode: 'TT5',
        sequenceNumber: 5,
        vaccineSeries: 'TT',
        standardScheduleAge: '1 year after TT4',
        isSupplementary: true,
        isActive: true
      }
    ]

    // Insert all vaccines
    await Vaccine.createMany(vaccines)

    console.log('Liberia EPI vaccines seeded successfully!')
    console.log(`Total vaccines added: ${vaccines.length}`)
  }
}
