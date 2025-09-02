/**
 * Unit tests for validators utility functions
 */

import { Validator, SchemaValidator, schemas } from '../../../src/utils/validators.js';

describe('Validators', () => {
  describe('Validator class', () => {
    test('should be defined', () => {
      expect(Validator).toBeDefined();
      expect(typeof Validator).toBe('function');
    });

    test('should validate resource URI format', () => {
      expect(() => Validator.validateResourceURI('/valid/path')).not.toThrow();
      expect(() => Validator.validateResourceURI('invalid')).toThrow();
      expect(() => Validator.validateResourceURI('/invalid//path')).toThrow();
      expect(() => Validator.validateResourceURI('/invalid/../path')).toThrow();
    });
  });

  describe('SchemaValidator class', () => {
    test('should be defined', () => {
      expect(SchemaValidator).toBeDefined();
      expect(typeof SchemaValidator).toBe('function');
    });
  });

  describe('schemas object', () => {
    test('should contain validation schemas', () => {
      expect(schemas).toBeDefined();
      expect(typeof schemas).toBe('object');
      expect(schemas.authentication).toBeDefined();
      expect(schemas.connectionTest).toBeDefined();
      expect(schemas.resourceUpload).toBeDefined();
      expect(schemas.resourceList).toBeDefined();
      expect(schemas.reportExecution).toBeDefined();
    });

    test('should have authentication schema with required fields', () => {
      expect(schemas.authentication.required).toContain('username');
      expect(schemas.authentication.required).toContain('password');
      expect(schemas.authentication.properties.username).toBeDefined();
      expect(schemas.authentication.properties.password).toBeDefined();
    });

    test('should have resource upload schema with required fields', () => {
      expect(schemas.resourceUpload.required).toContain('resourcePath');
      expect(schemas.resourceUpload.required).toContain('label');
      expect(schemas.resourceUpload.properties.resourcePath).toBeDefined();
      expect(schemas.resourceUpload.properties.label).toBeDefined();
    });
  });

  describe('Basic validation functionality', () => {
    test('should have validation methods available', () => {
      // Test that the classes and schemas are properly exported
      expect(Validator).toBeDefined();
      expect(SchemaValidator).toBeDefined();
      expect(schemas).toBeDefined();
    });

    test('should validate resource URI correctly', () => {
      // Test the one method we know exists
      expect(() => Validator.validateResourceURI('/valid/path')).not.toThrow();
      expect(() => Validator.validateResourceURI('invalid')).toThrow();
    });
  });
});
