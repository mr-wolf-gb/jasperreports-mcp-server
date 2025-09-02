/**
 * Example usage of ResponseFormatter for standardized tool responses
 */

import {
  ResponseFormatter,
  createPaginationInfo,
  createContentInfo,
  generateCorrelationId,
} from '../src/utils/responseFormatter.js';

// Initialize the ResponseFormatter
const formatter = new ResponseFormatter();

console.log('=== ResponseFormatter Usage Examples ===\n');

// Example 1: Basic success response
console.log('1. Basic Success Response:');
const basicResponse = formatter.formatSuccess(
  'example_tool',
  { message: 'Operation completed successfully', userId: 123 },
  150, // execution time in ms
  generateCorrelationId()
);
console.log(JSON.stringify(basicResponse, null, 2));
console.log();

// Example 2: Collection response
console.log('2. Collection Response:');
const items = [
  { id: 1, name: 'Report 1' },
  { id: 2, name: 'Report 2' },
  { id: 3, name: 'Report 3' },
];
const paginationInfo = createPaginationInfo(100, 0, 10, 3);
const collectionResponse = formatter.formatCollection(
  'list_reports',
  items,
  paginationInfo,
  250,
  generateCorrelationId()
);
console.log(JSON.stringify(collectionResponse, null, 2));
console.log();

// Example 3: Binary content response
console.log('3. Binary Content Response:');
const content = Buffer.from('PDF content here');
const contentInfo = createContentInfo('application/pdf', 'report.pdf', 1024);
const binaryResponse = formatter.formatBinaryContent(
  'generate_report',
  content,
  contentInfo,
  500,
  generateCorrelationId()
);
console.log(
  JSON.stringify(
    {
      ...binaryResponse,
      content: '[Binary Content - ' + binaryResponse.content.length + ' bytes]',
    },
    null,
    2
  )
);
console.log();

// Example 4: Error response
console.log('4. Error Response:');
const error = new Error('Invalid parameter provided');
error.statusCode = 400;
const errorResponse = formatter.formatError('validate_input', error, 75, generateCorrelationId());
console.log(JSON.stringify(errorResponse, null, 2));
console.log();

// Example 5: Execution status response
console.log('5. Execution Status Response:');
const statusResponse = formatter.formatExecutionStatus(
  'async_report',
  'exec-123',
  'running',
  { progress: 45, currentPage: 3, totalPages: 10 },
  100,
  generateCorrelationId()
);
console.log(JSON.stringify(statusResponse, null, 2));
console.log();

// Example 6: Health check response
console.log('6. Health Check Response:');
const healthResponse = formatter.formatHealthCheck(
  'health_check',
  true,
  {
    database: { status: 'healthy', responseTime: 15 },
    jasperServer: { status: 'healthy', responseTime: 25 },
    memory: { status: 'warning', usage: 85 },
  },
  50,
  generateCorrelationId()
);
console.log(JSON.stringify(healthResponse, null, 2));
console.log();

// Example 7: Using execution timer
console.log('7. Execution Timer Usage:');
const timer = formatter.createExecutionTimer();

// Simulate some work
await new Promise(resolve => setTimeout(resolve, 100));

const executionTime = timer.stop();
console.log(`Execution completed in ${executionTime.toFixed(2)}ms`);
console.log();

// Example 8: Wrapped tool handler
console.log('8. Wrapped Tool Handler:');
const originalHandler = async params => {
  // Simulate some processing
  await new Promise(resolve => setTimeout(resolve, 50));
  return {
    processed: params.data,
    count: params.data ? params.data.length : 0,
  };
};

const wrappedHandler = formatter.wrapToolHandler('process_data', originalHandler);
const wrappedResult = await wrappedHandler({ data: 'test data' });
console.log(JSON.stringify(wrappedResult, null, 2));
console.log();

// Example 9: Enhanced existing response
console.log('9. Enhanced Existing Response:');
const existingResponse = {
  result: 'success',
  data: { id: 456, status: 'active' },
};
const enhancedResponse = formatter.enhanceResponse(
  existingResponse,
  'legacy_tool',
  200,
  generateCorrelationId()
);
console.log(JSON.stringify(enhancedResponse, null, 2));
console.log();

console.log('=== All examples completed ===');
