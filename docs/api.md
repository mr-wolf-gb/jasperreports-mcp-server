# JasperReports MCP Server API Documentation

This document provides comprehensive documentation for all MCP tools available in the JasperReports MCP Server.

## Overview

The JasperReports MCP Server provides a complete interface to JasperReports Server REST API v2 through Model Context Protocol (MCP) tools. All tools follow consistent patterns for authentication, error handling, and response formatting.

## System Requirements

### JasperReports Server Compatibility
- **Minimum Version**: JasperReports Server 7.5.0
- **Recommended Version**: JasperReports Server 8.2.0 or later
- **Supported Editions**: Community, Professional, Enterprise
- **API Version**: REST API v2

### Feature Requirements by Version
- **7.5.0+**: Basic resource management, report execution, authentication
- **7.8.0+**: Enhanced job scheduling, input controls, domain management
- **8.0.0+**: Advanced permissions, user management, health monitoring
- **8.2.0+**: Full feature support, optimized performance

### Network Requirements
- HTTP/HTTPS connectivity to JasperReports Server
- SSL/TLS support for secure connections
- Firewall access to JasperReports Server ports (default: 8080/8443)

## Permission Requirements

### Tool Permission Matrix

| Tool Category | Required Permissions | JasperReports Roles |
|---------------|---------------------|-------------------|
| Authentication | Login access | Any valid user |
| Resource Management | Repository read/write | ROLE_USER + resource permissions |
| Report Execution | Execute reports | ROLE_USER + report execute |
| Job Management | Schedule management | ROLE_ADMINISTRATOR |
| Input Controls | Report parameter access | ROLE_USER + report read |
| Domain Management | Domain access | ROLE_USER + domain permissions |
| Permission Management | Administrative access | ROLE_ADMINISTRATOR |
| User Management | User administration | ROLE_ADMINISTRATOR |
| Health Monitoring | System monitoring | ROLE_ADMINISTRATOR |

### Common Permission Issues
1. **HTTP 401 Errors**: Invalid credentials or expired session
2. **HTTP 403 Errors**: Insufficient permissions for operation
3. **Job Management Failures**: Requires ROLE_ADMINISTRATOR for most operations
4. **Resource Access Denied**: Check folder and resource-level permissions

## Configuration Requirements

### Environment Variables
```bash
# Required Configuration
JASPER_SERVER_URL=http://localhost:8080/jasperserver
JASPER_USERNAME=jasperadmin
JASPER_PASSWORD=jasperadmin

# Optional Configuration
JASPER_AUTH_TYPE=basic                    # basic, login, argument
JASPER_ORGANIZATION=organization_1        # For multi-tenant setups
JASPER_TIMEOUT=30000                     # Request timeout in milliseconds
JASPER_SSL_VERIFY=true                   # SSL certificate verification
JASPER_DEBUG_MODE=false                  # Enable debug logging
JASPER_MAX_RETRIES=3                     # Maximum retry attempts
JASPER_RETRY_DELAY=1000                  # Retry delay in milliseconds
```

### SSL/TLS Configuration
- **Production**: Always use HTTPS with valid certificates
- **Development**: Can disable SSL verification with `JASPER_SSL_VERIFY=false`
- **Self-signed certificates**: Requires custom certificate handling

## Tool Categories

The MCP server provides 25+ tools organized into 9 categories:

1. **Authentication** (2 tools): Connection and authentication management
2. **Resource Management** (5 tools): Upload, list, get, update, delete resources
3. **Report Execution** (5 tools): Synchronous/asynchronous report generation
4. **Job Management** (5 tools): Scheduled job creation and management
5. **Input Controls** (3 tools): Report parameter handling
6. **Domain Management** (3 tools): Semantic layer operations
7. **Permission Management** (2 tools): Access control management
8. **User Management** (3 tools): User and role administration
9. **Health Monitoring** (5 tools): System health and performance monitoring

## Additional Documentation

- **[Comprehensive Examples](comprehensive-examples.md)**: Practical usage patterns and workflows
- **[Troubleshooting Guide](troubleshooting-guide.md)**: Common issues and solutions
- **[Tool Limitations](tool-limitations.md)**: Known limitations and workarounds
- **[Configuration Guide](configuration.md)**: Environment setup and configuration
- **[Deployment Guide](deployment.md)**: Production deployment best practices

## Authentication Tools

### jasper_authenticate

Authenticate with JasperReports Server using configured credentials or override parameters.

**Description:**
Establishes authentication session with JasperReports Server. Supports multiple authentication methods and can override configuration parameters for specific authentication needs.

**Parameters:**
- `authType` (optional, string): Authentication method override
  - `"basic"`: HTTP Basic Authentication (fastest, less secure)
  - `"login"`: Login service authentication (recommended, session-based)
  - `"argument"`: URL argument authentication (legacy support)
- `username` (optional, string): Username override (1-100 characters)
- `password` (optional, string): Password override (6-100 characters)
- `organization` (optional, string): Organization ID for multi-tenant environments
- `forceReauth` (optional, boolean): Force re-authentication even if session exists (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Valid user account with login permissions
- Network connectivity to JasperReports Server

**Permission Requirements:**
- Any valid user account
- For multi-tenant: User must belong to specified organization

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "authMethod": "login",
  "sessionValid": true,
  "sessionExpiry": "2024-01-20T18:30:00Z",
  "serverInfo": {
    "version": "8.2.0",
    "edition": "Professional",
    "build": "20231201_1234",
    "features": ["reports", "dashboards", "domains"]
  },
  "message": "Authentication successful"
}
```

**Examples:**

*Basic authentication with config credentials:*
```json
{}
```

*Login service with custom credentials:*
```json
{
  "authType": "login",
  "username": "reportuser",
  "password": "secure_password"
}
```

*Multi-tenant authentication:*
```json
{
  "authType": "login",
  "username": "admin",
  "password": "admin_password",
  "organization": "organization_1"
}
```

**Common Issues:**
- **401 Unauthorized**: Invalid credentials or expired session
- **403 Forbidden**: Account disabled or insufficient permissions
- **Connection timeout**: Check network connectivity and server status
- **SSL errors**: Verify SSL configuration and certificates

**Troubleshooting:**
1. Verify credentials with JasperReports Server web interface
2. Check server URL and port configuration
3. Ensure user account is enabled and not locked
4. For multi-tenant: Verify organization exists and user belongs to it

---

### jasper_test_connection

Test connectivity and authentication with JasperReports Server without establishing a persistent session.

**Description:**
Performs comprehensive connection testing including network connectivity, server availability, and optional authentication verification. Useful for configuration validation and troubleshooting.

**Parameters:**
- `includeAuth` (optional, boolean): Include authentication test (default: true)
- `timeout` (optional, number): Connection timeout in milliseconds (1000-300000, default: 30000)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Network connectivity to server
- Valid credentials if `includeAuth` is true

**Permission Requirements:**
- None for connection test only
- Valid user account if authentication test included

**Response:**
```json
{
  "connected": true,
  "authenticated": true,
  "serverInfo": {
    "version": "8.2.0",
    "edition": "Professional",
    "build": "20231201_1234",
    "features": ["reports", "dashboards", "domains"],
    "authenticationMethods": ["basic", "login"],
    "licenseType": "commercial",
    "maxUsers": 100
  },
  "responseTime": 150,
  "timestamp": "2024-01-20T10:30:00Z",
  "error": null
}
```

**Examples:**

*Full connection and authentication test:*
```json
{
  "includeAuth": true,
  "timeout": 10000
}
```

*Connection test only (no authentication):*
```json
{
  "includeAuth": false
}
```

**Error Response Example:**
```json
{
  "connected": false,
  "authenticated": false,
  "serverInfo": null,
  "responseTime": null,
  "timestamp": "2024-01-20T10:30:00Z",
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "Connection timeout after 30000ms",
    "details": {
      "serverUrl": "http://localhost:8080/jasperserver",
      "timeout": 30000
    }
  }
}
```

**Common Issues:**
- **Connection timeout**: Server unreachable or network issues
- **DNS resolution failure**: Invalid server hostname
- **Port blocked**: Firewall blocking access to JasperReports Server port
- **SSL handshake failure**: SSL/TLS configuration issues

**Troubleshooting:**
1. Verify server URL and port are correct
2. Test network connectivity with ping or telnet
3. Check firewall rules and proxy settings
4. Verify SSL certificate validity for HTTPS connections
5. Test with browser access to confirm server is running

## Resource Management Tools

### jasper_upload_resource

Upload JRXML reports, folders, datasources, and other resources to JasperReports Server repository.

**Description:**
Creates new resources in the JasperReports Server repository. Supports uploading report units with JRXML content, embedded resources (images, subreports), folders, datasources, and other file types. Automatically validates JRXML syntax and resource dependencies.

**Parameters:**
- `resourcePath` (required, string): Full repository path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
  - Must start with `/`
  - Use forward slashes for path separation
  - Example: `/reports/sales/monthly_report`
- `label` (required, string): Display name for the resource (1-200 chars)
- `description` (optional, string): Resource description (max 1000 chars)
- `resourceType` (optional, string): Resource type (default: "reportUnit")
  - `"reportUnit"`: JRXML report with datasource
  - `"folder"`: Repository folder
  - `"dataSource"`: Database connection
  - `"inputControl"`: Report parameter control
  - `"file"`: Generic file resource
- `jrxmlContent` (optional, string): Base64-encoded or plain XML JRXML content
- `dataSourceUri` (optional, string): Reference to existing datasource (pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `localResources` (optional, array): Embedded resources (images, subreports, etc.)
  - `name` (required): Resource filename
  - `type` (optional): Resource type (`img`, `jrxml`, `jar`, `prop`, `jrtx`)
  - `content` (required): Base64-encoded content
  - `contentType` (optional): MIME type
- `overwrite` (optional, boolean): Overwrite existing resource (default: false)
- `createFolders` (optional, boolean): Create parent folders if missing (default: true)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Repository write permissions
- Valid datasource if `dataSourceUri` specified

**Permission Requirements:**
- ROLE_USER minimum
- Write permissions on target folder
- Read permissions on referenced datasource

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/monthly_sales",
  "resourceId": "monthly_sales_report",
  "resourceType": "reportUnit",
  "uploadTimestamp": "2024-01-15T10:30:00Z",
  "validationStatus": "valid",
  "validationMessages": [],
  "localResourcesUploaded": 2,
  "executionTime": 1250
}
```

**Examples:**

*Upload simple report with datasource:*
```json
{
  "resourcePath": "/reports/sales/monthly_sales",
  "label": "Monthly Sales Report",
  "description": "Comprehensive monthly sales analysis",
  "jrxmlContent": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
  "dataSourceUri": "/datasources/sales_db",
  "overwrite": true
}
```

*Upload report with embedded resources:*
```json
{
  "resourcePath": "/reports/marketing/branded_report",
  "label": "Branded Marketing Report",
  "jrxmlContent": "PD94bWwgdmVyc2lvbj0iMS4wIi...",
  "dataSourceUri": "/datasources/marketing_db",
  "localResources": [
    {
      "name": "company_logo.png",
      "type": "img",
      "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
      "contentType": "image/png"
    },
    {
      "name": "subreport.jrxml",
      "type": "jrxml",
      "content": "PD94bWwgdmVyc2lvbj0iMS4wIi..."
    }
  ]
}
```

*Create folder structure:*
```json
{
  "resourcePath": "/reports/finance/quarterly",
  "label": "Quarterly Reports",
  "description": "Quarterly financial reports folder",
  "resourceType": "folder"
}
```

**Common Issues:**
- **JRXML validation errors**: Invalid XML syntax or JasperReports elements
- **Datasource not found**: Referenced datasource doesn't exist or no permissions
- **Path conflicts**: Resource already exists and overwrite=false
- **Permission denied**: Insufficient write permissions on target folder

**Troubleshooting:**
1. Validate JRXML syntax with JasperSoft Studio before upload
2. Verify datasource exists and is accessible
3. Check folder permissions and user roles
4. Use `createFolders=true` for new folder structures
5. Enable debug mode for detailed validation messages

**Limitations:**
- Maximum file size: 50MB per resource
- JRXML must be compatible with server version
- Embedded resources limited to supported types
- Path length limited to 500 characters

---

### jasper_list_resources

List and search resources in JasperReports Server repository with filtering and pagination.

**Description:**
Retrieves repository resources with comprehensive filtering, sorting, and pagination options. Supports recursive folder traversal and resource type filtering for efficient resource discovery.

**Parameters:**
- `folderUri` (optional, string): Starting folder path (default: "/", pattern: `/[a-zA-Z0-9_/\-\.]*`)
- `resourceType` (optional, string): Filter by resource type
  - `"reportUnit"`: JRXML reports
  - `"folder"`: Repository folders
  - `"dataSource"`: Database connections
  - `"inputControl"`: Parameter controls
  - `"file"`: Generic files
  - `"domain"`: Semantic layer domains
- `recursive` (optional, boolean): Include subfolders (default: false)
- `limit` (optional, number): Maximum results (1-1000, default: 100)
- `offset` (optional, number): Pagination offset (default: 0)
- `sortBy` (optional, string): Sort field (default: "label")
  - `"label"`: Display name
  - `"uri"`: Repository path
  - `"type"`: Resource type
  - `"creationDate"`: Creation timestamp
  - `"updateDate"`: Last modification
- `sortOrder` (optional, string): Sort direction ("asc" or "desc", default: "asc")
- `searchQuery` (optional, string): Search term for filtering (max 200 chars)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Repository read permissions

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on target folder and subfolders

**Response:**
```json
{
  "items": [
    {
      "uri": "/reports/sales/monthly",
      "label": "Monthly Sales Report",
      "description": "Monthly sales analysis",
      "resourceType": "reportUnit",
      "creationDate": "2024-01-15T10:30:00Z",
      "updateDate": "2024-01-20T14:15:00Z",
      "permissionMask": 32,
      "owner": "jasperadmin",
      "size": 15360
    }
  ],
  "totalCount": 25,
  "offset": 0,
  "limit": 100,
  "hasMore": false
}
```

**Examples:**

*List all reports in sales folder:*
```json
{
  "folderUri": "/reports/sales",
  "resourceType": "reportUnit",
  "sortBy": "updateDate",
  "sortOrder": "desc"
}
```

*Recursive search for all resources:*
```json
{
  "folderUri": "/",
  "recursive": true,
  "searchQuery": "sales",
  "limit": 50
}
```

*Paginated folder listing:*
```json
{
  "folderUri": "/reports",
  "limit": 20,
  "offset": 40,
  "sortBy": "label"
}
```

**Common Issues:**
- **Empty results**: Folder doesn't exist or no read permissions
- **Performance issues**: Large recursive searches without filtering
- **Permission errors**: Insufficient access to some subfolders

**Troubleshooting:**
1. Verify folder path exists and is accessible
2. Use resource type filtering for better performance
3. Implement pagination for large result sets
4. Check user permissions on target folders

---

### jasper_get_resource

Retrieve detailed information and content for a specific repository resource.

**Description:**
Fetches comprehensive resource metadata, content, and related information. Supports retrieving JRXML source, file content, and resource relationships with optional content inclusion for performance optimization.

**Parameters:**
- `resourceUri` (required, string): Resource path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `includeContent` (optional, boolean): Include file content in response (default: false)
- `includeMetadata` (optional, boolean): Include detailed metadata (default: true)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Resource must exist and be accessible

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on target resource

**Response:**
```json
{
  "success": true,
  "resource": {
    "uri": "/reports/sales/monthly",
    "label": "Monthly Sales Report",
    "description": "Monthly sales analysis",
    "resourceType": "reportUnit",
    "creationDate": "2024-01-15T10:30:00Z",
    "updateDate": "2024-01-20T14:15:00Z",
    "owner": "jasperadmin",
    "permissionMask": 32
  },
  "content": "PD94bWwgdmVyc2lvbj0iMS4wIi...",
  "contentType": "application/xml",
  "size": 15360,
  "metadata": {
    "jrxml": {
      "uri": "/reports/sales/monthly_files/main_jrxml",
      "reportName": "MonthlyReport"
    },
    "dataSource": {
      "uri": "/datasources/sales_db",
      "label": "Sales Database"
    },
    "localResources": [
      {
        "name": "company_logo.png",
        "uri": "/reports/sales/monthly_files/company_logo",
        "type": "img"
      }
    ]
  },
  "lastModified": "2024-01-20T14:15:00Z",
  "executionTime": 245
}
```

**Examples:**

*Get resource metadata only:*
```json
{
  "resourceUri": "/reports/sales/monthly",
  "includeContent": false
}
```

*Get resource with full content:*
```json
{
  "resourceUri": "/reports/sales/monthly",
  "includeContent": true,
  "includeMetadata": true
}
```

**Common Issues:**
- **Resource not found**: Invalid path or resource deleted
- **Permission denied**: Insufficient read permissions
- **Large content**: Performance impact when including content

**Troubleshooting:**
1. Verify resource path is correct and exists
2. Check user permissions on resource
3. Use `includeContent=false` for metadata-only queries
4. Consider resource size when including content

---

### jasper_update_resource

Update properties and content of existing repository resources.

**Description:**
Modifies existing resources including labels, descriptions, JRXML content, and embedded resources. Supports partial updates and automatic validation of changes.

**Parameters:**
- `resourceUri` (required, string): Resource path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `label` (optional, string): New display name (1-200 chars)
- `description` (optional, string): New description (max 1000 chars)
- `jrxmlContent` (optional, string): Updated JRXML content (base64 or plain XML)
- `overwrite` (optional, boolean): Force overwrite (default: true)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Resource must exist and be modifiable

**Permission Requirements:**
- ROLE_USER minimum
- Write permissions on target resource

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/monthly",
  "updateTimestamp": "2024-01-20T14:15:00Z",
  "validationStatus": "valid",
  "validationMessages": [],
  "executionTime": 890
}
```

**Examples:**

*Update label and description:*
```json
{
  "resourceUri": "/reports/sales/monthly",
  "label": "Updated Monthly Sales Report",
  "description": "Enhanced monthly sales analysis with new metrics"
}
```

*Update JRXML content:*
```json
{
  "resourceUri": "/reports/sales/monthly",
  "jrxmlContent": "PD94bWwgdmVyc2lvbj0iMS4wIi...",
  "overwrite": true
}
```

**Common Issues:**
- **Resource locked**: Resource in use by running reports
- **Validation errors**: Invalid JRXML or content
- **Permission denied**: Insufficient write permissions

**Troubleshooting:**
1. Ensure resource is not currently executing
2. Validate JRXML syntax before update
3. Check write permissions on resource
4. Use overwrite=true for forced updates

---

### jasper_delete_resource

Remove resources from JasperReports Server repository with dependency checking.

**Description:**
Safely deletes repository resources with optional dependency validation. Supports cascading deletion and provides detailed information about deleted items.

**Parameters:**
- `resourceUri` (required, string): Resource path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `force` (optional, boolean): Force deletion despite dependencies (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Resource must exist and be deletable

**Permission Requirements:**
- ROLE_USER minimum
- Delete permissions on target resource
- Administrative permissions for forced deletion

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/monthly",
  "deleteTimestamp": "2024-01-20T16:45:00Z",
  "deletedResources": [
    "/reports/sales/monthly",
    "/reports/sales/monthly_files/main_jrxml",
    "/reports/sales/monthly_files/company_logo"
  ],
  "executionTime": 320
}
```

**Examples:**

*Safe deletion with dependency check:*
```json
{
  "resourceUri": "/reports/sales/old_report"
}
```

*Forced deletion ignoring dependencies:*
```json
{
  "resourceUri": "/reports/sales/old_report",
  "force": true
}
```

**Common Issues:**
- **Dependency conflicts**: Resource referenced by other resources
- **Permission denied**: Insufficient delete permissions
- **Resource in use**: Active report executions or scheduled jobs

**Troubleshooting:**
1. Check for dependent resources before deletion
2. Stop scheduled jobs using the resource
3. Use force=true only when necessary
4. Verify delete permissions on resource and parent folder

**Limitations:**
- Cannot delete system resources
- Folder deletion requires empty folder or force=true
- Some resources may have protection against deletion

### jasper_list_resources

List resources in the JasperReports Server repository with filtering options.

**Parameters:**
- `folderPath` (optional): Folder to list (default: "/")
- `resourceType` (optional): Filter by resource type
- `recursive` (optional): Include subfolders (default: false)
- `limit` (optional): Maximum number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field ("label", "uri", "creationDate")
- `sortOrder` (optional): Sort direction ("asc", "desc")

**Response:**
```json
{
  "resources": [
    {
      "uri": "/reports/sales/monthly",
      "label": "Monthly Sales Report",
      "description": "Monthly sales analysis",
      "resourceType": "reportUnit",
      "creationDate": "2024-01-15T10:30:00Z",
      "updateDate": "2024-01-20T14:15:00Z",
      "permissionMask": 32
    }
  ],
  "totalCount": 25,
  "hasMore": true
}
```

### jasper_get_resource

Retrieve detailed information about a specific resource.

**Parameters:**
- `resourceUri` (required): URI of the resource to retrieve
- `includeContent` (optional): Include file content in response (default: false)

**Response:**
```json
{
  "uri": "/reports/sales/monthly",
  "label": "Monthly Sales Report",
  "description": "Monthly sales analysis",
  "resourceType": "reportUnit",
  "creationDate": "2024-01-15T10:30:00Z",
  "updateDate": "2024-01-20T14:15:00Z",
  "jrxml": {
    "uri": "/reports/sales/monthly_files/main_jrxml",
    "content": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K..."
  },
  "dataSource": {
    "uri": "/datasources/sales_db"
  },
  "localResources": [
    {
      "name": "company_logo",
      "uri": "/reports/sales/monthly_files/company_logo"
    }
  ]
}
```

### jasper_update_resource

Update an existing resource in the repository.

**Parameters:**
- `resourceUri` (required): URI of the resource to update
- `label` (optional): New label
- `description` (optional): New description
- `jrxmlContent` (optional): Updated JRXML content
- `fileContent` (optional): Updated file content
- `localResources` (optional): Updated local resources

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/monthly",
  "updateTimestamp": "2024-01-20T14:15:00Z",
  "validationStatus": "valid",
  "changesApplied": ["label", "jrxml", "localResources"]
}
```

### jasper_delete_resource

Delete a resource from the repository.

**Parameters:**
- `resourceUri` (required): URI of the resource to delete

**Response:**
```json
{
  "success": true,
  "deletedUri": "/reports/sales/monthly",
  "deleteTimestamp": "2024-01-20T16:45:00Z"
}
```

## Report Execution Tools

### jasper_run_report_sync

Execute reports synchronously with immediate content return for fast, small reports.

**Description:**
Executes reports synchronously and returns generated content immediately. Best for small, fast reports (< 30 seconds execution time). Supports all major output formats and comprehensive parameter handling.

**Parameters:**
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `outputFormat` (optional, string): Output format (default: "pdf")
  - `"pdf"`: Portable Document Format (recommended for printing)
  - `"html"`: HTML format (best for web display)
  - `"xlsx"`: Excel 2007+ format (for data analysis)
  - `"xls"`: Excel 97-2003 format (legacy compatibility)
  - `"csv"`: Comma-separated values (data export)
  - `"rtf"`: Rich Text Format (Word compatibility)
  - `"docx"`: Word 2007+ format
  - `"odt"`: OpenDocument Text
  - `"ods"`: OpenDocument Spreadsheet
  - `"xml"`: XML data format
- `parameters` (optional, object): Report parameters as key-value pairs
- `pages` (optional, string): Page range (pattern: `\d+(-\d+)?(,\d+(-\d+)?)*`)
  - Examples: "1", "1-5", "1,3,5", "2-4,7-9"
- `locale` (optional, string): Locale code (pattern: `[a-z]{2}(_[A-Z]{2})?`, default: "en_US")
- `timezone` (optional, string): Timezone identifier (default: "America/New_York")
- `attachmentsPrefix` (optional, string): Prefix for attachment filenames (max 100 chars)
- `baseUrl` (optional, string): Base URL for hyperlinks in report

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Report must exist and be executable
- Sufficient server resources for synchronous execution

**Permission Requirements:**
- ROLE_USER minimum
- Execute permissions on target report
- Read permissions on report datasource

**Response:**
```json
{
  "content": "JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo...",
  "contentType": "application/pdf",
  "fileName": "monthly_sales_report.pdf",
  "fileSize": 245760,
  "executionId": "sync_exec_12345",
  "status": "ready",
  "outputFormat": "pdf",
  "reportUri": "/reports/sales/monthly",
  "generationTime": 1250,
  "pages": "1-12"
}
```

**Examples:**

*Simple PDF report execution:*
```json
{
  "reportUri": "/reports/sales/monthly",
  "outputFormat": "pdf"
}
```

*Report with parameters and page range:*
```json
{
  "reportUri": "/reports/sales/detailed",
  "outputFormat": "xlsx",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "department": "SALES"
  },
  "pages": "1-10"
}
```

*Localized report execution:*
```json
{
  "reportUri": "/reports/international/summary",
  "outputFormat": "pdf",
  "locale": "fr_FR",
  "timezone": "Europe/Paris",
  "parameters": {
    "currency": "EUR"
  }
}
```

**Common Issues:**
- **Timeout errors**: Report execution exceeds synchronous timeout (30s default)
- **Parameter validation**: Invalid or missing required parameters
- **Memory issues**: Large reports causing server memory problems
- **Format limitations**: Some formats don't support all report features

**Troubleshooting:**
1. Use async execution for long-running reports (>30 seconds)
2. Validate parameters with `jasper_validate_input_controls` first
3. Use page ranges to limit output size
4. Consider CSV format for large data exports

**Limitations:**
- Maximum execution time: 30 seconds (configurable)
- Maximum response size: 50MB
- Some output formats have feature limitations
- Synchronous execution blocks server resources

---

### jasper_run_report_async

Start asynchronous report execution for long-running or resource-intensive reports.

**Description:**
Initiates asynchronous report execution and returns execution ID for tracking. Recommended for reports taking >30 seconds or generating large outputs. Supports queuing and progress monitoring.

**Parameters:**
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `outputFormat` (optional, string): Output format (default: "pdf")
- `parameters` (optional, object): Report parameters as key-value pairs
- `pages` (optional, string): Page range specification
- `locale` (optional, string): Locale code (default: "en_US")
- `timezone` (optional, string): Timezone identifier (default: "America/New_York")

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Async execution enabled on server
- Sufficient execution queue capacity

**Permission Requirements:**
- ROLE_USER minimum
- Execute permissions on target report
- Async execution permissions (if restricted)

**Response:**
```json
{
  "success": true,
  "executionId": "async_exec_67890",
  "status": "queued",
  "reportUri": "/reports/sales/monthly",
  "outputFormat": "pdf",
  "startTime": "2024-01-20T10:00:00Z",
  "estimatedDuration": 300
}
```

**Examples:**

*Start async report execution:*
```json
{
  "reportUri": "/reports/analytics/large_dataset",
  "outputFormat": "xlsx",
  "parameters": {
    "year": 2024,
    "include_details": true
  }
}
```

**Status Values:**
- `"queued"`: Execution queued, waiting for resources
- `"execution"`: Currently executing
- `"ready"`: Completed successfully
- `"cancelled"`: Execution cancelled
- `"failed"`: Execution failed with errors

---

### jasper_get_execution_status

Monitor progress and status of asynchronous report executions.

**Description:**
Retrieves current status, progress information, and available exports for asynchronous executions. Provides detailed execution metrics and error information when applicable.

**Parameters:**
- `executionId` (required, string): Execution ID (1-100 chars, pattern: `[a-zA-Z0-9\-_]+`)
- `includeDetails` (optional, boolean): Include detailed execution info (default: true)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Valid execution ID from async start

**Permission Requirements:**
- ROLE_USER minimum
- Access to original execution (same user or admin)

**Response:**
```json
{
  "success": true,
  "executionId": "async_exec_67890",
  "status": "ready",
  "progress": 100,
  "currentPage": 45,
  "totalPages": 45,
  "exports": [
    {
      "id": "export_12345",
      "status": "ready",
      "outputFormat": "pdf",
      "fileSize": 2048576
    }
  ],
  "errorDescriptor": null,
  "startTime": "2024-01-20T10:00:00Z",
  "endTime": "2024-01-20T10:04:30Z"
}
```

**Examples:**

*Check execution status:*
```json
{
  "executionId": "async_exec_67890",
  "includeDetails": true
}
```

**Error Response Example:**
```json
{
  "success": true,
  "executionId": "async_exec_67890",
  "status": "failed",
  "errorDescriptor": {
    "errorCode": "report.execution.failed",
    "message": "Report execution failed due to datasource connection timeout",
    "parameters": ["datasource.timeout"]
  }
}
```

---

### jasper_get_execution_result

Download completed asynchronous report execution results.

**Description:**
Retrieves generated content from completed asynchronous executions. Supports multiple export formats and attachment handling with comprehensive metadata.

**Parameters:**
- `executionId` (required, string): Execution ID (1-100 chars, pattern: `[a-zA-Z0-9\-_]+`)
- `exportId` (required, string): Export ID from status response (min 1 char)
- `attachmentName` (optional, string): Specific attachment name (max 200 chars)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Execution must be completed successfully
- Export must be ready for download

**Permission Requirements:**
- ROLE_USER minimum
- Access to original execution

**Response:**
```json
{
  "content": "JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo...",
  "contentType": "application/pdf",
  "fileName": "large_report.pdf",
  "fileSize": 2048576,
  "executionId": "async_exec_67890",
  "exportId": "export_12345",
  "outputFormat": "pdf",
  "attachmentName": null
}
```

**Examples:**

*Download main report export:*
```json
{
  "executionId": "async_exec_67890",
  "exportId": "export_12345"
}
```

*Download specific attachment:*
```json
{
  "executionId": "async_exec_67890",
  "exportId": "export_12345",
  "attachmentName": "chart_data.csv"
}
```

**Common Issues:**
- **Export not ready**: Execution still in progress or failed
- **Export expired**: Results cleaned up after retention period
- **Large downloads**: Network timeouts for very large files

**Troubleshooting:**
1. Check execution status before downloading
2. Verify export ID from status response
3. Handle large downloads with appropriate timeouts
4. Download results promptly before cleanup

---

### jasper_cancel_execution

Cancel running asynchronous report executions to free server resources.

**Description:**
Cancels active asynchronous executions and cleans up associated resources. Provides immediate cancellation with optional force mode for stuck executions.

**Parameters:**
- `executionId` (required, string): Execution ID (1-100 chars, pattern: `[a-zA-Z0-9\-_]+`)
- `force` (optional, boolean): Force cancellation of stuck executions (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.5.0
- Execution must be active (queued or executing)

**Permission Requirements:**
- ROLE_USER minimum
- Access to original execution or administrative permissions

**Response:**
```json
{
  "success": true,
  "executionId": "async_exec_67890",
  "cancelled": true,
  "cancelTimestamp": "2024-01-20T10:02:15Z",
  "finalStatus": "cancelled"
}
```

**Examples:**

*Cancel execution gracefully:*
```json
{
  "executionId": "async_exec_67890"
}
```

*Force cancel stuck execution:*
```json
{
  "executionId": "async_exec_67890",
  "force": true
}
```

**Common Issues:**
- **Already completed**: Cannot cancel finished executions
- **Permission denied**: Cannot cancel other users' executions
- **Force required**: Execution stuck and requires force cancellation

**Troubleshooting:**
1. Check execution status before cancellation
2. Use force=true for stuck executions
3. Administrative users can cancel any execution
4. Cancelled executions cannot be resumed

## Input Control Tools

### jasper_get_input_controls

Retrieve input control definitions and current values for report parameters.

**Description:**
Fetches comprehensive input control metadata including types, validation rules, default values, and available options. Essential for building dynamic parameter forms and understanding report requirements.

**Parameters:**
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `includeStructure` (optional, boolean): Include control structure info (default: true)
- `includeValues` (optional, boolean): Include current control values (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.8.0 (basic controls), 8.0.0+ (cascading controls)
- Report must exist and be accessible

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on target report

**Response:**
```json
{
  "inputControls": [
    {
      "id": "start_date",
      "label": "Start Date",
      "description": "Report start date",
      "type": "singleValueDate",
      "dataType": "date",
      "mandatory": true,
      "readOnly": false,
      "visible": true,
      "defaultValue": "2024-01-01",
      "validationRules": [
        {
          "mandatoryValidationRule": {
            "errorMessage": "Start date is required"
          }
        },
        {
          "dateTimeFormatValidationRule": {
            "format": "yyyy-MM-dd",
            "errorMessage": "Date must be in YYYY-MM-DD format"
          }
        }
      ]
    },
    {
      "id": "department",
      "label": "Department",
      "type": "singleSelect",
      "dataType": "text",
      "mandatory": false,
      "masterDependencies": [],
      "slaveDependencies": ["employee", "region"],
      "options": [
        {"label": "Sales", "value": "SALES", "selected": false},
        {"label": "Marketing", "value": "MARKETING", "selected": false},
        {"label": "Finance", "value": "FINANCE", "selected": false}
      ]
    },
    {
      "id": "employee",
      "label": "Employee",
      "type": "multiSelect",
      "dataType": "text",
      "mandatory": false,
      "masterDependencies": ["department"],
      "options": []
    }
  ]
}
```

**Control Types:**
- `singleValue`: Single text input
- `singleValueText`: Text input with validation
- `singleValueNumber`: Numeric input
- `singleValueDate`: Date picker
- `singleValueDatetime`: Date/time picker
- `singleSelect`: Single selection dropdown
- `multiSelect`: Multiple selection list
- `singleSelectRadio`: Radio button group
- `multiSelectCheckbox`: Checkbox group
- `bool`: Boolean checkbox

**Examples:**

*Get basic control structure:*
```json
{
  "reportUri": "/reports/sales/parameterized_report",
  "includeStructure": true,
  "includeValues": false
}
```

*Get controls with current values:*
```json
{
  "reportUri": "/reports/sales/parameterized_report",
  "includeValues": true
}
```

**Common Issues:**
- **Control dependencies**: Cascading controls may not show options until master controls are set
- **Permission errors**: User may not have access to control data sources
- **Performance**: Large option lists can cause slow responses

**Troubleshooting:**
1. Set master control values first for cascading controls
2. Check user permissions on control data sources
3. Use pagination for controls with large option lists

---

### jasper_set_input_control_values

Set values for input controls and retrieve updated cascading control options.

**Description:**
Updates input control values and returns cascading control updates. Essential for handling dependent parameters where setting one control affects the available options in other controls.

**Parameters:**
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `controlId` (required, string): ID of the input control (1-100 chars)
- `values` (optional, object): Control values to set
- `freshData` (optional, boolean): Refresh data from datasource (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Control must exist in report
- Data source must be accessible

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on report and control data sources

**Response:**
```json
{
  "success": true,
  "updatedControls": [
    {
      "id": "department",
      "value": "SALES",
      "valid": true,
      "cascadingUpdates": [
        {
          "id": "employee",
          "options": [
            {"label": "John Doe", "value": "john.doe", "selected": false},
            {"label": "Jane Smith", "value": "jane.smith", "selected": false},
            {"label": "Bob Wilson", "value": "bob.wilson", "selected": false}
          ]
        },
        {
          "id": "region",
          "options": [
            {"label": "North", "value": "NORTH", "selected": false},
            {"label": "South", "value": "SOUTH", "selected": false}
          ]
        }
      ]
    }
  ],
  "validationErrors": []
}
```

**Examples:**

*Set single control value:*
```json
{
  "reportUri": "/reports/sales/regional_report",
  "controlId": "department",
  "values": {
    "department": "SALES"
  }
}
```

*Set multiple cascading values:*
```json
{
  "reportUri": "/reports/sales/regional_report", 
  "controlId": "country",
  "values": {
    "country": "USA",
    "state": "CA"
  },
  "freshData": true
}
```

**Common Issues:**
- **Invalid values**: Value not in available options
- **Dependency errors**: Setting dependent control before master control
- **Data refresh**: Stale options when underlying data changes

**Troubleshooting:**
1. Validate values against available options first
2. Set master controls before dependent controls
3. Use freshData=true when data may have changed

---

### jasper_validate_input_controls

Validate parameter values against input control constraints and business rules.

**Description:**
Performs comprehensive validation of report parameters including data type validation, range checking, mandatory field validation, and custom business rules. Use before report execution to ensure parameter validity.

**Parameters:**
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `parameters` (optional, object): Parameter values to validate
- `validateAll` (optional, boolean): Validate all parameters (default: true)

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Report must have input controls defined

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on report

**Response:**
```json
{
  "valid": false,
  "validationResults": [
    {
      "controlId": "start_date",
      "parameterName": "start_date",
      "valid": true,
      "value": "2024-01-01"
    },
    {
      "controlId": "end_date", 
      "parameterName": "end_date",
      "valid": false,
      "value": "2023-12-31",
      "errorMessage": "End date must be after start date",
      "errorCode": "date.range.invalid"
    },
    {
      "controlId": "department",
      "parameterName": "department", 
      "valid": false,
      "value": "INVALID_DEPT",
      "errorMessage": "Invalid department selection",
      "errorCode": "option.not.found",
      "validOptions": ["SALES", "MARKETING", "FINANCE"]
    }
  ],
  "globalValidationErrors": [
    {
      "errorMessage": "Date range cannot exceed 365 days",
      "errorCode": "business.rule.violation"
    }
  ]
}
```

**Validation Types:**
- **Mandatory validation**: Required field checking
- **Data type validation**: Type compatibility checking
- **Format validation**: Date/number format validation
- **Range validation**: Min/max value checking
- **Option validation**: Valid selection checking
- **Business rule validation**: Custom constraint checking

**Examples:**

*Validate all parameters:*
```json
{
  "reportUri": "/reports/sales/quarterly_report",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31", 
    "department": "SALES",
    "include_forecast": true,
    "currency": "USD"
  }
}
```

*Validate specific parameters only:*
```json
{
  "reportUri": "/reports/sales/quarterly_report",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-03-31"
  },
  "validateAll": false
}
```

**Error Response Example:**
```json
{
  "valid": false,
  "validationResults": [
    {
      "controlId": "budget_amount",
      "valid": false,
      "errorMessage": "Budget amount must be between $1,000 and $1,000,000",
      "errorCode": "range.validation.failed",
      "minValue": 1000,
      "maxValue": 1000000,
      "actualValue": 500
    }
  ]
}
```

**Common Issues:**
- **Date format errors**: Incorrect date format for locale
- **Cascading validation**: Dependent controls not validated in correct order
- **Business rule complexity**: Complex validation rules may be slow

**Troubleshooting:**
1. Use consistent date formats (ISO 8601 recommended)
2. Validate cascading controls in dependency order
3. Consider client-side validation for better performance

## Job Management Tools

### jasper_create_job

Create scheduled report jobs for automated report generation and distribution.

**Description:**
Creates scheduled jobs that automatically execute reports at specified intervals. Supports multiple output formats, email distribution, and flexible scheduling options including cron expressions.

**Parameters:**
- `label` (required, string): Job display name (1-200 chars)
- `reportUri` (required, string): Report path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `schedule` (required, object): Schedule configuration
  - `type` (required): Schedule type ("simple", "calendar", "cron")
  - `startDate` (optional): Start date (ISO 8601 format)
  - `endDate` (optional): End date (ISO 8601 format)
  - `recurrenceInterval` (optional): Interval value (for simple schedules)
  - `recurrenceIntervalUnit` (optional): Interval unit ("MINUTE", "HOUR", "DAY", "WEEK", "MONTH")
  - `cronExpression` (optional): Cron expression (for cron schedules)
- `outputFormats` (optional, array): Output formats (default: ["pdf"])
- `parameters` (optional, object): Default report parameters
- `recipients` (optional, array): Email addresses for job results
- `repositoryDestination` (optional, string): Repository folder to save results
- `description` (optional, string): Job description (max 1000 chars)

**JasperReports Server Requirements:**
- Minimum version: 7.8.0 (basic scheduling), 8.0.0+ (advanced features)
- Job scheduling must be enabled
- Email configuration required for recipients

**Permission Requirements:**
- ROLE_ADMINISTRATOR (required for job management)
- Execute permissions on target report
- Write permissions on repository destination (if specified)

**Response:**
```json
{
  "success": true,
  "jobId": "job_12345",
  "jobUri": "/jobs/monthly_sales_job",
  "creationTime": "2024-01-20T10:00:00Z",
  "nextExecution": "2024-02-01T09:00:00Z",
  "schedule": {
    "type": "simple",
    "recurrenceInterval": 1,
    "recurrenceIntervalUnit": "MONTH"
  },
  "outputFormats": ["pdf", "xlsx"],
  "recipientCount": 3
}
```

**Schedule Types:**

*Simple Schedule (recurring intervals):*
```json
{
  "type": "simple",
  "startDate": "2024-01-01T09:00:00Z",
  "recurrenceInterval": 1,
  "recurrenceIntervalUnit": "DAY"
}
```

*Calendar Schedule (specific dates):*
```json
{
  "type": "calendar",
  "startDate": "2024-01-01T09:00:00Z",
  "endDate": "2024-12-31T09:00:00Z"
}
```

*Cron Schedule (advanced timing):*
```json
{
  "type": "cron",
  "cronExpression": "0 0 9 1 * ?",
  "startDate": "2024-01-01T00:00:00Z"
}
```

**Examples:**

*Daily report job:*
```json
{
  "label": "Daily Sales Summary",
  "description": "Automated daily sales summary report",
  "reportUri": "/reports/sales/daily_summary",
  "outputFormats": ["pdf", "xlsx"],
  "parameters": {
    "auto_date": true,
    "department": "ALL"
  },
  "schedule": {
    "type": "simple",
    "startDate": "2024-01-01T06:00:00Z",
    "recurrenceInterval": 1,
    "recurrenceIntervalUnit": "DAY"
  },
  "recipients": [
    "sales.manager@company.com",
    "finance.team@company.com"
  ],
  "repositoryDestination": "/reports/automated/daily"
}
```

*Monthly report with cron schedule:*
```json
{
  "label": "Monthly Financial Report",
  "reportUri": "/reports/finance/monthly_summary",
  "outputFormats": ["pdf"],
  "schedule": {
    "type": "cron",
    "cronExpression": "0 0 9 1 * ?",
    "startDate": "2024-01-01T00:00:00Z"
  },
  "recipients": ["cfo@company.com"],
  "parameters": {
    "include_forecast": true,
    "currency": "USD"
  }
}
```

**Common Issues:**
- **Permission denied**: Requires ROLE_ADMINISTRATOR
- **Invalid cron expressions**: Syntax errors in cron schedules
- **Email configuration**: Server email not configured for recipients
- **Parameter conflicts**: Static parameters may conflict with dynamic data

**Troubleshooting:**
1. Verify user has ROLE_ADMINISTRATOR role
2. Test cron expressions with online validators
3. Check server email configuration
4. Test report execution manually before scheduling

---

### jasper_list_jobs

List and filter scheduled jobs with comprehensive search and pagination options.

**Description:**
Retrieves scheduled jobs with filtering by owner, report, status, and other criteria. Provides detailed job information including next execution times and current status.

**Parameters:**
- `limit` (optional, number): Maximum results (1-1000, default: 100)
- `offset` (optional, number): Pagination offset (default: 0)
- `owner` (optional, string): Filter by job owner (max 100 chars)
- `searchQuery` (optional, string): Search term for job labels (max 200 chars)
- `sortBy` (optional, string): Sort field (default: "label")
  - `"label"`: Job name
  - `"owner"`: Job owner
  - `"state"`: Job state
  - `"nextFireTime"`: Next execution time
- `sortOrder` (optional, string): Sort direction ("asc" or "desc", default: "asc")

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Job scheduling enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (to see all jobs)
- ROLE_USER (to see own jobs only)

**Response:**
```json
{
  "jobs": [
    {
      "id": "job_12345",
      "label": "Monthly Sales Report Job",
      "description": "Automated monthly sales analysis",
      "reportUri": "/reports/sales/monthly",
      "owner": "jasperadmin",
      "state": "NORMAL",
      "nextFireTime": "2024-02-01T09:00:00Z",
      "previousFireTime": "2024-01-01T09:00:00Z",
      "creationDate": "2023-12-01T10:00:00Z",
      "outputFormats": ["pdf", "xlsx"],
      "recipientCount": 3,
      "schedule": {
        "type": "simple",
        "recurrenceInterval": 1,
        "recurrenceIntervalUnit": "MONTH"
      }
    }
  ],
  "totalCount": 15,
  "offset": 0,
  "limit": 100,
  "hasMore": false
}
```

**Job States:**
- `"NORMAL"`: Job is active and scheduled
- `"PAUSED"`: Job is temporarily disabled
- `"COMPLETE"`: Job has finished (for one-time jobs)
- `"ERROR"`: Job encountered an error
- `"BLOCKED"`: Job is blocked by system conditions

**Examples:**

*List all jobs for current user:*
```json
{
  "limit": 50,
  "sortBy": "nextFireTime",
  "sortOrder": "asc"
}
```

*Search jobs by name:*
```json
{
  "searchQuery": "sales",
  "limit": 20
}
```

*List jobs by specific owner:*
```json
{
  "owner": "report.admin",
  "sortBy": "state"
}
```

---

### jasper_update_job

Modify existing scheduled job configuration including schedule, parameters, and recipients.

**Description:**
Updates job properties while preserving execution history. Supports partial updates allowing modification of specific job aspects without affecting others.

**Parameters:**
- `jobId` (required, string): Job identifier (1-100 chars)
- `label` (optional, string): New job name (1-200 chars)
- `description` (optional, string): New description (max 1000 chars)
- `schedule` (optional, object): Updated schedule configuration
- `outputFormats` (optional, array): New output formats
- `parameters` (optional, object): Updated report parameters
- `recipients` (optional, array): Updated email recipients

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Job must exist and be modifiable

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all jobs)
- Job owner (for own jobs)

**Response:**
```json
{
  "success": true,
  "jobId": "job_12345",
  "updateTime": "2024-01-20T14:30:00Z",
  "nextExecution": "2024-02-01T09:00:00Z",
  "changedFields": ["schedule", "recipients", "parameters"],
  "validationWarnings": []
}
```

**Examples:**

*Update job schedule:*
```json
{
  "jobId": "job_12345",
  "schedule": {
    "type": "simple",
    "recurrenceInterval": 2,
    "recurrenceIntervalUnit": "WEEK"
  }
}
```

*Update recipients and parameters:*
```json
{
  "jobId": "job_12345",
  "recipients": [
    "new.manager@company.com",
    "team.lead@company.com"
  ],
  "parameters": {
    "department": "SALES_NORTH",
    "include_forecast": true
  }
}
```

**Common Issues:**
- **Job not found**: Invalid job ID or job deleted
- **Permission denied**: User cannot modify job
- **Schedule conflicts**: Invalid schedule configuration
- **Parameter validation**: Invalid parameter values

---

### jasper_delete_job

Remove scheduled jobs from the system with optional force deletion.

**Description:**
Permanently deletes scheduled jobs and their execution history. Provides safety checks to prevent accidental deletion of active jobs.

**Parameters:**
- `jobId` (required, string): Job identifier (1-100 chars)
- `force` (optional, boolean): Force deletion of running jobs (default: false)

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Job must exist

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all jobs)
- Job owner (for own jobs)

**Response:**
```json
{
  "success": true,
  "jobId": "job_12345",
  "deleteTime": "2024-01-20T16:00:00Z",
  "executionHistoryDeleted": true,
  "relatedResourcesCleanup": ["output_files", "email_logs"]
}
```

**Examples:**

*Safe job deletion:*
```json
{
  "jobId": "job_12345"
}
```

*Force delete active job:*
```json
{
  "jobId": "job_12345",
  "force": true
}
```

**Common Issues:**
- **Job currently running**: Cannot delete without force=true
- **Dependency conflicts**: Job referenced by other system components
- **Permission denied**: Insufficient permissions for deletion

---

### jasper_run_job_now

Execute scheduled jobs immediately for testing or ad-hoc report generation.

**Description:**
Triggers immediate execution of scheduled jobs outside their normal schedule. Useful for testing job configuration or generating reports on demand.

**Parameters:**
- `jobId` (required, string): Job identifier (1-100 chars)
- `parameters` (optional, object): Override parameters for this execution

**JasperReports Server Requirements:**
- Minimum version: 7.8.0
- Job must be in executable state

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all jobs)
- Job owner (for own jobs)

**Response:**
```json
{
  "success": true,
  "jobId": "job_12345",
  "executionId": "immediate_exec_67890",
  "executionTime": "2024-01-20T10:15:00Z",
  "status": "running",
  "estimatedDuration": 120,
  "outputFormats": ["pdf", "xlsx"]
}
```

**Examples:**

*Execute job with default parameters:*
```json
{
  "jobId": "job_12345"
}
```

*Execute with parameter overrides:*
```json
{
  "jobId": "job_12345",
  "parameters": {
    "report_date": "2024-01-20",
    "department": "FINANCE",
    "urgent": true
  }
}
```

**Common Issues:**
- **Job already running**: Cannot start multiple instances
- **Resource conflicts**: Server resources unavailable
- **Parameter validation**: Override parameters fail validation

**Troubleshooting:**
1. Check job status before immediate execution
2. Verify server has available resources
3. Validate override parameters separately first
4. Monitor execution progress with execution status tools

## Administrative Tools

### jasper_manage_permissions

Manage permissions on resources and users.

**Parameters:**
- `resourceUri` (required): URI of the resource
- `permissions` (required): Array of permission objects
- `operation` (required): Operation type ("set", "add", "remove")

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/monthly",
  "permissionsUpdated": 3,
  "updateTime": "2024-01-20T11:00:00Z"
}
```

### jasper_manage_users

Manage users and roles in the system.

**Parameters:**
- `operation` (required): Operation type ("create", "update", "delete", "list")
- `username` (optional): Username for user operations
- `userDetails` (optional): User details object
- `roles` (optional): Array of role assignments

**Response:**
```json
{
  "success": true,
  "operation": "create",
  "username": "new_user",
  "userId": "user_12345",
  "rolesAssigned": ["ROLE_USER", "ROLE_REPORT_VIEWER"]
}
```

### jasper_manage_domains

Manage semantic layer domains and schemas.

**Parameters:**
- `operation` (required): Operation type ("list", "get", "create", "update", "delete")
- `domainUri` (optional): URI of the domain
- `domainDefinition` (optional): Domain definition object

**Response:**
```json
{
  "success": true,
  "operation": "list",
  "domains": [
    {
      "uri": "/domains/sales_domain",
      "label": "Sales Domain",
      "description": "Sales data semantic layer"
    }
  ]
}
```

## Error Responses

All tools return consistent error responses when operations fail:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication failed: Invalid credentials",
    "details": {
      "statusCode": 401,
      "jasperErrorCode": "authentication.failed"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Authentication failed or required
- `PERMISSION_DENIED`: Insufficient permissions for operation
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `INVALID_REQUEST`: Invalid parameters or request format
- `RESOURCE_CONFLICT`: Resource already exists or conflict
- `INTERNAL_ERROR`: Server-side error
- `SERVICE_UNAVAILABLE`: JasperReports Server unavailable
- `VALIDATION_ERROR`: Input validation failed

## Content Encoding

All file content (JRXML, images, etc.) must be provided as base64-encoded strings. The server handles encoding/decoding automatically.

## Authentication Context

Most tools require prior authentication using `jasper_authenticate`. The server maintains session state between tool calls within the same MCP session.## D
omain Management Tools

### jasper_list_domains

List semantic layer domains with filtering and search capabilities.

**Description:**
Retrieves available semantic layer domains that provide business-friendly views of underlying data sources. Domains enable non-technical users to create reports using business terminology.

**Parameters:**
- `folderUri` (optional, string): Folder to search (pattern: `/[a-zA-Z0-9_/\-\.]*`)
- `nameFilter` (optional, string): Filter by domain name (max 200 chars)
- `descriptionFilter` (optional, string): Filter by description (max 500 chars)
- `recursive` (optional, boolean): Include subfolders (default: false)
- `limit` (optional, number): Maximum results (1-1000, default: 100)
- `offset` (optional, number): Pagination offset (default: 0)
- `sortBy` (optional, string): Sort field ("label", "uri", "type", "creationDate", "updateDate")

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Semantic layer feature enabled
- Domain access permissions

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on domains and underlying data sources

**Response:**
```json
{
  "domains": [
    {
      "uri": "/domains/sales_domain",
      "label": "Sales Domain",
      "description": "Sales data semantic layer with customer and product dimensions",
      "creationDate": "2024-01-15T10:00:00Z",
      "updateDate": "2024-01-20T14:30:00Z",
      "owner": "domain.admin",
      "schemaVersion": "1.2",
      "dataSourceCount": 3,
      "fieldCount": 45
    }
  ],
  "totalCount": 8,
  "offset": 0,
  "limit": 100,
  "hasMore": false
}
```

---

### jasper_get_domain

Retrieve detailed domain information including metadata and structure.

**Description:**
Fetches comprehensive domain details including field definitions, relationships, and metadata. Essential for understanding domain structure before creating domain-based reports.

**Parameters:**
- `domainUri` (required, string): Domain path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `includeMetadata` (optional, boolean): Include domain metadata (default: true)
- `includePermissions` (optional, boolean): Include permission information (default: false)
- `includeSchema` (optional, boolean): Include schema information (default: false)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Domain must exist and be accessible

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on target domain

**Response:**
```json
{
  "uri": "/domains/sales_domain",
  "label": "Sales Domain",
  "description": "Comprehensive sales data semantic layer",
  "creationDate": "2024-01-15T10:00:00Z",
  "updateDate": "2024-01-20T14:30:00Z",
  "owner": "domain.admin",
  "metadata": {
    "schemaVersion": "1.2",
    "dataSourceUris": [
      "/datasources/sales_db",
      "/datasources/customer_db",
      "/datasources/product_db"
    ],
    "fieldCount": 45,
    "joinCount": 8,
    "calculatedFieldCount": 12
  },
  "permissions": {
    "canRead": true,
    "canWrite": false,
    "canExecute": true
  }
}
```

---

### jasper_get_domain_schema

Retrieve detailed domain schema including fields, joins, and calculated fields.

**Description:**
Fetches complete domain schema information including field definitions, data types, relationships, and calculated field expressions. Critical for understanding domain structure and building domain queries.

**Parameters:**
- `domainUri` (required, string): Domain path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `includeFields` (optional, boolean): Include field definitions (default: true)
- `includeJoins` (optional, boolean): Include join definitions (default: true)
- `includeCalculatedFields` (optional, boolean): Include calculated fields (default: true)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Domain schema must be accessible

**Permission Requirements:**
- ROLE_USER minimum
- Read permissions on domain and underlying data sources

**Response:**
```json
{
  "domainUri": "/domains/sales_domain",
  "schema": {
    "fields": [
      {
        "name": "customer_name",
        "label": "Customer Name",
        "description": "Full customer name",
        "dataType": "text",
        "fieldType": "dimension",
        "tableName": "customers",
        "columnName": "name",
        "nullable": false,
        "defaultAggregation": null
      },
      {
        "name": "sales_amount",
        "label": "Sales Amount",
        "description": "Total sales amount in USD",
        "dataType": "numeric",
        "fieldType": "measure",
        "tableName": "sales",
        "columnName": "amount",
        "nullable": true,
        "defaultAggregation": "sum"
      }
    ],
    "joins": [
      {
        "id": "customer_sales_join",
        "leftTable": "customers",
        "rightTable": "sales",
        "joinType": "inner",
        "joinExpression": "customers.id = sales.customer_id"
      }
    ],
    "calculatedFields": [
      {
        "name": "profit_margin",
        "label": "Profit Margin %",
        "description": "Calculated profit margin percentage",
        "dataType": "numeric",
        "expression": "(sales_amount - cost_amount) / sales_amount * 100",
        "fieldType": "measure",
        "defaultAggregation": "average"
      }
    ]
  }
}
```

## Permission Management Tools

### jasper_get_permissions

Retrieve permission information for resources and users.

**Description:**
Fetches detailed permission information including user permissions, role assignments, and inheritance rules. Essential for understanding and auditing access control.

**Parameters:**
- `resourceUri` (required, string): Resource path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `includeInherited` (optional, boolean): Include inherited permissions (default: true)
- `resolveAll` (optional, boolean): Resolve all permission details (default: false)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Permission system enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for full permission details)
- Resource owner (for own resources)
- ROLE_USER (for basic permission info)

**Response:**
```json
{
  "resourceUri": "/reports/sales/confidential",
  "permissions": [
    {
      "recipient": "ROLE_SALES_MANAGER",
      "recipientType": "role",
      "mask": 32,
      "permissions": ["read", "write", "execute"],
      "inherited": false,
      "source": "direct"
    },
    {
      "recipient": "sales.director",
      "recipientType": "user", 
      "mask": 31,
      "permissions": ["read", "write", "execute", "delete", "administer"],
      "inherited": false,
      "source": "direct"
    }
  ],
  "inheritedPermissions": [
    {
      "recipient": "ROLE_USER",
      "recipientType": "role",
      "mask": 1,
      "permissions": ["read"],
      "inherited": true,
      "source": "/reports/sales"
    }
  ],
  "effectivePermissions": {
    "canRead": true,
    "canWrite": true,
    "canExecute": true,
    "canDelete": false,
    "canAdminister": false
  }
}
```

---

### jasper_set_permissions

Set or modify permissions on resources for users and roles.

**Description:**
Updates resource permissions with support for user and role-based access control. Provides fine-grained permission management with inheritance and override capabilities.

**Parameters:**
- `resourceUri` (required, string): Resource path (2-500 chars, pattern: `/[a-zA-Z0-9_/\-\.]+`)
- `permissions` (required, array): Permission assignments
  - `recipient` (required): User or role name (1-100 chars)
  - `mask` (required): Permission mask (0-31, bitwise permissions)
- `replaceAll` (optional, boolean): Replace all existing permissions (default: false)

**Permission Masks:**
- `1`: Read (view resource)
- `2`: Write (modify resource)
- `4`: Delete (remove resource)
- `8`: Execute (run reports)
- `16`: Administer (manage permissions)
- `32`: Full access (all permissions)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Permission management enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all resources)
- Resource owner with administer permissions

**Response:**
```json
{
  "success": true,
  "resourceUri": "/reports/sales/confidential",
  "permissionsSet": 3,
  "updateTime": "2024-01-20T15:30:00Z",
  "changes": [
    {
      "recipient": "ROLE_SALES_ANALYST",
      "action": "added",
      "permissions": ["read", "execute"]
    },
    {
      "recipient": "temp.user",
      "action": "removed",
      "permissions": []
    }
  ]
}
```

## User Management Tools

### jasper_create_user

Create new user accounts with role assignments and profile information.

**Description:**
Creates new user accounts in JasperReports Server with comprehensive profile information, role assignments, and security settings.

**Parameters:**
- `username` (required, string): Username (1-100 chars, pattern: `[a-zA-Z0-9_\-\.]+`)
- `password` (required, string): Password (6-100 chars)
- `fullName` (required, string): Full display name (1-200 chars)
- `emailAddress` (optional, string): Email address (valid email format, max 200 chars)
- `enabled` (optional, boolean): Account enabled status (default: true)
- `roles` (optional, array): Role assignments (array of role names)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- User management enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (required for user creation)

**Response:**
```json
{
  "success": true,
  "username": "report.analyst",
  "userId": "user_12345",
  "creationTime": "2024-01-20T10:30:00Z",
  "rolesAssigned": ["ROLE_USER", "ROLE_REPORT_VIEWER"],
  "profileComplete": true,
  "initialPasswordSet": true
}
```

---

### jasper_list_users

List user accounts with filtering, search, and pagination options.

**Description:**
Retrieves user account information with comprehensive filtering and search capabilities. Supports pagination for large user bases.

**Parameters:**
- `limit` (optional, number): Maximum results (1-1000, default: 100)
- `offset` (optional, number): Pagination offset (default: 0)
- `searchQuery` (optional, string): Search term for usernames/names (max 200 chars)
- `includeRoles` (optional, boolean): Include role information (default: false)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all users)
- ROLE_USER (for limited user info)

**Response:**
```json
{
  "users": [
    {
      "username": "report.analyst",
      "fullName": "Report Analyst",
      "emailAddress": "analyst@company.com",
      "enabled": true,
      "creationDate": "2024-01-20T10:30:00Z",
      "lastLoginDate": "2024-01-22T09:15:00Z",
      "roles": ["ROLE_USER", "ROLE_REPORT_VIEWER"]
    }
  ],
  "totalCount": 45,
  "offset": 0,
  "limit": 100,
  "hasMore": false
}
```

---

### jasper_update_user

Update existing user account information and role assignments.

**Description:**
Modifies user account properties including profile information, role assignments, and account status with partial update support.

**Parameters:**
- `username` (required, string): Username to update (1-100 chars, pattern: `[a-zA-Z0-9_\-\.]+`)
- `fullName` (optional, string): New full name (1-200 chars)
- `emailAddress` (optional, string): New email address (valid email, max 200 chars)
- `enabled` (optional, boolean): Account enabled status
- `roles` (optional, array): New role assignments

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- User must exist

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for all users)
- Self-update (for own profile, limited fields)

**Response:**
```json
{
  "success": true,
  "username": "report.analyst",
  "updateTime": "2024-01-20T14:45:00Z",
  "changedFields": ["emailAddress", "roles"],
  "rolesAssigned": ["ROLE_USER", "ROLE_REPORT_DESIGNER"],
  "profileUpdated": true
}
```

## Health Monitoring Tools

### jasper_health_status

Get comprehensive health status of JasperReports MCP Server and connected systems.

**Description:**
Provides overall system health information including server connectivity, authentication status, performance metrics, and component health checks.

**Parameters:**
- `includeDetails` (optional, boolean): Include detailed health info (default: true)
- `includeResilience` (optional, boolean): Include resilience statistics (default: true)

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Health monitoring enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for detailed health info)
- ROLE_USER (for basic health status)

**Response:**
```json
{
  "overallHealth": "healthy",
  "timestamp": "2024-01-20T15:00:00Z",
  "components": {
    "jasperServerConnectivity": {
      "status": "healthy",
      "responseTime": 145,
      "lastCheck": "2024-01-20T15:00:00Z"
    },
    "authentication": {
      "status": "healthy",
      "sessionValid": true,
      "lastAuth": "2024-01-20T14:30:00Z"
    },
    "repositoryAccess": {
      "status": "healthy",
      "readOperations": 1250,
      "writeOperations": 45
    }
  },
  "performance": {
    "averageResponseTime": 234,
    "requestsPerMinute": 15,
    "errorRate": 0.02
  },
  "resilience": {
    "retryAttempts": 12,
    "circuitBreakerStatus": "closed",
    "cacheHitRate": 0.85
  }
}
```

---

### jasper_deep_health_check

Perform comprehensive deep health check of all system components.

**Description:**
Executes thorough health checks across all system components including connectivity tests, performance benchmarks, and resource validation.

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Full system access for comprehensive testing

**Permission Requirements:**
- ROLE_ADMINISTRATOR (required for deep health checks)

**Response:**
```json
{
  "overallStatus": "healthy",
  "executionTime": 2340,
  "timestamp": "2024-01-20T15:05:00Z",
  "detailedResults": {
    "connectivity": {
      "status": "passed",
      "tests": 5,
      "failures": 0,
      "averageLatency": 145
    },
    "authentication": {
      "status": "passed", 
      "authMethods": ["basic", "login"],
      "sessionManagement": "working"
    },
    "repository": {
      "status": "passed",
      "resourceCount": 1250,
      "accessibleResources": 1248,
      "permissionIssues": 2
    },
    "performance": {
      "status": "warning",
      "memoryUsage": 0.78,
      "cpuUsage": 0.45,
      "recommendations": ["Consider increasing memory allocation"]
    }
  }
}
```

---

### jasper_performance_metrics

Get detailed performance metrics including memory usage and system statistics.

**Description:**
Retrieves comprehensive performance metrics for monitoring system health, identifying bottlenecks, and optimizing resource usage.

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Performance monitoring enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for detailed metrics)

**Response:**
```json
{
  "timestamp": "2024-01-20T15:10:00Z",
  "system": {
    "memoryUsage": {
      "used": 512,
      "total": 1024,
      "percentage": 0.50
    },
    "cpuUsage": 0.35,
    "uptime": 86400
  },
  "mcp": {
    "totalRequests": 15420,
    "successfulRequests": 15234,
    "failedRequests": 186,
    "averageResponseTime": 234,
    "requestsPerMinute": 15.2
  },
  "jasperServer": {
    "connectionPoolSize": 10,
    "activeConnections": 3,
    "averageQueryTime": 145,
    "cacheHitRate": 0.85
  },
  "resilience": {
    "retryAttempts": 45,
    "circuitBreakerTrips": 2,
    "timeouts": 8,
    "recoveryTime": 1200
  }
}
```

---

### jasper_component_health

Test health of specific system components individually.

**Description:**
Performs targeted health checks on individual system components for detailed diagnostics and troubleshooting.

**Parameters:**
- `component` (required, string): Component to test
  - `"jasperServerConnectivity"`: Server connection test
  - `"authentication"`: Authentication system test
  - `"repositoryAccess"`: Repository access test
  - `"systemPerformance"`: Performance benchmark
  - `"memory"`: Memory usage analysis
  - `"connectionPool"`: Connection pool health
  - `"cache"`: Cache system health

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Component must be available for testing

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for system components)
- ROLE_USER (for basic connectivity tests)

**Response:**
```json
{
  "component": "jasperServerConnectivity",
  "status": "healthy",
  "timestamp": "2024-01-20T15:15:00Z",
  "details": {
    "connectionTest": "passed",
    "responseTime": 145,
    "serverVersion": "8.2.0",
    "apiVersion": "v2",
    "features": ["reports", "domains", "jobs"]
  },
  "recommendations": [],
  "warnings": []
}
```

---

### jasper_resilience_stats

Get detailed resilience and performance statistics for system monitoring.

**Description:**
Provides comprehensive resilience metrics including retry statistics, cache performance, connection pool usage, and error recovery information.

**Parameters:**
- `component` (optional, string): Specific component stats (default: "all")
  - `"retry"`: Retry mechanism statistics
  - `"cache"`: Cache performance metrics
  - `"connectionPool"`: Connection pool statistics
  - `"memory"`: Memory management metrics
  - `"all"`: All resilience statistics

**JasperReports Server Requirements:**
- Minimum version: 8.0.0
- Resilience monitoring enabled

**Permission Requirements:**
- ROLE_ADMINISTRATOR (for detailed statistics)

**Response:**
```json
{
  "timestamp": "2024-01-20T15:20:00Z",
  "retry": {
    "totalAttempts": 145,
    "successfulRetries": 132,
    "failedRetries": 13,
    "averageRetryDelay": 1500,
    "maxRetryAttempts": 3
  },
  "cache": {
    "hitRate": 0.85,
    "missRate": 0.15,
    "totalRequests": 5420,
    "cacheSize": 256,
    "evictions": 45
  },
  "connectionPool": {
    "totalConnections": 10,
    "activeConnections": 3,
    "idleConnections": 7,
    "connectionWaitTime": 50,
    "connectionLeaks": 0
  },
  "memory": {
    "heapUsage": 0.65,
    "gcFrequency": 12,
    "memoryLeaks": 0,
    "largeObjectAllocations": 8
  }
}
```

## Error Responses

All tools return consistent error responses when operations fail:

```json
{
  "success": false,
  "toolName": "jasper_run_report_sync",
  "executionTime": 1250,
  "timestamp": "2024-01-20T10:30:00Z",
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication failed: Invalid credentials",
    "details": {
      "statusCode": 401,
      "jasperErrorCode": "authentication.failed",
      "correlationId": "req_12345",
      "suggestions": [
        "Verify username and password are correct",
        "Check if account is enabled and not locked",
        "Re-authenticate using jasper_authenticate tool"
      ]
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Authentication failed or required
- `PERMISSION_DENIED`: Insufficient permissions for operation
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `INVALID_REQUEST`: Invalid parameters or request format
- `RESOURCE_CONFLICT`: Resource already exists or conflict
- `INTERNAL_ERROR`: Server-side error
- `SERVICE_UNAVAILABLE`: JasperReports Server unavailable
- `VALIDATION_ERROR`: Input validation failed
- `EXECUTION_TIMEOUT`: Operation timed out
- `QUOTA_EXCEEDED`: Resource quota or limit exceeded

### Error Context Information

Each error includes contextual information to aid in troubleshooting:

- **Correlation ID**: Unique identifier for request tracking
- **Tool Name**: Which tool generated the error
- **Execution Time**: How long the operation took before failing
- **Suggestions**: Actionable recommendations for resolving the issue
- **Status Code**: HTTP status code from JasperReports Server
- **Jasper Error Code**: Specific error code from JasperReports Server

## Content Encoding

All file content (JRXML, images, etc.) must be provided as base64-encoded strings. The server handles encoding/decoding automatically.

**Example:**
```javascript
// Encode file content to base64
const fs = require('fs');
const fileContent = fs.readFileSync('report.jrxml');
const base64Content = fileContent.toString('base64');

// Use in tool call
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/reports/my_report",
    "label": "My Report",
    "jrxmlContent": base64Content
  }
}
```

## Authentication Context

Most tools require prior authentication using `jasper_authenticate`. The server maintains session state between tool calls within the same MCP session.

**Session Management:**
- Sessions are maintained automatically between tool calls
- Session expiration is handled with automatic re-authentication
- Multi-tenant sessions maintain organization context
- Session state is preserved across tool executions

**Best Practices:**
1. Authenticate once at the beginning of your session
2. Handle authentication errors gracefully with re-authentication
3. Use `jasper_test_connection` to verify session validity
4. Monitor session expiration and refresh as needed

This completes the comprehensive API documentation for all JasperReports MCP Server tools.