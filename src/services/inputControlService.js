/**
 * Input Controls Service for JasperReports MCP Server
 *
 * This service provides comprehensive input control management including:
 * - Input control definition retrieval and parsing
 * - Cascading parameter handling and dependency resolution
 * - Parameter validation against control constraints
 * - Default value handling and option list retrieval
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import APIClient from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { getErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  InputControlsRequest,
  InputControlValuesRequest,
  InputControlValidationRequest,
} from '../models/requests.js';
import {
  InputControlsResponse,
  InputControlValuesResponse,
  InputControlValidationResponse,
  InputControl,
  ValidationResult,
} from '../models/responses.js';

/**
 * Input control types supported by JasperReports Server
 */
const INPUT_CONTROL_TYPES = {
  BOOLEAN: 'bool',
  SINGLE_VALUE: 'singleValue',
  SINGLE_SELECT: 'singleSelect',
  SINGLE_SELECT_RADIO: 'singleSelectRadio',
  MULTI_SELECT: 'multiSelect',
  MULTI_SELECT_CHECKBOX: 'multiSelectCheckbox',
  SINGLE_SELECT_LIST_OF_VALUES: 'singleSelectListOfValues',
  SINGLE_SELECT_LIST_OF_VALUES_RADIO: 'singleSelectListOfValuesRadio',
  MULTI_SELECT_LIST_OF_VALUES: 'multiSelectListOfValues',
  MULTI_SELECT_LIST_OF_VALUES_CHECKBOX: 'multiSelectListOfValuesCheckbox',
  SINGLE_SELECT_QUERY: 'singleSelectQuery',
  SINGLE_SELECT_QUERY_RADIO: 'singleSelectQueryRadio',
  MULTI_SELECT_QUERY: 'multiSelectQuery',
  MULTI_SELECT_QUERY_CHECKBOX: 'multiSelectQueryCheckbox',
};

/**
 * Input control data types
 */
const INPUT_CONTROL_DATA_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  DATETIME: 'datetime',
  TIME: 'time',
  BOOLEAN: 'boolean',
};

/**
 * Validation rule types
 */
const VALIDATION_RULE_TYPES = {
  MANDATORY: 'mandatory',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  MIN_VALUE: 'minValue',
  MAX_VALUE: 'maxValue',
  PATTERN: 'pattern',
  DATE_RANGE: 'dateRange',
};

/**
 * Input Control Service class providing comprehensive parameter management
 */
class InputControlService {
  constructor(config = null, apiClient = null, errorHandler = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = errorHandler || getErrorHandler();
    this.initialized = false;

    // Cache for input control definitions to improve performance
    this.controlDefinitionsCache = new Map();
    this.cacheExpiry = new Map();
    this.defaultCacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Dependency resolution tracking
    this.dependencyResolutionStack = new Set();
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
        console.log('[Input Control Service] Service initialized successfully');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'InputControlService.initialize');
      throw this.errorHandler.mapJasperError(error, 'Failed to initialize input control service');
    }
  }

  /**
   * Retrieve input control definitions for a report
   * @param {object} params - Request parameters
   * @returns {Promise<InputControlsResponse>} Input control definitions
   */
  async getInputControls(params) {
    await this.initialize();

    // Validate input parameters
    const request = new InputControlsRequest(params);
    Validator.validateInputControls(request);

    try {
      const startTime = Date.now();

      // Check cache first
      const cacheKey = `${request.reportUri}:${request.includeStructure}:${request.includeValues}`;
      const cachedResult = this._getCachedResult(cacheKey);
      if (cachedResult) {
        if (this.config.debugMode) {
          console.log(
            `[Input Control Service] Retrieved cached input controls for ${request.reportUri}`
          );
        }
        return cachedResult;
      }

      // Get input control definitions from JasperReports Server
      const response = await this.apiClient.get(
        `/rest_v2/reports${request.reportUri}/inputControls`,
        {
          params: {
            includeStructure: request.includeStructure,
            includeValues: request.includeValues,
          },
        }
      );

      if (response.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Report', request.reportUri);
      }

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Input controls retrieval failed'
        );
      }

      // Process and parse input control definitions
      const inputControls = this._processInputControlDefinitions(response.data);

      // Build dependency structure if requested
      let structure = {};
      if (request.includeStructure) {
        structure = this._buildDependencyStructure(inputControls);
      }

      const executionTime = Date.now() - startTime;

      const result = new InputControlsResponse({
        reportUri: request.reportUri,
        inputControls,
        structure,
        executionTime,
        requestId: request.requestId,
      });

      // Cache the result
      this._setCachedResult(cacheKey, result);

      if (this.config.debugMode) {
        console.log(
          `[Input Control Service] Retrieved ${inputControls.length} input controls for ${request.reportUri} (${executionTime}ms)`
        );
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'InputControlService.getInputControls', {
        reportUri: request.reportUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to get input controls for report: ${request.reportUri}`
      );
    }
  }

  /**
   * Set values for cascading input controls and retrieve updated options
   * @param {object} params - Request parameters
   * @returns {Promise<InputControlValuesResponse>} Updated control values and options
   */
  async setInputControlValues(params) {
    await this.initialize();

    // Validate input parameters
    const request = new InputControlValuesRequest(params);
    Validator.validateInputControlValues(request);

    try {
      const startTime = Date.now();

      // Prepare the values payload
      const valuesPayload = this._buildValuesPayload(request.values);

      // Set values and get updated options
      const response = await this.apiClient.post(
        `/rest_v2/reports${request.reportUri}/inputControls/${request.controlId}/values`,
        valuesPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            freshData: request.freshData,
          },
        }
      );

      if (response.status === 404) {
        throw this.errorHandler.createResourceNotFoundError(
          'Input Control',
          `${request.reportUri}/${request.controlId}`
        );
      }

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Input control values update failed'
        );
      }

      // Process the response to extract values and options
      const processedValues = this._processInputControlValues(response.data);

      // Handle cascading dependencies
      const cascadingUpdates = await this._handleCascadingDependencies(
        request.reportUri,
        request.controlId,
        request.values
      );

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Input Control Service] Set values for control ${request.controlId} in ${request.reportUri} (${executionTime}ms)`
        );
      }

      return new InputControlValuesResponse({
        reportUri: request.reportUri,
        controlId: request.controlId,
        values: processedValues.availableValues,
        selectedValues: processedValues.selectedValues,
        cascadingUpdates,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'InputControlService.setInputControlValues', {
        reportUri: request.reportUri,
        controlId: request.controlId,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to set values for input control: ${request.controlId}`
      );
    }
  }

  /**
   * Validate input control parameters against their constraints
   * @param {object} params - Request parameters
   * @returns {Promise<InputControlValidationResponse>} Validation results
   */
  async validateInputControls(params) {
    await this.initialize();

    // Validate input parameters
    const request = new InputControlValidationRequest(params);
    Validator.validateInputControlValidation(request);

    try {
      const startTime = Date.now();

      // Get input control definitions first
      const controlsResponse = await this.getInputControls({
        reportUri: request.reportUri,
        includeStructure: true,
        includeValues: false,
      });

      const inputControls = controlsResponse.inputControls;
      const validationResults = [];
      const errors = [];
      let overallValid = true;

      // Validate each parameter against its control constraints
      for (const control of inputControls) {
        const paramValue = request.parameters[control.id];
        const controlValidation = await this._validateSingleControl(control, paramValue);

        validationResults.push(controlValidation);

        if (!controlValidation.valid) {
          overallValid = false;
          errors.push({
            controlId: control.id,
            controlLabel: control.label,
            errorCode: controlValidation.errorCode,
            errorMessage: controlValidation.errorMessage,
            value: paramValue,
          });
        }
      }

      // Validate dependencies and cascading constraints
      if (request.validateAll && overallValid) {
        const dependencyValidation = await this._validateDependencies(
          request.reportUri,
          inputControls,
          request.parameters
        );

        if (!dependencyValidation.valid) {
          overallValid = false;
          errors.push(...dependencyValidation.errors);
        }
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Input Control Service] Validated ${inputControls.length} controls for ${request.reportUri} - Valid: ${overallValid} (${executionTime}ms)`
        );
      }

      return new InputControlValidationResponse({
        reportUri: request.reportUri,
        valid: overallValid,
        validationResults,
        errors,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'InputControlService.validateInputControls', {
        reportUri: request.reportUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to validate input controls for report: ${request.reportUri}`
      );
    }
  }

  /**
   * Get default values for all input controls in a report
   * @param {string} reportUri - Report URI
   * @returns {Promise<object>} Default parameter values
   */
  async getDefaultValues(reportUri) {
    await this.initialize();

    try {
      const startTime = Date.now();

      // Get input control definitions with values
      const controlsResponse = await this.getInputControls({
        reportUri,
        includeStructure: false,
        includeValues: true,
      });

      const defaultValues = {};

      for (const control of controlsResponse.inputControls) {
        const defaultValue = this._extractDefaultValue(control);
        if (defaultValue !== null && defaultValue !== undefined) {
          defaultValues[control.id] = defaultValue;
        }
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Input Control Service] Retrieved default values for ${Object.keys(defaultValues).length} controls in ${reportUri} (${executionTime}ms)`
        );
      }

      return defaultValues;
    } catch (error) {
      this.errorHandler.logError(error, 'InputControlService.getDefaultValues', { reportUri });
      throw error;
    }
  }

  /**
   * Process input control definitions from JasperReports Server response
   * @private
   */
  _processInputControlDefinitions(responseData) {
    if (!responseData) {
      return [];
    }

    // Handle both single control and array responses
    const controlsArray = Array.isArray(responseData.inputControl)
      ? responseData.inputControl
      : responseData.inputControl
        ? [responseData.inputControl]
        : [];

    return controlsArray.map(controlData => {
      const control = new InputControl({
        id: controlData.id,
        label: controlData.label,
        description: controlData.description,
        type: controlData.type,
        uri: controlData.uri,
        mandatory: controlData.mandatory || false,
        readOnly: controlData.readOnly || false,
        visible: controlData.visible !== false,
      });

      // Process validation rules
      if (controlData.validationRules) {
        control.validationRules = this._processValidationRules(controlData.validationRules);
      }

      // Process dependencies
      if (controlData.masterDependencies) {
        control.masterDependencies = Array.isArray(controlData.masterDependencies)
          ? controlData.masterDependencies
          : [controlData.masterDependencies];
      }

      if (controlData.slaveDependencies) {
        control.slaveDependencies = Array.isArray(controlData.slaveDependencies)
          ? controlData.slaveDependencies
          : [controlData.slaveDependencies];
      }

      // Process state information (current values, options, etc.)
      if (controlData.state) {
        control.state = {
          uri: controlData.state.uri,
          id: controlData.state.id,
          value: controlData.state.value,
          options: controlData.state.options || [],
          error: controlData.state.error,
        };
      }

      return control;
    });
  }

  /**
   * Process validation rules from control definition
   * @private
   */
  _processValidationRules(validationRulesData) {
    if (!validationRulesData) {
      return [];
    }

    const rulesArray = Array.isArray(validationRulesData)
      ? validationRulesData
      : [validationRulesData];

    return rulesArray.map(rule => ({
      type: rule.type || VALIDATION_RULE_TYPES.MANDATORY,
      errorMessage: rule.errorMessage,
      mandatoryValidationRule: rule.mandatoryValidationRule,
      dateTimeFormatValidationRule: rule.dateTimeFormatValidationRule,
      regexpValidationRule: rule.regexpValidationRule,
    }));
  }

  /**
   * Build dependency structure for input controls
   * @private
   */
  _buildDependencyStructure(inputControls) {
    const structure = {
      dependencies: {},
      cascadingChains: [],
      independentControls: [],
    };

    // Build dependency map
    for (const control of inputControls) {
      structure.dependencies[control.id] = {
        masters: control.masterDependencies || [],
        slaves: control.slaveDependencies || [],
        level: 0, // Will be calculated
      };
    }

    // Calculate dependency levels and cascading chains
    for (const control of inputControls) {
      if (!control.masterDependencies || control.masterDependencies.length === 0) {
        structure.independentControls.push(control.id);
        this._calculateDependencyLevels(control.id, structure.dependencies, 0);
      }
    }

    // Identify cascading chains
    structure.cascadingChains = this._identifyCascadingChains(inputControls);

    return structure;
  }

  /**
   * Calculate dependency levels for proper resolution order
   * @private
   */
  _calculateDependencyLevels(controlId, dependencies, level) {
    if (dependencies[controlId]) {
      dependencies[controlId].level = Math.max(dependencies[controlId].level, level);

      for (const slaveId of dependencies[controlId].slaves) {
        this._calculateDependencyLevels(slaveId, dependencies, level + 1);
      }
    }
  }

  /**
   * Identify cascading chains in input controls
   * @private
   */
  _identifyCascadingChains(inputControls) {
    const chains = [];
    const visited = new Set();

    for (const control of inputControls) {
      if (
        !visited.has(control.id) &&
        (!control.masterDependencies || control.masterDependencies.length === 0)
      ) {
        const chain = this._buildCascadingChain(control.id, inputControls, visited);
        if (chain.length > 1) {
          chains.push(chain);
        }
      }
    }

    return chains;
  }

  /**
   * Build a cascading chain starting from a control
   * @private
   */
  _buildCascadingChain(controlId, inputControls, visited) {
    const chain = [controlId];
    visited.add(controlId);

    const control = inputControls.find(c => c.id === controlId);
    if (control && control.slaveDependencies) {
      for (const slaveId of control.slaveDependencies) {
        if (!visited.has(slaveId)) {
          const subChain = this._buildCascadingChain(slaveId, inputControls, visited);
          chain.push(...subChain);
        }
      }
    }

    return chain;
  }

  /**
   * Build values payload for setting input control values
   * @private
   */
  _buildValuesPayload(values) {
    const payload = {
      reportParameter: [],
    };

    for (const [name, value] of Object.entries(values)) {
      payload.reportParameter.push({
        name,
        value: Array.isArray(value) ? value : [value],
      });
    }

    return payload;
  }

  /**
   * Process input control values response
   * @private
   */
  _processInputControlValues(responseData) {
    const result = {
      availableValues: [],
      selectedValues: [],
    };

    if (responseData && responseData.inputControlState) {
      const stateArray = Array.isArray(responseData.inputControlState)
        ? responseData.inputControlState
        : [responseData.inputControlState];

      for (const state of stateArray) {
        if (state.options) {
          result.availableValues = state.options.map(option => ({
            label: option.label,
            value: option.value,
            selected: option.selected || false,
          }));
        }

        if (state.value) {
          result.selectedValues = Array.isArray(state.value) ? state.value : [state.value];
        }
      }
    }

    return result;
  }

  /**
   * Handle cascading dependencies when values change
   * @private
   */
  async _handleCascadingDependencies(reportUri, controlId, values) {
    // Prevent infinite recursion
    const dependencyKey = `${reportUri}:${controlId}`;
    if (this.dependencyResolutionStack.has(dependencyKey)) {
      return [];
    }

    this.dependencyResolutionStack.add(dependencyKey);

    try {
      // Get control definitions to understand dependencies
      const controlsResponse = await this.getInputControls({
        reportUri,
        includeStructure: true,
        includeValues: false,
      });

      const control = controlsResponse.inputControls.find(c => c.id === controlId);
      if (!control || !control.slaveDependencies || control.slaveDependencies.length === 0) {
        return [];
      }

      const cascadingUpdates = [];

      // Update each dependent control
      for (const slaveId of control.slaveDependencies) {
        try {
          const slaveResponse = await this.setInputControlValues({
            reportUri,
            controlId: slaveId,
            values,
            freshData: true,
          });

          cascadingUpdates.push({
            controlId: slaveId,
            values: slaveResponse.values,
            selectedValues: slaveResponse.selectedValues,
          });
        } catch (error) {
          // Log but don't fail the entire operation for cascading updates
          this.errorHandler.logError(error, 'Cascading dependency update', { slaveId });
        }
      }

      return cascadingUpdates;
    } finally {
      this.dependencyResolutionStack.delete(dependencyKey);
    }
  }

  /**
   * Validate a single input control against its constraints
   * @private
   */
  async _validateSingleControl(control, value) {
    const result = new ValidationResult({
      field: control.id,
      valid: true,
    });

    // Check mandatory constraint
    if (control.mandatory && (value === null || value === undefined || value === '')) {
      result.valid = false;
      result.errorCode = 'mandatory.field';
      result.errorMessage = `${control.label} is required`;
      return result;
    }

    // Skip further validation if value is empty and not mandatory
    if (value === null || value === undefined || value === '') {
      return result;
    }

    // Validate against validation rules
    for (const rule of control.validationRules || []) {
      const ruleValidation = this._validateAgainstRule(control, value, rule);
      if (!ruleValidation.valid) {
        result.valid = false;
        result.errorCode = ruleValidation.errorCode;
        result.errorMessage = ruleValidation.errorMessage;
        result.errorArguments = ruleValidation.errorArguments;
        break;
      }
    }

    return result;
  }

  /**
   * Validate value against a specific validation rule
   * @private
   */
  _validateAgainstRule(control, value, rule) {
    const result = { valid: true };

    switch (rule.type) {
      case VALIDATION_RULE_TYPES.MIN_LENGTH:
        if (typeof value === 'string' && value.length < rule.minLength) {
          result.valid = false;
          result.errorCode = 'validation.min.length';
          result.errorMessage = `${control.label} must be at least ${rule.minLength} characters long`;
          result.errorArguments = [rule.minLength];
        }
        break;

      case VALIDATION_RULE_TYPES.MAX_LENGTH:
        if (typeof value === 'string' && value.length > rule.maxLength) {
          result.valid = false;
          result.errorCode = 'validation.max.length';
          result.errorMessage = `${control.label} must be at most ${rule.maxLength} characters long`;
          result.errorArguments = [rule.maxLength];
        }
        break;

      case VALIDATION_RULE_TYPES.MIN_VALUE:
        if (typeof value === 'number' && value < rule.minValue) {
          result.valid = false;
          result.errorCode = 'validation.min.value';
          result.errorMessage = `${control.label} must be at least ${rule.minValue}`;
          result.errorArguments = [rule.minValue];
        }
        break;

      case VALIDATION_RULE_TYPES.MAX_VALUE:
        if (typeof value === 'number' && value > rule.maxValue) {
          result.valid = false;
          result.errorCode = 'validation.max.value';
          result.errorMessage = `${control.label} must be at most ${rule.maxValue}`;
          result.errorArguments = [rule.maxValue];
        }
        break;

      case VALIDATION_RULE_TYPES.PATTERN:
        if (rule.regexpValidationRule && typeof value === 'string') {
          const pattern = new RegExp(rule.regexpValidationRule.expression);
          if (!pattern.test(value)) {
            result.valid = false;
            result.errorCode = 'validation.pattern';
            result.errorMessage =
              rule.regexpValidationRule.errorMessage ||
              `${control.label} does not match required pattern`;
          }
        }
        break;

      case VALIDATION_RULE_TYPES.DATE_RANGE:
        if (rule.dateTimeFormatValidationRule) {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            result.valid = false;
            result.errorCode = 'validation.date.format';
            result.errorMessage = `${control.label} must be a valid date`;
          }
        }
        break;
    }

    return result;
  }

  /**
   * Validate dependencies and cascading constraints
   * @private
   */
  async _validateDependencies(reportUri, inputControls, parameters) {
    const result = {
      valid: true,
      errors: [],
    };

    // Check that all master dependencies have values when slaves have values
    for (const control of inputControls) {
      if (control.masterDependencies && control.masterDependencies.length > 0) {
        const controlValue = parameters[control.id];

        if (controlValue !== null && controlValue !== undefined && controlValue !== '') {
          // Check that all masters have values
          for (const masterId of control.masterDependencies) {
            const masterValue = parameters[masterId];

            if (masterValue === null || masterValue === undefined || masterValue === '') {
              result.valid = false;
              result.errors.push({
                controlId: control.id,
                controlLabel: control.label,
                errorCode: 'dependency.master.required',
                errorMessage: `${control.label} requires a value for its dependency`,
                masterControlId: masterId,
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Extract default value from input control definition
   * @private
   */
  _extractDefaultValue(control) {
    if (!control.state) {
      return null;
    }

    // Return the current value if available
    if (control.state.value !== null && control.state.value !== undefined) {
      return control.state.value;
    }

    // For select controls, return the first selected option
    if (control.state.options && control.state.options.length > 0) {
      const selectedOption = control.state.options.find(option => option.selected);
      if (selectedOption) {
        return selectedOption.value;
      }

      // If no option is selected, return the first option for single-select controls
      if (control.type && control.type.includes('single')) {
        return control.state.options[0].value;
      }
    }

    return null;
  }

  /**
   * Get cached result if available and not expired
   * @private
   */
  _getCachedResult(cacheKey) {
    const cached = this.controlDefinitionsCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && new Date() < expiry) {
      return cached;
    }

    // Clean up expired cache entry
    if (cached) {
      this.controlDefinitionsCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    }

    return null;
  }

  /**
   * Set cached result with expiry
   * @private
   */
  _setCachedResult(cacheKey, result) {
    this.controlDefinitionsCache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, new Date(Date.now() + this.defaultCacheTimeout));
  }

  /**
   * Clear cache for a specific report or all cache
   * @param {string} reportUri - Optional report URI to clear specific cache
   */
  clearCache(reportUri = null) {
    if (reportUri) {
      // Clear cache entries for specific report
      for (const [key] of this.controlDefinitionsCache.entries()) {
        if (key.startsWith(reportUri + ':')) {
          this.controlDefinitionsCache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.controlDefinitionsCache.clear();
      this.cacheExpiry.clear();
    }

    if (this.config.debugMode) {
      console.log(`[Input Control Service] Cache cleared${reportUri ? ' for ' + reportUri : ''}`);
    }
  }

  /**
   * Get input control service statistics
   * @returns {object} Service statistics
   */
  getServiceStatistics() {
    return {
      initialized: this.initialized,
      apiClientAuthenticated: this.apiClient.isSessionValid(),
      cacheSize: this.controlDefinitionsCache.size,
      supportedControlTypes: Object.values(INPUT_CONTROL_TYPES),
      supportedDataTypes: Object.values(INPUT_CONTROL_DATA_TYPES),
      supportedValidationRules: Object.values(VALIDATION_RULE_TYPES),
      dependencyResolutionActive: this.dependencyResolutionStack.size > 0,
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose() {
    this.initialized = false;
    this.clearCache();
    this.dependencyResolutionStack.clear();

    if (this.config.debugMode) {
      console.log('[Input Control Service] Service disposed');
    }
  }
}

export default InputControlService;
export { INPUT_CONTROL_TYPES, INPUT_CONTROL_DATA_TYPES, VALIDATION_RULE_TYPES };
