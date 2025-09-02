/**
 * Permission and Authentication Manager for JasperReports MCP Server
 *
 * This module provides comprehensive permission analysis and authentication error handling
 * for all MCP tools. It analyzes HTTP 401/403 errors, maps permission requirements for
 * each tool, and provides actionable guidance for resolving permission issues.
 */

// Permission manager for JasperReports MCP Server

/**
 * JasperReports Server permission types
 */
const JASPER_PERMISSIONS = {
  // Repository permissions
  READ: 'READ',
  WRITE: 'WRITE',
  DELETE: 'DELETE',
  EXECUTE: 'EXECUTE',

  // Administrative permissions
  ADMINISTER: 'ADMINISTER',

  // Specific operation permissions
  CREATE_FOLDER: 'CREATE_FOLDER',
  CREATE_REPORT: 'CREATE_REPORT',
  CREATE_DATASOURCE: 'CREATE_DATASOURCE',
  CREATE_USER: 'CREATE_USER',
  CREATE_ROLE: 'CREATE_ROLE',

  // Job management permissions
  SCHEDULE_REPORT: 'SCHEDULE_REPORT',
  MANAGE_JOBS: 'MANAGE_JOBS',

  // System permissions
  VIEW_SYSTEM_INFO: 'VIEW_SYSTEM_INFO',
  MANAGE_SYSTEM: 'MANAGE_SYSTEM',
};

/**
 * JasperReports Server roles and their typical permissions
 */
const JASPER_ROLES = {
  ROLE_SUPERUSER: {
    name: 'ROLE_SUPERUSER',
    description: 'Full system administrator with all permissions',
    permissions: Object.values(JASPER_PERMISSIONS),
  },
  ROLE_ADMINISTRATOR: {
    name: 'ROLE_ADMINISTRATOR',
    description: 'System administrator with most permissions',
    permissions: [
      JASPER_PERMISSIONS.READ,
      JASPER_PERMISSIONS.WRITE,
      JASPER_PERMISSIONS.DELETE,
      JASPER_PERMISSIONS.EXECUTE,
      JASPER_PERMISSIONS.ADMINISTER,
      JASPER_PERMISSIONS.CREATE_FOLDER,
      JASPER_PERMISSIONS.CREATE_REPORT,
      JASPER_PERMISSIONS.CREATE_DATASOURCE,
      JASPER_PERMISSIONS.CREATE_USER,
      JASPER_PERMISSIONS.CREATE_ROLE,
      JASPER_PERMISSIONS.SCHEDULE_REPORT,
      JASPER_PERMISSIONS.MANAGE_JOBS,
      JASPER_PERMISSIONS.VIEW_SYSTEM_INFO,
    ],
  },
  ROLE_USER: {
    name: 'ROLE_USER',
    description: 'Standard user with basic permissions',
    permissions: [
      JASPER_PERMISSIONS.READ,
      JASPER_PERMISSIONS.EXECUTE,
      JASPER_PERMISSIONS.VIEW_SYSTEM_INFO,
    ],
  },
  ROLE_REPORT_AUTHOR: {
    name: 'ROLE_REPORT_AUTHOR',
    description: 'Report author with creation and modification permissions',
    permissions: [
      JASPER_PERMISSIONS.READ,
      JASPER_PERMISSIONS.WRITE,
      JASPER_PERMISSIONS.EXECUTE,
      JASPER_PERMISSIONS.CREATE_FOLDER,
      JASPER_PERMISSIONS.CREATE_REPORT,
      JASPER_PERMISSIONS.CREATE_DATASOURCE,
      JASPER_PERMISSIONS.SCHEDULE_REPORT,
    ],
  },
};

/**
 * Tool permission requirements mapping
 */
const TOOL_PERMISSION_REQUIREMENTS = {
  // Authentication tools - no specific permissions required
  jasper_authenticate: {
    permissions: [],
    roles: [],
    description: 'No specific permissions required for authentication',
  },
  jasper_test_connection: {
    permissions: [],
    roles: [],
    description: 'No specific permissions required for connection testing',
  },

  // Resource management tools
  jasper_upload_resource: {
    permissions: [
      JASPER_PERMISSIONS.WRITE,
      JASPER_PERMISSIONS.CREATE_REPORT,
      JASPER_PERMISSIONS.CREATE_FOLDER,
    ],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description:
      'Requires WRITE permission on target folder and CREATE permissions for resource type',
  },
  jasper_list_resources: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the folder being listed',
  },
  jasper_get_resource: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the specific resource',
  },
  jasper_update_resource: {
    permissions: [JASPER_PERMISSIONS.WRITE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description: 'Requires WRITE permission on the resource being updated',
  },
  jasper_delete_resource: {
    permissions: [JASPER_PERMISSIONS.DELETE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description: 'Requires DELETE permission on the resource and its parent folder',
  },

  // Report execution tools
  jasper_run_report_sync: {
    permissions: [JASPER_PERMISSIONS.READ, JASPER_PERMISSIONS.EXECUTE],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ and EXECUTE permissions on the report',
  },
  jasper_run_report_async: {
    permissions: [JASPER_PERMISSIONS.READ, JASPER_PERMISSIONS.EXECUTE],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ and EXECUTE permissions on the report',
  },
  jasper_get_execution_status: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description:
      'Requires READ permission on the execution (user must own the execution or have admin rights)',
  },
  jasper_get_execution_result: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description:
      'Requires READ permission on the execution (user must own the execution or have admin rights)',
  },
  jasper_cancel_execution: {
    permissions: [JASPER_PERMISSIONS.EXECUTE],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires EXECUTE permission (user must own the execution or have admin rights)',
  },

  // Job management tools
  jasper_create_job: {
    permissions: [JASPER_PERMISSIONS.SCHEDULE_REPORT, JASPER_PERMISSIONS.EXECUTE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description: 'Requires SCHEDULE_REPORT permission and EXECUTE permission on the target report',
  },
  jasper_list_jobs: {
    permissions: [JASPER_PERMISSIONS.READ, JASPER_PERMISSIONS.MANAGE_JOBS],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description:
      'Requires MANAGE_JOBS permission to list all jobs, or READ permission to list own jobs',
  },
  jasper_update_job: {
    permissions: [JASPER_PERMISSIONS.MANAGE_JOBS, JASPER_PERMISSIONS.WRITE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description:
      'Requires MANAGE_JOBS and WRITE permissions (user must own the job or have admin rights)',
  },
  jasper_delete_job: {
    permissions: [JASPER_PERMISSIONS.MANAGE_JOBS, JASPER_PERMISSIONS.DELETE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description:
      'Requires MANAGE_JOBS and DELETE permissions (user must own the job or have admin rights)',
  },
  jasper_run_job_now: {
    permissions: [JASPER_PERMISSIONS.MANAGE_JOBS, JASPER_PERMISSIONS.EXECUTE],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name, JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
    description: 'Requires MANAGE_JOBS and EXECUTE permissions on the job and its report',
  },

  // Input control tools
  jasper_get_input_controls: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the report',
  },
  jasper_set_input_control_values: {
    permissions: [JASPER_PERMISSIONS.READ, JASPER_PERMISSIONS.EXECUTE],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ and EXECUTE permissions on the report',
  },
  jasper_validate_input_controls: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the report',
  },

  // Domain management tools
  jasper_list_domains: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on domains folder',
  },
  jasper_get_domain: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the specific domain',
  },
  jasper_get_domain_schema: {
    permissions: [JASPER_PERMISSIONS.READ],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires READ permission on the domain',
  },

  // Permission management tools
  jasper_get_permissions: {
    permissions: [JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires ADMINISTER permission on the resource or system admin rights',
  },
  jasper_set_permissions: {
    permissions: [JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires ADMINISTER permission on the resource or system admin rights',
  },

  // User management tools
  jasper_create_user: {
    permissions: [JASPER_PERMISSIONS.CREATE_USER, JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires CREATE_USER and ADMINISTER permissions (system admin rights)',
  },
  jasper_list_users: {
    permissions: [JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires ADMINISTER permission (system admin rights)',
  },
  jasper_update_user: {
    permissions: [JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires ADMINISTER permission (system admin rights)',
  },
  jasper_create_role: {
    permissions: [JASPER_PERMISSIONS.CREATE_ROLE, JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires CREATE_ROLE and ADMINISTER permissions (system admin rights)',
  },
  jasper_list_roles: {
    permissions: [JASPER_PERMISSIONS.ADMINISTER],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires ADMINISTER permission (system admin rights)',
  },

  // Health monitoring tools
  jasper_health_status: {
    permissions: [JASPER_PERMISSIONS.VIEW_SYSTEM_INFO],
    roles: [
      JASPER_ROLES.ROLE_USER.name,
      JASPER_ROLES.ROLE_REPORT_AUTHOR.name,
      JASPER_ROLES.ROLE_ADMINISTRATOR.name,
    ],
    description: 'Requires VIEW_SYSTEM_INFO permission',
  },
  jasper_deep_health_check: {
    permissions: [JASPER_PERMISSIONS.MANAGE_SYSTEM],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires MANAGE_SYSTEM permission (system admin rights)',
  },
  jasper_performance_metrics: {
    permissions: [JASPER_PERMISSIONS.VIEW_SYSTEM_INFO],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires VIEW_SYSTEM_INFO permission (typically admin only)',
  },
  jasper_component_health: {
    permissions: [JASPER_PERMISSIONS.VIEW_SYSTEM_INFO],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires VIEW_SYSTEM_INFO permission (typically admin only)',
  },
  jasper_resilience_stats: {
    permissions: [JASPER_PERMISSIONS.VIEW_SYSTEM_INFO],
    roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name],
    description: 'Requires VIEW_SYSTEM_INFO permission (typically admin only)',
  },
};

/**
 * Common permission error patterns and their meanings
 */
const PERMISSION_ERROR_PATTERNS = {
  'access.denied': {
    type: 'INSUFFICIENT_PERMISSIONS',
    category: 'authorization',
    description: 'User lacks required permissions for this operation',
  },
  'insufficient.permissions': {
    type: 'INSUFFICIENT_PERMISSIONS',
    category: 'authorization',
    description: 'User permissions are insufficient for the requested operation',
  },
  'role.not.found': {
    type: 'INVALID_ROLE',
    category: 'authorization',
    description: 'User role is not recognized or has been removed',
  },
  'user.not.authorized': {
    type: 'UNAUTHORIZED_USER',
    category: 'authorization',
    description: 'User is not authorized to perform this operation',
  },
  'resource.access.denied': {
    type: 'RESOURCE_ACCESS_DENIED',
    category: 'authorization',
    description: 'User lacks permissions to access the specified resource',
  },
  'authentication.required': {
    type: 'AUTHENTICATION_REQUIRED',
    category: 'authentication',
    description: 'User must authenticate before accessing this resource',
  },
  'session.expired': {
    type: 'SESSION_EXPIRED',
    category: 'authentication',
    description: 'User session has expired and re-authentication is required',
  },
  'invalid.credentials': {
    type: 'INVALID_CREDENTIALS',
    category: 'authentication',
    description: 'Provided credentials are invalid or incorrect',
  },
  'account.locked': {
    type: 'ACCOUNT_LOCKED',
    category: 'authentication',
    description: 'User account has been locked due to security policy',
  },
  'account.disabled': {
    type: 'ACCOUNT_DISABLED',
    category: 'authentication',
    description: 'User account has been disabled by an administrator',
  },
};

/**
 * Permission Manager class for analyzing and handling permission errors
 */
class PermissionManager {
  constructor(config = null) {
    this.config = config;
  }

  /**
   * Analyze HTTP 401/403 error and provide detailed guidance
   * @param {Error} error - HTTP error from JasperReports Server
   * @param {string} toolName - Name of the MCP tool that failed
   * @param {string} operation - Specific operation being performed
   * @param {object} context - Additional context (resourceUri, parameters, etc.)
   * @returns {object} Detailed permission analysis and guidance
   */
  analyzePermissionError(error, toolName, operation = null, context = {}) {
    const statusCode = error.response?.status || error.statusCode;
    const responseData = error.response?.data || error.data || {};

    // Extract error information
    const errorCode = responseData.errorCode || responseData.code;
    const errorMessage = responseData.message || responseData.errorMessage || error.message;

    // Determine error type
    const isAuthenticationError = statusCode === 401;
    const isAuthorizationError = statusCode === 403;

    if (!isAuthenticationError && !isAuthorizationError) {
      return null; // Not a permission-related error
    }

    // Analyze error pattern
    const errorPattern = this._findErrorPattern(errorCode, errorMessage);

    // Get tool requirements
    const toolRequirements = this.getRequiredPermissions(toolName);

    // Generate analysis
    const analysis = {
      errorType: isAuthenticationError ? 'AUTHENTICATION_ERROR' : 'AUTHORIZATION_ERROR',
      statusCode,
      errorCode,
      errorMessage,
      toolName,
      operation,
      context,
      pattern: errorPattern,
      requirements: toolRequirements,
      guidance: this._generateGuidance(
        isAuthenticationError ? 'authentication' : 'authorization',
        toolName,
        errorPattern,
        toolRequirements,
        context
      ),
      timestamp: new Date().toISOString(),
    };

    return analysis;
  }

  /**
   * Get required permissions for a specific MCP tool
   * @param {string} toolName - Name of the MCP tool
   * @returns {object} Permission requirements for the tool
   */
  getRequiredPermissions(toolName) {
    const requirements = TOOL_PERMISSION_REQUIREMENTS[toolName];

    if (!requirements) {
      return {
        permissions: [],
        roles: [],
        description: 'Permission requirements not defined for this tool',
        toolName,
      };
    }

    return {
      ...requirements,
      toolName,
      allPermissions: JASPER_PERMISSIONS,
      availableRoles: Object.keys(JASPER_ROLES),
    };
  }

  /**
   * Suggest specific fixes for permission issues
   * @param {string} toolName - Name of the MCP tool
   * @param {object} error - Error details from analyzePermissionError
   * @param {object} userContext - Current user context (roles, permissions, etc.)
   * @returns {object} Specific suggestions for fixing the permission issue
   */
  suggestPermissionFix(toolName, error, _userContext = {}) {
    const requirements = this.getRequiredPermissions(toolName);
    const isAuthError = error.errorType === 'AUTHENTICATION_ERROR';

    const suggestions = {
      toolName,
      errorType: error.errorType,
      immediate: [],
      administrative: [],
      alternative: [],
      preventive: [],
    };

    if (isAuthError) {
      // Authentication error suggestions
      suggestions.immediate.push(
        'Re-authenticate using the jasper_authenticate tool',
        'Verify your username and password are correct',
        'Check if your session has expired'
      );

      suggestions.administrative.push(
        'Contact your JasperReports administrator if credentials are correct',
        'Verify your account is not locked or disabled',
        'Check if your organization setting is correct (for multi-tenant setups)'
      );

      suggestions.alternative.push(
        'Try using a different authentication method (basic, login, or argument)',
        'Use jasper_test_connection to verify server connectivity'
      );
    } else {
      // Authorization error suggestions
      const missingPermissions = requirements.permissions || [];
      const recommendedRoles = requirements.roles || [];

      suggestions.immediate.push(
        'Verify you have the required permissions for this operation',
        `Required permissions: ${missingPermissions.join(', ') || 'None specified'}`,
        'Check if you have access to the specific resource being accessed'
      );

      suggestions.administrative.push(
        'Contact your JasperReports administrator to request additional permissions',
        `Consider requesting one of these roles: ${recommendedRoles.join(', ')}`,
        'Verify the resource exists and you have access to its parent folder'
      );

      if (error.context?.resourceUri) {
        suggestions.administrative.push(
          `Check permissions on resource: ${error.context.resourceUri}`,
          'Verify the resource path is correct and accessible'
        );
      }

      // Tool-specific suggestions
      const toolSpecificSuggestions = this._getToolSpecificSuggestions(toolName, error);
      suggestions.alternative.push(...toolSpecificSuggestions);
    }

    // Preventive suggestions
    suggestions.preventive.push(
      'Use jasper_health_status to check your current authentication status',
      'Regularly verify your permissions with your administrator',
      'Keep track of permission changes in your organization'
    );

    return suggestions;
  }

  /**
   * Check if a user has sufficient permissions for a tool
   * @param {string} toolName - Name of the MCP tool
   * @param {object} userPermissions - User's current permissions and roles
   * @returns {object} Permission check result
   */
  checkPermissions(toolName, userPermissions = {}) {
    const requirements = this.getRequiredPermissions(toolName);
    const userRoles = userPermissions.roles || [];
    const userPerms = userPermissions.permissions || [];

    // Check if user has any of the required roles
    const hasRequiredRole = requirements.roles.some(role => userRoles.includes(role));

    // Check if user has required permissions
    const hasRequiredPermissions = requirements.permissions.every(perm => userPerms.includes(perm));

    // Check if user is superuser (has all permissions)
    const isSuperuser = userRoles.includes(JASPER_ROLES.ROLE_SUPERUSER.name);

    const hasAccess = isSuperuser || hasRequiredRole || hasRequiredPermissions;

    return {
      toolName,
      hasAccess,
      isSuperuser,
      hasRequiredRole,
      hasRequiredPermissions,
      userRoles,
      userPermissions: userPerms,
      requiredRoles: requirements.roles,
      requiredPermissions: requirements.permissions,
      missingRoles: requirements.roles.filter(role => !userRoles.includes(role)),
      missingPermissions: requirements.permissions.filter(perm => !userPerms.includes(perm)),
      recommendation: hasAccess
        ? 'Access granted'
        : this._getAccessRecommendation(requirements, userPermissions),
    };
  }

  /**
   * Generate enhanced authentication error messages with actionable guidance
   * @param {object} authError - Authentication error details
   * @param {string} authMethod - Authentication method being used
   * @returns {object} Enhanced error message with guidance
   */
  enhanceAuthenticationError(authError, authMethod = 'unknown') {
    const errorCode = authError.errorCode || authError.code;
    const errorMessage = authError.message || authError.errorMessage;

    const pattern = this._findErrorPattern(errorCode, errorMessage);

    const enhancement = {
      originalError: {
        code: errorCode,
        message: errorMessage,
      },
      authMethod,
      pattern,
      enhancedMessage: this._generateEnhancedAuthMessage(pattern, authMethod),
      actionableSteps: this._generateAuthActionSteps(pattern, authMethod),
      troubleshooting: this._generateAuthTroubleshooting(pattern, authMethod),
      timestamp: new Date().toISOString(),
    };

    return enhancement;
  }

  /**
   * Find error pattern in error code or message
   * @private
   */
  _findErrorPattern(errorCode, errorMessage) {
    // Check exact error code match
    if (errorCode && PERMISSION_ERROR_PATTERNS[errorCode]) {
      return PERMISSION_ERROR_PATTERNS[errorCode];
    }

    // Check message patterns
    const message = (errorMessage || '').toLowerCase();
    for (const [pattern, details] of Object.entries(PERMISSION_ERROR_PATTERNS)) {
      if (message.includes(pattern.toLowerCase().replace(/\./g, ' '))) {
        return details;
      }
    }

    // Default pattern based on common keywords
    if (
      message.includes('access') ||
      message.includes('permission') ||
      message.includes('denied')
    ) {
      return PERMISSION_ERROR_PATTERNS['access.denied'];
    }

    if (
      message.includes('authentication') ||
      message.includes('credentials') ||
      message.includes('login')
    ) {
      return PERMISSION_ERROR_PATTERNS['authentication.required'];
    }

    return {
      type: 'UNKNOWN_ERROR',
      category: 'unknown',
      description: 'Unknown permission or authentication error',
    };
  }

  /**
   * Generate guidance based on error type and tool requirements
   * @private
   */
  _generateGuidance(errorType, toolName, errorPattern, requirements, context) {
    const guidance = {
      summary: '',
      steps: [],
      adminActions: [],
      alternatives: [],
    };

    if (errorType === 'authentication') {
      guidance.summary =
        'Authentication is required or has failed. You need to authenticate with JasperReports Server.';
      guidance.steps = [
        'Use the jasper_authenticate tool to authenticate',
        'Verify your username and password are correct',
        'Check if your session has expired and needs renewal',
      ];
      guidance.adminActions = [
        'Verify your account exists and is enabled',
        'Check if your account is locked due to failed login attempts',
        'Confirm your organization setting (for multi-tenant environments)',
      ];
      guidance.alternatives = [
        'Try different authentication methods (basic, login, argument)',
        'Use jasper_test_connection to verify server connectivity',
      ];
    } else {
      guidance.summary = `You lack sufficient permissions to use the ${toolName} tool. ${requirements.description}`;
      guidance.steps = [
        'Verify you are authenticated with the correct user account',
        'Check if you have the required permissions for this operation',
        `Required permissions: ${requirements.permissions.join(', ') || 'None specified'}`,
      ];
      guidance.adminActions = [
        'Request additional permissions from your JasperReports administrator',
        `Consider requesting one of these roles: ${requirements.roles.join(', ')}`,
        'Verify the resource exists and you have access to its parent folder',
      ];

      if (context.resourceUri) {
        guidance.adminActions.push(`Check permissions on resource: ${context.resourceUri}`);
      }
    }

    return guidance;
  }

  /**
   * Get tool-specific suggestions for permission issues
   * @private
   */
  _getToolSpecificSuggestions(toolName, _error) {
    const suggestions = [];

    // Resource management tools
    if (toolName.includes('resource')) {
      suggestions.push(
        'Try listing resources in the parent folder first to verify access',
        'Check if the resource path is correct and follows JasperReports naming conventions'
      );
    }

    // Job management tools
    if (toolName.includes('job')) {
      suggestions.push(
        'Verify you have scheduling permissions in your organization',
        'Check if job management is enabled for your user role',
        'Try listing existing jobs to verify your job management permissions'
      );
    }

    // Report execution tools
    if (toolName.includes('report') && toolName.includes('run')) {
      suggestions.push(
        'Verify the report exists and you have execute permissions',
        'Check if the report has any input controls that require additional permissions',
        'Try getting the report metadata first to verify access'
      );
    }

    // User/role management tools
    if (toolName.includes('user') || toolName.includes('role')) {
      suggestions.push(
        'User and role management typically requires administrator privileges',
        'Contact your system administrator for user management operations',
        'Verify you have the ROLE_ADMINISTRATOR or ROLE_SUPERUSER role'
      );
    }

    return suggestions;
  }

  /**
   * Generate access recommendation based on missing permissions
   * @private
   */
  _getAccessRecommendation(requirements, userPermissions) {
    const missingRoles = requirements.roles.filter(
      role => !(userPermissions.roles || []).includes(role)
    );
    const missingPermissions = requirements.permissions.filter(
      perm => !(userPermissions.permissions || []).includes(perm)
    );

    if (missingRoles.length > 0) {
      return `Request one of these roles: ${missingRoles.join(', ')}`;
    }

    if (missingPermissions.length > 0) {
      return `Request these permissions: ${missingPermissions.join(', ')}`;
    }

    return 'Contact your administrator for access to this tool';
  }

  /**
   * Generate enhanced authentication message
   * @private
   */
  _generateEnhancedAuthMessage(pattern, authMethod) {
    const baseMessage = pattern.description;
    const methodInfo = authMethod !== 'unknown' ? ` (using ${authMethod} authentication)` : '';

    return `${baseMessage}${methodInfo}. Please authenticate using the jasper_authenticate tool before proceeding.`;
  }

  /**
   * Generate actionable authentication steps
   * @private
   */
  _generateAuthActionSteps(pattern, _authMethod) {
    const steps = [
      'Call jasper_authenticate tool with your credentials',
      'Verify your username and password are correct',
    ];

    if (pattern.type === 'SESSION_EXPIRED') {
      steps.unshift('Your session has expired');
      steps.push('Re-authenticate to establish a new session');
    }

    if (pattern.type === 'INVALID_CREDENTIALS') {
      steps.push('Double-check your username and password');
      steps.push('Verify you are connecting to the correct JasperReports Server');
    }

    if (pattern.type === 'ACCOUNT_LOCKED') {
      steps.push('Contact your administrator to unlock your account');
      steps.push('Wait for the lockout period to expire (if applicable)');
    }

    return steps;
  }

  /**
   * Generate authentication troubleshooting steps
   * @private
   */
  _generateAuthTroubleshooting(pattern, authMethod) {
    const troubleshooting = [
      'Use jasper_test_connection to verify server connectivity',
      'Check if the JasperReports Server is accessible',
      'Verify your network connection',
    ];

    if (authMethod === 'basic') {
      troubleshooting.push('Try using login authentication method instead');
    }

    if (authMethod === 'login') {
      troubleshooting.push('Try using basic authentication method instead');
    }

    troubleshooting.push(
      'Check server logs for additional error details',
      'Verify SSL/TLS configuration if using HTTPS'
    );

    return troubleshooting;
  }
}

// Export the PermissionManager class and related constants
export {
  PermissionManager,
  JASPER_PERMISSIONS,
  JASPER_ROLES,
  TOOL_PERMISSION_REQUIREMENTS,
  PERMISSION_ERROR_PATTERNS,
};
