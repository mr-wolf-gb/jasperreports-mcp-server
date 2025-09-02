import crypto from 'crypto';

/**
 * Test data generator for creating various test scenarios
 */
class TestDataGenerator {
  constructor() {
    this.departments = [
      'Engineering',
      'Marketing',
      'Sales',
      'HR',
      'Finance',
      'Operations',
      'Legal',
      'IT',
    ];
    this.firstNames = [
      'John',
      'Jane',
      'Bob',
      'Alice',
      'Charlie',
      'Diana',
      'Eve',
      'Frank',
      'Grace',
      'Henry',
    ];
    this.lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
    ];
    this.reportFormats = ['PDF', 'HTML', 'XLSX', 'CSV', 'RTF', 'DOCX'];
    this.jobStates = ['NORMAL', 'PAUSED', 'COMPLETE', 'ERROR'];
  }

  /**
   * Generate employee data
   * @param {number} count - Number of employees to generate
   * @returns {Array} Array of employee objects
   */
  generateEmployees(count = 10) {
    const employees = [];

    for (let i = 0; i < count; i++) {
      const firstName = this.getRandomItem(this.firstNames);
      const lastName = this.getRandomItem(this.lastNames);
      const department = this.getRandomItem(this.departments);
      const salary = this.getRandomNumber(30000, 120000);
      const hireDate = this.getRandomDate(new Date('2015-01-01'), new Date());

      employees.push({
        id: i + 1,
        employeeId: `EMP${String(i + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        department,
        salary,
        hireDate: hireDate.toISOString().split('T')[0],
        status: this.getRandomItem(['Active', 'Inactive', 'On Leave']),
        manager: i > 0 ? `EMP${String(Math.floor(Math.random() * i) + 1).padStart(4, '0')}` : null,
      });
    }

    return employees;
  }

  /**
   * Generate sales data
   * @param {number} count - Number of sales records to generate
   * @returns {Array} Array of sales objects
   */
  generateSalesData(count = 50) {
    const salesData = [];
    const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];

    for (let i = 0; i < count; i++) {
      const saleDate = this.getRandomDate(new Date('2023-01-01'), new Date());
      const product = this.getRandomItem(products);
      const region = this.getRandomItem(regions);
      const quantity = this.getRandomNumber(1, 100);
      const unitPrice = this.getRandomNumber(10, 1000);
      const totalAmount = quantity * unitPrice;

      salesData.push({
        id: i + 1,
        saleId: `SALE${String(i + 1).padStart(6, '0')}`,
        saleDate: saleDate.toISOString().split('T')[0],
        product,
        region,
        quantity,
        unitPrice,
        totalAmount,
        salesperson: this.getRandomItem(this.firstNames) + ' ' + this.getRandomItem(this.lastNames),
        customerType: this.getRandomItem(['Enterprise', 'SMB', 'Individual']),
      });
    }

    return salesData;
  }

  /**
   * Generate report execution data
   * @param {number} count - Number of executions to generate
   * @returns {Array} Array of execution objects
   */
  generateReportExecutions(count = 20) {
    const executions = [];
    const reportNames = [
      'Monthly Sales',
      'Employee Report',
      'Financial Summary',
      'Inventory Report',
      'Customer Analysis',
    ];
    const statuses = ['ready', 'running', 'queued', 'failed'];

    for (let i = 0; i < count; i++) {
      const executionDate = this.getRandomDate(new Date('2023-01-01'), new Date());
      const reportName = this.getRandomItem(reportNames);
      const status = this.getRandomItem(statuses);
      const format = this.getRandomItem(this.reportFormats);

      executions.push({
        requestId: this.generateId('EXEC'),
        reportURI: `/reports/${reportName.toLowerCase().replace(/\s+/g, '_')}`,
        reportName,
        status,
        outputFormat: format,
        executionDate: executionDate.toISOString(),
        totalPages: status === 'ready' ? this.getRandomNumber(1, 50) : null,
        fileSize: status === 'ready' ? this.getRandomNumber(1024, 1024 * 1024 * 10) : null,
        executionTime: status === 'ready' ? this.getRandomNumber(1000, 30000) : null,
        username: this.getRandomItem(['admin', 'user1', 'user2', 'manager']),
        parameters: this.generateReportParameters(),
      });
    }

    return executions;
  }

  /**
   * Generate scheduled jobs data
   * @param {number} count - Number of jobs to generate
   * @returns {Array} Array of job objects
   */
  generateScheduledJobs(count = 15) {
    const jobs = [];
    const scheduleTypes = ['simple', 'calendar'];
    const intervals = ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH'];

    for (let i = 0; i < count; i++) {
      const creationDate = this.getRandomDate(new Date('2023-01-01'), new Date());
      const scheduleType = this.getRandomItem(scheduleTypes);
      const interval = this.getRandomItem(intervals);
      const state = this.getRandomItem(this.jobStates);

      jobs.push({
        id: i + 1,
        label: `Scheduled Job ${i + 1}`,
        description: `Automated report generation job ${i + 1}`,
        creationDate: creationDate.toISOString(),
        source: {
          reportUnitURI: `/reports/scheduled_report_${i + 1}`,
        },
        trigger: {
          simpleTrigger:
            scheduleType === 'simple'
              ? {
                  occurrenceCount: -1,
                  recurrenceInterval: this.getRandomNumber(1, 24),
                  recurrenceIntervalUnit: interval,
                }
              : null,
          calendarTrigger:
            scheduleType === 'calendar'
              ? {
                  minutes: '0',
                  hours: String(this.getRandomNumber(0, 23)),
                  daysType: 'ALL',
                }
              : null,
        },
        repositoryDestination: {
          folderURI: '/reports/output',
          outputDescription: `Output for job ${i + 1}`,
          timestampPattern: 'yyyyMMdd_HHmmss',
        },
        outputFormats: {
          outputFormat: [this.getRandomItem(this.reportFormats)],
        },
        state: {
          value: state,
        },
        nextFireTime:
          state === 'NORMAL'
            ? this.getRandomDate(
                new Date(),
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              ).toISOString()
            : null,
        previousFireTime: this.getRandomDate(new Date('2023-01-01'), new Date()).toISOString(),
      });
    }

    return jobs;
  }

  /**
   * Generate user data
   * @param {number} count - Number of users to generate
   * @returns {Array} Array of user objects
   */
  generateUsers(count = 10) {
    const users = [];
    const roles = ['ROLE_USER', 'ROLE_ADMINISTRATOR', 'ROLE_MANAGER', 'ROLE_ANALYST'];

    for (let i = 0; i < count; i++) {
      const firstName = this.getRandomItem(this.firstNames);
      const lastName = this.getRandomItem(this.lastNames);
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;

      users.push({
        username,
        fullName: `${firstName} ${lastName}`,
        emailAddress: `${username}@company.com`,
        enabled: this.getRandomBoolean(0.9), // 90% enabled
        externallyDefined: this.getRandomBoolean(0.1), // 10% external
        roles: [
          {
            roleName: this.getRandomItem(roles),
            tenantId: null,
          },
        ],
        attributes: [
          {
            name: 'department',
            value: this.getRandomItem(this.departments),
          },
          {
            name: 'phone',
            value: this.generatePhoneNumber(),
          },
        ],
      });
    }

    return users;
  }

  /**
   * Generate resource data
   * @param {number} count - Number of resources to generate
   * @returns {Array} Array of resource objects
   */
  generateResources(count = 25) {
    const resources = [];
    const resourceTypes = ['reportUnit', 'jdbcDataSource', 'folder', 'file', 'inputControl'];
    const folders = ['/reports', '/datasources', '/images', '/fonts', '/domains'];

    for (let i = 0; i < count; i++) {
      const resourceType = this.getRandomItem(resourceTypes);
      const folder = this.getRandomItem(folders);
      const name = `${resourceType}_${i + 1}`;
      const uri = `${folder}/${name}`;

      resources.push({
        uri,
        label: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${i + 1}`,
        description: `Test ${resourceType} for testing purposes`,
        resourceType,
        creationDate: this.getRandomDate(new Date('2023-01-01'), new Date()).toISOString(),
        updateDate: this.getRandomDate(new Date('2023-06-01'), new Date()).toISOString(),
        version: this.getRandomNumber(1, 5),
        permissionMask: this.getRandomNumber(1, 32),
      });
    }

    return resources;
  }

  /**
   * Generate report parameters
   * @returns {Object} Random report parameters
   */
  generateReportParameters() {
    const paramTypes = ['string', 'number', 'date', 'boolean'];
    const parameters = {};
    const paramCount = this.getRandomNumber(1, 5);

    for (let i = 0; i < paramCount; i++) {
      const paramName = `param${i + 1}`;
      const paramType = this.getRandomItem(paramTypes);

      switch (paramType) {
        case 'string':
          parameters[paramName] = this.getRandomItem(['Value A', 'Value B', 'Value C']);
          break;
        case 'number':
          parameters[paramName] = this.getRandomNumber(1, 1000);
          break;
        case 'date':
          parameters[paramName] = this.getRandomDate(new Date('2023-01-01'), new Date())
            .toISOString()
            .split('T')[0];
          break;
        case 'boolean':
          parameters[paramName] = this.getRandomBoolean();
          break;
      }
    }

    return parameters;
  }

  /**
   * Generate error scenarios for testing
   * @returns {Array} Array of error scenario objects
   */
  generateErrorScenarios() {
    return [
      {
        name: 'Authentication Failed',
        statusCode: 401,
        errorCode: 'authentication.failed',
        message: 'Invalid username or password',
        scenario: 'invalid_credentials',
      },
      {
        name: 'Resource Not Found',
        statusCode: 404,
        errorCode: 'resource.not.found',
        message: 'The requested resource was not found',
        scenario: 'missing_resource',
      },
      {
        name: 'Access Denied',
        statusCode: 403,
        errorCode: 'access.denied',
        message: 'You do not have permission to access this resource',
        scenario: 'insufficient_permissions',
      },
      {
        name: 'Invalid Request',
        statusCode: 400,
        errorCode: 'invalid.request',
        message: 'The request contains invalid data',
        scenario: 'malformed_request',
      },
      {
        name: 'Resource Conflict',
        statusCode: 409,
        errorCode: 'resource.exists',
        message: 'A resource with this name already exists',
        scenario: 'duplicate_resource',
      },
      {
        name: 'Server Error',
        statusCode: 500,
        errorCode: 'internal.error',
        message: 'An internal server error occurred',
        scenario: 'server_failure',
      },
      {
        name: 'Service Unavailable',
        statusCode: 503,
        errorCode: 'service.unavailable',
        message: 'The service is temporarily unavailable',
        scenario: 'service_down',
      },
    ];
  }

  // Helper methods

  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomBoolean(probability = 0.5) {
    return Math.random() < probability;
  }

  getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  generateId(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generatePhoneNumber() {
    const areaCode = this.getRandomNumber(200, 999);
    const exchange = this.getRandomNumber(200, 999);
    const number = this.getRandomNumber(1000, 9999);
    return `(${areaCode}) ${exchange}-${number}`;
  }

  /**
   * Generate test configuration variations
   * @returns {Array} Array of configuration objects
   */
  generateTestConfigurations() {
    return [
      {
        name: 'Basic Authentication',
        jasperUrl: 'http://localhost:8080/jasperserver',
        authType: 'basic',
        username: 'jasperadmin',
        password: 'jasperadmin',
        timeout: 30000,
      },
      {
        name: 'Login Service Authentication',
        jasperUrl: 'http://localhost:8080/jasperserver',
        authType: 'login',
        username: 'testuser',
        password: 'testpass',
        organization: 'organization_1',
        timeout: 45000,
      },
      {
        name: 'Argument Authentication',
        jasperUrl: 'http://localhost:8080/jasperserver',
        authType: 'argument',
        username: 'apiuser',
        password: 'apipass',
        timeout: 60000,
      },
      {
        name: 'SSL Configuration',
        jasperUrl: 'https://secure.jasperserver.com/jasperserver',
        authType: 'basic',
        username: 'ssluser',
        password: 'sslpass',
        sslVerify: true,
        timeout: 90000,
      },
    ];
  }

  /**
   * Generate performance test data
   * @param {string} size - Size of dataset ('small', 'medium', 'large')
   * @returns {Object} Performance test data
   */
  generatePerformanceTestData(size = 'medium') {
    const sizes = {
      small: { employees: 100, sales: 500, executions: 50 },
      medium: { employees: 1000, sales: 5000, executions: 200 },
      large: { employees: 10000, sales: 50000, executions: 1000 },
    };

    const config = sizes[size] || sizes.medium;

    return {
      employees: this.generateEmployees(config.employees),
      sales: this.generateSalesData(config.sales),
      executions: this.generateReportExecutions(config.executions),
      metadata: {
        size,
        totalRecords: config.employees + config.sales + config.executions,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export default TestDataGenerator;
