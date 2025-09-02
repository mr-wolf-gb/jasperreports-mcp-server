/**
 * Validation Test Configuration
 * Configuration for testing against multiple JasperReports Server versions
 * Requirements: 14.7
 */

export const validationConfigs = {
  // JasperReports Server 8.x Configuration
  jasperserver_8x: {
    name: 'JasperReports Server 8.x',
    version: '8.2.0',
    jasperUrl: 'http://localhost:8080/jasperserver',
    authType: 'basic',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
    timeout: 30000,
    sslVerify: false,
    debugMode: true,
    features: {
      domains: true,
      adhocReports: true,
      dashboards: true,
      restV2: true,
      asyncExecution: true,
      jobScheduling: true,
      permissions: true,
      userManagement: true,
    },
    testServer: {
      enabled: true,
      port: 3001,
    },
  },

  // JasperReports Server 7.x Configuration
  jasperserver_7x: {
    name: 'JasperReports Server 7.x',
    version: '7.8.0',
    jasperUrl: 'http://localhost:8080/jasperserver-pro',
    authType: 'login',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
    timeout: 30000,
    sslVerify: false,
    debugMode: true,
    features: {
      domains: true,
      adhocReports: true,
      dashboards: true,
      restV2: true,
      asyncExecution: true,
      jobScheduling: true,
      permissions: true,
      userManagement: true,
    },
    testServer: {
      enabled: true,
      port: 3002,
    },
  },

  // Community Edition Configuration
  jasperserver_ce: {
    name: 'JasperReports Server CE',
    version: '8.0.0',
    jasperUrl: 'http://localhost:8080/jasperserver',
    authType: 'basic',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
    timeout: 30000,
    sslVerify: false,
    debugMode: true,
    features: {
      domains: false,
      adhocReports: false,
      dashboards: false,
      restV2: true,
      asyncExecution: true,
      jobScheduling: true,
      permissions: false,
      userManagement: false,
    },
    testServer: {
      enabled: true,
      port: 3003,
    },
  },

  // Organization-based Configuration
  jasperserver_org: {
    name: 'JasperReports Server with Organization',
    version: '8.2.0',
    jasperUrl: 'http://localhost:8080/jasperserver',
    authType: 'basic',
    username: 'testuser|test_org',
    password: 'testpass',
    organization: 'test_org',
    timeout: 30000,
    sslVerify: false,
    debugMode: true,
    features: {
      domains: true,
      adhocReports: true,
      dashboards: true,
      restV2: true,
      asyncExecution: true,
      jobScheduling: true,
      permissions: true,
      userManagement: true,
    },
    testServer: {
      enabled: true,
      port: 3004,
    },
  },
};

export const authenticationTestConfigs = {
  basic: {
    authType: 'basic',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
  },

  login: {
    authType: 'login',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
  },

  argument: {
    authType: 'argument',
    username: 'jasperadmin',
    password: 'jasperadmin',
    organization: null,
  },

  organization: {
    authType: 'basic',
    username: 'testuser|test_org',
    password: 'testpass',
    organization: 'test_org',
  },
};

export const parameterTestCombinations = [
  // Basic parameters
  {
    name: 'Basic Parameters',
    parameters: {
      ReportTitle: 'Basic Test Report',
      UserName: 'Test User',
      GeneratedDate: new Date().toISOString(),
    },
  },

  // Extended parameters with various data types
  {
    name: 'Extended Parameters',
    parameters: {
      ReportTitle: 'Extended Test Report',
      UserName: 'Extended Test User',
      GeneratedDate: new Date().toISOString(),
      StringParam: 'String Value',
      NumberParam: 42,
      FloatParam: 3.14159,
      BooleanParam: true,
      DateParam: '2023-12-31',
      TimeParam: '23:59:59',
      DateTimeParam: '2023-12-31T23:59:59Z',
    },
  },

  // Complex parameters with arrays and objects
  {
    name: 'Complex Parameters',
    parameters: {
      ReportTitle: 'Complex Test Report',
      UserName: 'Complex Test User',
      GeneratedDate: new Date().toISOString(),
      ArrayParam: ['value1', 'value2', 'value3'],
      ObjectParam: {
        key1: 'value1',
        key2: 'value2',
        nested: {
          nestedKey: 'nestedValue',
        },
      },
      MultiSelectParam: ['option1', 'option2'],
      RangeParam: {
        start: 1,
        end: 100,
      },
    },
  },

  // Minimal parameters
  {
    name: 'Minimal Parameters',
    parameters: {
      ReportTitle: 'Minimal Test',
    },
  },

  // Special characters and encoding
  {
    name: 'Special Characters',
    parameters: {
      ReportTitle: 'Special Characters Test: àáâãäåæçèéêë',
      UserName: 'User with Spëcîál Chàracters',
      GeneratedDate: new Date().toISOString(),
      SpecialParam: 'Value with "quotes" and \'apostrophes\'',
      UnicodeParam: '测试中文参数',
      SymbolParam: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    },
  },

  // Large parameter values
  {
    name: 'Large Parameters',
    parameters: {
      ReportTitle: 'Large Parameters Test',
      UserName: 'Large Test User',
      GeneratedDate: new Date().toISOString(),
      LargeTextParam: 'A'.repeat(1000),
      LargeArrayParam: Array(100)
        .fill()
        .map((_, i) => `Item ${i}`),
      LargeNumberParam: 999999999999,
    },
  },
];

export const outputFormatTestCombinations = [
  { format: 'pdf', contentType: 'application/pdf' },
  { format: 'html', contentType: 'text/html' },
  {
    format: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  { format: 'csv', contentType: 'text/csv' },
  { format: 'rtf', contentType: 'application/rtf' },
  {
    format: 'docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
];

export const pageRangeTestCombinations = [
  { range: '1', description: 'Single page' },
  { range: '1-3', description: 'Page range' },
  { range: '1,3,5', description: 'Specific pages' },
  { range: '1-2,4-5', description: 'Multiple ranges' },
  { range: '2-', description: 'From page to end' },
  { range: '-3', description: 'From start to page' },
];

export const jobScheduleTestCombinations = [
  {
    name: 'Daily Schedule',
    schedule: {
      type: 'simple',
      intervalUnit: 'DAY',
      interval: 1,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    name: 'Weekly Schedule',
    schedule: {
      type: 'simple',
      intervalUnit: 'WEEK',
      interval: 1,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    name: 'Monthly Schedule',
    schedule: {
      type: 'simple',
      intervalUnit: 'MONTH',
      interval: 1,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    name: 'Calendar Schedule - Monthly',
    schedule: {
      type: 'calendar',
      daysInMonth: [1, 15],
      months: [1, 6, 12],
      hours: [9],
      minutes: [0],
    },
  },
  {
    name: 'Calendar Schedule - Weekly',
    schedule: {
      type: 'calendar',
      daysInWeek: [2, 4, 6], // Mon, Wed, Fri
      hours: [9, 17],
      minutes: [0, 30],
    },
  },
];

export const resourceTypeTestCombinations = [
  {
    type: 'folder',
    descriptor: {
      resourceType: 'folder',
      label: 'Test Folder',
      description: 'Test folder for validation',
    },
  },
  {
    type: 'reportUnit',
    descriptor: {
      label: 'Test Report Unit',
      description: 'Test report unit for validation',
    },
  },
  {
    type: 'jdbcDataSource',
    descriptor: {
      resourceType: 'jdbcDataSource',
      label: 'Test JDBC DataSource',
      description: 'Test JDBC datasource for validation',
      connectionUrl: 'jdbc:h2:mem:testdb',
      driverClass: 'org.h2.Driver',
      username: 'sa',
      password: '',
    },
  },
  {
    type: 'jndiJdbcDataSource',
    descriptor: {
      resourceType: 'jndiJdbcDataSource',
      label: 'Test JNDI DataSource',
      description: 'Test JNDI datasource for validation',
      jndiName: 'java:comp/env/jdbc/testdb',
    },
  },
  {
    type: 'img',
    descriptor: {
      resourceType: 'img',
      label: 'Test Image',
      description: 'Test image resource for validation',
    },
  },
];

export const loadTestConfigurations = {
  light: {
    name: 'Light Load',
    concurrentUsers: 3,
    operationsPerUser: 2,
    duration: 30000, // 30 seconds
    rampUpTime: 5000, // 5 seconds
  },

  medium: {
    name: 'Medium Load',
    concurrentUsers: 6,
    operationsPerUser: 3,
    duration: 60000, // 1 minute
    rampUpTime: 10000, // 10 seconds
  },

  heavy: {
    name: 'Heavy Load',
    concurrentUsers: 10,
    operationsPerUser: 5,
    duration: 120000, // 2 minutes
    rampUpTime: 20000, // 20 seconds
  },
};

export const memoryTestConfigurations = {
  smallFiles: {
    name: 'Small Files Test',
    fileCount: 20,
    fileSizeKB: 10,
    iterations: 5,
  },

  mediumFiles: {
    name: 'Medium Files Test',
    fileCount: 10,
    fileSizeKB: 100,
    iterations: 3,
  },

  largeFiles: {
    name: 'Large Files Test',
    fileCount: 5,
    fileSizeKB: 1000,
    iterations: 2,
  },
};

export const performanceThresholds = {
  authentication: {
    maxTime: 2000, // 2 seconds
    avgTime: 1000, // 1 second
  },

  resourceUpload: {
    maxTime: 5000, // 5 seconds
    avgTime: 2000, // 2 seconds
  },

  resourceListing: {
    maxTime: 3000, // 3 seconds
    avgTime: 1000, // 1 second
  },

  reportExecution: {
    maxTime: 10000, // 10 seconds
    avgTime: 5000, // 5 seconds
  },

  jobCreation: {
    maxTime: 3000, // 3 seconds
    avgTime: 1500, // 1.5 seconds
  },

  memoryUsage: {
    maxIncreaseMB: 100, // 100MB
    maxTotalMB: 500, // 500MB
  },
};

export const errorTestScenarios = [
  {
    name: 'Invalid Authentication',
    scenario: 'authentication',
    config: {
      username: 'invalid_user',
      password: 'invalid_password',
    },
    expectedError: 'Authentication failed',
  },

  {
    name: 'Invalid Resource URI',
    scenario: 'resource_access',
    config: {
      resourceUri: '/nonexistent/resource',
    },
    expectedError: 'Resource not found',
  },

  {
    name: 'Invalid Output Format',
    scenario: 'report_execution',
    config: {
      outputFormat: 'invalid_format',
    },
    expectedError: 'Invalid output format',
  },

  {
    name: 'Missing Required Parameters',
    scenario: 'parameter_validation',
    config: {
      parameters: {},
    },
    expectedError: 'Missing required parameter',
  },

  {
    name: 'Invalid Job Schedule',
    scenario: 'job_creation',
    config: {
      schedule: {
        type: 'invalid_type',
      },
    },
    expectedError: 'Invalid schedule type',
  },
];

export default {
  validationConfigs,
  authenticationTestConfigs,
  parameterTestCombinations,
  outputFormatTestCombinations,
  pageRangeTestCombinations,
  jobScheduleTestCombinations,
  resourceTypeTestCombinations,
  loadTestConfigurations,
  memoryTestConfigurations,
  performanceThresholds,
  errorTestScenarios,
};
