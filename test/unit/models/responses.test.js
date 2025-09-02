/**
 * Unit tests for Response Models
 */

import {
  BaseResponse,
  AuthenticationResponse,
  ConnectionTestResponse,
  ResourceUploadResponse,
  ResourceListResponse,
  ReportExecutionResponse,
  ExecutionStatusResponse,
  InputControlsResponse,
  JobCreationResponse,
  ResourceInfo,
  InputControl,
  JobInfo,
  UserInfo,
  RoleInfo,
  PermissionInfo,
  ValidationResult,
  ExportInfo,
  DomainInfo,
} from '../../../src/models/responses.js';

describe('Response Models', () => {
  describe('BaseResponse', () => {
    test('should create with default values', () => {
      const response = new BaseResponse();

      expect(response.success).toBe(true);
      expect(response.timestamp).toBeDefined();
      expect(response.requestId).toBeUndefined();
      expect(response.executionTime).toBeUndefined();
    });

    test('should create with provided values', () => {
      const data = {
        success: false,
        timestamp: '2023-01-01T00:00:00.000Z',
        requestId: 'test-request-id',
        executionTime: 1500,
      };

      const response = new BaseResponse(data);

      expect(response.success).toBe(data.success);
      expect(response.timestamp).toBe(data.timestamp);
      expect(response.requestId).toBe(data.requestId);
      expect(response.executionTime).toBe(data.executionTime);
    });

    test('should default success to true when not explicitly set to false', () => {
      const response1 = new BaseResponse({ success: undefined });
      const response2 = new BaseResponse({ success: null });
      const response3 = new BaseResponse({ success: true });

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response3.success).toBe(true);
    });
  });

  describe('AuthenticationResponse', () => {
    test('should create with default values', () => {
      const response = new AuthenticationResponse();

      expect(response.authenticated).toBe(false);
      expect(response.userDetails).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        authenticated: true,
        sessionId: 'session-123',
        authMethod: 'basic',
        organization: 'testorg',
        expiresAt: '2023-01-01T12:00:00.000Z',
        userDetails: { username: 'testuser', roles: ['user'] },
      };

      const response = new AuthenticationResponse(data);

      expect(response.authenticated).toBe(data.authenticated);
      expect(response.sessionId).toBe(data.sessionId);
      expect(response.authMethod).toBe(data.authMethod);
      expect(response.organization).toBe(data.organization);
      expect(response.expiresAt).toBe(data.expiresAt);
      expect(response.userDetails).toBe(data.userDetails);
    });
  });

  describe('ConnectionTestResponse', () => {
    test('should create with default values', () => {
      const response = new ConnectionTestResponse();

      expect(response.connected).toBe(false);
      expect(response.serverInfo).toEqual({});
      expect(response.features).toEqual([]);
      expect(response.authenticationMethods).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        connected: true,
        serverInfo: { version: '8.2.0' },
        responseTime: 150,
        version: '8.2.0',
        edition: 'CE',
        features: ['reports', 'dashboards'],
        authenticationMethods: ['basic', 'login'],
      };

      const response = new ConnectionTestResponse(data);

      expect(response.connected).toBe(data.connected);
      expect(response.serverInfo).toBe(data.serverInfo);
      expect(response.responseTime).toBe(data.responseTime);
      expect(response.version).toBe(data.version);
      expect(response.edition).toBe(data.edition);
      expect(response.features).toBe(data.features);
      expect(response.authenticationMethods).toBe(data.authenticationMethods);
    });
  });

  describe('ResourceUploadResponse', () => {
    test('should create with default values', () => {
      const response = new ResourceUploadResponse();

      expect(response.uploadTimestamp).toBeDefined();
      expect(response.validationStatus).toBe('valid');
      expect(response.validationMessages).toEqual([]);
      expect(response.localResourcesUploaded).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        resourceUri: '/reports/test',
        resourceId: 'test-id',
        resourceType: 'reportUnit',
        uploadTimestamp: '2023-01-01T00:00:00.000Z',
        validationStatus: 'warning',
        validationMessages: ['Warning: Missing datasource'],
        localResourcesUploaded: ['image1.png', 'image2.png'],
      };

      const response = new ResourceUploadResponse(data);

      expect(response.resourceUri).toBe(data.resourceUri);
      expect(response.resourceId).toBe(data.resourceId);
      expect(response.resourceType).toBe(data.resourceType);
      expect(response.uploadTimestamp).toBe(data.uploadTimestamp);
      expect(response.validationStatus).toBe(data.validationStatus);
      expect(response.validationMessages).toBe(data.validationMessages);
      expect(response.localResourcesUploaded).toBe(data.localResourcesUploaded);
    });
  });

  describe('ResourceListResponse', () => {
    test('should create with default values', () => {
      const response = new ResourceListResponse();

      expect(response.resources).toEqual([]);
      expect(response.totalCount).toBe(0);
      expect(response.offset).toBe(0);
      expect(response.limit).toBe(100);
      expect(response.hasMore).toBe(false);
    });

    test('should create with provided values', () => {
      const data = {
        resources: [{ uri: '/reports/test1' }, { uri: '/reports/test2' }],
        totalCount: 25,
        offset: 10,
        limit: 50,
        hasMore: true,
      };

      const response = new ResourceListResponse(data);

      expect(response.resources).toBe(data.resources);
      expect(response.totalCount).toBe(data.totalCount);
      expect(response.offset).toBe(data.offset);
      expect(response.limit).toBe(data.limit);
      expect(response.hasMore).toBe(data.hasMore);
    });
  });

  describe('ReportExecutionResponse', () => {
    test('should create with default values', () => {
      const response = new ReportExecutionResponse();

      expect(response.status).toBe('ready');
      expect(response.exports).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        executionId: 'exec-123',
        status: 'running',
        outputFormat: 'pdf',
        reportUri: '/reports/test',
        generationTime: 2500,
        fileSize: 1024000,
        content: Buffer.from('pdf content'),
        contentType: 'application/pdf',
        fileName: 'report.pdf',
        pages: '1-10',
        exports: [{ id: 'export-1', format: 'pdf' }],
      };

      const response = new ReportExecutionResponse(data);

      expect(response.executionId).toBe(data.executionId);
      expect(response.status).toBe(data.status);
      expect(response.outputFormat).toBe(data.outputFormat);
      expect(response.reportUri).toBe(data.reportUri);
      expect(response.generationTime).toBe(data.generationTime);
      expect(response.fileSize).toBe(data.fileSize);
      expect(response.content).toBe(data.content);
      expect(response.contentType).toBe(data.contentType);
      expect(response.fileName).toBe(data.fileName);
      expect(response.pages).toBe(data.pages);
      expect(response.exports).toBe(data.exports);
    });
  });

  describe('ExecutionStatusResponse', () => {
    test('should create with default values', () => {
      const response = new ExecutionStatusResponse();

      expect(response.progress).toBe(0);
      expect(response.exports).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        executionId: 'exec-123',
        status: 'running',
        progress: 75,
        currentPage: 7,
        totalPages: 10,
        exports: [{ id: 'export-1' }],
        errorDescriptor: null,
        startTime: '2023-01-01T10:00:00.000Z',
        endTime: null,
      };

      const response = new ExecutionStatusResponse(data);

      expect(response.executionId).toBe(data.executionId);
      expect(response.status).toBe(data.status);
      expect(response.progress).toBe(data.progress);
      expect(response.currentPage).toBe(data.currentPage);
      expect(response.totalPages).toBe(data.totalPages);
      expect(response.exports).toBe(data.exports);
      expect(response.errorDescriptor).toBe(data.errorDescriptor);
      expect(response.startTime).toBe(data.startTime);
      expect(response.endTime).toBe(data.endTime);
    });
  });

  describe('JobCreationResponse', () => {
    test('should create with default values', () => {
      const response = new JobCreationResponse();

      expect(response.state).toBe('NORMAL');
      expect(response.creationTimestamp).toBeDefined();
    });

    test('should create with provided values', () => {
      const data = {
        jobId: 'job-123',
        label: 'Test Job',
        state: 'PAUSED',
        nextFireTime: '2023-01-02T10:00:00.000Z',
        creationTimestamp: '2023-01-01T10:00:00.000Z',
      };

      const response = new JobCreationResponse(data);

      expect(response.jobId).toBe(data.jobId);
      expect(response.label).toBe(data.label);
      expect(response.state).toBe(data.state);
      expect(response.nextFireTime).toBe(data.nextFireTime);
      expect(response.creationTimestamp).toBe(data.creationTimestamp);
    });
  });

  describe('InputControlsResponse', () => {
    test('should create with default values', () => {
      const response = new InputControlsResponse();

      expect(response.inputControls).toEqual([]);
      expect(response.structure).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        reportUri: '/reports/test',
        inputControls: [{ id: 'param1', type: 'singleValue' }],
        structure: { dependencies: [] },
      };

      const response = new InputControlsResponse(data);

      expect(response.reportUri).toBe(data.reportUri);
      expect(response.inputControls).toBe(data.inputControls);
      expect(response.structure).toBe(data.structure);
    });
  });

  describe('ValidationResult', () => {
    test('should create with default values', () => {
      const result = new ValidationResult();

      expect(result.valid).toBe(false);
      expect(result.errorArguments).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        field: 'username',
        valid: true,
        errorCode: null,
        errorMessage: null,
        errorArguments: [],
      };

      const result = new ValidationResult(data);

      expect(result.field).toBe(data.field);
      expect(result.valid).toBe(data.valid);
      expect(result.errorCode).toBe(data.errorCode);
      expect(result.errorMessage).toBe(data.errorMessage);
      expect(result.errorArguments).toBe(data.errorArguments);
    });
  });

  describe('ResourceInfo', () => {
    test('should create with provided values', () => {
      const data = {
        uri: '/reports/test',
        label: 'Test Report',
        description: 'Test Description',
        type: 'reportUnit',
        creationDate: '2023-01-01T00:00:00.000Z',
        updateDate: '2023-01-02T00:00:00.000Z',
        version: 1,
        permissionMask: 31,
      };

      const info = new ResourceInfo(data);

      expect(info.uri).toBe(data.uri);
      expect(info.label).toBe(data.label);
      expect(info.description).toBe(data.description);
      expect(info.type).toBe(data.type);
      expect(info.creationDate).toBe(data.creationDate);
      expect(info.updateDate).toBe(data.updateDate);
      expect(info.version).toBe(data.version);
      expect(info.permissionMask).toBe(data.permissionMask);
    });
  });

  describe('InputControl', () => {
    test('should create with default values', () => {
      const control = new InputControl();

      expect(control.mandatory).toBe(false);
      expect(control.readOnly).toBe(false);
      expect(control.visible).toBe(true);
      expect(control.masterDependencies).toEqual([]);
      expect(control.slaveDependencies).toEqual([]);
      expect(control.validationRules).toEqual([]);
      expect(control.state).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        id: 'param1',
        label: 'Parameter 1',
        description: 'First parameter',
        type: 'singleValue',
        uri: '/inputControls/param1',
        mandatory: true,
        readOnly: false,
        visible: true,
        masterDependencies: ['param0'],
        slaveDependencies: ['param2'],
        validationRules: [{ type: 'required' }],
        state: { value: 'default' },
      };

      const control = new InputControl(data);

      expect(control.id).toBe(data.id);
      expect(control.label).toBe(data.label);
      expect(control.description).toBe(data.description);
      expect(control.type).toBe(data.type);
      expect(control.uri).toBe(data.uri);
      expect(control.mandatory).toBe(data.mandatory);
      expect(control.readOnly).toBe(data.readOnly);
      expect(control.visible).toBe(data.visible);
      expect(control.masterDependencies).toBe(data.masterDependencies);
      expect(control.slaveDependencies).toBe(data.slaveDependencies);
      expect(control.validationRules).toBe(data.validationRules);
      expect(control.state).toBe(data.state);
    });

    test('should handle visible property correctly', () => {
      const control1 = new InputControl({ visible: false });
      const control2 = new InputControl({ visible: undefined });
      const control3 = new InputControl({ visible: null });

      expect(control1.visible).toBe(false);
      expect(control2.visible).toBe(true);
      expect(control3.visible).toBe(true);
    });
  });

  describe('JobInfo', () => {
    test('should create with default values', () => {
      const job = new JobInfo();

      expect(job.source).toEqual({});
      expect(job.trigger).toEqual({});
      expect(job.mailNotification).toEqual({});
      expect(job.alert).toEqual({});
      expect(job.contentRepositoryDestination).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        id: 'job-123',
        version: 1,
        label: 'Test Job',
        description: 'Test Description',
        owner: 'testuser',
        state: 'NORMAL',
        previousFireTime: '2023-01-01T10:00:00.000Z',
        nextFireTime: '2023-01-02T10:00:00.000Z',
        source: { reportUnitURI: '/reports/test' },
        trigger: { type: 'simple' },
        mailNotification: { enabled: true },
        alert: { enabled: false },
        contentRepositoryDestination: { folderURI: '/output' },
      };

      const job = new JobInfo(data);

      expect(job.id).toBe(data.id);
      expect(job.version).toBe(data.version);
      expect(job.label).toBe(data.label);
      expect(job.description).toBe(data.description);
      expect(job.owner).toBe(data.owner);
      expect(job.state).toBe(data.state);
      expect(job.previousFireTime).toBe(data.previousFireTime);
      expect(job.nextFireTime).toBe(data.nextFireTime);
      expect(job.source).toBe(data.source);
      expect(job.trigger).toBe(data.trigger);
      expect(job.mailNotification).toBe(data.mailNotification);
      expect(job.alert).toBe(data.alert);
      expect(job.contentRepositoryDestination).toBe(data.contentRepositoryDestination);
    });
  });

  describe('UserInfo', () => {
    test('should create with default values', () => {
      const user = new UserInfo();

      expect(user.roles).toEqual([]);
    });

    test('should create with provided values', () => {
      const data = {
        username: 'testuser',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        enabled: true,
        externallyDefined: false,
        previousPasswordChangeTime: '2023-01-01T00:00:00.000Z',
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
      };

      const user = new UserInfo(data);

      expect(user.username).toBe(data.username);
      expect(user.fullName).toBe(data.fullName);
      expect(user.emailAddress).toBe(data.emailAddress);
      expect(user.enabled).toBe(data.enabled);
      expect(user.externallyDefined).toBe(data.externallyDefined);
      expect(user.previousPasswordChangeTime).toBe(data.previousPasswordChangeTime);
      expect(user.roles).toBe(data.roles);
    });
  });

  describe('RoleInfo', () => {
    test('should create with provided values', () => {
      const data = {
        roleName: 'ROLE_USER',
        description: 'Standard user role',
        externallyDefined: false,
      };

      const role = new RoleInfo(data);

      expect(role.roleName).toBe(data.roleName);
      expect(role.description).toBe(data.description);
      expect(role.externallyDefined).toBe(data.externallyDefined);
    });
  });

  describe('PermissionInfo', () => {
    test('should create with provided values', () => {
      const data = {
        recipient: 'user:testuser',
        mask: 31,
        uri: '/reports/test',
      };

      const permission = new PermissionInfo(data);

      expect(permission.recipient).toBe(data.recipient);
      expect(permission.mask).toBe(data.mask);
      expect(permission.uri).toBe(data.uri);
    });
  });

  describe('ExportInfo', () => {
    test('should create with provided values', () => {
      const data = {
        id: 'export-123',
        status: 'ready',
        outputFormat: 'pdf',
        pages: '1-10',
        attachmentsPrefix: 'report_',
        outputResource: '/output/report.pdf',
      };

      const exportInfo = new ExportInfo(data);

      expect(exportInfo.id).toBe(data.id);
      expect(exportInfo.status).toBe(data.status);
      expect(exportInfo.outputFormat).toBe(data.outputFormat);
      expect(exportInfo.pages).toBe(data.pages);
      expect(exportInfo.attachmentsPrefix).toBe(data.attachmentsPrefix);
      expect(exportInfo.outputResource).toBe(data.outputResource);
    });
  });

  describe('DomainInfo', () => {
    test('should create with provided values', () => {
      const data = {
        uri: '/domains/test',
        label: 'Test Domain',
        description: 'Test Description',
        type: 'Domain',
        version: 1,
        creationDate: '2023-01-01T00:00:00.000Z',
        updateDate: '2023-01-02T00:00:00.000Z',
        permissionMask: 31,
      };

      const domain = new DomainInfo(data);

      expect(domain.uri).toBe(data.uri);
      expect(domain.label).toBe(data.label);
      expect(domain.description).toBe(data.description);
      expect(domain.type).toBe(data.type);
      expect(domain.version).toBe(data.version);
      expect(domain.creationDate).toBe(data.creationDate);
      expect(domain.updateDate).toBe(data.updateDate);
      expect(domain.permissionMask).toBe(data.permissionMask);
    });
  });
});
