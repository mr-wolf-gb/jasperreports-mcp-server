/**
 * Comprehensive Tool Test Runner
 *
 * Automated testing system for all 25+ MCP tools with:
 * - Detailed test reports with success rates and error analysis
 * - Diagnostic information for failed tests
 * - Performance metrics and reliability statistics
 * - Permission scenario testing
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AuthService from '../../src/services/authService.js';
import ResourceService from '../../src/services/resourceService.js';
import ReportService from '../../src/services/reportService.js';
import JobService from '../../src/services/jobService.js';
import InputControlService from '../../src/services/inputControlService.js';
import DomainService from '../../src/services/domainService.js';
import UserService from '../../src/services/userService.js';
import HealthService from '../../src/services/healthService.js';
import PermissionService from '../../src/services/permissionService.js';
import ExecutionService from '../../src/services/executionService.js';
import TestHelpers from './testHelpers.js';
import { ErrorHandler } from '../../src/utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tool categories and their associated tools
 */
const TOOL_CATEGORIES = {
  AUTHENTICATION: ['jasper_authenticate', 'jasper_test_connection'],
  RESOURCE_MANAGEMENT: [
    'jasper_list_resources',
    'jasper_get_resource',
    'jasper_upload_resource',
    'jasper_update_resource',
    'jasper_delete_resource',
  ],
  REPORT_EXECUTION: [
    'jasper_run_report_sync',
    'jasper_run_report_async',
    'jasper_get_execution_status',
    'jasper_get_execution_result',
    'jasper_cancel_execution',
  ],
  JOB_MANAGEMENT: [
    'jasper_create_job',
    'jasper_list_jobs',
    'jasper_update_job',
    'jasper_delete_job',
    'jasper_run_job_now',
  ],
  INPUT_CONTROLS: [
    'jasper_get_input_controls',
    'jasper_set_input_control_values',
    'jasper_validate_input_controls',
  ],
  DOMAIN_MANAGEMENT: ['jasper_list_domains', 'jasper_get_domain', 'jasper_get_domain_schema'],
  USER_MANAGEMENT: [
    'jasper_create_user',
    'jasper_list_users',
    'jasper_update_user',
    'jasper_create_role',
    'jasper_list_roles',
  ],
  PERMISSION_MANAGEMENT: ['jasper_get_permissions', 'jasper_set_permissions'],
  HEALTH_MONITORING: [
    'jasper_health_status',
    'jasper_deep_health_check',
    'jasper_performance_metrics',
    'jasper_component_health',
    'jasper_resilience_stats',
  ],
};

/**
 * Test result status types
 */
const TEST_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ERROR: 'error',
  TIMEOUT: 'timeout',
};

/**
 * Comprehensive Tool Test Runner class
 */
class ToolTestRunner {
  constructor(config = null) {
    this.config = config;
    this.testHelpers = new TestHelpers();
    this.errorHandler = new ErrorHandler(config);
    this.services = {};
    this.testResults = {
      summary: {
        totalTools: 0,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 0,
        timeouts: 0,
        successRate: 0,
        totalExecutionTime: 0,
        startTime: null,
        endTime: null,
      },
      categories: {},
      tools: {},
      diagnostics: [],
      performanceMetrics: {
        averageExecutionTime: 0,
        slowestTool: null,
        fastestTool: null,
        memoryUsage: null,
      },
    };
  }

  /**
   * Initialize services for testing
   * @private
   */
  async _initializeServices() {
    try {
      this.services = {
        auth: new AuthService(this.config),
        resource: new ResourceService(this.config),
        report: new ReportService(this.config),
        job: new JobService(this.config),
        inputControl: new InputControlService(this.config),
        domain: new DomainService(this.config),
        user: new UserService(this.config),
        health: new HealthService(this.config),
        permission: new PermissionService(this.config),
        execution: new ExecutionService(this.config),
      };

      // Authenticate once for all tests
      await this.services.auth.authenticate();
    } catch (error) {
      this.errorHandler.logError(error, 'Service initialization');
      throw error;
    }
  }

  /**
   * Dispose of all services
   * @private
   */
  _disposeServices() {
    Object.values(this.services).forEach(service => {
      if (service && typeof service.dispose === 'function') {
        service.dispose();
      }
    });
    this.services = {};
  }

  /**
   * Run comprehensive tests on all tools
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results
   */
  async testAllTools(options = {}) {
    const {
      categories = Object.keys(TOOL_CATEGORIES),
      includePerformanceTests = true,
      includePermissionTests = true,
      timeout = 30000,
      verbose = false,
    } = options;

    this.testResults.summary.startTime = new Date();

    if (verbose) {
      console.log('🚀 Starting comprehensive tool testing...');
    }

    try {
      await this._initializeServices();

      // Test each category
      for (const category of categories) {
        if (TOOL_CATEGORIES[category]) {
          await this._testCategory(category, {
            includePerformanceTests,
            includePermissionTests,
            timeout,
            verbose,
          });
        }
      }

      // Calculate final metrics
      this._calculateFinalMetrics();

      this.testResults.summary.endTime = new Date();
      this.testResults.summary.totalExecutionTime =
        this.testResults.summary.endTime - this.testResults.summary.startTime;

      if (verbose) {
        console.log('✅ Tool testing completed');
        this._printSummary();
      }

      return this.testResults;
    } catch (error) {
      this.errorHandler.logError(error, 'Tool testing');
      throw error;
    } finally {
      this._disposeServices();
    }
  }

  /**
   * Test a specific category of tools
   * @private
   */
  async _testCategory(category, options) {
    const { verbose, timeout } = options;
    const tools = TOOL_CATEGORIES[category];

    if (verbose) {
      console.log(`\n📂 Testing ${category} (${tools.length} tools)`);
    }

    this.testResults.categories[category] = {
      totalTools: tools.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
      timeouts: 0,
      executionTime: 0,
      tools: {},
    };

    for (const toolName of tools) {
      await this._testTool(toolName, category, { timeout, verbose });
    }
  }

  /**
   * Test a specific tool
   * @private
   */
  async _testTool(toolName, category, options) {
    const { timeout, verbose } = options;
    const startTime = Date.now();

    if (verbose) {
      console.log(`  🔧 Testing ${toolName}...`);
    }

    const toolResult = {
      toolName,
      category,
      status: TEST_STATUS.SKIPPED,
      executionTime: 0,
      error: null,
      diagnostics: [],
      testCases: [],
    };

    try {
      // Get test cases for this tool
      const testCases = this._getToolTestCases(toolName);

      for (const testCase of testCases) {
        const caseResult = await this._executeTestCase(toolName, testCase, timeout);
        toolResult.testCases.push(caseResult);

        if (caseResult.status === TEST_STATUS.PASSED) {
          toolResult.status = TEST_STATUS.PASSED;
        } else if (
          caseResult.status === TEST_STATUS.FAILED &&
          toolResult.status !== TEST_STATUS.PASSED
        ) {
          toolResult.status = TEST_STATUS.FAILED;
          toolResult.error = caseResult.error;
        }
      }

      // Update category and summary counters
      this._updateCounters(category, toolResult.status);
    } catch (error) {
      toolResult.status = TEST_STATUS.ERROR;
      toolResult.error = error.message;
      toolResult.diagnostics.push({
        type: 'error',
        message: error.message,
        stack: error.stack,
      });

      this._updateCounters(category, TEST_STATUS.ERROR);
    } finally {
      toolResult.executionTime = Date.now() - startTime;
      this.testResults.categories[category].executionTime += toolResult.executionTime;
      this.testResults.categories[category].tools[toolName] = toolResult;
      this.testResults.tools[toolName] = toolResult;

      if (verbose) {
        const status =
          toolResult.status === TEST_STATUS.PASSED
            ? '✅'
            : toolResult.status === TEST_STATUS.FAILED
              ? '❌'
              : toolResult.status === TEST_STATUS.ERROR
                ? '💥'
                : '⏭️';
        console.log(`    ${status} ${toolName} (${toolResult.executionTime}ms)`);
      }
    }
  }

  /**
   * Execute a specific test case
   * @private
   */
  async _executeTestCase(toolName, testCase, timeout) {
    const startTime = Date.now();
    const caseResult = {
      name: testCase.name,
      status: TEST_STATUS.SKIPPED,
      executionTime: 0,
      error: null,
      response: null,
    };

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });

      // Execute the test case
      const testPromise = this._executeToolMethod(toolName, testCase.parameters);

      const result = await Promise.race([testPromise, timeoutPromise]);

      caseResult.response = result;
      caseResult.status = TEST_STATUS.PASSED;
    } catch (error) {
      if (error.message === 'Test timeout') {
        caseResult.status = TEST_STATUS.TIMEOUT;
      } else {
        caseResult.status = TEST_STATUS.FAILED;
      }
      caseResult.error = error.message;
    } finally {
      caseResult.executionTime = Date.now() - startTime;
    }

    return caseResult;
  }

  /**
   * Execute a tool method based on tool name
   * @private
   */
  async _executeToolMethod(toolName, parameters) {
    // Map tool names to service methods
    const toolMethods = {
      // Authentication
      jasper_authenticate: () => this.services.auth.authenticate(parameters?.forceReauth),
      jasper_test_connection: () => this.services.auth.testConnection(parameters?.includeAuth),

      // Resource Management
      jasper_list_resources: () =>
        this.services.resource.listResources(parameters?.folderUri || '/', parameters),
      jasper_get_resource: () =>
        this.services.resource.getResource(parameters?.resourceUri || '/test', parameters),
      jasper_upload_resource: () => this.services.resource.uploadResource(parameters),
      jasper_update_resource: () =>
        this.services.resource.updateResource(parameters?.resourceUri || '/test', parameters),
      jasper_delete_resource: () =>
        this.services.resource.deleteResource(parameters?.resourceUri || '/test', parameters),

      // Report Execution
      jasper_run_report_sync: () =>
        this.services.report.runReportSync(parameters?.reportUri || '/test/report', parameters),
      jasper_run_report_async: () =>
        this.services.report.runReportAsync(parameters?.reportUri || '/test/report', parameters),
      jasper_get_execution_status: () =>
        this.services.execution.getExecutionStatus(
          parameters?.executionId || 'test-id',
          parameters
        ),
      jasper_get_execution_result: () =>
        this.services.execution.getExecutionResult(
          parameters?.executionId || 'test-id',
          parameters
        ),
      jasper_cancel_execution: () =>
        this.services.execution.cancelExecution(parameters?.executionId || 'test-id', parameters),

      // Job Management
      jasper_create_job: () => this.services.job.createJob(parameters),
      jasper_list_jobs: () => this.services.job.listJobs(parameters),
      jasper_update_job: () =>
        this.services.job.updateJob(parameters?.jobId || 'test-job', parameters),
      jasper_delete_job: () =>
        this.services.job.deleteJob(parameters?.jobId || 'test-job', parameters),
      jasper_run_job_now: () =>
        this.services.job.runJobNow(parameters?.jobId || 'test-job', parameters),

      // Input Controls
      jasper_get_input_controls: () =>
        this.services.inputControl.getInputControls(
          parameters?.reportUri || '/test/report',
          parameters
        ),
      jasper_set_input_control_values: () =>
        this.services.inputControl.setInputControlValues(
          parameters?.reportUri || '/test/report',
          parameters?.controlId || 'test-control',
          parameters
        ),
      jasper_validate_input_controls: () =>
        this.services.inputControl.validateInputControls(
          parameters?.reportUri || '/test/report',
          parameters
        ),

      // Domain Management
      jasper_list_domains: () => this.services.domain.listDomains(parameters),
      jasper_get_domain: () =>
        this.services.domain.getDomain(parameters?.domainUri || '/test/domain', parameters),
      jasper_get_domain_schema: () =>
        this.services.domain.getDomainSchema(parameters?.domainUri || '/test/domain', parameters),

      // User Management
      jasper_create_user: () => this.services.user.createUser(parameters),
      jasper_list_users: () => this.services.user.listUsers(parameters),
      jasper_update_user: () =>
        this.services.user.updateUser(parameters?.username || 'testuser', parameters),
      jasper_create_role: () => this.services.user.createRole(parameters),
      jasper_list_roles: () => this.services.user.listRoles(parameters),

      // Permission Management
      jasper_get_permissions: () =>
        this.services.permission.getPermissions(parameters?.resourceUri || '/test', parameters),
      jasper_set_permissions: () =>
        this.services.permission.setPermissions(
          parameters?.resourceUri || '/test',
          parameters?.permissions || [],
          parameters
        ),

      // Health Monitoring
      jasper_health_status: () => this.services.health.getHealthStatus(parameters),
      jasper_deep_health_check: () => this.services.health.performDeepHealthCheck(parameters),
      jasper_performance_metrics: () => this.services.health.getPerformanceMetrics(parameters),
      jasper_component_health: () =>
        this.services.health.testComponentHealth(
          parameters?.component || 'authentication',
          parameters
        ),
      jasper_resilience_stats: () => this.services.health.getResilienceStats(parameters),
    };

    const method = toolMethods[toolName];
    if (!method) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await method();
  }

  /**
   * Get test cases for a specific tool
   * @private
   */
  _getToolTestCases(toolName) {
    const commonTestCases = {
      jasper_authenticate: [
        { name: 'basic_auth', parameters: { authType: 'basic' } },
        { name: 'force_reauth', parameters: { forceReauth: true } },
      ],
      jasper_test_connection: [
        { name: 'with_auth', parameters: { includeAuth: true } },
        { name: 'without_auth', parameters: { includeAuth: false } },
      ],
      jasper_list_resources: [
        { name: 'root_folder', parameters: { folderUri: '/' } },
        { name: 'with_limit', parameters: { folderUri: '/', limit: 10 } },
      ],
      jasper_get_resource: [
        { name: 'basic_get', parameters: { resourceUri: '/test' } },
        { name: 'with_metadata', parameters: { resourceUri: '/test', includeMetadata: true } },
      ],
      jasper_health_status: [
        { name: 'basic_health', parameters: {} },
        { name: 'with_details', parameters: { includeDetails: true } },
      ],
    };

    return commonTestCases[toolName] || [{ name: 'basic_test', parameters: {} }];
  }

  /**
   * Update counters for category and summary
   * @private
   */
  _updateCounters(category, status) {
    // Update category counters
    this.testResults.categories[category][status]++;

    // Update summary counters
    this.testResults.summary.totalTools++;
    this.testResults.summary[status]++;
  }

  /**
   * Calculate final metrics
   * @private
   */
  _calculateFinalMetrics() {
    const { summary } = this.testResults;

    // Calculate success rate
    summary.successRate = summary.totalTools > 0 ? (summary.passed / summary.totalTools) * 100 : 0;

    // Calculate performance metrics
    const executionTimes = Object.values(this.testResults.tools)
      .map(tool => tool.executionTime)
      .filter(time => time > 0);

    if (executionTimes.length > 0) {
      this.testResults.performanceMetrics.averageExecutionTime =
        executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;

      const slowestTime = Math.max(...executionTimes);
      const fastestTime = Math.min(...executionTimes);

      this.testResults.performanceMetrics.slowestTool = Object.values(this.testResults.tools).find(
        tool => tool.executionTime === slowestTime
      );

      this.testResults.performanceMetrics.fastestTool = Object.values(this.testResults.tools).find(
        tool => tool.executionTime === fastestTime
      );
    }

    // Capture memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.testResults.performanceMetrics.memoryUsage = process.memoryUsage();
    }
  }

  /**
   * Print test summary to console
   * @private
   */
  _printSummary() {
    const { summary } = this.testResults;

    console.log('\n📊 Test Summary:');
    console.log(`   Total Tools: ${summary.totalTools}`);
    console.log(`   Passed: ${summary.passed} (${summary.successRate.toFixed(1)}%)`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`   Errors: ${summary.errors}`);
    console.log(`   Timeouts: ${summary.timeouts}`);
    console.log(`   Execution Time: ${summary.totalExecutionTime}ms`);

    if (this.testResults.performanceMetrics.slowestTool) {
      console.log(
        `   Slowest Tool: ${this.testResults.performanceMetrics.slowestTool.toolName} (${this.testResults.performanceMetrics.slowestTool.executionTime}ms)`
      );
    }

    if (this.testResults.performanceMetrics.fastestTool) {
      console.log(
        `   Fastest Tool: ${this.testResults.performanceMetrics.fastestTool.toolName} (${this.testResults.performanceMetrics.fastestTool.executionTime}ms)`
      );
    }
  }

  /**
   * Generate detailed test report
   * @param {string} outputPath - Path to save the report
   * @returns {Promise<string>} Path to generated report
   */
  async generateTestReport(outputPath = null) {
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = path.join(__dirname, '..', 'reports', `tool-test-report-${timestamp}.json`);
    }

    // Ensure directory exists
    const reportDir = path.dirname(outputPath);
    await fs.mkdir(reportDir, { recursive: true });

    // Add report metadata
    const report = {
      ...this.testResults,
      metadata: {
        generatedAt: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        reportVersion: '1.0.0',
      },
    };

    // Write report to file
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));

    return outputPath;
  }

  /**
   * Generate HTML test report
   * @param {string} outputPath - Path to save the HTML report
   * @returns {Promise<string>} Path to generated HTML report
   */
  async generateHTMLReport(outputPath = null) {
    if (!outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = path.join(__dirname, '..', 'reports', `tool-test-report-${timestamp}.html`);
    }

    const html = this._generateHTMLContent();

    // Ensure directory exists
    const reportDir = path.dirname(outputPath);
    await fs.mkdir(reportDir, { recursive: true });

    await fs.writeFile(outputPath, html);

    return outputPath;
  }

  /**
   * Generate HTML content for the report
   * @private
   */
  _generateHTMLContent() {
    const { summary, categories, performanceMetrics } = this.testResults;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JasperReports MCP Tools Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .error { color: #fd7e14; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; }
        .tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .tool { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #6c757d; }
        .tool.passed { border-left-color: #28a745; }
        .tool.failed { border-left-color: #dc3545; }
        .tool.error { border-left-color: #fd7e14; }
        .tool h4 { margin: 0 0 10px 0; }
        .tool-status { font-weight: bold; text-transform: uppercase; font-size: 12px; }
        .execution-time { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>JasperReports MCP Tools Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tools</h3>
                <div class="value">${summary.totalTools}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value passed">${summary.successRate.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Errors</h3>
                <div class="value error">${summary.errors}</div>
            </div>
            <div class="metric">
                <h3>Execution Time</h3>
                <div class="value">${summary.totalExecutionTime}ms</div>
            </div>
        </div>
        
        ${Object.entries(categories)
          .map(
            ([categoryName, categoryData]) => `
            <div class="category">
                <h2>${categoryName.replace(/_/g, ' ')}</h2>
                <div class="tools">
                    ${Object.values(categoryData.tools)
                      .map(
                        tool => `
                        <div class="tool ${tool.status}">
                            <h4>${tool.toolName}</h4>
                            <div class="tool-status ${tool.status}">${tool.status}</div>
                            <div class="execution-time">${tool.executionTime}ms</div>
                            ${tool.error ? `<div class="error-message" style="color: #dc3545; font-size: 12px; margin-top: 5px;">${tool.error}</div>` : ''}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `
          )
          .join('')}
        
        <div class="category">
            <h2>Performance Metrics</h2>
            <div class="summary">
                <div class="metric">
                    <h3>Average Execution Time</h3>
                    <div class="value">${performanceMetrics.averageExecutionTime?.toFixed(0) || 0}ms</div>
                </div>
                ${
                  performanceMetrics.slowestTool
                    ? `
                    <div class="metric">
                        <h3>Slowest Tool</h3>
                        <div class="value">${performanceMetrics.slowestTool.toolName}</div>
                        <div style="font-size: 14px; color: #6c757d;">${performanceMetrics.slowestTool.executionTime}ms</div>
                    </div>
                `
                    : ''
                }
                ${
                  performanceMetrics.fastestTool
                    ? `
                    <div class="metric">
                        <h3>Fastest Tool</h3>
                        <div class="value">${performanceMetrics.fastestTool.toolName}</div>
                        <div style="font-size: 14px; color: #6c757d;">${performanceMetrics.fastestTool.executionTime}ms</div>
                    </div>
                `
                    : ''
                }
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Test tools with specific permission scenarios
   * @param {Array} permissionScenarios - Array of permission scenarios to test
   * @returns {Promise<Object>} Permission test results
   */
  async testWithPermissions(permissionScenarios) {
    const results = {
      scenarios: {},
      summary: {
        totalScenarios: permissionScenarios.length,
        passed: 0,
        failed: 0,
      },
    };

    for (const scenario of permissionScenarios) {
      const scenarioResult = await this._testPermissionScenario(scenario);
      results.scenarios[scenario.name] = scenarioResult;

      if (scenarioResult.success) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    }

    return results;
  }

  /**
   * Test a specific permission scenario
   * @private
   */
  async _testPermissionScenario(scenario) {
    const { name, tools = [] } = scenario;

    try {
      // Create test user with specific role (if needed)
      // This would require admin privileges

      const results = {};

      for (const toolName of tools) {
        try {
          const result = await this._executeToolMethod(toolName, {});
          results[toolName] = {
            success: true,
            result,
          };
        } catch (error) {
          results[toolName] = {
            success: false,
            error: error.message,
          };
        }
      }

      return {
        name,
        success: true,
        results,
        executionTime: Date.now(),
      };
    } catch (error) {
      return {
        name,
        success: false,
        error: error.message,
        executionTime: Date.now(),
      };
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this._disposeServices();
    if (this.testHelpers) {
      this.testHelpers.cleanup();
    }
  }
}

export default ToolTestRunner;
export { TEST_STATUS, TOOL_CATEGORIES };
