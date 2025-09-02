/**
 * Report Execution Service for JasperReports MCP Server
 *
 * This service handles synchronous report execution with support for:
 * - All output formats (PDF, HTML, XLSX, CSV, RTF, DOCX)
 * - Parameter handling and page range specifications
 * - Content type detection and binary response handling
 * - Execution metadata collection (timing, file size, etc.)
 *
 * Features:
 * - Comprehensive parameter validation and transformation
 * - Binary content handling with proper content type detection
 * - Execution timing and performance metrics
 * - Error handling with detailed context
 * - Support for all JasperReports output formats
 */

import APIClient, { HTTP_STATUS } from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import { ReportExecutionRequest } from '../models/requests.js';
import { ReportExecutionResponse } from '../models/responses.js';

/**
 * Supported output formats and their MIME types
 */
const OUTPUT_FORMATS = {
  PDF: {
    format: 'pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    binary: true,
  },
  HTML: {
    format: 'html',
    mimeType: 'text/html',
    extension: 'html',
    binary: false,
  },
  XLSX: {
    format: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    binary: true,
  },
  XLS: {
    format: 'xls',
    mimeType: 'application/vnd.ms-excel',
    extension: 'xls',
    binary: true,
  },
  CSV: {
    format: 'csv',
    mimeType: 'text/csv',
    extension: 'csv',
    binary: false,
  },
  RTF: {
    format: 'rtf',
    mimeType: 'application/rtf',
    extension: 'rtf',
    binary: false,
  },
  DOCX: {
    format: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    binary: true,
  },
  ODT: {
    format: 'odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    extension: 'odt',
    binary: true,
  },
  ODS: {
    format: 'ods',
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
    extension: 'ods',
    binary: true,
  },
  XML: {
    format: 'xml',
    mimeType: 'application/xml',
    extension: 'xml',
    binary: false,
  },
};

/**
 * Default execution parameters
 */
const DEFAULT_EXECUTION_PARAMS = {
  outputFormat: 'pdf',
  locale: 'en_US',
  timezone: 'America/New_York',
  async: false,
  parameters: {},
};

/**
 * Report execution constants
 */
const EXECUTION_CONSTANTS = {
  MAX_EXECUTION_TIME_MS: 300000, // 5 minutes
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  DEFAULT_TIMEOUT_MS: 60000, // 1 minute
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

/**
 * Report Service class for handling synchronous report execution
 */
class ReportService {
  constructor(config = null, apiClient = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = new ErrorHandler(this.config);

    // Execution tracking
    this.activeExecutions = new Map();
    this.executionHistory = [];
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      formatStats: {},
    };

    this._initializeService();
  }

  /**
   * Initialize the report service
   * @private
   */
  _initializeService() {
    // Initialize format statistics
    Object.keys(OUTPUT_FORMATS).forEach(format => {
      this.executionStats.formatStats[format.toLowerCase()] = {
        executions: 0,
        totalTime: 0,
        averageTime: 0,
        totalSize: 0,
        averageSize: 0,
      };
    });

    if (this.config.debugMode) {
      console.log('[Report Service] Initializing report execution service', {
        supportedFormats: Object.keys(OUTPUT_FORMATS),
        maxExecutionTime: EXECUTION_CONSTANTS.MAX_EXECUTION_TIME_MS,
        maxFileSize: EXECUTION_CONSTANTS.MAX_FILE_SIZE_BYTES,
      });
    }
  }

  /**
   * Execute a report synchronously
   * @param {object} executionRequest - Report execution request parameters
   * @returns {Promise<object>} Report execution result with content and metadata
   */
  async runReportSync(executionRequest) {
    const startTime = Date.now();
    const executionId = this._generateExecutionId();

    try {
      // Validate input parameters
      const validatedRequest = this._validateExecutionRequest(executionRequest);

      // Track active execution
      this._trackExecution(executionId, validatedRequest, startTime);

      if (this.config.debugMode) {
        console.log(`[Report Service] Starting synchronous execution ${executionId}`, {
          reportUri: validatedRequest.reportUri,
          outputFormat: validatedRequest.outputFormat,
          parametersCount: Object.keys(validatedRequest.parameters).length,
        });
      }

      // Execute the report
      const result = await this._executeReport(executionId, validatedRequest);

      // Calculate execution metrics
      const executionTime = Date.now() - startTime;
      const fileSize = result.content ? Buffer.byteLength(result.content) : 0;

      // Update statistics
      this._updateExecutionStats(validatedRequest.outputFormat, executionTime, fileSize, true);

      // Create response
      const response = new ReportExecutionResponse({
        success: true,
        executionId,
        status: 'ready',
        outputFormat: validatedRequest.outputFormat,
        reportUri: validatedRequest.reportUri,
        generationTime: executionTime,
        fileSize,
        content: result.content,
        contentType: result.contentType,
        fileName: result.fileName,
        pages: validatedRequest.pages,
        requestId: validatedRequest.requestId,
        executionTime,
      });

      // Add to execution history
      this._addToExecutionHistory(executionId, validatedRequest, response, executionTime);

      if (this.config.debugMode) {
        console.log(`[Report Service] Execution ${executionId} completed successfully`, {
          executionTime,
          fileSize,
          outputFormat: validatedRequest.outputFormat,
        });
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update failure statistics
      this._updateExecutionStats(executionRequest.outputFormat || 'pdf', executionTime, 0, false);

      // Log error with context
      this.errorHandler.logError(error, 'Report execution', {
        executionId,
        reportUri: executionRequest.reportUri,
        outputFormat: executionRequest.outputFormat,
        executionTime,
      });

      // Add failed execution to history
      this._addToExecutionHistory(executionId, executionRequest, null, executionTime, error);

      throw error;
    } finally {
      // Remove from active executions
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Validate and normalize execution request
   * @private
   */
  _validateExecutionRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Execution request must be an object',
        request,
        'object'
      );
    }

    // Validate using schema
    Validator.validateReportExecution(request);

    // Create normalized request
    const normalizedRequest = new ReportExecutionRequest({
      ...DEFAULT_EXECUTION_PARAMS,
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate output format
    const formatInfo = this._getFormatInfo(normalizedRequest.outputFormat);
    if (!formatInfo) {
      throw this.errorHandler.createValidationError(
        'outputFormat',
        `Unsupported output format: ${normalizedRequest.outputFormat}`,
        normalizedRequest.outputFormat,
        `one of: ${Object.keys(OUTPUT_FORMATS)
          .map(f => f.toLowerCase())
          .join(', ')}`
      );
    }

    // Validate resource URI
    Validator.validateResourceURI(normalizedRequest.reportUri);

    // Validate page range if provided
    if (normalizedRequest.pages) {
      this._validatePageRange(normalizedRequest.pages);
    }

    // Validate parameters
    if (normalizedRequest.parameters && typeof normalizedRequest.parameters !== 'object') {
      throw this.errorHandler.createValidationError(
        'parameters',
        'Parameters must be an object',
        normalizedRequest.parameters,
        'object'
      );
    }

    return normalizedRequest;
  }

  /**
   * Execute the report using JasperReports REST API
   * @private
   */
  async _executeReport(executionId, request) {
    const formatInfo = this._getFormatInfo(request.outputFormat);

    // Prepare execution request body
    const executionBody = {
      reportUnitUri: request.reportUri,
      outputFormat: formatInfo.format,
      parameters: this._transformParameters(request.parameters),
      async: false,
    };

    // Add optional parameters
    if (request.pages) {
      executionBody.pages = request.pages;
    }

    if (request.locale) {
      executionBody.locale = request.locale;
    }

    if (request.timezone) {
      executionBody.timezone = request.timezone;
    }

    if (request.attachmentsPrefix) {
      executionBody.attachmentsPrefix = request.attachmentsPrefix;
    }

    if (request.baseUrl) {
      executionBody.baseUrl = request.baseUrl;
    }

    try {
      // Execute report via REST API
      const response = await this.apiClient.post('/rest_v2/reportExecutions', executionBody, {
        timeout: EXECUTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
        responseType: formatInfo.binary ? 'arraybuffer' : 'text',
      });

      if (response.status !== HTTP_STATUS.OK && response.status !== HTTP_STATUS.CREATED) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Report execution failed for ${request.reportUri}`
        );
      }

      // Handle response based on format
      return this._processExecutionResponse(response, formatInfo, request);
    } catch (error) {
      if (error.name === 'APIError') {
        throw error;
      }

      throw this.errorHandler.createInternalError(`Report execution failed: ${error.message}`, {
        executionId,
        reportUri: request.reportUri,
        outputFormat: request.outputFormat,
        originalError: error.message,
      });
    }
  }

  /**
   * Process execution response and extract content
   * @private
   */
  _processExecutionResponse(response, formatInfo, request) {
    const contentType = response.headers['content-type'] || formatInfo.mimeType;
    let content = response.data;

    // Handle binary content
    if (formatInfo.binary && content instanceof ArrayBuffer) {
      content = Buffer.from(content);
    } else if (formatInfo.binary && typeof content === 'string') {
      // Convert base64 string to buffer if needed
      content = Buffer.from(content, 'base64');
    } else if (!formatInfo.binary && content instanceof ArrayBuffer) {
      // Convert buffer to string for text formats
      content = Buffer.from(content).toString('utf8');
    }

    // Validate content size
    const contentSize = Buffer.isBuffer(content)
      ? content.length
      : Buffer.byteLength(content, 'utf8');
    if (contentSize > EXECUTION_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      throw this.errorHandler.createValidationError(
        'fileSize',
        `Generated file size (${contentSize} bytes) exceeds maximum allowed size (${EXECUTION_CONSTANTS.MAX_FILE_SIZE_BYTES} bytes)`,
        contentSize,
        `<= ${EXECUTION_CONSTANTS.MAX_FILE_SIZE_BYTES}`
      );
    }

    // Generate filename
    const reportName = request.reportUri.split('/').pop() || 'report';
    const fileName = `${reportName}.${formatInfo.extension}`;

    return {
      content,
      contentType,
      fileName,
      fileSize: contentSize,
    };
  }

  /**
   * Transform parameters for JasperReports API
   * @private
   */
  _transformParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      return {};
    }

    const transformed = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Handle different parameter types
      if (Array.isArray(value)) {
        // Multi-value parameters
        transformed[key] = value.map(v => String(v));
      } else if (value instanceof Date) {
        // Date parameters
        transformed[key] = value.toISOString();
      } else if (typeof value === 'object') {
        // Complex parameters (convert to JSON string)
        transformed[key] = JSON.stringify(value);
      } else {
        // Simple parameters
        transformed[key] = String(value);
      }
    }

    return transformed;
  }

  /**
   * Validate page range specification
   * @private
   */
  _validatePageRange(pages) {
    if (typeof pages !== 'string') {
      throw this.errorHandler.createValidationError(
        'pages',
        'Page range must be a string',
        pages,
        'string'
      );
    }

    // Validate page range format (e.g., "1-5", "1,3,5", "1-3,7-10")
    const pageRangeRegex = /^(\d+(-\d+)?(,\d+(-\d+)?)*)$/;
    if (!pageRangeRegex.test(pages)) {
      throw this.errorHandler.createValidationError(
        'pages',
        'Invalid page range format. Use formats like "1-5", "1,3,5", or "1-3,7-10"',
        pages,
        'valid page range format'
      );
    }

    // Validate individual page numbers and ranges
    const parts = pages.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (start >= end) {
          throw this.errorHandler.createValidationError(
            'pages',
            `Invalid page range: start page (${start}) must be less than end page (${end})`,
            part,
            'valid page range'
          );
        }
      }
    }
  }

  /**
   * Get format information for output format
   * @private
   */
  _getFormatInfo(outputFormat) {
    if (!outputFormat) {
      return OUTPUT_FORMATS.PDF;
    }

    const format = outputFormat.toUpperCase();
    return OUTPUT_FORMATS[format] || null;
  }

  /**
   * Generate unique execution ID
   * @private
   */
  _generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track active execution
   * @private
   */
  _trackExecution(executionId, request, startTime) {
    this.activeExecutions.set(executionId, {
      executionId,
      reportUri: request.reportUri,
      outputFormat: request.outputFormat,
      startTime,
      status: 'running',
    });
  }

  /**
   * Update execution statistics
   * @private
   */
  _updateExecutionStats(outputFormat, executionTime, fileSize, success) {
    this.executionStats.totalExecutions++;
    this.executionStats.totalExecutionTime += executionTime;
    this.executionStats.averageExecutionTime =
      this.executionStats.totalExecutionTime / this.executionStats.totalExecutions;

    if (success) {
      this.executionStats.successfulExecutions++;
    } else {
      this.executionStats.failedExecutions++;
    }

    // Update format-specific statistics
    const format = outputFormat ? outputFormat.toLowerCase() : 'pdf';
    if (this.executionStats.formatStats[format]) {
      const formatStats = this.executionStats.formatStats[format];
      formatStats.executions++;
      formatStats.totalTime += executionTime;
      formatStats.averageTime = formatStats.totalTime / formatStats.executions;

      if (success && fileSize > 0) {
        formatStats.totalSize += fileSize;
        formatStats.averageSize = formatStats.totalSize / formatStats.executions;
      }
    }
  }

  /**
   * Add execution to history
   * @private
   */
  _addToExecutionHistory(executionId, request, response, executionTime, error = null) {
    const historyEntry = {
      executionId,
      reportUri: request.reportUri,
      outputFormat: request.outputFormat,
      parameters: request.parameters,
      executionTime,
      timestamp: new Date().toISOString(),
      success: !error,
      error: error ? error.message : null,
      fileSize: response ? response.fileSize : 0,
    };

    this.executionHistory.unshift(historyEntry);

    // Keep only last 100 executions in memory
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }
  }

  /**
   * Get list of supported output formats
   * @returns {Array} Array of supported format information
   */
  getSupportedFormats() {
    return Object.entries(OUTPUT_FORMATS).map(([key, info]) => ({
      format: info.format,
      name: key,
      mimeType: info.mimeType,
      extension: info.extension,
      binary: info.binary,
    }));
  }

  /**
   * Get active executions
   * @returns {Array} Array of currently active executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution statistics
   * @returns {object} Execution statistics and performance metrics
   */
  getExecutionStatistics() {
    return {
      ...this.executionStats,
      activeExecutions: this.activeExecutions.size,
      recentExecutions: this.executionHistory.slice(0, 10),
    };
  }

  /**
   * Get execution history
   * @param {number} limit - Maximum number of history entries to return
   * @returns {Array} Array of execution history entries
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Clear execution history and statistics
   */
  clearExecutionHistory() {
    this.executionHistory = [];
    this.executionStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      formatStats: {},
    };

    // Reinitialize format statistics
    Object.keys(OUTPUT_FORMATS).forEach(format => {
      this.executionStats.formatStats[format.toLowerCase()] = {
        executions: 0,
        totalTime: 0,
        averageTime: 0,
        totalSize: 0,
        averageSize: 0,
      };
    });

    if (this.config.debugMode) {
      console.log('[Report Service] Execution history and statistics cleared');
    }
  }

  /**
   * Cancel active execution (if possible)
   * @param {string} executionId - Execution ID to cancel
   * @returns {boolean} True if cancellation was attempted
   */
  cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    // For synchronous executions, we can't really cancel them once started
    // This method is here for interface compatibility
    if (this.config.debugMode) {
      console.log(
        `[Report Service] Cancellation requested for execution ${executionId} (synchronous executions cannot be cancelled)`
      );
    }

    return false;
  }

  /**
   * Validate report exists and is accessible
   * @param {string} reportUri - Report URI to validate
   * @returns {Promise<object>} Validation result
   */
  async validateReport(reportUri) {
    try {
      Validator.validateResourceURI(reportUri);

      // Try to get report metadata
      const response = await this.apiClient.get(`/rest_v2/resources${reportUri}`);

      if (response.status === HTTP_STATUS.OK) {
        const resource = response.data;

        if (resource.resourceType !== 'reportUnit') {
          return {
            valid: false,
            error: `Resource at ${reportUri} is not a report (type: ${resource.resourceType})`,
          };
        }

        return {
          valid: true,
          resource,
          message: 'Report is valid and accessible',
        };
      }

      return {
        valid: false,
        error: `Report not found or not accessible: ${reportUri}`,
      };
    } catch (error) {
      this.errorHandler.logError(error, 'Report validation', { reportUri });

      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Get report metadata including available parameters
   * @param {string} reportUri - Report URI
   * @returns {Promise<object>} Report metadata
   */
  async getReportMetadata(reportUri) {
    try {
      Validator.validateResourceURI(reportUri);

      // Get basic resource information
      const resourceResponse = await this.apiClient.get(`/rest_v2/resources${reportUri}`);

      if (resourceResponse.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(
          resourceResponse.status,
          resourceResponse.data,
          `Failed to get report metadata for ${reportUri}`
        );
      }

      const resource = resourceResponse.data;

      // Get input controls (parameters)
      let inputControls = [];
      try {
        const controlsResponse = await this.apiClient.get(
          `/rest_v2/reports${reportUri}/inputControls`
        );
        if (controlsResponse.status === HTTP_STATUS.OK) {
          inputControls = controlsResponse.data.inputControl || [];
        }
      } catch (error) {
        // Input controls might not be available, continue without them
        if (this.config.debugMode) {
          console.log(
            `[Report Service] Could not retrieve input controls for ${reportUri}: ${error.message}`
          );
        }
      }

      return {
        uri: resource.uri,
        label: resource.label,
        description: resource.description,
        resourceType: resource.resourceType,
        creationDate: resource.creationDate,
        updateDate: resource.updateDate,
        version: resource.version,
        inputControls,
        supportedFormats: this.getSupportedFormats(),
      };
    } catch (error) {
      this.errorHandler.logError(error, 'Get report metadata', { reportUri });
      throw error;
    }
  }

  /**
   * Dispose of the report service and clean up resources
   */
  dispose() {
    this.activeExecutions.clear();
    this.executionHistory = [];

    if (this.config.debugMode) {
      console.log('[Report Service] Service disposed');
    }
  }
}

export default ReportService;
export { OUTPUT_FORMATS, EXECUTION_CONSTANTS, DEFAULT_EXECUTION_PARAMS };
