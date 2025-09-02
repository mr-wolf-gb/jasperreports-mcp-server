/**
 * Test file to verify test helpers functionality
 */

import { jest } from '@jest/globals';
import { TestHelpers, MockJasperServer, TestDataGenerator, TestCleanup } from './index.js';

describe('Test Helpers', () => {
  let testHelpers;
  let cleanup;
  let mockServer;

  beforeEach(() => {
    testHelpers = new TestHelpers();
    cleanup = new TestCleanup();
  });

  afterEach(async () => {
    // Clean up test helpers
    if (testHelpers) {
      await testHelpers.cleanup();
    }

    // Clean up test cleanup instance
    if (cleanup) {
      await cleanup.cleanupAll();
    }

    // Stop mock server if it exists
    if (mockServer) {
      await mockServer.stop();
      mockServer = null;
    }
  });

  describe('TestHelpers', () => {
    test('should read fixture files', async () => {
      const jrxmlContent = await testHelpers.readFixture('reports/simple_report.jrxml');
      expect(jrxmlContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(jrxmlContent).toContain('<jasperReport');
      expect(jrxmlContent).toContain('Simple Test Report');
    });

    test('should validate JRXML content', () => {
      const validJrxml =
        '<?xml version="1.0"?><jasperReport name="test" pageWidth="595" pageHeight="842"></jasperReport>';
      const result = testHelpers.validateJRXML(validJrxml);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid JRXML content', () => {
      const invalidJrxml = '<invalid>content</invalid>';
      const result = testHelpers.validateJRXML(invalidJrxml);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should create test parameters', () => {
      const params = testHelpers.createTestParameters({
        CustomParam: 'Custom Value',
      });
      expect(params.ReportTitle).toBe('Test Report');
      expect(params.CustomParam).toBe('Custom Value');
    });

    test('should generate random strings', () => {
      const str1 = testHelpers.generateRandomString(10);
      const str2 = testHelpers.generateRandomString(10);
      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    test('should create mock responses', () => {
      const response = testHelpers.createMockResponse(200, { success: true });
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.headers['content-type']).toBe('application/json');
    });

    test('should create mock errors', () => {
      const error = testHelpers.createMockError(404, 'Not Found');
      expect(error.message).toBe('Not Found');
      expect(error.response.status).toBe(404);
      expect(error.status).toBe(404);
    });
  });

  describe('TestDataGenerator', () => {
    let dataGenerator;

    beforeEach(() => {
      dataGenerator = new TestDataGenerator();
    });

    test('should generate employee data', () => {
      const employees = dataGenerator.generateEmployees(5);
      expect(employees).toHaveLength(5);
      expect(employees[0]).toHaveProperty('id');
      expect(employees[0]).toHaveProperty('firstName');
      expect(employees[0]).toHaveProperty('lastName');
      expect(employees[0]).toHaveProperty('department');
      expect(employees[0]).toHaveProperty('salary');
    });

    test('should generate sales data', () => {
      const sales = dataGenerator.generateSalesData(10);
      expect(sales).toHaveLength(10);
      expect(sales[0]).toHaveProperty('saleId');
      expect(sales[0]).toHaveProperty('product');
      expect(sales[0]).toHaveProperty('totalAmount');
    });

    test('should generate report executions', () => {
      const executions = dataGenerator.generateReportExecutions(3);
      expect(executions).toHaveLength(3);
      expect(executions[0]).toHaveProperty('requestId');
      expect(executions[0]).toHaveProperty('reportURI');
      expect(executions[0]).toHaveProperty('status');
    });

    test('should generate error scenarios', () => {
      const errors = dataGenerator.generateErrorScenarios();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('statusCode');
      expect(errors[0]).toHaveProperty('errorCode');
      expect(errors[0]).toHaveProperty('message');
    });
  });

  describe('TestCleanup', () => {
    test('should register and track temp files', () => {
      cleanup.registerTempFile('/tmp/test1.txt');
      cleanup.registerTempFile('/tmp/test2.txt');

      const stats = cleanup.getStatistics();
      expect(stats.tempFiles).toBe(2);
      expect(stats.totalItems).toBe(2);
    });

    test('should register cleanup callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      cleanup.registerCleanupCallback(callback1);
      cleanup.registerCleanupCallback(callback2);

      const stats = cleanup.getStatistics();
      expect(stats.cleanupCallbacks).toBe(2);
    });

    test('should reset all registrations', () => {
      cleanup.registerTempFile('/tmp/test.txt');
      cleanup.registerTestResource('/test/resource');
      cleanup.registerCleanupCallback(() => {});

      let stats = cleanup.getStatistics();
      expect(stats.totalItems).toBeGreaterThan(0);

      cleanup.reset();
      stats = cleanup.getStatistics();
      expect(stats.totalItems).toBe(0);
    });
  });

  describe('MockJasperServer', () => {
    test('should create mock server instance', () => {
      const server = new MockJasperServer(8082);
      expect(server.port).toBe(8082);
      expect(server.getUrl()).toBe('http://localhost:8082/jasperserver');
    });

    test('should start and stop mock server', async () => {
      const server = new MockJasperServer(8083);

      await server.start();
      expect(server.server).toBeTruthy();

      await server.stop();
    }, 10000);

    test('should reset mock server data', () => {
      const server = new MockJasperServer(8084);

      // Add some test data
      server.addResource('/test/resource', { label: 'Test Resource' });
      expect(server.resources.has('/test/resource')).toBe(true);

      // Reset should clear the data
      server.reset();
      expect(server.resources.has('/test/resource')).toBe(false);
    });
  });
});
