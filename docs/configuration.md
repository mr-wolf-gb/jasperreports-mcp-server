# JasperReports MCP Server Configuration Guide

This document provides comprehensive configuration information for the JasperReports MCP Server, including all environment variables, deployment scenarios, and configuration examples.

## Environment Variables

### Required Configuration

#### JASPER_URL
- **Description**: Base URL of the JasperReports Server
- **Required**: Yes
- **Format**: Full URL including protocol and port
- **Examples**: 
  - `https://reports.company.com/jasperserver`
  - `http://localhost:8080/jasperserver`
  - `https://jasper.example.com:8443/jasperserver-pro`

#### JASPER_AUTH_TYPE
- **Description**: Authentication method to use
- **Required**: Yes
- **Values**: `basic`, `login`, `argument`
- **Default**: `basic`
- **Details**:
  - `basic`: HTTP Basic Authentication
  - `login`: Login service with session management
  - `argument`: Per-request authentication

#### JASPER_USERNAME
- **Description**: Username for authentication
- **Required**: Yes (unless using argument-based auth for all requests)
- **Format**: Plain text username or `username|organization` for multi-tenant
- **Examples**:
  - `jasperadmin`
  - `reportuser`
  - `user@company.com|organization_1`

#### JASPER_PASSWORD
- **Description**: Password for authentication
- **Required**: Yes (unless using argument-based auth for all requests)
- **Format**: Plain text password
- **Security**: Store securely, avoid logging

### Optional Configuration

#### JASPER_ORGANIZATION
- **Description**: Organization ID for multi-tenant deployments
- **Required**: No
- **Default**: None (root organization)
- **Format**: Organization identifier
- **Note**: Alternative to username|organization format

#### JASPER_TIMEOUT
- **Description**: Request timeout in milliseconds
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Range**: 1000-300000 (1 second to 5 minutes)
- **Examples**: `60000`, `120000`

#### JASPER_SSL_VERIFY
- **Description**: Whether to verify SSL certificates
- **Required**: No
- **Default**: `true`
- **Values**: `true`, `false`
- **Security**: Set to `false` only for development with self-signed certificates

#### JASPER_DEBUG_MODE
- **Description**: Enable debug logging
- **Required**: No
- **Default**: `false`
- **Values**: `true`, `false`
- **Impact**: Increases log verbosity, may affect performance

#### JASPER_LOG_LEVEL
- **Description**: Logging level
- **Required**: No
- **Default**: `info`
- **Values**: `error`, `warn`, `info`, `debug`, `trace`

#### JASPER_RETRY_ATTEMPTS
- **Description**: Number of retry attempts for failed requests
- **Required**: No
- **Default**: `3`
- **Range**: 0-10
- **Note**: Applies to transient failures only

#### JASPER_RETRY_DELAY
- **Description**: Base delay between retries in milliseconds
- **Required**: No
- **Default**: `1000` (1 second)
- **Note**: Uses exponential backoff

### Test Server Configuration

#### TEST_SERVER_ENABLED
- **Description**: Enable HTTP test server
- **Required**: No
- **Default**: `false`
- **Values**: `true`, `false`
- **Use**: Development and testing only

#### TEST_SERVER_PORT
- **Description**: Port for HTTP test server
- **Required**: No (if test server enabled)
- **Default**: `3000`
- **Range**: 1024-65535

#### TEST_SERVER_HOST
- **Description**: Host for HTTP test server
- **Required**: No
- **Default**: `localhost`
- **Security**: Use `localhost` for development only

## Configuration Examples

### Production Configuration

#### Basic Authentication
```json
{
  "mcpServers": {
    "jasperreports": {
      "command": "npx",
      "args": ["@company/jasperreports-mcp-server@latest"],
      "env": {
        "JASPER_URL": "https://reports.company.com/jasperserver",
        "JASPER_AUTH_TYPE": "basic",
        "JASPER_USERNAME": "service_account",
        "JASPER_PASSWORD": "secure_password_123",
        "JASPER_TIMEOUT": "60000",
        "JASPER_SSL_VERIFY": "true",
        "JASPER_LOG_LEVEL": "warn",
        "JASPER_RETRY_ATTEMPTS": "3"
      }
    }
  }
}
```

#### Login Service Authentication
```json
{
  "mcpServers": {
    "jasperreports": {
      "command": "npx",
      "args": ["@company/jasperreports-mcp-server@latest"],
      "env": {
        "JASPER_URL": "https://reports.company.com/jasperserver",
        "JASPER_AUTH_TYPE": "login",
        "JASPER_USERNAME": "api_user",
        "JASPER_PASSWORD": "api_password_456",
        "JASPER_ORGANIZATION": "sales_org",
        "JASPER_TIMEOUT": "90000",
        "JASPER_SSL_VERIFY": "true",
        "JASPER_LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Multi-Tenant Configuration
```json
{
  "mcpServers": {
    "jasperreports": {
      "command": "npx",
      "args": ["@company/jasperreports-mcp-server@latest"],
      "env": {
        "JASPER_URL": "https://reports.company.com/jasperserver-pro",
        "JASPER_AUTH_TYPE": "basic",
        "JASPER_USERNAME": "tenant_admin|organization_1",
        "JASPER_PASSWORD": "tenant_password_789",
        "JASPER_TIMEOUT": "45000",
        "JASPER_SSL_VERIFY": "true",
        "JASPER_LOG_LEVEL": "info",
        "JASPER_RETRY_ATTEMPTS": "5"
      }
    }
  }
}
```

### Development Configuration

#### Local Development
```json
{
  "mcpServers": {
    "jasperreports": {
      "command": "node",
      "args": ["/path/to/jasperreports-mcp-server/src/index.js"],
      "env": {
        "JASPER_URL": "http://localhost:8080/jasperserver",
        "JASPER_AUTH_TYPE": "basic",
        "JASPER_USERNAME": "jasperadmin",
        "JASPER_PASSWORD": "jasperadmin",
        "JASPER_TIMEOUT": "30000",
        "JASPER_SSL_VERIFY": "false",
        "JASPER_DEBUG_MODE": "true",
        "JASPER_LOG_LEVEL": "debug",
        "TEST_SERVER_ENABLED": "true",
        "TEST_SERVER_PORT": "3000"
      }
    }
  }
}
```

#### Docker Development
```json
{
  "mcpServers": {
    "jasperreports": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--env-file", ".env.jasper",
        "jasperreports-mcp-server:latest"
      ]
    }
  }
}
```

With `.env.jasper` file:
```bash
JASPER_URL=http://jasperserver:8080/jasperserver
JASPER_AUTH_TYPE=basic
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin
JASPER_DEBUG_MODE=true
JASPER_LOG_LEVEL=debug
```

### Testing Configuration

#### Integration Testing
```json
{
  "mcpServers": {
    "jasperreports-test": {
      "command": "node",
      "args": ["/path/to/jasperreports-mcp-server/src/index.js"],
      "env": {
        "JASPER_URL": "http://test-jasper:8080/jasperserver",
        "JASPER_AUTH_TYPE": "basic",
        "JASPER_USERNAME": "testuser",
        "JASPER_PASSWORD": "testpass",
        "JASPER_TIMEOUT": "60000",
        "JASPER_SSL_VERIFY": "false",
        "JASPER_DEBUG_MODE": "true",
        "JASPER_LOG_LEVEL": "debug",
        "JASPER_RETRY_ATTEMPTS": "1",
        "TEST_SERVER_ENABLED": "true",
        "TEST_SERVER_PORT": "3001"
      }
    }
  }
}
```

## Configuration Validation

The server validates all configuration on startup and provides detailed error messages for invalid settings:

### Common Validation Errors

#### Missing Required Variables
```
Configuration Error: JASPER_URL is required
Configuration Error: JASPER_USERNAME is required when JASPER_AUTH_TYPE is 'basic'
```

#### Invalid Values
```
Configuration Error: JASPER_AUTH_TYPE must be one of: basic, login, argument
Configuration Error: JASPER_TIMEOUT must be between 1000 and 300000
Configuration Error: JASPER_SSL_VERIFY must be 'true' or 'false'
```

#### URL Format Errors
```
Configuration Error: JASPER_URL must be a valid URL with protocol
Configuration Error: JASPER_URL should not end with a trailing slash
```

## Security Considerations

### Credential Management

1. **Environment Variables**: Store credentials in environment variables, not in configuration files
2. **Secret Management**: Use secret management systems in production (AWS Secrets Manager, Azure Key Vault, etc.)
3. **Rotation**: Implement credential rotation policies
4. **Least Privilege**: Use service accounts with minimal required permissions

### Network Security

1. **HTTPS**: Always use HTTPS in production (`JASPER_SSL_VERIFY=true`)
2. **Firewall**: Restrict network access to JasperReports Server
3. **VPN**: Use VPN or private networks for server communication
4. **Certificates**: Use valid SSL certificates, avoid self-signed in production

### Logging Security

1. **Credential Filtering**: Server automatically filters credentials from logs
2. **Log Levels**: Use appropriate log levels (`warn` or `error` in production)
3. **Log Storage**: Secure log storage and access controls
4. **Retention**: Implement log retention policies

## Performance Tuning

### Timeout Configuration

- **Short Reports**: 30-60 seconds (`JASPER_TIMEOUT=30000-60000`)
- **Long Reports**: 2-5 minutes (`JASPER_TIMEOUT=120000-300000`)
- **Batch Operations**: 5+ minutes for bulk operations

### Retry Configuration

- **Stable Networks**: 1-3 retries (`JASPER_RETRY_ATTEMPTS=1-3`)
- **Unstable Networks**: 3-5 retries (`JASPER_RETRY_ATTEMPTS=3-5`)
- **Critical Operations**: Higher retry counts with longer delays

### Connection Pooling

The server automatically manages HTTP connection pooling. For high-throughput scenarios:

```json
{
  "env": {
    "JASPER_TIMEOUT": "60000",
    "JASPER_RETRY_ATTEMPTS": "3",
    "JASPER_RETRY_DELAY": "2000"
  }
}
```

## Troubleshooting Configuration

### Connection Issues

1. **Verify URL**: Ensure `JASPER_URL` is correct and accessible
2. **Check Credentials**: Verify username/password combination
3. **Test Network**: Use `jasper_test_connection` tool
4. **SSL Issues**: Try `JASPER_SSL_VERIFY=false` for testing

### Authentication Issues

1. **Check Auth Type**: Verify `JASPER_AUTH_TYPE` matches server configuration
2. **Organization**: Ensure organization is specified correctly
3. **Permissions**: Verify user has required permissions
4. **Session Timeout**: Check if sessions are expiring too quickly

### Performance Issues

1. **Increase Timeout**: Raise `JASPER_TIMEOUT` for slow operations
2. **Reduce Retries**: Lower `JASPER_RETRY_ATTEMPTS` to fail faster
3. **Debug Logging**: Enable `JASPER_DEBUG_MODE` to identify bottlenecks
4. **Network Latency**: Consider network proximity to JasperReports Server

## Environment-Specific Configurations

### Development
- Enable debug mode and test server
- Use relaxed SSL verification
- Higher log levels for troubleshooting
- Local or development server URLs

### Staging
- Production-like security settings
- Moderate logging levels
- Real SSL certificates
- Performance testing configurations

### Production
- Strict security settings
- Minimal logging (warn/error only)
- Valid SSL certificates
- Optimized timeouts and retries
- Secret management integration

## Configuration Templates

### Minimal Configuration
```bash
JASPER_URL=https://reports.company.com/jasperserver
JASPER_USERNAME=service_account
JASPER_PASSWORD=secure_password
```

### Complete Configuration
```bash
# Server Connection
JASPER_URL=https://reports.company.com/jasperserver
JASPER_TIMEOUT=60000
JASPER_SSL_VERIFY=true

# Authentication
JASPER_AUTH_TYPE=basic
JASPER_USERNAME=service_account
JASPER_PASSWORD=secure_password
JASPER_ORGANIZATION=sales_org

# Logging and Debug
JASPER_LOG_LEVEL=info
JASPER_DEBUG_MODE=false

# Resilience
JASPER_RETRY_ATTEMPTS=3
JASPER_RETRY_DELAY=1000

# Test Server (Development Only)
TEST_SERVER_ENABLED=false
TEST_SERVER_PORT=3000
TEST_SERVER_HOST=localhost
```