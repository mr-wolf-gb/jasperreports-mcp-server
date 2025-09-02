# JasperReports MCP Server Usage Examples

This document provides practical examples and common scenarios for using the JasperReports MCP Server.

## Getting Started

### Basic Setup and Authentication

```javascript
// First, authenticate with the server
const authResult = await mcpClient.callTool("jasper_authenticate", {
  authType: "basic",
  username: "jasperadmin",
  password: "jasperadmin"
});

// Test the connection
const connectionTest = await mcpClient.callTool("jasper_test_connection", {});
console.log("Server version:", connectionTest.serverInfo.version);
```

### Upload and Execute a Simple Report

```javascript
// Upload a simple report
const uploadResult = await mcpClient.callTool("jasper_upload_resource", {
  resourcePath: "/reports/examples/simple_report",
  label: "Simple Sales Report",
  description: "Basic sales report example",
  jrxmlContent: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...", // base64 JRXML
  dataSourceUri: "/datasources/demo_datasource",
  overwrite: true
});

// Execute the report synchronously
const reportResult = await mcpClient.callTool("jasper_run_report_sync", {
  reportUri: "/reports/examples/simple_report",
  outputFormat: "pdf",
  parameters: {
    start_date: "2024-01-01",
    end_date: "2024-01-31"
  }
});

// Save the PDF content
const pdfBuffer = Buffer.from(reportResult.content, 'base64');
require('fs').writeFileSync('simple_report.pdf', pdfBuffer);
```

## Common Scenarios

### Scenario 1: Batch Report Processing

Process multiple reports with different parameters:

```javascript
async function processBatchReports() {
  const reports = [
    { uri: "/reports/sales/monthly", params: { month: "2024-01", department: "SALES" } },
    { uri: "/reports/sales/monthly", params: { month: "2024-01", department: "MARKETING" } },
    { uri: "/reports/sales/monthly", params: { month: "2024-01", department: "SUPPORT" } }
  ];

  const results = [];
  
  for (const report of reports) {
    try {
      // Start async execution for each report
      const execution = await mcpClient.callTool("jasper_run_report_async", {
        reportUri: report.uri,
        outputFormat: "xlsx",
        parameters: report.params
      });
      
      results.push({
        requestId: execution.requestId,
        department: report.params.department
      });
    } catch (error) {
      console.error(`Failed to start report for ${report.params.department}:`, error);
    }
  }

  // Poll for completion and collect results
  const completedReports = [];
  for (const result of results) {
    let status = "queued";
    while (status !== "ready" && status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusCheck = await mcpClient.callTool("jasper_get_execution_status", {
        requestId: result.requestId
      });
      
      status = statusCheck.status;
      console.log(`Report for ${result.department}: ${status}`);
    }

    if (status === "ready") {
      const reportData = await mcpClient.callTool("jasper_get_execution_result", {
        requestId: result.requestId,
        exportId: statusCheck.exports[0].id
      });
      
      // Save the Excel file
      const excelBuffer = Buffer.from(reportData.content, 'base64');
      require('fs').writeFileSync(`${result.department}_report.xlsx`, excelBuffer);
      
      completedReports.push({
        department: result.department,
        fileSize: reportData.fileSize,
        generationTime: reportData.generationTime
      });
    }
  }

  return completedReports;
}
```

### Scenario 2: Dynamic Report with Cascading Parameters

Handle reports with dependent parameters:

```javascript
async function generateDynamicReport() {
  const reportUri = "/reports/sales/regional_analysis";
  
  // Get input controls to understand parameter dependencies
  const controls = await mcpClient.callTool("jasper_get_input_controls", {
    reportUri: reportUri,
    includeValues: true
  });
  
  console.log("Available input controls:", controls.inputControls.map(c => c.id));
  
  // Set the region parameter first
  const regionUpdate = await mcpClient.callTool("jasper_set_input_control_values", {
    reportUri: reportUri,
    controlValues: {
      region: "NORTH_AMERICA"
    }
  });
  
  // Check what countries are now available based on region
  const availableCountries = regionUpdate.updatedControls
    .find(c => c.id === "country")?.options || [];
  
  console.log("Available countries:", availableCountries.map(c => c.label));
  
  // Set country and get available states
  const countryUpdate = await mcpClient.callTool("jasper_set_input_control_values", {
    reportUri: reportUri,
    controlValues: {
      region: "NORTH_AMERICA",
      country: "USA"
    }
  });
  
  const availableStates = countryUpdate.updatedControls
    .find(c => c.id === "state")?.options || [];
  
  // Validate final parameters
  const validation = await mcpClient.callTool("jasper_validate_input_controls", {
    reportUri: reportUri,
    parameters: {
      region: "NORTH_AMERICA",
      country: "USA",
      state: "CA",
      start_date: "2024-01-01",
      end_date: "2024-03-31"
    }
  });
  
  if (!validation.valid) {
    console.error("Parameter validation failed:", validation.validationResults);
    return;
  }
  
  // Execute the report with validated parameters
  const reportResult = await mcpClient.callTool("jasper_run_report_sync", {
    reportUri: reportUri,
    outputFormat: "pdf",
    parameters: {
      region: "NORTH_AMERICA",
      country: "USA",
      state: "CA",
      start_date: "2024-01-01",
      end_date: "2024-03-31"
    }
  });
  
  return reportResult;
}
```

### Scenario 3: Report Repository Management

Organize and manage report repository:

```javascript
async function organizeReportRepository() {
  // Create folder structure
  const folders = [
    "/reports/sales",
    "/reports/finance",
    "/reports/hr",
    "/reports/operations"
  ];
  
  for (const folder of folders) {
    try {
      await mcpClient.callTool("jasper_upload_resource", {
        resourcePath: folder,
        label: folder.split('/').pop().toUpperCase() + " Reports",
        resourceType: "folder"
      });
      console.log(`Created folder: ${folder}`);
    } catch (error) {
      if (!error.message.includes("already exists")) {
        console.error(`Failed to create folder ${folder}:`, error);
      }
    }
  }
  
  // List all reports to categorize them
  const allReports = await mcpClient.callTool("jasper_list_resources", {
    folderPath: "/reports",
    resourceType: "reportUnit",
    recursive: true
  });
  
  console.log(`Found ${allReports.totalCount} reports to organize`);
  
  // Move reports to appropriate folders based on naming convention
  for (const report of allReports.resources) {
    const reportName = report.label.toLowerCase();
    let targetFolder = "/reports/misc";
    
    if (reportName.includes("sales") || reportName.includes("revenue")) {
      targetFolder = "/reports/sales";
    } else if (reportName.includes("finance") || reportName.includes("budget")) {
      targetFolder = "/reports/finance";
    } else if (reportName.includes("employee") || reportName.includes("payroll")) {
      targetFolder = "/reports/hr";
    } else if (reportName.includes("inventory") || reportName.includes("production")) {
      targetFolder = "/reports/operations";
    }
    
    // Get report details
    const reportDetails = await mcpClient.callTool("jasper_get_resource", {
      resourceUri: report.uri,
      includeContent: true
    });
    
    // Upload to new location if different
    const newPath = `${targetFolder}/${report.label.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    if (newPath !== report.uri) {
      await mcpClient.callTool("jasper_upload_resource", {
        resourcePath: newPath,
        label: report.label,
        description: reportDetails.description,
        jrxmlContent: reportDetails.jrxml?.content,
        dataSourceUri: reportDetails.dataSource?.uri,
        overwrite: true
      });
      
      // Delete old location
      await mcpClient.callTool("jasper_delete_resource", {
        resourceUri: report.uri
      });
      
      console.log(`Moved ${report.uri} to ${newPath}`);
    }
  }
}
```

### Scenario 4: Scheduled Report Automation

Set up automated report generation and distribution:

```javascript
async function setupReportAutomation() {
  // Create monthly sales report job
  const monthlySalesJob = await mcpClient.callTool("jasper_create_job", {
    label: "Monthly Sales Report - Auto",
    reportUri: "/reports/sales/monthly_summary",
    schedule: {
      type: "monthly",
      dayOfMonth: 1,
      hour: 9,
      minute: 0,
      timezone: "America/New_York"
    },
    outputFormats: ["pdf", "xlsx"],
    parameters: {
      auto_date_range: true,
      include_charts: true,
      detail_level: "summary"
    },
    recipients: [
      "sales-team@company.com",
      "management@company.com"
    ],
    description: "Automated monthly sales summary report"
  });
  
  console.log(`Created monthly job: ${monthlySalesJob.jobId}`);
  
  // Create weekly operational report job
  const weeklyOpsJob = await mcpClient.callTool("jasper_create_job", {
    label: "Weekly Operations Dashboard",
    reportUri: "/reports/operations/weekly_dashboard",
    schedule: {
      type: "weekly",
      dayOfWeek: "MONDAY",
      hour: 8,
      minute: 0,
      timezone: "America/New_York"
    },
    outputFormats: ["html", "pdf"],
    parameters: {
      include_kpis: true,
      show_trends: true
    },
    recipients: [
      "operations@company.com"
    ]
  });
  
  console.log(`Created weekly job: ${weeklyOpsJob.jobId}`);
  
  // List all scheduled jobs for verification
  const allJobs = await mcpClient.callTool("jasper_list_jobs", {});
  console.log(`Total scheduled jobs: ${allJobs.totalCount}`);
  
  return {
    monthlyJob: monthlySalesJob.jobId,
    weeklyJob: weeklyOpsJob.jobId
  };
}
```

### Scenario 5: Report with Complex Local Resources

Upload a report with embedded images and subreports:

```javascript
async function uploadComplexReport() {
  // Read local files (in real implementation, these would be actual file reads)
  const jrxmlContent = require('fs').readFileSync('./complex_report.jrxml', 'base64');
  const logoImage = require('fs').readFileSync('./company_logo.png', 'base64');
  const chartSubreport = require('fs').readFileSync('./chart_subreport.jrxml', 'base64');
  const backgroundImage = require('fs').readFileSync('./report_background.jpg', 'base64');
  
  const uploadResult = await mcpClient.callTool("jasper_upload_resource", {
    resourcePath: "/reports/executive/quarterly_executive_summary",
    label: "Quarterly Executive Summary",
    description: "Comprehensive quarterly report with charts and branding",
    jrxmlContent: jrxmlContent,
    dataSourceUri: "/datasources/executive_dashboard_ds",
    localResources: [
      {
        name: "company_logo",
        type: "img",
        content: logoImage
      },
      {
        name: "chart_subreport",
        type: "jrxml",
        content: chartSubreport
      },
      {
        name: "background_image",
        type: "img",
        content: backgroundImage
      }
    ],
    overwrite: true
  });
  
  console.log(`Uploaded complex report with ${uploadResult.localResourcesUploaded} local resources`);
  
  // Test the report execution
  const testExecution = await mcpClient.callTool("jasper_run_report_sync", {
    reportUri: "/reports/executive/quarterly_executive_summary",
    outputFormat: "pdf",
    parameters: {
      quarter: "Q1",
      year: "2024",
      include_appendix: true
    }
  });
  
  console.log(`Report generated successfully: ${testExecution.fileSize} bytes, ${testExecution.pageCount} pages`);
  
  return uploadResult;
}
```

### Scenario 6: User and Permission Management

Manage users and set up proper permissions:

```javascript
async function setupUserPermissions() {
  // Create a new report viewer user
  const newUser = await mcpClient.callTool("jasper_manage_users", {
    operation: "create",
    username: "report_viewer_1",
    userDetails: {
      fullName: "Report Viewer One",
      email: "viewer1@company.com",
      enabled: true
    },
    roles: ["ROLE_USER"]
  });
  
  console.log(`Created user: ${newUser.username}`);
  
  // Set permissions on sales reports folder
  await mcpClient.callTool("jasper_manage_permissions", {
    resourceUri: "/reports/sales",
    operation: "set",
    permissions: [
      {
        recipient: "user:/report_viewer_1",
        mask: "READ_ONLY"
      },
      {
        recipient: "role:/ROLE_SALES_MANAGER",
        mask: "READ_WRITE"
      }
    ]
  });
  
  // Set permissions on specific sensitive report
  await mcpClient.callTool("jasper_manage_permissions", {
    resourceUri: "/reports/finance/executive_compensation",
    operation: "set",
    permissions: [
      {
        recipient: "role:/ROLE_ADMINISTRATOR",
        mask: "FULL_CONTROL"
      },
      {
        recipient: "role:/ROLE_EXECUTIVE",
        mask: "READ_ONLY"
      }
    ]
  });
  
  console.log("Permissions configured successfully");
}
```

### Scenario 7: Error Handling and Resilience

Implement robust error handling:

```javascript
async function resilientReportExecution(reportUri, parameters, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Try synchronous execution first
      const result = await mcpClient.callTool("jasper_run_report_sync", {
        reportUri: reportUri,
        outputFormat: "pdf",
        parameters: parameters
      });
      
      return result;
      
    } catch (error) {
      attempt++;
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (error.code === "AUTHENTICATION_REQUIRED") {
        // Re-authenticate and retry
        console.log("Re-authenticating...");
        await mcpClient.callTool("jasper_authenticate", {});
        continue;
      }
      
      if (error.code === "SERVICE_UNAVAILABLE" && attempt < maxRetries) {
        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (error.code === "RESOURCE_NOT_FOUND") {
        // Check if report exists
        try {
          await mcpClient.callTool("jasper_get_resource", {
            resourceUri: reportUri
          });
          console.log("Report exists but execution failed");
        } catch (getError) {
          console.error("Report does not exist:", reportUri);
          throw new Error(`Report not found: ${reportUri}`);
        }
      }
      
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} attempts failed`);
        throw error;
      }
    }
  }
}

// Usage with fallback to async execution
async function executeReportWithFallback(reportUri, parameters) {
  try {
    // Try synchronous execution first
    return await resilientReportExecution(reportUri, parameters);
    
  } catch (syncError) {
    console.log("Synchronous execution failed, trying async...");
    
    try {
      // Fallback to asynchronous execution
      const asyncExecution = await mcpClient.callTool("jasper_run_report_async", {
        reportUri: reportUri,
        outputFormat: "pdf",
        parameters: parameters
      });
      
      // Poll for completion
      let status = "queued";
      let attempts = 0;
      const maxPollAttempts = 60; // 5 minutes with 5-second intervals
      
      while (status !== "ready" && status !== "failed" && attempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusCheck = await mcpClient.callTool("jasper_get_execution_status", {
          requestId: asyncExecution.requestId
        });
        
        status = statusCheck.status;
        attempts++;
        
        if (attempts % 12 === 0) { // Log every minute
          console.log(`Async execution status: ${status} (${attempts * 5}s elapsed)`);
        }
      }
      
      if (status === "ready") {
        return await mcpClient.callTool("jasper_get_execution_result", {
          requestId: asyncExecution.requestId,
          exportId: statusCheck.exports[0].id
        });
      } else {
        throw new Error(`Async execution failed with status: ${status}`);
      }
      
    } catch (asyncError) {
      console.error("Both sync and async execution failed");
      throw new Error(`Report execution failed: ${syncError.message} | ${asyncError.message}`);
    }
  }
}
```

## Integration Examples

### Express.js Web Application

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint to generate and download reports
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { reportUri, outputFormat, parameters } = req.body;
    
    const result = await mcpClient.callTool("jasper_run_report_sync", {
      reportUri: reportUri,
      outputFormat: outputFormat || "pdf",
      parameters: parameters || {}
    });
    
    const buffer = Buffer.from(result.content, 'base64');
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="report.${outputFormat}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Report generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to list available reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await mcpClient.callTool("jasper_list_resources", {
      folderPath: "/reports",
      resourceType: "reportUnit",
      recursive: true
    });
    
    res.json(reports);
    
  } catch (error) {
    console.error('Failed to list reports:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Report service running on port 3000');
});
```

### CLI Tool

```javascript
#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

program
  .name('jasper-cli')
  .description('CLI tool for JasperReports operations')
  .version('1.0.0');

program
  .command('run-report')
  .description('Execute a report')
  .requiredOption('-r, --report <uri>', 'Report URI')
  .option('-f, --format <format>', 'Output format', 'pdf')
  .option('-o, --output <file>', 'Output file')
  .option('-p, --params <json>', 'Parameters as JSON string')
  .action(async (options) => {
    try {
      const parameters = options.params ? JSON.parse(options.params) : {};
      
      const result = await mcpClient.callTool("jasper_run_report_sync", {
        reportUri: options.report,
        outputFormat: options.format,
        parameters: parameters
      });
      
      const outputFile = options.output || `report.${options.format}`;
      const buffer = Buffer.from(result.content, 'base64');
      
      require('fs').writeFileSync(outputFile, buffer);
      console.log(`Report saved to: ${outputFile}`);
      console.log(`File size: ${result.fileSize} bytes`);
      console.log(`Generation time: ${result.generationTime}ms`);
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-reports')
  .description('List available reports')
  .option('-f, --folder <path>', 'Folder path', '/reports')
  .option('-r, --recursive', 'Include subfolders')
  .action(async (options) => {
    try {
      const reports = await mcpClient.callTool("jasper_list_resources", {
        folderPath: options.folder,
        resourceType: "reportUnit",
        recursive: options.recursive
      });
      
      console.log(`Found ${reports.totalCount} reports:`);
      reports.resources.forEach(report => {
        console.log(`  ${report.uri} - ${report.label}`);
      });
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

## Best Practices

### 1. Authentication Management
- Always authenticate before performing operations
- Handle authentication expiration gracefully
- Use appropriate authentication method for your environment

### 2. Error Handling
- Implement retry logic for transient failures
- Handle specific error codes appropriately
- Provide meaningful error messages to users

### 3. Resource Management
- Use descriptive labels and paths for reports
- Organize reports in logical folder structures
- Clean up temporary resources after use

### 4. Performance Optimization
- Use asynchronous execution for long-running reports
- Implement proper timeout handling
- Cache frequently accessed metadata

### 5. Security
- Use least-privilege access principles
- Validate all input parameters
- Secure credential storage and transmission

These examples demonstrate the flexibility and power of the JasperReports MCP Server for various integration scenarios and use cases.