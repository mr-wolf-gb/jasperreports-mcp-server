# Configuration Validation System

The JasperReports MCP Server includes a comprehensive configuration validation system that ensures proper setup and security before the server starts. This system validates environment variables, tests connections, and provides security recommendations.

## Overview

The Configuration Validation System consists of:

- **ConfigValidator**: Main validation class with comprehensive startup validation
- **Environment Variable Validation**: Checks required and optional environment variables
- **Security Settings Validation**: Analyzes security configuration and provides warnings
- **Connection Testing**: Tests actual connectivity to JasperReports Server
- **Standalone Validation Script**: Command-line tool for validation without starting the server

## Features

### 1. Startup Configuration Validation

The system automatically validates configuration during server startup:

```javascript
import { ConfigValidator } from './src/utils/ConfigValidator.js';

const result = await ConfigValidator.validateStartupConfig({
  testConnection: true,
  validateSecurity: true,
  verbose: false
});
```

### 2. Environment Variable Validation

Validates all required and optional environment variables:

#### Required Variables
- `JASPER_URL`: JasperReports Server URL
- `JASPER_USERNAME`: Authentication username
- `JASPER_PASSWORD`: Authentication password

#### Optional Variables
- `JASPER_AUTH_TYPE`: Authentication method (basic, login, argument)
- `JASPER_ORGANIZATION`: Organization for multi-tenant setups
- `JASPER_SSL_VERIFY`: SSL certificate verification (true/false)
- `JASPER_TIMEOUT`: Request timeout in milliseconds
- `JASPER_DEBUG_MODE`: Enable debug logging (true/false)
- `JASPER_LOG_LEVEL`: Logging level (error, warn, info, debug, trace)

### 3. Security Validation

The system analyzes security settings and assigns security levels:

#### Security Levels
- **🔒 SECURE**: HTTPS with SSL verification enabled, strong credentials
- **⚠️ WARNING**: Some security concerns (disabled SSL, default credentials)
- **🔓 INSECURE**: HTTP protocol or multiple security issues

#### Security Checks
- Protocol validation (HTTPS vs HTTP)
- SSL certificate verification settings
- Default credential detection
- Password strength assessment

### 4. Connection Testing

Tests actual connectivity to JasperReports Server:

- Authentication validation
- Server response time measurement
- Server version and edition detection
- Error categorization (connection, timeout, SSL, authentication)

### 5. Comprehensive Error Reporting

Provides detailed error messages with specific guidance:

```javascript
{
  field: 'JASPER_URL',
  message: 'URL is required but not set',
  guidance: 'Set JASPER_URL to your JasperReports Server URL (e.g., https://reports.company.com/jasperserver)'
}
```

## Usage

### Automatic Validation

Configuration validation runs automatically during server startup:

```bash
npm start
```

The server will validate configuration and display results before starting.

### Standalone Validation

Use the standalone validation script for testing without starting the server:

```bash
# Full validation (default)
node scripts/validate-config.js

# Skip connection test (useful when server is not running)
node scripts/validate-config.js --no-connection

# Verbose output with all details
node scripts/validate-config.js --verbose

# Quick validation for CI/CD
node scripts/validate-config.js --quiet

# Show help
node scripts/validate-config.js --help
```

### NPM Script

Use the npm script for convenience:

```bash
npm run validate-config
```

## Configuration Examples

### Development Configuration

```bash
# .env file for development
JASPER_URL=http://localhost:8080/jasperserver
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin
JASPER_AUTH_TYPE=basic
JASPER_SSL_VERIFY=false
JASPER_DEBUG_MODE=true
JASPER_LOG_LEVEL=debug
```

**Expected Validation Result**: ⚠️ WARNING (HTTP protocol, default credentials)

### Production Configuration

```bash
# .env file for production
JASPER_URL=https://reports.company.com/jasperserver
JASPER_USERNAME=service_account
JASPER_PASSWORD=secure_password_123
JASPER_AUTH_TYPE=basic
JASPER_SSL_VERIFY=true
JASPER_TIMEOUT=60000
JASPER_DEBUG_MODE=false
JASPER_LOG_LEVEL=info
```

**Expected Validation Result**: 🔒 SECURE

### Multi-Tenant Configuration

```bash
# .env file for multi-tenant setup
JASPER_URL=https://reports.company.com/jasperserver
JASPER_USERNAME=tenant_user
JASPER_PASSWORD=tenant_password
JASPER_AUTH_TYPE=login
JASPER_ORGANIZATION=organization_1
JASPER_SSL_VERIFY=true
```

**Expected Validation Result**: 🔒 SECURE

## Validation Output

### Successful Validation

```
============================================================
JasperReports MCP Server - Configuration Validation
============================================================
Status: ✅ VALID | Security: 🔒 SECURE

✅ CONNECTION TEST:
  • Successfully connected to JasperReports Server
  • Response time: 150ms
  • Server version: 8.2.0
  • Server edition: Professional

📋 CONFIGURATION SUMMARY:
  • JasperReports URL: https://reports.company.com/jasperserver
  • Authentication Type: basic
  • Username: service_account
  • Organization: None
  • SSL Verification: Enabled
  • Timeout: 60000ms
  • Debug Mode: Disabled
  • Log Level: info

============================================================
```

### Failed Validation

```
============================================================
JasperReports MCP Server - Configuration Validation
============================================================
Status: ❌ INVALID | Security: 🔓 INSECURE

❌ ERRORS:
  • JASPER_URL: URL is required but not set
    💡 Set JASPER_URL to your JasperReports Server URL (e.g., https://reports.company.com/jasperserver)
  • JASPER_USERNAME: Username is required but not set
    💡 Set JASPER_USERNAME to a valid JasperReports Server username

⚠️  WARNINGS:
  • JASPER_SSL_VERIFY: SSL verification is disabled
    💡 SSL verification is disabled. This is insecure for production environments

💡 RECOMMENDATIONS:
  • JASPER_TIMEOUT: Consider increasing timeout
    Set timeout to at least 30000ms for large reports

============================================================
```

## Error Types and Guidance

### Environment Variable Errors

| Error | Guidance |
|-------|----------|
| `JASPER_URL` missing | Set JASPER_URL to your JasperReports Server URL |
| `JASPER_URL` invalid | JASPER_URL must be a valid HTTP or HTTPS URL |
| `JASPER_USERNAME` missing | Set JASPER_USERNAME to a valid username |
| `JASPER_PASSWORD` missing | Set JASPER_PASSWORD to the user's password |

### Connection Errors

| Error Type | Guidance |
|------------|----------|
| Connection refused | Check URL, network connectivity, and server status |
| Timeout | Check network connectivity or increase JASPER_TIMEOUT |
| SSL error | Check certificate validity or set JASPER_SSL_VERIFY=false for testing |
| Authentication | Check username, password, and organization settings |

### Security Warnings

| Warning | Guidance |
|---------|----------|
| HTTP protocol | Consider using HTTPS for production environments |
| SSL verification disabled | Enable SSL verification for production security |
| Default credentials | Change default credentials for production environments |
| Weak password | Use a strong password with at least 8 characters |

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Validate Configuration
on: [push, pull_request]

jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run validate-config -- --no-connection --quiet
        env:
          JASPER_URL: ${{ secrets.JASPER_URL }}
          JASPER_USERNAME: ${{ secrets.JASPER_USERNAME }}
          JASPER_PASSWORD: ${{ secrets.JASPER_PASSWORD }}
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/validate-config.js --no-connection --quiet || exit 1
```

## API Reference

### ConfigValidator.validateStartupConfig(options)

Main validation method that performs comprehensive configuration validation.

**Parameters:**
- `options.testConnection` (boolean): Whether to test JasperReports Server connection (default: true)
- `options.validateSecurity` (boolean): Whether to validate security settings (default: true)
- `options.verbose` (boolean): Whether to provide verbose output (default: false)

**Returns:**
```javascript
{
  isValid: boolean,
  errors: Array<{field, message, guidance}>,
  warnings: Array<{field, message, guidance}>,
  recommendations: Array<{field, message, guidance}>,
  securityLevel: 'secure' | 'warning' | 'insecure',
  connectionStatus: {success, error, errorType, serverInfo, responseTime},
  config: Object
}
```

### ConfigValidator.validateEnvironmentVariables()

Validates environment variables without loading full configuration.

**Returns:**
```javascript
{
  errors: Array<{field, message, guidance}>,
  warnings: Array<{field, message, guidance}>,
  recommendations: Array<{field, message, guidance}>
}
```

### ConfigValidator.validateSecuritySettings(config)

Validates security settings and assigns security level.

**Parameters:**
- `config` (Object): Configuration object

**Returns:**
```javascript
{
  warnings: Array<{field, message, guidance}>,
  recommendations: Array<{field, message, guidance}>,
  securityLevel: 'secure' | 'warning' | 'insecure'
}
```

### ConfigValidator.validateJasperConnection(config)

Tests connection to JasperReports Server.

**Parameters:**
- `config` (Object): Configuration object

**Returns:**
```javascript
{
  success: boolean,
  error: string,
  errorType: 'connection' | 'timeout' | 'ssl' | 'auth' | 'unknown',
  serverInfo: {version, edition},
  responseTime: number
}
```

### ConfigValidator.formatValidationOutput(result, verbose)

Formats validation result for console output.

**Parameters:**
- `result` (Object): Validation result from validateStartupConfig
- `verbose` (boolean): Whether to include verbose details

**Returns:** Formatted string for console output

## Best Practices

### 1. Development Environment

- Use HTTP for local development with `JASPER_SSL_VERIFY=false`
- Enable debug mode with `JASPER_DEBUG_MODE=true`
- Use default credentials for local JasperReports Server

### 2. Production Environment

- Always use HTTPS with valid SSL certificates
- Use strong, unique credentials
- Set appropriate timeout values for your network
- Disable debug mode and use appropriate log levels
- Regularly validate configuration in CI/CD pipelines

### 3. Multi-Tenant Environments

- Set `JASPER_ORGANIZATION` for proper tenant isolation
- Use tenant-specific service accounts
- Validate organization access during connection testing

### 4. Troubleshooting

- Use `--verbose` flag for detailed validation output
- Use `--no-connection` when JasperReports Server is not available
- Check specific error guidance for resolution steps
- Validate configuration changes before deployment

## Security Considerations

The Configuration Validation System helps ensure secure deployment by:

1. **Detecting insecure configurations** before server startup
2. **Providing specific security guidance** for each issue
3. **Assigning security levels** to help prioritize fixes
4. **Validating SSL/TLS settings** to prevent man-in-the-middle attacks
5. **Detecting default credentials** that should be changed
6. **Recommending strong passwords** and secure practices

Always address security warnings and recommendations before deploying to production environments.