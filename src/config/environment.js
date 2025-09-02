/**
 * Configuration Management System for JasperReports MCP Server
 *
 * This module handles reading, validating, and caching configuration from environment variables.
 * It provides defaults for all JASPER_* variables and validates required values.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Determines if we're in a test environment
 */
const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
};

/**
 * Determines if we're in a development environment
 */
const isDevelopmentEnvironment = () => {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    !process.env.NODE_ENV
  );
};

/**
 * Configuration schema with validation rules and defaults
 */
const CONFIG_SCHEMA = {
  // Server connection settings
  jasperUrl: {
    envVar: 'JASPER_URL',
    required: true,
    type: 'string',
    validate: value => {
      if (!value) return 'JASPER_URL is required';
      try {
        new URL(value);
        return null;
      } catch {
        return 'JASPER_URL must be a valid URL';
      }
    },
  },

  timeout: {
    envVar: 'JASPER_TIMEOUT',
    required: false,
    type: 'number',
    default: 30000,
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_TIMEOUT must be a positive number (milliseconds)';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  sslVerify: {
    envVar: 'JASPER_SSL_VERIFY',
    required: false,
    type: 'boolean',
    default: () => {
      // Default to false for test/development environments, true for production
      return !isTestEnvironment() && !isDevelopmentEnvironment();
    },
    validate: value => {
      if (value !== undefined && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return 'JASPER_SSL_VERIFY must be true, false, 1, or 0';
      }
      return null;
    },
    transform: value => {
      if (value === undefined) {
        // Use environment-aware default
        return !isTestEnvironment() && !isDevelopmentEnvironment();
      }
      return ['true', '1'].includes(value.toLowerCase());
    },
  },

  // Authentication settings
  authType: {
    envVar: 'JASPER_AUTH_TYPE',
    required: false,
    type: 'string',
    default: 'basic',
    validate: value => {
      const validTypes = ['basic', 'login', 'argument'];
      if (value && !validTypes.includes(value)) {
        return `JASPER_AUTH_TYPE must be one of: ${validTypes.join(', ')}`;
      }
      return null;
    },
  },

  username: {
    envVar: 'JASPER_USERNAME',
    required: true,
    type: 'string',
    validate: value => {
      if (!value || value.trim().length === 0) {
        return 'JASPER_USERNAME is required and cannot be empty';
      }
      return null;
    },
  },

  password: {
    envVar: 'JASPER_PASSWORD',
    required: true,
    type: 'string',
    validate: value => {
      if (!value || value.trim().length === 0) {
        return 'JASPER_PASSWORD is required and cannot be empty';
      }
      return null;
    },
  },

  organization: {
    envVar: 'JASPER_ORGANIZATION',
    required: false,
    type: 'string',
    default: null,
    validate: value => {
      // Organization is optional, but if provided should not be empty
      if (value !== undefined && value.trim().length === 0) {
        return 'JASPER_ORGANIZATION cannot be empty if provided';
      }
      return null;
    },
  },

  // Server options
  debugMode: {
    envVar: 'JASPER_DEBUG_MODE',
    required: false,
    type: 'boolean',
    default: () => {
      // Default to true for development, false for test and production
      return isDevelopmentEnvironment() && !isTestEnvironment();
    },
    validate: value => {
      if (value !== undefined && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return 'JASPER_DEBUG_MODE must be true, false, 1, or 0';
      }
      return null;
    },
    transform: value => {
      if (value === undefined) {
        return isDevelopmentEnvironment() && !isTestEnvironment();
      }
      return ['true', '1'].includes(value.toLowerCase());
    },
  },

  logLevel: {
    envVar: 'JASPER_LOG_LEVEL',
    required: false,
    type: 'string',
    default: 'info',
    validate: value => {
      const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
      if (value && !validLevels.includes(value.toLowerCase())) {
        return `JASPER_LOG_LEVEL must be one of: ${validLevels.join(', ')}`;
      }
      return null;
    },
    transform: value => (value ? value.toLowerCase() : 'info'),
  },

  retryAttempts: {
    envVar: 'JASPER_RETRY_ATTEMPTS',
    required: false,
    type: 'number',
    default: 3,
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) {
        return 'JASPER_RETRY_ATTEMPTS must be a non-negative number';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  // Resilience and performance settings
  maxConnections: {
    envVar: 'JASPER_MAX_CONNECTIONS',
    required: false,
    type: 'number',
    default: 10,
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_MAX_CONNECTIONS must be a positive number';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  maxQueueSize: {
    envVar: 'JASPER_MAX_QUEUE_SIZE',
    required: false,
    type: 'number',
    default: 100,
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_MAX_QUEUE_SIZE must be a positive number';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  maxFileSize: {
    envVar: 'JASPER_MAX_FILE_SIZE',
    required: false,
    type: 'number',
    default: 100 * 1024 * 1024, // 100MB
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_MAX_FILE_SIZE must be a positive number (bytes)';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  maxTotalMemory: {
    envVar: 'JASPER_MAX_TOTAL_MEMORY',
    required: false,
    type: 'number',
    default: 500 * 1024 * 1024, // 500MB
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_MAX_TOTAL_MEMORY must be a positive number (bytes)';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  healthCheckInterval: {
    envVar: 'JASPER_HEALTH_CHECK_INTERVAL',
    required: false,
    type: 'number',
    default: 30000, // 30 seconds
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'JASPER_HEALTH_CHECK_INTERVAL must be a positive number (milliseconds)';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  // Test server settings
  testServerPort: {
    envVar: 'TEST_SERVER_PORT',
    required: false,
    type: 'number',
    default: 3000,
    validate: value => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0 || num > 65535) {
        return 'TEST_SERVER_PORT must be a valid port number (1-65535)';
      }
      return null;
    },
    transform: value => parseInt(value, 10),
  },

  testServerEnabled: {
    envVar: 'TEST_SERVER_ENABLED',
    required: false,
    type: 'boolean',
    default: false,
    validate: value => {
      if (value !== undefined && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return 'TEST_SERVER_ENABLED must be true, false, 1, or 0';
      }
      return null;
    },
    transform: value => {
      if (value === undefined) return false;
      return ['true', '1'].includes(value.toLowerCase());
    },
  },
};

/**
 * Cached configuration instance
 */
let cachedConfig = null;

/**
 * Configuration validation error class
 */
class ConfigurationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ConfigurationError';
    this.field = field;
  }
}

/**
 * Validates a single configuration value against its schema
 * @param {string} key - Configuration key
 * @param {any} value - Value to validate
 * @param {object} schema - Schema definition for the key
 * @returns {object} Validation result with error and transformedValue
 */
function validateConfigValue(key, value, schema) {
  // Check if required value is missing
  if (schema.required && (value === undefined || value === null || value === '')) {
    const errorMessage = schema.validate
      ? schema.validate(value)
      : `${schema.envVar} is required. Please set this environment variable.`;

    // Add helpful context for common missing variables
    let helpfulMessage = errorMessage;
    if (schema.envVar === 'JASPER_URL') {
      helpfulMessage += '\n  Example: JASPER_URL=http://localhost:8080/jasperserver';
    } else if (schema.envVar === 'JASPER_USERNAME') {
      helpfulMessage += '\n  Example: JASPER_USERNAME=jasperadmin';
    } else if (schema.envVar === 'JASPER_PASSWORD') {
      helpfulMessage += '\n  Example: JASPER_PASSWORD=jasperadmin';
    }

    return {
      error: helpfulMessage,
      transformedValue: null,
    };
  }

  // Use default if value is not provided
  if (value === undefined || value === null || value === '') {
    const defaultValue = typeof schema.default === 'function' ? schema.default() : schema.default;
    return {
      error: null,
      transformedValue: defaultValue,
    };
  }

  // Run custom validation if provided
  if (schema.validate) {
    const validationError = schema.validate(value);
    if (validationError) {
      return {
        error: validationError,
        transformedValue: null,
      };
    }
  }

  // Transform value if transformer is provided
  const transformedValue = schema.transform ? schema.transform(value) : value;

  return {
    error: null,
    transformedValue,
  };
}

/**
 * Loads and validates configuration from environment variables
 * @returns {object} Validated configuration object
 * @throws {ConfigurationError} If validation fails
 */
function loadConfiguration() {
  const config = {};
  const errors = [];

  // Process each configuration key
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const envValue = process.env[schema.envVar];
    const validation = validateConfigValue(key, envValue, schema);

    if (validation.error) {
      errors.push({
        field: schema.envVar,
        message: validation.error,
      });
    } else {
      config[key] = validation.transformedValue;
    }
  }

  // If there are validation errors, throw a comprehensive error
  if (errors.length > 0) {
    const errorMessage =
      'Configuration validation failed:\n' +
      errors.map(err => `  - ${err.field}: ${err.message}`).join('\n') +
      '\n\nFor help with configuration, see the documentation or check your .env file.\n' +
      'Required environment variables: JASPER_URL, JASPER_USERNAME, JASPER_PASSWORD';

    const configError = new ConfigurationError(errorMessage);
    configError.validationErrors = errors;
    throw configError;
  }

  return config;
}

/**
 * Gets the current configuration, loading and caching it if necessary
 * @param {boolean} forceReload - Force reload configuration from environment
 * @returns {object} Configuration object
 */
function getConfiguration(forceReload = false) {
  if (!cachedConfig || forceReload) {
    cachedConfig = loadConfiguration();

    // Log configuration loading in debug mode
    if (cachedConfig.debugMode) {
      console.log('Configuration loaded:', {
        jasperUrl: cachedConfig.jasperUrl,
        authType: cachedConfig.authType,
        organization: cachedConfig.organization || 'none',
        timeout: cachedConfig.timeout,
        sslVerify: cachedConfig.sslVerify,
        debugMode: cachedConfig.debugMode,
        logLevel: cachedConfig.logLevel,
        retryAttempts: cachedConfig.retryAttempts,
        testServerEnabled: cachedConfig.testServerEnabled,
        testServerPort: cachedConfig.testServerPort,
      });
    }
  }

  return cachedConfig;
}

/**
 * Validates that the current configuration is complete and correct
 * @returns {object} Validation result with isValid and errors
 */
function validateConfiguration() {
  try {
    const config = getConfiguration();

    // Additional cross-field validation
    const errors = [];

    // Check if organization is required for the auth type
    if (config.authType === 'login' && config.organization && config.username.includes('|')) {
      errors.push({
        field: 'JASPER_USERNAME',
        message: 'Username should not contain "|" when JASPER_ORGANIZATION is set separately',
      });
    }

    // Validate URL accessibility (basic check)
    if (config.jasperUrl) {
      try {
        const url = new URL(config.jasperUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push({
            field: 'JASPER_URL',
            message: 'JASPER_URL must use http or https protocol',
          });
        }
      } catch {
        errors.push({
          field: 'JASPER_URL',
          message: 'JASPER_URL is not a valid URL',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      config,
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        isValid: false,
        errors: error.validationErrors || [{ field: 'general', message: error.message }],
        config: null,
      };
    }

    return {
      isValid: false,
      errors: [{ field: 'general', message: error.message }],
      config: null,
    };
  }
}

/**
 * Clears the cached configuration (useful for testing)
 */
function clearConfigurationCache() {
  cachedConfig = null;
}

/**
 * Gets configuration schema for documentation or validation purposes
 * @returns {object} Configuration schema
 */
function getConfigurationSchema() {
  return CONFIG_SCHEMA;
}

/**
 * Generates example environment configuration
 * @param {string} environment - 'production' or 'development'
 * @returns {string} Example environment configuration
 */
function generateExampleConfig(environment = 'development') {
  const examples = {
    development: {
      JASPER_URL: 'http://localhost:8080/jasperserver',
      JASPER_AUTH_TYPE: 'basic',
      JASPER_USERNAME: 'jasperadmin',
      JASPER_PASSWORD: 'jasperadmin',
      JASPER_DEBUG_MODE: 'true',
      JASPER_LOG_LEVEL: 'debug',
      TEST_SERVER_ENABLED: 'true',
      TEST_SERVER_PORT: '3000',
    },
    production: {
      JASPER_URL: 'https://reports.company.com/jasperserver',
      JASPER_AUTH_TYPE: 'basic',
      JASPER_USERNAME: 'service_account',
      JASPER_PASSWORD: 'secure_password',
      JASPER_ORGANIZATION: 'organization_1',
      JASPER_TIMEOUT: '300000',
      JASPER_SSL_VERIFY: 'true',
      JASPER_LOG_LEVEL: 'info',
      JASPER_RETRY_ATTEMPTS: '3',
      JASPER_MAX_CONNECTIONS: '10',
      JASPER_MAX_QUEUE_SIZE: '100',
      JASPER_MAX_FILE_SIZE: '104857600',
      JASPER_MAX_TOTAL_MEMORY: '524288000',
      JASPER_HEALTH_CHECK_INTERVAL: '30000',
    },
  };

  const config = examples[environment] || examples.development;

  return Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export {
  getConfiguration,
  validateConfiguration,
  clearConfigurationCache,
  getConfigurationSchema,
  generateExampleConfig,
  ConfigurationError,
};
