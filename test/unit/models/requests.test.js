/**
 * Unit tests for Request Models
 */

import {
  BaseRequest,
  AuthenticationRequest,
  ConnectionTestRequest,
  ResourceUploadRequest,
  ResourceListRequest,
  ReportExecutionRequest,
  ExecutionStatusRequest,
  ExecutionCancelRequest,
  InputControlsRequest,
  InputControlValuesRequest,
  InputControlValidationRequest,
  JobCreationRequest,
  DomainListRequest,
  DomainGetRequest,
  BundleUploadRequest,
  PermissionGetRequest,
  PermissionSetRequest,
  UserCreateRequest,
  UserListRequest,
  RoleCreateRequest,
  LocalResource,
  ScheduleDefinition,
} from '../../../src/models/requests.js';

describe('Request Models', () => {
  describe('BaseRequest', () => {
    test('should create with default values', () => {
      const request = new BaseRequest();

      expect(request.timestamp).toBeDefined();
      expect(request.requestId).toBeDefined();
      expect(request.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    test('should create with provided values', () => {
      const data = {
        timestamp: '2023-01-01T00:00:00.000Z',
        requestId: 'custom-request-id',
      };

      const request = new BaseRequest(data);

      expect(request.timestamp).toBe(data.timestamp);
      expect(request.requestId).toBe(data.requestId);
    });

    test('should generate unique request IDs', () => {
      const request1 = new BaseRequest();
      const request2 = new BaseRequest();

      expect(request1.requestId).not.toBe(request2.requestId);
    });
  });

  describe('AuthenticationRequest', () => {
    test('should create with default values', () => {
      const request = new AuthenticationRequest();

      expect(request.authType).toBe('basic');
      expect(request.username).toBeUndefined();
      expect(request.password).toBeUndefined();
      expect(request.organization).toBeUndefined();
    });

    test('should create with provided values', () => {
      const data = {
        authType: 'login',
        username: 'testuser',
        password: 'testpass',
        organization: 'testorg',
      };

      const request = new AuthenticationRequest(data);

      expect(request.authType).toBe(data.authType);
      expect(request.username).toBe(data.username);
      expect(request.password).toBe(data.password);
      expect(request.organization).toBe(data.organization);
    });
  });

  describe('ConnectionTestRequest', () => {
    test('should create with default values', () => {
      const request = new ConnectionTestRequest();

      expect(request.includeServerInfo).toBe(true);
      expect(request.timeout).toBe(30000);
    });

    test('should create with provided values', () => {
      const data = {
        includeServerInfo: false,
        timeout: 60000,
      };

      const request = new ConnectionTestRequest(data);

      expect(request.includeServerInfo).toBe(false); // explicitly set to false
      expect(request.timeout).toBe(data.timeout);
    });
  });

  describe('ResourceUploadRequest', () => {
    test('should create with default values', () => {
      const request = new ResourceUploadRequest();

      expect(request.description).toBe('');
      expect(request.resourceType).toBe('reportUnit');
      expect(request.localResources).toEqual([]);
      expect(request.overwrite).toBe(false);
      expect(request.createFolders).toBe(true);
    });

    test('should create with provided values', () => {
      const data = {
        resourcePath: '/reports/test',
        label: 'Test Report',
        description: 'Test Description',
        resourceType: 'folder',
        jrxmlContent: '<jasperReport>...</jasperReport>',
        dataSourceUri: '/datasources/test',
        localResources: [{ name: 'image.png', type: 'img' }],
        overwrite: true,
        createFolders: false,
      };

      const request = new ResourceUploadRequest(data);

      expect(request.resourcePath).toBe(data.resourcePath);
      expect(request.label).toBe(data.label);
      expect(request.description).toBe(data.description);
      expect(request.resourceType).toBe(data.resourceType);
      expect(request.jrxmlContent).toBe(data.jrxmlContent);
      expect(request.dataSourceUri).toBe(data.dataSourceUri);
      expect(request.localResources).toBe(data.localResources);
      expect(request.overwrite).toBe(data.overwrite);
      expect(request.createFolders).toBe(data.createFolders);
    });
  });

  describe('ResourceListRequest', () => {
    test('should create with default values', () => {
      const request = new ResourceListRequest();

      expect(request.folderUri).toBe('/');
      expect(request.recursive).toBe(false);
      expect(request.limit).toBe(100);
      expect(request.offset).toBe(0);
      expect(request.sortBy).toBe('label');
      expect(request.sortOrder).toBe('asc');
    });

    test('should create with provided values', () => {
      const data = {
        folderUri: '/reports',
        resourceType: 'reportUnit',
        recursive: true,
        limit: 50,
        offset: 10,
        sortBy: 'creationDate',
        sortOrder: 'desc',
        searchQuery: 'test',
      };

      const request = new ResourceListRequest(data);

      expect(request.folderUri).toBe(data.folderUri);
      expect(request.resourceType).toBe(data.resourceType);
      expect(request.recursive).toBe(data.recursive);
      expect(request.limit).toBe(data.limit);
      expect(request.offset).toBe(data.offset);
      expect(request.sortBy).toBe(data.sortBy);
      expect(request.sortOrder).toBe(data.sortOrder);
      expect(request.searchQuery).toBe(data.searchQuery);
    });
  });

  describe('ReportExecutionRequest', () => {
    test('should create with default values', () => {
      const request = new ReportExecutionRequest();

      expect(request.outputFormat).toBe('pdf');
      expect(request.parameters).toEqual({});
      expect(request.async).toBe(false);
      expect(request.locale).toBe('en_US');
      expect(request.timezone).toBe('America/New_York');
    });

    test('should create with provided values', () => {
      const data = {
        reportUri: '/reports/test',
        outputFormat: 'xlsx',
        parameters: { param1: 'value1' },
        pages: '1-5',
        async: true,
        locale: 'fr_FR',
        timezone: 'Europe/Paris',
        attachmentsPrefix: 'test_',
        baseUrl: 'http://localhost:8080',
      };

      const request = new ReportExecutionRequest(data);

      expect(request.reportUri).toBe(data.reportUri);
      expect(request.outputFormat).toBe(data.outputFormat);
      expect(request.parameters).toBe(data.parameters);
      expect(request.pages).toBe(data.pages);
      expect(request.async).toBe(data.async);
      expect(request.locale).toBe(data.locale);
      expect(request.timezone).toBe(data.timezone);
      expect(request.attachmentsPrefix).toBe(data.attachmentsPrefix);
      expect(request.baseUrl).toBe(data.baseUrl);
    });
  });

  describe('JobCreationRequest', () => {
    test('should create with default values', () => {
      const request = new JobCreationRequest();

      expect(request.description).toBe('');
      expect(request.schedule).toEqual({});
      expect(request.outputFormats).toEqual(['pdf']);
      expect(request.parameters).toEqual({});
      expect(request.recipients).toEqual([]);
      expect(request.mailNotification).toEqual({});
    });

    test('should create with provided values', () => {
      const data = {
        label: 'Test Job',
        description: 'Test Description',
        reportUri: '/reports/test',
        schedule: { type: 'simple', startDate: '2023-01-01' },
        outputFormats: ['pdf', 'xlsx'],
        parameters: { param1: 'value1' },
        recipients: ['user@example.com'],
        mailNotification: { enabled: true },
        repositoryDestination: '/output',
      };

      const request = new JobCreationRequest(data);

      expect(request.label).toBe(data.label);
      expect(request.description).toBe(data.description);
      expect(request.reportUri).toBe(data.reportUri);
      expect(request.schedule).toBe(data.schedule);
      expect(request.outputFormats).toBe(data.outputFormats);
      expect(request.parameters).toBe(data.parameters);
      expect(request.recipients).toBe(data.recipients);
      expect(request.mailNotification).toBe(data.mailNotification);
      expect(request.repositoryDestination).toBe(data.repositoryDestination);
    });
  });

  describe('LocalResource', () => {
    test('should create with default values', () => {
      const resource = new LocalResource();

      expect(resource.type).toBe('img');
    });

    test('should create with provided values', () => {
      const data = {
        name: 'logo.png',
        type: 'img',
        content: 'base64content',
        contentType: 'image/png',
      };

      const resource = new LocalResource(data);

      expect(resource.name).toBe(data.name);
      expect(resource.type).toBe(data.type);
      expect(resource.content).toBe(data.content);
      expect(resource.contentType).toBe(data.contentType);
    });
  });

  describe('ScheduleDefinition', () => {
    test('should create with default values', () => {
      const schedule = new ScheduleDefinition();

      expect(schedule.type).toBe('simple');
    });

    test('should create with provided values', () => {
      const data = {
        type: 'cron',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        recurrenceInterval: 1,
        recurrenceIntervalUnit: 'DAY',
        cronExpression: '0 0 12 * * ?',
        calendarTrigger: { calendar: 'business' },
      };

      const schedule = new ScheduleDefinition(data);

      expect(schedule.type).toBe(data.type);
      expect(schedule.startDate).toBe(data.startDate);
      expect(schedule.endDate).toBe(data.endDate);
      expect(schedule.recurrenceInterval).toBe(data.recurrenceInterval);
      expect(schedule.recurrenceIntervalUnit).toBe(data.recurrenceIntervalUnit);
      expect(schedule.cronExpression).toBe(data.cronExpression);
      expect(schedule.calendarTrigger).toBe(data.calendarTrigger);
    });
  });

  describe('Domain Management Requests', () => {
    test('DomainGetRequest should create with default values', () => {
      const request = new DomainGetRequest();

      expect(request.includeMetadata).toBe(true);
      expect(request.includeSchema).toBe(false);
      expect(request.includePermissions).toBe(false);
    });

    test('DomainListRequest should create with default values', () => {
      const request = new DomainListRequest();

      expect(request.recursive).toBe(false);
      expect(request.limit).toBe(100);
      expect(request.offset).toBe(0);
    });

    test('BundleUploadRequest should create with default values', () => {
      const request = new BundleUploadRequest();

      expect(request.overwrite).toBe(false);
      expect(request.skipDependencyCheck).toBe(false);
    });
  });

  describe('User Management Requests', () => {
    test('UserCreateRequest should create with default values', () => {
      const request = new UserCreateRequest();

      expect(request.enabled).toBe(true);
      expect(request.externallyDefined).toBe(false);
      expect(request.roles).toEqual([]);
    });

    test('UserListRequest should create with default values', () => {
      const request = new UserListRequest();

      expect(request.limit).toBe(100);
      expect(request.offset).toBe(0);
      expect(request.includeRoles).toBe(false);
    });

    test('RoleCreateRequest should create with default values', () => {
      const request = new RoleCreateRequest();

      expect(request.description).toBe('');
      expect(request.externallyDefined).toBe(false);
    });
  });

  describe('Input Control Requests', () => {
    test('InputControlsRequest should create with default values', () => {
      const request = new InputControlsRequest();

      expect(request.includeStructure).toBe(true);
      expect(request.includeValues).toBe(false);
    });

    test('InputControlValuesRequest should create with default values', () => {
      const request = new InputControlValuesRequest();

      expect(request.values).toEqual({});
      expect(request.freshData).toBe(false);
    });

    test('InputControlValidationRequest should create with default values', () => {
      const request = new InputControlValidationRequest();

      expect(request.parameters).toEqual({});
      expect(request.validateAll).toBe(true);
    });
  });

  describe('Permission Requests', () => {
    test('PermissionGetRequest should create with default values', () => {
      const request = new PermissionGetRequest();

      expect(request.includeInherited).toBe(true);
      expect(request.resolveAll).toBe(false);
    });

    test('PermissionSetRequest should create with default values', () => {
      const request = new PermissionSetRequest();

      expect(request.permissions).toEqual([]);
      expect(request.replaceAll).toBe(false);
    });
  });

  describe('Execution Requests', () => {
    test('ExecutionStatusRequest should create with default values', () => {
      const request = new ExecutionStatusRequest();

      expect(request.includeDetails).toBe(true);
    });

    test('ExecutionCancelRequest should create with default values', () => {
      const request = new ExecutionCancelRequest();

      expect(request.force).toBe(false);
    });
  });
});
