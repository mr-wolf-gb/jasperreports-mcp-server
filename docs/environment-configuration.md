# Environment Configuration Guide

This guide explains how to configure the JasperReports MCP Server using environment variables.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your JasperReports Server details:**
   ```bash
   # Required settings
   JASPER_URL=http://your-jasper-server:8080/jasperserver
   JASPER_USERNAME=your-username
   JASPER_PASSWORD=your-password
   ```

3. **Validate your configuration:**
   ```bash
   npm run validate-env
   ```

## Required Environment Variables

These variables must be set for the server to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `JASPER_URL` | JasperReports Server URL | `http://localhost:8080/jasperserver` |
| `JASPER_USERNAME` | Username for authentication | `jasperadmin` |
| `JASPER_PASSWORD` | Password for authentication | `jasperadmin` |

## Optional Environment Variables

### Authentication Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `JASPER_AUTH_TYPE` | `basic` | Authentication method (`basic`, `login`, `argument`) |
| `JASPER_ORGANIZATION` | `null` | Organization for multi-tenant setups |

### Connection Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `JASPER_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `JASPER_SSL_VERIFY` | Environment-aware* | Enable SSL certificate verification |

*SSL Verification defaults:
- **Test environment**: `false`
- **Development environment**: `false`  
- **Production environment**: `true`

### Debug and Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `JASPER_DEBUG_MODE` | Environment-aware* | Enable debug logging |
| `JASPER_LOG_LEVEL` | `info` | Log level (`error`, `warn`, `info`, `debug`, `trace`) |

*Debug Mode defaults:
- **Test environment**: `false`
- **Development environment**: `true`
- **Production environment**: `false`

### Resilience Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `JASPER_RETRY_ATTEMPTS` | `3` | Number of retry attempts for failed requests |
| `JASPER_MAX_CONNECTIONS` | `10` | Maximum concurrent connections |
| `JASPER_MAX_QUEUE_SIZE` | `100` | Maximum request queue size |
| `JASPER_MAX_FILE_SIZE` | `104857600` | Maximum file size in bytes (100MB) |
| `JASPER_MAX_TOTAL_MEMORY` | `524288000` | Maximum total memory usage in bytes (500MB) |
| `JASPER_HEALTH_CHECK_INTERVAL` | `30000` | Health check interval in milliseconds |

### Test Server Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_SERVER_ENABLED` | `false` | Enable the test server |
| `TEST_SERVER_PORT` | `3000` | Port for the test server |

## Environment-Specific Configuration

### Development Environment

```bash
NODE_ENV=development
JASPER_URL=http://localhost:8080/jasperserver
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin
JASPER_SSL_VERIFY=false
JASPER_DEBUG_MODE=true
JASPER_LOG_LEVEL=debug
```

### Test Environment

```bash
NODE_ENV=test
JASPER_URL=http://localhost:8080/jasperserver
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin
JASPER_SSL_VERIFY=false
JASPER_DEBUG_MODE=false
JASPER_LOG_LEVEL=info
```

### Production Environment

```bash
NODE_ENV=production
JASPER_URL=https://reports.company.com/jasperserver
JASPER_USERNAME=service_account
JASPER_PASSWORD=secure_password
JASPER_SSL_VERIFY=true
JASPER_DEBUG_MODE=false
JASPER_LOG_LEVEL=warn
JASPER_ORGANIZATION=organization_1
```

## CI/CD Configuration

For CI/CD environments, set these as secrets or environment variables:

```yaml
env:
  NODE_ENV: test
  JASPER_URL: ${{ secrets.JASPER_URL }}
  JASPER_USERNAME: ${{ secrets.JASPER_USERNAME }}
  JASPER_PASSWORD: ${{ secrets.JASPER_PASSWORD }}
  JASPER_AUTH_TYPE: basic
  JASPER_SSL_VERIFY: false
```

## Validation and Troubleshooting

### Validate Configuration

Use the built-in validation script to check your configuration:

```bash
npm run validate-env
```

This will:
- Check that all required variables are set
- Validate variable formats and values
- Show helpful error messages for missing or invalid variables
- Display a summary of your current configuration

### Common Issues

#### Missing Required Variables

**Error:** `JASPER_URL is required`

**Solution:** Set the required environment variables:
```bash
export JASPER_URL=http://localhost:8080/jasperserver
export JASPER_USERNAME=jasperadmin
export JASPER_PASSWORD=jasperadmin
```

#### Invalid URL Format

**Error:** `JASPER_URL must be a valid URL`

**Solution:** Ensure the URL includes the protocol:
```bash
# ❌ Wrong
JASPER_URL=localhost:8080/jasperserver

# ✅ Correct
JASPER_URL=http://localhost:8080/jasperserver
```

#### SSL Certificate Issues

**Error:** SSL certificate verification failed

**Solution:** For development/testing, disable SSL verification:
```bash
JASPER_SSL_VERIFY=false
```

For production, ensure your certificates are valid or configure proper certificate handling.

### Environment Detection

The server automatically detects the environment based on `NODE_ENV`:

- `NODE_ENV=test` or `NODE_ENV=testing` → Test environment
- `NODE_ENV=development` or `NODE_ENV=dev` → Development environment  
- `NODE_ENV=production` → Production environment
- No `NODE_ENV` set → Defaults to development

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use secrets management** in production environments
3. **Enable SSL verification** in production (`JASPER_SSL_VERIFY=true`)
4. **Use strong passwords** and consider service accounts
5. **Limit permissions** for the JasperReports user account
6. **Rotate credentials** regularly

## Configuration Schema

The server uses a comprehensive configuration schema with validation. You can view the full schema programmatically:

```javascript
import { getConfigurationSchema } from './src/config/environment.js';
console.log(getConfigurationSchema());
```

## Examples

### Docker Configuration

```dockerfile
ENV NODE_ENV=production
ENV JASPER_URL=https://reports.company.com/jasperserver
ENV JASPER_USERNAME=service_account
ENV JASPER_PASSWORD=secure_password
ENV JASPER_SSL_VERIFY=true
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jasper-config
data:
  NODE_ENV: "production"
  JASPER_URL: "https://reports.company.com/jasperserver"
  JASPER_AUTH_TYPE: "basic"
  JASPER_SSL_VERIFY: "true"
  JASPER_TIMEOUT: "60000"
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jasper-secrets
type: Opaque
stringData:
  JASPER_USERNAME: "service_account"
  JASPER_PASSWORD: "secure_password"
```