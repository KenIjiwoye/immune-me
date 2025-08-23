const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Get pending push notifications
    const notifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.equal('deliveryMethod', 'push'),
        Query.limit(50)
      ]
    );

    let successCount = 0;
    let failureCount = 0;

    for (const notification of notifications.documents) {
      try {
        // Get patient details
        const patient = await databases.getDocument(
          'immune-me-db',
          'patients',
          notification.patientId
        );

        // Get vaccine details
        const vaccine = await databases.getDocument(
          'immune-me-db',
          'vaccines',
          notification.vaccineId
        );

        // Get facility details
        const facility = await databases.getDocument(
          'immune-me-db',
          'facilities',
          notification.facilityId
        );

        // Check if patient has push token
        if (!patient.pushToken) {
          throw new Error('Patient does not have push token configured');
        }

        // Prepare push notification content
        const pushContent = generatePushContent(notification, patient, vaccine, facility);

        // Send push notification
        await sendPushNotification(patient.pushToken, pushContent);

        // Update notification status
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'sent',
            sentAt: new Date().toISOString(),
            deliveryStatus: 'delivered'
          }
        );

        successCount++;
        log(`Push notification sent successfully for notification ${notification.$id}`);

      } catch (pushError) {
        // Update notification with error status
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'failed',
            errorMessage: pushError.message,
            lastAttemptAt: new Date().toISOString()
          }
        );

        failureCount++;
        error(`Failed to send push notification for notification ${notification.$id}: ${pushError.message}`);
      }
    }

    return res.json({
      success: true,
      processed: notifications.total,
      sent: successCount,
      failed: failureCount
    });

  } catch (err) {
    error('Push notification sender function failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function generatePushContent(notification, patient, vaccine, facility) {
    const isOverdue = notification.type === 'overdue';
    const urgencyText = isOverdue ? 'OVERDUE' : 'Due Soon';
    
    return {
      title: `${urgencyText}: ${vaccine.name} Immunization`,
      body: `Hi ${patient.firstName}, your ${vaccine.name} immunization is ${isOverdue ? 'overdue' : 'due soon'}. Contact ${facility.name} to schedule.`,
      data: {
        notificationId: notification.$id,
        patientId: notification.patientId,
        vaccineId: notification.vaccineId,
        facilityId: notification.facilityId,
        type: notification.type,
        dueDate: notification.dueDate,
        priority: notification.priority
      },
      priority: notification.priority === 'high' ? 'high' : 'normal'
    };
  }

  async function sendPushNotification(pushToken, content) {
    // Implement push notification sending based on your provider
    // Example for Firebase Cloud Messaging:
    if (process.env.PUSH_PROVIDER === 'firebase') {
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
      }

      const message = {
        token: pushToken,
        notification: {
          title: content.title,
          body: content.body
        },
        data: content.data,
        android: {
          priority: content.priority
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: content.title,
                body: content.body
              },
              sound: content.priority === 'high' ? 'default' : undefined
            }
          }
        }
      };

      await admin.messaging().send(message);
    } else {
      // Generic push notification API implementation
      const response = await fetch(process.env.PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PUSH_API_KEY}`
        },
        body: JSON.stringify({
          to: pushToken,
          title: content.title,
          body: content.body,
          data: content.data,
          priority: content.priority
        })
      });

      if (!response.ok) {
        throw new Error(`Push API error: ${response.statusText}`);
      }
    }
  }
};