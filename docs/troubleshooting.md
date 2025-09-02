# JasperReports MCP Server Troubleshooting Guide

This document provides solutions for common issues and problems when using the JasperReports MCP Server.

## Common Issues and Solutions

### Authentication Issues

#### Issue: Authentication Failed - Invalid Credentials
**Error Message:** `Authentication failed: Invalid credentials`
**Error Code:** `AUTHENTICATION_REQUIRED`

**Possible Causes:**
1. Incorrect username or password
2. User account is disabled or locked
3. Organization mismatch in multi-tenant setup
4. Case sensitivity in credentials

**Solutions:**
1. **Verify Credentials:**
   ```bash
   # Test with curl
   curl -u "username:password" "https://your-jasper-server/jasperserver/rest_v2/serverInfo"
   ```

2. **Check Organization Format:**
   ```json
   {
     "username": "user|organization_1",
     "password": "password"
   }
   ```
   Or use separate organization parameter:
   ```json
   {
     "username": "user",
     "password": "password",
     "organization": "organization_1"
   }
   ```

3. **Verify User Status:**
   - Check if user account is active in JasperReports Server
   - Ensure user has necessary permissions
   - Verify password hasn't expired

#### Issue: Session Expired
**Error Message:** `Session has expired`
**Error Code:** `AUTHENTICATION_REQUIRED`

**Solutions:**
1. **Re-authenticate:**
   ```javascript
   await mcpClient.callTool("jasper_authenticate", {
     authType: "login"
   });
   ```

2. **Use Basic Authentication:**
   - Switch to `JASPER_AUTH_TYPE=basic` for stateless authentication
   - Basic auth doesn't have session expiration issues

3. **Increase Session Timeout:**
   - Configure longer session timeout in JasperReports Server
   - Implement automatic re-authentication in your application

#### Issue: Organization Not Found
**Error Message:** `Organization not found`
**Error Code:** `AUTHENTICATION_REQUIRED`

**Solutions:**
1. **Verify Organization ID:**
   ```bash
   # List organizations (as superuser)
   curl -u "superuser:password" "https://your-jasper-server/jasperserver/rest_v2/organizations"
   ```

2. **Use Correct Format:**
   - Format: `username|organization_id`
   - Organization ID is case-sensitive
   - Use exact ID from server configuration

### Connection Issues

#### Issue: Connection Refused
**Error Message:** `Connection refused` or `ECONNREFUSED`
**Error Code:** `SERVICE_UNAVAILABLE`

**Solutions:**
1. **Verify Server URL:**
   ```bash
   # Test basic connectivity
   curl -I "https://your-jasper-server/jasperserver"
   ```

2. **Check Network Access:**
   - Verify firewall rules
   - Check VPN connection if required
   - Test from same network as JasperReports Server

3. **Verify Service Status:**
   - Ensure JasperReports Server is running
   - Check server logs for startup errors
   - Verify correct port and protocol (HTTP vs HTTPS)

#### Issue: SSL Certificate Errors
**Error Message:** `SSL certificate verification failed`
**Error Code:** `SERVICE_UNAVAILABLE`

**Solutions:**
1. **For Development (Temporary):**
   ```bash
   export JASPER_SSL_VERIFY=false
   ```

2. **For Production (Recommended):**
   - Install proper SSL certificate on JasperReports Server
   - Add certificate to system trust store
   - Use certificate from trusted CA

3. **Custom Certificate:**
   ```bash
   # Add certificate to Node.js trust store
   export NODE_EXTRA_CA_CERTS=/path/to/certificate.pem
   ```

#### Issue: Timeout Errors
**Error Message:** `Request timeout` or `ETIMEDOUT`
**Error Code:** `SERVICE_UNAVAILABLE`

**Solutions:**
1. **Increase Timeout:**
   ```bash
   export JASPER_TIMEOUT=120000  # 2 minutes
   ```

2. **Check Network Latency:**
   ```bash
   # Test response time
   time curl -I "https://your-jasper-server/jasperserver"
   ```

3. **Optimize Report:**
   - Reduce data volume
   - Optimize database queries
   - Use report pagination

### Report Execution Issues

#### Issue: Report Not Found
**Error Message:** `Report not found`
**Error Code:** `RESOURCE_NOT_FOUND`

**Solutions:**
1. **Verify Report Path:**
   ```javascript
   // List reports to find correct path
   const reports = await mcpClient.callTool("jasper_list_resources", {
     folderPath: "/reports",
     resourceType: "reportUnit",
     recursive: true
   });
   ```

2. **Check Permissions:**
   - Verify user has read access to report
   - Check folder permissions
   - Ensure report is published and active

3. **Case Sensitivity:**
   - Report URIs are case-sensitive
   - Use exact path from repository

#### Issue: Report Execution Failed
**Error Message:** `Report execution failed`
**Error Code:** `INTERNAL_ERROR`

**Solutions:**
1. **Check Report Parameters:**
   ```javascript
   // Get required parameters
   const controls = await mcpClient.callTool("jasper_get_input_controls", {
     reportUri: "/path/to/report"
   });
   
   // Validate parameters
   const validation = await mcpClient.callTool("jasper_validate_input_controls", {
     reportUri: "/path/to/report",
     parameters: yourParameters
   });
   ```

2. **Check Data Source:**
   - Verify data source connection
   - Test database connectivity
   - Check SQL query syntax

3. **Review Report Design:**
   - Check for JRXML syntax errors
   - Verify field mappings
   - Test report in JasperReports Studio

#### Issue: Large Report Memory Issues
**Error Message:** `Out of memory` or execution hangs
**Error Code:** `INTERNAL_ERROR`

**Solutions:**
1. **Use Asynchronous Execution:**
   ```javascript
   const execution = await mcpClient.callTool("jasper_run_report_async", {
     reportUri: "/path/to/large/report",
     outputFormat: "pdf"
   });
   ```

2. **Implement Pagination:**
   ```javascript
   const result = await mcpClient.callTool("jasper_run_report_sync", {
     reportUri: "/path/to/report",
     outputFormat: "pdf",
     pages: "1-10"  // Process in chunks
   });
   ```

3. **Optimize Report:**
   - Reduce data set size
   - Use report filters
   - Optimize images and graphics

### Resource Management Issues

#### Issue: Upload Failed - Invalid JRXML
**Error Message:** `Invalid JRXML content`
**Error Code:** `VALIDATION_ERROR`

**Solutions:**
1. **Validate JRXML:**
   ```bash
   # Use JasperReports Studio to validate
   # Or use online JRXML validator
   ```

2. **Check Encoding:**
   ```javascript
   // Ensure proper base64 encoding
   const jrxmlContent = Buffer.from(jrxmlString, 'utf8').toString('base64');
   ```

3. **Verify Dependencies:**
   - Check subreport references
   - Verify image paths
   - Ensure data source references are correct

#### Issue: Resource Already Exists
**Error Message:** `Resource already exists`
**Error Code:** `RESOURCE_CONFLICT`

**Solutions:**
1. **Use Overwrite Flag:**
   ```javascript
   await mcpClient.callTool("jasper_upload_resource", {
     resourcePath: "/path/to/report",
     // ... other parameters
     overwrite: true
   });
   ```

2. **Delete Existing Resource:**
   ```javascript
   await mcpClient.callTool("jasper_delete_resource", {
     resourceUri: "/path/to/existing/report"
   });
   ```

3. **Use Different Path:**
   - Choose unique resource path
   - Add version suffix or timestamp

#### Issue: Permission Denied
**Error Message:** `Access denied` or `Insufficient permissions`
**Error Code:** `PERMISSION_DENIED`

**Solutions:**
1. **Check User Permissions:**
   ```javascript
   // Verify user has necessary roles
   const userInfo = await mcpClient.callTool("jasper_manage_users", {
     operation: "get",
     username: "current_user"
   });
   ```

2. **Grant Required Permissions:**
   ```javascript
   await mcpClient.callTool("jasper_manage_permissions", {
     resourceUri: "/path/to/resource",
     operation: "add",
     permissions: [{
       recipient: "user:/username",
       mask: "READ_WRITE"
     }]
   });
   ```

3. **Use Administrator Account:**
   - Temporarily use admin credentials
   - Set up proper permissions
   - Switch back to regular user

### Configuration Issues

#### Issue: Invalid Configuration
**Error Message:** `Configuration Error: JASPER_URL is required`

**Solutions:**
1. **Check Environment Variables:**
   ```bash
   echo $JASPER_URL
   echo $JASPER_USERNAME
   echo $JASPER_PASSWORD
   ```

2. **Verify MCP Configuration:**
   ```json
   {
     "mcpServers": {
       "jasperreports": {
         "env": {
           "JASPER_URL": "https://your-server/jasperserver",
           "JASPER_USERNAME": "your-username",
           "JASPER_PASSWORD": "your-password"
         }
       }
     }
   }
   ```

3. **Check Configuration File:**
   - Verify JSON syntax
   - Ensure all required fields are present
   - Check file permissions

#### Issue: Test Server Not Starting
**Error Message:** `Test server failed to start`

**Solutions:**
1. **Check Port Availability:**
   ```bash
   netstat -an | grep :3000
   lsof -i :3000
   ```

2. **Use Different Port:**
   ```bash
   export TEST_SERVER_PORT=3001
   ```

3. **Check Permissions:**
   - Ensure port is not restricted
   - Run with appropriate privileges
   - Check firewall settings

## Debugging Techniques

### Enable Debug Logging

1. **Environment Variable:**
   ```bash
   export JASPER_DEBUG_MODE=true
   export JASPER_LOG_LEVEL=debug
   ```

2. **MCP Configuration:**
   ```json
   {
     "env": {
       "JASPER_DEBUG_MODE": "true",
       "JASPER_LOG_LEVEL": "debug"
     }
   }
   ```

### Test Connection

```javascript
// Basic connectivity test
const connectionTest = await mcpClient.callTool("jasper_test_connection", {});
console.log("Connection status:", connectionTest.connectionStatus);
console.log("Server info:", connectionTest.serverInfo);
```

### Validate Configuration

```javascript
// Test authentication
try {
  const authResult = await mcpClient.callTool("jasper_authenticate", {});
  console.log("Authentication successful:", authResult.success);
} catch (error) {
  console.error("Authentication failed:", error.message);
}
```

### Check Server Logs

1. **JasperReports Server Logs:**
   ```bash
   tail -f /path/to/jasperserver/logs/jasperserver.log
   ```

2. **Application Server Logs:**
   ```bash
   # Tomcat
   tail -f /path/to/tomcat/logs/catalina.out
   
   # Other app servers
   tail -f /path/to/logs/server.log
   ```

### Network Debugging

1. **Test with curl:**
   ```bash
   # Test basic connectivity
   curl -v "https://your-server/jasperserver/rest_v2/serverInfo"
   
   # Test authentication
   curl -u "username:password" "https://your-server/jasperserver/rest_v2/serverInfo"
   ```

2. **Check DNS Resolution:**
   ```bash
   nslookup your-jasper-server.com
   dig your-jasper-server.com
   ```

3. **Test Network Path:**
   ```bash
   traceroute your-jasper-server.com
   telnet your-jasper-server.com 443
   ```

## Performance Issues

### Slow Report Execution

**Symptoms:**
- Reports take longer than expected
- Timeout errors on large reports
- High memory usage

**Solutions:**

1. **Database Optimization:**
   - Add indexes to frequently queried columns
   - Optimize SQL queries in reports
   - Use database connection pooling

2. **Report Optimization:**
   - Reduce data volume with filters
   - Use subreports for complex layouts
   - Optimize image sizes and formats

3. **Server Tuning:**
   - Increase JVM heap size
   - Tune garbage collection settings
   - Configure connection pools

4. **Use Async Execution:**
   ```javascript
   // For long-running reports
   const execution = await mcpClient.callTool("jasper_run_report_async", {
     reportUri: "/path/to/slow/report",
     outputFormat: "pdf"
   });
   ```

### Memory Issues

**Symptoms:**
- Out of memory errors
- Server becomes unresponsive
- Report execution fails

**Solutions:**

1. **Increase Memory:**
   ```bash
   # JasperReports Server JVM settings
   export JAVA_OPTS="-Xmx4g -Xms2g"
   ```

2. **Process Reports in Batches:**
   ```javascript
   // Process large datasets in chunks
   for (let page = 1; page <= totalPages; page += 10) {
     const result = await mcpClient.callTool("jasper_run_report_sync", {
       reportUri: "/path/to/report",
       pages: `${page}-${Math.min(page + 9, totalPages)}`
     });
     // Process chunk
   }
   ```

3. **Use Streaming:**
   - Enable streaming for large reports
   - Process results as they're generated
   - Avoid loading entire report in memory

## Error Code Reference

| Error Code | Description | Common Causes | Solutions |
|------------|-------------|---------------|-----------|
| `AUTHENTICATION_REQUIRED` | Authentication failed or required | Invalid credentials, expired session | Re-authenticate, check credentials |
| `PERMISSION_DENIED` | Insufficient permissions | User lacks required permissions | Grant permissions, use admin account |
| `RESOURCE_NOT_FOUND` | Resource does not exist | Wrong path, deleted resource | Verify path, check resource exists |
| `INVALID_REQUEST` | Invalid parameters or request | Wrong parameter format, missing required fields | Validate parameters, check API docs |
| `RESOURCE_CONFLICT` | Resource already exists or conflict | Duplicate resource, concurrent modification | Use overwrite flag, handle conflicts |
| `INTERNAL_ERROR` | Server-side error | Database issues, report errors, server problems | Check server logs, verify data sources |
| `SERVICE_UNAVAILABLE` | Server unavailable | Network issues, server down, maintenance | Check connectivity, verify server status |
| `VALIDATION_ERROR` | Input validation failed | Invalid JRXML, wrong parameter types | Validate inputs, check constraints |

## Getting Help

### Log Collection

When reporting issues, collect these logs:

1. **MCP Server Logs:**
   ```bash
   # Enable debug mode first
   export JASPER_DEBUG_MODE=true
   # Run operation and collect output
   ```

2. **JasperReports Server Logs:**
   ```bash
   # Main application log
   cat /path/to/jasperserver/logs/jasperserver.log
   
   # Error log
   cat /path/to/jasperserver/logs/jasperserver_error.log
   ```

3. **System Information:**
   ```bash
   # Node.js version
   node --version
   
   # System info
   uname -a
   
   # Network connectivity
   curl -I "https://your-jasper-server/jasperserver"
   ```

### Support Checklist

Before seeking support, verify:

- [ ] JasperReports Server is accessible via browser
- [ ] Credentials work in JasperReports Server web interface
- [ ] Network connectivity from MCP server to JasperReports Server
- [ ] All required environment variables are set
- [ ] Debug logging is enabled
- [ ] Error messages and logs are collected
- [ ] Minimal reproduction case is prepared

### Community Resources

- **Documentation**: Check official JasperReports documentation
- **Forums**: Search JasperReports community forums
- **Stack Overflow**: Search for similar issues
- **GitHub Issues**: Check project repository for known issues

This troubleshooting guide should help resolve most common issues. For complex problems, enable debug logging and collect detailed error information before seeking additional support.