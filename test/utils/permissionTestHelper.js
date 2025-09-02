/**
 * Permission Test Helper
 *
 * Helper class for testing different user roles and permission scenarios
 * with MCP tools to verify proper error messages and access control.
 */

import AuthService from '../../src/services/authService.js';
import UserService from '../../src/services/userService.js';
import PermissionService from '../../src/services/permissionService.js';
import TestHelpers from './testHelpers.js';
import { ErrorHandler } from '../../src/utils/errorHandler.js';

/**
 * Permission levels for JasperReports Server
 */
const PERMISSION_LEVELS = {
  NO_ACCESS: 0,
  ADMINISTER: 1,
  READ_WRITE_DELETE: 30,
  READ_WRITE: 18,
  READ_ONLY: 2,
  EXECUTE_ONLY: 32,
};

/**
 * Common user roles in JasperReports Server
 */
const USER_ROLES = {
  ADMIN: 'ROLE_ADMINISTRATOR',
  USER: 'ROLE_USER',
  ANONYMOUS: 'ROLE_ANONYMOUS',
  SUPERUSER: 'ROLE_SUPERUSER',
};

/**
 * Permission Test Helper class
 */
class PermissionTestHelper {
  constructor(config = null) {
    this.config = config;
    this.testHelpers = new TestHelpers();
    this.errorHandler = new ErrorHandler(config);
    this.authService = new AuthService(config);
    this.userService = new UserService(config);
    this.permissionService = new PermissionService(config);
    this.testUsers = new Map();
  }

  /**
   * Create test user with specific role
   * @param {string} username - Username for test user
   * @param {string} role - Role to assign to user
   * @param {string} password - Password for test user
   * @returns {Promise<Object>} Created user information
   */
  async createTestUser(username, role, password = 'testpass123') {
    try {
      const userDescriptor = {
        username,
        password,
        fullName: `Test User ${username}`,
        emailAddress: `${username}@test.com`,
        enabled: true,
        roles: [role],
      };

      const result = await this.userService.createUser(userDescriptor);

      this.testUsers.set(username, {
        username,
        password,
        role,
        descriptor: userDescriptor,
        created: new Date(),
      });

      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'Create test user', { username, role });
      throw error;
    }
  }

  /**
   * Delete test user
   * @param {string} username - Username to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTestUser(username) {
    try {
      const result = await this.userService.deleteUser(username);
      this.testUsers.delete(username);
      return result;
    } catch (error) {
      this.errorHandler.logError(error, 'Delete test user', { username });
      throw error;
    }
  }

  /**
   * Authenticate as test user
   * @param {string} username - Username to authenticate as
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateAsUser(username) {
    const user = this.testUsers.get(username);
    if (!user) {
      throw new Error(`Test user ${username} not found`);
    }

    const userConfig = {
      ...this.config,
      username: user.username,
      password: user.password,
    };

    const userAuthService = new AuthService(userConfig);

    try {
      const result = await userAuthService.authenticate();
      return {
        authService: userAuthService,
        result,
      };
    } catch (error) {
      userAuthService.dispose();
      throw error;
    }
  }

  /**
   * Test tool with specific user permissions
   * @param {string} toolName - Name of tool to test
   * @param {string} username - Username to test with
   * @param {Object} parameters - Tool parameters
   * @returns {Promise<Object>} Test result
   */
  async testToolWithUser(toolName, username, parameters = {}) {
    let userAuth = null;

    try {
      userAuth = await this.authenticateAsUser(username);

      // Execute tool with user's permissions
      const result = await this._executeToolAsUser(toolName, parameters, userAuth.authService);

      return {
        success: true,
        username,
        toolName,
        result,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        username,
        toolName,
        result: null,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          type: error.type,
        },
      };
    } finally {
      if (userAuth) {
        userAuth.authService.dispose();
      }
    }
  }

  /**
   * Execute tool as specific user
   * @private
   */
  async _executeToolAsUser(toolName, parameters, authService) {
    // Create services with user's authentication
    const userConfig = authService.config;

    // This is a simplified version - in a real implementation,
    // you would need to create service instances with the user's auth context
    switch (toolName) {
      case 'jasper_list_resources': {
        const resourceService = new (await import('../../src/services/resourceService.js')).default(
          userConfig
        );
        return await resourceService.listResources(parameters.folderUri || '/', parameters);
      }

      case 'jasper_upload_resource': {
        const uploadService = new (await import('../../src/services/resourceService.js')).default(
          userConfig
        );
        return await uploadService.uploadResource(parameters);
      }

      case 'jasper_create_user': {
        const userMgmtService = new (await import('../../src/services/userService.js')).default(
          userConfig
        );
        return await userMgmtService.createUser(parameters);
      }

      case 'jasper_run_report_sync': {
        const reportService = new (await import('../../src/services/reportService.js')).default(
          userConfig
        );
        return await reportService.runReportSync(
          parameters.reportUri || '/test/report',
          parameters
        );
      }

      default:
        throw new Error(`Tool ${toolName} not implemented in permission testing`);
    }
  }

  /**
   * Test multiple tools with different permission scenarios
   * @param {Array} scenarios - Array of permission test scenarios
   * @returns {Promise<Object>} Comprehensive test results
   */
  async testPermissionScenarios(scenarios) {
    const results = {
      scenarios: {},
      summary: {
        totalScenarios: scenarios.length,
        totalTests: 0,
        passed: 0,
        failed: 0,
        expectedFailures: 0,
        unexpectedFailures: 0,
      },
    };

    for (const scenario of scenarios) {
      const scenarioResult = await this._testPermissionScenario(scenario);
      results.scenarios[scenario.name] = scenarioResult;

      // Update summary
      results.summary.totalTests += scenarioResult.tests.length;
      results.summary.passed += scenarioResult.passed;
      results.summary.failed += scenarioResult.failed;
      results.summary.expectedFailures += scenarioResult.expectedFailures;
      results.summary.unexpectedFailures += scenarioResult.unexpectedFailures;
    }

    return results;
  }

  /**
   * Test a specific permission scenario
   * @private
   */
  async _testPermissionScenario(scenario) {
    const { name, description, userRole, tools, expectedResults } = scenario;

    const scenarioResult = {
      name,
      description,
      userRole,
      tests: [],
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      unexpectedFailures: 0,
      executionTime: 0,
    };

    const startTime = Date.now();

    // Create test user for this scenario
    const testUsername = `test_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    try {
      await this.createTestUser(testUsername, userRole);

      // Test each tool
      for (const toolTest of tools) {
        const testResult = await this.testToolWithUser(
          toolTest.toolName,
          testUsername,
          toolTest.parameters
        );

        const expectedResult = expectedResults[toolTest.toolName];
        const isExpectedResult = this._isExpectedResult(testResult, expectedResult);

        const test = {
          toolName: toolTest.toolName,
          parameters: toolTest.parameters,
          result: testResult,
          expected: expectedResult,
          isExpectedResult,
          passed: isExpectedResult,
        };

        scenarioResult.tests.push(test);

        if (isExpectedResult) {
          scenarioResult.passed++;
          if (!testResult.success && expectedResult.shouldFail) {
            scenarioResult.expectedFailures++;
          }
        } else {
          scenarioResult.failed++;
          if (!testResult.success) {
            scenarioResult.unexpectedFailures++;
          }
        }
      }
    } catch (error) {
      this.errorHandler.logError(error, 'Permission scenario test', { scenario: name });
    } finally {
      // Cleanup test user
      try {
        await this.deleteTestUser(testUsername);
      } catch (error) {
        // Log but don't fail the test
        this.errorHandler.logError(error, 'Cleanup test user', { username: testUsername });
      }

      scenarioResult.executionTime = Date.now() - startTime;
    }

    return scenarioResult;
  }

  /**
   * Check if test result matches expected result
   * @private
   */
  _isExpectedResult(testResult, expectedResult) {
    if (!expectedResult) {
      return true; // No expectation set
    }

    // Check if success/failure matches expectation
    if (expectedResult.shouldFail !== undefined) {
      if (expectedResult.shouldFail && testResult.success) {
        return false; // Expected failure but got success
      }
      if (!expectedResult.shouldFail && !testResult.success) {
        return false; // Expected success but got failure
      }
    }

    // Check specific error codes if expected
    if (expectedResult.expectedErrorCode && testResult.error) {
      return testResult.error.code === expectedResult.expectedErrorCode;
    }

    // Check error message patterns
    if (expectedResult.expectedErrorPattern && testResult.error) {
      const pattern = new RegExp(expectedResult.expectedErrorPattern, 'i');
      return pattern.test(testResult.error.message);
    }

    return true;
  }

  /**
   * Create standard permission test scenarios
   * @returns {Array} Array of standard permission scenarios
   */
  createStandardPermissionScenarios() {
    return [
      {
        name: 'Administrator Full Access',
        description: 'Test that administrators can perform all operations',
        userRole: USER_ROLES.ADMIN,
        tools: [
          { toolName: 'jasper_list_resources', parameters: { folderUri: '/' } },
          { toolName: 'jasper_upload_resource', parameters: this._getTestResourceDescriptor() },
          { toolName: 'jasper_create_user', parameters: this._getTestUserDescriptor() },
          { toolName: 'jasper_run_report_sync', parameters: { reportUri: '/test/report' } },
        ],
        expectedResults: {
          jasper_list_resources: { shouldFail: false },
          jasper_upload_resource: { shouldFail: false },
          jasper_create_user: { shouldFail: false },
          jasper_run_report_sync: { shouldFail: false },
        },
      },

      {
        name: 'Regular User Limited Access',
        description: 'Test that regular users have limited access',
        userRole: USER_ROLES.USER,
        tools: [
          { toolName: 'jasper_list_resources', parameters: { folderUri: '/' } },
          { toolName: 'jasper_upload_resource', parameters: this._getTestResourceDescriptor() },
          { toolName: 'jasper_create_user', parameters: this._getTestUserDescriptor() },
          { toolName: 'jasper_run_report_sync', parameters: { reportUri: '/test/report' } },
        ],
        expectedResults: {
          jasper_list_resources: { shouldFail: false },
          jasper_upload_resource: {
            shouldFail: true,
            expectedErrorPattern: 'permission|access|forbidden',
          },
          jasper_create_user: {
            shouldFail: true,
            expectedErrorPattern: 'permission|access|forbidden',
          },
          jasper_run_report_sync: { shouldFail: false },
        },
      },

      {
        name: 'Anonymous User Minimal Access',
        description: 'Test that anonymous users have minimal access',
        userRole: USER_ROLES.ANONYMOUS,
        tools: [
          { toolName: 'jasper_list_resources', parameters: { folderUri: '/' } },
          { toolName: 'jasper_upload_resource', parameters: this._getTestResourceDescriptor() },
          { toolName: 'jasper_create_user', parameters: this._getTestUserDescriptor() },
        ],
        expectedResults: {
          jasper_list_resources: {
            shouldFail: true,
            expectedErrorPattern: 'authentication|permission',
          },
          jasper_upload_resource: {
            shouldFail: true,
            expectedErrorPattern: 'authentication|permission',
          },
          jasper_create_user: {
            shouldFail: true,
            expectedErrorPattern: 'authentication|permission',
          },
        },
      },
    ];
  }

  /**
   * Get test resource descriptor
   * @private
   */
  _getTestResourceDescriptor() {
    return {
      resourcePath: '/test/permission_test_report',
      label: 'Permission Test Report',
      description: 'Test report for permission testing',
      jrxmlContent:
        '<jasperReport><title><band height="50"><staticText><reportElement x="0" y="0" width="200" height="20"/><text><![CDATA[Permission Test]]></text></staticText></band></title></jasperReport>',
      overwrite: true,
    };
  }

  /**
   * Get test user descriptor
   * @private
   */
  _getTestUserDescriptor() {
    return {
      username: `perm_test_user_${Date.now()}`,
      password: 'testpass123',
      fullName: 'Permission Test User',
      emailAddress: 'permtest@example.com',
      enabled: true,
      roles: [USER_ROLES.USER],
    };
  }

  /**
   * Set resource permissions for testing
   * @param {string} resourceUri - URI of resource to set permissions on
   * @param {Array} permissions - Array of permission objects
   * @returns {Promise<Object>} Permission setting result
   */
  async setResourcePermissions(resourceUri, permissions) {
    try {
      return await this.permissionService.setPermissions(resourceUri, permissions);
    } catch (error) {
      this.errorHandler.logError(error, 'Set resource permissions', { resourceUri, permissions });
      throw error;
    }
  }

  /**
   * Get resource permissions for testing
   * @param {string} resourceUri - URI of resource to get permissions for
   * @returns {Promise<Object>} Resource permissions
   */
  async getResourcePermissions(resourceUri) {
    try {
      return await this.permissionService.getPermissions(resourceUri);
    } catch (error) {
      this.errorHandler.logError(error, 'Get resource permissions', { resourceUri });
      throw error;
    }
  }

  /**
   * Cleanup all test users
   * @returns {Promise<void>}
   */
  async cleanup() {
    const cleanupPromises = Array.from(this.testUsers.keys()).map(username =>
      this.deleteTestUser(username).catch(error => {
        this.errorHandler.logError(error, 'Cleanup test user', { username });
      })
    );

    await Promise.all(cleanupPromises);

    // Dispose services
    if (this.authService) {
      this.authService.dispose();
    }

    if (this.testHelpers) {
      await this.testHelpers.cleanup();
    }
  }

  /**
   * Dispose of the permission test helper
   */
  dispose() {
    this.cleanup();
  }
}

export default PermissionTestHelper;
export { PERMISSION_LEVELS, USER_ROLES };
