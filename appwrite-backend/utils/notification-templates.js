/**
 * Notification Templates Utility
 * Provides standardized templates for different notification types and delivery methods
 */

const templates = {
  email: {
    due: {
      subject: 'Immunization Due: {vaccineName}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Immunization Due Soon</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> {patientName}</p>
            <p><strong>Date of Birth:</strong> {patientDOB}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Immunization Details</h3>
            <p><strong>Vaccine:</strong> {vaccineName}</p>
            <p><strong>Due Date:</strong> {dueDate}</p>
            <p><strong>Priority:</strong> {priority}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Facility Information</h3>
            <p><strong>Facility:</strong> {facilityName}</p>
            <p><strong>Address:</strong> {facilityAddress}</p>
            <p><strong>Phone:</strong> {facilityPhone}</p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <p style="color: #6c757d; font-size: 14px;">
              Please contact the facility to schedule this immunization.
            </p>
          </div>
        </div>
      `,
      text: `
        Immunization Due Soon
        
        Patient: {patientName}
        Date of Birth: {patientDOB}
        
        Vaccine: {vaccineName}
        Due Date: {dueDate}
        Priority: {priority}
        
        Facility: {facilityName}
        Address: {facilityAddress}
        Phone: {facilityPhone}
        
        Please contact the facility to schedule this immunization.
      `
    },
    overdue: {
      subject: 'OVERDUE: {vaccineName} Immunization',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">OVERDUE Immunization</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> {patientName}</p>
            <p><strong>Date of Birth:</strong> {patientDOB}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Immunization Details</h3>
            <p><strong>Vaccine:</strong> {vaccineName}</p>
            <p><strong>Due Date:</strong> {dueDate}</p>
            <p><strong>Priority:</strong> HIGH</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Facility Information</h3>
            <p><strong>Facility:</strong> {facilityName}</p>
            <p><strong>Address:</strong> {facilityAddress}</p>
            <p><strong>Phone:</strong> {facilityPhone}</p>
          </div>
          
          <div style="background: #dc3545; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <strong>URGENT: This immunization is overdue. Please schedule immediately.</strong>
          </div>
        </div>
      `,
      text: `
        OVERDUE IMMUNIZATION
        
        Patient: {patientName}
        Date of Birth: {patientDOB}
        
        Vaccine: {vaccineName}
        Due Date: {dueDate}
        Priority: HIGH
        
        Facility: {facilityName}
        Address: {facilityAddress}
        Phone: {facilityPhone}
        
        URGENT: This immunization is overdue. Please schedule immediately.
      `
    },
    missed: {
      subject: 'Missed Appointment: {vaccineName} Immunization',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ffc107;">Missed Immunization Appointment</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Patient Information</h3>
            <p><strong>Name:</strong> {patientName}</p>
            <p><strong>Date of Birth:</strong> {patientDOB}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Appointment Details</h3>
            <p><strong>Vaccine:</strong> {vaccineName}</p>
            <p><strong>Scheduled Date:</strong> {scheduledDate}</p>
            <p><strong>Priority:</strong> {priority}</p>
          </div>
          
          <div style="background: #ffc107; color: #212529; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <strong>Please reschedule your missed appointment as soon as possible.</strong>
          </div>
        </div>
      `,
      text: `
        MISSED IMMUNIZATION APPOINTMENT
        
        Patient: {patientName}
        Date of Birth: {patientDOB}
        
        Vaccine: {vaccineName}
        Scheduled Date: {scheduledDate}
        Priority: {priority}
        
        Please reschedule your missed appointment as soon as possible.
      `
    }
  },
  
  sms: {
    due: 'Hi {patientName}, your {vaccineName} immunization is due on {dueDate}. Contact {facilityName} at {facilityPhone} to schedule.',
    overdue: 'URGENT: Hi {patientName}, your {vaccineName} immunization is OVERDUE. Contact {facilityName} at {facilityPhone} immediately.',
    missed: 'Hi {patientName}, you missed your {vaccineName} immunization appointment on {scheduledDate}. Please reschedule with {facilityName} at {facilityPhone}.'
  },
  
  push: {
    due: {
      title: 'Immunization Due: {vaccineName}',
      body: 'Hi {patientName}, your {vaccineName} immunization is due on {dueDate}. Tap to schedule.',
      data: {
        type: 'due',
        vaccineId: '{vaccineId}',
        patientId: '{patientId}',
        facilityId: '{facilityId}'
      }
    },
    overdue: {
      title: 'OVERDUE: {vaccineName} Immunization',
      body: 'Hi {patientName}, your {vaccineName} immunization is OVERDUE. Tap to schedule immediately.',
      data: {
        type: 'overdue',
        vaccineId: '{vaccineId}',
        patientId: '{patientId}',
        facilityId: '{facilityId}'
      }
    },
    missed: {
      title: 'Missed Appointment: {vaccineName}',
      body: 'Hi {patientName}, you missed your {vaccineName} appointment on {scheduledDate}. Tap to reschedule.',
      data: {
        type: 'missed',
        vaccineId: '{vaccineId}',
        patientId: '{patientId}',
        facilityId: '{facilityId}'
      }
    }
  }
};

/**
 * Generate notification content based on type and delivery method
 * @param {string} type - Notification type (due, overdue, missed)
 * @param {string} method - Delivery method (email, sms, push)
 * @param {Object} data - Template data
 * @returns {Object} Formatted notification content
 */
function generateNotification(type, method, data) {
  const template = templates[method][type];
  
  if (!template) {
    throw new Error(`Template not found for type: ${type}, method: ${method}`);
  }

  // Replace placeholders with actual data
  const placeholders = {
    '{patientName}': data.patientName || data.patient?.fullName || 'Patient',
    '{patientDOB}': data.patientDOB || new Date(data.patient?.dateOfBirth).toLocaleDateString(),
    '{vaccineName}': data.vaccineName || data.vaccine?.name || 'Vaccine',
    '{vaccineId}': data.vaccineId || data.vaccine?.$id,
    '{dueDate}': data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A',
    '{scheduledDate}': data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString() : 'N/A',
    '{priority}': data.priority?.toUpperCase() || 'MEDIUM',
    '{facilityName}': data.facilityName || data.facility?.name || 'Facility',
    '{facilityAddress}': data.facilityAddress || data.facility?.address || 'N/A',
    '{facilityPhone}': data.facilityPhone || data.facility?.contactPhone || 'N/A',
    '{patientId}': data.patientId || data.patient?.$id,
    '{facilityId}': data.facilityId || data.facility?.$id
  };

  let content = template;
  
  // Handle different template structures
  if (method === 'email') {
    content = {
      subject: replacePlaceholders(template.subject, placeholders),
      html: replacePlaceholders(template.html, placeholders),
      text: replacePlaceholders(template.text, placeholders)
    };
  } else if (method === 'sms') {
    content = replacePlaceholders(template, placeholders);
  } else if (method === 'push') {
    content = {
      title: replacePlaceholders(template.title, placeholders),
      body: replacePlaceholders(template.body, placeholders),
      data: replacePlaceholdersInObject(template.data, placeholders)
    };
  }

  return content;
}

/**
 * Replace placeholders in a string
 * @param {string} text - Text with placeholders
 * @param {Object} placeholders - Key-value pairs for replacement
 * @returns {string} Text with placeholders replaced
 */
function replacePlaceholders(text, placeholders) {
  let result = text;
  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  }
  return result;
}

/**
 * Replace placeholders in an object
 * @param {Object} obj - Object with placeholders
 * @param {Object} placeholders - Key-value pairs for replacement
 * @returns {Object} Object with placeholders replaced
 */
function replacePlaceholdersInObject(obj, placeholders) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = replacePlaceholders(value, placeholders);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Get available notification types
 * @returns {Array} List of notification types
 */
function getNotificationTypes() {
  return ['due', 'overdue', 'missed'];
}

/**
 * Get available delivery methods
 * @returns {Array} List of delivery methods
 */
function getDeliveryMethods() {
  return ['email', 'sms', 'push'];
}

module.exports = {
  generateNotification,
  getNotificationTypes,
  getDeliveryMethods,
  templates
};