import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import winston from 'winston';

/**
 * FileOperationsOptimizer provides optimized file operations with caching,
 * batching, and performance monitoring for production environments.
 */
export class FileOperationsOptimizer {
  constructor(config = {}) {
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 100;
    this.cacheMaxAge = config.cacheMaxAge || 5 * 60 * 1000; // 5 minutes
    this.batchOperations = new Map();
    this.batchTimeout = config.batchTimeout || 100; // 100ms
    this.maxBatchSize = config.maxBatchSize || 10;
    
    // Performance metrics
    this.metrics = {
      reads: { count: 0, totalTime: 0, cacheHits: 0 },
      writes: { count: 0, totalTime: 0, batched: 0 },
      deletes: { count: 0, totalTime: 0 },
      errors: { count: 0, types: {} }
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'FileOperationsOptimizer' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    // Start cache cleanup
    this._startCacheCleanup();
    
    // Start batch processor
    this._startBatchProcessor();
  }

  /**
   * Optimized file read with caching
   * @param {string} filePath - Path to file
   * @param {Object} options - Read options
   * @returns {Promise<string>} File content
   */
  async readFile(filePath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = this._getCachedContent(filePath);
        if (cached) {
          this.metrics.reads.cacheHits++;
          this.logger.debug('Cache hit for file read', { filePath });
          return cached;
        }
      }
      
      // Read from filesystem
      const content = await fs.readFile(filePath, 'utf8');
      
      // Cache the content
      if (!options.skipCache) {
        this._setCachedContent(filePath, content);
      }
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.reads.count++;
      this.metrics.reads.totalTime += duration;
      
      this.logger.debug('File read completed', { 
        filePath, 
        size: content.length, 
        duration 
      });
      
      return content;
    } catch (error) {
      this._recordError('READ', error);
      this.logger.error('File read failed', { filePath, error: error.message });
      throw error;
    }
  }

  /**
   * Optimized file write with batching
   * @param {string} filePath - Path to file
   * @param {string} content - Content to write
   * @param {Object} options - Write options
   * @returns {Promise<void>}
   */
  async writeFile(filePath, content, options = {}) {
    const startTime = Date.now();
    
    try {
      if (options.batch && !options.immediate) {
        // Add to batch queue
        return this._addToBatch(filePath, content, options);
      }
      
      // Ensure directory exists
      await this._ensureDirectory(path.dirname(filePath));
      
      // Write file
      await fs.writeFile(filePath, content, 'utf8');
      
      // Update cache
      this._setCachedContent(filePath, content);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.writes.count++;
      this.metrics.writes.totalTime += duration;
      
      this.logger.debug('File write completed', { 
        filePath, 
        size: content.length, 
        duration 
      });
      
    } catch (error) {
      this._recordError('WRITE', error);
      this.logger.error('File write failed', { filePath, error: error.message });
      throw error;
    }
  }

  /**
   * Optimized file delete with cache invalidation
   * @param {string} filePath - Path to file
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    const startTime = Date.now();
    
    try {
      await fs.unlink(filePath);
      
      // Remove from cache
      this._invalidateCache(filePath);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.deletes.count++;
      this.metrics.deletes.totalTime += duration;
      
      this.logger.debug('File delete completed', { filePath, duration });
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this._recordError('DELETE', error);
        this.logger.error('File delete failed', { filePath, error: error.message });
        throw error;
      }
      // File doesn't exist, consider it successful
      this._invalidateCache(filePath);
    }
  }

  /**
   * Check if file exists (with caching)
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      // Check cache first for recent reads
      if (this.cache.has(filePath)) {
        return true;
      }
      
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch multiple file operations for efficiency
   * @param {Array} operations - Array of {type, filePath, content} operations
   * @returns {Promise<Array>} Results array
   */
  async batchOperations(operations) {
    const startTime = Date.now();
    const results = [];
    
    try {
      // Group operations by type
      const grouped = this._groupOperations(operations);
      
      // Execute read operations in parallel
      if (grouped.reads.length > 0) {
        const readPromises = grouped.reads.map(op => 
          this.readFile(op.filePath, op.options)
        );
        const readResults = await Promise.allSettled(readPromises);
        results.push(...readResults);
      }
      
      // Execute write operations (ensure directories first)
      if (grouped.writes.length > 0) {
        // Ensure all directories exist
        const dirs = [...new Set(grouped.writes.map(op => path.dirname(op.filePath)))];
        await Promise.all(dirs.map(dir => this._ensureDirectory(dir)));
        
        // Execute writes in parallel
        const writePromises = grouped.writes.map(op => 
          fs.writeFile(op.filePath, op.content, 'utf8')
        );
        const writeResults = await Promise.allSettled(writePromises);
        results.push(...writeResults);
        
        // Update cache for successful writes
        grouped.writes.forEach((op, index) => {
          if (writeResults[index].status === 'fulfilled') {
            this._setCachedContent(op.filePath, op.content);
          }
        });
      }
      
      // Execute delete operations
      if (grouped.deletes.length > 0) {
        const deletePromises = grouped.deletes.map(op => 
          this.deleteFile(op.filePath)
        );
        const deleteResults = await Promise.allSettled(deletePromises);
        results.push(...deleteResults);
      }
      
      const duration = Date.now() - startTime;
      this.logger.info('Batch operations completed', {
        totalOperations: operations.length,
        reads: grouped.reads.length,
        writes: grouped.writes.length,
        deletes: grouped.deletes.length,
        duration
      });
      
      return results;
    } catch (error) {
      this._recordError('BATCH', error);
      this.logger.error('Batch operations failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cache: {
        size: this.cache.size,
        maxSize: this.cacheMaxSize,
        hitRate: this.metrics.reads.count > 0 ? 
          (this.metrics.reads.cacheHits / this.metrics.reads.count) * 100 : 0
      },
      averageLatency: {
        read: this.metrics.reads.count > 0 ? 
          this.metrics.reads.totalTime / this.metrics.reads.count : 0,
        write: this.metrics.writes.count > 0 ? 
          this.metrics.writes.totalTime / this.metrics.writes.count : 0,
        delete: this.metrics.deletes.count > 0 ? 
          this.metrics.deletes.totalTime / this.metrics.deletes.count : 0
      }
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('File cache cleared');
  }

  /**
   * Shutdown the optimizer
   */
  shutdown() {
    // Clear intervals
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.batchProcessorInterval) {
      clearInterval(this.batchProcessorInterval);
    }
    
    // Process any remaining batched operations
    this._processBatchedOperations();
    
    this.logger.info('FileOperationsOptimizer shutdown complete');
  }

  // Private methods
  _getCachedContent(filePath) {
    const cached = this.cache.get(filePath);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheMaxAge) {
      this.cache.delete(filePath);
      return null;
    }
    
    return cached.content;
  }

  _setCachedContent(filePath, content) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(filePath, {
      content,
      timestamp: Date.now()
    });
  }

  _invalidateCache(filePath) {
    this.cache.delete(filePath);
  }

  async _ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  _addToBatch(filePath, content, options) {
    const batchKey = options.batchKey || 'default';
    
    if (!this.batchOperations.has(batchKey)) {
      this.batchOperations.set(batchKey, []);
    }
    
    const batch = this.batchOperations.get(batchKey);
    batch.push({ filePath, content, options });
    
    // Process batch if it's full
    if (batch.length >= this.maxBatchSize) {
      this._processBatch(batchKey);
    }
    
    return Promise.resolve();
  }

  _groupOperations(operations) {
    const grouped = { reads: [], writes: [], deletes: [] };
    
    for (const op of operations) {
      switch (op.type) {
        case 'read':
          grouped.reads.push(op);
          break;
        case 'write':
          grouped.writes.push(op);
          break;
        case 'delete':
          grouped.deletes.push(op);
          break;
      }
    }
    
    return grouped;
  }

  _recordError(operation, error) {
    this.metrics.errors.count++;
    if (!this.metrics.errors.types[operation]) {
      this.metrics.errors.types[operation] = 0;
    }
    this.metrics.errors.types[operation]++;
  }

  _startCacheCleanup() {
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      const expired = [];
      
      for (const [filePath, cached] of this.cache.entries()) {
        if (now - cached.timestamp > this.cacheMaxAge) {
          expired.push(filePath);
        }
      }
      
      expired.forEach(filePath => this.cache.delete(filePath));
      
      if (expired.length > 0) {
        this.logger.debug('Cache cleanup completed', { 
          expiredEntries: expired.length 
        });
      }
    }, this.cacheMaxAge / 2);
  }

  _startBatchProcessor() {
    this.batchProcessorInterval = setInterval(() => {
      this._processBatchedOperations();
    }, this.batchTimeout);
  }

  _processBatchedOperations() {
    for (const batchKey of this.batchOperations.keys()) {
      this._processBatch(batchKey);
    }
  }

  async _processBatch(batchKey) {
    const batch = this.batchOperations.get(batchKey);
    if (!batch || batch.length === 0) return;
    
    this.batchOperations.set(batchKey, []);
    
    try {
      const operations = batch.map(item => ({
        type: 'write',
        filePath: item.filePath,
        content: item.content
      }));
      
      await this.batchOperations(operations);
      
      this.metrics.writes.batched += batch.length;
      
      this.logger.debug('Batch processed', { 
        batchKey, 
        operations: batch.length 
      });
    } catch (error) {
      this.logger.error('Batch processing failed', { 
        batchKey, 
        error: error.message 
      });
    }
  }
}

// Singleton instance
let optimizerInstance = null;

/**
 * Get or create the singleton FileOperationsOptimizer instance
 * @param {Object} config - Configuration options
 * @returns {FileOperationsOptimizer} The singleton instance
 */
export function getFileOptimizer(config = {}) {
  if (!optimizerInstance) {
    optimizerInstance = new FileOperationsOptimizer(config);
  }
  return optimizerInstance;
}