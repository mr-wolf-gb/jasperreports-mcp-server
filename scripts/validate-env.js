#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set
 * and provides helpful error messages if they're missing.
 */

import { validateConfiguration, getConfigurationSchema } from '../src/config/environment.js';

function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables...\n');

  try {
    const result = validateConfiguration();
    
    if (result.isValid) {
      console.log('✅ All environment variables are valid!');
      console.log('\nConfiguration summary:');
      console.log(`  - JASPER_URL: ${result.config.jasperUrl}`);
      console.log(`  - JASPER_USERNAME: ${result.config.username}`);
      console.log(`  - JASPER_AUTH_TYPE: ${result.config.authType}`);
      console.log(`  - JASPER_SSL_VERIFY: ${result.config.sslVerify}`);
      console.log(`  - JASPER_DEBUG_MODE: ${result.config.debugMode}`);
      console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      return true;
    } else {
      console.log('❌ Environment validation failed:');
      result.errors.forEach(error => {
        console.log(`  - ${error.field}: ${error.message}`);
      });
      
      console.log('\n💡 Quick fix:');
      console.log('  1. Copy .env.example to .env');
      console.log('  2. Update the values in .env with your JasperReports Server details');
      console.log('  3. Ensure JASPER_URL, JASPER_USERNAME, and JASPER_PASSWORD are set');
      
      return false;
    }
  } catch (error) {
    console.log('❌ Configuration error:');
    console.log(error.message);
    
    if (error.validationErrors) {
      console.log('\nDetailed errors:');
      error.validationErrors.forEach(err => {
        console.log(`  - ${err.field}: ${err.message}`);
      });
    }
    
    return false;
  }
}

function showRequiredVariables() {
  console.log('\n📋 Required environment variables:');
  const schema = getConfigurationSchema();
  
  Object.entries(schema).forEach(([key, config]) => {
    if (config.required) {
      console.log(`  - ${config.envVar}: ${key} (required)`);
    }
  });
  
  console.log('\n📋 Important optional variables:');
  console.log('  - JASPER_AUTH_TYPE: Authentication method (default: basic)');
  console.log('  - JASPER_SSL_VERIFY: SSL certificate verification (default: false for test/dev)');
  console.log('  - JASPER_DEBUG_MODE: Enable debug logging (default: true for dev, false for test/prod)');
  console.log('  - NODE_ENV: Environment mode (test, development, production)');
}

// Main execution
const isValid = validateEnvironmentVariables();

if (!isValid) {
  showRequiredVariables();
  process.exit(1);
}

console.log('\n🚀 Environment is ready for JasperReports MCP Server!');