/**
 * Simple unit tests for ConfigValidator
 */

import { ConfigValidator } from '../../../src/utils/ConfigValidator.js';

describe('ConfigValidator Simple Tests', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironmentVariables', () => {
    test('should pass with all required environment variables', () => {
      // Set required environment variables
      process.env.JASPER_URL = 'https://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const result = ConfigValidator.validateEnvironmentVariables();

      expect(result.errors).toHaveLength(0);
    });

    test('should fail with missing required environment variables', () => {
      // Clear required environment variables
      delete process.env.JASPER_URL;
      delete process.env.JASPER_USERNAME;
      delete process.env.JASPER_PASSWORD;

      const result = ConfigValidator.validateEnvironmentVariables();

      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('JASPER_URL');
      expect(errorFields).toContain('JASPER_USERNAME');
      expect(errorFields).toContain('JASPER_PASSWORD');
    });

    test('should provide recommendations for optional variables', () => {
      // Set required variables but not optional ones
      process.env.JASPER_URL = 'https://localhost:8080/jasperserver';
      process.env.JASPER_USERNAME = 'testuser';
      process.env.JASPER_PASSWORD = 'testpass';

      const result = ConfigValidator.validateEnvironmentVariables();

      expect(result.errors).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('validateSecuritySettings', () => {
    test('should pass with secure configuration', () => {
      const config = {
        jasperUrl: 'https://localhost:8080/jasperserver',
        sslVerify: true,
        username: 'secureuser',
        password: 'securepassword123',
      };

      const result = ConfigValidator.validateSecuritySettings(config);

      expect(result.warnings).toHaveLength(0);
      expect(result.securityLevel).toBe(ConfigValidator.SSL_SECURITY_LEVELS.SECURE);
    });

    test('should warn about disabled SSL verification', () => {
      const config = {
        jasperUrl: 'https://localhost:8080/jasperserver',
        sslVerify: false,
        username: 'testuser',
        password: 'testpass',
      };

      const result = ConfigValidator.validateSecuritySettings(config);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('JASPER_SSL_VERIFY');
      expect(result.securityLevel).toBe(ConfigValidator.SSL_SECURITY_LEVELS.WARNING);
    });

    test('should warn about HTTP instead of HTTPS', () => {
      const config = {
        jasperUrl: 'http://localhost:8080/jasperserver',
        sslVerify: true,
        username: 'testuser',
        password: 'testpass',
      };

      const result = ConfigValidator.validateSecuritySettings(config);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('JASPER_URL');
      expect(result.securityLevel).toBe(ConfigValidator.SSL_SECURITY_LEVELS.INSECURE);
    });

    test('should warn about default credentials', () => {
      const config = {
        jasperUrl: 'https://localhost:8080/jasperserver',
        sslVerify: true,
        username: 'jasperadmin',
        password: 'jasperadmin',
      };

      const result = ConfigValidator.validateSecuritySettings(config);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('CREDENTIALS');
      expect(result.securityLevel).toBe(ConfigValidator.SSL_SECURITY_LEVELS.WARNING);
    });
  });

  describe('generateAdditionalRecommendations', () => {
    test('should recommend increasing timeout for low values', () => {
      const config = {
        timeout: 15000,
        debugMode: false,
        logLevel: 'info',
        authType: 'basic',
      };

      const recommendations = ConfigValidator.generateAdditionalRecommendations(config);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].field).toBe('JASPER_TIMEOUT');
    });

    test('should recommend disabling debug mode', () => {
      const config = {
        timeout: 30000,
        debugMode: true,
        logLevel: 'info',
        authType: 'basic',
      };

      const recommendations = ConfigValidator.generateAdditionalRecommendations(config);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].field).toBe('JASPER_DEBUG_MODE');
    });
  });

  describe('formatValidationOutput', () => {
    test('should format valid configuration output', () => {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        recommendations: [],
        securityLevel: ConfigValidator.SSL_SECURITY_LEVELS.SECURE,
        connectionStatus: {
          success: true,
          responseTime: 150,
          serverInfo: { version: '8.2.0', edition: 'Professional' },
        },
        config: {
          jasperUrl: 'https://localhost:8080/jasperserver',
          authType: 'basic',
          username: 'testuser',
          organization: null,
          sslVerify: true,
          timeout: 30000,
          debugMode: false,
          logLevel: 'info',
        },
      };

      const output = ConfigValidator.formatValidationOutput(validationResult, true);

      expect(output).toContain('✅ VALID');
      expect(output).toContain('🔒 SECURE');
      expect(output).toContain('✅ CONNECTION TEST');
      expect(output).toContain('Successfully connected');
    });

    test('should format invalid configuration output', () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'JASPER_URL',
            message: 'URL is required',
            guidance: 'Set JASPER_URL environment variable',
          },
        ],
        warnings: [],
        recommendations: [],
        securityLevel: ConfigValidator.SSL_SECURITY_LEVELS.WARNING,
        connectionStatus: null,
        config: null,
      };

      const output = ConfigValidator.formatValidationOutput(validationResult, true);

      expect(output).toContain('❌ INVALID');
      expect(output).toContain('❌ ERRORS');
      expect(output).toContain('URL is required');
    });
  });

  describe('getFieldGuidance', () => {
    test('should return specific guidance for known fields', () => {
      const guidance = ConfigValidator.getFieldGuidance('JASPER_URL', 'missing');
      expect(guidance).toContain('JASPER_URL');
      expect(guidance).toContain('JasperReports Server URL');
    });

    test('should return default guidance for unknown fields', () => {
      const guidance = ConfigValidator.getFieldGuidance('UNKNOWN_FIELD', 'missing');
      expect(guidance).toContain('configuration documentation');
    });
  });

  describe('getConnectionGuidance', () => {
    test('should return specific guidance for connection errors', () => {
      const guidance = ConfigValidator.getConnectionGuidance('timeout');
      expect(guidance).toContain('timed out');
    });

    test('should return default guidance for unknown error types', () => {
      const guidance = ConfigValidator.getConnectionGuidance('unknown');
      expect(guidance).toContain('Cannot connect');
    });
  });
});
