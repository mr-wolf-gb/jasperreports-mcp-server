/**
 * Example usage of the enhanced error handling system
 *
 * This example demonstrates how to use ErrorContext, enhanced ErrorHandler,
 * and ResponseFormatter for comprehensive error tracking and debugging.
 */

import { ErrorContext } from '../src/utils/errorContext.js';
import { ResponseFormatter } from '../src/utils/responseFormatter.js';
import { MCPError, MCP_ERROR_TYPES } from '../src/utils/errorHandler.js';

/**
 * Example of using enhanced error handling in a MCP tool
 */
async function exampleToolWithEnhancedErrorHandling(toolName, operation, parameters) {
  const responseFormatter = new ResponseFormatter();
  const startTime = Date.now();

  // Create error context for comprehensive tracking
  const errorContext = new ErrorContext(toolName, operation, parameters);

  try {
    // Add validation step
    errorContext.addValidationStep('Validating input parameters', true, {
      parametersCount: Object.keys(parameters).length,
    });

    // Simulate validation
    if (!parameters.reportUri) {
      errorContext.addValidationError(
        'reportUri',
        parameters.reportUri,
        'required',
        'Report URI is required'
      );

      return responseFormatter.formatValidationError(
        toolName,
        errorContext.validationErrors,
        errorContext.calculateTotalTime(),
        errorContext.correlationId
      );
    }

    // Add execution step
    errorContext.addExecutionStep('Connecting to JasperReports Server', true, 'Connected', 150);

    // Simulate HTTP request that fails
    try {
      // This would be your actual HTTP request
      throw new Error('HTTP request failed');
    } catch (httpError) {
      // Simulate HTTP error response
      const mockHttpResponse = {
        status: 404,
        data: { message: 'Report not found', errorCode: 'resource.not.found' },
      };

      // Add HTTP error to context
      errorContext.addHttpError(
        mockHttpResponse.status,
        mockHttpResponse.data,
        'http://jasper.server.com/api/reports',
        'GET',
        { Authorization: 'Bearer [REDACTED]' }
      );

      const mcpError = new MCPError(
        MCP_ERROR_TYPES.RESOURCE_NOT_FOUND,
        'Report not found',
        mockHttpResponse.data,
        mockHttpResponse.status,
        errorContext.correlationId
      );

      return responseFormatter.formatError(
        toolName,
        mcpError,
        errorContext.calculateTotalTime(),
        errorContext.correlationId,
        { guidance: errorContext.generateToolGuidance() }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    errorContext.addSystemError(error, 'internal');

    const mcpError = new MCPError(
      MCP_ERROR_TYPES.INTERNAL_ERROR,
      error.message,
      { originalError: error.name },
      500,
      errorContext.correlationId
    );

    return responseFormatter.formatError(
      toolName,
      mcpError,
      errorContext.calculateTotalTime(),
      errorContext.correlationId
    );
  }
}

/**
 * Example of successful operation with enhanced logging
 */
async function exampleSuccessfulOperation(toolName, operation, parameters) {
  const responseFormatter = new ResponseFormatter();
  const startTime = Date.now();

  // Create error context for tracking (even successful operations)
  const errorContext = new ErrorContext(toolName, operation, parameters);

  try {
    // Add validation steps
    errorContext.addValidationStep('Validating parameters', true, { valid: true });
    errorContext.addValidationStep('Checking permissions', true, { hasPermission: true });

    // Add execution steps
    errorContext.addExecutionStep('Connecting to server', true, 'Connected', 100);
    errorContext.addExecutionStep('Executing operation', true, 'Success', 250);

    // Simulate successful result
    const result = {
      reportId: 'report-123',
      status: 'completed',
      pages: 5,
    };

    // Add metadata
    errorContext.addMetadata('resultSize', JSON.stringify(result).length);
    errorContext.addMetadata('operationComplexity', 'medium');

    // Format successful response
    return responseFormatter.formatSuccess(
      toolName,
      result,
      errorContext.calculateTotalTime(),
      errorContext.correlationId,
      {
        performance: errorContext.performanceMetrics,
        executionSteps: errorContext.executionSteps.length,
      }
    );
  } catch (error) {
    // Even in success scenarios, we should handle unexpected errors
    errorContext.addSystemError(error, 'internal');

    const mcpError = new MCPError(
      MCP_ERROR_TYPES.INTERNAL_ERROR,
      error.message,
      { originalError: error.name },
      500,
      errorContext.correlationId
    );

    return responseFormatter.formatError(
      toolName,
      mcpError,
      errorContext.calculateTotalTime(),
      errorContext.correlationId
    );
  }
}

/**
 * Example of debugging with detailed error context
 */
async function exampleDebuggingScenario() {
  console.log('=== Enhanced Error Handling Example ===\n');

  // Example 1: Validation Error
  console.log('1. Validation Error Example:');
  const validationResult = await exampleToolWithEnhancedErrorHandling(
    'jasper_run_report',
    'execute_report',
    { format: 'pdf' } // Missing reportUri
  );
  console.log(JSON.stringify(validationResult, null, 2));
  console.log('\n');

  // Example 2: HTTP Error
  console.log('2. HTTP Error Example:');
  const httpErrorResult = await exampleToolWithEnhancedErrorHandling(
    'jasper_get_resource',
    'get_report',
    { reportUri: '/reports/nonexistent' }
  );
  console.log(JSON.stringify(httpErrorResult, null, 2));
  console.log('\n');

  // Example 3: Successful Operation
  console.log('3. Successful Operation Example:');
  const successResult = await exampleSuccessfulOperation('jasper_list_resources', 'list_reports', {
    folderUri: '/reports',
    limit: 10,
  });
  console.log(JSON.stringify(successResult, null, 2));
  console.log('\n');

  // Example 4: Error Context Summary
  console.log('4. Error Context Features Demonstrated:');
  console.log('- Correlation ID tracking for request tracing');
  console.log('- Detailed validation and execution step logging');
  console.log('- Structured error responses with guidance');
  console.log('- Sensitive data sanitization');
  console.log('- Performance metrics tracking');
}

/**
 * Example of correlation ID tracking across multiple operations
 */
async function exampleCorrelationTracking() {
  const responseFormatter = new ResponseFormatter();

  console.log('=== Correlation ID Tracking Example ===\n');

  // Create initial context
  const parentContext = new ErrorContext('jasper_workflow', 'multi_step_operation', {
    workflowId: 'wf-123',
  });

  console.log(`Parent Correlation ID: ${parentContext.correlationId}\n`);

  // Step 1: Authentication
  const authContext = new ErrorContext('jasper_authenticate', 'login', {
    username: 'user',
    parentCorrelationId: parentContext.correlationId,
  });

  authContext.addExecutionStep('Authenticating user', true, 'Authenticated', 200);
  console.log('Step 1 - Authentication:', {
    correlationId: authContext.correlationId,
    parentId: parentContext.correlationId,
    status: 'success',
  });

  // Step 2: List Resources (with error)
  const listContext = new ErrorContext('jasper_list_resources', 'list_reports', {
    folderUri: '/invalid',
    parentCorrelationId: parentContext.correlationId,
  });

  listContext.addHttpError(403, { message: 'Access denied' }, 'http://jasper.com/api/resources');
  console.log('Step 2 - List Resources:', {
    correlationId: listContext.correlationId,
    parentId: parentContext.correlationId,
    status: 'error',
    errorCount: listContext.httpErrors.length,
  });

  // Step 3: Generate Report
  const reportContext = new ErrorContext('jasper_run_report', 'execute_report', {
    reportUri: '/reports/test',
    parentCorrelationId: parentContext.correlationId,
  });

  reportContext.addExecutionStep('Generating report', true, 'Report generated', 1500);
  console.log('Step 3 - Generate Report:', {
    correlationId: reportContext.correlationId,
    parentId: parentContext.correlationId,
    status: 'success',
    executionTime: 1500,
  });

  // Summary
  console.log('\nWorkflow Summary:', {
    parentCorrelationId: parentContext.correlationId,
    totalSteps: 3,
    successfulSteps: 2,
    failedSteps: 1,
    totalExecutionTime: parentContext.calculateTotalTime(),
  });
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running Enhanced Error Handling Examples...\n');

  try {
    await exampleDebuggingScenario();
    console.log('\n' + '='.repeat(50) + '\n');
    await exampleCorrelationTracking();
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

export {
  exampleToolWithEnhancedErrorHandling,
  exampleSuccessfulOperation,
  exampleDebuggingScenario,
  exampleCorrelationTracking,
};
