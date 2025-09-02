import fs from 'fs/promises';
import path from 'path';

/**
 * Test cleanup utilities for managing test artifacts and temporary files
 */
class TestCleanup {
  constructor() {
    this.tempFiles = new Set();
    this.tempDirectories = new Set();
    this.testResources = new Set();
    this.cleanupCallbacks = new Set();
  }

  /**
   * Register a temporary file for cleanup
   * @param {string} filePath - Path to temporary file
   */
  registerTempFile(filePath) {
    this.tempFiles.add(filePath);
  }

  /**
   * Register a temporary directory for cleanup
   * @param {string} dirPath - Path to temporary directory
   */
  registerTempDirectory(dirPath) {
    this.tempDirectories.add(dirPath);
  }

  /**
   * Register a test resource for cleanup
   * @param {string} resourceUri - URI of test resource
   */
  registerTestResource(resourceUri) {
    this.testResources.add(resourceUri);
  }

  /**
   * Register a cleanup callback function
   * @param {Function} callback - Cleanup function to call
   */
  registerCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Clean up all temporary files
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async cleanupTempFiles() {
    const results = [];

    for (const filePath of this.tempFiles) {
      try {
        await fs.unlink(filePath);
        results.push({ type: 'file', path: filePath, status: 'deleted' });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          results.push({ type: 'file', path: filePath, status: 'error', error: error.message });
        } else {
          results.push({ type: 'file', path: filePath, status: 'not_found' });
        }
      }
    }

    this.tempFiles.clear();
    return results;
  }

  /**
   * Clean up all temporary directories
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async cleanupTempDirectories() {
    const results = [];

    for (const dirPath of this.tempDirectories) {
      try {
        await this.removeDirectory(dirPath);
        results.push({ type: 'directory', path: dirPath, status: 'deleted' });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          results.push({ type: 'directory', path: dirPath, status: 'error', error: error.message });
        } else {
          results.push({ type: 'directory', path: dirPath, status: 'not_found' });
        }
      }
    }

    this.tempDirectories.clear();
    return results;
  }

  /**
   * Execute all registered cleanup callbacks
   * @returns {Promise} Promise that resolves when all callbacks are executed
   */
  async executeCleanupCallbacks() {
    const results = [];

    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
        results.push({ type: 'callback', status: 'executed' });
      } catch (error) {
        results.push({ type: 'callback', status: 'error', error: error.message });
      }
    }

    this.cleanupCallbacks.clear();
    return results;
  }

  /**
   * Clean up test resources from JasperReports Server
   * @param {Object} apiClient - API client instance
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async cleanupTestResources(apiClient) {
    const results = [];

    for (const resourceUri of this.testResources) {
      try {
        await apiClient.delete(`/rest_v2/resources${resourceUri}`);
        results.push({ type: 'resource', uri: resourceUri, status: 'deleted' });
      } catch (error) {
        if (error.response?.status === 404) {
          results.push({ type: 'resource', uri: resourceUri, status: 'not_found' });
        } else {
          results.push({
            type: 'resource',
            uri: resourceUri,
            status: 'error',
            error: error.message,
          });
        }
      }
    }

    this.testResources.clear();
    return results;
  }

  /**
   * Perform complete cleanup of all registered items
   * @param {Object} options - Cleanup options
   * @returns {Promise} Promise that resolves with cleanup results
   */
  async cleanupAll(options = {}) {
    const { apiClient, verbose = false } = options;
    const results = {
      files: [],
      directories: [],
      callbacks: [],
      resources: [],
      summary: {
        totalItems: 0,
        successfulCleanups: 0,
        errors: 0,
      },
    };

    try {
      // Clean up temporary files
      results.files = await this.cleanupTempFiles();

      // Clean up temporary directories
      results.directories = await this.cleanupTempDirectories();

      // Execute cleanup callbacks
      results.callbacks = await this.executeCleanupCallbacks();

      // Clean up test resources if API client is provided
      if (apiClient) {
        results.resources = await this.cleanupTestResources(apiClient);
      }

      // Calculate summary
      const allResults = [
        ...results.files,
        ...results.directories,
        ...results.callbacks,
        ...results.resources,
      ];

      results.summary.totalItems = allResults.length;
      results.summary.successfulCleanups = allResults.filter(
        r => r.status === 'deleted' || r.status === 'executed' || r.status === 'not_found'
      ).length;
      results.summary.errors = allResults.filter(r => r.status === 'error').length;

      if (verbose) {
        console.log('Cleanup Summary:');
        console.log(`  Total items: ${results.summary.totalItems}`);
        console.log(`  Successful cleanups: ${results.summary.successfulCleanups}`);
        console.log(`  Errors: ${results.summary.errors}`);

        if (results.summary.errors > 0) {
          console.log('Errors encountered:');
          allResults
            .filter(r => r.status === 'error')
            .forEach(r => {
              console.log(`  - ${r.type}: ${r.path || r.uri} - ${r.error}`);
            });
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }

    return results;
  }

  /**
   * Remove a directory and all its contents recursively
   * @param {string} dirPath - Path to directory
   * @returns {Promise} Promise that resolves when directory is removed
   */
  async removeDirectory(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        await fs.unlink(dirPath);
        return;
      }

      const entries = await fs.readdir(dirPath);

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        await this.removeDirectory(entryPath);
      }

      await fs.rmdir(dirPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Create a scoped cleanup instance for a specific test
   * @param {string} testName - Name of the test
   * @returns {TestCleanup} New cleanup instance
   */
  static createScopedCleanup(testName) {
    const cleanup = new TestCleanup();
    cleanup.testName = testName;
    cleanup.startTime = Date.now();
    return cleanup;
  }

  /**
   * Clean up test output directories
   * @param {string} testOutputDir - Test output directory path
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async cleanupTestOutputs(testOutputDir) {
    const results = [];

    try {
      const outputPath = path.resolve(testOutputDir);
      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        await this.removeDirectory(outputPath);
        results.push({ type: 'output_directory', path: outputPath, status: 'deleted' });
      } else {
        results.push({ type: 'output_directory', path: outputPath, status: 'not_found' });
      }
    } catch (error) {
      results.push({
        type: 'output_directory',
        path: testOutputDir,
        status: 'error',
        error: error.message,
      });
    }

    return results;
  }

  /**
   * Clean up test databases or data sources
   * @param {Array} dataSources - Array of data source configurations
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async cleanupTestDataSources(dataSources = []) {
    const results = [];

    for (const dataSource of dataSources) {
      try {
        if (dataSource.type === 'h2' && dataSource.cleanup) {
          // Clean up H2 database files
          const dbFiles = [
            `${dataSource.name}.mv.db`,
            `${dataSource.name}.trace.db`,
            `${dataSource.name}.lock.db`,
          ];

          for (const dbFile of dbFiles) {
            try {
              await fs.unlink(dbFile);
              results.push({ type: 'database_file', path: dbFile, status: 'deleted' });
            } catch (error) {
              if (error.code !== 'ENOENT') {
                results.push({
                  type: 'database_file',
                  path: dbFile,
                  status: 'error',
                  error: error.message,
                });
              }
            }
          }
        }

        results.push({ type: 'datasource', name: dataSource.name, status: 'processed' });
      } catch (error) {
        results.push({
          type: 'datasource',
          name: dataSource.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get cleanup statistics
   * @returns {Object} Cleanup statistics
   */
  getStatistics() {
    return {
      tempFiles: this.tempFiles.size,
      tempDirectories: this.tempDirectories.size,
      testResources: this.testResources.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
      totalItems:
        this.tempFiles.size +
        this.tempDirectories.size +
        this.testResources.size +
        this.cleanupCallbacks.size,
    };
  }

  /**
   * Reset all cleanup registrations
   */
  reset() {
    this.tempFiles.clear();
    this.tempDirectories.clear();
    this.testResources.clear();
    this.cleanupCallbacks.clear();
  }
}

/**
 * Global cleanup instance for test suites
 */
const globalCleanup = new TestCleanup();

/**
 * Setup cleanup hooks for Jest or other test frameworks
 */
function setupCleanupHooks() {
  // Jest hooks
  if (typeof afterEach !== 'undefined') {
    afterEach(async () => {
      await globalCleanup.cleanupTempFiles();
    });
  }

  if (typeof afterAll !== 'undefined') {
    afterAll(async () => {
      await globalCleanup.cleanupAll({ verbose: true });
    });
  }

  // Process exit hooks
  process.on('exit', () => {
    // Synchronous cleanup only
    console.log('Performing synchronous cleanup on exit...');
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, cleaning up...');
    try {
      await globalCleanup.cleanupAll({ verbose: true });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, cleaning up...');
    try {
      await globalCleanup.cleanupAll({ verbose: true });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    process.exit(0);
  });
}

export { TestCleanup, globalCleanup, setupCleanupHooks };
