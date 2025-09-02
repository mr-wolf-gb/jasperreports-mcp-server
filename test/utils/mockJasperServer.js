import express from 'express';
import multer from 'multer';
import path from 'path';
import TestHelpers from './testHelpers.js';

/**
 * Mock JasperReports Server for unit testing
 * Simulates JasperReports Server REST API v2 endpoints
 */
class MockJasperServer {
  constructor(port = 8081) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.testHelpers = new TestHelpers();
    this.resources = new Map();
    this.executions = new Map();
    this.jobs = new Map();
    this.users = new Map();
    this.sessions = new Map();

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeTestData();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(multer().any());

    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Authentication middleware
    this.app.use('/jasperserver/rest_v2', (req, res, next) => {
      // Skip authentication for login endpoint
      if (req.path === '/login' || req.path === '/serverInfo') {
        return next();
      }

      const auth = req.headers.authorization;
      if (!auth) {
        return res.status(401).json({
          errorCode: 'authentication.required',
          message: 'Authentication required',
        });
      }

      // Basic auth validation
      if (auth.startsWith('Basic ')) {
        const credentials = Buffer.from(auth.slice(6), 'base64').toString();
        const [username, password] = credentials.split(':');

        if (username === 'jasperadmin' && password === 'jasperadmin') {
          req.user = { username, organization: null };
          return next();
        }
      }

      // Session-based auth validation
      const sessionId = req.headers['x-session-id'] || req.cookies?.JSESSIONID;
      if (sessionId && this.sessions.has(sessionId)) {
        req.user = this.sessions.get(sessionId);
        return next();
      }

      res.status(401).json({
        errorCode: 'authentication.failed',
        message: 'Authentication failed',
      });
    });
  }

  setupRoutes() {
    const baseUrl = '/jasperserver/rest_v2';

    // Server info endpoint
    this.app.get(`${baseUrl}/serverInfo`, (req, res) => {
      res.json({
        version: '8.2.0',
        edition: 'CE',
        features: ['Dashboards', 'Reports', 'Domains'],
        build: 'mock-build-123',
        licenseType: 'Community',
      });
    });

    // Authentication endpoints
    this.app.post(`${baseUrl}/login`, (req, res) => {
      const { j_username, j_password, j_organization } = req.body;

      if (j_username === 'jasperadmin' && j_password === 'jasperadmin') {
        const sessionId = this.testHelpers.generateTestId();
        this.sessions.set(sessionId, {
          username: j_username,
          organization: j_organization || null,
        });

        res.cookie('JSESSIONID', sessionId);
        res.status(200).send('OK');
      } else {
        res.status(401).json({
          errorCode: 'authentication.failed',
          message: 'Invalid credentials',
        });
      }
    });

    this.app.post(`${baseUrl}/logout`, (req, res) => {
      const sessionId = req.headers['x-session-id'] || req.cookies?.JSESSIONID;
      if (sessionId) {
        this.sessions.delete(sessionId);
      }
      res.status(200).send('OK');
    });

    // Resource management endpoints
    this.app.get(`${baseUrl}/resources`, (req, res) => {
      const { folderUri, type, limit, offset } = req.query;
      let resources = Array.from(this.resources.values());

      if (folderUri) {
        resources = resources.filter(r => r.uri.startsWith(folderUri));
      }

      if (type) {
        resources = resources.filter(r => r.resourceType === type);
      }

      const start = parseInt(offset) || 0;
      const count = parseInt(limit) || resources.length;
      const paginatedResources = resources.slice(start, start + count);

      res.json({
        resourceLookup: paginatedResources,
      });
    });

    this.app.get(`${baseUrl}/resources/*`, (req, res) => {
      const resourceUri = '/' + req.params[0];
      const resource = this.resources.get(resourceUri);

      if (!resource) {
        return res.status(404).json({
          errorCode: 'resource.not.found',
          message: `Resource not found: ${resourceUri}`,
        });
      }

      res.json(resource);
    });

    this.app.put(`${baseUrl}/resources/*`, (req, res) => {
      const resourceUri = '/' + req.params[0];
      const resourceData = req.body;

      const resource = {
        uri: resourceUri,
        label: resourceData.label || path.basename(resourceUri),
        description: resourceData.description || '',
        resourceType: resourceData.resourceType || 'reportUnit',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        version: 1,
        permissionMask: 1,
      };

      this.resources.set(resourceUri, resource);

      res.status(201).json({
        uri: resourceUri,
        resourceType: resource.resourceType,
      });
    });

    this.app.delete(`${baseUrl}/resources/*`, (req, res) => {
      const resourceUri = '/' + req.params[0];

      if (!this.resources.has(resourceUri)) {
        return res.status(404).json({
          errorCode: 'resource.not.found',
          message: `Resource not found: ${resourceUri}`,
        });
      }

      this.resources.delete(resourceUri);
      res.status(200).send('OK');
    });

    // Report execution endpoints
    this.app.post(`${baseUrl}/reportExecutions`, (req, res) => {
      const { reportUnitUri, outputFormat, parameters, async, pages } = req.body;

      const executionId = this.testHelpers.generateTestId();
      const execution = {
        requestId: executionId,
        reportURI: reportUnitUri,
        status: async ? 'queued' : 'ready',
        outputFormat: outputFormat || 'pdf',
        parameters: parameters || {},
        pages,
        totalPages: 1,
        exports: async ? [] : [{ id: 'main', outputResource: { outputFinal: true } }],
      };

      this.executions.set(executionId, execution);

      if (async) {
        // Simulate async processing
        setTimeout(() => {
          const exec = this.executions.get(executionId);
          if (exec) {
            exec.status = 'ready';
            exec.exports = [{ id: 'main', outputResource: { outputFinal: true } }];
          }
        }, 1000);
      }

      res.status(200).json(execution);
    });

    this.app.get(`${baseUrl}/reportExecutions/:executionId/status`, (req, res) => {
      const executionId = req.params.executionId;
      const execution = this.executions.get(executionId);

      if (!execution) {
        return res.status(404).json({
          errorCode: 'execution.not.found',
          message: `Execution not found: ${executionId}`,
        });
      }

      res.json({
        value: execution.status,
      });
    });

    this.app.get(
      `${baseUrl}/reportExecutions/:executionId/exports/:exportId/outputResource`,
      (req, res) => {
        const executionId = req.params.executionId;
        const execution = this.executions.get(executionId);

        if (!execution) {
          return res.status(404).json({
            errorCode: 'execution.not.found',
            message: `Execution not found: ${executionId}`,
          });
        }

        // Return mock PDF content
        const pdfContent = Buffer.from(
          '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF'
        );

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Length': pdfContent.length,
          'Content-Disposition': 'attachment; filename="report.pdf"',
        });

        res.send(pdfContent);
      }
    );

    // Input controls endpoints
    this.app.get(`${baseUrl}/reports/*/inputControls`, (req, res) => {
      const reportUri = '/' + req.params[0];

      res.json({
        inputControl: [
          {
            id: 'ReportTitle',
            label: 'Report Title',
            mandatory: false,
            readOnly: false,
            type: 'singleValue',
            uri: `${reportUri}_files/ReportTitle`,
            visible: true,
            dataType: {
              type: 'text',
              maxLength: 100,
            },
            defaultValue: 'Default Report Title',
          },
          {
            id: 'UserName',
            label: 'User Name',
            mandatory: true,
            readOnly: false,
            type: 'singleValue',
            uri: `${reportUri}_files/UserName`,
            visible: true,
            dataType: {
              type: 'text',
              maxLength: 50,
            },
          },
        ],
      });
    });

    // Job management endpoints
    this.app.get(`${baseUrl}/jobs`, (req, res) => {
      const jobs = Array.from(this.jobs.values());
      res.json({
        jobsummary: jobs,
      });
    });

    this.app.post(`${baseUrl}/jobs`, (req, res) => {
      const jobData = req.body;
      const jobId = parseInt(this.testHelpers.generateRandomString(6), 36);

      const job = {
        id: jobId,
        version: 0,
        label: jobData.label,
        description: jobData.description || '',
        creationDate: new Date().toISOString(),
        source: {
          reportUnitURI: jobData.source?.reportUnitURI,
        },
        trigger: jobData.trigger,
        repositoryDestination: jobData.repositoryDestination,
        mailNotification: jobData.mailNotification,
        state: {
          value: 'NORMAL',
        },
      };

      this.jobs.set(jobId, job);
      res.status(201).json(job);
    });

    // User management endpoints
    this.app.get(`${baseUrl}/users`, (req, res) => {
      const users = Array.from(this.users.values());
      res.json({
        user: users,
      });
    });

    // Error simulation endpoint for testing
    this.app.get(`${baseUrl}/test/error/:statusCode`, (req, res) => {
      const statusCode = parseInt(req.params.statusCode);
      res.status(statusCode).json({
        errorCode: `HTTP_${statusCode}`,
        message: `Simulated error with status ${statusCode}`,
      });
    });
  }

  initializeTestData() {
    // Add some test resources
    this.resources.set('/reports/test_report', {
      uri: '/reports/test_report',
      label: 'Test Report',
      description: 'A test report for unit testing',
      resourceType: 'reportUnit',
      creationDate: '2023-01-01T00:00:00.000Z',
      updateDate: '2023-01-01T00:00:00.000Z',
      version: 1,
      permissionMask: 1,
    });

    this.resources.set('/datasources/test_datasource', {
      uri: '/datasources/test_datasource',
      label: 'Test Datasource',
      description: 'A test datasource for unit testing',
      resourceType: 'jdbcDataSource',
      creationDate: '2023-01-01T00:00:00.000Z',
      updateDate: '2023-01-01T00:00:00.000Z',
      version: 1,
      permissionMask: 1,
    });

    // Add test users
    this.users.set('jasperadmin', {
      username: 'jasperadmin',
      fullName: 'JasperReports Administrator',
      emailAddress: 'admin@jaspersoft.com',
      enabled: true,
      externallyDefined: false,
      roles: [{ roleName: 'ROLE_ADMINISTRATOR', tenantId: null }],
    });

    this.users.set('testuser', {
      username: 'testuser',
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      enabled: true,
      externallyDefined: false,
      roles: [{ roleName: 'ROLE_USER', tenantId: null }],
    });
  }

  /**
   * Start the mock server
   * @returns {Promise} Promise that resolves when server is started
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, error => {
        if (error) {
          reject(error);
        } else {
          console.log(`Mock JasperReports Server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the mock server
   * @returns {Promise} Promise that resolves when server is stopped
   */
  async stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock JasperReports Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Reset all test data
   */
  reset() {
    this.resources.clear();
    this.executions.clear();
    this.jobs.clear();
    this.users.clear();
    this.sessions.clear();
    this.initializeTestData();
  }

  /**
   * Add a custom resource for testing
   * @param {string} uri - Resource URI
   * @param {Object} resource - Resource data
   */
  addResource(uri, resource) {
    this.resources.set(uri, resource);
  }

  /**
   * Get server URL
   * @returns {string} Server URL
   */
  getUrl() {
    return `http://localhost:${this.port}/jasperserver`;
  }
}

export default MockJasperServer;
