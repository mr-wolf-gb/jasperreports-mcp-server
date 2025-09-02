#!/usr/bin/env node

/**
 * Standalone Configuration Validation Script for JasperReports MCP Server
 *
 * This script validates the configuration without starting the server.
 * Useful for deployment validation, troubleshooting, and CI/CD pipelines.
 *
 * Usage:
 *   node scripts/validate-config.js [options]
 *
 * Options:
 *   --no-connection    Skip connection testing
 *   --no-security      Skip security validation
 *   --verbose          Show detailed output
 *   --quiet            Show minimal output
 *   --help             Show help message
 */

import { ConfigValidator } from '../src/utils/ConfigValidator.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  testConnection: !args.includes('--no-connection'),
  validateSecurity: !args.includes('--no-security'),
  verbose: args.includes('--verbose'),
  quiet: args.includes('--quiet'),
  help: args.includes('--help'),
};

/**
 * Display help message
 */
function showHelp() {
  console.log(`
JasperReports MCP Server - Configuration Validator

USAGE:
  node scripts/validate-config.js [options]

OPTIONS:
  --no-connection    Skip JasperReports Server connection testing
  --no-security      Skip security settings validation
  --verbose          Show detailed configuration information
  --quiet            Show minimal output (errors only)
  --help             Show this help message

EXAMPLES:
  # Full validation (default)
  node scripts/validate-config.js

  # Skip connection test (useful when server is not running)
  node scripts/validate-config.js --no-connection

  # Verbose output with all details
  node scripts/validate-config.js --verbose

  # Quick validation for CI/CD
  node scripts/validate-config.js --quiet

ENVIRONMENT VARIABLES:
  Required:
    JASPER_URL         JasperReports Server URL
    JASPER_USERNAME    Username for authentication
    JASPER_PASSWORD    Password for authentication

  Optional:
    JASPER_AUTH_TYPE   Authentication type (basic, login, argument)
    JASPER_ORGANIZATION Organization for multi-tenant setups
    JASPER_SSL_VERIFY  Enable/disable SSL certificate verification
    JASPER_TIMEOUT     Request timeout in milliseconds
    JASPER_DEBUG_MODE  Enable debug logging
    JASPER_LOG_LEVEL   Logging level (error, warn, info, debug, trace)

EXIT CODES:
  0    Configuration is valid
  1    Configuration validation failed
  2    Invalid command line arguments
`);
}

/**
 * Main validation function
 */
async function main() {
  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    // Display startup message unless quiet
    if (!options.quiet) {
      console.log('🔍 Validating JasperReports MCP Server configuration...\n');
    }

    // Run validation
    const result = await ConfigValidator.validateStartupConfig({
      testConnection: options.testConnection,
      validateSecurity: options.validateSecurity,
      verbose: options.verbose,
    });

    // Display results
    if (options.quiet) {
      // Quiet mode - only show errors
      if (!result.isValid) {
        console.error('❌ Configuration validation failed:');
        result.errors.forEach(error => {
          console.error(`  • ${error.field}: ${error.message}`);
        });
        process.exit(1);
      } else {
        console.log('✅ Configuration is valid');
        process.exit(0);
      }
    } else {
      // Normal or verbose mode
      const output = ConfigValidator.formatValidationOutput(result, options.verbose);
      console.log(output);

      // Exit with appropriate code
      if (!result.isValid) {
        console.error(
          '\n❌ Configuration validation failed. Please fix the errors above and try again.'
        );
        process.exit(1);
      } else {
        if (result.warnings.length > 0) {
          console.warn(
            '\n⚠️  Configuration has warnings. Consider addressing them for better security and performance.'
          );
        }
        console.log('\n✅ Configuration validation passed successfully!');
        process.exit(0);
      }
    }
  } catch (error) {
    console.error('❌ Validation script failed:', error.message);

    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * Handle unhandled errors
 */
process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception in validation script:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection in validation script:', reason);
  if (options.verbose) {
    console.error('Promise:', promise);
  }
  process.exit(1);
});

// Run the validation
main().catch(error => {
  console.error('❌ Fatal error in validation script:', error.message);
  process.exit(1);
});
