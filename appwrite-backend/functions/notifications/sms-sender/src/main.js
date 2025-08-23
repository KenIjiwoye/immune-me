const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Get pending SMS notifications
    const notifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.equal('deliveryMethod', 'sms'),
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

        // Prepare SMS content
        const smsContent = generateSMSContent(notification, patient, vaccine, facility);

        // Send SMS via configured provider
        await sendSMS(patient.contactPhone || facility.contactPhone, smsContent);

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
        log(`SMS sent successfully for notification ${notification.$id}`);

      } catch (smsError) {
        // Update notification with error status
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'failed',
            errorMessage: smsError.message,
            lastAttemptAt: new Date().toISOString()
          }
        );

        failureCount++;
        error(`Failed to send SMS for notification ${notification.$id}: ${smsError.message}`);
      }
    }

    return res.json({
      success: true,
      processed: notifications.total,
      sent: successCount,
      failed: failureCount
    });

  } catch (err) {
    error('SMS sender function failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function generateSMSContent(notification, patient, vaccine, facility) {
    const isOverdue = notification.type === 'overdue';
    const urgencyText = isOverdue ? 'OVERDUE' : 'Due Soon';
    
    return `${urgencyText}: ${vaccine.name} immunization for ${patient.fullName} due ${new Date(notification.dueDate).toLocaleDateString()}. Contact ${facility.name} at ${facility.contactPhone}`;
  }

  async function sendSMS(phoneNumber, message) {
    // Implement SMS sending logic based on your provider
    // Example for Twilio:
    if (process.env.SMS_PROVIDER === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      
      const twilio = require('twilio')(accountSid, authToken);
      
      await twilio.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber
      });
    } else {
      // Generic SMS API implementation
      const response = await fetch(process.env.SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SMS_API_KEY}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.statusText}`);
      }
    }
  }
};