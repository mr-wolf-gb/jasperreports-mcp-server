/**
 * Template Service for JasperReports MCP Server
 *
 * This service provides template generation and structure information for:
 * - JRXML report templates for AI agents
 * - Datasource structure and validation information
 *
 * Features:
 * - Generate structured JRXML templates for different report types
 * - Provide datasource structure definitions with validation rules
 * - Include examples and best practices for AI agents
 * - Support multiple template types and datasource configurations
 */

import { getConfiguration } from '../config/environment.js';
import { ErrorHandler } from '../utils/errorHandler.js';

/**
 * Template types supported
 */
const TEMPLATE_TYPES = {
  BASIC: 'basic',
  TABULAR: 'tabular',
  MASTER_DETAIL: 'master-detail',
  CHART: 'chart',
  SUBREPORT: 'subreport',
};

/**
 * Datasource types supported
 */
const DATASOURCE_TYPES = {
  JDBC: 'jdbc',
  JNDI: 'jndi',
  BEAN: 'bean',
  CUSTOM: 'custom',
  AWS: 'aws',
  MONGODB: 'mongodb',
};

/**
 * Page format configurations
 */
const PAGE_FORMATS = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  A3: { width: 842, height: 1191 },
};

/**
 * Template Service class
 */
class TemplateService {
  constructor(config = null) {
    this.config = config || getConfiguration();
    this.errorHandler = new ErrorHandler(this.config);

    if (this.config.debugMode) {
      console.log('[TemplateService] Initialized template service');
    }
  }

  /**
   * Generate JRXML template based on parameters
   * @param {object} params - Template generation parameters
   * @returns {object} Generated template information
   */
  async generateJRXMLTemplate(params = {}) {
    try {
      const {
        templateType = TEMPLATE_TYPES.BASIC,
        includeParameters = true,
        includeFields = true,
        pageFormat = 'A4',
        orientation = 'portrait',
      } = params;

      if (this.config.debugMode) {
        console.log(`[TemplateService] Generating ${templateType} JRXML template`);
      }

      // Get page dimensions
      const pageDimensions = this._getPageDimensions(pageFormat, orientation);

      // Generate JRXML content based on template type
      const jrxmlContent = this._generateJRXMLContent(templateType, {
        ...pageDimensions,
        includeParameters,
        includeFields,
      });

      // Convert to base64
      const base64Content = Buffer.from(jrxmlContent, 'utf8').toString('base64');

      // Generate structure information
      const structure = this._getTemplateStructure(templateType);

      // Generate sample parameters and fields
      const sampleParameters = includeParameters ? this._getSampleParameters(templateType) : [];
      const sampleFields = includeFields ? this._getSampleFields(templateType) : [];

      return {
        jrxmlContent,
        base64Content,
        structure,
        sampleParameters,
        sampleFields,
        usage: this._getUsageInstructions(templateType),
        validationNotes: this._getValidationNotes(),
      };
    } catch (error) {
      const mappedError = this.errorHandler.mapToMCPError(
        error,
        'TemplateService:generateJRXMLTemplate'
      );
      this.errorHandler.logError(mappedError, 'TemplateService:generateJRXMLTemplate');
      throw mappedError;
    }
  }

  /**
   * Get datasource structure and validation information
   * @param {object} params - Datasource structure parameters
   * @returns {object} Datasource structure information
   */
  async getDatasourceStructure(params = {}) {
    try {
      const {
        datasourceType = DATASOURCE_TYPES.JDBC,
        includeValidation = true,
        includeExamples = true,
        databaseType = 'generic',
      } = params;

      if (this.config.debugMode) {
        console.log(`[TemplateService] Getting ${datasourceType} datasource structure`);
      }

      // Get structure based on datasource type
      const structure = this._getDatasourceStructureByType(datasourceType, databaseType);

      // Get validation rules
      const validationRules = includeValidation ? this._getValidationRules(datasourceType) : {};

      // Get examples
      const examples = includeExamples
        ? this._getDatasourceExamples(datasourceType, databaseType)
        : {};

      return {
        structure,
        requiredFields: structure.required || [],
        optionalFields: structure.optional || [],
        validationRules,
        examples,
        commonErrors: this._getCommonErrors(datasourceType),
        bestPractices: this._getBestPractices(datasourceType),
      };
    } catch (error) {
      const mappedError = this.errorHandler.mapToMCPError(
        error,
        'TemplateService:getDatasourceStructure'
      );
      this.errorHandler.logError(mappedError, 'TemplateService:getDatasourceStructure');
      throw mappedError;
    }
  }

  /**
   * Get page dimensions based on format and orientation
   * @private
   */
  _getPageDimensions(pageFormat, orientation) {
    const format = PAGE_FORMATS[pageFormat] || PAGE_FORMATS.A4;

    if (orientation === 'landscape') {
      return {
        pageWidth: format.height,
        pageHeight: format.width,
        columnWidth: format.height - 40, // 20px margins on each side
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 20,
        bottomMargin: 20,
      };
    } else {
      return {
        pageWidth: format.width,
        pageHeight: format.height,
        columnWidth: format.width - 40, // 20px margins on each side
        leftMargin: 20,
        rightMargin: 20,
        topMargin: 20,
        bottomMargin: 20,
      };
    }
  }

  /**
   * Generate JRXML content based on template type
   * @private
   */
  _generateJRXMLContent(templateType, options) {
    const {
      pageWidth,
      pageHeight,
      columnWidth,
      leftMargin,
      rightMargin,
      topMargin,
      bottomMargin,
      includeParameters,
      includeFields,
    } = options;

    let jrxml = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports" 
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
              xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd" 
              name="${templateType}Report" 
              pageWidth="${pageWidth}" 
              pageHeight="${pageHeight}" 
              columnWidth="${columnWidth}" 
              leftMargin="${leftMargin}" 
              rightMargin="${rightMargin}" 
              topMargin="${topMargin}" 
              bottomMargin="${bottomMargin}">`;

    // Add parameters if requested
    if (includeParameters) {
      jrxml += this._getParametersSection(templateType);
    }

    // Add query string
    jrxml += `
  <queryString>
    <![CDATA[${this._getQueryString(templateType)}]]>
  </queryString>`;

    // Add fields if requested
    if (includeFields) {
      jrxml += this._getFieldsSection(templateType);
    }

    // Add bands based on template type
    jrxml += this._getBandsSection(templateType, columnWidth);

    jrxml += `
</jasperReport>`;

    return jrxml;
  }

  /**
   * Get parameters section for JRXML
   * @private
   */
  _getParametersSection(templateType) {
    const commonParams = `
  <parameter name="ReportTitle" class="java.lang.String">
    <defaultValueExpression><![CDATA["Sample Report"]]></defaultValueExpression>
  </parameter>
  <parameter name="StartDate" class="java.util.Date">
    <defaultValueExpression><![CDATA[new java.util.Date()]]></defaultValueExpression>
  </parameter>
  <parameter name="EndDate" class="java.util.Date">
    <defaultValueExpression><![CDATA[new java.util.Date()]]></defaultValueExpression>
  </parameter>`;

    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return (
          commonParams +
          `
  <parameter name="MaxRows" class="java.lang.Integer">
    <defaultValueExpression><![CDATA[100]]></defaultValueExpression>
  </parameter>`
        );
      case TEMPLATE_TYPES.CHART:
        return (
          commonParams +
          `
  <parameter name="ChartTitle" class="java.lang.String">
    <defaultValueExpression><![CDATA["Chart Title"]]></defaultValueExpression>
  </parameter>`
        );
      default:
        return commonParams;
    }
  }

  /**
   * Get query string based on template type
   * @private
   */
  _getQueryString(templateType) {
    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return `SELECT 
    id,
    name,
    email,
    created_date,
    status
FROM users 
WHERE created_date BETWEEN $P{StartDate} AND $P{EndDate}
ORDER BY created_date DESC`;
      case TEMPLATE_TYPES.CHART:
        return `SELECT 
    category,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM sales_data 
WHERE sale_date BETWEEN $P{StartDate} AND $P{EndDate}
GROUP BY category
ORDER BY total_amount DESC`;
      case TEMPLATE_TYPES.MASTER_DETAIL:
        return `SELECT 
    o.order_id,
    o.order_date,
    o.customer_name,
    oi.product_name,
    oi.quantity,
    oi.unit_price
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_date BETWEEN $P{StartDate} AND $P{EndDate}
ORDER BY o.order_date, o.order_id`;
      default:
        return `SELECT 
    'Sample Data' as sample_field,
    1 as sample_number,
    CURRENT_DATE as sample_date`;
    }
  }

  /**
   * Get fields section for JRXML
   * @private
   */
  _getFieldsSection(templateType) {
    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return `
  <field name="id" class="java.lang.Integer"/>
  <field name="name" class="java.lang.String"/>
  <field name="email" class="java.lang.String"/>
  <field name="created_date" class="java.util.Date"/>
  <field name="status" class="java.lang.String"/>`;
      case TEMPLATE_TYPES.CHART:
        return `
  <field name="category" class="java.lang.String"/>
  <field name="count" class="java.lang.Integer"/>
  <field name="total_amount" class="java.math.BigDecimal"/>`;
      case TEMPLATE_TYPES.MASTER_DETAIL:
        return `
  <field name="order_id" class="java.lang.Integer"/>
  <field name="order_date" class="java.util.Date"/>
  <field name="customer_name" class="java.lang.String"/>
  <field name="product_name" class="java.lang.String"/>
  <field name="quantity" class="java.lang.Integer"/>
  <field name="unit_price" class="java.math.BigDecimal"/>`;
      default:
        return `
  <field name="sample_field" class="java.lang.String"/>
  <field name="sample_number" class="java.lang.Integer"/>
  <field name="sample_date" class="java.util.Date"/>`;
    }
  }

  /**
   * Get bands section for JRXML
   * @private
   */
  _getBandsSection(templateType, columnWidth) {
    let bands = `
  <title>
    <band height="60">
      <staticText>
        <reportElement x="0" y="0" width="${columnWidth}" height="30"/>
        <textElement textAlignment="Center">
          <font size="18" isBold="true"/>
        </textElement>
        <text><![CDATA[$P{ReportTitle}]]></text>
      </staticText>
      <textField>
        <reportElement x="0" y="30" width="${columnWidth}" height="20"/>
        <textElement textAlignment="Center"/>
        <textFieldExpression><![CDATA["Generated on: " + new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date())]]></textFieldExpression>
      </textField>
    </band>
  </title>`;

    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        bands += `
  <columnHeader>
    <band height="30">
      <staticText>
        <reportElement x="0" y="0" width="50" height="20"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[ID]]></text>
      </staticText>
      <staticText>
        <reportElement x="50" y="0" width="150" height="20"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[Name]]></text>
      </staticText>
      <staticText>
        <reportElement x="200" y="0" width="200" height="20"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[Email]]></text>
      </staticText>
      <staticText>
        <reportElement x="400" y="0" width="100" height="20"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[Created Date]]></text>
      </staticText>
      <staticText>
        <reportElement x="500" y="0" width="55" height="20"/>
        <textElement><font isBold="true"/></textElement>
        <text><![CDATA[Status]]></text>
      </staticText>
    </band>
  </columnHeader>
  <detail>
    <band height="25">
      <textField>
        <reportElement x="0" y="0" width="50" height="20"/>
        <textFieldExpression><![CDATA[$F{id}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="50" y="0" width="150" height="20"/>
        <textFieldExpression><![CDATA[$F{name}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="200" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{email}]]></textFieldExpression>
      </textField>
      <textField pattern="yyyy-MM-dd">
        <reportElement x="400" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{created_date}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="500" y="0" width="55" height="20"/>
        <textFieldExpression><![CDATA[$F{status}]]></textFieldExpression>
      </textField>
    </band>
  </detail>`;
        break;
      case TEMPLATE_TYPES.CHART:
        bands += `
  <summary>
    <band height="400">
      <pieChart>
        <chart>
          <reportElement x="0" y="0" width="${columnWidth}" height="400"/>
          <chartTitle>
            <titleExpression><![CDATA[$P{ChartTitle}]]></titleExpression>
          </chartTitle>
        </chart>
        <pieDataset>
          <keyExpression><![CDATA[$F{category}]]></keyExpression>
          <valueExpression><![CDATA[$F{total_amount}]]></valueExpression>
        </pieDataset>
      </pieChart>
    </band>
  </summary>`;
        break;
      default:
        bands += `
  <detail>
    <band height="30">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{sample_field}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="200" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{sample_number}]]></textFieldExpression>
      </textField>
      <textField pattern="yyyy-MM-dd">
        <reportElement x="300" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{sample_date}]]></textFieldExpression>
      </textField>
    </band>
  </detail>`;
    }

    bands += `
  <pageFooter>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA["Page " + $V{PAGE_NUMBER}]]></textFieldExpression>
      </textField>
      <textField evaluationTime="Report">
        <reportElement x="${columnWidth - 100}" y="0" width="100" height="20"/>
        <textElement textAlignment="Right"/>
        <textFieldExpression><![CDATA[" of " + $V{PAGE_NUMBER}]]></textFieldExpression>
      </textField>
    </band>
  </pageFooter>`;

    return bands;
  }

  /**
   * Get template structure information
   * @private
   */
  _getTemplateStructure(templateType) {
    const baseStructure = {
      rootElement: 'jasperReport',
      requiredAttributes: [
        'name',
        'pageWidth',
        'pageHeight',
        'columnWidth',
        'leftMargin',
        'rightMargin',
        'topMargin',
        'bottomMargin',
      ],
      commonElements: ['queryString', 'title', 'pageFooter'],
      namespace: 'http://jasperreports.sourceforge.net/jasperreports',
      schemaLocation: 'http://jasperreports.sourceforge.net/xsd/jasperreport.xsd',
    };

    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return {
          ...baseStructure,
          specificElements: ['columnHeader', 'detail'],
          recommendedElements: ['parameter', 'field', 'variable'],
          description: 'Tabular report with column headers and detail rows',
        };
      case TEMPLATE_TYPES.CHART:
        return {
          ...baseStructure,
          specificElements: ['summary'],
          recommendedElements: ['parameter', 'field', 'chart'],
          description: 'Chart-based report with data visualization',
        };
      case TEMPLATE_TYPES.MASTER_DETAIL:
        return {
          ...baseStructure,
          specificElements: ['groupHeader', 'groupFooter', 'detail'],
          recommendedElements: ['parameter', 'field', 'group', 'variable'],
          description: 'Master-detail report with grouped data',
        };
      case TEMPLATE_TYPES.SUBREPORT:
        return {
          ...baseStructure,
          specificElements: ['detail', 'subreport'],
          recommendedElements: ['parameter', 'field', 'subreportParameter'],
          description: 'Report containing subreports',
        };
      default:
        return {
          ...baseStructure,
          specificElements: ['detail'],
          recommendedElements: ['parameter', 'field'],
          description: 'Basic report template',
        };
    }
  }

  /**
   * Get sample parameters for template type
   * @private
   */
  _getSampleParameters(templateType) {
    const commonParams = [
      { name: 'ReportTitle', type: 'java.lang.String', defaultValue: 'Sample Report' },
      { name: 'StartDate', type: 'java.util.Date', defaultValue: 'new java.util.Date()' },
      { name: 'EndDate', type: 'java.util.Date', defaultValue: 'new java.util.Date()' },
    ];

    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return [
          ...commonParams,
          { name: 'MaxRows', type: 'java.lang.Integer', defaultValue: '100' },
        ];
      case TEMPLATE_TYPES.CHART:
        return [
          ...commonParams,
          { name: 'ChartTitle', type: 'java.lang.String', defaultValue: 'Chart Title' },
        ];
      default:
        return commonParams;
    }
  }

  /**
   * Get sample fields for template type
   * @private
   */
  _getSampleFields(templateType) {
    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return [
          { name: 'id', type: 'java.lang.Integer' },
          { name: 'name', type: 'java.lang.String' },
          { name: 'email', type: 'java.lang.String' },
          { name: 'created_date', type: 'java.util.Date' },
          { name: 'status', type: 'java.lang.String' },
        ];
      case TEMPLATE_TYPES.CHART:
        return [
          { name: 'category', type: 'java.lang.String' },
          { name: 'count', type: 'java.lang.Integer' },
          { name: 'total_amount', type: 'java.math.BigDecimal' },
        ];
      case TEMPLATE_TYPES.MASTER_DETAIL:
        return [
          { name: 'order_id', type: 'java.lang.Integer' },
          { name: 'order_date', type: 'java.util.Date' },
          { name: 'customer_name', type: 'java.lang.String' },
          { name: 'product_name', type: 'java.lang.String' },
          { name: 'quantity', type: 'java.lang.Integer' },
          { name: 'unit_price', type: 'java.math.BigDecimal' },
        ];
      default:
        return [
          { name: 'sample_field', type: 'java.lang.String' },
          { name: 'sample_number', type: 'java.lang.Integer' },
          { name: 'sample_date', type: 'java.util.Date' },
        ];
    }
  }

  /**
   * Get usage instructions for template type
   * @private
   */
  _getUsageInstructions(templateType) {
    const baseInstructions = {
      steps: [
        'Upload the JRXML template to JasperReports Server',
        'Configure the datasource connection',
        'Set parameter values as needed',
        'Execute the report',
      ],
      notes: [
        'Ensure your datasource matches the query structure',
        'Parameter values can be passed during report execution',
        'Field names must match your datasource column names',
      ],
    };

    switch (templateType) {
      case TEMPLATE_TYPES.TABULAR:
        return {
          ...baseInstructions,
          specificNotes: [
            'Column widths may need adjustment based on your data',
            'Consider adding sorting and filtering parameters',
            'Use appropriate data formatting for dates and numbers',
          ],
        };
      case TEMPLATE_TYPES.CHART:
        return {
          ...baseInstructions,
          specificNotes: [
            'Ensure your data is properly aggregated for chart display',
            'Consider chart size and positioning',
            'Test with different data volumes',
          ],
        };
      case TEMPLATE_TYPES.MASTER_DETAIL:
        return {
          ...baseInstructions,
          specificNotes: [
            'Configure grouping fields properly',
            'Consider group header and footer content',
            'Test with various group sizes',
          ],
        };
      default:
        return baseInstructions;
    }
  }

  /**
   * Get validation notes
   * @private
   */
  _getValidationNotes() {
    return [
      'All field names must match datasource column names exactly',
      'Parameter types must be compatible with their usage in expressions',
      'Report element positions should not overlap',
      'Band heights should accommodate all contained elements',
      'Page margins must allow sufficient space for content',
      'Font sizes should be appropriate for the target output format',
    ];
  }

  /**
   * Get datasource structure by type
   * @private
   */
  _getDatasourceStructureByType(datasourceType, databaseType) {
    switch (datasourceType) {
      case DATASOURCE_TYPES.JDBC:
        return this._getJDBCStructure(databaseType);
      case DATASOURCE_TYPES.JNDI:
        return this._getJNDIStructure();
      case DATASOURCE_TYPES.BEAN:
        return this._getBeanStructure();
      case DATASOURCE_TYPES.AWS:
        return this._getAWSStructure();
      case DATASOURCE_TYPES.MONGODB:
        return this._getMongoDBStructure();
      default:
        return this._getCustomStructure();
    }
  }

  /**
   * Get JDBC datasource structure
   * @private
   */
  _getJDBCStructure(databaseType) {
    const baseStructure = {
      required: ['name', 'label', 'driverClass', 'connectionUrl', 'username'],
      optional: ['password', 'connectionProperties', 'timezone', 'validationQuery'],
    };

    const driverMappings = {
      mysql: 'com.mysql.cj.jdbc.Driver',
      postgresql: 'org.postgresql.Driver',
      oracle: 'oracle.jdbc.OracleDriver',
      sqlserver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
      h2: 'org.h2.Driver',
      generic: 'your.database.Driver',
    };

    return {
      ...baseStructure,
      driverClass: driverMappings[databaseType] || driverMappings.generic,
      connectionUrlPattern: this._getConnectionUrlPattern(databaseType),
    };
  }

  /**
   * Get connection URL pattern for database type
   * @private
   */
  _getConnectionUrlPattern(databaseType) {
    const patterns = {
      mysql: 'jdbc:mysql://[host]:[port]/[database]',
      postgresql: 'jdbc:postgresql://[host]:[port]/[database]',
      oracle: 'jdbc:oracle:thin:@[host]:[port]:[sid]',
      sqlserver: 'jdbc:sqlserver://[host]:[port];databaseName=[database]',
      h2: 'jdbc:h2:mem:[database]',
      generic: 'jdbc:[driver]://[host]:[port]/[database]',
    };
    return patterns[databaseType] || patterns.generic;
  }

  /**
   * Get JNDI datasource structure
   * @private
   */
  _getJNDIStructure() {
    return {
      required: ['name', 'label', 'jndiName'],
      optional: ['timezone'],
      jndiNamePattern: 'java:comp/env/jdbc/[datasourceName]',
    };
  }

  /**
   * Get Bean datasource structure
   * @private
   */
  _getBeanStructure() {
    return {
      required: ['name', 'label', 'beanName', 'beanMethod'],
      optional: ['methodParameters'],
      beanNamePattern: '[packageName].[className]',
    };
  }

  /**
   * Get AWS datasource structure
   * @private
   */
  _getAWSStructure() {
    return {
      required: ['name', 'label', 'awsAccessKey', 'awsSecretKey', 'region', 'service'],
      optional: ['sessionToken', 'endpoint'],
      supportedServices: ['rds', 'redshift', 'athena', 's3'],
    };
  }

  /**
   * Get MongoDB datasource structure
   * @private
   */
  _getMongoDBStructure() {
    return {
      required: ['name', 'label', 'mongoURI', 'database'],
      optional: ['collection', 'username', 'password', 'authDatabase'],
      mongoURIPattern: 'mongodb://[host]:[port]/[database]',
    };
  }

  /**
   * Get custom datasource structure
   * @private
   */
  _getCustomStructure() {
    return {
      required: ['name', 'label', 'serviceClass'],
      optional: ['properties'],
      serviceClassPattern: '[packageName].[className]',
    };
  }

  /**
   * Get validation rules for datasource type
   * @private
   */
  _getValidationRules(datasourceType) {
    const commonRules = {
      name: 'Must be unique and contain only alphanumeric characters and underscores',
      label: 'Must be between 1 and 200 characters',
    };

    switch (datasourceType) {
      case DATASOURCE_TYPES.JDBC:
        return {
          ...commonRules,
          driverClass: 'Must be a valid JDBC driver class name',
          connectionUrl: 'Must be a valid JDBC connection URL',
          username: 'Database username is required',
          password: 'Password should be encrypted in production',
        };
      case DATASOURCE_TYPES.JNDI:
        return {
          ...commonRules,
          jndiName: 'Must be a valid JNDI resource name',
        };
      default:
        return commonRules;
    }
  }

  /**
   * Get datasource examples
   * @private
   */
  _getDatasourceExamples(datasourceType, databaseType) {
    switch (datasourceType) {
      case DATASOURCE_TYPES.JDBC:
        return this._getJDBCExamples(databaseType);
      case DATASOURCE_TYPES.JNDI:
        return {
          name: 'myJNDIDatasource',
          label: 'My JNDI Datasource',
          jndiName: 'java:comp/env/jdbc/mydb',
        };
      case DATASOURCE_TYPES.MONGODB:
        return {
          name: 'myMongoDatasource',
          label: 'My MongoDB Datasource',
          mongoURI: 'mongodb://localhost:27017/mydb',
          database: 'mydb',
          collection: 'mycollection',
        };
      default:
        return {};
    }
  }

  /**
   * Get JDBC examples for database type
   * @private
   */
  _getJDBCExamples(databaseType) {
    const examples = {
      mysql: {
        name: 'myMySQLDatasource',
        label: 'My MySQL Datasource',
        driverClass: 'com.mysql.cj.jdbc.Driver',
        connectionUrl: 'jdbc:mysql://localhost:3306/mydb',
        username: 'myuser',
      },
      postgresql: {
        name: 'myPostgreSQLDatasource',
        label: 'My PostgreSQL Datasource',
        driverClass: 'org.postgresql.Driver',
        connectionUrl: 'jdbc:postgresql://localhost:5432/mydb',
        username: 'myuser',
      },
      oracle: {
        name: 'myOracleDatasource',
        label: 'My Oracle Datasource',
        driverClass: 'oracle.jdbc.OracleDriver',
        connectionUrl: 'jdbc:oracle:thin:@localhost:1521:xe',
        username: 'myuser',
      },
    };
    return examples[databaseType] || examples.mysql;
  }

  /**
   * Get common errors for datasource type
   * @private
   */
  _getCommonErrors(datasourceType) {
    switch (datasourceType) {
      case DATASOURCE_TYPES.JDBC:
        return [
          'ClassNotFoundException: JDBC driver not found in classpath',
          'SQLException: Connection refused - check host and port',
          'Authentication failed - verify username and password',
          'Database does not exist - check database name',
        ];
      case DATASOURCE_TYPES.JNDI:
        return [
          'NameNotFoundException: JNDI resource not found',
          'NamingException: Invalid JNDI name format',
          'Resource not configured in application server',
        ];
      default:
        return ['Configuration validation failed', 'Connection timeout', 'Invalid credentials'];
    }
  }

  /**
   * Get best practices for datasource type
   * @private
   */
  _getBestPractices(datasourceType) {
    const commonPractices = [
      'Use connection pooling for better performance',
      'Encrypt sensitive information like passwords',
      'Test connections before deploying to production',
      'Monitor connection usage and performance',
    ];

    switch (datasourceType) {
      case DATASOURCE_TYPES.JDBC:
        return [
          ...commonPractices,
          'Use prepared statements to prevent SQL injection',
          'Configure appropriate connection timeout values',
          'Use read-only connections when possible',
        ];
      case DATASOURCE_TYPES.JNDI:
        return [
          ...commonPractices,
          'Configure datasource at application server level',
          'Use JNDI for better portability across environments',
        ];
      default:
        return commonPractices;
    }
  }
}

export default TemplateService;
export { TEMPLATE_TYPES, DATASOURCE_TYPES, PAGE_FORMATS };
