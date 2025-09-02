/**
 * Core API Client for JasperReports Server
 *
 * This module provides a comprehensive HTTP client for interacting with JasperReports Server REST API v2.
 * It supports all three authentication methods (basic, login service, argument-based) and handles
 * session management, request/response interceptors, and base64 encoding/decoding utilities.
 */

import axios from 'axios';
import { getConfiguration } from '../config/environment.js';
import { getResilienceManager } from './resilience.js';

/**
 * Authentication types supported by the API client
 */
const AUTH_TYPES = {
  BASIC: 'basic',
  LOGIN: 'login',
  ARGUMENT: 'argument',
};

/**
 * HTTP status codes for common responses
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * API Client class that handles all communication with JasperReports Server
 */
class APIClient {
  constructor(config = null) {
    this.config = config || getConfiguration();
    this.axiosInstance = null;
    this.sessionCookies = new Map();
    this.authHeaders = {};
    this.isAuthenticated = false;
    this.sessionExpiry = null;
    this.resilienceManager = getResilienceManager();

    this._initializeAxiosInstance();
  }

  /**
   * Initialize axios instance with base configuration and interceptors
   * @private
   */
  _initializeAxiosInstance() {
    this.axiosInstance = axios.create({
      baseURL: this.config.jasperUrl,
      timeout: this.config.timeout,
      validateStatus: status => status < 600, // Don't throw on HTTP errors, handle them manually
      maxRedirects: 5,
      httpsAgent: this.config.sslVerify
        ? undefined
        : {
            rejectUnauthorized: false,
          },
    });

    // Request interceptor for authentication and logging
    this.axiosInstance.interceptors.request.use(
      config => this._handleRequestInterceptor(config),
      error => this._handleRequestError(error)
    );

    // Response interceptor for error handling and session management
    this.axiosInstance.interceptors.response.use(
      response => this._handleResponseInterceptor(response),
      error => this._handleResponseError(error)
    );
  }

  /**
   * Handle request interceptor - add authentication headers and logging
   * @private
   */
  _handleRequestInterceptor(config) {
    // Add authentication headers
    if (this.authHeaders && Object.keys(this.authHeaders).length > 0) {
      config.headers = { ...config.headers, ...this.authHeaders };
    }

    // Add session cookies for login service authentication
    if (this.sessionCookies.size > 0) {
      const cookieString = Array.from(this.sessionCookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
      config.headers.Cookie = cookieString;
    }

    // Add argument-based authentication if configured
    if (this.config.authType === AUTH_TYPES.ARGUMENT) {
      config.params = config.params || {};
      config.params.j_username = this._getUsername();
      config.params.j_password = this.config.password;
    }

    // Debug logging
    if (this.config.debugMode) {
      console.log(`[API Client] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: this._sanitizeHeaders(config.headers),
        params: this._sanitizeParams(config.params),
      });
    }

    return config;
  }

  /**
   * Handle request errors
   * @private
   */
  _handleRequestError(error) {
    if (this.config.debugMode) {
      console.error('[API Client] Request error:', error.message);
    }
    return Promise.reject(this._createAPIError('REQUEST_ERROR', error.message, error));
  }

  /**
   * Handle response interceptor - manage sessions and log responses
   * @private
   */
  _handleResponseInterceptor(response) {
    // Extract and store session cookies
    if (response.headers['set-cookie']) {
      this._extractSessionCookies(response.headers['set-cookie']);
    }

    // Debug logging
    if (this.config.debugMode) {
      console.log(`[API Client] Response ${response.status}`, {
        url: response.config.url,
        status: response.status,
        contentType: response.headers['content-type'],
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
      });
    }

    return response;
  }

  /**
   * Handle response errors and authentication challenges
   * @private
   */
  async _handleResponseError(error) {
    if (error.response) {
      const { status, data } = error.response;

      // Handle authentication challenges
      if (status === HTTP_STATUS.UNAUTHORIZED) {
        if (this.config.authType === AUTH_TYPES.LOGIN && this.isAuthenticated) {
          // Session expired, try to re-authenticate
          if (this.config.debugMode) {
            console.log('[API Client] Session expired, attempting re-authentication');
          }

          try {
            await this.authenticate();
            // Retry the original request
            return this.axiosInstance.request(error.config);
          } catch (authError) {
            return Promise.reject(
              this._createAPIError('AUTHENTICATION_FAILED', 'Re-authentication failed', authError)
            );
          }
        }

        return Promise.reject(
          this._createAPIError('UNAUTHORIZED', 'Authentication required', error)
        );
      }

      // Handle other HTTP errors
      const errorMessage = this._extractErrorMessage(data) || `HTTP ${status} error`;
      return Promise.reject(this._createAPIError(`HTTP_${status}`, errorMessage, error));
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject(
        this._createAPIError('CONNECTION_REFUSED', 'Cannot connect to JasperReports Server', error)
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return Promise.reject(this._createAPIError('TIMEOUT', 'Request timeout', error));
    }

    return Promise.reject(this._createAPIError('NETWORK_ERROR', error.message, error));
  }

  /**
   * Extract session cookies from Set-Cookie headers
   * @private
   */
  _extractSessionCookies(setCookieHeaders) {
    setCookieHeaders.forEach(cookieHeader => {
      const [cookiePart] = cookieHeader.split(';');
      const [name, value] = cookiePart.split('=');
      if (name && value) {
        this.sessionCookies.set(name.trim(), value.trim());

        // Set session expiry if this is a session cookie
        if (name.trim().toLowerCase().includes('session')) {
          // Default session expiry to 30 minutes from now
          this.sessionExpiry = new Date(Date.now() + 30 * 60 * 1000);
        }
      }
    });
  }

  /**
   * Extract error message from JasperReports error response
   * @private
   */
  _extractErrorMessage(data) {
    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      return data.message || data.errorMessage || data.error || JSON.stringify(data);
    }

    return null;
  }

  /**
   * Create standardized API error object
   * @private
   */
  _createAPIError(code, message, originalError = null) {
    const error = new Error(message);
    error.name = 'APIError';
    error.code = code;
    error.originalError = originalError;

    if (originalError?.response) {
      error.statusCode = originalError.response.status;
      error.responseData = originalError.response.data;
    }

    return error;
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   * @private
   */
  _sanitizeHeaders(headers) {
    if (!headers) return {};

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize parameters for logging (remove sensitive information)
   * @private
   */
  _sanitizeParams(params) {
    if (!params) return {};

    const sanitized = { ...params };
    const sensitiveParams = ['j_password', 'password'];

    sensitiveParams.forEach(param => {
      if (sanitized[param]) {
        sanitized[param] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get username with organization if configured
   * @private
   */
  _getUsername() {
    if (this.config.organization && !this.config.username.includes('|')) {
      return `${this.config.username}|${this.config.organization}`;
    }
    return this.config.username;
  }

  /**
   * Authenticate with JasperReports Server using configured method
   * @returns {Promise<string>} Authentication token or session identifier
   */
  async authenticate() {
    const authType = this.config.authType;

    try {
      switch (authType) {
        case AUTH_TYPES.BASIC:
          return await this._authenticateBasic();
        case AUTH_TYPES.LOGIN:
          return await this._authenticateLogin();
        case AUTH_TYPES.ARGUMENT:
          return await this._authenticateArgument();
        default:
          throw new Error(`Unsupported authentication type: ${authType}`);
      }
    } catch (error) {
      this.isAuthenticated = false;
      this.authHeaders = {};
      this.sessionCookies.clear();
      throw error;
    }
  }

  /**
   * Authenticate using HTTP Basic Authentication
   * @private
   */
  async _authenticateBasic() {
    const username = this._getUsername();
    const sessionKey = `basic:${username}`;

    // Check if we have cached credentials
    const cachedCredentials = this.resilienceManager.cacheManager.getSessionToken(sessionKey);
    if (cachedCredentials) {
      this.authHeaders = {
        Authorization: `Basic ${cachedCredentials}`,
      };
      this.isAuthenticated = true;
      return cachedCredentials;
    }

    const credentials = Buffer.from(`${username}:${this.config.password}`).toString('base64');

    this.authHeaders = {
      Authorization: `Basic ${credentials}`,
    };

    // Test authentication by getting server info
    const response = await this.get('/rest_v2/serverInfo', { useCache: false, useRetry: false });

    if (response.status === HTTP_STATUS.OK) {
      this.isAuthenticated = true;

      // Cache credentials for future use
      this.resilienceManager.cacheManager.setSessionToken(sessionKey, credentials);

      if (this.config.debugMode) {
        console.log('[API Client] Basic authentication successful');
      }
      return credentials;
    }

    throw this._createAPIError('AUTHENTICATION_FAILED', 'Basic authentication failed');
  }

  /**
   * Authenticate using login service
   * @private
   */
  async _authenticateLogin() {
    const username = this._getUsername();
    const sessionKey = `login:${username}`;

    // Check if we have cached session
    const cachedSession = this.resilienceManager.cacheManager.getSessionToken(sessionKey);
    if (cachedSession) {
      // Restore session cookies
      const sessionData = JSON.parse(cachedSession);
      this.sessionCookies.clear();
      for (const [name, value] of Object.entries(sessionData.cookies)) {
        this.sessionCookies.set(name, value);
      }
      this.sessionExpiry = new Date(sessionData.expiry);
      this.isAuthenticated = true;
      return Array.from(this.sessionCookies.keys()).join(',');
    }

    const loginData = new URLSearchParams({
      j_username: username,
      j_password: this.config.password,
    });

    const response = await this.axiosInstance.post('/rest_v2/login', loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.status === HTTP_STATUS.OK && this.sessionCookies.size > 0) {
      this.isAuthenticated = true;

      // Cache session data
      const sessionData = {
        cookies: Object.fromEntries(this.sessionCookies),
        expiry:
          this.sessionExpiry?.toISOString() || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
      this.resilienceManager.cacheManager.setSessionToken(sessionKey, JSON.stringify(sessionData));

      if (this.config.debugMode) {
        console.log('[API Client] Login service authentication successful');
      }
      return Array.from(this.sessionCookies.keys()).join(',');
    }

    throw this._createAPIError('AUTHENTICATION_FAILED', 'Login service authentication failed');
  }

  /**
   * Authenticate using argument-based method (credentials in URL parameters)
   * @private
   */
  async _authenticateArgument() {
    // For argument-based auth, credentials are added to each request
    // Test authentication by getting server info
    const response = await this.get('/rest_v2/serverInfo');

    if (response.status === HTTP_STATUS.OK) {
      this.isAuthenticated = true;
      if (this.config.debugMode) {
        console.log('[API Client] Argument-based authentication successful');
      }
      return 'argument-based';
    }

    throw this._createAPIError('AUTHENTICATION_FAILED', 'Argument-based authentication failed');
  }

  /**
   * Set custom authentication headers
   * @param {object} headers - Headers to set for authentication
   */
  setAuthHeaders(headers) {
    this.authHeaders = { ...this.authHeaders, ...headers };
  }

  /**
   * Check if current session is valid and not expired
   * @returns {boolean} True if session is valid
   */
  isSessionValid() {
    if (!this.isAuthenticated) {
      return false;
    }

    if (this.sessionExpiry && new Date() > this.sessionExpiry) {
      this.isAuthenticated = false;
      this.sessionCookies.clear();
      return false;
    }

    return true;
  }

  /**
   * Perform HTTP GET request
   * @param {string} url - Request URL (relative to base URL)
   * @param {object} options - Request options
   * @returns {Promise<object>} Response object
   */
  async get(url, options = {}) {
    const cacheKey = options.useCache ? `get:${url}:${JSON.stringify(options.params || {})}` : null;

    return this.resilienceManager.executeWithResilience(
      () => this.axiosInstance.get(url, options),
      {
        operationId: `get:${url}`,
        cacheKey,
        cacheTTL: options.cacheTTL,
        useRetry: options.useRetry !== false,
        useConnectionPool: options.useConnectionPool !== false,
      }
    );
  }

  /**
   * Perform HTTP POST request
   * @param {string} url - Request URL (relative to base URL)
   * @param {any} data - Request data
   * @param {object} options - Request options
   * @returns {Promise<object>} Response object
   */
  async post(url, data, options = {}) {
    const memorySize = this._estimateDataSize(data);
    const memoryOperationId = memorySize > 1024 * 1024 ? `post:${url}:${Date.now()}` : null; // 1MB threshold

    return this.resilienceManager.executeWithResilience(
      () => this.axiosInstance.post(url, data, options),
      {
        operationId: `post:${url}`,
        memoryOperationId,
        memorySize: memoryOperationId ? memorySize : null,
        useRetry: options.useRetry !== false,
        useConnectionPool: options.useConnectionPool !== false,
      }
    );
  }

  /**
   * Perform HTTP PUT request
   * @param {string} url - Request URL (relative to base URL)
   * @param {any} data - Request data
   * @param {object} options - Request options
   * @returns {Promise<object>} Response object
   */
  async put(url, data, options = {}) {
    const memorySize = this._estimateDataSize(data);
    const memoryOperationId = memorySize > 1024 * 1024 ? `put:${url}:${Date.now()}` : null; // 1MB threshold

    return this.resilienceManager.executeWithResilience(
      () => this.axiosInstance.put(url, data, options),
      {
        operationId: `put:${url}`,
        memoryOperationId,
        memorySize: memoryOperationId ? memorySize : null,
        useRetry: options.useRetry !== false,
        useConnectionPool: options.useConnectionPool !== false,
      }
    );
  }

  /**
   * Perform HTTP DELETE request
   * @param {string} url - Request URL (relative to base URL)
   * @param {object} options - Request options
   * @returns {Promise<object>} Response object
   */
  async delete(url, options = {}) {
    return this.resilienceManager.executeWithResilience(
      () => this.axiosInstance.delete(url, options),
      {
        operationId: `delete:${url}`,
        useRetry: options.useRetry !== false,
        useConnectionPool: options.useConnectionPool !== false,
      }
    );
  }

  /**
   * Encode string content to base64
   * @param {string} content - Content to encode
   * @returns {string} Base64 encoded content
   */
  encodeBase64(content) {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string for base64 encoding');
    }
    return Buffer.from(content, 'utf8').toString('base64');
  }

  /**
   * Decode base64 content to string
   * @param {string} encoded - Base64 encoded content
   * @returns {string} Decoded content
   */
  decodeBase64(encoded) {
    if (typeof encoded !== 'string') {
      throw new Error('Encoded content must be a string for base64 decoding');
    }
    return Buffer.from(encoded, 'base64').toString('utf8');
  }

  /**
   * Handle multipart form data for file uploads
   * @param {Array} files - Array of file objects with {name, content, contentType}
   * @returns {FormData} FormData object for multipart upload
   */
  async handleMultipart(files) {
    const { default: FormData } = await import('form-data');
    const formData = new FormData();

    files.forEach(file => {
      if (!file.name || !file.content) {
        throw new Error('File must have name and content properties');
      }

      const buffer = Buffer.isBuffer(file.content)
        ? file.content
        : Buffer.from(file.content, 'utf8');

      formData.append(file.name, buffer, {
        filename: file.filename || file.name,
        contentType: file.contentType || 'application/octet-stream',
      });
    });

    return formData;
  }

  /**
   * Get server information and test connectivity
   * @returns {Promise<object>} Server information
   */
  async getServerInfo() {
    const response = await this.get('/rest_v2/serverInfo');

    if (response.status === HTTP_STATUS.OK) {
      return {
        version: response.data.version,
        edition: response.data.edition,
        features: response.data.features || [],
        connectionStatus: 'connected',
        authenticationMethods: ['basic', 'login', 'argument'],
      };
    }

    throw this._createAPIError('SERVER_INFO_FAILED', 'Failed to retrieve server information');
  }

  /**
   * Test connection to JasperReports Server
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.getServerInfo();
      return true;
    } catch (error) {
      if (this.config.debugMode) {
        console.error('[API Client] Connection test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Clear authentication state and session data
   */
  clearAuthentication() {
    this.isAuthenticated = false;
    this.authHeaders = {};
    this.sessionCookies.clear();
    this.sessionExpiry = null;

    if (this.config.debugMode) {
      console.log('[API Client] Authentication cleared');
    }
  }

  /**
   * Get current authentication status
   * @returns {object} Authentication status information
   */
  getAuthenticationStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      authType: this.config.authType,
      sessionValid: this.isSessionValid(),
      sessionExpiry: this.sessionExpiry,
      hasSessionCookies: this.sessionCookies.size > 0,
      hasAuthHeaders: Object.keys(this.authHeaders).length > 0,
    };
  }

  /**
   * Estimate data size for memory management
   * @private
   */
  _estimateDataSize(data) {
    if (!data) return 0;

    if (Buffer.isBuffer(data)) {
      return data.length;
    }

    if (typeof data === 'string') {
      return data.length * 2; // UTF-16 estimate
    }

    if (typeof data === 'object') {
      try {
        return JSON.stringify(data).length * 2;
      } catch {
        return 1024; // Default estimate for non-serializable objects
      }
    }

    return 8; // Primitive types
  }

  /**
   * Get resilience statistics
   * @returns {object} Resilience statistics
   */
  getResilienceStatistics() {
    return this.resilienceManager.getStatistics();
  }

  /**
   * Start resilience features
   */
  startResilience() {
    this.resilienceManager.start();
  }

  /**
   * Stop resilience features
   */
  stopResilience() {
    this.resilienceManager.stop();
  }
}

export default APIClient;
export { AUTH_TYPES, HTTP_STATUS };
