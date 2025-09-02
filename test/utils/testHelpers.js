import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test helper utilities for JasperReports MCP Server testing
 */
class TestHelpers {
  constructor() {
    this.fixturesPath = path.join(__dirname, '..', 'fixtures');
    this.tempFiles = new Set();
  }

  /**
   * Get the path to test fixtures directory
   * @param {string} subPath - Optional sub-path within fixtures
   * @returns {string} Full path to fixtures or sub-directory
   */
  getFixturePath(subPath = '') {
    return path.join(this.fixturesPath, subPath);
  }

  /**
   * Read a test fixture file
   * @param {string} relativePath - Path relative to fixtures directory
   * @returns {Promise<string>} File content as string
   */
  async readFixture(relativePath) {
    const filePath = this.getFixturePath(relativePath);
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Read a binary test fixture file
   * @param {string} relativePath - Path relative to fixtures directory
   * @returns {Promise<Buffer>} File content as buffer
   */
  async readBinaryFixture(relativePath) {
    const filePath = this.getFixturePath(relativePath);
    return await fs.readFile(filePath);
  }

  /**
   * Get base64 encoded content of a fixture file
   * @param {string} relativePath - Path relative to fixtures directory
   * @returns {Promise<string>} Base64 encoded content
   */
  async getFixtureBase64(relativePath) {
    const buffer = await this.readBinaryFixture(relativePath);
    return buffer.toString('base64');
  }

  /**
   * Create a temporary file for testing
   * @param {string} content - File content
   * @param {string} extension - File extension (default: .tmp)
   * @returns {Promise<string>} Path to temporary file
   */
  async createTempFile(content, extension = '.tmp') {
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = `test_${crypto.randomUUID()}${extension}`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, content);
    this.tempFiles.add(filePath);

    return filePath;
  }

  /**
   * Clean up temporary files created during testing
   */
  async cleanup() {
    for (const filePath of this.tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors when cleaning up temp files
        console.warn(`Failed to cleanup temp file ${filePath}:`, error.message);
      }
    }
    this.tempFiles.clear();
  }

  /**
   * Generate test data for reports
   * @param {number} recordCount - Number of records to generate
   * @returns {Array} Array of test data objects
   */
  generateTestData(recordCount = 10) {
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
    ];

    const data = [];
    for (let i = 0; i < recordCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const salary = Math.floor(Math.random() * 50000) + 30000; // 30k-80k range
      const hireDate = new Date(
        2020 + Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      );

      data.push({
        id: i + 1,
        employee_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        department,
        salary,
        hire_date: hireDate.toISOString().split('T')[0],
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
      });
    }

    return data;
  }

  /**
   * Create test report parameters
   * @param {Object} overrides - Parameter overrides
   * @returns {Object} Test parameters object
   */
  createTestParameters(overrides = {}) {
    const defaultParams = {
      ReportTitle: 'Test Report',
      UserName: 'Test User',
      ReportDate: new Date().toISOString(),
      ShowDetails: true,
      StartDate: new Date('2023-01-01').toISOString(),
      EndDate: new Date('2023-12-31').toISOString(),
      Department: 'All Departments',
    };

    return { ...defaultParams, ...overrides };
  }

  /**
   * Create test resource descriptor
   * @param {Object} options - Resource options
   * @returns {Object} Resource descriptor for testing
   */
  createTestResourceDescriptor(options = {}) {
    const defaults = {
      resourcePath: '/test/reports/test_report',
      label: 'Test Report',
      description: 'A test report for unit testing',
      overwrite: true,
      createFolders: true,
    };

    return { ...defaults, ...options };
  }

  /**
   * Create test job descriptor
   * @param {Object} options - Job options
   * @returns {Object} Job descriptor for testing
   */
  createTestJobDescriptor(options = {}) {
    const defaults = {
      label: 'Test Scheduled Job',
      reportUri: '/test/reports/test_report',
      schedule: {
        type: 'simple',
        intervalUnit: 'DAY',
        interval: 1,
        startDate: new Date().toISOString(),
      },
      outputFormats: ['PDF'],
      parameters: this.createTestParameters(),
    };

    return { ...defaults, ...options };
  }

  /**
   * Create mock HTTP response
   * @param {number} statusCode - HTTP status code
   * @param {Object} data - Response data
   * @param {Object} headers - Response headers
   * @returns {Object} Mock response object
   */
  createMockResponse(statusCode = 200, data = {}, headers = {}) {
    return {
      status: statusCode,
      statusText: this.getStatusText(statusCode),
      data,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      config: {},
      request: {},
    };
  }

  /**
   * Create mock error response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {Object} Mock error response
   */
  createMockError(statusCode = 500, message = 'Internal Server Error', details = {}) {
    const error = new Error(message);
    error.response = this.createMockResponse(statusCode, {
      errorCode: `HTTP_${statusCode}`,
      message,
      ...details,
    });
    error.status = statusCode;
    return error;
  }

  /**
   * Get HTTP status text for status code
   * @param {number} statusCode - HTTP status code
   * @returns {string} Status text
   */
  getStatusText(statusCode) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return statusTexts[statusCode] || 'Unknown';
  }

  /**
   * Wait for a specified amount of time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} Promise that resolves after the specified time
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a random string for testing
   * @param {number} length - Length of the string
   * @returns {string} Random string
   */
  generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a unique test ID
   * @returns {string} Unique test identifier
   */
  generateTestId() {
    return `test_${Date.now()}_${this.generateRandomString(8)}`;
  }

  /**
   * Validate JRXML content structure
   * @param {string} jrxmlContent - JRXML content to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateJRXML(jrxmlContent) {
    const errors = [];

    // Basic XML structure validation
    if (!jrxmlContent.includes('<?xml')) {
      errors.push('Missing XML declaration');
    }

    if (!jrxmlContent.includes('<jasperReport')) {
      errors.push('Missing jasperReport root element');
    }

    if (!jrxmlContent.includes('</jasperReport>')) {
      errors.push('Missing closing jasperReport tag');
    }

    // Check for required attributes
    if (!jrxmlContent.includes('name=')) {
      errors.push('Missing report name attribute');
    }

    if (!jrxmlContent.includes('pageWidth=')) {
      errors.push('Missing pageWidth attribute');
    }

    if (!jrxmlContent.includes('pageHeight=')) {
      errors.push('Missing pageHeight attribute');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create test configuration for different environments
   * @param {string} environment - Environment name (test, integration, etc.)
   * @returns {Object} Configuration object
   */
  createTestConfig(environment = 'test') {
    const configs = {
      test: {
        jasperUrl: 'http://localhost:8080/jasperserver',
        authType: 'basic',
        username: 'jasperadmin',
        password: 'jasperadmin',
        timeout: 30000,
        debugMode: true,
        sslVerify: false,
      },
      integration: {
        jasperUrl: process.env.JASPER_TEST_URL || 'http://localhost:8080/jasperserver',
        authType: process.env.JASPER_TEST_AUTH_TYPE || 'basic',
        username: process.env.JASPER_TEST_USERNAME || 'jasperadmin',
        password: process.env.JASPER_TEST_PASSWORD || 'jasperadmin',
        timeout: 60000,
        debugMode: false,
        sslVerify: false,
      },
      mock: {
        jasperUrl: 'http://mock-server:8080/jasperserver',
        authType: 'basic',
        username: 'mockuser',
        password: 'mockpass',
        timeout: 5000,
        debugMode: true,
        sslVerify: false,
      },
    };

    return configs[environment] || configs.test;
  }
}

export default TestHelpers;
