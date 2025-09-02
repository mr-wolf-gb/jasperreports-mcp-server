/**
 * User and Role Management Service for JasperReports MCP Server
 *
 * This service provides comprehensive user administration and role management operations including:
 * - User creation, modification, and deactivation operations
 * - Role definition and assignment functionality
 * - User profile management and credential validation
 * - User listing with filtering and search capabilities
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import APIClient from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { getErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  UserCreateRequest,
  UserListRequest,
  UserUpdateRequest,
  RoleCreateRequest,
  RoleListRequest,
} from '../models/requests.js';
import {
  UserCreateResponse,
  UserListResponse,
  UserUpdateResponse,
  RoleCreateResponse,
  RoleListResponse,
  UserInfo,
  RoleInfo,
} from '../models/responses.js';

/**
 * User states supported by JasperReports Server
 */
const USER_STATES = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
};

/**
 * Role types supported by JasperReports Server
 */
const ROLE_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};

/**
 * Permission masks for user operations
 */
const PERMISSION_MASKS = {
  READ: 1,
  WRITE: 2,
  DELETE: 4,
  EXECUTE: 8,
  ADMIN: 16,
};

/**
 * User Service class providing comprehensive user and role management
 */
class UserService {
  constructor(config = null, apiClient = null, errorHandler = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = errorHandler || getErrorHandler();
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure API client is authenticated
      if (!this.apiClient.isSessionValid()) {
        await this.apiClient.authenticate();
      }

      this.initialized = true;

      if (this.config.debugMode) {
        console.log('[User Service] Service initialized successfully');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.initialize');
      throw this.errorHandler.mapJasperError(error, 'Failed to initialize user service');
    }
  }

  /**
   * Create a new user in JasperReports Server
   * @param {object} params - User creation parameters
   * @returns {Promise<UserCreateResponse>} User creation result
   */
  async createUser(params) {
    await this.initialize();

    // Validate input parameters
    const request = new UserCreateRequest(params);
    Validator.validateUserCreate(request);

    try {
      const startTime = Date.now();

      // Build user descriptor
      const userDescriptor = this._buildUserDescriptor(request);

      // Create the user
      const response = await this.apiClient.put(
        `/rest_v2/users/${request.username}`,
        userDescriptor,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'User creation failed'
        );
      }

      // Assign roles if provided
      if (request.roles && request.roles.length > 0) {
        await this._assignRolesToUser(request.username, request.roles);
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[User Service] User created successfully: ${request.username} (${executionTime}ms)`
        );
      }

      return new UserCreateResponse({
        username: request.username,
        fullName: request.fullName,
        enabled: request.enabled,
        roles: request.roles || [],
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.createUser', { username: request.username });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to create user: ${request.username}`
      );
    }
  }

  /**
   * List users with filtering and pagination
   * @param {object} params - List parameters
   * @returns {Promise<UserListResponse>} List of users
   */
  async listUsers(params = {}) {
    await this.initialize();

    // Validate input parameters
    const request = new UserListRequest(params);
    Validator.validateUserList(request);

    try {
      const startTime = Date.now();

      // Build query parameters
      const queryParams = this._buildUserListQueryParams(request);

      // Make API request
      const response = await this.apiClient.get('/rest_v2/users', {
        params: queryParams,
      });

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(response.status, response.data, 'User listing failed');
      }

      // Process response data
      const users = await this._processUserList(response.data, request.includeRoles);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] Listed ${users.length} users (${executionTime}ms)`);
      }

      return new UserListResponse({
        users,
        totalCount: users.length,
        offset: request.offset,
        limit: request.limit,
        hasMore: users.length === request.limit,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.listUsers');

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        'Failed to list users'
      );
    }
  }

  /**
   * Get a specific user with details
   * @param {string} username - Username to retrieve
   * @param {boolean} includeRoles - Include user roles in response
   * @returns {Promise<UserInfo>} User details
   */
  async getUser(username, includeRoles = true) {
    await this.initialize();

    if (!username || typeof username !== 'string') {
      throw this.errorHandler.createValidationError(
        'username',
        'Username is required and must be a string'
      );
    }

    try {
      const startTime = Date.now();

      // Get user details
      const userResponse = await this.apiClient.get(`/rest_v2/users/${username}`);

      if (userResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('User', username);
      }

      if (userResponse.status !== 200) {
        throw this.errorHandler.mapHttpError(
          userResponse.status,
          userResponse.data,
          'User retrieval failed'
        );
      }

      let roles = [];
      if (includeRoles) {
        try {
          const rolesResponse = await this.apiClient.get(`/rest_v2/users/${username}/roles`);
          if (rolesResponse.status === 200) {
            roles = this._processRoleList(rolesResponse.data);
          }
        } catch (roleError) {
          // Role retrieval is optional, log but don't fail
          if (this.config.debugMode) {
            console.log(
              `[User Service] Could not retrieve roles for ${username}: ${roleError.message}`
            );
          }
        }
      }

      const user = this._processUserData(userResponse.data, roles);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] Retrieved user: ${username} (${executionTime}ms)`);
      }

      return user;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.getUser', { username });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to get user: ${username}`
      );
    }
  }

  /**
   * Update an existing user
   * @param {object} params - Update parameters
   * @returns {Promise<UserUpdateResponse>} Update result
   */
  async updateUser(params) {
    await this.initialize();

    // Validate input parameters
    const request = new UserUpdateRequest(params);
    Validator.validateUserUpdate(request);

    try {
      const startTime = Date.now();

      // Check if user exists
      const existsResponse = await this.apiClient.get(`/rest_v2/users/${request.username}`);
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('User', request.username);
      }

      // Build update payload
      const updatePayload = this._buildUserUpdatePayload(request);

      // Perform update
      const response = await this.apiClient.post(
        `/rest_v2/users/${request.username}`,
        updatePayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(response.status, response.data, 'User update failed');
      }

      // Update roles if provided
      let finalRoles = [];
      if (request.roles !== undefined) {
        await this._updateUserRoles(request.username, request.roles);
        finalRoles = request.roles;
      } else {
        // Get current roles if not updating them
        try {
          const rolesResponse = await this.apiClient.get(
            `/rest_v2/users/${request.username}/roles`
          );
          if (rolesResponse.status === 200) {
            finalRoles = this._processRoleList(rolesResponse.data).map(role => role.roleName);
          }
        } catch {
          // Ignore role retrieval errors
        }
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[User Service] User updated successfully: ${request.username} (${executionTime}ms)`
        );
      }

      return new UserUpdateResponse({
        username: request.username,
        roles: finalRoles,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.updateUser', { username: request.username });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to update user: ${request.username}`
      );
    }
  }

  /**
   * Deactivate (disable) a user
   * @param {string} username - Username to deactivate
   * @returns {Promise<UserUpdateResponse>} Deactivation result
   */
  async deactivateUser(username) {
    return this.updateUser({
      username,
      enabled: false,
    });
  }

  /**
   * Reactivate (enable) a user
   * @param {string} username - Username to reactivate
   * @returns {Promise<UserUpdateResponse>} Reactivation result
   */
  async reactivateUser(username) {
    return this.updateUser({
      username,
      enabled: true,
    });
  }

  /**
   * Delete a user from JasperReports Server
   * @param {string} username - Username to delete
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteUser(username) {
    await this.initialize();

    if (!username || typeof username !== 'string') {
      throw this.errorHandler.createValidationError(
        'username',
        'Username is required and must be a string'
      );
    }

    try {
      const startTime = Date.now();

      // Check if user exists
      const existsResponse = await this.apiClient.get(`/rest_v2/users/${username}`);
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('User', username);
      }

      // Perform deletion
      const response = await this.apiClient.delete(`/rest_v2/users/${username}`);

      if (response.status !== 200 && response.status !== 204) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'User deletion failed'
        );
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] User deleted successfully: ${username} (${executionTime}ms)`);
      }

      return true;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.deleteUser', { username });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to delete user: ${username}`
      );
    }
  }

  /**
   * Validate user credentials
   * @param {string} username - Username to validate
   * @param {string} password - Password to validate
   * @returns {Promise<object>} Validation result
   */
  async validateCredentials(username, password) {
    await this.initialize();

    if (!username || !password) {
      throw this.errorHandler.createValidationError(
        'credentials',
        'Username and password are required'
      );
    }

    try {
      const startTime = Date.now();

      // Create temporary API client for validation
      const tempConfig = {
        ...this.config,
        username,
        password,
      };

      const tempClient = new APIClient(tempConfig);

      try {
        await tempClient.authenticate();
        const serverInfo = await tempClient.getServerInfo();

        const executionTime = Date.now() - startTime;

        return {
          valid: true,
          username,
          serverInfo,
          executionTime,
          message: 'Credentials are valid',
        };
      } catch (authError) {
        const executionTime = Date.now() - startTime;

        return {
          valid: false,
          username,
          executionTime,
          error: authError.message,
          message: 'Credential validation failed',
        };
      } finally {
        tempClient.clearAuthentication();
      }
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.validateCredentials', { username });
      throw this.errorHandler.mapJasperError(error, 'Failed to validate credentials');
    }
  }

  /**
   * Create a new role in JasperReports Server
   * @param {object} params - Role creation parameters
   * @returns {Promise<RoleCreateResponse>} Role creation result
   */
  async createRole(params) {
    await this.initialize();

    // Validate input parameters
    const request = new RoleCreateRequest(params);
    Validator.validateRoleCreate(request);

    try {
      const startTime = Date.now();

      // Build role descriptor
      const roleDescriptor = {
        roleName: request.roleName,
        description: request.description || '',
        externallyDefined: request.externallyDefined || false,
      };

      // Create the role
      const response = await this.apiClient.put(
        `/rest_v2/roles/${request.roleName}`,
        roleDescriptor,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Role creation failed'
        );
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[User Service] Role created successfully: ${request.roleName} (${executionTime}ms)`
        );
      }

      return new RoleCreateResponse({
        roleName: request.roleName,
        description: request.description || '',
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.createRole', { roleName: request.roleName });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to create role: ${request.roleName}`
      );
    }
  }

  /**
   * List roles with filtering and pagination
   * @param {object} params - List parameters
   * @returns {Promise<RoleListResponse>} List of roles
   */
  async listRoles(params = {}) {
    await this.initialize();

    // Validate input parameters
    const request = new RoleListRequest(params);
    Validator.validateRoleList(request);

    try {
      const startTime = Date.now();

      // Build query parameters
      const queryParams = this._buildRoleListQueryParams(request);

      // Make API request
      const response = await this.apiClient.get('/rest_v2/roles', {
        params: queryParams,
      });

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(response.status, response.data, 'Role listing failed');
      }

      // Process response data
      const roles = this._processRoleList(response.data);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] Listed ${roles.length} roles (${executionTime}ms)`);
      }

      return new RoleListResponse({
        roles,
        totalCount: roles.length,
        offset: request.offset,
        limit: request.limit,
        hasMore: roles.length === request.limit,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.listRoles');

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        'Failed to list roles'
      );
    }
  }

  /**
   * Get a specific role with details
   * @param {string} roleName - Role name to retrieve
   * @returns {Promise<RoleInfo>} Role details
   */
  async getRole(roleName) {
    await this.initialize();

    if (!roleName || typeof roleName !== 'string') {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name is required and must be a string'
      );
    }

    try {
      const startTime = Date.now();

      // Get role details
      const response = await this.apiClient.get(`/rest_v2/roles/${roleName}`);

      if (response.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Role', roleName);
      }

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Role retrieval failed'
        );
      }

      const role = this._processRoleData(response.data);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] Retrieved role: ${roleName} (${executionTime}ms)`);
      }

      return role;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.getRole', { roleName });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to get role: ${roleName}`
      );
    }
  }

  /**
   * Delete a role from JasperReports Server
   * @param {string} roleName - Role name to delete
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteRole(roleName) {
    await this.initialize();

    if (!roleName || typeof roleName !== 'string') {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name is required and must be a string'
      );
    }

    try {
      const startTime = Date.now();

      // Check if role exists
      const existsResponse = await this.apiClient.get(`/rest_v2/roles/${roleName}`);
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Role', roleName);
      }

      // Perform deletion
      const response = await this.apiClient.delete(`/rest_v2/roles/${roleName}`);

      if (response.status !== 200 && response.status !== 204) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Role deletion failed'
        );
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(`[User Service] Role deleted successfully: ${roleName} (${executionTime}ms)`);
      }

      return true;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.deleteRole', { roleName });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to delete role: ${roleName}`
      );
    }
  }

  /**
   * Assign roles to a user
   * @param {string} username - Username to assign roles to
   * @param {string[]} roles - Array of role names to assign
   * @returns {Promise<boolean>} Assignment success
   */
  async assignRolesToUser(username, roles) {
    return this._assignRolesToUser(username, roles);
  }

  /**
   * Remove roles from a user
   * @param {string} username - Username to remove roles from
   * @param {string[]} roles - Array of role names to remove
   * @returns {Promise<boolean>} Removal success
   */
  async removeRolesFromUser(username, roles) {
    await this.initialize();

    if (!username || !Array.isArray(roles) || roles.length === 0) {
      throw this.errorHandler.createValidationError(
        'parameters',
        'Username and roles array are required'
      );
    }

    try {
      const startTime = Date.now();

      // Get current user roles
      const currentRolesResponse = await this.apiClient.get(`/rest_v2/users/${username}/roles`);
      if (currentRolesResponse.status !== 200) {
        throw this.errorHandler.mapHttpError(
          currentRolesResponse.status,
          currentRolesResponse.data,
          'Failed to get current user roles'
        );
      }

      const currentRoles = this._processRoleList(currentRolesResponse.data).map(
        role => role.roleName
      );
      const newRoles = currentRoles.filter(role => !roles.includes(role));

      // Update user roles
      await this._updateUserRoles(username, newRoles);

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[User Service] Removed roles from user ${username}: ${roles.join(', ')} (${executionTime}ms)`
        );
      }

      return true;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService.removeRolesFromUser', { username, roles });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapJasperError(
        error,
        `Failed to remove roles from user: ${username}`
      );
    }
  }

  /**
   * Build user descriptor for creation
   * @private
   */
  _buildUserDescriptor(request) {
    return {
      username: request.username,
      password: request.password,
      fullName: request.fullName,
      emailAddress: request.emailAddress || '',
      enabled: request.enabled !== false,
      externallyDefined: request.externallyDefined || false,
    };
  }

  /**
   * Build user update payload
   * @private
   */
  _buildUserUpdatePayload(request) {
    const payload = {};

    if (request.fullName !== undefined) {
      payload.fullName = request.fullName;
    }

    if (request.emailAddress !== undefined) {
      payload.emailAddress = request.emailAddress;
    }

    if (request.enabled !== undefined) {
      payload.enabled = request.enabled;
    }

    return payload;
  }

  /**
   * Build query parameters for user listing
   * @private
   */
  _buildUserListQueryParams(request) {
    const params = {};

    if (request.limit) {
      params.limit = request.limit;
    }

    if (request.offset) {
      params.offset = request.offset;
    }

    if (request.searchQuery) {
      params.q = request.searchQuery;
    }

    return params;
  }

  /**
   * Build query parameters for role listing
   * @private
   */
  _buildRoleListQueryParams(request) {
    const params = {};

    if (request.limit) {
      params.limit = request.limit;
    }

    if (request.offset) {
      params.offset = request.offset;
    }

    if (request.searchQuery) {
      params.q = request.searchQuery;
    }

    return params;
  }

  /**
   * Process user list response data
   * @private
   */
  async _processUserList(responseData, includeRoles = false) {
    if (!responseData) {
      return [];
    }

    // Handle both single user and array responses
    const usersArray = Array.isArray(responseData.user)
      ? responseData.user
      : responseData.user
        ? [responseData.user]
        : [];

    const users = [];
    for (const userData of usersArray) {
      let roles = [];
      if (includeRoles) {
        try {
          const rolesResponse = await this.apiClient.get(
            `/rest_v2/users/${userData.username}/roles`
          );
          if (rolesResponse.status === 200) {
            roles = this._processRoleList(rolesResponse.data);
          }
        } catch {
          // Ignore role retrieval errors for individual users
        }
      }

      users.push(this._processUserData(userData, roles));
    }

    return users;
  }

  /**
   * Process user data response
   * @private
   */
  _processUserData(userData, roles = []) {
    if (!userData) {
      return {};
    }

    return new UserInfo({
      username: userData.username,
      fullName: userData.fullName,
      emailAddress: userData.emailAddress,
      enabled: userData.enabled,
      externallyDefined: userData.externallyDefined,
      previousPasswordChangeTime: userData.previousPasswordChangeTime,
      roles: roles.map(role => role.roleName || role),
    });
  }

  /**
   * Process role list response data
   * @private
   */
  _processRoleList(responseData) {
    if (!responseData) {
      return [];
    }

    // Handle both single role and array responses
    const rolesArray = Array.isArray(responseData.role)
      ? responseData.role
      : responseData.role
        ? [responseData.role]
        : [];

    return rolesArray.map(roleData => this._processRoleData(roleData));
  }

  /**
   * Process role data response
   * @private
   */
  _processRoleData(roleData) {
    if (!roleData) {
      return {};
    }

    return new RoleInfo({
      roleName: roleData.roleName,
      description: roleData.description,
      externallyDefined: roleData.externallyDefined,
    });
  }

  /**
   * Assign roles to a user (internal method)
   * @private
   */
  async _assignRolesToUser(username, roles) {
    if (!username || !Array.isArray(roles) || roles.length === 0) {
      return true; // No roles to assign
    }

    try {
      const startTime = Date.now();

      // Get current user roles
      let currentRoles = [];
      try {
        const currentRolesResponse = await this.apiClient.get(`/rest_v2/users/${username}/roles`);
        if (currentRolesResponse.status === 200) {
          currentRoles = this._processRoleList(currentRolesResponse.data).map(
            role => role.roleName
          );
        }
      } catch {
        // If we can't get current roles, assume empty
      }

      // Merge with new roles (avoid duplicates)
      const allRoles = [...new Set([...currentRoles, ...roles])];

      // Update user roles
      await this._updateUserRoles(username, allRoles);

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[User Service] Assigned roles to user ${username}: ${roles.join(', ')} (${executionTime}ms)`
        );
      }

      return true;
    } catch (error) {
      this.errorHandler.logError(error, 'UserService._assignRolesToUser', { username, roles });
      throw this.errorHandler.mapJasperError(error, `Failed to assign roles to user: ${username}`);
    }
  }

  /**
   * Update user roles (internal method)
   * @private
   */
  async _updateUserRoles(username, roles) {
    const roleDescriptors = roles.map(roleName => ({ roleName }));

    const response = await this.apiClient.put(
      `/rest_v2/users/${username}/roles`,
      { role: roleDescriptors },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      throw this.errorHandler.mapHttpError(
        response.status,
        response.data,
        'Role assignment failed'
      );
    }

    return true;
  }

  /**
   * Get user service statistics
   * @returns {object} Service statistics
   */
  getServiceStatistics() {
    return {
      initialized: this.initialized,
      apiClientAuthenticated: this.apiClient.isSessionValid(),
      supportedUserStates: Object.values(USER_STATES),
      supportedRoleTypes: Object.values(ROLE_TYPES),
      permissionMasks: PERMISSION_MASKS,
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose() {
    this.initialized = false;

    if (this.config.debugMode) {
      console.log('[User Service] Service disposed');
    }
  }
}

export default UserService;
export { USER_STATES, ROLE_TYPES, PERMISSION_MASKS };
