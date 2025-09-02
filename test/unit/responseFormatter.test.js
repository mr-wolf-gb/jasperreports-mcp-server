/**
 * Unit tests for ResponseFormatter
 */

import {
  ResponseFormatter,
  createPaginationInfo,
  createContentInfo,
  generateCorrelationId,
} from '../../src/utils/responseFormatter.js';

describe('ResponseFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new ResponseFormatter();
  });

  describe('formatSuccess', () => {
    test('should format basic success response', () => {
      const result = formatter.formatSuccess('test_tool', { message: 'success' }, 100);

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('test_tool');
      expect(result.executionTime).toBe(100);
      expect(result.timestamp).toBeDefined();
      expect(result.message).toBe('success');
    });

    test('should handle correlation ID', () => {
      const correlationId = 'test-123';
      const result = formatter.formatSuccess('test_tool', { data: 'test' }, 50, correlationId);

      expect(result.correlationId).toBe(correlationId);
    });

    test('should handle primitive data types', () => {
      const result = formatter.formatSuccess('test_tool', 'simple string', 25);

      expect(result.data).toBe('simple string');
    });
  });

  describe('formatError', () => {
    test('should format error response', () => {
      const error = new Error('Test error');
      const result = formatter.formatError('test_tool', error, 150);

      expect(result.success).toBe(false);
      expect(result.toolName).toBe('test_tool');
      expect(result.executionTime).toBe(150);
      expect(result.error.type).toBe('Error');
      expect(result.error.message).toBe('Test error');
    });

    test('should handle MCP error objects', () => {
      const mcpError = {
        type: 'InvalidParams',
        message: 'Invalid parameter',
        details: { field: 'test' },
      };
      const result = formatter.formatError('test_tool', mcpError, 75);

      expect(result.error.type).toBe('InvalidParams');
      expect(result.error.details.field).toBe('test');
    });
  });

  describe('formatCollection', () => {
    test('should format collection response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const paginationInfo = {
        totalCount: 10,
        offset: 0,
        limit: 2,
        hasMore: true,
      };

      const result = formatter.formatCollection('list_tool', items, paginationInfo, 200);

      expect(result.success).toBe(true);
      expect(result.items).toEqual(items);
      expect(result.totalCount).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('formatBinaryContent', () => {
    test('should format binary content response', () => {
      const content = Buffer.from('test content');
      const contentInfo = {
        contentType: 'application/pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
      };

      const result = formatter.formatBinaryContent('report_tool', content, contentInfo, 300);

      expect(result.success).toBe(true);
      expect(result.content).toBe(content);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toBe('test.pdf');
      expect(result.fileSize).toBe(1024);
    });
  });

  describe('createExecutionTimer', () => {
    test('should track execution time', async () => {
      const timer = formatter.createExecutionTimer();

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));

      const executionTime = timer.stop();
      expect(executionTime).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(100); // Should be around 10ms
    });
  });

  describe('wrapToolHandler', () => {
    test('should wrap handler with automatic formatting', async () => {
      const mockHandler = async params => ({ message: 'success', receivedParams: params });
      const wrappedHandler = formatter.wrapToolHandler('test_tool', mockHandler);

      const result = await wrappedHandler({ param: 'value' });

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('test_tool');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.message).toBe('success');
      expect(result.receivedParams).toEqual({ param: 'value' });
    });

    test('should handle errors in wrapped handler', async () => {
      const mockHandler = async () => {
        throw new Error('Handler error');
      };
      const wrappedHandler = formatter.wrapToolHandler('test_tool', mockHandler);

      const result = await wrappedHandler({ param: 'value' });

      expect(result.success).toBe(false);
      expect(result.toolName).toBe('test_tool');
      expect(result.error.message).toBe('Handler error');
    });

    test('should format collection responses when specified', async () => {
      const mockHandler = async () => ({
        items: [{ id: 1 }],
        totalCount: 1,
        offset: 0,
        limit: 10,
        hasMore: false,
      });

      const wrappedHandler = formatter.wrapToolHandler('list_tool', mockHandler, {
        formatAsCollection: true,
      });

      const result = await wrappedHandler({});

      expect(result.success).toBe(true);
      expect(result.items).toEqual([{ id: 1 }]);
      expect(result.totalCount).toBe(1);
    });
  });
});

describe('Utility functions', () => {
  describe('createPaginationInfo', () => {
    test('should create pagination info', () => {
      const info = createPaginationInfo(100, 20, 10, 10);

      expect(info.totalCount).toBe(100);
      expect(info.offset).toBe(20);
      expect(info.limit).toBe(10);
      expect(info.hasMore).toBe(true);
    });
  });

  describe('createContentInfo', () => {
    test('should create content info', () => {
      const info = createContentInfo('application/pdf', 'test.pdf', 1024, 'binary');

      expect(info.contentType).toBe('application/pdf');
      expect(info.fileName).toBe('test.pdf');
      expect(info.fileSize).toBe(1024);
      expect(info.encoding).toBe('binary');
    });
  });

  describe('generateCorrelationId', () => {
    test('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });
});
