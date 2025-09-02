/**
 * Simple unit tests for ReportService core functionality
 */

import ReportService from '../../../src/services/reportService.js';

// Mock the dependencies by creating a simple test service
class MockAPIClient {
  constructor() {
    this.responses = new Map();
  }

  setResponse(url, response) {
    this.responses.set(url, response);
  }

  async post(url, _data, _options) {
    const response = this.responses.get(url);
    if (response) {
      return response;
    }
    return {
      status: 200,
      data: Buffer.from('Mock PDF content'),
      headers: { 'content-type': 'application/pdf' },
    };
  }

  async get(url) {
    const response = this.responses.get(url);
    if (response) {
      return response;
    }
    return {
      status: 200,
      data: {
        uri: '/reports/test',
        resourceType: 'reportUnit',
        label: 'Test Report',
      },
    };
  }
}

class MockErrorHandler {
  createValidationError(field, message, value, constraint) {
    const error = new Error(`Validation error: ${message}`);
    error.field = field;
    error.value = value;
    error.constraint = constraint;
    return error;
  }

  createInternalError(message, details) {
    const error = new Error(`Internal error: ${message}`);
    error.details = details;
    return error;
  }

  mapHttpError(status, data, context) {
    return new Error(`HTTP ${status} error: ${context}`);
  }

  logError(_error, _context, _additionalData) {
    // Mock logging
  }
}

const mockConfig = {
  jasperUrl: 'http://localhost:8080/jasperserver',
  authType: 'basic',
  username: 'jasperadmin',
  password: 'jasperadmin',
  debugMode: false,
  timeout: 30000,
};

describe('ReportService Core Functionality', () => {
  let reportService;
  let mockApiClient;
  let mockErrorHandler;

  beforeEach(() => {
    mockApiClient = new MockAPIClient();
    mockErrorHandler = new MockErrorHandler();
    reportService = new ReportService(mockConfig, mockApiClient);
    reportService.errorHandler = mockErrorHandler;
  });

  afterEach(() => {
    if (reportService) {
      reportService.dispose();
    }
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(reportService.config).toEqual(mockConfig);
      expect(reportService.apiClient).toBe(mockApiClient);
    });

    it('should initialize execution statistics', () => {
      const stats = reportService.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.formatStats).toBeDefined();
      expect(stats.formatStats.pdf).toBeDefined();
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported output formats', () => {
      const formats = reportService.getSupportedFormats();

      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);

      const pdfFormat = formats.find(f => f.format === 'pdf');
      expect(pdfFormat).toBeDefined();
      expect(pdfFormat.mimeType).toBe('application/pdf');
      expect(pdfFormat.extension).toBe('pdf');
      expect(pdfFormat.binary).toBe(true);
    });

    it('should include all expected formats', () => {
      const formats = reportService.getSupportedFormats();
      const formatNames = formats.map(f => f.format);

      expect(formatNames).toContain('pdf');
      expect(formatNames).toContain('html');
      expect(formatNames).toContain('xlsx');
      expect(formatNames).toContain('csv');
      expect(formatNames).toContain('rtf');
      expect(formatNames).toContain('docx');
    });
  });

  describe('runReportSync', () => {
    it('should execute a simple PDF report successfully', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'pdf',
        parameters: {},
      };

      mockApiClient.setResponse('/rest_v2/reportExecutions', {
        status: 200,
        data: Buffer.from('PDF content'),
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await reportService.runReportSync(request);

      expect(result.success).toBe(true);
      expect(result.status).toBe('ready');
      expect(result.outputFormat).toBe('pdf');
      expect(result.reportUri).toBe('/reports/test_report');
      expect(result.content).toEqual(Buffer.from('PDF content'));
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toBe('test_report.pdf');
    });

    it('should handle HTML format correctly', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'html',
        parameters: {},
      };

      mockApiClient.setResponse('/rest_v2/reportExecutions', {
        status: 200,
        data: '<html><body>Report content</body></html>',
        headers: { 'content-type': 'text/html' },
      });

      const result = await reportService.runReportSync(request);

      expect(result.success).toBe(true);
      expect(result.outputFormat).toBe('html');
      expect(result.content).toBe('<html><body>Report content</body></html>');
      expect(result.contentType).toBe('text/html');
      expect(result.fileName).toBe('test_report.html');
    });

    it('should transform parameters correctly', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'pdf',
        parameters: {
          stringParam: 'test',
          numberParam: 123,
          dateParam: new Date('2023-01-01T00:00:00.000Z'),
          arrayParam: ['a', 'b', 'c'],
          objectParam: { key: 'value' },
        },
      };

      let capturedRequestBody = null;
      const originalPost = mockApiClient.post;
      mockApiClient.post = async (url, data, options) => {
        capturedRequestBody = data;
        return originalPost.call(mockApiClient, url, data, options);
      };

      await reportService.runReportSync(request);

      expect(capturedRequestBody.parameters).toEqual({
        stringParam: 'test',
        numberParam: '123',
        dateParam: '2023-01-01T00:00:00.000Z',
        arrayParam: ['a', 'b', 'c'],
        objectParam: '{"key":"value"}',
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        outputFormat: 'pdf',
        // missing reportUri
      };

      await expect(reportService.runReportSync(invalidRequest)).rejects.toThrow();
    });

    it('should validate output format', async () => {
      const invalidRequest = {
        reportUri: '/reports/test_report',
        outputFormat: 'invalid_format',
      };

      await expect(reportService.runReportSync(invalidRequest)).rejects.toThrow();
    });
  });

  describe('validateReport', () => {
    it('should validate existing report', async () => {
      mockApiClient.setResponse('/rest_v2/resources/reports/test_report', {
        status: 200,
        data: {
          uri: '/reports/test_report',
          resourceType: 'reportUnit',
          label: 'Test Report',
        },
      });

      const result = await reportService.validateReport('/reports/test_report');

      expect(result.valid).toBe(true);
      expect(result.resource).toBeDefined();
      expect(result.message).toBe('Report is valid and accessible');
    });

    it('should reject non-report resources', async () => {
      mockApiClient.setResponse('/rest_v2/resources/folders/test_folder', {
        status: 200,
        data: {
          uri: '/folders/test_folder',
          resourceType: 'folder',
          label: 'Test Folder',
        },
      });

      const result = await reportService.validateReport('/folders/test_folder');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not a report');
    });
  });

  describe('execution tracking', () => {
    it('should update statistics after successful execution', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'pdf',
        parameters: {},
      };

      await reportService.runReportSync(request);

      const stats = reportService.getExecutionStatistics();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.formatStats.pdf.executions).toBe(1);
    });

    it('should maintain execution history', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'pdf',
        parameters: {},
      };

      await reportService.runReportSync(request);

      const history = reportService.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].reportUri).toBe('/reports/test_report');
      expect(history[0].outputFormat).toBe('pdf');
      expect(history[0].success).toBe(true);
    });

    it('should clear history and statistics', async () => {
      const request = {
        reportUri: '/reports/test_report',
        outputFormat: 'pdf',
        parameters: {},
      };

      await reportService.runReportSync(request);

      expect(reportService.getExecutionHistory()).toHaveLength(1);
      expect(reportService.getExecutionStatistics().totalExecutions).toBe(1);

      reportService.clearExecutionHistory();

      expect(reportService.getExecutionHistory()).toHaveLength(0);
      expect(reportService.getExecutionStatistics().totalExecutions).toBe(0);
    });
  });

  describe('getReportMetadata', () => {
    it('should return report metadata', async () => {
      mockApiClient.setResponse('/rest_v2/resources/reports/test_report', {
        status: 200,
        data: {
          uri: '/reports/test_report',
          label: 'Test Report',
          description: 'A test report',
          resourceType: 'reportUnit',
          creationDate: '2023-01-01T00:00:00Z',
          updateDate: '2023-01-02T00:00:00Z',
          version: 1,
        },
      });

      mockApiClient.setResponse('/rest_v2/reports/reports/test_report/inputControls', {
        status: 200,
        data: {
          inputControl: [
            {
              id: 'param1',
              label: 'Parameter 1',
              type: 'singleValue',
            },
          ],
        },
      });

      const metadata = await reportService.getReportMetadata('/reports/test_report');

      expect(metadata.uri).toBe('/reports/test_report');
      expect(metadata.label).toBe('Test Report');
      expect(metadata.inputControls).toHaveLength(1);
      expect(metadata.supportedFormats).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      reportService.dispose();

      expect(reportService.getActiveExecutions()).toHaveLength(0);
      expect(reportService.getExecutionHistory()).toHaveLength(0);
    });
  });
});
