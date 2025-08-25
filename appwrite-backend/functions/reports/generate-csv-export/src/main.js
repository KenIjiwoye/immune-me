import { Client, Databases, Storage, Query } from 'node-appwrite';
import { createObjectCsvStringifier } from 'csv-writer';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export default async ({ req, res, log, error }) => {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      return res.json({ 
        success: false, 
        message: 'Method not allowed. Use POST request.' 
      }, 405);
    }

    // Validate required environment variables
    const requiredEnvVars = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
      'APPWRITE_DATABASE_ID',
      'APPWRITE_STORAGE_BUCKET_ID'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Parse request body
    const { 
      reportType, 
      filters = {}, 
      dateRange = {}, 
      facilityId, 
      vaccineId 
    } = JSON.parse(req.body || '{}');

    // Validate report type
    const validReportTypes = [
      'immunization_coverage',
      'facility_performance',
      'due_immunizations',
      'age_distribution',
      'vaccine_usage'
    ];

    if (!reportType || !validReportTypes.includes(reportType)) {
      return res.json({
        success: false,
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      }, 400);
    }

    // Initialize Appwrite clients
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const storage = new Storage(client);

    log(`Starting CSV export for report type: ${reportType}`);

    // Generate CSV based on report type
    const csvResult = await generateCSVReport({
      reportType,
      databases,
      storage,
      filters,
      dateRange,
      facilityId,
      vaccineId,
      log,
      error
    });

    return res.json({
      success: true,
      data: csvResult
    });

  } catch (err) {
    error('CSV Export Error:', err);
    return res.json({
      success: false,
      message: err.message || 'Failed to generate CSV export',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
  }
};

async function generateCSVReport({ 
  reportType, 
  databases, 
  storage, 
  filters, 
  dateRange, 
  facilityId, 
  vaccineId, 
  log, 
  error 
}) {
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID;
  
  let data = [];
  let headers = [];
  let filename = '';

  // Generate data based on report type
  switch (reportType) {
    case 'immunization_coverage':
      ({ data, headers, filename } = await generateImmunizationCoverageReport({
        databases,
        databaseId,
        filters,
        dateRange,
        facilityId,
        log
      }));
      break;

    case 'facility_performance':
      ({ data, headers, filename } = await generateFacilityPerformanceReport({
        databases,
        databaseId,
        filters,
        dateRange,
        log
      }));
      break;

    case 'due_immunizations':
      ({ data, headers, filename } = await generateDueImmunizationsReport({
        databases,
        databaseId,
        filters,
        dateRange,
        facilityId,
        log
      }));
      break;

    case 'age_distribution':
      ({ data, headers, filename } = await generateAgeDistributionReport({
        databases,
        databaseId,
        filters,
        dateRange,
        log
      }));
      break;

    case 'vaccine_usage':
      ({ data, headers, filename } = await generateVaccineUsageReport({
        databases,
        databaseId,
        filters,
        dateRange,
        vaccineId,
        log
      }));
      break;
  }

  // Create CSV content
  const csvStringifier = createObjectCsvStringifier({
    header: headers
  });

  const csvHeader = csvStringifier.getHeaderString();
  const csvContent = csvStringifier.stringifyRecords(data);

  const csvData = csvHeader + csvContent;

  // Upload to Appwrite Storage
  const fileName = `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
  const fileBuffer = Buffer.from(csvData, 'utf-8');

  log(`Uploading CSV file: ${fileName} (${fileBuffer.length} bytes)`);

  const file = await storage.createFile(
    bucketId,
    'unique()',
    InputFile.fromBuffer(fileBuffer, fileName)
  );

  // Generate download URL
  const downloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${file.$id}/download?project=${process.env.APPWRITE_PROJECT_ID}`;

  return {
    fileId: file.$id,
    fileName: file.name,
    downloadUrl,
    fileSize: file.sizeOriginal,
    recordCount: data.length,
    reportType,
    generatedAt: new Date().toISOString()
  };
}

async function generateImmunizationCoverageReport({ databases, databaseId, filters, dateRange, facilityId, log }) {
  log('Generating immunization coverage report...');

  const queries = [
    Query.orderDesc('$createdAt'),
    Query.limit(1000)
  ];

  if (dateRange.startDate) {
    queries.push(Query.greaterThanEqual('administeredAt', dateRange.startDate));
  }
  if (dateRange.endDate) {
    queries.push(Query.lessThanEqual('administeredAt', dateRange.endDate));
  }
  if (facilityId) {
    queries.push(Query.equal('facilityId', facilityId));
  }

  const immunizations = await databases.listDocuments(
    databaseId,
    'immunization_records',
    queries
  );

  const coverageData = processImmunizationCoverage(immunizations.documents);

  return {
    data: coverageData,
    headers: [
      { id: 'vaccineName', title: 'Vaccine Name' },
      { id: 'targetPopulation', title: 'Target Population' },
      { id: 'totalAdministered', title: 'Total Administered' },
      { id: 'coverageRate', title: 'Coverage Rate (%)' },
      { id: 'facilityName', title: 'Facility' },
      { id: 'period', title: 'Period' }
    ],
    filename: 'immunization_coverage_report'
  };
}

async function generateFacilityPerformanceReport({ databases, databaseId, filters, dateRange, log }) {
  log('Generating facility performance report...');

  const queries = [
    Query.orderDesc('$createdAt'),
    Query.limit(1000)
  ];

  if (dateRange.startDate) {
    queries.push(Query.greaterThanEqual('administeredAt', dateRange.startDate));
  }
  if (dateRange.endDate) {
    queries.push(Query.lessThanEqual('administeredAt', dateRange.endDate));
  }

  const immunizations = await databases.listDocuments(
    databaseId,
    'immunization_records',
    queries
  );

  const facilities = await databases.listDocuments(
    databaseId,
    'facilities',
    [Query.limit(100)]
  );

  const performanceData = processFacilityPerformance(immunizations.documents, facilities.documents);

  return {
    data: performanceData,
    headers: [
      { id: 'facilityName', title: 'Facility Name' },
      { id: 'totalImmunizations', title: 'Total Immunizations' },
      { id: 'uniquePatients', title: 'Unique Patients' },
      { id: 'vaccinesAdministered', title: 'Vaccines Administered' },
      { id: 'performanceScore', title: 'Performance Score' },
      { id: 'lastActivity', title: 'Last Activity' }
    ],
    filename: 'facility_performance_report'
  };
}

async function generateDueImmunizationsReport({ databases, databaseId, filters, dateRange, facilityId, log }) {
  log('Generating due immunizations report...');

  const queries = [
    Query.orderAsc('dueDate'),
    Query.limit(1000)
  ];

  if (dateRange.startDate) {
    queries.push(Query.greaterThanEqual('dueDate', dateRange.startDate));
  }
  if (dateRange.endDate) {
    queries.push(Query.lessThanEqual('dueDate', dateRange.endDate));
  }
  if (facilityId) {
    queries.push(Query.equal('facilityId', facilityId));
  }

  const dueImmunizations = await databases.listDocuments(
    databaseId,
    'due_immunizations',
    queries
  );

  const patients = await databases.listDocuments(
    databaseId,
    'patients',
    [Query.limit(1000)]
  );

  const dueData = processDueImmunizations(dueImmunizations.documents, patients.documents);

  return {
    data: dueData,
    headers: [
      { id: 'patientName', title: 'Patient Name' },
      { id: 'patientId', title: 'Patient ID' },
      { id: 'vaccineName', title: 'Vaccine' },
      { id: 'dueDate', title: 'Due Date' },
      { id: 'facilityName', title: 'Facility' },
      { id: 'contactInfo', title: 'Contact Info' },
      { id: 'priority', title: 'Priority' }
    ],
    filename: 'due_immunizations_report'
  };
}

async function generateAgeDistributionReport({ databases, databaseId, filters, dateRange, log }) {
  log('Generating age distribution report...');

  const queries = [
    Query.orderDesc('$createdAt'),
    Query.limit(1000)
  ];

  if (dateRange.startDate) {
    queries.push(Query.greaterThanEqual('administeredAt', dateRange.startDate));
  }
  if (dateRange.endDate) {
    queries.push(Query.lessThanEqual('administeredAt', dateRange.endDate));
  }

  const immunizations = await databases.listDocuments(
    databaseId,
    'immunization_records',
    queries
  );

  const patients = await databases.listDocuments(
    databaseId,
    'patients',
    [Query.limit(1000)]
  );

  const ageData = processAgeDistribution(immunizations.documents, patients.documents);

  return {
    data: ageData,
    headers: [
      { id: 'ageGroup', title: 'Age Group' },
      { id: 'totalPatients', title: 'Total Patients' },
      { id: 'immunizationsReceived', title: 'Immunizations Received' },
      { id: 'coveragePercentage', title: 'Coverage %' },
      { id: 'vaccinesByAge', title: 'Vaccines by Age Group' }
    ],
    filename: 'age_distribution_report'
  };
}

async function generateVaccineUsageReport({ databases, databaseId, filters, dateRange, vaccineId, log }) {
  log('Generating vaccine usage report...');

  const queries = [
    Query.orderDesc('administeredAt'),
    Query.limit(1000)
  ];

  if (dateRange.startDate) {
    queries.push(Query.greaterThanEqual('administeredAt', dateRange.startDate));
  }
  if (dateRange.endDate) {
    queries.push(Query.lessThanEqual('administeredAt', dateRange.endDate));
  }
  if (vaccineId) {
    queries.push(Query.equal('vaccineId', vaccineId));
  }

  const immunizations = await databases.listDocuments(
    databaseId,
    'immunization_records',
    queries
  );

  const vaccines = await databases.listDocuments(
    databaseId,
    'vaccines',
    [Query.limit(100)]
  );

  const usageData = processVaccineUsage(immunizations.documents, vaccines.documents);

  return {
    data: usageData,
    headers: [
      { id: 'vaccineName', title: 'Vaccine Name' },
      { id: 'totalDoses', title: 'Total Doses' },
      { id: 'uniquePatients', title: 'Unique Patients' },
      { id: 'facilitiesUsed', title: 'Facilities Used' },
      { id: 'usageTrend', title: 'Usage Trend' },
      { id: 'stockStatus', title: 'Stock Status' }
    ],
    filename: 'vaccine_usage_report'
  };
}

// Data processing functions
function processImmunizationCoverage(immunizations) {
  const coverageMap = new Map();

  immunizations.forEach(record => {
    const key = `${record.vaccineName}_${record.facilityId}`;
    if (!coverageMap.has(key)) {
      coverageMap.set(key, {
        vaccineName: record.vaccineName,
        facilityName: record.facilityName || 'Unknown',
        totalAdministered: 0,
        targetPopulation: 100, // This should be calculated based on actual population
        period: format(new Date(record.administeredAt), 'MMM yyyy')
      });
    }
    
    coverageMap.get(key).totalAdministered++;
  });

  return Array.from(coverageMap.values()).map(item => ({
    ...item,
    coverageRate: ((item.totalAdministered / item.targetPopulation) * 100).toFixed(2)
  }));
}

function processFacilityPerformance(immunizations, facilities) {
  const performanceMap = new Map();

  immunizations.forEach(record => {
    if (!performanceMap.has(record.facilityId)) {
      performanceMap.set(record.facilityId, {
        facilityName: record.facilityName || 'Unknown',
        totalImmunizations: 0,
        uniquePatients: new Set(),
        vaccinesAdministered: new Set(),
        lastActivity: record.administeredAt
      });
    }

    const facility = performanceMap.get(record.facilityId);
    facility.totalImmunizations++;
    facility.uniquePatients.add(record.patientId);
    facility.vaccinesAdministered.add(record.vaccineName);
    if (new Date(record.administeredAt) > new Date(facility.lastActivity)) {
      facility.lastActivity = record.administeredAt;
    }
  });

  return Array.from(performanceMap.values()).map(item => ({
    facilityName: item.facilityName,
    totalImmunizations: item.totalImmunizations,
    uniquePatients: item.uniquePatients.size,
    vaccinesAdministered: Array.from(item.vaccinesAdministered).join(', '),
    performanceScore: Math.min(100, (item.totalImmunizations / 10)).toFixed(2),
    lastActivity: format(new Date(item.lastActivity), 'MMM dd, yyyy')
  }));
}

function processDueImmunizations(dueImmunizations, patients) {
  const patientMap = new Map(patients.map(p => [p.$id, p]));

  return dueImmunizations.map(due => {
    const patient = patientMap.get(due.patientId) || {};
    const daysUntilDue = Math.ceil((new Date(due.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    return {
      patientName: `${patient.firstName || 'Unknown'} ${patient.lastName || ''}`.trim(),
      patientId: due.patientId,
      vaccineName: due.vaccineName,
      dueDate: format(new Date(due.dueDate), 'MMM dd, yyyy'),
      facilityName: due.facilityName || 'Unknown',
      contactInfo: patient.phone || patient.email || 'N/A',
      priority: daysUntilDue <= 7 ? 'High' : daysUntilDue <= 30 ? 'Medium' : 'Low'
    };
  });
}

function processAgeDistribution(immunizations, patients) {
  const patientMap = new Map(patients.map(p => [p.$id, p]));
  const ageGroups = {
    '0-1 year': { min: 0, max: 1 },
    '1-5 years': { min: 1, max: 5 },
    '5-12 years': { min: 5, max: 12 },
    '12-18 years': { min: 12, max: 18 },
    '18+ years': { min: 18, max: 999 }
  };

  const ageData = {};

  Object.keys(ageGroups).forEach(group => {
    ageData[group] = {
      ageGroup: group,
      totalPatients: new Set(),
      immunizationsReceived: 0,
      vaccinesByAge: new Set()
    };
  });

  immunizations.forEach(record => {
    const patient = patientMap.get(record.patientId);
    if (!patient || !patient.dateOfBirth) return;

    const age = Math.floor((new Date() - new Date(patient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25));

    for (const [group, range] of Object.entries(ageGroups)) {
      if (age >= range.min && age < range.max) {
        ageData[group].totalPatients.add(record.patientId);
        ageData[group].immunizationsReceived++;
        ageData[group].vaccinesByAge.add(record.vaccineName);
        break;
      }
    }
  });

  return Object.values(ageData).map(item => ({
    ageGroup: item.ageGroup,
    totalPatients: item.totalPatients.size,
    immunizationsReceived: item.immunizationsReceived,
    coveragePercentage: item.totalPatients.size > 0 ? 
      ((item.immunizationsReceived / item.totalPatients.size) * 100).toFixed(2) : '0.00',
    vaccinesByAge: Array.from(item.vaccinesByAge).join(', ')
  }));
}

function processVaccineUsage(immunizations, vaccines) {
  const vaccineMap = new Map(vaccines.map(v => [v.$id, v]));
  const usageMap = new Map();

  immunizations.forEach(record => {
    if (!usageMap.has(record.vaccineId)) {
      const vaccine = vaccineMap.get(record.vaccineId) || {};
      usageMap.set(record.vaccineId, {
        vaccineName: vaccine.name || record.vaccineName || 'Unknown',
        totalDoses: 0,
        uniquePatients: new Set(),
        facilitiesUsed: new Set(),
        usageTrend: 'Stable',
        stockStatus: vaccine.stockStatus || 'Unknown'
      });
    }

    const usage = usageMap.get(record.vaccineId);
    usage.totalDoses++;
    usage.uniquePatients.add(record.patientId);
    usage.facilitiesUsed.add(record.facilityId || 'Unknown');
  });

  return Array.from(usageMap.values()).map(item => ({
    vaccineName: item.vaccineName,
    totalDoses: item.totalDoses,
    uniquePatients: item.uniquePatients.size,
    facilitiesUsed: item.facilitiesUsed.size,
    usageTrend: item.totalDoses > 100 ? 'High' : item.totalDoses > 50 ? 'Medium' : 'Low',
    stockStatus: item.stockStatus
  }));
}

// Import InputFile for file upload
import { InputFile } from 'node-appwrite';