const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Calculate date ranges for due immunizations
    const today = new Date();
    const reminderDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days ahead
    const overdueDate = new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000)); // 1 day overdue

    // Query for patients with due immunizations
    const dueImmunizations = await databases.listDocuments(
      'immune-me-db',
      'vaccine_schedules',
      [
        Query.lessThanEqual('dueDate', reminderDate.toISOString()),
        Query.greaterThanEqual('dueDate', today.toISOString()),
        Query.equal('status', 'pending')
      ]
    );

    // Process each due immunization
    for (const immunization of dueImmunizations.documents) {
      await createNotification({
        patientId: immunization.patientId,
        vaccineId: immunization.vaccineId,
        facilityId: immunization.facilityId,
        type: 'due',
        dueDate: immunization.dueDate,
        priority: 'medium',
        message: `Immunization due: ${immunization.vaccineName} for ${immunization.patientName}`
      });
    }

    // Query for overdue immunizations
    const overdueImmunizations = await databases.listDocuments(
      'immune-me-db',
      'vaccine_schedules',
      [
        Query.lessThan('dueDate', overdueDate.toISOString()),
        Query.equal('status', 'pending')
      ]
    );

    // Process overdue immunizations
    for (const immunization of overdueImmunizations.documents) {
      await createNotification({
        patientId: immunization.patientId,
        vaccineId: immunization.vaccineId,
        facilityId: immunization.facilityId,
        type: 'overdue',
        dueDate: immunization.dueDate,
        priority: 'high',
        message: `OVERDUE: ${immunization.vaccineName} for ${immunization.patientName}`
      });
    }

    log(`Processed ${dueImmunizations.total + overdueImmunizations.total} immunization reminders`);
    
    return res.json({
      success: true,
      processed: dueImmunizations.total + overdueImmunizations.total,
      due: dueImmunizations.total,
      overdue: overdueImmunizations.total
    });

  } catch (err) {
    error('Failed to process due immunization reminders: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function createNotification(notificationData) {
    try {
      await databases.createDocument(
        'immune-me-db',
        'notifications',
        'unique()',
        {
          ...notificationData,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
    } catch (err) {
      error('Failed to create notification: ' + err.message);
    }
  }
};