/**
 * Integration tests for validators with ValidationManager
 * Tests that the updated validation system works correctly
 */

import { Validator } from '../../../src/utils/validators.js';
import { ValidationError } from '../../../src/models/errors.js';

describe('Validators Integration with ValidationManager', () => {
  describe('Authentication Validation', () => {
    test('should validate authentication request with base properties', () => {
      const validData = {
        username: 'testuser',
        password: 'testpass123',
        authType: 'basic',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
      };

      expect(() => {
        Validator.validateAuthentication(validData);
      }).not.toThrow();
    });

    test('should reject authentication request with missing required fields', () => {
      const invalidData = {
        username: 'testuser',
        // Missing password
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
      };

      expect(() => {
        Validator.validateAuthentication(invalidData);
      }).toThrow(ValidationError);
    });

    test('should provide detailed error messages', () => {
      const invalidData = {
        username: '',
        password: '123', // Too short
        authType: 'invalid',
      };

      try {
        Validator.validateAuthentication(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('authentication');
        expect(error.validationResults.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Resource Upload Validation', () => {
    test('should validate resource upload with base properties excluded', () => {
      const validData = {
        resourcePath: '/reports/test-report',
        label: 'Test Report',
        resourceType: 'reportUnit',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
      };

      expect(() => {
        Validator.validateResourceUpload(validData);
      }).not.toThrow();
    });

    test('should reject invalid resource path', () => {
      const invalidData = {
        resourcePath: 'invalid-path', // Should start with /
        label: 'Test Report',
      };

      try {
        Validator.validateResourceUpload(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('Resource path must start with "/"');
      }
    });
  });

  describe('Report Execution Validation', () => {
    test('should validate report execution with optional parameters', () => {
      const validData = {
        reportUri: '/reports/test-report',
        outputFormat: 'pdf',
        parameters: { param1: 'value1' },
        locale: 'en_US',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
      };

      expect(() => {
        Validator.validateReportExecution(validData);
      }).not.toThrow();
    });

    test('should reject invalid output format', () => {
      const invalidData = {
        reportUri: '/reports/test-report',
        outputFormat: 'invalid-format',
      };

      try {
        Validator.validateReportExecution(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('one of: pdf, html, xlsx');
      }
    });
  });

  describe('Execution Result Validation', () => {
    test('should require exportId parameter', () => {
      const invalidData = {
        executionId: 'exec_123',
        // Missing exportId which is now required
      };

      try {
        Validator.validateExecutionResult(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults.some(e => e.field === 'exportId')).toBe(true);
      }
    });

    test('should validate with both executionId and exportId', () => {
      const validData = {
        executionId: 'exec_123',
        exportId: 'export_456',
      };

      expect(() => {
        Validator.validateExecutionResult(validData);
      }).not.toThrow();
    });
  });

  describe('User Management Validation', () => {
    test('should validate user creation with proper username pattern', () => {
      const validData = {
        username: 'test.user_123',
        password: 'password123',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
      };

      expect(() => {
        Validator.validateUserCreate(validData);
      }).not.toThrow();
    });

    test('should reject invalid username pattern', () => {
      const invalidData = {
        username: 'test user', // Spaces not allowed
        password: 'password123',
        fullName: 'Test User',
      };

      try {
        Validator.validateUserCreate(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('Username must contain only');
      }
    });
  });

  describe('Job Management Validation', () => {
    test('should validate job creation with schedule', () => {
      const validData = {
        label: 'Test Job',
        reportUri: '/reports/test-report',
        schedule: {
          type: 'simple',
          startDate: '2024-01-01T00:00:00Z',
          recurrenceInterval: 1,
          recurrenceIntervalUnit: 'DAY',
        },
      };

      expect(() => {
        Validator.validateJobCreation(validData);
      }).not.toThrow();
    });

    test('should reject job creation without required schedule', () => {
      const invalidData = {
        label: 'Test Job',
        reportUri: '/reports/test-report',
        // Missing schedule
      };

      try {
        Validator.validateJobCreation(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults.some(e => e.field === 'schedule')).toBe(true);
      }
    });
  });

  describe('Input Control Validation', () => {
    test('should validate input control values request', () => {
      const validData = {
        reportUri: '/reports/test-report',
        controlId: 'param1',
        values: { param1: 'value1' },
      };

      expect(() => {
        Validator.validateInputControlValues(validData);
      }).not.toThrow();
    });

    test('should reject missing controlId', () => {
      const invalidData = {
        reportUri: '/reports/test-report',
        values: { param1: 'value1' },
        // Missing controlId
      };

      try {
        Validator.validateInputControlValues(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults.some(e => e.field === 'controlId')).toBe(true);
      }
    });
  });

  describe('Domain Management Validation', () => {
    test('should validate domain get request', () => {
      const validData = {
        domainUri: '/domains/test-domain',
        includeMetadata: true,
        includeSchema: false,
      };

      expect(() => {
        Validator.validateDomainGet(validData);
      }).not.toThrow();
    });

    test('should reject invalid domain URI', () => {
      const invalidData = {
        domainUri: 'invalid-uri', // Should start with /
      };

      try {
        Validator.validateDomainGet(invalidData);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('pattern');
      }
    });
  });
});
