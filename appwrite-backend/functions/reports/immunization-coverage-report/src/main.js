import { Client, Databases, Query } from 'node-appwrite';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import NodeCache from 'node-cache';

// Environment variables
const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  IMMUNIZATION_RECORDS_COLLECTION_ID,
  PATIENTS_COLLECTION_ID,
  FACILITIES_COLLECTION_ID,
  VACCINES_COLLECTION_ID,
  CACHE_TTL_SECONDS = 86400 // 24 hours default
} = process.env;

// Cache setup
const cache = new NodeCache({ stdTTL: parseInt(CACHE_TTL_SECONDS) });

// Appwrite client setup
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Constants
const AGE_GROUPS = {
  '0-11 months': { min: 0, max: 11 },
  '12-23 months': { min: 12, max: 23 },
  '24-35 months': { min: 24, max: 35 },
  '36-47 months': { min: 36, max: 47 },
  '48-59 months': { min: 48, max: 59 },
  '5+ years': { min: 60, max: Infinity }
};

const TARGET_POPULATIONS = {
  '0-11 months': 100,
  '12-23 months': 95,
  '24-35 months': 90,
  '36-47 months': 85,
  '48-59 months': 80,
  '5+ years': 75
};

/**
 * Calculate age in months from birth date
 * @param {string} birthDate - ISO date string
 * @returns {number} Age in months
 */
function calculateAgeInMonths(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.floor((now - birth) / (1000 * 60 * 60 * 24 * 30.44));
}

/**
 * Get age group for a given age in months
 * @param {number} ageInMonths 
 * @returns {string} Age group name
 */
function getAgeGroup(ageInMonths) {
  for (const [group, range] of Object.entries(AGE_GROUPS)) {
    if (ageInMonths >= range.min && ageInMonths <= range.max) {
      return group;
    }
  }
  return '5+ years';
}

/**
 * Generate cache key based on parameters
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
function generateCacheKey(params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `coverage_report_${Buffer.from(sortedParams).toString('base64')}`;
}

/**
 * Fetch all documents from a collection with pagination
 * @param {string} collectionId 
 * @param {Array} queries 
 * @returns {Array} All documents
 */
async function fetchAllDocuments(collectionId, queries = []) {
  const documents = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      collectionId,
      [...queries, Query.limit(limit), Query.offset(offset)]
    );
    
    documents.push(...response.documents);
    
    if (response.documents.length < limit) {
      break;
    }
    
    offset += limit;
  }
  
  return documents;
}

/**
 * Calculate immunization coverage metrics
 * @param {Object} filters - Report filters
 * @returns {Object} Coverage report
 */
async function calculateCoverageMetrics(filters = {}) {
  const {
    facilityId,
    startDate,
    endDate,
    vaccineId
  } = filters;

  try {
    // Build queries based on filters
    const immunizationQueries = [];
    
    if (startDate) {
      immunizationQueries.push(Query.greaterThanEqual('date', startDate));
    }
    
    if (endDate) {
      immunizationQueries.push(Query.lessThanEqual('date', endDate));
    }
    
    if (facilityId) {
      immunizationQueries.push(Query.equal('facilityId', facilityId));
    }
    
    if (vaccineId) {
      immunizationQueries.push(Query.equal('vaccineId', vaccineId));
    }

    // Fetch all required data
    const [
      immunizationRecords,
      patients,
      facilities,
      vaccines
    ] = await Promise.all([
      fetchAllDocuments(IMMUNIZATION_RECORDS_COLLECTION_ID, immunizationQueries),
      fetchAllDocuments(PATIENTS_COLLECTION_ID),
      fetchAllDocuments(FACILITIES_COLLECTION_ID),
      fetchAllDocuments(VACCINES_COLLECTION_ID)
    ]);

    // Create lookup maps
    const patientMap = new Map(patients.map(p => [p.$id, p]));
    const facilityMap = new Map(facilities.map(f => [f.$id, f]));
    const vaccineMap = new Map(vaccines.map(v => [v.$id, v]));

    // Calculate coverage metrics
    const coverageByVaccine = {};
    const coverageByAgeGroup = {};
    const coverageByFacility = {};
    const monthlyTrends = {};

    // Initialize structures
    vaccines.forEach(vaccine => {
      coverageByVaccine[vaccine.$id] = {
        vaccineId: vaccine.$id,
        vaccineName: vaccine.name,
        totalAdministered: 0,
        targetPopulation: 0,
        coverageRate: 0,
        fullyImmunized: 0
      };
    });

    Object.keys(AGE_GROUPS).forEach(group => {
      coverageByAgeGroup[group] = {
        ageGroup: group,
        totalChildren: 0,
        fullyImmunized: 0,
        coverageRate: 0,
        vaccines: {}
      };
    });

    facilities.forEach(facility => {
      coverageByFacility[facility.$id] = {
        facilityId: facility.$id,
        facilityName: facility.name,
        totalAdministered: 0,
        targetPopulation: 0,
        coverageRate: 0,
        fullyImmunized: 0
      };
    });

    // Process immunization records
    const patientVaccines = new Map(); // patientId -> Set of vaccineIds
    const patientAgeGroups = new Map(); // patientId -> ageGroup

    immunizationRecords.forEach(record => {
      const patient = patientMap.get(record.patientId);
      if (!patient) return;

      const ageInMonths = calculateAgeInMonths(patient.dateOfBirth);
      const ageGroup = getAgeGroup(ageInMonths);
      
      patientAgeGroups.set(record.patientId, ageGroup);
      
      if (!patientVaccines.has(record.patientId)) {
        patientVaccines.set(record.patientId, new Set());
      }
      patientVaccines.get(record.patientId).add(record.vaccineId);

      // Update vaccine metrics
      if (coverageByVaccine[record.vaccineId]) {
        coverageByVaccine[record.vaccineId].totalAdministered++;
      }

      // Update facility metrics
      if (coverageByFacility[record.facilityId]) {
        coverageByFacility[record.facilityId].totalAdministered++;
      }

      // Update age group metrics
      if (coverageByAgeGroup[ageGroup]) {
        if (!coverageByAgeGroup[ageGroup].vaccines[record.vaccineId]) {
          coverageByAgeGroup[ageGroup].vaccines[record.vaccineId] = {
            vaccineId: record.vaccineId,
            vaccineName: vaccineMap.get(record.vaccineId)?.name || 'Unknown',
            administered: 0,
            coverageRate: 0
          };
        }
        coverageByAgeGroup[ageGroup].vaccines[record.vaccineId].administered++;
      }

      // Update monthly trends
      const monthKey = format(new Date(record.date), 'yyyy-MM');
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = {
          month: monthKey,
          totalAdministered: 0,
          vaccines: {}
        };
      }
      
      monthlyTrends[monthKey].totalAdministered++;
      
      if (!monthlyTrends[monthKey].vaccines[record.vaccineId]) {
        monthlyTrends[monthKey].vaccines[record.vaccineId] = {
          vaccineId: record.vaccineId,
          vaccineName: vaccineMap.get(record.vaccineId)?.name || 'Unknown',
          count: 0
        };
      }
      monthlyTrends[monthKey].vaccines[record.vaccineId].count++;
    });

    // Calculate final metrics
    patients.forEach(patient => {
      const ageInMonths = calculateAgeInMonths(patient.dateOfBirth);
      const ageGroup = getAgeGroup(ageInMonths);
      
      if (coverageByAgeGroup[ageGroup]) {
        coverageByAgeGroup[ageGroup].totalChildren++;
      }

      // Check if fully immunized (has all required vaccines)
      const patientVaccineSet = patientVaccines.get(patient.$id) || new Set();
      const requiredVaccines = vaccines.filter(v => v.isRequired).map(v => v.$id);
      const isFullyImmunized = requiredVaccines.every(vaccineId => patientVaccineSet.has(vaccineId));

      if (isFullyImmunized) {
        if (coverageByAgeGroup[ageGroup]) {
          coverageByAgeGroup[ageGroup].fullyImmunized++;
        }
        
        // Update facility fully immunized count
        const patientRecords = immunizationRecords.filter(r => r.patientId === patient.$id);
        const facilitiesForPatient = [...new Set(patientRecords.map(r => r.facilityId))];
        facilitiesForPatient.forEach(facilityId => {
          if (coverageByFacility[facilityId]) {
            coverageByFacility[facilityId].fullyImmunized++;
          }
        });
      }
    });

    // Calculate coverage rates
    Object.keys(coverageByVaccine).forEach(vaccineId => {
      const vaccine = coverageByVaccine[vaccineId];
      vaccine.targetPopulation = patients.length;
      vaccine.coverageRate = vaccine.targetPopulation > 0 
        ? (vaccine.totalAdministered / vaccine.targetPopulation) * 100 
        : 0;
    });

    Object.keys(coverageByAgeGroup).forEach(group => {
      const ageGroup = coverageByAgeGroup[group];
      ageGroup.coverageRate = ageGroup.totalChildren > 0 
        ? (ageGroup.fullyImmunized / ageGroup.totalChildren) * 100 
        : 0;
      
      Object.keys(ageGroup.vaccines).forEach(vaccineId => {
        const vaccine = ageGroup.vaccines[vaccineId];
        vaccine.coverageRate = ageGroup.totalChildren > 0 
          ? (vaccine.administered / ageGroup.totalChildren) * 100 
          : 0;
      });
    });

    Object.keys(coverageByFacility).forEach(facilityId => {
      const facility = coverageByFacility[facilityId];
      facility.targetPopulation = patients.length;
      facility.coverageRate = facility.targetPopulation > 0 
        ? (facility.fullyImmunized / facility.targetPopulation) * 100 
        : 0;
    });

    return {
      summary: {
        totalPatients: patients.length,
        totalImmunizations: immunizationRecords.length,
        totalFacilities: facilities.length,
        totalVaccines: vaccines.length,
        overallCoverageRate: patients.length > 0 
          ? ([...patientVaccines.values()].filter(vaccines => vaccines.size >= vaccines.filter(v => v.isRequired).length).length / patients.length) * 100 
          : 0
      },
      coverageByVaccine: Object.values(coverageByVaccine),
      coverageByAgeGroup: Object.values(coverageByAgeGroup),
      coverageByFacility: Object.values(coverageByFacility),
      monthlyTrends: Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month)),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error calculating coverage metrics:', error);
    throw new Error(`Failed to calculate coverage metrics: ${error.message}`);
  }
}

/**
 * Main Appwrite function handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export default async function handler(req, res) {
  try {
    // Validate environment variables
    const requiredEnvVars = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
      'APPWRITE_DATABASE_ID',
      'IMMUNIZATION_RECORDS_COLLECTION_ID',
      'PATIENTS_COLLECTION_ID',
      'FACILITIES_COLLECTION_ID',
      'VACCINES_COLLECTION_ID'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      return res.json({
        success: false,
        error: `Missing required environment variables: ${missingEnvVars.join(', ')}`
      }, 400);
    }

    // Parse query parameters
    const filters = {
      facilityId: req.query.facilityId || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      vaccineId: req.query.vaccineId || null
    };

    // Generate cache key
    const cacheKey = generateCacheKey(filters);
    
    // Check cache
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log('Returning cached result');
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Calculate coverage metrics
    console.log('Calculating coverage metrics...');
    const report = await calculateCoverageMetrics(filters);

    // Cache the result
    cache.set(cacheKey, report);

    // Return response
    return res.json({
      success: true,
      data: report,
      cached: false
    });

  } catch (error) {
    console.error('Error in handler:', error);
    return res.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500);
  }
}

// For local development
if (process.env.NODE_ENV === 'development') {
  console.log('Running in development mode');
}