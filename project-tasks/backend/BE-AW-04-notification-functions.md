# BE-AW-04: Create Appwrite Functions for Notification System

## Title
Create Appwrite Functions for Notification System

## Priority
High

## Estimated Time
8-10 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system migrated

## Description
Create and deploy Appwrite Cloud Functions to replace the existing AdonisJS notification service. This includes functions for generating immunization due date notifications, sending alerts for missed appointments, processing notification queues, and managing notification delivery through multiple channels (email, SMS, push notifications).

The functions will leverage Appwrite's serverless architecture to provide scalable, event-driven notification processing while maintaining the existing notification logic and scheduling capabilities.

## Acceptance Criteria
- [ ] Due immunization reminder functions created and deployed
- [ ] Missed appointment alert functions implemented
- [ ] Notification queue processing functions operational
- [ ] Email notification delivery function working
- [ ] SMS notification delivery function implemented
- [ ] Push notification delivery function created
- [ ] Notification scheduling functions deployed
- [ ] Cleanup functions for old notifications implemented
- [ ] Event-driven triggers configured for automatic notifications
- [ ] Function monitoring and logging implemented

## Technical Notes

### Core Notification Functions

#### 1. Due Immunization Reminders Function
```javascript
// appwrite-backend/functions/notifications/due-immunization-reminders/src/main.js
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
```

#### 2. Email Notification Sender Function
```javascript
// appwrite-backend/functions/notifications/email-sender/src/main.js
const { Client, Databases, Query } = require('node-appwrite');
const nodemailer = require('nodemailer');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Configure email transporter
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
    // Get pending email notifications
    const notifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'pending'),
        Query.equal('deliveryMethod', 'email'),
        Query.limit(50) // Process in batches
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

        // Prepare email content
        const emailContent = generateEmailContent(notification, patient, vaccine, facility);

        // Send email
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to: patient.contactEmail || facility.contactEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

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
        log(`Email sent successfully for notification ${notification.$id}`);

      } catch (emailError) {
        // Update notification with error status
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
};
```

#### 3. Notification Queue Processor Function
```javascript
// appwrite-backend/functions/notifications/process-notification-queue/src/main.js
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
```

#### 4. Notification Cleanup Function
```javascript
// appwrite-backend/functions/notifications/cleanup-old-notifications/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Calculate cleanup dates
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));

    // Archive old completed notifications (30+ days)
    const oldCompleted = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'completed'),
        Query.lessThan('updatedAt', thirtyDaysAgo.toISOString()),
        Query.limit(100)
      ]
    );

    let archivedCount = 0;
    for (const notification of oldCompleted.documents) {
      await databases.updateDocument(
        'immune-me-db',
        'notifications',
        notification.$id,
        {
          status: 'archived',
          archivedAt: new Date().toISOString()
        }
      );
      archivedCount++;
    }

    // Delete very old archived notifications (90+ days)
    const veryOldArchived = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      [
        Query.equal('status', 'archived'),
        Query.lessThan('archivedAt', ninetyDaysAgo.toISOString()),
        Query.limit(50)
      ]
    );

    let deletedCount = 0;
    for (const notification of veryOldArchived.documents) {
      await databases.deleteDocument(
        'immune-me-db',
        'notifications',
        notification.$id
      );
      deletedCount++;
    }

    log(`Cleanup completed: ${archivedCount} archived, ${deletedCount} deleted`);

    return res.json({
      success: true,
      archived: archivedCount,
      deleted: deletedCount
    });

  } catch (err) {
    error('Notification cleanup failed: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
```

### Function Configuration

#### Function Deployment Configuration
```json
{
  "functions": [
    {
      "name": "due-immunization-reminders",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:system"],
      "events": [],
      "schedule": "0 8 * * *",
      "timeout": 300,
      "env": {
        "APPWRITE_ENDPOINT": "$APPWRITE_ENDPOINT",
        "APPWRITE_PROJECT_ID": "$APPWRITE_PROJECT_ID",
        "APPWRITE_API_KEY": "$APPWRITE_API_KEY"
      }
    },
    {
      "name": "email-sender",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:system"],
      "events": [],
      "schedule": "*/15 * * * *",
      "timeout": 600,
      "env": {
        "SMTP_HOST": "$SMTP_HOST",
        "SMTP_PORT": "$SMTP_PORT",
        "SMTP_USER": "$SMTP_USER",
        "SMTP_PASS": "$SMTP_PASS",
        "FROM_EMAIL": "$FROM_EMAIL"
      }
    },
    {
      "name": "process-notification-queue",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:system"],
      "events": ["databases.*.collections.notifications.documents.*.create"],
      "schedule": "*/5 * * * *",
      "timeout": 300
    },
    {
      "name": "cleanup-old-notifications",
      "runtime": "node-18.0",
      "execute": ["role:admin"],
      "events": [],
      "schedule": "0 2 * * 0",
      "timeout": 600
    }
  ]
}
```

## Files to Create/Modify
- `appwrite-backend/functions/notifications/due-immunization-reminders/` - Due immunization reminder function
- `appwrite-backend/functions/notifications/email-sender/` - Email notification delivery
- `appwrite-backend/functions/notifications/sms-sender/` - SMS notification delivery
- `appwrite-backend/functions/notifications/push-notification-sender/` - Push notification delivery
- `appwrite-backend/functions/notifications/process-notification-queue/` - Queue processor
- `appwrite-backend/functions/notifications/cleanup-old-notifications/` - Cleanup function
- `appwrite-backend/functions/notifications/schedule-notifications/` - Notification scheduler
- `appwrite-backend/config/notification-functions.json` - Function configurations
- `appwrite-backend/utils/notification-templates.js` - Notification templates

## Testing Requirements

### Function Deployment Testing
1. **Function Creation Test**
   ```bash
   # Deploy functions
   appwrite functions create \
     --functionId due-immunization-reminders \
     --name "Due Immunization Reminders" \
     --runtime node-18.0
   
   # Verify deployment
   appwrite functions get --functionId due-immunization-reminders
   ```

2. **Function Execution Test**
   ```javascript
   // Test function execution
   const execution = await mcpServer.functions.createExecution(
     'due-immunization-reminders',
     JSON.stringify({}),
     false
   );
   
   assert(execution.status === 'completed', 'Function should execute successfully');
   ```

### Notification Processing Testing
1. **Due Date Calculation Test**
   ```javascript
   // Create test immunization schedule
   const testSchedule = await databases.createDocument(
     'immune-me-db',
     'vaccine_schedules',
     'unique()',
     {
       patientId: 'test-patient',
       vaccineId: 'test-vaccine',
       dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
       status: 'pending'
     }
   );
   
   // Execute reminder function
   const result = await mcpServer.functions.createExecution('due-immunization-reminders');
   
   // Verify notification created
   const notifications = await databases.listDocuments(
     'immune-me-db',
     'notifications',
     [Query.equal('patientId', 'test-patient')]
   );
   
   assert(notifications.total > 0, 'Notification should be created');
   ```

2. **Email Delivery Test**
   ```javascript
   // Create test notification
   const testNotification = await databases.createDocument(
     'immune-me-db',
     'notifications',
     'unique()',
     {
       patientId: 'test-patient',
       type: 'due',
       status: 'pending',
       deliveryMethod: 'email'
     }
   );
   
   // Execute email sender
   const result = await mcpServer.functions.createExecution('email-sender');
   
   // Verify notification status updated
   const updatedNotification = await databases.getDocument(
     'immune-me-db',
     'notifications',
     testNotification.$id
   );
   
   assert(updatedNotification.status === 'sent', 'Notification should be marked as sent');
   ```

### Performance Testing
1. **Batch Processing Test**
   - Create multiple test notifications
   - Verify functions can handle batch processing
   - Monitor execution time and memory usage

2. **Schedule Reliability Test**
   - Verify scheduled functions execute at correct intervals
   - Test function retry mechanisms
   - Monitor function execution logs

## Implementation Steps

### Phase 1: Function Development
1. Create function directory structure
2. Implement core notification functions
3. Add error handling and logging
4. Create function configuration files

### Phase 2: Deployment and Configuration
1. Deploy functions to Appwrite
2. Configure function schedules and triggers
3. Set up environment variables
4. Test function deployments

### Phase 3: Integration Testing
1. Test notification generation
2. Verify delivery mechanisms
3. Test queue processing
4. Validate cleanup procedures

### Phase 4: Monitoring and Optimization
1. Set up function monitoring
2. Optimize performance
3. Configure alerting
4. Document operational procedures

## Success Metrics
- All notification functions deployed successfully
- Scheduled functions executing on time
- Notification delivery working across all channels
- Queue processing handling expected load
- Cleanup functions maintaining database hygiene
- Function monitoring and alerting operational

## Rollback Plan
- Keep existing AdonisJS notification service running
- Maintain parallel notification processing during transition
- Document all function configurations
- Test rollback procedures in development environment

## Next Steps
After completion, this task enables:
- BE-AW-05: Reporting functions creation
- BE-AW-06: Data sync functions creation
- FE-AW-04: Frontend data services integration
- Full notification system migration