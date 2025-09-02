# JasperReports Server JRXML File Format

This document extracts the JRXML file format details from the JasperReports Server REST API Reference (version 8.2.0), specifically from Chapter 5, Section 5.14, "Report Unit (JRXML Report)" (page 40). The JRXML file is a critical component of a reportUnit resource in the JasperReports Server repository, and its format is described for use with the REST v2 API.

## Overview
A reportUnit resource in JasperReports Server represents a JRXML report, which includes a main JRXML file, a data source, and optional local resources (e.g., images, subreports). The JRXML file must conform to the JasperReports XML schema (`http://jasperreports.sourceforge.net/xsd/jasperreport.xsd`) and is typically uploaded as a base64-encoded string within the reportUnit descriptor.

## JRXML File Descriptor Format
The JRXML file is included in the reportUnit resource descriptor under the `jrxml` attribute. The descriptor is sent in JSON or XML format when creating or updating a reportUnit via the REST API (`/rest_v2/resources`).

### JSON Format
```json
{
  "label": "Report Label",
  "description": "Report Description",
  "jrxml": {
    "jrxmlFile": {
      "label": "Main JRXML",
      "type": "jrxml",
      "content": "<base64 encoded JRXML content>"
    }
  },
  "dataSource": {
    "dataSourceReference": {
      "uri": "/path/to/datasource"
    }
  },
  "resources": [
    {
      "name": "resourceName",
      "file": {
        "label": "Resource Label",
        "type": "img",
        "content": "<base64 encoded resource content>"
      }
    }
  ]
}
```

### XML Format
```xml
<reportUnit>
  <label>Report Label</label>
  <description>Report Description</description>
  <jrxml>
    <jrxmlFile>
      <label>Main JRXML</label>
      <type>jrxml</type>
      <content>base64 encoded JRXML content</content>
    </jrxmlFile>
  </jrxml>
  <dataSource>
    <dataSourceReference>
      <uri>/path/to/datasource</uri>
    </dataSourceReference>
  </dataSource>
  <resources>
    <resource>
      <name>resourceName</name>
      <file>
        <label>Resource Label</label>
        <type>img</type>
        <content>base64 encoded resource content</content>
      </file>
    </resource>
  </resources>
</reportUnit>
```

## Key Attributes
- **label**: Required. The display name of the reportUnit or JRXML file.
- **description**: Optional. A description of the report.
- **jrxml**: Required. Contains the JRXML file definition.
  - **jrxmlFile**: Sub-structure for the JRXML file.
    - **label**: Required. Name of the JRXML file (e.g., "Main JRXML").
    - **type**: Required. Must be `jrxml`.
    - **content**: Required. Base64-encoded string of the JRXML file content.
- **dataSource**: Required. References a data source.
  - **dataSourceReference**: Contains the URI of an existing data source (e.g., `/datasources/JServerJNDIDS`).
- **resources**: Optional. Array of local resources (e.g., images, subreports).
  - **name**: Required. Resource identifier.
  - **file**: Sub-structure for resource file.
    - **label**: Required. Resource display name.
    - **type**: Required. File type (e.g., `img`, `jrxml` for subreports).
    - **content**: Required. Base64-encoded resource content.

## JRXML File Requirements
- The JRXML file must adhere to the JasperReports schema (`http://jasperreports.sourceforge.net/jasperreports`).
- It defines the report layout, queries, and parameters.
- Must be valid XML and base64-encoded for API transmission.
- Common elements include:
  - `<jasperReport>`: Root element with attributes like `name`, `pageWidth`, `pageHeight`.
  - `<queryString>`: SQL or other query for data retrieval.
  - `<field>`: Data fields mapped from the query.
  - `<band>`: Sections like `title`, `detail`, `pageHeader` for report layout.
  - `<staticText>` or `<textField>`: For displaying static or dynamic content.

### Example JRXML Content
Below is a sample JRXML file (before base64 encoding) that could be used in the `content` field:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" 
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
              xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" 
              name="SimpleReport" pageWidth="595" pageHeight="842" columnWidth="555" 
              leftMargin="20" rightMargin="20" topMargin="20" bottomMargin="20">
  <queryString>
    <![CDATA[SELECT 1 AS one]]>
  </queryString>
  <title>
    <band height="50">
      <staticText>
        <reportElement x="0" y="0" width="555" height="50"/>
        <text><![CDATA[Simple Report Title]]></text>
      </staticText>
    </band>
  </title>
</jasperReport>
```

- **Base64 Encoding**: Convert the JRXML content to a base64 string (e.g., using Python's `base64.b64encode()`).
- **Embedding**: Place the encoded string in the `jrxmlFile.content` field of the descriptor.

## Notes
- **Validation**: Ensure the JRXML is valid before encoding to avoid server errors.
- **Data Source**: Must reference an existing data source in the repository.
- **Resources**: Include dependent files (e.g., images, subreports) in the `resources` array with appropriate types.
- **API Usage**: Use POST to `/rest_v2/resources/<folder>` with `createFolders=true` to upload the reportUnit.
- **Response**: On success, 201 Created with the full reportUnit descriptor.
- **Errors**: 400 (invalid JRXML or descriptor), 403 (permission issue), 404 (data source not found).
