/**
 * Unit tests for configuration management system
 */

import {
  getConfiguration,
  validateConfiguration,
  clearConfigurationCache,
  getConfigurationSchema,
  generateExampleConfig,
  ConfigurationError,
} from '../../src/config/environment.js';

describe('Configuration Management System', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear configuration cache before each test
    clearConfigurationCache();

    // Reset environment variables to original state
    process.env = { ...originalEnv };

    // Ensure required test environment variables are set
    process.env.NODE_ENV = 'test';
    process.env.JASPER_URL = process.env.JASPER_URL || 'http://localhost:8080/jasperserver';
    process.env.JASPER_USERNAME = process.env.JASPER_USERNAME || 'jasperadmin';
    process.env.JASPER_PASSWORD = process.env.JASPER_PASSWORD || 'jasperadmin';
    process.env.JASPER_AUTH_TYPE = process.env.JASPER_AUTH_TYPE || 'basic';
    process.env.JASPER_SSL_VERIFY = process.env.JASPER_SSL_VERIFY || 'false';
    process.env.JASPER_DEBUG_MODE = process.env.JASPER_DEBUG_MODE || 'false';
    process.env.JASPER_TIMEOUT = process.env.JASPER_TIMEOUT || '30000';
  });

  afterEach(() => {
    // Clear configuration cache after each test
    clearConfigurationCache();
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
    // Clear configuration cache one final time
    clearConfigurationCache();
  });

  describe('getConfiguration', () => {
    test('should load configuration with required environment variables', () => {
      // Set required environment variables
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const config = getConfiguration();

      expect(config.jasperUrl).toBe('http://localhost:8080/jasperserver');
      expect(config.username).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.authType).toBe('basic'); // default
      expect(config.timeout).toBe(30000); // default
      expect(config.sslVerify).toBe(false); // default in test environment
    });

    test('should apply default values for optional settings', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const config = getConfiguration();

      expect(config.authType).toBe('basic');
      expect(config.timeout).toBe(30000);
      expect(config.sslVerify).toBe(false);
      expect(config.debugMode).toBe(false);
      expect(config.logLevel).toBe('info');
      expect(config.retryAttempts).toBe(3);
      expect(config.testServerPort).toBe(3000);
      expect(config.testServerEnabled).toBe(false);
      expect(config.organization).toBe(null);
    });

    test('should throw ConfigurationError for missing required variables', () => {
      // Clear required environment variables
      delete process.env.JASPER_URL;
      delete process.env.JASPER_USERNAME;
      delete process.env.JASPER_PASSWORD;

      // Clear cache to force reload
      clearConfigurationCache();

      expect(() => getConfiguration()).toThrow(ConfigurationError);
    });

    test('should validate JASPER_URL format', () => {
      process.env.JASPER_URL = 'invalid-url';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      expect(() => getConfiguration()).toThrow(ConfigurationError);
    });

    test('should validate JASPER_AUTH_TYPE values', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';
      process.env.JASPER_AUTH_TYPE = 'invalid';

      expect(() => getConfiguration()).toThrow(ConfigurationError);
    });

    test('should transform boolean values correctly', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';
      process.env.JASPER_SSL_VERIFY = 'false';
      process.env.JASPER_DEBUG_MODE = '1';
      process.env.TEST_SERVER_ENABLED = 'true';

      const config = getConfiguration();

      expect(config.sslVerify).toBe(false);
      expect(config.debugMode).toBe(true);
      expect(config.testServerEnabled).toBe(true);
    });

    test('should transform numeric values correctly', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';
      process.env.JASPER_TIMEOUT = '60000';
      process.env.JASPER_RETRY_ATTEMPTS = '5';
      process.env.TEST_SERVER_PORT = '4000';

      const config = getConfiguration();

      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.testServerPort).toBe(4000);
    });

    test('should cache configuration on subsequent calls', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const config1 = getConfiguration();
      const config2 = getConfiguration();

      expect(config1).toBe(config2); // Same object reference (cached)
    });

    test('should reload configuration when forceReload is true', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      getConfiguration();

      // Change environment variable
      process.env.JASPER_USERNAME = 'newuser';

      const config2 = getConfiguration(); // Should use cached version
      expect(config2.username).toBe('testuser');

      const config3 = getConfiguration(true); // Force reload
      expect(config3.username).toBe('newuser');
    });
  });

  describe('validateConfiguration', () => {
    test('should return valid result for correct configuration', () => {
      process.env.JASPER_URL = 'http://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const result = validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
    });

    test('should return invalid result for missing required variables', () => {
      // Clear required environment variables
      delete process.env.JASPER_URL;
      delete process.env.JASPER_USERNAME;
      delete process.env.JASPER_PASSWORD;

      // Clear cache to force reload
      clearConfigurationCache();

      const result = validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.config).toBe(null);
    });

    test('should validate URL protocol', () => {
      process.env.JASPER_URL = 'ftp://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const result = validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.field === 'JASPER_URL')).toBe(true);
    });
  });

  describe('getConfigurationSchema', () => {
    test('should return configuration schema', () => {
      const schema = getConfigurationSchema();

      expect(schema).toBeDefined();
      expect(schema.jasperUrl).toBeDefined();
      expect(schema.username).toBeDefined();
      expect(schema.password).toBeDefined();
      expect(schema.jasperUrl.envVar).toBe('JASPER_URL');
      expect(schema.jasperUrl.required).toBe(true);
    });
  });

  describe('generateExampleConfig', () => {
    test('should generate development configuration example', () => {
      const example = generateExampleConfig('development');

      expect(example).toContain('JASPER_URL=http://localhost:8080/jasperserver');
      expect(example).toContain('JASPER_DEBUG_MODE=true');
      expect(example).toContain('TEST_SERVER_ENABLED=true');
    });

    test('should generate production configuration example', () => {
      const example = generateExampleConfig('production');

      expect(example).toContain('JASPER_URL=https://reports.company.com/jasperserver');
      expect(example).toContain('JASPER_SSL_VERIFY=true');
      expect(example).not.toContain('TEST_SERVER_ENABLED=true');
    });

    test('should default to development configuration', () => {
      const example1 = generateExampleConfig();
      const example2 = generateExampleConfig('development');

      expect(example1).toBe(example2);
    });
  });

  describe('ConfigurationError', () => {
    test('should create error with message and field', () => {
      const error = new ConfigurationError('Test error', 'JASPER_URL');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('JASPER_URL');
      expect(error.name).toBe('ConfigurationError');
      expect(error instanceof Error).toBe(true);
    });
  });
});
