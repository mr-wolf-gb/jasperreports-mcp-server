/**
 * Unit tests for Permission Service
 */

import { jest } from '@jest/globals';
import PermissionService, {
  PERMISSION_MASKS,
  PERMISSION_NAMES,
  RECIPIENT_TYPES,
} from '../../../src/services/permissionService.js';

// Mock dependencies
const mockConfig = {
  jasperUrl: 'http://localhost:8080/jasperserver',
  username: 'testuser',
  password: 'testpass',
  authType: 'basic',
  timeout: 30000,
  debugMode: false,
};

const mockApiClient = {
  isSessionValid: jest.fn(() => true),
  authenticate: jest.fn(() => Promise.resolve('mock-token')),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

const mockErrorHandler = {
  logError: jest.fn(),
  mapJasperError: jest.fn(),
  mapHttpError: jest.fn(),
  createValidationError: jest.fn(),
  createResourceNotFoundError: jest.fn(),
  createPermissionError: jest.fn(),
};

describe('PermissionService', () => {
  let permissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    permissionService = new PermissionService(mockConfig, mockApiClient, mockErrorHandler);
  });

  afterEach(() => {
    permissionService.dispose();
  });

  describe('Constructor and Initialization', () => {
    test('should create service instance with correct configuration', () => {
      expect(permissionService.config).toBe(mockConfig);
      expect(permissionService.apiClient).toBe(mockApiClient);
      expect(permissionService.errorHandler).toBe(mockErrorHandler);
      expect(permissionService.initialized).toBe(false);
    });

    test('should initialize service successfully', async () => {
      await permissionService.initialize();

      expect(permissionService.initialized).toBe(true);
      expect(mockApiClient.isSessionValid).toHaveBeenCalled();
    });

    test('should authenticate if session is invalid during initialization', async () => {
      mockApiClient.isSessionValid.mockReturnValue(false);

      await permissionService.initialize();

      expect(mockApiClient.authenticate).toHaveBeenCalled();
      expect(permissionService.initialized).toBe(true);
    });
  });

  describe('Permission Retrieval', () => {
    beforeEach(async () => {
      await permissionService.initialize();
    });

    test('should get permissions for a resource successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          permission: [
            { recipient: 'testuser', mask: 6, uri: '/reports/test' },
            { recipient: 'ROLE_USER', mask: 2, uri: '/reports/test' },
          ],
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await permissionService.getPermissions({
        resourceUri: '/reports/test',
        includeInherited: false,
        resolveAll: false,
      });

      expect(result.resourceUri).toBe('/reports/test');
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions[0].recipient).toBe('testuser');
      expect(result.permissions[0].mask).toBe(6);
      expect(mockApiClient.get).toHaveBeenCalledWith('/rest_v2/permissions', {
        params: { resourceUri: '/reports/test', includeInherited: true },
      });
    });

    test('should handle resource not found error', async () => {
      const mockResponse = { status: 404, data: 'Resource not found' };
      mockApiClient.get.mockResolvedValue(mockResponse);
      const mockError = new Error('Resource not found');
      mockError.name = 'MCPError';
      mockErrorHandler.createResourceNotFoundError.mockImplementation(() => {
        throw mockError;
      });

      await expect(
        permissionService.getPermissions({
          resourceUri: '/reports/nonexistent',
        })
      ).rejects.toThrow();

      expect(mockErrorHandler.createResourceNotFoundError).toHaveBeenCalled();
    });

    test('should validate resource URI format', async () => {
      mockErrorHandler.createValidationError.mockReturnValue(new Error('Invalid resource URI'));

      await expect(
        permissionService.getPermissions({
          resourceUri: 'invalid-uri',
        })
      ).rejects.toThrow('Invalid resource URI');

      expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
        'resourceUri',
        'Resource URI must start with /',
        'invalid-uri',
        'path starting with /'
      );
    });
  });

  describe('Permission Setting', () => {
    beforeEach(async () => {
      await permissionService.initialize();
    });

    test('should set permissions for a resource successfully', async () => {
      const mockResponse = { status: 200, data: {} };
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await permissionService.setPermissions({
        resourceUri: '/reports/test',
        permissions: [
          { recipient: 'testuser', mask: PERMISSION_MASKS.READ_WRITE },
          { recipient: 'ROLE_USER', mask: PERMISSION_MASKS.READ },
        ],
        replaceAll: false,
      });

      expect(result.resourceUri).toBe('/reports/test');
      expect(result.permissionsSet).toHaveLength(2);
      expect(result.permissionsSet[0].recipient).toBe('testuser');
      expect(result.permissionsSet[0].mask).toBe(PERMISSION_MASKS.READ_WRITE);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/rest_v2/permissions/reports/test',
        {
          permission: [
            { recipient: 'testuser', mask: 6, uri: '/reports/test' },
            { recipient: 'ROLE_USER', mask: 2, uri: '/reports/test' },
          ],
        },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { replaceAll: false },
        }
      );
    });

    test('should validate permission entries', async () => {
      const mockError = new Error('Invalid permission mask');
      mockError.name = 'MCPError';
      mockErrorHandler.createValidationError.mockImplementation(() => {
        throw mockError;
      });

      await expect(
        permissionService.setPermissions({
          resourceUri: '/reports/test',
          permissions: [
            { recipient: 'testuser', mask: 999 }, // Invalid mask
          ],
        })
      ).rejects.toThrow();

      expect(mockErrorHandler.createValidationError).toHaveBeenCalled();
    });
  });

  describe('Access Validation', () => {
    beforeEach(async () => {
      await permissionService.initialize();
    });

    test('should validate user access correctly', async () => {
      // Mock getPermissions to return effective permissions
      const mockPermissionsResponse = {
        effectivePermissions: [{ recipient: 'testuser', mask: PERMISSION_MASKS.READ_WRITE }],
      };

      jest.spyOn(permissionService, 'getPermissions').mockResolvedValue(mockPermissionsResponse);

      const result = await permissionService.validateAccess('/reports/test', 'testuser', 'read');

      expect(result.hasAccess).toBe(true);
      expect(result.resourceUri).toBe('/reports/test');
      expect(result.username).toBe('testuser');
      expect(result.operation).toBe('read');
      expect(result.effectivePermissionMask).toBe(PERMISSION_MASKS.READ_WRITE);
      expect(result.requiredPermissionMask).toBe(PERMISSION_MASKS.READ);
    });

    test('should deny access when user lacks required permissions', async () => {
      const mockPermissionsResponse = {
        effectivePermissions: [{ recipient: 'testuser', mask: PERMISSION_MASKS.READ }],
      };

      jest.spyOn(permissionService, 'getPermissions').mockResolvedValue(mockPermissionsResponse);

      const result = await permissionService.validateAccess('/reports/test', 'testuser', 'write');

      expect(result.hasAccess).toBe(false);
      expect(result.effectivePermissionMask).toBe(PERMISSION_MASKS.READ);
      expect(result.requiredPermissionMask).toBe(PERMISSION_MASKS.WRITE);
    });
  });

  describe('Role Management', () => {
    beforeEach(async () => {
      await permissionService.initialize();
    });

    test('should create role successfully', async () => {
      const mockResponse = { status: 201, data: {} };
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await permissionService.createRole({
        roleName: 'TEST_ROLE',
        description: 'Test role for unit testing',
        externallyDefined: false,
      });

      expect(result.roleName).toBe('TEST_ROLE');
      expect(result.description).toBe('Test role for unit testing');
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/rest_v2/roles/TEST_ROLE',
        {
          roleName: 'TEST_ROLE',
          description: 'Test role for unit testing',
          externallyDefined: false,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    test('should list roles successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          role: [
            { roleName: 'ROLE_USER', description: 'User role', externallyDefined: false },
            { roleName: 'ROLE_ADMIN', description: 'Admin role', externallyDefined: false },
          ],
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await permissionService.listRoles({
        limit: 100,
        offset: 0,
      });

      expect(result.roles).toHaveLength(2);
      expect(result.roles[0].roleName).toBe('ROLE_USER');
      expect(result.roles[1].roleName).toBe('ROLE_ADMIN');
      expect(mockApiClient.get).toHaveBeenCalledWith('/rest_v2/roles', {
        params: { limit: 100 },
      });
    });

    test('should delete role successfully', async () => {
      const mockExistsResponse = { status: 200, data: {} };
      const mockDeleteResponse = { status: 204, data: {} };

      mockApiClient.get.mockResolvedValue(mockExistsResponse);
      mockApiClient.delete.mockResolvedValue(mockDeleteResponse);

      const result = await permissionService.deleteRole('TEST_ROLE');

      expect(result.roleName).toBe('TEST_ROLE');
      expect(mockApiClient.delete).toHaveBeenCalledWith('/rest_v2/roles/TEST_ROLE');
    });
  });

  describe('Permission Conflict Resolution', () => {
    test('should resolve permission conflicts correctly', () => {
      const permissions = [
        { recipient: 'testuser', mask: PERMISSION_MASKS.READ },
        { recipient: 'testuser', mask: PERMISSION_MASKS.WRITE },
        { recipient: 'ROLE_USER', mask: PERMISSION_MASKS.EXECUTE },
      ];

      const resolved = permissionService.resolvePermissionConflicts(permissions);

      expect(resolved).toHaveLength(2);

      // User permissions should be combined with bitwise OR
      const userPermission = resolved.find(p => p.recipient === 'testuser');
      expect(userPermission.mask).toBe(PERMISSION_MASKS.READ | PERMISSION_MASKS.WRITE);

      // Role permission should remain unchanged
      const rolePermission = resolved.find(p => p.recipient === 'ROLE_USER');
      expect(rolePermission.mask).toBe(PERMISSION_MASKS.EXECUTE);
    });

    test('should prioritize user permissions over role permissions', () => {
      const permissions = [
        { recipient: 'ROLE_USER', mask: PERMISSION_MASKS.READ },
        { recipient: 'testuser', mask: PERMISSION_MASKS.WRITE },
      ];

      const resolved = permissionService.resolvePermissionConflicts(permissions);

      // User permission should come first due to higher precedence
      expect(resolved[0].recipient).toBe('testuser');
      expect(resolved[1].recipient).toBe('ROLE_USER');
    });
  });

  describe('Service Statistics and Cleanup', () => {
    test('should return correct service statistics', () => {
      const stats = permissionService.getServiceStatistics();

      expect(stats).toHaveProperty('initialized');
      expect(stats).toHaveProperty('apiClientAuthenticated');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('roleCacheSize');
      expect(stats).toHaveProperty('supportedPermissionMasks');
      expect(stats).toHaveProperty('supportedRecipientTypes');

      expect(stats.supportedPermissionMasks).toContain('READ');
      expect(stats.supportedPermissionMasks).toContain('WRITE');
      expect(stats.supportedRecipientTypes).toContain('user');
      expect(stats.supportedRecipientTypes).toContain('role');
    });

    test('should dispose service correctly', () => {
      permissionService.dispose();

      expect(permissionService.initialized).toBe(false);
      expect(permissionService.permissionCache.size).toBe(0);
      expect(permissionService.roleCache.size).toBe(0);
      expect(permissionService.cacheExpiry.size).toBe(0);
    });
  });

  describe('Constants and Exports', () => {
    test('should export permission masks correctly', () => {
      expect(PERMISSION_MASKS.NO_ACCESS).toBe(0);
      expect(PERMISSION_MASKS.READ).toBe(2);
      expect(PERMISSION_MASKS.WRITE).toBe(4);
      expect(PERMISSION_MASKS.DELETE).toBe(8);
      expect(PERMISSION_MASKS.EXECUTE).toBe(16);
      expect(PERMISSION_MASKS.ADMINISTER).toBe(1);
      expect(PERMISSION_MASKS.READ_WRITE).toBe(6); // READ + WRITE
      expect(PERMISSION_MASKS.FULL_CONTROL).toBe(31); // All permissions
    });

    test('should export permission names correctly', () => {
      expect(PERMISSION_NAMES[PERMISSION_MASKS.NO_ACCESS]).toBe('No Access');
      expect(PERMISSION_NAMES[PERMISSION_MASKS.READ]).toBe('Read');
      expect(PERMISSION_NAMES[PERMISSION_MASKS.WRITE]).toBe('Write');
      expect(PERMISSION_NAMES[PERMISSION_MASKS.FULL_CONTROL]).toBe('Full Control');
    });

    test('should export recipient types correctly', () => {
      expect(RECIPIENT_TYPES.USER).toBe('user');
      expect(RECIPIENT_TYPES.ROLE).toBe('role');
    });
  });
});
