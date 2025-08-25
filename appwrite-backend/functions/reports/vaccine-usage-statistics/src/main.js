import { Client, Databases, Query } from 'node-appwrite';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';

// Environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.DATABASE_ID || 'immune-me';
const VACCINES_COLLECTION_ID = process.env.VACCINES_COLLECTION_ID || 'vaccines';
const VACCINE_INVENTORY_COLLECTION_ID = process.env.VACCINE_INVENTORY_COLLECTION_ID || 'vaccine_inventory';
const IMMUNIZATION_RECORDS_COLLECTION_ID = process.env.IMMUNIZATION_RECORDS_COLLECTION_ID || 'immunization_records';
const FACILITIES_COLLECTION_ID = process.env.FACILITIES_COLLECTION_ID || 'facilities';
const DISTRICTS_COLLECTION_ID = process.env.DISTRICTS_COLLECTION_ID || 'districts';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

export default async ({ req, res, log, error }) => {
  try {
    log('Starting vaccine usage statistics analysis...');

    // Parse request parameters
    const {
      startDate,
      endDate,
      facilityId,
      districtId,
      vaccineId,
      includeTrends = true,
      includeCostAnalysis = true
    } = req.body || {};

    // Set default date range (last 30 days)
    const end = endDate ? parseISO(endDate) : new Date();
    const start = startDate ? parseISO(startDate) : subDays(end, 30);

    log(`Analyzing data from ${format(start, 'yyyy-MM-dd')} to ${format(end, 'yyyy-MM-dd')}`);

    // Fetch all required data
    const [
      vaccines,
      inventory,
      immunizationRecords,
      facilities,
      districts
    ] = await Promise.all([
      fetchVaccines(),
      fetchVaccineInventory(),
      fetchImmunizationRecords(start, end, facilityId, districtId, vaccineId),
      fetchFacilities(),
      fetchDistricts()
    ]);

    // Process and analyze data
    const analysis = await processVaccineUsageAnalysis({
      vaccines,
      inventory,
      immunizationRecords,
      facilities,
      districts,
      startDate: start,
      endDate: end,
      facilityId,
      districtId,
      vaccineId,
      includeTrends,
      includeCostAnalysis
    });

    log('Vaccine usage statistics analysis completed successfully');

    return res.json({
      success: true,
      data: analysis,
      meta: {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        filters: {
          facilityId,
          districtId,
          vaccineId
        }
      }
    });

  } catch (err) {
    error('Error in vaccine usage statistics:', err);
    return res.json({
      success: false,
      error: err.message || 'Internal server error',
      timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    }, 500);
  }
};

// Fetch all vaccines
async function fetchVaccines() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      VACCINES_COLLECTION_ID,
      [Query.limit(100)]
    );
    return response.documents;
  } catch (err) {
    console.error('Error fetching vaccines:', err);
    return [];
  }
}

// Fetch vaccine inventory
async function fetchVaccineInventory() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      VACCINE_INVENTORY_COLLECTION_ID,
      [Query.limit(1000)]
    );
    return response.documents;
  } catch (err) {
    console.error('Error fetching vaccine inventory:', err);
    return [];
  }
}

// Fetch immunization records
async function fetchImmunizationRecords(startDate, endDate, facilityId, districtId, vaccineId) {
  try {
    const queries = [
      Query.greaterThanEqual('administeredAt', startDate.toISOString()),
      Query.lessThanEqual('administeredAt', endDate.toISOString()),
      Query.limit(1000)
    ];

    if (facilityId) {
      queries.push(Query.equal('facilityId', facilityId));
    }

    if (vaccineId) {
      queries.push(Query.equal('vaccineId', vaccineId));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      IMMUNIZATION_RECORDS_COLLECTION_ID,
      queries
    );

    // Filter by district if provided
    if (districtId) {
      const facilities = await fetchFacilities();
      const districtFacilities = facilities
        .filter(f => f.districtId === districtId)
        .map(f => f.$id);
      
      return response.documents.filter(record => 
        districtFacilities.includes(record.facilityId)
      );
    }

    return response.documents;
  } catch (err) {
    console.error('Error fetching immunization records:', err);
    return [];
  }
}

// Fetch facilities
async function fetchFacilities() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      FACILITIES_COLLECTION_ID,
      [Query.limit(100)]
    );
    return response.documents;
  } catch (err) {
    console.error('Error fetching facilities:', err);
    return [];
  }
}

// Fetch districts
async function fetchDistricts() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      DISTRICTS_COLLECTION_ID,
      [Query.limit(50)]
    );
    return response.documents;
  } catch (err) {
    console.error('Error fetching districts:', err);
    return [];
  }
}

// Main analysis function
async function processVaccineUsageAnalysis(data) {
  const {
    vaccines,
    inventory,
    immunizationRecords,
    facilities,
    districts,
    startDate,
    endDate,
    includeTrends,
    includeCostAnalysis
  } = data;

  // Create lookup maps
  const vaccineMap = new Map(vaccines.map(v => [v.$id, v]));
  const facilityMap = new Map(facilities.map(f => [f.$id, f]));
  const districtMap = new Map(districts.map(d => [d.$id, d]));

  // Calculate basic metrics
  const usageByVaccine = calculateUsageByVaccine(immunizationRecords, vaccineMap);
  const usageByFacility = calculateUsageByFacility(immunizationRecords, facilityMap, vaccineMap);
  const usageByDistrict = calculateUsageByDistrict(immunizationRecords, facilityMap, districtMap, vaccineMap);
  
  // Calculate inventory metrics
  const inventoryAnalysis = analyzeInventory(inventory, vaccineMap, startDate, endDate);
  
  // Calculate wastage and expiry
  const wastageAnalysis = calculateWastageRates(inventory, immunizationRecords, vaccineMap);
  const expiryAnalysis = analyzeExpiryTracking(inventory, vaccineMap);
  
  // Calculate reorder alerts
  const reorderAlerts = calculateReorderAlerts(inventory, usageByVaccine, vaccineMap);
  
  // Calculate trends
  let trends = null;
  if (includeTrends) {
    trends = calculateUsageTrends(immunizationRecords, vaccineMap, startDate, endDate);
  }
  
  // Calculate cost analysis
  let costAnalysis = null;
  if (includeCostAnalysis) {
    costAnalysis = calculateCostAnalysis(usageByVaccine, inventory, vaccineMap);
  }

  return {
    summary: {
      totalVaccines: vaccines.length,
      totalImmunizations: immunizationRecords.length,
      totalFacilities: facilities.length,
      totalDistricts: districts.length,
      dateRange: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      }
    },
    usageByVaccine,
    usageByFacility,
    usageByDistrict,
    inventory: inventoryAnalysis,
    wastage: wastageAnalysis,
    expiry: expiryAnalysis,
    reorderAlerts,
    trends,
    costAnalysis
  };
}

// Calculate usage by vaccine
function calculateUsageByVaccine(records, vaccineMap) {
  const usage = {};

  records.forEach(record => {
    const vaccineId = record.vaccineId;
    if (!usage[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      usage[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        totalDoses: 0,
        uniquePatients: new Set(),
        facilities: new Set()
      };
    }

    usage[vaccineId].totalDoses += record.doses || 1;
    usage[vaccineId].uniquePatients.add(record.patientId);
    usage[vaccineId].facilities.add(record.facilityId);
  });

  // Convert Sets to counts and arrays
  return Object.values(usage).map(item => ({
    ...item,
    uniquePatients: item.uniquePatients.size,
    facilities: Array.from(item.facilities),
    facilityCount: item.facilities.size
  }));
}

// Calculate usage by facility
function calculateUsageByFacility(records, facilityMap, vaccineMap) {
  const usage = {};

  records.forEach(record => {
    const facilityId = record.facilityId;
    if (!usage[facilityId]) {
      const facility = facilityMap.get(facilityId);
      usage[facilityId] = {
        facilityId,
        facilityName: facility?.name || 'Unknown',
        districtId: facility?.districtId,
        totalDoses: 0,
        vaccines: {},
        patients: new Set()
      };
    }

    usage[facilityId].totalDoses += record.doses || 1;
    usage[facilityId].patients.add(record.patientId);

    const vaccineId = record.vaccineId;
    if (!usage[facilityId].vaccines[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      usage[facilityId].vaccines[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        doses: 0
      };
    }
    usage[facilityId].vaccines[vaccineId].doses += record.doses || 1;
  });

  return Object.values(usage).map(item => ({
    ...item,
    patients: item.patients.size,
    vaccines: Object.values(item.vaccines)
  }));
}

// Calculate usage by district
function calculateUsageByDistrict(records, facilityMap, districtMap, vaccineMap) {
  const usage = {};

  records.forEach(record => {
    const facility = facilityMap.get(record.facilityId);
    const districtId = facility?.districtId;
    
    if (!districtId) return;

    if (!usage[districtId]) {
      const district = districtMap.get(districtId);
      usage[districtId] = {
        districtId,
        districtName: district?.name || 'Unknown',
        totalDoses: 0,
        vaccines: {},
        facilities: new Set(),
        patients: new Set()
      };
    }

    usage[districtId].totalDoses += record.doses || 1;
    usage[districtId].patients.add(record.patientId);
    usage[districtId].facilities.add(record.facilityId);

    const vaccineId = record.vaccineId;
    if (!usage[districtId].vaccines[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      usage[districtId].vaccines[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        doses: 0
      };
    }
    usage[districtId].vaccines[vaccineId].doses += record.doses || 1;
  });

  return Object.values(usage).map(item => ({
    ...item,
    patients: item.patients.size,
    facilities: item.facilities.size,
    vaccines: Object.values(item.vaccines)
  }));
}

// Analyze inventory
function analyzeInventory(inventory, vaccineMap, startDate, endDate) {
  const analysis = {};

  inventory.forEach(item => {
    const vaccineId = item.vaccineId;
    if (!analysis[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      analysis[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        currentStock: 0,
        totalReceived: 0,
        totalUsed: 0,
        totalWasted: 0,
        totalExpired: 0,
        batches: []
      };
    }

    const batch = {
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      quantityReceived: item.quantityReceived || 0,
      quantityUsed: item.quantityUsed || 0,
      quantityWasted: item.quantityWasted || 0,
      quantityExpired: item.quantityExpired || 0,
      currentStock: item.currentStock || 0,
      unitCost: item.unitCost || 0,
      supplier: item.supplier
    };

    analysis[vaccineId].currentStock += item.currentStock || 0;
    analysis[vaccineId].totalReceived += item.quantityReceived || 0;
    analysis[vaccineId].totalUsed += item.quantityUsed || 0;
    analysis[vaccineId].totalWasted += item.quantityWasted || 0;
    analysis[vaccineId].totalExpired += item.quantityExpired || 0;
    analysis[vaccineId].batches.push(batch);
  });

  return Object.values(analysis);
}

// Calculate wastage rates
function calculateWastageRates(inventory, immunizationRecords, vaccineMap) {
  const wastage = {};

  // Calculate from inventory
  inventory.forEach(item => {
    const vaccineId = item.vaccineId;
    if (!wastage[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      wastage[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        totalReceived: 0,
        totalUsed: 0,
        totalWasted: 0,
        totalExpired: 0,
        wastageRate: 0,
        expiryRate: 0
      };
    }

    wastage[vaccineId].totalReceived += item.quantityReceived || 0;
    wastage[vaccineId].totalUsed += item.quantityUsed || 0;
    wastage[vaccineId].totalWasted += item.quantityWasted || 0;
    wastage[vaccineId].totalExpired += item.quantityExpired || 0;
  });

  // Calculate rates
  Object.values(wastage).forEach(item => {
    const total = item.totalReceived;
    if (total > 0) {
      item.wastageRate = (item.totalWasted / total) * 100;
      item.expiryRate = (item.totalExpired / total) * 100;
    }
  });

  return Object.values(wastage);
}

// Analyze expiry tracking
function analyzeExpiryTracking(inventory, vaccineMap) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expiry = {};

  inventory.forEach(item => {
    if (!item.expiryDate) return;

    const expiryDate = parseISO(item.expiryDate);
    const vaccineId = item.vaccineId;

    if (!expiry[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      expiry[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        expiring30Days: 0,
        expiring90Days: 0,
        expired: 0,
        batches: []
      };
    }

    const batchInfo = {
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      quantity: item.currentStock || 0,
      daysToExpiry: differenceInDays(expiryDate, now)
    };

    if (expiryDate < now) {
      expiry[vaccineId].expired += item.currentStock || 0;
    } else if (expiryDate <= thirtyDaysFromNow) {
      expiry[vaccineId].expiring30Days += item.currentStock || 0;
    } else if (expiryDate <= ninetyDaysFromNow) {
      expiry[vaccineId].expiring90Days += item.currentStock || 0;
    }

    expiry[vaccineId].batches.push(batchInfo);
  });

  return Object.values(expiry);
}

// Calculate reorder alerts
function calculateReorderAlerts(inventory, usageByVaccine, vaccineMap) {
  const alerts = [];

  // Create current stock map
  const currentStock = {};
  inventory.forEach(item => {
    if (!currentStock[item.vaccineId]) {
      currentStock[item.vaccineId] = 0;
    }
    currentStock[item.vaccineId] += item.currentStock || 0;
  });

  // Create usage rate map (daily average)
  const usageRate = {};
  usageByVaccine.forEach(item => {
    usageRate[item.vaccineId] = item.totalDoses / 30; // Assuming 30-day period
  });

  // Check reorder levels
  Object.keys(currentStock).forEach(vaccineId => {
    const vaccine = vaccineMap.get(vaccineId);
    const stock = currentStock[vaccineId];
    const dailyUsage = usageRate[vaccineId] || 0;
    const reorderLevel = vaccine?.reorderLevel || 50;
    const reorderQuantity = vaccine?.reorderQuantity || 100;

    const daysOfStock = dailyUsage > 0 ? stock / dailyUsage : Infinity;

    if (stock <= reorderLevel || daysOfStock <= 7) {
      alerts.push({
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        currentStock: stock,
        dailyUsage,
        daysOfStock: Math.round(daysOfStock),
        reorderLevel,
        reorderQuantity,
        urgency: daysOfStock <= 3 ? 'high' : daysOfStock <= 7 ? 'medium' : 'low'
      });
    }
  });

  return alerts.sort((a, b) => a.daysOfStock - b.daysOfStock);
}

// Calculate usage trends
function calculateUsageTrends(records, vaccineMap, startDate, endDate) {
  const trends = {};
  const dailyData = {};

  // Initialize daily data structure
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    dailyData[dateKey] = {};
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  // Populate daily data
  records.forEach(record => {
    const dateKey = format(parseISO(record.administeredAt), 'yyyy-MM-dd');
    const vaccineId = record.vaccineId;
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {};
    }
    
    if (!dailyData[dateKey][vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      dailyData[dateKey][vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        doses: 0
      };
    }
    dailyData[dateKey][vaccineId].doses += record.doses || 1;
  });

  // Calculate trends for each vaccine
  vaccines.forEach(vaccine => {
    const vaccineId = vaccine.$id;
    const dailyUsage = Object.entries(dailyData).map(([date, vaccines]) => ({
      date,
      doses: vaccines[vaccineId]?.doses || 0
    }));

    const totalDoses = dailyUsage.reduce((sum, day) => sum + day.doses, 0);
    const avgDailyUsage = totalDoses / Object.keys(dailyData).length;
    
    // Calculate 7-day moving average
    const movingAverage = [];
    for (let i = 6; i < dailyUsage.length; i++) {
      const weekSum = dailyUsage.slice(i - 6, i + 1).reduce((sum, day) => sum + day.doses, 0);
      movingAverage.push({
        date: dailyUsage[i].date,
        average: weekSum / 7
      });
    }

    trends[vaccineId] = {
      vaccineId,
      vaccineName: vaccine.name,
      dailyUsage,
      movingAverage,
      totalDoses,
      avgDailyUsage,
      trend: calculateTrendDirection(dailyUsage)
    };
  });

  return Object.values(trends);
}

// Calculate trend direction
function calculateTrendDirection(dailyUsage) {
  if (dailyUsage.length < 7) return 'insufficient_data';
  
  const firstWeek = dailyUsage.slice(0, 7).reduce((sum, day) => sum + day.doses, 0) / 7;
  const lastWeek = dailyUsage.slice(-7).reduce((sum, day) => sum + day.doses, 0) / 7;
  
  const change = ((lastWeek - firstWeek) / firstWeek) * 100;
  
  if (change > 10) return 'increasing';
  if (change < -10) return 'decreasing';
  return 'stable';
}

// Calculate cost analysis
function calculateCostAnalysis(usageByVaccine, inventory, vaccineMap) {
  const costAnalysis = {};

  // Calculate usage costs
  usageByVaccine.forEach(usage => {
    const vaccine = vaccineMap.get(usage.vaccineId);
    const unitCost = vaccine?.unitCost || 0;
    
    costAnalysis[usage.vaccineId] = {
      vaccineId: usage.vaccineId,
      vaccineName: usage.vaccineName,
      totalDoses: usage.totalDoses,
      unitCost,
      totalUsageCost: usage.totalDoses * unitCost
    };
  });

  // Calculate inventory value
  inventory.forEach(item => {
    const vaccineId = item.vaccineId;
    if (!costAnalysis[vaccineId]) {
      const vaccine = vaccineMap.get(vaccineId);
      costAnalysis[vaccineId] = {
        vaccineId,
        vaccineName: vaccine?.name || 'Unknown',
        totalDoses: 0,
        unitCost: item.unitCost || 0,
        totalUsageCost: 0
      };
    }
    
    const currentStock = item.currentStock || 0;
    const unitCost = item.unitCost || costAnalysis[vaccineId].unitCost;
    
    costAnalysis[vaccineId].currentStock = currentStock;
    costAnalysis[vaccineId].inventoryValue = currentStock * unitCost;
    costAnalysis[vaccineId].totalReceived = item.quantityReceived || 0;
    costAnalysis[vaccineId].totalReceivedCost = (item.quantityReceived || 0) * unitCost;
    costAnalysis[vaccineId].totalWastedCost = (item.quantityWasted || 0) * unitCost;
    costAnalysis[vaccineId].totalExpiredCost = (item.quantityExpired || 0) * unitCost;
  });

  // Calculate summary
  const summary = {
    totalUsageCost: Object.values(costAnalysis).reduce((sum, item) => sum + item.totalUsageCost, 0),
    totalInventoryValue: Object.values(costAnalysis).reduce((sum, item) => sum + (item.inventoryValue || 0), 0),
    totalWastedCost: Object.values(costAnalysis).reduce((sum, item) => sum + (item.totalWastedCost || 0), 0),
    totalExpiredCost: Object.values(costAnalysis).reduce((sum, item) => sum + (item.totalExpiredCost || 0), 0)
  };

  return {
    summary,
    byVaccine: Object.values(costAnalysis)
  };
}