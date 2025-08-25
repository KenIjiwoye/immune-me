# Report Utilities

This package contains shared utilities for all report functions in the ImmuneMe system.

## Overview

The report utilities provide a comprehensive set of tools for:
- **Caching**: Multi-tier caching with memory and database storage
- **Performance**: Query optimization and parallel processing
- **Memory**: Efficient handling of large datasets
- **Monitoring**: Comprehensive logging and metrics
- **Validation**: Parameter validation and sanitization
- **Error Handling**: Robust error handling and recovery

## Installation

```bash
npm install
```

## Usage

### Basic Setup

```javascript
const { ReportUtils } = require('./utils');

// Initialize utilities
const cache = new ReportUtils.cache(databases, databaseId);
const optimizer = new ReportUtils.performance(databases, databaseId);
const monitor = new ReportUtils.monitoring(databases, databaseId);
```

### Caching Example

```javascript
// Set up cache manager
const cache = new ReportUtils.cache(databases, databaseId);

// Cache data
await cache.set('report_key', data, { ttl: 3600 });

// Retrieve cached data
const cachedData = await cache.get('report_key');
```

### Performance Optimization

```javascript
// Process large datasets efficiently
const optimizer = new ReportUtils.performance(databases, databaseId);

const result = await optimizer.processLargeDataset({
  collectionId: 'patients',
  queries: [Query.equal('status', 'active')],
  batchSize: 1000
}, processorFunction);
```

### Validation

```javascript
// Validate report parameters
const validation = ReportUtils.validation.validate(params, 'dueImmunizationsList');

if (!validation.valid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

## Components

### 1. CacheManager (`cache-manager.js`)
- Multi-tier caching (memory + database)
- Automatic compression for large data
- Cache warming and cleanup
- Statistics and monitoring

### 2. PerformanceOptimizer (`performance-optimizer.js`)
- Query optimization strategies
- Parallel processing with concurrency control
- Memory-efficient batch processing
- Streaming data processing

### 3. MemoryOptimizer (`memory-optimizer.js`)
- Memory usage monitoring
- Automatic garbage collection
- Data compression and sampling
- Memory-efficient aggregation

### 4. MonitoringService (`monitoring.js`)
- Comprehensive logging
- Performance metrics tracking
- Health checks and alerts
- Dashboard data aggregation

### 5. ValidationSchemas (`validation-schemas.js`)
- Joi-based validation schemas
- Report-specific validation rules
- Parameter sanitization
- Custom validators

### 6. ErrorHandler (`error-handler.js`)
- Standardized error types
- Retry mechanisms with backoff
- Circuit breaker pattern
- Error recovery strategies

### 7. ReportConfig (`../config/report-config.js`)
- Centralized configuration
- Environment variable management
- Function-specific settings

## Environment Variables

```bash
# Database
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=default

# Performance
BATCH_SIZE=1000
MAX_CONCURRENT_QUERIES=5
MEMORY_LIMIT_MB=512

# Caching
CACHE_TTL=3600
ENABLE_CACHING=true
ENABLE_COMPRESSION=true

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

## API Reference

### CacheManager

#### Methods
- `get(key, options)` - Retrieve cached data
- `set(key, data, options)` - Store data in cache
- `delete(key)` - Remove cache entry
- `clearPrefix(prefix)` - Clear cache entries by prefix
- `getStats()` - Get cache statistics

### PerformanceOptimizer

#### Methods
- `optimizeQuery(collectionId, queries, options)` - Optimize database queries
- `executeParallelQueries(queries, options)` - Execute queries in parallel
- `processLargeDataset(config, processor)` - Process large datasets efficiently
- `getPerformanceMetrics()` - Get performance statistics

### MemoryOptimizer

#### Methods
- `getMemoryUsage()` - Get current memory usage
- `processInBatches(data, processor, options)` - Process data in memory-efficient batches
- `compressData(data)` - Compress data for storage
- `getMemoryStats()` - Get memory statistics

### MonitoringService

#### Methods
- `log(level, message, context)` - Log messages
- `trackMetric(type, value, tags)` - Track custom metrics
- `getHealthStatus(functionName)` - Get function health status
- `getDashboardData(timeRange, functionName)` - Get dashboard data

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

## Deployment

The utilities are designed to be used across all report functions. Each function should:

1. Import the required utilities
2. Initialize them with appropriate configuration
3. Use the utilities for caching, validation, and error handling
4. Monitor performance and memory usage

## Contributing

1. Add new utilities to the appropriate module
2. Update the index.js exports
3. Add tests for new functionality
4. Update this README with usage examples