const { Databases, ID } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class NotificationSeeder {
  constructor(client, databaseId) {
    this.databases = new Databases(client);
    this.databaseId = databaseId;
    this.collectionId = 'notifications';
  }

  // Parse vaccine schedule age to calculate due dates
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
      return months * 30;
    }
    
    if (lowerAge.includes('year')) {
      const years = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return years * 365;
    }
    
    return 180; // Default 6 months for special cases
  }

  // Calculate due date for a vaccine based on patient birth date
  calculateDueDate(patientBirthDate, vaccineScheduleAge) {
    const birthDate = new Date(patientBirthDate);
    const scheduleDays = this.parseScheduleAge(vaccineScheduleAge);
    return new Date(birthDate.getTime() + (scheduleDays * 24 * 60 * 60 * 1000));
  }

  // Generate notification messages
  generateNotificationMessage(type, patientName, vaccineName, dueDate, facilityName) {
    const messages = {
      due_reminder: [
        `Reminder: ${patientName} is due for ${vaccineName} vaccination on ${dueDate.toLocaleDateString()}.`,
        `${vaccineName} vaccination is due for ${patientName}. Please schedule an appointment at ${facilityName}.`,
        `Important: ${patientName}'s ${vaccineName} vaccine is scheduled for ${dueDate.toLocaleDateString()}.`
      ],
      overdue: [
        `OVERDUE: ${patientName} missed the ${vaccineName} vaccination scheduled for ${dueDate.toLocaleDateString()}.`,
        `${patientName} is overdue for ${vaccineName} vaccination. Please visit ${facilityName} immediately.`,
        `Urgent: ${patientName}'s ${vaccineName} vaccine was due on ${dueDate.toLocaleDateString()}. Schedule now.`
      ],
      upcoming: [
        `Upcoming: ${patientName} has ${vaccineName} vaccination scheduled for ${dueDate.toLocaleDateString()}.`,
        `${patientName}'s next vaccination (${vaccineName}) is coming up on ${dueDate.toLocaleDateString()}.`,
        `Reminder: ${patientName} needs ${vaccineName} vaccine on ${dueDate.toLocaleDateString()} at ${facilityName}.`
      ],
      completed: [
        `${patientName} successfully received ${vaccineName} vaccination today.`,
        `Vaccination complete: ${patientName} received ${vaccineName} at ${facilityName}.`,
        `${vaccineName} vaccination administered to ${patientName}. Next appointment will be scheduled if needed.`
      ],
      missed_appointment: [
        `${patientName} missed the appointment for ${vaccineName} vaccination on ${dueDate.toLocaleDateString()}.`,
        `Missed appointment: ${patientName} did not attend ${vaccineName} vaccination at ${facilityName}.`,
        `${patientName} failed to appear for ${vaccineName} vaccination. Please reschedule.`
      ]
    };

    const typeMessages = messages[type] || messages.due_reminder;
    return typeMessages[Math.floor(Math.random() * typeMessages.length)];
  }

  // Determine notification status based on due date and current date
  getNotificationStatus(dueDate, currentDate = new Date()) {
    const daysDiff = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < -7) return 'overdue';
    if (daysDiff < 0) return 'pending';
    if (daysDiff <= 7) return 'pending';
    return 'pending';
  }

  // Get notification priority based on vaccine importance and timing
  getNotificationPriority(vaccine, dueDate, currentDate = new Date()) {
    const daysDiff = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24));
    
    // Critical vaccines get higher priority
    const criticalVaccines = ['BCG', 'OPV0', 'PENTA1', 'MCV1', 'YF'];
    const isCritical = criticalVaccines.some(code => vaccine.vaccine_code.includes(code));
    
    if (daysDiff < -7) return 'urgent'; // Overdue
    if (daysDiff < 0) return 'high'; // Due now
    if (daysDiff <= 3) return isCritical ? 'high' : 'normal'; // Due soon
    if (daysDiff <= 7) return 'normal'; // Due this week
    return 'low'; // Due later
  }

  // Generate notification channels based on patient profile and preferences
  getNotificationChannels(patientProfile, priority) {
    const channels = ['in_app'];
    
    if (patientProfile && patientProfile.notification_preferences) {
      try {
        const prefs = JSON.parse(patientProfile.notification_preferences);
        if (prefs.email_notifications) channels.push('email');
        if (prefs.sms_notifications) channels.push('sms');
        if (prefs.push_notifications) channels.push('push');
      } catch (e) {
        // Default channels if parsing fails
        channels.push('email', 'sms');
      }
    } else {
      // Default channels for patients without profiles
      channels.push('sms');
    }

    // Add phone call for urgent notifications
    if (priority === 'urgent') {
      channels.push('phone_call');
    }

    return channels;
  }

  async seed(patients, vaccines, facilities, patientProfiles = [], employeeProfiles = []) {
    if (!patients || patients.length === 0) {
      throw new Error('Patients are required to create notifications');
    }
    if (!vaccines || vaccines.length === 0) {
      throw new Error('Vaccines are required to create notifications');
    }
    if (!facilities || facilities.length === 0) {
      throw new Error('Facilities are required to create notifications');
    }

    const spinner = ora('Creating notifications...').start();
    const notifications = [];
    const currentDate = new Date();

    try {
      let notificationCount = 0;
      const maxNotifications = parseInt(process.env.NOTIFICATION_COUNT) || 200;

      // Create due/overdue notifications for patients
      for (let i = 0; i < patients.length && notificationCount < maxNotifications; i++) {
        const patient = patients[i];
        const patientAge = Math.floor((currentDate - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
        
        // Find patient profile if exists
        const patientProfile = patientProfiles.find(p => p.patient_id === patient.$id);
        
        // Get facility
        const facility = facilities.find(f => f.$id === patient.facility_id) || facilities[0];

        spinner.text = `Processing notifications for: ${patient.full_name} (${i + 1}/${patients.length})`;

        // Find vaccines this patient should have or will need
        const relevantVaccines = vaccines.filter(vaccine => {
          // Skip TT vaccines for children
          if (vaccine.vaccine_series === 'TT' && patientAge < 15) {
            return false;
          }
          
          const dueDate = this.calculateDueDate(patient.date_of_birth, vaccine.standard_schedule_age);
          const daysDiff = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24));
          
          // Include vaccines that are due within 30 days or overdue by up to 60 days
          return daysDiff >= -60 && daysDiff <= 30;
        });

        // Create notifications for relevant vaccines
        for (const vaccine of relevantVaccines.slice(0, 3)) { // Limit to 3 per patient
          if (notificationCount >= maxNotifications) break;

          const dueDate = this.calculateDueDate(patient.date_of_birth, vaccine.standard_schedule_age);
          const status = this.getNotificationStatus(dueDate, currentDate);
          const priority = this.getNotificationPriority(vaccine, dueDate, currentDate);
          
          // Determine notification type
          const daysDiff = Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24));
          let notificationType = 'due_reminder';
          if (daysDiff < -7) notificationType = 'overdue';
          else if (daysDiff > 0 && daysDiff <= 7) notificationType = 'upcoming';

          const message = this.generateNotificationMessage(
            notificationType,
            patient.full_name,
            vaccine.name,
            dueDate,
            facility.name
          );

          const channels = this.getNotificationChannels(patientProfile, priority);

          const notificationData = {
            patient_id: patient.$id,
            vaccine_id: vaccine.$id,
            due_date: dueDate.toISOString(),
            status: status,
            facility_id: facility.$id,
            message: message,
            priority: priority,
            sent_at: Math.random() > 0.3 ? currentDate.toISOString() : null, // 70% sent
            viewed_at: Math.random() > 0.6 ? currentDate.toISOString() : null, // 40% viewed
            notification_channels: channels,
            language_preference: 'en',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Add profile-specific fields
          if (patientProfile) {
            notificationData.recipient_profile_id = patientProfile.$id;
            notificationData.recipient_profile_type = 'patient';
            notificationData.personalization_data = JSON.stringify({
              patient_name: patient.full_name,
              vaccine_name: vaccine.name,
              facility_name: facility.name,
              due_date: dueDate.toISOString()
            });
            
            // Add guardian notification for minors
            if (patientAge < 18 && patientProfile.guardian_user_id) {
              notificationData.guardian_notification = true;
              notificationData.guardian_profile_id = patientProfile.guardian_user_id;
            }
          }

          const notification = await this.databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            notificationData
          );

          notifications.push(notification);
          notificationCount++;

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Create some staff notifications
      if (employeeProfiles.length > 0 && notificationCount < maxNotifications) {
        const staffNotificationTypes = [
          'Weekly immunization report available',
          'Monthly vaccine stock review required',
          'Quality assurance audit scheduled',
          'New vaccination guidelines published',
          'Staff training session reminder',
          'Equipment maintenance due',
          'Patient follow-up required'
        ];

        for (let i = 0; i < Math.min(20, maxNotifications - notificationCount); i++) {
          const employee = employeeProfiles[i % employeeProfiles.length];
          const facility = facilities.find(f => f.$id === employee.primary_facility_id) || facilities[0];
          const messageType = staffNotificationTypes[Math.floor(Math.random() * staffNotificationTypes.length)];

          const staffNotification = await this.databases.createDocument(
            this.databaseId,
            this.collectionId,
            ID.unique(),
            {
              patient_id: patients[0].$id, // Required field, use first patient as placeholder
              vaccine_id: vaccines[0].$id, // Required field, use first vaccine as placeholder
              due_date: new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(), // 1 week from now
              status: Math.random() > 0.5 ? 'pending' : 'viewed',
              facility_id: facility.$id,
              message: messageType,
              priority: 'normal',
              sent_at: currentDate.toISOString(),
              viewed_at: Math.random() > 0.4 ? currentDate.toISOString() : null,
              recipient_profile_id: employee.$id,
              recipient_profile_type: 'employee',
              notification_channels: ['email', 'in_app'],
              language_preference: 'en',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          );

          notifications.push(staffNotification);
          notificationCount++;

          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      spinner.succeed(`Created ${notifications.length} notifications`);

      // Generate statistics
      const stats = {
        total: notifications.length,
        pending: notifications.filter(n => n.status === 'pending').length,
        viewed: notifications.filter(n => n.status === 'viewed').length,
        completed: notifications.filter(n => n.status === 'completed').length,
        overdue: notifications.filter(n => n.status === 'overdue').length,
        urgent: notifications.filter(n => n.priority === 'urgent').length,
        high: notifications.filter(n => n.priority === 'high').length,
        normal: notifications.filter(n => n.priority === 'normal').length,
        low: notifications.filter(n => n.priority === 'low').length,
        sent: notifications.filter(n => n.sent_at).length,
        patient: notifications.filter(n => n.recipient_profile_type === 'patient').length,
        employee: notifications.filter(n => n.recipient_profile_type === 'employee').length
      };

      console.log(chalk.blue('\n📊 Notification Statistics:'));
      console.log(`   Total: ${stats.total}`);
      console.log(`   Status - Pending: ${stats.pending}, Viewed: ${stats.viewed}, Completed: ${stats.completed}, Overdue: ${stats.overdue}`);
      console.log(`   Priority - Urgent: ${stats.urgent}, High: ${stats.high}, Normal: ${stats.normal}, Low: ${stats.low}`);
      console.log(`   Sent: ${stats.sent} (${Math.round(stats.sent/stats.total*100)}%)`);
      console.log(`   Recipients - Patients: ${stats.patient}, Staff: ${stats.employee}`);

      return notifications;

    } catch (error) {
      spinner.fail(`Failed to create notifications: ${error.message}`);
      throw error;
    }
  }

  async clean() {
    const spinner = ora('Cleaning notifications...').start();
    
    try {
      const response = await this.databases.listDocuments(this.databaseId, this.collectionId);
      
      for (const doc of response.documents) {
        await this.databases.deleteDocument(this.databaseId, this.collectionId, doc.$id);
      }

      spinner.succeed(`Cleaned ${response.documents.length} notifications`);
    } catch (error) {
      spinner.fail(`Failed to clean notifications: ${error.message}`);
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
  const seeder = new NotificationSeeder(client, databaseId);

  console.error(chalk.red('❌ This seeder requires patients, vaccines, and facilities.'));
  console.log(chalk.yellow('Please run the main database seeder.'));
  process.exit(1);
}

module.exports = NotificationSeeder;