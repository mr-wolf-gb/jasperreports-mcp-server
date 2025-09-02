/**
 * Test setup and initialization utilities
 * This file sets up the test environment and provides common setup functions
 */

import { globalCleanup } from './testCleanup.js';
import MockJasperServer from './mockJasperServer.js';
import TestHelpers from './testHelpers.js';
import TestDataGenerator from './testDataGenerator.js';

/**
 * Global test setup configuration
 */
const testConfig = {
  mockServer: null,
  testHelpers: null,
  dataGenerator: null,
  initialized: false,
};

/**
 * Initialize the test environment
 * @param {Object} options - Initialization options
 * @returns {Promise} Promise that resolves when initialization is complete
 */
async function initializeTestEnvironment(options = {}) {
  if (testConfig.initialized) {
    return testConfig;
  }

  const {
    useMockServer = false, // Default to false to avoid conflicts
    mockServerPort = 8081 + Math.floor(Math.random() * 1000), // Use random port to avoid conflicts
    setupCleanup = true,
    verbose = false,
  } = options;

  try {
    // Initialize test helpers
    testConfig.testHelpers = new TestHelpers();
    testConfig.dataGenerator = new TestDataGenerator();

    // Note: Cleanup hooks should be set up at the test suite level, not here
    if (setupCleanup && verbose) {
      console.log('✓ Cleanup configuration ready');
    }

    // Start mock server if requested
    if (useMockServer) {
      testConfig.mockServer = new MockJasperServer(mockServerPort);
      await testConfig.mockServer.start();
      if (verbose) {
        console.log(`✓ Mock JasperReports Server started on port ${mockServerPort}`);
      }
    }

    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JASPER_URL = useMockServer
      ? `http://localhost:${mockServerPort}/jasperserver`
      : 'http://localhost:8080/jasperserver';
    process.env.JASPER_AUTH_TYPE = 'basic';
    process.env.JASPER_USERNAME = 'jasperadmin';
    process.env.JASPER_PASSWORD = 'jasperadmin';
    process.env.JASPER_TIMEOUT = '30000';
    process.env.JASPER_DEBUG_MODE = 'true';
    process.env.JASPER_SSL_VERIFY = 'false';

    testConfig.initialized = true;

    if (verbose) {
      console.log('✓ Test environment initialized successfully');
      console.log(`  - Mock Server: ${useMockServer ? 'Enabled' : 'Disabled'}`);
      console.log(`  - Cleanup Hooks: ${setupCleanup ? 'Enabled' : 'Disabled'}`);
      console.log(`  - JasperReports URL: ${process.env.JASPER_URL}`);
    }

    return testConfig;
  } catch (error) {
    console.error('Failed to initialize test environment:', error);
    throw error;
  }
}

/**
 * Cleanup the test environment
 * @param {Object} options - Cleanup options
 * @returns {Promise} Promise that resolves when cleanup is complete
 */
async function cleanupTestEnvironment(options = {}) {
  const { verbose = false } = options;

  try {
    // Stop mock server
    if (testConfig.mockServer) {
      await testConfig.mockServer.stop();
      testConfig.mockServer = null;
      if (verbose) {
        console.log('✓ Mock server stopped');
      }
    }

    // Perform global cleanup
    await globalCleanup.cleanupAll({ verbose });

    // Reset test helpers
    if (testConfig.testHelpers) {
      await testConfig.testHelpers.cleanup();
    }

    // Reset configuration
    testConfig.initialized = false;
    testConfig.testHelpers = null;
    testConfig.dataGenerator = null;

    if (verbose) {
      console.log('✓ Test environment cleaned up');
    }
  } catch (error) {
    console.error('Error during test environment cleanup:', error);
    throw error;
  }
}

/**
 * Get the current test configuration
 * @returns {Object} Current test configuration
 */
function getTestConfig() {
  return { ...testConfig };
}

/**
 * Reset the mock server data
 */
function resetMockServer() {
  if (testConfig.mockServer) {
    testConfig.mockServer.reset();
  }
}

/**
 * Create a test suite setup function
 * @param {Object} suiteOptions - Suite-specific options
 * @returns {Function} Setup function for the test suite
 */
function createSuiteSetup(suiteOptions = {}) {
  return async function setupSuite() {
    const options = {
      useMockServer: true,
      setupCleanup: true,
      verbose: false,
      ...suiteOptions,
    };

    await initializeTestEnvironment(options);

    // Suite-specific setup
    if (suiteOptions.beforeSetup) {
      await suiteOptions.beforeSetup(testConfig);
    }

    return testConfig;
  };
}

/**
 * Create a test suite teardown function
 * @param {Object} suiteOptions - Suite-specific options
 * @returns {Function} Teardown function for the test suite
 */
function createSuiteTeardown(suiteOptions = {}) {
  return async function teardownSuite() {
    // Suite-specific teardown
    if (suiteOptions.beforeTeardown) {
      await suiteOptions.beforeTeardown(testConfig);
    }

    await cleanupTestEnvironment(suiteOptions);
  };
}

/**
 * Create a test case setup function
 * @param {Object} testOptions - Test-specific options
 * @returns {Function} Setup function for individual tests
 */
function createTestSetup(testOptions = {}) {
  return function setupTest() {
    const { resetMockData = true, generateTestData = false, testDataSize = 'small' } = testOptions;

    // Reset mock server data if requested
    if (resetMockData && testConfig.mockServer) {
      testConfig.mockServer.reset();
    }

    // Generate test data if requested
    if (generateTestData && testConfig.dataGenerator) {
      const testData = testConfig.dataGenerator.generatePerformanceTestData(testDataSize);
      return testData;
    }

    return null;
  };
}

/**
 * Validate test environment requirements
 * @param {Array} requirements - Array of requirement strings
 * @throws {Error} If requirements are not met
 */
function validateTestRequirements(requirements = []) {
  const availableRequirements = {
    'mock-server': () => testConfig.mockServer !== null,
    'test-helpers': () => testConfig.testHelpers !== null,
    'data-generator': () => testConfig.dataGenerator !== null,
    'cleanup-hooks': () => globalCleanup !== null,
    'environment-vars': () => process.env.JASPER_URL !== undefined,
  };

  for (const requirement of requirements) {
    const validator = availableRequirements[requirement];
    if (!validator || !validator()) {
      throw new Error(`Test requirement not met: ${requirement}`);
    }
  }
}

/**
 * Wait for mock server to be ready
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves when server is ready
 */
async function waitForMockServer(timeout = 5000) {
  if (!testConfig.mockServer) {
    throw new Error('Mock server is not initialized');
  }

  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < timeout) {
    try {
      // Try to make a request to the server info endpoint
      const response = await fetch(`${testConfig.mockServer.getUrl()}/rest_v2/serverInfo`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Mock server did not become ready within ${timeout}ms`);
}

// Export all setup utilities
export {
  initializeTestEnvironment,
  cleanupTestEnvironment,
  getTestConfig,
  resetMockServer,
  createSuiteSetup,
  createSuiteTeardown,
  createTestSetup,
  validateTestRequirements,
  waitForMockServer,

  // Re-export utilities for convenience
  TestHelpers,
  MockJasperServer,
  TestDataGenerator,
  globalCleanup,
};
