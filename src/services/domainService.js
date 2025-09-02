/**
 * Domain Management Service for JasperReports MCP Server
 *
 * This service provides comprehensive domain management operations for JasperReports semantic layer including:
 * - Domain definition retrieval and metadata parsing
 * - Schema information and structure handling
 * - Bundle management operations
 * - Domain validation and dependency checking
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import APIClient from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { getErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  DomainGetRequest,
  DomainListRequest,
  DomainUpdateRequest,
  DomainValidateRequest,
  BundleUploadRequest,
  BundleManageRequest,
  SchemaGetRequest,
} from '../models/requests.js';
import {
  DomainGetResponse,
  DomainListResponse,
  DomainUpdateResponse,
  DomainValidateResponse,
  BundleUploadResponse,
  BundleManageResponse,
  SchemaGetResponse,
  DomainInfo,
} from '../models/responses.js';

/**
 * Domain types supported by JasperReports Server
 */
const DOMAIN_TYPES = {
  SEMANTIC_LAYER: 'semanticLayerDataSource',
  DOMAIN: 'domain',
  SCHEMA: 'schema',
};

/**
 * Bundle types for domain management
 */
const BUNDLE_TYPES = {
  DOMAIN_BUNDLE: 'domainBundle',
  SCHEMA_BUNDLE: 'schemaBundle',
  METADATA_BUNDLE: 'metadataBundle',
};

/**
 * Domain Service class providing comprehensive domain management
 */
class DomainService {
  constructor(config = null, apiClient = null, errorHandler = null) {
    this.config = config || getConfiguration();
    this.apiClient = apiClient || new APIClient(this.config);
    this.errorHandler = errorHandler || getErrorHandler();
    this.initialized = false;
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
        console.log('[Domain Service] Service initialized successfully');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.initialize');
      throw this.errorHandler.mapJasperError(error, 'Failed to initialize domain service');
    }
  } /**
 
  * Retrieve domain definitions and metadata (Requirement 7.1)
   * @param {object} params - Domain retrieval parameters
   * @returns {Promise<DomainGetResponse>} Domain definition and metadata
   */
  async getDomain(params) {
    await this.initialize();

    const request = new DomainGetRequest(params);
    Validator.validateDomainGet(request);

    try {
      const startTime = Date.now();

      // Build the API endpoint for domain retrieval
      const domainUri = this._normalizeDomainUri(request.domainUri);
      const endpoint = `/rest_v2/resources${domainUri}`;

      // Add query parameters for metadata inclusion
      const queryParams = new URLSearchParams();
      if (request.includeMetadata) {
        queryParams.append('expanded', 'true');
      }
      if (request.includeSchema) {
        queryParams.append('includeSchema', 'true');
      }
      if (request.includePermissions) {
        queryParams.append('includePermissions', 'true');
      }

      const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

      if (this.config.debugMode) {
        console.log(`[Domain Service] Retrieving domain: ${domainUri}`);
      }

      const response = await this.apiClient.get(url);

      // Parse domain definition and metadata
      const domainData = this._parseDomainDefinition(response.data);

      const executionTime = Date.now() - startTime;

      return new DomainGetResponse({
        success: true,
        domainUri: request.domainUri,
        domainInfo: domainData,
        metadata: domainData.metadata,
        schema: domainData.schema,
        permissions: domainData.permissions,
        executionTime,
        retrievalTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.getDomain', {
        domainUri: request.domainUri,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to retrieve domain: ${request.domainUri}`
      );
    }
  }

  /**
   * List domains with filtering and cataloging (Requirement 7.7)
   * @param {object} params - Domain listing parameters
   * @returns {Promise<DomainListResponse>} List of domains with filtering
   */
  async listDomains(params = {}) {
    await this.initialize();

    const request = new DomainListRequest(params);
    Validator.validateDomainList(request);

    try {
      const startTime = Date.now();

      // Build the API endpoint for domain listing
      const endpoint = '/rest_v2/resources';

      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      queryParams.append('type', DOMAIN_TYPES.SEMANTIC_LAYER);
      queryParams.append('type', DOMAIN_TYPES.DOMAIN);

      if (request.folderUri) {
        queryParams.append('folderUri', request.folderUri);
      }
      if (request.recursive) {
        queryParams.append('recursive', 'true');
      }
      if (request.limit) {
        queryParams.append('limit', request.limit.toString());
      }
      if (request.offset) {
        queryParams.append('offset', request.offset.toString());
      }
      if (request.sortBy) {
        queryParams.append('sortBy', request.sortBy);
      }
      if (request.accessType) {
        queryParams.append('accessType', request.accessType);
      }

      const url = `${endpoint}?${queryParams}`;

      if (this.config.debugMode) {
        console.log(`[Domain Service] Listing domains with filters: ${JSON.stringify(request)}`);
      }

      const response = await this.apiClient.get(url);

      // Parse and filter domain list
      const domains = this._parseDomainList(response.data, request);

      const executionTime = Date.now() - startTime;

      return new DomainListResponse({
        success: true,
        domains,
        totalCount: domains.length,
        filteredCount: domains.length,
        executionTime,
        listingTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.listDomains', { params });
      throw this.errorHandler.mapJasperError(error, 'Failed to list domains');
    }
  }
  /**
   * Get schema information and structure (Requirement 7.2)
   * @param {object} params - Schema retrieval parameters
   * @returns {Promise<SchemaGetResponse>} Schema information and structure
   */
  async getSchema(params) {
    await this.initialize();

    const request = new SchemaGetRequest(params);
    Validator.validateSchemaGet(request);

    try {
      const startTime = Date.now();

      // Build the API endpoint for schema retrieval
      const domainUri = this._normalizeDomainUri(request.domainUri);
      const endpoint = `/rest_v2/domains${domainUri}/schema`;

      // Add query parameters for schema details
      const queryParams = new URLSearchParams();
      if (request.includeFields) {
        queryParams.append('includeFields', 'true');
      }
      if (request.includeJoins) {
        queryParams.append('includeJoins', 'true');
      }
      if (request.includeCalculatedFields) {
        queryParams.append('includeCalculatedFields', 'true');
      }

      const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

      if (this.config.debugMode) {
        console.log(`[Domain Service] Retrieving schema for domain: ${domainUri}`);
      }

      const response = await this.apiClient.get(url);

      // Parse schema structure
      const schemaData = this._parseSchemaStructure(response.data);

      const executionTime = Date.now() - startTime;

      return new SchemaGetResponse({
        success: true,
        domainUri: request.domainUri,
        schema: schemaData,
        fields: schemaData.fields,
        joins: schemaData.joins,
        calculatedFields: schemaData.calculatedFields,
        executionTime,
        retrievalTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.getSchema', {
        domainUri: request.domainUri,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to retrieve schema for domain: ${request.domainUri}`
      );
    }
  }

  /**
   * Upload and manage domain bundles (Requirement 7.3)
   * @param {object} params - Bundle upload parameters
   * @returns {Promise<BundleUploadResponse>} Bundle upload result
   */
  async uploadBundle(params) {
    await this.initialize();

    const request = new BundleUploadRequest(params);
    Validator.validateBundleUpload(request);

    try {
      const startTime = Date.now();

      // Prepare bundle content for upload
      const bundleContent = request.bundleContent;
      const contentType = this._getBundleContentType(request.bundleType);

      // Build the API endpoint for bundle upload
      const endpoint = '/rest_v2/import';

      // Prepare form data for multipart upload
      const formData = new FormData();

      if (typeof bundleContent === 'string') {
        // Base64 encoded content
        const binaryContent = this.apiClient.decodeBase64(bundleContent);
        formData.append(
          'file',
          new Blob([binaryContent], { type: contentType }),
          request.bundleName
        );
      } else {
        // Direct binary content
        formData.append(
          'file',
          new Blob([bundleContent], { type: contentType }),
          request.bundleName
        );
      }

      // Add import parameters
      if (request.targetFolder) {
        formData.append('folderUri', request.targetFolder);
      }
      if (request.overwrite) {
        formData.append('update', 'true');
      }
      if (request.skipDependencyCheck) {
        formData.append('skipDependencyValidation', 'true');
      }

      if (this.config.debugMode) {
        console.log(`[Domain Service] Uploading bundle: ${request.bundleName}`);
      }

      const response = await this.apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const executionTime = Date.now() - startTime;

      return new BundleUploadResponse({
        success: true,
        bundleName: request.bundleName,
        bundleType: request.bundleType,
        targetFolder: request.targetFolder,
        importResults: response.data,
        executionTime,
        uploadTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.uploadBundle', {
        bundleName: request.bundleName,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to upload bundle: ${request.bundleName}`
      );
    }
  } /**

   * Manage domain bundles (export, delete, etc.) (Requirement 7.3)
   * @param {object} params - Bundle management parameters
   * @returns {Promise<BundleManageResponse>} Bundle management result
   */
  async manageBundle(params) {
    await this.initialize();

    const request = new BundleManageRequest(params);
    Validator.validateBundleManage(request);

    try {
      const startTime = Date.now();
      let response;

      switch (request.operation) {
        case 'export':
          response = await this._exportBundle(request);
          break;
        case 'delete':
          response = await this._deleteBundle(request);
          break;
        case 'validate':
          response = await this._validateBundle(request);
          break;
        default:
          throw new Error(`Unsupported bundle operation: ${request.operation}`);
      }

      const executionTime = Date.now() - startTime;

      return new BundleManageResponse({
        success: true,
        operation: request.operation,
        bundleUri: request.bundleUri,
        result: response,
        executionTime,
        operationTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.manageBundle', {
        operation: request.operation,
        bundleUri: request.bundleUri,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to ${request.operation} bundle: ${request.bundleUri}`
      );
    }
  }

  /**
   * Validate domain integrity and dependencies (Requirement 7.4)
   * @param {object} params - Domain validation parameters
   * @returns {Promise<DomainValidateResponse>} Validation result
   */
  async validateDomain(params) {
    await this.initialize();

    const request = new DomainValidateRequest(params);
    Validator.validateDomainValidate(request);

    try {
      const startTime = Date.now();

      // Build the API endpoint for domain validation
      const domainUri = this._normalizeDomainUri(request.domainUri);
      const endpoint = `/rest_v2/domains${domainUri}/validate`;

      // Add validation parameters
      const queryParams = new URLSearchParams();
      if (request.checkDependencies) {
        queryParams.append('checkDependencies', 'true');
      }
      if (request.checkIntegrity) {
        queryParams.append('checkIntegrity', 'true');
      }
      if (request.checkPermissions) {
        queryParams.append('checkPermissions', 'true');
      }

      const url = queryParams.toString() ? `${endpoint}?${queryParams}` : endpoint;

      if (this.config.debugMode) {
        console.log(`[Domain Service] Validating domain: ${domainUri}`);
      }

      const response = await this.apiClient.post(url, {});

      // Parse validation results
      const validationResults = this._parseValidationResults(response.data);

      const executionTime = Date.now() - startTime;

      return new DomainValidateResponse({
        success: true,
        domainUri: request.domainUri,
        validationResults,
        isValid: validationResults.isValid,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        dependencies: validationResults.dependencies,
        executionTime,
        validationTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.validateDomain', {
        domainUri: request.domainUri,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to validate domain: ${request.domainUri}`
      );
    }
  }

  /**
   * Update domain definitions and metadata (Requirement 7.6)
   * @param {object} params - Domain update parameters
   * @returns {Promise<DomainUpdateResponse>} Update result
   */
  async updateDomain(params) {
    await this.initialize();

    const request = new DomainUpdateRequest(params);
    Validator.validateDomainUpdate(request);

    try {
      const startTime = Date.now();

      // Build the API endpoint for domain update
      const domainUri = this._normalizeDomainUri(request.domainUri);
      const endpoint = `/rest_v2/resources${domainUri}`;

      // Prepare update payload
      const updatePayload = this._buildDomainUpdatePayload(request);

      if (this.config.debugMode) {
        console.log(`[Domain Service] Updating domain: ${domainUri}`);
      }

      const response = await this.apiClient.put(endpoint, updatePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const executionTime = Date.now() - startTime;

      return new DomainUpdateResponse({
        success: true,
        domainUri: request.domainUri,
        updateResults: response.data,
        executionTime,
        updateTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.errorHandler.logError(error, 'DomainService.updateDomain', {
        domainUri: request.domainUri,
      });
      throw this.errorHandler.mapJasperError(
        error,
        `Failed to update domain: ${request.domainUri}`
      );
    }
  }
  // Private helper methods

  /**
   * Normalize domain URI to ensure proper format
   * @param {string} domainUri - Raw domain URI
   * @returns {string} Normalized domain URI
   */
  _normalizeDomainUri(domainUri) {
    if (!domainUri) {
      throw new Error('Domain URI is required');
    }

    // Ensure URI starts with /
    if (!domainUri.startsWith('/')) {
      domainUri = '/' + domainUri;
    }

    return domainUri;
  }

  /**
   * Parse domain definition and extract metadata
   * @param {object} rawData - Raw domain data from API
   * @returns {object} Parsed domain information
   */
  _parseDomainDefinition(rawData) {
    const domainInfo = new DomainInfo({
      uri: rawData.uri,
      label: rawData.label,
      description: rawData.description,
      type: rawData.type,
      version: rawData.version,
      creationDate: rawData.creationDate,
      updateDate: rawData.updateDate,
      permissionMask: rawData.permissionMask,
    });

    return {
      ...domainInfo,
      metadata: {
        dataSource: rawData.dataSource,
        bundles: rawData.bundles || [],
        security: rawData.security || {},
        properties: rawData.properties || {},
      },
      schema: rawData.schema || null,
      permissions: rawData.permissions || [],
    };
  }

  /**
   * Parse domain list and apply additional filtering
   * @param {object} rawData - Raw domain list from API
   * @param {object} request - Original request for additional filtering
   * @returns {Array} Filtered domain list
   */
  _parseDomainList(rawData, request) {
    let domains = rawData.resourceLookup || [];

    // Apply additional client-side filtering if needed
    if (request.nameFilter) {
      const namePattern = new RegExp(request.nameFilter, 'i');
      domains = domains.filter(domain => namePattern.test(domain.label || domain.name));
    }

    if (request.descriptionFilter) {
      const descPattern = new RegExp(request.descriptionFilter, 'i');
      domains = domains.filter(domain => descPattern.test(domain.description || ''));
    }

    // Transform to DomainInfo objects
    return domains.map(
      domain =>
        new DomainInfo({
          uri: domain.uri,
          label: domain.label,
          description: domain.description,
          type: domain.type,
          version: domain.version,
          creationDate: domain.creationDate,
          updateDate: domain.updateDate,
          permissionMask: domain.permissionMask,
        })
    );
  }

  /**
   * Parse schema structure from API response
   * @param {object} rawData - Raw schema data from API
   * @returns {object} Parsed schema structure
   */
  _parseSchemaStructure(rawData) {
    return {
      name: rawData.name,
      description: rawData.description,
      fields: rawData.fields || [],
      joins: rawData.joins || [],
      calculatedFields: rawData.calculatedFields || [],
      tables: rawData.tables || [],
      relationships: rawData.relationships || [],
      metadata: rawData.metadata || {},
    };
  }

  /**
   * Get content type for bundle based on bundle type
   * @param {string} bundleType - Type of bundle
   * @returns {string} Content type
   */
  _getBundleContentType(bundleType) {
    const contentTypes = {
      [BUNDLE_TYPES.DOMAIN_BUNDLE]: 'application/zip',
      [BUNDLE_TYPES.SCHEMA_BUNDLE]: 'application/xml',
      [BUNDLE_TYPES.METADATA_BUNDLE]: 'application/json',
    };

    return contentTypes[bundleType] || 'application/octet-stream';
  } /**
   *
 Export bundle from domain
   * @param {object} request - Bundle export request
   * @returns {Promise<object>} Export result
   */
  async _exportBundle(request) {
    const domainUri = this._normalizeDomainUri(request.bundleUri);
    const endpoint = `/rest_v2/export`;

    const exportParams = {
      uris: [domainUri],
      exportType: request.exportType || 'everything',
      includeAccessEvents: request.includeAccessEvents || false,
      includeAuditEvents: request.includeAuditEvents || false,
      includeMonitoringEvents: request.includeMonitoringEvents || false,
    };

    if (this.config.debugMode) {
      console.log(`[Domain Service] Exporting bundle: ${domainUri}`);
    }

    const response = await this.apiClient.post(endpoint, exportParams);

    return {
      exportId: response.data.id,
      status: response.data.status,
      downloadUrl: response.data.downloadUrl,
    };
  }

  /**
   * Delete bundle from domain
   * @param {object} request - Bundle delete request
   * @returns {Promise<object>} Delete result
   */
  async _deleteBundle(request) {
    const domainUri = this._normalizeDomainUri(request.bundleUri);
    const endpoint = `/rest_v2/resources${domainUri}`;

    if (this.config.debugMode) {
      console.log(`[Domain Service] Deleting bundle: ${domainUri}`);
    }

    await this.apiClient.delete(endpoint);

    return {
      deleted: true,
      deletedUri: domainUri,
    };
  }

  /**
   * Validate bundle integrity
   * @param {object} request - Bundle validation request
   * @returns {Promise<object>} Validation result
   */
  async _validateBundle(request) {
    const domainUri = this._normalizeDomainUri(request.bundleUri);
    const endpoint = `/rest_v2/resources${domainUri}/validate`;

    if (this.config.debugMode) {
      console.log(`[Domain Service] Validating bundle: ${domainUri}`);
    }

    const response = await this.apiClient.post(endpoint, {});

    return this._parseValidationResults(response.data);
  }

  /**
   * Parse validation results from API response
   * @param {object} rawData - Raw validation data from API
   * @returns {object} Parsed validation results
   */
  _parseValidationResults(rawData) {
    return {
      isValid: rawData.valid || false,
      errors: rawData.errors || [],
      warnings: rawData.warnings || [],
      dependencies: rawData.dependencies || [],
      validationDetails: rawData.details || {},
    };
  }

  /**
   * Build domain update payload
   * @param {object} request - Domain update request
   * @returns {object} Update payload
   */
  _buildDomainUpdatePayload(request) {
    const payload = {
      label: request.label,
      description: request.description,
    };

    if (request.metadata) {
      payload.metadata = request.metadata;
    }

    if (request.properties) {
      payload.properties = request.properties;
    }

    if (request.security) {
      payload.security = request.security;
    }

    return payload;
  }
}

export default DomainService;
