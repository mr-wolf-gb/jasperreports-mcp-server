#!/usr/bin/env node

/**
 * JasperReports MCP Server - Main Entry Point
 *
 * This is the main MCP server implementation using @modelcontextprotocol/sdk.
 * It provides comprehensive JasperReports Server integration through MCP tools.
 *
 * Features:
 * - Full MCP protocol implementation
 * - Tool registration and request handling
 * - Server lifecycle management (start, stop, cleanup)
 * - Configuration loading and service initialization
 * - Comprehensive logging and error handling
 * - Graceful shutdown handling
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigurationError } from './config/environment.js';
import MCPToolRegistry from './tools/mcpTools.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { ConfigValidator } from './utils/ConfigValidator.js';

/**
 * JasperReports MCP Server class
 */
class JasperReportsMCPServer {
  constructor() {
    this.server = null;
    this.transport = null;
    this.config = null;
    this.toolRegistry = null;
    this.errorHandler = null;
    this.isRunning = false;
    this.shutdownHandlers = [];

    // Bind methods to preserve context
    this.handleListTools = this.handleListTools.bind(this);
    this.handleCallTool = this.handleCallTool.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  /**
   * Initialize the MCP server
   */
  async initialize() {
    try {
      // Load and validate configuration
      await this.loadConfiguration();

      // Initialize error handler
      this.errorHandler = new ErrorHandler(this.config);

      // Initialize tool registry
      this.toolRegistry = new MCPToolRegistry(this.config);

      // Initialize health service
      await this.initializeHealthService();

      // Add health service shutdown handler
      this.addShutdownHandler(async () => {
        try {
          const healthService = this.toolRegistry._getService('health');
          healthService.destroy();
          this.log('debug', 'Health service shutdown completed');
        } catch (error) {
          this.log('error', 'Error shutting down health service', { error: error.message });
        }
      });

      // Create MCP server instance
      this.server = new Server(
        {
          name: 'jasperreports-mcp-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Set up request handlers
      this.setupRequestHandlers();

      // Set up transport
      this.transport = new StdioServerTransport();

      this.log('info', 'JasperReports MCP Server initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize MCP server', { error: error.message });
      throw error;
    }
  }

  /**
   * Load and validate configuration with comprehensive startup validation
   */
  async loadConfiguration() {
    try {
      // Perform comprehensive configuration validation including connection testing
      const validationResult = await ConfigValidator.validateStartupConfig({
        testConnection: true,
        validateSecurity: true,
        verbose: process.env.JASPER_DEBUG_MODE === 'true',
      });

      if (!validationResult.isValid) {
        // Format and display validation errors
        const formattedOutput = ConfigValidator.formatValidationOutput(validationResult, true);
        console.error(formattedOutput);

        const errorMessage =
          'Configuration validation failed:\n' +
          validationResult.errors.map(err => `  - ${err.field}: ${err.message}`).join('\n');
        throw new ConfigurationError(errorMessage);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        const warningOutput = ConfigValidator.formatValidationOutput(validationResult, false);
        console.warn(warningOutput);
      }

      this.config = validationResult.config;

      if (this.config.debugMode) {
        this.log('debug', 'Configuration loaded and validated', {
          jasperUrl: this.config.jasperUrl,
          authType: this.config.authType,
          organization: this.config.organization || 'none',
          debugMode: this.config.debugMode,
          logLevel: this.config.logLevel,
          securityLevel: validationResult.securityLevel,
          connectionTested: validationResult.connectionStatus?.success || false,
        });
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Initialize health service
   */
  async initializeHealthService() {
    try {
      // Get health service from tool registry (lazy initialization)
      const healthService = this.toolRegistry._getService('health');

      // Initialize health service
      await healthService.initialize();

      this.log('debug', 'Health service initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize health service', { error: error.message });
      // Don't throw - health service is not critical for basic operation
    }
  }

  /**
   * Set up MCP request handlers
   */
  setupRequestHandlers() {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, this.handleListTools);

    // Handle call tool requests
    this.server.setRequestHandler(CallToolRequestSchema, this.handleCallTool);

    this.log('debug', 'Request handlers registered');
  }

  /**
   * Handle list tools request
   */
  async handleListTools() {
    try {
      const tools = this.toolRegistry.getToolList();

      this.log('debug', `Returning ${tools.length} available tools`);

      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    } catch (error) {
      this.log('error', 'Error listing tools', { error: error.message });
      throw new McpError(ErrorCode.InternalError, `Failed to list tools: ${error.message}`);
    }
  }

  /**
   * Handle call tool request
   */
  async handleCallTool(request) {
    const { name: toolName, arguments: toolArgs } = request.params;

    try {
      this.log('debug', `Executing tool: ${toolName}`, { arguments: toolArgs });

      // Validate tool exists
      if (!this.toolRegistry.hasTool(toolName)) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${toolName}`);
      }

      // Execute tool
      const startTime = Date.now();
      const result = await this.toolRegistry.executeTool(toolName, toolArgs || {});
      const executionTime = Date.now() - startTime;

      this.log('debug', `Tool executed successfully: ${toolName}`, {
        executionTime: `${executionTime}ms`,
        success: result.success !== false,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.log('error', `Error executing tool: ${toolName}`, {
        error: error.message,
        arguments: toolArgs,
      });

      // Handle MCP errors directly
      if (error instanceof McpError) {
        throw error;
      }

      // Map other errors to appropriate MCP error types
      const mcpError = this.errorHandler.mapToMCPError(error);
      throw new McpError(mcpError.code, mcpError.message);
    }
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      if (this.isRunning) {
        this.log('warn', 'Server is already running');
        return;
      }

      // Initialize if not already done
      if (!this.server) {
        await this.initialize();
      }

      // Set up shutdown handlers
      this.setupShutdownHandlers();

      // Connect server to transport
      await this.server.connect(this.transport);

      this.isRunning = true;

      this.log('info', 'JasperReports MCP Server started successfully', {
        tools: this.toolRegistry.getToolCount(),
        jasperUrl: this.config.jasperUrl,
        authType: this.config.authType,
      });
    } catch (error) {
      this.log('error', 'Failed to start MCP server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop() {
    try {
      if (!this.isRunning) {
        this.log('warn', 'Server is not running');
        return;
      }

      this.log('info', 'Stopping JasperReports MCP Server...');

      // Execute shutdown handlers
      await this.executeShutdownHandlers();

      // Close server connection
      if (this.server) {
        await this.server.close();
      }

      this.isRunning = false;

      this.log('info', 'JasperReports MCP Server stopped successfully');
    } catch (error) {
      this.log('error', 'Error stopping MCP server', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupShutdownHandlers() {
    // Handle process termination signals
    process.on('SIGINT', this.handleShutdown);
    process.on('SIGTERM', this.handleShutdown);
    process.on('SIGQUIT', this.handleShutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      this.log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
      this.handleShutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled promise rejection', {
        reason: reason?.message || reason,
        promise: promise.toString(),
      });
      this.handleShutdown();
    });
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal) {
    if (signal) {
      this.log('info', `Received ${signal}, shutting down gracefully...`);
    }

    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      this.log('error', 'Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Add shutdown handler
   */
  addShutdownHandler(handler) {
    if (typeof handler === 'function') {
      this.shutdownHandlers.push(handler);
    }
  }

  /**
   * Execute all shutdown handlers
   */
  async executeShutdownHandlers() {
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        this.log('error', 'Error in shutdown handler', { error: error.message });
      }
    }
  }

  /**
   * Log message with appropriate level
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data,
    };

    // Only log if level is appropriate
    const logLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    const currentLevelIndex = logLevels.indexOf(this.config?.logLevel || 'info');
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      if (this.config?.debugMode || level === 'error') {
        console.error(JSON.stringify(logEntry, null, 2));
      } else {
        console.error(`[${logEntry.level}] ${logEntry.message}`);
      }
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      toolCount: this.toolRegistry?.getToolCount() || 0,
      config: this.config
        ? {
            jasperUrl: this.config.jasperUrl,
            authType: this.config.authType,
            debugMode: this.config.debugMode,
            logLevel: this.config.logLevel,
          }
        : null,
    };
  }

  /**
   * Get total number of tools
   * @returns {number} Number of tools
   */
  getToolCount() {
    return this.toolRegistry?.getToolCount() || 0;
  }
}

/**
 * Main execution function
 */
async function main() {
  const server = new JasperReportsMCPServer();

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start JasperReports MCP Server:', error.message);

    if (error instanceof ConfigurationError) {
      console.error('\nConfiguration Error Details:');
      console.error(error.message);
      console.error('\nPlease check your environment variables and try again.');
    }

    process.exit(1);
  }
}

// Export for testing
export { JasperReportsMCPServer };

// Run server if this file is executed directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);

if (__filename === scriptPath) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
