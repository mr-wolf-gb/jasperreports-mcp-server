/**
 * Example usage of the Error Handler
 *
 * This file demonstrates how to use the error handling system
 * in various scenarios within the JasperReports MCP Server.
 */

import {
  ErrorHandler,
  MCPError,
  MCP_ERROR_TYPES,
  ERROR_CATEGORIES,
  mapHttpError,
  mapJasperError,
  createValidationError,
} from '../src/utils/errorHandler.js';

// Mock configuration for the example
const mockConfig = {
  jasperUrl: 'http://localhost:8080/jasperserver',
  authType: 'basic',
  username: 'admin',
  password: 'admin',
  debugMode: false,
  logLevel: 'info',
  timeout: 30000,
  sslVerify: true,
};

// Example 1: Basic HTTP Error Mapping
console.log('=== Example 1: HTTP Error Mapping ===');

// Simulate a 404 response from JasperReports Server
const notFoundResponse = {
  errorCode: 'resource.not.found',
  message: 'Report /reports/sales_report.jrxml not found',
  errorUid: 'error-12345',
};

const notFoundError = mapHttpError(404, notFoundResponse, 'Report execution', mockConfig);
console.log('404 Error:', notFoundError.toJSON());
console.log('Is retryable:', notFoundError.isRetryable());
console.log('Requires auth:', notFoundError.requiresAuthentication());

// Example 2: JasperReports Specific Error Mapping
console.log('\n=== Example 2: JasperReports Error Mapping ===');

const jasperAuthError = {
  errorCode: 'authentication.failed',
  message: 'Invalid username or password',
  parameters: ['username: admin'],
};

const authError = mapJasperError(jasperAuthError, 'Login attempt', mockConfig);
console.log('Auth Error:', authError.toJSON());
console.log('Requires auth:', authError.requiresAuthentication());

// Example 3: Validation Error Creation
console.log('\n=== Example 3: Validation Errors ===');

const validationError = createValidationError(
  'reportUri',
  'Report URI cannot be empty',
  null,
  'required',
  mockConfig
);
console.log('Validation Error:', validationError.toJSON());

// Example 4: Using ErrorHandler Class Directly
console.log('\n=== Example 4: ErrorHandler Class Usage ===');

const errorHandler = new ErrorHandler(mockConfig);

// Create various types of errors
const connectionError = errorHandler.createConnectionError(
  'Cannot connect to JasperReports Server',
  new Error('ECONNREFUSED')
);

const permissionError = errorHandler.createPermissionError(
  'Access denied to confidential reports',
  '/reports/confidential',
  'read'
);

const timeoutError = errorHandler.createTimeoutError('Report generation', 30000);

// Log errors (this will also track statistics)
errorHandler.logError(connectionError, 'Server connection');
errorHandler.logError(permissionError, 'Resource access');
errorHandler.logError(timeoutError, 'Report processing');

// Example 5: Error Statistics and Monitoring
console.log('\n=== Example 5: Error Statistics ===');

// Generate some more errors for statistics
for (let i = 0; i < 5; i++) {
  const error = errorHandler.mapHttpError(500, { message: `Internal error ${i}` }, 'Processing');
  errorHandler.logError(error, 'Batch processing');
}

const stats = errorHandler.getErrorStatistics();
console.log('Error Statistics:', JSON.stringify(stats, null, 2));

// Example 6: Error Recovery Logic
console.log('\n=== Example 6: Error Recovery Logic ===');

function handleApiError(error) {
  if (error.requiresAuthentication()) {
    console.log('🔐 Authentication required - initiating re-auth...');
    // Implement re-authentication logic
    return { action: 'reauthenticate' };
  }

  if (error.isRetryable()) {
    console.log('🔄 Error is retryable - scheduling retry...');
    // Implement retry logic with backoff
    return { action: 'retry', delay: 1000 };
  }

  if (error.category === ERROR_CATEGORIES.VALIDATION) {
    console.log('❌ Validation error - check input parameters');
    // Handle validation errors
    return { action: 'validate_input', details: error.details };
  }

  if (error.category === ERROR_CATEGORIES.PERMISSION) {
    console.log('🚫 Permission denied - check user roles');
    // Handle permission errors
    return { action: 'check_permissions', resource: error.details?.resource };
  }

  console.log('💥 Unrecoverable error - failing operation');
  return { action: 'fail', error: error.toJSON() };
}

// Test error recovery logic
const testErrors = [authError, connectionError, validationError, permissionError, timeoutError];

testErrors.forEach((error, index) => {
  console.log(`\nError ${index + 1} (${error.type}):`);
  const recovery = handleApiError(error);
  console.log('Recovery action:', recovery);
});

// Example 7: Custom Error Handler Configuration
console.log('\n=== Example 7: Custom Configuration ===');

const customConfig = {
  debugMode: true,
  logLevel: 'debug',
  jasperUrl: 'https://reports.company.com/jasperserver',
  authType: 'login',
};

const customErrorHandler = new ErrorHandler(customConfig);

// This will log detailed information due to debug mode
const debugError = customErrorHandler.mapHttpError(
  500,
  {
    errorCode: 'report.compilation.failed',
    message: 'JRXML compilation error at line 42',
    parameters: ['syntax error', 'missing closing tag'],
  },
  'Report compilation'
);

customErrorHandler.logError(debugError, 'Debug example');

// Example 8: Error Pattern Matching
console.log('\n=== Example 8: Error Pattern Matching ===');

const errorPatterns = [
  { errorCode: 'session.expired', message: 'Session has expired' },
  { errorCode: 'invalid.parameter', message: 'Parameter validation failed' },
  { errorCode: 'connection.failed', message: 'Database connection failed' },
  { errorCode: 'unknown.error', message: 'Something went wrong' },
];

errorPatterns.forEach(pattern => {
  const error = mapJasperError(pattern, 'Pattern test', mockConfig);
  console.log(`Pattern: ${pattern.errorCode} -> Type: ${error.type}, Category: ${error.category}`);
});

// Example 9: Error Chaining and Context
console.log('\n=== Example 9: Error Context and Chaining ===');

function simulateReportExecution(reportUri) {
  try {
    // Simulate various failure points
    if (!reportUri) {
      throw createValidationError(
        'reportUri',
        'Report URI is required',
        reportUri,
        'required',
        mockConfig
      );
    }

    if (reportUri.includes('forbidden')) {
      throw mapHttpError(403, { message: 'Access denied' }, 'Permission check', mockConfig);
    }

    if (reportUri.includes('notfound')) {
      throw mapHttpError(404, { message: 'Report not found' }, 'Resource lookup', mockConfig);
    }

    // Simulate success
    return { success: true, reportId: 'report-123' };
  } catch (error) {
    // Log the error with context
    errorHandler.logError(error, `Report execution: ${reportUri}`, {
      reportUri,
      timestamp: new Date(),
    });

    // Re-throw with additional context
    if (error instanceof MCPError) {
      throw error;
    } else {
      throw errorHandler.createInternalError('Unexpected error in report execution', {
        originalError: error.message,
        reportUri,
      });
    }
  }
}

// Test different scenarios
const testReports = [
  '/reports/sales_report.jrxml',
  null, // validation error
  '/reports/forbidden_report.jrxml', // permission error
  '/reports/notfound_report.jrxml', // not found error
];

testReports.forEach(reportUri => {
  try {
    console.log(`\nTesting report: ${reportUri || 'null'}`);
    const result = simulateReportExecution(reportUri);
    console.log('Success:', result);
  } catch (error) {
    console.log('Error caught:', error.message);
    console.log('Error type:', error.type);
    console.log('Recovery suggestion:', handleApiError(error).action);
  }
});

console.log('\n=== Error Handler Examples Complete ===');
