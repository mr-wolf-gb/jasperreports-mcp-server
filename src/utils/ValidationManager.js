/**
 * Enhanced Validation Manager for JasperReports MCP Server
 * Provides comprehensive validation with base property exclusion and detailed error reporting
 */

import { FieldValidationError, ValidationError, ErrorMapper } from '../models/errors.js';

/**
 * Enhanced ValidationManager class that handles validation with base property exclusion
 */
class ValidationManager {
  /**
   * Base properties that should be excluded from schema validation
   * These are added by BaseRequest class but not part of the business logic validation
   */
  static BASE_PROPERTIES = ['timestamp', 'requestId'];

  /**
   * Standardized regex patterns used across all validation schemas
   */
  static REGEX_PATTERNS = {
    // Resource URI pattern - allows alphanumeric, underscore, hyphen, dot, and forward slash
    RESOURCE_URI: '^/[a-zA-Z0-9_/\\-\\.]+$',

    // Folder URI pattern - same as resource but allows empty path after root
    FOLDER_URI: '^/[a-zA-Z0-9_/\\-\\.]*$',

    // Username pattern - alphanumeric, underscore, hyphen, dot
    USERNAME: '^[a-zA-Z0-9_\\-\\.]+$',

    // Role name pattern - same as username
    ROLE_NAME: '^[a-zA-Z0-9_\\-\\.]+$',

    // Execution ID pattern - alphanumeric, hyphen, underscore
    EXECUTION_ID: '^[a-zA-Z0-9\\-_]+$',

    // Page range pattern - supports ranges like "1-5" or lists like "1,3,5" or combinations
    PAGE_RANGE: '^(\\d+(-\\d+)?(,\\d+(-\\d+)?)*)?$',

    // Locale pattern - language code with optional country code (e.g., en_US, fr, es_ES)
    LOCALE: '^[a-z]{2}(_[A-Z]{2})?$',

    // Email pattern - basic email validation
    EMAIL: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',

    // URI pattern - basic URI validation
    URI: '^https?://[^\\s/$.?#].[^\\s]*$',
  };

  /**
   * Field-specific validation guidance messages
   */
  static FIELD_GUIDANCE = {
    resourcePath:
      'Resource path must start with "/" and contain only alphanumeric characters, underscores, hyphens, dots, and forward slashes. Example: /reports/myreport',
    resourceUri:
      'Resource URI must start with "/" and contain only alphanumeric characters, underscores, hyphens, dots, and forward slashes. Example: /reports/myreport',
    folderUri: 'Folder URI must start with "/" and may be empty after root. Example: /reports or /',
    username:
      'Username must contain only alphanumeric characters, underscores, hyphens, and dots. Example: john.doe or user_123',
    password: 'Password must be at least 6 characters long',
    executionId: 'Execution ID must contain only alphanumeric characters, hyphens, and underscores',
    pages:
      'Page specification must be in format "1-5" for ranges, "1,3,5" for specific pages, or combinations like "1-3,5,7-9"',
    locale: 'Locale must be in format "en" or "en_US" (language code with optional country code)',
    emailAddress: 'Email address must be in valid format like user@example.com',
    cronExpression:
      'Cron expression must have 5-7 parts: seconds minutes hours day month weekday [year]',
    outputFormat:
      'Output format must be one of: pdf, html, xlsx, xls, csv, rtf, docx, odt, ods, xml',
    resourceType:
      'Resource type must be one of: reportUnit, folder, dataSource, inputControl, file, domain',
    authType: 'Authentication type must be one of: basic, login, argument',
  };

  /**
   * Validates tool request data against schema with base property exclusion
   * @param {Object} data - The request data to validate
   * @param {Object} schema - The JSON schema to validate against
   * @param {string} toolName - Name of the tool being validated (for error context)
   * @returns {boolean} - Returns true if validation passes
   * @throws {ValidationError} - Throws detailed validation error if validation fails
   */
  static validateToolRequest(data, schema, toolName) {
    if (!data || typeof data !== 'object') {
      const error = new FieldValidationError(
        'root',
        data,
        'type',
        'Request data must be an object'
      );
      throw ErrorMapper.createValidationError([error]);
    }

    // Exclude base properties from validation data
    const validationData = this.excludeBaseProperties(data);

    // Perform schema validation
    const errors = this.validateWithSchema(validationData, schema);

    if (errors.length > 0) {
      // Enhance errors with tool context and guidance
      const enhancedErrors = errors.map(error => this.enhanceValidationError(error, toolName));
      throw this.createDetailedValidationError(enhancedErrors, toolName);
    }

    return true;
  }

  /**
   * Excludes base properties from data object for validation
   * @param {Object} data - Original data object
   * @returns {Object} - Data object without base properties
   */
  static excludeBaseProperties(data) {
    const cleanData = { ...data };

    // Remove base properties that are added by BaseRequest
    this.BASE_PROPERTIES.forEach(prop => {
      delete cleanData[prop];
    });

    return cleanData;
  }

  /**
   * Validates data against JSON schema
   * @param {*} data - Data to validate
   * @param {Object} schema - JSON schema
   * @param {string} fieldPath - Current field path for nested validation
   * @returns {Array<FieldValidationError>} - Array of validation errors
   */
  static validateWithSchema(data, schema, fieldPath = '') {
    const errors = [];

    // Type validation
    if (schema.type) {
      const typeError = this.validateType(data, schema.type, fieldPath);
      if (typeError) errors.push(typeError);
    }

    // Required field validation
    if (schema.required && typeof data === 'object' && data !== null) {
      for (const requiredField of schema.required) {
        if (
          !(requiredField in data) ||
          data[requiredField] === undefined ||
          data[requiredField] === null
        ) {
          errors.push(
            new FieldValidationError(
              `${fieldPath}${requiredField}`,
              undefined,
              'required',
              `Field '${requiredField}' is required`
            )
          );
        }
      }
    }

    // Property validation
    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        // Skip undefined and null values for optional properties
        if (value === undefined || value === null) {
          continue;
        }

        const propertySchema = schema.properties[key];
        if (propertySchema) {
          const propertyErrors = this.validateWithSchema(
            value,
            propertySchema,
            `${fieldPath}${key}.`
          );
          errors.push(...propertyErrors);
        } else if (schema.additionalProperties === false) {
          errors.push(
            new FieldValidationError(
              `${fieldPath}${key}`,
              value,
              'additionalProperties',
              `Additional property '${key}' is not allowed`
            )
          );
        }
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'enum',
          `Value must be one of: ${schema.enum.join(', ')}`
        )
      );
    }

    // Pattern validation with standardized regex
    if (schema.pattern && typeof data === 'string') {
      const pattern = this.getStandardizedPattern(schema.pattern);
      if (!new RegExp(pattern).test(data)) {
        errors.push(
          new FieldValidationError(
            fieldPath.slice(0, -1),
            data,
            'pattern',
            `Value does not match required pattern: ${pattern}`
          )
        );
      }
    }

    // String length validation
    if (schema.minLength && typeof data === 'string' && data.length < schema.minLength) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'minLength',
          `Value must be at least ${schema.minLength} characters long`
        )
      );
    }

    if (schema.maxLength && typeof data === 'string' && data.length > schema.maxLength) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'maxLength',
          `Value must be at most ${schema.maxLength} characters long`
        )
      );
    }

    // Numeric range validation
    if (schema.minimum && typeof data === 'number' && data < schema.minimum) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'minimum',
          `Value must be at least ${schema.minimum}`
        )
      );
    }

    if (schema.maximum && typeof data === 'number' && data > schema.maximum) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'maximum',
          `Value must be at most ${schema.maximum}`
        )
      );
    }

    // Format validation
    if (schema.format && typeof data === 'string') {
      const formatError = this.validateFormat(data, schema.format, fieldPath.slice(0, -1));
      if (formatError) errors.push(formatError);
    }

    // Array validation
    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        const itemErrors = this.validateWithSchema(item, schema.items, `${fieldPath}[${index}].`);
        errors.push(...itemErrors);
      });
    }

    if (schema.minItems && Array.isArray(data) && data.length < schema.minItems) {
      errors.push(
        new FieldValidationError(
          fieldPath.slice(0, -1),
          data,
          'minItems',
          `Array must have at least ${schema.minItems} items`
        )
      );
    }

    return errors;
  }

  /**
   * Validates data type
   * @param {*} data - Data to validate
   * @param {string} expectedType - Expected type
   * @param {string} fieldPath - Field path for error reporting
   * @returns {FieldValidationError|null} - Validation error or null if valid
   */
  static validateType(data, expectedType, fieldPath) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;

    if (expectedType === 'array' && !Array.isArray(data)) {
      return new FieldValidationError(
        fieldPath.slice(0, -1),
        data,
        'type',
        `Expected array, got ${actualType}`
      );
    }

    if (expectedType !== 'array' && actualType !== expectedType) {
      return new FieldValidationError(
        fieldPath.slice(0, -1),
        data,
        'type',
        `Expected ${expectedType}, got ${actualType}`
      );
    }

    return null;
  }

  /**
   * Validates format constraints
   * @param {string} data - Data to validate
   * @param {string} format - Format constraint
   * @param {string} fieldPath - Field path for error reporting
   * @returns {FieldValidationError|null} - Validation error or null if valid
   */
  static validateFormat(data, format, fieldPath) {
    switch (format) {
      case 'email':
        if (!new RegExp(this.REGEX_PATTERNS.EMAIL).test(data)) {
          return new FieldValidationError(fieldPath, data, 'format', 'Invalid email format');
        }
        break;
      case 'uri':
        try {
          new URL(data);
        } catch {
          return new FieldValidationError(fieldPath, data, 'format', 'Invalid URI format');
        }
        break;
      case 'date-time':
        if (isNaN(Date.parse(data))) {
          return new FieldValidationError(fieldPath, data, 'format', 'Invalid date-time format');
        }
        break;
    }
    return null;
  }

  /**
   * Gets standardized regex pattern, replacing old patterns with consistent ones
   * @param {string} pattern - Original pattern
   * @returns {string} - Standardized pattern
   */
  static getStandardizedPattern(pattern) {
    // Map of old patterns to standardized ones
    const patternMappings = {
      '^/[a-zA-Z0-9_/\\-\\.]+$': this.REGEX_PATTERNS.RESOURCE_URI,
      '^/[a-zA-Z0-9_/\\-\\.]*$': this.REGEX_PATTERNS.FOLDER_URI,
      '^[a-zA-Z0-9_\\-\\.]+$': this.REGEX_PATTERNS.USERNAME,
      '^[a-zA-Z0-9\\-_]+$': this.REGEX_PATTERNS.EXECUTION_ID,
      '^(\\d+(-\\d+)?(,\\d+(-\\d+)?)*)?$': this.REGEX_PATTERNS.PAGE_RANGE,
      '^[a-z]{2}(_[A-Z]{2})?$': this.REGEX_PATTERNS.LOCALE,
    };

    return patternMappings[pattern] || pattern;
  }

  /**
   * Enhances validation error with tool context and field-specific guidance
   * @param {FieldValidationError} error - Original validation error
   * @param {string} toolName - Name of the tool being validated
   * @returns {FieldValidationError} - Enhanced validation error
   */
  static enhanceValidationError(error, toolName) {
    // Add tool context to error message
    const toolContext = toolName ? ` (in tool: ${toolName})` : '';

    // Get field-specific guidance
    const fieldName = error.field.split('.')[0]; // Get root field name
    const guidance = this.FIELD_GUIDANCE[fieldName];

    // Enhance the error message with guidance
    let enhancedMessage = error.message + toolContext;
    if (guidance) {
      enhancedMessage += `. ${guidance}`;
    }

    return new FieldValidationError(error.field, error.value, error.constraint, enhancedMessage);
  }

  /**
   * Creates detailed validation error with comprehensive context
   * @param {Array<FieldValidationError>} fieldErrors - Array of field validation errors
   * @param {string} toolName - Name of the tool being validated
   * @returns {ValidationError} - Detailed validation error
   */
  static createDetailedValidationError(fieldErrors, toolName) {
    const errorCount = fieldErrors.length;
    const toolContext = toolName ? ` in tool '${toolName}'` : '';
    const message = `Validation failed for ${errorCount} field(s)${toolContext}`;

    // Create enhanced validation error with additional context
    const validationError = new ValidationError(message, fieldErrors);

    // Add tool-specific context
    validationError.toolName = toolName;
    validationError.fieldCount = errorCount;
    validationError.summary = this.createValidationSummary(fieldErrors);

    return validationError;
  }

  /**
   * Creates a summary of validation errors for quick diagnosis
   * @param {Array<FieldValidationError>} fieldErrors - Array of field validation errors
   * @returns {Object} - Validation summary
   */
  static createValidationSummary(fieldErrors) {
    const summary = {
      totalErrors: fieldErrors.length,
      errorsByConstraint: {},
      errorsByField: {},
      mostCommonError: null,
    };

    // Group errors by constraint type and field
    fieldErrors.forEach(error => {
      // Count by constraint type
      if (!summary.errorsByConstraint[error.constraint]) {
        summary.errorsByConstraint[error.constraint] = 0;
      }
      summary.errorsByConstraint[error.constraint]++;

      // Count by field
      if (!summary.errorsByField[error.field]) {
        summary.errorsByField[error.field] = 0;
      }
      summary.errorsByField[error.field]++;
    });

    // Find most common error type
    let maxCount = 0;
    for (const [constraint, count] of Object.entries(summary.errorsByConstraint)) {
      if (count > maxCount) {
        maxCount = count;
        summary.mostCommonError = constraint;
      }
    }

    return summary;
  }

  /**
   * Validates specific data types with enhanced error reporting
   */

  /**
   * Validates JRXML content structure
   * @param {string} jrxmlContent - JRXML content to validate
   * @param {string} toolName - Tool name for context
   * @returns {boolean} - Returns true if valid
   * @throws {ValidationError} - Throws validation error if invalid
   */
  static validateJRXMLContent(jrxmlContent, toolName = null) {
    const errors = [];

    if (!jrxmlContent || typeof jrxmlContent !== 'string') {
      errors.push(
        new FieldValidationError(
          'jrxmlContent',
          jrxmlContent,
          'type',
          'JRXML content must be a non-empty string'
        )
      );
    } else {
      // Basic XML structure validation
      if (!jrxmlContent.trim().startsWith('<?xml')) {
        errors.push(
          new FieldValidationError(
            'jrxmlContent',
            jrxmlContent.substring(0, 50) + '...',
            'format',
            'JRXML content must be valid XML starting with XML declaration (<?xml...)'
          )
        );
      }

      if (!jrxmlContent.includes('<jasperReport')) {
        errors.push(
          new FieldValidationError(
            'jrxmlContent',
            jrxmlContent.substring(0, 50) + '...',
            'format',
            'JRXML content must contain jasperReport root element'
          )
        );
      }
    }

    if (errors.length > 0) {
      throw this.createDetailedValidationError(errors, toolName);
    }

    return true;
  }

  /**
   * Validates cron expression format
   * @param {string} cronExpression - Cron expression to validate
   * @param {string} toolName - Tool name for context
   * @returns {boolean} - Returns true if valid
   * @throws {ValidationError} - Throws validation error if invalid
   */
  static validateCronExpression(cronExpression, toolName = null) {
    const errors = [];

    if (!cronExpression || typeof cronExpression !== 'string') {
      errors.push(
        new FieldValidationError(
          'cronExpression',
          cronExpression,
          'type',
          'Cron expression must be a non-empty string'
        )
      );
    } else {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 7) {
        errors.push(
          new FieldValidationError(
            'cronExpression',
            cronExpression,
            'format',
            'Cron expression must have 5-7 parts (seconds minutes hours day month weekday [year]). Example: "0 0 12 * * ?" for daily at noon'
          )
        );
      }
    }

    if (errors.length > 0) {
      throw this.createDetailedValidationError(errors, toolName);
    }

    return true;
  }
}

export { ValidationManager };
