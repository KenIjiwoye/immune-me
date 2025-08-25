/**
 * Advanced Caching Manager for Report Functions
 * Implements multi-tier caching with Appwrite storage and memory
 */

const { Databases, Query } = require('node-appwrite');
const crypto = require('crypto');
const zlib = require('zlib');

class CacheManager {
  constructor(databases, databaseId, config = {}) {
    this.databases = databases;
    this.databaseId = databaseId;
    this.config = {
      cacheCollection: 'report_cache',
      metadataCollection: 'cache_metadata',
      defaultTTL: 3600,
      maxTTL: 86400,
      compressionThreshold: 1024,
      enableCompression: true,
      enableMemoryCache: true,
      memoryCacheSize: 100,
      ...config
    };
    
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix, params) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);
    return `${prefix}_${hash}`;
  }

  /**
   * Get data from cache (multi-tier: memory -> database)
   */
  async get(key, options = {}) {
    const { ttl = this.config.defaultTTL, skipMemory = false } = options;

    // Check memory cache first
    if (this.config.enableMemoryCache && !skipMemory) {
      const memoryHit = this.memoryCache.get(key);
      if (memoryHit && Date.now() - memoryHit.timestamp < ttl * 1000) {
        this.cacheStats.hits++;
        return memoryHit.data;
      }
    }

    try {
      // Check database cache
      const cacheDoc = await this.databases.getDocument(
        this.databaseId,
        this.config.cacheCollection,
        key
      );

      const now = Date.now();
      const cachedAt = new Date(cacheDoc.cachedAt).getTime();
      
      if (now - cachedAt < ttl * 1000) {
        // Cache hit
        this.cacheStats.hits++;
        
        // Decompress if needed
        let data = cacheDoc.data;
        if (cacheDoc.compressed) {
          data = JSON.parse(
            zlib.gunzipSync(Buffer.from(cacheDoc.data, 'base64')).toString()
          );
        } else {
          data = JSON.parse(cacheDoc.data);
        }

        // Update memory cache
        if (this.config.enableMemoryCache) {
          this.updateMemoryCache(key, data);
        }

        return data;
      } else {
        // Cache expired
        await this.delete(key);
      }
    } catch (error) {
      if (error.code !== 404) {
        console.warn(`Cache retrieval error: ${error.message}`);
      }
    }

    this.cacheStats.misses++;
    return null;
  }

  /**
   * Set data in cache (multi-tier)
   */
  async set(key, data, options = {}) {
    const { ttl = this.config.defaultTTL, compress = null } = options;
    
    try {
      // Prepare data for storage
      let serializedData = JSON.stringify(data);
      let shouldCompress = compress !== null ? compress : 
        (this.config.enableCompression && serializedData.length > this.config.compressionThreshold);

      let storedData = serializedData;
      if (shouldCompress) {
        storedData = zlib.gzipSync(serializedData).toString('base64');
      }

      const cacheDoc = {
        data: storedData,
        compressed: shouldCompress,
        cachedAt: new Date().toISOString(),
        ttl: ttl,
        size: serializedData.length
      };

      // Store in database
      try {
        await this.databases.createDocument(
          this.databaseId,
          this.config.cacheCollection,
          key,
          cacheDoc
        );
      } catch (error) {
        if (error.code === 409) {
          // Update existing
          await this.databases.updateDocument(
            this.databaseId,
            this.config.cacheCollection,
            key,
            cacheDoc
          );
        } else {
          throw error;
        }
      }

      // Update memory cache
      if (this.config.enableMemoryCache) {
        this.updateMemoryCache(key, data);
      }

      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error(`Cache storage error: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key) {
    try {
      await this.databases.deleteDocument(
        this.databaseId,
        this.config.cacheCollection,
        key
      );
      
      this.memoryCache.delete(key);
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      if (error.code !== 404) {
        console.warn(`Cache deletion error: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Clear all cache entries for a prefix
   */
  async clearPrefix(prefix) {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        this.config.cacheCollection,
        [
          Query.startsWith('$id', prefix)
        ]
      );

      const deletePromises = response.documents.map(doc => 
        this.databases.deleteDocument(
          this.databaseId,
          this.config.cacheCollection,
          doc.$id
        )
      );

      await Promise.all(deletePromises);

      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }

      return response.documents.length;
    } catch (error) {
      console.error(`Cache clear error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Update memory cache with LRU eviction
   */
  updateMemoryCache(key, data) {
    if (this.memoryCache.size >= this.config.memoryCacheSize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cacheStats,
      memoryCacheSize: this.memoryCache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }

  /**
   * Clean expired cache entries
   */
  async cleanup() {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        this.config.cacheCollection,
        [
          Query.lessThan('cachedAt', new Date(Date.now() - this.config.maxTTL * 1000).toISOString())
        ]
      );

      const deletePromises = response.documents.map(doc => 
        this.databases.deleteDocument(
          this.databaseId,
          this.config.cacheCollection,
          doc.$id
        )
      );

      await Promise.all(deletePromises);
      
      return response.documents.length;
    } catch (error) {
      console.error(`Cache cleanup error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Cache warming for common reports
   */
  async warmCache(reportType, params, data) {
    const key = this.generateKey(reportType, params);
    return await this.set(key, data, { ttl: this.config.defaultTTL });
  }

  /**
   * Get cache metadata
   */
  async getCacheInfo(key) {
    try {
      const doc = await this.databases.getDocument(
        this.databaseId,
        this.config.cacheCollection,
        key
      );

      return {
        key,
        cachedAt: doc.cachedAt,
        ttl: doc.ttl,
        size: doc.size,
        compressed: doc.compressed,
        age: Math.floor((Date.now() - new Date(doc.cachedAt).getTime()) / 1000)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch cache operations
   */
  async batchGet(keys, options = {}) {
    const results = {};
    const promises = keys.map(async key => {
      const data = await this.get(key, options);
      results[key] = data;
    });

    await Promise.all(promises);
    return results;
  }

  async batchSet(items, options = {}) {
    const promises = Object.entries(items).map(([key, data]) => 
      this.set(key, data, options)
    );

    return await Promise.all(promises);
  }
}

module.exports = CacheManager;