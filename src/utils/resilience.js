/**
 * Resilience and Performance Utilities for JasperReports MCP Server
 *
 * This module provides comprehensive resilience features including:
 * - Retry logic with exponential backoff for transient failures
 * - Connection pooling and request queuing for high concurrency
 * - Caching mechanisms for session tokens and metadata
 * - Memory management and cleanup for large file operations
 * - Health checks and monitoring capabilities
 */

import { EventEmitter } from 'events';
import { getConfiguration } from '../config/environment.js';
import { getErrorHandler, ERROR_CATEGORIES } from './errorHandler.js';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ERROR_CATEGORIES.CONNECTION,
    ERROR_CATEGORIES.TIMEOUT,
    ERROR_CATEGORIES.RATE_LIMIT,
  ],
};

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG = {
  sessionTokenTTL: 30 * 60 * 1000, // 30 minutes
  metadataTTL: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 1000,
  cleanupInterval: 60 * 1000, // 1 minute
};

/**
 * Default connection pool configuration
 */
const DEFAULT_POOL_CONFIG = {
  maxConnections: 10,
  maxQueueSize: 100,
  connectionTimeout: 30000,
  idleTimeout: 60000,
  retryDelay: 1000,
};

/**
 * Memory management configuration
 */
const DEFAULT_MEMORY_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxTotalMemory: 500 * 1024 * 1024, // 500MB
  cleanupThreshold: 0.8, // 80% of max memory
  gcInterval: 30 * 1000, // 30 seconds
};

/**
 * Retry utility with exponential backoff
 */
class RetryManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.errorHandler = getErrorHandler();
    this.retryStats = new Map();
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Async operation to retry
   * @param {object} options - Retry options
   * @returns {Promise<any>} Operation result
   */
  async executeWithRetry(operation, options = {}) {
    const config = { ...this.config, ...options };
    const operationId = options.operationId || 'unknown';

    let lastError;
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      attempt++;

      try {
        const result = await operation();

        // Record successful retry if this wasn't the first attempt
        if (attempt > 1) {
          this._recordRetrySuccess(operationId, attempt);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this._isRetryableError(error, config)) {
          this._recordRetryFailure(operationId, attempt, 'non_retryable');
          throw error;
        }

        // Don't retry on last attempt
        if (attempt >= config.maxAttempts) {
          this._recordRetryFailure(operationId, attempt, 'max_attempts');
          break;
        }

        // Calculate delay for next attempt
        const delay = this._calculateDelay(attempt, config);

        // Log retry attempt
        if (this.config.debugMode) {
          console.log(
            `[Retry Manager] Attempt ${attempt} failed for ${operationId}, retrying in ${delay}ms:`,
            error.message
          );
        }

        // Wait before next attempt
        await this._delay(delay);
      }
    }

    // All attempts failed
    throw lastError;
  }

  /**
   * Check if error is retryable
   * @private
   */
  _isRetryableError(error, config) {
    // Check if error has isRetryable method
    if (typeof error.isRetryable === 'function') {
      return error.isRetryable();
    }

    // Check error category
    if (error.category) {
      return config.retryableErrors.includes(error.category);
    }

    // Check specific error codes
    const retryableCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    // Check HTTP status codes
    if (error.statusCode) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.statusCode);
    }

    return false;
  }

  /**
   * Calculate delay for next retry attempt
   * @private
   */
  _calculateDelay(attempt, config) {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Delay execution for specified milliseconds
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Record successful retry
   * @private
   */
  _recordRetrySuccess(operationId, attempts) {
    const stats = this.retryStats.get(operationId) || {
      successes: 0,
      failures: 0,
      totalAttempts: 0,
    };
    stats.successes++;
    stats.totalAttempts += attempts;
    stats.lastSuccess = new Date();
    this.retryStats.set(operationId, stats);
  }

  /**
   * Record failed retry
   * @private
   */
  _recordRetryFailure(operationId, attempts, reason) {
    const stats = this.retryStats.get(operationId) || {
      successes: 0,
      failures: 0,
      totalAttempts: 0,
    };
    stats.failures++;
    stats.totalAttempts += attempts;
    stats.lastFailure = new Date();
    stats.lastFailureReason = reason;
    this.retryStats.set(operationId, stats);
  }

  /**
   * Get retry statistics
   * @returns {object} Retry statistics
   */
  getRetryStatistics() {
    const stats = {
      totalOperations: this.retryStats.size,
      totalSuccesses: 0,
      totalFailures: 0,
      totalAttempts: 0,
      averageAttempts: 0,
      operationStats: {},
    };

    for (const [operationId, operationStats] of this.retryStats.entries()) {
      stats.totalSuccesses += operationStats.successes;
      stats.totalFailures += operationStats.failures;
      stats.totalAttempts += operationStats.totalAttempts;
      stats.operationStats[operationId] = { ...operationStats };
    }

    if (stats.totalSuccesses + stats.totalFailures > 0) {
      stats.averageAttempts = stats.totalAttempts / (stats.totalSuccesses + stats.totalFailures);
    }

    return stats;
  }

  /**
   * Clear retry statistics
   */
  clearStatistics() {
    this.retryStats.clear();
  }
}

/**
 * Cache manager for session tokens and metadata
 */
class CacheManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.accessTimes = new Map();
    this.cleanupTimer = null;

    this._startCleanupTimer();
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.metadataTTL);

    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt,
      accessCount: 0,
    });

    this.accessTimes.set(key, now);

    // Trigger cleanup if cache is getting too large
    if (this.cache.size > this.config.maxCacheSize) {
      this._cleanup();
    }
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Check if entry has expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    this.accessTimes.set(key, now);

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} True if entry was deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * Set session token with appropriate TTL
   * @param {string} sessionId - Session identifier
   * @param {string} token - Session token
   * @param {number} expiresIn - Expiration time in milliseconds
   */
  setSessionToken(sessionId, token, expiresIn = null) {
    const ttl = expiresIn || this.config.sessionTokenTTL;
    this.set(`session:${sessionId}`, token, ttl);
  }

  /**
   * Get session token
   * @param {string} sessionId - Session identifier
   * @returns {string|null} Session token or null if not found/expired
   */
  getSessionToken(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  /**
   * Set metadata with appropriate TTL
   * @param {string} key - Metadata key
   * @param {any} metadata - Metadata to cache
   */
  setMetadata(key, metadata) {
    this.set(`metadata:${key}`, metadata, this.config.metadataTTL);
  }

  /**
   * Get metadata
   * @param {string} key - Metadata key
   * @returns {any} Cached metadata or null if not found/expired
   */
  getMetadata(key) {
    return this.get(`metadata:${key}`);
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStatistics() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
      totalSize += this._estimateSize(entry.value);
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      validEntries: this.cache.size - expiredCount,
      estimatedSize: totalSize,
      maxSize: this.config.maxCacheSize,
      hitRate: this._calculateHitRate(),
    };
  }

  /**
   * Start cleanup timer
   * @private
   */
  _startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this._cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries and enforce size limits
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const entriesToDelete = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        entriesToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of entriesToDelete) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }

    // If still over size limit, remove least recently used entries
    if (this.cache.size > this.config.maxCacheSize) {
      const sortedByAccess = Array.from(this.accessTimes.entries()).sort(([, a], [, b]) => a - b);

      const toRemove = this.cache.size - this.config.maxCacheSize;
      for (let i = 0; i < toRemove && i < sortedByAccess.length; i++) {
        const [key] = sortedByAccess[i];
        this.cache.delete(key);
        this.accessTimes.delete(key);
      }
    }
  }

  /**
   * Estimate size of cached value
   * @private
   */
  _estimateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // Rough estimate for UTF-16
    }
    if (Buffer.isBuffer(value)) {
      return value.length;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 8; // Rough estimate for primitives
  }

  /**
   * Calculate cache hit rate
   * @private
   */
  _calculateHitRate() {
    let totalAccesses = 0;
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
      if (entry.accessCount > 0) {
        totalHits++;
      }
    }

    return totalAccesses > 0 ? totalHits / totalAccesses : 0;
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Connection pool manager for high concurrency
 */
class ConnectionPoolManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.activeConnections = new Set();
    this.requestQueue = [];
    this.connectionStats = {
      created: 0,
      destroyed: 0,
      queued: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Execute request with connection pooling
   * @param {Function} requestFn - Function that executes the request
   * @param {object} options - Request options
   * @returns {Promise<any>} Request result
   */
  async executeRequest(requestFn, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        id: this._generateRequestId(),
        requestFn,
        options,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: options.timeout || this.config.connectionTimeout,
      };

      // Check if we can execute immediately
      if (this.activeConnections.size < this.config.maxConnections) {
        this._executeRequest(request);
      } else {
        // Add to queue
        this._queueRequest(request);
      }
    });
  }

  /**
   * Execute request immediately
   * @private
   */
  async _executeRequest(request) {
    const connectionId = this._generateConnectionId();
    this.activeConnections.add(connectionId);
    this.connectionStats.created++;

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${request.timeout}ms`));
        }, request.timeout);
      });

      // Execute request with timeout
      const result = await Promise.race([request.requestFn(), timeoutPromise]);

      this.connectionStats.completed++;
      request.resolve(result);
    } catch (error) {
      this.connectionStats.failed++;
      request.reject(error);
    } finally {
      // Release connection
      this.activeConnections.delete(connectionId);
      this.connectionStats.destroyed++;

      // Process next request in queue
      this._processQueue();
    }
  }

  /**
   * Add request to queue
   * @private
   */
  _queueRequest(request) {
    // Check queue size limit
    if (this.requestQueue.length >= this.config.maxQueueSize) {
      this.connectionStats.failed++;
      request.reject(new Error('Request queue is full'));
      return;
    }

    this.requestQueue.push(request);
    this.connectionStats.queued++;

    this.emit('requestQueued', {
      requestId: request.id,
      queueSize: this.requestQueue.length,
    });
  }

  /**
   * Process next request in queue
   * @private
   */
  _processQueue() {
    if (this.requestQueue.length === 0) {
      return;
    }

    if (this.activeConnections.size >= this.config.maxConnections) {
      return;
    }

    const request = this.requestQueue.shift();

    // Check if request has timed out while in queue
    const queueTime = Date.now() - request.createdAt;
    if (queueTime >= request.timeout) {
      this.connectionStats.failed++;
      request.reject(new Error(`Request timed out in queue after ${queueTime}ms`));
      this._processQueue(); // Try next request
      return;
    }

    this._executeRequest(request);
  }

  /**
   * Get connection pool statistics
   * @returns {object} Pool statistics
   */
  getStatistics() {
    return {
      activeConnections: this.activeConnections.size,
      maxConnections: this.config.maxConnections,
      queuedRequests: this.requestQueue.length,
      maxQueueSize: this.config.maxQueueSize,
      utilization: this.activeConnections.size / this.config.maxConnections,
      ...this.connectionStats,
    };
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique connection ID
   * @private
   */
  _generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear request queue and reset statistics
   */
  clear() {
    // Reject all queued requests
    for (const request of this.requestQueue) {
      request.reject(new Error('Connection pool cleared'));
    }

    this.requestQueue = [];
    this.connectionStats = {
      created: 0,
      destroyed: 0,
      queued: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Destroy connection pool
   */
  destroy() {
    this.clear();
    this.activeConnections.clear();
    this.removeAllListeners();
  }
} /**
 * Mem
ory manager for large file operations
 */
class MemoryManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.allocatedMemory = new Map();
    this.totalAllocated = 0;
    this.gcTimer = null;
    this.memoryStats = {
      allocations: 0,
      deallocations: 0,
      gcRuns: 0,
      peakMemory: 0,
    };

    this._startGarbageCollection();
  }

  /**
   * Allocate memory for operation
   * @param {string} operationId - Unique operation identifier
   * @param {number} size - Size in bytes
   * @param {any} data - Data to track
   * @returns {boolean} True if allocation successful
   */
  allocate(operationId, size, data = null) {
    // Check if allocation would exceed limits
    if (size > this.config.maxFileSize) {
      throw new Error(`File size ${size} exceeds maximum allowed size ${this.config.maxFileSize}`);
    }

    if (this.totalAllocated + size > this.config.maxTotalMemory) {
      // Try garbage collection first
      this._runGarbageCollection();

      // Check again after GC
      if (this.totalAllocated + size > this.config.maxTotalMemory) {
        throw new Error(
          `Memory allocation would exceed limit. Current: ${this.totalAllocated}, Requested: ${size}, Limit: ${this.config.maxTotalMemory}`
        );
      }
    }

    // Allocate memory
    this.allocatedMemory.set(operationId, {
      size,
      data,
      allocatedAt: Date.now(),
      lastAccessed: Date.now(),
    });

    this.totalAllocated += size;
    this.memoryStats.allocations++;

    if (this.totalAllocated > this.memoryStats.peakMemory) {
      this.memoryStats.peakMemory = this.totalAllocated;
    }

    return true;
  }

  /**
   * Deallocate memory for operation
   * @param {string} operationId - Operation identifier
   * @returns {boolean} True if deallocation successful
   */
  deallocate(operationId) {
    const allocation = this.allocatedMemory.get(operationId);

    if (!allocation) {
      return false;
    }

    this.totalAllocated -= allocation.size;
    this.allocatedMemory.delete(operationId);
    this.memoryStats.deallocations++;

    return true;
  }

  /**
   * Update last accessed time for operation
   * @param {string} operationId - Operation identifier
   */
  touch(operationId) {
    const allocation = this.allocatedMemory.get(operationId);
    if (allocation) {
      allocation.lastAccessed = Date.now();
    }
  }

  /**
   * Get memory allocation info
   * @param {string} operationId - Operation identifier
   * @returns {object|null} Allocation info or null if not found
   */
  getAllocation(operationId) {
    return this.allocatedMemory.get(operationId) || null;
  }

  /**
   * Check if memory usage is above threshold
   * @returns {boolean} True if above cleanup threshold
   */
  isAboveThreshold() {
    return this.totalAllocated > this.config.maxTotalMemory * this.config.cleanupThreshold;
  }

  /**
   * Get memory statistics
   * @returns {object} Memory statistics
   */
  getStatistics() {
    const now = Date.now();
    let oldestAllocation = now;
    let newestAllocation = 0;

    for (const allocation of this.allocatedMemory.values()) {
      if (allocation.allocatedAt < oldestAllocation) {
        oldestAllocation = allocation.allocatedAt;
      }
      if (allocation.allocatedAt > newestAllocation) {
        newestAllocation = allocation.allocatedAt;
      }
    }

    return {
      totalAllocated: this.totalAllocated,
      maxTotalMemory: this.config.maxTotalMemory,
      utilizationPercent: (this.totalAllocated / this.config.maxTotalMemory) * 100,
      activeAllocations: this.allocatedMemory.size,
      oldestAllocationAge: oldestAllocation < now ? now - oldestAllocation : 0,
      newestAllocationAge: newestAllocation > 0 ? now - newestAllocation : 0,
      ...this.memoryStats,
    };
  }

  /**
   * Start garbage collection timer
   * @private
   */
  _startGarbageCollection() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    this.gcTimer = setInterval(() => {
      if (this.isAboveThreshold()) {
        this._runGarbageCollection();
      }
    }, this.config.gcInterval);
  }

  /**
   * Run garbage collection
   * @private
   */
  _runGarbageCollection() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const toDelete = [];

    // Find old allocations
    for (const [operationId, allocation] of this.allocatedMemory.entries()) {
      const age = now - allocation.lastAccessed;
      if (age > maxAge) {
        toDelete.push(operationId);
      }
    }

    // Delete old allocations
    for (const operationId of toDelete) {
      this.deallocate(operationId);
    }

    this.memoryStats.gcRuns++;

    // Force Node.js garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Force cleanup of all allocations
   */
  cleanup() {
    this.allocatedMemory.clear();
    this.totalAllocated = 0;
    this.memoryStats.gcRuns++;
  }

  /**
   * Destroy memory manager
   */
  destroy() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    this.cleanup();
  }
}

/**
 * Health check manager
 */
class HealthCheckManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      ...config,
    };

    this.checks = new Map();
    this.results = new Map();
    this.checkTimer = null;
    this.isRunning = false;
  }

  /**
   * Register health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function that performs the check
   * @param {object} options - Check options
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      checkFn,
      timeout: options.timeout || this.config.timeout,
      critical: options.critical || false,
      description: options.description || name,
    });
  }

  /**
   * Start health checks
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._runChecks(); // Run immediately

    this.checkTimer = setInterval(() => {
      this._runChecks();
    }, this.config.checkInterval);
  }

  /**
   * Stop health checks
   */
  stop() {
    this.isRunning = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Run all health checks
   * @private
   */
  async _runChecks() {
    const checkPromises = [];

    for (const [name, check] of this.checks.entries()) {
      checkPromises.push(this._runSingleCheck(name, check));
    }

    await Promise.allSettled(checkPromises);

    // Emit health status event
    this.emit('healthCheck', this.getHealthStatus());
  }

  /**
   * Run single health check
   * @private
   */
  async _runSingleCheck(name, check) {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Health check '${name}' timed out after ${check.timeout}ms`));
        }, check.timeout);
      });

      // Run check with timeout
      const result = await Promise.race([check.checkFn(), timeoutPromise]);

      const duration = Date.now() - startTime;

      this.results.set(name, {
        status: 'healthy',
        message: result?.message || 'Check passed',
        duration,
        timestamp: new Date().toISOString(),
        critical: check.critical,
        description: check.description,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.set(name, {
        status: 'unhealthy',
        message: error.message,
        duration,
        timestamp: new Date().toISOString(),
        critical: check.critical,
        description: check.description,
        error: error.name,
      });

      // Emit error event for critical checks
      if (check.critical) {
        this.emit('criticalCheckFailed', {
          name,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get overall health status
   * @returns {object} Health status
   */
  getHealthStatus() {
    const status = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: this.results.size,
        healthy: 0,
        unhealthy: 0,
        critical: 0,
        criticalFailed: 0,
      },
    };

    for (const [name, result] of this.results.entries()) {
      status.checks[name] = result;

      if (result.status === 'healthy') {
        status.summary.healthy++;
      } else {
        status.summary.unhealthy++;

        if (result.critical) {
          status.summary.criticalFailed++;
          status.overall = 'unhealthy';
        }
      }

      if (result.critical) {
        status.summary.critical++;
      }
    }

    // Overall status is unhealthy if any critical check failed
    if (status.summary.criticalFailed > 0) {
      status.overall = 'unhealthy';
    } else if (status.summary.unhealthy > 0) {
      status.overall = 'degraded';
    }

    return status;
  }

  /**
   * Get health check result for specific check
   * @param {string} name - Check name
   * @returns {object|null} Check result or null if not found
   */
  getCheckResult(name) {
    return this.results.get(name) || null;
  }

  /**
   * Remove health check
   * @param {string} name - Check name
   * @returns {boolean} True if check was removed
   */
  removeCheck(name) {
    const removed = this.checks.delete(name);
    this.results.delete(name);
    return removed;
  }

  /**
   * Clear all health checks
   */
  clear() {
    this.checks.clear();
    this.results.clear();
  }

  /**
   * Destroy health check manager
   */
  destroy() {
    this.stop();
    this.clear();
    this.removeAllListeners();
  }
}

/**
 * Main resilience manager that coordinates all resilience features
 */
class ResilienceManager {
  constructor(config = {}) {
    this.config = config;
    this.retryManager = new RetryManager(config.retry);
    this.cacheManager = new CacheManager(config.cache);
    this.connectionPool = new ConnectionPoolManager(config.connectionPool);
    this.memoryManager = new MemoryManager(config.memory);
    this.healthCheck = new HealthCheckManager(config.healthCheck);

    this._setupDefaultHealthChecks();
  }

  /**
   * Execute operation with full resilience features
   * @param {Function} operation - Operation to execute
   * @param {object} options - Resilience options
   * @returns {Promise<any>} Operation result
   */
  async executeWithResilience(operation, options = {}) {
    const {
      useRetry = true,
      useConnectionPool = true,
      cacheKey = null,
      cacheTTL = null,
      memoryOperationId = null,
      memorySize = null,
    } = options;

    // Check cache first
    if (cacheKey) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Allocate memory if needed
    if (memoryOperationId && memorySize) {
      this.memoryManager.allocate(memoryOperationId, memorySize);
    }

    try {
      let result;

      if (useConnectionPool) {
        // Execute with connection pooling
        result = await this.connectionPool.executeRequest(async () => {
          if (useRetry) {
            return await this.retryManager.executeWithRetry(operation, options);
          } else {
            return await operation();
          }
        }, options);
      } else if (useRetry) {
        // Execute with retry only
        result = await this.retryManager.executeWithRetry(operation, options);
      } else {
        // Execute directly
        result = await operation();
      }

      // Cache result if requested
      if (cacheKey && result !== null && result !== undefined) {
        this.cacheManager.set(cacheKey, result, cacheTTL);
      }

      return result;
    } finally {
      // Deallocate memory if allocated
      if (memoryOperationId) {
        this.memoryManager.deallocate(memoryOperationId);
      }
    }
  }

  /**
   * Get comprehensive resilience statistics
   * @returns {object} All resilience statistics
   */
  getStatistics() {
    return {
      retry: this.retryManager.getRetryStatistics(),
      cache: this.cacheManager.getStatistics(),
      connectionPool: this.connectionPool.getStatistics(),
      memory: this.memoryManager.getStatistics(),
      health: this.healthCheck.getHealthStatus(),
    };
  }

  /**
   * Setup default health checks
   * @private
   */
  _setupDefaultHealthChecks() {
    // Memory usage check
    this.healthCheck.registerCheck(
      'memory',
      async () => {
        const stats = this.memoryManager.getStatistics();
        if (stats.utilizationPercent > 90) {
          throw new Error(`Memory usage too high: ${stats.utilizationPercent.toFixed(1)}%`);
        }
        return { message: `Memory usage: ${stats.utilizationPercent.toFixed(1)}%` };
      },
      { critical: true, description: 'Memory usage monitoring' }
    );

    // Connection pool check
    this.healthCheck.registerCheck(
      'connectionPool',
      async () => {
        const stats = this.connectionPool.getStatistics();
        if (stats.utilization > 0.9) {
          throw new Error(
            `Connection pool utilization too high: ${(stats.utilization * 100).toFixed(1)}%`
          );
        }
        return { message: `Pool utilization: ${(stats.utilization * 100).toFixed(1)}%` };
      },
      { critical: false, description: 'Connection pool monitoring' }
    );

    // Cache health check
    this.healthCheck.registerCheck(
      'cache',
      async () => {
        const stats = this.cacheManager.getStatistics();
        return {
          message: `Cache entries: ${stats.validEntries}, Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
        };
      },
      { critical: false, description: 'Cache performance monitoring' }
    );
  }

  /**
   * Start all resilience features
   */
  start() {
    this.healthCheck.start();
  }

  /**
   * Stop all resilience features
   */
  stop() {
    this.healthCheck.stop();
  }

  /**
   * Destroy all resilience components
   */
  destroy() {
    this.retryManager.clearStatistics();
    this.cacheManager.destroy();
    this.connectionPool.destroy();
    this.memoryManager.destroy();
    this.healthCheck.destroy();
  }
}

// Create default resilience manager instance
let defaultResilienceManager = null;

/**
 * Get default resilience manager instance
 * @param {object} config - Optional configuration
 * @returns {ResilienceManager} Default resilience manager
 */
function getResilienceManager(config = null) {
  if (!defaultResilienceManager) {
    const appConfig = getConfiguration();
    const resilienceConfig = {
      retry: {
        maxAttempts: appConfig.retryAttempts || 3,
        debugMode: appConfig.debugMode,
      },
      cache: {
        sessionTokenTTL: 30 * 60 * 1000, // 30 minutes
        metadataTTL: 5 * 60 * 1000, // 5 minutes
      },
      connectionPool: {
        maxConnections: 10,
        maxQueueSize: 100,
      },
      memory: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxTotalMemory: 500 * 1024 * 1024, // 500MB
      },
      healthCheck: {
        checkInterval: 30000, // 30 seconds
      },
      ...config,
    };

    defaultResilienceManager = new ResilienceManager(resilienceConfig);
  }

  return defaultResilienceManager;
}

export {
  ResilienceManager,
  RetryManager,
  CacheManager,
  ConnectionPoolManager,
  MemoryManager,
  HealthCheckManager,
  getResilienceManager,
};
