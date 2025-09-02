/**
 * Health Check Service for JasperReports MCP Server
 *
 * This service provides comprehensive health monitoring capabilities including:
 * - JasperReports Server connectivity checks
 * - Authentication status monitoring
 * - Resource availability checks
 * - Performance metrics monitoring
 * - System resource usage monitoring
 */

import { getConfiguration } from '../config/environment.js';
import { getErrorHandler } from '../utils/errorHandler.js';
import { getResilienceManager } from '../utils/resilience.js';
import APIClient from '../utils/apiClient.js';

/**
 * Health Check Service class
 */
class HealthService {
  constructor(config = null) {
    this.config = config || getConfiguration();
    this.errorHandler = getErrorHandler();
    this.resilienceManager = getResilienceManager();
    this.apiClient = new APIClient(this.config);
    this.healthCheckManager = this.resilienceManager.healthCheck;

    this._setupHealthChecks();
  }

  /**
   * Initialize health service and start monitoring
   */
  async initialize() {
    try {
      // Start resilience features
      this.resilienceManager.start();

      // Start API client resilience
      this.apiClient.startResilience();

      if (this.config.debugMode) {
        console.log('[Health Service] Health monitoring initialized');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.initialize');
      throw this.errorHandler.mapToMCPError(error, 'Failed to initialize health service');
    }
  }

  /**
   * Get comprehensive health status
   * @returns {Promise<object>} Complete health status
   */
  async getHealthStatus() {
    try {
      const healthStatus = this.healthCheckManager.getHealthStatus();
      const resilienceStats = this.resilienceManager.getStatistics();

      return {
        ...healthStatus,
        resilience: resilienceStats,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform,
        },
      };
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.getHealthStatus');
      throw this.errorHandler.mapToMCPError(error, 'Failed to get health status');
    }
  }

  /**
   * Perform deep health check of all systems
   * @returns {Promise<object>} Deep health check results
   */
  async performDeepHealthCheck() {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        checks: {},
        overall: 'healthy',
      };

      // JasperReports Server connectivity
      try {
        const serverInfo = await this.apiClient.getServerInfo();
        results.checks.jasperServerConnectivity = {
          status: 'healthy',
          message: `Connected to JasperReports Server ${serverInfo.version}`,
          details: serverInfo,
        };
      } catch (error) {
        results.checks.jasperServerConnectivity = {
          status: 'unhealthy',
          message: `Cannot connect to JasperReports Server: ${error.message}`,
          error: error.type || error.name,
        };
        results.overall = 'unhealthy';
      }

      // Authentication status
      try {
        await this.apiClient.authenticate();
        const authStatus = this.apiClient.getAuthenticationStatus();
        results.checks.authentication = {
          status: authStatus.isAuthenticated ? 'healthy' : 'unhealthy',
          message: `Authentication ${authStatus.isAuthenticated ? 'successful' : 'failed'} (${authStatus.authType})`,
          details: authStatus,
        };

        if (!authStatus.isAuthenticated) {
          results.overall = 'unhealthy';
        }
      } catch (error) {
        results.checks.authentication = {
          status: 'unhealthy',
          message: `Authentication failed: ${error.message}`,
          error: error.type || error.name,
        };
        results.overall = 'unhealthy';
      }

      // Resource availability (test basic repository access)
      try {
        const response = await this.apiClient.get('/rest_v2/resources', {
          params: { limit: 1 },
          useCache: false,
        });

        results.checks.resourceAccess = {
          status: response.status === 200 ? 'healthy' : 'degraded',
          message: `Repository access ${response.status === 200 ? 'successful' : 'limited'}`,
          details: { statusCode: response.status },
        };
      } catch (error) {
        results.checks.resourceAccess = {
          status: 'unhealthy',
          message: `Repository access failed: ${error.message}`,
          error: error.type || error.name,
        };
        if (results.overall === 'healthy') {
          results.overall = 'degraded';
        }
      }

      // System resources
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      results.checks.systemResources = {
        status:
          heapUsagePercent > 90 ? 'unhealthy' : heapUsagePercent > 75 ? 'degraded' : 'healthy',
        message: `Memory usage: ${heapUsagePercent.toFixed(1)}% (${memoryUsageMB.heapUsed}MB/${memoryUsageMB.heapTotal}MB)`,
        details: {
          memory: memoryUsageMB,
          uptime: process.uptime(),
          loadAverage: process.platform !== 'win32' ? process.loadavg() : null,
        },
      };

      if (heapUsagePercent > 90 && results.overall === 'healthy') {
        results.overall = 'degraded';
      }

      // Resilience components
      const resilienceStats = this.resilienceManager.getStatistics();
      results.checks.resilience = {
        status: 'healthy',
        message: 'Resilience components operational',
        details: resilienceStats,
      };

      return results;
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.performDeepHealthCheck');
      throw this.errorHandler.mapToMCPError(error, 'Failed to perform deep health check');
    }
  }

  /**
   * Get performance metrics
   * @returns {Promise<object>} Performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const resilienceStats = this.resilienceManager.getStatistics();
      const memoryUsage = process.memoryUsage();

      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          heapUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        resilience: {
          retry: resilienceStats.retry,
          cache: resilienceStats.cache,
          connectionPool: resilienceStats.connectionPool,
          memoryManager: resilienceStats.memory,
        },
        process: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
        },
      };
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.getPerformanceMetrics');
      throw this.errorHandler.mapToMCPError(error, 'Failed to get performance metrics');
    }
  }

  /**
   * Test specific component health
   * @param {string} component - Component to test
   * @returns {Promise<object>} Component health status
   */
  async testComponentHealth(component) {
    try {
      const result = this.healthCheckManager.getCheckResult(component);

      if (!result) {
        throw this.errorHandler.createValidationError(
          'component',
          `Unknown health check component: ${component}`
        );
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.testComponentHealth');
      throw this.errorHandler.mapToMCPError(error, `Failed to test component health: ${component}`);
    }
  }

  /**
   * Setup default health checks
   * @private
   */
  _setupHealthChecks() {
    // JasperReports Server connectivity check
    this.healthCheckManager.registerCheck(
      'jasperServerConnectivity',
      async () => {
        const connected = await this.apiClient.testConnection();
        if (!connected) {
          throw new Error('Cannot connect to JasperReports Server');
        }
        return { message: 'JasperReports Server is reachable' };
      },
      {
        critical: true,
        description: 'JasperReports Server connectivity check',
        timeout: 15000,
      }
    );

    // Authentication check
    this.healthCheckManager.registerCheck(
      'authentication',
      async () => {
        const authStatus = this.apiClient.getAuthenticationStatus();
        if (!authStatus.isAuthenticated || !authStatus.sessionValid) {
          // Try to re-authenticate
          await this.apiClient.authenticate();
        }
        return { message: `Authentication successful (${authStatus.authType})` };
      },
      {
        critical: true,
        description: 'Authentication status check',
        timeout: 10000,
      }
    );

    // Repository access check
    this.healthCheckManager.registerCheck(
      'repositoryAccess',
      async () => {
        const response = await this.apiClient.get('/rest_v2/resources', {
          params: { limit: 1 },
          useCache: false,
          useRetry: false,
        });

        if (response.status !== 200) {
          throw new Error(`Repository access returned status ${response.status}`);
        }

        return { message: 'Repository access successful' };
      },
      {
        critical: false,
        description: 'Repository access check',
        timeout: 10000,
      }
    );

    // System performance check
    this.healthCheckManager.registerCheck(
      'systemPerformance',
      async () => {
        const memoryUsage = process.memoryUsage();
        const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

        if (heapUsagePercent > 95) {
          throw new Error(`Critical memory usage: ${heapUsagePercent.toFixed(1)}%`);
        }

        if (heapUsagePercent > 85) {
          throw new Error(`High memory usage: ${heapUsagePercent.toFixed(1)}%`);
        }

        return { message: `Memory usage: ${heapUsagePercent.toFixed(1)}%` };
      },
      {
        critical: false,
        description: 'System performance monitoring',
        timeout: 5000,
      }
    );
  }

  /**
   * Stop health monitoring
   */
  stop() {
    try {
      this.resilienceManager.stop();
      this.apiClient.stopResilience();

      if (this.config.debugMode) {
        console.log('[Health Service] Health monitoring stopped');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.stop');
    }
  }

  /**
   * Destroy health service and cleanup resources
   */
  destroy() {
    try {
      this.stop();
      this.resilienceManager.destroy();

      if (this.config.debugMode) {
        console.log('[Health Service] Health service destroyed');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'HealthService.destroy');
    }
  }
}

// Create default health service instance
let defaultHealthService = null;

/**
 * Get default health service instance
 * @param {object} config - Optional configuration
 * @returns {HealthService} Default health service
 */
function getHealthService(config = null) {
  if (!defaultHealthService) {
    defaultHealthService = new HealthService(config);
  }
  return defaultHealthService;
}

export default HealthService;
export { getHealthService };
