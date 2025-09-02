/**
 * Configuration Validation System for JasperReports MCP Server
 * Provides comprehensive startup configuration validation, connection testing, and security warnings
 */

import { validateConfiguration } from '../config/environment.js';
import AuthService from '../services/authService.js';

/**
 * Configuration validation error class
 */
class ConfigValidationError extends Error {
  constructor(message, field = null, guidance = null) {
    super(message);
    this.name = 'ConfigValidationError';
    this.field = field;
    this.guidance = guidance;
  }
}

/**
 * Configuration Validator class for startup validation and connection testing
 */
class ConfigValidator {
  /**
   * Required environment variables for basic operation
   */
  static REQUIRED_ENV_VARS = ['JASPER_URL', 'JASPER_USERNAME', 'JASPER_PASSWORD'];

  /**
   * SSL/TLS security recommendations
   */
  static SSL_SECURITY_LEVELS = {
    SECURE: 'secure',
    WARNING: 'warning',
    INSECURE: 'insecure',
  };

  /**
   * Configuration validation guidance messages
   */
  static VALIDATION_GUIDANCE = {
    JASPER_URL: {
      missing:
        'Set JASPER_URL to your JasperReports Server URL (e.g., https://reports.company.com/jasperserver)',
      invalid:
        'JASPER_URL must be a valid HTTP or HTTPS URL. Example: https://localhost:8080/jasperserver',
      insecure: 'Consider using HTTPS instead of HTTP for production environments',
    },
    JASPER_USERNAME: {
      missing: 'Set JASPER_USERNAME to a valid JasperReports Server username',
      invalid: 'JASPER_USERNAME cannot be empty and should not contain special characters',
    },
    JASPER_PASSWORD: {
      missing: 'Set JASPER_PASSWORD to the password for the specified username',
      invalid: 'JASPER_PASSWORD cannot be empty',
      weak: 'Consider using a strong password for production environments',
    },
    JASPER_AUTH_TYPE: {
      invalid: 'JASPER_AUTH_TYPE must be one of: basic, login, argument. Default is "basic"',
    },
    JASPER_ORGANIZATION: {
      invalid: 'JASPER_ORGANIZATION should be set when using multi-tenant JasperReports Server',
    },
    JASPER_SSL_VERIFY: {
      disabled: 'SSL verification is disabled. This is insecure for production environments',
      recommendation: 'Set JASPER_SSL_VERIFY=true for production environments',
    },
    JASPER_TIMEOUT: {
      invalid: 'JASPER_TIMEOUT must be a positive number in milliseconds (default: 30000)',
      recommendation: 'Consider increasing timeout for large reports or slow networks',
    },
    CONNECTION: {
      failed:
        'Cannot connect to JasperReports Server. Check URL, network connectivity, and server status',
      timeout: 'Connection timed out. Check network connectivity or increase JASPER_TIMEOUT',
      ssl: 'SSL/TLS connection failed. Check certificate validity or set JASPER_SSL_VERIFY=false for testing',
      auth: 'Authentication failed. Check username, password, and organization settings',
    },
  };

  /**
   * Validates complete startup configuration
   * @param {Object} options - Validation options
   * @param {boolean} options.testConnection - Whether to test JasperReports Server connection
   * @param {boolean} options.validateSecurity - Whether to validate security settings
   * @param {boolean} options.verbose - Whether to provide verbose output
   * @returns {Object} - Validation result with status, errors, warnings, and recommendations
   */
  static async validateStartupConfig(options = {}) {
    const { testConnection = true, validateSecurity = true } = options;

    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      securityLevel: this.SSL_SECURITY_LEVELS.SECURE,
      connectionStatus: null,
      config: null,
    };

    try {
      // Step 1: Validate environment variables
      const envValidation = this.validateEnvironmentVariables();
      result.errors.push(...envValidation.errors);
      result.warnings.push(...envValidation.warnings);
      result.recommendations.push(...envValidation.recommendations);

      if (envValidation.errors.length > 0) {
        result.isValid = false;
        return result;
      }

      // Step 2: Load and validate configuration
      const configValidation = validateConfiguration();
      if (!configValidation.isValid) {
        result.isValid = false;
        result.errors.push(
          ...configValidation.errors.map(err => ({
            field: err.field,
            message: err.message,
            guidance: this.getFieldGuidance(err.field, 'invalid'),
          }))
        );
        return result;
      }

      result.config = configValidation.config;

      // Step 3: Validate security settings
      if (validateSecurity) {
        const securityValidation = this.validateSecuritySettings(result.config);
        result.warnings.push(...securityValidation.warnings);
        result.recommendations.push(...securityValidation.recommendations);
        result.securityLevel = securityValidation.securityLevel;
      }

      // Step 4: Test JasperReports Server connection
      if (testConnection) {
        const connectionValidation = await this.validateJasperConnection(result.config);
        result.connectionStatus = connectionValidation;

        if (!connectionValidation.success) {
          result.isValid = false;
          result.errors.push({
            field: 'CONNECTION',
            message: connectionValidation.error,
            guidance: this.getConnectionGuidance(connectionValidation.errorType),
          });
        }
      }

      // Step 5: Generate additional recommendations
      const additionalRecommendations = this.generateAdditionalRecommendations(result.config);
      result.recommendations.push(...additionalRecommendations);
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        field: 'GENERAL',
        message: `Configuration validation failed: ${error.message}`,
        guidance: 'Check your environment variables and configuration settings',
      });
    }

    return result;
  }

  /**
   * Validates environment variables
   * @returns {Object} - Validation result with errors, warnings, and recommendations
   */
  static validateEnvironmentVariables() {
    const result = {
      errors: [],
      warnings: [],
      recommendations: [],
    };

    // Check required environment variables
    for (const envVar of this.REQUIRED_ENV_VARS) {
      const value = process.env[envVar];

      if (!value || value.trim().length === 0) {
        result.errors.push({
          field: envVar,
          message: `${envVar} is required but not set`,
          guidance: this.getFieldGuidance(envVar, 'missing'),
        });
      }
    }

    // Check optional but important environment variables
    const optionalVars = [
      'JASPER_AUTH_TYPE',
      'JASPER_ORGANIZATION',
      'JASPER_SSL_VERIFY',
      'JASPER_TIMEOUT',
    ];

    for (const envVar of optionalVars) {
      const value = process.env[envVar];

      if (!value) {
        result.recommendations.push({
          field: envVar,
          message: `Consider setting ${envVar} for better configuration control`,
          guidance: this.getFieldGuidance(envVar, 'recommendation'),
        });
      }
    }

    return result;
  }

  /**
   * Validates security settings and provides security warnings
   * @param {Object} config - Configuration object
   * @returns {Object} - Security validation result
   */
  static validateSecuritySettings(config) {
    const result = {
      warnings: [],
      recommendations: [],
      securityLevel: this.SSL_SECURITY_LEVELS.SECURE,
    };

    // Check SSL verification setting
    if (!config.sslVerify) {
      result.warnings.push({
        field: 'JASPER_SSL_VERIFY',
        message: 'SSL certificate verification is disabled',
        guidance: this.VALIDATION_GUIDANCE.JASPER_SSL_VERIFY.disabled,
      });
      result.securityLevel = this.SSL_SECURITY_LEVELS.WARNING;
    }

    // Check if using HTTP instead of HTTPS
    if (config.jasperUrl && config.jasperUrl.startsWith('http://')) {
      result.warnings.push({
        field: 'JASPER_URL',
        message: 'Using HTTP instead of HTTPS',
        guidance: this.VALIDATION_GUIDANCE.JASPER_URL.insecure,
      });
      result.securityLevel = this.SSL_SECURITY_LEVELS.INSECURE;
    }

    // Check password strength (basic check)
    if (config.password && config.password.length < 8) {
      result.recommendations.push({
        field: 'JASPER_PASSWORD',
        message: 'Password is shorter than 8 characters',
        guidance: this.VALIDATION_GUIDANCE.JASPER_PASSWORD.weak,
      });
    }

    // Check for default credentials
    if (config.username === 'jasperadmin' && config.password === 'jasperadmin') {
      result.warnings.push({
        field: 'CREDENTIALS',
        message: 'Using default JasperReports Server credentials',
        guidance: 'Change default credentials for production environments',
      });
      result.securityLevel = this.SSL_SECURITY_LEVELS.WARNING;
    }

    return result;
  }

  /**
   * Tests connection to JasperReports Server
   * @param {Object} config - Configuration object
   * @returns {Object} - Connection test result
   */
  static async validateJasperConnection(config) {
    const result = {
      success: false,
      error: null,
      errorType: null,
      serverInfo: null,
      responseTime: null,
    };

    try {
      const startTime = Date.now();

      // Create auth service instance for testing
      const authService = new AuthService(config);

      // Test authentication
      const authResult = await authService.authenticate({
        username: config.username,
        password: config.password,
        organization: config.organization,
        authType: config.authType,
      });

      result.responseTime = Date.now() - startTime;

      if (authResult.success) {
        result.success = true;
        result.serverInfo = {
          version: authResult.serverInfo?.version || 'Unknown',
          edition: authResult.serverInfo?.edition || 'Unknown',
          authenticated: true,
        };
      } else {
        result.error = authResult.error || 'Authentication failed';
        result.errorType = 'auth';
      }
    } catch (error) {
      result.error = error.message;

      // Categorize error types for better guidance
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        result.errorType = 'connection';
      } else if (error.code === 'ETIMEDOUT') {
        result.errorType = 'timeout';
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        result.errorType = 'ssl';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        result.errorType = 'auth';
      } else {
        result.errorType = 'unknown';
      }
    }

    return result;
  }

  /**
   * Generates additional configuration recommendations
   * @param {Object} config - Configuration object
   * @returns {Array} - Array of recommendations
   */
  static generateAdditionalRecommendations(config) {
    const recommendations = [];

    // Timeout recommendations
    if (config.timeout < 30000) {
      recommendations.push({
        field: 'JASPER_TIMEOUT',
        message: 'Timeout is set to less than 30 seconds',
        guidance: 'Consider increasing timeout for large reports or slow networks',
      });
    }

    // Debug mode recommendations
    if (config.debugMode) {
      recommendations.push({
        field: 'JASPER_DEBUG_MODE',
        message: 'Debug mode is enabled',
        guidance: 'Disable debug mode in production for better performance',
      });
    }

    // Log level recommendations
    if (config.logLevel === 'debug' || config.logLevel === 'trace') {
      recommendations.push({
        field: 'JASPER_LOG_LEVEL',
        message: 'Verbose logging is enabled',
        guidance: 'Use "info" or "warn" log level in production',
      });
    }

    // Organization recommendations
    if (config.authType === 'login' && !config.organization) {
      recommendations.push({
        field: 'JASPER_ORGANIZATION',
        message: 'Organization not set with login authentication',
        guidance: 'Set JASPER_ORGANIZATION for multi-tenant environments',
      });
    }

    return recommendations;
  }

  /**
   * Gets field-specific guidance message
   * @param {string} field - Field name
   * @param {string} type - Guidance type (missing, invalid, recommendation)
   * @returns {string} - Guidance message
   */
  static getFieldGuidance(field, type) {
    const fieldGuidance = this.VALIDATION_GUIDANCE[field];
    if (fieldGuidance && fieldGuidance[type]) {
      return fieldGuidance[type];
    }
    return 'Check the configuration documentation for proper setup';
  }

  /**
   * Gets connection-specific guidance message
   * @param {string} errorType - Error type (connection, timeout, ssl, auth, unknown)
   * @returns {string} - Guidance message
   */
  static getConnectionGuidance(errorType) {
    const connectionGuidance = this.VALIDATION_GUIDANCE.CONNECTION;
    return connectionGuidance[errorType] || connectionGuidance.failed;
  }

  /**
   * Formats validation result for console output
   * @param {Object} validationResult - Result from validateStartupConfig
   * @param {boolean} verbose - Whether to include verbose details
   * @returns {string} - Formatted output
   */
  static formatValidationOutput(validationResult, verbose = false) {
    const lines = [];

    // Header
    lines.push('='.repeat(60));
    lines.push('JasperReports MCP Server - Configuration Validation');
    lines.push('='.repeat(60));

    // Overall status
    const status = validationResult.isValid ? '✅ VALID' : '❌ INVALID';
    const securityIcon = this.getSecurityIcon(validationResult.securityLevel);
    lines.push(
      `Status: ${status} | Security: ${securityIcon} ${validationResult.securityLevel.toUpperCase()}`
    );
    lines.push('');

    // Errors
    if (validationResult.errors.length > 0) {
      lines.push('❌ ERRORS:');
      validationResult.errors.forEach(error => {
        lines.push(`  • ${error.field}: ${error.message}`);
        if (verbose && error.guidance) {
          lines.push(`    💡 ${error.guidance}`);
        }
      });
      lines.push('');
    }

    // Warnings
    if (validationResult.warnings.length > 0) {
      lines.push('⚠️  WARNINGS:');
      validationResult.warnings.forEach(warning => {
        lines.push(`  • ${warning.field}: ${warning.message}`);
        if (verbose && warning.guidance) {
          lines.push(`    💡 ${warning.guidance}`);
        }
      });
      lines.push('');
    }

    // Connection status
    if (validationResult.connectionStatus) {
      const conn = validationResult.connectionStatus;
      const connIcon = conn.success ? '✅' : '❌';
      lines.push(`${connIcon} CONNECTION TEST:`);

      if (conn.success) {
        lines.push(`  • Successfully connected to JasperReports Server`);
        if (conn.responseTime) {
          lines.push(`  • Response time: ${conn.responseTime}ms`);
        }
        if (verbose && conn.serverInfo) {
          lines.push(`  • Server version: ${conn.serverInfo.version}`);
          lines.push(`  • Server edition: ${conn.serverInfo.edition}`);
        }
      } else {
        lines.push(`  • Connection failed: ${conn.error}`);
        if (verbose) {
          const guidance = this.getConnectionGuidance(conn.errorType);
          lines.push(`    💡 ${guidance}`);
        }
      }
      lines.push('');
    }

    // Recommendations
    if (validationResult.recommendations.length > 0 && verbose) {
      lines.push('💡 RECOMMENDATIONS:');
      validationResult.recommendations.forEach(rec => {
        lines.push(`  • ${rec.field}: ${rec.message}`);
        if (rec.guidance) {
          lines.push(`    ${rec.guidance}`);
        }
      });
      lines.push('');
    }

    // Configuration summary
    if (verbose && validationResult.config) {
      lines.push('📋 CONFIGURATION SUMMARY:');
      lines.push(`  • JasperReports URL: ${validationResult.config.jasperUrl}`);
      lines.push(`  • Authentication Type: ${validationResult.config.authType}`);
      lines.push(`  • Username: ${validationResult.config.username}`);
      lines.push(`  • Organization: ${validationResult.config.organization || 'None'}`);
      lines.push(
        `  • SSL Verification: ${validationResult.config.sslVerify ? 'Enabled' : 'Disabled'}`
      );
      lines.push(`  • Timeout: ${validationResult.config.timeout}ms`);
      lines.push(`  • Debug Mode: ${validationResult.config.debugMode ? 'Enabled' : 'Disabled'}`);
      lines.push(`  • Log Level: ${validationResult.config.logLevel}`);
      lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Gets security level icon
   * @param {string} securityLevel - Security level
   * @returns {string} - Icon for security level
   */
  static getSecurityIcon(securityLevel) {
    switch (securityLevel) {
      case this.SSL_SECURITY_LEVELS.SECURE:
        return '🔒';
      case this.SSL_SECURITY_LEVELS.WARNING:
        return '⚠️';
      case this.SSL_SECURITY_LEVELS.INSECURE:
        return '🔓';
      default:
        return '❓';
    }
  }

  /**
   * Validates configuration and exits process if invalid
   * @param {Object} options - Validation options
   */
  static async validateAndExit(options = {}) {
    const result = await this.validateStartupConfig(options);

    console.log(this.formatValidationOutput(result, options.verbose));

    if (!result.isValid) {
      console.error(
        '\n❌ Configuration validation failed. Please fix the errors above and try again.'
      );
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn(
        '\n⚠️  Configuration has warnings. Consider addressing them for better security and performance.'
      );
    }

    console.log('\n✅ Configuration validation passed. Starting server...');
  }
}

export { ConfigValidator, ConfigValidationError };
