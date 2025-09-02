/**
 * Simple Unit Tests for Authentication Service
 *
 * Basic tests to verify the authentication service functionality
 * without complex mocking setup.
 */

import { jest } from '@jest/globals';
import AuthService, { AUTH_STATES, SESSION_CONSTANTS } from '../../../src/services/authService.js';

describe('AuthService - Basic Functionality', () => {
  let authService;
  let mockConfig;
  let mockApiClient;

  beforeEach(() => {
    // Mock configuration
    mockConfig = {
      jasperUrl: 'http://localhost:8080/jasperserver',
      authType: 'basic',
      username: 'testuser',
      password: 'testpass',
      organization: null,
      debugMode: false,
      timeout: 30000,
      retryAttempts: 3,
    };

    // Mock API client
    mockApiClient = {
      authenticate: jest.fn(),
      getServerInfo: jest.fn(),
      testConnection: jest.fn(),
      isSessionValid: jest.fn(),
      clearAuthentication: jest.fn(),
      getAuthenticationStatus: jest.fn(),
      authHeaders: {},
    };

    // Create auth service instance with mocked dependencies
    authService = new AuthService(mockConfig, mockApiClient);
  });

  afterEach(() => {
    if (authService) {
      authService.dispose();
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      expect(authService.authState).toBe(AUTH_STATES.NOT_AUTHENTICATED);
      expect(authService.lastAuthTime).toBeNull();
      expect(authService.sessionExpiry).toBeNull();
      expect(authService.retryCount).toBe(0);
    });

    test('should initialize with provided configuration', () => {
      expect(authService.config).toBe(mockConfig);
      expect(authService.apiClient).toBe(mockApiClient);
    });
  });

  describe('Authentication State Management', () => {
    test('should check if authenticated correctly', () => {
      // Not authenticated initially
      authService.authState = AUTH_STATES.NOT_AUTHENTICATED;
      mockApiClient.isSessionValid.mockReturnValue(false);
      expect(authService.isAuthenticated()).toBe(false);

      // Authenticated state
      authService.authState = AUTH_STATES.AUTHENTICATED;
      mockApiClient.isSessionValid.mockReturnValue(true);
      expect(authService.isAuthenticated()).toBe(true);
    });

    test('should validate session correctly for login auth', () => {
      mockConfig.authType = 'login';
      authService = new AuthService(mockConfig, mockApiClient);

      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.sessionExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      mockApiClient.isSessionValid.mockReturnValue(true);

      expect(authService.isSessionValid()).toBe(true);
    });

    test('should detect expired session', () => {
      mockConfig.authType = 'login';
      authService = new AuthService(mockConfig, mockApiClient);

      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.sessionExpiry = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      mockApiClient.isSessionValid.mockReturnValue(true);

      expect(authService.isSessionValid()).toBe(false);
      expect(authService.authState).toBe(AUTH_STATES.EXPIRED);
    });

    test('should determine if session needs renewal', () => {
      mockConfig.authType = 'login';
      authService = new AuthService(mockConfig, mockApiClient);

      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.sessionExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      mockApiClient.isSessionValid.mockReturnValue(true);

      expect(authService.shouldRenewSession()).toBe(true);
    });

    test('should not need renewal for non-login auth types', () => {
      authService.authState = AUTH_STATES.AUTHENTICATED;
      mockApiClient.isSessionValid.mockReturnValue(true);

      expect(authService.shouldRenewSession()).toBe(false);
    });
  });

  describe('Username Formatting', () => {
    test('should format username without organization', () => {
      const formatted = authService._getFormattedUsername();
      expect(formatted).toBe('testuser');
    });

    test('should format username with organization', () => {
      mockConfig.organization = 'testorg';
      authService = new AuthService(mockConfig, mockApiClient);

      const formatted = authService._getFormattedUsername();
      expect(formatted).toBe('testuser|testorg');
    });

    test('should not duplicate organization in username', () => {
      mockConfig.username = 'testuser|existingorg';
      mockConfig.organization = 'testorg';
      authService = new AuthService(mockConfig, mockApiClient);

      const formatted = authService._getFormattedUsername();
      expect(formatted).toBe('testuser|existingorg');
    });
  });

  describe('Authentication Status', () => {
    test('should return comprehensive authentication status', () => {
      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.lastAuthTime = new Date();
      authService.sessionExpiry = new Date(Date.now() + 30 * 60 * 1000);
      authService.retryCount = 1;

      mockApiClient.isSessionValid.mockReturnValue(true);
      mockApiClient.getAuthenticationStatus.mockReturnValue({
        isAuthenticated: true,
        authType: 'basic',
      });

      const status = authService.getAuthenticationStatus();

      expect(status.state).toBe(AUTH_STATES.AUTHENTICATED);
      expect(status.isAuthenticated).toBe(true);
      expect(status.authType).toBe('basic');
      expect(status.username).toBe('testuser');
      expect(status.lastAuthTime).toBeInstanceOf(Date);
      expect(status.sessionExpiry).toBeInstanceOf(Date);
      expect(status.retryCount).toBe(1);
      expect(status.apiClientStatus).toBeDefined();
    });
  });

  describe('State Management', () => {
    test('should clear authentication state', () => {
      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.lastAuthTime = new Date();
      authService.sessionExpiry = new Date();
      authService.retryCount = 2;

      authService.clearAuthentication();

      expect(authService.authState).toBe(AUTH_STATES.NOT_AUTHENTICATED);
      expect(authService.lastAuthTime).toBeNull();
      expect(authService.sessionExpiry).toBeNull();
      expect(authService.retryCount).toBe(0);
      expect(authService.authPromise).toBeNull();
      expect(mockApiClient.clearAuthentication).toHaveBeenCalled();
    });

    test('should get auth headers when authenticated', () => {
      authService.authState = AUTH_STATES.AUTHENTICATED;
      mockApiClient.isSessionValid.mockReturnValue(true);
      mockApiClient.authHeaders = { Authorization: 'Basic test123' };

      const headers = authService.getAuthHeaders();
      expect(headers).toEqual({ Authorization: 'Basic test123' });
    });

    test('should return empty headers when not authenticated', () => {
      authService.authState = AUTH_STATES.NOT_AUTHENTICATED;
      mockApiClient.isSessionValid.mockReturnValue(false);

      const headers = authService.getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('Event Handling', () => {
    test('should register and notify auth state change handlers', () => {
      const handler = jest.fn();

      authService.onAuthStateChange(AUTH_STATES.AUTHENTICATED, handler);
      authService._notifyAuthStateChange(AUTH_STATES.AUTHENTICATED, { test: 'data' });

      expect(handler).toHaveBeenCalledWith(AUTH_STATES.AUTHENTICATED, { test: 'data' });
    });

    test('should unregister auth state change handlers', () => {
      const handler = jest.fn();

      authService.onAuthStateChange(AUTH_STATES.AUTHENTICATED, handler);
      authService.offAuthStateChange(AUTH_STATES.AUTHENTICATED, handler);
      authService._notifyAuthStateChange(AUTH_STATES.AUTHENTICATED, { test: 'data' });

      expect(handler).not.toHaveBeenCalled();
    });

    test('should handle multiple handlers for same state', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      authService.onAuthStateChange(AUTH_STATES.AUTHENTICATED, handler1);
      authService.onAuthStateChange(AUTH_STATES.AUTHENTICATED, handler2);
      authService._notifyAuthStateChange(AUTH_STATES.AUTHENTICATED, { test: 'data' });

      expect(handler1).toHaveBeenCalledWith(AUTH_STATES.AUTHENTICATED, { test: 'data' });
      expect(handler2).toHaveBeenCalledWith(AUTH_STATES.AUTHENTICATED, { test: 'data' });
    });
  });

  describe('Disposal', () => {
    test('should dispose service and clean up resources', () => {
      authService.authState = AUTH_STATES.AUTHENTICATED;
      authService.serverInfo = { version: '8.2.0' };

      const handler = jest.fn();
      authService.onAuthStateChange(AUTH_STATES.AUTHENTICATED, handler);

      authService.dispose();

      expect(authService.authState).toBe(AUTH_STATES.NOT_AUTHENTICATED);
      expect(authService.serverInfo).toBeNull();
      expect(authService.serverInfoExpiry).toBeNull();
      expect(authService.authStateHandlers.size).toBe(0);
      expect(mockApiClient.clearAuthentication).toHaveBeenCalled();
    });
  });

  describe('Constants', () => {
    test('should export AUTH_STATES constants', () => {
      expect(AUTH_STATES.NOT_AUTHENTICATED).toBe('not_authenticated');
      expect(AUTH_STATES.AUTHENTICATING).toBe('authenticating');
      expect(AUTH_STATES.AUTHENTICATED).toBe('authenticated');
      expect(AUTH_STATES.EXPIRED).toBe('expired');
      expect(AUTH_STATES.FAILED).toBe('failed');
    });

    test('should export SESSION_CONSTANTS', () => {
      expect(SESSION_CONSTANTS.DEFAULT_EXPIRY_MINUTES).toBe(30);
      expect(SESSION_CONSTANTS.RENEWAL_THRESHOLD_MINUTES).toBe(5);
      expect(SESSION_CONSTANTS.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(SESSION_CONSTANTS.RETRY_DELAY_MS).toBe(1000);
    });
  });
});
