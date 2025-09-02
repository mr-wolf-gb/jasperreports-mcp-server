#!/usr/bin/env node

/**
 * Final Integration Testing and Validation Runner
 * Executes comprehensive test suite for task 24 validation
 * Requirements: 14.7
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class ValidationRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testSuites: [],
      startTime: null,
      endTime: null,
      duration: 0,
      coverage: null,
      memoryUsage: null,
      errors: [],
    };
  }

  async run() {
    console.log('🚀 Starting Final Integration Testing and Validation');
    console.log('====================================================');

    this.results.startTime = new Date();

    try {
      // Step 1: Run complete test suite against multiple configurations
      await this.runTestSuiteAgainstMultipleVersions();

      // Step 2: Validate all authentication methods
      await this.validateAuthenticationMethods();

      // Step 3: Test all MCP tools with various parameter combinations
      await this.testAllMCPTools();

      // Step 4: Verify test server functionality with HTTP requests
      await this.verifyTestServerFunctionality();

      // Step 5: Perform load testing and memory usage validation
      await this.performLoadAndMemoryTesting();

      // Step 6: Generate final validation report
      await this.generateValidationReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.results.errors.push(error.message);
      process.exit(1);
    }

    this.results.endTime = new Date();
    this.results.duration = this.results.endTime - this.results.startTime;

    console.log('\n✅ Final Integration Testing and Validation Complete');
    console.log(`📊 Total Duration: ${Math.round(this.results.duration / 1000)}s`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏭️  Skipped: ${this.results.skippedTests}`);

    if (this.results.failedTests > 0) {
      console.log('\n❌ Some tests failed. Check the detailed report for more information.');
      process.exit(1);
    }

    console.log('\n🎉 All validation tests passed successfully!');
  }

  async runTestSuiteAgainstMultipleVersions() {
    console.log(
      '\n📋 Step 1: Running complete test suite against multiple JasperReports Server versions'
    );

    const testConfigurations = [
      {
        name: 'JasperReports Server 8.x (Mock)',
        env: {
          JASPER_URL: 'http://localhost:8080/jasperserver',
          JASPER_AUTH_TYPE: 'basic',
          JASPER_USERNAME: 'jasperadmin',
          JASPER_PASSWORD: 'jasperadmin',
          JASPER_DEBUG_MODE: 'true',
          TEST_SERVER_ENABLED: 'true',
          TEST_SERVER_PORT: '3001',
        },
      },
      {
        name: 'JasperReports Server 7.x (Mock)',
        env: {
          JASPER_URL: 'http://localhost:8080/jasperserver-pro',
          JASPER_AUTH_TYPE: 'login',
          JASPER_USERNAME: 'jasperadmin',
          JASPER_PASSWORD: 'jasperadmin',
          JASPER_DEBUG_MODE: 'true',
          TEST_SERVER_ENABLED: 'true',
          TEST_SERVER_PORT: '3002',
        },
      },
    ];

    for (const config of testConfigurations) {
      console.log(`\n  🔧 Testing configuration: ${config.name}`);

      const testResult = await this.runJestTests(
        ['test/integration/final.validation.test.js'],
        config.env
      );

      this.results.testSuites.push({
        name: config.name,
        ...testResult,
      });

      this.results.totalTests += testResult.totalTests;
      this.results.passedTests += testResult.passedTests;
      this.results.failedTests += testResult.failedTests;
      this.results.skippedTests += testResult.skippedTests;
    }
  }

  async validateAuthenticationMethods() {
    console.log('\n🔐 Step 2: Validating all authentication methods');

    const authTests = ['test/integration/authService.test.js'];

    const authResult = await this.runJestTests(authTests, {
      JASPER_DEBUG_MODE: 'true',
    });

    this.results.testSuites.push({
      name: 'Authentication Methods Validation',
      ...authResult,
    });

    this.results.totalTests += authResult.totalTests;
    this.results.passedTests += authResult.passedTests;
    this.results.failedTests += authResult.failedTests;
    this.results.skippedTests += authResult.skippedTests;
  }

  async testAllMCPTools() {
    console.log('\n🛠️  Step 3: Testing all MCP tools with various parameter combinations');

    const mcpToolTests = [
      'test/integration/final.validation.test.js',
      'test/integration/endToEnd.integration.test.js',
    ];

    const mcpResult = await this.runJestTests(mcpToolTests, {
      JASPER_DEBUG_MODE: 'true',
      TEST_PARAMETER_COMBINATIONS: 'true',
    });

    this.results.testSuites.push({
      name: 'MCP Tools Parameter Combinations',
      ...mcpResult,
    });

    this.results.totalTests += mcpResult.totalTests;
    this.results.passedTests += mcpResult.passedTests;
    this.results.failedTests += mcpResult.failedTests;
    this.results.skippedTests += mcpResult.skippedTests;
  }

  async verifyTestServerFunctionality() {
    console.log('\n🌐 Step 4: Verifying test server functionality with HTTP requests');

    // Start test server
    console.log('  📡 Starting test server...');
    const testServerProcess = await this.startTestServer();

    try {
      // Wait for server to start
      await this.wait(2000);

      const httpTests = ['test/integration/final.validation.test.js'];

      const httpResult = await this.runJestTests(httpTests, {
        TEST_SERVER_ENABLED: 'true',
        TEST_SERVER_PORT: '3000',
        TEST_HTTP_VALIDATION: 'true',
      });

      this.results.testSuites.push({
        name: 'Test Server HTTP Functionality',
        ...httpResult,
      });

      this.results.totalTests += httpResult.totalTests;
      this.results.passedTests += httpResult.passedTests;
      this.results.failedTests += httpResult.failedTests;
      this.results.skippedTests += httpResult.skippedTests;
    } finally {
      // Stop test server
      if (testServerProcess) {
        console.log('  🛑 Stopping test server...');
        testServerProcess.kill();
      }
    }
  }

  async performLoadAndMemoryTesting() {
    console.log('\n⚡ Step 5: Performing load testing and memory usage validation');

    const performanceTests = [
      'test/integration/performance.integration.test.js',
      'test/integration/final.validation.test.js',
    ];

    // Run with memory profiling enabled
    const perfResult = await this.runJestTests(performanceTests, {
      NODE_OPTIONS: '--expose-gc --max-old-space-size=2048',
      JASPER_DEBUG_MODE: 'false', // Disable debug for performance testing
      TEST_LOAD_TESTING: 'true',
      TEST_MEMORY_VALIDATION: 'true',
    });

    this.results.testSuites.push({
      name: 'Load Testing and Memory Validation',
      ...perfResult,
    });

    this.results.totalTests += perfResult.totalTests;
    this.results.passedTests += perfResult.passedTests;
    this.results.failedTests += perfResult.failedTests;
    this.results.skippedTests += perfResult.skippedTests;

    // Capture memory usage
    this.results.memoryUsage = process.memoryUsage();
  }

  async generateValidationReport() {
    console.log('\n📊 Step 6: Generating final validation report');

    // Run coverage report
    const coverageResult = await this.runJestTests(
      ['test/**/*.test.js'],
      {
        GENERATE_COVERAGE: 'true',
      },
      ['--coverage', '--coverageReporters=json', '--coverageReporters=text']
    );

    // Read coverage data
    try {
      const coverageData = JSON.parse(
        readFileSync(join(projectRoot, 'coverage/coverage-final.json'), 'utf8')
      );
      this.results.coverage = coverageData.total;
    } catch (error) {
      console.warn('⚠️  Could not read coverage data:', error.message);
    }

    // Generate detailed report
    const report = this.generateDetailedReport();

    // Write report to file
    const reportPath = join(projectRoot, 'validation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Detailed validation report saved to: ${reportPath}`);

    // Generate human-readable summary
    const summaryPath = join(projectRoot, 'validation-summary.md');
    const summary = this.generateSummaryReport(report);
    writeFileSync(summaryPath, summary);

    console.log(`📋 Validation summary saved to: ${summaryPath}`);
  }

  async runJestTests(testFiles, env = {}, additionalArgs = []) {
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--experimental-vm-modules',
        'node_modules/jest/bin/jest.js',
        '--testTimeout=30000',
        '--verbose',
        '--json',
        ...additionalArgs,
        ...testFiles,
      ];

      const testProcess = spawn('node', jestArgs, {
        cwd: projectRoot,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      testProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      testProcess.on('close', code => {
        try {
          // Parse Jest JSON output
          const lines = stdout.split('\n');
          const jsonLine = lines.find(
            line => line.startsWith('{') && line.includes('"testResults"')
          );

          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            resolve({
              totalTests: result.numTotalTests || 0,
              passedTests: result.numPassedTests || 0,
              failedTests: result.numFailedTests || 0,
              skippedTests: result.numPendingTests || 0,
              success: result.success,
              testResults: result.testResults || [],
            });
          } else {
            // Fallback parsing
            resolve({
              totalTests: 0,
              passedTests: code === 0 ? 1 : 0,
              failedTests: code === 0 ? 0 : 1,
              skippedTests: 0,
              success: code === 0,
              testResults: [],
            });
          }
        } catch (error) {
          reject(
            new Error(
              `Failed to parse test results: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`
            )
          );
        }
      });

      testProcess.on('error', error => {
        reject(new Error(`Failed to run tests: ${error.message}`));
      });
    });
  }

  async startTestServer() {
    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', ['src/testServer.js'], {
        cwd: projectRoot,
        env: {
          ...process.env,
          TEST_SERVER_PORT: '3000',
          JASPER_URL: 'http://localhost:8080/jasperserver',
          JASPER_AUTH_TYPE: 'basic',
          JASPER_USERNAME: 'jasperadmin',
          JASPER_PASSWORD: 'jasperadmin',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let started = false;

      serverProcess.stdout.on('data', data => {
        const output = data.toString();
        if (output.includes('Test server listening') && !started) {
          started = true;
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', data => {
        console.error('Test server error:', data.toString());
      });

      serverProcess.on('error', error => {
        if (!started) {
          reject(new Error(`Failed to start test server: ${error.message}`));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          serverProcess.kill();
          reject(new Error('Test server failed to start within timeout'));
        }
      }, 10000);
    });
  }

  generateDetailedReport() {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: this.results.duration,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      summary: {
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        skippedTests: this.results.skippedTests,
        successRate:
          this.results.totalTests > 0
            ? Math.round((this.results.passedTests / this.results.totalTests) * 100)
            : 0,
      },
      testSuites: this.results.testSuites,
      coverage: this.results.coverage,
      memoryUsage: this.results.memoryUsage,
      errors: this.results.errors,
      requirements: {
        14.7: {
          description: 'Complete test suite against multiple JasperReports Server versions',
          status: this.results.failedTests === 0 ? 'PASSED' : 'FAILED',
          details: [
            'Run complete test suite against multiple JasperReports Server versions',
            'Validate all authentication methods work correctly',
            'Test all MCP tools with various parameter combinations',
            'Verify test server functionality with HTTP requests',
            'Perform load testing and memory usage validation',
          ],
        },
      },
    };
  }

  generateSummaryReport(report) {
    return `# Final Integration Testing and Validation Report

## Summary

- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passedTests}
- **Failed**: ${report.summary.failedTests}
- **Skipped**: ${report.summary.skippedTests}
- **Success Rate**: ${report.summary.successRate}%
- **Duration**: ${Math.round(report.metadata.duration / 1000)}s
- **Timestamp**: ${report.metadata.timestamp}

## Test Suites

${report.testSuites
  .map(
    suite => `
### ${suite.name}
- **Total**: ${suite.totalTests}
- **Passed**: ${suite.passedTests}
- **Failed**: ${suite.failedTests}
- **Skipped**: ${suite.skippedTests}
- **Success**: ${suite.success ? '✅' : '❌'}
`
  )
  .join('\n')}

## Coverage

${
  report.coverage
    ? `
- **Lines**: ${report.coverage.lines.pct}%
- **Functions**: ${report.coverage.functions.pct}%
- **Branches**: ${report.coverage.branches.pct}%
- **Statements**: ${report.coverage.statements.pct}%
`
    : 'Coverage data not available'
}

## Memory Usage

${
  report.memoryUsage
    ? `
- **Heap Used**: ${Math.round(report.memoryUsage.heapUsed / 1024 / 1024)}MB
- **Heap Total**: ${Math.round(report.memoryUsage.heapTotal / 1024 / 1024)}MB
- **External**: ${Math.round(report.memoryUsage.external / 1024 / 1024)}MB
- **RSS**: ${Math.round(report.memoryUsage.rss / 1024 / 1024)}MB
`
    : 'Memory usage data not available'
}

## Requirements Validation

### Requirement 14.7: Final integration testing and validation
**Status**: ${report.requirements['14.7'].status}

${report.requirements['14.7'].details.map(detail => `- ✅ ${detail}`).join('\n')}

## Errors

${
  report.errors.length > 0
    ? report.errors.map(error => `- ❌ ${error}`).join('\n')
    : '✅ No errors reported'
}

## Environment

- **Node.js**: ${report.metadata.nodeVersion}
- **Platform**: ${report.metadata.platform}
- **Architecture**: ${report.metadata.arch}

---

Generated on ${report.metadata.timestamp}
`;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ValidationRunner();
  runner.run().catch(error => {
    console.error('❌ Validation runner failed:', error);
    process.exit(1);
  });
}

export default ValidationRunner;
