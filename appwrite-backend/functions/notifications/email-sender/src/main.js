const { Client, Databases, Query } = require('node-appwrite');
const nodemailer = require('nodemailer');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const notifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.equal('deliveryMethod', 'email'),
        Query.limit(50)
      ]
    );

    let successCount = 0;
    let failureCount = 0;

    for (const notification of notifications.documents) {
      try {
        const patient = await databases.getDocument(
          'immune-me-db',
          'patients',
          notification.patientId
        );

        const vaccine = await databases.getDocument(
          'immune-me-db',
          'vaccines',
          notification.vaccineId
        );

        const facility = await databases.getDocument(
          'immune-me-db',
          'facilities',
          notification.facilityId
        );

        const emailContent = generateEmailContent(notification, patient, vaccine, facility);

        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: patient.contactEmail || facility.contactEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

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
        log(`Email sent successfully for notification ${notification.$id}`);

      } catch (emailError) {
        await databases.updateDocument(
          'immune-me-db',
          'notifications',
          notification.$id,
          {
            status: 'failed',
            errorMessage: emailError.message,
            lastAttemptAt: new Date().toISOString()
          }
        );

        failureCount++;
        error(`Failed to send email for notification ${notification.$id}: ${emailError.message}`);
      }
    }

    return res.json({
      success: true,
      processed: notifications.total,
      sent: successCount,
      failed: failureCount
    });

  } catch (err) {
    error('Email sender function failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

function generateEmailContent(notification, patient, vaccine, facility) {
  const isOverdue = notification.type === 'overdue';
  const urgencyText = isOverdue ? 'OVERDUE' : 'Due Soon';
  
  return {
    subject: `${urgencyText}: ${vaccine.name} Immunization for ${patient.fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isOverdue ? '#dc3545' : '#007bff'};">
          Immunization ${urgencyText}
        </h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Patient Information</h3>
          <p><strong>Name:</strong> ${patient.fullName}</p>
          <p><strong>Date of Birth:</strong> ${new Date(patient.dateOfBirth).toLocaleDateString()}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Immunization Details</h3>
          <p><strong>Vaccine:</strong> ${vaccine.name}</p>
          <p><strong>Due Date:</strong> ${new Date(notification.dueDate).toLocaleDateString()}</p>
          <p><strong>Priority:</strong> ${notification.priority.toUpperCase()}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Facility Information</h3>
          <p><strong>Facility:</strong> ${facility.name}</p>
          <p><strong>Address:</strong> ${facility.address}</p>
          <p><strong>Phone:</strong> ${facility.contactPhone}</p>
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <p style="color: #6c757d; font-size: 14px;">
            Please contact the facility to schedule this immunization.
          </p>
        </div>
      </div>
    `,
    text: `
      Immunization ${urgencyText}
      
      Patient: ${patient.fullName}
      Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}
      
      Vaccine: ${vaccine.name}
      Due Date: ${new Date(notification.dueDate).toLocaleDateString()}
      Priority: ${notification.priority.toUpperCase()}
      
      Facility: ${facility.name}
      Address: ${facility.address}
      Phone: ${facility.contactPhone}
      
      Please contact the facility to schedule this immunization.
    `
  };
}