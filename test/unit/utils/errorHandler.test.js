/**
 * Unit tests for Error Handler
 */

import { jest } from '@jest/globals';
import {
  ErrorHandler,
  MCPError,
  MCP_ERROR_TYPES,
  ERROR_CATEGORIES,
  getErrorHandler,
  mapHttpError,
  mapJasperError,
  createValidationError,
  logError,
} from '../../../src/utils/errorHandler.js';

// Mock configuration
const mockConfig = {
  debugMode: false,
  logLevel: 'info',
  jasperUrl: 'http://localhost:8080/jasperserver',
  authType: 'basic',
};

// Mock getConfiguration
jest.mock('../../../src/config/environment.js', () => ({
  getConfiguration: jest.fn(() => mockConfig),
}));

describe('MCPError', () => {
  test('should create MCPError with all properties', () => {
    const error = new MCPError(
      MCP_ERROR_TYPES.INVALID_REQUEST,
      'Test error message',
      { field: 'test' },
      400
    );

    expect(error.name).toBe('MCPError');
    expect(error.type).toBe(MCP_ERROR_TYPES.INVALID_REQUEST);
    expect(error.message).toBe('Test error message');
    expect(error.details).toEqual({ field: 'test' });
    expect(error.statusCode).toBe(400);
    expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
    expect(error.timestamp).toBeDefined();
  });

  test('should determine correct category from type', () => {
    const authError = new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, 'Auth error');
    expect(authError.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);

    const permError = new MCPError(MCP_ERROR_TYPES.PERMISSION_DENIED, 'Permission error');
    expect(permError.category).toBe(ERROR_CATEGORIES.PERMISSION);

    const validationError = new MCPError(MCP_ERROR_TYPES.INVALID_PARAMS, 'Validation error');
    expect(validationError.category).toBe(ERROR_CATEGORIES.VALIDATION);

    const resourceError = new MCPError(MCP_ERROR_TYPES.RESOURCE_NOT_FOUND, 'Resource error');
    expect(resourceError.category).toBe(ERROR_CATEGORIES.RESOURCE);

    const connectionError = new MCPError(MCP_ERROR_TYPES.SERVICE_UNAVAILABLE, 'Connection error');
    expect(connectionError.category).toBe(ERROR_CATEGORIES.CONNECTION);

    const timeoutError = new MCPError(MCP_ERROR_TYPES.TIMEOUT, 'Timeout error');
    expect(timeoutError.category).toBe(ERROR_CATEGORIES.TIMEOUT);

    const rateLimitError = new MCPError(MCP_ERROR_TYPES.RATE_LIMITED, 'Rate limit error');
    expect(rateLimitError.category).toBe(ERROR_CATEGORIES.RATE_LIMIT);

    const internalError = new MCPError(MCP_ERROR_TYPES.INTERNAL_ERROR, 'Internal error');
    expect(internalError.category).toBe(ERROR_CATEGORIES.INTERNAL);
  });

  test('should convert to JSON correctly', () => {
    const error = new MCPError(
      MCP_ERROR_TYPES.INVALID_REQUEST,
      'Test error',
      { field: 'test' },
      400
    );

    const json = error.toJSON();
    expect(json).toEqual({
      type: MCP_ERROR_TYPES.INVALID_REQUEST,
      message: 'Test error',
      details: { field: 'test' },
      statusCode: 400,
      category: ERROR_CATEGORIES.VALIDATION,
      correlationId: null,
      timestamp: error.timestamp,
    });
  });

  test('should identify retryable errors correctly', () => {
    const connectionError = new MCPError(MCP_ERROR_TYPES.SERVICE_UNAVAILABLE, 'Connection error');
    expect(connectionError.isRetryable()).toBe(true);

    const timeoutError = new MCPError(MCP_ERROR_TYPES.TIMEOUT, 'Timeout error');
    expect(timeoutError.isRetryable()).toBe(true);

    const rateLimitError = new MCPError(MCP_ERROR_TYPES.RATE_LIMITED, 'Rate limit error');
    expect(rateLimitError.isRetryable()).toBe(true);

    const validationError = new MCPError(MCP_ERROR_TYPES.INVALID_PARAMS, 'Validation error');
    expect(validationError.isRetryable()).toBe(false);

    const authError = new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, 'Auth error');
    expect(authError.isRetryable()).toBe(false);
  });

  test('should identify authentication requirement correctly', () => {
    const authError = new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, 'Auth error');
    expect(authError.requiresAuthentication()).toBe(true);

    const validationError = new MCPError(MCP_ERROR_TYPES.INVALID_PARAMS, 'Validation error');
    expect(validationError.requiresAuthentication()).toBe(false);
  });
});

describe('ErrorHandler', () => {
  let errorHandler;
  let consoleSpy;

  beforeEach(() => {
    errorHandler = new ErrorHandler(mockConfig);
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorHandler.clearErrorStatistics();
  });

  describe('mapHttpError', () => {
    test('should map 400 status to INVALID_REQUEST', () => {
      const error = errorHandler.mapHttpError(400, { message: 'Bad request' });

      expect(error.type).toBe(MCP_ERROR_TYPES.INVALID_REQUEST);
      expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
      expect(error.message).toBe('Bad request');
      expect(error.statusCode).toBe(400);
    });

    test('should map 401 status to AUTHENTICATION_REQUIRED', () => {
      const error = errorHandler.mapHttpError(401, { message: 'Unauthorized' });

      expect(error.type).toBe(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED);
      expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    test('should map 403 status to PERMISSION_DENIED', () => {
      const error = errorHandler.mapHttpError(403, { message: 'Forbidden' });

      expect(error.type).toBe(MCP_ERROR_TYPES.PERMISSION_DENIED);
      expect(error.category).toBe(ERROR_CATEGORIES.PERMISSION);
      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });

    test('should map 404 status to RESOURCE_NOT_FOUND', () => {
      const error = errorHandler.mapHttpError(404, { message: 'Not found' });

      expect(error.type).toBe(MCP_ERROR_TYPES.RESOURCE_NOT_FOUND);
      expect(error.category).toBe(ERROR_CATEGORIES.RESOURCE);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
    });

    test('should map 500 status to INTERNAL_ERROR', () => {
      const error = errorHandler.mapHttpError(500, { message: 'Internal server error' });

      expect(error.type).toBe(MCP_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.category).toBe(ERROR_CATEGORIES.INTERNAL);
      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    test('should map 503 status to SERVICE_UNAVAILABLE', () => {
      const error = errorHandler.mapHttpError(503, { message: 'Service unavailable' });

      expect(error.type).toBe(MCP_ERROR_TYPES.SERVICE_UNAVAILABLE);
      expect(error.category).toBe(ERROR_CATEGORIES.CONNECTION);
      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
    });

    test('should handle unknown status codes', () => {
      const error = errorHandler.mapHttpError(999, { message: 'Unknown error' });

      expect(error.type).toBe(MCP_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.category).toBe(ERROR_CATEGORIES.INTERNAL);
      expect(error.message).toBe('Unknown error');
      expect(error.statusCode).toBe(999);
    });

    test('should extract message from string response', () => {
      const error = errorHandler.mapHttpError(400, 'String error message');
      expect(error.message).toBe('String error message');
    });

    test('should extract message from various object fields', () => {
      const testCases = [
        { message: 'Test message' },
        { errorMessage: 'Test error message' },
        { error: 'Test error' },
        { description: 'Test description' },
        { detail: 'Test detail' },
      ];

      testCases.forEach(responseData => {
        const error = errorHandler.mapHttpError(400, responseData);
        expect(error.message).toBe(Object.values(responseData)[0]);
      });
    });

    test('should add context to error message', () => {
      const error = errorHandler.mapHttpError(400, { message: 'Bad request' }, 'User creation');
      expect(error.message).toBe('User creation: Bad request');
    });

    test('should extract error details', () => {
      const responseData = {
        message: 'Error message',
        errorCode: 'TEST_ERROR',
        parameters: ['param1', 'param2'],
        errorUid: 'uid123',
        timestamp: '2023-01-01T00:00:00Z',
      };

      const error = errorHandler.mapHttpError(400, responseData);
      expect(error.details).toEqual({
        errorCode: 'TEST_ERROR',
        parameters: ['param1', 'param2'],
        errorUid: 'uid123',
        timestamp: '2023-01-01T00:00:00Z',
      });
    });
  });

  describe('mapJasperError', () => {
    test('should map authentication.failed error', () => {
      const jasperError = {
        errorCode: 'authentication.failed',
        message: 'Authentication failed',
      };

      const error = errorHandler.mapJasperError(jasperError);
      expect(error.type).toBe(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED);
      expect(error.category).toBe(ERROR_CATEGORIES.AUTHENTICATION);
      expect(error.message).toBe('Authentication failed');
    });

    test('should map resource.not.found error', () => {
      const jasperError = {
        errorCode: 'resource.not.found',
        message: 'Resource not found',
      };

      const error = errorHandler.mapJasperError(jasperError);
      expect(error.type).toBe(MCP_ERROR_TYPES.RESOURCE_NOT_FOUND);
      expect(error.category).toBe(ERROR_CATEGORIES.RESOURCE);
      expect(error.message).toBe('Resource not found');
    });

    test('should map validation.error', () => {
      const jasperError = {
        errorCode: 'validation.error',
        message: 'Validation failed',
        parameters: ['field1', 'field2'],
      };

      const error = errorHandler.mapJasperError(jasperError);
      expect(error.type).toBe(MCP_ERROR_TYPES.INVALID_PARAMS);
      expect(error.category).toBe(ERROR_CATEGORIES.VALIDATION);
      expect(error.details.parameters).toEqual(['field1', 'field2']);
    });

    test('should handle unknown JasperReports errors', () => {
      const jasperError = {
        errorCode: 'unknown.error',
        message: 'Unknown error',
      };

      const error = errorHandler.mapJasperError(jasperError);
      expect(error.type).toBe(MCP_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.category).toBe(ERROR_CATEGORIES.INTERNAL);
    });

    test('should handle invalid jasper error input', () => {
      const error = errorHandler.mapJasperError(null);
      expect(error.type).toBe(MCP_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.message).toBe('Invalid JasperReports error response');
    });

    test('should add context to jasper error message', () => {
      const jasperError = {
        errorCode: 'resource.not.found',
        message: 'Resource not found',
      };

      const error = errorHandler.mapJasperError(jasperError, 'Report execution');
      expect(error.message).toBe('Report execution: Resource not found');
    });
  });

  describe('createValidationError', () => {
    test('should create validation error with all details', () => {
      const error = errorHandler.createValidationError(
        'username',
        'Username is required',
        null,
        'required'
      );

      expect(error.type).toBe(MCP_ERROR_TYPES.INVALID_PARAMS);
      expect(error.message).toBe("Validation failed for field 'username': Username is required");
      expect(error.details).toEqual({
        field: 'username',
        value: null,
        constraint: 'required',
        validationType: 'parameter_validation',
      });
    });
  });

  describe('createConnectionError', () => {
    test('should create connection error', () => {
      const cause = new Error('Connection refused');
      cause.code = 'ECONNREFUSED';

      const error = errorHandler.createConnectionError('Cannot connect to server', cause);

      expect(error.type).toBe(MCP_ERROR_TYPES.SERVICE_UNAVAILABLE);
      expect(error.message).toBe('Cannot connect to server');
      expect(error.details).toEqual({
        originalError: 'Connection refused',
        errorCode: 'ECONNREFUSED',
        connectionType: 'jasperreports_server',
      });
    });
  });

  describe('createAuthenticationError', () => {
    test('should create authentication error', () => {
      const error = errorHandler.createAuthenticationError('Login failed', 'basic');

      expect(error.type).toBe(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED);
      expect(error.message).toBe('Login failed');
      expect(error.details).toEqual({
        authType: 'basic',
        requiresReauth: true,
      });
    });
  });

  describe('createPermissionError', () => {
    test('should create permission error', () => {
      const error = errorHandler.createPermissionError('Access denied', '/reports/test', 'read');

      expect(error.type).toBe(MCP_ERROR_TYPES.PERMISSION_DENIED);
      expect(error.message).toBe('Access denied');
      expect(error.details).toEqual({
        resource: '/reports/test',
        operation: 'read',
        requiresPermission: true,
      });
    });
  });

  describe('createResourceNotFoundError', () => {
    test('should create resource not found error', () => {
      const error = errorHandler.createResourceNotFoundError('report', '/reports/test');

      expect(error.type).toBe(MCP_ERROR_TYPES.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('report not found: /reports/test');
      expect(error.details).toEqual({
        resourceType: 'report',
        resourcePath: '/reports/test',
      });
    });
  });

  describe('createTimeoutError', () => {
    test('should create timeout error', () => {
      const error = errorHandler.createTimeoutError('report execution', 30000);

      expect(error.type).toBe(MCP_ERROR_TYPES.TIMEOUT);
      expect(error.message).toBe("Operation 'report execution' timed out after 30000ms");
      expect(error.details).toEqual({
        operation: 'report execution',
        timeout: 30000,
        isRetryable: true,
      });
    });
  });

  describe('createInternalError', () => {
    test('should create internal error', () => {
      const details = { component: 'parser', line: 42 };
      const error = errorHandler.createInternalError('Unexpected error', details);

      expect(error.type).toBe(MCP_ERROR_TYPES.INTERNAL_ERROR);
      expect(error.message).toBe('Unexpected error');
      expect(error.details).toEqual(details);
    });
  });

  describe('logError', () => {
    test('should log error with context', () => {
      const error = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Test error');

      errorHandler.logError(error, 'Test context', { extra: 'data' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Error Handler] Test context: Test error')
      );
    });

    test('should log detailed error in debug mode', () => {
      const debugConfig = { ...mockConfig, debugMode: true };
      const debugHandler = new ErrorHandler(debugConfig);
      const error = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Test error');

      debugHandler.logError(error, 'Test context');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Error Handler] Detailed error:'),
        expect.any(String)
      );
    });

    test('should not log when log level is none', () => {
      const noLogConfig = { ...mockConfig, logLevel: 'none' };
      const noLogHandler = new ErrorHandler(noLogConfig);
      const error = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Test error');

      noLogHandler.logError(error, 'Test context');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('getErrorStatistics', () => {
    test('should track error statistics', () => {
      const error1 = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Error 1');
      const error2 = new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, 'Error 2');

      errorHandler.logError(error1, 'context1');
      errorHandler.logError(error1, 'context1');
      errorHandler.logError(error2, 'context2');

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[MCP_ERROR_TYPES.INVALID_REQUEST]).toBe(2);
      expect(stats.errorsByType[MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED]).toBe(1);
      expect(stats.errorsByCategory[ERROR_CATEGORIES.VALIDATION]).toBe(2);
      expect(stats.errorsByCategory[ERROR_CATEGORIES.AUTHENTICATION]).toBe(1);
    });

    test('should track recent errors', () => {
      const error = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Recent error');
      errorHandler.logError(error, 'context');

      const stats = errorHandler.getErrorStatistics();
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.recentErrors[0].error).toBe('InvalidRequest:context');
    });

    test('should track top errors', () => {
      const error1 = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Error 1');
      const error2 = new MCPError(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED, 'Error 2');

      // Log error1 more times to make it top error
      errorHandler.logError(error1, 'context1');
      errorHandler.logError(error1, 'context1');
      errorHandler.logError(error1, 'context1');
      errorHandler.logError(error2, 'context2');

      const stats = errorHandler.getErrorStatistics();
      expect(stats.topErrors[0]).toEqual({
        error: 'InvalidRequest:context1',
        count: 3,
      });
    });
  });

  describe('clearErrorStatistics', () => {
    test('should clear all error statistics', () => {
      const error = new MCPError(MCP_ERROR_TYPES.INVALID_REQUEST, 'Test error');
      errorHandler.logError(error, 'context');

      let stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrorStatistics();
      stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
    });
  });
});

describe('Convenience functions', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('mapHttpError should work', () => {
    const error = mapHttpError(404, { message: 'Not found' }, 'Resource lookup');
    expect(error.type).toBe(MCP_ERROR_TYPES.RESOURCE_NOT_FOUND);
    expect(error.message).toBe('Resource lookup: Not found');
  });

  test('mapJasperError should work', () => {
    const jasperError = { errorCode: 'authentication.failed', message: 'Auth failed' };
    const error = mapJasperError(jasperError, 'Login');
    expect(error.type).toBe(MCP_ERROR_TYPES.AUTHENTICATION_REQUIRED);
    expect(error.message).toBe('Login: Auth failed');
  });

  test('createValidationError should work', () => {
    const error = createValidationError('field', 'Invalid value', 'test', 'required');
    expect(error.type).toBe(MCP_ERROR_TYPES.INVALID_PARAMS);
    expect(error.details.field).toBe('field');
  });

  test('logError should work', () => {
    const error = new Error('Test error');
    logError(error, 'Test context');
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('getErrorHandler should return singleton instance', () => {
    const handler1 = getErrorHandler();
    const handler2 = getErrorHandler();
    expect(handler1).toBe(handler2);
  });
});
