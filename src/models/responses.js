/**
 * Response model interfaces for JasperReports MCP Server
 * These models define the structure for all outgoing responses from the server
 */

/**
 * Base response interface with common properties
 */
class BaseResponse {
  constructor(data = {}) {
    this.success = data.success !== false;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.requestId = data.requestId;
    this.executionTime = data.executionTime;
  }
}

/**
 * Authentication response models
 */
class AuthenticationResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.authenticated = data.authenticated || false;
    this.sessionId = data.sessionId;
    this.authMethod = data.authMethod;
    this.organization = data.organization;
    this.expiresAt = data.expiresAt;
    this.userDetails = data.userDetails || {};
  }
}

class ConnectionTestResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.connected = data.connected || false;
    this.serverInfo = data.serverInfo || {};
    this.responseTime = data.responseTime;
    this.version = data.version;
    this.edition = data.edition;
    this.features = data.features || [];
    this.authenticationMethods = data.authenticationMethods || [];
  }
}

/**
 * Resource management response models
 */
class ResourceUploadResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.resourceId = data.resourceId;
    this.resourceType = data.resourceType;
    this.uploadTimestamp = data.uploadTimestamp || new Date().toISOString();
    this.validationStatus = data.validationStatus || 'valid';
    this.validationMessages = data.validationMessages || [];
    this.localResourcesUploaded = data.localResourcesUploaded || [];
  }
}

class ResourceListResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resources = data.resources || [];
    this.totalCount = data.totalCount || 0;
    this.offset = data.offset || 0;
    this.limit = data.limit || 100;
    this.hasMore = data.hasMore || false;
  }
}

class ResourceGetResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resource = data.resource || {};
    this.content = data.content;
    this.contentType = data.contentType;
    this.metadata = data.metadata || {};
    this.lastModified = data.lastModified;
    this.size = data.size;
  }
}

class ResourceUpdateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.updateTimestamp = data.updateTimestamp || new Date().toISOString();
    this.validationStatus = data.validationStatus || 'valid';
    this.validationMessages = data.validationMessages || [];
  }
}

class ResourceDeleteResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.deleteTimestamp = data.deleteTimestamp || new Date().toISOString();
    this.deletedResources = data.deletedResources || [];
  }
}

/**
 * Report execution response models
 */
class ReportExecutionResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.status = data.status || 'ready';
    this.outputFormat = data.outputFormat;
    this.reportUri = data.reportUri;
    this.generationTime = data.generationTime;
    this.fileSize = data.fileSize;
    this.content = data.content;
    this.contentType = data.contentType;
    this.fileName = data.fileName;
    this.pages = data.pages;
    this.exports = data.exports || [];
  }
}

class ExecutionStatusResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.status = data.status; // queued, running, ready, cancelled, failed
    this.progress = data.progress || 0;
    this.currentPage = data.currentPage;
    this.totalPages = data.totalPages;
    this.exports = data.exports || [];
    this.errorDescriptor = data.errorDescriptor;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
  }
}

class ExecutionResultResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.exportId = data.exportId;
    this.outputFormat = data.outputFormat;
    this.content = data.content;
    this.contentType = data.contentType;
    this.fileName = data.fileName;
    this.fileSize = data.fileSize;
    this.attachmentName = data.attachmentName;
  }
}

class ExecutionCancelResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.executionId = data.executionId;
    this.cancelled = data.cancelled || false;
    this.cancelTimestamp = data.cancelTimestamp || new Date().toISOString();
    this.finalStatus = data.finalStatus;
  }
}

/**
 * Input control response models
 */
class InputControlsResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.inputControls = data.inputControls || [];
    this.structure = data.structure || {};
  }
}

class InputControlValuesResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.controlId = data.controlId;
    this.values = data.values || [];
    this.selectedValues = data.selectedValues || [];
  }
}

class InputControlValidationResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.reportUri = data.reportUri;
    this.valid = data.valid || false;
    this.validationResults = data.validationResults || [];
    this.errors = data.errors || [];
  }
}

/**
 * Job management response models
 */
class JobCreationResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.label = data.label;
    this.state = data.state || 'NORMAL';
    this.nextFireTime = data.nextFireTime;
    this.creationTimestamp = data.creationTimestamp || new Date().toISOString();
  }
}

class JobListResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.jobs = data.jobs || [];
    this.totalCount = data.totalCount || 0;
    this.offset = data.offset || 0;
    this.limit = data.limit || 100;
    this.hasMore = data.hasMore || false;
  }
}

class JobUpdateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.updateTimestamp = data.updateTimestamp || new Date().toISOString();
    this.nextFireTime = data.nextFireTime;
    this.state = data.state;
  }
}

class JobDeleteResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.deleteTimestamp = data.deleteTimestamp || new Date().toISOString();
  }
}

class JobExecuteResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.jobId = data.jobId;
    this.executionId = data.executionId;
    this.executionTimestamp = data.executionTimestamp || new Date().toISOString();
    this.status = data.status || 'running';
  }
}

/**
 * Domain management response models
 */
class DomainGetResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.domainInfo = data.domainInfo;
    this.metadata = data.metadata;
    this.schema = data.schema;
    this.permissions = data.permissions;
    this.retrievalTimestamp = data.retrievalTimestamp;
  }
}

class DomainListResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domains = data.domains || [];
    this.totalCount = data.totalCount || 0;
    this.filteredCount = data.filteredCount || 0;
    this.listingTimestamp = data.listingTimestamp;
  }
}

class DomainUpdateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.updateResults = data.updateResults;
    this.updateTimestamp = data.updateTimestamp;
  }
}

class DomainValidateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.validationResults = data.validationResults;
    this.isValid = data.isValid;
    this.errors = data.errors || [];
    this.warnings = data.warnings || [];
    this.dependencies = data.dependencies || [];
    this.validationTimestamp = data.validationTimestamp;
  }
}

class SchemaGetResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.schema = data.schema;
    this.fields = data.fields || [];
    this.joins = data.joins || [];
    this.calculatedFields = data.calculatedFields || [];
    this.retrievalTimestamp = data.retrievalTimestamp;
  }
}

class BundleUploadResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.bundleName = data.bundleName;
    this.bundleType = data.bundleType;
    this.targetFolder = data.targetFolder;
    this.importResults = data.importResults;
    this.uploadTimestamp = data.uploadTimestamp;
  }
}

class BundleManageResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.operation = data.operation;
    this.bundleUri = data.bundleUri;
    this.result = data.result;
    this.operationTimestamp = data.operationTimestamp;
  }
}

class DomainSchemaResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.domainUri = data.domainUri;
    this.schema = data.schema;
    this.fields = data.fields || [];
    this.joins = data.joins || [];
    this.calculatedFields = data.calculatedFields || [];
    this.retrievalTimestamp = data.retrievalTimestamp;
  }
}

/**
 * Domain information model
 */
class DomainInfo {
  constructor(data = {}) {
    this.uri = data.uri;
    this.label = data.label;
    this.description = data.description;
    this.type = data.type;
    this.version = data.version;
    this.creationDate = data.creationDate;
    this.updateDate = data.updateDate;
    this.permissionMask = data.permissionMask;
  }
}

/**
 * Permission management response models
 */
class PermissionGetResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.permissions = data.permissions || [];
    this.inheritedPermissions = data.inheritedPermissions || [];
    this.effectivePermissions = data.effectivePermissions || [];
  }
}

class PermissionSetResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.resourceUri = data.resourceUri;
    this.permissionsSet = data.permissionsSet || [];
    this.updateTimestamp = data.updateTimestamp || new Date().toISOString();
  }
}

/**
 * User and role management response models
 */
class UserCreateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.username = data.username;
    this.fullName = data.fullName;
    this.enabled = data.enabled;
    this.creationTimestamp = data.creationTimestamp || new Date().toISOString();
    this.roles = data.roles || [];
  }
}

class UserListResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.users = data.users || [];
    this.totalCount = data.totalCount || 0;
    this.offset = data.offset || 0;
    this.limit = data.limit || 100;
    this.hasMore = data.hasMore || false;
  }
}

class UserUpdateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.username = data.username;
    this.updateTimestamp = data.updateTimestamp || new Date().toISOString();
    this.roles = data.roles || [];
  }
}

class RoleCreateResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.roleName = data.roleName;
    this.description = data.description;
    this.creationTimestamp = data.creationTimestamp || new Date().toISOString();
  }
}

class RoleListResponse extends BaseResponse {
  constructor(data = {}) {
    super(data);
    this.roles = data.roles || [];
    this.totalCount = data.totalCount || 0;
    this.offset = data.offset || 0;
    this.limit = data.limit || 100;
    this.hasMore = data.hasMore || false;
  }
}

/**
 * Common data structures used in responses
 */
class ResourceInfo {
  constructor(data = {}) {
    this.uri = data.uri;
    this.label = data.label;
    this.description = data.description;
    this.type = data.type;
    this.creationDate = data.creationDate;
    this.updateDate = data.updateDate;
    this.version = data.version;
    this.permissionMask = data.permissionMask;
  }
}

class InputControl {
  constructor(data = {}) {
    this.id = data.id;
    this.label = data.label;
    this.description = data.description;
    this.type = data.type;
    this.uri = data.uri;
    this.mandatory = data.mandatory || false;
    this.readOnly = data.readOnly || false;
    this.visible = data.visible !== false;
    this.masterDependencies = data.masterDependencies || [];
    this.slaveDependencies = data.slaveDependencies || [];
    this.validationRules = data.validationRules || [];
    this.state = data.state || {};
  }
}

class JobInfo {
  constructor(data = {}) {
    this.id = data.id;
    this.version = data.version;
    this.label = data.label;
    this.description = data.description;
    this.owner = data.owner;
    this.state = data.state;
    this.previousFireTime = data.previousFireTime;
    this.nextFireTime = data.nextFireTime;
    this.source = data.source || {};
    this.trigger = data.trigger || {};
    this.mailNotification = data.mailNotification || {};
    this.alert = data.alert || {};
    this.contentRepositoryDestination = data.contentRepositoryDestination || {};
  }
}

class UserInfo {
  constructor(data = {}) {
    this.username = data.username;
    this.fullName = data.fullName;
    this.emailAddress = data.emailAddress;
    this.enabled = data.enabled;
    this.externallyDefined = data.externallyDefined;
    this.previousPasswordChangeTime = data.previousPasswordChangeTime;
    this.roles = data.roles || [];
  }
}

class RoleInfo {
  constructor(data = {}) {
    this.roleName = data.roleName;
    this.description = data.description;
    this.externallyDefined = data.externallyDefined;
  }
}

class PermissionInfo {
  constructor(data = {}) {
    this.recipient = data.recipient;
    this.mask = data.mask;
    this.uri = data.uri;
  }
}

class ValidationResult {
  constructor(data = {}) {
    this.field = data.field;
    this.valid = data.valid || false;
    this.errorCode = data.errorCode;
    this.errorMessage = data.errorMessage;
    this.errorArguments = data.errorArguments || [];
  }
}

class ExportInfo {
  constructor(data = {}) {
    this.id = data.id;
    this.status = data.status;
    this.outputFormat = data.outputFormat;
    this.pages = data.pages;
    this.attachmentsPrefix = data.attachmentsPrefix;
    this.outputResource = data.outputResource;
  }
}

export {
  BaseResponse,
  AuthenticationResponse,
  ConnectionTestResponse,
  ResourceUploadResponse,
  ResourceListResponse,
  ResourceGetResponse,
  ResourceUpdateResponse,
  ResourceDeleteResponse,
  ReportExecutionResponse,
  ExecutionStatusResponse,
  ExecutionResultResponse,
  ExecutionCancelResponse,
  InputControlsResponse,
  InputControlValuesResponse,
  InputControlValidationResponse,
  JobCreationResponse,
  JobListResponse,
  JobUpdateResponse,
  JobDeleteResponse,
  JobExecuteResponse,
  DomainListResponse,
  DomainGetResponse,
  DomainUpdateResponse,
  DomainValidateResponse,
  DomainSchemaResponse,
  SchemaGetResponse,
  BundleUploadResponse,
  BundleManageResponse,
  PermissionGetResponse,
  PermissionSetResponse,
  UserCreateResponse,
  UserListResponse,
  UserUpdateResponse,
  RoleCreateResponse,
  RoleListResponse,
  ResourceInfo,
  InputControl,
  JobInfo,
  UserInfo,
  RoleInfo,
  PermissionInfo,
  ValidationResult,
  ExportInfo,
  DomainInfo,
};
