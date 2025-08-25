import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Mock Appwrite environment for testing
process.env.APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-key';
process.env.DATABASE_ID = 'immune-me';
process.env.VACCINES_COLLECTION_ID = 'vaccines';
process.env.VACCINE_INVENTORY_COLLECTION_ID = 'vaccine_inventory';
process.env.IMMUNIZATION_RECORDS_COLLECTION_ID = 'immunization_records';
process.env.FACILITIES_COLLECTION_ID = 'facilities';
process.env.DISTRICTS_COLLECTION_ID = 'districts';

// Mock Appwrite client
const mockClient = {
  setEndpoint: () => mockClient,
  setProject: () => mockClient,
  setKey: () => mockClient
};

// Mock Databases
const mockDatabases = {
  listDocuments: async (databaseId, collectionId, queries = []) => {
    console.log(`Mock query: ${collectionId} with queries:`, queries);
    
    // Return mock data based on collection
    switch (collectionId) {
      case 'vaccines':
        return {
          documents: [
            {
              $id: 'vaccine_1',
              name: 'BCG',
              unitCost: 2.5,
              reorderLevel: 50,
              reorderQuantity: 100
            },
            {
              $id: 'vaccine_2',
              name: 'Polio',
              unitCost: 1.8,
              reorderLevel: 100,
              reorderQuantity: 200
            },
            {
              $id: 'vaccine_3',
              name: 'Measles',
              unitCost: 3.2,
              reorderLevel: 75,
              reorderQuantity: 150
            }
          ]
        };
      
      case 'vaccine_inventory':
        return {
          documents: [
            {
              $id: 'inventory_1',
              vaccineId: 'vaccine_1',
              batchNumber: 'BCG2024001',
              expiryDate: '2025-06-15',
              quantityReceived: 500,
              quantityUsed: 350,
              quantityWasted: 25,
              quantityExpired: 10,
              currentStock: 115,
              unitCost: 2.5,
              supplier: 'UNICEF',
              facilityId: 'facility_1'
            },
            {
              $id: 'inventory_2',
              vaccineId: 'vaccine_2',
              batchNumber: 'POL2024001',
              expiryDate: '2025-08-20',
              quantityReceived: 1000,
              quantityUsed: 800,
              quantityWasted: 50,
              quantityExpired: 5,
              currentStock: 145,
              unitCost: 1.8,
              supplier: 'WHO',
              facilityId: 'facility_1'
            }
          ]
        };
      
      case 'immunization_records':
        return {
          documents: Array.from({ length: 50 }, (_, i) => ({
            $id: `record_${i + 1}`,
            vaccineId: i % 3 === 0 ? 'vaccine_1' : i % 3 === 1 ? 'vaccine_2' : 'vaccine_3',
            facilityId: `facility_${(i % 3) + 1}`,
            patientId: `patient_${(i % 20) + 1}`,
            administeredAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            doses: 1
          }))
        };
      
      case 'facilities':
        return {
          documents: [
            {
              $id: 'facility_1',
              name: 'Central Hospital',
              districtId: 'district_1'
            },
            {
              $id: 'facility_2',
              name: 'Community Health Center',
              districtId: 'district_1'
            },
            {
              $id: 'facility_3',
              name: 'Regional Clinic',
              districtId: 'district_2'
            }
          ]
        };
      
      case 'districts':
        return {
          documents: [
            {
              $id: 'district_1',
              name: 'Montserrado'
            },
            {
              $id: 'district_2',
              name: 'Bong'
            }
          ]
        };
      
      default:
        return { documents: [] };
    }
  }
};

// Import the main function
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mainPath = join(__dirname, 'src', 'main.js');

// Mock the node-appwrite imports
const mockNodeAppwrite = {
  Client: () => mockClient,
  Databases: () => mockDatabases,
  Query: {
    limit: (n) => `limit(${n})`,
    equal: (field, value) => `equal(${field}, ${value})`,
    greaterThanEqual: (field, value) => `greaterThanEqual(${field}, ${value})`,
    lessThanEqual: (field, value) => `lessThanEqual(${field}, ${value})`
  }
};

// Test the function
async function testVaccineUsageStatistics() {
  console.log('🧪 Testing Vaccine Usage Statistics Function...\n');
  
  try {
    // Read and execute the main function
    const mainContent = readFileSync(mainPath, 'utf8');
    
    // Create a mock module
    const mockModule = {
      default: null
    };
    
    // Create a function constructor to execute the module
    const functionCode = mainContent
      .replace(/import { Client, Databases, Query } from 'node-appwrite';/, 
               'const { Client, Databases, Query } = mockNodeAppwrite;')
      .replace(/export default async/, 'async function main');
    
    // Execute the function
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const main = new AsyncFunction('mockNodeAppwrite', 'process', functionCode + '\nreturn main;')(mockNodeAppwrite, process);
    
    // Mock request and response objects
    const mockReq = {
      body: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeTrends: true,
        includeCostAnalysis: true
      }
    };
    
    const mockRes = {
      json: (data, status = 200) => {
        console.log('✅ Function executed successfully!');
        console.log('📊 Response:', JSON.stringify(data, null, 2));
        return { status, data };
      }
    };
    
    const mockLog = (msg) => console.log(`📝 ${msg}`);
    const mockError = (msg, err) => console.error(`❌ ${msg}`, err);
    
    // Execute the function
    const result = await main({
      req: mockReq,
      res: mockRes,
      log: mockLog,
      error: mockError
    });
    
    console.log('\n🎯 Test completed successfully!');
    return result;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testVaccineUsageStatistics();
}

export { testVaccineUsageStatistics };