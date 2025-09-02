/**
 * Resource Management Service for JasperReports MCP Server
 *
 * This service provides comprehensive CRUD operations for JasperReports resources including:
 * - JRXML upload functionality with base64 encoding and reportUnit creation
 * - Resource listing with filtering, pagination, and recursive options
 * - Resource retrieval, update, and deletion operations
 * - Folder creation and datasource reference handling
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import APIClient from '../utils/apiClient.js';
import { getConfiguration } from '../config/environment.js';
import { getErrorHandler } from '../utils/errorHandler.js';
import { Validator } from '../utils/validators.js';
import {
  ResourceUploadRequest,
  ResourceListRequest,
  ResourceGetRequest,
  ResourceUpdateRequest,
  ResourceDeleteRequest,
} from '../models/requests.js';
import {
  ResourceUploadResponse,
  ResourceListResponse,
  ResourceGetResponse,
  ResourceUpdateResponse,
  ResourceDeleteResponse,
  ResourceInfo,
} from '../models/responses.js';

/**
 * Resource types supported by JasperReports Server
 */
const RESOURCE_TYPES = {
  REPORT_UNIT: 'reportUnit',
  FOLDER: 'folder',
  DATA_SOURCE: 'dataSource',
  INPUT_CONTROL: 'inputControl',
  FILE: 'file',
  DOMAIN: 'domain',
  JRXML: 'jrxml',
  IMAGE: 'img',
  JAR: 'jar',
  PROPERTIES: 'prop',
  JRTX: 'jrtx',
};

/**
 * Content types for different resource types
 */
const CONTENT_TYPES = {
  [RESOURCE_TYPES.JRXML]: 'application/xml',
  [RESOURCE_TYPES.IMAGE]: 'image/*',
  [RESOURCE_TYPES.JAR]: 'application/java-archive',
  [RESOURCE_TYPES.PROPERTIES]: 'text/plain',
  [RESOURCE_TYPES.JRTX]: 'application/xml',
};

/**
 * Resource Service class providing comprehensive resource management
 */
class ResourceService {
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
        console.log('[Resource Service] Service initialized successfully');
      }
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.initialize');
      throw this.errorHandler.mapJasperError(error, 'Failed to initialize resource service');
    }
  }

  /**
   * Upload a resource (JRXML report, folder, datasource, etc.) to JasperReports Server
   * @param {object} params - Upload parameters
   * @returns {Promise<ResourceUploadResponse>} Upload result
   */
  async uploadResource(params) {
    await this.initialize();

    // Validate input parameters
    const request = new ResourceUploadRequest(params);
    Validator.validateResourceUpload(request);

    try {
      const startTime = Date.now();

      // Determine the upload strategy based on resource type
      let result;
      if (request.jrxmlContent) {
        result = await this._uploadJRXMLReport(request);
      } else if (request.resourceType === RESOURCE_TYPES.FOLDER) {
        result = await this._createFolder(request);
      } else {
        result = await this._uploadGenericResource(request);
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Resource Service] Resource uploaded successfully: ${request.resourcePath} (${executionTime}ms)`
        );
      }

      return new ResourceUploadResponse({
        ...result,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.uploadResource', {
        resourcePath: request.resourcePath,
      });
      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to upload resource: ${request.resourcePath}`
      );
    }
  }

  /**
   * List resources in a folder with filtering and pagination
   * @param {object} params - List parameters
   * @returns {Promise<ResourceListResponse>} List of resources
   */
  async listResources(params = {}) {
    await this.initialize();

    // Validate input parameters
    const request = new ResourceListRequest(params);
    Validator.validateResourceList(request);

    try {
      const startTime = Date.now();

      // Build query parameters
      const queryParams = this._buildListQueryParams(request);

      // Make API request
      const response = await this.apiClient.get('/rest_v2/resources', {
        params: queryParams,
      });

      if (response.status !== 200) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Resource listing failed'
        );
      }

      // Process response data
      const resources = this._processResourceList(response.data);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Resource Service] Listed ${resources.length} resources from ${request.folderUri} (${executionTime}ms)`
        );
      }

      return new ResourceListResponse({
        resources,
        totalCount: resources.length,
        offset: request.offset,
        limit: request.limit,
        hasMore: resources.length === request.limit,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.listResources', {
        folderUri: request.folderUri,
      });
      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to list resources in folder: ${request.folderUri}`
      );
    }
  }

  /**
   * Get a specific resource with its content and metadata
   * @param {object} params - Get parameters
   * @returns {Promise<ResourceGetResponse>} Resource details
   */
  async getResource(params) {
    await this.initialize();

    // Validate input parameters
    const request = new ResourceGetRequest(params);
    Validator.validateResourceGet(request);

    try {
      const startTime = Date.now();

      // Get resource metadata
      const metadataResponse = await this.apiClient.get(`/rest_v2/resources${request.resourceUri}`);

      if (metadataResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Resource', request.resourceUri);
      }

      if (metadataResponse.status !== 200) {
        throw this.errorHandler.mapHttpError(
          metadataResponse.status,
          metadataResponse.data,
          'Resource retrieval failed'
        );
      }

      let content = null;
      let contentType = null;
      let size = null;

      // Get resource content if requested
      if (request.includeContent) {
        try {
          const contentResponse = await this.apiClient.get(
            `/rest_v2/resources${request.resourceUri}`,
            {
              headers: { Accept: 'application/octet-stream' },
            }
          );

          if (contentResponse.status === 200) {
            content = contentResponse.data;
            contentType = contentResponse.headers['content-type'];
            size = contentResponse.headers['content-length']
              ? parseInt(contentResponse.headers['content-length'])
              : null;
          }
        } catch (contentError) {
          // Content retrieval is optional, log but don't fail
          if (this.config.debugMode) {
            console.log(
              `[Resource Service] Could not retrieve content for ${request.resourceUri}: ${contentError.message}`
            );
          }
        }
      }

      const resource = this._processResourceMetadata(metadataResponse.data);
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Resource Service] Retrieved resource: ${request.resourceUri} (${executionTime}ms)`
        );
      }

      return new ResourceGetResponse({
        resource,
        content,
        contentType,
        size,
        metadata: request.includeMetadata ? metadataResponse.data : {},
        lastModified: resource.updateDate,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.getResource', {
        resourceUri: request.resourceUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to get resource: ${request.resourceUri}`
      );
    }
  }

  /**
   * Update an existing resource
   * @param {object} params - Update parameters
   * @returns {Promise<ResourceUpdateResponse>} Update result
   */
  async updateResource(params) {
    await this.initialize();

    // Validate input parameters
    const request = new ResourceUpdateRequest(params);
    Validator.validateResourceUpdate(request);

    try {
      const startTime = Date.now();

      // Check if resource exists
      const existsResponse = await this.apiClient.get(`/rest_v2/resources${request.resourceUri}`);
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Resource', request.resourceUri);
      }

      // Build update payload
      const updatePayload = this._buildUpdatePayload(request);

      // Perform update
      const response = await this.apiClient.put(
        `/rest_v2/resources${request.resourceUri}`,
        updatePayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            overwrite: request.overwrite,
          },
        }
      );

      if (response.status !== 200 && response.status !== 201) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Resource update failed'
        );
      }

      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Resource Service] Resource updated successfully: ${request.resourceUri} (${executionTime}ms)`
        );
      }

      return new ResourceUpdateResponse({
        resourceUri: request.resourceUri,
        updateTimestamp: new Date().toISOString(),
        validationStatus: 'valid',
        validationMessages: [],
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.updateResource', {
        resourceUri: request.resourceUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to update resource: ${request.resourceUri}`
      );
    }
  }

  /**
   * Delete a resource from JasperReports Server
   * @param {object} params - Delete parameters
   * @returns {Promise<ResourceDeleteResponse>} Delete result
   */
  async deleteResource(params) {
    await this.initialize();

    // Validate input parameters
    const request = new ResourceDeleteRequest(params);
    Validator.validateResourceDelete(request);

    try {
      const startTime = Date.now();
      const deletedResources = [];

      // Check if resource exists and get its type
      const existsResponse = await this.apiClient.get(`/rest_v2/resources${request.resourceUri}`);
      if (existsResponse.status === 404) {
        throw this.errorHandler.createResourceNotFoundError('Resource', request.resourceUri);
      }

      const resourceType = existsResponse.data?.resourceType || existsResponse.data?.type;

      // Perform main resource deletion first
      const response = await this.apiClient.delete(`/rest_v2/resources${request.resourceUri}`, {
        params: {
          force: request.force,
        },
      });

      if (response.status !== 200 && response.status !== 204) {
        throw this.errorHandler.mapHttpError(
          response.status,
          response.data,
          'Resource deletion failed'
        );
      }

      deletedResources.push(request.resourceUri);

      // If it's a reportUnit, check for _files folder (for local resources like images, subreports)
      // Note: With embedded JRXML, we no longer need to delete separate .jrxml files
      if (resourceType === 'reportUnit') {
        const filesUri = `${request.resourceUri}_files`;

        try {
          // Check if _files folder exists
          const filesExistsResponse = await this.apiClient.get(`/rest_v2/resources${filesUri}`);
          if (filesExistsResponse.status === 200) {
            // Delete the _files folder and all its contents
            const filesDeleteResponse = await this.apiClient.delete(
              `/rest_v2/resources${filesUri}`,
              {
                params: {
                  force: true, // Force delete to remove all contents
                },
              }
            );

            if (filesDeleteResponse.status === 200 || filesDeleteResponse.status === 204) {
              deletedResources.push(filesUri);
              if (this.config.debugMode) {
                console.log(`[Resource Service] Associated files folder deleted: ${filesUri}`);
              }
            }
          }
        } catch (filesError) {
          // Log warning but don't fail the main deletion if _files folder deletion fails
          if (this.config.debugMode) {
            console.warn(
              `[Resource Service] Could not delete associated files folder ${filesUri}:`,
              filesError.message
            );
          }
        }
      }
      const executionTime = Date.now() - startTime;

      if (this.config.debugMode) {
        console.log(
          `[Resource Service] Resource deleted successfully: ${request.resourceUri} (${executionTime}ms)`
        );
        if (deletedResources.length > 1) {
          console.log(`[Resource Service] Total resources deleted: ${deletedResources.join(', ')}`);
        }
      }

      return new ResourceDeleteResponse({
        resourceUri: request.resourceUri,
        deleteTimestamp: new Date().toISOString(),
        deletedResources,
        executionTime,
        requestId: request.requestId,
      });
    } catch (error) {
      this.errorHandler.logError(error, 'ResourceService.deleteResource', {
        resourceUri: request.resourceUri,
      });

      if (error.name === 'MCPError') {
        throw error;
      }

      throw this.errorHandler.mapHttpError(
        error.statusCode || 500,
        error.responseData || error.message,
        `Failed to delete resource: ${request.resourceUri}`
      );
    }
  }

  /**
   * Upload JRXML report with embedded content (single-step process)
   * @private
   */
  async _uploadJRXMLReport(request) {
    // Validate JRXML content
    Validator.validateJRXMLContent(request.jrxmlContent);

    // Fix JRXML content to ensure it works without data source
    const fixedJrxmlContent = this._fixJRXMLContent(request.jrxmlContent);

    // Create folder structure if needed
    if (request.createFolders) {
      await this._ensureFolderStructure(request.resourcePath);
    }

    // Create report unit with embedded JRXML content (single step)
    const reportUnitDescriptor = {
      label: request.label,
      description: request.description || '',
      uri: request.resourcePath,
      type: RESOURCE_TYPES.REPORT_UNIT,
      jrxml: {
        jrxmlFile: {
          label: 'Main JRXML',
          type: 'jrxml',
          content: Buffer.from(fixedJrxmlContent).toString('base64'),
        },
      },
    };

    // Add datasource reference if provided
    if (request.dataSourceUri) {
      reportUnitDescriptor.dataSource = {
        dataSourceReference: {
          uri: request.dataSourceUri,
        },
      };
    }

    // Upload local resources if provided
    const localResourcesUploaded = [];
    if (request.localResources && request.localResources.length > 0) {
      const { default: FormData } = await import('form-data');

      for (const localResource of request.localResources) {
        const resourceUri = `${request.resourcePath}_files/${localResource.name}`;
        const resourceDescriptor = {
          label: localResource.name,
          description: `Local resource: ${localResource.name}`,
          uri: resourceUri,
          type: localResource.type || RESOURCE_TYPES.FILE,
        };

        const resourceFormData = new FormData();
        resourceFormData.append('type', localResource.type || RESOURCE_TYPES.FILE);

        const resourceDescriptorWithoutType = { ...resourceDescriptor };
        delete resourceDescriptorWithoutType.type;

        resourceFormData.append(
          'ResourceDescriptor',
          JSON.stringify(resourceDescriptorWithoutType),
          {
            contentType: 'application/json',
          }
        );

        const resourceContent = Buffer.isBuffer(localResource.content)
          ? localResource.content
          : this.apiClient.decodeBase64(localResource.content);

        resourceFormData.append('data', resourceContent, {
          filename: localResource.name,
          contentType:
            localResource.contentType ||
            CONTENT_TYPES[localResource.type] ||
            'application/octet-stream',
        });

        const resourceResponse = await this.apiClient.put(
          `/rest_v2/resources${resourceUri}`,
          resourceFormData,
          {
            headers: {
              ...resourceFormData.getHeaders(),
            },
            params: {
              createFolders: true,
              overwrite: request.overwrite,
            },
          }
        );

        if (resourceResponse.status === 200 || resourceResponse.status === 201) {
          localResourcesUploaded.push(localResource.name);
        }
      }
    }

    // Create the report unit using JSON (not multipart)
    const reportResponse = await this.apiClient.put(
      `/rest_v2/resources${request.resourcePath}`,
      reportUnitDescriptor,
      {
        headers: {
          'Content-Type': 'application/repository.reportUnit+json',
        },
        params: {
          createFolders: request.createFolders,
          overwrite: request.overwrite,
        },
      }
    );

    if (reportResponse.status !== 200 && reportResponse.status !== 201) {
      throw this.errorHandler.mapHttpError(
        reportResponse.status,
        reportResponse.data,
        'Report unit creation failed'
      );
    }

    return {
      resourceUri: request.resourcePath,
      resourceId: this._extractResourceId(reportResponse.data),
      resourceType: RESOURCE_TYPES.REPORT_UNIT,
      uploadTimestamp: new Date().toISOString(),
      validationStatus: 'valid',
      validationMessages: [],
      localResourcesUploaded,
      embeddedJrxml: true, // Indicates JRXML is embedded, not a separate file
    };
  }

  /**
   * Create a folder resource
   * @private
   */
  async _createFolder(request) {
    const folderDescriptor = {
      label: request.label,
      description: request.description || '',
      uri: request.resourcePath,
      type: RESOURCE_TYPES.FOLDER,
    };

    const response = await this.apiClient.put(
      `/rest_v2/resources${request.resourcePath}`,
      folderDescriptor,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          createFolders: request.createFolders,
          overwrite: request.overwrite,
        },
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      throw this.errorHandler.mapHttpError(
        response.status,
        response.data,
        'Folder creation failed'
      );
    }

    return {
      resourceUri: request.resourcePath,
      resourceId: this._extractResourceId(response.data),
      resourceType: RESOURCE_TYPES.FOLDER,
      uploadTimestamp: new Date().toISOString(),
      validationStatus: 'valid',
      validationMessages: [],
    };
  }

  /**
   * Upload generic resource (file, image, etc.)
   * @private
   */
  async _uploadGenericResource(request) {
    // This would handle other resource types like images, JARs, etc.
    // For now, we'll implement basic file upload
    const resourceDescriptor = {
      label: request.label,
      description: request.description || '',
      uri: request.resourcePath,
      type: request.resourceType || RESOURCE_TYPES.FILE,
    };

    const response = await this.apiClient.put(
      `/rest_v2/resources${request.resourcePath}`,
      resourceDescriptor,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          createFolders: request.createFolders,
          overwrite: request.overwrite,
        },
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      throw this.errorHandler.mapHttpError(
        response.status,
        response.data,
        'Generic resource upload failed'
      );
    }

    return {
      resourceUri: request.resourcePath,
      resourceId: this._extractResourceId(response.data),
      resourceType: request.resourceType || RESOURCE_TYPES.FILE,
      uploadTimestamp: new Date().toISOString(),
      validationStatus: 'valid',
      validationMessages: [],
    };
  }

  /**
   * Ensure folder structure exists for a resource path
   * @private
   */
  async _ensureFolderStructure(resourcePath) {
    const pathParts = resourcePath.split('/').filter(part => part.length > 0);
    let currentPath = '';

    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += '/' + pathParts[i];

      try {
        // Check if folder exists
        const response = await this.apiClient.get(`/rest_v2/resources${currentPath}`);
        if (response.status === 404) {
          // Create folder
          await this._createFolder({
            resourcePath: currentPath,
            label: pathParts[i],
            description: `Auto-created folder: ${pathParts[i]}`,
            resourceType: RESOURCE_TYPES.FOLDER,
            createFolders: false,
            overwrite: false,
          });
        }
      } catch (error) {
        // If folder creation fails, log but continue
        if (this.config.debugMode) {
          console.log(
            `[Resource Service] Could not create folder ${currentPath}: ${error.message}`
          );
        }
      }
    }
  }

  /**
   * Build query parameters for resource listing
   * @private
   */
  _buildListQueryParams(request) {
    const params = {};

    if (request.folderUri && request.folderUri !== '/') {
      params.folderUri = request.folderUri;
    }

    if (request.resourceType) {
      params.type = request.resourceType;
    }

    if (request.recursive) {
      params.recursive = true;
    }

    if (request.limit) {
      params.limit = request.limit;
    }

    if (request.offset) {
      params.offset = request.offset;
    }

    if (request.sortBy) {
      params.sortBy = request.sortBy;
    }

    if (request.sortOrder) {
      params.sortOrder = request.sortOrder;
    }

    if (request.searchQuery) {
      params.q = request.searchQuery;
    }

    return params;
  }

  /**
   * Process resource list response data
   * @private
   */
  _processResourceList(responseData) {
    if (!responseData) {
      return [];
    }

    // Handle both single resource and array responses
    const resourcesArray = Array.isArray(responseData.resourceLookup)
      ? responseData.resourceLookup
      : responseData.resourceLookup
        ? [responseData.resourceLookup]
        : [];

    return resourcesArray.map(
      resource =>
        new ResourceInfo({
          uri: resource.uri,
          label: resource.label,
          description: resource.description,
          type: resource.resourceType,
          creationDate: resource.creationDate,
          updateDate: resource.updateDate,
          version: resource.version,
          permissionMask: resource.permissionMask,
        })
    );
  }

  /**
   * Process resource metadata response
   * @private
   */
  _processResourceMetadata(responseData) {
    if (!responseData) {
      return {};
    }

    return new ResourceInfo({
      uri: responseData.uri,
      label: responseData.label,
      description: responseData.description,
      type: responseData.resourceType,
      creationDate: responseData.creationDate,
      updateDate: responseData.updateDate,
      version: responseData.version,
      permissionMask: responseData.permissionMask,
    });
  }

  /**
   * Build update payload for resource updates
   * @private
   */
  _buildUpdatePayload(request) {
    const payload = {};

    if (request.label) {
      payload.label = request.label;
    }

    if (request.description !== undefined) {
      payload.description = request.description;
    }

    if (request.jrxmlContent) {
      // For JRXML updates with embedded content
      const fixedJrxmlContent = this._fixJRXMLContent(request.jrxmlContent);
      payload.jrxml = {
        jrxmlFile: {
          label: 'Main JRXML',
          type: 'jrxml',
          content: Buffer.from(fixedJrxmlContent).toString('base64'),
        },
      };
    }

    return payload;
  }

  /**
   * Extract resource ID from response data
   * @private
   */
  _extractResourceId(responseData) {
    if (!responseData) {
      return null;
    }

    return responseData.uri || responseData.id || null;
  }

  /**
   * Fix JRXML content to ensure it works without data source
   * @private
   */
  _fixJRXMLContent(jrxmlContent) {
    // Check if JRXML already has whenNoDataType attribute
    if (jrxmlContent.includes('whenNoDataType=')) {
      return jrxmlContent;
    }

    // Add whenNoDataType="AllSectionsNoDetail" to ensure report renders without data
    const fixedContent = jrxmlContent.replace(
      /<jasperReport([^>]*?)>/,
      '<jasperReport$1 whenNoDataType="AllSectionsNoDetail">'
    );

    if (this.config.debugMode) {
      console.log('[Resource Service] Added whenNoDataType attribute to JRXML');
    }

    return fixedContent;
  }

  /**
   * Get resource service statistics
   * @returns {object} Service statistics
   */
  getServiceStatistics() {
    return {
      initialized: this.initialized,
      apiClientAuthenticated: this.apiClient.isSessionValid(),
      supportedResourceTypes: Object.values(RESOURCE_TYPES),
      supportedContentTypes: Object.keys(CONTENT_TYPES),
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  dispose() {
    this.initialized = false;

    if (this.config.debugMode) {
      console.log('[Resource Service] Service disposed');
    }
  }
}

export default ResourceService;
export { RESOURCE_TYPES, CONTENT_TYPES };
