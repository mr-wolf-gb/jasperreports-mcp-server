/**
 * Request model interfaces for JasperReports MCP Server
 * These models define the structure for all incoming requests to the server
 */

/**
 * Base request interface with common properties
 */
class BaseRequest {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date().toISOString();
    this.requestId = data.requestId || this.generateRequestId();
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Authentication request models
 */
class AuthenticationRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.authType = data.authType || 'basic';
    this.username = data.username;
    this.password = data.password;
    this.organization = data.organization;
  }
}

class ConnectionTestRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.includeServerInfo = data.includeServerInfo !== undefined ? data.includeServerInfo : true;
    this.timeout = data.timeout || 30000;
  }
}

/**
 * Resource management request models
 */
class ResourceUploadRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourcePath = data.resourcePath;
    this.label = data.label;
    this.description = data.description || '';
    this.resourceType = data.resourceType || 'reportUnit';
    this.jrxmlContent = data.jrxmlContent;
    this.dataSourceUri = data.dataSourceUri;
    this.localResources = data.localResources || [];
    this.overwrite = data.overwrite || false;
    this.createFolders = data.createFolders !== undefined ? data.createFolders : true;
  }
}

class ResourceListRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.folderUri = data.folderUri || '/';
    this.resourceType = data.resourceType;
    this.recursive = data.recursive || false;
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
    this.sortBy = data.sortBy || 'label';
    this.sortOrder = data.sortOrder || 'asc';
    this.searchQuery = data.searchQuery;
  }
}

class ResourceGetRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.includeContent = data.includeContent || false;
    this.includeMetadata = data.includeMetadata || true;
  }
}

class ResourceUpdateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.label = data.label;
    this.description = data.description;
    this.jrxmlContent = data.jrxmlContent;
    this.overwrite = data.overwrite || true;
  }
}

class ResourceDeleteRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.force = data.force || false;
  }
}

/**
 * Report execution request models
 */
class ReportExecutionRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.outputFormat = data.outputFormat || 'pdf';
    this.parameters = data.parameters || {};
    this.pages = data.pages;
    this.async = data.async || false;
    this.locale = data.locale || 'en_US';
    this.timezone = data.timezone || 'America/New_York';
    this.attachmentsPrefix = data.attachmentsPrefix;
    this.baseUrl = data.baseUrl;
  }
}

class ExecutionStatusRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.includeDetails = data.includeDetails || true;
  }
}

class ExecutionResultRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.exportId = data.exportId;
    this.attachmentName = data.attachmentName;
  }
}

class ExecutionCancelRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.force = data.force || false;
  }
}

/**
 * Input control request models
 */
class InputControlsRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.includeStructure = data.includeStructure || true;
    this.includeValues = data.includeValues || false;
  }
}

class InputControlValuesRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.controlId = data.controlId;
    this.values = data.values || {};
    this.freshData = data.freshData || false;
  }
}

class InputControlValidationRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.parameters = data.parameters || {};
    this.validateAll = data.validateAll || true;
  }
}

/**
 * Job management request models
 */
class JobCreationRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.label = data.label;
    this.description = data.description || '';
    this.reportUri = data.reportUri;
    this.schedule = data.schedule || {};
    this.outputFormats = data.outputFormats || ['pdf'];
    this.parameters = data.parameters || {};
    this.recipients = data.recipients || [];
    this.mailNotification = data.mailNotification || {};
    this.repositoryDestination = data.repositoryDestination;
  }
}

class JobListRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
    this.sortBy = data.sortBy || 'label';
    this.sortOrder = data.sortOrder || 'asc';
    this.searchQuery = data.searchQuery;
    this.owner = data.owner;
  }
}

class JobUpdateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.label = data.label;
    this.description = data.description;
    this.schedule = data.schedule;
    this.outputFormats = data.outputFormats;
    this.parameters = data.parameters;
    this.recipients = data.recipients;
  }
}

class JobDeleteRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.force = data.force || false;
  }
}

class JobExecuteRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.parameters = data.parameters || {};
  }
}

/**
 * Permission management request models
 */
class PermissionGetRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.includeInherited = data.includeInherited || true;
    this.resolveAll = data.resolveAll || false;
  }
}

class PermissionSetRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.permissions = data.permissions || [];
    this.replaceAll = data.replaceAll || false;
  }
}

/**
 * User and role management request models
 */
class UserCreateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.username = data.username;
    this.password = data.password;
    this.fullName = data.fullName;
    this.emailAddress = data.emailAddress;
    this.enabled = data.enabled !== false;
    this.externallyDefined = data.externallyDefined || false;
    this.roles = data.roles || [];
  }
}

class UserListRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
    this.searchQuery = data.searchQuery;
    this.includeRoles = data.includeRoles || false;
  }
}

class UserUpdateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.username = data.username;
    this.fullName = data.fullName;
    this.emailAddress = data.emailAddress;
    this.enabled = data.enabled;
    this.roles = data.roles;
  }
}

class RoleCreateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.roleName = data.roleName;
    this.description = data.description || '';
    this.externallyDefined = data.externallyDefined || false;
  }
}

class RoleListRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
    this.searchQuery = data.searchQuery;
  }
}

/**
 * Local resource definition for report uploads
 */
class LocalResource {
  constructor(data = {}) {
    this.name = data.name;
    this.type = data.type || 'img';
    this.content = data.content;
    this.contentType = data.contentType;
  }
}

/**
 * Schedule definition for job creation
 */
class ScheduleDefinition {
  constructor(data = {}) {
    this.type = data.type || 'simple'; // simple, calendar, cron
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.recurrenceInterval = data.recurrenceInterval;
    this.recurrenceIntervalUnit = data.recurrenceIntervalUnit;
    this.cronExpression = data.cronExpression;
    this.calendarTrigger = data.calendarTrigger;
  }
}

export {
  BaseRequest,
  AuthenticationRequest,
  ConnectionTestRequest,
  ResourceUploadRequest,
  ResourceListRequest,
  ResourceGetRequest,
  ResourceUpdateRequest,
  ResourceDeleteRequest,
  ReportExecutionRequest,
  ExecutionStatusRequest,
  ExecutionResultRequest,
  ExecutionCancelRequest,
  InputControlsRequest,
  InputControlValuesRequest,
  InputControlValidationRequest,
  JobCreationRequest,
  JobListRequest,
  JobUpdateRequest,
  JobDeleteRequest,
  JobExecuteRequest,
  DomainListRequest,
  DomainGetRequest,
  DomainUpdateRequest,
  DomainValidateRequest,
  DomainSchemaRequest,
  SchemaGetRequest,
  BundleUploadRequest,
  BundleManageRequest,
  PermissionGetRequest,
  PermissionSetRequest,
  UserCreateRequest,
  UserListRequest,
  UserUpdateRequest,
  RoleCreateRequest,
  RoleListRequest,
  LocalResource,
  ScheduleDefinition,
};

/**
 * Domain management request models
 */
class DomainGetRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.includeMetadata = data.includeMetadata || true;
    this.includeSchema = data.includeSchema || false;
    this.includePermissions = data.includePermissions || false;
  }
}

class DomainListRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.folderUri = data.folderUri;
    this.recursive = data.recursive || false;
    this.limit = data.limit || 100;
    this.offset = data.offset || 0;
    this.sortBy = data.sortBy;
    this.accessType = data.accessType;
    this.nameFilter = data.nameFilter;
    this.descriptionFilter = data.descriptionFilter;
  }
}

class DomainUpdateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.label = data.label;
    this.description = data.description;
    this.metadata = data.metadata;
    this.properties = data.properties;
    this.security = data.security;
  }
}

class DomainValidateRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.checkDependencies = data.checkDependencies || true;
    this.checkIntegrity = data.checkIntegrity || true;
    this.checkPermissions = data.checkPermissions || false;
  }
}

class SchemaGetRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.includeFields = data.includeFields || true;
    this.includeJoins = data.includeJoins || true;
    this.includeCalculatedFields = data.includeCalculatedFields || true;
  }
}

class BundleUploadRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.bundleName = data.bundleName;
    this.bundleType = data.bundleType;
    this.bundleContent = data.bundleContent;
    this.targetFolder = data.targetFolder;
    this.overwrite = data.overwrite || false;
    this.skipDependencyCheck = data.skipDependencyCheck || false;
  }
}

class BundleManageRequest extends BaseRequest {
  constructor(data = {}) {
    super(data);
    this.operation = data.operation; // export, delete, validate
    this.bundleUri = data.bundleUri;
    this.exportType = data.exportType;
    this.includeAccessEvents = data.includeAccessEvents || false;
    this.includeAuditEvents = data.includeAuditEvents || false;
    this.includeMonitoringEvents = data.includeMonitoringEvents || false;
  }
}

// Update the existing DomainSchemaRequest to match our SchemaGetRequest
class DomainSchemaRequest extends SchemaGetRequest {
  constructor(data = {}) {
    super(data);
  }
}
