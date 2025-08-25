import { Client, Databases, Storage, Query, InputFile } from 'node-appwrite';
import ExcelJS from 'exceljs';
import moment from 'moment';
import fs from 'fs';
import path from 'path';

// Environment variables
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const STORAGE_BUCKET_ID = process.env.STORAGE_BUCKET_ID || 'reports';
const DATABASE_ID = process.env.DATABASE_ID || 'immunization-db';

// Collection IDs
const COLLECTIONS = {
  PATIENTS: 'patients',
  IMMUNIZATION_RECORDS: 'immunization-records',
  FACILITIES: 'facilities',
  VACCINES: 'vaccines',
  VACCINE_SCHEDULES: 'vaccine-schedules'
};

// Report types configuration
const REPORT_TYPES = {
  IMMUNIZATION_COVERAGE: 'immunization_coverage',
  FACILITY_PERFORMANCE: 'facility_performance',
  DUE_IMMUNIZATIONS: 'due_immunizations',
  AGE_DISTRIBUTION: 'age_distribution',
  VACCINE_USAGE: 'vaccine_usage'
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

// Helper functions
const formatDate = (date) => {
  return moment(date).format('YYYY-MM-DD');
};

const formatDateTime = (date) => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

const calculateAge = (birthDate) => {
  return moment().diff(moment(birthDate), 'years');
};

const getAgeGroup = (age) => {
  if (age < 1) return '0-11 months';
  if (age < 2) return '1 year';
  if (age < 5) return '2-4 years';
  if (age < 10) return '5-9 years';
  if (age < 15) return '10-14 years';
  if (age < 18) return '15-17 years';
  return '18+ years';
};

// Excel styling configuration
const STYLES = {
  header: {
    font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86AB' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  },
  subHeader: {
    font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA23B72' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  },
  columnHeader: {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3460' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  },
  dataCell: {
    font: { size: 11 },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    }
  },
  numericCell: {
    font: { size: 11 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    }
  },
  percentageCell: {
    font: { size: 11 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    numFmt: '0.00%',
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    }
  }
};

// Report generation functions
class ExcelReportGenerator {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'ImmuneMe System';
    this.workbook.lastModifiedBy = 'ImmuneMe System';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  async generateImmunizationCoverageReport(filters = {}) {
    const worksheet = this.workbook.addWorksheet('Immunization Coverage');
    
    // Set column widths
    worksheet.columns = [
      { header: 'Vaccine', key: 'vaccine', width: 20 },
      { header: 'Target Population', key: 'targetPopulation', width: 15 },
      { header: 'Vaccinated', key: 'vaccinated', width: 12 },
      { header: 'Coverage Rate', key: 'coverageRate', width: 12 },
      { header: 'Facility', key: 'facility', width: 25 },
      { header: 'Period', key: 'period', width: 15 }
    ];

    // Add title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Immunization Coverage Report';
    titleCell.style = STYLES.header;

    // Add filters info
    worksheet.mergeCells('A2:F2');
    const filterCell = worksheet.getCell('A2');
    filterCell.value = `Generated: ${formatDateTime(new Date())}`;
    filterCell.style = STYLES.subHeader;

    // Add headers
    const headerRow = worksheet.getRow(4);
    headerRow.values = ['Vaccine', 'Target Population', 'Vaccinated', 'Coverage Rate', 'Facility', 'Period'];
    headerRow.eachCell((cell) => {
      cell.style = STYLES.columnHeader;
    });

    // Fetch data
    const vaccines = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VACCINES);
    const immunizationRecords = await databases.listDocuments(DATABASE_ID, COLLECTIONS.IMMUNIZATION_RECORDS);
    const patients = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS);

    // Process data
    const coverageData = [];
    vaccines.documents.forEach(vaccine => {
      const vaccinatedCount = immunizationRecords.documents.filter(
        record => record.vaccineId === vaccine.$id
      ).length;
      
      const targetPopulation = patients.documents.filter(
        patient => calculateAge(patient.dateOfBirth) <= 5
      ).length;

      coverageData.push({
        vaccine: vaccine.name,
        targetPopulation,
        vaccinated: vaccinatedCount,
        coverageRate: targetPopulation > 0 ? vaccinatedCount / targetPopulation : 0,
        facility: 'All Facilities',
        period: formatDate(new Date())
      });
    });

    // Add data rows
    coverageData.forEach((row, index) => {
      const rowNumber = 5 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = [
        row.vaccine,
        row.targetPopulation,
        row.vaccinated,
        row.coverageRate,
        row.facility,
        row.period
      ];
      
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = STYLES.numericCell;
      dataRow.getCell(3).style = STYLES.numericCell;
      dataRow.getCell(4).style = STYLES.percentageCell;
      dataRow.getCell(5).style = STYLES.dataCell;
      dataRow.getCell(6).style = STYLES.dataCell;
    });

    // Add summary sheet
    await this.addCoverageSummarySheet(coverageData);
  }

  async addCoverageSummarySheet(coverageData) {
    const worksheet = this.workbook.addWorksheet('Coverage Summary');
    
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Coverage Summary';
    titleCell.style = STYLES.header;

    const totalTarget = coverageData.reduce((sum, item) => sum + item.targetPopulation, 0);
    const totalVaccinated = coverageData.reduce((sum, item) => sum + item.vaccinated, 0);
    const overallCoverage = totalTarget > 0 ? totalVaccinated / totalTarget : 0;

    const summaryData = [
      ['Total Target Population', totalTarget],
      ['Total Vaccinated', totalVaccinated],
      ['Overall Coverage Rate', overallCoverage],
      ['Number of Vaccines', coverageData.length],
      ['Report Generated', formatDateTime(new Date())]
    ];

    summaryData.forEach((row, index) => {
      const rowNumber = 3 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = row;
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = index === 2 ? STYLES.percentageCell : STYLES.numericCell;
    });
  }

  async generateFacilityPerformanceReport(filters = {}) {
    const worksheet = this.workbook.addWorksheet('Facility Performance');
    
    worksheet.columns = [
      { header: 'Facility', key: 'facility', width: 25 },
      { header: 'Total Patients', key: 'totalPatients', width: 15 },
      { header: 'Immunizations Given', key: 'immunizationsGiven', width: 18 },
      { header: 'Completion Rate', key: 'completionRate', width: 15 },
      { header: 'Last Activity', key: 'lastActivity', width: 20 }
    ];

    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Facility Performance Report';
    titleCell.style = STYLES.header;

    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Facility', 'Total Patients', 'Immunizations Given', 'Completion Rate', 'Last Activity'];
    headerRow.eachCell((cell) => {
      cell.style = STYLES.columnHeader;
    });

    const facilities = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FACILITIES);
    const patients = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS);
    const immunizationRecords = await databases.listDocuments(DATABASE_ID, COLLECTIONS.IMMUNIZATION_RECORDS);

    const facilityData = facilities.documents.map(facility => {
      const facilityPatients = patients.documents.filter(
        patient => patient.facilityId === facility.$id
      );
      
      const facilityImmunizations = immunizationRecords.documents.filter(
        record => facilityPatients.some(patient => patient.$id === record.patientId)
      );

      return {
        facility: facility.name,
        totalPatients: facilityPatients.length,
        immunizationsGiven: facilityImmunizations.length,
        completionRate: facilityPatients.length > 0 ? facilityImmunizations.length / facilityPatients.length : 0,
        lastActivity: facility.updatedAt || facility.$createdAt
      };
    });

    facilityData.forEach((row, index) => {
      const rowNumber = 4 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = [
        row.facility,
        row.totalPatients,
        row.immunizationsGiven,
        row.completionRate,
        formatDateTime(row.lastActivity)
      ];
      
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = STYLES.numericCell;
      dataRow.getCell(3).style = STYLES.numericCell;
      dataRow.getCell(4).style = STYLES.percentageCell;
      dataRow.getCell(5).style = STYLES.dataCell;
    });
  }

  async generateAgeDistributionReport(filters = {}) {
    const worksheet = this.workbook.addWorksheet('Age Distribution');
    
    worksheet.columns = [
      { header: 'Age Group', key: 'ageGroup', width: 20 },
      { header: 'Total Patients', key: 'totalPatients', width: 15 },
      { header: 'Immunized', key: 'immunized', width: 12 },
      { header: 'Coverage Rate', key: 'coverageRate', width: 15 }
    ];

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Age Distribution Report';
    titleCell.style = STYLES.header;

    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Age Group', 'Total Patients', 'Immunized', 'Coverage Rate'];
    headerRow.eachCell((cell) => {
      cell.style = STYLES.columnHeader;
    });

    const patients = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS);
    const immunizationRecords = await databases.listDocuments(DATABASE_ID, COLLECTIONS.IMMUNIZATION_RECORDS);

    const ageGroups = ['0-11 months', '1 year', '2-4 years', '5-9 years', '10-14 years', '15-17 years', '18+ years'];
    const ageData = ageGroups.map(group => {
      const patientsInGroup = patients.documents.filter(patient => {
        const age = calculateAge(patient.dateOfBirth);
        return getAgeGroup(age) === group;
      });

      const immunizedCount = patientsInGroup.filter(patient => 
        immunizationRecords.documents.some(record => record.patientId === patient.$id)
      ).length;

      return {
        ageGroup: group,
        totalPatients: patientsInGroup.length,
        immunized: immunizedCount,
        coverageRate: patientsInGroup.length > 0 ? immunizedCount / patientsInGroup.length : 0
      };
    });

    ageData.forEach((row, index) => {
      const rowNumber = 4 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = [
        row.ageGroup,
        row.totalPatients,
        row.immunized,
        row.coverageRate
      ];
      
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = STYLES.numericCell;
      dataRow.getCell(3).style = STYLES.numericCell;
      dataRow.getCell(4).style = STYLES.percentageCell;
    });
  }

  async generateVaccineUsageReport(filters = {}) {
    const worksheet = this.workbook.addWorksheet('Vaccine Usage');
    
    worksheet.columns = [
      { header: 'Vaccine', key: 'vaccine', width: 20 },
      { header: 'Doses Administered', key: 'dosesAdministered', width: 18 },
      { header: 'Unique Patients', key: 'uniquePatients', width: 15 },
      { header: 'Average per Patient', key: 'averagePerPatient', width: 18 },
      { header: 'Last Used', key: 'lastUsed', width: 15 }
    ];

    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Vaccine Usage Report';
    titleCell.style = STYLES.header;

    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Vaccine', 'Doses Administered', 'Unique Patients', 'Average per Patient', 'Last Used'];
    headerRow.eachCell((cell) => {
      cell.style = STYLES.columnHeader;
    });

    const vaccines = await databases.listDocuments(DATABASE_ID, COLLECTIONS.VACCINES);
    const immunizationRecords = await databases.listDocuments(DATABASE_ID, COLLECTIONS.IMMUNIZATION_RECORDS);

    const vaccineData = vaccines.documents.map(vaccine => {
      const vaccineRecords = immunizationRecords.documents.filter(
        record => record.vaccineId === vaccine.$id
      );
      
      const uniquePatients = new Set(vaccineRecords.map(record => record.patientId)).size;

      return {
        vaccine: vaccine.name,
        dosesAdministered: vaccineRecords.length,
        uniquePatients: uniquePatients,
        averagePerPatient: uniquePatients > 0 ? vaccineRecords.length / uniquePatients : 0,
        lastUsed: vaccineRecords.length > 0 ? 
          formatDate(Math.max(...vaccineRecords.map(r => new Date(r.$createdAt)))) : 'N/A'
      };
    });

    vaccineData.forEach((row, index) => {
      const rowNumber = 4 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = [
        row.vaccine,
        row.dosesAdministered,
        row.uniquePatients,
        row.averagePerPatient,
        row.lastUsed
      ];
      
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = STYLES.numericCell;
      dataRow.getCell(3).style = STYLES.numericCell;
      dataRow.getCell(4).style = STYLES.numericCell;
      dataRow.getCell(5).style = STYLES.dataCell;
    });
  }

  async generateDueImmunizationsReport(filters = {}) {
    const worksheet = this.workbook.addWorksheet('Due Immunizations');
    
    worksheet.columns = [
      { header: 'Patient Name', key: 'patientName', width: 25 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Due Vaccine', key: 'dueVaccine', width: 20 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Facility', key: 'facility', width: 25 },
      { header: 'Contact', key: 'contact', width: 20 }
    ];

    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Due Immunizations Report';
    titleCell.style = STYLES.header;

    const headerRow = worksheet.getRow(3);
    headerRow.values = ['Patient Name', 'Age', 'Due Vaccine', 'Due Date', 'Facility', 'Contact'];
    headerRow.eachCell((cell) => {
      cell.style = STYLES.columnHeader;
    });

    // Mock data for due immunizations
    const dueImmunizations = [
      {
        patientName: 'John Doe',
        age: 2,
        dueVaccine: 'Measles',
        dueDate: formatDate(moment().add(7, 'days')),
        facility: 'Central Hospital',
        contact: 'john@example.com'
      },
      {
        patientName: 'Jane Smith',
        age: 1,
        dueVaccine: 'Polio',
        dueDate: formatDate(moment().add(3, 'days')),
        facility: 'Community Clinic',
        contact: 'jane@example.com'
      }
    ];

    dueImmunizations.forEach((row, index) => {
      const rowNumber = 4 + index;
      const dataRow = worksheet.getRow(rowNumber);
      dataRow.values = [
        row.patientName,
        row.age,
        row.dueVaccine,
        row.dueDate,
        row.facility,
        row.contact
      ];
      
      dataRow.getCell(1).style = STYLES.dataCell;
      dataRow.getCell(2).style = STYLES.numericCell;
      dataRow.getCell(3).style = STYLES.dataCell;
      dataRow.getCell(4).style = STYLES.dataCell;
      dataRow.getCell(5).style = STYLES.dataCell;
      dataRow.getCell(6).style = STYLES.dataCell;
    });
  }

  async generateReport(reportType, filters = {}) {
    switch (reportType) {
      case REPORT_TYPES.IMMUNIZATION_COVERAGE:
        await this.generateImmunizationCoverageReport(filters);
        break;
      case REPORT_TYPES.FACILITY_PERFORMANCE:
        await this.generateFacilityPerformanceReport(filters);
        break;
      case REPORT_TYPES.DUE_IMMUNIZATIONS:
        await this.generateDueImmunizationsReport(filters);
        break;
      case REPORT_TYPES.AGE_DISTRIBUTION:
        await this.generateAgeDistributionReport(filters);
        break;
      case REPORT_TYPES.VACCINE_USAGE:
        await this.generateVaccineUsageReport(filters);
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  async saveToBuffer() {
    return await this.workbook.xlsx.writeBuffer();
  }

  async saveToFile(filename) {
    await this.workbook.xlsx.writeFile(filename);
  }
}

// Main function
export default async ({ req, res, log, error }) => {
  try {
    log('Excel Export Function Started');

    // Validate request
    if (!req.body) {
      return res.json({ success: false, error: 'Request body is required' }, 400);
    }

    const { reportType, filters = {}, filename } = JSON.parse(req.body);
    
    if (!reportType || !Object.values(REPORT_TYPES).includes(reportType)) {
      return res.json({ 
        success: false, 
        error: `Report type is required and must be one of: ${Object.values(REPORT_TYPES).join(', ')}` 
      }, 400);
    }

    // Generate report
    const generator = new ExcelReportGenerator();
    await generator.generateReport(reportType, filters);

    // Generate filename
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const reportFilename = filename || `${reportType}_${timestamp}.xlsx`;
    const tempFilePath = path.join('/tmp', reportFilename);

    // Save to temporary file
    await generator.saveToFile(tempFilePath);

    // Upload to Appwrite Storage
    const fileBuffer = fs.readFileSync(tempFilePath);
    const file = await storage.createFile(
      STORAGE_BUCKET_ID,
      'unique()',
      InputFile.fromBuffer(fileBuffer, reportFilename)
    );

    // Generate download URL
    const downloadUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${file.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    log(`Report generated successfully: ${reportFilename}`);
    
    return res.json({
      success: true,
      data: {
        fileId: file.$id,
        filename: reportFilename,
        downloadUrl,
        reportType,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (err) {
    error('Error generating Excel report:', err);
    return res.json({ 
      success: false, 
      error: err.message || 'Failed to generate report' 
    }, 500);
  }
};

// For local testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ExcelReportGenerator();
  
  generator.generateReport(REPORT_TYPES.IMMUNIZATION_COVERAGE)
    .then(() => generator.saveToFile('test_report.xlsx'))
    .then(() => console.log('Test report generated: test_report.xlsx'))
    .catch(console.error);
}
