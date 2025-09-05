# JasperReports MCP Server

[![npm version](https://badge.fury.io/js/jasperreports-mcp-server.svg)](https://badge.fury.io/js/jasperreports-mcp-server)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![CI/CD Pipeline](https://github.com/mr-wolf-gb/jasperreports-mcp-server/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/mr-wolf-gb/jasperreports-mcp-server/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/mr-wolf-gb/jasperreports-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/mr-wolf-gb/jasperreports-mcp-server)

A comprehensive Node.js Model Context Protocol (MCP) server for JasperReports Server REST API v2. This server enables AI assistants and developers to perform all major JasperReports operations including authentication, resource management, report execution, job scheduling, and administrative tasks through standardized MCP tools.

Perfect for integrating JasperReports functionality into AI-powered IDEs like **Cursor**, **Kiro**, **Windsurf**, **Claude Desktop**, and any other MCP-compatible development environment.

## Features

- **🔌 MCP Compatible**: Works seamlessly with Cursor, Kiro, Windsurf, and other MCP-enabled IDEs
- **🔐 Complete JasperReports Integration**: Full support for JasperReports Server REST API v2
- **🔑 Multiple Authentication Methods**: Basic, login service, and argument-based authentication
- **📁 Resource Management**: Upload, list, update, and delete reports and resources
- **📊 Report Execution**: Synchronous and asynchronous report generation in multiple formats (PDF, Excel, CSV, etc.)
- **⏰ Job Scheduling**: Create and manage scheduled report jobs with cron expressions
- **🎛️ Input Controls**: Handle report parameters and cascading controls
- **👥 Administrative Tools**: User, role, and permission management
- **🧪 Test Server**: HTTP endpoint for testing and validation
- **🛡️ Enterprise Ready**: SSL support, timeout handling, and comprehensive error management
- **📝 Comprehensive Logging**: Debug and production logging with configurable levels

## IDE Integration

### Cursor IDE

1. Install the MCP server globally:
```bash
npm install -g jasperreports-mcp-server
```

2. Add to your Cursor settings (`.cursor-settings/mcp.json`):
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "npx",
      "args": ["jasperreports-mcp-server"],
      "env": {
        "JASPER_URL": "http://localhost:8080/jasperserver",
        "JASPER_USERNAME": "jasperadmin",
        "JASPER_PASSWORD": "jasperadmin",
        "JASPER_AUTH_TYPE": "basic"
      }
    }
  }
}
```

### Kiro IDE

1. Install the server:
```bash
npm install -g jasperreports-mcp-server
```

2. Configure in `.kiro/settings/mcp.json`:
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "jasperreports-mcp-server",
      "env": {
        "JASPER_URL": "http://localhost:8080/jasperserver",
        "JASPER_USERNAME": "jasperadmin",
        "JASPER_PASSWORD": "jasperadmin"
      },
      "autoApprove": [
        "jasper_authenticate",
        "jasper_test_connection",
        "jasper_list_resources"
      ]
    }
  }
}
```

### Windsurf IDE

1. Install globally:
```bash
npm install -g jasperreports-mcp-server
```

2. Add to Windsurf MCP configuration:
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "npx",
      "args": ["jasperreports-mcp-server"],
      "env": {
        "JASPER_URL": "https://your-jasper-server.com/jasperserver",
        "JASPER_USERNAME": "your-username",
        "JASPER_PASSWORD": "your-password",
        "JASPER_SSL_VERIFY": "true"
      }
    }
  }
}
```

### Claude Desktop

1. Install the server:
```bash
npm install -g jasperreports-mcp-server
```

2. Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "jasperreports-mcp-server",
      "env": {
        "JASPER_URL": "http://localhost:8080/jasperserver",
        "JASPER_USERNAME": "jasperadmin",
        "JASPER_PASSWORD": "jasperadmin"
      }
    }
  }
}
```

### Other MCP-Compatible IDEs

For any IDE that supports the Model Context Protocol:

1. Install the server:
```bash
npm install -g jasperreports-mcp-server
```

2. Add the server configuration to your IDE's MCP settings file:
```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "jasperreports-mcp-server",
      "env": {
        "JASPER_URL": "your-jasper-server-url",
        "JASPER_USERNAME": "your-username",
        "JASPER_PASSWORD": "your-password"
      }
    }
  }
}
```

## Quick Start

### Local Development

1. Clone and install:
```bash
git clone https://github.com/mr-wolf-gb/jasperreports-mcp-server.git
cd jasperreports-mcp-server
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your JasperReports Server details
```

3. Start the server:
```bash
# Start the MCP server
npm start

# Start in development mode with auto-reload
npm run dev

# Start the test server for HTTP testing
npm run test-server
```

### Production Installation

```bash
# Install globally
npm install -g jasperreports-mcp-server

# Or use with npx (recommended)
npx jasperreports-mcp-server
```

## Development

### Project Structure

```
src/
├── config/          # Configuration management
├── services/        # Business logic services
├── utils/           # Utility functions
├── models/          # Data models and schemas
├── tools/           # MCP tool definitions
├── index.js         # Main MCP server entry point
└── testServer.js    # Express test server

test/
├── unit/            # Unit tests
├── integration/     # Integration tests
├── fixtures/        # Test data and fixtures
└── utils/           # Test utilities

docs/                # Documentation and examples
```

### Available Scripts

- `npm start` - Start the MCP server
- `npm run dev` - Start with auto-reload
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test-server` - Start HTTP test server

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Configuration

### Environment Variables

The server is configured through environment variables:

| Variable              | Description                                  | Default  | Required |
| --------------------- | -------------------------------------------- | -------- | -------- |
| `JASPER_URL`          | JasperReports Server URL                     | -        | ✅       |
| `JASPER_USERNAME`     | Username for authentication                  | -        | ✅       |
| `JASPER_PASSWORD`     | Password for authentication                  | -        | ✅       |
| `JASPER_AUTH_TYPE`    | Authentication method (basic/login/argument) | basic    | ❌       |
| `JASPER_ORGANIZATION` | Organization for multi-tenant setups         | -        | ❌       |
| `JASPER_TIMEOUT`      | Request timeout in milliseconds              | 30000    | ❌       |
| `JASPER_DEBUG_MODE`   | Enable debug logging                         | false    | ❌       |
| `JASPER_SSL_VERIFY`   | Verify SSL certificates                      | true     | ❌       |
| `TEST_SERVER_PORT`    | Port for HTTP test server                    | 3000     | ❌       |
| `TEST_SERVER_ENABLED` | Enable HTTP test server                      | false    | ❌       |
| `NODE_ENV`            | Node.js environment                          | production | ❌     |
| `LOG_LEVEL`           | Logging level (error/warn/info/debug)        | info     | ❌       |

### Configuration Examples

The `config/` directory contains ready-to-use MCP configuration examples:

- **`mcp-development.json`**: Local development with debug logging
- **`mcp-production.json`**: Production setup with security best practices  
- **`mcp-docker.json`**: Docker-based deployment configuration

Copy the appropriate configuration to your IDE's MCP settings and customize the environment variables.

## Available MCP Tools

The server provides 40+ MCP tools organized into logical categories:

### 🔐 Authentication & Connection
- `jasper_authenticate` - Authenticate with JasperReports Server
- `jasper_test_connection` - Test server connectivity and health

### 📁 Resource Management
- `jasper_upload_resource` - Upload JRXML reports and resources
- `jasper_list_resources` - List repository resources with filtering
- `jasper_get_resource` - Retrieve resource details and content
- `jasper_update_resource` - Update existing resources
- `jasper_delete_resource` - Delete resources and folders

### 📊 Report Execution
- `jasper_run_report_sync` - Execute reports synchronously (PDF, Excel, CSV, etc.)
- `jasper_run_report_async` - Start asynchronous execution for large reports
- `jasper_get_execution_status` - Check execution status and progress
- `jasper_get_execution_result` - Retrieve execution results and files
- `jasper_cancel_execution` - Cancel running executions

### ⏰ Job Scheduling
- `jasper_create_job` - Create scheduled jobs with cron expressions
- `jasper_list_jobs` - List existing jobs with filtering
- `jasper_update_job` - Modify job schedules and parameters
- `jasper_delete_job` - Remove scheduled jobs
- `jasper_run_job_now` - Execute jobs immediately

### 🎛️ Input Controls & Parameters
- `jasper_get_input_controls` - Get report parameters and controls
- `jasper_set_input_control_values` - Set parameter values for cascading controls
- `jasper_validate_input_controls` - Validate parameter values

### 👥 User & Role Management
- `jasper_create_user` - Create new user accounts
- `jasper_list_users` - List users with filtering
- `jasper_update_user` - Update user details and roles
- `jasper_create_role` - Create new roles
- `jasper_list_roles` - List available roles

### 🔒 Permissions & Security
- `jasper_get_permissions` - Get resource permissions
- `jasper_set_permissions` - Set resource permissions for users/roles

### 🏢 Domain Management
- `jasper_list_domains` - List semantic layer domains
- `jasper_get_domain` - Get domain definitions
- `jasper_get_domain_schema` - Get domain schema and fields

### 🛠️ Utilities & Templates
- `jasper_get_report_template` - Get JRXML report templates
- `jasper_get_datasource_structure` - Get datasource configuration templates

### 📊 Health & Monitoring
- `jasper_health_status` - Get comprehensive health status
- `jasper_deep_health_check` - Perform deep system health checks
- `jasper_performance_metrics` - Get performance and memory metrics
- `jasper_component_health` - Test specific system components
- `jasper_resilience_stats` - Get resilience and retry statistics

## Usage Examples

### Basic Report Execution
```javascript
// Authenticate first
await jasper_authenticate({
  username: "jasperadmin",
  password: "jasperadmin"
});

// List available reports
const reports = await jasper_list_resources({
  folderUri: "/reports",
  resourceType: "reportUnit"
});

// Execute a report
const result = await jasper_run_report_sync({
  reportUri: "/reports/SampleReport",
  outputFormat: "pdf",
  parameters: {
    "StartDate": "2024-01-01",
    "EndDate": "2024-12-31"
  }
});
```

### Upload and Schedule Reports
```javascript
// Upload a new report
await jasper_upload_resource({
  resourcePath: "/reports/MyReport",
  label: "My Custom Report",
  jrxmlContent: "<?xml version='1.0'?>...",
  resourceType: "reportUnit"
});

// Create a scheduled job
await jasper_create_job({
  label: "Daily Sales Report",
  reportUri: "/reports/MyReport",
  schedule: {
    type: "simple",
    recurrenceInterval: 1,
    recurrenceIntervalUnit: "DAY"
  },
  outputFormats: ["pdf", "xlsx"],
  recipients: ["manager@company.com"]
});
```

## Docker Support

### Quick Start with Docker

```bash
# Build the image
docker build -t jasperreports-mcp-server .

# Run with environment file
docker run -p 3000:3000 --env-file .env jasperreports-mcp-server

# Or use docker-compose for development
docker-compose up --build
```

### Docker Configuration

Use the provided `config/mcp-docker.json` for Docker-based MCP setup:

```json
{
  "mcpServers": {
    "jasperreports-server": {
      "command": "docker",
      "args": [
        "run", "--rm", "--network=host",
        "--env-file", ".env",
        "jasperreports-mcp-server"
      ]
    }
  }
}
```

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify `JASPER_URL` is correct and accessible
- Check if JasperReports Server is running
- Ensure network connectivity

**Authentication Failed**
- Verify username and password
- Check if the user account is enabled
- Try different authentication methods (`basic`, `login`, `argument`)

**SSL Certificate Errors**
- Set `JASPER_SSL_VERIFY=false` for development
- Install proper SSL certificates for production
- Use HTTP instead of HTTPS for local development

**Tool Not Found**
- Ensure the MCP server is properly configured in your IDE
- Check that the server is running and accessible
- Verify environment variables are set correctly

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export JASPER_DEBUG_MODE=true
export LOG_LEVEL=debug
```

### Health Checks

Use the built-in health check tools:

```javascript
// Test basic connectivity
await jasper_test_connection();

// Comprehensive health check
await jasper_deep_health_check();

// Check specific components
await jasper_component_health({ component: "authentication" });
```

## Documentation

- 📖 [API Documentation](docs/api.md)
- 🔧 [Configuration Guide](docs/configuration.md)
- 🚀 [Deployment Guide](docs/deployment.md)
- 📝 [JRXML Examples](docs/jrxml.md)
- 🔍 [Troubleshooting Guide](docs/troubleshooting.md)
- 💡 [Comprehensive Examples](docs/comprehensive-examples.md)

## License

GPL-3.0-or-later License - see [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Run linting (`npm run lint:fix`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Development Setup

```bash
# Clone and install
git clone https://github.com/mr-wolf-gb/jasperreports-mcp-server.git
cd jasperreports-mcp-server
npm install

# Run tests
npm test
npm run test:coverage

# Start development server
npm run dev
```

## Support & Community

- 🐛 **Issues**: [GitHub Issues](https://github.com/mr-wolf-gb/jasperreports-mcp-server/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/mr-wolf-gb/jasperreports-mcp-server/discussions)
- 📧 **Email**: gaiththewolf@gmail.com
- 📚 **Documentation**: [Full Documentation](https://github.com/mr-wolf-gb/jasperreports-mcp-server#readme)

## Roadmap

- [ ] GraphQL API support
- [ ] WebSocket real-time updates
- [ ] Advanced caching mechanisms
- [ ] Multi-server load balancing
- [ ] Enhanced security features
- [ ] Visual report designer integration

---

**Made with ❤️ by [Mr-Wolf-GB](https://github.com/mr-wolf-gb) for the JasperReports and MCP community**
