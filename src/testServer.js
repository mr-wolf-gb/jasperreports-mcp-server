#!/usr/bin/env node

/**
 * Express Test Server for JasperReports MCP Server
 *
 * This test server provides HTTP endpoints for testing MCP server functionality
 * through standard HTTP requests. It accepts operation and parameters in request
 * body and routes them to the appropriate MCP service methods.
 *
 * Features:
 * - Express server with /test_mcp endpoint
 * - Operation routing to MCP service methods
 * - Request/response transformation for HTTP compatibility
 * - Error handling and status code mapping
 * - Support for all major operation testing scenarios
 */

import express from 'express';
import { validateConfiguration, ConfigurationError } from './config/environment.js';
import MCPToolRegistry from './tools/mcpTools.js';
import { ErrorHandler } from './utils/errorHandler.js';

/**
 * Express Test Server class
 */
class ExpressTestServer {
  constructor() {
    this.app = null;
    this.server = null;
    this.config = null;
    this.toolRegistry = null;
    this.errorHandler = null;
    this.isRunning = false;

    // Bind methods to preserve context
    this.handleTestMCP = this.handleTestMCP.bind(this);
    this.handleHealthCheck = this.handleHealthCheck.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  /**
   * Initialize the test server
   */
  async initialize() {
    try {
      // Load and validate configuration
      await this.loadConfiguration();

      // Initialize error handler
      this.errorHandler = new ErrorHandler(this.config);

      // Initialize tool registry
      this.toolRegistry = new MCPToolRegistry(this.config);

      // Create Express app
      this.app = express();

      // Set up middleware
      this.setupMiddleware();

      // Set up routes
      this.setupRoutes();

      // Set up error handling
      this.setupErrorHandling();

      this.log('info', 'Express Test Server initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize Express Test Server', { error: error.message });
      throw error;
    }
  }

  /**
   * Load and validate configuration
   */
  async loadConfiguration() {
    try {
      const validation = validateConfiguration();

      if (!validation.isValid) {
        const errorMessage =
          'Configuration validation failed:\n' +
          validation.errors.map(err => `  - ${err.field}: ${err.message}`).join('\n');
        throw new ConfigurationError(errorMessage);
      }

      this.config = validation.config;

      if (this.config.debugMode) {
        this.log('debug', 'Configuration loaded for test server', {
          jasperUrl: this.config.jasperUrl,
          authType: this.config.authType,
          testServerPort: this.config.testServerPort,
          testServerEnabled: this.config.testServerEnabled,
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
   * Set up Express middleware
   */
  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '50mb' }));

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Add request logging in debug mode
    if (this.config.debugMode) {
      this.app.use((req, res, next) => {
        this.log('debug', `${req.method} ${req.path}`, {
          headers: req.headers,
          body: req.method !== 'GET' ? req.body : undefined,
        });
        next();
      });
    }

    // Add CORS headers for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.log('debug', 'Express middleware configured');
  }

  /**
   * Set up Express routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', this.handleHealthCheck);

    // Main test endpoint
    this.app.post('/test_mcp', this.handleTestMCP);

    // List available operations
    this.app.get('/operations', this.handleListOperations.bind(this));

    // Get operation schema
    this.app.get('/operations/:operationName/schema', this.handleGetOperationSchema.bind(this));

    // Root endpoint with server info
    this.app.get('/', this.handleRoot.bind(this));

    this.log('debug', 'Express routes configured');
  }

  /**
   * Set up error handling middleware
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint not found: ${req.method} ${req.path}`,
          statusCode: 404,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error, req, res, _next) => {
      this.log('error', 'Express error handler', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
      });

      const mcpError = this.errorHandler.mapToMCPError(error);
      const statusCode = this.mapMCPErrorToHTTPStatus(mcpError.code);

      res.status(statusCode).json({
        success: false,
        error: {
          code: mcpError.code,
          message: mcpError.message,
          statusCode,
        },
        timestamp: new Date().toISOString(),
      });
    });

    this.log('debug', 'Express error handling configured');
  }

  /**
   * Handle /test_mcp endpoint
   */
  async handleTestMCP(req, res) {
    const startTime = Date.now();

    try {
      const { operation, params = {} } = req.body;

      // Validate request format
      if (!operation) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: operation',
            statusCode: 400,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Validate operation exists
      if (!this.toolRegistry.hasTool(operation)) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPERATION_NOT_FOUND',
            message: `Operation not found: ${operation}`,
            availableOperations: this.toolRegistry.getToolList().map(tool => tool.name),
            statusCode: 404,
          },
          timestamp: new Date().toISOString(),
        });
      }

      this.log('debug', `Executing operation: ${operation}`, { params });

      // Execute the operation
      const result = await this.toolRegistry.executeTool(operation, params);
      const executionTime = Date.now() - startTime;

      this.log('debug', `Operation completed: ${operation}`, {
        executionTime: `${executionTime}ms`,
        success: result.success !== false,
      });

      // Transform response for HTTP compatibility
      const httpResponse = this.transformMCPResponseToHTTP(result, operation, executionTime);

      res.status(200).json(httpResponse);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.log('error', `Operation failed: ${req.body?.operation || 'unknown'}`, {
        error: error.message,
        executionTime: `${executionTime}ms`,
        params: req.body?.params,
      });

      // Map error to appropriate HTTP response
      const mcpError = this.errorHandler.mapToMCPError(error);
      const statusCode = this.mapMCPErrorToHTTPStatus(mcpError.code);

      res.status(statusCode).json({
        success: false,
        operation: req.body?.operation,
        error: {
          code: mcpError.code,
          message: mcpError.message,
          statusCode,
        },
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle health check endpoint
   */
  async handleHealthCheck(req, res) {
    try {
      const status = {
        status: 'healthy',
        server: 'JasperReports MCP Test Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: {
          jasperUrl: this.config.jasperUrl,
          authType: this.config.authType,
          testServerPort: this.config.testServerPort,
          debugMode: this.config.debugMode,
        },
        tools: {
          total: this.toolRegistry.getToolCount(),
          categories: this.getToolCategories(),
        },
      };

      res.status(200).json(status);
    } catch (error) {
      this.log('error', 'Health check failed', { error: error.message });

      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle list operations endpoint
   */
  async handleListOperations(req, res) {
    try {
      const tools = this.toolRegistry.getToolList();
      const operations = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        inputSchema: tool.inputSchema,
      }));

      res.status(200).json({
        success: true,
        operations,
        total: operations.length,
        categories: this.getToolCategories(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.log('error', 'Failed to list operations', { error: error.message });

      const mcpError = this.errorHandler.mapToMCPError(error);
      const statusCode = this.mapMCPErrorToHTTPStatus(mcpError.code);

      res.status(statusCode).json({
        success: false,
        error: {
          code: mcpError.code,
          message: mcpError.message,
          statusCode,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle get operation schema endpoint
   */
  async handleGetOperationSchema(req, res) {
    try {
      const { operationName } = req.params;

      if (!this.toolRegistry.hasTool(operationName)) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'OPERATION_NOT_FOUND',
            message: `Operation not found: ${operationName}`,
            statusCode: 404,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const tool = this.toolRegistry.getToolList().find(t => t.name === operationName);

      res.status(200).json({
        success: true,
        operation: {
          name: tool.name,
          description: tool.description,
          category: tool.category,
          inputSchema: tool.inputSchema,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.log('error', `Failed to get schema for operation: ${req.params.operationName}`, {
        error: error.message,
      });

      const mcpError = this.errorHandler.mapToMCPError(error);
      const statusCode = this.mapMCPErrorToHTTPStatus(mcpError.code);

      res.status(statusCode).json({
        success: false,
        error: {
          code: mcpError.code,
          message: mcpError.message,
          statusCode,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle root endpoint
   */
  async handleRoot(req, res) {
    res.status(200).json({
      server: 'JasperReports MCP Test Server',
      version: '1.0.0',
      description: 'Express test server for JasperReports MCP Server functionality',
      endpoints: {
        '/': 'Server information',
        '/health': 'Health check',
        '/test_mcp': 'Execute MCP operations (POST)',
        '/operations': 'List available operations',
        '/operations/:name/schema': 'Get operation schema',
      },
      usage: {
        testEndpoint: {
          method: 'POST',
          url: '/test_mcp',
          body: {
            operation: 'operation_name',
            params: {},
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Transform MCP response to HTTP-compatible format
   */
  transformMCPResponseToHTTP(mcpResult, operation, executionTime) {
    return {
      success: mcpResult.success !== false,
      operation,
      result: mcpResult,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Map MCP error codes to HTTP status codes
   */
  mapMCPErrorToHTTPStatus(mcpErrorCode) {
    const errorCodeMap = {
      InvalidRequest: 400,
      MethodNotFound: 404,
      InvalidParams: 400,
      InternalError: 500,
      ParseError: 400,
      InvalidResponse: 500,
      Timeout: 408,
      Cancelled: 499,
      AuthenticationRequired: 401,
      PermissionDenied: 403,
      ResourceNotFound: 404,
      ResourceConflict: 409,
      ServiceUnavailable: 503,
      RateLimitExceeded: 429,
    };

    return errorCodeMap[mcpErrorCode] || 500;
  }

  /**
   * Get tool categories summary
   */
  getToolCategories() {
    const tools = this.toolRegistry.getToolList();
    const categories = {};

    tools.forEach(tool => {
      const category = tool.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    return categories;
  }

  /**
   * Start the Express server
   */
  async start() {
    try {
      if (this.isRunning) {
        this.log('warn', 'Test server is already running');
        return;
      }

      // Initialize if not already done
      if (!this.app) {
        await this.initialize();
      }

      // Check if test server is enabled
      if (!this.config.testServerEnabled) {
        this.log('info', 'Test server is disabled in configuration');
        return;
      }

      // Set up shutdown handlers
      this.setupShutdownHandlers();

      // Start the server
      const port = this.config.testServerPort;

      this.server = this.app.listen(port, () => {
        this.isRunning = true;

        this.log('info', 'Express Test Server started successfully', {
          port,
          endpoints: [
            `http://localhost:${port}/`,
            `http://localhost:${port}/health`,
            `http://localhost:${port}/test_mcp`,
            `http://localhost:${port}/operations`,
          ],
          tools: this.toolRegistry.getToolCount(),
          jasperUrl: this.config.jasperUrl,
        });
      });

      // Handle server errors
      this.server.on('error', error => {
        if (error.code === 'EADDRINUSE') {
          this.log('error', `Port ${port} is already in use`);
        } else {
          this.log('error', 'Server error', { error: error.message });
        }
        throw error;
      });
    } catch (error) {
      this.log('error', 'Failed to start Express Test Server', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the Express server
   */
  async stop() {
    try {
      if (!this.isRunning) {
        this.log('warn', 'Test server is not running');
        return;
      }

      this.log('info', 'Stopping Express Test Server...');

      // Close the server
      if (this.server) {
        await new Promise((resolve, reject) => {
          this.server.close(error => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      this.isRunning = false;

      this.log('info', 'Express Test Server stopped successfully');
    } catch (error) {
      this.log('error', 'Error stopping Express Test Server', { error: error.message });
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
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal) {
    if (signal) {
      this.log('info', `Received ${signal}, shutting down test server gracefully...`);
    }

    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      this.log('error', 'Error during test server shutdown', { error: error.message });
      process.exit(1);
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
      component: 'TestServer',
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
      port: this.config?.testServerPort,
      toolCount: this.toolRegistry?.getToolCount() || 0,
      config: this.config
        ? {
            jasperUrl: this.config.jasperUrl,
            authType: this.config.authType,
            testServerEnabled: this.config.testServerEnabled,
            testServerPort: this.config.testServerPort,
            debugMode: this.config.debugMode,
          }
        : null,
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  const testServer = new ExpressTestServer();

  try {
    await testServer.start();
  } catch (error) {
    console.error('Failed to start Express Test Server:', error.message);

    if (error instanceof ConfigurationError) {
      console.error('\nConfiguration Error Details:');
      console.error(error.message);
      console.error('\nPlease check your environment variables and try again.');
    }

    process.exit(1);
  }
}

// Export for testing and integration
export { ExpressTestServer };

// Run server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
