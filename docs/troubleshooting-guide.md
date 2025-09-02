# JasperReports MCP Server Troubleshooting Guide

This comprehensive guide helps diagnose and resolve common issues with the JasperReports MCP Server tools.

## Quick Diagnostic Checklist

### 1. Connection Issues
- [ ] Server URL is correct and accessible
- [ ] Network connectivity to JasperReports Server
- [ ] Firewall allows access to server port
- [ ] SSL/TLS configuration is correct

### 2. Authentication Issues
- [ ] Credentials are valid and current
- [ ] User account is enabled and not locked
- [ ] Organization is correct (multi-tenant setups)
- [ ] Authentication method matches server configuration

### 3. Permission Issues
- [ ] User has required role assignments
- [ ] Resource-level permissions are sufficient
- [ ] Administrative operations require ROLE_ADMINISTRATOR
- [ ] Folder permissions allow access

### 4. Tool-Specific Issues
- [ ] Required parameters are provided
- [ ] Parameter values are valid and properly formatted
- [ ] Resource paths exist and are accessible
- [ ] Output formats are supported

## Common Error Patterns

### Authentication Errors

#### HTTP 401 - Unauthorized
**Symptoms:**
- "Authentication failed" messages
- "Invalid credentials" errors
- Session timeout errors

**Causes:**
- Invalid username/password
- Expired session tokens
- Incorrect authentication method
- Server authentication configuration changes

**Solutions:**
1. Verify credentials with JasperReports Server web interface
2. Check authentication method configuration
3. Re-authenticate with `jasper_authenticate`
4. Verify server authentication settings

**Example Fix:**
```json
{
  "tool": "jasper_authenticate",
  "parameters": {
    "authType": "login",
    "forceReauth": true
  }
}
```

#### HTTP 403 - Forbidden
**Symptoms:**
- "Permission denied" messages
- "Insufficient privileges" errors
- Access denied to specific resources

**Causes:**
- User lacks required role
- Resource-level permissions insufficient
- Organization restrictions (multi-tenant)
- Administrative operation without admin role

**Solutions:**
1. Check user role assignments in JasperReports Server
2. Verify resource permissions
3. Contact administrator for role updates
4. Use administrative account for admin operations

### Connection Errors

#### Connection Timeout
**Symptoms:**
- "Connection timeout" errors
- Network unreachable messages
- DNS resolution failures

**Diagnostic Steps:**
1. Test basic connectivity: `ping jasperserver.domain.com`
2. Test port access: `telnet jasperserver.domain.com 8080`
3. Check firewall rules and proxy settings
4. Verify server is running and responsive

**Solutions:**
1. Increase timeout values in configuration
2. Check network infrastructure
3. Verify server status and load
4. Configure proxy settings if required

#### SSL/TLS Errors
**Symptoms:**
- SSL handshake failures
- Certificate verification errors
- "SSL connection failed" messages

**Solutions:**
1. Verify SSL certificate validity
2. Update certificate trust store
3. Disable SSL verification for testing (not recommended for production)
4. Configure proper SSL settings

**Configuration Example:**
```bash
# For development/testing only
JASPER_SSL_VERIFY=false

# Production SSL configuration
JASPER_SSL_VERIFY=true
JASPER_SSL_CERT_PATH=/path/to/certificate.pem
```

### Validation Errors

#### Parameter Validation Failures
**Symptoms:**
- "Validation failed for X field(s)" errors
- "Invalid parameter format" messages
- Schema validation errors

**Common Causes:**
1. **Missing Required Parameters**
   - Solution: Check tool documentation for required fields
   - Use parameter validation tools before execution

2. **Invalid Parameter Formats**
   - Date formats: Use ISO 8601 format (YYYY-MM-DD)
   - URI patterns: Must start with `/` and follow path conventions
   - Regex patterns: Ensure proper escaping

3. **Base Property Conflicts**
   - Timestamp/requestId properties added by base classes
   - Solution: Use enhanced validation that excludes base properties

**Example Validation Fix:**
```json
{
  "reportUri": "/reports/sales/monthly",
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "outputFormat": "pdf"
}
```

### Resource Management Issues

#### Resource Not Found
**Symptoms:**
- "Resource does not exist" errors
- 404 Not Found responses
- Empty resource listings

**Diagnostic Steps:**
1. Verify resource path spelling and case
2. Check parent folder permissions
3. Confirm resource hasn't been deleted
4. Test with repository browser in JasperReports Server

**Solutions:**
1. Use `jasper_list_resources` to browse available resources
2. Check resource permissions with administrative account
3. Recreate missing resources if necessary

#### Upload Failures
**Symptoms:**
- JRXML validation errors
- "Resource already exists" conflicts
- Upload timeout errors

**Common Issues:**
1. **JRXML Validation Errors**
   - Validate JRXML syntax with JasperSoft Studio
   - Check JasperReports version compatibility
   - Verify all referenced resources are included

2. **Resource Conflicts**
   - Use `overwrite: true` to replace existing resources
   - Check for locked resources (active executions)
   - Verify write permissions on target folder

3. **Large File Uploads**
   - Split large uploads into smaller chunks
   - Increase timeout values
   - Use compression for JRXML content

### Report Execution Issues

#### Execution Timeouts
**Symptoms:**
- Synchronous execution timeouts
- "Report generation failed" errors
- Incomplete report outputs

**Solutions:**
1. Use asynchronous execution for long-running reports
2. Optimize report queries and data sources
3. Implement page ranges to limit output size
4. Increase server timeout configurations

**Async Execution Pattern:**
```json
// Start async execution
{
  "tool": "jasper_run_report_async",
  "parameters": {
    "reportUri": "/reports/large_report",
    "outputFormat": "pdf"
  }
}

// Check status periodically
{
  "tool": "jasper_get_execution_status",
  "parameters": {
    "executionId": "async_exec_12345"
  }
}

// Download when ready
{
  "tool": "jasper_get_execution_result",
  "parameters": {
    "executionId": "async_exec_12345",
    "exportId": "export_67890"
  }
}
```

#### Parameter Errors
**Symptoms:**
- "Invalid parameter value" errors
- Report execution failures
- Incorrect report output

**Solutions:**
1. Validate parameters with `jasper_validate_input_controls`
2. Check parameter data types and formats
3. Handle cascading parameter dependencies
4. Use input control tools to get valid values

### Job Management Issues

#### Permission Denied for Job Operations
**Symptoms:**
- Cannot create, update, or delete jobs
- "Administrative privileges required" errors

**Cause:**
Job management requires ROLE_ADMINISTRATOR permissions

**Solutions:**
1. Use administrative account for job operations
2. Request administrator role assignment
3. Use alternative scheduling mechanisms if available

#### Job Execution Failures
**Symptoms:**
- Scheduled jobs fail to execute
- Job status shows errors
- Missing job outputs

**Diagnostic Steps:**
1. Check job configuration and parameters
2. Verify report and datasource accessibility
3. Review job execution logs
4. Test report execution manually

### Performance Issues

#### Slow Tool Response Times
**Symptoms:**
- Tools taking longer than expected
- Timeout errors under load
- Server resource exhaustion

**Optimization Strategies:**
1. **Connection Pooling**
   - Configure appropriate connection pool sizes
   - Monitor connection usage patterns
   - Implement connection recycling

2. **Caching**
   - Enable response caching for read operations
   - Cache authentication tokens
   - Implement resource metadata caching

3. **Request Optimization**
   - Use pagination for large result sets
   - Implement filtering to reduce data transfer
   - Batch related operations when possible

#### Memory Issues
**Symptoms:**
- Out of memory errors
- Server crashes during large operations
- Degraded performance over time

**Solutions:**
1. Increase JVM heap size for JasperReports Server
2. Optimize report designs for memory efficiency
3. Use streaming for large data exports
4. Implement proper resource cleanup

## Tool-Specific Troubleshooting

### Authentication Tools

#### jasper_authenticate
**Common Issues:**
- Multi-tenant organization errors
- Session management problems
- Authentication method mismatches

**Debug Steps:**
1. Test with basic authentication first
2. Verify organization exists (multi-tenant)
3. Check server authentication configuration
4. Enable debug logging for detailed error info

#### jasper_test_connection
**Common Issues:**
- Network connectivity problems
- SSL certificate issues
- Server availability problems

**Debug Steps:**
1. Test without authentication first
2. Check server logs for connection attempts
3. Verify network path to server
4. Test with different timeout values

### Resource Management Tools

#### jasper_upload_resource
**Common Issues:**
- JRXML validation failures
- Datasource reference errors
- Local resource encoding problems

**Debug Steps:**
1. Validate JRXML with JasperSoft Studio
2. Verify datasource exists and is accessible
3. Check base64 encoding of embedded resources
4. Test with minimal resource first

#### jasper_list_resources
**Common Issues:**
- Permission errors on subfolders
- Performance issues with large repositories
- Filtering not working as expected

**Debug Steps:**
1. Test with root folder first
2. Use non-recursive listing for performance
3. Apply resource type filters
4. Check folder permissions systematically

### Report Execution Tools

#### jasper_run_report_sync
**Common Issues:**
- Execution timeouts
- Parameter validation errors
- Output format limitations

**Debug Steps:**
1. Test with minimal parameters first
2. Validate parameters separately
3. Try different output formats
4. Use page ranges to limit output

#### jasper_get_execution_result
**Common Issues:**
- Export not ready errors
- Large download timeouts
- Export ID not found

**Debug Steps:**
1. Check execution status first
2. Verify export ID from status response
3. Handle large downloads with streaming
4. Implement retry logic for network issues

## Debugging Tools and Techniques

### Enable Debug Mode
```bash
JASPER_DEBUG_MODE=true
```

**Debug Output Includes:**
- Detailed HTTP request/response logs
- Parameter validation steps
- Authentication flow details
- Error context and stack traces

### Health Monitoring
Use health monitoring tools to diagnose system issues:

```json
{
  "tool": "jasper_health_status",
  "parameters": {
    "includeDetails": true,
    "includeResilience": true
  }
}
```

### Performance Metrics
Monitor system performance and identify bottlenecks:

```json
{
  "tool": "jasper_performance_metrics"
}
```

### Component Health Checks
Test specific system components:

```json
{
  "tool": "jasper_component_health",
  "parameters": {
    "component": "jasperServerConnectivity"
  }
}
```

## Best Practices for Issue Prevention

### 1. Configuration Management
- Use environment-specific configuration files
- Validate configuration on startup
- Implement configuration change monitoring
- Document all configuration parameters

### 2. Error Handling
- Implement comprehensive error logging
- Use structured error responses
- Provide actionable error messages
- Implement retry logic for transient failures

### 3. Performance Optimization
- Monitor tool execution times
- Implement caching strategies
- Use appropriate timeout values
- Optimize report designs for performance

### 4. Security Considerations
- Use HTTPS in production environments
- Implement proper credential management
- Monitor authentication failures
- Regular security audits and updates

### 5. Monitoring and Alerting
- Implement health check monitoring
- Set up alerts for critical failures
- Monitor resource usage patterns
- Track performance metrics over time

## Getting Additional Help

### Log Analysis
1. Enable debug mode for detailed logging
2. Check JasperReports Server logs for server-side errors
3. Monitor network traffic for connection issues
4. Use correlation IDs to trace requests

### Support Resources
1. JasperReports Server documentation
2. Community forums and knowledge base
3. Professional support channels
4. System administrator assistance

### Escalation Procedures
1. Gather diagnostic information
2. Document reproduction steps
3. Collect relevant log files
4. Provide configuration details (sanitized)

This troubleshooting guide should be used in conjunction with the main API documentation and updated based on common issues encountered in your specific environment.