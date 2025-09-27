const { Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class ImmunizationSeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
    this.collectionId = 'immunization_records';
  }

  // Convert age strings to days for calculation
  parseScheduleAge(ageString) {
    if (!ageString) return 0;
    
    const lowerAge = ageString.toLowerCase();
    
    if (lowerAge.includes('birth') || lowerAge.includes('at birth')) {
      return 0;
    }
    
    if (lowerAge.includes('week')) {
      const weeks = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return weeks * 7;
    }
    
    if (lowerAge.includes('month')) {
      const months = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return months * 30; // Approximate
    }
    
    if (lowerAge.includes('year')) {
      const years = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return years * 365;
    }
    
    // Handle special cases
    if (lowerAge.includes('first contact')) {
      return 180; // Assume 6 months for pregnant women
    }
    
    if (lowerAge.includes('after')) {
      // For TT series - approximate intervals
      if (lowerAge.includes('4 weeks')) return 28;
      if (lowerAge.includes('6 months')) return 180;
      if (lowerAge.includes('1 year')) return 365;
    }
    
    return 0;
  }

  // Calculate if a patient should have received a vaccine by now
  shouldHaveVaccine(patientBirthDate, vaccineScheduleAge, currentDate = new Date()) {
    const birthDate = new Date(patientBirthDate);
    const scheduleDays = this.parseScheduleAge(vaccineScheduleAge);
    const scheduledDate = new Date(birthDate.getTime() + (scheduleDays * 24 * 60 * 60 * 1000));
    
    return currentDate >= scheduledDate;
  }

  // Generate realistic administration date
  generateAdministrationDate(patientBirthDate, vaccineScheduleAge) {
    const birthDate = new Date(patientBirthDate);
    const scheduleDays = this.parseScheduleAge(vaccineScheduleAge);
    const idealDate = new Date(birthDate.getTime() + (scheduleDays * 24 * 60 * 60 * 1000));
    
    // Add some realistic variation (±7 days for most vaccines)
    const variation = (Math.random() - 0.5) * 14; // ±7 days
    const actualDate = new Date(idealDate.getTime() + (variation * 24 * 60 * 60 * 1000));
    
    // Ensure date is not in the future
    const now = new Date();
    return actualDate > now ? now : actualDate;
  }

  // Generate batch numbers
  generateBatchNumber(vaccineCode) {
    const year = new Date().getFullYear();
    const batch = Math.floor(Math.random() * 999) + 1;
    return `${vaccineCode}-${year}-${batch.toString().padStart(3, '0')}`;
  }

  // Generate return date for next vaccine
  generateReturnDate(administrationDate, vaccine, allVaccines) {
    const adminDate = new Date(administrationDate);
    
    // Find next vaccine in the same series
    const nextVaccine = allVaccines.find(v => 
      v.vaccine_series === vaccine.vaccine_series && 
      v.sequence_number === vaccine.sequence_number + 1
    );
    
    if (nextVaccine) {
      const currentScheduleDays = this.parseScheduleAge(vaccine.standard_schedule_age);
      const nextScheduleDays = this.parseScheduleAge(nextVaccine.standard_schedule_age);
      const intervalDays = nextScheduleDays - currentScheduleDays;
      
      if (intervalDays > 0) {
        return new Date(adminDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
      }
    }
    
    // Default return dates based on vaccine type
    if (vaccine.vaccine_series === 'Vitamin A') {
      return new Date(adminDate.getTime() + (180 * 24 * 60 * 60 * 1000)); // 6 months
    }
    
    if (vaccine.vaccine_series === 'TT') {
      return new Date(adminDate.getTime() + (28 * 24 * 60 * 60 * 1000)); // 4 weeks
    }
    
    return null;
  }

  // Determine schedule status
  getScheduleStatus(patientBirthDate, vaccineScheduleAge, administrationDate) {
    const birthDate = new Date(patientBirthDate);
    const scheduleDays = this.parseScheduleAge(vaccineScheduleAge);
    const idealDate = new Date(birthDate.getTime() + (scheduleDays * 24 * 60 * 60 * 1000));
    const adminDate = new Date(administrationDate);
    
    const daysDifference = Math.abs((adminDate - idealDate) / (1000 * 60 * 60 * 24));
    
    if (daysDifference <= 7) return 'on_schedule';
    if (daysDifference <= 30) return 'delayed';
    return 'missed';
  }

  // Generate realistic notes
  generateNotes(vaccine, scheduleStatus, patient) {
    const notes = [];
    
    if (scheduleStatus === 'delayed') {
      notes.push('Patient presented late for scheduled vaccination');
    }
    
    if (scheduleStatus === 'missed') {
      notes.push('Catch-up vaccination administered');
    }
    
    if (vaccine.vaccine_series === 'TT') {
      notes.push('Administered during antenatal care visit');
    }
    
    if (vaccine.is_supplementary) {
      notes.push('Supplementary immunization');
    }
    
    // Random additional notes
    const additionalNotes = [
      'No adverse reactions observed',
      'Patient tolerated vaccine well',
      'Counseling provided to caregiver',
      'Next appointment scheduled',
      'Vaccination card updated'
    ];
    
    if (Math.random() > 0.5) {
      notes.push(additionalNotes[Math.floor(Math.random() * additionalNotes.length)]);
    }
    
    return notes.length > 0 ? notes.join('. ') + '.' : null;
  }

  async seed(patients, vaccines, facilities, employeeProfiles) {
    if (!patients || patients.length === 0) {
      throw new Error('Patients are required to create immunization records');
    }
    if (!vaccines || vaccines.length === 0) {
      throw new Error('Vaccines are required to create immunization records');
    }
    if (!facilities || facilities.length === 0) {
      throw new Error('Facilities are required to create immunization records');
    }
    if (!employeeProfiles || employeeProfiles.length === 0) {
      throw new Error('Employee profiles are required to create immunization records');
    }

    const spinner = ora('Creating immunization records...').start();
    const immunizationRecords = [];
    
    // Filter healthcare workers who can administer vaccines
    const healthcareWorkers = employeeProfiles.filter(profile => 
      ['doctor', 'nurse', 'supervisor'].includes(profile.employee_type)
    );

    try {
      let recordCount = 0;
      const totalEstimated = patients.length * 8; // Estimate 8 vaccines per patient on average

      for (let i = 0; i < patients.length; i++) {
        const patient = patients[i];
        const patientAge = Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
        
        spinner.text = `Processing patient: ${patient.full_name} (${i + 1}/${patients.length})`;

        // Determine which vaccines this patient should have received
        const eligibleVaccines = vaccines.filter(vaccine => {
          // Skip TT vaccines for children (they're for pregnant women)
          if (vaccine.vaccine_series === 'TT' && patientAge < 15) {
            return false;
          }
          
          // Check if patient should have received this vaccine by now
          return this.shouldHaveVaccine(patient.date_of_birth, vaccine.standard_schedule_age);
        });

        // Create immunization records for eligible vaccines
        for (const vaccine of eligibleVaccines) {
          // Not all patients will have all vaccines (simulate real-world compliance)
          const complianceRate = vaccine.is_supplementary ? 0.7 : 0.85; // Lower compliance for supplementary
          
          if (Math.random() > complianceRate) {
            continue; // Skip this vaccine for this patient
          }

          const administrationDate = this.generateAdministrationDate(
            patient.date_of_birth, 
            vaccine.standard_schedule_age
          );
          
          const scheduleStatus = this.getScheduleStatus(
            patient.date_of_birth,
            vaccine.standard_schedule_age,
            administrationDate
          );

          // Select healthcare worker and facility
          const healthcareWorker = healthcareWorkers[Math.floor(Math.random() * healthcareWorkers.length)];
          const facility = facilities.find(f => f.$id === patient.facility_id) || 
                          facilities[Math.floor(Math.random() * facilities.length)];

          const immunizationData = {
            patient_id: patient.$id,
            vaccine_id: vaccine.$id,
            administered_date: administrationDate.toISOString(),
            administered_by_user_id: healthcareWorker.user_id,
            facility_id: facility.$id,
            batch_number: this.generateBatchNumber(vaccine.vaccine_code),
            health_officer: Math.random() > 0.3 ? 
              `Dr. ${healthcareWorker.user_id.substring(0, 8)}` : null,
            return_date: this.generateReturnDate(administrationDate, vaccine, vaccines)?.toISOString() || null,
            is_standard_schedule: !vaccine.is_supplementary,
            schedule_status: scheduleStatus,
            notes: this.generateNotes(vaccine, scheduleStatus, patient),
            
            // Profile-related fields
            administered_by_profile_id: healthcareWorker.$id,
            administered_by_employee_id: healthcareWorker.employee_id,
            administered_by_professional_title: healthcareWorker.professional_title,
            administered_by_license_number: healthcareWorker.license_number,
            administered_by_specializations: healthcareWorker.specializations,
            
            // Quality assurance (random for some records)
            quality_assurance_verified: Math.random() > 0.3,
            verification_timestamp: Math.random() > 0.3 ? 
              new Date(administrationDate.getTime() + (24 * 60 * 60 * 1000)).toISOString() : null,
            
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const record = await this.databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            immunizationData
          );

          immunizationRecords.push(record);
          recordCount++;

          // Update spinner with progress
          if (recordCount % 10 === 0) {
            spinner.text = `Created ${recordCount} immunization records...`;
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      spinner.succeed(`Created ${immunizationRecords.length} immunization records`);

      // Generate statistics
      const stats = {
        total: immunizationRecords.length,
        onSchedule: immunizationRecords.filter(r => r.schedule_status === 'on_schedule').length,
        delayed: immunizationRecords.filter(r => r.schedule_status === 'delayed').length,
        missed: immunizationRecords.filter(r => r.schedule_status === 'missed').length,
        verified: immunizationRecords.filter(r => r.quality_assurance_verified).length,
        supplementary: immunizationRecords.filter(r => !r.is_standard_schedule).length
      };

      console.log(chalk.blue('\n📊 Immunization Records Statistics:'));
      console.log(`   Total Records: ${stats.total}`);
      console.log(`   On Schedule: ${stats.onSchedule} (${Math.round(stats.onSchedule/stats.total*100)}%)`);
      console.log(`   Delayed: ${stats.delayed} (${Math.round(stats.delayed/stats.total*100)}%)`);
      console.log(`   Missed: ${stats.missed} (${Math.round(stats.missed/stats.total*100)}%)`);
      console.log(`   QA Verified: ${stats.verified} (${Math.round(stats.verified/stats.total*100)}%)`);
      console.log(`   Supplementary: ${stats.supplementary} (${Math.round(stats.supplementary/stats.total*100)}%)`);

      // Vaccine series breakdown
      const seriesBreakdown = immunizationRecords.reduce((acc, record) => {
        const vaccine = vaccines.find(v => v.$id === record.vaccine_id);
        if (vaccine) {
          const series = vaccine.vaccine_series;
          acc[series] = (acc[series] || 0) + 1;
        }
        return acc;
      }, {});

      console.log(chalk.blue('\n📈 Records by Vaccine Series:'));
      Object.entries(seriesBreakdown)
        .sort(([,a], [,b]) => b - a)
        .forEach(([series, count]) => {
          console.log(`   ${series}: ${count} records`);
        });

      return immunizationRecords;

    } catch (error) {
      spinner.fail(`Failed to create immunization records: ${error.message}`);
      throw error;
    }
  }

  async clean() {
    const spinner = ora('Cleaning immunization records...').start();
    
    try {
      const response = await this.databases.listDocuments(this.databaseId, this.collectionId);
      
      for (const doc of response.documents) {
        await this.databases.deleteDocument(this.databaseId, this.collectionId, doc.$id);
      }

      spinner.succeed(`Cleaned ${response.documents.length} immunization records`);
    } catch (error) {
      spinner.fail(`Failed to clean immunization records: ${error.message}`);
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
  const seeder = new ImmunizationSeeder(client, databaseId);

  console.error(chalk.red('❌ This seeder requires patients, vaccines, facilities, and employee profiles.'));
  console.log(chalk.yellow('Please run the main database seeder.'));
  process.exit(1);
}

module.exports = ImmunizationSeeder;