/**
 * Memory Optimization Utilities for Large Datasets
 * Handles memory management, data streaming, and efficient processing
 */

class MemoryOptimizer {
  constructor(config = {}) {
    this.config = {
      maxMemoryMB: 512,
      warningThreshold: 0.8,
      criticalThreshold: 0.9,
      gcInterval: 10000,
      batchSize: 1000,
      enableStreaming: true,
      enableCompression: true,
      ...config
    };
    
    this.memoryStats = {
      peakUsage: 0,
      currentUsage: 0,
      gcRuns: 0,
      warnings: 0
    };
    
    this.startMemoryMonitoring();
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    const maxMemory = this.config.maxMemoryMB * 1024 * 1024;
    
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      external: usage.external,
      max: maxMemory,
      percentage: (usage.heapUsed / maxMemory) * 100
    };
  }

  /**
   * Check if memory usage is critical
   */
  isMemoryCritical() {
    const usage = this.getMemoryUsage();
    return usage.percentage >= this.config.criticalThreshold * 100;
  }

  /**
   * Check if memory usage is warning level
   */
  isMemoryWarning() {
    const usage = this.getMemoryUsage();
    return usage.percentage >= this.config.warningThreshold * 100;
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = this.getMemoryUsage();
      
      this.memoryStats.currentUsage = usage.used;
      this.memoryStats.peakUsage = Math.max(
        this.memoryStats.peakUsage, 
        usage.used
      );

      if (this.isMemoryCritical()) {
        this.memoryStats.warnings++;
        console.warn(`Memory usage critical: ${usage.percentage.toFixed(2)}%`);
        this.triggerGarbageCollection();
      } else if (this.isMemoryWarning()) {
        console.warn(`Memory usage warning: ${usage.percentage.toFixed(2)}%`);
      }
    }, this.config.gcInterval);
  }

  /**
   * Trigger garbage collection
   */
  triggerGarbageCollection() {
    if (global.gc) {
      global.gc();
      this.memoryStats.gcRuns++;
    }
  }

  /**
   * Memory-efficient data processing
   */
  async processInBatches(data, processor, options = {}) {
    const { batchSize = this.config.batchSize, onProgress } = options;
    
    const results = [];
    const totalItems = data.length;
    
    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Check memory before processing
      if (this.isMemoryCritical()) {
        console.warn('Memory critical, pausing processing...');
        await this.waitForMemory();
      }
      
      const processed = await processor(batch);
      results.push(...processed);
      
      // Clear processed batch from memory
      batch.length = 0;
      
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, totalItems),
          total: totalItems,
          percentage: ((i + batchSize) / totalItems) * 100
        });
      }
      
      // Brief pause for GC
      if (i % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Wait for memory to be available
   */
  async waitForMemory() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (this.isMemoryCritical() && attempts < maxAttempts) {
      this.triggerGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Memory usage remains critical after cleanup');
    }
  }

  /**
   * Data compression utilities
   */
  compressData(data) {
    if (!this.config.enableCompression) return data;
    
    try {
      const jsonString = JSON.stringify(data);
      const compressed = Buffer.from(jsonString).toString('base64');
      
      // Only return compressed if it's smaller
      if (compressed.length < jsonString.length * 0.8) {
        return {
          _compressed: true,
          _data: compressed
        };
      }
    } catch (error) {
      console.warn('Compression failed:', error.message);
    }
    
    return data;
  }

  decompressData(data) {
    if (data && data._compressed) {
      try {
        const decompressed = Buffer.from(data._data, 'base64').toString();
        return JSON.parse(decompressed);
      } catch (error) {
        console.warn('Decompression failed:', error.message);
        return data;
      }
    }
    
    return data;
  }

  /**
   * Data sampling for large datasets
   */
  sampleData(data, sampleSize, method = 'random') {
    if (data.length <= sampleSize) return data;
    
    switch (method) {
      case 'random':
        return this.randomSample(data, sampleSize);
      case 'stratified':
        return this.stratifiedSample(data, sampleSize);
      case 'systematic':
        return this.systematicSample(data, sampleSize);
      default:
        return data.slice(0, sampleSize);
    }
  }

  randomSample(data, sampleSize) {
    const indices = new Set();
    const result = [];
    
    while (indices.size < sampleSize && indices.size < data.length) {
      const index = Math.floor(Math.random() * data.length);
      if (!indices.has(index)) {
        indices.add(index);
        result.push(data[index]);
      }
    }
    
    return result;
  }

  stratifiedSample(data, sampleSize) {
    // Simple stratified sampling by dividing into equal groups
    const groupSize = Math.floor(data.length / sampleSize);
    const result = [];
    
    for (let i = 0; i < sampleSize && i * groupSize < data.length; i++) {
      const index = Math.floor(i * groupSize + Math.random() * groupSize);
      if (index < data.length) {
        result.push(data[index]);
      }
    }
    
    return result;
  }

  systematicSample(data, sampleSize) {
    const interval = Math.floor(data.length / sampleSize);
    const result = [];
    
    for (let i = 0; i < sampleSize && i * interval < data.length; i++) {
      const index = i * interval;
      result.push(data[index]);
    }
    
    return result;
  }

  /**
   * Streaming data processing
   */
  async streamProcess(source, processor, options = {}) {
    const { chunkSize = this.config.batchSize, onProgress } = options;
    
    let processed = 0;
    const results = [];
    
    for await (const chunk of this.createChunks(source, chunkSize)) {
      if (this.isMemoryCritical()) {
        await this.waitForMemory();
      }
      
      const processedChunk = await processor(chunk);
      results.push(...processedChunk);
      
      processed += chunk.length;
      
      if (onProgress) {
        onProgress({ processed });
      }
      
      // Clear chunk from memory
      chunk.length = 0;
    }
    
    return results;
  }

  async* createChunks(source, chunkSize) {
    let chunk = [];
    
    for (const item of source) {
      chunk.push(item);
      
      if (chunk.length >= chunkSize) {
        yield chunk;
        chunk = [];
      }
    }
    
    if (chunk.length > 0) {
      yield chunk;
    }
  }

  /**
   * Memory-efficient aggregation
   */
  async aggregateData(data, aggregations, options = {}) {
    const { batchSize = this.config.batchSize } = options;
    
    const results = {};
    
    for (const agg of aggregations) {
      results[agg.field] = {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0
      };
    }
    
    await this.processInBatches(data, (batch) => {
      for (const item of batch) {
        for (const agg of aggregations) {
          const value = item[agg.field];
          if (value !== null && value !== undefined) {
            const result = results[agg.field];
            result.sum += value;
            result.count++;
            result.min = Math.min(result.min, value);
            result.max = Math.max(result.max, value);
            result.avg = result.sum / result.count;
          }
        }
      }
      return [];
    }, { batchSize });
    
    // Clean up infinities
    for (const agg of aggregations) {
      const result = results[agg.field];
      if (result.min === Infinity) result.min = null;
      if (result.max === -Infinity) result.max = null;
    }
    
    return results;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const usage = this.getMemoryUsage();
    
    return {
      ...this.memoryStats,
      currentUsage: usage.used,
      totalUsage: usage.total,
      percentage: usage.percentage,
      external: usage.external,
      maxMemory: this.config.maxMemoryMB * 1024 * 1024
    };
  }

  /**
   * Memory cleanup
   */
  cleanup() {
    if (global.gc) {
      global.gc();
    }
    
    // Clear any cached data
    this.memoryStats.currentUsage = 0;
  }

  /**
   * Memory usage estimation
   */
  estimateMemoryUsage(obj) {
    const seen = new WeakSet();
    
    const sizeOf = (value) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'boolean') return 4;
      if (typeof value === 'number') return 8;
      if (typeof value === 'string') return value.length * 2;
      if (typeof value === 'object') {
        if (seen.has(value)) return 0;
        seen.add(value);
        
        let bytes = 0;
        for (const key in value) {
          bytes += sizeOf(key);
          bytes += sizeOf(value[key]);
        }
        return bytes;
      }
      return 0;
    };
    
    return sizeOf(obj);
  }
}

module.exports = MemoryOptimizer;