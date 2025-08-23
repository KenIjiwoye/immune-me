const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Get all pending notifications that need scheduling
    const pendingNotifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.greaterThan('scheduledFor', new Date().toISOString()),
        Query.limit(100)
      ]
    );

    let scheduledCount = 0;

    for (const notification of pendingNotifications.documents) {
      try {
        // Calculate optimal delivery time based on patient preferences
        const scheduledTime = await calculateOptimalDeliveryTime(notification);
        
        // Update notification with scheduled time
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            scheduledFor: scheduledTime.toISOString(),
            status: 'scheduled',
            scheduledAt: new Date().toISOString()
          }
        );

        scheduledCount++;
        log(`Scheduled notification ${notification.$id} for ${scheduledTime}`);

      } catch (scheduleError) {
        error(`Failed to schedule notification ${notification.$id}: ${scheduleError.message}`);
        
        // Mark as failed if scheduling fails
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'failed',
            errorMessage: scheduleError.message,
            lastScheduledAt: new Date().toISOString()
          }
        );
      }
    }

    return res.json({
      success: true,
      scheduled: scheduledCount,
      total: pendingNotifications.total
    });

  } catch (err) {
    error('Notification scheduler function failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function calculateOptimalDeliveryTime(notification) {
    // Get patient preferences
    const patient = await databases.getDocument(
      'immune-me-db',
      'patients',
      notification.patientId
    );

    const facility = await databases.getDocument(
      'immune-me-db',
      'facilities',
      notification.facilityId
    );

    let scheduledTime = new Date(notification.scheduledFor || new Date());

    // Adjust based on patient preferences
    if (patient.notificationPreferences) {
      const prefs = patient.notificationPreferences;
      
      // Preferred time of day
      if (prefs.preferredTime) {
        const [hours, minutes] = prefs.preferredTime.split(':').map(Number);
        scheduledTime.setHours(hours, minutes, 0, 0);
      }

      // Preferred days (skip weekends if not preferred)
      if (prefs.preferredDays && prefs.preferredDays.length > 0) {
        const dayOfWeek = scheduledTime.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        if (!prefs.preferredDays.includes(dayNames[dayOfWeek])) {
          // Find next preferred day
          let nextDay = scheduledTime;
          let attempts = 0;
          
          while (attempts < 7) {
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayOfWeek = nextDay.getDay();
            
            if (prefs.preferredDays.includes(dayNames[nextDayOfWeek])) {
              scheduledTime = nextDay;
              break;
            }
            attempts++;
          }
        }
      }

      // Timezone adjustment
      if (prefs.timezone) {
        const offset = getTimezoneOffset(prefs.timezone);
        scheduledTime.setHours(scheduledTime.getHours() + offset);
      }
    }

    // Ensure notification is within facility hours
    if (facility.operatingHours) {
      const hours = facility.operatingHours;
      const dayOfWeek = scheduledTime.getDay();
      const dayHours = hours[dayOfWeek === 0 ? 'sunday' : 
                          dayOfWeek === 6 ? 'saturday' : 'weekday'];
      
      if (dayHours) {
        const [openHour, closeHour] = dayHours.split('-').map(h => parseInt(h.split(':')[0]));
        
        if (scheduledTime.getHours() < openHour) {
          scheduledTime.setHours(openHour, 0, 0, 0);
        } else if (scheduledTime.getHours() >= closeHour) {
          // Move to next day at opening time
          scheduledTime.setDate(scheduledTime.getDate() + 1);
          scheduledTime.setHours(openHour, 0, 0, 0);
        }
      }
    }

    return scheduledTime;
  }

  function getTimezoneOffset(timezone) {
    // Simple timezone offset calculation
    const offsets = {
      'UTC': 0,
      'GMT': 0,
      'EST': -5,
      'CST': -6,
      'MST': -7,
      'PST': -8,
      'CET': 1,
      'EET': 2,
      'WAT': 1,
      'CAT': 2,
      'EAT': 3
    };
    
    return offsets[timezone] || 0;
  }
};