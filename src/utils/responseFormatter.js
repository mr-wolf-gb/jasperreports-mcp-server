/**
 * Response Formatter for JasperReports MCP Server
 *
 * This module provides standardized response formatting for all MCP tools,
 * ensuring consistent response structures, execution time tracking, and
 * proper metadata handling across all tool operations.
 *
 * Features:
 * - Standardized success/error response formats
 * - Execution time tracking for all operations
 * - Consistent metadata fields for collection responses
 * - Tool-specific response enhancement
 * - Error correlation and debugging support
 */

import { getConfiguration } from '../config/environment.js';

/**
 * Standard response metadata fields
 */
const STANDARD_METADATA_FIELDS = {
  SUCCESS: 'success',
  TOOL_NAME: 'toolName',
  EXECUTION_TIME: 'executionTime',
  TIMESTAMP: 'timestamp',
  CORRELATION_ID: 'correlationId',
};

/**
 * Collection response metadata fields
 */
const COLLECTION_METADATA_FIELDS = {
  TOTAL_COUNT: 'totalCount',
  OFFSET: 'offset',
  LIMIT: 'limit',
  HAS_MORE: 'hasMore',
  FILTERED_COUNT: 'filteredCount',
};

/**
 * Binary content metadata fields
 */
const BINARY_METADATA_FIELDS = {
  CONTENT_TYPE: 'contentType',
  FILE_NAME: 'fileName',
  FILE_SIZE: 'fileSize',
  ENCODING: 'encoding',
};

/**
 * Response Formatter class providing standardized response formatting
 */
class ResponseFormatter {
  constructor(config = null) {
    this.config = config || getConfiguration();
  }

  /**
   * Format successful tool response with standard metadata
   * @param {string} toolName - Name of the MCP tool
   * @param {any} data - Response data from the tool
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized success response
   */
  formatSuccess(toolName, data, executionTime, correlationId = null) {
    const response = {
      [STANDARD_METADATA_FIELDS.SUCCESS]: true,
      [STANDARD_METADATA_FIELDS.TOOL_NAME]: toolName,
      [STANDARD_METADATA_FIELDS.EXECUTION_TIME]: executionTime,
      [STANDARD_METADATA_FIELDS.TIMESTAMP]: new Date().toISOString(),
    };

    // Add correlation ID if provided
    if (correlationId) {
      response[STANDARD_METADATA_FIELDS.CORRELATION_ID] = correlationId;
    }

    // Merge data into response, handling different data types
    if (data !== null && data !== undefined) {
      if (typeof data === 'object' && !Array.isArray(data)) {
        // Merge object data, avoiding conflicts with standard fields
        Object.assign(response, this._sanitizeDataForMerge(data));
      } else {
        // For primitive types or arrays, wrap in a data field
        response.data = data;
      }
    }

    return response;
  }

  /**
   * Format error response with standard metadata and error details
   * @param {string} toolName - Name of the MCP tool
   * @param {Error|object} error - Error object or error details
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized error response
   */
  formatError(toolName, error, executionTime, correlationId = null) {
    const response = {
      [STANDARD_METADATA_FIELDS.SUCCESS]: false,
      [STANDARD_METADATA_FIELDS.TOOL_NAME]: toolName,
      [STANDARD_METADATA_FIELDS.EXECUTION_TIME]: executionTime,
      [STANDARD_METADATA_FIELDS.TIMESTAMP]: new Date().toISOString(),
      error: this._formatErrorDetails(error),
    };

    // Add correlation ID if provided
    if (correlationId) {
      response[STANDARD_METADATA_FIELDS.CORRELATION_ID] = correlationId;
    }

    return response;
  }

  /**
   * Format collection response with pagination metadata
   * @param {string} toolName - Name of the MCP tool
   * @param {Array} items - Collection items
   * @param {object} paginationInfo - Pagination information
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized collection response
   */
  formatCollection(toolName, items, paginationInfo = {}, executionTime, correlationId = null) {
    const {
      totalCount = items.length,
      offset = 0,
      limit = items.length,
      hasMore = false,
      filteredCount = null,
    } = paginationInfo;

    const response = this.formatSuccess(toolName, { items }, executionTime, correlationId);

    // Add collection metadata
    response[COLLECTION_METADATA_FIELDS.TOTAL_COUNT] = totalCount;
    response[COLLECTION_METADATA_FIELDS.OFFSET] = offset;
    response[COLLECTION_METADATA_FIELDS.LIMIT] = limit;
    response[COLLECTION_METADATA_FIELDS.HAS_MORE] = hasMore;

    // Add filtered count if different from total count
    if (filteredCount !== null && filteredCount !== totalCount) {
      response[COLLECTION_METADATA_FIELDS.FILTERED_COUNT] = filteredCount;
    }

    return response;
  }

  /**
   * Format binary content response with content metadata
   * @param {string} toolName - Name of the MCP tool
   * @param {Buffer|string} content - Binary content
   * @param {object} contentInfo - Content metadata
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized binary content response
   */
  formatBinaryContent(toolName, content, contentInfo = {}, executionTime, correlationId = null) {
    const {
      contentType = 'application/octet-stream',
      fileName = null,
      fileSize = null,
      encoding = null,
    } = contentInfo;

    const response = this.formatSuccess(toolName, { content }, executionTime, correlationId);

    // Add binary content metadata
    response[BINARY_METADATA_FIELDS.CONTENT_TYPE] = contentType;

    if (fileName) {
      response[BINARY_METADATA_FIELDS.FILE_NAME] = fileName;
    }

    if (fileSize !== null) {
      response[BINARY_METADATA_FIELDS.FILE_SIZE] = fileSize;
    }

    if (encoding) {
      response[BINARY_METADATA_FIELDS.ENCODING] = encoding;
    }

    return response;
  }

  /**
   * Format execution status response for async operations
   * @param {string} toolName - Name of the MCP tool
   * @param {string} executionId - Execution ID
   * @param {string} status - Current execution status
   * @param {object} statusInfo - Additional status information
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized execution status response
   */
  formatExecutionStatus(
    toolName,
    executionId,
    status,
    statusInfo = {},
    executionTime,
    correlationId = null
  ) {
    const response = this.formatSuccess(
      toolName,
      {
        executionId,
        status,
        ...statusInfo,
      },
      executionTime,
      correlationId
    );

    return response;
  }

  /**
   * Format health check response with component status
   * @param {string} toolName - Name of the MCP tool
   * @param {boolean} healthy - Overall health status
   * @param {object} components - Component health details
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Standardized health check response
   */
  formatHealthCheck(toolName, healthy, components = {}, executionTime, correlationId = null) {
    const response = this.formatSuccess(
      toolName,
      {
        healthy,
        components,
        checkTimestamp: new Date().toISOString(),
      },
      executionTime,
      correlationId
    );

    return response;
  }

  /**
   * Enhance existing response with standard metadata
   * @param {object} existingResponse - Existing response object
   * @param {string} toolName - Name of the MCP tool
   * @param {number} executionTime - Execution time in milliseconds
   * @param {string} correlationId - Optional correlation ID for tracking
   * @returns {object} Enhanced response with standard metadata
   */
  enhanceResponse(existingResponse, toolName, executionTime, correlationId = null) {
    const enhanced = {
      ...existingResponse,
      [STANDARD_METADATA_FIELDS.TOOL_NAME]: toolName,
      [STANDARD_METADATA_FIELDS.EXECUTION_TIME]: executionTime,
      [STANDARD_METADATA_FIELDS.TIMESTAMP]: new Date().toISOString(),
    };

    // Ensure success field is present
    if (enhanced[STANDARD_METADATA_FIELDS.SUCCESS] === undefined) {
      enhanced[STANDARD_METADATA_FIELDS.SUCCESS] = !enhanced.error;
    }

    // Add correlation ID if provided
    if (correlationId) {
      enhanced[STANDARD_METADATA_FIELDS.CORRELATION_ID] = correlationId;
    }

    return enhanced;
  }

  /**
   * Create execution timer for tracking tool execution time
   * @returns {object} Timer object with start time and stop method
   */
  createExecutionTimer() {
    const startTime = process.hrtime.bigint();

    return {
      startTime,
      stop() {
        const endTime = process.hrtime.bigint();
        const executionTimeNs = endTime - startTime;
        return Number(executionTimeNs) / 1000000; // Convert to milliseconds
      },
    };
  }

  /**
   * Wrap tool handler with automatic response formatting and timing
   * @param {string} toolName - Name of the MCP tool
   * @param {Function} handler - Original tool handler function
   * @param {object} options - Formatting options
   * @returns {Function} Wrapped handler with automatic formatting
   */
  wrapToolHandler(toolName, handler, options = {}) {
    const {
      formatAsCollection = false,
      formatAsBinary = false,
      formatAsExecutionStatus = false,
      formatAsHealthCheck = false,
      enhanceOnly = false,
    } = options;

    return async (params, correlationId = null) => {
      const timer = this.createExecutionTimer();

      try {
        const result = await handler(params);
        const executionTime = timer.stop();

        // Choose appropriate formatting method
        if (enhanceOnly) {
          return this.enhanceResponse(result, toolName, executionTime, correlationId);
        } else if (formatAsCollection) {
          const { items, ...paginationInfo } = result;
          return this.formatCollection(
            toolName,
            items,
            paginationInfo,
            executionTime,
            correlationId
          );
        } else if (formatAsBinary) {
          const { content, ...contentInfo } = result;
          return this.formatBinaryContent(
            toolName,
            content,
            contentInfo,
            executionTime,
            correlationId
          );
        } else if (formatAsExecutionStatus) {
          const { executionId, status, ...statusInfo } = result;
          return this.formatExecutionStatus(
            toolName,
            executionId,
            status,
            statusInfo,
            executionTime,
            correlationId
          );
        } else if (formatAsHealthCheck) {
          const { healthy, components } = result;
          return this.formatHealthCheck(
            toolName,
            healthy,
            components,
            executionTime,
            correlationId
          );
        } else {
          return this.formatSuccess(toolName, result, executionTime, correlationId);
        }
      } catch (error) {
        const executionTime = timer.stop();
        return this.formatError(toolName, error, executionTime, correlationId);
      }
    };
  }

  /**
   * Sanitize data object for merging, avoiding conflicts with standard fields
   * @private
   */
  _sanitizeDataForMerge(data) {
    const sanitized = { ...data };

    // Remove any fields that conflict with standard metadata fields
    const reservedFields = Object.values(STANDARD_METADATA_FIELDS);
    reservedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
        // Move conflicting field to a prefixed version
        sanitized[`original_${field}`] = sanitized[field];
        delete sanitized[field];
      }
    });

    return sanitized;
  }

  /**
   * Format error details for consistent error responses
   * @private
   */
  _formatErrorDetails(error) {
    if (!error) {
      return {
        type: 'UnknownError',
        message: 'An unknown error occurred',
      };
    }

    // Handle MCP Error objects
    if (error.type && error.message) {
      return {
        type: error.type,
        message: error.message,
        details: error.details || null,
        statusCode: error.statusCode || null,
        category: error.category || null,
      };
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return {
        type: error.name || 'Error',
        message: error.message,
        details: error.details || null,
        statusCode: error.statusCode || null,
        stack: this.config.debugMode ? error.stack : undefined,
      };
    }

    // Handle plain error objects
    if (typeof error === 'object') {
      return {
        type: error.type || error.name || 'Error',
        message: error.message || 'An error occurred',
        details: error.details || error,
        statusCode: error.statusCode || error.status || null,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        type: 'Error',
        message: error,
      };
    }

    // Fallback for other types
    return {
      type: 'UnknownError',
      message: String(error),
    };
  }
}

/**
 * Utility functions for response formatting
 */

/**
 * Create a standardized pagination info object
 * @param {number} totalCount - Total number of items
 * @param {number} offset - Current offset
 * @param {number} limit - Items per page
 * @param {number} currentCount - Number of items in current response
 * @returns {object} Pagination information
 */
function createPaginationInfo(totalCount, offset = 0, limit = 100, currentCount = 0) {
  return {
    totalCount,
    offset,
    limit,
    hasMore: offset + currentCount < totalCount,
    filteredCount: null,
  };
}

/**
 * Create content info object for binary responses
 * @param {string} contentType - MIME type
 * @param {string} fileName - File name
 * @param {number} fileSize - File size in bytes
 * @param {string} encoding - Content encoding
 * @returns {object} Content information
 */
function createContentInfo(contentType, fileName = null, fileSize = null, encoding = null) {
  return {
    contentType,
    fileName,
    fileSize,
    encoding,
  };
}

/**
 * Generate correlation ID for request tracking
 * @returns {string} Unique correlation ID
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export {
  ResponseFormatter,
  createPaginationInfo,
  createContentInfo,
  generateCorrelationId,
  STANDARD_METADATA_FIELDS,
  COLLECTION_METADATA_FIELDS,
  BINARY_METADATA_FIELDS,
};
