/**
 * MCP Tool Definitions and Registry for JasperReports MCP Server
 *
 * This module defines all MCP tools available in the JasperReports MCP Server,
 * including their parameter schemas, validation, routing to service methods,
 * response formatting, and error handling.
 *
 * Features:
 * - Comprehensive tool parameter schemas and validation
 * - Tool routing to appropriate service methods
 * - Response formatting and error handling
 * - Tool categorization and documentation
 * - Support for all JasperReports operations
 */

import AuthService from '../services/authService.js';
import ResourceService from '../services/resourceService.js';
import ReportService from '../services/reportService.js';
import ExecutionService from '../services/executionService.js';
import InputControlService from '../services/inputControlService.js';
import JobService from '../services/jobService.js';
import DomainService from '../services/domainService.js';
import PermissionService from '../services/permissionService.js';
import UserService from '../services/userService.js';
import HealthService from '../services/healthService.js';
import TemplateService from '../services/templateService.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';

import { ValidationManager } from '../utils/ValidationManager.js';
import { PermissionManager } from '../utils/permissionManager.js';
import { ResponseFormatter, generateCorrelationId } from '../utils/responseFormatter.js';

/**
 * Tool categories for organization
 */
const TOOL_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  RESOURCE_MANAGEMENT: 'resource_management',
  REPORT_EXECUTION: 'report_execution',
  JOB_MANAGEMENT: 'job_management',
  INPUT_CONTROLS: 'input_controls',
  DOMAIN_MANAGEMENT: 'domain_management',
  PERMISSION_MANAGEMENT: 'permission_management',
  USER_MANAGEMENT: 'user_management',
  HEALTH_MONITORING: 'health_monitoring',
  TEMPLATE_AND_STRUCTURE: 'template_and_structure',
};

/**
 * MCP Tool Registry class
 */
class MCPToolRegistry {
  constructor(config = null) {
    this.config = config || getConfiguration();
    this.errorHandler = new ErrorHandler(this.config);
    this.responseFormatter = new ResponseFormatter(this.config);
    this.permissionManager = new PermissionManager(this.config);

    // Service instances - initialize lazily to avoid config issues
    this.services = {};

    // Tool definitions
    this.tools = this._initializeToolDefinitions();

    if (this.config.debugMode) {
      console.log(
        `[MCP Tools] Initialized ${Object.keys(this.tools).length} tools across ${Object.keys(TOOL_CATEGORIES).length} categories`
      );
    }
  }

  /**
   * Get all available tools
   * @returns {object} All tool definitions
   */
  getAllTools() {
    return this.tools;
  }

  /**
   * Get tool definition by name
   * @param {string} toolName - Name of the tool
   * @returns {object|null} Tool definition or null if not found
   */
  getTool(toolName) {
    return this.tools[toolName] || null;
  }

  /**
   * Get tools by category
   * @param {string} category - Tool category
   * @returns {object} Tools in the specified category
   */
  getToolsByCategory(category) {
    const categoryTools = {};
    for (const [name, tool] of Object.entries(this.tools)) {
      if (tool.category === category) {
        categoryTools[name] = tool;
      }
    }
    return categoryTools;
  }

  /**
   * Check if a tool exists
   * @param {string} toolName - Name of the tool
   * @returns {boolean} True if tool exists
   */
  hasTool(toolName) {
    return Object.prototype.hasOwnProperty.call(this.tools, toolName);
  }

  /**
   * Get tool list for MCP protocol
   * @returns {Array} Array of tool definitions for MCP
   */
  getToolList() {
    return Object.values(this.tools);
  }

  /**
   * Get total number of tools
   * @returns {number} Number of tools
   */
  getToolCount() {
    return Object.keys(this.tools).length;
  }

  /**
   * Get service instance (lazy initialization)
   * @private
   */
  _getService(serviceName) {
    if (!this.services[serviceName]) {
      switch (serviceName) {
        case 'auth':
          this.services[serviceName] = new AuthService(this.config);
          break;
        case 'resource':
          this.services[serviceName] = new ResourceService(this.config);
          break;
        case 'report':
          this.services[serviceName] = new ReportService(this.config);
          break;
        case 'execution':
          this.services[serviceName] = new ExecutionService(this.config);
          break;
        case 'inputControl':
          this.services[serviceName] = new InputControlService(this.config);
          break;
        case 'job':
          this.services[serviceName] = new JobService(this.config);
          break;
        case 'domain':
          this.services[serviceName] = new DomainService(this.config);
          break;
        case 'permission':
          this.services[serviceName] = new PermissionService(this.config);
          break;
        case 'user':
          this.services[serviceName] = new UserService(this.config);
          break;
        case 'health':
          this.services[serviceName] = new HealthService(this.config);
          break;
        case 'template':
          this.services[serviceName] = new TemplateService(this.config);
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
    }
    return this.services[serviceName];
  }

  /**
   * Execute a tool with enhanced validation, error handling, and response formatting
   * @param {string} toolName - Name of the tool to execute
   * @param {object} params - Tool parameters
   * @returns {object} Standardized tool response
   */
  async executeTool(toolName, params = {}) {
    const correlationId = generateCorrelationId();
    const timer = this.responseFormatter.createExecutionTimer();

    // Get tool definition
    const tool = this.tools[toolName];
    if (!tool) {
      const executionTime = timer.stop();
      const error = new Error(`Tool '${toolName}' not found`);
      error.type = 'MethodNotFound';
      return this.responseFormatter.formatError(toolName, error, executionTime, correlationId);
    }

    try {
      // Create error context for comprehensive tracking
      const errorContext = this.errorHandler.createErrorContext(toolName, 'execute', params);

      // Enhanced validation using ValidationManager
      try {
        ValidationManager.validateToolRequest(params, tool.inputSchema, toolName);
      } catch (validationError) {
        // Log validation error with context
        this.errorHandler.logErrorWithContext(validationError, errorContext);

        const executionTime = timer.stop();
        return this.responseFormatter.formatError(
          toolName,
          validationError,
          executionTime,
          correlationId
        );
      }

      // Execute tool handler with error context
      let result;
      try {
        result = await tool.handler(params);
      } catch (error) {
        // Analyze permission errors using PermissionManager
        const enhancedError = this.errorHandler.analyzePermissionError(error, toolName, 'execute', {
          resourceUri: params.resourceUri,
          ...params,
        });

        // Add error to context based on error type
        if (error.response && error.response.status) {
          errorContext.addHttpError(
            error.response.status,
            error.response.data,
            error.config?.url,
            error.config?.method,
            error.config?.headers
          );
        } else {
          errorContext.addSystemError(error, 'execution', { toolName, operation: 'execute' });
        }

        // Log error with context
        this.errorHandler.logErrorWithContext(enhancedError, errorContext);

        timer.stop();
        return this.errorHandler.createStructuredErrorResponse(
          enhancedError,
          errorContext,
          this.config.debugMode
        );
      }

      // Format successful response
      const executionTime = timer.stop();

      // Determine response format based on tool category and result type
      const formatOptions = this._getResponseFormatOptions(toolName, result);

      if (formatOptions.enhanceOnly) {
        return this.responseFormatter.enhanceResponse(
          result,
          toolName,
          executionTime,
          correlationId
        );
      } else if (formatOptions.formatAsCollection) {
        const { items, ...paginationInfo } = result;
        return this.responseFormatter.formatCollection(
          toolName,
          items,
          paginationInfo,
          executionTime,
          correlationId
        );
      } else if (formatOptions.formatAsBinary) {
        const { content, ...contentInfo } = result;
        return this.responseFormatter.formatBinaryContent(
          toolName,
          content,
          contentInfo,
          executionTime,
          correlationId
        );
      } else if (formatOptions.formatAsHealthCheck) {
        const { healthy, components } = result;
        return this.responseFormatter.formatHealthCheck(
          toolName,
          healthy,
          components,
          executionTime,
          correlationId
        );
      } else {
        return this.responseFormatter.formatSuccess(toolName, result, executionTime, correlationId);
      }
    } catch (error) {
      // Handle unexpected errors
      const mappedError = this.errorHandler.mapToMCPError(error, `${toolName}:execute`);
      this.errorHandler.logError(mappedError, `${toolName}:execute`);

      const executionTime = timer.stop();
      return this.responseFormatter.formatError(
        toolName,
        mappedError,
        executionTime,
        correlationId
      );
    }
  }

  /**
   * Get response format options based on tool name and result
   * @private
   */
  _getResponseFormatOptions(toolName, result) {
    // Collection responses
    if (toolName.includes('list_') || (result && result.items && Array.isArray(result.items))) {
      return { formatAsCollection: true };
    }

    // Binary content responses
    if (toolName.includes('run_report_sync') || toolName.includes('get_execution_result')) {
      if (result && result.content) {
        return { formatAsBinary: true };
      }
    }

    // Health check responses
    if (toolName.includes('health') || toolName.includes('component_health')) {
      return { formatAsHealthCheck: true };
    }

    // Default to standard success formatting
    return { enhanceOnly: false };
  }

  /**
   * Initialize all tool definitions
   * @private
   */
  _initializeToolDefinitions() {
    return {
      // Authentication Tools
      ...this._getAuthenticationTools(),

      // Resource Management Tools
      ...this._getResourceManagementTools(),

      // Report Execution Tools
      ...this._getReportExecutionTools(),

      // Job Management Tools
      ...this._getJobManagementTools(),

      // Input Control Tools
      ...this._getInputControlTools(),

      // Domain Management Tools
      ...this._getDomainManagementTools(),

      // Permission Management Tools
      ...this._getPermissionManagementTools(),

      // User Management Tools
      ...this._getUserManagementTools(),

      // Health Monitoring Tools
      ...this._getHealthMonitoringTools(),

      // Template and Structure Tools
      ...this._getTemplateAndStructureTools(),
    };
  }

  /**
   * Get authentication tools
   * @private
   */
  _getAuthenticationTools() {
    return {
      jasper_authenticate: {
        name: 'jasper_authenticate',
        description: 'Authenticate with JasperReports Server using configured credentials',
        category: TOOL_CATEGORIES.AUTHENTICATION,
        inputSchema: {
          type: 'object',
          properties: {
            authType: {
              type: 'string',
              enum: ['basic', 'login', 'argument'],
              description: 'Authentication method to use',
            },
            username: {
              type: 'string',
              description: 'Username for authentication (overrides config)',
            },
            password: {
              type: 'string',
              description: 'Password for authentication (overrides config)',
            },
            organization: {
              type: 'string',
              description: 'Organization for multi-tenant authentication',
            },
            forceReauth: {
              type: 'boolean',
              description: 'Force re-authentication even if already authenticated',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const authService = this._getService('auth');

          // Override config if parameters provided
          if (params.username || params.password || params.organization || params.authType) {
            const tempConfig = {
              ...this.config,
              ...(params.authType && { authType: params.authType }),
              ...(params.username && { username: params.username }),
              ...(params.password && { password: params.password }),
              ...(params.organization && { organization: params.organization }),
            };
            authService.config = tempConfig;
          }

          const result = await authService.authenticate(params.forceReauth);

          return {
            success: result.success,
            authenticated: result.success,
            authMethod: result.authType,
            sessionValid: result.sessionValid,
            sessionExpiry: result.sessionExpiry,
            serverInfo: result.serverInfo,
            message: result.message,
          };
        },
      },

      jasper_test_connection: {
        name: 'jasper_test_connection',
        description: 'Test connection to JasperReports Server and retrieve server information',
        category: TOOL_CATEGORIES.AUTHENTICATION,
        inputSchema: {
          type: 'object',
          properties: {
            includeAuth: {
              type: 'boolean',
              description: 'Include authentication test in connection test',
              default: true,
            },
            timeout: {
              type: 'number',
              description: 'Connection timeout in milliseconds',
              minimum: 1000,
              maximum: 300000,
              default: 30000,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('auth').testConnection(params.includeAuth);

          return {
            connected: result.connectionSuccess,
            authenticated: result.authenticationSuccess,
            serverInfo: result.serverInfo,
            responseTime: result.responseTime,
            timestamp: result.timestamp,
            error: result.error,
          };
        },
      },
    };
  }

  /**
   * Get resource management tools
   * @private
   */
  _getResourceManagementTools() {
    return {
      jasper_upload_resource: {
        name: 'jasper_upload_resource',
        description:
          'Upload a resource (JRXML report, folder, datasource, etc.) to JasperReports Server',
        category: TOOL_CATEGORIES.RESOURCE_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourcePath', 'label'],
          properties: {
            resourcePath: {
              type: 'string',
              description: 'Full path where the resource will be stored (e.g., /reports/myreport)',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            label: {
              type: 'string',
              description: 'Display label for the resource',
              minLength: 1,
              maxLength: 200,
            },
            description: {
              type: 'string',
              description: 'Optional description for the resource',
              maxLength: 1000,
            },
            resourceType: {
              type: 'string',
              enum: ['reportUnit', 'folder', 'dataSource', 'inputControl', 'file'],
              description: 'Type of resource to create',
              default: 'reportUnit',
            },
            jrxmlContent: {
              type: 'string',
              description: 'JRXML content for report uploads (base64 encoded or plain XML)',
            },
            dataSourceUri: {
              type: 'string',
              description: 'URI of datasource to link to the report',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
            },
            localResources: {
              type: 'array',
              description: 'Local resources (images, subreports, etc.) to upload with the report',
              items: {
                type: 'object',
                required: ['name', 'content'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Resource filename',
                  },
                  type: {
                    type: 'string',
                    enum: ['img', 'jrxml', 'jar', 'prop', 'jrtx'],
                    description: 'Resource type',
                  },
                  content: {
                    type: 'string',
                    description: 'Resource content (base64 encoded)',
                  },
                  contentType: {
                    type: 'string',
                    description: 'MIME type of the resource',
                  },
                },
              },
            },
            overwrite: {
              type: 'boolean',
              description: 'Whether to overwrite existing resource',
              default: false,
            },
            createFolders: {
              type: 'boolean',
              description: "Whether to create parent folders if they don't exist",
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('resource').uploadResource(params);

          return {
            success: result.success,
            resourceUri: result.resourceUri,
            resourceId: result.resourceId,
            resourceType: result.resourceType,
            uploadTimestamp: result.uploadTimestamp,
            validationStatus: result.validationStatus,
            validationMessages: result.validationMessages,
            localResourcesUploaded: result.localResourcesUploaded,
            executionTime: result.executionTime,
          };
        },
      },

      jasper_list_resources: {
        name: 'jasper_list_resources',
        description: 'List resources in a folder with filtering and pagination options',
        category: TOOL_CATEGORIES.RESOURCE_MANAGEMENT,
        inputSchema: {
          type: 'object',
          properties: {
            folderUri: {
              type: 'string',
              description: 'Folder URI to list resources from',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]*$',
              default: '/',
            },
            resourceType: {
              type: 'string',
              enum: ['reportUnit', 'folder', 'dataSource', 'inputControl', 'file', 'domain'],
              description: 'Filter by resource type',
            },
            recursive: {
              type: 'boolean',
              description: 'Whether to list resources recursively',
              default: false,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of resources to return',
              minimum: 1,
              maximum: 1000,
              default: 100,
            },
            offset: {
              type: 'number',
              description: 'Number of resources to skip',
              minimum: 0,
              default: 0,
            },
            sortBy: {
              type: 'string',
              enum: ['label', 'uri', 'type', 'creationDate', 'updateDate'],
              description: 'Field to sort by',
              default: 'label',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order',
              default: 'asc',
            },
            searchQuery: {
              type: 'string',
              description: 'Search query to filter resources',
              maxLength: 200,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('resource').listResources(params);

          return {
            items: result.resources,
            totalCount: result.totalCount,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
          };
        },
      },

      jasper_get_resource: {
        name: 'jasper_get_resource',
        description: 'Get a specific resource with its content and metadata',
        category: TOOL_CATEGORIES.RESOURCE_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourceUri'],
          properties: {
            resourceUri: {
              type: 'string',
              description: 'URI of the resource to retrieve',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            includeContent: {
              type: 'boolean',
              description: 'Whether to include resource content',
              default: false,
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Whether to include resource metadata',
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('resource').getResource(params);

          return {
            success: result.success,
            resource: result.resource,
            content: result.content,
            contentType: result.contentType,
            size: result.size,
            metadata: result.metadata,
            lastModified: result.lastModified,
            executionTime: result.executionTime,
          };
        },
      },

      jasper_update_resource: {
        name: 'jasper_update_resource',
        description: 'Update an existing resource',
        category: TOOL_CATEGORIES.RESOURCE_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourceUri'],
          properties: {
            resourceUri: {
              type: 'string',
              description: 'URI of the resource to update',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            label: {
              type: 'string',
              description: 'New label for the resource',
              minLength: 1,
              maxLength: 200,
            },
            description: {
              type: 'string',
              description: 'New description for the resource',
              maxLength: 1000,
            },
            jrxmlContent: {
              type: 'string',
              description: 'New JRXML content for report resources',
            },
            overwrite: {
              type: 'boolean',
              description: 'Whether to overwrite existing resource',
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('resource').updateResource(params);

          return {
            success: result.success,
            resourceUri: result.resourceUri,
            updateTimestamp: result.updateTimestamp,
            validationStatus: result.validationStatus,
            validationMessages: result.validationMessages,
            executionTime: result.executionTime,
          };
        },
      },

      jasper_delete_resource: {
        name: 'jasper_delete_resource',
        description: 'Delete a resource from JasperReports Server',
        category: TOOL_CATEGORIES.RESOURCE_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourceUri'],
          properties: {
            resourceUri: {
              type: 'string',
              description: 'URI of the resource to delete',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            force: {
              type: 'boolean',
              description: 'Whether to force deletion even if resource has dependencies',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('resource').deleteResource(params);

          return {
            success: result.success,
            resourceUri: result.resourceUri,
            deleteTimestamp: result.deleteTimestamp,
            deletedResources: result.deletedResources,
            executionTime: result.executionTime,
          };
        },
      },
    };
  }

  /**
   * Get report execution tools
   * @private
   */
  _getReportExecutionTools() {
    return {
      jasper_run_report_sync: {
        name: 'jasper_run_report_sync',
        description: 'Execute a report synchronously and return the generated content',
        category: TOOL_CATEGORIES.REPORT_EXECUTION,
        inputSchema: {
          type: 'object',
          required: ['reportUri'],
          properties: {
            reportUri: {
              type: 'string',
              description: 'URI of the report to execute',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            outputFormat: {
              type: 'string',
              enum: ['pdf', 'html', 'xlsx', 'xls', 'csv', 'rtf', 'docx', 'odt', 'ods', 'xml'],
              description: 'Output format for the report',
              default: 'pdf',
            },
            parameters: {
              type: 'object',
              description: 'Report parameters as key-value pairs',
              additionalProperties: true,
            },
            pages: {
              type: 'string',
              description: 'Page range specification (e.g., "1-5", "1,3,5")',
              pattern: '^(\\d+(-\\d+)?(,\\d+(-\\d+)?)*)?$',
            },
            locale: {
              type: 'string',
              description: 'Locale for report generation',
              pattern: '^[a-z]{2}(_[A-Z]{2})?$',
              default: 'en_US',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for report generation',
              default: 'America/New_York',
            },
            attachmentsPrefix: {
              type: 'string',
              description: 'Prefix for attachment filenames',
              maxLength: 100,
            },
            baseUrl: {
              type: 'string',
              description: 'Base URL for hyperlinks in the report',
              format: 'uri',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('report').runReportSync(params);

          return {
            content: result.content,
            contentType: result.contentType,
            fileName: result.fileName,
            fileSize: result.fileSize,
            executionId: result.executionId,
            status: result.status,
            outputFormat: result.outputFormat,
            reportUri: result.reportUri,
            generationTime: result.generationTime,
            pages: result.pages,
          };
        },
      },

      jasper_run_report_async: {
        name: 'jasper_run_report_async',
        description: 'Start asynchronous report execution and return execution ID for tracking',
        category: TOOL_CATEGORIES.REPORT_EXECUTION,
        inputSchema: {
          type: 'object',
          required: ['reportUri'],
          properties: {
            reportUri: {
              type: 'string',
              description: 'URI of the report to execute',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            outputFormat: {
              type: 'string',
              enum: ['pdf', 'html', 'xlsx', 'xls', 'csv', 'rtf', 'docx', 'odt', 'ods', 'xml'],
              description: 'Output format for the report',
              default: 'pdf',
            },
            parameters: {
              type: 'object',
              description: 'Report parameters as key-value pairs',
              additionalProperties: true,
            },
            pages: {
              type: 'string',
              description: 'Page range specification (e.g., "1-5", "1,3,5")',
              pattern: '^(\\d+(-\\d+)?(,\\d+(-\\d+)?)*)?$',
            },
            locale: {
              type: 'string',
              description: 'Locale for report generation',
              pattern: '^[a-z]{2}(_[A-Z]{2})?$',
              default: 'en_US',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for report generation',
              default: 'America/New_York',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('execution').startAsyncExecution(params);

          return {
            success: result.success,
            executionId: result.executionId,
            status: result.status,
            reportUri: result.reportUri,
            outputFormat: result.outputFormat,
            startTime: result.startTime,
            estimatedDuration: result.estimatedDuration,
          };
        },
      },

      jasper_get_execution_status: {
        name: 'jasper_get_execution_status',
        description: 'Check the status of an asynchronous report execution',
        category: TOOL_CATEGORIES.REPORT_EXECUTION,
        inputSchema: {
          type: 'object',
          required: ['executionId'],
          properties: {
            executionId: {
              type: 'string',
              description: 'Execution ID returned from async execution start',
              pattern: '^[a-zA-Z0-9\\-_]+$',
              minLength: 1,
              maxLength: 100,
            },
            includeDetails: {
              type: 'boolean',
              description: 'Whether to include detailed execution information',
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('execution').getExecutionStatus(params);

          return {
            success: result.success,
            executionId: result.executionId,
            status: result.status,
            progress: result.progress,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            exports: result.exports,
            errorDescriptor: result.errorDescriptor,
            startTime: result.startTime,
            endTime: result.endTime,
          };
        },
      },

      jasper_get_execution_result: {
        name: 'jasper_get_execution_result',
        description: 'Retrieve the result of a completed asynchronous report execution',
        category: TOOL_CATEGORIES.REPORT_EXECUTION,
        inputSchema: {
          type: 'object',
          required: ['executionId', 'exportId'],
          properties: {
            executionId: {
              type: 'string',
              description: 'Execution ID of the completed execution',
              pattern: '^[a-zA-Z0-9\\-_]+$',
              minLength: 1,
              maxLength: 100,
            },
            exportId: {
              type: 'string',
              description:
                'Export ID for specific output format (required to identify which export to retrieve)',
              minLength: 1,
            },
            attachmentName: {
              type: 'string',
              description: 'Name of specific attachment to retrieve',
              maxLength: 200,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('execution').getExecutionResult(params);

          return {
            content: result.content,
            contentType: result.contentType,
            fileName: result.fileName,
            fileSize: result.fileSize,
            executionId: result.executionId,
            exportId: result.exportId,
            outputFormat: result.outputFormat,
            attachmentName: result.attachmentName,
          };
        },
      },

      jasper_cancel_execution: {
        name: 'jasper_cancel_execution',
        description: 'Cancel a running asynchronous report execution',
        category: TOOL_CATEGORIES.REPORT_EXECUTION,
        inputSchema: {
          type: 'object',
          required: ['executionId'],
          properties: {
            executionId: {
              type: 'string',
              description: 'Execution ID of the execution to cancel',
              pattern: '^[a-zA-Z0-9\\-_]+$',
              minLength: 1,
              maxLength: 100,
            },
            force: {
              type: 'boolean',
              description: 'Whether to force cancellation',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('execution').cancelExecution(params);

          return {
            success: result.success,
            executionId: result.executionId,
            cancelled: result.cancelled,
            cancelTimestamp: result.cancelTimestamp,
            finalStatus: result.finalStatus,
          };
        },
      },
    };
  }

  /**
   * Get job management tools
   * @private
   */
  _getJobManagementTools() {
    return {
      jasper_create_job: {
        name: 'jasper_create_job',
        description: 'Create a scheduled report job',
        category: TOOL_CATEGORIES.JOB_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['label', 'reportUri', 'schedule'],
          properties: {
            label: {
              type: 'string',
              description: 'Job label',
              minLength: 1,
              maxLength: 200,
            },
            description: {
              type: 'string',
              description: 'Job description',
              maxLength: 1000,
            },
            reportUri: {
              type: 'string',
              description: 'URI of the report to execute',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            schedule: {
              type: 'object',
              required: ['type'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['simple', 'calendar', 'cron'],
                  description: 'Schedule type',
                },
                startDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Schedule start date',
                },
                endDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Schedule end date',
                },
                recurrenceInterval: {
                  type: 'number',
                  minimum: 1,
                  description: 'Recurrence interval',
                },
                recurrenceIntervalUnit: {
                  type: 'string',
                  enum: ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH'],
                  description: 'Recurrence interval unit',
                },
                cronExpression: {
                  type: 'string',
                  description: 'Cron expression for cron-type schedules',
                },
              },
            },
            outputFormats: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['pdf', 'html', 'xlsx', 'xls', 'csv', 'rtf', 'docx', 'odt', 'ods', 'xml'],
              },
              minItems: 1,
              description: 'Output formats for the job',
              default: ['pdf'],
            },
            parameters: {
              type: 'object',
              description: 'Report parameters',
              additionalProperties: true,
            },
            recipients: {
              type: 'array',
              items: {
                type: 'string',
                format: 'email',
              },
              description: 'Email recipients for job results',
            },
            repositoryDestination: {
              type: 'string',
              description: 'Repository folder to save results',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('job').createJob(params);

          return {
            success: result.success,
            jobId: result.jobId,
            label: result.label,
            state: result.state,
            nextFireTime: result.nextFireTime,
            creationTimestamp: result.creationTimestamp,
          };
        },
      },

      jasper_list_jobs: {
        name: 'jasper_list_jobs',
        description: 'List scheduled jobs with filtering and pagination',
        category: TOOL_CATEGORIES.JOB_MANAGEMENT,
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              default: 100,
              description: 'Maximum number of jobs to return',
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Number of jobs to skip',
            },
            sortBy: {
              type: 'string',
              enum: ['label', 'owner', 'state', 'nextFireTime'],
              default: 'label',
              description: 'Field to sort by',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
              description: 'Sort order',
            },
            searchQuery: {
              type: 'string',
              maxLength: 200,
              description: 'Search query to filter jobs',
            },
            owner: {
              type: 'string',
              maxLength: 100,
              description: 'Filter by job owner',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('job').listJobs(params);

          return {
            items: result.jobs,
            totalCount: result.totalCount,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
          };
        },
      },

      jasper_update_job: {
        name: 'jasper_update_job',
        description: 'Update an existing scheduled job',
        category: TOOL_CATEGORIES.JOB_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: {
              type: 'string',
              description: 'ID of the job to update',
              minLength: 1,
              maxLength: 100,
            },
            label: {
              type: 'string',
              description: 'New job label',
              minLength: 1,
              maxLength: 200,
            },
            description: {
              type: 'string',
              description: 'New job description',
              maxLength: 1000,
            },
            schedule: {
              type: 'object',
              description: 'New schedule definition',
            },
            outputFormats: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['pdf', 'html', 'xlsx', 'xls', 'csv', 'rtf', 'docx', 'odt', 'ods', 'xml'],
              },
              description: 'New output formats',
            },
            parameters: {
              type: 'object',
              description: 'New report parameters',
              additionalProperties: true,
            },
            recipients: {
              type: 'array',
              items: {
                type: 'string',
                format: 'email',
              },
              description: 'New email recipients',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('job').updateJob(params);

          return {
            success: result.success,
            jobId: result.jobId,
            updateTimestamp: result.updateTimestamp,
            nextFireTime: result.nextFireTime,
            state: result.state,
          };
        },
      },

      jasper_delete_job: {
        name: 'jasper_delete_job',
        description: 'Delete a scheduled job',
        category: TOOL_CATEGORIES.JOB_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: {
              type: 'string',
              description: 'ID of the job to delete',
              minLength: 1,
              maxLength: 100,
            },
            force: {
              type: 'boolean',
              description: 'Whether to force deletion',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('job').deleteJob(params);

          return {
            success: result.success,
            jobId: result.jobId,
            deleteTimestamp: result.deleteTimestamp,
          };
        },
      },

      jasper_run_job_now: {
        name: 'jasper_run_job_now',
        description: 'Execute a scheduled job immediately',
        category: TOOL_CATEGORIES.JOB_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: {
              type: 'string',
              description: 'ID of the job to execute',
              minLength: 1,
              maxLength: 100,
            },
            parameters: {
              type: 'object',
              description: 'Override parameters for this execution',
              additionalProperties: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('job').executeJobNow(params);

          return {
            success: result.success,
            jobId: result.jobId,
            executionId: result.executionId,
            executionTimestamp: result.executionTimestamp,
            status: result.status,
          };
        },
      },
    };
  }

  /**
   * Get input control tools
   * @private
   */
  _getInputControlTools() {
    return {
      jasper_get_input_controls: {
        name: 'jasper_get_input_controls',
        description: 'Retrieve input control definitions for a report',
        category: TOOL_CATEGORIES.INPUT_CONTROLS,
        inputSchema: {
          type: 'object',
          required: ['reportUri'],
          properties: {
            reportUri: {
              type: 'string',
              description: 'URI of the report',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            includeStructure: {
              type: 'boolean',
              description: 'Whether to include control structure information',
              default: true,
            },
            includeValues: {
              type: 'boolean',
              description: 'Whether to include current control values',
              default: false,
            },
          },
          additionalProperties: false,
        },
        // Parameter dependency validation
        validateDependencies: params => {
          const errors = [];

          // If includeValues is true, includeStructure should also be true for complete context
          if (params.includeValues === true && params.includeStructure === false) {
            errors.push({
              field: 'includeStructure',
              message:
                'includeStructure must be true when includeValues is true to provide complete control context',
            });
          }

          return errors;
        },
        handler: async params => {
          const result = await this._getService('inputControl').getInputControls(params);

          return {
            success: result.success,
            reportUri: result.reportUri,
            inputControls: result.inputControls,
            structure: result.structure,
          };
        },
      },

      jasper_set_input_control_values: {
        name: 'jasper_set_input_control_values',
        description: 'Set values for cascading input controls',
        category: TOOL_CATEGORIES.INPUT_CONTROLS,
        inputSchema: {
          type: 'object',
          required: ['reportUri', 'controlId'],
          properties: {
            reportUri: {
              type: 'string',
              description: 'URI of the report',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            controlId: {
              type: 'string',
              description: 'ID of the input control to set values for',
              minLength: 1,
              maxLength: 100,
              pattern: '^[a-zA-Z0-9_\\-\\.]+$',
            },
            values: {
              type: 'object',
              description: 'Control values to set (key-value pairs where keys are parameter names)',
              additionalProperties: true,
              minProperties: 1,
            },
            freshData: {
              type: 'boolean',
              description:
                'Whether to refresh data from datasource (useful for cascading controls)',
              default: false,
            },
          },
          additionalProperties: false,
        },
        // Parameter dependency validation
        validateDependencies: params => {
          const errors = [];

          // Validate that values object is not empty
          if (
            params.values &&
            typeof params.values === 'object' &&
            Object.keys(params.values).length === 0
          ) {
            errors.push({
              field: 'values',
              message:
                'values object cannot be empty - at least one parameter value must be provided',
            });
          }

          // Validate controlId format for common patterns
          if (params.controlId) {
            const invalidChars = /[^a-zA-Z0-9_\-.]/;
            if (invalidChars.test(params.controlId)) {
              errors.push({
                field: 'controlId',
                message:
                  'controlId should only contain alphanumeric characters, underscores, hyphens, and dots',
              });
            }
          }

          return errors;
        },
        handler: async params => {
          const result = await this._getService('inputControl').setInputControlValues(params);

          return {
            success: result.success,
            reportUri: result.reportUri,
            controlId: result.controlId,
            values: result.values,
            selectedValues: result.selectedValues,
          };
        },
      },

      jasper_validate_input_controls: {
        name: 'jasper_validate_input_controls',
        description: 'Validate input control parameter values',
        category: TOOL_CATEGORIES.INPUT_CONTROLS,
        inputSchema: {
          type: 'object',
          required: ['reportUri'],
          properties: {
            reportUri: {
              type: 'string',
              description: 'URI of the report',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            parameters: {
              type: 'object',
              description: 'Parameter values to validate (key-value pairs)',
              additionalProperties: true,
            },
            validateAll: {
              type: 'boolean',
              description: 'Whether to validate all parameters or stop at first error',
              default: true,
            },
            includeDetails: {
              type: 'boolean',
              description: 'Whether to include detailed validation information',
              default: true,
            },
          },
          additionalProperties: false,
        },
        // Parameter dependency validation
        validateDependencies: params => {
          const errors = [];

          // If parameters is provided, it should not be empty when validateAll is true
          if (
            params.validateAll === true &&
            params.parameters &&
            typeof params.parameters === 'object' &&
            Object.keys(params.parameters).length === 0
          ) {
            errors.push({
              field: 'parameters',
              message:
                'When validateAll is true, parameters object should contain at least one parameter to validate',
            });
          }

          // Validate parameter names don't contain invalid characters
          if (params.parameters && typeof params.parameters === 'object') {
            for (const paramName of Object.keys(params.parameters)) {
              if (paramName.includes(' ') || paramName.includes('\t') || paramName.includes('\n')) {
                errors.push({
                  field: 'parameters',
                  message: `Parameter name '${paramName}' contains invalid whitespace characters`,
                });
              }
            }
          }

          return errors;
        },
        handler: async params => {
          const result = await this._getService('inputControl').validateInputControls(params);

          return {
            success: result.success,
            reportUri: result.reportUri,
            valid: result.valid,
            validationResults: result.validationResults,
            errors: result.errors,
          };
        },
      },
    };
  }

  /**
   * Get domain management tools
   * @private
   */
  _getDomainManagementTools() {
    return {
      jasper_list_domains: {
        name: 'jasper_list_domains',
        description: 'List semantic layer domains with filtering options',
        category: TOOL_CATEGORIES.DOMAIN_MANAGEMENT,
        inputSchema: {
          type: 'object',
          properties: {
            folderUri: {
              type: 'string',
              description: 'Folder URI to list domains from',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]*$',
            },
            recursive: {
              type: 'boolean',
              description: 'Whether to list domains recursively',
              default: false,
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              default: 100,
              description: 'Maximum number of domains to return',
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Number of domains to skip',
            },
            sortBy: {
              type: 'string',
              enum: ['label', 'uri', 'type', 'creationDate', 'updateDate'],
              description: 'Field to sort by',
            },
            nameFilter: {
              type: 'string',
              maxLength: 200,
              description: 'Filter by domain name',
            },
            descriptionFilter: {
              type: 'string',
              maxLength: 500,
              description: 'Filter by domain description',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('domain').listDomains(params);

          return {
            items: result.domains,
            totalCount: result.totalCount,
            filteredCount: result.filteredCount,
            listingTimestamp: result.listingTimestamp,
          };
        },
      },

      jasper_get_domain: {
        name: 'jasper_get_domain',
        description: 'Get domain definition and metadata',
        category: TOOL_CATEGORIES.DOMAIN_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['domainUri'],
          properties: {
            domainUri: {
              type: 'string',
              description: 'URI of the domain',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Whether to include domain metadata',
              default: true,
            },
            includeSchema: {
              type: 'boolean',
              description: 'Whether to include schema information',
              default: false,
            },
            includePermissions: {
              type: 'boolean',
              description: 'Whether to include permission information',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('domain').getDomain(params);

          return {
            success: result.success,
            domainUri: result.domainUri,
            domainInfo: result.domainInfo,
            metadata: result.metadata,
            schema: result.schema,
            permissions: result.permissions,
            retrievalTimestamp: result.retrievalTimestamp,
          };
        },
      },

      jasper_get_domain_schema: {
        name: 'jasper_get_domain_schema',
        description: 'Get domain schema information including fields and joins',
        category: TOOL_CATEGORIES.DOMAIN_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['domainUri'],
          properties: {
            domainUri: {
              type: 'string',
              description: 'URI of the domain',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            includeFields: {
              type: 'boolean',
              description: 'Whether to include field definitions',
              default: true,
            },
            includeJoins: {
              type: 'boolean',
              description: 'Whether to include join definitions',
              default: true,
            },
            includeCalculatedFields: {
              type: 'boolean',
              description: 'Whether to include calculated field definitions',
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('domain').getSchema(params);

          return {
            success: result.success,
            domainUri: result.domainUri,
            schema: result.schema,
            fields: result.fields,
            joins: result.joins,
            calculatedFields: result.calculatedFields,
            retrievalTimestamp: result.retrievalTimestamp,
          };
        },
      },
    };
  }

  /**
   * Get permission management tools
   * @private
   */
  _getPermissionManagementTools() {
    return {
      jasper_get_permissions: {
        name: 'jasper_get_permissions',
        description: 'Get permissions for a resource',
        category: TOOL_CATEGORIES.PERMISSION_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourceUri'],
          properties: {
            resourceUri: {
              type: 'string',
              description: 'URI of the resource',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            includeInherited: {
              type: 'boolean',
              description: 'Whether to include inherited permissions',
              default: true,
            },
            resolveAll: {
              type: 'boolean',
              description: 'Whether to resolve all permission details',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('permission').getPermissions(params);

          return {
            success: result.success,
            resourceUri: result.resourceUri,
            permissions: result.permissions,
            inheritedPermissions: result.inheritedPermissions,
            effectivePermissions: result.effectivePermissions,
          };
        },
      },

      jasper_set_permissions: {
        name: 'jasper_set_permissions',
        description: 'Set permissions for a resource',
        category: TOOL_CATEGORIES.PERMISSION_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['resourceUri', 'permissions'],
          properties: {
            resourceUri: {
              type: 'string',
              description: 'URI of the resource',
              pattern: '^/[a-zA-Z0-9_/\\-\\.]+$',
              minLength: 2,
              maxLength: 500,
            },
            permissions: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['recipient', 'mask'],
                properties: {
                  recipient: {
                    type: 'string',
                    description: 'User or role name',
                    minLength: 1,
                    maxLength: 100,
                  },
                  mask: {
                    type: 'number',
                    description: 'Permission mask (bitwise)',
                    minimum: 0,
                    maximum: 31,
                  },
                },
              },
              description: 'Permissions to set',
            },
            replaceAll: {
              type: 'boolean',
              description: 'Whether to replace all existing permissions',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('permission').setPermissions(params);

          return {
            success: result.success,
            resourceUri: result.resourceUri,
            permissionsSet: result.permissionsSet,
            updateTimestamp: result.updateTimestamp,
          };
        },
      },
    };
  }

  /**
   * Get user management tools
   * @private
   */
  _getUserManagementTools() {
    return {
      jasper_create_user: {
        name: 'jasper_create_user',
        description: 'Create a new user account',
        category: TOOL_CATEGORIES.USER_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['username', 'password', 'fullName'],
          properties: {
            username: {
              type: 'string',
              description: 'Username for the new user',
              pattern: '^[a-zA-Z0-9_\\-\\.]+$',
              minLength: 1,
              maxLength: 100,
            },
            password: {
              type: 'string',
              description: 'Password for the new user',
              minLength: 6,
              maxLength: 100,
            },
            fullName: {
              type: 'string',
              description: 'Full name of the user',
              minLength: 1,
              maxLength: 200,
            },
            emailAddress: {
              type: 'string',
              format: 'email',
              description: 'Email address of the user',
              maxLength: 200,
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the user account is enabled',
              default: true,
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              description: 'Roles to assign to the user',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('user').createUser(params);

          return {
            success: result.success,
            username: result.username,
            fullName: result.fullName,
            enabled: result.enabled,
            creationTimestamp: result.creationTimestamp,
            roles: result.roles,
          };
        },
      },

      jasper_list_users: {
        name: 'jasper_list_users',
        description: 'List user accounts with filtering and pagination',
        category: TOOL_CATEGORIES.USER_MANAGEMENT,
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              default: 100,
              description: 'Maximum number of users to return',
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Number of users to skip',
            },
            searchQuery: {
              type: 'string',
              maxLength: 200,
              description: 'Search query to filter users',
            },
            includeRoles: {
              type: 'boolean',
              description: 'Whether to include user roles',
              default: false,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('user').listUsers(params);

          return {
            items: result.users,
            totalCount: result.totalCount,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
          };
        },
      },

      jasper_update_user: {
        name: 'jasper_update_user',
        description: 'Update an existing user account',
        category: TOOL_CATEGORIES.USER_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['username'],
          properties: {
            username: {
              type: 'string',
              description: 'Username of the user to update',
              pattern: '^[a-zA-Z0-9_\\-\\.]+$',
              minLength: 1,
              maxLength: 100,
            },
            fullName: {
              type: 'string',
              description: 'New full name',
              minLength: 1,
              maxLength: 200,
            },
            emailAddress: {
              type: 'string',
              format: 'email',
              description: 'New email address',
              maxLength: 200,
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the user account is enabled',
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              description: 'New roles for the user',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('user').updateUser(params);

          return {
            success: result.success,
            username: result.username,
            updateTimestamp: result.updateTimestamp,
            roles: result.roles,
          };
        },
      },

      jasper_create_role: {
        name: 'jasper_create_role',
        description: 'Create a new role',
        category: TOOL_CATEGORIES.USER_MANAGEMENT,
        inputSchema: {
          type: 'object',
          required: ['roleName'],
          properties: {
            roleName: {
              type: 'string',
              description: 'Name of the new role',
              pattern: '^[a-zA-Z0-9_\\-\\.]+$',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: 'string',
              description: 'Description of the role',
              maxLength: 1000,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('user').createRole(params);

          return {
            success: result.success,
            roleName: result.roleName,
            description: result.description,
            creationTimestamp: result.creationTimestamp,
          };
        },
      },

      jasper_list_roles: {
        name: 'jasper_list_roles',
        description: 'List roles with filtering and pagination',
        category: TOOL_CATEGORIES.USER_MANAGEMENT,
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              default: 100,
              description: 'Maximum number of roles to return',
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Number of roles to skip',
            },
            searchQuery: {
              type: 'string',
              maxLength: 200,
              description: 'Search query to filter roles',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const result = await this._getService('user').listRoles(params);

          return {
            items: result.roles,
            totalCount: result.totalCount,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
          };
        },
      },
    };
  }

  /**
   * Applies default values to parameters based on schema
   * @param {object} parameters - Original parameters
   * @param {object} schema - JSON schema with default values
   * @returns {object} Parameters with defaults applied
   * @private
   */
  _applyDefaultValues(parameters, schema) {
    const processedParams = { ...parameters };

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        // Apply default value if parameter is not provided and default exists
        if (processedParams[propName] === undefined && propSchema.default !== undefined) {
          processedParams[propName] = propSchema.default;
        }
      }
    }

    return processedParams;
  }

  /**
   * Get tool registry statistics
   * @returns {object} Registry statistics
   */
  getRegistryStatistics() {
    const categoryStats = {};

    for (const category of Object.values(TOOL_CATEGORIES)) {
      categoryStats[category] = Object.keys(this.getToolsByCategory(category)).length;
    }

    return {
      totalTools: Object.keys(this.tools).length,
      categories: Object.keys(TOOL_CATEGORIES).length,
      categoryBreakdown: categoryStats,
      servicesInitialized: Object.keys(this.services).length,
    };
  }

  /**
   * Get tool documentation
   * @param {string} toolName - Optional tool name for specific documentation
   * @returns {object} Tool documentation
   */
  getToolDocumentation(toolName = null) {
    if (toolName) {
      const tool = this.getTool(toolName);
      if (!tool) {
        throw this.errorHandler.createResourceNotFoundError('Tool', toolName);
      }

      return {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        inputSchema: tool.inputSchema,
        examples: this._getToolExamples(toolName),
      };
    }

    // Return documentation for all tools
    const documentation = {};

    for (const [name, tool] of Object.entries(this.tools)) {
      documentation[name] = {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        inputSchema: tool.inputSchema,
      };
    }

    return {
      tools: documentation,
      categories: TOOL_CATEGORIES,
      statistics: this.getRegistryStatistics(),
    };
  }

  /**
   * Get example usage for a tool
   * @private
   */
  _getToolExamples(toolName) {
    // This could be expanded with actual examples for each tool
    const examples = {
      jasper_authenticate: [
        {
          description: 'Basic authentication',
          parameters: {
            authType: 'basic',
            username: 'jasperadmin',
            password: 'jasperadmin',
          },
        },
      ],
      jasper_upload_resource: [
        {
          description: 'Upload a simple JRXML report',
          parameters: {
            resourcePath: '/reports/sample_report',
            label: 'Sample Report',
            description: 'A sample report for testing',
            jrxmlContent: '<?xml version="1.0" encoding="UTF-8"?>...',
          },
        },
      ],
      jasper_run_report_sync: [
        {
          description: 'Execute report as PDF',
          parameters: {
            reportUri: '/reports/sample_report',
            outputFormat: 'pdf',
            parameters: {
              param1: 'value1',
              param2: 'value2',
            },
          },
        },
      ],
    };

    return examples[toolName] || [];
  }

  /**
   * Dispose of the registry and clean up resources
   */
  dispose() {
    // Dispose of all initialized services
    for (const service of Object.values(this.services)) {
      if (service && service.dispose) {
        service.dispose();
      }
    }

    if (this.config.debugMode) {
      console.log('[MCP Tools] Registry disposed');
    }
  }
  /**
   * Get health monitoring tools
   * @private
   */
  _getHealthMonitoringTools() {
    return {
      jasper_health_status: {
        name: 'jasper_health_status',
        description:
          'Get comprehensive health status of the JasperReports MCP Server and connected systems',
        category: TOOL_CATEGORIES.HEALTH_MONITORING,
        inputSchema: {
          type: 'object',
          properties: {
            includeDetails: {
              type: 'boolean',
              description: 'Include detailed health check results',
              default: true,
            },
            includeResilience: {
              type: 'boolean',
              description: 'Include resilience statistics',
              default: true,
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const healthService = this._getService('health');
          const healthStatus = await healthService.getHealthStatus();

          if (!params.includeDetails) {
            delete healthStatus.checks;
          }

          if (!params.includeResilience) {
            delete healthStatus.resilience;
          }

          return healthStatus;
        },
      },

      jasper_deep_health_check: {
        name: 'jasper_deep_health_check',
        description: 'Perform comprehensive deep health check of all system components',
        category: TOOL_CATEGORIES.HEALTH_MONITORING,
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        handler: async _params => {
          const healthService = this._getService('health');
          return await healthService.performDeepHealthCheck();
        },
      },

      jasper_performance_metrics: {
        name: 'jasper_performance_metrics',
        description:
          'Get detailed performance metrics including memory usage, resilience statistics, and system information',
        category: TOOL_CATEGORIES.HEALTH_MONITORING,
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        handler: async _params => {
          const healthService = this._getService('health');
          return await healthService.getPerformanceMetrics();
        },
      },

      jasper_component_health: {
        name: 'jasper_component_health',
        description: 'Test health of a specific system component',
        category: TOOL_CATEGORIES.HEALTH_MONITORING,
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              enum: [
                'jasperServerConnectivity',
                'authentication',
                'repositoryAccess',
                'systemPerformance',
                'memory',
                'connectionPool',
                'cache',
              ],
              description: 'Component to test',
            },
          },
          required: ['component'],
          additionalProperties: false,
        },
        handler: async params => {
          const healthService = this._getService('health');
          return await healthService.testComponentHealth(params.component);
        },
      },

      jasper_resilience_stats: {
        name: 'jasper_resilience_stats',
        description:
          'Get detailed resilience and performance statistics including retry, cache, connection pool, and memory management metrics',
        category: TOOL_CATEGORIES.HEALTH_MONITORING,
        inputSchema: {
          type: 'object',
          properties: {
            component: {
              type: 'string',
              enum: ['retry', 'cache', 'connectionPool', 'memory', 'all'],
              description:
                'Specific resilience component to get stats for, or "all" for everything',
              default: 'all',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const healthService = this._getService('health');
          const stats = await healthService.getPerformanceMetrics();

          if (params.component === 'all') {
            return stats.resilience;
          } else {
            return stats.resilience[params.component] || null;
          }
        },
      },
    };
  }

  /**
   * Get template and structure tools
   * @private
   */
  _getTemplateAndStructureTools() {
    return {
      jasper_get_report_template: {
        name: 'jasper_get_report_template',
        description:
          'Return an empty template of report that can help AI agents use structured and valid JRXML reports',
        category: TOOL_CATEGORIES.TEMPLATE_AND_STRUCTURE,
        inputSchema: {
          type: 'object',
          properties: {
            templateType: {
              type: 'string',
              enum: ['basic', 'tabular', 'master-detail', 'chart', 'subreport'],
              description: 'Type of JRXML template to generate',
              default: 'basic',
            },
            includeParameters: {
              type: 'boolean',
              description: 'Whether to include sample parameters in the template',
              default: true,
            },
            includeFields: {
              type: 'boolean',
              description: 'Whether to include sample field definitions',
              default: true,
            },
            pageFormat: {
              type: 'string',
              enum: ['A4', 'Letter', 'Legal', 'A3'],
              description: 'Page format for the report',
              default: 'A4',
            },
            orientation: {
              type: 'string',
              enum: ['portrait', 'landscape'],
              description: 'Page orientation',
              default: 'portrait',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const templateService = this._getService('template');
          const template = await templateService.generateJRXMLTemplate(params);

          return {
            success: true,
            templateType: params.templateType || 'basic',
            jrxmlContent: template.jrxmlContent,
            base64Content: template.base64Content,
            templateStructure: template.structure,
            sampleParameters: template.sampleParameters,
            sampleFields: template.sampleFields,
            usage: template.usage,
            validationNotes: template.validationNotes,
          };
        },
      },

      jasper_get_datasource_structure: {
        name: 'jasper_get_datasource_structure',
        description:
          'Return datasource structure and validation information for creating valid datasources',
        category: TOOL_CATEGORIES.TEMPLATE_AND_STRUCTURE,
        inputSchema: {
          type: 'object',
          properties: {
            datasourceType: {
              type: 'string',
              enum: ['jdbc', 'jndi', 'bean', 'custom', 'aws', 'mongodb'],
              description: 'Type of datasource structure to return',
              default: 'jdbc',
            },
            includeValidation: {
              type: 'boolean',
              description: 'Whether to include validation rules and examples',
              default: true,
            },
            includeExamples: {
              type: 'boolean',
              description: 'Whether to include example configurations',
              default: true,
            },
            databaseType: {
              type: 'string',
              enum: ['mysql', 'postgresql', 'oracle', 'sqlserver', 'h2', 'generic'],
              description: 'Database type for JDBC datasources (when applicable)',
              default: 'generic',
            },
          },
          additionalProperties: false,
        },
        handler: async params => {
          const templateService = this._getService('template');
          const structure = await templateService.getDatasourceStructure(params);

          return {
            success: true,
            datasourceType: params.datasourceType || 'jdbc',
            structure: structure.structure,
            requiredFields: structure.requiredFields,
            optionalFields: structure.optionalFields,
            validationRules: structure.validationRules,
            examples: structure.examples,
            commonErrors: structure.commonErrors,
            bestPractices: structure.bestPractices,
          };
        },
      },
    };
  }
}

export default MCPToolRegistry;
export { TOOL_CATEGORIES };
