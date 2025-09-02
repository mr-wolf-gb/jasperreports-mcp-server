# MCP Configuration Examples

This directory contains example MCP server configurations for different deployment scenarios.

## Configuration Files

### `mcp-production.json`
Production configuration with:
- NPM package installation via `npx`
- HTTPS connection with SSL verification
- Minimal debug logging
- Limited auto-approved tools for security
- Service account authentication

### `mcp-development.json`
Development configuration with:
- Local Node.js execution
- HTTP connection (no SSL)
- Debug logging enabled
- Test server enabled
- Extended auto-approved tools
- Admin credentials

### `mcp-docker.json`
Docker-based configuration with:
- Docker container execution
- Host network access for local JasperReports Server
- Environment file support
- Production-like settings

## Usage

1. Copy the appropriate configuration file to your MCP client configuration directory
2. Update the environment variables to match your JasperReports Server setup
3. Modify the `command` and `args` based on your installation method

## Environment Variables

All configurations support these environment variables:

### Required
- `JASPER_URL`: JasperReports Server URL
- `JASPER_USERNAME`: Username for authentication
- `JASPER_PASSWORD`: Password for authentication

### Optional
- `JASPER_AUTH_TYPE`: Authentication method (basic, login, argument)
- `JASPER_ORGANIZATION`: Organization for multi-tenant setups
- `JASPER_TIMEOUT`: Request timeout in milliseconds
- `JASPER_SSL_VERIFY`: Enable/disable SSL certificate verification
- `JASPER_DEBUG_MODE`: Enable debug logging
- `TEST_SERVER_ENABLED`: Enable HTTP test server
- `TEST_SERVER_PORT`: Port for test server
- `NODE_ENV`: Node.js environment
- `LOG_LEVEL`: Logging level

## Security Considerations

- Use service accounts with minimal required permissions in production
- Enable SSL verification in production environments
- Limit auto-approved tools to reduce security risks
- Store sensitive credentials in secure environment variable stores
- Use organization-specific authentication when available