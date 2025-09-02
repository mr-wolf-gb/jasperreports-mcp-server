/**
 * Test suite for ValidationManager
 * Tests the enhanced validation system with base property exclusion and detailed error reporting
 */

import { ValidationManager } from '../../../src/utils/ValidationManager.js';
import { FieldValidationError, ValidationError } from '../../../src/models/errors.js';

describe('ValidationManager', () => {
  describe('Base Property Exclusion', () => {
    test('should exclude timestamp and requestId from validation', () => {
      const data = {
        username: 'testuser',
        password: 'testpass',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
      };

      const schema = {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
        additionalProperties: false,
      };

      // Should not throw error even though schema has additionalProperties: false
      expect(() => {
        ValidationManager.validateToolRequest(data, schema, 'testTool');
      }).not.toThrow();
    });

    test('excludeBaseProperties should remove base properties', () => {
      const data = {
        username: 'test',
        timestamp: '2024-01-01T00:00:00Z',
        requestId: 'req_123',
        otherField: 'value',
      };

      const result = ValidationManager.excludeBaseProperties(data);

      expect(result).toEqual({
        username: 'test',
        otherField: 'value',
      });
      expect(result).not.toHaveProperty('timestamp');
      expect(result).not.toHaveProperty('requestId');
    });
  });

  describe('Standardized Regex Patterns', () => {
    test('should use standardized resource URI pattern', () => {
      const validUris = ['/reports/test', '/folder/subfolder/report.jrxml', '/test_report-v1.0'];
      const invalidUris = ['reports/test', '/reports with spaces', '/reports/test?param=1'];

      const schema = {
        type: 'object',
        properties: {
          resourceUri: {
            type: 'string',
            pattern: ValidationManager.REGEX_PATTERNS.RESOURCE_URI,
          },
        },
      };

      validUris.forEach(uri => {
        expect(() => {
          ValidationManager.validateToolRequest({ resourceUri: uri }, schema, 'testTool');
        }).not.toThrow();
      });

      invalidUris.forEach(uri => {
        expect(() => {
          ValidationManager.validateToolRequest({ resourceUri: uri }, schema, 'testTool');
        }).toThrow(ValidationError);
      });
    });

    test('should use standardized username pattern', () => {
      const validUsernames = ['user123', 'test.user', 'user_name', 'test-user'];
      const invalidUsernames = ['user 123', 'user@domain', 'user/name', 'user#123'];

      const schema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            pattern: ValidationManager.REGEX_PATTERNS.USERNAME,
          },
        },
      };

      validUsernames.forEach(username => {
        expect(() => {
          ValidationManager.validateToolRequest({ username }, schema, 'testTool');
        }).not.toThrow();
      });

      invalidUsernames.forEach(username => {
        expect(() => {
          ValidationManager.validateToolRequest({ username }, schema, 'testTool');
        }).toThrow(ValidationError);
      });
    });

    test('should use standardized locale pattern', () => {
      const validLocales = ['en', 'en_US', 'fr_FR', 'es', 'de_DE'];
      const invalidLocales = ['english', 'en-US', 'EN_us', 'en_usa', 'e'];

      const schema = {
        type: 'object',
        properties: {
          locale: {
            type: 'string',
            pattern: ValidationManager.REGEX_PATTERNS.LOCALE,
          },
        },
      };

      validLocales.forEach(locale => {
        expect(() => {
          ValidationManager.validateToolRequest({ locale }, schema, 'testTool');
        }).not.toThrow();
      });

      invalidLocales.forEach(locale => {
        expect(() => {
          ValidationManager.validateToolRequest({ locale }, schema, 'testTool');
        }).toThrow(ValidationError);
      });
    });
  });

  describe('Enhanced Error Reporting', () => {
    test('should provide detailed validation errors with tool context', () => {
      const data = {
        username: '', // Too short
        password: '123', // Too short
        invalidField: 'value', // Not allowed
      };

      const schema = {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 6 },
        },
        additionalProperties: false,
      };

      try {
        ValidationManager.validateToolRequest(data, schema, 'jasper_authenticate');
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('jasper_authenticate');
        expect(error.toolName).toBe('jasper_authenticate');
        expect(error.fieldCount).toBe(3);
        expect(error.validationResults).toHaveLength(3);

        // Check that errors include field-specific guidance
        const usernameError = error.validationResults.find(e => e.field === 'username');
        expect(usernameError.message).toContain('jasper_authenticate');

        const passwordError = error.validationResults.find(e => e.field === 'password');
        expect(passwordError.message).toContain('Password must be at least 6 characters long');

        const additionalPropError = error.validationResults.find(e => e.field === 'invalidField');
        expect(additionalPropError.message).toContain('Additional property');
      }
    });

    test('should provide field-specific guidance for common fields', () => {
      const data = { resourcePath: 'invalid-path' };
      const schema = {
        type: 'object',
        properties: {
          resourcePath: {
            type: 'string',
            pattern: ValidationManager.REGEX_PATTERNS.RESOURCE_URI,
          },
        },
      };

      try {
        ValidationManager.validateToolRequest(data, schema, 'jasper_upload_resource');
        fail('Should have thrown validation error');
      } catch (error) {
        const fieldError = error.validationResults[0];
        expect(fieldError.message).toContain('Resource path must start with "/"');
        expect(fieldError.message).toContain('Example: /reports/myreport');
      }
    });

    test('should create validation summary', () => {
      const fieldErrors = [
        new FieldValidationError('field1', 'value1', 'required', 'Field 1 is required'),
        new FieldValidationError('field2', 'value2', 'pattern', 'Field 2 pattern invalid'),
        new FieldValidationError('field3', 'value3', 'required', 'Field 3 is required'),
      ];

      const summary = ValidationManager.createValidationSummary(fieldErrors);

      expect(summary.totalErrors).toBe(3);
      expect(summary.errorsByConstraint.required).toBe(2);
      expect(summary.errorsByConstraint.pattern).toBe(1);
      expect(summary.mostCommonError).toBe('required');
      expect(summary.errorsByField.field1).toBe(1);
      expect(summary.errorsByField.field2).toBe(1);
      expect(summary.errorsByField.field3).toBe(1);
    });
  });

  describe('JRXML Content Validation', () => {
    test('should validate valid JRXML content', () => {
      const validJrxml = `<?xml version="1.0" encoding="UTF-8"?>
        <jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports">
          <title><band height="50"></band></title>
        </jasperReport>`;

      expect(() => {
        ValidationManager.validateJRXMLContent(validJrxml, 'jasper_upload_resource');
      }).not.toThrow();
    });

    test('should reject invalid JRXML content', () => {
      const invalidJrxml = 'This is not XML content';

      expect(() => {
        ValidationManager.validateJRXMLContent(invalidJrxml, 'jasper_upload_resource');
      }).toThrow(ValidationError);
    });

    test('should reject JRXML without jasperReport element', () => {
      const invalidJrxml = '<?xml version="1.0" encoding="UTF-8"?><root></root>';

      try {
        ValidationManager.validateJRXMLContent(invalidJrxml, 'jasper_upload_resource');
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('jasperReport root element');
      }
    });
  });

  describe('Cron Expression Validation', () => {
    test('should validate valid cron expressions', () => {
      const validCrons = [
        '0 0 12 * * ?', // Daily at noon
        '0 15 10 ? * MON-FRI', // Weekdays at 10:15 AM
        '0 0/5 14 * * ?', // Every 5 minutes starting at 2 PM
        '0 0 12 1/1 * ?', // Daily at noon
        '0 0 12 * * ? 2024', // With year
      ];

      validCrons.forEach(cron => {
        expect(() => {
          ValidationManager.validateCronExpression(cron, 'jasper_create_job');
        }).not.toThrow();
      });
    });

    test('should reject invalid cron expressions', () => {
      const invalidCrons = [
        '0 0 12', // Too few parts
        '0 0 12 * * ? ? ?', // Too many parts
        '', // Empty
        null, // Null
        123, // Not a string
      ];

      invalidCrons.forEach(cron => {
        expect(() => {
          ValidationManager.validateCronExpression(cron, 'jasper_create_job');
        }).toThrow(ValidationError);
      });
    });
  });

  describe('Type Validation', () => {
    test('should validate correct types', () => {
      const data = {
        stringField: 'test',
        numberField: 123,
        booleanField: true,
        arrayField: [1, 2, 3],
        objectField: { key: 'value' },
      };

      const schema = {
        type: 'object',
        properties: {
          stringField: { type: 'string' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          arrayField: { type: 'array' },
          objectField: { type: 'object' },
        },
      };

      expect(() => {
        ValidationManager.validateToolRequest(data, schema, 'testTool');
      }).not.toThrow();
    });

    test('should reject incorrect types with clear messages', () => {
      const data = { stringField: 123 };
      const schema = {
        type: 'object',
        properties: {
          stringField: { type: 'string' },
        },
      };

      try {
        ValidationManager.validateToolRequest(data, schema, 'testTool');
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].message).toContain('Expected string, got number');
      }
    });
  });

  describe('Required Field Validation', () => {
    test('should enforce required fields', () => {
      const data = { optionalField: 'value' };
      const schema = {
        type: 'object',
        required: ['requiredField'],
        properties: {
          requiredField: { type: 'string' },
          optionalField: { type: 'string' },
        },
      };

      try {
        ValidationManager.validateToolRequest(data, schema, 'testTool');
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.validationResults[0].field).toBe('requiredField');
        expect(error.validationResults[0].constraint).toBe('required');
      }
    });

    test('should allow optional fields to be undefined', () => {
      const data = { requiredField: 'value' };
      const schema = {
        type: 'object',
        required: ['requiredField'],
        properties: {
          requiredField: { type: 'string' },
          optionalField: { type: 'string' },
        },
      };

      expect(() => {
        ValidationManager.validateToolRequest(data, schema, 'testTool');
      }).not.toThrow();
    });
  });

  describe('Format Validation', () => {
    test('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org'];
      const invalidEmails = ['invalid-email', '@example.com', 'user@', 'user space@example.com'];

      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
      };

      validEmails.forEach(email => {
        expect(() => {
          ValidationManager.validateToolRequest({ email }, schema, 'testTool');
        }).not.toThrow();
      });

      invalidEmails.forEach(email => {
        expect(() => {
          ValidationManager.validateToolRequest({ email }, schema, 'testTool');
        }).toThrow(ValidationError);
      });
    });

    test('should validate date-time format', () => {
      const validDates = [
        '2024-01-01T00:00:00Z',
        '2024-12-31T23:59:59.999Z',
        '2024-06-15T12:30:00+02:00',
      ];
      const invalidDates = ['invalid-date', '2024-13-01', '2024-01-32T00:00:00Z'];

      const schema = {
        type: 'object',
        properties: {
          dateTime: { type: 'string', format: 'date-time' },
        },
      };

      validDates.forEach(dateTime => {
        expect(() => {
          ValidationManager.validateToolRequest({ dateTime }, schema, 'testTool');
        }).not.toThrow();
      });

      invalidDates.forEach(dateTime => {
        expect(() => {
          ValidationManager.validateToolRequest({ dateTime }, schema, 'testTool');
        }).toThrow(ValidationError);
      });
    });
  });
});
