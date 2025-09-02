/**
 * ErrorContext class for comprehensive error tracking and debugging
 *
 * This module provides enhanced error context tracking with correlation IDs,
 * detailed logging capabilities, and structured error information for debugging.
 */

import { v4 as uuidv4 } from 'uuid';
import { getConfiguration } from '../config/environment.js';

/**
 * ErrorContext class for tracking comprehensive error information
 */
class ErrorContext {
  constructor(toolName, operation, parameters = {}) {
    this.correlationId = uuidv4();
    this.toolName = toolName;
    this.operation = operation;
    this.parameters = this._sanitizeParameters(parameters);
    this.timestamp = new Date().toISOString();
    this.executionStartTime = Date.now();

    // Error tracking
    this.validationErrors = [];
    this.httpErrors = [];
    this.jasperErrors = [];
    this.systemErrors = [];

    // Context information
    this.validationSteps = [];
    this.executionSteps = [];
    this.metadata = {};

    // Performance tracking
    this.performanceMetrics = {
      validationTime: 0,
      executionTime: 0,
      totalTime: 0,
    };

    // Configuration
    this.config = getConfiguration();
    this.debugMode = this.config.debugMode || false;
  }

  /**
   * Add validation error with detailed context
   * @param {string} field - Field that failed validation
   * @param {any} value - Value that failed validation
   * @param {string} constraint - Validation constraint that was violated
   * @param {string} message - Detailed error message
   * @param {string} expectedFormat - Expected format or type
   */
  addValidationError(field, value, constraint, message, expectedFormat = null) {
    const validationError = {
      field,
      value: this._sanitizeValue(value),
      constraint,
      message,
      expectedFormat,
      timestamp: new Date().toISOString(),
    };

    this.validationErrors.push(validationError);

    if (this.debugMode) {
      this._logDebug('Validation Error', validationError);
    }
  }

  /**
   * Add HTTP error with response details
   * @param {number} statusCode - HTTP status code
   * @param {any} responseData - Response data from server
   * @param {string} url - Request URL
   * @param {string} method - HTTP method
   * @param {object} requestHeaders - Request headers (sanitized)
   */
  addHttpError(statusCode, responseData, url, method = 'GET', requestHeaders = {}) {
    const httpError = {
      statusCode,
      responseData: this._sanitizeResponseData(responseData),
      url: this._sanitizeUrl(url),
      method,
      requestHeaders: this._sanitizeHeaders(requestHeaders),
      timestamp: new Date().toISOString(),
    };

    this.httpErrors.push(httpError);

    if (this.debugMode) {
      this._logDebug('HTTP Error', httpError);
    }
  }

  /**
   * Add JasperReports-specific error
   * @param {object} jasperError - JasperReports error response
   * @param {string} context - Additional context about the operation
   */
  addJasperError(jasperError, context = null) {
    const error = {
      errorCode: jasperError.errorCode,
      message: jasperError.message,
      parameters: jasperError.parameters || [],
      errorUid: jasperError.errorUid,
      context,
      timestamp: new Date().toISOString(),
    };

    this.jasperErrors.push(error);

    if (this.debugMode) {
      this._logDebug('JasperReports Error', error);
    }
  }

  /**
   * Add system error (network, timeout, etc.)
   * @param {Error} error - System error object
   * @param {string} category - Error category (network, timeout, etc.)
   * @param {object} additionalContext - Additional context information
   */
  addSystemError(error, category, additionalContext = {}) {
    const systemError = {
      name: error.name,
      message: error.message,
      code: error.code,
      category,
      stack: this.debugMode ? error.stack : null,
      additionalContext,
      timestamp: new Date().toISOString(),
    };

    this.systemErrors.push(systemError);

    if (this.debugMode) {
      this._logDebug('System Error', systemError);
    }
  }

  /**
   * Add validation step for debugging
   * @param {string} step - Validation step description
   * @param {boolean} success - Whether the step succeeded
   * @param {any} details - Additional step details
   */
  addValidationStep(step, success, details = null) {
    const validationStep = {
      step,
      success,
      details: this._sanitizeValue(details),
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.executionStartTime,
    };

    this.validationSteps.push(validationStep);

    if (this.debugMode) {
      this._logDebug('Validation Step', validationStep);
    }
  }

  /**
   * Add execution step for debugging
   * @param {string} step - Execution step description
   * @param {boolean} success - Whether the step succeeded
   * @param {any} result - Step result or error
   * @param {number} duration - Step duration in milliseconds
   */
  addExecutionStep(step, success, result = null, duration = 0) {
    const executionStep = {
      step,
      success,
      result: this._sanitizeValue(result),
      duration,
      timestamp: new Date().toISOString(),
    };

    this.executionSteps.push(executionStep);

    if (this.debugMode) {
      this._logDebug('Execution Step', executionStep);
    }
  }

  /**
   * Add metadata information
   * @param {string} key - Metadata key
   * @param {any} value - Metadata value
   */
  addMetadata(key, value) {
    this.metadata[key] = this._sanitizeValue(value);
  }

  /**
   * Update performance metrics
   * @param {string} metric - Metric name (validationTime, executionTime, etc.)
   * @param {number} value - Metric value in milliseconds
   */
  updatePerformanceMetric(metric, value) {
    if (Object.prototype.hasOwnProperty.call(this.performanceMetrics, metric)) {
      this.performanceMetrics[metric] = value;
    }
  }

  /**
   * Calculate total execution time
   */
  calculateTotalTime() {
    this.performanceMetrics.totalTime = Date.now() - this.executionStartTime;
    return this.performanceMetrics.totalTime;
  }

  /**
   * Get error summary for logging and reporting
   * @returns {object} Error summary
   */
  getErrorSummary() {
    return {
      correlationId: this.correlationId,
      toolName: this.toolName,
      operation: this.operation,
      hasErrors: this.hasErrors(),
      errorCounts: {
        validation: this.validationErrors.length,
        http: this.httpErrors.length,
        jasper: this.jasperErrors.length,
        system: this.systemErrors.length,
      },
      totalExecutionTime: this.calculateTotalTime(),
      timestamp: this.timestamp,
    };
  }

  /**
   * Check if context has any errors
   * @returns {boolean} True if there are any errors
   */
  hasErrors() {
    return (
      this.validationErrors.length > 0 ||
      this.httpErrors.length > 0 ||
      this.jasperErrors.length > 0 ||
      this.systemErrors.length > 0
    );
  }

  /**
   * Get the most severe error from the context
   * @returns {object|null} Most severe error or null if no errors
   */
  getMostSevereError() {
    // Priority: System errors > HTTP errors > JasperReports errors > Validation errors
    if (this.systemErrors.length > 0) {
      return { type: 'system', error: this.systemErrors[0] };
    }
    if (this.httpErrors.length > 0) {
      return { type: 'http', error: this.httpErrors[0] };
    }
    if (this.jasperErrors.length > 0) {
      return { type: 'jasper', error: this.jasperErrors[0] };
    }
    if (this.validationErrors.length > 0) {
      return { type: 'validation', error: this.validationErrors[0] };
    }
    return null;
  }

  /**
   * Generate structured error response
   * @param {boolean} includeDebugInfo - Whether to include debug information
   * @returns {object} Structured error response
   */
  toStructuredResponse(includeDebugInfo = false) {
    const response = {
      success: false,
      correlationId: this.correlationId,
      toolName: this.toolName,
      operation: this.operation,
      timestamp: this.timestamp,
      executionTime: this.calculateTotalTime(),
      errorSummary: this.getErrorSummary(),
    };

    // Add error details based on debug mode or explicit request
    if (includeDebugInfo || this.debugMode) {
      response.debugInfo = {
        validationErrors: this.validationErrors,
        httpErrors: this.httpErrors,
        jasperErrors: this.jasperErrors,
        systemErrors: this.systemErrors,
        validationSteps: this.validationSteps,
        executionSteps: this.executionSteps,
        performanceMetrics: this.performanceMetrics,
        metadata: this.metadata,
      };
    }

    return response;
  }

  /**
   * Generate user-friendly error message
   * @returns {string} User-friendly error message
   */
  generateUserFriendlyMessage() {
    const mostSevere = this.getMostSevereError();

    if (!mostSevere) {
      return 'Operation completed successfully';
    }

    const { type, error } = mostSevere;

    switch (type) {
      case 'validation':
        return `Validation failed for field '${error.field}': ${error.message}`;
      case 'http':
        return `HTTP ${error.statusCode} error: ${this._extractErrorMessage(error.responseData)}`;
      case 'jasper':
        return `JasperReports error (${error.errorCode}): ${error.message}`;
      case 'system':
        return `System error: ${error.message}`;
      default:
        return 'An unexpected error occurred';
    }
  }

  /**
   * Generate tool-specific guidance based on errors
   * @returns {object} Tool-specific guidance
   */
  generateToolGuidance() {
    const guidance = {
      toolName: this.toolName,
      operation: this.operation,
      suggestions: [],
      troubleshooting: [],
      documentation: [],
    };

    // Add guidance based on error types
    if (this.validationErrors.length > 0) {
      guidance.suggestions.push('Check parameter formats and required fields');
      guidance.troubleshooting.push('Review tool documentation for parameter requirements');
    }

    if (this.httpErrors.some(e => e.statusCode === 401)) {
      guidance.suggestions.push('Verify authentication credentials');
      guidance.troubleshooting.push('Use jasper_authenticate tool to establish session');
    }

    if (this.httpErrors.some(e => e.statusCode === 403)) {
      guidance.suggestions.push('Check user permissions for this operation');
      guidance.troubleshooting.push('Contact JasperReports administrator for required permissions');
    }

    if (this.httpErrors.some(e => e.statusCode === 404)) {
      guidance.suggestions.push('Verify resource path and existence');
      guidance.troubleshooting.push('Use jasper_list_resources to check available resources');
    }

    if (this.systemErrors.some(e => e.category === 'network')) {
      guidance.suggestions.push('Check network connectivity to JasperReports Server');
      guidance.troubleshooting.push('Verify server URL and network configuration');
    }

    // Add tool-specific guidance
    guidance.documentation.push(`See tool documentation for ${this.toolName}`);

    return guidance;
  }

  /**
   * Log error context with appropriate detail level
   * @param {string} logLevel - Log level (error, warn, info, debug)
   */
  logContext(logLevel = 'error') {
    const summary = this.getErrorSummary();

    if (this.debugMode || logLevel === 'debug') {
      console.log(
        `[ErrorContext] [${logLevel.toUpperCase()}] Detailed context:`,
        JSON.stringify(this.toStructuredResponse(true), null, 2)
      );
    } else {
      console.log(
        `[ErrorContext] [${logLevel.toUpperCase()}] ${this.toolName}:${this.operation} - ` +
          `Correlation ID: ${this.correlationId}, Errors: ${summary.errorCounts.validation + summary.errorCounts.http + summary.errorCounts.jasper + summary.errorCounts.system}, ` +
          `Duration: ${summary.totalExecutionTime}ms`
      );
    }
  }

  /**
   * Sanitize parameters to remove sensitive information
   * @private
   */
  _sanitizeParameters(parameters) {
    const sanitized = { ...parameters };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credential'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize value to prevent logging sensitive information
   * @private
   */
  _sanitizeValue(value) {
    if (typeof value === 'string' && value.length > 1000) {
      return value.substring(0, 1000) + '... [TRUNCATED]';
    }

    if (typeof value === 'object' && value !== null) {
      return this._sanitizeParameters(value);
    }

    return value;
  }

  /**
   * Sanitize response data
   * @private
   */
  _sanitizeResponseData(responseData) {
    if (typeof responseData === 'string' && responseData.length > 2000) {
      return responseData.substring(0, 2000) + '... [TRUNCATED]';
    }

    if (typeof responseData === 'object' && responseData !== null) {
      return this._sanitizeParameters(responseData);
    }

    return responseData;
  }

  /**
   * Sanitize URL to remove sensitive query parameters
   * @private
   */
  _sanitizeUrl(url) {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['password', 'token', 'apiKey', 'secret'];

      for (const param of sensitiveParams) {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Sanitize headers to remove sensitive information
   * @private
   */
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Extract error message from response data
   * @private
   */
  _extractErrorMessage(responseData) {
    if (typeof responseData === 'string') {
      return responseData;
    }

    if (typeof responseData === 'object' && responseData !== null) {
      return (
        responseData.message || responseData.errorMessage || responseData.error || 'Unknown error'
      );
    }

    return 'Unknown error';
  }

  /**
   * Log debug information
   * @private
   */
  _logDebug(type, data) {
    if (this.debugMode) {
      console.log(
        `[ErrorContext] [DEBUG] ${this.correlationId} - ${type}:`,
        JSON.stringify(data, null, 2)
      );
    }
  }
}

/**
 * ErrorContextManager for managing multiple error contexts
 */
class ErrorContextManager {
  constructor() {
    this.contexts = new Map();
    this.maxContexts = 1000; // Prevent memory leaks
  }

  /**
   * Create new error context
   * @param {string} toolName - Name of the MCP tool
   * @param {string} operation - Operation being performed
   * @param {object} parameters - Operation parameters
   * @returns {ErrorContext} New error context
   */
  createContext(toolName, operation, parameters = {}) {
    const context = new ErrorContext(toolName, operation, parameters);

    // Clean up old contexts if we have too many
    if (this.contexts.size >= this.maxContexts) {
      const oldestKey = this.contexts.keys().next().value;
      this.contexts.delete(oldestKey);
    }

    this.contexts.set(context.correlationId, context);
    return context;
  }

  /**
   * Get context by correlation ID
   * @param {string} correlationId - Correlation ID
   * @returns {ErrorContext|null} Error context or null if not found
   */
  getContext(correlationId) {
    return this.contexts.get(correlationId) || null;
  }

  /**
   * Remove context
   * @param {string} correlationId - Correlation ID
   */
  removeContext(correlationId) {
    this.contexts.delete(correlationId);
  }

  /**
   * Get all active contexts
   * @returns {Array<ErrorContext>} Array of active contexts
   */
  getAllContexts() {
    return Array.from(this.contexts.values());
  }

  /**
   * Get contexts with errors
   * @returns {Array<ErrorContext>} Array of contexts with errors
   */
  getContextsWithErrors() {
    return this.getAllContexts().filter(context => context.hasErrors());
  }

  /**
   * Clear all contexts
   */
  clearAll() {
    this.contexts.clear();
  }

  /**
   * Get statistics about error contexts
   * @returns {object} Context statistics
   */
  getStatistics() {
    const allContexts = this.getAllContexts();
    const contextsWithErrors = this.getContextsWithErrors();

    return {
      totalContexts: allContexts.length,
      contextsWithErrors: contextsWithErrors.length,
      errorRate: allContexts.length > 0 ? contextsWithErrors.length / allContexts.length : 0,
      averageExecutionTime: this._calculateAverageExecutionTime(allContexts),
      toolUsage: this._calculateToolUsage(allContexts),
      errorsByType: this._calculateErrorsByType(contextsWithErrors),
    };
  }

  /**
   * Calculate average execution time
   * @private
   */
  _calculateAverageExecutionTime(contexts) {
    if (contexts.length === 0) return 0;

    const totalTime = contexts.reduce((sum, context) => {
      return sum + context.calculateTotalTime();
    }, 0);

    return totalTime / contexts.length;
  }

  /**
   * Calculate tool usage statistics
   * @private
   */
  _calculateToolUsage(contexts) {
    const usage = {};

    for (const context of contexts) {
      const key = `${context.toolName}:${context.operation}`;
      usage[key] = (usage[key] || 0) + 1;
    }

    return usage;
  }

  /**
   * Calculate errors by type
   * @private
   */
  _calculateErrorsByType(contexts) {
    const errorsByType = {
      validation: 0,
      http: 0,
      jasper: 0,
      system: 0,
    };

    for (const context of contexts) {
      errorsByType.validation += context.validationErrors.length;
      errorsByType.http += context.httpErrors.length;
      errorsByType.jasper += context.jasperErrors.length;
      errorsByType.system += context.systemErrors.length;
    }

    return errorsByType;
  }
}

// Create default error context manager
let defaultContextManager = null;

/**
 * Get default error context manager
 * @returns {ErrorContextManager} Default context manager
 */
function getErrorContextManager() {
  if (!defaultContextManager) {
    defaultContextManager = new ErrorContextManager();
  }
  return defaultContextManager;
}

export { ErrorContext, ErrorContextManager, getErrorContextManager };
