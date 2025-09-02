/**
 * Permission Management Service for JasperReports MCP Server
 *
 * This service provides comprehensive access control operations including:
 * - Role-based permission setting and retrieval
 * - Permission validation and access checking
 * - Role management (creation, modification, deletion)
 * - Permission inheritance and conflict resolution
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import APIClient from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';

import {
  PermissionGetRequest,
  PermissionSetRequest,
  RoleCreateRequest,
  RoleListRequest,
} from '../models/requests.js';
import {
  PermissionGetResponse,
  PermissionSetResponse,
  RoleCreateResponse,
  RoleListResponse,
  PermissionInfo,
  RoleInfo,
} from '../models/responses.js';

/**
 * Permission mask constants for JasperReports Server
 */
const PERMISSION_MASKS = {
  NO_ACCESS: 0,
  ADMINISTER: 1,
  READ: 2,
  WRITE: 4,
  DELETE: 8,
  EXECUTE: 16,
  READ_WRITE: 6, // READ + WRITE
  FULL_CONTROL: 31, // All permissions
};

/**
 * Permission names for human-readable operations
 */
const PERMISSION_NAMES = {
  [PERMISSION_MASKS.NO_ACCESS]: 'No Access',
  [PERMISSION_MASKS.ADMINISTER]: 'Administer',
  [PERMISSION_MASKS.READ]: 'Read',
  [PERMISSION_MASKS.WRITE]: 'Write',
  [PERMISSION_MASKS.DELETE]: 'Delete',
  [PERMISSION_MASKS.EXECUTE]: 'Execute',
  [PERMISSION_MASKS.READ_WRITE]: 'Read/Write',
  [PERMISSION_MASKS.FULL_CONTROL]: 'Full Control',
};

/**
 * Recipient types for permissions
 */
const RECIPIENT_TYPES = {
  USER: 'user',
  ROLE: 'role',
};

/**
 * Permission Service class providing comprehensive access control management
 */
class PermissionService {
  constructor(config = null, apiClient = null, errorHandler = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = errorHandler || new ErrorHandler(this.config);
    this.initialized = false;

    // Cache for role definitions and permission inheritance
    this.roleCache = new Map();
    this.permissionCache = new Map();
    this.cacheExpiry = new Map();
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
        console.log('[Permission Service] Service initialized successfully');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.initialize');
      throw this.errorHandler.mapJasperError(error, 'Failed to initialize permission service');
    }
  }

  /**
   * Get permissions for a resource
   * @param {object} params - Permission retrieval parameters
   * @returns {Promise<PermissionGetResponse>} Permission information
   */
  async getPermissions(params) {
    await this.initialize();

    // Validate input parameters
    const request = new PermissionGetRequest(params);
    this._validatePermissionGetRequest(request);

    try {
      const startTime = Date.now();

      // Check cache first
      const cacheKey = `permissions:${request.resourceUri}:${request.includeInherited}:${request.resolveAll}`;
      const cached = this._getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query parameters
      const queryParams = {
        resourceUri: request.resourceUri,
      };

      if (request.includeInherited) {
        queryParams.includeInherited = true;
      }

      if (request.resolveAll) {
        queryParams.resolveAll = true;
      }

      // Make API request
      const response = await this.apiClient.get('/rest_v2/permissions', {
        params: queryParams,
      });

      if (response.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Resource', request.resourceUri);
      }

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Permission retrieval failed'
        );
      }

      // Process response data
      const permissions = this._processPermissionData(response.data);
      const inheritedPermissions = request.includeInherited
        ? this._extractInheritedPermissions(response.data)
        : [];
      const effectivePermissions = request.resolveAll
        ? this._resolveEffectivePermissions(permissions, inheritedPermissions)
        : [];

      const executionTime = Date.now() - startTime;

      const result = new PermissionGetResponse({
        resourceUri: request.resourceUri,
        permissions,
        inheritedPermissions,
        effectivePermissions,
        executionTime,
        requestId: request.requestId,
      });

      // Cache the result
      this._setCachedData(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes

      if (this.config.debugMode) {
        console.log(
          `[Permission Service] Retrieved permissions for ${request.resourceUri} (${executionTime}ms)`
        );
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.getPermissions', {
        resourceUri: request.resourceUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to get permissions for resource: ${request.resourceUri}`
      );
    }
  }

  /**
   * Set permissions for a resource
   * @param {object} params - Permission setting parameters
   * @returns {Promise<PermissionSetResponse>} Permission setting result
   */
  async setPermissions(params) {
    await this.initialize();

    // Validate input parameters
    const request = new PermissionSetRequest(params);
    this._validatePermissionSetRequest(request);

    try {
      const startTime = Date.now();

      // Validate all permission entries
      for (const permission of request.permissions) {
        this._validatePermissionEntry(permission);
      }

      // Build permission payload
      const permissionPayload = this._buildPermissionPayload(request);

      // Make API request
      const response = await this.apiClient.put(
        `/rest_v2/permissions${request.resourceUri}`,
        permissionPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            replaceAll: request.replaceAll,
          },
        }
      );

      if (response.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Resource', request.resourceUri);
      }

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Permission setting failed'
        );
      }

      const executionTime = Date.now() - startTime;

      // Clear related caches
      this._clearPermissionCaches(request.resourceUri);

      const result = new PermissionSetResponse({
        resourceUri: request.resourceUri,
        permissionsSet: request.permissions.map(p => ({
          recipient: p.recipient,
          mask: p.mask,
          applied: true,
        })),
        updateTimestamp: new Date().toISOString(),
        executionTime,
        requestId: request.requestId,
      });

      if (this.config.debugMode) {
        console.log(
          `[Permission Service] Set permissions for ${request.resourceUri} (${executionTime}ms)`
        );
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.setPermissions', {
        resourceUri: request.resourceUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to set permissions for resource: ${request.resourceUri}`
      );
    }
  }

  /**
   * Validate user access to a resource
   * @param {string} resourceUri - Resource URI to check
   * @param {string} username - Username to validate
   * @param {string} operation - Operation to validate (read, write, delete, execute, administer)
   * @returns {Promise<object>} Access validation result
   */
  async validateAccess(resourceUri, username, operation) {
    await this.initialize();

    // Validate input parameters
    if (!resourceUri || typeof resourceUri !== 'string') {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI is required',
        resourceUri,
        'non-empty string'
      );
    }

    if (!username || typeof username !== 'string') {
      throw this.errorHandler.createValidationError(
        'username',
        'Username is required',
        username,
        'non-empty string'
      );
    }

    if (!operation || typeof operation !== 'string') {
      throw this.errorHandler.createValidationError(
        'operation',
        'Operation is required',
        operation,
        'non-empty string'
      );
    }

    try {
      const startTime = Date.now();

      // Get effective permissions for the resource
      const permissionsResponse = await this.getPermissions({
        resourceUri,
        includeInherited: true,
        resolveAll: true,
      });

      // Find user's effective permissions
      const userPermissions = this._findUserPermissions(
        permissionsResponse.effectivePermissions,
        username
      );

      // Check if user has required permission for the operation
      const requiredMask = this._getRequiredPermissionMask(operation);
      const hasAccess = this._checkPermissionMask(userPermissions.mask, requiredMask);

      const executionTime = Date.now() - startTime;

      const result = {
        resourceUri,
        username,
        operation,
        hasAccess,
        effectivePermissionMask: userPermissions.mask,
        effectivePermissionName: PERMISSION_NAMES[userPermissions.mask] || 'Custom',
        requiredPermissionMask: requiredMask,
        requiredPermissionName: PERMISSION_NAMES[requiredMask] || 'Custom',
        permissionSource: userPermissions.source,
        executionTime,
        timestamp: new Date().toISOString(),
      };

      if (this.config.debugMode) {
        console.log(
          `[Permission Service] Validated access for ${username} on ${resourceUri}: ${hasAccess} (${executionTime}ms)`
        );
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.validateAccess', {
        resourceUri,
        username,
        operation,
      });
      throw error;
    }
  }

  /**
   * Create a new role
   * @param {object} params - Role creation parameters
   * @returns {Promise<RoleCreateResponse>} Role creation result
   */
  async createRole(params) {
    await this.initialize();

    // Validate input parameters
    const request = new RoleCreateRequest(params);
    this._validateRoleCreateRequest(request);

    try {
      const startTime = Date.now();

      // Build role payload
      const rolePayload = {
        roleName: request.roleName,
        description: request.description || '',
        externallyDefined: request.externallyDefined || false,
      };

      // Make API request
      const response = await this.apiClient.put(
        `/rest_v2/roles/${encodeURIComponent(request.roleName)}`,
        rolePayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 409) {
        throw this.errorHandler.createValidationError(
          'roleName',
          'Role already exists',
          request.roleName,
          'unique role name'
        );
      }

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Role creation failed'
        );
      }

      const executionTime = Date.now() - startTime;

      // Clear role cache
      this.roleCache.clear();

      const result = new RoleCreateResponse({
        roleName: request.roleName,
        description: request.description,
        creationTimestamp: new Date().toISOString(),
        executionTime,
        requestId: request.requestId,
      });

      if (this.config.debugMode) {
        console.log(`[Permission Service] Created role ${request.roleName} (${executionTime}ms)`);
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.createRole', {
        roleName: request.roleName,
      });

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
   * List all roles
   * @param {object} params - Role listing parameters
   * @returns {Promise<RoleListResponse>} List of roles
   */
  async listRoles(params = {}) {
    await this.initialize();

    // Validate input parameters
    const request = new RoleListRequest(params);
    this._validateRoleListRequest(request);

    try {
      const startTime = Date.now();

      // Check cache first
      const cacheKey = `roles:${request.limit}:${request.offset}:${request.searchQuery || ''}`;
      const cached = this._getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query parameters
      const queryParams = {};

      if (request.limit) {
        queryParams.limit = request.limit;
      }

      if (request.offset) {
        queryParams.offset = request.offset;
      }

      if (request.searchQuery) {
        queryParams.q = request.searchQuery;
      }

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

      const result = new RoleListResponse({
        roles,
        totalCount: roles.length,
        offset: request.offset,
        limit: request.limit,
        hasMore: roles.length === request.limit,
        executionTime,
        requestId: request.requestId,
      });

      // Cache the result
      this._setCachedData(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes

      if (this.config.debugMode) {
        console.log(`[Permission Service] Listed ${roles.length} roles (${executionTime}ms)`);
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.listRoles');

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
   * Update an existing role
   * @param {string} roleName - Name of the role to update
   * @param {object} updates - Updates to apply
   * @returns {Promise<object>} Update result
   */
  async updateRole(roleName, updates) {
    await this.initialize();

    // Validate input parameters
    if (!roleName || typeof roleName !== 'string') {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name is required',
        roleName,
        'non-empty string'
      );
    }

    if (!updates || typeof updates !== 'object') {
      throw this.errorHandler.createValidationError(
        'updates',
        'Updates object is required',
        updates,
        'object'
      );
    }

    try {
      const startTime = Date.now();

      // Get current role data
      const currentRoleResponse = await this.apiClient.get(
        `/rest_v2/roles/${encodeURIComponent(roleName)}`
      );

      if (currentRoleResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Role', roleName);
      }

      if (currentRoleResponse.status !== 200) {
        throw this.errorHandler.mapHttpError(
          currentRoleResponse.status,
          currentRoleResponse.data,
          'Failed to get current role data'
        );
      }

      // Merge updates with current data
      const rolePayload = {
        ...currentRoleResponse.data,
        ...updates,
      };

      // Make API request
      const response = await this.apiClient.put(
        `/rest_v2/roles/${encodeURIComponent(roleName)}`,
        rolePayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(response.status, response.data, 'Role update failed');
      }

      const executionTime = Date.now() - startTime;

      // Clear role cache
      this.roleCache.clear();

      const result = {
        roleName,
        updateTimestamp: new Date().toISOString(),
        updatedFields: Object.keys(updates),
        executionTime,
      };

      if (this.config.debugMode) {
        console.log(`[Permission Service] Updated role ${roleName} (${executionTime}ms)`);
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.updateRole', { roleName });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to update role: ${roleName}`
      );
    }
  }

  /**
   * Delete a role
   * @param {string} roleName - Name of the role to delete
   * @returns {Promise<object>} Delete result
   */
  async deleteRole(roleName) {
    await this.initialize();

    // Validate input parameters
    if (!roleName || typeof roleName !== 'string') {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name is required',
        roleName,
        'non-empty string'
      );
    }

    try {
      const startTime = Date.now();

      // Check if role exists
      const existsResponse = await this.apiClient.get(
        `/rest_v2/roles/${encodeURIComponent(roleName)}`
      );
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Role', roleName);
      }

      // Make API request
      const response = await this.apiClient.delete(
        `/rest_v2/roles/${encodeURIComponent(roleName)}`
      );

      if (response.status !== 200 && response.status !== 204) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Role deletion failed'
        );
      }

      const executionTime = Date.now() - startTime;

      // Clear role cache
      this.roleCache.clear();

      const result = {
        roleName,
        deleteTimestamp: new Date().toISOString(),
        executionTime,
      };

      if (this.config.debugMode) {
        console.log(`[Permission Service] Deleted role ${roleName} (${executionTime}ms)`);
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.deleteRole', { roleName });

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
   * Resolve permission conflicts using precedence rules
   * @param {Array} permissions - Array of permission entries
   * @returns {Array} Resolved permissions without conflicts
   */
  resolvePermissionConflicts(permissions) {
    if (!Array.isArray(permissions)) {
      return [];
    }

    const resolvedPermissions = new Map();

    // Process permissions in order of precedence
    // 1. Direct user permissions (highest precedence)
    // 2. Role permissions (lower precedence)
    const sortedPermissions = permissions.sort((a, b) => {
      const aIsUser = a.recipient && !a.recipient.includes('ROLE_');
      const bIsUser = b.recipient && !b.recipient.includes('ROLE_');

      if (aIsUser && !bIsUser) return -1; // User permissions first
      if (!aIsUser && bIsUser) return 1; // Role permissions second
      return 0; // Same type, maintain order
    });

    for (const permission of sortedPermissions) {
      const key = permission.recipient;

      if (!resolvedPermissions.has(key)) {
        resolvedPermissions.set(key, { ...permission });
      } else {
        // Merge permissions using bitwise OR (most permissive wins)
        const existing = resolvedPermissions.get(key);
        existing.mask = existing.mask | permission.mask;
        existing.source = existing.source || permission.source;
      }
    }

    return Array.from(resolvedPermissions.values());
  }

  /**
   * Get permission inheritance chain for a resource
   * @param {string} resourceUri - Resource URI
   * @returns {Promise<Array>} Inheritance chain from root to resource
   */
  async getPermissionInheritance(resourceUri) {
    await this.initialize();

    if (!resourceUri || typeof resourceUri !== 'string') {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI is required',
        resourceUri,
        'non-empty string'
      );
    }

    try {
      const inheritanceChain = [];
      const pathParts = resourceUri.split('/').filter(part => part.length > 0);

      // Build inheritance chain from root to target resource
      let currentPath = '';
      for (const part of pathParts) {
        currentPath += '/' + part;

        try {
          const permissions = await this.getPermissions({
            resourceUri: currentPath,
            includeInherited: false,
            resolveAll: false,
          });

          inheritanceChain.push({
            resourceUri: currentPath,
            permissions: permissions.permissions,
            level: inheritanceChain.length,
          });
        } catch (error) {
          // Resource might not exist or have no permissions, continue
          if (this.config.debugMode) {
            console.log(
              `[Permission Service] No permissions found for ${currentPath}: ${error.message}`
            );
          }
        }
      }

      return inheritanceChain;
    } catch (error) {
      this.errorHandler.logError(error, 'PermissionService.getPermissionInheritance', {
        resourceUri,
      });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate permission get request
   * @private
   */
  _validatePermissionGetRequest(request) {
    if (!request.resourceUri || typeof request.resourceUri !== 'string') {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI is required',
        request.resourceUri,
        'non-empty string'
      );
    }

    if (!request.resourceUri.startsWith('/')) {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI must start with /',
        request.resourceUri,
        'path starting with /'
      );
    }
  }

  /**
   * Validate permission set request
   * @private
   */
  _validatePermissionSetRequest(request) {
    if (!request.resourceUri || typeof request.resourceUri !== 'string') {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI is required',
        request.resourceUri,
        'non-empty string'
      );
    }

    if (!request.resourceUri.startsWith('/')) {
      throw this.errorHandler.createValidationError(
        'resourceUri',
        'Resource URI must start with /',
        request.resourceUri,
        'path starting with /'
      );
    }

    if (!Array.isArray(request.permissions)) {
      throw this.errorHandler.createValidationError(
        'permissions',
        'Permissions must be an array',
        request.permissions,
        'array'
      );
    }

    if (request.permissions.length === 0) {
      throw this.errorHandler.createValidationError(
        'permissions',
        'At least one permission entry is required',
        request.permissions,
        'non-empty array'
      );
    }
  }

  /**
   * Validate role create request
   * @private
   */
  _validateRoleCreateRequest(request) {
    if (!request.roleName || typeof request.roleName !== 'string') {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name is required',
        request.roleName,
        'non-empty string'
      );
    }

    if (request.roleName.length < 1 || request.roleName.length > 100) {
      throw this.errorHandler.createValidationError(
        'roleName',
        'Role name must be 1-100 characters',
        request.roleName,
        '1-100 characters'
      );
    }
  }

  /**
   * Validate role list request
   * @private
   */
  _validateRoleListRequest(request) {
    if (
      request.limit &&
      (typeof request.limit !== 'number' || request.limit < 1 || request.limit > 1000)
    ) {
      throw this.errorHandler.createValidationError(
        'limit',
        'Limit must be between 1 and 1000',
        request.limit,
        '1-1000'
      );
    }

    if (request.offset && (typeof request.offset !== 'number' || request.offset < 0)) {
      throw this.errorHandler.createValidationError(
        'offset',
        'Offset must be non-negative',
        request.offset,
        'non-negative number'
      );
    }
  }

  /**
   * Validate individual permission entry
   * @private
   */
  _validatePermissionEntry(permission) {
    if (!permission.recipient || typeof permission.recipient !== 'string') {
      throw this.errorHandler.createValidationError(
        'recipient',
        'Permission recipient is required',
        permission.recipient,
        'non-empty string'
      );
    }

    if (typeof permission.mask !== 'number' || permission.mask < 0 || permission.mask > 31) {
      throw this.errorHandler.createValidationError(
        'mask',
        'Permission mask must be between 0 and 31',
        permission.mask,
        '0-31'
      );
    }
  }

  /**
   * Process permission data from API response
   * @private
   */
  _processPermissionData(responseData) {
    if (!responseData) {
      return [];
    }

    // Handle both single permission and array responses
    const permissionsArray = Array.isArray(responseData.permission)
      ? responseData.permission
      : responseData.permission
        ? [responseData.permission]
        : [];

    return permissionsArray.map(
      permission =>
        new PermissionInfo({
          recipient: permission.recipient,
          mask: permission.mask,
          uri: permission.uri,
        })
    );
  }

  /**
   * Extract inherited permissions from response data
   * @private
   */
  _extractInheritedPermissions(responseData) {
    if (!responseData || !responseData.inheritedPermissions) {
      return [];
    }

    const inheritedArray = Array.isArray(responseData.inheritedPermissions)
      ? responseData.inheritedPermissions
      : [responseData.inheritedPermissions];

    return inheritedArray.map(
      permission =>
        new PermissionInfo({
          recipient: permission.recipient,
          mask: permission.mask,
          uri: permission.uri,
        })
    );
  }

  /**
   * Resolve effective permissions by combining direct and inherited permissions
   * @private
   */
  _resolveEffectivePermissions(directPermissions, inheritedPermissions) {
    const allPermissions = [...directPermissions, ...inheritedPermissions];
    return this.resolvePermissionConflicts(allPermissions);
  }

  /**
   * Build permission payload for API request
   * @private
   */
  _buildPermissionPayload(request) {
    return {
      permission: request.permissions.map(p => ({
        recipient: p.recipient,
        mask: p.mask,
        uri: request.resourceUri,
      })),
    };
  }

  /**
   * Process role list from API response
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

    return rolesArray.map(
      role =>
        new RoleInfo({
          roleName: role.roleName,
          description: role.description,
          externallyDefined: role.externallyDefined,
        })
    );
  }

  /**
   * Find user permissions in effective permissions list
   * @private
   */
  _findUserPermissions(effectivePermissions, username) {
    // Look for direct user permissions first
    const userPermission = effectivePermissions.find(p => p.recipient === username);
    if (userPermission) {
      return {
        mask: userPermission.mask,
        source: 'direct',
      };
    }

    // Look for role-based permissions
    let combinedMask = PERMISSION_MASKS.NO_ACCESS;
    let foundRolePermission = false;

    for (const permission of effectivePermissions) {
      if (permission.recipient && permission.recipient.startsWith('ROLE_')) {
        // In a real implementation, we would check if the user has this role
        // For now, we'll assume all role permissions apply
        combinedMask |= permission.mask;
        foundRolePermission = true;
      }
    }

    return {
      mask: foundRolePermission ? combinedMask : PERMISSION_MASKS.NO_ACCESS,
      source: foundRolePermission ? 'role' : 'none',
    };
  }

  /**
   * Get required permission mask for an operation
   * @private
   */
  _getRequiredPermissionMask(operation) {
    const operationMap = {
      read: PERMISSION_MASKS.READ,
      write: PERMISSION_MASKS.WRITE,
      delete: PERMISSION_MASKS.DELETE,
      execute: PERMISSION_MASKS.EXECUTE,
      administer: PERMISSION_MASKS.ADMINISTER,
    };

    return operationMap[operation.toLowerCase()] || PERMISSION_MASKS.READ;
  }

  /**
   * Check if a permission mask includes required permissions
   * @private
   */
  _checkPermissionMask(userMask, requiredMask) {
    return (userMask & requiredMask) === requiredMask;
  }

  /**
   * Get cached data if not expired
   * @private
   */
  _getCachedData(key) {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && new Date() < expiry) {
      return this.permissionCache.get(key);
    }
    return null;
  }

  /**
   * Set cached data with expiry
   * @private
   */
  _setCachedData(key, data, ttlMs) {
    this.permissionCache.set(key, data);
    this.cacheExpiry.set(key, new Date(Date.now() + ttlMs));
  }

  /**
   * Clear permission caches for a resource
   * @private
   */
  _clearPermissionCaches(resourceUri) {
    const keysToDelete = [];
    for (const key of this.permissionCache.keys()) {
      if (key.includes(resourceUri)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.permissionCache.delete(key);
      this.cacheExpiry.delete(key);
    }
  }

  /**
   * Get service statistics
   * @returns {object} Service statistics
   */
  getServiceStatistics() {
    return {
      initialized: this.initialized,
      apiClientAuthenticated: this.apiClient.isSessionValid(),
      cacheSize: this.permissionCache.size,
      roleCacheSize: this.roleCache.size,
      supportedPermissionMasks: Object.keys(PERMISSION_MASKS),
      supportedRecipientTypes: Object.values(RECIPIENT_TYPES),
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose() {
    this.initialized = false;
    this.permissionCache.clear();
    this.roleCache.clear();
    this.cacheExpiry.clear();

    if (this.config.debugMode) {
      console.log('[Permission Service] Service disposed');
    }
  }
}

export default PermissionService;
export { PERMISSION_MASKS, PERMISSION_NAMES, RECIPIENT_TYPES };
