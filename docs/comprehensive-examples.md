# JasperReports MCP Server Comprehensive Examples

This document provides practical examples and usage patterns for all MCP tools, organized by common use cases and workflows.

## Table of Contents

1. [Getting Started Examples](#getting-started-examples)
2. [Authentication Workflows](#authentication-workflows)
3. [Resource Management Workflows](#resource-management-workflows)
4. [Report Execution Patterns](#report-execution-patterns)
5. [Job Management Scenarios](#job-management-scenarios)
6. [Input Control Handling](#input-control-handling)
7. [Administrative Operations](#administrative-operations)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Integration Patterns](#integration-patterns)

## Getting Started Examples

### Basic Connection Test
```json
{
  "tool": "jasper_test_connection",
  "parameters": {
    "includeAuth": true,
    "timeout": 10000
  }
}
```

**Expected Response:**
```json
{
  "connected": true,
  "authenticated": true,
  "serverInfo": {
    "version": "8.2.0",
    "edition": "Professional"
  },
  "responseTime": 150
}
```

### Initial Authentication
```json
{
  "tool": "jasper_authenticate",
  "parameters": {
    "authType": "login"
  }
}
```

### Repository Exploration
```json
{
  "tool": "jasper_list_resources",
  "parameters": {
    "folderUri": "/",
    "recursive": false,
    "resourceType": "folder",
    "limit": 20
  }
}
```

## Authentication Workflows

### Multi-Tenant Authentication
```json
// Step 1: Authenticate with specific organization
{
  "tool": "jasper_authenticate",
  "parameters": {
    "authType": "login",
    "username": "admin",
    "password": "admin_password",
    "organization": "organization_1"
  }
}

// Step 2: Verify authentication and organization context
{
  "tool": "jasper_test_connection",
  "parameters": {
    "includeAuth": true
  }
}
```

### Session Management Pattern
```json
// Check if session is still valid
{
  "tool": "jasper_test_connection",
  "parameters": {
    "includeAuth": true,
    "timeout": 5000
  }
}

// If authentication fails, re-authenticate
{
  "tool": "jasper_authenticate",
  "parameters": {
    "forceReauth": true
  }
}
```

### Development vs Production Authentication
```json
// Development (with override credentials)
{
  "tool": "jasper_authenticate",
  "parameters": {
    "authType": "basic",
    "username": "jasperadmin",
    "password": "jasperadmin"
  }
}

// Production (using environment configuration)
{
  "tool": "jasper_authenticate",
  "parameters": {}
}
```

## Resource Management Workflows

### Complete Report Upload Workflow
```json
// Step 1: Create folder structure
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/reports/sales",
    "resourceType": "folder",
    "label": "Sales Reports",
    "description": "Sales department reports and analytics"
  }
}

// Step 2: Upload datasource
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/datasources/sales_db",
    "resourceType": "dataSource",
    "label": "Sales Database",
    "description": "Primary sales database connection"
  }
}

// Step 3: Upload report with embedded resources
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/reports/sales/monthly_sales",
    "resourceType": "reportUnit",
    "label": "Monthly Sales Report",
    "description": "Comprehensive monthly sales analysis with charts and tables",
    "jrxmlContent": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
    "dataSourceUri": "/datasources/sales_db",
    "localResources": [
      {
        "name": "company_logo.png",
        "type": "img",
        "content": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
        "contentType": "image/png"
      },
      {
        "name": "sales_subreport.jrxml",
        "type": "jrxml",
        "content": "PD94bWwgdmVyc2lvbj0iMS4wIi..."
      }
    ],
    "overwrite": true,
    "createFolders": true
  }
}

// Step 4: Verify upload success
{
  "tool": "jasper_get_resource",
  "parameters": {
    "resourceUri": "/reports/sales/monthly_sales",
    "includeContent": false,
    "includeMetadata": true
  }
}
```

### Repository Migration Pattern
```json
// Step 1: List all resources in source folder
{
  "tool": "jasper_list_resources",
  "parameters": {
    "folderUri": "/old_reports",
    "recursive": true,
    "resourceType": "reportUnit"
  }
}

// Step 2: For each resource, get full content
{
  "tool": "jasper_get_resource",
  "parameters": {
    "resourceUri": "/old_reports/legacy_report",
    "includeContent": true,
    "includeMetadata": true
  }
}

// Step 3: Upload to new location with updated metadata
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/new_reports/migrated_report",
    "label": "Migrated Legacy Report",
    "jrxmlContent": "...",
    "overwrite": true
  }
}

// Step 4: Clean up old resources (optional)
{
  "tool": "jasper_delete_resource",
  "parameters": {
    "resourceUri": "/old_reports/legacy_report"
  }
}
```

### Bulk Resource Operations
```json
// Pattern for bulk upload with error handling
const resources = [
  {
    "resourcePath": "/reports/finance/budget_report",
    "label": "Budget Report",
    "jrxmlContent": "..."
  },
  {
    "resourcePath": "/reports/finance/expense_report", 
    "label": "Expense Report",
    "jrxmlContent": "..."
  }
];

// Process each resource with error handling
for (const resource of resources) {
  try {
    const result = await executeTool("jasper_upload_resource", resource);
    console.log(`Successfully uploaded: ${resource.resourcePath}`);
  } catch (error) {
    console.error(`Failed to upload ${resource.resourcePath}:`, error);
    // Continue with next resource or implement retry logic
  }
}
```

## Report Execution Patterns

### Simple Synchronous Execution
```json
{
  "tool": "jasper_run_report_sync",
  "parameters": {
    "reportUri": "/reports/sales/daily_summary",
    "outputFormat": "pdf",
    "parameters": {
      "report_date": "2024-01-20",
      "department": "SALES"
    }
  }
}
```

### Asynchronous Execution with Monitoring
```json
// Step 1: Start async execution
{
  "tool": "jasper_run_report_async",
  "parameters": {
    "reportUri": "/reports/analytics/large_dataset",
    "outputFormat": "xlsx",
    "parameters": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "include_details": true
    }
  }
}

// Response: { "executionId": "async_exec_12345", "status": "queued" }

// Step 2: Monitor execution progress
{
  "tool": "jasper_get_execution_status",
  "parameters": {
    "executionId": "async_exec_12345",
    "includeDetails": true
  }
}

// Step 3: Download results when ready
{
  "tool": "jasper_get_execution_result",
  "parameters": {
    "executionId": "async_exec_12345",
    "exportId": "export_67890"
  }
}
```

### Multi-Format Report Generation
```json
// Generate same report in multiple formats
const formats = ["pdf", "xlsx", "csv"];
const reportUri = "/reports/sales/monthly_analysis";
const parameters = {
  "month": "2024-01",
  "region": "North America"
};

const executions = [];

// Start async executions for each format
for (const format of formats) {
  const result = await executeTool("jasper_run_report_async", {
    reportUri,
    outputFormat: format,
    parameters
  });
  executions.push({
    executionId: result.executionId,
    format: format
  });
}

// Monitor and download all formats
for (const execution of executions) {
  // Poll until ready
  let status;
  do {
    await sleep(2000);
    status = await executeTool("jasper_get_execution_status", {
      executionId: execution.executionId
    });
  } while (status.status === "queued" || status.status === "execution");
  
  // Download if successful
  if (status.status === "ready") {
    const result = await executeTool("jasper_get_execution_result", {
      executionId: execution.executionId,
      exportId: status.exports[0].id
    });
    // Save result with format-specific filename
    saveFile(`report_${execution.format}.${getFileExtension(execution.format)}`, result.content);
  }
}
```

### Parameterized Report Execution
```json
// Step 1: Get input controls to understand parameters
{
  "tool": "jasper_get_input_controls",
  "parameters": {
    "reportUri": "/reports/sales/parameterized_report",
    "includeValues": true
  }
}

// Step 2: Validate parameters before execution
{
  "tool": "jasper_validate_input_controls",
  "parameters": {
    "reportUri": "/reports/sales/parameterized_report",
    "parameters": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "department": "SALES",
      "include_charts": true
    }
  }
}

// Step 3: Execute with validated parameters
{
  "tool": "jasper_run_report_sync",
  "parameters": {
    "reportUri": "/reports/sales/parameterized_report",
    "outputFormat": "pdf",
    "parameters": {
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "department": "SALES",
      "include_charts": true
    },
    "locale": "en_US",
    "timezone": "America/New_York"
  }
}
```

## Job Management Scenarios

### Creating Scheduled Reports
```json
// Daily report job
{
  "tool": "jasper_create_job",
  "parameters": {
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
}

// Monthly report with cron schedule
{
  "tool": "jasper_create_job",
  "parameters": {
    "label": "Monthly Financial Report",
    "reportUri": "/reports/finance/monthly_summary",
    "outputFormats": ["pdf"],
    "schedule": {
      "type": "cron",
      "cronExpression": "0 0 9 1 * ?",
      "startDate": "2024-01-01T00:00:00Z"
    },
    "recipients": ["cfo@company.com"]
  }
}
```

### Job Management Workflow
```json
// Step 1: List existing jobs
{
  "tool": "jasper_list_jobs",
  "parameters": {
    "limit": 50,
    "sortBy": "nextFireTime",
    "sortOrder": "asc"
  }
}

// Step 2: Update job parameters
{
  "tool": "jasper_update_job",
  "parameters": {
    "jobId": "job_12345",
    "parameters": {
      "department": "SALES_NORTH",
      "include_forecast": true
    },
    "recipients": [
      "sales.manager@company.com",
      "regional.director@company.com"
    ]
  }
}

// Step 3: Execute job immediately for testing
{
  "tool": "jasper_run_job_now",
  "parameters": {
    "jobId": "job_12345"
  }
}

// Step 4: Monitor job execution
{
  "tool": "jasper_list_jobs",
  "parameters": {
    "owner": "current_user",
    "limit": 10
  }
}
```

## Input Control Handling

### Cascading Parameter Workflow
```json
// Step 1: Get initial input controls
{
  "tool": "jasper_get_input_controls",
  "parameters": {
    "reportUri": "/reports/sales/regional_analysis",
    "includeValues": true
  }
}

// Response shows country parameter with options

// Step 2: Set country to get dependent state/province options
{
  "tool": "jasper_set_input_control_values",
  "parameters": {
    "reportUri": "/reports/sales/regional_analysis",
    "controlValues": {
      "country": "USA"
    }
  }
}

// Response includes updated state options for USA

// Step 3: Set state to get city options
{
  "tool": "jasper_set_input_control_values",
  "parameters": {
    "reportUri": "/reports/sales/regional_analysis",
    "controlValues": {
      "country": "USA",
      "state": "CA"
    }
  }
}

// Step 4: Validate final parameter set
{
  "tool": "jasper_validate_input_controls",
  "parameters": {
    "reportUri": "/reports/sales/regional_analysis",
    "parameters": {
      "country": "USA",
      "state": "CA",
      "city": "San Francisco",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    }
  }
}

// Step 5: Execute report with validated parameters
{
  "tool": "jasper_run_report_sync",
  "parameters": {
    "reportUri": "/reports/sales/regional_analysis",
    "outputFormat": "pdf",
    "parameters": {
      "country": "USA",
      "state": "CA", 
      "city": "San Francisco",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    }
  }
}
```

### Dynamic Parameter Form Generation
```json
// Generate dynamic form based on input controls
{
  "tool": "jasper_get_input_controls",
  "parameters": {
    "reportUri": "/reports/dynamic/customer_report",
    "includeValues": true
  }
}

// Response structure for form generation:
{
  "inputControls": [
    {
      "id": "customer_type",
      "label": "Customer Type",
      "type": "singleSelect",
      "mandatory": true,
      "options": [
        {"label": "Enterprise", "value": "ENTERPRISE"},
        {"label": "SMB", "value": "SMB"}
      ]
    },
    {
      "id": "date_range",
      "label": "Date Range",
      "type": "singleValueDate",
      "mandatory": true,
      "defaultValue": "2024-01-01"
    }
  ]
}

// Use this structure to generate HTML form or UI components
```

## Administrative Operations

### User Management Workflow
```json
// Step 1: Create new user
{
  "tool": "jasper_create_user",
  "parameters": {
    "username": "report.analyst",
    "password": "secure_password_123",
    "fullName": "Report Analyst",
    "emailAddress": "analyst@company.com",
    "enabled": true,
    "roles": ["ROLE_USER"]
  }
}

// Step 2: List users to verify creation
{
  "tool": "jasper_list_users",
  "parameters": {
    "searchQuery": "analyst",
    "includeRoles": true
  }
}

// Step 3: Update user roles
{
  "tool": "jasper_update_user",
  "parameters": {
    "username": "report.analyst",
    "roles": ["ROLE_USER", "ROLE_REPORT_VIEWER"],
    "enabled": true
  }
}
```

### Permission Management
```json
// Step 1: Check current permissions
{
  "tool": "jasper_get_permissions",
  "parameters": {
    "resourceUri": "/reports/sales",
    "includeInherited": true
  }
}

// Step 2: Set specific permissions
{
  "tool": "jasper_set_permissions",
  "parameters": {
    "resourceUri": "/reports/sales/confidential",
    "permissions": [
      {
        "recipient": "ROLE_SALES_MANAGER",
        "mask": 32
      },
      {
        "recipient": "sales.director",
        "mask": 31
      }
    ],
    "replaceAll": false
  }
}
```

### Role Management
```json
// Step 1: Create custom role
{
  "tool": "jasper_create_role",
  "parameters": {
    "roleName": "ROLE_REPORT_DESIGNER",
    "description": "Users who can design and upload reports"
  }
}

// Step 2: List all roles
{
  "tool": "jasper_list_roles",
  "parameters": {
    "limit": 100,
    "sortBy": "roleName"
  }
}
```

## Error Handling Patterns

### Retry Logic with Exponential Backoff
```javascript
async function executeWithRetry(toolName, parameters, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeTool(toolName, parameters);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      if (isRetryableError(error)) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        throw error; // Don't retry non-retryable errors
      }
    }
  }
}

function isRetryableError(error) {
  const retryableCodes = [
    'CONNECTION_TIMEOUT',
    'SERVICE_UNAVAILABLE', 
    'INTERNAL_ERROR'
  ];
  return retryableCodes.includes(error.code);
}
```

### Circuit Breaker Pattern
```javascript
class JasperCircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(toolName, parameters) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await executeTool(toolName, parameters);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### Graceful Degradation
```javascript
async function executeReportWithFallback(reportUri, outputFormat, parameters) {
  try {
    // Try synchronous execution first
    return await executeTool('jasper_run_report_sync', {
      reportUri,
      outputFormat,
      parameters
    });
  } catch (syncError) {
    if (syncError.code === 'EXECUTION_TIMEOUT') {
      console.log('Sync execution timed out, falling back to async...');
      
      // Fallback to async execution
      const asyncResult = await executeTool('jasper_run_report_async', {
        reportUri,
        outputFormat,
        parameters
      });
      
      // Poll for completion
      return await pollAsyncExecution(asyncResult.executionId);
    }
    throw syncError;
  }
}
```

## Performance Optimization

### Connection Pooling Pattern
```javascript
class JasperConnectionManager {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.activeConnections = 0;
    this.queue = [];
  }
  
  async executeWithConnection(toolName, parameters) {
    if (this.activeConnections >= this.maxConnections) {
      await this.waitForConnection();
    }
    
    this.activeConnections++;
    try {
      return await executeTool(toolName, parameters);
    } finally {
      this.activeConnections--;
      this.processQueue();
    }
  }
  
  async waitForConnection() {
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }
  
  processQueue() {
    if (this.queue.length > 0 && this.activeConnections < this.maxConnections) {
      const resolve = this.queue.shift();
      resolve();
    }
  }
}
```

### Caching Strategy
```javascript
class JasperCache {
  constructor(ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async get(key, fetcher) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  // Cache resource metadata
  async getResource(resourceUri) {
    return this.get(`resource:${resourceUri}`, () =>
      executeTool('jasper_get_resource', {
        resourceUri,
        includeContent: false
      })
    );
  }
  
  // Cache input controls
  async getInputControls(reportUri) {
    return this.get(`controls:${reportUri}`, () =>
      executeTool('jasper_get_input_controls', {
        reportUri,
        includeValues: true
      })
    );
  }
}
```

### Batch Processing
```javascript
async function batchProcessReports(reports, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (report) => {
      try {
        return await executeTool('jasper_run_report_async', report);
      } catch (error) {
        return { error: error.message, report: report.reportUri };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Optional delay between batches to avoid overwhelming server
    if (i + batchSize < reports.length) {
      await sleep(1000);
    }
  }
  
  return results;
}
```

## Integration Patterns

### Webhook Integration
```javascript
// Example webhook handler for job completion notifications
app.post('/jasper-webhook', async (req, res) => {
  const { jobId, status, executionId } = req.body;
  
  if (status === 'completed') {
    try {
      // Get execution status
      const execStatus = await executeTool('jasper_get_execution_status', {
        executionId
      });
      
      if (execStatus.status === 'ready') {
        // Download and process results
        for (const exportInfo of execStatus.exports) {
          const result = await executeTool('jasper_get_execution_result', {
            executionId,
            exportId: exportInfo.id
          });
          
          // Process the report (save to file system, send email, etc.)
          await processReportResult(result, jobId);
        }
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }
  
  res.status(200).send('OK');
});
```

### Database Integration
```javascript
// Example: Store report metadata in database
async function syncReportsToDatabase() {
  const reports = await executeTool('jasper_list_resources', {
    folderUri: '/reports',
    resourceType: 'reportUnit',
    recursive: true,
    limit: 1000
  });
  
  for (const report of reports.items) {
    // Get detailed metadata
    const details = await executeTool('jasper_get_resource', {
      resourceUri: report.uri,
      includeMetadata: true
    });
    
    // Store in database
    await db.reports.upsert({
      uri: report.uri,
      label: report.label,
      description: report.description,
      lastModified: report.updateDate,
      metadata: details.metadata
    });
  }
}
```

### File System Integration
```javascript
// Example: Export all reports to file system
async function exportReportsToFileSystem(baseDir) {
  const reports = await executeTool('jasper_list_resources', {
    folderUri: '/reports',
    resourceType: 'reportUnit',
    recursive: true
  });
  
  for (const report of reports.items) {
    try {
      // Get JRXML content
      const content = await executeTool('jasper_get_resource', {
        resourceUri: report.uri,
        includeContent: true
      });
      
      // Create directory structure
      const filePath = path.join(baseDir, report.uri + '.jrxml');
      await fs.ensureDir(path.dirname(filePath));
      
      // Write JRXML file
      await fs.writeFile(filePath, Buffer.from(content.content, 'base64'));
      
      console.log(`Exported: ${report.uri}`);
    } catch (error) {
      console.error(`Failed to export ${report.uri}:`, error);
    }
  }
}
```

This comprehensive examples document provides practical patterns for using the JasperReports MCP Server tools in real-world scenarios. Each example includes error handling, performance considerations, and integration patterns that can be adapted to specific use cases.