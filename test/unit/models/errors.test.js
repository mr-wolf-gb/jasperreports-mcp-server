/**
 * Unit tests for Error Models
 */

import {
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
  JasperErrorResponse,
  FieldValidationError,
  AuthenticationErrorDetails,
  ResourceErrorDetails,
  ExecutionErrorDetails,
  NetworkErrorDetails,
  ConfigurationErrorDetails,
  ErrorMapper,
  ErrorSeverity,
  ErrorCategory,
} from '../../../src/models/errors.js';

describe('Error Models', () => {
  describe('MCPError', () => {
    test('should create with required parameters', () => {
      const error = new MCPError('TestError', 'Test message');

      expect(error.name).toBe('MCPError');
      expect(error.code).toBe('TestError');
      expect(error.message).toBe('Test message');
      expect(error.details).toBeNull();
      expect(error.statusCode).toBeNull();
      expect(error.timestamp).toBeDefined();
      expect(error instanceof Error).toBe(true);
    });

    test('should create with all parameters', () => {
      const details = { field: 'username' };
      const error = new MCPError('ValidationError', 'Validation failed', details, 400);

      expect(error.code).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toBe(details);
      expect(error.statusCode).toBe(400);
    });

    test('should serialize to JSON correctly', () => {
      const details = { field: 'username' };
      const error = new MCPError('ValidationError', 'Validation failed', details, 400);
      const json = error.toJSON();

      expect(json.name).toBe('MCPError');
      expect(json.code).toBe('ValidationError');
      expect(json.message).toBe('Validation failed');
      expect(json.details).toBe(details);
      expect(json.statusCode).toBe(400);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Specific Error Types', () => {
    test('InvalidRequestError should have correct defaults', () => {
      const error = new InvalidRequestError('Invalid request');

      expect(error.name).toBe('InvalidRequestError');
      expect(error.code).toBe('InvalidRequest');
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
    });

    test('AuthenticationRequiredError should have correct defaults', () => {
      const error = new AuthenticationRequiredError();

      expect(error.name).toBe('AuthenticationRequiredError');
      expect(error.code).toBe('AuthenticationRequired');
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
    });

    test('PermissionDeniedError should have correct defaults', () => {
      const error = new PermissionDeniedError();

      expect(error.name).toBe('PermissionDeniedError');
      expect(error.code).toBe('PermissionDenied');
      expect(error.message).toBe('Permission denied');
      expect(error.statusCode).toBe(403);
    });

    test('ResourceNotFoundError should have correct defaults', () => {
      const error = new ResourceNotFoundError();

      expect(error.name).toBe('ResourceNotFoundError');
      expect(error.code).toBe('ResourceNotFound');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    test('ResourceConflictError should have correct defaults', () => {
      const error = new ResourceConflictError();

      expect(error.name).toBe('ResourceConflictError');
      expect(error.code).toBe('ResourceConflict');
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
    });

    test('InternalError should have correct defaults', () => {
      const error = new InternalError();

      expect(error.name).toBe('InternalError');
      expect(error.code).toBe('InternalError');
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    test('ServiceUnavailableError should have correct defaults', () => {
      const error = new ServiceUnavailableError();

      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.code).toBe('ServiceUnavailable');
      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
    });

    test('TimeoutError should have correct defaults', () => {
      const error = new TimeoutError();

      expect(error.name).toBe('TimeoutError');
      expect(error.code).toBe('TimeoutError');
      expect(error.message).toBe('Request timeout');
      expect(error.statusCode).toBe(408);
    });

    test('ConnectionError should have correct defaults', () => {
      const error = new ConnectionError();

      expect(error.name).toBe('ConnectionError');
      expect(error.code).toBe('ConnectionError');
      expect(error.message).toBe('Connection error');
      expect(error.statusCode).toBeNull();
    });
  });

  describe('ValidationError', () => {
    test('should create with validation results', () => {
      const validationResults = [
        { field: 'username', message: 'Required' },
        { field: 'email', message: 'Invalid format' },
      ];

      const error = new ValidationError('Validation failed', validationResults);

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('InvalidParams');
      expect(error.message).toBe('Validation failed');
      expect(error.validationResults).toBe(validationResults);
      expect(error.details.validationResults).toBe(validationResults);
      expect(error.statusCode).toBe(400);
    });

    test('should create with default validation results', () => {
      const error = new ValidationError('Validation failed');

      expect(error.validationResults).toEqual([]);
      expect(error.details.validationResults).toEqual([]);
    });
  });

  describe('JasperErrorResponse', () => {
    test('should create with default values', () => {
      const error = new JasperErrorResponse();

      expect(error.parameters).toEqual([]);
      expect(error.properties).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        errorCode: 'resource.not.found',
        message: 'Resource not found',
        parameters: ['reportUri'],
        errorUid: 'error-123',
        properties: { severity: 'high' },
      };

      const error = new JasperErrorResponse(data);

      expect(error.errorCode).toBe(data.errorCode);
      expect(error.message).toBe(data.message);
      expect(error.parameters).toBe(data.parameters);
      expect(error.errorUid).toBe(data.errorUid);
      expect(error.properties).toBe(data.properties);
    });
  });

  describe('FieldValidationError', () => {
    test('should create with all parameters', () => {
      const error = new FieldValidationError(
        'username',
        'testuser',
        'required',
        'Username is required'
      );

      expect(error.field).toBe('username');
      expect(error.value).toBe('testuser');
      expect(error.constraint).toBe('required');
      expect(error.message).toBe('Username is required');
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('AuthenticationErrorDetails', () => {
    test('should create with default values', () => {
      const details = new AuthenticationErrorDetails();

      expect(details.supportedMethods).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        authMethod: 'basic',
        username: 'testuser',
        organization: 'testorg',
        reason: 'invalid_credentials',
        retryAfter: 300,
        supportedMethods: ['basic', 'login'],
      };

      const details = new AuthenticationErrorDetails(data);

      expect(details.authMethod).toBe(data.authMethod);
      expect(details.username).toBe(data.username);
      expect(details.organization).toBe(data.organization);
      expect(details.reason).toBe(data.reason);
      expect(details.retryAfter).toBe(data.retryAfter);
      expect(details.supportedMethods).toBe(data.supportedMethods);
    });
  });

  describe('ResourceErrorDetails', () => {
    test('should create with default values', () => {
      const details = new ResourceErrorDetails();

      expect(details.requiredPermissions).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        resourceUri: '/reports/test',
        resourceType: 'reportUnit',
        operation: 'read',
        reason: 'access_denied',
        conflictingResource: '/reports/existing',
        requiredPermissions: ['READ', 'EXECUTE'],
      };

      const details = new ResourceErrorDetails(data);

      expect(details.resourceUri).toBe(data.resourceUri);
      expect(details.resourceType).toBe(data.resourceType);
      expect(details.operation).toBe(data.operation);
      expect(details.reason).toBe(data.reason);
      expect(details.conflictingResource).toBe(data.conflictingResource);
      expect(details.requiredPermissions).toBe(data.requiredPermissions);
    });
  });

  describe('ExecutionErrorDetails', () => {
    test('should create with default values', () => {
      const details = new ExecutionErrorDetails();

      expect(details.parameters).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        executionId: 'exec-123',
        reportUri: '/reports/test',
        phase: 'execution',
        errorType: 'data_error',
        lineNumber: 42,
        columnNumber: 15,
        stackTrace: 'Error at line 42...',
        parameters: { param1: 'value1' },
      };

      const details = new ExecutionErrorDetails(data);

      expect(details.executionId).toBe(data.executionId);
      expect(details.reportUri).toBe(data.reportUri);
      expect(details.phase).toBe(data.phase);
      expect(details.errorType).toBe(data.errorType);
      expect(details.lineNumber).toBe(data.lineNumber);
      expect(details.columnNumber).toBe(data.columnNumber);
      expect(details.stackTrace).toBe(data.stackTrace);
      expect(details.parameters).toBe(data.parameters);
    });
  });

  describe('NetworkErrorDetails', () => {
    test('should create with default values', () => {
      const details = new NetworkErrorDetails();

      expect(details.retryAttempt).toBe(0);
      expect(details.maxRetries).toBe(3);
    });

    test('should create with provided values', () => {
      const data = {
        url: 'http://localhost:8080/jasperserver/rest_v2/reports',
        method: 'GET',
        statusCode: 500,
        responseTime: 5000,
        retryAttempt: 2,
        maxRetries: 5,
        cause: 'timeout',
      };

      const details = new NetworkErrorDetails(data);

      expect(details.url).toBe(data.url);
      expect(details.method).toBe(data.method);
      expect(details.statusCode).toBe(data.statusCode);
      expect(details.responseTime).toBe(data.responseTime);
      expect(details.retryAttempt).toBe(data.retryAttempt);
      expect(details.maxRetries).toBe(data.maxRetries);
      expect(details.cause).toBe(data.cause);
    });
  });

  describe('ConfigurationErrorDetails', () => {
    test('should create with default values', () => {
      const details = new ConfigurationErrorDetails();

      expect(details.validValues).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        configKey: 'JASPER_AUTH_TYPE',
        configValue: 'invalid',
        expectedType: 'string',
        validValues: ['basic', 'login', 'argument'],
        reason: 'invalid_value',
      };

      const details = new ConfigurationErrorDetails(data);

      expect(details.configKey).toBe(data.configKey);
      expect(details.configValue).toBe(data.configValue);
      expect(details.expectedType).toBe(data.expectedType);
      expect(details.validValues).toBe(data.validValues);
      expect(details.reason).toBe(data.reason);
    });
  });

  describe('ErrorMapper', () => {
    describe('mapHttpStatusToMCPError', () => {
      test('should map 400 to InvalidRequestError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(400, 'Bad request');

        expect(error).toBeInstanceOf(InvalidRequestError);
        expect(error.message).toBe('Bad request');
        expect(error.statusCode).toBe(400);
      });

      test('should map 401 to AuthenticationRequiredError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(401, 'Unauthorized');

        expect(error).toBeInstanceOf(AuthenticationRequiredError);
        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
      });

      test('should map 403 to PermissionDeniedError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(403, 'Forbidden');

        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect(error.message).toBe('Forbidden');
        expect(error.statusCode).toBe(403);
      });

      test('should map 404 to ResourceNotFoundError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(404, 'Not found');

        expect(error).toBeInstanceOf(ResourceNotFoundError);
        expect(error.message).toBe('Not found');
        expect(error.statusCode).toBe(404);
      });

      test('should map 408 to TimeoutError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(408, 'Timeout');

        expect(error).toBeInstanceOf(TimeoutError);
        expect(error.message).toBe('Timeout');
        expect(error.statusCode).toBe(408);
      });

      test('should map 409 to ResourceConflictError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(409, 'Conflict');

        expect(error).toBeInstanceOf(ResourceConflictError);
        expect(error.message).toBe('Conflict');
        expect(error.statusCode).toBe(409);
      });

      test('should map 500 to InternalError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(500, 'Internal error');

        expect(error).toBeInstanceOf(InternalError);
        expect(error.message).toBe('Internal error');
        expect(error.statusCode).toBe(500);
      });

      test('should map 503 to ServiceUnavailableError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(503, 'Service unavailable');

        expect(error).toBeInstanceOf(ServiceUnavailableError);
        expect(error.message).toBe('Service unavailable');
        expect(error.statusCode).toBe(503);
      });

      test('should map unknown status to generic MCPError', () => {
        const error = ErrorMapper.mapHttpStatusToMCPError(418, 'I am a teapot');

        expect(error).toBeInstanceOf(MCPError);
        expect(error.code).toBe('UnknownError');
        expect(error.message).toBe('I am a teapot');
        expect(error.statusCode).toBe(418);
      });
    });

    describe('mapJasperErrorToMCPError', () => {
      test('should map resource.not.found to ResourceNotFoundError', () => {
        const jasperError = {
          errorCode: 'resource.not.found',
          message: 'Resource not found',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(ResourceNotFoundError);
        expect(error.message).toBe('Resource not found');
        expect(error.details.jasperError).toBe(jasperError);
      });

      test('should map access.denied to PermissionDeniedError', () => {
        const jasperError = {
          errorCode: 'access.denied',
          message: 'Access denied',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect(error.message).toBe('Access denied');
      });

      test('should map invalid.credentials to AuthenticationRequiredError', () => {
        const jasperError = {
          errorCode: 'invalid.credentials',
          message: 'Invalid credentials',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(AuthenticationRequiredError);
        expect(error.message).toBe('Invalid credentials');
      });

      test('should map resource.already.exists to ResourceConflictError', () => {
        const jasperError = {
          errorCode: 'resource.already.exists',
          message: 'Resource already exists',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(ResourceConflictError);
        expect(error.message).toBe('Resource already exists');
      });

      test('should map validation.error to ValidationError', () => {
        const jasperError = {
          errorCode: 'validation.error',
          message: 'Validation failed',
          parameters: ['field1', 'field2'],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Validation failed');
        expect(error.validationResults).toEqual(['field1', 'field2']);
      });

      test('should map pattern-based errors correctly', () => {
        const jasperError = {
          errorCode: 'user.not.found',
          message: 'User not found',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(ResourceNotFoundError);
        expect(error.message).toBe('User not found');
      });

      test('should map unknown errors to InternalError', () => {
        const jasperError = {
          errorCode: 'unknown.error',
          message: 'Unknown error',
          parameters: [],
        };

        const error = ErrorMapper.mapJasperErrorToMCPError(jasperError);

        expect(error).toBeInstanceOf(InternalError);
        expect(error.message).toBe('Unknown error');
      });
    });

    describe('createValidationError', () => {
      test('should create validation error with field errors', () => {
        const fieldErrors = [
          { field: 'username', message: 'Required' },
          { field: 'email', message: 'Invalid format' },
        ];

        const error = ErrorMapper.createValidationError(fieldErrors);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Validation failed for 2 field(s)');
        expect(error.validationResults).toBe(fieldErrors);
      });
    });

    describe('createConnectionError', () => {
      test('should create connection error with network details', () => {
        const networkDetails = { url: 'http://localhost:8080', timeout: 5000 };
        const error = ErrorMapper.createConnectionError('timeout', networkDetails);

        expect(error).toBeInstanceOf(ConnectionError);
        expect(error.message).toBe('Connection failed: timeout');
        expect(error.details.networkDetails).toBe(networkDetails);
        expect(error.details.cause).toBe('timeout');
      });
    });

    describe('createConfigurationError', () => {
      test('should create configuration error', () => {
        const error = ErrorMapper.createConfigurationError('JASPER_URL', 'missing');

        expect(error).toBeInstanceOf(InvalidRequestError);
        expect(error.message).toBe('Configuration error for JASPER_URL: missing');
        expect(error.details.configDetails.configKey).toBe('JASPER_URL');
        expect(error.details.configDetails.reason).toBe('missing');
      });

      test('should create configuration error with details', () => {
        const details = {
          configValue: 'invalid',
          expectedType: 'string',
          validValues: ['basic', 'login'],
        };

        const error = ErrorMapper.createConfigurationError(
          'JASPER_AUTH_TYPE',
          'invalid_value',
          details
        );

        expect(error.details.configDetails.configValue).toBe('invalid');
        expect(error.details.configDetails.expectedType).toBe('string');
        expect(error.details.configDetails.validValues).toEqual(['basic', 'login']);
      });
    });
  });

  describe('Constants', () => {
    test('ErrorSeverity should have correct values', () => {
      expect(ErrorSeverity.LOW).toBe('low');
      expect(ErrorSeverity.MEDIUM).toBe('medium');
      expect(ErrorSeverity.HIGH).toBe('high');
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });

    test('ErrorCategory should have correct values', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
      expect(ErrorCategory.AUTHORIZATION).toBe('authorization');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.RESOURCE).toBe('resource');
      expect(ErrorCategory.EXECUTION).toBe('execution');
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.CONFIGURATION).toBe('configuration');
      expect(ErrorCategory.INTERNAL).toBe('internal');
    });
  });
});
