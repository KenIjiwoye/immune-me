import { Client, Databases, Query } from 'node-appwrite';
import { format, addDays, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

// Environment variables
const {
  APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1',
  APPWRITE_PROJECT_ID = '',
  APPWRITE_API_KEY = '',
  APPWRITE_DATABASE_ID = '',
  PATIENTS_COLLECTION_ID = 'patients',
  IMMUNIZATION_RECORDS_COLLECTION_ID = 'immunization-records',
  VACCINE_SCHEDULES_COLLECTION_ID = 'vaccine-schedules',
  FACILITIES_COLLECTION_ID = 'facilities',
  VACCINES_COLLECTION_ID = 'vaccines',
  TIMEZONE = 'Africa/Monrovia'
} = process.env;

// Priority levels
const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

// Status categories
const STATUS_CATEGORIES = {
  OVERDUE: 'overdue',
  UPCOMING: 'upcoming',
  DUE_SOON: 'due_soon'
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Helper functions
function getCurrentDate() {
  return utcToZonedTime(new Date(), TIMEZONE);
}

function calculateAge(birthDate) {
  const today = getCurrentDate();
  const birth = parseISO(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

function calculateAgeInMonths(birthDate) {
  const today = getCurrentDate();
  const birth = parseISO(birthDate);
  return differenceInDays(today, birth) / 30.44; // Average days per month
}

function calculateAgeInWeeks(birthDate) {
  const today = getCurrentDate();
  const birth = parseISO(birthDate);
  return differenceInDays(today, birth) / 7;
}

function calculateAgeInDays(birthDate) {
  const today = getCurrentDate();
  const birth = parseISO(birthDate);
  return differenceInDays(today, birth);
}

function determinePriority(dueDate, status) {
  const today = getCurrentDate();
  const due = parseISO(dueDate);
  const daysUntilDue = differenceInDays(due, today);

  if (status === STATUS_CATEGORIES.OVERDUE) {
    return PRIORITY_LEVELS.HIGH;
  } else if (daysUntilDue <= 7) {
    return PRIORITY_LEVELS.HIGH;
  } else if (daysUntilDue <= 14) {
    return PRIORITY_LEVELS.MEDIUM;
  } else {
    return PRIORITY_LEVELS.LOW;
  }
}

function categorizeDueDate(dueDate) {
  const today = getCurrentDate();
  const due = parseISO(dueDate);
  const daysUntilDue = differenceInDays(due, today);

  if (daysUntilDue < 0) {
    return STATUS_CATEGORIES.OVERDUE;
  } else if (daysUntilDue <= 30) {
    return STATUS_CATEGORIES.UPCOMING;
  } else {
    return STATUS_CATEGORIES.DUE_SOON;
  }
}

function formatDateForDisplay(dateString) {
  return format(parseISO(dateString), 'yyyy-MM-dd');
}

function calculateNextDoseDate(scheduleItem, birthDate, lastDoseDate = null) {
  const birth = parseISO(birthDate);
  let nextDate;

  if (scheduleItem.age_unit === 'days') {
    nextDate = addDays(birth, scheduleItem.age_value);
  } else if (scheduleItem.age_unit === 'weeks') {
    nextDate = addDays(birth, scheduleItem.age_value * 7);
  } else if (scheduleItem.age_unit === 'months') {
    nextDate = addDays(birth, Math.round(scheduleItem.age_value * 30.44));
  } else if (scheduleItem.age_unit === 'years') {
    nextDate = addDays(birth, Math.round(scheduleItem.age_value * 365.25));
  }

  // If there's a minimum interval and last dose date, calculate based on last dose
  if (lastDoseDate && scheduleItem.min_interval_days) {
    const intervalDate = addDays(parseISO(lastDoseDate), scheduleItem.min_interval_days);
    if (isAfter(intervalDate, nextDate)) {
      nextDate = intervalDate;
    }
  }

  return format(nextDate, 'yyyy-MM-dd');
}

async function getVaccineSchedules() {
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      VACCINE_SCHEDULES_COLLECTION_ID,
      [Query.limit(100)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching vaccine schedules:', error);
    throw error;
  }
}

async function getPatientImmunizationRecords(patientId) {
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      IMMUNIZATION_RECORDS_COLLECTION_ID,
      [
        Query.equal('patient_id', patientId),
        Query.orderDesc('administration_date'),
        Query.limit(100)
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching immunization records:', error);
    throw error;
  }
}

async function getPatients(facilityId = null) {
  try {
    const queries = [Query.limit(1000)];
    
    if (facilityId) {
      queries.push(Query.equal('facility_id', facilityId));
    }
    
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      PATIENTS_COLLECTION_ID,
      queries
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
}

async function getVaccines() {
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      VACCINES_COLLECTION_ID,
      [Query.limit(100)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching vaccines:', error);
    throw error;
  }
}

async function getFacilities() {
  try {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      FACILITIES_COLLECTION_ID,
      [Query.limit(100)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching facilities:', error);
    throw error;
  }
}

function getLatestDoseForVaccine(immunizationRecords, vaccineId) {
  const records = immunizationRecords.filter(record => record.vaccine_id === vaccineId);
  if (records.length === 0) return null;
  
  return records.reduce((latest, current) => {
    return isAfter(parseISO(current.administration_date), parseISO(latest.administration_date)) 
      ? current 
      : latest;
  });
}

function calculateDueImmunizations(patient, vaccineSchedules, immunizationRecords, vaccines) {
  const dueImmunizations = [];
  const patientAgeInDays = calculateAgeInDays(patient.date_of_birth);
  const patientAgeInWeeks = calculateAgeInWeeks(patient.date_of_birth);
  const patientAgeInMonths = calculateAgeInMonths(patient.date_of_birth);
  const patientAgeInYears = calculateAge(patient.date_of_birth);

  for (const schedule of vaccineSchedules) {
    const vaccine = vaccines.find(v => v.$id === schedule.vaccine_id);
    if (!vaccine) continue;

    // Check if patient age is appropriate for this vaccine
    let shouldConsider = false;
    if (schedule.age_unit === 'days' && patientAgeInDays >= schedule.age_value) {
      shouldConsider = true;
    } else if (schedule.age_unit === 'weeks' && patientAgeInWeeks >= schedule.age_value) {
      shouldConsider = true;
    } else if (schedule.age_unit === 'months' && patientAgeInMonths >= schedule.age_value) {
      shouldConsider = true;
    } else if (schedule.age_unit === 'years' && patientAgeInYears >= schedule.age_value) {
      shouldConsider = true;
    }

    if (!shouldConsider) continue;

    // Check if this dose has already been administered
    const latestDose = getLatestDoseForVaccine(immunizationRecords, schedule.vaccine_id);
    
    if (latestDose) {
      // Check if this is the correct dose number
      const doseCount = immunizationRecords.filter(
        record => record.vaccine_id === schedule.vaccine_id
      ).length;
      
      if (doseCount >= schedule.dose_number) {
        continue; // Already received this dose
      }
    }

    // Calculate due date
    const dueDate = calculateNextDoseDate(
      schedule, 
      patient.date_of_birth, 
      latestDose?.administration_date
    );

    const status = categorizeDueDate(dueDate);
    const priority = determinePriority(dueDate, status);

    dueImmunizations.push({
      patient_id: patient.$id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_email: patient.email || null,
      patient_phone: patient.phone || null,
      patient_date_of_birth: patient.date_of_birth,
      patient_age: patientAgeInYears,
      facility_id: patient.facility_id,
      vaccine_id: schedule.vaccine_id,
      vaccine_name: vaccine.name,
      vaccine_code: vaccine.code,
      dose_number: schedule.dose_number,
      due_date: dueDate,
      status: status,
      priority: priority,
      days_overdue: status === STATUS_CATEGORIES.OVERDUE 
        ? Math.abs(differenceInDays(parseISO(dueDate), getCurrentDate()))
        : 0,
      days_until_due: status !== STATUS_CATEGORIES.OVERDUE 
        ? differenceInDays(parseISO(dueDate), getCurrentDate())
        : 0,
      last_dose_date: latestDose?.administration_date || null,
      notes: schedule.notes || null
    });
  }

  return dueImmunizations;
}

export default async ({ req, res, log, error }) => {
  try {
    log('Starting due immunizations report generation');

    // Validate required environment variables
    if (!APPWRITE_DATABASE_ID) {
      throw new Error('APPWRITE_DATABASE_ID is required');
    }

    // Parse request parameters
    const { facilityId, priority, status, daysAhead = 30 } = req.query || {};

    // Fetch all required data
    log('Fetching vaccine schedules...');
    const vaccineSchedules = await getVaccineSchedules();

    log('Fetching vaccines...');
    const vaccines = await getVaccines();

    log('Fetching patients...');
    const patients = await getPatients(facilityId);

    log('Processing patients for due immunizations...');
    const allDueImmunizations = [];

    for (const patient of patients) {
      const immunizationRecords = await getPatientImmunizationRecords(patient.$id);
      const dueImmunizations = calculateDueImmunizations(
        patient,
        vaccineSchedules,
        immunizationRecords,
        vaccines
      );
      
      allDueImmunizations.push(...dueImmunizations);
    }

    // Filter by status if provided
    let filteredImmunizations = allDueImmunizations;
    
    if (status) {
      filteredImmunizations = filteredImmunizations.filter(
        item => item.status === status
      );
    }

    // Filter by priority if provided
    if (priority) {
      filteredImmunizations = filteredImmunizations.filter(
        item => item.priority === priority
      );
    }

    // Filter upcoming immunizations by days ahead
    filteredImmunizations = filteredImmunizations.filter(item => {
      if (item.status === STATUS_CATEGORIES.UPCOMING) {
        return item.days_until_due <= parseInt(daysAhead);
      }
      return true;
    });

    // Sort by priority and due date
    filteredImmunizations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return new Date(a.due_date) - new Date(b.due_date);
    });

    // Group by facility if no facility filter was applied
    let reportData = filteredImmunizations;
    
    if (!facilityId) {
      const facilities = await getFacilities();
      const facilityMap = new Map(facilities.map(f => [f.$id, f.name]));
      
      reportData = filteredImmunizations.map(item => ({
        ...item,
        facility_name: facilityMap.get(item.facility_id) || 'Unknown Facility'
      }));
    }

    // Generate summary statistics
    const summary = {
      total_due: filteredImmunizations.length,
      overdue: filteredImmunizations.filter(item => item.status === STATUS_CATEGORIES.OVERDUE).length,
      upcoming: filteredImmunizations.filter(item => item.status === STATUS_CATEGORIES.UPCOMING).length,
      due_soon: filteredImmunizations.filter(item => item.status === STATUS_CATEGORIES.DUE_SOON).length,
      high_priority: filteredImmunizations.filter(item => item.priority === PRIORITY_LEVELS.HIGH).length,
      medium_priority: filteredImmunizations.filter(item => item.priority === PRIORITY_LEVELS.MEDIUM).length,
      low_priority: filteredImmunizations.filter(item => item.priority === PRIORITY_LEVELS.LOW).length,
      by_vaccine: {},
      by_facility: {}
    };

    // Group by vaccine
    filteredImmunizations.forEach(item => {
      if (!summary.by_vaccine[item.vaccine_name]) {
        summary.by_vaccine[item.vaccine_name] = 0;
      }
      summary.by_vaccine[item.vaccine_name]++;
    });

    // Group by facility
    filteredImmunizations.forEach(item => {
      const facilityName = item.facility_name || 'Unknown Facility';
      if (!summary.by_facility[facilityName]) {
        summary.by_facility[facilityName] = 0;
      }
      summary.by_facility[facilityName]++;
    });

    log(`Report generated successfully. Found ${filteredImmunizations.length} due immunizations`);

    return res.json({
      success: true,
      data: {
        immunizations: filteredImmunizations,
        summary: summary,
        generated_at: format(getCurrentDate(), 'yyyy-MM-dd HH:mm:ss'),
        filters: {
          facilityId,
          priority,
          status,
          daysAhead: parseInt(daysAhead)
        }
      }
    });

  } catch (err) {
    error('Error generating due immunizations report:');
    error(err);
    
    return res.json({
      success: false,
      error: err.message || 'Failed to generate due immunizations report',
      timestamp: format(getCurrentDate(), 'yyyy-MM-dd HH:mm:ss')
    }, 500);
  }
};