/**
 * Report Utilities Index
 * Centralized exports for all report utilities
 */

const ReportTemplates = require('./report-templates');
const CacheManager = require('./cache-manager');
const PerformanceOptimizer = require('./performance-optimizer');
const MemoryOptimizer = require('./memory-optimizer');
const MonitoringService = require('./monitoring');
const ValidationSchemas = require('./validation-schemas');
const ErrorHandler = require('./error-handler');
const ReportConfig = require('../config/report-config');

module.exports = {
  ReportTemplates,
  CacheManager,
  PerformanceOptimizer,
  MemoryOptimizer,
  MonitoringService,
  ValidationSchemas,
  ErrorHandler,
  ReportConfig
};

// Convenience exports for direct usage
module.exports.ReportUtils = {
  templates: ReportTemplates,
  cache: CacheManager,
  performance: PerformanceOptimizer,
  memory: MemoryOptimizer,
  monitoring: MonitoringService,
  validation: ValidationSchemas,
  errors: ErrorHandler,
  config: ReportConfig
};