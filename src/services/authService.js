/**
 * Authentication Service for JasperReports MCP Server
 *
 * This service handles all authentication methods supported by JasperReports Server:
 * - HTTP Basic Authentication
 * - Login Service Authentication with session management
 * - Argument-based Authentication
 *
 * Features:
 * - Session management for login service authentication
 * - Credential validation and organization-specific login support
 * - Connection testing and server info retrieval
 * - Authentication retry logic for expired sessions
 * - Comprehensive error handling and logging
 */

import APIClient, { AUTH_TYPES } from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';

/**
 * Authentication states
 */
const AUTH_STATES = {
  NOT_AUTHENTICATED: 'not_authenticated',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  EXPIRED: 'expired',
  FAILED: 'failed',
};

/**
 * Session management constants
 */
const SESSION_CONSTANTS = {
  DEFAULT_EXPIRY_MINUTES: 30,
  RENEWAL_THRESHOLD_MINUTES: 5,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

/**
 * Authentication Service class
 */
class AuthService {
  constructor(config = null, apiClient = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = new ErrorHandler(this.config);

    // Authentication state
    this.authState = AUTH_STATES.NOT_AUTHENTICATED;
    this.lastAuthTime = null;
    this.sessionExpiry = null;
    this.retryCount = 0;
    this.authPromise = null; // Prevent concurrent authentication attempts

    // Server information cache
    this.serverInfo = null;
    this.serverInfoExpiry = null;

    // Event handlers for authentication state changes
    this.authStateHandlers = new Map();

    this._initializeService();
  }

  /**
   * Initialize the authentication service
   * @private
   */
  _initializeService() {
    if (this.config.debugMode) {
      console.log('[Auth Service] Initializing authentication service', {
        authType: this.config.authType,
        jasperUrl: this.config.jasperUrl,
        organization: this.config.organization || 'none',
      });
    }
  }

  /**
   * Authenticate with JasperReports Server using configured method
   * @param {boolean} forceReauth - Force re-authentication even if already authenticated
   * @returns {Promise<object>} Authentication result with token/session info
   */
  async authenticate(forceReauth = false) {
    // Prevent concurrent authentication attempts
    if (this.authPromise && !forceReauth) {
      return this.authPromise;
    }

    // Check if already authenticated and session is valid
    if (!forceReauth && this.isAuthenticated() && this.isSessionValid()) {
      return {
        success: true,
        authType: this.config.authType,
        sessionValid: true,
        message: 'Already authenticated with valid session',
      };
    }

    this.authPromise = this._performAuthentication(forceReauth);

    try {
      const result = await this.authPromise;
      this.authPromise = null;
      return result;
    } catch (error) {
      this.authPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual authentication process
   * @private
   */
  async _performAuthentication(forceReauth) {
    this._setAuthState(AUTH_STATES.AUTHENTICATING);

    try {
      let authResult;

      switch (this.config.authType) {
        case AUTH_TYPES.BASIC:
          authResult = await this._authenticateBasic();
          break;
        case AUTH_TYPES.LOGIN:
          authResult = await this._authenticateLogin();
          break;
        case AUTH_TYPES.ARGUMENT:
          authResult = await this._authenticateArgument();
          break;
        default:
          throw this.errorHandler.createValidationError(
            'authType',
            `Unsupported authentication type: ${this.config.authType}`,
            this.config.authType,
            'must be one of: basic, login, argument'
          );
      }

      // Validate authentication by testing connection
      const connectionTest = await this._testAuthenticatedConnection();
      if (!connectionTest.success) {
        throw this.errorHandler.createAuthenticationError(
          'Authentication validation failed: ' + connectionTest.error,
          this.config.authType
        );
      }

      this._setAuthState(AUTH_STATES.AUTHENTICATED);
      this.lastAuthTime = new Date();
      this.retryCount = 0;

      const result = {
        success: true,
        authType: this.config.authType,
        sessionValid: true,
        sessionExpiry: this.sessionExpiry,
        serverInfo: connectionTest.serverInfo,
        message: `Successfully authenticated using ${this.config.authType} method`,
        ...authResult,
      };

      if (this.config.debugMode) {
        console.log('[Auth Service] Authentication successful', {
          authType: this.config.authType,
          sessionExpiry: this.sessionExpiry,
          serverVersion: connectionTest.serverInfo?.version,
        });
      }

      this._notifyAuthStateChange(AUTH_STATES.AUTHENTICATED, result);
      return result;
    } catch (error) {
      this._setAuthState(AUTH_STATES.FAILED);
      this.retryCount++;

      this.errorHandler.logError(error, 'Authentication', {
        authType: this.config.authType,
        retryCount: this.retryCount,
        forceReauth,
      });

      this._notifyAuthStateChange(AUTH_STATES.FAILED, { error });

      // Clear authentication state on failure
      this.apiClient.clearAuthentication();

      throw error;
    }
  }

  /**
   * Authenticate using HTTP Basic Authentication
   * @private
   */
  async _authenticateBasic() {
    const username = this._getFormattedUsername();

    try {
      const token = await this.apiClient.authenticate();

      return {
        token,
        username,
        method: 'basic',
      };
    } catch (error) {
      throw this.errorHandler.createAuthenticationError(
        `Basic authentication failed: ${error.message}`,
        AUTH_TYPES.BASIC
      );
    }
  }

  /**
   * Authenticate using login service with session management
   * @private
   */
  async _authenticateLogin() {
    const username = this._getFormattedUsername();

    try {
      const sessionId = await this.apiClient.authenticate();

      // Set session expiry
      this.sessionExpiry = new Date(
        Date.now() + SESSION_CONSTANTS.DEFAULT_EXPIRY_MINUTES * 60 * 1000
      );

      return {
        sessionId,
        username,
        method: 'login',
        sessionExpiry: this.sessionExpiry,
      };
    } catch (error) {
      throw this.errorHandler.createAuthenticationError(
        `Login service authentication failed: ${error.message}`,
        AUTH_TYPES.LOGIN
      );
    }
  }

  /**
   * Authenticate using argument-based method
   * @private
   */
  async _authenticateArgument() {
    const username = this._getFormattedUsername();

    try {
      const result = await this.apiClient.authenticate();

      return {
        username,
        method: 'argument',
        result,
      };
    } catch (error) {
      throw this.errorHandler.createAuthenticationError(
        `Argument-based authentication failed: ${error.message}`,
        AUTH_TYPES.ARGUMENT
      );
    }
  }

  /**
   * Test authenticated connection and retrieve server info
   * @private
   */
  async _testAuthenticatedConnection() {
    try {
      const serverInfo = await this.apiClient.getServerInfo();

      return {
        success: true,
        serverInfo,
        connectionTime: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        connectionTime: new Date(),
      };
    }
  }

  /**
   * Get formatted username with organization if configured
   * @private
   */
  _getFormattedUsername() {
    const username = this.config.username;
    const organization = this.config.organization;

    // If organization is configured and username doesn't already contain it
    if (organization && !username.includes('|')) {
      return `${username}|${organization}`;
    }

    return username;
  }

  /**
   * Set authentication state and handle state transitions
   * @private
   */
  _setAuthState(newState) {
    const oldState = this.authState;
    this.authState = newState;

    if (this.config.debugMode && oldState !== newState) {
      console.log(`[Auth Service] State transition: ${oldState} -> ${newState}`);
    }
  }

  /**
   * Notify registered handlers about authentication state changes
   * @private
   */
  _notifyAuthStateChange(state, data = null) {
    const handlers = this.authStateHandlers.get(state) || [];
    handlers.forEach(handler => {
      try {
        handler(state, data);
      } catch (error) {
        this.errorHandler.logError(error, 'Auth state handler', { state });
      }
    });
  }

  /**
   * Check if currently authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.authState === AUTH_STATES.AUTHENTICATED && this.apiClient.isSessionValid();
  }

  /**
   * Check if current session is valid and not expired
   * @returns {boolean} True if session is valid
   */
  isSessionValid() {
    if (!this.isAuthenticated()) {
      return false;
    }

    // Check API client session validity
    if (!this.apiClient.isSessionValid()) {
      this._setAuthState(AUTH_STATES.EXPIRED);
      return false;
    }

    // Check our own session expiry for login service
    if (this.config.authType === AUTH_TYPES.LOGIN && this.sessionExpiry) {
      if (new Date() > this.sessionExpiry) {
        this._setAuthState(AUTH_STATES.EXPIRED);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if session needs renewal (close to expiry)
   * @returns {boolean} True if session should be renewed
   */
  shouldRenewSession() {
    if (!this.isAuthenticated() || this.config.authType !== AUTH_TYPES.LOGIN) {
      return false;
    }

    if (!this.sessionExpiry) {
      return false;
    }

    const renewalThreshold = new Date(
      this.sessionExpiry.getTime() - SESSION_CONSTANTS.RENEWAL_THRESHOLD_MINUTES * 60 * 1000
    );

    return new Date() > renewalThreshold;
  }

  /**
   * Renew authentication session if needed
   * @returns {Promise<object>} Renewal result
   */
  async renewSession() {
    if (!this.shouldRenewSession()) {
      return {
        success: true,
        renewed: false,
        message: 'Session renewal not needed',
      };
    }

    if (this.config.debugMode) {
      console.log('[Auth Service] Renewing session');
    }

    try {
      const result = await this.authenticate(true);
      return {
        success: true,
        renewed: true,
        message: 'Session renewed successfully',
        ...result,
      };
    } catch (error) {
      this.errorHandler.logError(error, 'Session renewal');
      return {
        success: false,
        renewed: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate credentials without full authentication
   * @param {string} username - Username to validate
   * @param {string} password - Password to validate
   * @param {string} organization - Optional organization
   * @returns {Promise<object>} Validation result
   */
  async validateCredentials(username, password, organization = null) {
    // Create temporary API client for validation
    const tempConfig = {
      ...this.config,
      username,
      password,
      organization: organization || this.config.organization,
    };

    const tempClient = new APIClient(tempConfig);

    try {
      await tempClient.authenticate();
      const serverInfo = await tempClient.getServerInfo();

      return {
        valid: true,
        username:
          organization && !username.includes('|') ? `${username}|${organization}` : username,
        serverInfo,
        message: 'Credentials are valid',
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'Credential validation failed',
      };
    } finally {
      tempClient.clearAuthentication();
    }
  }

  /**
   * Test connection to JasperReports Server
   * @param {boolean} includeAuth - Include authentication test
   * @returns {Promise<object>} Connection test result
   */
  async testConnection(includeAuth = true) {
    const result = {
      timestamp: new Date(),
      serverUrl: this.config.jasperUrl,
      connectionSuccess: false,
      authenticationSuccess: false,
      serverInfo: null,
      error: null,
      responseTime: null,
    };

    const startTime = Date.now();

    try {
      // Test basic connectivity
      const connectionTest = await this.apiClient.testConnection();
      result.connectionSuccess = connectionTest;

      if (!connectionTest) {
        result.error = 'Failed to connect to JasperReports Server';
        return result;
      }

      // Get server information
      try {
        result.serverInfo = await this.apiClient.getServerInfo();
        this.serverInfo = result.serverInfo;
        this.serverInfoExpiry = new Date(Date.now() + 5 * 60 * 1000); // Cache for 5 minutes
      } catch (error) {
        // Connection works but server info failed - might be auth issue
        result.error = `Server info retrieval failed: ${error.message}`;
      }

      // Test authentication if requested
      if (includeAuth) {
        try {
          await this.authenticate();
          result.authenticationSuccess = this.isAuthenticated();
        } catch (error) {
          result.error = `Authentication failed: ${error.message}`;
        }
      }

      result.responseTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log('[Auth Service] Connection test completed', result);
      }

      return result;
    } catch (error) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;

      this.errorHandler.logError(error, 'Connection test');
      return result;
    }
  }

  /**
   * Get server information with caching
   * @param {boolean} forceRefresh - Force refresh of cached server info
   * @returns {Promise<object>} Server information
   */
  async getServerInfo(forceRefresh = false) {
    // Return cached info if available and not expired
    if (
      !forceRefresh &&
      this.serverInfo &&
      this.serverInfoExpiry &&
      new Date() < this.serverInfoExpiry
    ) {
      return this.serverInfo;
    }

    try {
      this.serverInfo = await this.apiClient.getServerInfo();
      this.serverInfoExpiry = new Date(Date.now() + 5 * 60 * 1000); // Cache for 5 minutes

      return this.serverInfo;
    } catch (error) {
      this.errorHandler.logError(error, 'Get server info');
      throw this.errorHandler.createConnectionError(
        `Failed to retrieve server information: ${error.message}`,
        error
      );
    }
  }

  /**
   * Retry authentication with exponential backoff
   * @param {number} maxAttempts - Maximum retry attempts
   * @returns {Promise<object>} Authentication result
   */
  async retryAuthentication(maxAttempts = SESSION_CONSTANTS.MAX_RETRY_ATTEMPTS) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (this.config.debugMode) {
          console.log(`[Auth Service] Authentication retry attempt ${attempt}/${maxAttempts}`);
        }

        const result = await this.authenticate(true);

        if (this.config.debugMode) {
          console.log(`[Auth Service] Authentication retry successful on attempt ${attempt}`);
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          const delay = SESSION_CONSTANTS.RETRY_DELAY_MS * Math.pow(2, attempt - 1);

          if (this.config.debugMode) {
            console.log(
              `[Auth Service] Authentication attempt ${attempt} failed, retrying in ${delay}ms`
            );
          }

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.errorHandler.logError(lastError, 'Authentication retry exhausted', { maxAttempts });
    throw this.errorHandler.createAuthenticationError(
      `Authentication failed after ${maxAttempts} attempts: ${lastError.message}`,
      this.config.authType
    );
  }

  /**
   * Clear authentication state and session data
   */
  clearAuthentication() {
    this._setAuthState(AUTH_STATES.NOT_AUTHENTICATED);
    this.lastAuthTime = null;
    this.sessionExpiry = null;
    this.retryCount = 0;
    this.authPromise = null;

    this.apiClient.clearAuthentication();

    if (this.config.debugMode) {
      console.log('[Auth Service] Authentication state cleared');
    }

    this._notifyAuthStateChange(AUTH_STATES.NOT_AUTHENTICATED);
  }

  /**
   * Get current authentication status
   * @returns {object} Authentication status information
   */
  getAuthenticationStatus() {
    const apiStatus = this.apiClient.getAuthenticationStatus();

    return {
      state: this.authState,
      isAuthenticated: this.isAuthenticated(),
      sessionValid: this.isSessionValid(),
      shouldRenew: this.shouldRenewSession(),
      authType: this.config.authType,
      username: this._getFormattedUsername(),
      lastAuthTime: this.lastAuthTime,
      sessionExpiry: this.sessionExpiry,
      retryCount: this.retryCount,
      serverInfo: this.serverInfo,
      apiClientStatus: apiStatus,
    };
  }

  /**
   * Register handler for authentication state changes
   * @param {string} state - State to listen for
   * @param {function} handler - Handler function
   */
  onAuthStateChange(state, handler) {
    if (!this.authStateHandlers.has(state)) {
      this.authStateHandlers.set(state, []);
    }
    this.authStateHandlers.get(state).push(handler);
  }

  /**
   * Unregister handler for authentication state changes
   * @param {string} state - State to stop listening for
   * @param {function} handler - Handler function to remove
   */
  offAuthStateChange(state, handler) {
    const handlers = this.authStateHandlers.get(state);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Ensure authentication is valid, re-authenticating if necessary
   * @returns {Promise<boolean>} True if authentication is valid
   */
  async ensureAuthenticated() {
    if (this.isAuthenticated() && this.isSessionValid()) {
      return true;
    }

    if (this.shouldRenewSession()) {
      const renewal = await this.renewSession();
      return renewal.success;
    }

    try {
      await this.authenticate();
      return this.isAuthenticated();
    } catch (error) {
      this.errorHandler.logError(error, 'Ensure authenticated');
      return false;
    }
  }

  /**
   * Get authentication headers for manual requests
   * @returns {object} Authentication headers
   */
  getAuthHeaders() {
    if (!this.isAuthenticated()) {
      return {};
    }

    return this.apiClient.authHeaders || {};
  }

  /**
   * Dispose of the authentication service and clean up resources
   */
  dispose() {
    this.clearAuthentication();
    this.authStateHandlers.clear();
    this.serverInfo = null;
    this.serverInfoExpiry = null;

    if (this.config.debugMode) {
      console.log('[Auth Service] Service disposed');
    }
  }
}

export default AuthService;
export { AUTH_STATES, SESSION_CONSTANTS };
