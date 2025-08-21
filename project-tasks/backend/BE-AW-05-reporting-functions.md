# BE-AW-05: Create Appwrite Functions for Reporting System

## Title
Create Appwrite Functions for Reporting System

## Priority
Medium

## Estimated Time
10-12 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system migrated

## Description
Create and deploy Appwrite Cloud Functions to replace the existing AdonisJS reporting service. This includes functions for generating immunization coverage reports, facility performance metrics, age distribution analysis, due immunizations lists, and automated report generation with export capabilities (PDF, Excel, CSV).

The functions will provide comprehensive reporting capabilities for healthcare administrators and facility managers while ensuring data privacy and access control.

## Acceptance Criteria
- [ ] Immunization coverage report functions created and deployed
- [ ] Facility performance metrics functions implemented
- [ ] Age distribution analysis functions operational
- [ ] Due immunizations report functions working
- [ ] Vaccine usage statistics functions created
- [ ] PDF report generation functions implemented
- [ ] Excel export functions deployed
- [ ] CSV export functions operational
- [ ] Scheduled report generation functions working
- [ ] Report caching and optimization implemented

## Technical Notes

### Core Reporting Functions

#### 1. Immunization Coverage Report Function
```javascript
// appwrite-backend/functions/reports/immunization-coverage-report/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { facilityId, startDate, endDate, ageGroup, district } = JSON.parse(req.payload || '{}');

    // Build query filters
    const filters = [];
    if (facilityId) filters.push(Query.equal('facilityId', facilityId));
    if (startDate) filters.push(Query.greaterThanEqual('dateAdministered', startDate));
    if (endDate) filters.push(Query.lessThanEqual('dateAdministered', endDate));

    // Get immunization records
    const immunizations = await databases.listDocuments(
      'immune-me-db',
      'immunization_records',
      filters
    );

    // Get total patient population for coverage calculation
    const patientFilters = [];
    if (facilityId) patientFilters.push(Query.equal('facilityId', facilityId));
    if (district) patientFilters.push(Query.equal('district', district));

    const totalPatients = await databases.listDocuments(
      'immune-me-db',
      'patients',
      patientFilters
    );

    // Calculate coverage by vaccine
    const coverageByVaccine = await calculateCoverageByVaccine(immunizations.documents, totalPatients.documents);

    // Calculate coverage by age group
    const coverageByAge = await calculateCoverageByAgeGroup(immunizations.documents, totalPatients.documents);

    // Calculate coverage by facility
    const coverageByFacility = await calculateCoverageByFacility(immunizations.documents);

    // Calculate monthly trends
    const monthlyTrends = await calculateMonthlyTrends(immunizations.documents);

    const report = {
      reportId: `coverage-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      parameters: { facilityId, startDate, endDate, ageGroup, district },
      summary: {
        totalImmunizations: immunizations.total,
        totalPatients: totalPatients.total,
        overallCoverage: ((immunizations.total / totalPatients.total) * 100).toFixed(2)
      },
      coverageByVaccine,
      coverageByAge,
      coverageByFacility,
      monthlyTrends
    };

    // Cache report for future use
    await databases.createDocument(
      'immune-me-db',
      'report_cache',
      'unique()',
      {
        reportType: 'immunization_coverage',
        reportData: JSON.stringify(report),
        parameters: JSON.stringify({ facilityId, startDate, endDate, ageGroup, district }),
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
      }
    );

    log(`Generated immunization coverage report with ${immunizations.total} records`);

    return res.json({
      success: true,
      report
    });

  } catch (err) {
    error('Failed to generate immunization coverage report: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function calculateCoverageByVaccine(immunizations, patients) {
    const vaccineStats = {};
    
    // Get all vaccines
    const vaccines = await databases.listDocuments('immune-me-db', 'vaccines');
    
    for (const vaccine of vaccines.documents) {
      const vaccineImmunizations = immunizations.filter(imm => imm.vaccineId === vaccine.$id);
      const uniquePatients = new Set(vaccineImmunizations.map(imm => imm.patientId));
      
      vaccineStats[vaccine.name] = {
        vaccineId: vaccine.$id,
        totalDoses: vaccineImmunizations.length,
        uniquePatients: uniquePatients.size,
        coverage: ((uniquePatients.size / patients.length) * 100).toFixed(2)
      };
    }
    
    return vaccineStats;
  }

  async function calculateCoverageByAgeGroup(immunizations, patients) {
    const ageGroups = {
      '0-1': { min: 0, max: 1 },
      '1-2': { min: 1, max: 2 },
      '2-5': { min: 2, max: 5 },
      '5-10': { min: 5, max: 10 },
      '10+': { min: 10, max: 999 }
    };

    const ageStats = {};

    for (const [groupName, range] of Object.entries(ageGroups)) {
      const patientsInGroup = patients.filter(patient => {
        const age = calculateAge(patient.dateOfBirth);
        return age >= range.min && age < range.max;
      });

      const immunizationsInGroup = immunizations.filter(imm => {
        const patient = patients.find(p => p.$id === imm.patientId);
        if (!patient) return false;
        const age = calculateAge(patient.dateOfBirth);
        return age >= range.min && age < range.max;
      });

      const uniquePatients = new Set(immunizationsInGroup.map(imm => imm.patientId));

      ageStats[groupName] = {
        totalPatients: patientsInGroup.length,
        immunizedPatients: uniquePatients.size,
        coverage: patientsInGroup.length > 0 ? 
          ((uniquePatients.size / patientsInGroup.length) * 100).toFixed(2) : '0.00'
      };
    }

    return ageStats;
  }

  async function calculateCoverageByFacility(immunizations) {
    const facilityStats = {};
    
    for (const immunization of immunizations) {
      if (!facilityStats[immunization.facilityId]) {
        // Get facility details
        const facility = await databases.getDocument(
          'immune-me-db',
          'facilities',
          immunization.facilityId
        );
        
        facilityStats[immunization.facilityId] = {
          facilityName: facility.name,
          district: facility.district,
          totalImmunizations: 0,
          uniquePatients: new Set()
        };
      }
      
      facilityStats[immunization.facilityId].totalImmunizations++;
      facilityStats[immunization.facilityId].uniquePatients.add(immunization.patientId);
    }

    // Convert sets to counts
    Object.keys(facilityStats).forEach(facilityId => {
      facilityStats[facilityId].uniquePatients = facilityStats[facilityId].uniquePatients.size;
    });

    return facilityStats;
  }

  async function calculateMonthlyTrends(immunizations) {
    const monthlyData = {};
    
    immunizations.forEach(immunization => {
      const date = new Date(immunization.dateAdministered);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalImmunizations: 0,
          uniquePatients: new Set()
        };
      }
      
      monthlyData[monthKey].totalImmunizations++;
      monthlyData[monthKey].uniquePatients.add(immunization.patientId);
    });

    // Convert to array and sort by month
    return Object.values(monthlyData)
      .map(data => ({
        ...data,
        uniquePatients: data.uniquePatients.size
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
};
```

#### 2. Facility Performance Metrics Function
```javascript
// appwrite-backend/functions/reports/facility-performance-metrics/src/main.js
const { Client, Databases, Query } = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const { facilityId, startDate, endDate, compareWithPrevious } = JSON.parse(req.payload || '{}');

    // Get facility details
    const facility = facilityId ? 
      await databases.getDocument('immune-me-db', 'facilities', facilityId) : null;

    // Build query filters
    const filters = [];
    if (facilityId) filters.push(Query.equal('facilityId', facilityId));
    if (startDate) filters.push(Query.greaterThanEqual('dateAdministered', startDate));
    if (endDate) filters.push(Query.lessThanEqual('dateAdministered', endDate));

    // Get immunization records for the period
    const immunizations = await databases.listDocuments(
      'immune-me-db',
      'immunization_records',
      filters
    );

    // Get notifications for the facility
    const notificationFilters = [...filters];
    const notifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      notificationFilters
    );

    // Calculate performance metrics
    const metrics = await calculatePerformanceMetrics(
      immunizations.documents,
      notifications.documents,
      facilityId
    );

    // Calculate comparison with previous period if requested
    let comparison = null;
    if (compareWithPrevious && startDate && endDate) {
      comparison = await calculatePreviousPeriodComparison(
        facilityId,
        startDate,
        endDate
      );
    }

    const report = {
      reportId: `facility-performance-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      facility: facility ? {
        id: facility.$id,
        name: facility.name,
        district: facility.district,
        type: facility.type
      } : null,
      period: { startDate, endDate },
      metrics,
      comparison
    };

    log(`Generated facility performance report for ${facility?.name || 'all facilities'}`);

    return res.json({
      success: true,
      report
    });

  } catch (err) {
    error('Failed to generate facility performance report: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  async function calculatePerformanceMetrics(immunizations, notifications, facilityId) {
    // Basic immunization metrics
    const totalImmunizations = immunizations.length;
    const uniquePatients = new Set(immunizations.map(imm => imm.patientId)).size;
    
    // Calculate average immunizations per day
    const dateRange = getDateRange(immunizations);
    const daysInPeriod = dateRange.days || 1;
    const avgImmunizationsPerDay = (totalImmunizations / daysInPeriod).toFixed(2);

    // Notification response metrics
    const totalNotifications = notifications.length;
    const completedNotifications = notifications.filter(n => n.status === 'completed').length;
    const notificationCompletionRate = totalNotifications > 0 ? 
      ((completedNotifications / totalNotifications) * 100).toFixed(2) : '0.00';

    // Vaccine distribution
    const vaccineDistribution = {};
    immunizations.forEach(imm => {
      vaccineDistribution[imm.vaccineId] = (vaccineDistribution[imm.vaccineId] || 0) + 1;
    });

    // Monthly performance
    const monthlyPerformance = calculateMonthlyPerformance(immunizations);

    // Staff performance (if available)
    const staffPerformance = calculateStaffPerformance(immunizations);

    return {
      immunizationMetrics: {
        totalImmunizations,
        uniquePatients,
        avgImmunizationsPerDay,
        daysInPeriod
      },
      notificationMetrics: {
        totalNotifications,
        completedNotifications,
        completionRate: notificationCompletionRate
      },
      vaccineDistribution,
      monthlyPerformance,
      staffPerformance
    };
  }

  async function calculatePreviousPeriodComparison(facilityId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodLength = end.getTime() - start.getTime();

    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(start.getTime());

    const prevFilters = [
      Query.greaterThanEqual('dateAdministered', prevStart.toISOString()),
      Query.lessThanEqual('dateAdministered', prevEnd.toISOString())
    ];
    if (facilityId) prevFilters.push(Query.equal('facilityId', facilityId));

    const prevImmunizations = await databases.listDocuments(
      'immune-me-db',
      'immunization_records',
      prevFilters
    );

    const prevNotifications = await databases.listDocuments(
      'immune-me-db',
      'notifications',
      prevFilters
    );

    const prevMetrics = await calculatePerformanceMetrics(
      prevImmunizations.documents,
      prevNotifications.documents,
      facilityId
    );

    return {
      previousPeriod: {
        startDate: prevStart.toISOString(),
        endDate: prevEnd.toISOString()
      },
      metrics: prevMetrics
    };
  }

  function getDateRange(immunizations) {
    if (immunizations.length === 0) return { days: 0 };

    const dates = immunizations.map(imm => new Date(imm.dateAdministered));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const diffTime = Math.abs(maxDate - minDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    return {
      startDate: minDate.toISOString(),
      endDate: maxDate.toISOString(),
      days: diffDays
    };
  }

  function calculateMonthlyPerformance(immunizations) {
    const monthlyData = {};
    
    immunizations.forEach(immunization => {
      const date = new Date(immunization.dateAdministered);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          immunizations: 0,
          uniquePatients: new Set()
        };
      }
      
      monthlyData[monthKey].immunizations++;
      monthlyData[monthKey].uniquePatients.add(immunization.patientId);
    });

    return Object.values(monthlyData)
      .map(data => ({
        ...data,
        uniquePatients: data.uniquePatients.size
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  function calculateStaffPerformance(immunizations) {
    const staffStats = {};
    
    immunizations.forEach(immunization => {
      const staffId = immunization.administeredBy;
      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          staffId,
          immunizations: 0,
          uniquePatients: new Set()
        };
      }
      
      staffStats[staffId].immunizations++;
      staffStats[staffId].uniquePatients.add(immunization.patientId);
    });

    return Object.values(staffStats)
      .map(staff => ({
        ...staff,
        uniquePatients: staff.uniquePatients.size
      }))
      .sort((a, b) => b.immunizations - a.immunizations);
  }
};
```

#### 3. PDF Report Generation Function
```javascript
// appwrite-backend/functions/reports/generate-pdf-report/src/main.js
const { Client, Databases, Storage } = require('node-appwrite');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

module.exports = async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const storage = new Storage(client);

  try {
    const { reportType, reportData, title, subtitle } = JSON.parse(req.payload || '{}');

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${reportType}-${Date.now()}.pdf`;
    const filepath = `/tmp/${filename}`;

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filepath));

    // Add header
    addHeader(doc, title || 'Immunization Report', subtitle);

    // Add content based on report type
    switch (reportType) {
      case 'immunization_coverage':
        addCoverageReportContent(doc, reportData);
        break;
      case 'facility_performance':
        addPerformanceReportContent(doc, reportData);
        break;
      case 'due_immunizations':
        addDueImmunizationsContent(doc, reportData);
        break;
      default:
        addGenericReportContent(doc, reportData);
    }

    // Add footer
    addFooter(doc);

    // Finalize PDF
    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    // Upload PDF to Appwrite Storage
    const file = await storage.createFile(
      'reports-bucket',
      'unique()',
      fs.createReadStream(filepath),
      [
        'role:admin',
        'role:healthcare_worker',
        'role:facility_manager'
      ]
    );

    // Clean up temporary file
    fs.unlinkSync(filepath);

    // Create report record
    await databases.createDocument(
      'immune-me-db',
      'generated_reports',
      'unique()',
      {
        reportType,
        title: title || 'Immunization Report',
        fileId: file.$id,
        filename,
        generatedAt: new Date().toISOString(),
        format: 'pdf'
      }
    );

    log(`Generated PDF report: ${filename}`);

    return res.json({
      success: true,
      fileId: file.$id,
      filename,
      downloadUrl: `${process.env.APPWRITE_ENDPOINT}/storage/buckets/reports-bucket/files/${file.$id}/view`
    });

  } catch (err) {
    error('Failed to generate PDF report: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }

  function addHeader(doc, title, subtitle) {
    // Add logo if available
    // doc.image('logo.png', 50, 45, { width: 50 });

    doc.fontSize(20)
       .text(title, 110, 57)
       .fontSize(10)
       .text('Immune Me - Immunization Management System', 200, 65, { align: 'right' });

    if (subtitle) {
      doc.fontSize(14)
         .text(subtitle, 50, 100);
    }

    // Add line
    doc.moveTo(50, 130)
       .lineTo(550, 130)
       .stroke();

    doc.moveDown();
  }

  function addCoverageReportContent(doc, reportData) {
    let yPosition = 150;

    // Summary section
    doc.fontSize(16)
       .text('Coverage Summary', 50, yPosition);
    
    yPosition += 30;
    
    doc.fontSize(12)
       .text(`Total Immunizations: ${reportData.summary.totalImmunizations}`, 50, yPosition)
       .text(`Total Patients: ${reportData.summary.totalPatients}`, 50, yPosition + 20)
       .text(`Overall Coverage: ${reportData.summary.overallCoverage}%`, 50, yPosition + 40);

    yPosition += 80;

    // Coverage by vaccine
    doc.fontSize(14)
       .text('Coverage by Vaccine', 50, yPosition);
    
    yPosition += 25;

    Object.entries(reportData.coverageByVaccine).forEach(([vaccine, data]) => {
      doc.fontSize(10)
         .text(`${vaccine}: ${data.coverage}% (${data.uniquePatients} patients, ${data.totalDoses} doses)`, 
               70, yPosition);
      yPosition += 15;
    });

    // Add page break if needed
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    // Coverage by age group
    yPosition += 20;
    doc.fontSize(14)
       .text('Coverage by Age Group', 50, yPosition);
    
    yPosition += 25;

    Object.entries(reportData.coverageByAge).forEach(([ageGroup, data]) => {
      doc.fontSize(10)
         .text(`${ageGroup}: ${data.coverage}% (${data.immunizedPatients}/${data.totalPatients} patients)`, 
               70, yPosition);
      yPosition += 15;
    });
  }

  function addPerformanceReportContent(doc, reportData) {
    let yPosition = 150;

    // Facility info
    if (reportData.facility) {
      doc.fontSize(16)
         .text(`Facility: ${reportData.facility.name}`, 50, yPosition);
      
      yPosition += 25;
      
      doc.fontSize(12)
         .text(`District: ${reportData.facility.district}`, 50, yPosition)
         .text(`Type: ${reportData.facility.type}`, 50, yPosition + 20);
      
      yPosition += 50;
    }

    // Performance metrics
    doc.fontSize(14)
       .text('Performance Metrics', 50, yPosition);
    
    yPosition += 25;

    const metrics = reportData.metrics.immunizationMetrics;
    doc.fontSize(10)
       .text(`Total Immunizations: ${metrics.totalImmunizations}`, 70, yPosition)
       .text(`Unique Patients: ${metrics.uniquePatients}`, 70, yPosition + 15)
       .text(`Average per Day: ${metrics.avgImmunizationsPerDay}`, 70, yPosition + 30)
       .text(`Days in Period: ${metrics.daysInPeriod}`, 70, yPosition + 45);

    yPosition += 80;

    // Notification metrics
    doc.fontSize(14)
       .text('Notification Performance', 50, yPosition);
    
    yPosition += 25;

    const notifMetrics = reportData.metrics.notificationMetrics;
    doc.fontSize(10)
       .text(`Total Notifications: ${notifMetrics.totalNotifications}`, 70, yPosition)
       .text(`Completed: ${notifMetrics.completedNotifications}`, 70, yPosition + 15)
       .text(`Completion Rate: ${notifMetrics.completionRate}%`, 70, yPosition + 30);
  }

  function addDueImmunizationsContent(doc, reportData) {
    let yPosition = 150;

    doc.fontSize(16)
       .text('Due Immunizations Report', 50, yPosition);
    
    yPosition += 30;

    // Table headers
    doc.fontSize(10)
       .text('Patient Name', 50, yPosition)
       .text('Vaccine', 200, yPosition)
       .text('Due Date', 350, yPosition)
       .text('Priority', 450, yPosition);

    yPosition += 20;

    // Draw line
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    yPosition += 10;

    // Add due immunizations
    reportData.dueImmunizations.forEach(item => {
      doc.fontSize(9)
         .text(item.patientName, 50, yPosition)
         .text(item.vaccineName, 200, yPosition)
         .text(new Date(item.dueDate).toLocaleDateString(), 350, yPosition)
         .text(item.priority.toUpperCase(), 450, yPosition);
      
      yPosition += 15;

      // Add page break if needed
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
    });
  }

  function addGenericReportContent(doc, reportData) {
    let yPosition = 150;

    doc.fontSize(12)
       .text(JSON.stringify(reportData, null, 2), 50, yPosition);
  }

  function addFooter(doc) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 
               50, doc.page.height - 50)
         .text(`Page ${i + 1} of ${pages.count}`, 
               doc.page.width - 100, doc.page.height - 50);
    }
  }
};
```

### Function Configuration

#### Scheduled Report Generation
```json
{
  "functions": [
    {
      "name": "immunization-coverage-report",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:healthcare_worker", "role:facility_manager"],
      "events": [],
      "schedule": "",
      "timeout": 600
    },
    {
      "name": "facility-performance-metrics",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:facility_manager"],
      "events": [],
      "schedule": "",
      "timeout": 600
    },
    {
      "name": "generate-pdf-report",
      "runtime": "node-18.0",
      "execute": ["role:admin", "role:healthcare_worker", "role:facility_manager"],
      "events": [],
      "schedule": "",
      "timeout": 900
    },
    {
      "name": "scheduled-weekly-reports",
      "runtime": "node-18.0",
      "execute": ["role:system"],
      "events": [],
      "schedule": "0 8 * * 1",
      "timeout": 1800
    }
  ]
}
```

## Files to Create/Modify
- `appwrite-backend/functions/reports/immunization-coverage-report/` - Coverage analysis function
- `appwrite-backend/functions/reports/facility-performance-metrics/` - Performance metrics function
- `appwrite-backend/functions/reports/age-distribution-analysis/` - Age distribution function
- `appwrite-backend/functions/reports/due-immunizations-list/` - Due immunizations function
- `appwrite-backend/functions/reports/generate-pdf-report/` - PDF generation function
- `appwrite-backend/functions/reports/generate-excel-export/` - Excel export function
- `appwrite-backend/functions/reports/generate-csv-export/` - CSV export function
- `appwrite-backend/functions/reports/scheduled-weekly-reports/` - Automated report generation
- `appwrite-backend/config/report-functions.json` - Function configurations
- `appwrite-backend/utils/report-templates.js` - Report templates and utilities

## Testing Requirements

### Report Generation Testing
1. **Coverage Report Test**
   ```javascript
   // Test immunization coverage report
   const reportData = {
     facilityId: 'test-facility',
     startDate: '2024-01-01',
     endDate: '2024-12-31'
   };
   
   const result = await mcpServer.functions.createExecution(
     'immunization-coverage-report',
     JSON.stringify(reportData)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'Report generation should succeed');
   assert(response.report.summary, 'Report should contain summary data');
   ```

2. **PDF Generation Test**
   ```javascript
   // Test PDF report generation
   const pdfData = {
     reportType: 'immunization_coverage',
     reportData: mockReportData,
     title: 'Test Coverage Report'
   };
   
   const result = await mcpServer.functions.createExecution(
     'generate-pdf-report',
     JSON.stringify(pdfData)
   );
   
   const response = JSON.parse(result.response);
   assert(response.success, 'PDF generation should succeed');
   assert(response.fileId, 'Should return file ID');
   ```

### Performance Testing
1. **Large Dataset Test**
   - Generate reports with large datasets (10,000+ records)
   - Verify performance and memory usage
   - Test timeout handling

2. **Concurrent Report Generation**
   - Test multiple simultaneous report requests
   - Verify resource management