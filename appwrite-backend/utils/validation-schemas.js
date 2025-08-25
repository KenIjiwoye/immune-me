/**
 * Validation Schemas for Report Functions
 * Comprehensive validation for all report parameters
 */

const Joi = require('joi');

class ValidationSchemas {
  constructor() {
    this.schemas = this.initializeSchemas();
  }

  initializeSchemas() {
    return {
      // Common schemas
      dateRange: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
      }),

      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(1000).default(100)
      }),

      sorting: Joi.object({
        sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'date').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      }),

      // Report-specific schemas
      dueImmunizationsList: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        ageGroup: Joi.string().valid('0-1', '1-5', '5-10', '10-15', '15-18', '18+').optional(),
        vaccineType: Joi.string().optional(),
        includeOverdue: Joi.boolean().default(false),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json'),
        ...this.pagination.describe(),
        ...this.sorting.describe()
      }),

      vaccineUsageStatistics: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        vaccineType: Joi.string().optional(),
        groupBy: Joi.array().items(
          Joi.string().valid('facility', 'vaccine_type', 'date', 'age_group')
        ).default(['facility']),
        includeForecast: Joi.boolean().default(false),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json'),
        ...this.pagination.describe()
      }),

      generatePdfReport: Joi.object({
        reportType: Joi.string().valid(
          'due-immunizations',
          'vaccine-usage',
          'coverage-summary',
          'facility-performance',
          'age-distribution'
        ).required(),
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        template: Joi.string().valid('default', 'detailed', 'summary').default('default'),
        includeCharts: Joi.boolean().default(true),
        includeTables: Joi.boolean().default(true),
        pageSize: Joi.string().valid('A4', 'Letter', 'Legal').default('A4'),
        orientation: Joi.string().valid('portrait', 'landscape').default('portrait')
      }),

      generateExcelExport: Joi.object({
        reportType: Joi.string().valid(
          'due-immunizations',
          'vaccine-usage',
          'coverage-summary',
          'facility-performance',
          'age-distribution'
        ).required(),
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        includeFormatting: Joi.boolean().default(true),
        includeCharts: Joi.boolean().default(false),
        freezeHeader: Joi.boolean().default(true),
        sheetName: Joi.string().max(31).default('Report')
      }),

      generateCsvExport: Joi.object({
        reportType: Joi.string().valid(
          'due-immunizations',
          'vaccine-usage',
          'coverage-summary',
          'facility-performance',
          'age-distribution'
        ).required(),
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        delimiter: Joi.string().valid(',', ';', '\t').default(','),
        includeHeaders: Joi.boolean().default(true),
        encoding: Joi.string().valid('utf8', 'utf16le', 'latin1').default('utf8')
      }),

      immunizationCoverageReport: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        coverageMetrics: Joi.array().items(
          Joi.string().valid('overall', 'by_age_group', 'by_facility', 'by_vaccine')
        ).default(['overall']),
        ageGroups: Joi.array().items(
          Joi.string().valid('0-1', '1-5', '5-10', '10-15', '15-18', '18+')
        ).optional(),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json')
      }),

      facilityPerformanceMetrics: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityIds: Joi.array().items(Joi.string()).optional(),
        performanceMetrics: Joi.array().items(
          Joi.string().valid('completion_rate', 'timeliness', 'coverage', 'efficiency')
        ).default(['completion_rate']),
        rankingEnabled: Joi.boolean().default(true),
        benchmarkEnabled: Joi.boolean().default(true),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json')
      }),

      ageDistributionAnalysis: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        facilityId: Joi.string().optional(),
        ageGroups: Joi.array().items(
          Joi.string().valid('0-1', '1-5', '5-10', '10-15', '15-18', '18+')
        ).default(['0-1', '1-5', '5-10', '10-15', '15-18', '18+']),
        distributionMetrics: Joi.array().items(
          Joi.string().valid('count', 'percentage', 'coverage_rate')
        ).default(['count', 'percentage']),
        format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json')
      }),

      scheduledWeeklyReports: Joi.object({
        reportTypes: Joi.array().items(
          Joi.string().valid(
            'due-immunizations',
            'vaccine-usage',
            'coverage-summary'
          )
        ).default(['due-immunizations', 'vaccine-usage']),
        recipients: Joi.array().items(
          Joi.string().email()
        ).required(),
        scheduleTime: Joi.string().pattern(/^(\d+) (\d+) \* \* (\d+)$/).default('0 9 * * 1')
      })
    };
  }

  /**
   * Validate parameters against schema
   */
  validate(params, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      throw new Error(`Validation schema '${schemaName}' not found`);
    }

    const { error, value } = schema.validate(params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return {
        valid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      };
    }

    return {
      valid: true,
      value
    };
  }

  /**
   * Sanitize parameters
   */
  sanitize(params, schemaName) {
    const result = this.validate(params, schemaName);
    return result.valid ? result.value : null;
  }

  /**
   * Get schema description
   */
  describeSchema(schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) return null;

    const description = {
      type: schema._type,
      required: [],
      optional: [],
      defaults: {}
    };

    if (schema._ids && schema._ids._byKey) {
      for (const [key, rule] of schema._ids._byKey) {
        const isRequired = rule._flags?.presence === 'required';
        const fieldDesc = {
          type: rule._type,
          required: isRequired,
          default: rule._flags?.default
        };

        if (isRequired) {
          description.required.push(key);
        } else {
          description.optional.push(key);
        }

        if (fieldDesc.default !== undefined) {
          description.defaults[key] = fieldDesc.default;
        }
      }
    }

    return description;
  }

  /**
   * Custom validators
   */
  static customValidators = {
    isValidDate: (value) => !isNaN(Date.parse(value)),
    isValidEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    isValidFacilityId: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    isValidVaccineType: (value) => /^[a-zA-Z0-9\s-]+$/.test(value),
    isValidAgeGroup: (value) => /^(\d+-\d+|18\+)$/.test(value)
  };

  /**
   * Validate date range
   */
  validateDateRange(startDate, endDate, maxDays = 365) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const errors = [];

    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }

    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }

    if (start > end) {
      errors.push('Start date must be before end date');
    }

    if (diffDays > maxDays) {
      errors.push(`Date range cannot exceed ${maxDays} days`);
    }

    return {
      valid: errors.length === 0,
      errors,
      duration: diffDays
    };
  }

  /**
   * Validate array parameters
   */
  validateArrayParam(value, validValues, paramName) {
    if (!Array.isArray(value)) {
      return {
        valid: false,
        errors: [`${paramName} must be an array`]
      };
    }

    const invalidValues = value.filter(v => !validValues.includes(v));
    
    if (invalidValues.length > 0) {
      return {
        valid: false,
        errors: [`Invalid ${paramName} values: ${invalidValues.join(', ')}`]
      };
    }

    return { valid: true };
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page, limit, maxLimit = 1000) {
    const errors = [];

    if (!Number.isInteger(page) || page < 1) {
      errors.push('Page must be a positive integer');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
      errors.push(`Limit must be between 1 and ${maxLimit}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      offset: (page - 1) * limit
    };
  }

  /**
   * Validate email list
   */
  validateEmailList(emails) {
    if (!Array.isArray(emails)) {
      return {
        valid: false,
        errors: ['Email list must be an array']
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return {
        valid: false,
        errors: [`Invalid email addresses: ${invalidEmails.join(', ')}`]
      };
    }

    return { valid: true };
  }

  /**
   * Get validation rules for a report type
   */
  getValidationRules(reportType) {
    const rules = {
      required: [],
      optional: [],
      constraints: {}
    };

    const schema = this.schemas[reportType];
    if (!schema) return rules;

    // Extract rules from schema
    if (schema._ids && schema._ids._byKey) {
      for (const [key, rule] of schema._ids._byKey) {
        const isRequired = rule._flags?.presence === 'required';
        
        if (isRequired) {
          rules.required.push(key);
        } else {
          rules.optional.push(key);
        }

        rules.constraints[key] = {
          type: rule._type,
          default: rule._flags?.default,
          valid: rule._valids?._values || null,
          min: rule._rules?.find(r => r.name === 'min')?.args?.limit,
          max: rule._rules?.find(r => r.name === 'max')?.args?.limit
        };
      }
    }

    return rules;
  }
}

module.exports = new ValidationSchemas();