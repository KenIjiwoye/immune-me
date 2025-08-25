/**
 * Shared Configuration for Report Functions
 * Centralized configuration management
 */

const path = require('path');
const fs = require('fs');

class ReportConfig {
  constructor() {
    this.config = null;
    this.environment = process.env.NODE_ENV || 'development';
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'report-functions.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.warn('Could not load report-functions.json, using defaults');
      this.config = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      functions: {},
      caching: {
        default_ttl: 3600,
        max_ttl: 86400,
        cache_prefix: 'report_cache_',
        compression_enabled: true,
        compression_threshold: 1024
      },
      performance: {
        batch_size: 1000,
        max_concurrent_queries: 5,
        memory_limit_mb: 512,
        query_timeout_ms: 30000,
        retry_attempts: 3,
        retry_delay_ms: 1000
      },
      monitoring: {
        enable_metrics: true,
        log_level: 'info',
        performance_tracking: true,
        error_reporting: true
      }
    };
  }

  getFunctionConfig(functionName) {
    return this.config.functions[functionName] || null;
  }

  getAllFunctionConfigs() {
    return this.config.functions;
  }

  getCachingConfig() {
    return {
      ...this.config.caching,
      enable_caching: process.env.ENABLE_CACHING !== 'false',
      cache_ttl: parseInt(process.env.CACHE_TTL || this.config.caching.default_ttl)
    };
  }

  getPerformanceConfig() {
    return {
      ...this.config.performance,
      batch_size: parseInt(process.env.BATCH_SIZE || this.config.performance.batch_size),
      max_concurrent_queries: parseInt(process.env.MAX_CONCURRENT_QUERIES || this.config.performance.max_concurrent_queries),
      memory_limit_mb: parseInt(process.env.MEMORY_LIMIT_MB || this.config.performance.memory_limit_mb)
    };
  }

  getMonitoringConfig() {
    return {
      ...this.config.monitoring,
      log_level: process.env.LOG_LEVEL || this.config.monitoring.log_level,
      enable_metrics: process.env.ENABLE_METRICS !== 'false'
    };
  }

  getDatabaseConfig() {
    return {
      endpoint: process.env.APPWRITE_ENDPOINT,
      projectId: process.env.APPWRITE_PROJECT_ID,
      apiKey: process.env.APPWRITE_API_KEY,
      databaseId: process.env.APPWRITE_DATABASE_ID || 'default'
    };
  }

  getStorageConfig() {
    return {
      bucketId: process.env.APPWRITE_STORAGE_BUCKET || 'reports',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
      allowedMimeTypes: [
        'application/json',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ]
    };
  }

  getReportSpecificConfig(reportType) {
    const configs = {
      'due-immunizations-list': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        dateRange: {
          maxDays: 365,
          defaultDays: 30
        },
        filters: ['facility', 'age_group', 'vaccine_type', 'due_date_range']
      },
      'vaccine-usage-statistics': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        dateRange: {
          maxDays: 730,
          defaultDays: 90
        },
        groupBy: ['facility', 'vaccine_type', 'date'],
        metrics: ['total_administered', 'stock_used', 'wastage', 'coverage_rate']
      },
      'generate-pdf-report': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '5000'),
        pdfGenerationTimeout: parseInt(process.env.PDF_GENERATION_TIMEOUT || '300'),
        templateOptions: {
          includeCharts: true,
          includeTables: true,
          pageSize: 'A4',
          orientation: 'portrait'
        }
      },
      'generate-excel-export': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        excelGenerationTimeout: parseInt(process.env.EXCEL_GENERATION_TIMEOUT || '300'),
        sheetOptions: {
          includeFormatting: true,
          includeCharts: false,
          freezeHeader: true
        }
      },
      'generate-csv-export': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '50000'),
        csvGenerationTimeout: parseInt(process.env.CSV_GENERATION_TIMEOUT || '180'),
        delimiter: ',',
        includeHeaders: true
      },
      'immunization-coverage-report': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        coverageMetrics: ['overall', 'by_age_group', 'by_facility', 'by_vaccine'],
        dateRange: {
          maxDays: 365,
          defaultDays: 90
        }
      },
      'facility-performance-metrics': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        performanceMetrics: ['completion_rate', 'timeliness', 'coverage', 'efficiency'],
        rankingEnabled: true,
        benchmarkEnabled: true
      },
      'age-distribution-analysis': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        ageGroups: ['0-1', '1-5', '5-10', '10-15', '15-18', '18+'],
        distributionMetrics: ['count', 'percentage', 'coverage_rate']
      },
      'scheduled-weekly-reports': {
        maxRecords: parseInt(process.env.MAX_RECORDS || '10000'),
        scheduleTime: process.env.SCHEDULE_TIME || '0 9 * * 1', // Every Monday at 9 AM
        reportTypes: ['due-immunizations', 'vaccine-usage', 'coverage-summary'],
        recipients: process.env.REPORT_RECIPIENTS?.split(',') || []
      }
    };

    return configs[reportType] || {};
  }

  validateEnvironment() {
    const required = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  getValidationRules(reportType) {
    const commonRules = {
      startDate: {
        type: 'string',
        required: true,
        validation: (value) => !isNaN(Date.parse(value))
      },
      endDate: {
        type: 'string',
        required: true,
        validation: (value) => !isNaN(Date.parse(value))
      },
      facilityId: {
        type: 'string',
        required: false,
        validation: (value) => value.length >= 1
      },
      format: {
        type: 'string',
        required: false,
        validation: (value) => ['json', 'csv', 'pdf', 'excel'].includes(value)
      }
    };

    const specificRules = {
      'due-immunizations-list': {
        ageGroup: {
          type: 'string',
          required: false,
          validation: (value) => ['0-1', '1-5', '5-10', '10-15', '15-18', '18+'].includes(value)
        },
        vaccineType: {
          type: 'string',
          required: false,
          validation: (value) => value.length >= 1
        },
        includeOverdue: {
          type: 'boolean',
          required: false
        }
      },
      'vaccine-usage-statistics': {
        groupBy: {
          type: 'array',
          required: false,
          validation: (value) => Array.isArray(value) && value.length > 0
        },
        includeForecast: {
          type: 'boolean',
          required: false
        }
      },
      'generate-pdf-report': {
        template: {
          type: 'string',
          required: false,
          validation: (value) => ['default', 'detailed', 'summary'].includes(value)
        },
        includeCharts: {
          type: 'boolean',
          required: false
        }
      }
    };

    return {
      ...commonRules,
      ...(specificRules[reportType] || {})
    };
  }

  getErrorMessages() {
    return {
      INVALID_DATE_RANGE: 'Invalid date range provided',
      MISSING_REQUIRED_PARAM: 'Missing required parameter',
      INVALID_FORMAT: 'Invalid format specified',
      MAX_RECORDS_EXCEEDED: 'Maximum records limit exceeded',
      QUERY_TIMEOUT: 'Query execution timeout',
      CACHE_ERROR: 'Cache operation failed',
      EXPORT_ERROR: 'Export operation failed',
      VALIDATION_ERROR: 'Parameter validation failed'
    };
  }
}

module.exports = new ReportConfig();