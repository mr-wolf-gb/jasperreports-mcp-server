#!/usr/bin/env node

/**
 * Post-install script for JasperReports MCP Server
 * Performs initial setup and configuration validation
 */

import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Setting up JasperReports MCP Server...');

// Create necessary directories
const directories = ['logs', 'config', 'tmp'];

directories.forEach(dir => {
  const dirPath = join(rootDir, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create sample environment file if it doesn't exist
const envPath = join(rootDir, '.env.example');
if (!existsSync(envPath)) {
  const envContent = `# JasperReports MCP Server Configuration
# Copy this file to .env and update with your values

# JasperReports Server Connection
JASPER_URL=http://localhost:8080/jasperserver
JASPER_AUTH_TYPE=basic
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin
JASPER_ORGANIZATION=

# Connection Settings
JASPER_TIMEOUT=30000
JASPER_SSL_VERIFY=false

# Debug and Development
JASPER_DEBUG_MODE=false
TEST_SERVER_ENABLED=false
TEST_SERVER_PORT=3000

# Node.js Environment
NODE_ENV=development
LOG_LEVEL=info

# Optional: Custom configuration
# JASPER_RETRY_ATTEMPTS=3
# JASPER_RETRY_DELAY=1000
# JASPER_MAX_CONCURRENT_REQUESTS=10
`;

  writeFileSync(envPath, envContent);
  console.log('✅ Created .env.example file');
}

// Make scripts executable
const scripts = ['scripts/validate-config.js'];

scripts.forEach(script => {
  const scriptPath = join(rootDir, script);
  if (existsSync(scriptPath)) {
    try {
      chmodSync(scriptPath, '755');
      console.log(`✅ Made ${script} executable`);
    } catch (error) {
      console.warn(`⚠️  Could not make ${script} executable: ${error.message}`);
    }
  }
});

// Display setup completion message
console.log(`
🎉 Setup complete!

Next steps:
1. Copy .env.example to .env and update with your JasperReports Server details
2. Run 'npm run validate-config' to validate your configuration
3. Start the server with 'npm start' or enable test server with 'npm run test-server'

For MCP integration:
- Use config/mcp-production.json for production environments
- Use config/mcp-development.json for development environments
- Use config/mcp-docker.json for Docker deployments

Documentation:
- API documentation: docs/api.md
- Configuration guide: docs/configuration.md
- Examples: docs/examples.md

Need help? Check docs/troubleshooting.md or create an issue on GitHub.
`);

// Validate current environment if .env exists
const envFile = join(rootDir, '.env');
if (existsSync(envFile)) {
  console.log('🔍 Validating current environment configuration...');
  try {
    // Dynamic import to avoid issues if the module isn't built yet
    const { validateConfig } = await import('./validate-config.js');
    const result = validateConfig(process.env.NODE_ENV || 'development');

    if (result.valid) {
      console.log('✅ Environment configuration is valid');
    } else {
      console.log('❌ Environment configuration has issues:');
      result.errors.forEach(error => console.log(`  - ${error}`));
      console.log('\nRun "npm run validate-config" for detailed validation');
    }
  } catch (error) {
    console.log('⚠️  Could not validate configuration:', error.message);
  }
}
