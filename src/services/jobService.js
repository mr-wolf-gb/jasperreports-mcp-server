/**
 * Job Scheduling Service for JasperReports MCP Server
 *
 * This service handles scheduled job management with support for:
 * - Job creation with schedule definition parsing
 * - Job listing, updating, and deletion operations
 * - Immediate job execution functionality
 * - Job history and execution tracking
 *
 * Features:
 * - Comprehensive schedule definition support (simple, calendar, cron)
 * - Multiple output format support per job
 * - Mail notification and repository destination handling
 * - Job state management and execution tracking
 * - Error handling with detailed context
 * - Support for all JasperReports job operations
 */

import APIClient, { HTTP_STATUS } from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  JobCreationRequest,
  JobListRequest,
  JobUpdateRequest,
  JobDeleteRequest,
  JobExecuteRequest,
} from '../models/requests.js';
import {
  JobCreationResponse,
  JobListResponse,
  JobUpdateResponse,
  JobDeleteResponse,
  JobExecuteResponse,
  JobInfo,
} from '../models/responses.js';

/**
 * Supported schedule types
 */
const SCHEDULE_TYPES = {
  SIMPLE: 'simple',
  CALENDAR: 'calendar',
  CRON: 'cron',
};

/**
 * Job states
 */
const JOB_STATES = {
  NORMAL: 'NORMAL',
  PAUSED: 'PAUSED',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  BLOCKED: 'BLOCKED',
};

/**
 * Recurrence interval units for simple schedules
 */
const RECURRENCE_UNITS = {
  MINUTE: 'MINUTE',
  HOUR: 'HOUR',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
};

/**
 * Default job parameters
 */
const DEFAULT_JOB_PARAMS = {
  outputFormats: ['pdf'],
  parameters: {},
  recipients: [],
  mailNotification: {},
  repositoryDestination: null,
};

/**
 * Job service constants
 */
const JOB_CONSTANTS = {
  MAX_LABEL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_RECIPIENTS: 50,
  DEFAULT_TIMEOUT_MS: 60000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

/**
 * Job Service class for handling scheduled job management
 */
class JobService {
  constructor(config = null, apiClient = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = new ErrorHandler(this.config);

    // Job tracking
    this.jobCache = new Map();
    this.executionHistory = [];
    this.jobStats = {
      totalJobs: 0,
      activeJobs: 0,
      pausedJobs: 0,
      completedJobs: 0,
      errorJobs: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    };

    this._initializeService();
  }

  /**
   * Initialize the job service
   * @private
   */
  _initializeService() {
    if (this.config.debugMode) {
      console.log('[Job Service] Initializing job scheduling service', {
        supportedScheduleTypes: Object.values(SCHEDULE_TYPES),
        supportedStates: Object.values(JOB_STATES),
        maxRecipients: JOB_CONSTANTS.MAX_RECIPIENTS,
      });
    }
  }

  /**
   * Create a new scheduled job
   * @param {object} jobRequest - Job creation request parameters
   * @returns {Promise<object>} Job creation result with job ID and details
   */
  async createJob(jobRequest) {
    const startTime = Date.now();

    try {
      // Validate input parameters
      const validatedRequest = this._validateJobCreationRequest(jobRequest);

      if (this.config.debugMode) {
        console.log('[Job Service] Creating scheduled job', {
          label: validatedRequest.label,
          reportUri: validatedRequest.reportUri,
          scheduleType: validatedRequest.schedule.type,
          outputFormats: validatedRequest.outputFormats,
        });
      }

      // Create job descriptor for JasperReports API
      const jobDescriptor = this._buildJobDescriptor(validatedRequest);

      // Create the job via REST API
      const response = await this.apiClient.put('/rest_v2/jobs', jobDescriptor, {
        timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== HTTP_STATUS.CREATED && response.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to create job: ${validatedRequest.label}`
        );
      }

      const jobData = response.data;
      const executionTime = Date.now() - startTime;

      // Update statistics
      this._updateJobStats('created');

      // Cache job information
      this._cacheJobInfo(jobData);

      // Create response
      const jobResponse = new JobCreationResponse({
        success: true,
        jobId: jobData.id,
        label: jobData.label,
        state: jobData.state,
        nextFireTime: jobData.nextFireTime,
        creationTimestamp: new Date().toISOString(),
        requestId: validatedRequest.requestId,
        executionTime,
      });

      if (this.config.debugMode) {
        console.log('[Job Service] Job created successfully', {
          jobId: jobData.id,
          label: jobData.label,
          nextFireTime: jobData.nextFireTime,
          executionTime,
        });
      }

      return jobResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error with context
      this.errorHandler.logError(error, 'Job creation', {
        label: jobRequest.label,
        reportUri: jobRequest.reportUri,
        executionTime,
      });

      throw error;
    }
  }

  /**
   * List scheduled jobs with filtering and pagination
   * @param {object} listRequest - Job list request parameters
   * @returns {Promise<object>} List of jobs with pagination info
   */
  async listJobs(listRequest = {}) {
    const startTime = Date.now();

    try {
      // Validate and normalize request
      const validatedRequest = this._validateJobListRequest(listRequest);

      if (this.config.debugMode) {
        console.log('[Job Service] Listing jobs', {
          limit: validatedRequest.limit,
          offset: validatedRequest.offset,
          searchQuery: validatedRequest.searchQuery,
        });
      }

      // Build query parameters
      const queryParams = {
        limit: validatedRequest.limit,
        offset: validatedRequest.offset,
      };

      if (validatedRequest.searchQuery) {
        queryParams.q = validatedRequest.searchQuery;
      }

      if (validatedRequest.owner) {
        queryParams.owner = validatedRequest.owner;
      }

      // Get jobs from JasperReports API
      const response = await this.apiClient.get('/rest_v2/jobs', {
        params: queryParams,
        timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
      });

      if (response.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(response.status, response.data, 'Failed to list jobs');
      }

      const jobsData = response.data;
      const executionTime = Date.now() - startTime;

      // Process and normalize job data
      const jobs = this._processJobList(jobsData.job || []);

      // Update cache with retrieved jobs
      jobs.forEach(job => this._cacheJobInfo(job));

      // Create response
      const listResponse = new JobListResponse({
        success: true,
        jobs,
        totalCount: jobsData.totalCount || jobs.length,
        offset: validatedRequest.offset,
        limit: validatedRequest.limit,
        hasMore: jobs.length === validatedRequest.limit,
        requestId: validatedRequest.requestId,
        executionTime,
      });

      if (this.config.debugMode) {
        console.log('[Job Service] Jobs listed successfully', {
          count: jobs.length,
          totalCount: jobsData.totalCount,
          executionTime,
        });
      }

      return listResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error with context
      this.errorHandler.logError(error, 'Job listing', {
        limit: listRequest.limit,
        offset: listRequest.offset,
        executionTime,
      });

      throw error;
    }
  }

  /**
   * Update an existing scheduled job
   * @param {object} updateRequest - Job update request parameters
   * @returns {Promise<object>} Job update result
   */
  async updateJob(updateRequest) {
    const startTime = Date.now();

    try {
      // Validate input parameters
      const validatedRequest = this._validateJobUpdateRequest(updateRequest);

      if (this.config.debugMode) {
        console.log('[Job Service] Updating job', {
          jobId: validatedRequest.jobId,
          label: validatedRequest.label,
        });
      }

      // Get existing job first
      const existingJob = await this._getJobById(validatedRequest.jobId);

      // Build updated job descriptor
      const jobDescriptor = this._buildJobUpdateDescriptor(existingJob, validatedRequest);

      // Update the job via REST API
      const response = await this.apiClient.post(
        `/rest_v2/jobs/${validatedRequest.jobId}`,
        jobDescriptor,
        {
          timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== HTTP_STATUS.OK) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to update job: ${validatedRequest.jobId}`
        );
      }

      const jobData = response.data;
      const executionTime = Date.now() - startTime;

      // Update cache
      this._cacheJobInfo(jobData);

      // Create response
      const updateResponse = new JobUpdateResponse({
        success: true,
        jobId: jobData.id,
        updateTimestamp: new Date().toISOString(),
        nextFireTime: jobData.nextFireTime,
        state: jobData.state,
        requestId: validatedRequest.requestId,
        executionTime,
      });

      if (this.config.debugMode) {
        console.log('[Job Service] Job updated successfully', {
          jobId: jobData.id,
          nextFireTime: jobData.nextFireTime,
          executionTime,
        });
      }

      return updateResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error with context
      this.errorHandler.logError(error, 'Job update', {
        jobId: updateRequest.jobId,
        executionTime,
      });

      throw error;
    }
  }

  /**
   * Delete a scheduled job
   * @param {object} deleteRequest - Job deletion request parameters
   * @returns {Promise<object>} Job deletion result
   */
  async deleteJob(deleteRequest) {
    const startTime = Date.now();

    try {
      // Validate input parameters
      const validatedRequest = this._validateJobDeleteRequest(deleteRequest);

      if (this.config.debugMode) {
        console.log('[Job Service] Deleting job', {
          jobId: validatedRequest.jobId,
          force: validatedRequest.force,
        });
      }

      // Delete the job via REST API
      const response = await this.apiClient.delete(`/rest_v2/jobs/${validatedRequest.jobId}`, {
        timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
      });

      if (response.status !== HTTP_STATUS.OK && response.status !== HTTP_STATUS.NO_CONTENT) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to delete job: ${validatedRequest.jobId}`
        );
      }

      const executionTime = Date.now() - startTime;

      // Remove from cache
      this.jobCache.delete(validatedRequest.jobId);

      // Update statistics
      this._updateJobStats('deleted');

      // Create response
      const deleteResponse = new JobDeleteResponse({
        success: true,
        jobId: validatedRequest.jobId,
        deleteTimestamp: new Date().toISOString(),
        requestId: validatedRequest.requestId,
        executionTime,
      });

      if (this.config.debugMode) {
        console.log('[Job Service] Job deleted successfully', {
          jobId: validatedRequest.jobId,
          executionTime,
        });
      }

      return deleteResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error with context
      this.errorHandler.logError(error, 'Job deletion', {
        jobId: deleteRequest.jobId,
        executionTime,
      });

      throw error;
    }
  }

  /**
   * Execute a job immediately
   * @param {object} executeRequest - Job execution request parameters
   * @returns {Promise<object>} Job execution result
   */
  async executeJobNow(executeRequest) {
    const startTime = Date.now();

    try {
      // Validate input parameters
      const validatedRequest = this._validateJobExecuteRequest(executeRequest);

      if (this.config.debugMode) {
        console.log('[Job Service] Executing job immediately', {
          jobId: validatedRequest.jobId,
          parametersCount: Object.keys(validatedRequest.parameters).length,
        });
      }

      // Build execution request body
      const executionBody = {
        parameters: this._transformParameters(validatedRequest.parameters),
      };

      // Execute the job via REST API
      const response = await this.apiClient.post(
        `/rest_v2/jobs/${validatedRequest.jobId}/run`,
        executionBody,
        {
          timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status !== HTTP_STATUS.OK && response.status !== HTTP_STATUS.CREATED) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          `Failed to execute job: ${validatedRequest.jobId}`
        );
      }

      const executionData = response.data;
      const executionTime = Date.now() - startTime;

      // Update statistics
      this._updateJobStats('executed');

      // Add to execution history
      this._addToExecutionHistory(
        validatedRequest.jobId,
        validatedRequest.parameters,
        executionData
      );

      // Create response
      const executeResponse = new JobExecuteResponse({
        success: true,
        jobId: validatedRequest.jobId,
        executionId: executionData.executionId || this._generateExecutionId(),
        executionTimestamp: new Date().toISOString(),
        status: executionData.status || 'running',
        requestId: validatedRequest.requestId,
        executionTime,
      });

      if (this.config.debugMode) {
        console.log('[Job Service] Job executed successfully', {
          jobId: validatedRequest.jobId,
          executionId: executeResponse.executionId,
          executionTime,
        });
      }

      return executeResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log error with context
      this.errorHandler.logError(error, 'Job execution', {
        jobId: executeRequest.jobId,
        executionTime,
      });

      throw error;
    }
  }
  /**
   * Get job execution history
   * @param {string} jobId - Job ID (optional, if not provided returns all history)
   * @param {number} limit - Maximum number of history entries to return
   * @returns {Array} Array of execution history entries
   */
  getJobExecutionHistory(jobId = null, limit = 50) {
    let history = this.executionHistory;

    if (jobId) {
      history = history.filter(entry => entry.jobId === jobId);
    }

    return history.slice(0, limit);
  }

  /**
   * Get job statistics
   * @returns {object} Job statistics and performance metrics
   */
  getJobStatistics() {
    return {
      ...this.jobStats,
      cachedJobs: this.jobCache.size,
      recentExecutions: this.executionHistory.slice(0, 10),
    };
  }

  /**
   * Validate job creation request
   * @private
   */
  _validateJobCreationRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Job creation request must be an object',
        request,
        'object'
      );
    }

    // Validate using schema
    Validator.validateJobCreation(request);

    // Create normalized request
    const normalizedRequest = new JobCreationRequest({
      ...DEFAULT_JOB_PARAMS,
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate required fields
    if (!normalizedRequest.label || normalizedRequest.label.trim().length === 0) {
      throw this.errorHandler.createValidationError(
        'label',
        'Job label is required',
        normalizedRequest.label,
        'non-empty string'
      );
    }

    if (normalizedRequest.label.length > JOB_CONSTANTS.MAX_LABEL_LENGTH) {
      throw this.errorHandler.createValidationError(
        'label',
        `Job label exceeds maximum length of ${JOB_CONSTANTS.MAX_LABEL_LENGTH} characters`,
        normalizedRequest.label.length,
        `<= ${JOB_CONSTANTS.MAX_LABEL_LENGTH}`
      );
    }

    if (!normalizedRequest.reportUri) {
      throw this.errorHandler.createValidationError(
        'reportUri',
        'Report URI is required',
        normalizedRequest.reportUri,
        'valid report URI'
      );
    }

    // Validate resource URI
    Validator.validateResourceURI(normalizedRequest.reportUri);

    // Validate schedule
    this._validateScheduleDefinition(normalizedRequest.schedule);

    // Validate output formats
    this._validateOutputFormats(normalizedRequest.outputFormats);

    // Validate recipients
    this._validateRecipients(normalizedRequest.recipients);

    // Validate description length
    if (
      normalizedRequest.description &&
      normalizedRequest.description.length > JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH
    ) {
      throw this.errorHandler.createValidationError(
        'description',
        `Job description exceeds maximum length of ${JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`,
        normalizedRequest.description.length,
        `<= ${JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH}`
      );
    }

    return normalizedRequest;
  }

  /**
   * Validate job list request
   * @private
   */
  _validateJobListRequest(request) {
    const normalizedRequest = new JobListRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate pagination parameters
    if (normalizedRequest.limit < 1 || normalizedRequest.limit > 1000) {
      throw this.errorHandler.createValidationError(
        'limit',
        'Limit must be between 1 and 1000',
        normalizedRequest.limit,
        '1-1000'
      );
    }

    if (normalizedRequest.offset < 0) {
      throw this.errorHandler.createValidationError(
        'offset',
        'Offset must be non-negative',
        normalizedRequest.offset,
        '>= 0'
      );
    }

    return normalizedRequest;
  }

  /**
   * Validate job update request
   * @private
   */
  _validateJobUpdateRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Job update request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new JobUpdateRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate job ID
    if (!normalizedRequest.jobId) {
      throw this.errorHandler.createValidationError(
        'jobId',
        'Job ID is required',
        normalizedRequest.jobId,
        'valid job ID'
      );
    }

    // Validate optional fields if provided
    if (
      normalizedRequest.label &&
      normalizedRequest.label.length > JOB_CONSTANTS.MAX_LABEL_LENGTH
    ) {
      throw this.errorHandler.createValidationError(
        'label',
        `Job label exceeds maximum length of ${JOB_CONSTANTS.MAX_LABEL_LENGTH} characters`,
        normalizedRequest.label.length,
        `<= ${JOB_CONSTANTS.MAX_LABEL_LENGTH}`
      );
    }

    if (
      normalizedRequest.description &&
      normalizedRequest.description.length > JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH
    ) {
      throw this.errorHandler.createValidationError(
        'description',
        `Job description exceeds maximum length of ${JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`,
        normalizedRequest.description.length,
        `<= ${JOB_CONSTANTS.MAX_DESCRIPTION_LENGTH}`
      );
    }

    if (normalizedRequest.schedule) {
      this._validateScheduleDefinition(normalizedRequest.schedule);
    }

    if (normalizedRequest.outputFormats) {
      this._validateOutputFormats(normalizedRequest.outputFormats);
    }

    if (normalizedRequest.recipients) {
      this._validateRecipients(normalizedRequest.recipients);
    }

    return normalizedRequest;
  }

  /**
   * Validate job delete request
   * @private
   */
  _validateJobDeleteRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Job delete request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new JobDeleteRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate job ID
    if (!normalizedRequest.jobId) {
      throw this.errorHandler.createValidationError(
        'jobId',
        'Job ID is required',
        normalizedRequest.jobId,
        'valid job ID'
      );
    }

    return normalizedRequest;
  }

  /**
   * Validate job execute request
   * @private
   */
  _validateJobExecuteRequest(request) {
    if (!request || typeof request !== 'object') {
      throw this.errorHandler.createValidationError(
        'request',
        'Job execute request must be an object',
        request,
        'object'
      );
    }

    const normalizedRequest = new JobExecuteRequest({
      ...request,
      requestId: request.requestId || this._generateRequestId(),
    });

    // Validate job ID
    if (!normalizedRequest.jobId) {
      throw this.errorHandler.createValidationError(
        'jobId',
        'Job ID is required',
        normalizedRequest.jobId,
        'valid job ID'
      );
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
   * Validate schedule definition
   * @private
   */
  _validateScheduleDefinition(schedule) {
    if (!schedule || typeof schedule !== 'object') {
      throw this.errorHandler.createValidationError(
        'schedule',
        'Schedule definition is required',
        schedule,
        'object'
      );
    }

    const scheduleType = schedule.type || SCHEDULE_TYPES.SIMPLE;

    if (!Object.values(SCHEDULE_TYPES).includes(scheduleType)) {
      throw this.errorHandler.createValidationError(
        'schedule.type',
        `Invalid schedule type: ${scheduleType}`,
        scheduleType,
        `one of: ${Object.values(SCHEDULE_TYPES).join(', ')}`
      );
    }

    // Validate based on schedule type
    switch (scheduleType) {
      case SCHEDULE_TYPES.SIMPLE:
        this._validateSimpleSchedule(schedule);
        break;
      case SCHEDULE_TYPES.CALENDAR:
        this._validateCalendarSchedule(schedule);
        break;
      case SCHEDULE_TYPES.CRON:
        this._validateCronSchedule(schedule);
        break;
    }

    // Validate common schedule fields
    if (schedule.startDate && !this._isValidDate(schedule.startDate)) {
      throw this.errorHandler.createValidationError(
        'schedule.startDate',
        'Invalid start date format',
        schedule.startDate,
        'valid ISO date string'
      );
    }

    if (schedule.endDate && !this._isValidDate(schedule.endDate)) {
      throw this.errorHandler.createValidationError(
        'schedule.endDate',
        'Invalid end date format',
        schedule.endDate,
        'valid ISO date string'
      );
    }

    if (
      schedule.startDate &&
      schedule.endDate &&
      new Date(schedule.startDate) >= new Date(schedule.endDate)
    ) {
      throw this.errorHandler.createValidationError(
        'schedule',
        'Start date must be before end date',
        { startDate: schedule.startDate, endDate: schedule.endDate },
        'startDate < endDate'
      );
    }
  }

  /**
   * Validate simple schedule
   * @private
   */
  _validateSimpleSchedule(schedule) {
    if (!schedule.recurrenceInterval || schedule.recurrenceInterval < 1) {
      throw this.errorHandler.createValidationError(
        'schedule.recurrenceInterval',
        'Recurrence interval must be a positive integer',
        schedule.recurrenceInterval,
        'positive integer'
      );
    }

    if (
      !schedule.recurrenceIntervalUnit ||
      !Object.values(RECURRENCE_UNITS).includes(schedule.recurrenceIntervalUnit)
    ) {
      throw this.errorHandler.createValidationError(
        'schedule.recurrenceIntervalUnit',
        `Invalid recurrence interval unit: ${schedule.recurrenceIntervalUnit}`,
        schedule.recurrenceIntervalUnit,
        `one of: ${Object.values(RECURRENCE_UNITS).join(', ')}`
      );
    }
  }

  /**
   * Validate calendar schedule
   * @private
   */
  _validateCalendarSchedule(schedule) {
    if (!schedule.calendarTrigger || typeof schedule.calendarTrigger !== 'object') {
      throw this.errorHandler.createValidationError(
        'schedule.calendarTrigger',
        'Calendar trigger definition is required for calendar schedules',
        schedule.calendarTrigger,
        'object'
      );
    }

    // Additional calendar trigger validation can be added here
  }

  /**
   * Validate cron schedule
   * @private
   */
  _validateCronSchedule(schedule) {
    if (!schedule.cronExpression || typeof schedule.cronExpression !== 'string') {
      throw this.errorHandler.createValidationError(
        'schedule.cronExpression',
        'Cron expression is required for cron schedules',
        schedule.cronExpression,
        'valid cron expression string'
      );
    }

    // Basic cron expression validation (5 or 6 parts)
    const cronParts = schedule.cronExpression.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      throw this.errorHandler.createValidationError(
        'schedule.cronExpression',
        'Cron expression must have 5 or 6 parts (seconds optional)',
        schedule.cronExpression,
        'valid cron expression format'
      );
    }
  }

  /**
   * Validate output formats
   * @private
   */
  _validateOutputFormats(outputFormats) {
    if (!Array.isArray(outputFormats) || outputFormats.length === 0) {
      throw this.errorHandler.createValidationError(
        'outputFormats',
        'At least one output format is required',
        outputFormats,
        'non-empty array'
      );
    }

    const validFormats = ['pdf', 'html', 'xlsx', 'xls', 'csv', 'rtf', 'docx', 'odt', 'ods', 'xml'];

    for (const format of outputFormats) {
      if (!validFormats.includes(format.toLowerCase())) {
        throw this.errorHandler.createValidationError(
          'outputFormats',
          `Invalid output format: ${format}`,
          format,
          `one of: ${validFormats.join(', ')}`
        );
      }
    }
  }

  /**
   * Validate recipients
   * @private
   */
  _validateRecipients(recipients) {
    if (!Array.isArray(recipients)) {
      throw this.errorHandler.createValidationError(
        'recipients',
        'Recipients must be an array',
        recipients,
        'array'
      );
    }

    if (recipients.length > JOB_CONSTANTS.MAX_RECIPIENTS) {
      throw this.errorHandler.createValidationError(
        'recipients',
        `Too many recipients (max: ${JOB_CONSTANTS.MAX_RECIPIENTS})`,
        recipients.length,
        `<= ${JOB_CONSTANTS.MAX_RECIPIENTS}`
      );
    }

    // Validate email format for each recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of recipients) {
      if (typeof recipient !== 'string' || !emailRegex.test(recipient)) {
        throw this.errorHandler.createValidationError(
          'recipients',
          `Invalid email address: ${recipient}`,
          recipient,
          'valid email address'
        );
      }
    }
  }

  /**
   * Build job descriptor for JasperReports API
   * @private
   */
  _buildJobDescriptor(request) {
    const descriptor = {
      label: request.label,
      description: request.description || '',
      source: {
        reportUnitURI: request.reportUri,
        parameters: this._transformParameters(request.parameters),
      },
      trigger: this._buildTriggerDescriptor(request.schedule),
      outputFormats: request.outputFormats.reduce((formats, format) => {
        formats[format.toUpperCase()] = {};
        return formats;
      }, {}),
    };

    // Add mail notification if recipients are provided
    if (request.recipients && request.recipients.length > 0) {
      descriptor.mailNotification = {
        ...request.mailNotification,
        toAddresses: request.recipients,
      };
    }

    // Add repository destination if provided
    if (request.repositoryDestination) {
      descriptor.contentRepositoryDestination = request.repositoryDestination;
    }

    return descriptor;
  }

  /**
   * Build job update descriptor
   * @private
   */
  _buildJobUpdateDescriptor(existingJob, updateRequest) {
    const descriptor = { ...existingJob };

    // Update fields that are provided
    if (updateRequest.label) {
      descriptor.label = updateRequest.label;
    }

    if (updateRequest.description !== undefined) {
      descriptor.description = updateRequest.description;
    }

    if (updateRequest.schedule) {
      descriptor.trigger = this._buildTriggerDescriptor(updateRequest.schedule);
    }

    if (updateRequest.outputFormats) {
      descriptor.outputFormats = updateRequest.outputFormats.reduce((formats, format) => {
        formats[format.toUpperCase()] = {};
        return formats;
      }, {});
    }

    if (updateRequest.parameters) {
      descriptor.source = descriptor.source || {};
      descriptor.source.parameters = this._transformParameters(updateRequest.parameters);
    }

    if (updateRequest.recipients) {
      descriptor.mailNotification = descriptor.mailNotification || {};
      descriptor.mailNotification.toAddresses = updateRequest.recipients;
    }

    return descriptor;
  }

  /**
   * Build trigger descriptor based on schedule type
   * @private
   */
  _buildTriggerDescriptor(schedule) {
    const trigger = {
      startDate: schedule.startDate || new Date().toISOString(),
      timezone: schedule.timezone || 'America/New_York',
    };

    if (schedule.endDate) {
      trigger.endDate = schedule.endDate;
    }

    switch (schedule.type) {
      case SCHEDULE_TYPES.SIMPLE:
        trigger.simpleTrigger = {
          occurrenceCount: schedule.occurrenceCount || -1,
          recurrenceInterval: schedule.recurrenceInterval,
          recurrenceIntervalUnit: schedule.recurrenceIntervalUnit,
        };
        break;

      case SCHEDULE_TYPES.CALENDAR:
        trigger.calendarTrigger = schedule.calendarTrigger;
        break;

      case SCHEDULE_TYPES.CRON:
        trigger.cronTrigger = {
          expression: schedule.cronExpression,
          timezone: schedule.timezone || 'America/New_York',
        };
        break;
    }

    return trigger;
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
   * Get job by ID from API
   * @private
   */
  async _getJobById(jobId) {
    const response = await this.apiClient.get(`/rest_v2/jobs/${jobId}`, {
      timeout: JOB_CONSTANTS.DEFAULT_TIMEOUT_MS,
    });

    if (response.status !== HTTP_STATUS.OK) {
      throw this.errorHandler.mapHttpError(
        response.status,
        response.data,
        `Failed to get job: ${jobId}`
      );
    }

    return response.data;
  }

  /**
   * Process job list from API response
   * @private
   */
  _processJobList(jobs) {
    return jobs.map(
      job =>
        new JobInfo({
          id: job.id,
          version: job.version,
          label: job.label,
          description: job.description,
          owner: job.owner,
          state: job.state,
          previousFireTime: job.previousFireTime,
          nextFireTime: job.nextFireTime,
          source: job.source,
          trigger: job.trigger,
          mailNotification: job.mailNotification,
          alert: job.alert,
          contentRepositoryDestination: job.contentRepositoryDestination,
        })
    );
  }

  /**
   * Cache job information
   * @private
   */
  _cacheJobInfo(jobData) {
    this.jobCache.set(jobData.id, {
      ...jobData,
      cachedAt: new Date().toISOString(),
    });
  }

  /**
   * Update job statistics
   * @private
   */
  _updateJobStats(operation) {
    switch (operation) {
      case 'created':
        this.jobStats.totalJobs++;
        this.jobStats.activeJobs++;
        break;
      case 'deleted':
        this.jobStats.totalJobs = Math.max(0, this.jobStats.totalJobs - 1);
        this.jobStats.activeJobs = Math.max(0, this.jobStats.activeJobs - 1);
        break;
      case 'executed':
        this.jobStats.totalExecutions++;
        break;
      case 'execution_success':
        this.jobStats.successfulExecutions++;
        break;
      case 'execution_failed':
        this.jobStats.failedExecutions++;
        break;
    }
  }

  /**
   * Add execution to history
   * @private
   */
  _addToExecutionHistory(jobId, parameters, executionData, error = null) {
    const historyEntry = {
      jobId,
      parameters,
      executionId: executionData.executionId || this._generateExecutionId(),
      timestamp: new Date().toISOString(),
      success: !error,
      error: error ? error.message : null,
      status: executionData.status || 'unknown',
    };

    this.executionHistory.unshift(historyEntry);

    // Keep only last 100 executions in memory
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }
  }

  /**
   * Check if date string is valid
   * @private
   */
  _isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Generate unique execution ID
   * @private
   */
  _generateExecutionId() {
    return `job_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear job cache and statistics
   */
  clearCache() {
    this.jobCache.clear();
    this.executionHistory = [];
    this.jobStats = {
      totalJobs: 0,
      activeJobs: 0,
      pausedJobs: 0,
      completedJobs: 0,
      errorJobs: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    };

    if (this.config.debugMode) {
      console.log('[Job Service] Cache and statistics cleared');
    }
  }

  /**
   * Dispose of the job service and clean up resources
   */
  dispose() {
    this.jobCache.clear();
    this.executionHistory = [];

    if (this.config.debugMode) {
      console.log('[Job Service] Service disposed');
    }
  }
}

export default JobService;
export { SCHEDULE_TYPES, JOB_STATES, RECURRENCE_UNITS, DEFAULT_JOB_PARAMS, JOB_CONSTANTS };
