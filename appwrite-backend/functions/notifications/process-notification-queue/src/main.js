const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Get pending notifications that need processing
    const pendingNotifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.lessThanEqual('scheduledFor', new Date().toISOString()),
        Query.limit(100)
      ]
    );

    let processedCount = 0;

    for (const notification of pendingNotifications.documents) {
      try {
        // Determine delivery method based on notification type and patient preferences
        const deliveryMethods = await determineDeliveryMethods(notification);

        // Create delivery tasks for each method
        for (const method of deliveryMethods) {
          await createDeliveryTask(notification, method);
        }

        // Update notification status
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'queued',
            processedAt: new Date().toISOString(),
            deliveryMethods: deliveryMethods
          }
        );

        processedCount++;

      } catch (processError) {
        error(`Failed to process notification ${notification.$id}: ${processError.message}`);
        
        // Update with error status
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'error',
            errorMessage: processError.message,
            lastProcessedAt: new Date().toISOString()
          }
        );
      }
    }

    log(`Processed ${processedCount} notifications from queue`);

    return res.json({
      success: true,
      processed: processedCount,
      total: pendingNotifications.total
    });

  } catch (err) {
    error('Notification queue processor failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function determineDeliveryMethods(notification) {
    // Get patient preferences
    const patient = await databases.getDocument(
      'immune-me-db',
      'patients',
      notification.patientId
    );

    const methods = [];

    // Default delivery methods based on priority
    if (notification.priority === 'high') {
      methods.push('email', 'sms');
    } else {
      methods.push('email');
    }

    // Add push notification if patient has mobile app
    if (patient.pushToken) {
      methods.push('push');
    }

    return methods;
  }

  async function createDeliveryTask(notification, method) {
    // Create a delivery task document
    await databases.createDocument(
      'immune-me-db',
      'notification_delivery_tasks',
      'unique()',
      {
        notificationId: notification.$id,
        deliveryMethod: method,
        status: 'pending',
        createdAt: new Date().toISOString(),
        scheduledFor: new Date().toISOString()
      }
    );
  }
};