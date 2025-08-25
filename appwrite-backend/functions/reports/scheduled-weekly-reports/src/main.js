import { Client, Databases, Storage, Users, Query, InputFile } from 'node-appwrite';
import nodemailer from 'nodemailer';
import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';
import winston from 'winston';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Appwrite configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || 'default',
  storageBucketId: process.env.APPWRITE_STORAGE_BUCKET_ID || 'reports',
  emailHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  emailPort: parseInt(process.env.SMTP_PORT) || 587,
  emailUser: process.env.SMTP_USER,
  emailPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || 'noreply@immuneme.com',
  reportRetentionDays: parseInt(process.env.REPORT_RETENTION_DAYS) || 90,
  schedule: process.env.REPORT_SCHEDULE || '0 9 * * 1', // Every Monday at 9 AM
  recipients: process.env.REPORT_RECIPIENTS?.split(',') || [],
  formats: process.env.REPORT_FORMATS?.split(',') || ['pdf', 'excel', 'csv']
};

// Initialize Appwrite clients
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

// Email transporter
const transporter = nodemailer.createTransporter({
  host: config.emailHost,
  port: config.emailPort,
  secure: config.emailPort === 465,
  auth: {
    user: config.emailUser,
    pass: config.emailPass
  }
});

// Report types configuration
const reportTypes = [
  {
    id: 'due-immunizations',
    name: 'Due Immunizations Report',
    collectionId: 'immunization-records',
    query: [Query.equal('status', 'due')],
    fields: ['patientId', 'vaccineId', 'dueDate', 'facilityId', 'priority']
  },
  {
    id: 'vaccine-usage',
    name: 'Vaccine Usage Statistics',
    collectionId: 'vaccine-usage',
    query: [],
    fields: ['vaccineId', 'quantityUsed', 'quantityRemaining', 'facilityId', 'date']
  },
  {
    id: 'immunization-coverage',
    name: 'Immunization Coverage Report',
    collectionId: 'immunization-records',
    query: [Query.greaterThan('completedAt', moment().subtract(30, 'days').toISOString())],
    fields: ['patientId', 'vaccineId', 'completedAt', 'facilityId', 'doseNumber']
  },
  {
    id: 'age-distribution',
    name: 'Age Distribution Analysis',
    collectionId: 'patients',
    query: [],
    fields: ['id', 'name', 'dateOfBirth', 'facilityId', 'createdAt']
  },
  {
    id: 'facility-performance',
    name: 'Facility Performance Metrics',
    collectionId: 'facilities',
    query: [],
    fields: ['id', 'name', 'totalPatients', 'totalImmunizations', 'lastActivity']
  }
];

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [
    path.join(__dirname, '../reports'),
    path.join(__dirname, '../archives'),
    path.join(__dirname, '../logs')
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(dir);
  }
}

// Generate report data
async function generateReportData(reportType, startDate, endDate) {
  try {
    logger.info(`Generating ${reportType.name} data from ${startDate} to ${endDate}`);
    
    let query = [...reportType.query];
    
    if (startDate && endDate) {
      query.push(Query.greaterThanEqual('createdAt', startDate));
      query.push(Query.lessThan('createdAt', endDate));
    }
    
    const response = await databases.listDocuments(
      config.databaseId,
      reportType.collectionId,
      query
    );
    
    return response.documents;
  } catch (error) {
    logger.error(`Error generating ${reportType.name} data:`, error);
    throw error;
  }
}

// Generate CSV report
async function generateCSVReport(data, reportType, dateRange) {
  const { Parser } = await import('json2csv');
  const parser = new Parser({ fields: reportType.fields });
  const csv = parser.parse(data);
  
  const filename = `${reportType.id}-${dateRange}.csv`;
  const filepath = path.join(__dirname, '../reports', filename);
  
  await fs.writeFile(filepath, csv);
  return filepath;
}

// Generate Excel report
async function generateExcelReport(data, reportType, dateRange) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(reportType.name);
  
  // Add headers
  worksheet.addRow(reportType.fields);
  
  // Add data
  data.forEach(doc => {
    const row = reportType.fields.map(field => doc[field] || '');
    worksheet.addRow(row);
  });
  
  const filename = `${reportType.id}-${dateRange}.xlsx`;
  const filepath = path.join(__dirname, '../reports', filename);
  
  await workbook.xlsx.writeFile(filepath);
  return filepath;
}

// Generate PDF report
async function generatePDFReport(data, reportType, dateRange) {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument();
  
  const filename = `${reportType.id}-${dateRange}.pdf`;
  const filepath = path.join(__dirname, '../reports', filename);
  
  doc.pipe(fs.createWriteStream(filepath));
  
  doc.fontSize(20).text(reportType.name, 100, 100);
  doc.fontSize(12).text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 100, 130);
  doc.fontSize(12).text(`Date Range: ${dateRange}`, 100, 150);
  
  doc.moveDown();
  doc.fontSize(14).text('Report Summary:', 100, 180);
  doc.fontSize(12).text(`Total Records: ${data.length}`, 100, 200);
  
  if (data.length > 0) {
    doc.moveDown();
    doc.fontSize(14).text('Data Preview:', 100, 220);
    
    let y = 240;
    data.slice(0, 10).forEach((item, index) => {
      if (y > 700) {
        doc.addPage();
        y = 100;
      }
      doc.fontSize(10).text(`${index + 1}. ${JSON.stringify(item)}`, 100, y);
      y += 20;
    });
  }
  
  doc.end();
  return filepath;
}

// Generate report in specified format
async function generateReport(reportType, format, startDate, endDate) {
  const data = await generateReportData(reportType, startDate, endDate);
  const dateRange = `${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}`;
  
  switch (format.toLowerCase()) {
    case 'csv':
      return await generateCSVReport(data, reportType, dateRange);
    case 'excel':
      return await generateExcelReport(data, reportType, dateRange);
    case 'pdf':
      return await generatePDFReport(data, reportType, dateRange);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// Upload report to storage
async function uploadReport(filepath, reportType, format) {
  try {
    const filename = path.basename(filepath);
    const fileBuffer = await fs.readFile(filepath);
    
    const response = await storage.createFile(
      config.storageBucketId,
      'unique()',
      InputFile.fromBuffer(fileBuffer, filename)
    );
    
    return response.$id;
  } catch (error) {
    logger.error(`Error uploading report ${filename}:`, error);
    throw error;
  }
}

// Send email notification
async function sendEmailNotification(recipients, reportFiles, reportType, dateRange) {
  try {
    const mailOptions = {
      from: config.emailFrom,
      to: recipients.join(', '),
      subject: `Weekly Report: ${reportType.name} - ${dateRange}`,
      html: `
        <h2>Weekly Report: ${reportType.name}</h2>
        <p>Date Range: ${dateRange}</p>
        <p>Please find attached the requested reports in the following formats:</p>
        <ul>
          ${reportFiles.map(file => `<li>${path.basename(file)}</li>`).join('')}
        </ul>
        <p>This report was automatically generated by the ImmuneMe system.</p>
      `,
      attachments: reportFiles.map(file => ({
        filename: path.basename(file),
        path: file
      }))
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${recipients.length} recipients`);
    return result;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

// Archive old reports
async function archiveOldReports() {
  try {
    const cutoffDate = moment().subtract(config.reportRetentionDays, 'days');
    const reportsDir = path.join(__dirname, '../reports');
    const archivesDir = path.join(__dirname, '../archives');
    
    const files = await fs.readdir(reportsDir);
    let archivedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate.toDate()) {
        const archivePath = path.join(archivesDir, file);
        await fs.move(filePath, archivePath);
        archivedCount++;
      }
    }
    
    logger.info(`Archived ${archivedCount} old reports`);
    
    // Clean up archived files older than 180 days
    const archiveCutoff = moment().subtract(180, 'days');
    const archiveFiles = await fs.readdir(archivesDir);
    
    for (const file of archiveFiles) {
      const filePath = path.join(archivesDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < archiveCutoff.toDate()) {
        await fs.remove(filePath);
        logger.info(`Deleted archived file: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Error archiving reports:', error);
  }
}

// Get date range based on schedule type
function getDateRange(scheduleType) {
  const endDate = moment();
  let startDate;
  
  switch (scheduleType) {
    case 'weekly':
      startDate = moment().subtract(7, 'days');
      break;
    case 'monthly':
      startDate = moment().subtract(1, 'month');
      break;
    case 'quarterly':
      startDate = moment().subtract(3, 'months');
      break;
    default:
      startDate = moment().subtract(7, 'days');
  }
  
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

// Main report generation function
async function generateScheduledReports(scheduleType = 'weekly') {
  try {
    logger.info(`Starting ${scheduleType} report generation`);
    
    await ensureDirectories();
    
    const { startDate, endDate } = getDateRange(scheduleType);
    const dateRange = `${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}`;
    
    const allReports = [];
    
    for (const reportType of reportTypes) {
      logger.info(`Processing ${reportType.name}`);
      
      const reportFiles = [];
      
      for (const format of config.formats) {
        try {
          const filepath = await generateReport(reportType, format, startDate, endDate);
          reportFiles.push(filepath);
          
          // Upload to storage
          const fileId = await uploadReport(filepath, reportType, format);
          logger.info(`Uploaded ${format} report for ${reportType.name}: ${fileId}`);
        } catch (error) {
          logger.error(`Error generating ${format} report for ${reportType.name}:`, error);
        }
      }
      
      if (reportFiles.length > 0 && config.recipients.length > 0) {
        await sendEmailNotification(config.recipients, reportFiles, reportType, dateRange);
      }
      
      allReports.push({
        type: reportType.id,
        name: reportType.name,
        files: reportFiles,
        dateRange
      });
    }
    
    // Archive old reports
    await archiveOldReports();
    
    logger.info(`Completed ${scheduleType} report generation`);
    return allReports;
    
  } catch (error) {
    logger.error('Error in scheduled report generation:', error);
    throw error;
  }
}

// Get recipient management
async function getRecipients() {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      'report-recipients',
      [Query.equal('active', true)]
    );
    
    return response.documents.map(doc => doc.email);
  } catch (error) {
    logger.error('Error getting recipients:', error);
    return config.recipients;
  }
}

// Update recipients
async function updateRecipients(newRecipients) {
  config.recipients = newRecipients;
  logger.info(`Updated recipients: ${newRecipients.length} total`);
}

// Health check endpoint
async function healthCheck() {
  try {
    await databases.listDocuments(config.databaseId, 'immunization-records', [Query.limit(1)]);
    return { status: 'healthy', timestamp: moment().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: moment().toISOString() };
  }
}

// Main execution
async function main() {
  try {
    logger.info('Scheduled report generation started');
    
    const scheduleType = process.env.SCHEDULE_TYPE || 'weekly';
    const reports = await generateScheduledReports(scheduleType);
    
    logger.info(`Generated ${reports.length} report types`);
    
    // Log completion
    await databases.createDocument(
      config.databaseId,
      'report-logs',
      'unique()',
      {
        type: scheduleType,
        status: 'completed',
        reportsGenerated: reports.length,
        timestamp: moment().toISOString()
      }
    );
    
  } catch (error) {
    logger.error('Scheduled report generation failed:', error);
    
    // Log failure
    try {
      await databases.createDocument(
        config.databaseId,
        'report-logs',
        'unique()',
        {
          type: process.env.SCHEDULE_TYPE || 'weekly',
          status: 'failed',
          error: error.message,
          timestamp: moment().toISOString()
        }
      );
    } catch (logError) {
      logger.error('Failed to log error:', logError);
    }
    
    process.exit(1);
  }
}

// Export for testing
export {
  generateScheduledReports,
  getRecipients,
  updateRecipients,
  healthCheck,
  reportTypes
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
