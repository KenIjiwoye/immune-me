/**
 * Performance Optimization Utilities for Report Functions
 * Handles query optimization, memory management, and parallel processing
 */

const { Query } = require('node-appwrite');

class PerformanceOptimizer {
  constructor(databases, databaseId, config = {}) {
    this.databases = databases;
    this.databaseId = databaseId;
    this.config = {
      maxConcurrentQueries: 5,
      batchSize: 1000,
      memoryLimitMB: 512,
      queryTimeoutMs: 30000,
      enableQueryOptimization: true,
      enableParallelProcessing: true,
      ...config
    };
    
    this.queryStats = {
      totalQueries: 0,
      avgResponseTime: 0,
      errors: 0
    };
  }

  /**
   * Query optimization strategies
   */
  optimizeQuery(collectionId, queries = [], options = {}) {
    const optimized = {
      collectionId,
      queries: [...queries],
      limit: options.limit || 100,
      offset: options.offset || 0,
      orderAttributes: options.orderAttributes || [],
      orderTypes: options.orderTypes || []
    };

    // Apply query optimization rules
    if (this.config.enableQueryOptimization) {
      optimized.queries = this.applyQueryOptimizations(optimized.queries);
    }

    return optimized;
  }

  applyQueryOptimizations(queries) {
    const optimizations = [];

    // Remove redundant queries
    const seen = new Set();
    for (const query of queries) {
      const key = JSON.stringify(query);
      if (!seen.has(key)) {
        seen.add(key);
        optimizations.push(query);
      }
    }

    // Reorder queries for better performance
    // Put equality checks first, then range queries
    return optimizations.sort((a, b) => {
      const aType = this.getQueryType(a);
      const bType = this.getQueryType(b);
      
      const priority = { 'equal': 0, 'range': 1, 'search': 2, 'order': 3 };
      return priority[aType] - priority[bType];
    });
  }

  getQueryType(query) {
    if (query.includes('equal')) return 'equal';
    if (query.includes('greater') || query.includes('less')) return 'range';
    if (query.includes('search')) return 'search';
    if (query.includes('order')) return 'order';
    return 'other';
  }

  /**
   * Parallel query execution
   */
  async executeParallelQueries(queries, options = {}) {
    const { maxConcurrent = this.config.maxConcurrentQueries } = options;
    
    const results = [];
    const executing = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      const promise = this.executeQueryWithMetrics(query)
        .then(result => ({ success: true, data: result, query }))
        .catch(error => ({ success: false, error: error.message, query }));
      
      executing.push(promise);
      
      if (executing.length >= maxConcurrent || i === queries.length - 1) {
        const batchResults = await Promise.all(executing);
        results.push(...batchResults);
        executing.length = 0;
      }
    }
    
    return results;
  }

  async executeQueryWithMetrics(query) {
    const startTime = Date.now();
    
    try {
      this.queryStats.totalQueries++;
      
      const result = await this.databases.listDocuments(
        this.databaseId,
        query.collectionId,
        [
          ...query.queries,
          Query.limit(query.limit),
          Query.offset(query.offset),
          ...(query.orderAttributes.map((attr, idx) => 
            Query.orderAsc(attr, query.orderTypes[idx])
          ))
        ]
      );
      
      const duration = Date.now() - startTime;
      this.updateQueryStats(duration);
      
      return result;
    } catch (error) {
      this.queryStats.errors++;
      throw error;
    }
  }

  updateQueryStats(duration) {
    const alpha = 0.1; // Exponential moving average factor
    this.queryStats.avgResponseTime = 
      this.queryStats.avgResponseTime * (1 - alpha) + duration * alpha;
  }

  /**
   * Memory-efficient data processing
   */
  async processLargeDataset(config, processor) {
    const {
      collectionId,
      queries = [],
      batchSize = this.config.batchSize,
      maxMemoryMB = this.config.memoryLimitMB
    } = config;

    let offset = 0;
    let hasMore = true;
    const results = [];
    let processedCount = 0;

    // Estimate memory usage
    const maxRecords = Math.floor((maxMemoryMB * 1024 * 1024) / 1024); // Conservative estimate
    
    while (hasMore && processedCount < maxRecords) {
      const currentBatchSize = Math.min(batchSize, maxRecords - processedCount);
      
      const query = this.optimizeQuery(collectionId, queries, {
        limit: currentBatchSize,
        offset
      });

      const response = await this.executeQueryWithMetrics(query);
      
      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      // Process batch
      const processed = await processor(response.documents);
      results.push(...processed);

      processedCount += response.documents.length;
      offset += currentBatchSize;

      // Memory management
      if (processedCount % 5000 === 0) {
        // Force garbage collection hint
        if (global.gc) {
          global.gc();
        }
        
        // Brief pause to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return {
      data: results,
      totalProcessed: processedCount,
      hasMore
    };
  }

  /**
   * Streaming data processing
   */
  async streamProcess(config, processor, options = {}) {
    const {
      collectionId,
      queries = [],
      batchSize = this.config.batchSize
    } = config;

    const { onProgress, onError } = options;
    
    let offset = 0;
    let totalProcessed = 0;
    let hasError = false;

    while (!hasError) {
      try {
        const query = this.optimizeQuery(collectionId, queries, {
          limit: batchSize,
          offset
        });

        const response = await this.executeQueryWithMetrics(query);
        
        if (response.documents.length === 0) {
          break;
        }

        await processor(response.documents, {
          batchNumber: Math.floor(offset / batchSize),
          totalProcessed: totalProcessed + response.documents.length
        });

        totalProcessed += response.documents.length;
        offset += batchSize;

        if (onProgress) {
          onProgress({
            totalProcessed,
            currentBatch: response.documents.length
          });
        }

        // Memory management
        if (totalProcessed % 10000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      } catch (error) {
        hasError = true;
        if (onError) {
          onError(error);
        } else {
          throw error;
        }
      }
    }

    return { totalProcessed, hasError };
  }

  /**
   * Index optimization suggestions
   */
  analyzeQueryForIndexes(queries) {
    const suggestions = [];
    
    for (const query of queries) {
      if (query.includes('equal')) {
        const match = query.match(/equal\("([^"]+)",/);
        if (match) {
          suggestions.push({
            type: 'single',
            attribute: match[1],
            reason: 'Equality query optimization'
          });
        }
      }
      
      if (query.includes('search')) {
        const match = query.match(/search\("([^"]+)",/);
        if (match) {
          suggestions.push({
            type: 'fulltext',
            attribute: match[1],
            reason: 'Full-text search optimization'
          });
        }
      }
      
      if (query.includes('order')) {
        const match = query.match(/order(?:Asc|Desc)\("([^"]+)",/);
        if (match) {
          suggestions.push({
            type: 'composite',
            attributes: [match[1]],
            reason: 'Ordering optimization'
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Query result pagination
   */
  async paginateQuery(config, page = 1, pageSize = 100) {
    const offset = (page - 1) * pageSize;
    
    const query = this.optimizeQuery(config.collectionId, config.queries || [], {
      limit: pageSize,
      offset,
      orderAttributes: config.orderAttributes || [],
      orderTypes: config.orderTypes || []
    });

    const result = await this.executeQueryWithMetrics(query);
    
    return {
      data: result.documents,
      pagination: {
        page,
        pageSize,
        total: result.total,
        hasNext: offset + pageSize < result.total,
        hasPrevious: page > 1
      }
    };
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics() {
    return {
      queryStats: this.queryStats,
      config: this.config,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Query timeout wrapper
   */
  async executeWithTimeout(promise, timeoutMs = this.config.queryTimeoutMs) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Retry mechanism
   */
  async retry(operation, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    throw lastError;
  }

  /**
   * Data aggregation utilities
   */
  async aggregateData(config, aggregationConfig) {
    const {
      groupBy,
      aggregations = {},
      filters = []
    } = aggregationConfig;

    const results = {};
    
    await this.streamProcess(config, (documents) => {
      for (const doc of documents) {
        const key = doc[groupBy];
        if (!results[key]) {
          results[key] = {
            count: 0,
            ...Object.keys(aggregations).reduce((acc, agg) => {
              acc[agg] = 0;
              return acc;
            }, {})
          };
        }

        results[key].count++;
        
        for (const [field, operation] of Object.entries(aggregations)) {
          const value = doc[field];
          if (value !== undefined && value !== null) {
            switch (operation) {
              case 'sum':
                results[key][field] += value;
                break;
              case 'avg':
                results[key][field] = (results[key][field] * (results[key].count - 1) + value) / results[key].count;
                break;
              case 'max':
                results[key][field] = Math.max(results[key][field], value);
                break;
              case 'min':
                results[key][field] = Math.min(results[key][field], value);
                break;
            }
          }
        }
      }
    });

    return results;
  }
}

module.exports = PerformanceOptimizer;