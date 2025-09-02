/**
 * Asynchronous Execution Service for JasperReports MCP Server
 *
 * This service handles asynchronous report execution management with support for:
 * - Execution request creation with unique ID generation
 * - Status polling and execution tracking
 * - Result retrieval with export ID handling
 * - Execution cancellation functionality
 *
 * Features:
 * - Comprehensive async execution lifecycle management
 * - Export tracking and result retrieval
 * - Execution status monitoring and polling
 * - Cancellation support with cleanup
 * - Error handling with detailed context
 * - Performance metrics and execution history
 */

import APIClient, { HTTP_STATUS } from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  ReportExecutionRequest,
  ExecutionStatusRequest,
  ExecutionResultRequest,
  ExecutionCancelRequest,
} from '../models/requests.js';
import {
  ReportExecutionResponse,
  ExecutionStatusResponse,
  ExecutionResultResponse,
  ExecutionCancelResponse,
  ExportInfo,
} from '../models/responses.js';

/**
 * Execution status constants
 */
const EXECUTION_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  READY: 'ready',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

/**
 * Export status constants
 */
const EXPORT_STATUS = {
  READY: 'ready',
  RUNNING: 'running',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

/**
 * Supported output formats for async execution
 */
const ASYNC_OUTPUT_FORMATS = {
  PDF: 'pdf',
  HTML: 'html',
  XLSX: 'xlsx',
  XLS: 'xls',
  CSV: 'csv',
  RTF: 'rtf',
  DOCX: 'docx',
  ODT: 'odt',
  ODS: 'ods',
  XML: 'xml',
  JSON: 'json',
};

/**
 * Default execution parameters for async operations
 */
const DEFAULT_ASYNC_PARAMS = {
  outputFormat: 'pdf',
  locale: 'en_US',
  timezone: 'America/New_York',
  async: true,
  parameters: {},
  freshData: false,
  saveDataSnapshot: false,
  ignorePagination: false,
};

/**
 * Execution service constants
 */
const EXECUTION_CONSTANTS = {
  MAX_EXECUTION_TIME_MS: 1800000, // 30 minutes for async
  MAX_POLL_ATTEMPTS: 360, // 30 minutes with 5-second intervals
  POLL_INTERVAL_MS: 5000, // 5 seconds
  DEFAULT_TIMEOUT_MS: 300000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  MAX_CONCURRENT_EXECUTIONS: 10,
};

/**
 * Asynchronous Execution Service class
 */
class ExecutionService {
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
      cancelledExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      formatStats: {},
      statusStats: {},
    };

    this._initializeService();
  }

  /**
   * Initialize the execution service
   * @private
   */
  _initializeService() {
    // Initialize format statistics
    Object.values(ASYNC_OUTPUT_FORMATS).forEach(format => {
      this.executionStats.formatStats[format] = {
        executions: 0,
        totalTime: 0,
        averageTime: 0,
        successRate: 0,
      };
    });

    // Initialize status statistics
    Object.values(EXECUTION_STATUS).forEach(status => {
      this.executionStats.statusStats[status] = 0;
    });

    if (this.config.debugMode) {
      console.log('[Execution Service] Initializing async execution service', {
        supportedFormats: Object.values(ASYNC_OUTPUT_FORMATS),
        maxExecutionTime: EXECUTION_CONSTANTS.MAX_EXECUTION_TIME_MS,
        maxConcurrentExecutions: EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS,
        pollInterval: EXECUTION_CONSTANTS.POLL_INTERVAL_MS,
      });
    }
  }

  /**
   * Start asynchronous report execution
   * @param {object} executionRequest - Report execution request parameters
   * @returns {Promise<object>} Execution request result with execution ID
   */
  async startAsyncExecution(executionRequest) {
    const startTime = Date.now();

    try {
      // Check concurrent execution limit
      if (this.activeExecutions.size >= EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS) {
        throw this.errorHandler.createValidationError(
          'concurrentExecutions',
          `Maximum concurrent executions limit reached (${EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS})`,
          this.activeExecutions.size,
          `<= ${EXECUTION_CONSTANTS.MAX_CONCURRENT_EXECUTIONS}`
        );
      }

      // Validate input parameters
      const validatedRequest = this._validateAsyncExecutionRequest(executionRequest);

      if (this.config.debugMode) {
        console.log('[Execution Service] Starting async execution', {
          reportUri: validatedRequest.reportUri,
          outputFormat: validatedRequest.outputFormat,
          parametersCount: Object.keys(validatedRequest.parameters).length,
        });
      }

      // Execute the report asynchronously
      const executionResult = await this._executeReportAsync(validatedRequest);

      // Track active execution
      this._trackAsyncExecution(executionResult.executionId, validatedRequest, startTime);

      // Update statistics
      this._updateExecutionStats(validatedRequest.outputFormat, 0, EXECUTION_STATUS.QUEUED);

      // Create response
      const response = new ReportExecutionResponse({
        success: true,
        executionId: executionResult.executionId,
        status: executionResult.status,
        outputFormat: validatedRequest.outputFormat,
        reportUri: validatedRequest.reportUri,
        requestId: validatedRequest.requestId,
        exports: executionResult.exports || [],
        currentPage: executionResult.currentPage,
        totalPages: executionResult.totalPages,
      });

      if (this.config.debugMode) {
        console.log('[Execution Service] Async execution started', {
          executionId: executionResult.executionId,
          status: executionResult.status,
          outputFormat: validatedRequest.outputFormat,
        });
      }

      return response;
    } catch (error) {
      // Update failure statistics
      this._updateExecutionStats(
        executionRequest.outputFormat || 'pdf',
        0,
        EXECUTION_STATUS.FAILED
      );

      // Log error with context
      this.errorHandler.logError(error, 'Async execution start', {
        reportUri: executionRequest.reportUri,
        outputFormat: executionRequest.outputFormat,
      });

      throw error;
    }
  }

  /**
   * Get execution status and progress
   * @param {object} statusRequest - Status request parameters
   * @returns {Promise<object>} Execution status information
   */
  async getExecutionStatus(statusRequest) {
    try {
      // Validate input parameters
      const validatedRequest = this._validateStatusRequest(statusRequest);

      if (this.config.debugMode) {
        console.log('[Execution Service] Getting execution status', {
          executionId: validatedRequest.executionId,
        });
      }

      // Get status from JasperReports Server
      const statusResult = await this._getExecutionStatusFromServer(validatedRequest.executionId);

      // Update local tracking
      this._updateExecutionTracking(validatedRequest.executionId, statusResult);

      // Create response
      const response = new ExecutionStatusResponse({
        success: true,
        executionId: validatedRequest.executionId,
        status: statusResult.status,
        progress: statusResult.progress || 0,
        currentPage: statusResult.currentPage,
        totalPages: statusResult.totalPages,
        exports: statusResult.exports || [],
        errorDescriptor: statusResult.errorDescriptor,
        startTime: statusResult.startTime,
        endTime: statusResult.endTime,
        requestId: validatedRequest.requestId,
      });

      if (this.config.debugMode) {
        console.log('[Execution Service] Execution status retrieved', {
          executionId: validatedRequest.executionId,
          status: statusResult.status,
          progress: statusResult.progress,
        });
      }

      return response;
    } catch (error) {
      this.errorHandler.logError(error, 'Get execution status', {
        executionId: statusRequest.executionId,
      });

      throw error;
    }
  }

  /**
   * Retrieve execution result by export ID
   * @param {object} resultRequest - Result request parameters
   * @returns {Promise<object>} Execution result with content
   */
  async getExecutionResult(resultRequest) {
    try {
      // Validate input parameters
      const validatedRequest = this._validateResultRequest(resultRequest);

      if (this.config.debugMode) {
        console.log('[Execution Service] Getting execution result', {
          executionId: validatedRequest.executionId,
          exportId: validatedRequest.exportId,
        });
      }

      // Get result from JasperReports Server
      const resultData = await this._getExecutionResultFromServer(
        validatedRequest.executionId,
        validatedRequest.exportId,
        validatedRequest.attachmentName
      );

      // Update execution tracking
      const execution = this.activeExecutions.get(validatedRequest.executionId);
      if (execution) {
        execution.lastResultRetrieved = new Date().toISOString();
        execution.resultSize = resultData.fileSize;
      }

      // Create response
      const response = new ExecutionResultResponse({
        success: true,
        executionId: validatedRequest.executionId,
        exportId: validatedRequest.exportId,
        outputFormat: resultData.outputFormat,
        content: resultData.content,
        contentType: resultData.contentType,
        fileName: resultData.fileName,
        fileSize: resultData.fileSize,
        attachmentName: validatedRequest.attachmentName,
        requestId: validatedRequest.requestId,
      });

      if (this.config.debugMode) {
        console.log('[Execution Service] Execution result retrieved', {
          executionId: validatedRequest.executionId,
          exportId: validatedRequest.exportId,
          fileSize: resultData.fileSize,
        });
      }

      return response;
    } catch (error) {
      this.errorHandler.logError(error, 'Get execution result', {
        executionId: resultRequest.executionId,
        exportId: resultRequest.exportId,
      });

      throw error;
    }
  }

  /**
   * Cancel running execution
   * @param {object} cancelRequest - Cancel request parameters
   * @returns {Promise<object>} Cancellation result
   */
  async cancelExecution(cancelRequest) {
    try {
      // Validate input parameters
      const validatedRequest = this._validateCancelRequest(cancelRequest);

      if (this.config.debugMode) {
        console.log('[Execution Service] Cancelling execution', {
          executionId: validatedRequest.executionId,
          force: validatedRequest.force,
        });
      }

      // Cancel execution on JasperReports Server
      const cancelResult = await this._cancelExecutionOnServer(
        validatedRequest.executionId,
        validatedRequest.force
      );

      // Update local tracking
      const execution = this.activeExecutions.get(validatedRequest.executionId);
      if (execution) {
        execution.status = EXECUTION_STATUS.CANCELLED;
        execution.endTime = new Date().toISOString();
        execution.cancelled = true;
      }

      // Update statistics
      this._updateExecutionStats(
        execution?.outputFormat || 'pdf',
        execution ? Date.now() - new Date(execution.startTime).getTime() : 0,
        EXECUTION_STATUS.CANCELLED
      );

      // Remove from active executions
      this.activeExecutions.delete(validatedRequest.executionId);

      // Create response
      const response = new ExecutionCancelResponse({
        success: true,
        executionId: validatedRequest.executionId,
        cancelled: cancelResult.cancelled,
        cancelTimestamp: new Date().toISOString(),
        finalStatus: cancelResult.finalStatus || EXECUTION_STATUS.CANCELLED,
        requestId: validatedRequest.requestId,
      });

      if (this.config.debugMode) {
        console.log('[Execution Service] Execution cancelled', {
          executionId: validatedRequest.executionId,
          cancelled: cancelResult.cancelled,
          finalStatus: cancelResult.finalStatus,
        });
      }

      return response;
    } catch (error) {
      this.errorHandler.logError(error, 'Cancel execution', {
        executionId: cancelRequest.executionId,
      });

      throw error;
    }
  }

  /**
   * Poll execution until completion or timeout
   * @param {string} executionId - Execution ID to poll
   * @param {object} options - Polling options
   * @returns {Promise<object>} Final execution status
   */
  async pollExecutionUntilComplete(executionId, options = {}) {
    const {
      maxAttempts = EXECUTION_CONSTANTS.MAX_POLL_ATTEMPTS,
      pollInterval = EXECUTION_CONSTANTS.POLL_INTERVAL_MS,
      onProgress = null,
    } = options;

    let attempts = 0;

    if (this.config.debugMode) {
      console.log('[Execution Service] Starting execution polling', {
        executionId,
        maxAttempts,
        pollInterval,
      });
    }

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await this.getExecutionStatus({ executionId });

        // Call progress callback if provided
        if (onProgress && typeof onProgress === 'function') {
          onProgress(statusResponse);
        }

        // Check if execution is complete
        if (this._isExecutionComplete(statusResponse.status)) {
          if (this.config.debugMode) {
            console.log('[Execution Service] Execution polling completed', {
              executionId,
              finalStatus: statusResponse.status,
              attempts: attempts + 1,
            });
          }
          return statusResponse;
        }

        // Wait before next poll
        await this._sleep(pollInterval);
        attempts++;
      } catch (error) {
        if (this.config.debugMode) {
          console.log('[Execution Service] Polling error, retrying', {
            executionId,
            attempt: attempts + 1,
            error: error.message,
          });
        }

        // If it's a not found error, the execution might have been cleaned up
        if (error.type === 'ResourceNotFound') {
          return {
            executionId,
            status: EXECUTION_STATUS.FAILED,
            error: 'Execution not found - may have been cleaned up',
          };
        }

        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }

        await this._sleep(pollInterval);
      }
    }

    // Timeout reached
    throw this.errorHandler.createTimeoutError(
      `Execution polling for ${executionId}`,
      maxAttempts * pollInterval
    );
  }

  /**
   * Validate async execution request
   * @private
   */
  _validateAsyncExecutionRequest(request) {
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
      ...DEFAULT_ASYNC_PARAMS,
      ...request,
      async: true, // Force async mode
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate output format
    if (
      !Object.values(ASYNC_OUTPUT_FORMATS).includes(normalizedRequest.outputFormat.toLowerCase())
    ) {
      throw this.errorHandler.createValidationError(
        'outputFormat',
        `Unsupported async output format: ${normalizedRequest.outputFormat}`,
        normalizedRequest.outputFormat,
        `one of: ${Object.values(ASYNC_OUTPUT_FORMATS).join(', ')}`
      );
    }

    // Validate resource URI
    Validator.validateResourceURI(normalizedRequest.reportUri);

    return normalizedRequest;
  }

  /**
   * Validate status request
   * @private
   */
  _validateStatusRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Status request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new ExecutionStatusRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    if (!normalizedRequest.executionId) {
      throw this.errorHandler.createValidationError(
        'executionId',
        'Execution ID is required',
        normalizedRequest.executionId,
        'non-empty string'
      );
    }

    return normalizedRequest;
  }

  /**
   * Validate result request
   * @private
   */
  _validateResultRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Result request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new ExecutionResultRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    if (!normalizedRequest.executionId) {
      throw this.errorHandler.createValidationError(
        'executionId',
        'Execution ID is required',
        normalizedRequest.executionId,
        'non-empty string'
      );
    }

    if (!normalizedRequest.exportId) {
      throw this.errorHandler.createValidationError(
        'exportId',
        'Export ID is required',
        normalizedRequest.exportId,
        'non-empty string'
      );
    }

    return normalizedRequest;
  }

  /**
   * Validate cancel request
   * @private
   */
  _validateCancelRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Cancel request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new ExecutionCancelRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    if (!normalizedRequest.executionId) {
      throw this.errorHandler.createValidationError(
        'executionId',
        'Execution ID is required',
        normalizedRequest.executionId,
        'non-empty string'
      );
    }

    return normalizedRequest;
  }
  /**
   * Execute report asynchronously via JasperReports REST API
   * @private
   */
  async _executeReportAsync(request) {
    // Prepare execution request body
    const executionBody = {
      reportUnitUri: request.reportUri,
      outputFormat: request.outputFormat.toLowerCase(),
      parameters: this._transformParameters(request.parameters),
      async: true,
      freshData: request.freshData || false,
      saveDataSnapshot: request.saveDataSnapshot || false,
      ignorePagination: request.ignorePagination || false,
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
      });

      if (response.status !== HTTP_STATUS.OK && response.status !== HTTP_STATUS.CREATED) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Async report execution failed for ${request.reportUri}`
        );
      }

      // Extract execution information from response
      const executionData = response.data;

      return {
        executionId: executionData.requestId,
        status: executionData.status || EXECUTION_STATUS.QUEUED,
        currentPage: executionData.currentPage,
        totalPages: executionData.totalPages,
        exports: this._parseExports(executionData.exports),
      };
    } catch (error) {
      if (error.name === 'APIError') {
        throw error;
      }

      throw this.errorHandler.createInternalError(
        `Async report execution failed: ${error.message}`,
        {
          reportUri: request.reportUri,
          outputFormat: request.outputFormat,
          originalError: error.message,
        }
      );
    }
  }

  /**
   * Get execution status from JasperReports Server
   * @private
   */
  async _getExecutionStatusFromServer(executionId) {
    try {
      const response = await this.apiClient.get(`/rest_v2/reportExecutions/${executionId}/status`);

      if (response.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to get execution status for ${executionId}`
        );
      }

      const statusData = response.data;

      return {
        status: statusData.value || EXECUTION_STATUS.RUNNING,
        progress: statusData.progress || 0,
        currentPage: statusData.currentPage,
        totalPages: statusData.totalPages,
        exports: this._parseExports(statusData.exports),
        errorDescriptor: statusData.errorDescriptor,
        startTime: statusData.startTime,
        endTime: statusData.endTime,
      };
    } catch (error) {
      if (error.name === 'APIError') {
        throw error;
      }

      throw this.errorHandler.createInternalError(
        `Failed to get execution status: ${error.message}`,
        {
          executionId,
          originalError: error.message,
        }
      );
    }
  }

  /**
   * Get execution result from JasperReports Server
   * @private
   */
  async _getExecutionResultFromServer(executionId, exportId, attachmentName = null) {
    try {
      let url = `/rest_v2/reportExecutions/${executionId}/exports/${exportId}`;

      // Add attachment name if specified
      if (attachmentName) {
        url += `/attachments/${attachmentName}`;
      } else {
        url += '/outputResource';
      }

      const response = await this.apiClient.get(url, {
        responseType: 'arraybuffer', // Handle binary content
        timeout: EXECUTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
      });

      if (response.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to get execution result for ${executionId}/${exportId}`
        );
      }

      // Determine content type and format
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const outputFormat = this._determineOutputFormat(contentType, exportId);

      // Handle content based on type
      let content = response.data;
      if (content instanceof ArrayBuffer) {
        content = Buffer.from(content);
      }

      // Generate filename
      const fileName = this._generateResultFileName(
        executionId,
        exportId,
        outputFormat,
        attachmentName
      );

      return {
        outputFormat,
        content,
        contentType,
        fileName,
        fileSize: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf8'),
      };
    } catch (error) {
      if (error.name === 'APIError') {
        throw error;
      }

      throw this.errorHandler.createInternalError(
        `Failed to get execution result: ${error.message}`,
        {
          executionId,
          exportId,
          attachmentName,
          originalError: error.message,
        }
      );
    }
  }

  /**
   * Cancel execution on JasperReports Server
   * @private
   */
  async _cancelExecutionOnServer(executionId, force = false) {
    try {
      const url = `/rest_v2/reportExecutions/${executionId}/status`;
      const cancelData = { value: EXECUTION_STATUS.CANCELLED };

      const response = await this.apiClient.put(url, cancelData, {
        timeout: EXECUTION_CONSTANTS.DEFAULT_TIMEOUT_MS,
      });

      if (response.status !== HTTP_STATUS.OK && response.status !== HTTP_STATUS.NO_CONTENT) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to cancel execution ${executionId}`
        );
      }

      return {
        cancelled: true,
        finalStatus: EXECUTION_STATUS.CANCELLED,
      };
    } catch (error) {
      if (error.name === 'APIError') {
        // If cancellation fails but execution is already complete, that's OK
        if (error.statusCode === HTTP_STATUS.NOT_FOUND) {
          return {
            cancelled: false,
            finalStatus: EXECUTION_STATUS.READY,
            message: 'Execution already completed or not found',
          };
        }
        throw error;
      }

      throw this.errorHandler.createInternalError(`Failed to cancel execution: ${error.message}`, {
        executionId,
        force,
        originalError: error.message,
      });
    }
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
   * Parse exports from JasperReports response
   * @private
   */
  _parseExports(exports) {
    if (!exports || !Array.isArray(exports)) {
      return [];
    }

    return exports.map(
      exportData =>
        new ExportInfo({
          id: exportData.id,
          status: exportData.status || EXPORT_STATUS.READY,
          outputFormat: exportData.outputFormat,
          pages: exportData.pages,
          attachmentsPrefix: exportData.attachmentsPrefix,
          outputResource: exportData.outputResource,
        })
    );
  }

  /**
   * Determine output format from content type and export ID
   * @private
   */
  _determineOutputFormat(contentType, exportId) {
    // Try to determine from content type
    const contentTypeMap = {
      'application/pdf': 'pdf',
      'text/html': 'html',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'text/csv': 'csv',
      'application/rtf': 'rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.oasis.opendocument.text': 'odt',
      'application/vnd.oasis.opendocument.spreadsheet': 'ods',
      'application/xml': 'xml',
      'application/json': 'json',
    };

    if (contentTypeMap[contentType]) {
      return contentTypeMap[contentType];
    }

    // Try to determine from export ID (usually contains format)
    const exportIdLower = exportId.toLowerCase();
    for (const format of Object.values(ASYNC_OUTPUT_FORMATS)) {
      if (exportIdLower.includes(format)) {
        return format;
      }
    }

    // Default to pdf
    return 'pdf';
  }

  /**
   * Generate result filename
   * @private
   */
  _generateResultFileName(executionId, exportId, outputFormat, attachmentName) {
    if (attachmentName) {
      return attachmentName;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `execution_${executionId}_${exportId}_${timestamp}.${outputFormat}`;
  }

  /**
   * Check if execution status indicates completion
   * @private
   */
  _isExecutionComplete(status) {
    return [EXECUTION_STATUS.READY, EXECUTION_STATUS.CANCELLED, EXECUTION_STATUS.FAILED].includes(
      status
    );
  }

  /**
   * Sleep for specified milliseconds
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Track async execution
   * @private
   */
  _trackAsyncExecution(executionId, request, startTime) {
    this.activeExecutions.set(executionId, {
      executionId,
      reportUri: request.reportUri,
      outputFormat: request.outputFormat,
      parameters: request.parameters,
      startTime: new Date(startTime).toISOString(),
      status: EXECUTION_STATUS.QUEUED,
      requestId: request.requestId,
      cancelled: false,
    });
  }

  /**
   * Update execution tracking with new status
   * @private
   */
  _updateExecutionTracking(executionId, statusResult) {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = statusResult.status;
      execution.progress = statusResult.progress;
      execution.currentPage = statusResult.currentPage;
      execution.totalPages = statusResult.totalPages;
      execution.exports = statusResult.exports;
      execution.lastStatusCheck = new Date().toISOString();

      // If execution is complete, set end time and move to history
      if (this._isExecutionComplete(statusResult.status)) {
        execution.endTime = statusResult.endTime || new Date().toISOString();

        // Calculate execution time
        const executionTime =
          new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();
        execution.executionTime = executionTime;

        // Update statistics
        this._updateExecutionStats(execution.outputFormat, executionTime, statusResult.status);

        // Add to history
        this._addToExecutionHistory(execution);

        // Remove from active executions
        this.activeExecutions.delete(executionId);
      }
    }
  }

  /**
   * Update execution statistics
   * @private
   */
  _updateExecutionStats(outputFormat, executionTime, status) {
    this.executionStats.totalExecutions++;

    if (executionTime > 0) {
      this.executionStats.totalExecutionTime += executionTime;
      this.executionStats.averageExecutionTime =
        this.executionStats.totalExecutionTime / this.executionStats.totalExecutions;
    }

    // Update status statistics
    if (this.executionStats.statusStats[status] !== undefined) {
      this.executionStats.statusStats[status]++;
    }

    // Update success/failure counts
    switch (status) {
      case EXECUTION_STATUS.READY:
        this.executionStats.successfulExecutions++;
        break;
      case EXECUTION_STATUS.FAILED:
        this.executionStats.failedExecutions++;
        break;
      case EXECUTION_STATUS.CANCELLED:
        this.executionStats.cancelledExecutions++;
        break;
    }

    // Update format-specific statistics
    const format = outputFormat ? outputFormat.toLowerCase() : 'pdf';
    if (this.executionStats.formatStats[format]) {
      const formatStats = this.executionStats.formatStats[format];
      formatStats.executions++;

      if (executionTime > 0) {
        formatStats.totalTime += executionTime;
        formatStats.averageTime = formatStats.totalTime / formatStats.executions;
      }

      // Calculate success rate
      const successCount = status === EXECUTION_STATUS.READY ? 1 : 0;
      formatStats.successRate =
        (formatStats.successRate * (formatStats.executions - 1) + successCount) /
        formatStats.executions;
    }
  }

  /**
   * Add execution to history
   * @private
   */
  _addToExecutionHistory(execution) {
    const historyEntry = {
      ...execution,
      completedAt: new Date().toISOString(),
    };

    this.executionHistory.unshift(historyEntry);

    // Keep only last 100 executions in memory
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }
  }

  /**
   * Get list of supported async output formats
   * @returns {Array} Array of supported format information
   */
  getSupportedAsyncFormats() {
    return Object.entries(ASYNC_OUTPUT_FORMATS).map(([key, value]) => ({
      name: key,
      format: value,
      async: true,
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
      cancelledExecutions: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      formatStats: {},
      statusStats: {},
    };

    // Reinitialize statistics
    Object.values(ASYNC_OUTPUT_FORMATS).forEach(format => {
      this.executionStats.formatStats[format] = {
        executions: 0,
        totalTime: 0,
        averageTime: 0,
        successRate: 0,
      };
    });

    Object.values(EXECUTION_STATUS).forEach(status => {
      this.executionStats.statusStats[status] = 0;
    });

    if (this.config.debugMode) {
      console.log('[Execution Service] Execution history and statistics cleared');
    }
  }

  /**
   * Get execution by ID (from active or history)
   * @param {string} executionId - Execution ID to find
   * @returns {object|null} Execution information or null if not found
   */
  getExecution(executionId) {
    // Check active executions first
    const activeExecution = this.activeExecutions.get(executionId);
    if (activeExecution) {
      return activeExecution;
    }

    // Check execution history
    const historyExecution = this.executionHistory.find(exec => exec.executionId === executionId);
    return historyExecution || null;
  }

  /**
   * Cleanup completed executions older than specified time
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of executions cleaned up
   */
  cleanupOldExecutions(maxAgeMs = 24 * 60 * 60 * 1000) {
    // Default: 24 hours
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    const initialCount = this.executionHistory.length;

    this.executionHistory = this.executionHistory.filter(execution => {
      const completedAt = new Date(execution.completedAt || execution.endTime);
      return completedAt > cutoffTime;
    });

    const cleanedCount = initialCount - this.executionHistory.length;

    if (this.config.debugMode && cleanedCount > 0) {
      console.log(`[Execution Service] Cleaned up ${cleanedCount} old executions`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of the execution service and clean up resources
   */
  dispose() {
    // Cancel all active executions
    const activeExecutionIds = Array.from(this.activeExecutions.keys());

    if (activeExecutionIds.length > 0 && this.config.debugMode) {
      console.log(
        `[Execution Service] Disposing service with ${activeExecutionIds.length} active executions`
      );
    }

    // Clear all tracking data
    this.activeExecutions.clear();
    this.executionHistory = [];

    if (this.config.debugMode) {
      console.log('[Execution Service] Service disposed');
    }
  }
}

export default ExecutionService;
export {
  EXECUTION_STATUS,
  EXPORT_STATUS,
  ASYNC_OUTPUT_FORMATS,
  EXECUTION_CONSTANTS,
  DEFAULT_ASYNC_PARAMS,
};
