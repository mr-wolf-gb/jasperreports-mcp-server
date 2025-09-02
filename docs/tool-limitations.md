# JasperReports MCP Server Tool Limitations and Workarounds

This document details known limitations of MCP tools and provides practical workarounds for common scenarios.

## General Limitations

### JasperReports Server Version Compatibility

| Feature | Minimum Version | Recommended Version | Notes |
|---------|----------------|-------------------|-------|
| Basic Authentication | 7.5.0 | 8.0.0+ | Enhanced security in newer versions |
| Resource Management | 7.5.0 | 8.0.0+ | Improved validation and error handling |
| Report Execution | 7.5.0 | 8.2.0+ | Better async execution support |
| Job Management | 7.8.0 | 8.2.0+ | Enhanced scheduling features |
| Input Controls | 7.8.0 | 8.0.0+ | Cascading controls support |
| Domain Management | 8.0.0 | 8.2.0+ | Full semantic layer support |
| User Management | 8.0.0 | 8.2.0+ | Role-based access control |
| Health Monitoring | 8.0.0 | 8.2.0+ | Comprehensive metrics |

### Performance Limitations

#### Synchronous Execution Limits
- **Maximum execution time**: 30 seconds (configurable)
- **Maximum response size**: 50MB
- **Concurrent executions**: Limited by server resources

**Workaround:**
Use asynchronous execution for long-running or large reports:
```json
{
  "tool": "jasper_run_report_async",
  "parameters": {
    "reportUri": "/reports/large_report",
    "outputFormat": "pdf"
  }
}
```

#### Memory Constraints
- **Large file uploads**: 50MB limit per resource
- **Report output size**: Memory-dependent
- **Concurrent operations**: Limited by available memory

**Workarounds:**
1. Split large uploads into smaller chunks
2. Use streaming for large downloads
3. Implement pagination for large result sets
4. Optimize report designs for memory efficiency

## Tool-Specific Limitations

### Authentication Tools

#### jasper_authenticate

**Limitations:**
1. **Session Management**: Sessions may expire unpredictably
2. **Multi-tenant Complexity**: Organization parameter required but not always validated
3. **Authentication Method Restrictions**: Some servers disable certain auth methods

**Workarounds:**
```json
// Implement session refresh logic
{
  "tool": "jasper_authenticate",
  "parameters": {
    "forceReauth": true
  }
}

// Test connection before critical operations
{
  "tool": "jasper_test_connection",
  "parameters": {
    "includeAuth": true
  }
}
```

#### jasper_test_connection

**Limitations:**
1. **Limited Diagnostics**: Cannot test specific server features
2. **Timeout Constraints**: Fixed timeout may not suit all environments
3. **SSL Issues**: Limited SSL troubleshooting capabilities

**Workarounds:**
- Use multiple timeout values for different network conditions
- Implement custom SSL certificate handling
- Combine with health monitoring tools for comprehensive testing

### Resource Management Tools

#### jasper_upload_resource

**Limitations:**
1. **JRXML Validation**: Limited to basic syntax checking
2. **Dependency Resolution**: Cannot automatically resolve missing dependencies
3. **Version Compatibility**: JRXML version must match server capabilities
4. **Atomic Operations**: No transaction support for multi-resource uploads

**Workarounds:**
```json
// Pre-validate JRXML with JasperSoft Studio
// Upload dependencies first, then main report
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/datasources/sales_db",
    "resourceType": "dataSource",
    "label": "Sales Database"
  }
}

// Then upload report referencing the datasource
{
  "tool": "jasper_upload_resource",
  "parameters": {
    "resourcePath": "/reports/sales_report",
    "resourceType": "reportUnit",
    "dataSourceUri": "/datasources/sales_db",
    "jrxmlContent": "..."
  }
}
```

#### jasper_list_resources

**Limitations:**
1. **Performance**: Recursive listing can be slow on large repositories
2. **Permission Filtering**: May return resources user cannot access
3. **Metadata Completeness**: Limited metadata in list view
4. **Search Capabilities**: Basic text search only

**Workarounds:**
```json
// Use targeted queries instead of recursive listing
{
  "tool": "jasper_list_resources",
  "parameters": {
    "folderUri": "/reports/sales",
    "resourceType": "reportUnit",
    "recursive": false,
    "limit": 50
  }
}

// Implement client-side filtering for complex searches
// Use multiple queries for different resource types
```

#### jasper_get_resource

**Limitations:**
1. **Content Size**: Large resources may cause memory issues
2. **Binary Content**: Limited support for binary resource types
3. **Relationship Depth**: Shallow dependency information
4. **Version History**: No access to resource version history

**Workarounds:**
```json
// Get metadata first, then content if needed
{
  "tool": "jasper_get_resource",
  "parameters": {
    "resourceUri": "/reports/large_report",
    "includeContent": false,
    "includeMetadata": true
  }
}

// For large resources, consider alternative access methods
```

### Report Execution Tools

#### jasper_run_report_sync

**Limitations:**
1. **Execution Time**: 30-second timeout limit
2. **Output Size**: Memory constraints for large reports
3. **Format Support**: Not all formats support all report features
4. **Parameter Complexity**: Limited support for complex parameter types

**Workarounds:**
```json
// Use page ranges to limit output size
{
  "tool": "jasper_run_report_sync",
  "parameters": {
    "reportUri": "/reports/large_report",
    "outputFormat": "pdf",
    "pages": "1-10"
  }
}

// Switch to async for long-running reports
{
  "tool": "jasper_run_report_async",
  "parameters": {
    "reportUri": "/reports/long_report",
    "outputFormat": "pdf"
  }
}
```

#### Output Format Limitations

| Format | Limitations | Workarounds |
|--------|-------------|-------------|
| PDF | Large file sizes, font dependencies | Use compression, embed fonts |
| HTML | Limited styling, security concerns | Use CSS frameworks, sanitize output |
| Excel | Row/column limits, formatting issues | Split large datasets, use templates |
| CSV | No formatting, encoding issues | Specify encoding, post-process formatting |

#### jasper_get_execution_result

**Limitations:**
1. **Export Expiration**: Results cleaned up after retention period
2. **Download Size**: Network timeout for very large files
3. **Concurrent Downloads**: Limited by server resources
4. **Retry Logic**: No built-in retry for failed downloads

**Workarounds:**
```json
// Download results promptly after completion
// Implement client-side retry logic
// Use streaming for large downloads
// Monitor execution status to predict completion
```

### Job Management Tools

#### jasper_create_job

**Limitations:**
1. **Permission Requirements**: Requires ROLE_ADMINISTRATOR
2. **Schedule Complexity**: Limited cron expression support
3. **Parameter Handling**: Static parameters only
4. **Error Handling**: Limited job failure recovery options

**Workarounds:**
```json
// Use administrative account for job operations
// Implement external scheduling for complex scenarios
// Create multiple jobs for different parameter sets
{
  "tool": "jasper_create_job",
  "parameters": {
    "label": "Monthly Sales - Department A",
    "reportUri": "/reports/sales/monthly",
    "parameters": {
      "department": "A"
    },
    "schedule": {
      "type": "simple",
      "recurrenceInterval": 1,
      "recurrenceIntervalUnit": "MONTH"
    }
  }
}
```

#### Job Monitoring Limitations
1. **Real-time Status**: Limited real-time job monitoring
2. **Execution History**: Limited historical data
3. **Failure Notifications**: Basic notification system
4. **Resource Usage**: No job resource usage metrics

### Input Control Tools

#### jasper_get_input_controls

**Limitations:**
1. **Cascading Complexity**: Limited support for complex cascading scenarios
2. **Dynamic Values**: Values may not reflect current data state
3. **Validation Rules**: Limited validation rule information
4. **Custom Controls**: Limited support for custom input control types

**Workarounds:**
```json
// Refresh control values before use
{
  "tool": "jasper_set_input_control_values",
  "parameters": {
    "reportUri": "/reports/sales/monthly",
    "controlValues": {
      "department": "SALES"
    }
  }
}

// Then get updated cascading values
{
  "tool": "jasper_get_input_controls",
  "parameters": {
    "reportUri": "/reports/sales/monthly",
    "includeValues": true
  }
}
```

#### jasper_validate_input_controls

**Limitations:**
1. **Validation Scope**: Basic validation only
2. **Cross-parameter Validation**: Limited cross-field validation
3. **Business Rules**: No business logic validation
4. **Performance**: Validation can be slow for complex controls

### Domain Management Tools

#### jasper_list_domains

**Limitations:**
1. **Version Requirements**: Requires JasperReports Server 8.0+
2. **Permission Complexity**: Complex permission requirements
3. **Metadata Completeness**: Limited domain metadata
4. **Performance**: Slow on servers with many domains

#### jasper_get_domain_schema

**Limitations:**
1. **Schema Complexity**: Limited support for complex schemas
2. **Join Information**: Basic join relationship information
3. **Calculated Fields**: Limited calculated field metadata
4. **Performance**: Large schemas may cause timeouts

### User Management Tools

#### Permission Requirements
All user management tools require ROLE_ADMINISTRATOR, limiting their use to administrative accounts.

**Workaround:**
Implement role-based tool access:
```json
// Check user permissions before attempting admin operations
{
  "tool": "jasper_get_permissions",
  "parameters": {
    "resourceUri": "/",
    "includeInherited": true
  }
}
```

#### jasper_create_user

**Limitations:**
1. **Password Policies**: Limited password policy enforcement
2. **Role Assignment**: Basic role assignment only
3. **User Attributes**: Limited custom attribute support
4. **Bulk Operations**: No bulk user creation

### Health Monitoring Tools

#### jasper_health_status

**Limitations:**
1. **Metric Granularity**: Limited detailed metrics
2. **Historical Data**: No historical health data
3. **Alerting**: No built-in alerting capabilities
4. **Custom Checks**: Limited custom health check support

## Network and Infrastructure Limitations

### SSL/TLS Constraints
1. **Certificate Validation**: Limited custom certificate handling
2. **Protocol Support**: May not support latest TLS versions
3. **Cipher Suites**: Limited cipher suite configuration
4. **Client Certificates**: No client certificate authentication

### Proxy Support
1. **Authentication**: Limited proxy authentication support
2. **Configuration**: Basic proxy configuration only
3. **Protocol Support**: HTTP proxies only
4. **Bypass Rules**: No proxy bypass configuration

### Load Balancing
1. **Session Affinity**: May require sticky sessions
2. **Health Checks**: Limited load balancer health check support
3. **Failover**: No automatic failover handling
4. **Connection Pooling**: Basic connection pool management

## Workaround Patterns

### Retry Logic Implementation
```json
// Implement exponential backoff for transient failures
function retryWithBackoff(toolCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await executeTool(toolCall);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### Batch Operation Pattern
```json
// Process large operations in batches
async function batchUpload(resources, batchSize = 5) {
  const results = [];
  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(resource => uploadResource(resource))
    );
    results.push(...batchResults);
  }
  return results;
}
```

### Circuit Breaker Pattern
```json
// Implement circuit breaker for failing services
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Migration Strategies

### Version Upgrade Considerations
1. **Feature Compatibility**: Test all tools after server upgrades
2. **API Changes**: Monitor for REST API changes
3. **Permission Changes**: Verify permission requirements
4. **Performance Impact**: Benchmark performance after upgrades

### Fallback Mechanisms
1. **Alternative Tools**: Implement fallback to alternative tools
2. **Manual Processes**: Document manual procedures for critical operations
3. **External Integration**: Use external tools when MCP tools are insufficient
4. **Graceful Degradation**: Implement reduced functionality modes

This limitations document should be regularly updated as new versions of JasperReports Server are released and new limitations are discovered.