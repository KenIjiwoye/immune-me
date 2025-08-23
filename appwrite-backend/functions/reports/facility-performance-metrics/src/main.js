import { Client, Databases, Query } from 'node-appwrite';
import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// Environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID || 'immune-me';
const IMMUNIZATION_RECORDS_COLLECTION = process.env.IMMUNIZATION_RECORDS_COLLECTION || 'immunization-records';
const NOTIFICATIONS_COLLECTION = process.env.NOTIFICATIONS_COLLECTION || 'notifications';
const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';
const PATIENTS_COLLECTION = process.env.PATIENTS_COLLECTION || 'patients';
const FACILITIES_COLLECTION = process.env.FACILITIES_COLLECTION || 'facilities';

// Timezone configuration
const TIMEZONE = process.env.TIMEZONE || 'Africa/Monrovia';

export default async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Parse request payload
    const { facilityId, periodDays = 30, compareWithPrevious = true } = req.body || {};

    if (!facilityId) {
      return res.json({
        success: false,
        error: 'facilityId is required'
      }, 400);
    }

    // Calculate date ranges
    const now = new Date();
    const currentPeriodEnd = utcToZonedTime(now, TIMEZONE);
    const currentPeriodStart = startOfDay(subDays(currentPeriodEnd, periodDays));
    
    let previousPeriodStart, previousPeriodEnd;
    if (compareWithPrevious) {
      previousPeriodEnd = endOfDay(subDays(currentPeriodStart, 1));
      previousPeriodStart = startOfDay(subDays(previousPeriodEnd, periodDays));
    }

    log(`Calculating metrics for facility ${facilityId}`);
    log(`Current period: ${format(currentPeriodStart, 'yyyy-MM-dd')} to ${format(currentPeriodEnd, 'yyyy-MM-dd')}`);

    // Fetch facility data
    const facility = await databases.getDocument(
      DATABASE_ID,
      FACILITIES_COLLECTION,
      facilityId
    );

    // Calculate all metrics
    const metrics = await calculateFacilityMetrics(
      databases,
      facilityId,
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
      compareWithPrevious,
      log
    );

    // Generate summary
    const summary = generatePerformanceSummary(metrics, facility);

    return res.json({
      success: true,
      data: {
        facility: {
          id: facility.$id,
          name: facility.name,
          type: facility.type,
          location: facility.location
        },
        period: {
          days: periodDays,
          startDate: format(currentPeriodStart, 'yyyy-MM-dd'),
          endDate: format(currentPeriodEnd, 'yyyy-MM-dd')
        },
        metrics,
        summary,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error('Error calculating facility performance metrics:', err);
    return res.json({
      success: false,
      error: err.message || 'Internal server error'
    }, 500);
  }
};

async function calculateFacilityMetrics(
  databases,
  facilityId,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
  compareWithPrevious,
  log
) {
  const metrics = {
    immunization: {},
    notifications: {},
    staff: {},
    comparisons: {}
  };

  // 1. Immunization Metrics
  metrics.immunization = await calculateImmunizationMetrics(
    databases,
    facilityId,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    compareWithPrevious,
    log
  );

  // 2. Notification Metrics
  metrics.notifications = await calculateNotificationMetrics(
    databases,
    facilityId,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    compareWithPrevious,
    log
  );

  // 3. Staff Performance Metrics
  metrics.staff = await calculateStaffMetrics(
    databases,
    facilityId,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    compareWithPrevious,
    log
  );

  // 4. Overall Performance Score
  metrics.overallScore = calculateOverallScore(metrics);

  return metrics;
}

async function calculateImmunizationMetrics(
  databases,
  facilityId,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
  compareWithPrevious,
  log
) {
  // Get immunization records for current period
  const currentRecords = await databases.listDocuments(
    DATABASE_ID,
    IMMUNIZATION_RECORDS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.greaterThanEqual('administeredAt', currentStart.toISOString()),
      Query.lessThan('administeredAt', currentEnd.toISOString()),
      Query.orderDesc('administeredAt')
    ]
  );

  // Get patients registered at this facility
  const facilityPatients = await databases.listDocuments(
    DATABASE_ID,
    PATIENTS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.limit(10000)
    ]
  );

  // Calculate metrics
  const totalPatients = facilityPatients.total;
  const totalImmunizations = currentRecords.total;
  const uniqueImmunizedPatients = new Set(currentRecords.documents.map(r => r.patientId)).size;
  
  // Calculate immunization rate
  const immunizationRate = totalPatients > 0 ? (uniqueImmunizedPatients / totalPatients) * 100 : 0;

  // Calculate vaccine-specific rates
  const vaccineStats = {};
  currentRecords.documents.forEach(record => {
    const vaccine = record.vaccineName || record.vaccineCode;
    if (!vaccineStats[vaccine]) {
      vaccineStats[vaccine] = { count: 0, patients: new Set() };
    }
    vaccineStats[vaccine].count++;
    vaccineStats[vaccine].patients.add(record.patientId);
  });

  const vaccineRates = Object.entries(vaccineStats).map(([vaccine, stats]) => ({
    vaccine,
    count: stats.count,
    uniquePatients: stats.patients.size,
    rate: totalPatients > 0 ? (stats.patients.size / totalPatients) * 100 : 0
  }));

  // Age group analysis
  const ageGroups = {
    '0-1': { min: 0, max: 1, count: 0, patients: new Set() },
    '1-5': { min: 1, max: 5, count: 0, patients: new Set() },
    '5-15': { min: 5, max: 15, count: 0, patients: new Set() },
    '15+': { min: 15, max: 200, count: 0, patients: new Set() }
  };

  for (const patient of facilityPatients.documents) {
    const age = calculateAge(patient.dateOfBirth);
    for (const [group, range] of Object.entries(ageGroups)) {
      if (age >= range.min && age < range.max) {
        ageGroups[group].count++;
        break;
      }
    }
  }

  const ageGroupRates = {};
  for (const [group, stats] of Object.entries(ageGroups)) {
    const immunizedInGroup = currentRecords.documents.filter(r => {
      const patient = facilityPatients.documents.find(p => p.$id === r.patientId);
      if (!patient) return false;
      const age = calculateAge(patient.dateOfBirth);
      return age >= stats.min && age < stats.max;
    });
    
    const uniqueImmunized = new Set(immunizedInGroup.map(r => r.patientId)).size;
    ageGroupRates[group] = {
      totalPatients: stats.count,
      immunizedPatients: uniqueImmunized,
      rate: stats.count > 0 ? (uniqueImmunized / stats.count) * 100 : 0
    };
  }

  // Previous period comparison
  let previousMetrics = null;
  if (compareWithPrevious) {
    const previousRecords = await databases.listDocuments(
      DATABASE_ID,
      IMMUNIZATION_RECORDS_COLLECTION,
      [
        Query.equal('facilityId', facilityId),
        Query.greaterThanEqual('administeredAt', previousStart.toISOString()),
        Query.lessThan('administeredAt', previousEnd.toISOString())
      ]
    );

    const prevUniqueImmunized = new Set(previousRecords.documents.map(r => r.patientId)).size;
    const prevImmunizationRate = totalPatients > 0 ? (prevUniqueImmunized / totalPatients) * 100 : 0;

    previousMetrics = {
      totalImmunizations: previousRecords.total,
      immunizationRate: prevImmunizationRate,
      uniqueImmunizedPatients: prevUniqueImmunized
    };
  }

  return {
    totalPatients,
    totalImmunizations,
    uniqueImmunizedPatients,
    immunizationRate: Math.round(immunizationRate * 100) / 100,
    vaccineRates,
    ageGroupRates,
    previousPeriod: previousMetrics
  };
}

async function calculateNotificationMetrics(
  databases,
  facilityId,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
  compareWithPrevious,
  log
) {
  // Get notifications for current period
  const currentNotifications = await databases.listDocuments(
    DATABASE_ID,
    NOTIFICATIONS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.greaterThanEqual('createdAt', currentStart.toISOString()),
      Query.lessThan('createdAt', currentEnd.toISOString()),
      Query.orderDesc('createdAt')
    ]
  );

  // Calculate notification metrics
  const totalNotifications = currentNotifications.total;
  const sentNotifications = currentNotifications.documents.filter(n => n.status === 'sent').length;
  const deliveredNotifications = currentNotifications.documents.filter(n => n.deliveryStatus === 'delivered').length;
  const readNotifications = currentNotifications.documents.filter(n => n.readAt).length;
  const respondedNotifications = currentNotifications.documents.filter(n => n.responseStatus === 'responded').length;

  // Calculate rates
  const deliveryRate = totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0;
  const readRate = deliveredNotifications > 0 ? (readNotifications / deliveredNotifications) * 100 : 0;
  const responseRate = deliveredNotifications > 0 ? (respondedNotifications / deliveredNotifications) * 100 : 0;

  // Notification type analysis
  const notificationTypes = {};
  currentNotifications.documents.forEach(notification => {
    const type = notification.type || 'general';
    if (!notificationTypes[type]) {
      notificationTypes[type] = { total: 0, delivered: 0, read: 0, responded: 0 };
    }
    notificationTypes[type].total++;
    if (notification.deliveryStatus === 'delivered') notificationTypes[type].delivered++;
    if (notification.readAt) notificationTypes[type].read++;
    if (notification.responseStatus === 'responded') notificationTypes[type].responded++;
  });

  const typeRates = Object.entries(notificationTypes).map(([type, stats]) => ({
    type,
    total: stats.total,
    deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
    readRate: stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0,
    responseRate: stats.delivered > 0 ? (stats.responded / stats.delivered) * 100 : 0
  }));

  // Previous period comparison
  let previousMetrics = null;
  if (compareWithPrevious) {
    const previousNotifications = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      [
        Query.equal('facilityId', facilityId),
        Query.greaterThanEqual('createdAt', previousStart.toISOString()),
        Query.lessThan('createdAt', previousEnd.toISOString())
      ]
    );

    const prevSent = previousNotifications.documents.filter(n => n.status === 'sent').length;
    const prevDelivered = previousNotifications.documents.filter(n => n.deliveryStatus === 'delivered').length;
    const prevRead = previousNotifications.documents.filter(n => n.readAt).length;
    const prevResponded = previousNotifications.documents.filter(n => n.responseStatus === 'responded').length;

    previousMetrics = {
      totalNotifications: previousNotifications.total,
      deliveryRate: previousNotifications.total > 0 ? (prevDelivered / previousNotifications.total) * 100 : 0,
      readRate: prevDelivered > 0 ? (prevRead / prevDelivered) * 100 : 0,
      responseRate: prevDelivered > 0 ? (prevResponded / prevDelivered) * 100 : 0
    };
  }

  return {
    totalNotifications,
    sentNotifications,
    deliveredNotifications,
    readNotifications,
    respondedNotifications,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    readRate: Math.round(readRate * 100) / 100,
    responseRate: Math.round(responseRate * 100) / 100,
    typeRates,
    previousPeriod: previousMetrics
  };
}

async function calculateStaffMetrics(
  databases,
  facilityId,
  currentStart,
  currentEnd,
  previousStart,
  previousEnd,
  compareWithPrevious,
  log
) {
  // Get staff members for the facility
  const staffMembers = await databases.listDocuments(
    DATABASE_ID,
    USERS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.equal('role', 'healthcare_worker'),
      Query.limit(1000)
    ]
  );

  // Get immunization records by staff
  const immunizationRecords = await databases.listDocuments(
    DATABASE_ID,
    IMMUNIZATION_RECORDS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.greaterThanEqual('administeredAt', currentStart.toISOString()),
      Query.lessThan('administeredAt', currentEnd.toISOString()),
      Query.limit(10000)
    ]
  );

  // Get notifications handled by staff
  const notifications = await databases.listDocuments(
    DATABASE_ID,
    NOTIFICATIONS_COLLECTION,
    [
      Query.equal('facilityId', facilityId),
      Query.greaterThanEqual('createdAt', currentStart.toISOString()),
      Query.lessThan('createdAt', currentEnd.toISOString()),
      Query.limit(10000)
    ]
  );

  // Calculate staff performance
  const staffPerformance = {};
  
  for (const staff of staffMembers.documents) {
    const staffId = staff.$id;
    
    // Immunizations administered by this staff
    const staffImmunizations = immunizationRecords.documents.filter(
      r => r.administeredBy === staffId
    );
    
    // Notifications handled by this staff
    const staffNotifications = notifications.documents.filter(
      n => n.createdBy === staffId || n.handledBy === staffId
    );
    
    // Response rate for notifications they sent
    const sentNotifications = staffNotifications.filter(n => n.createdBy === staffId);
    const respondedCount = sentNotifications.filter(n => n.responseStatus === 'responded').length;
    const staffResponseRate = sentNotifications.length > 0 ? (respondedCount / sentNotifications.length) * 100 : 0;

    staffPerformance[staffId] = {
      name: staff.name,
      email: staff.email,
      immunizationsAdministered: staffImmunizations.length,
      notificationsSent: sentNotifications.length,
      notificationsResponded: respondedCount,
      responseRate: Math.round(staffResponseRate * 100) / 100,
      lastActive: staff.lastActive || staff.updatedAt
    };
  }

  // Calculate facility averages
  const totalStaff = Object.keys(staffPerformance).length;
  const totalImmunizations = immunizationRecords.documents.length;
  const avgImmunizationsPerStaff = totalStaff > 0 ? totalImmunizations / totalStaff : 0;
  const avgResponseRate = totalStaff > 0 
    ? Object.values(staffPerformance).reduce((sum, p) => sum + p.responseRate, 0) / totalStaff 
    : 0;

  // Previous period comparison
  let previousMetrics = null;
  if (compareWithPrevious) {
    const prevImmunizations = await databases.listDocuments(
      DATABASE_ID,
      IMMUNIZATION_RECORDS_COLLECTION,
      [
        Query.equal('facilityId', facilityId),
        Query.greaterThanEqual('administeredAt', previousStart.toISOString()),
        Query.lessThan('administeredAt', previousEnd.toISOString())
      ]
    );

    const prevNotifications = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      [
        Query.equal('facilityId', facilityId),
        Query.greaterThanEqual('createdAt', previousStart.toISOString()),
        Query.lessThan('createdAt', previousEnd.toISOString())
      ]
    );

    const prevStaffPerformance = {};
    for (const staff of staffMembers.documents) {
      const staffId = staff.$id;
      const prevStaffImmunizations = prevImmunizations.documents.filter(r => r.administeredBy === staffId);
      const prevStaffNotifications = prevNotifications.documents.filter(n => n.createdBy === staffId);
      const prevSent = prevStaffNotifications.filter(n => n.createdBy === staffId);
      const prevResponded = prevSent.filter(n => n.responseStatus === 'responded').length;
      const prevResponseRate = prevSent.length > 0 ? (prevResponded / prevSent.length) * 100 : 0;

      prevStaffPerformance[staffId] = {
        immunizationsAdministered: prevStaffImmunizations.length,
        notificationsSent: prevSent.length,
        responseRate: prevResponseRate
      };
    }

    const prevAvgImmunizations = totalStaff > 0 ? prevImmunizations.documents.length / totalStaff : 0;
    const prevAvgResponseRate = totalStaff > 0 
      ? Object.values(prevStaffPerformance).reduce((sum, p) => sum + p.responseRate, 0) / totalStaff 
      : 0;

    previousMetrics = {
      avgImmunizationsPerStaff: prevAvgImmunizations,
      avgResponseRate: prevAvgResponseRate
    };
  }

  return {
    totalStaff,
    avgImmunizationsPerStaff: Math.round(avgImmunizationsPerStaff * 100) / 100,
    avgResponseRate: Math.round(avgResponseRate * 100) / 100,
    staffPerformance: Object.values(staffPerformance).sort((a, b) => b.immunizationsAdministered - a.immunizationsAdministered),
    previousPeriod: previousMetrics
  };
}

function calculateOverallScore(metrics) {
  const weights = {
    immunizationRate: 0.4,
    notificationResponseRate: 0.3,
    staffPerformance: 0.3
  };

  const immunizationScore = metrics.immunization.immunizationRate || 0;
  const notificationScore = metrics.notifications.responseRate || 0;
  const staffScore = metrics.staff.avgResponseRate || 0;

  const overallScore = (
    (immunizationScore * weights.immunizationRate) +
    (notificationScore * weights.notificationResponseRate) +
    (staffScore * weights.staffPerformance)
  );

  return {
    score: Math.round(overallScore * 100) / 100,
    breakdown: {
      immunization: Math.round(immunizationScore * 100) / 100,
      notifications: Math.round(notificationScore * 100) / 100,
      staff: Math.round(staffScore * 100) / 100
    }
  };
}

function generatePerformanceSummary(metrics, facility) {
  const overall = metrics.overallScore;
  const immunization = metrics.immunization;
  const notifications = metrics.notifications;
  const staff = metrics.staff;

  let summary = {
    level: '',
    description: '',
    strengths: [],
    improvements: [],
    recommendations: []
  };

  // Determine performance level
  if (overall.score >= 80) {
    summary.level = 'Excellent';
    summary.description = `${facility.name} is performing exceptionally well across all metrics.`;
  } else if (overall.score >= 60) {
    summary.level = 'Good';
    summary.description = `${facility.name} is performing well with room for improvement in specific areas.`;
  } else if (overall.score >= 40) {
    summary.level = 'Fair';
    summary.description = `${facility.name} needs attention in several key performance areas.`;
  } else {
    summary.level = 'Poor';
    summary.description = `${facility.name} requires immediate attention to improve performance across all metrics.`;
  }

  // Identify strengths
  if (immunization.immunizationRate >= 80) {
    summary.strengths.push('High immunization coverage rate');
  }
  if (notifications.responseRate >= 70) {
    summary.strengths.push('Good notification response rate');
  }
  if (staff.avgResponseRate >= 80) {
    summary.strengths.push('Strong staff engagement');
  }

  // Identify improvements needed
  if (immunization.immunizationRate < 60) {
    summary.improvements.push('Immunization coverage needs improvement');
  }
  if (notifications.deliveryRate < 80) {
    summary.improvements.push('Notification delivery issues');
  }
  if (notifications.responseRate < 50) {
    summary.improvements.push('Low notification response rate');
  }
  if (staff.avgResponseRate < 60) {
    summary.improvements.push('Staff engagement needs improvement');
  }

  // Generate recommendations
  if (immunization.immunizationRate < 70) {
    summary.recommendations.push('Conduct targeted outreach for unimmunized patients');
  }
  if (notifications.deliveryRate < 90) {
    summary.recommendations.push('Review notification delivery channels and contact information');
  }
  if (notifications.responseRate < 60) {
    summary.recommendations.push('Implement reminder systems and follow-up protocols');
  }
  if (staff.avgResponseRate < 70) {
    summary.recommendations.push('Provide staff training on patient engagement and follow-up');
  }

  return summary;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  return differenceInDays(today, birthDate) / 365.25;
}