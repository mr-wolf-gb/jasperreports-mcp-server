/**
 * Unit tests for resilience utilities
 */

import { jest } from '@jest/globals';
import {
  RetryManager,
  CacheManager,
  ConnectionPoolManager,
  MemoryManager,
  HealthCheckManager,
  ResilienceManager,
} from '../../../src/utils/resilience.js';

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false,
    });
  });

  afterEach(() => {
    retryManager.clearStatistics();
  });

  test('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retryManager.executeWithRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should retry on retryable errors', async () => {
    // Create retryable error
    const error = new Error('Connection failed');
    error.code = 'ECONNRESET';

    const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    const result = await retryManager.executeWithRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('should not retry on non-retryable errors', async () => {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    const operation = jest.fn().mockRejectedValue(error);

    await expect(retryManager.executeWithRetry(operation)).rejects.toThrow('Validation failed');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should respect max attempts', async () => {
    const error = new Error('Connection failed');
    error.code = 'ECONNRESET';
    const operation = jest.fn().mockRejectedValue(error);

    await expect(retryManager.executeWithRetry(operation)).rejects.toThrow('Connection failed');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('should calculate exponential backoff delay', () => {
    const config = {
      baseDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000,
      jitter: false,
    };

    const delay1 = retryManager._calculateDelay(1, config);
    const delay2 = retryManager._calculateDelay(2, config);
    const delay3 = retryManager._calculateDelay(3, config);

    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay3).toBe(4000);
  });

  test('should track retry statistics', async () => {
    const error = new Error('Connection failed');
    error.code = 'ECONNRESET';
    const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    await retryManager.executeWithRetry(operation, { operationId: 'test-op' });

    const stats = retryManager.getRetryStatistics();
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.totalAttempts).toBe(2);
  });
});

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      sessionTokenTTL: 1000,
      metadataTTL: 500,
      maxCacheSize: 10,
      cleanupInterval: 100,
    });
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  test('should store and retrieve values', () => {
    cacheManager.set('key1', 'value1');

    expect(cacheManager.get('key1')).toBe('value1');
    expect(cacheManager.has('key1')).toBe(true);
  });

  test('should respect TTL', async () => {
    cacheManager.set('key1', 'value1', 100);

    expect(cacheManager.get('key1')).toBe('value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.has('key1')).toBe(false);
  });

  test('should handle session tokens', () => {
    cacheManager.setSessionToken('session1', 'token123');

    expect(cacheManager.getSessionToken('session1')).toBe('token123');
  });

  test('should handle metadata', () => {
    const metadata = { type: 'report', name: 'test' };
    cacheManager.setMetadata('report1', metadata);

    expect(cacheManager.getMetadata('report1')).toEqual(metadata);
  });

  test('should cleanup expired entries', async () => {
    cacheManager.set('key1', 'value1', 50);
    cacheManager.set('key2', 'value2', 200);

    expect(cacheManager.get('key1')).toBe('value1');
    expect(cacheManager.get('key2')).toBe('value2');

    // Wait for first key to expire
    await new Promise(resolve => setTimeout(resolve, 100));

    // Trigger cleanup
    cacheManager._cleanup();

    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBe('value2');
  });

  test('should provide statistics', () => {
    cacheManager.set('key1', 'value1');
    cacheManager.set('key2', 'value2');
    cacheManager.get('key1'); // Access to update stats

    const stats = cacheManager.getStatistics();
    expect(stats.totalEntries).toBe(2);
    expect(stats.validEntries).toBe(2);
  });
});

describe('ConnectionPoolManager', () => {
  let poolManager;

  beforeEach(() => {
    poolManager = new ConnectionPoolManager({
      maxConnections: 2,
      maxQueueSize: 5,
      connectionTimeout: 1000,
    });
  });

  afterEach(() => {
    poolManager.destroy();
  });

  test('should execute requests within connection limit', async () => {
    const requestFn = jest.fn().mockResolvedValue('result');

    const result = await poolManager.executeRequest(requestFn);

    expect(result).toBe('result');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  test('should queue requests when at connection limit', async () => {
    const slowRequest = () => new Promise(resolve => setTimeout(() => resolve('slow'), 200));
    const fastRequest = jest.fn().mockResolvedValue('fast');

    // Start two slow requests to fill the pool
    const promise1 = poolManager.executeRequest(slowRequest);
    const promise2 = poolManager.executeRequest(slowRequest);

    // This should be queued
    const promise3 = poolManager.executeRequest(fastRequest);

    const results = await Promise.all([promise1, promise2, promise3]);

    expect(results).toEqual(['slow', 'slow', 'fast']);
  });

  test('should handle request timeouts', async () => {
    const timeoutRequest = () => new Promise(resolve => setTimeout(resolve, 2000));

    await expect(poolManager.executeRequest(timeoutRequest, { timeout: 100 })).rejects.toThrow(
      'Request timeout'
    );
  });

  test('should provide statistics', async () => {
    const requestFn = jest.fn().mockResolvedValue('result');

    await poolManager.executeRequest(requestFn);

    const stats = poolManager.getStatistics();
    expect(stats.completed).toBe(1);
    expect(stats.created).toBe(1);
    expect(stats.destroyed).toBe(1);
  });
});

describe('MemoryManager', () => {
  let memoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager({
      maxFileSize: 4000,
      maxTotalMemory: 5000,
      cleanupThreshold: 0.8,
      gcInterval: 100,
    });
  });

  afterEach(() => {
    memoryManager.destroy();
  });

  test('should allocate and deallocate memory', () => {
    const success = memoryManager.allocate('op1', 500, 'test data');

    expect(success).toBe(true);
    expect(memoryManager.totalAllocated).toBe(500);

    const deallocated = memoryManager.deallocate('op1');

    expect(deallocated).toBe(true);
    expect(memoryManager.totalAllocated).toBe(0);
  });

  test('should reject allocations exceeding file size limit', () => {
    expect(() => {
      memoryManager.allocate('op1', 5000);
    }).toThrow('File size 5000 exceeds maximum allowed size 4000');
  });

  test('should reject allocations exceeding total memory limit', () => {
    memoryManager.allocate('op1', 3000);

    expect(() => {
      memoryManager.allocate('op2', 3000);
    }).toThrow('Memory allocation would exceed limit');
  });

  test('should track allocation info', () => {
    memoryManager.allocate('op1', 500, 'test data');

    const allocation = memoryManager.getAllocation('op1');
    expect(allocation).toBeTruthy();
    expect(allocation.size).toBe(500);
    expect(allocation.data).toBe('test data');
  });

  test('should provide statistics', () => {
    memoryManager.allocate('op1', 500);
    memoryManager.allocate('op2', 300);

    const stats = memoryManager.getStatistics();
    expect(stats.totalAllocated).toBe(800);
    expect(stats.activeAllocations).toBe(2);
    expect(stats.utilizationPercent).toBe(16); // 800/5000 * 100
  });
});

describe('HealthCheckManager', () => {
  let healthManager;

  beforeEach(() => {
    healthManager = new HealthCheckManager({
      checkInterval: 100,
      timeout: 500,
    });
  });

  afterEach(() => {
    healthManager.destroy();
  });

  test('should register and run health checks', async () => {
    const checkFn = jest.fn().mockResolvedValue({ message: 'OK' });

    healthManager.registerCheck('test-check', checkFn);

    await healthManager._runSingleCheck('test-check', {
      checkFn,
      timeout: 1000,
      critical: false,
      description: 'Test check',
    });

    const result = healthManager.getCheckResult('test-check');
    expect(result.status).toBe('healthy');
    expect(result.message).toBe('OK');
  });

  test('should handle failing health checks', async () => {
    const checkFn = jest.fn().mockRejectedValue(new Error('Check failed'));

    await healthManager._runSingleCheck('test-check', {
      checkFn,
      timeout: 1000,
      critical: false,
      description: 'Test check',
    });

    const result = healthManager.getCheckResult('test-check');
    expect(result.status).toBe('unhealthy');
    expect(result.message).toBe('Check failed');
  });

  test('should handle check timeouts', async () => {
    const checkFn = () => new Promise(resolve => setTimeout(resolve, 1000));

    await healthManager._runSingleCheck('test-check', {
      checkFn,
      timeout: 100,
      critical: false,
      description: 'Test check',
    });

    const result = healthManager.getCheckResult('test-check');
    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('timed out');
  });

  test('should provide overall health status', () => {
    healthManager.results.set('check1', {
      status: 'healthy',
      message: 'OK',
      critical: false,
    });

    healthManager.results.set('check2', {
      status: 'unhealthy',
      message: 'Failed',
      critical: true,
    });

    const status = healthManager.getHealthStatus();
    expect(status.overall).toBe('unhealthy');
    expect(status.summary.healthy).toBe(1);
    expect(status.summary.unhealthy).toBe(1);
    expect(status.summary.criticalFailed).toBe(1);
  });
});

describe('ResilienceManager', () => {
  let resilienceManager;

  beforeEach(() => {
    resilienceManager = new ResilienceManager({
      retry: { maxAttempts: 2, baseDelay: 10 },
      cache: { sessionTokenTTL: 1000, metadataTTL: 500 },
      connectionPool: { maxConnections: 2 },
      memory: { maxFileSize: 1000, maxTotalMemory: 5000 },
    });
  });

  afterEach(() => {
    resilienceManager.destroy();
  });

  test('should execute operation with full resilience', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await resilienceManager.executeWithResilience(operation, {
      cacheKey: 'test-key',
      memoryOperationId: 'test-op',
      memorySize: 100,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should use cached results', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    // First call should execute operation and cache result
    await resilienceManager.executeWithResilience(operation, {
      cacheKey: 'test-key',
    });

    // Second call should use cached result
    const result = await resilienceManager.executeWithResilience(operation, {
      cacheKey: 'test-key',
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1); // Only called once
  });

  test('should provide comprehensive statistics', () => {
    const stats = resilienceManager.getStatistics();

    expect(stats).toHaveProperty('retry');
    expect(stats).toHaveProperty('cache');
    expect(stats).toHaveProperty('connectionPool');
    expect(stats).toHaveProperty('memory');
    expect(stats).toHaveProperty('health');
  });
});
