/**
 * Unit tests for PermissionManager
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  PermissionManager,
  JASPER_PERMISSIONS,
  JASPER_ROLES,
  TOOL_PERMISSION_REQUIREMENTS,
  PERMISSION_ERROR_PATTERNS,
} from '../../../src/utils/permissionManager.js';

describe('PermissionManager', () => {
  let permissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
  });

  describe('analyzePermissionError', () => {
    test('should analyze 401 authentication error correctly', () => {
      const error = {
        response: {
          status: 401,
          data: {
            errorCode: 'authentication.required',
            message: 'Authentication is required',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(
        error,
        'jasper_run_report_sync',
        'execute_report',
        { resourceUri: '/reports/test' }
      );

      expect(analysis).toBeDefined();
      expect(analysis.errorType).toBe('AUTHENTICATION_ERROR');
      expect(analysis.statusCode).toBe(401);
      expect(analysis.toolName).toBe('jasper_run_report_sync');
      expect(analysis.pattern.type).toBe('AUTHENTICATION_REQUIRED');
      expect(analysis.guidance.summary).toContain('Authentication is required');
    });

    test('should analyze 403 authorization error correctly', () => {
      const error = {
        response: {
          status: 403,
          data: {
            errorCode: 'access.denied',
            message: 'Access denied to resource',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(
        error,
        'jasper_delete_resource',
        'delete_resource',
        { resourceUri: '/reports/test' }
      );

      expect(analysis).toBeDefined();
      expect(analysis.errorType).toBe('AUTHORIZATION_ERROR');
      expect(analysis.statusCode).toBe(403);
      expect(analysis.toolName).toBe('jasper_delete_resource');
      expect(analysis.pattern.type).toBe('INSUFFICIENT_PERMISSIONS');
      expect(analysis.guidance.summary).toContain('lack sufficient permissions');
    });

    test('should return null for non-permission errors', () => {
      const error = {
        response: {
          status: 500,
          data: {
            errorCode: 'internal.error',
            message: 'Internal server error',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(error, 'jasper_run_report_sync');

      expect(analysis).toBeNull();
    });

    test('should handle errors without response data', () => {
      const error = {
        statusCode: 401,
        message: 'Unauthorized',
      };

      const analysis = permissionManager.analyzePermissionError(error, 'jasper_authenticate');

      expect(analysis).toBeDefined();
      expect(analysis.errorType).toBe('AUTHENTICATION_ERROR');
      expect(analysis.statusCode).toBe(401);
    });
  });

  describe('getRequiredPermissions', () => {
    test('should return correct permissions for jasper_delete_resource', () => {
      const requirements = permissionManager.getRequiredPermissions('jasper_delete_resource');

      expect(requirements.toolName).toBe('jasper_delete_resource');
      expect(requirements.permissions).toContain(JASPER_PERMISSIONS.DELETE);
      expect(requirements.roles).toContain(JASPER_ROLES.ROLE_ADMINISTRATOR.name);
      expect(requirements.description).toContain('DELETE permission');
    });

    test('should return correct permissions for jasper_create_user', () => {
      const requirements = permissionManager.getRequiredPermissions('jasper_create_user');

      expect(requirements.permissions).toContain(JASPER_PERMISSIONS.CREATE_USER);
      expect(requirements.permissions).toContain(JASPER_PERMISSIONS.ADMINISTER);
      expect(requirements.roles).toContain(JASPER_ROLES.ROLE_ADMINISTRATOR.name);
    });

    test('should return default for unknown tool', () => {
      const requirements = permissionManager.getRequiredPermissions('unknown_tool');

      expect(requirements.toolName).toBe('unknown_tool');
      expect(requirements.permissions).toEqual([]);
      expect(requirements.roles).toEqual([]);
      expect(requirements.description).toContain('not defined');
    });

    test('should include all permissions and roles in response', () => {
      const requirements = permissionManager.getRequiredPermissions('jasper_list_resources');

      expect(requirements.allPermissions).toBeDefined();
      expect(requirements.availableRoles).toBeDefined();
      expect(requirements.allPermissions).toEqual(JASPER_PERMISSIONS);
    });
  });

  describe('suggestPermissionFix', () => {
    test('should provide authentication fix suggestions', () => {
      const error = {
        errorType: 'AUTHENTICATION_ERROR',
        pattern: { type: 'SESSION_EXPIRED' },
      };

      const suggestions = permissionManager.suggestPermissionFix('jasper_run_report_sync', error);

      expect(suggestions.immediate).toContain('Re-authenticate using the jasper_authenticate tool');
      expect(suggestions.administrative).toContain(
        'Contact your JasperReports administrator if credentials are correct'
      );
      expect(suggestions.alternative).toContain(
        'Try using a different authentication method (basic, login, or argument)'
      );
    });

    test('should provide authorization fix suggestions', () => {
      const error = {
        errorType: 'AUTHORIZATION_ERROR',
        context: { resourceUri: '/reports/test' },
      };

      const suggestions = permissionManager.suggestPermissionFix('jasper_delete_resource', error);

      expect(suggestions.immediate).toContain(
        'Verify you have the required permissions for this operation'
      );
      expect(suggestions.administrative).toContain(
        'Contact your JasperReports administrator to request additional permissions'
      );
      expect(suggestions.administrative).toContain('Check permissions on resource: /reports/test');
    });

    test('should include tool-specific suggestions for job management', () => {
      const error = {
        errorType: 'AUTHORIZATION_ERROR',
      };

      const suggestions = permissionManager.suggestPermissionFix('jasper_create_job', error);

      expect(suggestions.alternative.some(s => s.includes('scheduling permissions'))).toBe(true);
    });
  });

  describe('checkPermissions', () => {
    test('should grant access for superuser', () => {
      const userPermissions = {
        roles: [JASPER_ROLES.ROLE_SUPERUSER.name],
        permissions: [],
      };

      const check = permissionManager.checkPermissions('jasper_delete_resource', userPermissions);

      expect(check.hasAccess).toBe(true);
      expect(check.isSuperuser).toBe(true);
      expect(check.recommendation).toBe('Access granted');
    });

    test('should grant access for user with required role', () => {
      const userPermissions = {
        roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
        permissions: [],
      };

      const check = permissionManager.checkPermissions('jasper_delete_resource', userPermissions);

      expect(check.hasAccess).toBe(true);
      expect(check.hasRequiredRole).toBe(true);
      expect(check.recommendation).toBe('Access granted');
    });

    test('should grant access for user with required permissions', () => {
      const userPermissions = {
        roles: [],
        permissions: [JASPER_PERMISSIONS.DELETE],
      };

      const check = permissionManager.checkPermissions('jasper_delete_resource', userPermissions);

      expect(check.hasAccess).toBe(true);
      expect(check.hasRequiredPermissions).toBe(true);
    });

    test('should deny access and provide recommendations', () => {
      const userPermissions = {
        roles: [JASPER_ROLES.ROLE_USER.name],
        permissions: [JASPER_PERMISSIONS.READ],
      };

      const check = permissionManager.checkPermissions('jasper_delete_resource', userPermissions);

      expect(check.hasAccess).toBe(false);
      expect(check.missingPermissions).toContain(JASPER_PERMISSIONS.DELETE);
      expect(check.recommendation).toContain('Request one of these roles');
    });

    test('should handle empty user permissions', () => {
      const check = permissionManager.checkPermissions('jasper_delete_resource', {});

      expect(check.hasAccess).toBe(false);
      expect(check.userRoles).toEqual([]);
      expect(check.userPermissions).toEqual([]);
    });
  });

  describe('enhanceAuthenticationError', () => {
    test('should enhance session expired error', () => {
      const authError = {
        errorCode: 'session.expired',
        message: 'Session has expired',
      };

      const enhancement = permissionManager.enhanceAuthenticationError(authError, 'basic');

      expect(enhancement.authMethod).toBe('basic');
      expect(enhancement.pattern.type).toBe('SESSION_EXPIRED');
      expect(enhancement.enhancedMessage).toContain('using basic authentication');
      expect(enhancement.actionableSteps).toContain('Your session has expired');
    });

    test('should enhance invalid credentials error', () => {
      const authError = {
        errorCode: 'invalid.credentials',
        message: 'Invalid username or password',
      };

      const enhancement = permissionManager.enhanceAuthenticationError(authError, 'login');

      expect(enhancement.pattern.type).toBe('INVALID_CREDENTIALS');
      expect(enhancement.actionableSteps).toContain('Double-check your username and password');
      expect(enhancement.troubleshooting).toContain(
        'Try using basic authentication method instead'
      );
    });

    test('should handle unknown authentication errors', () => {
      const authError = {
        message: 'Some random error message',
      };

      const enhancement = permissionManager.enhanceAuthenticationError(authError, 'unknown');

      expect(enhancement.pattern.type).toBe('UNKNOWN_ERROR');
      expect(enhancement.enhancedMessage).toContain('Unknown permission or authentication error');
    });
  });

  describe('Constants and Mappings', () => {
    test('should have all required permissions defined', () => {
      expect(JASPER_PERMISSIONS.READ).toBeDefined();
      expect(JASPER_PERMISSIONS.WRITE).toBeDefined();
      expect(JASPER_PERMISSIONS.DELETE).toBeDefined();
      expect(JASPER_PERMISSIONS.EXECUTE).toBeDefined();
      expect(JASPER_PERMISSIONS.ADMINISTER).toBeDefined();
    });

    test('should have role definitions with permissions', () => {
      expect(JASPER_ROLES.ROLE_SUPERUSER.permissions).toContain(JASPER_PERMISSIONS.READ);
      expect(JASPER_ROLES.ROLE_ADMINISTRATOR.permissions).toContain(JASPER_PERMISSIONS.ADMINISTER);
      expect(JASPER_ROLES.ROLE_USER.permissions).toContain(JASPER_PERMISSIONS.READ);
    });

    test('should have tool permission requirements for all major tools', () => {
      expect(TOOL_PERMISSION_REQUIREMENTS.jasper_authenticate).toBeDefined();
      expect(TOOL_PERMISSION_REQUIREMENTS.jasper_run_report_sync).toBeDefined();
      expect(TOOL_PERMISSION_REQUIREMENTS.jasper_delete_resource).toBeDefined();
      expect(TOOL_PERMISSION_REQUIREMENTS.jasper_create_user).toBeDefined();
    });

    test('should have permission error patterns defined', () => {
      expect(PERMISSION_ERROR_PATTERNS['access.denied']).toBeDefined();
      expect(PERMISSION_ERROR_PATTERNS['authentication.required']).toBeDefined();
      expect(PERMISSION_ERROR_PATTERNS['session.expired']).toBeDefined();
    });
  });

  describe('Error Pattern Matching', () => {
    test('should find error pattern by exact code match', () => {
      const error = {
        response: {
          status: 403,
          data: {
            errorCode: 'access.denied',
            message: 'Access denied',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(error, 'test_tool');
      expect(analysis.pattern.type).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should find error pattern by message content', () => {
      const error = {
        response: {
          status: 401,
          data: {
            message: 'Authentication required for this operation',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(error, 'test_tool');
      expect(analysis.pattern.type).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should handle case-insensitive pattern matching', () => {
      const error = {
        response: {
          status: 403,
          data: {
            message: 'ACCESS DENIED TO RESOURCE',
          },
        },
      };

      const analysis = permissionManager.analyzePermissionError(error, 'test_tool');
      expect(analysis.pattern.type).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
