/**
 * Error model definitions for JasperReports MCP Server
 * These models define the structure for all error responses and MCP error mappings
 */

/**
 * Base MCP Error class
 */
class MCPError extends Error {
  constructor(code, message, details = null, statusCode = null) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Specific MCP Error types based on MCP protocol specification
 */
class InvalidRequestError extends MCPError {
  constructor(message, details = null, statusCode = 400) {
    super('InvalidRequest', message, details, statusCode);
    this.name = 'InvalidRequestError';
  }
}

class AuthenticationRequiredError extends MCPError {
  constructor(message = 'Authentication required', details = null, statusCode = 401) {
    super('AuthenticationRequired', message, details, statusCode);
    this.name = 'AuthenticationRequiredError';
  }
}

class PermissionDeniedError extends MCPError {
  constructor(message = 'Permission denied', details = null, statusCode = 403) {
    super('PermissionDenied', message, details, statusCode);
    this.name = 'PermissionDeniedError';
  }
}

class ResourceNotFoundError extends MCPError {
  constructor(message = 'Resource not found', details = null, statusCode = 404) {
    super('ResourceNotFound', message, details, statusCode);
    this.name = 'ResourceNotFoundError';
  }
}

class ResourceConflictError extends MCPError {
  constructor(message = 'Resource conflict', details = null, statusCode = 409) {
    super('ResourceConflict', message, details, statusCode);
    this.name = 'ResourceConflictError';
  }
}

class InternalError extends MCPError {
  constructor(message = 'Internal server error', details = null, statusCode = 500) {
    super('InternalError', message, details, statusCode);
    this.name = 'InternalError';
  }
}

class ServiceUnavailableError extends MCPError {
  constructor(message = 'Service unavailable', details = null, statusCode = 503) {
    super('ServiceUnavailable', message, details, statusCode);
    this.name = 'ServiceUnavailableError';
  }
}

class ValidationError extends MCPError {
  constructor(message, validationResults = [], statusCode = 400) {
    super('InvalidParams', message, { validationResults }, statusCode);
    this.name = 'ValidationError';
    this.type = 'InvalidParams'; // MCP protocol type
    this.validationResults = validationResults;
  }
}

class ConnectionError extends MCPError {
  constructor(message = 'Connection error', details = null, statusCode = null) {
    super('ConnectionError', message, details, statusCode);
    this.name = 'ConnectionError';
  }
}

class TimeoutError extends MCPError {
  constructor(message = 'Request timeout', details = null, statusCode = 408) {
    super('TimeoutError', message, details, statusCode);
    this.name = 'TimeoutError';
  }
}

/**
 * JasperReports specific error response structure
 */
class JasperErrorResponse {
  constructor(data = {}) {
    this.errorCode = data.errorCode;
    this.message = data.message;
    this.parameters = data.parameters || [];
    this.errorUid = data.errorUid;
    this.properties = data.properties || {};
  }
}

/**
 * Validation error details for specific fields
 */
class FieldValidationError {
  constructor(field, value, constraint, message) {
    this.field = field;
    this.value = value;
    this.constraint = constraint;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Authentication error details
 */
class AuthenticationErrorDetails {
  constructor(data = {}) {
    this.authMethod = data.authMethod;
    this.username = data.username;
    this.organization = data.organization;
    this.reason = data.reason; // invalid_credentials, expired_session, account_locked, etc.
    this.retryAfter = data.retryAfter;
    this.supportedMethods = data.supportedMethods || [];
  }
}

/**
 * Resource error details
 */
class ResourceErrorDetails {
  constructor(data = {}) {
    this.resourceUri = data.resourceUri;
    this.resourceType = data.resourceType;
    this.operation = data.operation; // create, read, update, delete
    this.reason = data.reason; // not_found, access_denied, invalid_type, etc.
    this.conflictingResource = data.conflictingResource;
    this.requiredPermissions = data.requiredPermissions || [];
  }
}

/**
 * Execution error details
 */
class ExecutionErrorDetails {
  constructor(data = {}) {
    this.executionId = data.executionId;
    this.reportUri = data.reportUri;
    this.phase = data.phase; // validation, compilation, execution, export
    this.errorType = data.errorType; // parameter_error, compilation_error, data_error, etc.
    this.lineNumber = data.lineNumber;
    this.columnNumber = data.columnNumber;
    this.stackTrace = data.stackTrace;
    this.parameters = data.parameters || {};
  }
}

/**
 * Network error details
 */
class NetworkErrorDetails {
  constructor(data = {}) {
    this.url = data.url;
    this.method = data.method;
    this.statusCode = data.statusCode;
    this.responseTime = data.responseTime;
    this.retryAttempt = data.retryAttempt || 0;
    this.maxRetries = data.maxRetries || 3;
    this.cause = data.cause; // timeout, connection_refused, dns_error, etc.
  }
}

/**
 * Configuration error details
 */
class ConfigurationErrorDetails {
  constructor(data = {}) {
    this.configKey = data.configKey;
    this.configValue = data.configValue;
    this.expectedType = data.expectedType;
    this.validValues = data.validValues || [];
    this.reason = data.reason; // missing, invalid_format, out_of_range, etc.
  }
}

/**
 * Error mapping utilities
 */
class ErrorMapper {
  /**
   * Maps HTTP status codes to MCP error types
   */
  static mapHttpStatusToMCPError(statusCode, message, details = null) {
    switch (statusCode) {
      case 400:
        return new InvalidRequestError(message, details, statusCode);
      case 401:
        return new AuthenticationRequiredError(message, details, statusCode);
      case 403:
        return new PermissionDeniedError(message, details, statusCode);
      case 404:
        return new ResourceNotFoundError(message, details, statusCode);
      case 408:
        return new TimeoutError(message, details, statusCode);
      case 409:
        return new ResourceConflictError(message, details, statusCode);
      case 500:
        return new InternalError(message, details, statusCode);
      case 503:
        return new ServiceUnavailableError(message, details, statusCode);
      default:
        return new MCPError('UnknownError', message, details, statusCode);
    }
  }

  /**
   * Maps JasperReports error codes to MCP errors
   */
  static mapJasperErrorToMCPError(jasperError) {
    const { errorCode, message, parameters = [] } = jasperError;

    // Common JasperReports error code mappings
    const errorMappings = {
      'resource.not.found': () => new ResourceNotFoundError(message, { jasperError }),
      'access.denied': () => new PermissionDeniedError(message, { jasperError }),
      'invalid.credentials': () => new AuthenticationRequiredError(message, { jasperError }),
      'resource.already.exists': () => new ResourceConflictError(message, { jasperError }),
      'validation.error': () => new ValidationError(message, parameters),
      'compilation.error': () => new InvalidRequestError(message, { jasperError }),
      'parameter.error': () => new InvalidRequestError(message, { jasperError }),
      'datasource.error': () => new InternalError(message, { jasperError }),
      'export.error': () => new InternalError(message, { jasperError }),
      'job.not.found': () => new ResourceNotFoundError(message, { jasperError }),
      'user.not.found': () => new ResourceNotFoundError(message, { jasperError }),
      'role.not.found': () => new ResourceNotFoundError(message, { jasperError }),
      'domain.not.found': () => new ResourceNotFoundError(message, { jasperError }),
    };

    const errorFactory = errorMappings[errorCode];
    if (errorFactory) {
      return errorFactory();
    }

    // Default mapping based on error code patterns
    if (errorCode.includes('not.found')) {
      return new ResourceNotFoundError(message, { jasperError });
    }
    if (errorCode.includes('access') || errorCode.includes('permission')) {
      return new PermissionDeniedError(message, { jasperError });
    }
    if (errorCode.includes('validation') || errorCode.includes('invalid')) {
      return new InvalidRequestError(message, { jasperError });
    }
    if (errorCode.includes('authentication') || errorCode.includes('credentials')) {
      return new AuthenticationRequiredError(message, { jasperError });
    }

    // Default to internal error for unknown JasperReports errors
    return new InternalError(message, { jasperError });
  }

  /**
   * Creates a validation error with multiple field errors
   */
  static createValidationError(fieldErrors) {
    const message = `Validation failed for ${fieldErrors.length} field(s)`;
    return new ValidationError(message, fieldErrors);
  }

  /**
   * Creates a connection error with network details
   */
  static createConnectionError(cause, networkDetails) {
    const message = `Connection failed: ${cause}`;
    return new ConnectionError(message, { networkDetails, cause });
  }

  /**
   * Creates a configuration error
   */
  static createConfigurationError(configKey, reason, details = {}) {
    const message = `Configuration error for ${configKey}: ${reason}`;
    const configDetails = new ConfigurationErrorDetails({
      configKey,
      reason,
      ...details,
    });
    return new InvalidRequestError(message, { configDetails });
  }
}

/**
 * Error severity levels
 */
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Error categories for classification
 */
const ErrorCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  RESOURCE: 'resource',
  EXECUTION: 'execution',
  NETWORK: 'network',
  CONFIGURATION: 'configuration',
  INTERNAL: 'internal',
};

export {
  // Base error classes
  MCPError,
  InvalidRequestError,
  AuthenticationRequiredError,
  PermissionDeniedError,
  ResourceNotFoundError,
  ResourceConflictError,
  InternalError,
  ServiceUnavailableError,
  ValidationError,
  ConnectionError,
  TimeoutError,

  // JasperReports specific structures
  JasperErrorResponse,

  // Error detail classes
  FieldValidationError,
  AuthenticationErrorDetails,
  ResourceErrorDetails,
  ExecutionErrorDetails,
  NetworkErrorDetails,
  ConfigurationErrorDetails,

  // Utilities
  ErrorMapper,
  ErrorSeverity,
  ErrorCategory,
};
