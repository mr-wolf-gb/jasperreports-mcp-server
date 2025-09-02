/**
 * Basic functionality test for ExecutionService
 */

import { jest } from '@jest/globals';
import ExecutionService, {
  EXECUTION_STATUS,
  ASYNC_OUTPUT_FORMATS,
} from '../../../src/services/executionService.js';

describe('ExecutionService Basic Tests', () => {
  let executionService;
  let mockConfig;
  let mockApiClient;

  beforeEach(() => {
    // Setup mock configuration
    mockConfig = {
      jasperUrl: 'http://localhost:8080/jasperserver',
      debugMode: false,
      timeout: 30000,
    };

    // Setup mock API client
    mockApiClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
    };

    // Create service instance with mocked dependencies
    executionService = new ExecutionService(mockConfig, mockApiClient);
  });

  describe('initialization', () => {
    it('should initialize with correct constants', () => {
      expect(EXECUTION_STATUS.QUEUED).toBe('queued');
      expect(EXECUTION_STATUS.RUNNING).toBe('running');
      expect(EXECUTION_STATUS.READY).toBe('ready');
      expect(EXECUTION_STATUS.CANCELLED).toBe('cancelled');
      expect(EXECUTION_STATUS.FAILED).toBe('failed');
    });

    it('should have async output formats defined', () => {
      expect(ASYNC_OUTPUT_FORMATS.PDF).toBe('pdf');
      expect(ASYNC_OUTPUT_FORMATS.HTML).toBe('html');
      expect(ASYNC_OUTPUT_FORMATS.XLSX).toBe('xlsx');
    });

    it('should initialize with empty active executions', () => {
      expect(executionService.activeExecutions.size).toBe(0);
    });

    it('should initialize with empty execution history', () => {
      expect(executionService.executionHistory).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should get supported async formats', () => {
      const formats = executionService.getSupportedAsyncFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats[0]).toHaveProperty('name');
      expect(formats[0]).toHaveProperty('format');
      expect(formats[0]).toHaveProperty('async');
      expect(formats[0].async).toBe(true);
    });

    it('should get active executions', () => {
      // Add some mock executions
      executionService.activeExecutions.set('exec_1', { executionId: 'exec_1', status: 'running' });
      executionService.activeExecutions.set('exec_2', { executionId: 'exec_2', status: 'queued' });

      const active = executionService.getActiveExecutions();
      expect(active).toHaveLength(2);
      expect(active[0]).toHaveProperty('executionId');
      expect(active[1]).toHaveProperty('executionId');
    });

    it('should get execution statistics', () => {
      const stats = executionService.getExecutionStatistics();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successfulExecutions');
      expect(stats).toHaveProperty('failedExecutions');
      expect(stats).toHaveProperty('cancelledExecutions');
      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('formatStats');
      expect(stats).toHaveProperty('statusStats');
      expect(stats.totalExecutions).toBe(0);
      expect(stats.activeExecutions).toBe(0);
    });

    it('should clear execution history', () => {
      // Add some mock history
      executionService.executionHistory = [
        { executionId: 'exec_1', status: 'ready' },
        { executionId: 'exec_2', status: 'failed' },
      ];
      executionService.executionStats.totalExecutions = 5;

      executionService.clearExecutionHistory();

      expect(executionService.executionHistory).toHaveLength(0);
      expect(executionService.executionStats.totalExecutions).toBe(0);
    });
  });

  describe('private helper methods', () => {
    it('should determine output format from content type', () => {
      const format1 = executionService._determineOutputFormat('application/pdf', 'export_pdf');
      expect(format1).toBe('pdf');

      const format2 = executionService._determineOutputFormat('text/html', 'export_html');
      expect(format2).toBe('html');

      const format3 = executionService._determineOutputFormat('unknown/type', 'export_xlsx');
      expect(format3).toBe('xlsx');

      const format4 = executionService._determineOutputFormat('unknown/type', 'unknown_export');
      expect(format4).toBe('pdf'); // default
    });

    it('should check if execution is complete', () => {
      expect(executionService._isExecutionComplete(EXECUTION_STATUS.READY)).toBe(true);
      expect(executionService._isExecutionComplete(EXECUTION_STATUS.CANCELLED)).toBe(true);
      expect(executionService._isExecutionComplete(EXECUTION_STATUS.FAILED)).toBe(true);
      expect(executionService._isExecutionComplete(EXECUTION_STATUS.RUNNING)).toBe(false);
      expect(executionService._isExecutionComplete(EXECUTION_STATUS.QUEUED)).toBe(false);
    });

    it('should transform parameters correctly', () => {
      const params = {
        stringParam: 'test',
        numberParam: 123,
        dateParam: new Date('2023-01-01T00:00:00.000Z'),
        arrayParam: ['a', 'b', 'c'],
        objectParam: { key: 'value' },
        nullParam: null,
        undefinedParam: undefined,
      };

      const transformed = executionService._transformParameters(params);

      expect(transformed.stringParam).toBe('test');
      expect(transformed.numberParam).toBe('123');
      expect(transformed.dateParam).toContain('2023-01-01');
      expect(transformed.arrayParam).toEqual(['a', 'b', 'c']);
      expect(transformed.objectParam).toBe('{"key":"value"}');
      expect(transformed.nullParam).toBeUndefined();
      expect(transformed.undefinedParam).toBeUndefined();
    });

    it('should generate result filename', () => {
      const filename1 = executionService._generateResultFileName(
        'exec_123',
        'export_456',
        'pdf',
        null
      );
      expect(filename1).toMatch(/execution_exec_123_export_456_.*\.pdf/);

      const filename2 = executionService._generateResultFileName(
        'exec_123',
        'export_456',
        'xlsx',
        'custom.xlsx'
      );
      expect(filename2).toBe('custom.xlsx');
    });

    it('should generate unique request IDs', () => {
      const id1 = executionService._generateRequestId();
      const id2 = executionService._generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('execution tracking', () => {
    it('should track async execution', () => {
      const request = {
        reportUri: '/reports/test',
        outputFormat: 'pdf',
        parameters: { param1: 'value1' },
        requestId: 'req_123',
      };
      const startTime = Date.now();

      executionService._trackAsyncExecution('exec_123', request, startTime);

      expect(executionService.activeExecutions.has('exec_123')).toBe(true);
      const execution = executionService.activeExecutions.get('exec_123');
      expect(execution.executionId).toBe('exec_123');
      expect(execution.reportUri).toBe('/reports/test');
      expect(execution.outputFormat).toBe('pdf');
      expect(execution.status).toBe(EXECUTION_STATUS.QUEUED);
    });

    it('should update execution tracking', () => {
      // First track an execution
      executionService.activeExecutions.set('exec_123', {
        executionId: 'exec_123',
        status: EXECUTION_STATUS.QUEUED,
        outputFormat: 'pdf',
        startTime: new Date().toISOString(),
      });

      const statusResult = {
        status: EXECUTION_STATUS.RUNNING,
        progress: 50,
        currentPage: 5,
        totalPages: 10,
        exports: [],
      };

      executionService._updateExecutionTracking('exec_123', statusResult);

      const execution = executionService.activeExecutions.get('exec_123');
      expect(execution.status).toBe(EXECUTION_STATUS.RUNNING);
      expect(execution.progress).toBe(50);
      expect(execution.currentPage).toBe(5);
      expect(execution.totalPages).toBe(10);
    });

    it('should move completed executions to history', () => {
      // Track an execution
      executionService.activeExecutions.set('exec_123', {
        executionId: 'exec_123',
        status: EXECUTION_STATUS.RUNNING,
        outputFormat: 'pdf',
        startTime: new Date().toISOString(),
      });

      const statusResult = {
        status: EXECUTION_STATUS.READY,
        progress: 100,
        endTime: new Date().toISOString(),
      };

      executionService._updateExecutionTracking('exec_123', statusResult);

      // Should be removed from active executions
      expect(executionService.activeExecutions.has('exec_123')).toBe(false);

      // Should be added to history
      expect(executionService.executionHistory.length).toBe(1);
      expect(executionService.executionHistory[0].executionId).toBe('exec_123');
      expect(executionService.executionHistory[0].status).toBe(EXECUTION_STATUS.READY);
    });
  });

  describe('cleanup methods', () => {
    it('should cleanup old executions', () => {
      const now = new Date();
      const oldTime = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      executionService.executionHistory = [
        { executionId: 'exec_old', completedAt: oldTime.toISOString() },
        { executionId: 'exec_recent', completedAt: recentTime.toISOString() },
      ];

      const cleanedCount = executionService.cleanupOldExecutions(24 * 60 * 60 * 1000); // 24 hours

      expect(cleanedCount).toBe(1);
      expect(executionService.executionHistory.length).toBe(1);
      expect(executionService.executionHistory[0].executionId).toBe('exec_recent');
    });

    it('should dispose properly', () => {
      // Add some active executions
      executionService.activeExecutions.set('exec_1', { executionId: 'exec_1' });
      executionService.activeExecutions.set('exec_2', { executionId: 'exec_2' });
      executionService.executionHistory = [{ executionId: 'exec_old' }];

      executionService.dispose();

      expect(executionService.activeExecutions.size).toBe(0);
      expect(executionService.executionHistory.length).toBe(0);
    });
  });
});
