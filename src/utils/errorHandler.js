/**
 * Error Handling and Mapping System for JasperReports MCP Server
 *
 * This module provides comprehensive error handling capabilities including:
 * - HTTP status code to MCP error mapping
 * - JasperReports-specific error message parsing and transformation
 * - Error classification (authentication, permission, validation, connection, internal)
 * - Error logging and debugging utilities
 * - Enhanced error context tracking with correlation IDs
 * - Detailed validation step logging for debugging
 */

import { getConfiguration } from '../config/environment.js';
import { PermissionManager } from './permissionManager.js';
import { getErrorContextManager } from './errorContext.js';

/**
 * MCP Error Types based on the Model Context Protocol specification
 */
const MCP_ERROR_TYPES = {
  INVALID_REQUEST: 'InvalidRequest',
  METHOD_NOT_FOUND: 'MethodNotFound',
  INVALID_PARAMS: 'InvalidParams',
  INTERNAL_ERROR: 'InternalError',
  PARSE_ERROR: 'ParseError',
  CANCELLED: 'Cancelled',
  TIMEOUT: 'Timeout',
  RESOURCE_NOT_FOUND: 'ResourceNotFound',
  PERMISSION_DENIED: 'PermissionDenied',
  AUTHENTICATION_REQUIRED: 'AuthenticationRequired',
  RATE_LIMITED: 'RateLimited',
  SERVICE_UNAVAILABLE: 'ServiceUnavailable',
};

/**
 * Error Classification Categories
 */
const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  CONNECTION: 'connection',
  INTERNAL: 'internal',
  RESOURCE: 'resource',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
};

/**
 * HTTP Status Code to MCP Error Type Mapping
 */
const HTTP_TO_MCP_ERROR_MAP = {
  // Success codes (shouldn't normally be errors, but included for completeness)
  200: { type: null, category: null },
  201: { type: null, category: null },
  204: { type: null, category: null },

  // Client errors
  400: { type: MCP_ERROR_TYPES.INVALID_REQUEST, category: ERROR_CATEGORIES.VALIDATION },
  401: { type: MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, category: ERROR_CATEGORIES.AUTHENTICATION },
  403: { type: MCP_ERROR_TYPES.PERMISSION_DENIED, category: ERROR_CATEGORIES.PERMISSION },
  404: { type: MCP_ERROR_TYPES.RESOURCE_NOT_FOUND, category: ERROR_CATEGORIES.RESOURCE },
  405: { type: MCP_ERROR_TYPES.METHOD_NOT_FOUND, category: ERROR_CATEGORIES.VALIDATION },
  408: { type: MCP_ERROR_TYPES.TIMEOUT, category: ERROR_CATEGORIES.TIMEOUT },
  409: { type: MCP_ERROR_TYPES.INVALID_REQUEST, category: ERROR_CATEGORIES.VALIDATION },
  422: { type: MCP_ERROR_TYPES.INVALID_PARAMS, category: ERROR_CATEGORIES.VALIDATION },
  429: { type: MCP_ERROR_TYPES.RATE_LIMITED, category: ERROR_CATEGORIES.RATE_LIMIT },

  // Server errors
  500: { type: MCP_ERROR_TYPES.INTERNAL_ERROR, category: ERROR_CATEGORIES.INTERNAL },
  501: { type: MCP_ERROR_TYPES.METHOD_NOT_FOUND, category: ERROR_CATEGORIES.INTERNAL },
  502: { type: MCP_ERROR_TYPES.SERVICE_UNAVAILABLE, category: ERROR_CATEGORIES.CONNECTION },
  503: { type: MCP_ERROR_TYPES.SERVICE_UNAVAILABLE, category: ERROR_CATEGORIES.CONNECTION },
  504: { type: MCP_ERROR_TYPES.TIMEOUT, category: ERROR_CATEGORIES.TIMEOUT },

  // Default for unknown status codes
  default: { type: MCP_ERROR_TYPES.INTERNAL_ERROR, category: ERROR_CATEGORIES.INTERNAL },
};

/**
 * JasperReports-specific error code patterns and their mappings
 */
const JASPER_ERROR_PATTERNS = {
  // Authentication errors
  'authentication.failed': {
    type: MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    category: ERROR_CATEGORIES.AUTHENTICATION,
  },
  'login.error': {
    type: MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    category: ERROR_CATEGORIES.AUTHENTICATION,
  },
  'invalid.credentials': {
    type: MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    category: ERROR_CATEGORIES.AUTHENTICATION,
  },
  'session.expired': {
    type: MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED,
    category: ERROR_CATEGORIES.AUTHENTICATION,
  },

  // Permission errors
  'access.denied': {
    type: MCP_ERROR_TYPES.PERMISSION_DENIED,
    category: ERROR_CATEGORIES.PERMISSION,
  },
  'insufficient.permissions': {
    type: MCP_ERROR_TYPES.PERMISSION_DENIED,
    category: ERROR_CATEGORIES.PERMISSION,
  },
  'role.not.found': {
    type: MCP_ERROR_TYPES.PERMISSION_DENIED,
    category: ERROR_CATEGORIES.PERMISSION,
  },

  // Resource errors
  'resource.not.found': {
    type: MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
    category: ERROR_CATEGORIES.RESOURCE,
  },
  'report.not.found': {
    type: MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
    category: ERROR_CATEGORIES.RESOURCE,
  },
  'folder.not.found': {
    type: MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
    category: ERROR_CATEGORIES.RESOURCE,
  },
  'datasource.not.found': {
    type: MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
    category: ERROR_CATEGORIES.RESOURCE,
  },
  'resource.already.exists': {
    type: MCP_ERROR_TYPES.INVALID_REQUEST,
    category: ERROR_CATEGORIES.VALIDATION,
  },

  // Validation errors
  'invalid.parameter': {
    type: MCP_ERROR_TYPES.INVALID_PARAMS,
    category: ERROR_CATEGORIES.VALIDATION,
  },
  'missing.parameter': {
    type: MCP_ERROR_TYPES.INVALID_PARAMS,
    category: ERROR_CATEGORIES.VALIDATION,
  },
  'invalid.format': {
    type: MCP_ERROR_TYPES.INVALID_REQUEST,
    category: ERROR_CATEGORIES.VALIDATION,
  },
  'validation.error': {
    type: MCP_ERROR_TYPES.INVALID_PARAMS,
    category: ERROR_CATEGORIES.VALIDATION,
  },

  // Execution errors
  'report.execution.failed': {
    type: MCP_ERROR_TYPES.INTERNAL_ERROR,
    category: ERROR_CATEGORIES.INTERNAL,
  },
  'job.execution.failed': {
    type: MCP_ERROR_TYPES.INTERNAL_ERROR,
    category: ERROR_CATEGORIES.INTERNAL,
  },
  'export.failed': { type: MCP_ERROR_TYPES.INTERNAL_ERROR, category: ERROR_CATEGORIES.INTERNAL },

  // Connection errors
  'connection.failed': {
    type: MCP_ERROR_TYPES.SERVICE_UNAVAILABLE,
    category: ERROR_CATEGORIES.CONNECTION,
  },
  timeout: { type: MCP_ERROR_TYPES.TIMEOUT, category: ERROR_CATEGORIES.TIMEOUT },
  'service.unavailable': {
    type: MCP_ERROR_TYPES.SERVICE_UNAVAILABLE,
    category: ERROR_CATEGORIES.CONNECTION,
  },
};

/**
 * Standard MCP Error class with enhanced context support
 */
class MCPError extends Error {
  constructor(type, message, details = null, statusCode = null, correlationId = null) {
    super(message);
    this.name = 'MCPError';
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();
    this.category = this._determineCategory(type);
  }

  /**
   * Determine error category based on type
   * @private
   */
  _determineCategory(type) {
    for (const [category, patterns] of Object.entries({
      [ERROR_CATEGORIES.AUTHENTICATION]: [MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED],
      [ERROR_CATEGORIES.PERMISSION]: [MCP_ERROR_TYPES.PERMISSION_DENIED],
      [ERROR_CATEGORIES.VALIDATION]: [
        MCP_ERROR_TYPES.INVALID_REQUEST,
        MCP_ERROR_TYPES.INVALID_PARAMS,
      ],
      [ERROR_CATEGORIES.RESOURCE]: [
        MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
        MCP_ERROR_TYPES.METHOD_NOT_FOUND,
      ],
      [ERROR_CATEGORIES.CONNECTION]: [MCP_ERROR_TYPES.SERVICE_UNAVAILABLE],
      [ERROR_CATEGORIES.TIMEOUT]: [MCP_ERROR_TYPES.TIMEOUT],
      [ERROR_CATEGORIES.RATE_LIMIT]: [MCP_ERROR_TYPES.RATE_LIMITED],
    })) {
      if (patterns.includes(type)) {
        return category;
      }
    }
    return ERROR_CATEGORIES.INTERNAL;
  }

  /**
   * Convert error to JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      correlationId: this.correlationId,
      category: this.category,
      timestamp: this.timestamp,
    };
  }

  /**
   * Check if error is retryable based on its category
   */
  isRetryable() {
    const retryableCategories = [
      ERROR_CATEGORIES.CONNECTION,
      ERROR_CATEGORIES.TIMEOUT,
      ERROR_CATEGORIES.RATE_LIMIT,
    ];
    return retryableCategories.includes(this.category);
  }

  /**
   * Check if error requires authentication
   */
  requiresAuthentication() {
    return this.category === ERROR_CATEGORIES.AUTHENTICATION;
  }
}

/**
 * Error Handler class providing comprehensive error handling capabilities
 */
class ErrorHandler {
  constructor(config = null) {
    this.config = config || getConfiguration();
    this.errorCounts = new Map();
    this.lastErrors = new Map();
    this.permissionManager = new PermissionManager(this.config);
    this.contextManager = getErrorContextManager();
  }

  /**
   * Map HTTP status code and response to MCP error
   * @param {number} statusCode - HTTP status code
   * @param {any} responseData - Response data from server
   * @param {string} context - Additional context about the operation
   * @returns {MCPError} Mapped MCP error
   */
  mapHttpError(statusCode, responseData = null, context = null) {
    const mapping = HTTP_TO_MCP_ERROR_MAP[statusCode] || HTTP_TO_MCP_ERROR_MAP.default;

    // Extract message from response data
    let message = this._extractErrorMessage(responseData, statusCode);

    // Add context if provided
    if (context) {
      message = `${context}: ${message}`;
    }

    // Check for JasperReports-specific error patterns in the response
    const jasperMapping = this._findJasperErrorPattern(responseData);
    if (jasperMapping) {
      return new MCPError(
        jasperMapping.type,
        message,
        this._extractErrorDetails(responseData),
        statusCode
      );
    }

    // Use HTTP status code mapping
    return new MCPError(mapping.type, message, this._extractErrorDetails(responseData), statusCode);
  }

  /**
   * Map JasperReports-specific error response to MCP error
   * @param {object} jasperError - JasperReports error response
   * @param {string} context - Additional context about the operation
   * @returns {MCPError} Mapped MCP error
   */
  mapJasperError(jasperError, context = null) {
    if (!jasperError || typeof jasperError !== 'object') {
      return this.createInternalError('Invalid JasperReports error response', { jasperError });
    }

    const errorCode = jasperError.errorCode || jasperError.code || 'unknown.error';
    const message =
      jasperError.message || jasperError.errorMessage || 'Unknown JasperReports error';

    // Find matching error pattern
    const mapping = this._findJasperErrorPattern({ errorCode, message });

    let finalMessage = message;
    if (context) {
      finalMessage = `${context}: ${message}`;
    }

    if (mapping) {
      return new MCPError(mapping.type, finalMessage, {
        jasperErrorCode: errorCode,
        jasperMessage: message,
        parameters: jasperError.parameters,
        errorUid: jasperError.errorUid,
      });
    }

    // Default to internal error for unknown JasperReports errors
    return new MCPError(MCP_ERROR_TYPES.INTERNAL_ERROR, finalMessage, {
      jasperErrorCode: errorCode,
      jasperMessage: message,
      parameters: jasperError.parameters,
      errorUid: jasperError.errorUid,
    });
  }

  /**
   * Create validation error for invalid input parameters
   * @param {string} field - Field name that failed validation
   * @param {string} message - Validation error message
   * @param {any} value - Invalid value
   * @param {string} constraint - Validation constraint that was violated
   * @returns {MCPError} Validation error
   */
  createValidationError(field, message, value = null, constraint = null) {
    return new MCPError(
      MCP_ERROR_TYPES.INVALID_PARAMS,
      `Validation failed for field '${field}': ${message}`,
      {
        field,
        value,
        constraint,
        validationType: 'parameter_validation',
      }
    );
  }

  /**
   * Create connection error for network-related issues
   * @param {string} message - Error message
   * @param {Error} cause - Original error that caused the connection issue
   * @returns {MCPError} Connection error
   */
  createConnectionError(message, cause = null) {
    return new MCPError(MCP_ERROR_TYPES.SERVICE_UNAVAILABLE, message, {
      originalError: cause?.message,
      errorCode: cause?.code,
      connectionType: 'jasperreports_server',
    });
  }

  /**
   * Create authentication error with enhanced guidance
   * @param {string} message - Error message
   * @param {string} authType - Authentication type that failed
   * @param {object} authError - Original authentication error details
   * @returns {MCPError} Authentication error with enhanced guidance
   */
  createAuthenticationError(message, authType = null, authError = null) {
    let enhancedDetails = {
      authType,
      requiresReauth: true,
    };

    // Enhance with permission manager guidance if available
    if (authError) {
      const enhancement = this.permissionManager.enhanceAuthenticationError(authError, authType);
      enhancedDetails = {
        ...enhancedDetails,
        enhancement,
        actionableSteps: enhancement.actionableSteps,
        troubleshooting: enhancement.troubleshooting,
      };
    }

    return new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, message, enhancedDetails);
  }

  /**
   * Create permission error with enhanced guidance
   * @param {string} message - Error message
   * @param {string} resource - Resource that was accessed
   * @param {string} operation - Operation that was attempted
   * @param {string} toolName - Name of the MCP tool that failed
   * @param {object} originalError - Original permission error
   * @returns {MCPError} Permission error with enhanced guidance
   */
  createPermissionError(
    message,
    resource = null,
    operation = null,
    toolName = null,
    originalError = null
  ) {
    let enhancedDetails = {
      resource,
      operation,
      requiresPermission: true,
    };

    // Enhance with permission manager analysis if available
    if (toolName && originalError) {
      const analysis = this.permissionManager.analyzePermissionError(
        originalError,
        toolName,
        operation,
        { resourceUri: resource }
      );

      if (analysis) {
        enhancedDetails = {
          ...enhancedDetails,
          analysis,
          guidance: analysis.guidance,
          requirements: analysis.requirements,
          suggestions: this.permissionManager.suggestPermissionFix(toolName, analysis),
        };
      }
    }

    return new MCPError(MCP_ERROR_TYPES.PERMISSION_DENIED, message, enhancedDetails);
  }

  /**
   * Create resource not found error
   * @param {string} resourceType - Type of resource (report, folder, etc.)
   * @param {string} resourcePath - Path or identifier of the resource
   * @returns {MCPError} Resource not found error
   */
  createResourceNotFoundError(resourceType, resourcePath) {
    return new MCPError(
      MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
      `${resourceType} not found: ${resourcePath}`,
      {
        resourceType,
        resourcePath,
      }
    );
  }

  /**
   * Create timeout error
   * @param {string} operation - Operation that timed out
   * @param {number} timeout - Timeout value in milliseconds
   * @returns {MCPError} Timeout error
   */
  createTimeoutError(operation, timeout) {
    return new MCPError(
      MCP_ERROR_TYPES.TIMEOUT,
      `Operation '${operation}' timed out after ${timeout}ms`,
      {
        operation,
        timeout,
        isRetryable: true,
      }
    );
  }

  /**
   * Create internal error for unexpected issues
   * @param {string} message - Error message
   * @param {any} details - Additional error details
   * @returns {MCPError} Internal error
   */
  createInternalError(message, details = null) {
    return new MCPError(MCP_ERROR_TYPES.INTERNAL_ERROR, message, details);
  }

  /**
   * Map any error to appropriate MCP error type
   * @param {Error} error - Error to map
   * @param {string} context - Additional context
   * @returns {MCPError} Mapped MCP error
   */
  mapToMCPError(error, context = null) {
    // If it's already an MCPError, return as-is
    if (error instanceof MCPError) {
      return error;
    }

    // Handle specific error types
    if (error.name === 'ConfigurationError') {
      return this.createValidationError('configuration', error.message);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.createConnectionError(error.message, error);
    }

    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      return this.createTimeoutError(context || 'operation', error.timeout || 30000);
    }

    // Handle HTTP errors with status codes
    if (error.response && error.response.status) {
      return this.mapHttpError(error.response.status, error.response.data, context);
    }

    // Handle JasperReports-specific errors
    if (error.errorCode || (error.response && error.response.errorCode)) {
      const jasperError = error.errorCode ? error : error.response;
      return this.mapJasperError(jasperError, context);
    }

    // Default to internal error
    return this.createInternalError(context ? `${context}: ${error.message}` : error.message, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  /**
   * Log error with appropriate level and context
   * @param {Error|MCPError} error - Error to log
   * @param {string} context - Context where error occurred
   * @param {object} additionalData - Additional data to log
   */
  logError(error, context = null, additionalData = null) {
    const config = this.config;

    // Don't log if logging is disabled
    if (config.logLevel === 'none') {
      return;
    }

    const logData = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error.name,
        message: error.message,
        type: error.type || 'unknown',
        category: error.category || 'unknown',
        statusCode: error.statusCode,
      },
      additionalData,
    };

    // Track error counts for monitoring
    const errorKey = `${error.type || error.name}:${context || 'unknown'}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    this.lastErrors.set(errorKey, new Date());

    // Log based on error category and configuration
    if (this._shouldLogError(error, config)) {
      if (config.debugMode || config.logLevel === 'debug') {
        console.error('[Error Handler] Detailed error:', JSON.stringify(logData, null, 2));
        if (error.stack) {
          console.error('[Error Handler] Stack trace:', error.stack);
        }
      } else {
        console.error(`[Error Handler] ${context || 'Error'}: ${error.message}`);
      }
    }
  }

  /**
   * Get error statistics for monitoring
   * @returns {object} Error statistics
   */
  getErrorStatistics() {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByCategory: {},
      recentErrors: [],
      topErrors: [],
    };

    // Calculate totals and group by type/category
    for (const [key, count] of this.errorCounts.entries()) {
      stats.totalErrors += count;

      const [type] = key.split(':');
      stats.errorsByType[type] = (stats.errorsByType[type] || 0) + count;

      // Determine category from type
      const category = this._getCategoryFromType(type);
      stats.errorsByCategory[category] = (stats.errorsByCategory[category] || 0) + count;
    }

    // Get recent errors (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    for (const [key, lastOccurrence] of this.lastErrors.entries()) {
      if (lastOccurrence > tenMinutesAgo) {
        stats.recentErrors.push({
          error: key,
          lastOccurrence,
          count: this.errorCounts.get(key),
        });
      }
    }

    // Get top errors by count
    stats.topErrors = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ error: key, count }));

    return stats;
  }

  /**
   * Clear error statistics (useful for testing)
   */
  clearErrorStatistics() {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * Analyze and enhance permission-related errors using PermissionManager
   * @param {Error} error - Original error
   * @param {string} toolName - Name of the MCP tool
   * @param {string} operation - Operation being performed
   * @param {object} context - Additional context
   * @returns {MCPError} Enhanced MCP error with permission guidance
   */
  analyzePermissionError(error, toolName, operation = null, context = {}) {
    const statusCode = error.response?.status || error.statusCode;

    // Check if it's a permission-related error
    if (statusCode === 401 || statusCode === 403) {
      const analysis = this.permissionManager.analyzePermissionError(
        error,
        toolName,
        operation,
        context
      );

      if (analysis) {
        if (analysis.errorType === 'AUTHENTICATION_ERROR') {
          return this.createAuthenticationError(analysis.errorMessage, context.authType, {
            errorCode: analysis.errorCode,
            message: analysis.errorMessage,
          });
        } else {
          return this.createPermissionError(
            analysis.errorMessage,
            context.resourceUri,
            operation,
            toolName,
            error
          );
        }
      }
    }

    // Fall back to regular error mapping
    return this.mapHttpError(statusCode, error.response?.data, `${toolName}:${operation}`);
  }

  /**
   * Check if user has permissions for a specific tool
   * @param {string} toolName - Name of the MCP tool
   * @param {object} userPermissions - User's current permissions and roles
   * @returns {object} Permission check result
   */
  checkToolPermissions(toolName, userPermissions = {}) {
    return this.permissionManager.checkPermissions(toolName, userPermissions);
  }

  /**
   * Get permission requirements for a tool
   * @param {string} toolName - Name of the MCP tool
   * @returns {object} Permission requirements
   */
  getToolPermissionRequirements(toolName) {
    return this.permissionManager.getRequiredPermissions(toolName);
  }

  /**
   * Create error context for comprehensive error tracking
   * @param {string} toolName - Name of the MCP tool
   * @param {string} operation - Operation being performed
   * @param {object} parameters - Operation parameters
   * @returns {ErrorContext} New error context
   */
  createErrorContext(toolName, operation, parameters = {}) {
    return this.contextManager.createContext(toolName, operation, parameters);
  }

  /**
   * Enhanced validation error creation with context tracking
   * @param {string} field - Field name that failed validation
   * @param {string} message - Validation error message
   * @param {any} value - Invalid value
   * @param {string} constraint - Validation constraint that was violated
   * @param {ErrorContext} errorContext - Error context for tracking
   * @returns {MCPError} Enhanced validation error
   */
  createValidationErrorWithContext(
    field,
    message,
    value = null,
    constraint = null,
    errorContext = null
  ) {
    // Add validation error to context if provided
    if (errorContext) {
      errorContext.addValidationError(field, value, constraint, message);
    }

    return new MCPError(
      MCP_ERROR_TYPES.INVALID_PARAMS,
      `Validation failed for field '${field}': ${message}`,
      {
        field,
        value,
        constraint,
        validationType: 'parameter_validation',
        correlationId: errorContext?.correlationId,
      },
      400,
      errorContext?.correlationId
    );
  }

  /**
   * Enhanced HTTP error mapping with context tracking
   * @param {number} statusCode - HTTP status code
   * @param {any} responseData - Response data from server
   * @param {string} url - Request URL
   * @param {string} method - HTTP method
   * @param {object} requestHeaders - Request headers
   * @param {ErrorContext} errorContext - Error context for tracking
   * @returns {MCPError} Enhanced HTTP error
   */
  mapHttpErrorWithContext(
    statusCode,
    responseData = null,
    url = null,
    method = 'GET',
    requestHeaders = {},
    errorContext = null
  ) {
    // Add HTTP error to context if provided
    if (errorContext) {
      errorContext.addHttpError(statusCode, responseData, url, method, requestHeaders);
    }

    const mapping = HTTP_TO_MCP_ERROR_MAP[statusCode] || HTTP_TO_MCP_ERROR_MAP.default;

    // Extract message from response data
    const message = this._extractErrorMessage(responseData, statusCode);

    // Check for JasperReports-specific error patterns in the response
    const jasperMapping = this._findJasperErrorPattern(responseData);
    if (jasperMapping) {
      return new MCPError(
        jasperMapping.type,
        message,
        this._extractErrorDetails(responseData),
        statusCode,
        errorContext?.correlationId
      );
    }

    // Use HTTP status code mapping
    return new MCPError(
      mapping.type,
      message,
      this._extractErrorDetails(responseData),
      statusCode,
      errorContext?.correlationId
    );
  }

  /**
   * Enhanced JasperReports error mapping with context tracking
   * @param {object} jasperError - JasperReports error response
   * @param {string} context - Additional context about the operation
   * @param {ErrorContext} errorContext - Error context for tracking
   * @returns {MCPError} Enhanced JasperReports error
   */
  mapJasperErrorWithContext(jasperError, context = null, errorContext = null) {
    // Add JasperReports error to context if provided
    if (errorContext) {
      errorContext.addJasperError(jasperError, context);
    }

    if (!jasperError || typeof jasperError !== 'object') {
      return this.createInternalError('Invalid JasperReports error response', { jasperError });
    }

    const errorCode = jasperError.errorCode || jasperError.code || 'unknown.error';
    const message =
      jasperError.message || jasperError.errorMessage || 'Unknown JasperReports error';

    // Find matching error pattern
    const mapping = this._findJasperErrorPattern({ errorCode, message });

    let finalMessage = message;
    if (context) {
      finalMessage = `${context}: ${message}`;
    }

    if (mapping) {
      return new MCPError(
        mapping.type,
        finalMessage,
        {
          jasperErrorCode: errorCode,
          jasperMessage: message,
          parameters: jasperError.parameters,
          errorUid: jasperError.errorUid,
          correlationId: errorContext?.correlationId,
        },
        null,
        errorContext?.correlationId
      );
    }

    // Default to internal error for unknown JasperReports errors
    return new MCPError(
      MCP_ERROR_TYPES.INTERNAL_ERROR,
      finalMessage,
      {
        jasperErrorCode: errorCode,
        jasperMessage: message,
        parameters: jasperError.parameters,
        errorUid: jasperError.errorUid,
        correlationId: errorContext?.correlationId,
      },
      null,
      errorContext?.correlationId
    );
  }

  /**
   * Create structured error response with context information
   * @param {MCPError} error - MCP error to format
   * @param {ErrorContext} errorContext - Error context with additional information
   * @param {boolean} includeDebugInfo - Whether to include debug information
   * @returns {object} Structured error response
   */
  createStructuredErrorResponse(error, errorContext = null, includeDebugInfo = false) {
    const response = {
      success: false,
      error: {
        type: error.type,
        message: error.message,
        category: error.category,
        correlationId: error.correlationId || errorContext?.correlationId,
        timestamp: error.timestamp,
      },
    };

    // Add error details if available
    if (error.details) {
      response.error.details = error.details;
    }

    // Add status code if available
    if (error.statusCode) {
      response.error.statusCode = error.statusCode;
    }

    // Add context information if available
    if (errorContext) {
      response.toolName = errorContext.toolName;
      response.operation = errorContext.operation;
      response.executionTime = errorContext.calculateTotalTime();

      // Add tool-specific guidance
      const guidance = errorContext.generateToolGuidance();
      if (guidance.suggestions.length > 0 || guidance.troubleshooting.length > 0) {
        response.guidance = guidance;
      }

      // Add debug information if requested or in debug mode
      if (includeDebugInfo || this.config.debugMode) {
        response.debugInfo = errorContext.toStructuredResponse(true).debugInfo;
      }
    }

    return response;
  }

  /**
   * Log error with enhanced context information
   * @param {Error|MCPError} error - Error to log
   * @param {ErrorContext} errorContext - Error context with additional information
   * @param {object} additionalData - Additional data to log
   */
  logErrorWithContext(error, errorContext = null, additionalData = null) {
    const config = this.config;

    // Don't log if logging is disabled
    if (config.logLevel === 'none') {
      return;
    }

    // Use error context for enhanced logging if available
    if (errorContext) {
      errorContext.logContext(config.logLevel || 'error');

      // Track error in context manager statistics
      this.contextManager.getStatistics();
    } else {
      // Fall back to regular logging
      this.logError(error, 'unknown', additionalData);
    }

    // Track error counts for monitoring
    const errorKey = `${error.type || error.name}:${errorContext?.toolName || 'unknown'}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    this.lastErrors.set(errorKey, new Date());
  }

  /**
   * Get enhanced error statistics including context information
   * @returns {object} Enhanced error statistics
   */
  getEnhancedErrorStatistics() {
    const basicStats = this.getErrorStatistics();
    const contextStats = this.contextManager.getStatistics();

    return {
      ...basicStats,
      contextStatistics: contextStats,
      correlationTracking: {
        activeContexts: contextStats.totalContexts,
        contextsWithErrors: contextStats.contextsWithErrors,
        errorRate: contextStats.errorRate,
      },
    };
  }

  /**
   * Extract error message from various response formats
   * @private
   */
  _extractErrorMessage(responseData, statusCode) {
    // Default message based on status code
    const defaultMessage = `HTTP ${statusCode} error`;

    if (!responseData) {
      return defaultMessage;
    }

    // Handle string responses
    if (typeof responseData === 'string') {
      return responseData || defaultMessage;
    }

    // Handle object responses
    if (typeof responseData === 'object') {
      // Try various common error message fields
      const messageFields = ['message', 'errorMessage', 'error', 'description', 'detail'];

      for (const field of messageFields) {
        if (responseData[field] && typeof responseData[field] === 'string') {
          return responseData[field];
        }
      }

      // Try to extract from nested error objects
      if (responseData.error && typeof responseData.error === 'object') {
        return this._extractErrorMessage(responseData.error, statusCode);
      }

      // If it's an array, try to extract from first element
      if (Array.isArray(responseData) && responseData.length > 0) {
        return this._extractErrorMessage(responseData[0], statusCode);
      }
    }

    return defaultMessage;
  }

  /**
   * Extract detailed error information from response
   * @private
   */
  _extractErrorDetails(responseData) {
    if (!responseData || typeof responseData !== 'object') {
      return null;
    }

    const details = {};

    // Extract common fields
    const detailFields = [
      'errorCode',
      'code',
      'parameters',
      'errorUid',
      'timestamp',
      'path',
      'method',
    ];

    for (const field of detailFields) {
      if (responseData[field] !== undefined) {
        details[field] = responseData[field];
      }
    }

    return Object.keys(details).length > 0 ? details : null;
  }

  /**
   * Find JasperReports error pattern in response data
   * @private
   */
  _findJasperErrorPattern(responseData) {
    if (!responseData) {
      return null;
    }

    const errorCode = responseData.errorCode || responseData.code;
    const message = responseData.message || responseData.errorMessage || '';

    // Check exact error code matches
    if (errorCode && JASPER_ERROR_PATTERNS[errorCode]) {
      return JASPER_ERROR_PATTERNS[errorCode];
    }

    // Check message patterns
    for (const [pattern, mapping] of Object.entries(JASPER_ERROR_PATTERNS)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return mapping;
      }
    }

    return null;
  }

  /**
   * Determine if error should be logged based on configuration
   * @private
   */
  _shouldLogError(error, config) {
    const logLevel = config.logLevel || 'info';

    // Always log in debug mode
    if (config.debugMode || logLevel === 'debug') {
      return true;
    }

    // Log based on error category and log level
    const category = error.category || ERROR_CATEGORIES.INTERNAL;

    switch (logLevel) {
      case 'error':
        return category === ERROR_CATEGORIES.INTERNAL;
      case 'warn':
        return [ERROR_CATEGORIES.INTERNAL, ERROR_CATEGORIES.CONNECTION].includes(category);
      case 'info':
        return true; // Log all errors at info level
      case 'trace':
        return true;
      default:
        return true;
    }
  }

  /**
   * Get error category from error type
   * @private
   */
  _getCategoryFromType(type) {
    for (const [category, types] of Object.entries({
      [ERROR_CATEGORIES.AUTHENTICATION]: [MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED],
      [ERROR_CATEGORIES.PERMISSION]: [MCP_ERROR_TYPES.PERMISSION_DENIED],
      [ERROR_CATEGORIES.VALIDATION]: [
        MCP_ERROR_TYPES.INVALID_REQUEST,
        MCP_ERROR_TYPES.INVALID_PARAMS,
      ],
      [ERROR_CATEGORIES.RESOURCE]: [
        MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
        MCP_ERROR_TYPES.METHOD_NOT_FOUND,
      ],
      [ERROR_CATEGORIES.CONNECTION]: [MCP_ERROR_TYPES.SERVICE_UNAVAILABLE],
      [ERROR_CATEGORIES.TIMEOUT]: [MCP_ERROR_TYPES.TIMEOUT],
      [ERROR_CATEGORIES.RATE_LIMIT]: [MCP_ERROR_TYPES.RATE_LIMITED],
    })) {
      if (types.includes(type)) {
        return category;
      }
    }
    return ERROR_CATEGORIES.INTERNAL;
  }
}

// Create default error handler instance
let defaultErrorHandler = null;

/**
 * Get default error handler instance
 * @returns {ErrorHandler} Default error handler
 */
function getErrorHandler() {
  if (!defaultErrorHandler) {
    defaultErrorHandler = new ErrorHandler();
  }
  return defaultErrorHandler;
}

/**
 * Convenience function to map HTTP errors
 * @param {number} statusCode - HTTP status code
 * @param {any} responseData - Response data
 * @param {string} context - Error context
 * @param {object} config - Optional configuration
 * @returns {MCPError} Mapped error
 */
function mapHttpError(statusCode, responseData, context, config = null) {
  const handler = config ? new ErrorHandler(config) : getErrorHandler();
  return handler.mapHttpError(statusCode, responseData, context);
}

/**
 * Convenience function to map JasperReports errors
 * @param {object} jasperError - JasperReports error response
 * @param {string} context - Error context
 * @param {object} config - Optional configuration
 * @returns {MCPError} Mapped error
 */
function mapJasperError(jasperError, context, config = null) {
  const handler = config ? new ErrorHandler(config) : getErrorHandler();
  return handler.mapJasperError(jasperError, context);
}

/**
 * Convenience function to create validation errors
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @param {any} value - Invalid value
 * @param {string} constraint - Validation constraint
 * @param {object} config - Optional configuration
 * @returns {MCPError} Validation error
 */
function createValidationError(field, message, value, constraint, config = null) {
  const handler = config ? new ErrorHandler(config) : getErrorHandler();
  return handler.createValidationError(field, message, value, constraint);
}

/**
 * Convenience function to log errors
 * @param {Error} error - Error to log
 * @param {string} context - Error context
 * @param {object} additionalData - Additional data
 * @param {object} config - Optional configuration
 */
function logError(error, context, additionalData, config = null) {
  const handler = config ? new ErrorHandler(config) : getErrorHandler();
  handler.logError(error, context, additionalData);
}

export {
  ErrorHandler,
  MCPError,
  MCP_ERROR_TYPES,
  ERROR_CATEGORIES,
  getErrorHandler,
  mapHttpError,
  mapJasperError,
  createValidationError,
  logError,
};
