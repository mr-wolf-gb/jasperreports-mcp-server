/**
 * Unit tests for UserService
 */

import UserService, {
  USER_STATES,
  ROLE_TYPES,
  PERMISSION_MASKS,
} from '../../../src/services/userService.js';

describe('UserService', () => {
  let userService;
  let mockConfig;

  beforeEach(() => {
    // Setup mock config
    mockConfig = {
      jasperUrl: 'http://localhost:8080/jasperserver',
      authType: 'basic',
      username: 'jasperadmin',
      password: 'jasperadmin',
      debugMode: false,
    };

    // Create service with mock dependencies
    userService = new UserService(mockConfig);
  });

  describe('constants', () => {
    test('should export USER_STATES constants', () => {
      expect(USER_STATES.ENABLED).toBe('enabled');
      expect(USER_STATES.DISABLED).toBe('disabled');
    });

    test('should export ROLE_TYPES constants', () => {
      expect(ROLE_TYPES.INTERNAL).toBe('internal');
      expect(ROLE_TYPES.EXTERNAL).toBe('external');
    });

    test('should export PERMISSION_MASKS constants', () => {
      expect(PERMISSION_MASKS.READ).toBe(1);
      expect(PERMISSION_MASKS.WRITE).toBe(2);
      expect(PERMISSION_MASKS.DELETE).toBe(4);
      expect(PERMISSION_MASKS.EXECUTE).toBe(8);
      expect(PERMISSION_MASKS.ADMIN).toBe(16);
    });
  });

  describe('service instantiation', () => {
    test('should create UserService instance', () => {
      expect(userService).toBeInstanceOf(UserService);
      expect(userService.initialized).toBe(false);
    });

    test('should have required methods', () => {
      expect(typeof userService.initialize).toBe('function');
      expect(typeof userService.createUser).toBe('function');
      expect(typeof userService.listUsers).toBe('function');
      expect(typeof userService.getUser).toBe('function');
      expect(typeof userService.updateUser).toBe('function');
      expect(typeof userService.deleteUser).toBe('function');
      expect(typeof userService.validateCredentials).toBe('function');
      expect(typeof userService.createRole).toBe('function');
      expect(typeof userService.listRoles).toBe('function');
      expect(typeof userService.getRole).toBe('function');
      expect(typeof userService.deleteRole).toBe('function');
      expect(typeof userService.assignRolesToUser).toBe('function');
      expect(typeof userService.removeRolesFromUser).toBe('function');
      expect(typeof userService.deactivateUser).toBe('function');
      expect(typeof userService.reactivateUser).toBe('function');
    });
  });

  describe('service management', () => {
    test('should return service statistics', () => {
      const stats = userService.getServiceStatistics();

      expect(stats).toHaveProperty('initialized');
      expect(stats).toHaveProperty('apiClientAuthenticated');
      expect(stats).toHaveProperty('supportedUserStates');
      expect(stats).toHaveProperty('supportedRoleTypes');
      expect(stats).toHaveProperty('permissionMasks');

      expect(Array.isArray(stats.supportedUserStates)).toBe(true);
      expect(Array.isArray(stats.supportedRoleTypes)).toBe(true);
      expect(typeof stats.permissionMasks).toBe('object');
    });

    test('should dispose service properly', () => {
      userService.dispose();

      expect(userService.initialized).toBe(false);
    });
  });

  describe('internal methods', () => {
    test('should build user descriptor correctly', () => {
      const request = {
        username: 'testuser',
        password: 'testpass',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        enabled: true,
        externallyDefined: false,
      };

      const descriptor = userService._buildUserDescriptor(request);

      expect(descriptor.username).toBe('testuser');
      expect(descriptor.password).toBe('testpass');
      expect(descriptor.fullName).toBe('Test User');
      expect(descriptor.emailAddress).toBe('test@example.com');
      expect(descriptor.enabled).toBe(true);
      expect(descriptor.externallyDefined).toBe(false);
    });

    test('should build user update payload correctly', () => {
      const request = {
        username: 'testuser',
        fullName: 'Updated Name',
        emailAddress: 'updated@example.com',
        enabled: false,
      };

      const payload = userService._buildUserUpdatePayload(request);

      expect(payload.fullName).toBe('Updated Name');
      expect(payload.emailAddress).toBe('updated@example.com');
      expect(payload.enabled).toBe(false);
      expect(payload.username).toBeUndefined(); // Should not be in update payload
    });

    test('should build query parameters for user listing', () => {
      const request = {
        limit: 50,
        offset: 10,
        searchQuery: 'test',
      };

      const params = userService._buildUserListQueryParams(request);

      expect(params.limit).toBe(50);
      expect(params.offset).toBe(10);
      expect(params.q).toBe('test');
    });

    test('should build query parameters for role listing', () => {
      const request = {
        limit: 25,
        offset: 5,
        searchQuery: 'admin',
      };

      const params = userService._buildRoleListQueryParams(request);

      expect(params.limit).toBe(25);
      expect(params.offset).toBe(5);
      expect(params.q).toBe('admin');
    });
  });
});
